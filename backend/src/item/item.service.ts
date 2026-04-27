import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { UpdateItemMinMaxDto } from './dto/update-item-minmax.dto';
import { ItemStockDto } from './dto/item-stock.dto';

/** เปรียบเทียบวันหมดอายุตามปฏิทิน — สอดคล้อง frontend items-stock rowFlags */
function startOfDayLocal(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function stockEffectiveExpireAt(stock: { ExpireDate?: Date | null; expDate?: Date | null }): Date | null {
  const raw = stock.ExpireDate ?? stock.expDate ?? null;
  if (raw == null) return null;
  const exp = new Date(raw as Date);
  return Number.isNaN(exp.getTime()) ? null : exp;
}

@Injectable()
export class ItemService {
  constructor(private prisma: PrismaService) {}

  async createItem(createItemDto: CreateItemDto) {
    try {
      // Remove undefined/null values from the DTO
      const cleanData = Object.fromEntries(
        Object.entries(createItemDto).filter(
          ([_, value]) => value !== undefined && value !== null,
        ),
      ) as any;

      // Add timestamp if not provided
      if (!cleanData.CreateDate) {
        cleanData.CreateDate = new Date();
      }
      if (!cleanData.ModiflyDate) {
        cleanData.ModiflyDate = new Date();
      }

      const item = await this.prisma.item.create({
        data: cleanData,
      });

      return {
        success: true,
        message: 'Item created successfully',
        data: item,
      };
    } catch (error) {
      console.error('❌ Create error:', error.message);
      return {
        success: false,
        message: 'Failed to create item',
        error: error.message,
      };
    }
  }

  async findAllItems(
    page: number,
    limit: number,
    keyword?: string,
    _sort_by: string = 'itemcode',
    _sort_order: string = 'asc',
    cabinet_id?: number,
    department_id?: number,
    status?: string,
    stock_status?: string,
    expire_from?: string,
    expire_to?: string,
  ) {
    try {
      const where: any = {};
      const skip = (page - 1) * limit;
      if (keyword) {
        where.OR = [
          { itemname: { contains: keyword } },
          { itemcode: { contains: keyword } },
          { itemcode2: { contains: keyword } },
          { itemcode3: { contains: keyword } },
          { Barcode: { contains: keyword } },
        ];
      }

      // Build itemStocks where clause (count_itemstock คำนวณจาก IsStock = 1 ในขั้นตอน map)
      const itemStocksWhere: any = {
        RfidCode: {
          not: '',
          
        },
      };
 
      if (cabinet_id) {
        const cabinet = await this.prisma.cabinet.findUnique({
          where: { id: cabinet_id },
          select: { stock_id: true },
        });
        if (cabinet?.stock_id) {
          itemStocksWhere.StockID = cabinet.stock_id;
          // หน้า admin items-stock RFID: เฉพาะแท็กที่อยู่ในตู้ (IsStock = 1 / true)
          itemStocksWhere.IsStock = true;
        }
      }     
 
      // Get all items matching the filter criteria (including keyword search)
      const allItemsQuery = await this.prisma.item.findMany({
        where: {
          ...where,
          item_status: 0, // Only active items
        },
        select: {
          itemcode: true,
          itemname: true,
          CostPrice: true,
          SalePrice: true,
          CreateDate: true,
          stock_max: true,
          stock_min: true,
          item_status: true,
          itemStocks: {
            where: itemStocksWhere,
            select: {
              RowID: true,
              StockID: true,
              Qty: true,
              RfidCode: true,
              ExpireDate: true,
              expDate: true,
              IsStock: true,
              cabinet: {
                select: {
                  id: true,
                  cabinet_name: true,
                  cabinet_code: true,
                  stock_id: true,
                  cabinetDepartments: {
                    where: {
                      department_id: department_id,
                      status: status,
                    },
                    select: {
                      id: true,
                      department_id: true,
                      status: true,
                      department: {
                        select: {
                          ID: true,
                          DepName: true,
                          DepName2: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Filter items that have itemStocks matching the criteria
      const filteredItems = allItemsQuery.filter((item: any) => {
        // Must have at least one itemStock
        if (!item.itemStocks || item.itemStocks.length === 0) {
          return false;
        }

        // If department_id is provided, check if at least one itemStock has cabinet with that department
        if (department_id) {
          return item.itemStocks.some((stock: any) =>
            stock.cabinet?.cabinetDepartments &&
            stock.cabinet.cabinetDepartments.length > 0
          );
        }

        return true;
      });

      let settingByCode = new Map<string, { stock_min: number | null; stock_max: number | null }>();
      if (cabinet_id != null && cabinet_id > 0 && filteredItems.length > 0) {
        const codes = [
          ...new Set(
            filteredItems.map((i: { itemcode?: string }) => (i.itemcode ?? '').trim()).filter(Boolean),
          ),
        ];
        if (codes.length > 0) {
          /** รวม cabinet id จากพารามิเตอร์ + จาก itemstock.cabinet (กรณีแถว settings ผูก id ตู้กับที่ join จากสต็อก) */
          const cabinetIdsForSettings = new Set<number>();
          cabinetIdsForSettings.add(cabinet_id);
          for (const it of filteredItems as { itemStocks?: { cabinet?: { id?: number } | null }[] }[]) {
            for (const st of it.itemStocks ?? []) {
              const cid = st.cabinet?.id;
              if (cid != null && cid > 0) cabinetIdsForSettings.add(cid);
            }
          }
          const settings = await this.prisma.cabinetItemSetting.findMany({
            where: {
              cabinet_id: { in: [...cabinetIdsForSettings] },
              item_code: { in: codes },
            },
            select: {
              cabinet_id: true,
              item_code: true,
              stock_min: true,
              stock_max: true,
            },
          });
          const lists = new Map<string, typeof settings>();
          for (const s of settings) {
            const k = (s.item_code ?? '').trim();
            if (!k) continue;
            const arr = lists.get(k) ?? [];
            arr.push(s);
            lists.set(k, arr);
          }
          for (const [k, arr] of lists) {
            const pick =
              arr.find((s) => s.cabinet_id === cabinet_id) ?? arr[0];
            if (pick) {
              settingByCode.set(k, { stock_min: pick.stock_min, stock_max: pick.stock_max });
            }
          }
        }
      }

      const todayCal = startOfDayLocal(new Date());
      const nearExpireLimitCal = new Date(todayCal);
      nearExpireLimitCal.setDate(nearExpireLimitCal.getDate() + 30);

      const itemsWithMeta = filteredItems.map((item: any) => {
        // จำกัด itemStocks ตาม department ถ้ามีระบุ
        let matchingItemStocks = item.itemStocks;
        if (department_id) {
          matchingItemStocks = item.itemStocks.filter((stock: any) =>
            stock.cabinet?.cabinetDepartments &&
            stock.cabinet.cabinetDepartments.length > 0,
          );
        }

        // count_itemstock = จำนวนที่ IsStock = true/1 (schema เป็น Boolean, DB อาจเป็น 0/1)
        const countItemStock = matchingItemStocks.filter(
          (s: any) => s.IsStock === true || s.IsStock === 1,
        ).length;

        // วันหมดอายุ (ExpireDate หรือ expDate) — หมดอายุ/ใกล้หมด ตามปฏิทินเหมือน frontend rowFlags
        let earliestExpireDate: Date | null = null;
        let hasExpired = false;
        let hasNearExpire = false;

        matchingItemStocks.forEach((stock: any) => {
          const exp = stockEffectiveExpireAt(stock);
          if (!exp) return;

          if (!earliestExpireDate || exp.getTime() < (earliestExpireDate as Date).getTime()) {
            earliestExpireDate = exp;
          }

          const ed = startOfDayLocal(exp);
          if (ed < todayCal) {
            hasExpired = true;
          } else if (ed >= todayCal && ed <= nearExpireLimitCal) {
            hasNearExpire = true;
          }
        });

        const codeKey = (item.itemcode ?? '').trim();
        const cabRow =
          cabinet_id != null && cabinet_id > 0 ? settingByCode.get(codeKey) : undefined;
        const effectiveStockMin =
          cabRow !== undefined ? (cabRow.stock_min ?? item.stock_min ?? null) : (item.stock_min ?? null);
        const effectiveStockMax =
          cabRow !== undefined ? (cabRow.stock_max ?? item.stock_max ?? 0) : (item.stock_max ?? 0);
        const stockMin = effectiveStockMin ?? 0;
        const isLowStock = stockMin > 0 && countItemStock < stockMin;

        const damagedQty = 0;
        const qtyInUse = 0;

        // จำนวนที่ต้องเติม: M=Max, A=ในตู้, B=ถูกใช้งาน (0), C=ชำรุด (0) — คำนวณจาก itemstock เท่านั้น
        const M = effectiveStockMax ?? 0;
        const A = countItemStock;

        const B = qtyInUse;
        const C = damagedQty;


        const X = M - A; // จำนวนที่ต้องเติมในตู้
        const Y = B + C; // จำนวนที่ถูกใช้งาน + ชำรุด

        // จำนวนที่ต้องเติมในตู้ ให้เติม Y
        let refillQty = Y;

        // ถ้า X < Y แสดงว่า จำนวนที่ต้องเติมในตู้น้อยกว่า จำนวนที่ถูกใช้งาน + ชำรุด ให้เติม X
        if (X < Y) {
          refillQty = X;
        }
        // ถ้า X > Y แสดงว่า จำนวนที่ต้องเติมในตู้มากกว่า จำนวนที่ถูกใช้งาน + ชำรุด ให้เติม X - Y
        else if (X > Y && Y == 0) {
          refillQty = X - Y;
          // refillQty = Y;
        }

        if (refillQty < 0) {
          refillQty = 0;
        }

        const itemWithCount = {
          ...item,
          stock_min: effectiveStockMin,
          stock_max: effectiveStockMax,
          cabinetItemSetting:
            cabRow !== undefined
              ? { stock_min: cabRow.stock_min, stock_max: cabRow.stock_max }
              : null,
          itemStocks: matchingItemStocks,
          count_itemstock: countItemStock,
          qty_in_use: qtyInUse,
          damaged_qty: damagedQty,
          refill_qty: refillQty,
        };

        return {
          item: itemWithCount,
          hasExpired,
          hasNearExpire,
          isLowStock,
          earliestExpireDate,
        };
      });

      const sortedMeta = [...itemsWithMeta].sort((a, b) => {
        // 1) มี stock หมดอายุก่อน
        if (a.hasExpired !== b.hasExpired) {
          return a.hasExpired ? -1 : 1;
        }

        // 2) ถัดมา stock ใกล้หมดอายุ (ภายใน 30 วัน — ตรงกับหน้า admin items-stock)
        if (a.hasNearExpire !== b.hasNearExpire) {
          return a.hasNearExpire ? -1 : 1;
        }

        // 3) ถัดมาคือ stock ที่จำนวนชิ้นต่ำกว่า MIN
        if (a.isLowStock !== b.isLowStock) {
          return a.isLowStock ? -1 : 1;
        }

        // 4) ถ้ามีวันหมดอายุทั้งคู่ ให้เรียงจากหมดอายุเร็วไปช้า
        if (a.earliestExpireDate && b.earliestExpireDate) {
          const aTime = (a.earliestExpireDate as Date).getTime();
          const bTime = (b.earliestExpireDate as Date).getTime();
          return aTime - bTime;
        }

        // 5) fallback: เรียงตาม itemcode (A-Z)
        const codeA = a.item.itemcode || '';
        const codeB = b.item.itemcode || '';
        return codeA.localeCompare(codeB);
      });

      const ymdRe = /^(\d{4})-(\d{2})-(\d{2})$/;
      const toYmdLocal = (d: Date): string => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      const fromStr = (expire_from ?? '').trim();
      const toStr = (expire_to ?? '').trim();
      let afterExpireMeta = sortedMeta;
      if (fromStr || toStr) {
        afterExpireMeta = sortedMeta.filter((x) => {
          const raw = x.earliestExpireDate as Date | null | undefined;
          if (raw == null) return false;
          const t = new Date(raw).getTime();
          if (Number.isNaN(t)) return false;
          const itemYmd = toYmdLocal(new Date(raw));
          // ตั้งแต่ = วันหมดอายุเร็วสุดอยู่หลังวันนั้น (ไม่รวมวันที่เลือก)
          if (fromStr && ymdRe.test(fromStr) && itemYmd <= fromStr) return false;
          // ถึง = รวมถึงวันสิ้นสุด (ตามปฏิทิน)
          if (toStr && ymdRe.test(toStr) && itemYmd > toStr) return false;
          return true;
        });
      }

      const chip = (stock_status ?? 'all').trim().toLowerCase();
      const filteredMeta =
        !chip || chip === 'all'
          ? afterExpireMeta
          : afterExpireMeta.filter((x) => {
              if (chip === 'expired') return x.hasExpired;
              // ใกล้หมด = มีอย่างน้อยหนึ่งแถวสต็อกที่วันหมดอยู่ในช่วงวันนี้–+30 วัน (ยังไม่หมดแถวนั้น)
              // ไม่ใช้ !hasExpired เพราะถ้ามีแท็กหมดแล้ว + แท็กใกล้หมดคู่กัน จะไม่โผล่ใน "ใกล้หมด" ทั้งที่ควรเห็นแท็กที่ยังใช้ได้
              if (chip === 'soon') return x.hasNearExpire;
              if (chip === 'low') return x.isLowStock;
              return true;
            });

      const sortedItems = filteredMeta.map((x) => x.item);

      // Apply pagination after sorting + stock_status filter
      const total = sortedItems.length;
      const paginatedItems = sortedItems.slice(skip, skip + limit);

      return {
        success: true,
        data: paginatedItems,
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch items',
        error: error.message,
      };
    }
  }

  async getItemsStats(cabinet_id?: number, department_id?: number) {
    try {
      // Build itemStocks where clause
      const itemStocksWhere: any = {
        RfidCode: {
          not: '',
        },
        IsStock: true,
      };

      // Filter by cabinet_id if provided
      if (cabinet_id) {
        const cabinet = await this.prisma.cabinet.findUnique({
          where: { id: cabinet_id },
          select: { stock_id: true },
        });
        if (cabinet?.stock_id) {
          itemStocksWhere.StockID = cabinet.stock_id;
        }
      }

      // ชนิดอุปกรณ์ทั้งหมด (จากตาราง Item)
      const totalItemTypes = await this.prisma.item.count();

      // Get all items with itemStocks (รวม ExpireDate สำหรับนับใกล้หมดอายุ) — ไม่กรอง item_status เพื่อนับชนิดที่มีในสต็อกได้ครบ
      const allItemsQuery = await this.prisma.item.findMany({
        where: {},
        select: {
          itemcode: true,
          itemname: true,
          item_status: true,
          stock_min: true,
          itemStocks: {
            where: itemStocksWhere,
            select: {
              RowID: true,
              StockID: true,
              ExpireDate: true,
              expDate: true,
              ItemCode: true,
              RfidCode: true,
              cabinet: {
                select: {
                  id: true,
                  cabinet_name: true,
                  cabinet_code: true,
                  cabinetDepartments: {
                    where: department_id ? {
                      department_id: department_id,
                      status: 'ACTIVE',
                    } : { status: 'ACTIVE' },
                    select: {
                      id: true,
                      department_id: true,
                      status: true,
                      department: {
                        select: { DepName: true },
                      },
                    },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      });


      // Filter items that have itemStocks matching the criteria
      const filteredItems = allItemsQuery.filter((item: any) => {
        if (!item.itemStocks || item.itemStocks.length === 0) {
          return false;
        }

        // If department_id is provided, check if at least one itemStock has cabinet with that department
        if (department_id) {
          return item.itemStocks.some((stock: any) =>
            stock.cabinet?.cabinetDepartments &&
            stock.cabinet.cabinetDepartments.length > 0
          );
        }

        return true;
      });

      // Calculate stats และรวบรวม itemStocks ที่ match สำหรับนับหมดอายุ
      let totalItems = 0;
      let activeItems = 0;
      let inactiveItems = 0;
      let lowStockItems = 0;
      const allMatchingStocks: Array<{ RowID: number; ItemCode: string | null; itemname: string | null; ExpireDate: Date | null; RfidCode: string | null; cabinet_name?: string; cabinet_code?: string; department_name?: string }> = [];

      filteredItems.forEach((item: any) => {
        // Count itemStocks (only matching ones if department_id provided)
        let matchingItemStocks = item.itemStocks;
        if (department_id) {
          matchingItemStocks = item.itemStocks.filter((stock: any) =>
            stock.cabinet?.cabinetDepartments &&
            stock.cabinet.cabinetDepartments.length > 0
          );
        }

        const countItemStock = matchingItemStocks.length;
        const stockMin = item.stock_min ?? 0;
        const isLowStock = stockMin > 0 && countItemStock < stockMin;

        totalItems++;
        if (item.item_status === 0) {
          activeItems++;
        } else {
          inactiveItems++;
        }
        if (isLowStock) {
          lowStockItems++;
        }

        // รวบรวม itemStocks สำหรับรายการวันหมดอายุ
        matchingItemStocks.forEach((stock: any) => {
          const eff = stockEffectiveExpireAt(stock);
          allMatchingStocks.push({
            RowID: stock.RowID,
            ItemCode: stock.ItemCode ?? item.itemcode,
            itemname: item.itemname ?? null,
            ExpireDate: eff,
            RfidCode: stock.RfidCode ?? null,
            cabinet_name: stock.cabinet?.cabinet_name ?? undefined,
            cabinet_code: stock.cabinet?.cabinet_code ?? undefined,
            department_name: stock.cabinet?.cabinetDepartments?.[0]?.department?.DepName ?? undefined,
          });
        });
      });

      // นับ: หมดอายุแล้ว | ใกล้หมดอายุ 1-7 วัน (ถ้าหมดอายุไม่นับ) — ตามปฏิทิน
      const todayStats = startOfDayLocal(new Date());
      const in7DaysCal = new Date(todayStats);
      in7DaysCal.setDate(in7DaysCal.getDate() + 7);

      let expiredCount = 0;
      let nearExpire7Days = 0;
      allMatchingStocks.forEach((s) => {
        if (!s.ExpireDate) return;
        const exp = new Date(s.ExpireDate);
        if (Number.isNaN(exp.getTime())) return;
        const ed = startOfDayLocal(exp);
        if (ed < todayStats) expiredCount++;
        else if (ed >= todayStats && ed <= in7DaysCal) nearExpire7Days++;
      });

      // รายการ item_stock ที่มีวันหมดอายุทั้งหมด — เรียง: หมดอายุก่อน -> ใกล้หมดอายุ ตามวันหมดอายุ (เร็วไปช้า) — ตามปฏิทิน
      const itemsWithExpiry = allMatchingStocks
        .filter((s) => s.ExpireDate != null)
        .map((s) => ({
          RowID: s.RowID,
          ItemCode: s.ItemCode,
          itemname: s.itemname,
          ExpireDate: s.ExpireDate,
          วันหมดอายุ: s.ExpireDate ? new Date(s.ExpireDate).toISOString().split('T')[0] : null,
          RfidCode: s.RfidCode,
          cabinet_name: s.cabinet_name,
          cabinet_code: s.cabinet_code,
          department_name: s.department_name,
        }))
        .sort((a, b) => {
          if (!a.ExpireDate || !b.ExpireDate) return 0;
          const aCal = startOfDayLocal(new Date(a.ExpireDate)).getTime();
          const bCal = startOfDayLocal(new Date(b.ExpireDate)).getTime();
          const aExpired = aCal < todayStats.getTime();
          const bExpired = bCal < todayStats.getTime();
          if (aExpired && !bExpired) return -1;
          if (!aExpired && bExpired) return 1;
          return aCal - bCal;
        });

      return {
        success: true,
        data: {
          details: {
            total_item_types: totalItemTypes,
            item_types_with_stock: filteredItems.length,
            total_items: totalItems,
            active_items: activeItems,
            inactive_items: inactiveItems,
            low_stock_items: lowStockItems,
          },
          item_stock: {
            expire: {
              expired_count: expiredCount,
              near_expire_7_days: nearExpire7Days,
            },
            items_with_expiry: itemsWithExpiry,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch items stats',
        error: error.message,
      };
    }
  }

  async findOneItem(itemcode: string) {
    try {
      const item = await this.prisma.item.findUnique({
        where: { itemcode },
      });

      if (!item) {
        return { success: false, message: 'Item not found' };
      }

      return {
        success: true,
        data: item,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch item',
        error: error.message,
      };
    }
  }

  async updateItem(itemcode: string, updateItemDto: UpdateItemDto) {
    try {
      const existingItem = await this.prisma.item.findUnique({
        where: { itemcode },
      });

      if (!existingItem) {
        return { success: false, message: 'Item not found' };
      }

      // Remove undefined/null values from the DTO
      const cleanData = Object.fromEntries(
        Object.entries(updateItemDto).filter(
          ([_, value]) => value !== undefined && value !== null,
        ),
      ) as any;

      const item = await this.prisma.item.update({
        where: { itemcode },
        data: cleanData,
      });

      return {
        success: true,
        message: 'Item updated successfully',
        data: item,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update item',
        error: error.message,
      };
    }
  }

  async removeItem(itemcode: string) {
    try {
      const existingItem = await this.prisma.item.findUnique({
        where: { itemcode },
      });

      if (!existingItem) {
        return { success: false, message: 'Item not found' };
      }

      await this.prisma.item.delete({
        where: { itemcode },
      });

      return {
        success: true,
        message: 'Item deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete item',
        error: error.message,
      };
    }
  }

  async findItemsByUser(user_id: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: user_id },
      });

      if (!user) {
        return { success: false, message: 'User not found' };
      }

      const items = await this.prisma.item.findMany({
        where: { item_status: 0 },
        orderBy: { CreateDate: 'desc' },
      });

      return {
        success: true,
        data: items,
        count: items.length,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch user items',
        error: error.message,
      };
    }
  }

  async updateItemMinMax(
    itemcode: string,
    updateMinMaxDto: UpdateItemMinMaxDto,
  ) {
    try {
      const itemCodeNorm = (itemcode ?? '').trim();
      if (!itemCodeNorm) {
        return { success: false, message: 'itemcode is required' };
      }

      // Check if item exists
      const existingItem = await this.prisma.item.findUnique({
        where: { itemcode: itemCodeNorm },
      });

      if (!existingItem) {
        return { success: false, message: 'Item not found' };
      }

      // Validate: stock_max should be >= stock_min
      if (
        updateMinMaxDto.stock_max !== undefined &&
        updateMinMaxDto.stock_min !== undefined
      ) {
        if (updateMinMaxDto.stock_max < updateMinMaxDto.stock_min) {
          return {
            success: false,
            message: 'Stock Max must be greater than or equal to Stock Min',
          };
        }
      }

      // อัปเดตเฉพาะ CabinetItemSetting เท่านั้น (ต้องส่ง cabinet_id)
      const cabinetId = updateMinMaxDto.cabinet_id;
      if (cabinetId == null) {
        return {
          success: false,
          message: 'cabinet_id is required to update min/max',
        };
      }

      const overrideData: { stock_min?: number; stock_max?: number } = {};
      if (updateMinMaxDto.stock_min !== undefined) overrideData.stock_min = updateMinMaxDto.stock_min;
      if (updateMinMaxDto.stock_max !== undefined) overrideData.stock_max = updateMinMaxDto.stock_max;

      const row = await this.prisma.cabinetItemSetting.upsert({
        where: {
          cabinet_id_item_code: { cabinet_id: cabinetId, item_code: itemCodeNorm },
        },
        create: {
          cabinet_id: cabinetId,
          item_code: itemCodeNorm,
          stock_min: overrideData.stock_min ?? null,
          stock_max: overrideData.stock_max ?? null,
        },
        update: {
          ...(overrideData.stock_min !== undefined && { stock_min: overrideData.stock_min }),
          ...(overrideData.stock_max !== undefined && { stock_max: overrideData.stock_max }),
        },
      });

      return {
        success: true,
        message: 'Item min/max updated successfully (per cabinet)',
        data: {
          itemcode,
          stock_min: row.stock_min,
          stock_max: row.stock_max,
        },
      };
    } catch (error) {
      console.error('❌ Update min/max error:', error.message);
      return {
        success: false,
        message: 'Failed to update item min/max',
        error: error.message,
      };
    }
  }


  // ====================================== Item Stock API ======================================
  async findAllItemStock(
    page: number = 1,
    limit: number = 10,
    keyword?: string,
    sort_by: string = 'ItemCode',
    sort_order: string = 'asc',
  ) {
    try {
      const where: any = {};
      const skip = (page - 1) * limit;

      // Search in item relation (itemcode and itemname)
      if (keyword) {
        where.item = {
          OR: [
            { itemcode: { contains: keyword } },
            { itemname: { contains: keyword } },
          ],
        };
      }

      // Count total matching records
      const total = await this.prisma.itemStock.count({
        where,
      });

      // Get paginated data
      const itemStocks = await this.prisma.itemStock.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sort_by]: sort_order === 'asc' ? 'asc' : 'desc',
        },
        include: {
          item: {
            select: {
              itemcode: true,
              itemname: true,
            },
          },
        },
      });

      return {
        success: true,
        data: itemStocks,
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch item stocks',
        error: error.message,
      };
    }
  }

  // ====================================== Item Stock IN Cabinet API ======================================

  async findAllItemStockInCabinet(
    page: number = 1,
    limit: number = 10,
    keyword?: string,
    cabinet_id?: number,
  ) {
    try {
      const where: any = {};
      const skip = (page - 1) * limit;

      // แสดงทั้งหมด (ทั้งที่อยู่ในตู้และถูกเบิก)
      // where.IsStock = true; // ลบออกเพื่อแสดงทั้งหมด

      if (cabinet_id) {
        // Get stock_id from cabinet table
        const cabinet = await this.prisma.cabinet.findUnique({
          where: { id: cabinet_id },
          select: { stock_id: true },
        });
        if (cabinet?.stock_id) {
          where.StockID = cabinet.stock_id;
        }
      }

      if (keyword) {
        where.item = {
          OR: [
            { itemcode: { contains: keyword } },
            { itemname: { contains: keyword } },
          ],
        };
      }
      const total = await this.prisma.itemStock.count({
        where,
      });

      const itemStocks = await this.prisma.itemStock.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          LastCabinetModify: 'desc',
        },
        select: {
          StockID: true,
          RfidCode: true,
          LastCabinetModify: true,
          Qty: true,
          ItemCode: true,
          IsStock: true,
          CabinetUserID: true,
          CreateDate: true,
          ReturnDate: true,
          InsertDate: true,
          cabinet: {
            select: {
              cabinet_name: true,
              cabinet_code: true,
            },
          },
          item: {
            select: {
              itemcode: true,
              itemname: true,
            },
          },
        },
      });

      // สรุปจำนวนอุปกรณ์แต่ละชนิดในตู้ (A กี่ชิ้น, B กี่ชิ้น, ...)
      const itemCountsRaw = await this.prisma.itemStock.groupBy({
        by: ['ItemCode'],
        where,
        _sum: { Qty: true },
        _count: { RowID: true },
        _min: { ExpireDate: true, expDate: true },
      });
      const itemCodes = itemCountsRaw.map((x) => x.ItemCode).filter(Boolean) as string[];
      const itemsInfo =
        itemCodes.length > 0
          ? await this.prisma.item.findMany({
            where: { itemcode: { in: itemCodes } },
            select: {
              itemcode: true,
              itemname: true,
              Alternatename: true,
              Barcode: true,
              stock_min: true,
              stock_max: true,
            },
          })
          : [];
      const itemInfoByCode = Object.fromEntries(
        itemsInfo.map((i) => [i.itemcode, i]),
      );
      const item_counts = itemCountsRaw.map((row) => {
        const code = row.ItemCode ?? '';
        const info = itemInfoByCode[code];
        const ed = row._min?.ExpireDate;
        const ex = row._min?.expDate;
        const tEd = ed ? new Date(ed).getTime() : null;
        const tEx = ex ? new Date(ex).getTime() : null;
        let nearest_expire: Date | null = null;
        if (tEd != null && tEx != null) {
          nearest_expire = new Date(Math.min(tEd, tEx));
        } else if (tEd != null) {
          nearest_expire = new Date(tEd);
        } else if (tEx != null) {
          nearest_expire = new Date(tEx);
        }
        return {
          itemcode: row.ItemCode,
          itemname: info?.itemname ?? (code || '-'),
          total_qty: row._sum.Qty ?? 0,
          count_rows: row._count.RowID,
          nearest_expire,
          item: info
            ? {
              itemcode: info.itemcode,
              itemname: info.itemname,
              Alternatename: info.Alternatename,
              Barcode: info.Barcode,
              stock_min: info.stock_min,
              stock_max: info.stock_max,
            }
            : null,
        };
      });

      return {
        success: true,
        data: itemStocks,
        item_counts,
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch item stocks in cabinet',
        error: error.message,
      };
    }
  }

  /**
   * รายการ RFID รายชิ้นจาก itemstock ตามคู่ (ItemCode, StockID) — ใช้หน้าสต๊อกตู้ RFID
   */
  async findRfidLinesByItemAndStock(itemcode: string, stockId: number) {
    const code = itemcode?.trim();
    if (!code || stockId == null || stockId <= 0) {
      return { success: false, message: 'itemcode และ stock_id ไม่ถูกต้อง', data: [] };
    }
    const rows = await this.prisma.itemStock.findMany({
      where: {
        ItemCode: code,
        StockID: stockId,
        IsStock: true,
        IsCancel: false,
      },
      select: {
        RowID: true,
        RfidCode: true,
        ExpireDate: true,
        expDate: true,
      },
      orderBy: [{ RfidCode: 'asc' }, { RowID: 'asc' }],
    });
    const data = rows
      .filter((r) => (r.RfidCode ?? '').trim().length > 0)
      .map((r) => {
        const exp = r.ExpireDate ?? r.expDate ?? null;
        return {
          rowId: r.RowID,
          rfidCode: (r.RfidCode ?? '').trim(),
          expireDate: exp,
        };
      });
    return { success: true, data };
  }

  /**
   * RFID จัดกลุ่มตาม ItemCode สำหรับตู้เดียว (StockID)
   * คืน data เป็น Record<itemcode, { rowId, rfidCode, expireDate }[]>
   */
  async findRfidLinesGroupedByStock(stockId: number, keyword?: string) {
    if (stockId == null || stockId <= 0) {
      return { success: false, message: 'stock_id ไม่ถูกต้อง', data: {} };
    }
    try {
      const where: Prisma.ItemStockWhereInput = {
        StockID: stockId,
        IsStock: true,
        IsCancel: false,
      };
      const kw = keyword?.trim();
      if (kw) {
        where.item = {
          OR: [
            { itemcode: { contains: kw } },
            { itemname: { contains: kw } },
          ],
        };
      }
      const rows = await this.prisma.itemStock.findMany({
        where,
        select: {
          ItemCode: true,
          RowID: true,
          RfidCode: true,
          ExpireDate: true,
          expDate: true,
        },
        orderBy: [{ ItemCode: 'asc' }, { RfidCode: 'asc' }, { RowID: 'asc' }],
      });
      const map: Record<
        string,
        { rowId: number; rfidCode: string; expireDate: Date | null }[]
      > = {};
      for (const r of rows) {
        const code = (r.ItemCode ?? '').trim();
        const tag = (r.RfidCode ?? '').trim();
        if (!code || !tag) continue;
        const exp = r.ExpireDate ?? r.expDate ?? null;
        const line = { rowId: r.RowID, rfidCode: tag, expireDate: exp };
        if (!map[code]) map[code] = [];
        map[code].push(line);
      }
      return { success: true, data: map };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to fetch RFID lines by stock',
        error: error.message,
        data: {},
      };
    }
  }

  // ====================================== Item Stock Return API ======================================
  /**
   * สรุปตาม ItemCode: ถอนวันนี้ - ใช้วันนี้ - คืนวันนี้ = max_available_qty
   * ใช้ item_code จาก supply_item_return_records (อ้างอิงตามรหัสสินค้า)
   */
  async findAllItemStockWillReturn() {
    try {
      type Row = {
        ItemCode: string;
        StockID: number;
        cabinet_name: string | null;
        cabinet_code: string | null;
        department_id: number | null;
        department_name: string | null;
        itemname: string | null;
        withdraw_qty: number;
        used_qty: number;
        return_qty: number;
        max_available_qty: number;
      };
      const result = await this.prisma.$queryRaw<Row[]>`
    SELECT *
        FROM (
            SELECT
                w.ItemCode,
                w.StockID,
                c.cabinet_name,
                c.cabinet_code,
                cd.department_id,
                dept.DepName AS department_name,
                i.itemname,
                w.withdraw_qty,
                COALESCE(u.used_qty, 0) AS used_qty,
                COALESCE(r.return_qty, 0) AS return_qty,
                (w.withdraw_qty
                    - COALESCE(u.used_qty, 0)
                    - COALESCE(r.return_qty, 0)) AS max_available_qty
            FROM (
                SELECT
                    ist.ItemCode,
                    COUNT(*) AS withdraw_qty,
                    ist.StockID
                FROM itemstock ist
                WHERE ist.IsStock = 0
                  AND DATE(ist.LastCabinetModify) = DATE(NOW())
                GROUP BY ist.StockID,
                ist.ItemCode
            ) w
            LEFT JOIN app_microservice_cabinets c ON c.stock_id = w.StockID
            LEFT JOIN (
                SELECT cabinet_id, MIN(department_id) AS department_id
                FROM app_microservice_cabinet_departments
                WHERE status = 'ACTIVE'
                GROUP BY cabinet_id
            ) cd ON cd.cabinet_id = c.id
            LEFT JOIN department dept ON dept.ID = cd.department_id
            LEFT JOIN (
                SELECT
                    sui.order_item_code AS ItemCode,
                    msu.department_code,
                    SUM(sui.qty) AS used_qty
                FROM app_microservice_supply_usage_items sui
                INNER JOIN app_microservice_medical_supply_usages msu ON msu.id = sui.medical_supply_usage_id
                WHERE DATE(sui.created_at) = DATE(NOW())
                  AND (sui.order_item_status IS NULL OR sui.order_item_status != 'Discontinue')
                GROUP BY sui.order_item_code, msu.department_code
            ) u ON u.ItemCode = w.ItemCode AND (u.department_code COLLATE utf8mb4_unicode_ci = CAST(cd.department_id AS CHAR) COLLATE utf8mb4_unicode_ci)
            LEFT JOIN (
                SELECT
                    srr.item_code AS ItemCode,
                    srr.stock_id AS StockID,
                    SUM(srr.qty_returned) AS return_qty
                FROM app_microservice_supply_item_return_records srr
                WHERE DATE(srr.return_datetime) = DATE(NOW())
                GROUP BY srr.item_code, srr.stock_id
            ) r ON r.ItemCode = w.ItemCode AND r.StockID = w.StockID
            LEFT JOIN item i ON i.itemcode = w.ItemCode
        ) x
        WHERE x.max_available_qty > 0
        ORDER BY x.ItemCode; `;

      // แปลง BigInt เป็น Number เพื่อให้ serialize ผ่าน TCP ได้ (JSON.stringify ไม่รองรับ BigInt)
      const data = result.map((row) => ({
        ItemCode: row.ItemCode,
        StockID: Number(row.StockID),
        cabinet_name: row.cabinet_name ?? null,
        cabinet_code: row.cabinet_code ?? null,
        department_id: row.department_id != null ? Number(row.department_id) : null,
        department_name: row.department_name ?? null,
        itemname: row.itemname,
        withdraw_qty: Number(row.withdraw_qty),
        used_qty: Number(row.used_qty),
        return_qty: Number(row.return_qty),
        max_available_qty: Number(row.max_available_qty),
      }));

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch itemstock will return count',
        error: (error as any)?.message ?? String(error),
      };
    }
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const NEAR_EXPIRY_DAYS = 30;
const WEIGHING_FILTER_MAX_ROWS = 10_000;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** สอดคล้อง frontend items-stock `matchesStatusChip` / `rowFlags` */
function weighingRowMatchesStockStatus(
  row: {
    Qty: number | null;
    nearestExpireDate: Date | null;
    cabinetItemSetting: { stock_min: number | null; stock_max: number | null } | null;
    item?: { stock_min: number | null; stock_max: number | null } | null;
  },
  chip: string,
): boolean {
  const c = (chip ?? 'all').trim().toLowerCase();
  if (!c || c === 'all') return true;

  const minV = row.cabinetItemSetting?.stock_min ?? row.item?.stock_min ?? null;
  const qty = row.Qty ?? 0;
  const low = minV != null && qty < minV;

  const expRaw = row.nearestExpireDate;
  const exp = expRaw != null ? new Date(expRaw) : null;
  const today = startOfDay(new Date());
  let expired = false;
  let soon = false;
  if (exp && !Number.isNaN(exp.getTime())) {
    const ed = startOfDay(exp);
    expired = ed < today;
    if (!expired) {
      const limit = new Date(today);
      limit.setDate(limit.getDate() + NEAR_EXPIRY_DAYS);
      soon = ed <= limit;
    }
  }

  if (c === 'expired') return expired;
  if (c === 'soon') return soon && !expired;
  if (c === 'low') return low;
  return true;
}

/** จำนวนที่ต้องเติม = max − qty (เมื่อ qty < min และมี max) — ใช้ GET /weighing/low-stock */
function weighingRefillQuantityFromRow(row: {
  Qty: number | null;
  cabinetItemSetting: { stock_min: number | null; stock_max: number | null } | null;
  item?: { stock_min: number | null; stock_max: number | null } | null;
}): number | null {
  const minV = row.cabinetItemSetting?.stock_min ?? row.item?.stock_min ?? null;
  const maxV = row.cabinetItemSetting?.stock_max ?? row.item?.stock_max ?? null;
  const qty = row.Qty ?? 0;
  if (minV == null || qty >= minV) return null;
  if (maxV == null) return null;
  return Math.max(0, maxV - qty);
}

@Injectable()
export class WeighingService {
  constructor(private readonly prisma: PrismaService) { }

  /** stock_id ของตู้ที่ถือเป็น "ตู้ 0" — ใช้กรองแทน relation OR เพื่อไม่ให้แถว detail ซ้ำจากแผน SQL */
  private async getStockIdsExcludedAsCabinetZero(): Promise<number[]> {
    const rows = await this.prisma.cabinet.findMany({
      where: {
        stock_id: { not: null, gt: 0 },
        OR: [{ cabinet_code: '0' }, { cabinet_name: 'ตู้ 0' }],
      },
      select: { stock_id: true },
    });
    const ids = rows
      .map((r) => r.stock_id)
      .filter((id): id is number => id != null && typeof id === 'number' && id > 0);
    return [...new Set(ids)];
  }

  /**
   * ดึงรายการ ItemSlotInCabinet แบบแบ่งหน้า (รวม relation cabinet)
   * itemName: ค้นหาจากชื่ออุปกรณ์ (itemname / Alternatename)
   * ไม่แสดงรายการที่ชื่อสินค้าเป็น '-' หรือตู้ 0
   */
  async findAll(params: {
    page?: number;
    limit?: number;
    itemcode?: string;
    itemName?: string;
    stockId?: number;
    /** กรองสต๊อกหน้า items-stock: all | expired | soon | low */
    stock_status?: string;
  }) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 50, 10000);
    const skip = (page - 1) * limit;
    const stockChip = (params.stock_status ?? 'all').trim().toLowerCase();
    const useStockFilter = stockChip !== '' && stockChip !== 'all';

    const hasItemNameFilter = {
      itemname: { not: null },
      NOT: { OR: [{ itemname: '' }, { itemname: '-' }] },
    };
    const notCabinetZeroFilter = {
      OR: [
        { cabinet: null },
        { cabinet: { cabinet_code: { not: '0' }, cabinet_name: { not: 'ตู้ 0' } } },
      ],
    };

    const baseWhere: { itemcode?: { contains: string }; item?: object; StockID?: number } = {};
    if (params.itemName?.trim()) {
      const k = params.itemName.trim();
      baseWhere.item = {
        AND: [
          hasItemNameFilter,
          { OR: [{ itemname: { contains: k } }, { Alternatename: { contains: k } }] },
        ],
      };
    } else if (params.itemcode?.trim()) {
      baseWhere.itemcode = { contains: params.itemcode.trim() };
      baseWhere.item = hasItemNameFilter;
    } else {
      baseWhere.item = hasItemNameFilter;
    }
    if (params.stockId != null && params.stockId > 0) {
      baseWhere.StockID = params.stockId;
    }
    const where = { AND: [baseWhere, notCabinetZeroFilter] };

    const includeBlock = {
      _count: { select: { itemSlotInCabinetDetail: true } },
      cabinet: { select: { id: true, cabinet_name: true, cabinet_code: true, stock_id: true } },
      item: {
        select: {
          itemcode: true,
          itemname: true,
          Alternatename: true,
          Barcode: true,
          stock_min: true,
          stock_max: true,
        },
      },
    };

    /** ให้ TS รู้ relation หลัง findMany + include (Prisma client จาก generated) */
    type WeighingSlotRow = {
      id: number;
      itemcode: string;
      StockID: number;
      SlotNo: number;
      Sensor: number;
      Qty: number;
      cabinet: {
        id: number;
        cabinet_name: string | null;
        cabinet_code: string | null;
        stock_id: number | null;
      } | null;
      item: {
        itemcode: string;
        itemname: string | null;
        Alternatename: string | null;
        Barcode: string | null;
        stock_min: number | null;
        stock_max: number | null;
      } | null;
      _count: { itemSlotInCabinetDetail: number };
    };

    const findManyArgs = {
      where,
      orderBy: [{ SlotNo: 'asc' as const }, { Sensor: 'asc' as const }],
      include: includeBlock,
      ...(useStockFilter ? { take: WEIGHING_FILTER_MAX_ROWS } : { skip, take: limit }),
    };

    const [itemsRaw, total] = await Promise.all([
      this.prisma.itemSlotInCabinet.findMany(findManyArgs as never),
      useStockFilter ? Promise.resolve(0) : this.prisma.itemSlotInCabinet.count({ where }),
    ]);
    const items = itemsRaw as WeighingSlotRow[];

    const pairList: { cabinet_id: number; item_code: string }[] = [];
    const pairSeen = new Set<string>();
    for (const row of items) {
      const cid = row.cabinet?.id;
      if (cid == null) continue;
      const pk = JSON.stringify([cid, row.itemcode]);
      if (pairSeen.has(pk)) continue;
      pairSeen.add(pk);
      pairList.push({ cabinet_id: cid, item_code: row.itemcode });
    }

    let settingMap = new Map<string, { stock_min: number | null; stock_max: number | null }>();
    if (pairList.length > 0) {
      const settings = await this.prisma.cabinetItemSetting.findMany({
        where: {
          OR: pairList.map((p) => ({ cabinet_id: p.cabinet_id, item_code: p.item_code })),
        },
        select: { cabinet_id: true, item_code: true, stock_min: true, stock_max: true },
      });
      settingMap = new Map(
        settings.map((s) => [
          JSON.stringify([s.cabinet_id, s.item_code]),
          { stock_min: s.stock_min, stock_max: s.stock_max },
        ]),
      );
    }

    const pairExpire = new Map<string, { itemcode: string; stockId: number }>();
    for (const row of items) {
      if (row.StockID == null || row.StockID <= 0 || !row.itemcode) continue;
      const pk = `${row.itemcode}\0${row.StockID}`;
      if (!pairExpire.has(pk)) {
        pairExpire.set(pk, { itemcode: row.itemcode, stockId: row.StockID });
      }
    }
    const expireMinByPair = new Map<string, Date>();
    if (pairExpire.size > 0) {
      const pairs = [...pairExpire.values()];
      const stockLines = await this.prisma.itemStock.findMany({
        where: {
          OR: pairs.map((p) => ({ ItemCode: p.itemcode, StockID: p.stockId })),
          IsStock: true,
          IsCancel: false,
          ExpireDate: { not: null },
        },
        select: { ItemCode: true, StockID: true, ExpireDate: true },
      });
      for (const s of stockLines) {
        if (!s.ItemCode || s.StockID == null || !s.ExpireDate) continue;
        const k = `${s.ItemCode}\0${s.StockID}`;
        const prev = expireMinByPair.get(k);
        const t = s.ExpireDate.getTime();
        if (prev == null || t < prev.getTime()) expireMinByPair.set(k, s.ExpireDate);
      }
    }

    let data = items.map((row) => {
      const cid = row.cabinet?.id;
      const key = cid != null ? JSON.stringify([cid, row.itemcode]) : null;
      const st = key ? settingMap.get(key) : undefined;
      const ek =
        row.itemcode && row.StockID != null && row.StockID > 0
          ? `${row.itemcode}\0${row.StockID}`
          : null;
      const nearestExpireDate = ek ? expireMinByPair.get(ek) ?? null : null;
      return {
        ...row,
        nearestExpireDate,
        cabinetItemSetting:
          st != null
            ? { stock_min: st.stock_min, stock_max: st.stock_max }
            : null,
      };
    });

    let effectiveTotal = total;
    if (useStockFilter) {
      data = data.filter((row) => weighingRowMatchesStockStatus(row, stockChip));
      effectiveTotal = data.length;
      data = data.slice(skip, skip + limit);
    }

    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: effectiveTotal,
        totalPages: Math.ceil(effectiveTotal / limit) || 1,
      },
    };
  }

  /**
   * รายการสต็อกต่ำ Weighing แยกจาก GET /weighing — เฉพาะ qty ต่ำกว่า min
   * refillQuantity = max − qty เมื่อมีค่า max (ไม่มี max จะเป็น null)
   */
  async findLowStockRefill(params: {
    stockId?: number;
    itemName?: string;
    page?: number;
    limit?: number;
  }) {
    if (params.stockId == null || params.stockId <= 0) {
      throw new BadRequestException('stockId is required and must be a positive number');
    }
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(Math.max(1, params.limit ?? 500), 5000);
    const inner = await this.findAll({
      page: 1,
      limit: WEIGHING_FILTER_MAX_ROWS,
      stockId: params.stockId,
      itemName: params.itemName,
      stock_status: 'low',
    });
    const withRefill = inner.data.map((row) => ({
      ...row,
      refillQuantity: weighingRefillQuantityFromRow(row),
    }));
    const total = withRefill.length;
    const skip = (page - 1) * limit;
    const data = withRefill.slice(skip, skip + limit);
    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * ดึงหนึ่งรายการตาม itemcode (รวม detail count)
   */
  async findByItemcode(itemcode: string) {
    const item = await this.prisma.itemSlotInCabinet.findUnique({
      where: { itemcode },
      include: {
        _count: { select: { itemSlotInCabinetDetail: true } },
      },
    });
    if (!item) throw new NotFoundException('Item slot not found');
    return { success: true, data: item };
  }

  /**
   * ดึงรายการ ItemSlotInCabinetDetail ตาม itemcode
   */
  async findDetailsByItemcode(
    itemcode: string,
    params: { page?: number; limit?: number } = {},
  ) {
    const slot = await this.prisma.itemSlotInCabinet.findUnique({
      where: { itemcode },
    });
    if (!slot) throw new NotFoundException('Item slot not found');

    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 50, 10000);
    const skip = (page - 1) * limit;

    const [details, total] = await Promise.all([
      this.prisma.itemSlotInCabinetDetail.findMany({
        where: { itemcode },
        skip,
        take: limit,
        orderBy: { ModifyDate: 'desc' },
        include: {
          item: {
            select: {
              itemcode: true,
              itemname: true,
              Alternatename: true,
              Barcode: true,
            },
          },
          userCabinet: {
            include: {
              legacyUser: {
                include: {
                  employee: {
                    select: { FirstName: true, LastName: true },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.itemSlotInCabinetDetail.count({ where: { itemcode } }),
    ]);

    return {
      success: true,
      data: details,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * ดึงรายการ ItemSlotInCabinetDetail แบบแบ่งหน้า ตาม Sign (เบิก = '-', เติม = '+')
   * dateFrom/dateTo: YYYY-MM-DD, กรองตาม ModifyDate (ต้นวัน - ปลายวัน UTC)
   * itemName: ค้นหาจากชื่ออุปกรณ์ (itemname / Alternatename)
   * แสดงเฉพาะรายการที่ item มี itemname (ไม่ null, ไม่ว่าง, ไม่ใช่ '-') และไม่แสดงตู้ 0
   */
  async findDetailsBySign(
    sign: string,
    params: {
      page?: number;
      limit?: number;
      itemcode?: string;
      itemName?: string;
      stockId?: number;
      dateFrom?: string;
      dateTo?: string;
    } = {},
  ) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 50, 10000);
    const skip = (page - 1) * limit;

    // กรองเฉพาะ item ที่มี itemname (ไม่ null, ไม่ว่าง, ไม่ใช่ '-')
    const hasItemNameFilter = {
      itemname: { not: null },
      NOT: { OR: [{ itemname: '' }, { itemname: '-' }] },
    };

    const excludeStockIds = await this.getStockIdsExcludedAsCabinetZero();
    if (params.stockId != null && params.stockId > 0 && excludeStockIds.includes(params.stockId)) {
      return {
        success: true,
        data: [],
        pagination: { page, limit, total: 0, totalPages: 1 },
      };
    }

    const where: {
      Sign: string;
      itemcode?: { contains: string };
      item?: object;
      StockID?: number | { notIn: number[] };
      ModifyDate?: { gte?: Date; lte?: Date };
    } = {
      Sign: sign === '+' ? '+' : '-',
    };
    if (params.itemName?.trim()) {
      const k = params.itemName.trim();
      where.item = {
        AND: [
          hasItemNameFilter,
          {
            OR: [
              { itemname: { contains: k } },
              { Alternatename: { contains: k } },
            ],
          },
        ],
      };
    } else if (params.itemcode?.trim()) {
      where.itemcode = { contains: params.itemcode.trim() };
      where.item = hasItemNameFilter;
    } else {
      where.item = hasItemNameFilter;
    }
    // ไม่แสดงตู้ 0 — กรองที่ StockID เพื่อไม่ให้เกิดแถวซ้ำจาก subquery/JOIN ของ Prisma เมื่อใช้ OR บน relation
    if (params.stockId != null && params.stockId > 0) {
      where.StockID = params.stockId;
    } else if (excludeStockIds.length > 0) {
      where.StockID = { notIn: excludeStockIds };
    }
    if (params.dateFrom?.trim()) {
      where.ModifyDate = {
        ...where.ModifyDate,
        gte: new Date(params.dateFrom.trim() + 'T00:00:00.000Z'),
      };
    }
    if (params.dateTo?.trim()) {
      where.ModifyDate = {
        ...where.ModifyDate,
        lte: new Date(params.dateTo.trim() + 'T23:59:59.999Z'),
      };
    }

    const [details, total] = await Promise.all([
      this.prisma.itemSlotInCabinetDetail.findMany({
        where,
        skip,
        take: limit,
        orderBy: { ModifyDate: 'desc' },
        include: {
          item: {
            select: {
              itemcode: true,
              itemname: true,
              Alternatename: true,
              Barcode: true,
            },
          },
          itemSlotInCabinet: {
            select: {
              cabinet: {
                select: {
                  id: true,
                  cabinet_name: true,
                  cabinet_code: true,
                  stock_id: true,
                },
              },
            },
          },
          userCabinet: {
            include: {
              legacyUser: {
                include: {
                  employee: {
                    select: { FirstName: true, LastName: true },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.itemSlotInCabinetDetail.count({ where }),
    ]);

    const seenIds = new Set<number>();
    const data = details.filter((row) => {
      if (seenIds.has(row.id)) return false;
      seenIds.add(row.id);
      return true;
    });

    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * ดึงรายการตู้ (cabinet) ที่มีสต๊อกในตู้ Weighing (มีอย่างน้อย 1 แถวใน ItemSlotInCabinet)
   * ไม่รวมตู้ 0 (cabinet_code = '0' หรือ cabinet_name = 'ตู้ 0')
   */
  async findCabinetsWithWeighingStock() {
    const stockIds = await this.prisma.itemSlotInCabinet.findMany({
      select: { StockID: true },
      distinct: ['StockID'],
    });
    const ids = [...new Set(stockIds.map((s) => s.StockID))].filter((id) => id != null && id > 0);
    if (ids.length === 0) {
      return { success: true, data: [] };
    }
    const cabinets = await this.prisma.cabinet.findMany({
      where: {
        stock_id: { in: ids },
        NOT: {
          OR: [
            { cabinet_code: '0' },
            { cabinet_name: 'ตู้ 0' },
          ],
        },
      },
      select: { id: true, cabinet_name: true, cabinet_code: true, cabinet_status: true, stock_id: true },
      orderBy: { cabinet_name: 'asc' },
    });
    return { success: true, data: cabinets };
  }
}

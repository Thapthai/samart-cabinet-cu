import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WeighingService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * ดึงรายการ ItemSlotInCabinet แบบแบ่งหน้า (รวม relation cabinet)
   * itemName: ค้นหาจากชื่ออุปกรณ์ (itemname / Alternatename)
   * ไม่แสดงรายการที่ชื่อสินค้าเป็น '-' หรือตู้ 0
   */
  async findAll(params: { page?: number; limit?: number; itemcode?: string; itemName?: string; stockId?: number }) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 50, 10000);
    const skip = (page - 1) * limit;

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

    const [items, total] = await Promise.all([
      this.prisma.itemSlotInCabinet.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ SlotNo: 'asc' }, { Sensor: 'asc' }],
        include: {
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
        },
      }),
      this.prisma.itemSlotInCabinet.count({ where }),
    ]);

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

    const data = items.map((row) => {
      const cid = row.cabinet?.id;
      const key = cid != null ? JSON.stringify([cid, row.itemcode]) : null;
      const st = key ? settingMap.get(key) : undefined;
      return {
        ...row,
        cabinetItemSetting:
          st != null
            ? { stock_min: st.stock_min, stock_max: st.stock_max }
            : null,
      };
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

    // ไม่แสดงตู้ 0 (cabinet_code = '0' หรือ cabinet_name = 'ตู้ 0')
    const notCabinetZeroFilter = {
      OR: [
        { cabinet: null },
        {
          cabinet: {
            cabinet_code: { not: '0' },
            cabinet_name: { not: 'ตู้ 0' },
          },
        },
      ],
    };

    const where: {
      Sign: string;
      itemcode?: { contains: string };
      item?: object;
      itemSlotInCabinet?: object;
      StockID?: number;
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
    // ไม่แสดงตู้ 0
    where.itemSlotInCabinet = notCabinetZeroFilter;
    if (params.stockId != null && params.stockId > 0) {
      where.StockID = params.stockId;
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

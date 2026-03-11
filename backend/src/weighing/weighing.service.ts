import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WeighingService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * ดึงรายการ ItemSlotInCabinet แบบแบ่งหน้า (รวม relation cabinet)
   * itemName: ค้นหาจากชื่ออุปกรณ์ (itemname / Alternatename)
   */
  async findAll(params: { page?: number; limit?: number; itemcode?: string; itemName?: string; stockId?: number }) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 50, 10000);
    const skip = (page - 1) * limit;

    const where: { itemcode?: { contains: string }; item?: object; StockID?: number } = {};
    if (params.itemName?.trim()) {
      const k = params.itemName.trim();
      where.item = {
        OR: [
          { itemname: { contains: k } },
          { Alternatename: { contains: k } },
        ],
      };
    } else if (params.itemcode?.trim()) {
      where.itemcode = { contains: params.itemcode.trim() };
    }
    if (params.stockId != null && params.stockId > 0) {
      where.StockID = params.stockId;
    }

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
            },
          },
        },
      }),
      this.prisma.itemSlotInCabinet.count({ where }),
    ]);

    return {
      success: true,
      data: items,
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
   * แสดงเฉพาะรายการที่ item มี itemname (ไม่ null และไม่ว่าง)
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

    // กรองเฉพาะ item ที่มี itemname (ไม่ null และไม่ว่าง)
    const hasItemNameFilter = {
      itemname: { not: null },
      NOT: { itemname: '' },
    };

    const where: {
      Sign: string;
      itemcode?: { contains: string };
      item?: object;
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
      where: { stock_id: { in: ids } },
      select: { id: true, cabinet_name: true, cabinet_code: true, cabinet_status: true, stock_id: true },
      orderBy: { cabinet_name: 'asc' },
    });
    return { success: true, data: cabinets };
  }
}

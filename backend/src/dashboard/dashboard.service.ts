import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WeighingService } from '../weighing/weighing.service';

function lastNDatesUtcIso(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** เงื่อนไขเดียวกับการนับสต็อกในระบบ (มี RFID และยังอยู่ในตู้) */
const itemStockInCabinetWhere = {
  IsStock: true,
  RfidCode: { not: '' },
} as const;

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly weighingService: WeighingService,
  ) {}

  private async countWeighingCabinetDepartmentMappings(): Promise<number> {
    const slotStockIds = await this.prisma.itemSlotInCabinet.findMany({
      select: { StockID: true },
      distinct: ['StockID'],
    });
    const stockIds = [...new Set(slotStockIds.map((s) => s.StockID))].filter((id) => id != null && id > 0);
    if (stockIds.length === 0) return 0;
    const cabinets = await this.prisma.cabinet.findMany({
      where: { stock_id: { in: stockIds } },
      select: { id: true },
    });
    const cabinetIds = cabinets.map((c) => c.id);
    if (cabinetIds.length === 0) return 0;
    return this.prisma.cabinetDepartment.count({
      where: { cabinet_id: { in: cabinetIds } },
    });
  }

  /**
   * หมดอายุ / ใกล้หมดอายุ 30 วัน — นับจาก itemstock.ExpireDate โดยตรง
   * สต็อกต่ำกว่า min — เทียบ min จาก cabinet_item_settings กับผลรวม itemslotincabinet.Qty ต่อ (StockID, itemcode)
   */
  /** นับ KPI + รายการตู้–รายการที่ต่ำกว่า min (จำกัดจำนวนแถว) */
  private async getItemStockAlertsAndBelowMinList(listLimit = 15) {
    const now = new Date();
    const in30 = new Date(now);
    in30.setDate(in30.getDate() + 30);

    const [expiredStockCount, nearExpireStockCount, settings, slotQtyByPair] = await Promise.all([
      this.prisma.itemStock.count({
        where: {
          ...itemStockInCabinetWhere,
          ExpireDate: { not: null, lt: now },
        },
      }),
      this.prisma.itemStock.count({
        where: {
          ...itemStockInCabinetWhere,
          ExpireDate: { not: null, gte: now, lte: in30 },
        },
      }),
      this.prisma.cabinetItemSetting.findMany({
        where: {
          stock_min: { not: null, gt: 0 },
        },
        select: {
          id: true,
          item_code: true,
          stock_min: true,
          stock_max: true,
          cabinet: {
            select: {
              stock_id: true,
              cabinet_name: true,
              cabinet_code: true,
              cabinet_type: true,
            },
          },
        },
      }),
      this.prisma.itemSlotInCabinet.groupBy({
        by: ['StockID', 'itemcode'],
        _sum: { Qty: true },
      }),
    ]);

    const qtyByStockAndItem = new Map<string, number>();
    for (const g of slotQtyByPair) {
      qtyByStockAndItem.set(`${g.StockID}|${g.itemcode}`, g._sum.Qty ?? 0);
    }

    let belowMinCabinetItemPairs = 0;
    type BelowRaw = {
      id: number;
      itemCode: string;
      currentQty: number;
      stockMin: number;
      stockMax: number | null;
      cabinetLabel: string;
    };
    const belowRaw: BelowRaw[] = [];

    for (const s of settings) {
      const stockId = s.cabinet?.stock_id;
      if (stockId == null || stockId <= 0) continue;
      const minVal = s.stock_min ?? 0;
      if (minVal <= 0) continue;
      const cnt = qtyByStockAndItem.get(`${stockId}|${s.item_code}`) ?? 0;
      if (cnt < minVal) {
        belowMinCabinetItemPairs++;
        const cab = s.cabinet;
        const typeSuffix =
          cab?.cabinet_type && String(cab.cabinet_type).trim() !== ''
            ? ` (${String(cab.cabinet_type).toUpperCase()})`
            : '';
        const cabinetLabel = cab
          ? `${cab.cabinet_name || cab.cabinet_code || 'ตู้'}${typeSuffix}`
          : '-';
        belowRaw.push({
          id: s.id,
          itemCode: s.item_code,
          currentQty: cnt,
          stockMin: minVal,
          stockMax: s.stock_max ?? null,
          cabinetLabel,
        });
      }
    }

    belowRaw.sort((a, b) => a.currentQty - b.currentQty);
    const sliced = belowRaw.slice(0, listLimit);

    const codes = [...new Set(sliced.map((r) => r.itemCode))];
    const items =
      codes.length > 0
        ? await this.prisma.item.findMany({
            where: { itemcode: { in: codes } },
            select: { itemcode: true, itemname: true, Alternatename: true },
          })
        : [];
    const itemByCode = new Map(items.map((i) => [i.itemcode, i]));

    const belowMinStockList = sliced.map((r) => {
      const it = itemByCode.get(r.itemCode);
      const itemName = it?.itemname || it?.Alternatename || r.itemCode;
      return {
        settingId: r.id,
        itemCode: r.itemCode,
        itemName,
        cabinetLabel: r.cabinetLabel,
        currentQty: r.currentQty,
        stockMin: r.stockMin,
        stockMax: r.stockMax,
      };
    });

    return {
      expiredStockCount,
      nearExpireStockCount,
      belowMinCabinetItemPairs,
      belowMinStockList,
    };
  }

  /** รายการแสดงในตารางแดชบอร์ด (จำกัดจำนวน) */
  private async getExpiryStockLists(limit = 15) {
    const now = new Date();
    const in30 = new Date(now);
    in30.setDate(in30.getDate() + 30);

    const select = {
      RowID: true,
      ItemCode: true,
      ExpireDate: true,
      item: { select: { itemname: true, Alternatename: true } },
      cabinet: { select: { cabinet_name: true, cabinet_code: true, cabinet_type: true } },
    } as const;

    const [expiredRows, nearRows] = await Promise.all([
      this.prisma.itemStock.findMany({
        where: {
          ...itemStockInCabinetWhere,
          ExpireDate: { not: null, lt: now },
        },
        select,
        orderBy: { ExpireDate: 'asc' },
        take: limit,
      }),
      this.prisma.itemStock.findMany({
        where: {
          ...itemStockInCabinetWhere,
          ExpireDate: { not: null, gte: now, lte: in30 },
        },
        select,
        orderBy: { ExpireDate: 'asc' },
        take: limit,
      }),
    ]);

    const formatRow = (
      r: (typeof expiredRows)[0],
      status: 'EXPIRED' | 'NEAR_EXPIRY',
    ) => {
      const exp = r.ExpireDate ? new Date(r.ExpireDate) : null;
      const expireDate =
        exp != null
          ? `${exp.getFullYear()}-${String(exp.getMonth() + 1).padStart(2, '0')}-${String(exp.getDate()).padStart(2, '0')}`
          : '';
      const itemName =
        r.item?.itemname || r.item?.Alternatename || r.ItemCode || '-';
      const cab = r.cabinet;
      const typeSuffix =
        cab?.cabinet_type && String(cab.cabinet_type).trim() !== ''
          ? ` (${String(cab.cabinet_type).toUpperCase()})`
          : '';
      const cabinetLabel = cab
        ? `${cab.cabinet_name || cab.cabinet_code || 'ตู้'}${typeSuffix}`
        : '-';
      return {
        rowId: r.RowID,
        itemCode: r.ItemCode ?? '',
        itemName,
        expireDate,
        cabinetLabel,
        status,
      };
    };

    return {
      expiredStockList: expiredRows.map((r) => formatRow(r, 'EXPIRED')),
      nearExpireStockList: nearRows.map((r) => formatRow(r, 'NEAR_EXPIRY')),
    };
  }

  async getAdminOverview() {
    const days = lastNDatesUtcIso(7);
    const weekStart = days[0];
    const weekEnd = days[days.length - 1];

    const [
      stockPage,
      cabinetsRes,
      mappingsCount,
      weekDispense,
      weekRefill,
      recentDispense,
      recentRefill,
      stockAlertsBundle,
      expiryLists,
    ] = await Promise.all([
      this.weighingService.findAll({ page: 1, limit: 1 }),
      this.weighingService.findCabinetsWithWeighingStock(),
      this.countWeighingCabinetDepartmentMappings(),
      this.weighingService.findDetailsBySign('-', { page: 1, limit: 1, dateFrom: weekStart, dateTo: weekEnd }),
      this.weighingService.findDetailsBySign('+', { page: 1, limit: 1, dateFrom: weekStart, dateTo: weekEnd }),
      this.weighingService.findDetailsBySign('-', { page: 1, limit: 5 }),
      this.weighingService.findDetailsBySign('+', { page: 1, limit: 5 }),
      this.getItemStockAlertsAndBelowMinList(15),
      this.getExpiryStockLists(15),
    ]);

    const activityByDay = await Promise.all(
      days.map(async (date) => {
        const [disp, ref] = await Promise.all([
          this.weighingService.findDetailsBySign('-', { page: 1, limit: 1, dateFrom: date, dateTo: date }),
          this.weighingService.findDetailsBySign('+', { page: 1, limit: 1, dateFrom: date, dateTo: date }),
        ]);
        return {
          date,
          dispense: disp.pagination?.total ?? 0,
          refill: ref.pagination?.total ?? 0,
        };
      }),
    );

    const cabinetsCount = Array.isArray(cabinetsRes.data) ? cabinetsRes.data.length : 0;

    return {
      success: true,
      data: {
        summary: {
          stockSlotsTotal: stockPage.pagination?.total ?? 0,
          cabinetsCount,
          mappingsCount,
          dispenseLast7Days: weekDispense.pagination?.total ?? 0,
          refillLast7Days: weekRefill.pagination?.total ?? 0,
        },
        itemStockAlerts: {
          expiredStockCount: stockAlertsBundle.expiredStockCount,
          nearExpireStockCount: stockAlertsBundle.nearExpireStockCount,
          belowMinCabinetItemPairs: stockAlertsBundle.belowMinCabinetItemPairs,
        },
        expiredStockList: expiryLists.expiredStockList,
        nearExpireStockList: expiryLists.nearExpireStockList,
        belowMinStockList: stockAlertsBundle.belowMinStockList,
        activityByDay,
        recentDispense: recentDispense.data ?? [],
        recentRefill: recentRefill.data ?? [],
      },
    };
  }
}

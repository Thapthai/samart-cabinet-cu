import { weighingApi } from '@/lib/api';
import type { ItemSlotInCabinetRow } from '../items-stock-shared';

export type WeighingRow = ItemSlotInCabinetRow & { refillQuantity?: number | null };

/**
 * รายการ Weighing: GET /weighing หรือ GET /weighing/low-stock เมื่อกรองสต็อกต่ำ
 */
export async function fetchWeighingItemSlots(params: {
  stockId: number;
  page: number;
  limit: number;
  itemName?: string;
  stock_status?: string;
}) {
  const chip = (params.stock_status ?? 'all').trim().toLowerCase();
  if (chip === 'low') {
    return weighingApi.getLowStockRefill({
      page: params.page,
      limit: params.limit,
      itemName: params.itemName,
      stockId: params.stockId,
    });
  }
  return weighingApi.getAll({
    page: params.page,
    limit: params.limit,
    itemName: params.itemName,
    stockId: params.stockId,
    stock_status: params.stock_status,
  });
}

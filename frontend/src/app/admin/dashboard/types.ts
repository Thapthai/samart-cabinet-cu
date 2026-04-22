export interface DashboardDetailRow {
  id: number;
  itemcode: string;
  StockID: number;
  SlotNo: number;
  Sensor: number;
  Qty: number;
  ModifyDate: string;
  Sign: string;
  item?: { itemname: string | null; Alternatename: string | null } | null;
  userCabinet?: {
    legacyUser?: { employee?: { FirstName: string | null; LastName: string | null } | null } | null;
  } | null;
  /** จาก GET /dashboard/overview → findDetailsBySign include */
  itemSlotInCabinet?: {
    cabinet?: {
      id: number;
      cabinet_name: string | null;
      cabinet_code: string | null;
      stock_id: number | null;
    } | null;
  } | null;
}

export interface DashboardSummary {
  stockSlotsTotal: number;
  cabinetsCount: number;
  mappingsCount: number;
  dispenseLast7Days: number;
  refillLast7Days: number;
}

/** จาก dashboard/overview — itemstock.ExpireDate / min จาก cabinet_item_settings */
export interface DashboardItemStockAlerts {
  expiredStockCount: number;
  nearExpireStockCount: number;
  belowMinCabinetItemPairs: number;
}

export interface ActivityDay {
  date: string;
  dispense: number;
  refill: number;
}

export interface DashboardExpiryStockRow {
  rowId: number;
  itemCode: string;
  itemName: string;
  expireDate: string;
  cabinetLabel: string;
  status: 'EXPIRED' | 'NEAR_EXPIRY';
}

/** คู่ตู้–รายการที่กำหนด min แล้วจำนวนในตู้ต่ำกว่า min */
export interface DashboardBelowMinRow {
  settingId: number;
  itemCode: string;
  itemName: string;
  cabinetLabel: string;
  currentQty: number;
  stockMin: number;
  stockMax: number | null;
}

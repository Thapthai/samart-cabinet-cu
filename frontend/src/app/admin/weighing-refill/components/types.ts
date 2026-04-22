export function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** แถวจาก GET /weighing/by-sign sign=+ */
export interface WeighingRefillDetailRow {
  id: number;
  itemcode: string;
  HnCode: string;
  StockID: number;
  SlotNo: number;
  Sensor: number;
  Qty: number;
  ModifyDate: string;
  Sign: string;
  item?: {
    itemcode: string;
    itemname: string | null;
    Alternatename: string | null;
    Barcode: string | null;
  } | null;
  itemSlotInCabinet?: {
    cabinet?: {
      id?: number;
      cabinet_name?: string | null;
      cabinet_code?: string | null;
      stock_id?: number | null;
    } | null;
  } | null;
  userCabinet?: {
    legacyUser?: {
      employee?: { FirstName: string | null; LastName: string | null } | null;
    } | null;
  } | null;
}

/** แถวจาก GET /medical-supply/returned-items (โครงเดียวกับ dispensed แต่ IsStock != 0) */
export interface RfidReturnedListRow {
  RowID: number;
  itemcode: string;
  itemname: string;
  modifyDate: string;
  qty: number;
  RfidCode?: string | null;
  StockID?: number | null;
  cabinetUserName?: string | null;
  cabinetName?: string | null;
  cabinetCode?: string | null;
}

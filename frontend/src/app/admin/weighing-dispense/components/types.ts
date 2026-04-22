export function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface WeighingDispenseDetailRow {
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

export interface WeighingDispenseCabinetOption {
  id: number;
  cabinet_name?: string | null;
  cabinet_code?: string | null;
  stock_id?: number | null;
}

/** แถวจาก GET /medical-supply/dispensed-items */
export interface RfidDispensedListRow {
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

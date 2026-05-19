import {
  cabinetStockTableMode,
  type CabinetTabCabinet,
} from '@/app/staff/items-stock/components/CabinetStockTabs';

/** พารามิเตอร์ดาวน์โหลด Excel รวม — แยกตู้ Weighing กับ RFID ไม่ให้ใช้ stock/cabinet ข้ามประเภท */
export function resolveDispensedAllExportParams(input: {
  cabinets: CabinetTabCabinet[];
  selectedCabinet: CabinetTabCabinet | null;
  selectedCabinetId: number | null;
  stockIdParsed: number | null;
  itemcodeFilter: string;
  dateFromFilter: string;
  dateToFilter: string;
}) {
  const {
    selectedCabinet,
    selectedCabinetId,
    stockIdParsed,
    itemcodeFilter,
    dateFromFilter,
    dateToFilter,
  } = input;

  const keyword = itemcodeFilter.trim() || undefined;
  const isWeighingSelected =
    selectedCabinet != null && cabinetStockTableMode(selectedCabinet) === 'WEIGHING';
  const isRfidSelected =
    selectedCabinet != null && cabinetStockTableMode(selectedCabinet) === 'RFID';

  const weighingStockId =
    isWeighingSelected && stockIdParsed != null && stockIdParsed > 0 ? stockIdParsed : undefined;

  let rfidCabinetId: string | undefined;
  if (isRfidSelected && selectedCabinetId != null && selectedCabinetId > 0) {
    rfidCabinetId = String(selectedCabinetId);
  }

  return {
    weighing: {
      stockId: weighingStockId,
      itemcode: keyword,
      itemName: keyword,
      dateFrom: dateFromFilter || undefined,
      dateTo: dateToFilter || undefined,
    },
    rfid: {
      keyword,
      startDate: dateFromFilter || undefined,
      endDate: dateToFilter || undefined,
      cabinetId: rfidCabinetId,
      limit: 10000,
    },
  };
}

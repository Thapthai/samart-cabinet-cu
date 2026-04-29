import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { resolveReportLogoPath } from '../config/report.config';
import { CABINET_STOCK_INK } from './cabinet-stock-report-excel.service';

export interface WeighingStockRow {
  seq: number;
  item_name: string;
  cabinet_name: string;
  slot_no: number;
  sensor: number;
  channel_display: string;
  slot_display: string;
  qty: number;
  /** max−qty เมื่อ qty < min และมี max — สอดคล้อง GET /weighing/low-stock */
  refill_qty?: number | null;
}

export interface WeighingStockReportData {
  filters?: { stockId?: number; itemName?: string; itemcode?: string };
  summary: { total_rows: number; total_qty: number };
  data: WeighingStockRow[];
}

/** สล็อต — สอดคล้อง weighing-stock-report-pdf.service.ts SLOT_PILL */
const SLOT_PILL = {
  ใน: { fill: 'FF2F8F72', fg: 'FFF8FAFC' },
  นอก: { fill: 'FF3D5C8C', fg: 'FFF8FAFC' },
} as const;

/** คอลัมน์สุดท้ายของ merge หัวรายงาน/วันที่/ท้าย (คู่กับ B1:F2 — โลโก้คอลัมน์ A เหมือน cabinet-stock B1:D2) */
const LAST_MERGE_COL = 'F';
const DATA_COL_COUNT = 6;

const EXCEL_SHEET_FORBIDDEN = /[\*\[\]\:\\/?]/g;

const SUMMARY_LAST_COL = 'C';
const SUMMARY_COL_COUNT = 3;

/** จัดกลุ่มตามตู้ + ชื่ออุปกรณ์: จำนวนช่อง (แถว) — คู่ขนานกับสรุป RFID ตามรายการ */
export function buildWeighingStockSummaryRows(rows: WeighingStockRow[]): {
  line_label: string;
  slot_count: number;
}[] {
  const key = (r: WeighingStockRow) => {
    const cab = String(r.cabinet_name ?? '').trim() || '—';
    const item = String(r.item_name ?? '').trim() || '—';
    return `${cab}\t${item}`;
  };
  const label = (r: WeighingStockRow) => {
    const cab = String(r.cabinet_name ?? '').trim() || '—';
    const item = String(r.item_name ?? '').trim() || '—';
    return `${cab} · ${item}`;
  };
  const byKey = new Map<string, { line_label: string; slot_count: number }>();
  for (const r of rows) {
    const k = key(r);
    const cur = byKey.get(k);
    if (cur) cur.slot_count += 1;
    else byKey.set(k, { line_label: label(r), slot_count: 1 });
  }
  const out = [...byKey.values()];
  out.sort((a, b) => a.line_label.localeCompare(b.line_label, 'th'));
  return out;
}

/** ชีตสรุปตามรายการ (ตู้ · สินค้า) — จำนวนช่อง */
export function appendWeighingStockSummarySheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  detailRows: WeighingStockRow[],
  reportDate: string,
): void {
  const thinBorder = {
    top: { style: 'thin' as const },
    left: { style: 'thin' as const },
    bottom: { style: 'thin' as const },
    right: { style: 'thin' as const },
  };
  const worksheet = workbook.addWorksheet(sheetName, {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
    properties: { defaultRowHeight: 20 },
  });

  worksheet.mergeCells('A1:A2');
  worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
  worksheet.getCell('A1').border = thinBorder;
  const logoPath = resolveReportLogoPath();
  if (logoPath && fs.existsSync(logoPath)) {
    try {
      const imageId = workbook.addImage({ filename: logoPath, extension: 'png' });
      worksheet.addImage(imageId, 'A1:A2');
    } catch {
      // skip
    }
  }
  worksheet.getRow(1).height = 20;
  worksheet.getRow(2).height = 20;
  worksheet.getColumn(1).width = 12;

  worksheet.mergeCells(`B1:${SUMMARY_LAST_COL}2`);
  const headerCell = worksheet.getCell('B1');
  headerCell.value = `สรุปสต๊อก Weighing ตามรายการ\nWeighing stock summary by item`;
  headerCell.font = { name: 'Tahoma', size: 14, bold: true, color: { argb: 'FF1A365D' } };
  headerCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
  headerCell.border = thinBorder;

  worksheet.mergeCells(`A3:${SUMMARY_LAST_COL}3`);
  worksheet.getCell('A3').value = `วันที่รายงาน: ${reportDate}`;
  worksheet.getCell('A3').font = { name: 'Tahoma', size: 12, color: { argb: 'FF6C757D' } };
  worksheet.getCell('A3').alignment = { horizontal: 'right', vertical: 'middle' };
  worksheet.getCell('A3').border = thinBorder;
  worksheet.getRow(3).height = 20;

  const tableStartRow = 4;
  const headers = ['ลำดับ', 'รายการ (ตู้ · สินค้า)', 'จำนวนช่อง'];
  const headerRow = worksheet.getRow(tableStartRow);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A365D' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });
  headerRow.height = 26;

  const summaryRows = buildWeighingStockSummaryRows(detailRows);
  const zebra = ['FFFFFFFF', 'FFF8FAFC'] as const;
  let dataRowIndex = tableStartRow + 1;

  if (summaryRows.length === 0) {
    worksheet.mergeCells(`A${dataRowIndex}:${SUMMARY_LAST_COL}${dataRowIndex}`);
    const emptyCell = worksheet.getCell(`A${dataRowIndex}`);
    emptyCell.value = 'ไม่มีข้อมูล';
    emptyCell.font = { name: 'Tahoma', size: 13, color: { argb: 'FF212529' } };
    emptyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
    emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    emptyCell.border = thinBorder;
    worksheet.getRow(dataRowIndex).height = 28;
    dataRowIndex++;
  } else {
    summaryRows.forEach((row, idx) => {
      const excelRow = worksheet.getRow(dataRowIndex);
      const bg = zebra[idx % 2];
      const vals: (string | number)[] = [idx + 1, row.line_label, row.slot_count];
      vals.forEach((val, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        cell.value = val;
        cell.border = thinBorder;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.font = { name: 'Tahoma', size: 12, color: { argb: CABINET_STOCK_INK } };
        cell.alignment = {
          horizontal: colIndex === 1 ? 'left' : 'center',
          vertical: 'middle',
          wrapText: true,
        };
      });
      excelRow.height = 22;
      dataRowIndex++;
    });
  }

  if (summaryRows.length > 0) {
    worksheet.autoFilter = {
      from: { row: tableStartRow, column: 1 },
      to: { row: dataRowIndex - 1, column: SUMMARY_COL_COUNT },
    };
  }

  worksheet.addRow([]);
  const footerRow = dataRowIndex + 1;
  worksheet.mergeCells(`A${footerRow}:${SUMMARY_LAST_COL}${footerRow}`);
  worksheet.getCell(`A${footerRow}`).value = 'เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ';
  worksheet.getCell(`A${footerRow}`).font = { name: 'Tahoma', size: 11, color: { argb: 'FFADB5BD' } };
  worksheet.getCell(`A${footerRow}`).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  worksheet.getRow(footerRow).height = 18;

  worksheet.getColumn(1).width = 11;
  worksheet.getColumn(2).width = 52;
  worksheet.getColumn(3).width = 16;
}

function safeWeighingStockSheetName(name: string, used: Set<string>): string {
  let s = name.replace(EXCEL_SHEET_FORBIDDEN, '-').trim().slice(0, 31) || 'Sheet';
  const base = s;
  let n = 2;
  while (used.has(s)) {
    const suf = ` (${n})`;
    s = (base.slice(0, Math.max(1, 31 - suf.length)) + suf).slice(0, 31);
    n++;
  }
  used.add(s);
  return s;
}

/** ชีต Weighing แบบรายงานเดี่ยว — ใช้ซ้ำหลายแท็บตามชิปกรอง (รูปแบบเดียวกับ appendStandaloneCabinetStockSheet) */
export function appendStandaloneWeighingStockSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  data: WeighingStockReportData,
  reportDate: string,
): void {
  const thinBorder = {
    top: { style: 'thin' as const },
    left: { style: 'thin' as const },
    bottom: { style: 'thin' as const },
    right: { style: 'thin' as const },
  };
  const worksheet = workbook.addWorksheet(sheetName, {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
    properties: { defaultRowHeight: 20 },
  });

  worksheet.mergeCells('A1:A2');
  worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
  worksheet.getCell('A1').border = thinBorder;
  const logoPath = resolveReportLogoPath();
  if (logoPath && fs.existsSync(logoPath)) {
    try {
      const imageId = workbook.addImage({ filename: logoPath, extension: 'png' });
      worksheet.addImage(imageId, 'A1:A2');
    } catch {
      // skip
    }
  }
  worksheet.getRow(1).height = 20;
  worksheet.getRow(2).height = 20;
  worksheet.getColumn(1).width = 12;

  worksheet.mergeCells(`B1:${LAST_MERGE_COL}2`);
  const headerCell = worksheet.getCell('B1');
  const subline = sheetName === 'สต๊อก Weighing' ? 'Weighing Cabinet Stock Report' : sheetName;
  headerCell.value = `รายการสต๊อกในตู้ (Weighing)\n${subline}`;
  headerCell.font = { name: 'Tahoma', size: 14, bold: true, color: { argb: 'FF1A365D' } };
  headerCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
  headerCell.border = thinBorder;

  worksheet.mergeCells(`A3:${LAST_MERGE_COL}3`);
  worksheet.getCell('A3').value = `วันที่รายงาน: ${reportDate}`;
  worksheet.getCell('A3').font = { name: 'Tahoma', size: 12, color: { argb: 'FF6C757D' } };
  worksheet.getCell('A3').alignment = { horizontal: 'right', vertical: 'middle' };
  worksheet.getCell('A3').border = thinBorder;
  worksheet.getRow(3).height = 20;

  const tableStartRow = 4;
  const headers = ['ลำดับ', 'ชื่ออุปกรณ์', 'ตู้', 'ช่อง', 'สล็อต', 'จำนวน'];
  const headerRow = worksheet.getRow(tableStartRow);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A365D' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });
  headerRow.height = 26;

  const rfidZebra = ['FFFFFFFF', 'FFF8FAFC'] as const;
  let dataRowIndex = tableStartRow + 1;
  const rows = data.data ?? [];

  if (rows.length === 0) {
    worksheet.mergeCells(`A${dataRowIndex}:${LAST_MERGE_COL}${dataRowIndex}`);
    const emptyCell = worksheet.getCell(`A${dataRowIndex}`);
    emptyCell.value = 'ไม่มีข้อมูล';
    emptyCell.font = { name: 'Tahoma', size: 13, color: { argb: 'FF212529' } };
    emptyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
    emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    emptyCell.border = thinBorder;
    worksheet.getRow(dataRowIndex).height = 28;
    dataRowIndex++;
  } else {
    rows.forEach((row, idx) => {
      const excelRow = worksheet.getRow(dataRowIndex);
      const bg = rfidZebra[idx % 2];
      const slotRaw = String(row.slot_display ?? '-').trim();
      const slotPill = slotRaw === 'ใน' || slotRaw === 'นอก' ? SLOT_PILL[slotRaw as keyof typeof SLOT_PILL] : null;

      const values: (string | number)[] = [
        row.seq,
        row.item_name ?? '-',
        row.cabinet_name ?? '-',
        row.channel_display ?? '-',
        slotRaw || '-',
        row.qty ?? 0,
      ];

      values.forEach((val, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        cell.value = val;
        cell.border = thinBorder;

        if (colIndex === 4 && slotPill) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: slotPill.fill } };
          cell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: slotPill.fg } };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
          cell.font = { name: 'Tahoma', size: 12, color: { argb: CABINET_STOCK_INK } };
          cell.alignment = {
            horizontal: colIndex === 1 || colIndex === 2 ? 'left' : 'center',
            vertical: 'middle',
            wrapText: true,
          };
        }
      });
      excelRow.height = 22;
      dataRowIndex++;
    });
  }

  if (rows.length > 0) {
    worksheet.autoFilter = {
      from: { row: tableStartRow, column: 1 },
      to: { row: dataRowIndex - 1, column: DATA_COL_COUNT },
    };
  }

  worksheet.addRow([]);
  const footerRow = dataRowIndex + 1;
  worksheet.mergeCells(`A${footerRow}:${LAST_MERGE_COL}${footerRow}`);
  worksheet.getCell(`A${footerRow}`).value = 'เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ';
  worksheet.getCell(`A${footerRow}`).font = { name: 'Tahoma', size: 11, color: { argb: 'FFADB5BD' } };
  worksheet.getCell(`A${footerRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(footerRow).height = 18;

  worksheet.getColumn(1).width = 13;
  worksheet.getColumn(2).width = 55;
  worksheet.getColumn(3).width = 35;
  worksheet.getColumn(4).width = 12;
  worksheet.getColumn(5).width = 12;
  worksheet.getColumn(6).width = 15;
}

export interface WeighingStockMultiTabExcelInput {
  filters?: WeighingStockReportData['filters'];
  /** แต่ละชีต = กรองชิปสถานะเดียวกับหน้า items-stock */
  tabs: { chipLabelTh: string; data: WeighingStockReportData }[];
}

@Injectable()
export class WeighingStockReportExcelService {
  async generateReport(data: WeighingStockReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();
    const reportDate = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Bangkok',
    });
    appendWeighingStockSummarySheet(workbook, 'สรุป', data.data, reportDate);
    appendStandaloneWeighingStockSheet(workbook, 'สต๊อก Weighing', data, reportDate);
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /** Excel หลายชีตตามชิป: สรุปจากทั้งหมด — แล้วทั้งหมด / หมดอายุ / ใกล้หมดอายุ (ไม่มีชีตสต็อกต่ำ; ใช้รายงานสต็อกต่ำรวมแยก) */
  async generateMultiTabReport(input: WeighingStockMultiTabExcelInput): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();
    const reportDate = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Bangkok',
    });
    const summarySource =
      input.tabs.find((t) => t.chipLabelTh === 'ทั้งหมด')?.data.data ?? input.tabs[0]?.data.data ?? [];
    appendWeighingStockSummarySheet(workbook, 'สรุป', summarySource, reportDate);
    const used = new Set<string>();
    for (const tab of input.tabs) {
      if (tab.chipLabelTh === 'สต็อกต่ำ') continue;
      const sn = safeWeighingStockSheetName(`Weighing · ${tab.chipLabelTh}`, used);
      const sheetData: WeighingStockReportData = {
        filters: input.filters ?? tab.data.filters,
        summary: tab.data.summary,
        data: tab.data.data,
      };
      appendStandaloneWeighingStockSheet(workbook, sn, sheetData, reportDate);
    }
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

/** ขอบตารางแบบเดียวกับชีต cabinet / RFID ในรายงานรวม */
export const ITEMS_STOCK_COMBINED_THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' as const },
  left: { style: 'thin' as const },
  bottom: { style: 'thin' as const },
  right: { style: 'thin' as const },
};

/**
 * เพิ่มชีต Weighing (รวมทุกตู้ ตามชิปกรอง) ลง workbook — ใช้ร่วมกับ `ItemsStockCombinedExcelService`
 */
export function appendWeighingStockCombinedExcelSheet(
  workbook: ExcelJS.Workbook,
  options: {
    sheetName: string;
    reportDate: string;
    logoPath: string | null;
    bannerLines: string[];
    wData: WeighingStockReportData;
  },
): void {
  const { sheetName, reportDate, logoPath, bannerLines, wData } = options;
  const thinBorder = ITEMS_STOCK_COMBINED_THIN_BORDER;

  const wsW = workbook.addWorksheet(sheetName, {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
    properties: { defaultRowHeight: 20 },
  });

  wsW.mergeCells('A1:A2');
  wsW.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
  wsW.getCell('A1').border = thinBorder;
  if (logoPath && fs.existsSync(logoPath)) {
    try {
      const imageId = workbook.addImage({ filename: logoPath, extension: 'png' });
      wsW.addImage(imageId, 'A1:A2');
    } catch {
      // skip
    }
  }
  wsW.getRow(1).height = 20;
  wsW.getRow(2).height = 20;
  wsW.getColumn(1).width = 12;

  wsW.mergeCells('B1:F2');
  const h1 = wsW.getCell('B1');
  h1.value = `รายการสต๊อกในตู้ Weighing (รวม)\n${sheetName}`;
  h1.font = { name: 'Tahoma', size: 14, bold: true, color: { argb: 'FF1A365D' } };
  h1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  h1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
  h1.border = thinBorder;

  wsW.mergeCells('A3:F3');
  wsW.getCell('A3').value = `วันที่รายงาน: ${reportDate}`;
  wsW.getCell('A3').font = { name: 'Tahoma', size: 12, color: { argb: 'FF6C757D' } };
  wsW.getCell('A3').alignment = { horizontal: 'right', vertical: 'middle' };
  wsW.getCell('A3').border = thinBorder;
  wsW.getRow(3).height = 20;

  wsW.mergeCells('A4:F4');
  wsW.getCell('A4').value = [...bannerLines, `${wData.data.length} แถว`].join('   ·   ');
  wsW.getCell('A4').font = { name: 'Tahoma', size: 11, color: { argb: 'FF495057' } };
  wsW.getCell('A4').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  wsW.getCell('A4').border = thinBorder;
  wsW.getRow(4).height = 22;

  const wTableStart = 5;
  const wHeaders = ['ลำดับ', 'ชื่ออุปกรณ์', 'ตู้', 'ช่อง', 'สล็อต', 'จำนวน'];
  const wHeaderRow = wsW.getRow(wTableStart);
  wHeaders.forEach((h, i) => {
    const cell = wHeaderRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A365D' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });
  wHeaderRow.height = 26;

  const zebra = ['FFFFFFFF', 'FFF8FAFC'] as const;
  let wRowIdx = wTableStart + 1;
  wData.data.forEach((row, idx) => {
    const excelRow = wsW.getRow(wRowIdx);
    const bg = zebra[idx % 2];
    const slotRaw = String(row.slot_display ?? '-').trim();
    const slotPill = slotRaw === 'ใน' || slotRaw === 'นอก' ? SLOT_PILL[slotRaw as keyof typeof SLOT_PILL] : null;
    const vals: (string | number)[] = [
      row.seq,
      row.item_name ?? '-',
      row.cabinet_name ?? '-',
      row.channel_display ?? '-',
      slotRaw || '-',
      row.qty ?? 0,
    ];
    vals.forEach((val, colIndex) => {
      const cell = excelRow.getCell(colIndex + 1);
      cell.value = val;
      cell.border = thinBorder;
      if (colIndex === 4 && slotPill) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: slotPill.fill } };
        cell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: slotPill.fg } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.font = { name: 'Tahoma', size: 12, color: { argb: CABINET_STOCK_INK } };
        cell.alignment = {
          horizontal: colIndex === 1 || colIndex === 2 ? 'left' : 'center',
          vertical: 'middle',
          wrapText: true,
        };
      }
    });
    excelRow.height = 22;
    wRowIdx++;
  });

  if (wData.data.length > 0) {
    wsW.autoFilter = {
      from: { row: wTableStart, column: 1 },
      to: { row: wRowIdx - 1, column: 6 },
    };
  }

  wsW.addRow([]);
  const wFoot = wRowIdx + 1;
  wsW.mergeCells(`A${wFoot}:F${wFoot}`);
  wsW.getCell(`A${wFoot}`).value = 'เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ';
  wsW.getCell(`A${wFoot}`).font = { name: 'Tahoma', size: 11, color: { argb: 'FFADB5BD' } };
  wsW.getCell(`A${wFoot}`).alignment = { horizontal: 'center', vertical: 'middle' };
  wsW.getRow(wFoot).height = 18;

  wsW.getColumn(1).width = 13;
  wsW.getColumn(2).width = 55;
  wsW.getColumn(3).width = 40;
  wsW.getColumn(4).width = 12;
  wsW.getColumn(5).width = 12;
  wsW.getColumn(6).width = 15;
}

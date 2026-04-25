import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { resolveReportLogoPath } from '../config/report.config';

/** แถวรายงาน — 1 แถวต่อ 1 แท็ก RFID (แถว itemstock) */
export interface CabinetStockRow {
  device_name: string;
  expire_date_ymd: string;
  status_label: string;
}

export interface CabinetStockReportData {
  filters?: {
    cabinetId?: number;
    cabinetCode?: string;
    cabinetName?: string;
    departmentId?: number;
    departmentName?: string;
    keyword?: string;
    statusFilter?: string;
  };
  summary: { total_rows: number; total_qty: number };
  data: CabinetStockRow[];
}

/** คอลัมน์สุดท้ายของ merge หัวรายงาน/วันที่/ท้าย (คู่กับ B1:E2 — โลโก้คอลัมน์ A เหมือน weighing-stock) */
const LAST_MERGE_COL = 'D';
const DATA_COL_COUNT = 4;

/** สอดคล้องรายงาน RFID / items-stock-combined */
export const CABINET_STOCK_INK = 'FF0F172A';

export function rowFillForCabinetStockStatus(status: string): string {
  const s = (status || '').toUpperCase();
  if (s === 'EXPIRED') return 'FFFECACA';
  if (s === 'LOW') return 'FFFFEDD5';
  if (s === 'SOON') return 'FFFEF08A';
  return '';
}

export function statusFontArgbCabinetStock(status: string): string {
  const s = (status || '').toUpperCase();
  if (s === 'EXPIRED') return 'FFB91C1C';
  if (s === 'LOW') return 'FFC2410C';
  if (s === 'SOON') return 'FFB45309';
  if (s === 'OK') return 'FF15803D';
  return CABINET_STOCK_INK;
}

const EXCEL_SHEET_FORBIDDEN_C = /[\*\[\]\:\\/?]/g;

const SUMMARY_LAST_COL = 'E';
const SUMMARY_COL_COUNT = 5;

function parseCabinetExpireYmd(s: string): Date | null {
  const t = String(s ?? '').trim();
  if (!t || t === '—' || t === '-') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setHours(0, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDayBangkok(d: Date): Date {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(d);
  const y = Number(parts.find((p) => p.type === 'year')?.value);
  const m = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  const x = new Date(y, m - 1, day);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** จัดกลุ่มตามชื่ออุปกรณ์: จำนวนแท็ก + วันหมดอายุที่เร็วที่สุด (ใกล้ถึงกำหนดก่อน) */
export function buildCabinetStockSummaryRows(rows: CabinetStockRow[]): {
  device_name: string;
  tag_count: number;
  nearest_expire_ymd: string;
  days_to_nearest: number | null;
}[] {
  const byName = new Map<
    string,
    { count: number; minTs: number | null; minYmd: string | null }
  >();
  for (const r of rows) {
    const name = String(r.device_name ?? '').trim() || '—';
    const g = byName.get(name) ?? { count: 0, minTs: null, minYmd: null };
    g.count += 1;
    const exp = parseCabinetExpireYmd(r.expire_date_ymd);
    if (exp) {
      const ts = exp.getTime();
      if (g.minTs == null || ts < g.minTs) {
        g.minTs = ts;
        g.minYmd = r.expire_date_ymd.trim();
      }
    }
    byName.set(name, g);
  }
  const today = startOfDayBangkok(new Date());
  const out = [...byName.entries()].map(([device_name, g]) => {
    let days_to_nearest: number | null = null;
    if (g.minTs != null) {
      const nearest = new Date(g.minTs);
      nearest.setHours(0, 0, 0, 0);
      days_to_nearest = Math.round((nearest.getTime() - today.getTime()) / 86400000);
    }
    return {
      device_name,
      tag_count: g.count,
      nearest_expire_ymd: g.minYmd ?? '—',
      days_to_nearest,
    };
  });
  out.sort((a, b) => a.device_name.localeCompare(b.device_name, 'th'));
  return out;
}

/** ชีตสรุปตามรายการอุปกรณ์ — แท็กต่อรายการ, วันหมดเร็วที่สุด, วันถึงกำหนด */
export function appendCabinetStockSummarySheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  detailRows: CabinetStockRow[],
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
  headerCell.value = `สรุปสต๊อก RFID ตามรายการอุปกรณ์\nRFID stock summary by item`;
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
  const headers = [
    'ลำดับ',
    'ชื่ออุปกรณ์',
    'จำนวนแท็ก',
    'วันหมดอายุเร็วที่สุด',
    'ถึงกำหนด (วัน)',
  ];
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

  const summaryRows = buildCabinetStockSummaryRows(detailRows);
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
      const daysVal = row.days_to_nearest == null ? '—' : row.days_to_nearest;
      const vals: (string | number)[] = [
        idx + 1,
        row.device_name,
        row.tag_count,
        row.nearest_expire_ymd,
        daysVal,
      ];
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
  worksheet.getCell(`A${footerRow}`).value =
    'ถึงกำหนด (วัน): จากวันรายงาน (Asia/Bangkok) ถึงวันหมดเร็วที่สุดของรายการ · ค่าติดลบ = หมดอายุแล้ว';
  worksheet.getCell(`A${footerRow}`).font = { name: 'Tahoma', size: 10, color: { argb: 'FFADB5BD' } };
  worksheet.getCell(`A${footerRow}`).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  worksheet.getRow(footerRow).height = 28;

  worksheet.getColumn(1).width = 10;
  worksheet.getColumn(2).width = 48;
  worksheet.getColumn(3).width = 14;
  worksheet.getColumn(4).width = 22;
  worksheet.getColumn(5).width = 18;
}

function safeCabinetStockSheetName(name: string, used: Set<string>): string {
  let s = name.replace(EXCEL_SHEET_FORBIDDEN_C, '-').trim().slice(0, 31) || 'Sheet';
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

/** ชีต RFID แบบรายงานเดี่ยว — ใช้ซ้ำหลายแท็บตามชิปกรอง */
export function appendStandaloneCabinetStockSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  data: CabinetStockReportData,
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
  const subline = sheetName === 'สต๊อก RFID' ? 'RFID Cabinet Stock Report' : sheetName;
  headerCell.value = `รายการสต๊อกในตู้ (RFID)\n${subline}`;
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
  const headers = ['ลำดับ', 'ชื่ออุปกรณ์', 'วันหมดอายุ', 'สถานะ'];
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
  data.data.forEach((row, idx) => {
    const excelRow = worksheet.getRow(dataRowIndex);
    const tint = rowFillForCabinetStockStatus(row.status_label);
    const bg = tint || rfidZebra[idx % 2];
    const seq = idx + 1;
    [seq, row.device_name, row.expire_date_ymd, row.status_label].forEach((val, colIndex) => {
      const cell = excelRow.getCell(colIndex + 1);
      cell.value = val;
      const isStatus = colIndex === 3;
      cell.font = {
        name: 'Tahoma',
        size: 12,
        bold: isStatus,
        color: { argb: isStatus ? statusFontArgbCabinetStock(row.status_label) : CABINET_STOCK_INK },
      };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.alignment = {
        horizontal: colIndex === 1 ? 'left' : 'center',
        vertical: 'middle',
        wrapText: true,
      };
      cell.border = thinBorder;
    });
    excelRow.height = 22;
    dataRowIndex++;
  });

  if (data.data.length > 0) {
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
  worksheet.getColumn(3).width = 18;
  worksheet.getColumn(4).width = 16;
  worksheet.getColumn(5).width = 8;
}

export interface CabinetStockMultiTabExcelInput {
  filters: CabinetStockReportData['filters'];
  tabs: { chipLabelTh: string; rows: CabinetStockRow[] }[];
}

@Injectable()
export class CabinetStockReportExcelService {
  async generateReport(data: CabinetStockReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();
    const reportDate = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Bangkok',
    });
    appendCabinetStockSummarySheet(workbook, 'สรุป', data.data, reportDate);
    appendStandaloneCabinetStockSheet(workbook, 'สต๊อก RFID', data, reportDate);
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /** Excel หลายชีตตามชิป: ทั้งหมด / หมดอายุ / ใกล้หมด / สต็อกต่ำ */
  async generateMultiTabReport(input: CabinetStockMultiTabExcelInput): Promise<Buffer> {
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
      input.tabs.find((t) => t.chipLabelTh === 'ทั้งหมด')?.rows ?? input.tabs[0]?.rows ?? [];
    appendCabinetStockSummarySheet(workbook, 'สรุป', summarySource, reportDate);
    const used = new Set<string>();
    for (const tab of input.tabs) {
      const sn = safeCabinetStockSheetName(`RFID · ${tab.chipLabelTh}`, used);
      const sheetData: CabinetStockReportData = {
        filters: input.filters,
        summary: { total_rows: tab.rows.length, total_qty: tab.rows.length },
        data: tab.rows,
      };
      appendStandaloneCabinetStockSheet(workbook, sn, sheetData, reportDate);
    }
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

/** แถวชีต RFID ในรายงานรวม items-stock (มีคอลัมน์ตู้) */
export interface RfidStockCombinedExcelRow {
  seq: number;
  cabinet_label: string;
  device_name: string;
  expire_date_ymd: string;
  status_label: string;
}

/**
 * เพิ่มชีต RFID แบบรายงานรวม (หลายตู้) ลง workbook ที่มีอยู่ — ใช้ร่วมกับ `ItemsStockCombinedExcelService`
 */
export function appendRfidStockCombinedExcelSheet(
  workbook: ExcelJS.Workbook,
  options: {
    sheetName: string;
    reportDate: string;
    thinBorder: Partial<ExcelJS.Borders>;
    logoPath: string | null;
    bannerLines: string[];
    rows: RfidStockCombinedExcelRow[];
  },
): void {
  const { sheetName, reportDate, thinBorder, logoPath, bannerLines, rows } = options;
  const wsR = workbook.addWorksheet(sheetName, {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
    properties: { defaultRowHeight: 20 },
  });

  wsR.mergeCells('A1:A2');
  wsR.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
  wsR.getCell('A1').border = thinBorder;
  if (logoPath && fs.existsSync(logoPath)) {
    try {
      const imageId2 = workbook.addImage({ filename: logoPath, extension: 'png' });
      wsR.addImage(imageId2, 'A1:A2');
    } catch {
      // skip
    }
  }
  wsR.getRow(1).height = 20;
  wsR.getRow(2).height = 20;
  wsR.getColumn(1).width = 12;

  wsR.mergeCells('B1:E2');
  const h2 = wsR.getCell('B1');
  h2.value = `รายการสต๊อก RFID รวมทุกตู้\n${sheetName}`;
  h2.font = { name: 'Tahoma', size: 14, bold: true, color: { argb: 'FF1A365D' } };
  h2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  h2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
  h2.border = thinBorder;

  wsR.mergeCells('A3:E3');
  wsR.getCell('A3').value = `วันที่รายงาน: ${reportDate}`;
  wsR.getCell('A3').font = { name: 'Tahoma', size: 12, color: { argb: 'FF6C757D' } };
  wsR.getCell('A3').alignment = { horizontal: 'right', vertical: 'middle' };
  wsR.getCell('A3').border = thinBorder;
  wsR.getRow(3).height = 20;

  wsR.mergeCells('A4:E4');
  wsR.getCell('A4').value = [...bannerLines, `${rows.length} แถว`].join('   ·   ');
  wsR.getCell('A4').font = { name: 'Tahoma', size: 11, color: { argb: 'FF495057' } };
  wsR.getCell('A4').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  wsR.getCell('A4').border = thinBorder;
  wsR.getRow(4).height = 22;

  const rTableStart = 5;
  const rHeaders = ['ลำดับ', 'ตู้จัดเก็บ', 'รายการอุปกรณ์', 'วันหมดอายุ', 'สถานะ'];
  const rHeaderRow = wsR.getRow(rTableStart);
  rHeaders.forEach((h, i) => {
    const cell = rHeaderRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Tahoma', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A365D' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });
  rHeaderRow.height = 26;

  const rfidZebra = ['FFFFFFFF', 'FFF8FAFC'];
  let rRowIdx = rTableStart + 1;
  rows.forEach((row, idx) => {
    const excelRow = wsR.getRow(rRowIdx);
    const tint = rowFillForCabinetStockStatus(row.status_label);
    const bg = tint || rfidZebra[idx % 2];
    const vals: (string | number)[] = [
      row.seq,
      row.cabinet_label,
      row.device_name,
      row.expire_date_ymd,
      row.status_label,
    ];
    vals.forEach((val, colIndex) => {
      const cell = excelRow.getCell(colIndex + 1);
      cell.value = val;
      const isStatus = colIndex === 4;
      cell.font = {
        name: 'Tahoma',
        size: 12,
        bold: isStatus,
        color: { argb: isStatus ? statusFontArgbCabinetStock(row.status_label) : CABINET_STOCK_INK },
      };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.alignment = {
        horizontal: colIndex === 1 || colIndex === 2 ? 'left' : 'center',
        vertical: 'middle',
        wrapText: true,
      };
      cell.border = thinBorder;
    });
    excelRow.height = 22;
    rRowIdx++;
  });

  if (rows.length > 0) {
    wsR.autoFilter = {
      from: { row: rTableStart, column: 1 },
      to: { row: rRowIdx - 1, column: 5 },
    };
  }

  wsR.addRow([]);
  const rFoot = rRowIdx + 1;
  wsR.mergeCells(`A${rFoot}:E${rFoot}`);
  wsR.getCell(`A${rFoot}`).value = 'เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ';
  wsR.getCell(`A${rFoot}`).font = { name: 'Tahoma', size: 11, color: { argb: 'FFADB5BD' } };
  wsR.getCell(`A${rFoot}`).alignment = { horizontal: 'center', vertical: 'middle' };
  wsR.getRow(rFoot).height = 18;

  wsR.getColumn(1).width = 10;
  wsR.getColumn(2).width = 28;
  wsR.getColumn(3).width = 40;
  wsR.getColumn(4).width = 14;
  wsR.getColumn(5).width = 12;
}

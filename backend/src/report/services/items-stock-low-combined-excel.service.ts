import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { resolveReportLogoPath } from '../config/report.config';
import type { WeighingStockReportData, WeighingStockRow } from './weighing-stock-report-excel.service';
import { ITEMS_STOCK_COMBINED_THIN_BORDER } from './weighing-stock-report-excel.service';
import type { RfidStockCombinedExcelRow } from './cabinet-stock-report-excel.service';

const EXCEL_SHEET_FORBIDDEN = /[\*\[\]\:\\/?]/g;

function safeSheetName(name: string, used: Set<string>): string {
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

/** แถว Weighing อาจมี refill_qty จากผู้เรียก — ถ้าไม่มีแสดง "—" */
function weighingRefillCell(row: WeighingStockRow): number | string {
  const ext = row as WeighingStockRow & { refill_qty?: number | null };
  if (ext.refill_qty != null && typeof ext.refill_qty === 'number') return ext.refill_qty;
  return '—';
}

function statusRank(s: string): number {
  const u = (s || '').toUpperCase();
  if (u === 'EXPIRED') return 0;
  if (u === 'SOON') return 1;
  if (u === 'LOW') return 2;
  if (u === 'OK') return 3;
  return 4;
}

function worstStatusLabel(statuses: string[]): string {
  if (statuses.length === 0) return '—';
  return statuses.reduce((a, b) => (statusRank(a) <= statusRank(b) ? a : b));
}

type RfidWebExcelRow = RfidStockCombinedExcelRow & { qty_on_hand: number; refill_qty?: number | null };

/** รวมแถว RFID หลายแท็ก → หนึ่งแถวต่อ (ตู้ + ชื่อรายการ) เหมือนสรุปบนหน้าเว็บ */
function aggregateRfidLowRowsForWeb(rows: RfidStockCombinedExcelRow[]): RfidWebExcelRow[] {
  const map = new Map<string, RfidStockCombinedExcelRow[]>();
  for (const r of rows) {
    const k = `${r.cabinet_label}\t${r.device_name}`;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  }
  const out: RfidWebExcelRow[] = [];
  for (const grp of map.values()) {
    grp.sort((a, b) => (a.expire_date_ymd || '').localeCompare(b.expire_date_ymd || ''));
    const first = grp[0];
    const smin = first.stock_min != null ? Number(first.stock_min) : null;
    const smax = first.stock_max != null ? Number(first.stock_max) : null;
    const qty = grp.length;
    let refillQty: number | null = null;
    if (smin != null && qty < smin && smax != null) {
      refillQty = Math.max(0, smax - qty);
    }
    out.push({
      seq: 0,
      cabinet_label: first.cabinet_label,
      device_name: first.device_name,
      expire_date_ymd: grp[0].expire_date_ymd ?? '—',
      status_label: worstStatusLabel(grp.map((g) => g.status_label ?? '')),
      qty_on_hand: grp.length,
      refill_qty: refillQty,
    });
  }
  out.sort((a, b) => {
    const byName = (a.device_name || '').localeCompare(b.device_name || '', 'th');
    if (byName !== 0) return byName;
    const byCab = (a.cabinet_label || '').localeCompare(b.cabinet_label || '', 'th');
    if (byCab !== 0) return byCab;
    return (a.expire_date_ymd || '').localeCompare(b.expire_date_ymd || '');
  });
  out.forEach((r, i) => {
    r.seq = i + 1;
  });
  return out;
}

function appendWeighingLowWebExcelSheet(
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
  const lastCol = 'E';

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

  wsW.mergeCells(`B1:${lastCol}2`);
  const h1 = wsW.getCell('B1');
  h1.value = `สต็อกต่ำ Weighing (รวมทุกตู้)\n${sheetName}`;
  h1.font = { name: 'Tahoma', size: 14, bold: true, color: { argb: 'FF1A365D' } };
  h1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  h1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
  h1.border = thinBorder;

  wsW.mergeCells(`A3:${lastCol}3`);
  wsW.getCell('A3').value = `วันที่รายงาน: ${reportDate}`;
  wsW.getCell('A3').font = { name: 'Tahoma', size: 12, color: { argb: 'FF6C757D' } };
  wsW.getCell('A3').alignment = { horizontal: 'right', vertical: 'middle' };
  wsW.getCell('A3').border = thinBorder;
  wsW.getRow(3).height = 20;

  wsW.mergeCells(`A4:${lastCol}4`);
  wsW.getCell('A4').value = [...bannerLines, `${wData.data.length} แถว`].join('   ·   ');
  wsW.getCell('A4').font = { name: 'Tahoma', size: 11, color: { argb: 'FF495057' } };
  wsW.getCell('A4').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  wsW.getCell('A4').border = thinBorder;
  wsW.getRow(4).height = 22;

  const wTableStart = 5;
  const wHeaders = ['ลำดับ', 'ตู้จัดเก็บ', 'ชื่ออุปกรณ์', 'คงเหลือ', 'ต้องเติม'];
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

  let wRowIdx = wTableStart + 1;
  wData.data.forEach((row, idx) => {
    const excelRow = wsW.getRow(wRowIdx);
    const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8F9FA';
    const vals: (string | number)[] = [
      row.seq,
      row.cabinet_name ?? '-',
      row.item_name ?? '-',
      row.qty ?? 0,
      weighingRefillCell(row),
    ];
    vals.forEach((val, colIndex) => {
      const cell = excelRow.getCell(colIndex + 1);
      cell.value = val;
      cell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF212529' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.alignment = {
        horizontal: colIndex === 1 || colIndex === 2 ? 'left' : 'center',
        vertical: 'middle',
        wrapText: true,
      };
      cell.border = thinBorder;
    });
    excelRow.height = 22;
    wRowIdx++;
  });

  if (wData.data.length > 0) {
    wsW.autoFilter = {
      from: { row: wTableStart, column: 1 },
      to: { row: wRowIdx - 1, column: 5 },
    };
  }

  wsW.addRow([]);
  const wFoot = wRowIdx + 1;
  wsW.mergeCells(`A${wFoot}:${lastCol}${wFoot}`);
  wsW.getCell(`A${wFoot}`).value = 'เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ';
  wsW.getCell(`A${wFoot}`).font = { name: 'Tahoma', size: 11, color: { argb: 'FFADB5BD' } };
  wsW.getCell(`A${wFoot}`).alignment = { horizontal: 'center', vertical: 'middle' };
  wsW.getRow(wFoot).height = 18;

  wsW.getColumn(1).width = 11;
  wsW.getColumn(2).width = 35;
  wsW.getColumn(3).width = 44;
  wsW.getColumn(4).width = 14;
  wsW.getColumn(5).width = 14;
}

function appendRfidLowWebExcelSheet(
  workbook: ExcelJS.Workbook,
  options: {
    sheetName: string;
    reportDate: string;
    logoPath: string | null;
    bannerLines: string[];
    rows: RfidWebExcelRow[];
  },
): void {
  const { sheetName, reportDate, logoPath, bannerLines, rows } = options;
  const thinBorder = ITEMS_STOCK_COMBINED_THIN_BORDER;
  const lastCol = 'E';

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

  wsR.mergeCells(`B1:${lastCol}2`);
  const h2 = wsR.getCell('B1');
  h2.value = `สต็อกต่ำ RFID (รวมทุกตู้)\n${sheetName}`;
  h2.font = { name: 'Tahoma', size: 14, bold: true, color: { argb: 'FF1A365D' } };
  h2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  h2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
  h2.border = thinBorder;

  wsR.mergeCells(`A3:${lastCol}3`);
  wsR.getCell('A3').value = `วันที่รายงาน: ${reportDate}`;
  wsR.getCell('A3').font = { name: 'Tahoma', size: 12, color: { argb: 'FF6C757D' } };
  wsR.getCell('A3').alignment = { horizontal: 'right', vertical: 'middle' };
  wsR.getCell('A3').border = thinBorder;
  wsR.getRow(3).height = 20;

  wsR.mergeCells(`A4:${lastCol}4`);
  wsR.getCell('A4').value = [...bannerLines, `${rows.length} แถว`].join('   ·   ');
  wsR.getCell('A4').font = { name: 'Tahoma', size: 11, color: { argb: 'FF495057' } };
  wsR.getCell('A4').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  wsR.getCell('A4').border = thinBorder;
  wsR.getRow(4).height = 22;

  const rTableStart = 5;
  const rHeaders = ['ลำดับ', 'ตู้จัดเก็บ', 'ชื่ออุปกรณ์', 'คงเหลือ', 'ต้องเติม'];
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

  let rRowIdx = rTableStart + 1;
  rows.forEach((row, idx) => {
    const excelRow = wsR.getRow(rRowIdx);
    const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8F9FA';
    const qty = row.qty_on_hand;
    const refill = row.refill_qty !== undefined && row.refill_qty !== null ? row.refill_qty : '—';
    const vals: (string | number)[] = [row.seq, row.cabinet_label, row.device_name, qty, refill];
    vals.forEach((val, colIndex) => {
      const cell = excelRow.getCell(colIndex + 1);
      cell.value = val;
      cell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF212529' } };
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
  wsR.mergeCells(`A${rFoot}:${lastCol}${rFoot}`);
  wsR.getCell(`A${rFoot}`).value = 'เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ';
  wsR.getCell(`A${rFoot}`).font = { name: 'Tahoma', size: 11, color: { argb: 'FFADB5BD' } };
  wsR.getCell(`A${rFoot}`).alignment = { horizontal: 'center', vertical: 'middle' };
  wsR.getRow(rFoot).height = 18;

  wsR.getColumn(1).width = 11;
  wsR.getColumn(2).width = 28;
  wsR.getColumn(3).width = 44;
  wsR.getColumn(4).width = 14;
  wsR.getColumn(5).width = 14;
}

export interface ItemsStockLowCombinedExcelInput {
  keyword?: string;
  weighing: WeighingStockReportData;
  rfidRows: RfidStockCombinedExcelRow[];
}

/**
 * รายงานสต็อกต่ำรวม — Excel 2 ชีต แบบหน้าเว็บ (ชิปสต็อกต่ำ):
 * Weighing: ลำดับ · ตู้ · ชื่อ · คงเหลือ · ต้องเติม
 * RFID: รวมแท็กเป็นรายการเดียวต่อตู้+ชื่อ · คงเหลือ = จำนวนแท็ก
 */
@Injectable()
export class ItemsStockLowCombinedExcelService {
  async generateReport(input: ItemsStockLowCombinedExcelInput): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();

    const reportDate = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Bangkok',
    });

    const logoPath = resolveReportLogoPath();
    const kw = input.keyword?.trim();
    const filterBannerParts: string[] = [
      ...(kw ? [`ค้นหา: ${kw}`] : []),
      'รายงานสต็อกต่ำรวมทุกตู้ (Weighing + RFID)',
    ];

    const usedNames = new Set<string>();
    const wName = safeSheetName('Weighing', usedNames);
    appendWeighingLowWebExcelSheet(workbook, {
      sheetName: wName,
      reportDate,
      logoPath,
      bannerLines: [...filterBannerParts, 'กรองชิป: สต็อกต่ำ'],
      wData: input.weighing,
    });

    const rfidGrouped = aggregateRfidLowRowsForWeb(input.rfidRows);
    const rName = safeSheetName('RFID', usedNames);
    appendRfidLowWebExcelSheet(workbook, {
      sheetName: rName,
      reportDate,
      logoPath,
      bannerLines: [...filterBannerParts, 'กรองชิป: สต็อกต่ำ'],
      rows: rfidGrouped,
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

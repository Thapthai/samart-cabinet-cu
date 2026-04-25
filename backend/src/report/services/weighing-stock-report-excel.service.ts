import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { resolveReportLogoPath } from '../config/report.config';

export interface WeighingStockRow {
  seq: number;
  item_name: string;
  cabinet_name: string;
  slot_no: number;
  sensor: number;
  channel_display: string;
  slot_display: string;
  qty: number;
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

const BORDER_ARGB = 'FFDEE2E6';
const HEADER_BG = 'FF1A365D';
const HEADER_STROKE = 'FF4A6FA0';

function thinBorderGray(): Partial<ExcelJS.Borders> {
  const c = { argb: BORDER_ARGB };
  return {
    top: { style: 'thin', color: c },
    left: { style: 'thin', color: c },
    bottom: { style: 'thin', color: c },
    right: { style: 'thin', color: c },
  };
}

const EXCEL_SHEET_FORBIDDEN_W = /[\*\[\]\:\\/?]/g;

function safeWeighingStockSheetName(name: string, used: Set<string>): string {
  let s = name.replace(EXCEL_SHEET_FORBIDDEN_W, '-').trim().slice(0, 31) || 'Sheet';
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

/** ชีต Weighing แบบรายงานเดี่ยว (ตู้ / สล็อต / pill) — ใช้ซ้ำหลายแท็บตามชิปกรอง */
export function appendStandaloneWeighingStockSheet(
  workbook: ExcelJS.Workbook,
  worksheetName: string,
  data: WeighingStockReportData,
  reportDate: string,
): void {
  const worksheet = workbook.addWorksheet(worksheetName, {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
    properties: { defaultRowHeight: 20 },
  });

  const thinGray = thinBorderGray();
    worksheet.mergeCells('A1:A2');
    worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
    worksheet.getCell('A1').border = thinGray;
    const logoPath = resolveReportLogoPath();
    if (logoPath && fs.existsSync(logoPath)) {
      try {
        const imageId = workbook.addImage({ filename: logoPath, extension: 'png' });
        worksheet.addImage(imageId, 'A1:A2');
      } catch {
        // skip
      }
    }
    worksheet.getRow(1).height = 24;
    worksheet.getRow(2).height = 24;
    worksheet.getColumn(1).width = 12;

    /* หัวรายงานแยก 2 บรรทัดเหมือน PDF: ไทย 16 หนา / อังกฤษ 11 ปกติ สีรอง #6C757D */
    worksheet.mergeCells('B1:F1');
    const titleTh = worksheet.getCell('B1');
    titleTh.value = 'รายการสต๊อกในตู้ Weighing';
    titleTh.font = { name: 'Tahoma', size: 16, bold: true, color: { argb: 'FF1A365D' } };
    titleTh.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    titleTh.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
    titleTh.border = thinGray;

    worksheet.mergeCells('B2:F2');
    const titleEn = worksheet.getCell('B2');
    titleEn.value = 'Weighing Stock Report';
    titleEn.font = { name: 'Tahoma', size: 11, color: { argb: 'FF6C757D' } };
    titleEn.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    titleEn.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
    titleEn.border = thinGray;

    worksheet.mergeCells('A3:F3');
    worksheet.getCell('A3').value = `วันที่รายงาน: ${reportDate}`;
    worksheet.getCell('A3').font = { name: 'Tahoma', size: 11, color: { argb: 'FF6C757D' } };
    worksheet.getCell('A3').alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getCell('A3').border = thinGray;
    worksheet.getRow(3).height = 22;

    const tableStartRow = 4;
    const headers = ['ลำดับ', 'ชื่อสินค้า', 'ตู้', 'ช่อง', 'สล็อต', 'จำนวน'];
    const headerRow = worksheet.getRow(tableStartRow);
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { name: 'Tahoma', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      const stroke = { argb: HEADER_STROKE };
      cell.border = {
        top: { style: 'thin', color: { argb: HEADER_BG } },
        bottom: { style: 'thin', color: { argb: HEADER_BG } },
        left: { style: 'thin', color: stroke },
        right: { style: 'thin', color: stroke },
      };
    });
    headerRow.height = 28;

    let dataRowIndex = tableStartRow + 1;
    const rows = data.data ?? [];

    if (rows.length === 0) {
      worksheet.mergeCells(`A${dataRowIndex}:F${dataRowIndex}`);
      const emptyCell = worksheet.getCell(`A${dataRowIndex}`);
      emptyCell.value = 'ไม่มีข้อมูล';
      emptyCell.font = { name: 'Tahoma', size: 13, color: { argb: 'FF212529' } };
      emptyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
      emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
      emptyCell.border = thinGray;
      worksheet.getRow(dataRowIndex).height = 28;
      dataRowIndex++;
    } else {
      rows.forEach((row, idx) => {
        const excelRow = worksheet.getRow(dataRowIndex);
        const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8F9FA';
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
          cell.border = thinGray;

          if (colIndex === 4 && slotPill) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: slotPill.fill } };
            cell.font = { name: 'Tahoma', size: 11, bold: true, color: { argb: slotPill.fg } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            cell.font = { name: 'Tahoma', size: 13, color: { argb: 'FF000000' } };
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
        to: { row: dataRowIndex - 1, column: 6 },
      };
    }

    worksheet.addRow([]);
    const footerRow = dataRowIndex + 1;
    worksheet.mergeCells(`A${footerRow}:F${footerRow}`);
    worksheet.getCell(`A${footerRow}`).value = 'เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ';
    worksheet.getCell(`A${footerRow}`).font = { name: 'Tahoma', size: 11, color: { argb: 'FF6C757D' } };
    worksheet.getCell(`A${footerRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(footerRow).height = 18;

    /* สัดส่วนใกล้ PDF 8:38:18:12:12:12 — หน่วยความกว้าง Excel ให้อ่านง่าย */
    worksheet.getColumn(1).width = 11;
    worksheet.getColumn(2).width = 50;
    worksheet.getColumn(3).width = 35;
    worksheet.getColumn(4).width = 12;
    worksheet.getColumn(5).width = 12;
    worksheet.getColumn(6).width = 13;
}

export interface WeighingStockMultiTabExcelInput {
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
    appendStandaloneWeighingStockSheet(workbook, 'สต๊อก Weighing', data, reportDate);
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /** Excel หลายชีตตามชิป: ทั้งหมด / หมดอายุ / ใกล้หมด / สต็อกต่ำ */
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
    const used = new Set<string>();
    for (const tab of input.tabs) {
      const name = safeWeighingStockSheetName(`Weighing · ${tab.chipLabelTh}`, used);
      appendStandaloneWeighingStockSheet(workbook, name, tab.data, reportDate);
    }
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

/** ขอบตารางแบบเดียวกับชีต Weighing ในรายงานรวม items-stock */
export const ITEMS_STOCK_COMBINED_THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
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
  wsW.getCell('A4').value = bannerLines.join('   ·   ');
  wsW.getCell('A4').font = { name: 'Tahoma', size: 11, color: { argb: 'FF495057' } };
  wsW.getCell('A4').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  wsW.getCell('A4').border = thinBorder;
  wsW.getRow(4).height = 22;

  const wTableStart = 5;
  const wHeaders = ['ลำดับ', 'ชื่อสินค้า', 'ตู้', 'ช่อง', 'สล็อต', 'จำนวน'];
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
    [row.seq, row.item_name, row.cabinet_name, row.channel_display ?? '-', row.slot_display ?? '-', row.qty].forEach((val, colIndex) => {
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

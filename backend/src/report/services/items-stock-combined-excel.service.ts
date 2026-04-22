import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { resolveReportLogoPath } from '../config/report.config';
import type { WeighingStockReportData } from './weighing-stock-report-excel.service';

export interface ItemsStockCombinedRfidRow {
  seq: number;
  cabinet_label: string;
  device_name: string;
  expire_date_ymd: string;
  balance_qty: number;
  min_max_display: string;
  status_label: string;
}

export interface ItemsStockCombinedExcelInput {
  weighing: WeighingStockReportData;
  rfid: {
    rows: ItemsStockCombinedRfidRow[];
    filters?: { keyword?: string; statusFilter?: string };
  };
}

@Injectable()
export class ItemsStockCombinedExcelService {
  async generateReport(input: ItemsStockCombinedExcelInput): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();

    const thinBorder = {
      top: { style: 'thin' as const },
      left: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      right: { style: 'thin' as const },
    };

    const reportDate = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Bangkok',
    });

    // --- Sheet 1: Weighing (layout aligned with weighing-stock-report-excel) ---
    const wsW = workbook.addWorksheet('สต๊อก Weighing', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
      properties: { defaultRowHeight: 20 },
    });

    wsW.mergeCells('A1:A2');
    wsW.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
    wsW.getCell('A1').border = thinBorder;
    const logoPath = resolveReportLogoPath();
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
    h1.value = 'รายการสต๊อกในตู้ Weighing (รวม)\nWeighing Stock — Combined Report';
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

    const wData = input.weighing;
    const wTableStart = 4;
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
    wsW.getColumn(3).width = 22;
    wsW.getColumn(4).width = 12;
    wsW.getColumn(5).width = 12;
    wsW.getColumn(6).width = 15;

    // --- Sheet 2: RFID รวมทุกตู้ ---
    const wsR = workbook.addWorksheet('สต๊อก RFID รวม', {
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

    wsR.mergeCells('B1:G2');
    const h2 = wsR.getCell('B1');
    h2.value = 'รายการสต๊อก RFID รวมทุกตู้\nRFID Cabinet Stock — All Cabinets';
    h2.font = { name: 'Tahoma', size: 14, bold: true, color: { argb: 'FF1A365D' } };
    h2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    h2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
    h2.border = thinBorder;

    wsR.mergeCells('A3:G3');
    wsR.getCell('A3').value = `วันที่รายงาน: ${reportDate}`;
    wsR.getCell('A3').font = { name: 'Tahoma', size: 12, color: { argb: 'FF6C757D' } };
    wsR.getCell('A3').alignment = { horizontal: 'right', vertical: 'middle' };
    wsR.getCell('A3').border = thinBorder;
    wsR.getRow(3).height = 20;

    const rf = input.rfid;
    const kw = rf.filters?.keyword?.trim();
    const st = rf.filters?.statusFilter?.trim();
    wsR.mergeCells('A4:G4');
    const filterLine = [
      kw ? `ค้นหา: ${kw}` : null,
      st && st !== 'all' ? `กรองสถานะ: ${st}` : null,
      `${rf.rows.length} แถว`,
    ]
      .filter(Boolean)
      .join('   ·   ');
    wsR.getCell('A4').value = filterLine || 'ทุกตู้ RFID ที่มี stock';
    wsR.getCell('A4').font = { name: 'Tahoma', size: 11, color: { argb: 'FF495057' } };
    wsR.getCell('A4').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    wsR.getCell('A4').border = thinBorder;
    wsR.getRow(4).height = 22;

    const rTableStart = 5;
    const rHeaders = ['ลำดับ', 'ตู้จัดเก็บ', 'รายการอุปกรณ์', 'วันหมดอายุ (เร็วสุด)', 'จำนวน', 'Min / Max', 'สถานะ'];
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
    rf.rows.forEach((row, idx) => {
      const excelRow = wsR.getRow(rRowIdx);
      const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8F9FA';
      const vals = [
        row.seq,
        row.cabinet_label,
        row.device_name,
        row.expire_date_ymd,
        row.balance_qty,
        row.min_max_display,
        row.status_label,
      ];
      vals.forEach((val, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        cell.value = val;
        cell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF212529' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.alignment = {
          horizontal: colIndex === 2 || colIndex === 1 ? 'left' : 'center',
          vertical: 'middle',
          wrapText: true,
        };
        cell.border = thinBorder;
      });
      excelRow.height = 22;
      rRowIdx++;
    });

    if (rf.rows.length > 0) {
      wsR.autoFilter = {
        from: { row: rTableStart, column: 1 },
        to: { row: rRowIdx - 1, column: 7 },
      };
    }

    wsR.addRow([]);
    const rFoot = rRowIdx + 1;
    wsR.mergeCells(`A${rFoot}:G${rFoot}`);
    wsR.getCell(`A${rFoot}`).value = 'เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ';
    wsR.getCell(`A${rFoot}`).font = { name: 'Tahoma', size: 11, color: { argb: 'FFADB5BD' } };
    wsR.getCell(`A${rFoot}`).alignment = { horizontal: 'center', vertical: 'middle' };
    wsR.getRow(rFoot).height = 18;

    wsR.getColumn(1).width = 10;
    wsR.getColumn(2).width = 28;
    wsR.getColumn(3).width = 42;
    wsR.getColumn(4).width = 18;
    wsR.getColumn(5).width = 12;
    wsR.getColumn(6).width = 14;
    wsR.getColumn(7).width = 12;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

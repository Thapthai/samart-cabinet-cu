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

@Injectable()
export class CabinetStockReportExcelService {
  async generateReport(data: CabinetStockReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('สต๊อก RFID', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
      properties: { defaultRowHeight: 20 },
    });

    const reportDate = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Bangkok',
    });

    const thinBorder = {
      top: { style: 'thin' as const },
      left: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      right: { style: 'thin' as const },
    };
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
    headerCell.value = 'รายการสต๊อกในตู้ (RFID)\nRFID Cabinet Stock Report';
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

    let dataRowIndex = tableStartRow + 1;
    data.data.forEach((row, idx) => {
      const excelRow = worksheet.getRow(dataRowIndex);
      const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8F9FA';
      const seq = idx + 1;
      [seq, row.device_name, row.expire_date_ymd, row.status_label].forEach((val, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        cell.value = val;
        cell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF212529' } };
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

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

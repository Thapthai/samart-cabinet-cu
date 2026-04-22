import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { resolveReportLogoPath } from '../config/report.config';

export interface WeighingDispenseRow {
  seq: number;
  item_name: string;
  cabinet_label: string;
  operator_name: string;
  qty: number;
  modify_date: string;
}

export interface WeighingDispenseReportData {
  filters?: { stockId?: number; itemName?: string; itemcode?: string; dateFrom?: string; dateTo?: string };
  summary: { total_rows: number; total_qty: number };
  data: WeighingDispenseRow[];
}

@Injectable()
export class WeighingDispenseReportExcelService {
  async generateReport(data: WeighingDispenseReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('รายการเบิก Weighing', {
      pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
      properties: { defaultRowHeight: 20 },
    });

    const reportDate = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Bangkok',
    });

    const thinBorder = { top: { style: 'thin' as const }, left: { style: 'thin' as const }, bottom: { style: 'thin' as const }, right: { style: 'thin' as const } };
    worksheet.mergeCells('A1:A2');
    worksheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF8F9FA' },
    };
    worksheet.getCell('A1').border = thinBorder;
    const logoPath = resolveReportLogoPath();
    if (logoPath && fs.existsSync(logoPath)) {
      try {
        const imageId = workbook.addImage({
          filename: logoPath,
          extension: 'png',
        });
        worksheet.addImage(imageId, 'A1:A2');
      } catch {
        // skip logo on error
      }
    }
    worksheet.getRow(1).height = 20;
    worksheet.getRow(2).height = 20;
    worksheet.getColumn(1).width = 12;

    worksheet.mergeCells('B1:F2');
    const headerCell = worksheet.getCell('B1');
    headerCell.value = 'รายการเบิกอุปกรณ์จากตู้ Weighing\nWeighing Dispense Report';
    headerCell.font = { name: 'Tahoma', size: 14, bold: true, color: { argb: 'FF1A365D' } };
    headerCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    headerCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF8F9FA' },
    };
    headerCell.border = thinBorder;

    worksheet.mergeCells('A3:F3');
    const dateCell = worksheet.getCell('A3');
    dateCell.value = `วันที่รายงาน: ${reportDate}`;
    dateCell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF6C757D' } };
    dateCell.alignment = { horizontal: 'right', vertical: 'middle' };
    dateCell.border = thinBorder;
    worksheet.getRow(3).height = 20;

    const filters = data.filters ?? {};
    // const filterLabels = ['ตู้ (StockID)', 'รหัสสินค้า', 'จำนวนรายการ'];
    // const filterValues = [
    //   filters.stockId != null ? String(filters.stockId) : 'ทั้งหมด',
    //   filters.itemcode ?? 'ทั้งหมด',
    //   `${data.summary?.total_rows ?? 0} รายการ`,
    // ];
    // worksheet.mergeCells('A4:B4');
    // worksheet.getCell('A4').value = `${filterLabels[0]}: ${filterValues[0]}`;
    // worksheet.getCell('A4').font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FF1A365D' } };
    // worksheet.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
    // worksheet.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };
    // worksheet.mergeCells('C4:D4');
    // worksheet.getCell('C4').value = `${filterLabels[1]}: ${filterValues[1]}`;
    // worksheet.getCell('C4').font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FF1A365D' } };
    // worksheet.getCell('C4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
    // worksheet.getCell('C4').alignment = { horizontal: 'center', vertical: 'middle' };
    // worksheet.mergeCells('E4:E4');
    // worksheet.getCell('E4').value = `${filterLabels[2]}: ${filterValues[2]}`;
    // worksheet.getCell('E4').font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FF1A365D' } };
    // worksheet.getCell('E4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
    // worksheet.getCell('E4').alignment = { horizontal: 'center', vertical: 'middle' };
    // worksheet.getRow(4).height = 20;

    // worksheet.mergeCells('A5:C5');
    // worksheet.getCell('A5').value = `วันที่เริ่มต้น: ${filters.dateFrom ?? '-'}`;
    // worksheet.getCell('A5').font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FF1A365D' } };
    // worksheet.getCell('A5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
    // worksheet.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };
    // worksheet.mergeCells('D5:E5');
    // worksheet.getCell('D5').value = `วันที่สิ้นสุด: ${filters.dateTo ?? '-'}`;
    // worksheet.getCell('D5').font = { name: 'Tahoma', size: 11, bold: true, color: { argb: 'FF1A365D' } };
    // worksheet.getCell('D5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF2' } };
    // worksheet.getCell('D5').alignment = { horizontal: 'center', vertical: 'middle' };
    // worksheet.getRow(5).height = 20;

    // const tableStartRow = 6;
    const tableStartRow = 4;
    const headers = ['ลำดับ', 'ชื่อสินค้า', 'ตู้', 'ผู้ดำเนินการ', 'จำนวน', 'วันที่แก้ไข'];
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
      const rowValues = [row.seq, row.item_name, row.cabinet_label ?? '-', row.operator_name, row.qty, row.modify_date];
      rowValues.forEach((val, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        cell.value = val;
        cell.font = { name: 'Tahoma', size: 12, color: { argb: 'FF212529' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.alignment = {
          horizontal: colIndex === 1 || colIndex === 2 || colIndex === 3 ? 'left' : 'center',
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
        to: { row: dataRowIndex - 1, column: 6 },
      };
    }

    worksheet.addRow([]);
    const footerRow = dataRowIndex + 1;
    worksheet.mergeCells(`A${footerRow}:F${footerRow}`);
    const footerCell = worksheet.getCell(`A${footerRow}`);
    footerCell.value = 'เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ';
    footerCell.font = { name: 'Tahoma', size: 11, color: { argb: 'FFADB5BD' } };
    footerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    // footerCell.border = thinBorder;
    worksheet.getRow(footerRow).height = 18;

    worksheet.getColumn(1).width = 13;
    worksheet.getColumn(2).width = 48;
    worksheet.getColumn(3).width = 30;
    worksheet.getColumn(4).width = 25;
    worksheet.getColumn(5).width = 10;
    worksheet.getColumn(6).width = 20;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

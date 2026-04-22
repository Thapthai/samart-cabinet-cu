import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { resolveReportLogoPath, ReportConfig } from '../config/report.config';
import type { WeighingDispenseReportData } from './weighing-dispense-report-excel.service';
import type { DispensedItemsReportData } from './dispensed-items-excel.service';

export interface DispensedAllReportData {
  weighing: WeighingDispenseReportData;
  rfid: DispensedItemsReportData;
}

type SixColRow = {
  seq: number;
  item: string;
  cabinet: string;
  operator: string;
  qty: number;
  date: string;
};

function formatReportDateYmd(value?: string) {
  if (!value) return '-';
  const base = new Date(value);
  const corrected =
    typeof value === 'string' && value.endsWith('Z')
      ? new Date(base.getTime() - 7 * 60 * 60 * 1000)
      : base;
  if (Number.isNaN(corrected.getTime())) return '-';
  return corrected.toLocaleDateString('en-CA', {
    timeZone: ReportConfig.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function rfidCabinetLabel(item: { cabinetName?: string; cabinetCode?: string }): string {
  const cn = (item.cabinetName ?? '').toString().trim();
  const cc = (item.cabinetCode ?? '').toString().trim();
  if (cn && cc) return `${cn} (${cc})`;
  return cn || cc || '-';
}

@Injectable()
export class DispensedAllExcelService {
  async generateReport(data: DispensedAllReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();

    let logoImageId: number | undefined;
    const logoPath = resolveReportLogoPath();
    if (logoPath && fs.existsSync(logoPath)) {
      try {
        logoImageId = workbook.addImage({ filename: logoPath, extension: 'png' });
      } catch {
        // skip logo
      }
    }

    const weighingRows: SixColRow[] = (data.weighing?.data ?? []).map((r) => ({
      seq: r.seq,
      item: r.item_name,
      cabinet: r.cabinet_label ?? '-',
      operator: r.operator_name,
      qty: r.qty,
      date: r.modify_date,
    }));

    const rfidItems = data.rfid?.data ?? [];
    const rfidRows: SixColRow[] = rfidItems.map((item, idx) => ({
      seq: idx + 1,
      item: item.itemname ?? '-',
      cabinet: rfidCabinetLabel(item),
      operator: item.cabinetUserName ?? 'ไม่ระบุ',
      qty: item.qty,
      date: formatReportDateYmd(item.modifyDate),
    }));

    this.appendDispensedSheet(
      workbook,
      'รายการเบิก Weighing',
      'รายการเบิกอุปกรณ์จากตู้ Weighing\nWeighing Dispense Report',
      weighingRows,
      logoImageId,
    );
    this.appendDispensedSheet(
      workbook,
      'รายการเบิก RFID',
      'รายการเบิกอุปกรณ์จากตู้ (RFID)\nDispensed Items Report',
      rfidRows,
      logoImageId,
    );

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private appendDispensedSheet(
    workbook: ExcelJS.Workbook,
    sheetName: string,
    titleValue: string,
    rows: SixColRow[],
    logoImageId?: number,
  ): void {
    const worksheet = workbook.addWorksheet(sheetName, {
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
    worksheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF8F9FA' },
    };
    worksheet.getCell('A1').border = thinBorder;
    if (logoImageId != null) {
      try {
        worksheet.addImage(logoImageId, 'A1:A2');
      } catch {
        // skip
      }
    }
    worksheet.getRow(1).height = 20;
    worksheet.getRow(2).height = 20;
    worksheet.getColumn(1).width = 12;

    worksheet.mergeCells('B1:F2');
    const headerCell = worksheet.getCell('B1');
    headerCell.value = titleValue;
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
    rows.forEach((row, idx) => {
      const excelRow = worksheet.getRow(dataRowIndex);
      const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8F9FA';
      const rowValues = [row.seq, row.item, row.cabinet, row.operator, row.qty, row.date];
      rowValues.forEach((val, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        cell.value = val as any;
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

    if (rows.length > 0) {
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
    worksheet.getRow(footerRow).height = 18;

    worksheet.getColumn(1).width = 13;
    worksheet.getColumn(2).width = 48;
    worksheet.getColumn(3).width = 30;
    worksheet.getColumn(4).width = 25;
    worksheet.getColumn(5).width = 10;
    worksheet.getColumn(6).width = 20;
  }
}

import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { resolveReportLogoPath } from '../config/report.config';

/** แถวรายงาน — สอดคล้องแถวสรุปตาราง RFID หน้า admin items-stock (ไม่รวมคอลัมน์ขยายรายละเอียด RFID) */
export interface CabinetStockRow {
  device_name: string;
  expire_date_ymd: string;
  balance_qty: number;
  min_max_display: string;
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

const LAST_COL = 'E';
const COL_COUNT = 5;

const C = {
  ink: 'FF0F172A',
  muted: 'FF64748B',
  line: 'FFE2E8F0',
  lineStrong: 'FFCBD5E1',
  headerBg: 'FF1E3A5F',
  headerText: 'FFF8FAFC',
  cardBg: 'FFF8FAFC',
  bandBg: 'FFF1F5F9',
  accent: 'FF2563EB',
  footerMuted: 'FF94A3B8',
};

const borderAll = (s: ExcelJS.BorderStyle, argb: string): Partial<ExcelJS.Borders> => ({
  top: { style: s, color: { argb } },
  left: { style: s, color: { argb } },
  bottom: { style: s, color: { argb } },
  right: { style: s, color: { argb } },
});

function rowFillForStatus(status: string): string {
  const s = (status || '').toUpperCase();
  if (s === 'EXPIRED') return 'FFFECACA';
  if (s === 'LOW') return 'FFFFEDD5';
  if (s === 'SOON') return 'FFFEF08A';
  return '';
}

function statusFontArgb(status: string): string {
  const s = (status || '').toUpperCase();
  if (s === 'EXPIRED') return 'FFB91C1C';
  if (s === 'LOW') return 'FFC2410C';
  if (s === 'SOON') return 'FFB45309';
  if (s === 'OK') return 'FF15803D';
  return C.ink;
}

@Injectable()
export class CabinetStockReportExcelService {
  async generateReport(data: CabinetStockReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Report Service';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('รายการในตู้ RFID', {
      pageSetup: {
        paperSize: 9,
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.55, right: 0.55, top: 0.6, bottom: 0.6, header: 0.25, footer: 0.25 },
      },
      properties: { defaultRowHeight: 20 },
    });

    const reportDate = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Bangkok',
    });

    const filters = data.filters ?? {};
    const totalRows = data.summary?.total_rows ?? 0;
    const totalQty = data.summary?.total_qty ?? 0;
    const cabinetLabel = (filters.cabinetName || filters.cabinetCode || '').trim();
    const cabinetLine = cabinetLabel
      ? `ตู้: ${cabinetLabel}`
      : filters.departmentName
        ? `แผนก: ${filters.departmentName}`
        : '';

    const thinLine = borderAll('thin', C.line);
    const titleBlockBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: C.lineStrong } },
      left: { style: 'thin', color: { argb: C.lineStrong } },
      bottom: { style: 'medium', color: { argb: C.headerBg } },
      right: { style: 'thin', color: { argb: C.lineStrong } },
    };

    worksheet.mergeCells(`A1:${LAST_COL}2`);
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'รายการในตู้ (RFID)\nCabinet / RFID';
    titleCell.font = { name: 'Tahoma', size: 16, bold: true, color: { argb: C.headerBg } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.cardBg } };
    titleCell.border = titleBlockBorder;

    worksheet.getRow(1).height = 24;
    worksheet.getRow(2).height = 24;

    const logoPath = resolveReportLogoPath();
    if (logoPath && fs.existsSync(logoPath)) {
      try {
        const imageId = workbook.addImage({ filename: logoPath, extension: 'png' });
        /** โลโก้ลอยมุมซ้ายบน — ไม่ merge เป็นส่วนของตารางข้อมูล (ตารางเริ่มแถว 5) */
        worksheet.addImage(imageId, {
          tl: { col: 0, row: 0 },
          ext: { width: 132, height: 52 },
        });
      } catch {
        // skip
      }
    }

    worksheet.mergeCells(`A3:${LAST_COL}3`);
    const dateCell = worksheet.getCell('A3');
    dateCell.value = `วันที่รายงาน  ${reportDate}`;
    dateCell.font = { name: 'Tahoma', size: 11, color: { argb: C.muted } };
    dateCell.alignment = { horizontal: 'right', vertical: 'middle' };
    dateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    dateCell.border = thinLine;
    worksheet.getRow(3).height = 22;

    worksheet.mergeCells(`A4:${LAST_COL}4`);
    const subCell = worksheet.getCell('A4');
    const descLine = `ทั้งหมด ${totalRows} รายการจากระบบ · รวม ${totalQty} แท็ก RFID · จำนวนคงเหลือต่อแถว = จำนวนแถว itemstock ที่มี RfidCode ในตู้ (เท่าคอลัมน์บนหน้าเว็บ)`;
    subCell.value = cabinetLine ? `${cabinetLine}\n${descLine}` : descLine;
    subCell.font = { name: 'Tahoma', size: 11, color: { argb: C.ink } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.bandBg } };
    subCell.border = {
      ...thinLine,
      left: { style: 'medium', color: { argb: C.accent } },
    };
    worksheet.getRow(4).height = cabinetLine ? 40 : 32;

    const tableStartRow = 5;
    const headers = ['ชื่ออุปกรณ์', 'วันหมดอายุ', 'จำนวนคงเหลือ', 'Min / Max', 'สถานะ'];
    const headerRow = worksheet.getRow(tableStartRow);
    const headerBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'medium', color: { argb: C.headerBg } },
      left: { style: 'thin', color: { argb: C.headerBg } },
      bottom: { style: 'medium', color: { argb: C.headerBg } },
      right: { style: 'thin', color: { argb: C.headerBg } },
    };
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { name: 'Tahoma', size: 11, bold: true, color: { argb: C.headerText } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = headerBorder;
    });
    headerRow.height = 30;

    let dataRowIndex = tableStartRow + 1;
    const zebra = ['FFFFFFFF', 'FFF8FAFC'];
    const lastDataRow = tableStartRow + data.data.length;

    data.data.forEach((row, idx) => {
      const excelRow = worksheet.getRow(dataRowIndex);
      const tint = rowFillForStatus(row.status_label);
      const bg = tint || zebra[idx % 2];
      const vals: (string | number)[] = [
        row.device_name,
        row.expire_date_ymd,
        row.balance_qty,
        row.min_max_display,
        row.status_label,
      ];
      vals.forEach((val, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        cell.value = val;
        const isStatus = colIndex === 4;
        cell.font = {
          name: 'Tahoma',
          size: 11,
          bold: isStatus,
          color: { argb: isStatus ? statusFontArgb(row.status_label) : C.ink },
        };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.alignment = {
          horizontal: colIndex === 0 ? 'left' : colIndex === 2 ? 'right' : 'center',
          vertical: 'top',
          indent: colIndex === 0 ? 1 : 0,
          wrapText: colIndex === 0,
        };
        cell.border = thinLine;
        if (colIndex === 2 && typeof val === 'number') {
          cell.numFmt = '#,##0';
        }
      });
      const nameLines = Math.max(1, String(row.device_name).split('\n').length);
      excelRow.height = Math.max(24, nameLines * 15 + 8);
      dataRowIndex++;
    });

    if (data.data.length > 0) {
      worksheet.autoFilter = {
        from: { row: tableStartRow, column: 1 },
        to: { row: tableStartRow, column: COL_COUNT },
      };
    }

    worksheet.addRow([]);
    const footerRow = dataRowIndex + 1;
    worksheet.mergeCells(`A${footerRow}:${LAST_COL}${footerRow}`);
    const footerCell = worksheet.getCell(`A${footerRow}`);
    footerCell.value = 'เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ · Smart Cabinet';
    footerCell.font = { name: 'Tahoma', size: 9, italic: true, color: { argb: C.footerMuted } };
    footerCell.alignment = { horizontal: 'center', vertical: 'middle' };
    footerCell.border = thinLine;

    if (lastDataRow >= tableStartRow + 1) {
      for (let c = 1; c <= COL_COUNT; c++) {
        const top = worksheet.getCell(tableStartRow, c);
        const bottom = worksheet.getCell(lastDataRow, c);
        top.border = {
          ...top.border,
          top: { style: 'medium', color: { argb: C.headerBg } },
        };
        bottom.border = {
          ...bottom.border,
          bottom: { style: 'thin', color: { argb: C.lineStrong } },
        };
      }
    }

    worksheet.getColumn(1).width = 48;
    worksheet.getColumn(2).width = 18;
    worksheet.getColumn(3).width = 18;
    worksheet.getColumn(4).width = 18;
    worksheet.getColumn(5).width = 14;

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

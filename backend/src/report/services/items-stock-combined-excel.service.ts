import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { resolveReportLogoPath } from '../config/report.config';
import type { WeighingStockReportData } from './weighing-stock-report-excel.service';
import {
  appendWeighingStockCombinedExcelSheet,
  ITEMS_STOCK_COMBINED_THIN_BORDER,
} from './weighing-stock-report-excel.service';
import {
  appendRfidStockCombinedExcelSheet,
  type RfidStockCombinedExcelRow,
} from './cabinet-stock-report-excel.service';

const EXCEL_SHEET_FORBIDDEN = /[\*\[\]\:\\/?]/g;

function safeSheetName(name: string, used: Set<string>): string {
  let s = name.replace(EXCEL_SHEET_FORBIDDEN, '-').trim().slice(0, 31) || 'Sheet';
  let base = s;
  let n = 2;
  while (used.has(s)) {
    const suf = ` (${n})`;
    s = (base.slice(0, Math.max(1, 31 - suf.length)) + suf).slice(0, 31);
    n++;
  }
  used.add(s);
  return s;
}

/** แถว RFID รายงานรวม — alias เดียวกับ `RfidStockCombinedExcelRow` */
export type ItemsStockCombinedRfidRow = RfidStockCombinedExcelRow;

/** ชิปสถานะเดียวกับหน้า admin/items-stock */
export type ItemsStockCombinedChip = 'all' | 'expired' | 'soon' | 'low';

export interface ItemsStockCombinedChipBlock {
  chip: ItemsStockCombinedChip;
  /** ป้ายภาษาไทยสำหรับหัวชีต / แถบกรอง */
  chipLabelTh: string;
  weighing: WeighingStockReportData;
  rfid: { rows: ItemsStockCombinedRfidRow[] };
}

export interface ItemsStockCombinedExcelInput {
  /** คำค้นชื่อสินค้า (เดียวกับหน้าเว็บ) */
  keyword?: string;
  /**
   * ลำดับชิป: ทั้งหมด → หมดอายุ → ใกล้หมด → สต็อกต่ำ
   * ชีตในไฟล์: กลุ่ม Weighing ตามชิปทั้งหมดก่อน แล้วตามด้วยกลุ่ม RFID ตามชิป (แยกตามกรองเป็นระเบียบ)
   */
  chipBlocks: ItemsStockCombinedChipBlock[];
}

@Injectable()
export class ItemsStockCombinedExcelService {
  async generateReport(input: ItemsStockCombinedExcelInput): Promise<Buffer> {
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
      'แยกชีตตามชิปสถานะ (เหมือนหน้าเว็บ)',
    ];

    const usedNames = new Set<string>();

    for (const block of input.chipBlocks) {
      const wName = safeSheetName(`Weighing · ${block.chipLabelTh}`, usedNames);
      appendWeighingStockCombinedExcelSheet(workbook, {
        sheetName: wName,
        reportDate,
        logoPath,
        bannerLines: [...filterBannerParts, `กรองชิป: ${block.chipLabelTh}`],
        wData: block.weighing,
      });
    }

    for (const block of input.chipBlocks) {
      const rName = safeSheetName(`RFID · ${block.chipLabelTh}`, usedNames);
      appendRfidStockCombinedExcelSheet(workbook, {
        sheetName: rName,
        reportDate,
        thinBorder: ITEMS_STOCK_COMBINED_THIN_BORDER,
        logoPath,
        bannerLines: [...filterBannerParts, `กรองชิป: ${block.chipLabelTh}`],
        rows: block.rfid.rows,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

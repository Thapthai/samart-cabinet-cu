import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { resolveReportLogoPath } from '../config/report.config';
import type { WeighingStockReportData } from './weighing-stock-report-excel.service';
import {
  appendWeighingLowStockExcelSheet,
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

/** Weighing — ไม่มีชีตหมดอายุ/ใกล้หมดอายุ (ตู้ชั่งไม่ใช้ชิปเหล่านั้นบนหน้าเว็บ) */
const WEIGHING_EXPORT_CHIPS: { chip: ItemsStockCombinedChip; labelTh: string }[] = [
  { chip: 'all', labelTh: 'ทั้งหมด' },
  { chip: 'low', labelTh: 'สต็อกต่ำ' },
];

/** RFID — ทั้งหมด / หมดอายุ / ใกล้หมดอายุ / สต็อกต่ำ */
const RFID_EXPORT_CHIPS: { chip: ItemsStockCombinedChip; labelTh: string }[] = [
  { chip: 'all', labelTh: 'ทั้งหมด' },
  { chip: 'expired', labelTh: 'หมดอายุ' },
  { chip: 'soon', labelTh: 'ใกล้หมดอายุ' },
  { chip: 'low', labelTh: 'สต็อกต่ำ' },
];

function resolveCombinedChipBlocks(
  chipBlocks: ItemsStockCombinedChipBlock[],
  exportChips: { chip: ItemsStockCombinedChip; labelTh: string }[],
): ItemsStockCombinedChipBlock[] {
  const byChip = new Map(chipBlocks.map((b) => [b.chip, b]));
  return exportChips.map(({ chip, labelTh }) => {
    const found = byChip.get(chip);
    if (found) return { ...found, chipLabelTh: found.chipLabelTh || labelTh };
    return {
      chip,
      chipLabelTh: labelTh,
      weighing: {
        filters: {},
        summary: { total_rows: 0, total_qty: 0 },
        data: [],
      },
      rfid: { rows: [] },
    };
  });
}

export interface ItemsStockCombinedChipBlock {
  chip: ItemsStockCombinedChip;
  /** ป้ายภาษาไทยสำหรับหัวชีต / แถบกรอง */
  chipLabelTh: string;
  weighing: WeighingStockReportData;
  rfid: { rows: ItemsStockCombinedRfidRow[] };
}

export interface ItemsStockCombinedExcelInput {
  /** คำค้นชื่ออุปกรณ์ (เดียวกับหน้าเว็บ) */
  keyword?: string;
  /**
   * Weighing: ทั้งหมด + สต็อกต่ำ (ไม่มีหมดอายุ/ใกล้หมดอายุ)
   * RFID: ทั้งหมด + หมดอายุ + ใกล้หมดอายุ + สต็อกต่ำ
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
    const weighingBlocks = resolveCombinedChipBlocks(input.chipBlocks, WEIGHING_EXPORT_CHIPS);
    const rfidBlocks = resolveCombinedChipBlocks(input.chipBlocks, RFID_EXPORT_CHIPS);

    for (const block of weighingBlocks) {
      const wName = safeSheetName(`Weighing · ${block.chipLabelTh}`, usedNames);
      const bannerLines = [...filterBannerParts, `กรองชิป: ${block.chipLabelTh}`];
      if (block.chip === 'low') {
        appendWeighingLowStockExcelSheet(workbook, {
          sheetName: wName,
          reportDate,
          logoPath,
          bannerLines,
          wData: block.weighing,
          titleLine: 'รายการสต๊อกในตู้ Weighing (รวม)',
        });
      } else {
        appendWeighingStockCombinedExcelSheet(workbook, {
          sheetName: wName,
          reportDate,
          logoPath,
          bannerLines,
          wData: block.weighing,
        });
      }
    }

    for (const block of rfidBlocks) {
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

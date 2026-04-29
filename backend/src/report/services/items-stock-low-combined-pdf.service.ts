import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { WeighingStockReportData, WeighingStockRow } from './weighing-stock-report-excel.service';
import { CabinetStockReportData, CabinetStockRow } from './cabinet-stock-report-excel.service';
import { resolveReportLogoPath, getReportThaiFontPaths } from '../config/report.config';

function weighingRefillDisplay(row: WeighingStockRow): string {
  const ext = row as WeighingStockRow & { refill_qty?: number | null };
  if (ext.refill_qty != null && typeof ext.refill_qty === 'number') return String(ext.refill_qty);
  return '—';
}

/** รูปแบบ `[ชื่อตู้] ชื่อรายการ` จาก report-service — แยกเพื่อคอลัมน์เหมือนหน้าเว็บ */
function parseBracketCabinetLabel(full: string): { cabinet: string; itemName: string } {
  const m = /^\[([^\]]+)\]\s*(.*)$/.exec(String(full ?? '').trim());
  if (m) {
    const cab = m[1].trim() || '—';
    const name = (m[2] ?? '').trim() || '—';
    return { cabinet: cab, itemName: name };
  }
  return { cabinet: '—', itemName: String(full ?? '').trim() || '—' };
}

type RfidPdfWebRow = {
  seq: number;
  cabinet: string;
  itemName: string;
  qty: number;
  refill: string;
};

function aggregateRfidRowsForPdfWeb(rows: CabinetStockRow[]): RfidPdfWebRow[] {
  const map = new Map<string, CabinetStockRow[]>();
  for (const r of rows) {
    const k = String(r.device_name ?? '').trim();
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  }
  const out: RfidPdfWebRow[] = [];
  for (const grp of map.values()) {
    const { cabinet, itemName } = parseBracketCabinetLabel(grp[0].device_name ?? '');
    const first = grp[0];
    const smin = first.stock_min != null ? Number(first.stock_min) : null;
    const smax = first.stock_max != null ? Number(first.stock_max) : null;
    const qty = grp.length;
    let refill = '—';
    if (smin != null && qty < smin && smax != null) {
      refill = String(Math.max(0, smax - qty));
    }
    out.push({
      seq: 0,
      cabinet,
      itemName,
      qty,
      refill,
    });
  }
  out.sort((a, b) => {
    const byName = (a.itemName || '').localeCompare(b.itemName || '', 'th');
    if (byName !== 0) return byName;
    return (a.cabinet || '').localeCompare(b.cabinet || '', 'th');
  });
  out.forEach((r, i) => {
    r.seq = i + 1;
  });
  return out;
}

export interface ItemsStockLowCombinedPdfInput {
  keyword?: string;
  weighing: WeighingStockReportData;
  rfid: CabinetStockReportData;
}

type FontCtx = { regular: string; bold: string };

@Injectable()
export class ItemsStockLowCombinedPdfService {
  private async registerThaiFont(doc: PDFKit.PDFDocument): Promise<boolean> {
    try {
      const fonts = getReportThaiFontPaths();
      if (!fonts || !fs.existsSync(fonts.regular)) return false;
      doc.registerFont('ThaiFont', fonts.regular);
      doc.registerFont('ThaiFontBold', fonts.bold);
      return true;
    } catch {
      return false;
    }
  }

  private getLogoBuffer(): Buffer | null {
    const logoPath = resolveReportLogoPath();
    if (!logoPath || !fs.existsSync(logoPath)) return null;
    try {
      return fs.readFileSync(logoPath);
    } catch {
      return null;
    }
  }

  async generateReport(input: ItemsStockLowCombinedPdfInput): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'portrait',
      margin: 10,
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    let finalFontName = 'Helvetica';
    let finalFontBoldName = 'Helvetica-Bold';
    try {
      const hasThai = await this.registerThaiFont(doc);
      if (hasThai) {
        finalFontName = 'ThaiFont';
        finalFontBoldName = 'ThaiFontBold';
        doc.font(finalFontBoldName).fontSize(13);
        doc.font(finalFontName).fontSize(13);
      }
    } catch {
      // keep default
    }

    const fonts: FontCtx = { regular: finalFontName, bold: finalFontBoldName };
    const logoBuffer = this.getLogoBuffer();
    const reportDate = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Bangkok',
    });

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        const margin = 10;
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const contentWidth = pageWidth - margin * 2;

        this.drawWeighingWebLowSection(doc, {
          margin,
          pageHeight,
          contentWidth,
          fonts,
          logoBuffer,
          reportDate,
          keyword: input.keyword?.trim(),
          data: input.weighing,
        });

        doc.addPage({ size: 'A4', layout: 'portrait', margin: 10 });

        this.drawRfidWebLowSection(doc, {
          margin,
          pageHeight,
          contentWidth,
          fonts,
          logoBuffer,
          reportDate,
          data: input.rfid,
        });

        doc.fontSize(11).font(fonts.regular).fillColor('#6C757D');
        doc.text('เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ', margin, doc.y + 6, {
          width: contentWidth,
          align: 'center',
        });
        doc.fillColor('#000000');
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /** ตารางสต็อกต่ำ Weighing แบบหน้าเว็บ: ลำดับ · ตู้ · ชื่อ · คงเหลือ · ต้องเติม */
  private drawWeighingWebLowSection(
    doc: PDFKit.PDFDocument,
    ctx: {
      margin: number;
      pageHeight: number;
      contentWidth: number;
      fonts: FontCtx;
      logoBuffer: Buffer | null;
      reportDate: string;
      keyword?: string;
      data: WeighingStockReportData;
    },
  ): void {
    const { margin, pageHeight, contentWidth, fonts, logoBuffer, reportDate, keyword, data } = ctx;
    const { regular: finalFontName, bold: finalFontBoldName } = fonts;

    const headerTop = 35;
    const headerHeight = 48;
    doc.rect(margin, headerTop, contentWidth, headerHeight).fillAndStroke('#F8F9FA', '#DEE2E6');
    if (logoBuffer && logoBuffer.length > 0) {
      try {
        doc.image(logoBuffer, margin + 8, headerTop + 6, { fit: [70, 36] });
      } catch {
        try {
          doc.image(logoBuffer, margin + 8, headerTop + 6, { width: 70 });
        } catch {
          // skip
        }
      }
    }
    doc.fontSize(16).font(finalFontBoldName).fillColor('#1A365D');
    doc.text('สต็อกต่ำ Weighing (รวมทุกตู้)', margin, headerTop + 6, {
      width: contentWidth,
      align: 'center',
    });
    doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
    doc.text('Low stock — Weighing (all cabinets)', margin, headerTop + 22, {
      width: contentWidth,
      align: 'center',
    });
    doc.fillColor('#000000');
    doc.y = headerTop + headerHeight + 14;

    doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
    doc.text(`วันที่รายงาน: ${reportDate}`, margin, doc.y, { width: contentWidth, align: 'right' });
    doc.fillColor('#000000');
    doc.y += 4;
    doc.fontSize(10).font(finalFontName).fillColor('#6C757D');
    const banner = [
      ...(keyword ? [`ค้นหา: ${keyword}`] : []),
      'รายงานสต็อกต่ำรวมทุกตู้ (Weighing + RFID) · กรองชิป: สต็อกต่ำ',
    ].join(' · ');
    doc.text(banner, margin, doc.y, { width: contentWidth, align: 'left' });
    doc.fillColor('#000000');
    doc.y += 8;

    const rows = data?.data && Array.isArray(data.data) ? data.data : [];
    const itemHeight = 28;
    const cellPadding = 4;
    const totalTableWidth = contentWidth;
    const colPct = [0.08, 0.22, 0.38, 0.16, 0.16];
    const colWidths = colPct.map((p) => Math.floor(totalTableWidth * p));
    let sumW = colWidths.reduce((a, b) => a + b, 0);
    if (sumW < totalTableWidth) colWidths[2] += totalTableWidth - sumW;
    const headers = ['ลำดับ', 'ตู้จัดเก็บ', 'ชื่ออุปกรณ์', 'คงเหลือ', 'ต้องเติม'];

    const drawTableHeader = (y: number) => {
      doc.fontSize(13).font(finalFontBoldName);
      doc.rect(margin, y, totalTableWidth, itemHeight).fill('#1A365D');
      doc.fillColor('#FFFFFF');
      let x = margin;
      headers.forEach((h, i) => {
        doc.text(h, x + cellPadding, y + 8, {
          width: Math.max(2, colWidths[i] - cellPadding * 2),
          align: 'center',
        });
        if (i < headers.length - 1) {
          doc.save();
          doc.strokeColor('#4A6FA0').lineWidth(0.5);
          doc.moveTo(x + colWidths[i], y + 4).lineTo(x + colWidths[i], y + itemHeight - 4).stroke();
          doc.restore();
        }
        x += colWidths[i];
      });
      doc.fillColor('#000000');
    };

    const tableHeaderY = doc.y;
    drawTableHeader(tableHeaderY);
    doc.y = tableHeaderY + itemHeight;

    doc.fontSize(13).font(finalFontName).fillColor('#000000');
    if (rows.length === 0) {
      const rowY = doc.y;
      doc.rect(margin, rowY, totalTableWidth, itemHeight).fillAndStroke('#F8F9FA', '#DEE2E6');
      doc.text('ไม่มีข้อมูล', margin + cellPadding, rowY + 7, {
        width: totalTableWidth - cellPadding * 2,
        align: 'center',
      });
      doc.y = rowY + itemHeight;
    } else {
      for (let idx = 0; idx < rows.length; idx++) {
        const row = rows[idx];
        const cellTexts = [
          String(row.seq ?? idx + 1),
          String(row.cabinet_name ?? '-'),
          String(row.item_name ?? '-'),
          String(row.qty ?? 0),
          weighingRefillDisplay(row),
        ];
        doc.fontSize(13).font(finalFontName);
        const cellHeights = cellTexts.map((text, i) => {
          const w = Math.max(4, colWidths[i] - cellPadding * 2);
          return doc.heightOfString(String(text ?? '-'), { width: w });
        });
        const rowHeight = Math.max(itemHeight, Math.max(...cellHeights) + cellPadding * 2);

        if (doc.y + rowHeight > pageHeight - 35) {
          doc.addPage({ size: 'A4', layout: 'portrait', margin: 10 });
          doc.y = margin;
          const newHeaderY = doc.y;
          drawTableHeader(newHeaderY);
          doc.y = newHeaderY + itemHeight;
          doc.fontSize(13).font(finalFontName).fillColor('#000000');
        }

        const rowY = doc.y;
        const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA';
        let xPos = margin;
        for (let i = 0; i < 5; i++) {
          const cw = colWidths[i];
          const w = Math.max(4, cw - cellPadding * 2);
          doc.rect(xPos, rowY, cw, rowHeight).fillAndStroke(bg, '#DEE2E6');
          const raw = String(cellTexts[i] ?? '-').trim();
          doc.fontSize(13).font(finalFontName).fillColor('#000000');
          doc.text(raw || '-', xPos + cellPadding, rowY + cellPadding, {
            width: w,
            align: i === 1 || i === 2 ? 'left' : 'center',
          });
          xPos += cw;
        }
        doc.y = rowY + rowHeight;
      }
    }
  }

  /** ตารางสต็อกต่ำ RFID แบบหน้าเว็บ — รวมแท็กเป็นรายการเดียว */
  private drawRfidWebLowSection(
    doc: PDFKit.PDFDocument,
    ctx: {
      margin: number;
      pageHeight: number;
      contentWidth: number;
      fonts: FontCtx;
      logoBuffer: Buffer | null;
      reportDate: string;
      data: CabinetStockReportData;
    },
  ): void {
    const { margin, pageHeight, contentWidth, fonts, logoBuffer, reportDate, data } = ctx;
    const { regular: finalFontName, bold: finalFontBoldName } = fonts;

    const headerTop = 35;
    const headerHeight = 48;
    doc.rect(margin, headerTop, contentWidth, headerHeight).fillAndStroke('#F8F9FA', '#DEE2E6');
    if (logoBuffer && logoBuffer.length > 0) {
      try {
        doc.image(logoBuffer, margin + 8, headerTop + 6, { fit: [70, 36] });
      } catch {
        try {
          doc.image(logoBuffer, margin + 8, headerTop + 6, { width: 70 });
        } catch {
          // skip
        }
      }
    }
    doc.fontSize(16).font(finalFontBoldName).fillColor('#1A365D');
    doc.text('สต็อกต่ำ RFID (รวมทุกตู้)', margin, headerTop + 6, {
      width: contentWidth,
      align: 'center',
    });
    doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
    doc.text('Low stock — RFID (all cabinets)', margin, headerTop + 22, {
      width: contentWidth,
      align: 'center',
    });
    doc.fillColor('#000000');
    doc.y = headerTop + headerHeight + 14;

    doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
    doc.text(`วันที่รายงาน: ${reportDate}`, margin, doc.y, { width: contentWidth, align: 'right' });
    doc.fillColor('#000000');
    doc.y += 8;

    const rawRows = data?.data && Array.isArray(data.data) ? data.data : [];
    const rows = aggregateRfidRowsForPdfWeb(rawRows);

    const itemHeight = 28;
    const cellPadding = 4;
    const totalTableWidth = contentWidth;
    const colPct = [0.08, 0.22, 0.38, 0.16, 0.16];
    const colWidths = colPct.map((p) => Math.floor(totalTableWidth * p));
    let sumW = colWidths.reduce((a, b) => a + b, 0);
    if (sumW < totalTableWidth) colWidths[2] += totalTableWidth - sumW;
    const headers = ['ลำดับ', 'ตู้จัดเก็บ', 'ชื่ออุปกรณ์', 'คงเหลือ', 'ต้องเติม'];

    const drawTableHeader = (y: number) => {
      doc.fontSize(13).font(finalFontBoldName);
      doc.rect(margin, y, totalTableWidth, itemHeight).fill('#1A365D');
      doc.fillColor('#FFFFFF');
      let x = margin;
      headers.forEach((h, i) => {
        doc.text(h, x + cellPadding, y + 8, {
          width: Math.max(2, colWidths[i] - cellPadding * 2),
          align: 'center',
        });
        if (i < headers.length - 1) {
          doc.save();
          doc.strokeColor('#4A6FA0').lineWidth(0.5);
          doc.moveTo(x + colWidths[i], y + 4).lineTo(x + colWidths[i], y + itemHeight - 4).stroke();
          doc.restore();
        }
        x += colWidths[i];
      });
      doc.fillColor('#000000');
    };

    const tableHeaderY = doc.y;
    drawTableHeader(tableHeaderY);
    doc.y = tableHeaderY + itemHeight;

    doc.fontSize(13).font(finalFontName).fillColor('#000000');
    if (rows.length === 0) {
      const rowY = doc.y;
      doc.rect(margin, rowY, totalTableWidth, itemHeight).fillAndStroke('#F8F9FA', '#DEE2E6');
      doc.text('ไม่มีข้อมูล', margin + cellPadding, rowY + 7, {
        width: totalTableWidth - cellPadding * 2,
        align: 'center',
      });
      doc.y = rowY + itemHeight;
    } else {
      for (let idx = 0; idx < rows.length; idx++) {
        const row = rows[idx];
        const cellTexts = [
          String(row.seq),
          row.cabinet,
          row.itemName,
          String(row.qty),
          row.refill,
        ];
        doc.fontSize(13).font(finalFontName);
        const cellHeights = cellTexts.map((text, i) => {
          const w = Math.max(4, colWidths[i] - cellPadding * 2);
          return doc.heightOfString(String(text ?? '-'), { width: w });
        });
        const rowHeight = Math.max(itemHeight, Math.max(...cellHeights) + cellPadding * 2);

        if (doc.y + rowHeight > pageHeight - 35) {
          doc.addPage({ size: 'A4', layout: 'portrait', margin: 10 });
          doc.y = margin;
          const newHeaderY = doc.y;
          drawTableHeader(newHeaderY);
          doc.y = newHeaderY + itemHeight;
          doc.fontSize(13).font(finalFontName).fillColor('#000000');
        }

        const rowY = doc.y;
        const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA';
        let xPos = margin;
        for (let i = 0; i < 5; i++) {
          const cw = colWidths[i];
          const w = Math.max(4, cw - cellPadding * 2);
          doc.rect(xPos, rowY, cw, rowHeight).fillAndStroke(bg, '#DEE2E6');
          const raw = String(cellTexts[i] ?? '-').trim();
          doc.fontSize(13).font(finalFontName).fillColor('#000000');
          doc.text(raw || '-', xPos + cellPadding, rowY + cellPadding, {
            width: w,
            align: i === 1 || i === 2 ? 'left' : 'center',
          });
          xPos += cw;
        }
        doc.y = rowY + rowHeight;
      }
    }
  }
}

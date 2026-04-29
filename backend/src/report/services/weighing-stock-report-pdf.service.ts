import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import {
  WeighingStockReportData,
} from './weighing-stock-report-excel.service';
import { resolveReportLogoPath, getReportThaiFontPaths } from '../config/report.config';

/** สล็อต Sensor: 1 = ใน (เขียว), 2 = นอก (ฟ้า) — โทนใกล้ globals.css --slot-in / --slot-out (โหมดสว่าง) */
const SLOT_PILL = {
  ใน: { bg: '#2f8f72', fg: '#f8fafc' },
  นอก: { bg: '#3d5c8c', fg: '#f8fafc' },
} as const;

@Injectable()
export class WeighingStockReportPdfService {
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

  async generateReport(data: WeighingStockReportData): Promise<Buffer> {
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
        const summary = data?.summary ?? { total_rows: 0, total_qty: 0 };
        const rows = data?.data && Array.isArray(data.data) ? data.data : [];

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
        doc.text('รายการสต๊อกในตู้ Weighing', margin, headerTop + 6, { width: contentWidth, align: 'center' });
        doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
        doc.text('Weighing Stock Report', margin, headerTop + 22, { width: contentWidth, align: 'center' });
        doc.fillColor('#000000');
        doc.y = headerTop + headerHeight + 14;

        doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
        doc.text(`วันที่รายงาน: ${reportDate}`, margin, doc.y, { width: contentWidth, align: 'right' });
        doc.fillColor('#000000');
        doc.y += 6;

        // const filters = data.filters ?? {};
        // const filterRowHeight = 34;
        // const filterY = doc.y;
        // const filterCells = [
        //   { label: 'ตู้ (StockID)', value: filters.stockId != null ? String(filters.stockId) : 'ทั้งหมด' },
        //   { label: 'รหัสสินค้า', value: filters.itemcode ?? 'ทั้งหมด' },
        //   { label: 'จำนวนรายการ', value: `${summary.total_rows} รายการ` },
        // ];
        // const filterColWidth = Math.floor(contentWidth / filterCells.length);
        // let fx = margin;
        // filterCells.forEach((fc, i) => {
        //   const cw = i === filterCells.length - 1 ? contentWidth - filterColWidth * (filterCells.length - 1) : filterColWidth;
        //   doc.rect(fx, filterY, cw, filterRowHeight).fillAndStroke('#E8EDF2', '#DEE2E6');
        //   doc.fontSize(11).font(finalFontBoldName).fillColor('#444444');
        //   doc.text(fc.label, fx + 3, filterY + 4, { width: cw - 6, align: 'center' });
        //   doc.fontSize(13).font(finalFontName).fillColor('#1A365D');
        //   doc.text(fc.value, fx + 3, filterY + 16, { width: cw - 6, align: 'center' });
        //   fx += cw;
        // });
        // doc.fillColor('#000000');
        // doc.y = filterY + filterRowHeight + 8;

        const itemHeight = 28;
        const cellPadding = 4;
        const totalTableWidth = contentWidth;
        const colPct = [0.08, 0.38, 0.18, 0.12, 0.12, 0.12];
        const colWidths = colPct.map((p) => Math.floor(totalTableWidth * p));
        let sumW = colWidths.reduce((a, b) => a + b, 0);
        if (sumW < totalTableWidth) colWidths[1] += totalTableWidth - sumW;
        const headers = ['ลำดับ', 'ชื่ออุปกรณ์', 'ตู้', 'ช่อง', 'สล็อต', 'จำนวน'];

        const drawTableHeader = (y: number) => {
          doc.fontSize(13).font(finalFontBoldName);
          doc.rect(margin, y, totalTableWidth, itemHeight).fill('#1A365D');
          doc.fillColor('#FFFFFF');
          let x = margin;
          headers.forEach((h, i) => {
            doc.text(h, x + cellPadding, y + 8, {
              width: Math.max(2, colWidths[i] - cellPadding * 2),
              align: i === 1 || i === 2 ? 'center' : 'center',
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
          doc.text('ไม่มีข้อมูล', margin + cellPadding, rowY + 7, { width: totalTableWidth - cellPadding * 2, align: 'center' });
          doc.y = rowY + itemHeight;
        } else {
          for (let idx = 0; idx < rows.length; idx++) {
            const row = rows[idx];
            const cellTexts = [
              String(row.seq ?? idx + 1),
              String(row.item_name ?? '-'),
              String(row.cabinet_name ?? '-'),
              String(row.channel_display ?? '-'),
              String(row.slot_display ?? '-'),
              String(row.qty ?? 0),
            ];
            doc.fontSize(13).font(finalFontName);
            const cellHeights = cellTexts.map((text, i) => {
              const w = Math.max(4, colWidths[i] - cellPadding * 2);
              const t = text ?? '-';
              if (i === 4 && (t === 'ใน' || t === 'นอก')) {
                return 22 + cellPadding * 2;
              }
              return doc.heightOfString(t, { width: w });
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
            for (let i = 0; i < 6; i++) {
              const cw = colWidths[i];
              const w = Math.max(4, cw - cellPadding * 2);
              doc.rect(xPos, rowY, cw, rowHeight).fillAndStroke(bg, '#DEE2E6');
              const raw = String(cellTexts[i] ?? '-').trim();
              if (i === 4 && (raw === 'ใน' || raw === 'นอก')) {
                const pal = SLOT_PILL[raw as keyof typeof SLOT_PILL];
                const fs = 11;
                doc.fontSize(fs).font(finalFontBoldName);
                const tw = doc.widthOfString(raw);
                const pillPadX = 10;
                const pillH = Math.min(22, rowHeight - 6);
                const pillW = Math.min(w, tw + pillPadX * 2);
                const bx = xPos + (cw - pillW) / 2;
                const by = rowY + (rowHeight - pillH) / 2;
                const radius = pillH / 2;
                doc.save();
                doc.roundedRect(bx, by, pillW, pillH, radius).fill(pal.bg);
                doc.restore();
                doc.fillColor(pal.fg);
                doc.text(raw, bx, by + (pillH - fs) / 2 - 0.5, {
                  width: pillW,
                  align: 'center',
                  lineBreak: false,
                });
                doc.fillColor('#000000');
              } else {
                doc.fontSize(13).font(finalFontName).fillColor('#000000');
                doc.text(raw || '-', xPos + cellPadding, rowY + cellPadding, {
                  width: w,
                  align: i === 1 || i === 2 ? 'left' : 'center',
                });
              }
              xPos += cw;
            }
            doc.y = rowY + rowHeight;
          }
        }

        doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
        doc.text('เอกสารนี้สร้างจากระบบรายงานอัตโนมัติ', margin, doc.y + 6, { width: contentWidth, align: 'center' });
        doc.fillColor('#000000');
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

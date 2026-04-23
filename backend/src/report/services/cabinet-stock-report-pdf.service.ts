import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { CabinetStockReportData } from './cabinet-stock-report-excel.service';
import { resolveReportLogoPath, getReportThaiFontPaths } from '../config/report.config';

/** สีสถานะในคอลัมน์สถานะ — ข้อมูลแถวใช้ zebra เหมือน weighing */
function statusTextColor(status: string): string {
  const s = (status || '').toUpperCase();
  if (s === 'EXPIRED') return '#B91C1C';
  if (s === 'LOW') return '#C2410C';
  if (s === 'SOON') return '#B45309';
  if (s === 'OK') return '#15803D';
  return '#000000';
}

@Injectable()
export class CabinetStockReportPdfService {
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

  async generateReport(data: CabinetStockReportData): Promise<Buffer> {
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
        doc.text('รายการสต๊อกในตู้ (RFID)', margin, headerTop + 6, { width: contentWidth, align: 'center' });
        doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
        doc.text('RFID Cabinet Stock Report', margin, headerTop + 22, { width: contentWidth, align: 'center' });
        doc.fillColor('#000000');
        doc.y = headerTop + headerHeight + 14;

        doc.fontSize(11).font(finalFontName).fillColor('#6C757D');
        doc.text(`วันที่รายงาน: ${reportDate}`, margin, doc.y, { width: contentWidth, align: 'right' });
        doc.fillColor('#000000');
        doc.y += 6;

        const itemHeight = 28;
        const cellPadding = 4;
        const totalTableWidth = contentWidth;
        const colPct = [0.08, 0.44, 0.24, 0.24];
        const colWidths = colPct.map((p) => Math.floor(totalTableWidth * p));
        let sumW = colWidths.reduce((a, b) => a + b, 0);
        if (sumW < totalTableWidth) colWidths[1] += totalTableWidth - sumW;
        const headers = ['ลำดับ', 'ชื่ออุปกรณ์', 'วันหมดอายุ', 'สถานะ'];

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
              String(idx + 1),
              String(row.device_name ?? '-'),
              String(row.expire_date_ymd ?? '-'),
              String(row.status_label ?? '-'),
            ];
            doc.fontSize(13).font(finalFontName);
            const cellHeights = cellTexts.map((text, i) => {
              const w = Math.max(4, colWidths[i] - cellPadding * 2);
              return doc.heightOfString(text ?? '-', { width: w });
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
            for (let i = 0; i < 4; i++) {
              const cw = colWidths[i];
              const w = Math.max(4, cw - cellPadding * 2);
              doc.rect(xPos, rowY, cw, rowHeight).fillAndStroke(bg, '#DEE2E6');
              const raw = String(cellTexts[i] ?? '-').trim();
              const isStatus = i === 3;
              doc.fontSize(13).font(isStatus ? finalFontBoldName : finalFontName);
              doc.fillColor(isStatus ? statusTextColor(row.status_label ?? '') : '#000000');
              doc.text(raw || '-', xPos + cellPadding, rowY + cellPadding, {
                width: w,
                align: i === 1 ? 'left' : 'center',
                lineGap: 2,
              });
              xPos += cw;
            }
            doc.fillColor('#000000');
            doc.font(finalFontName);
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

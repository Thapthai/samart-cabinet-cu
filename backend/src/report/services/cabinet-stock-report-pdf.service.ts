import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { CabinetStockReportData } from './cabinet-stock-report-excel.service';
import { resolveReportLogoPath, getReportThaiFontPaths } from '../config/report.config';

const PALETTE = {
  ink: '#0F172A',
  muted: '#64748B',
  line: '#E2E8F0',
  lineStrong: '#CBD5E1',
  headerBg: '#1E3A5F',
  card: '#F8FAFC',
  /** พื้นสรุปใต้วันที่ — เทาชัดพอเห็นบนจอและพิมพ์ */
  summaryBandFill: '#D8DEE6',
  summaryBandStroke: '#9CA3AF',
  accent: '#2563EB',
  footer: '#94A3B8',
};

function pdfRowBgForStatus(status: string, zebraLight: boolean): string {
  const s = (status || '').toUpperCase();
  if (s === 'EXPIRED') return '#FECACA';
  if (s === 'LOW') return '#FFEDD5';
  if (s === 'SOON') return '#FEF08A';
  return zebraLight ? '#F8FAFC' : '#FFFFFF';
}

function statusTextColor(status: string): string {
  const s = (status || '').toUpperCase();
  if (s === 'EXPIRED') return '#B91C1C';
  if (s === 'LOW') return '#C2410C';
  if (s === 'SOON') return '#B45309';
  if (s === 'OK') return '#15803D';
  return PALETTE.ink;
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
      margin: 40,
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
        doc.font(finalFontBoldName).fontSize(17);
        doc.font(finalFontName).fontSize(17);
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
        const margin = 40;
        /** ขนาดตัวอักษรหลัก = 17pt (ตาราง + กล่องสรุป) */
        const F = {
          title: 26,
          titleEn: 14,
          date: 13,
          summary: 17,
          table: 17,
          footer: 12,
          pageNum: 11,
        } as const;
        const pageWidth = doc.page.width;
        const contentWidth = pageWidth - margin * 2;
        const summary = data?.summary ?? { total_rows: 0, total_qty: 0 };
        const rows = data?.data && Array.isArray(data.data) ? data.data : [];
        const filters = data.filters ?? {};
        const totalRows = Number(summary.total_rows ?? 0);
        const totalQty = Number(summary.total_qty ?? 0);
        const cabinetLabel = (filters.cabinetName || filters.cabinetCode || '').trim();
        const scopeLine = cabinetLabel
          ? `ตู้: ${cabinetLabel}`
          : filters.departmentName
            ? `แผนก: ${filters.departmentName}`
            : '';
        const descLine = `ทั้งหมด ${totalRows} รายการจากระบบ · รวม ${totalQty} แท็ก RFID · จำนวนคงเหลือต่อแถว = จำนวนแถว itemstock ที่มี RfidCode ในตู้ (เท่าคอลัมน์บนหน้าเว็บ)`;
        const subtitleBlock = scopeLine ? `${scopeLine}\n${descLine}` : descLine;

        const headerTop = 40;
        const headerHeight = 58;
        doc.rect(margin, headerTop, contentWidth, headerHeight).fillAndStroke(PALETTE.card, PALETTE.lineStrong);
        doc.save();
        doc.strokeColor(PALETTE.accent).lineWidth(3);
        doc.moveTo(margin, headerTop + headerHeight).lineTo(margin + contentWidth, headerTop + headerHeight).stroke();
        doc.restore();

        if (logoBuffer && logoBuffer.length > 0) {
          try {
            doc.image(logoBuffer, margin + 10, headerTop + 8, { fit: [72, 38] });
          } catch {
            try {
              doc.image(logoBuffer, margin + 10, headerTop + 8, { width: 72 });
            } catch {
              // skip logo
            }
          }
        }

        doc.fontSize(20).font(finalFontBoldName).fillColor(PALETTE.headerBg);
        doc.text('รายการในตู้ (RFID)', margin, headerTop + 8, {
          width: contentWidth,
          align: 'center',
        });
        doc.fontSize(12).font(finalFontName).fillColor(PALETTE.muted);
        doc.text('Cabinet / RFID', margin, headerTop + 34, {
          width: contentWidth,
          align: 'center',
        });
        doc.fillColor(PALETTE.ink);
        doc.y = headerTop + headerHeight + 16;

        doc.fontSize(11).font(finalFontName).fillColor(PALETTE.muted);
        doc.text(`วันที่รายงาน: ${reportDate}`, margin, doc.y, {
          width: contentWidth,
          align: 'right',
        });
        doc.fillColor(PALETTE.ink);
        doc.y += 8;

        const subY = doc.y;
        const subPadX = 14;
        const subPadY = 6;
        doc.fontSize(F.summary).font(finalFontName).fillColor(PALETTE.ink);
        const textBlockH = doc.heightOfString(subtitleBlock, {
          width: contentWidth - subPadX * 2,
          lineGap: 2,
        });
        const subH = Math.max(38, textBlockH + subPadY * 2);
        doc.save();
        doc.fillColor(PALETTE.summaryBandFill);
        doc.strokeColor(PALETTE.summaryBandStroke);
        doc.lineWidth(1);
        doc.roundedRect(margin, subY, contentWidth, subH, 4);
        doc.fill();
        doc.stroke();
        doc.restore();
        doc.fontSize(F.summary).font(finalFontName).fillColor(PALETTE.ink);
        doc.text(subtitleBlock, margin + subPadX, subY + subPadY, {
          width: contentWidth - subPadX * 2,
          align: 'left',
          lineGap: 2,
        });
        doc.fillColor(PALETTE.ink);
        doc.y = subY + subH + 12;

        const itemHeight = 36;
        const cellPadding = 6;
        const totalTableWidth = contentWidth;
        /** แนวตั้ง — คอลัมน์แคบ เน้นชื่ออุปกรณ์ซ้าย */
        const colPct = [0.38, 0.15, 0.12, 0.17, 0.18];
        const colWidths = colPct.map((p) => Math.floor(totalTableWidth * p));
        let sumW = colWidths.reduce((a, b) => a + b, 0);
        if (sumW < totalTableWidth) colWidths[0]! += totalTableWidth - sumW;
        const headers = ['ชื่ออุปกรณ์', 'วันหมดอายุ', 'จำนวนคงเหลือ', 'Min / Max', 'สถานะ'];

        const drawTableHeader = (y: number) => {
          let x = margin;
          doc.save();
          doc.roundedRect(margin, y, totalTableWidth, itemHeight, 3).fill(PALETTE.headerBg);
          doc.restore();
          doc.fontSize(11).font(finalFontBoldName).fillColor('#F8FAFC');
          headers.forEach((h, i) => {
            doc.text(h, x + cellPadding, y + 9, {
              width: Math.max(2, colWidths[i]! - cellPadding * 2),
              align: 'center',
              lineGap: 1,
            });
            if (i < headers.length - 1) {
              doc.save();
              doc.strokeColor('#3D5A80').opacity(0.6).lineWidth(0.35);
              doc.moveTo(x + colWidths[i]!, y + 6).lineTo(x + colWidths[i]!, y + itemHeight - 6).stroke();
              doc.opacity(1).restore();
            }
            x += colWidths[i]!;
          });
          doc.fillColor(PALETTE.ink);
        };

        const tableHeaderY = doc.y;
        drawTableHeader(tableHeaderY);
        doc.y = tableHeaderY + itemHeight + 1;

        doc.fontSize(F.table).font(finalFontName).fillColor(PALETTE.ink);
        if (rows.length === 0) {
          const rowY = doc.y;
          doc.roundedRect(margin, rowY, totalTableWidth, itemHeight, 2).fillAndStroke('#F8FAFC', PALETTE.line);
          doc.text('ไม่มีข้อมูล', margin + cellPadding, rowY + 10, {
            width: totalTableWidth - cellPadding * 2,
            align: 'center',
          });
          doc.y = rowY + itemHeight;
        } else {
          for (let idx = 0; idx < rows.length; idx++) {
            const row = rows[idx]!;
            const bal = Number(row.balance_qty ?? 0);
            const cellTexts = [
              String(row.device_name ?? '—'),
              String(row.expire_date_ymd ?? '—'),
              bal.toLocaleString('th-TH'),
              String(row.min_max_display ?? '—'),
              String(row.status_label ?? '—'),
            ];

            doc.fontSize(F.table).font(finalFontName);
            const cellHeights = cellTexts.map((text, i) => {
              const w = Math.max(4, colWidths[i]! - cellPadding * 2);
              return doc.heightOfString(text || '—', { width: w, lineGap: 2 });
            });
            const rowHeight = Math.max(itemHeight - 2, Math.max(...cellHeights) + cellPadding * 2);

            const bottomSafe = 52;
            const pageH = doc.page.height;
            if (doc.y + rowHeight > pageH - margin - bottomSafe) {
              doc.addPage({ size: 'A4', layout: 'portrait', margin });
              doc.y = margin;
              const newHeaderY = doc.y;
              drawTableHeader(newHeaderY);
              doc.y = newHeaderY + itemHeight + 1;
              doc.fontSize(F.table).font(finalFontName).fillColor(PALETTE.ink);
            }

            const rowY = doc.y;
            const bg = pdfRowBgForStatus(row.status_label ?? '', idx % 2 === 1);
            let xPos = margin;
            const colCount = Math.min(headers.length, colWidths.length, cellTexts.length);
            const aligns: ('left' | 'center' | 'right')[] = ['left', 'center', 'right', 'center', 'center'];
            for (let i = 0; i < colCount; i++) {
              const cw = colWidths[i]!;
              const w = Math.max(4, cw - cellPadding * 2);
              doc.rect(xPos, rowY, cw, rowHeight).fillAndStroke(bg, PALETTE.line);
              const isStatus = i === 4;
              doc.fontSize(F.table).font(isStatus ? finalFontBoldName : finalFontName);
              doc.fillColor(isStatus ? statusTextColor(row.status_label ?? '') : PALETTE.ink);
              doc.text(cellTexts[i] ?? '—', xPos + cellPadding, rowY + cellPadding, {
                width: w,
                align: aligns[i] ?? 'center',
                lineGap: 2,
              });
              xPos += cw;
            }
            doc.fillColor(PALETTE.ink);
            doc.font(finalFontName);
            doc.y = rowY + rowHeight;
          }
        }

        doc.moveTo(margin, doc.y + 8).lineTo(margin + contentWidth, doc.y + 8).strokeColor(PALETTE.line).lineWidth(0.5).stroke();
        doc.y += 14;

        doc.fontSize(F.footer).font(finalFontName).fillColor(PALETTE.footer);
        doc.text(
          'หมายเหตุ: จำนวนคงเหลือ = จำนวนแท็ก RFID (แถว itemstock ที่มี RfidCode ในตู้) เหมือนคอลัมน์บนหน้าเว็บ · Min/Max จากรายการอุปกรณ์',
          margin,
          doc.y,
          {
            width: contentWidth,
            align: 'center',
            lineGap: 1,
          },
        );

        const range = doc.bufferedPageRange();
        for (let p = 0; p < range.count; p++) {
          doc.switchToPage(range.start + p);
          const ph = doc.page.height;
          const pw = doc.page.width;
          const cw = pw - margin * 2;
          doc.fontSize(9).font(finalFontName).fillColor(PALETTE.footer);
          doc.text(`หน้า ${p + 1} / ${range.count}`, margin, ph - margin - 20, {
            width: cw,
            align: 'center',
          });
        }

        doc.fillColor(PALETTE.ink);
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { getReportThaiFontPaths, resolveReportLogoPath } from '../../report/config/report.config';

export type PrePrintStickerPdfData = {
  doc_no: string;
  status: string;
  remark: string | null;
  total_lines: number;
  total_sheets: number;
  created_at: Date | string;
  created_by_label: string;
  details: Array<{
    itemcode: string;
    item_name: string | null;
    expire_date: Date | string | null;
    copies: number;
    lot_no: string | null;
  }>;
};

function formatThDateTime(value: Date | string): string {
  try {
    return new Date(value).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  } catch {
    return String(value);
  }
}

function formatThDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' });
  } catch {
    return String(value);
  }
}

function statusLabel(status: string): string {
  if (status === 'PREPARED') return 'เตรียมพิมพ์';
  if (status === 'PRINTED') return 'พิมพ์แล้ว';
  return status;
}

@Injectable()
export class PrePrintStickerExportPdfService {
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

  async generateDocument(data: PrePrintStickerPdfData): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'portrait',
      margin: 36,
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    let fontName = 'Helvetica';
    let fontBold = 'Helvetica-Bold';
    const hasThai = await this.registerThaiFont(doc);
    if (hasThai) {
      fontName = 'ThaiFont';
      fontBold = 'ThaiFontBold';
    }

    const logoBuffer = this.getLogoBuffer();

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        const margin = 36;
        const pageWidth = doc.page.width;
        const contentWidth = pageWidth - margin * 2;

        const drawHeader = () => {
          const headerTop = 28;
          const headerHeight = 52;
          doc.rect(margin, headerTop, contentWidth, headerHeight).fillAndStroke('#F8F9FA', '#DEE2E6');

          if (logoBuffer?.length) {
            try {
              doc.image(logoBuffer, margin + 8, headerTop + 8, { fit: [64, 36] });
            } catch {
              /* skip logo */
            }
          }

          doc.fontSize(16).font(fontBold).fillColor('#1A365D');
          doc.text('เอกสารเตรียมพิมพ์สติ๊กเกอร์', margin, headerTop + 8, {
            width: contentWidth,
            align: 'center',
          });
          doc.fontSize(11).font(fontName).fillColor('#6C757D');
          doc.text('Pre-print Sticker Document', margin, headerTop + 28, {
            width: contentWidth,
            align: 'center',
          });
          doc.fillColor('#000000');
          doc.y = headerTop + headerHeight + 14;
        };

        const ensureSpace = (needed: number) => {
          const bottom = doc.page.height - margin;
          if (doc.y + needed > bottom) {
            doc.addPage({ size: 'A4', layout: 'portrait', margin: 36 });
            drawHeader();
          }
        };

        drawHeader();

        doc.fontSize(12).font(fontBold).fillColor('#1A365D').text('ข้อมูลเอกสาร', margin, doc.y);
        doc.y += 8;

        const gap = 10;
        const colW = (contentWidth - gap) / 2;
        const labelW = 78;
        const rowH = 20;
        const boxPadX = 10;
        const boxPadY = 8;

        type MetaPair = { left: [string, string]; right?: [string, string] };
        const metaRows: MetaPair[] = [
          {
            left: ['เลขที่เอกสาร', data.doc_no],
            right: ['วันที่บันทึก', formatThDateTime(data.created_at)],
          },
          {
            left: ['ผู้บันทึก', data.created_by_label || '—'],
            right: ['สถานะ', statusLabel(data.status)],
          },
          {
            left: ['จำนวน lot', String(data.total_lines)],
            right: ['จำนวนแผ่น', String(data.total_sheets)],
          },
          {
            left: ['หมายเหตุ', data.remark?.trim() || '—'],
          },
        ];

        const boxTop = doc.y;
        const boxH = boxPadY * 2 + metaRows.length * rowH;
        ensureSpace(boxH + 8);
        doc.roundedRect(margin, boxTop, contentWidth, boxH, 4).fillAndStroke('#F8FAFC', '#E2E8F0');

        let rowY = boxTop + boxPadY;
        for (const row of metaRows) {
          const drawCell = (pair: [string, string], x: number, width: number) => {
            const [label, value] = pair;
            doc.fontSize(10).font(fontBold).fillColor('#64748B');
            doc.text(`${label}`, x, rowY + 3, { width: labelW, lineBreak: false });
            doc.fontSize(10).font(fontName).fillColor('#0F172A');
            doc.text(value, x + labelW, rowY + 3, {
              width: Math.max(40, width - labelW - 4),
              ellipsis: true,
              lineBreak: false,
            });
          };

          if (row.right) {
            drawCell(row.left, margin + boxPadX, colW - boxPadX);
            drawCell(row.right, margin + boxPadX + colW + gap, colW - boxPadX);
          } else {
            const [label, value] = row.left;
            doc.fontSize(10).font(fontBold).fillColor('#64748B');
            doc.text(`${label}`, margin + boxPadX, rowY + 3, { width: labelW, lineBreak: false });
            doc.fontSize(10).font(fontName).fillColor('#0F172A');
            doc.text(value, margin + boxPadX + labelW, rowY + 3, {
              width: contentWidth - boxPadX * 2 - labelW,
              ellipsis: true,
              lineBreak: false,
            });
          }
          rowY += rowH;
        }

        doc.y = boxTop + boxH + 14;
        doc.fontSize(12).font(fontBold).fillColor('#1A365D').text('รายการ lot', margin, doc.y);
        doc.y += 8;

        const cols = [
          { label: 'รหัส', width: 0.16 },
          { label: 'ชื่ออุปกรณ์', width: 0.4 },
          { label: 'วันหมดอายุ', width: 0.18 },
          { label: 'จำนวน', width: 0.1 },
          { label: 'Lot no.', width: 0.16 },
        ];

        const drawTableHeader = () => {
          ensureSpace(24);
          const headerY = doc.y;
          const headerH = 22;
          let x = margin;
          doc.rect(margin, headerY, contentWidth, headerH).fillAndStroke('#1A365D', '#1A365D');
          cols.forEach((col) => {
            const w = contentWidth * col.width;
            doc.fontSize(10).font(fontBold).fillColor('#FFFFFF');
            doc.text(col.label, x + 3, headerY + 5, { width: w - 6, align: 'center' });
            x += w;
          });
          doc.fillColor('#000000');
          doc.y = headerY + headerH;
        };

        drawTableHeader();

        data.details.forEach((line, idx) => {
          ensureSpace(22);
          const lineY = doc.y;
          const lineH = 20;
          if (idx % 2 === 1) {
            doc.rect(margin, lineY, contentWidth, lineH).fill('#F8F9FA');
          }
          const values = [
            line.itemcode,
            line.item_name?.trim() || '—',
            formatThDate(line.expire_date),
            String(line.copies),
            line.lot_no?.trim() || '—',
          ];
          let x = margin;
          values.forEach((val, i) => {
            const w = contentWidth * cols[i].width;
            doc.fontSize(9).font(fontName).fillColor('#212529');
            doc.text(val, x + 3, lineY + 5, {
              width: w - 6,
              align: i === 1 ? 'left' : 'center',
              ellipsis: true,
            });
            x += w;
          });
          doc.y = lineY + lineH;
        });

        doc.y += 16;
        doc.fontSize(9).font(fontName).fillColor('#6C757D');
        doc.text(
          `พิมพ์เมื่อ ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`,
          margin,
          doc.y,
          { width: contentWidth, align: 'right' },
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePrePrintStickerDto } from './dto/create-pre-print-sticker.dto';
import type { UpdatePrePrintStickerDto } from './dto/update-pre-print-sticker.dto';
import { PrePrintStickerExportPdfService } from './services/pre-print-sticker-export-pdf.service';

@Injectable()
export class StickerPrintService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prePrintPdf: PrePrintStickerExportPdfService,
  ) {}

  private async generatePrePrintDocNo(): Promise<string> {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const prefix = `PPST-${y}${m}${d}-`;

    const last = await this.prisma.prePrintSticker.findFirst({
      where: { doc_no: { startsWith: prefix } },
      orderBy: { doc_no: 'desc' },
      select: { doc_no: true },
    });

    const lastSeq = last ? parseInt(last.doc_no.slice(prefix.length), 10) : 0;
    const nextSeq = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  private parseExpireDateYmd(raw: string | undefined): Date | null {
    const v = raw?.trim();
    if (!v) return null;
    const parsed = new Date(`${v}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private displayItemcode(
    stored: string,
    item?: { itemcode2?: string | null } | null,
  ): string {
    const code2 = item?.itemcode2?.trim();
    return code2 || stored;
  }

  private mapDetailsForClient<
    T extends {
      itemcode: string;
      item?: { itemcode2?: string | null } | null;
    },
  >(details: T[]) {
    return details.map(({ item, ...rest }) => ({
      ...rest,
      itemcode: this.displayItemcode(rest.itemcode, item),
    }));
  }

  private detailInclude() {
    return {
      orderBy: [{ item_name: 'asc' as const }, { line_order: 'asc' as const }],
      include: {
        item: { select: { itemcode2: true } },
      },
    };
  }

  private async resolvePrePrintLines(lines: CreatePrePrintStickerDto['lines']) {
    if (!lines?.length) {
      throw new BadRequestException('กรุณาระบุรายการอย่างน้อย 1 แถว');
    }

    const itemcodes = [...new Set(lines.map((l) => l.itemcode.trim()).filter(Boolean))];
    const items = await this.prisma.item.findMany({
      where: {
        OR: [{ itemcode2: { in: itemcodes } }, { itemcode: { in: itemcodes } }],
      },
      select: { itemcode: true, itemcode2: true, itemname: true },
    });

    const pkByIncoming = new Map<string, string>();
    const nameByIncoming = new Map<string, string | null>();
    for (const item of items) {
      const display = (item.itemcode2 ?? '').trim();
      if (display) {
        pkByIncoming.set(display, item.itemcode);
        nameByIncoming.set(display, item.itemname);
      }
      pkByIncoming.set(item.itemcode, item.itemcode);
      nameByIncoming.set(item.itemcode, item.itemname);
    }

    const missing = itemcodes.filter((c) => !pkByIncoming.has(c));
    if (missing.length > 0) {
      const sample = missing.slice(0, 12).join(', ');
      throw new NotFoundException(
        `ไม่พบ Item ${missing.length} รายการ (เช่น ${sample}${missing.length > 12 ? '…' : ''})`,
      );
    }

    const totalSheets = lines.reduce((s, l) => s + l.copies, 0);
    if (totalSheets > 2000) {
      throw new BadRequestException(`จำนวนฉลากรวมเกิน 2000 (ตอนนี้รวม ${totalSheets} แผ่น)`);
    }

    return { lines, pkByIncoming, nameByIncoming, totalSheets };
  }

  async createPrePrintSticker(dto: CreatePrePrintStickerDto, userId?: number) {
    const { lines, pkByIncoming, nameByIncoming, totalSheets } = await this.resolvePrePrintLines(
      dto.lines ?? [],
    );
    const docNo = await this.generatePrePrintDocNo();

    const created = await this.prisma.prePrintSticker.create({
      data: {
        doc_no: docNo,
        status: 'PREPARED',
        remark: dto.remark?.trim() || null,
        total_lines: lines.length,
        total_sheets: totalSheets,
        created_by_user_id: userId ?? null,
        details: {
          create: lines.map((line, idx) => {
            const incoming = line.itemcode.trim();
            return {
              line_order: idx,
              itemcode: pkByIncoming.get(incoming) ?? incoming,
              item_name: line.item_name?.trim() || nameByIncoming.get(incoming) || null,
              expire_date: this.parseExpireDateYmd(line.expire_date),
              copies: line.copies,
              is_main: false,
              lot_no: line.lot_no?.trim().slice(0, 50) || null,
            };
          }),
        },
      },
      include: {
        details: this.detailInclude(),
        createdBy: {
          select: { id: true, fname: true, lname: true, email: true },
        },
      },
    });

    return {
      success: true,
      data: { ...created, details: this.mapDetailsForClient(created.details) },
    };
  }

  async updatePrePrintSticker(id: number, dto: UpdatePrePrintStickerDto) {
    const existing = await this.prisma.prePrintSticker.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('ไม่พบเอกสาร');

    const { lines, pkByIncoming, nameByIncoming, totalSheets } = await this.resolvePrePrintLines(
      dto.lines ?? [],
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.prePrintStickerDetail.deleteMany({ where: { pre_print_sticker_id: id } });
      return tx.prePrintSticker.update({
        where: { id },
        data: {
          remark: dto.remark?.trim() || null,
          total_lines: lines.length,
          total_sheets: totalSheets,
          details: {
            create: lines.map((line, idx) => {
              const incoming = line.itemcode.trim();
              return {
                line_order: idx,
                itemcode: pkByIncoming.get(incoming) ?? incoming,
                item_name: line.item_name?.trim() || nameByIncoming.get(incoming) || null,
                expire_date: this.parseExpireDateYmd(line.expire_date),
                copies: line.copies,
                is_main: false,
                lot_no: line.lot_no?.trim().slice(0, 50) || null,
              };
            }),
          },
        },
        include: {
          details: this.detailInclude(),
          createdBy: {
            select: { id: true, fname: true, lname: true, email: true },
          },
        },
      });
    });

    return {
      success: true,
      data: { ...updated, details: this.mapDetailsForClient(updated.details) },
      message: 'อัปเดตเอกสารสำเร็จ',
    };
  }

  async deletePrePrintSticker(id: number) {
    const existing = await this.prisma.prePrintSticker.findUnique({
      where: { id },
      select: { id: true, doc_no: true },
    });
    if (!existing) throw new NotFoundException('ไม่พบเอกสาร');

    await this.prisma.prePrintSticker.delete({ where: { id } });
    return {
      success: true,
      message: `ลบเอกสาร ${existing.doc_no} สำเร็จ`,
      data: { id: existing.id, doc_no: existing.doc_no },
    };
  }

  async listPrePrintStickers(params: {
    page?: number;
    limit?: number;
    keyword?: string;
    start_date?: string;
    end_date?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;
    const keyword = params.keyword?.trim();
    const startDate = params.start_date?.trim();
    const endDate = params.end_date?.trim();

    const and: Array<Record<string, unknown>> = [];

    if (keyword) {
      and.push({
        OR: [
          { doc_no: { contains: keyword } },
          { remark: { contains: keyword } },
          {
            details: {
              some: {
                OR: [
                  { itemcode: { contains: keyword } },
                  { item_name: { contains: keyword } },
                  { lot_no: { contains: keyword } },
                  { item: { itemcode2: { contains: keyword } } },
                ],
              },
            },
          },
        ],
      });
    }

    if (startDate || endDate) {
      const createdAt: { gte?: Date; lte?: Date } = {};
      if (startDate) createdAt.gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
      and.push({ created_at: createdAt });
    }

    const where = and.length > 0 ? { AND: and } : {};

    const [total, data] = await Promise.all([
      this.prisma.prePrintSticker.count({ where }),
      this.prisma.prePrintSticker.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          createdBy: {
            select: { id: true, fname: true, lname: true, email: true },
          },
          _count: { select: { details: true } },
        },
      }),
    ]);

    return {
      success: true,
      data,
      total,
      page,
      limit,
      lastPage: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getPrePrintSticker(id: number) {
    const doc = await this.prisma.prePrintSticker.findUnique({
      where: { id },
      include: {
        details: this.detailInclude(),
        createdBy: {
          select: { id: true, fname: true, lname: true, email: true },
        },
      },
    });
    if (!doc) throw new NotFoundException('ไม่พบเอกสาร');
    return {
      success: true,
      data: { ...doc, details: this.mapDetailsForClient(doc.details) },
    };
  }

  async exportPrePrintStickerPdf(id: number): Promise<{ buffer: Buffer; filename: string }> {
    const doc = await this.prisma.prePrintSticker.findUnique({
      where: { id },
      include: {
        details: this.detailInclude(),
        createdBy: {
          select: { id: true, fname: true, lname: true, email: true },
        },
      },
    });
    if (!doc) throw new NotFoundException('ไม่พบเอกสาร');

    const createdByLabel = doc.createdBy
      ? [doc.createdBy.fname, doc.createdBy.lname].filter(Boolean).join(' ').trim() ||
        doc.createdBy.email ||
        '—'
      : '—';

    const buffer = await this.prePrintPdf.generateDocument({
      doc_no: doc.doc_no,
      status: doc.status,
      remark: doc.remark,
      total_lines: doc.total_lines,
      total_sheets: doc.total_sheets,
      created_at: doc.created_at,
      created_by_label: createdByLabel,
      details: doc.details.map((d) => ({
        itemcode: this.displayItemcode(d.itemcode, d.item),
        item_name: d.item_name,
        expire_date: d.expire_date,
        copies: d.copies,
        lot_no: d.lot_no,
      })),
    });

    return {
      buffer,
      filename: `pre_print_sticker_${doc.doc_no}.pdf`,
    };
  }
}

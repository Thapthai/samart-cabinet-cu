import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthContext, AuthGuard } from '../auth/guards/auth.guard';
import { CreatePrePrintStickerDto } from './dto/create-pre-print-sticker.dto';
import { UpdatePrePrintStickerDto } from './dto/update-pre-print-sticker.dto';
import { StickerPrintService } from './sticker-print.service';

const PDF_CONTENT = 'application/pdf';

function toFileResponse(buffer: Buffer, filename: string, contentType: string) {
  return {
    success: true as const,
    data: {
      buffer: buffer.toString('base64'),
      filename,
      contentType,
    },
  };
}

@Controller('sticker-print')
@UseGuards(AuthGuard)
export class StickerPrintController {
  constructor(private readonly stickerPrintService: StickerPrintService) {}

  @Get('pre-print-stickers')
  listPrePrintStickers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('keyword') keyword?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return this.stickerPrintService.listPrePrintStickers({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      keyword,
      start_date: startDate,
      end_date: endDate,
    });
  }

  @Post('pre-print-stickers/:id/export/pdf')
  @HttpCode(HttpStatus.OK)
  async exportPrePrintStickerPdf(@Param('id', ParseIntPipe) id: number) {
    try {
      const result = await this.stickerPrintService.exportPrePrintStickerPdf(id);
      return toFileResponse(result.buffer, result.filename, PDF_CONTENT);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'ส่งออก PDF ไม่สำเร็จ';
      return { success: false, error: message };
    }
  }

  @Get('pre-print-stickers/:id')
  getPrePrintSticker(@Param('id', ParseIntPipe) id: number) {
    return this.stickerPrintService.getPrePrintSticker(id);
  }

  @Put('pre-print-stickers/:id')
  @HttpCode(HttpStatus.OK)
  updatePrePrintSticker(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePrePrintStickerDto,
  ) {
    return this.stickerPrintService.updatePrePrintSticker(id, body);
  }

  @Delete('pre-print-stickers/:id')
  @HttpCode(HttpStatus.OK)
  deletePrePrintSticker(@Param('id', ParseIntPipe) id: number) {
    return this.stickerPrintService.deletePrePrintSticker(id);
  }

  @Post('pre-print-stickers')
  @HttpCode(200)
  createPrePrintSticker(
    @Body() body: CreatePrePrintStickerDto,
    @Req() req: Request & { auth?: AuthContext },
  ) {
    const userId = req.auth?.user?.id as number | undefined;
    return this.stickerPrintService.createPrePrintSticker(body, userId);
  }
}

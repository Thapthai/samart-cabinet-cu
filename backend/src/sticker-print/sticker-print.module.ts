import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StickerPrintController } from './sticker-print.controller';
import { StickerPrintService } from './sticker-print.service';
import { PrePrintStickerExportPdfService } from './services/pre-print-sticker-export-pdf.service';

@Module({
  imports: [AuthModule],
  controllers: [StickerPrintController],
  providers: [StickerPrintService, PrePrintStickerExportPdfService],
  exports: [StickerPrintService],
})
export class StickerPrintModule {}

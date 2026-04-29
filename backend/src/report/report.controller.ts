import { Controller, Post, Body } from '@nestjs/common';
import { ReportServiceService } from './report-service.service';

const EXCEL_CONTENT = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
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

@Controller('reports')
export class ReportServiceController {
  constructor(private readonly reportServiceService: ReportServiceService) {}

  @Post('comparison/excel')
  async generateComparisonExcel(@Body() data: { usageId: number }) {
    try {
      const result = await this.reportServiceService.generateComparisonExcel(data.usageId);
      return toFileResponse(result.buffer, result.filename, EXCEL_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('comparison/pdf')
  async generateComparisonPDF(@Body() data: { usageId: number }) {
    try {
      const result = await this.reportServiceService.generateComparisonPDF(data.usageId);
      return toFileResponse(result.buffer, result.filename, PDF_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('equipment-usage/excel')
  async generateEquipmentUsageExcel(@Body() data: {
    dateFrom?: string;
    dateTo?: string;
    hospital?: string;
    department?: string;
    usageIds?: number[];
  }) {
    try {
      const result = await this.reportServiceService.generateEquipmentUsageExcel(data);
      return toFileResponse(result.buffer, result.filename, EXCEL_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('equipment-usage/pdf')
  async generateEquipmentUsagePDF(@Body() data: {
    dateFrom?: string;
    dateTo?: string;
    hospital?: string;
    department?: string;
    usageIds?: number[];
  }) {
    try {
      const result = await this.reportServiceService.generateEquipmentUsagePDF(data);
      return toFileResponse(result.buffer, result.filename, PDF_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('equipment-disbursement/excel')
  async generateEquipmentDisbursementExcel(@Body() data: {
    dateFrom?: string;
    dateTo?: string;
    hospital?: string;
    department?: string;
  }) {
    try {
      const result = await this.reportServiceService.generateEquipmentDisbursementExcel(data);
      return toFileResponse(result.buffer, result.filename, EXCEL_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('equipment-disbursement/pdf')
  async generateEquipmentDisbursementPDF(@Body() data: {
    dateFrom?: string;
    dateTo?: string;
    hospital?: string;
    department?: string;
  }) {
    try {
      const result = await this.reportServiceService.generateEquipmentDisbursementPDF(data);
      return toFileResponse(result.buffer, result.filename, PDF_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('dispensed-items/excel')
  async generateDispensedItemsExcel(@Body() data: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    departmentId?: string;
    cabinetId?: string;
  }) {
    try {
      const result = await this.reportServiceService.generateDispensedItemsExcel(data);
      return toFileResponse(result.buffer, result.filename, EXCEL_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('refill-all/excel')
  async generateRefillAllExcel(
    @Body()
    data: {
      weighing?: {
        stockId?: number;
        itemName?: string;
        itemcode?: string;
        dateFrom?: string;
        dateTo?: string;
      };
      returnToCabinet?: {
        keyword?: string;
        itemTypeId?: number;
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
        departmentId?: string;
        cabinetId?: string;
      };
    },
  ) {
    try {
      const result = await this.reportServiceService.generateRefillAllExcel(data ?? {});
      return toFileResponse(result.buffer, result.filename, EXCEL_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('dispensed-all/excel')
  async generateDispensedAllExcel(
    @Body()
    data: {
      weighing?: {
        stockId?: number;
        itemName?: string;
        itemcode?: string;
        dateFrom?: string;
        dateTo?: string;
      };
      rfid?: {
        keyword?: string;
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
        departmentId?: string;
        cabinetId?: string;
      };
    },
  ) {
    try {
      const result = await this.reportServiceService.generateDispensedAllExcel(data ?? {});
      return toFileResponse(result.buffer, result.filename, EXCEL_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('dispensed-items/pdf')
  async generateDispensedItemsPDF(@Body() data: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    departmentId?: string;
    cabinetId?: string;
  }) {
    try {
      const result = await this.reportServiceService.generateDispensedItemsPDF(data);
      return toFileResponse(result.buffer, result.filename, PDF_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('item-comparison/excel')
  async generateItemComparisonExcel(@Body() data: {
    itemCode?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    departmentCode?: string;
    includeUsageDetails?: boolean;
  }) {
    try {
      const result = await this.reportServiceService.generateItemComparisonExcel(data);
      return toFileResponse(result.buffer, result.filename, EXCEL_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('item-comparison/pdf')
  async generateItemComparisonPDF(@Body() data: {
    itemCode?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    departmentCode?: string;
    includeUsageDetails?: boolean;
  }) {
    try {
      const result = await this.reportServiceService.generateItemComparisonPDF(data);
      return toFileResponse(result.buffer, result.filename, PDF_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('vending-mapping/excel')
  async generateVendingMappingExcel(@Body() data: {
    startDate?: string;
    endDate?: string;
    printDate?: string;
  }) {
    try {
      const result = await this.reportServiceService.generateVendingMappingExcel(data);
      return toFileResponse(result.buffer, result.filename, EXCEL_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('vending-mapping/pdf')
  async generateVendingMappingPDF(@Body() data: {
    startDate?: string;
    endDate?: string;
    printDate?: string;
  }) {
    try {
      const result = await this.reportServiceService.generateVendingMappingPDF(data);
      return toFileResponse(result.buffer, result.filename, PDF_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('vending-mapping/data')
  async getVendingMappingData(@Body() data: {
    startDate?: string;
    endDate?: string;
    printDate?: string;
  }) {
    try {
      const result = await this.reportServiceService.getVendingMappingData(data);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('unmapped-dispensed/excel')
  async generateUnmappedDispensedExcel(@Body() data: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'month';
  }) {
    try {
      const result = await this.reportServiceService.generateUnmappedDispensedExcel(data);
      return toFileResponse(result.buffer, result.filename, EXCEL_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('unmapped-dispensed/data')
  async getUnmappedDispensedData(@Body() data: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'month';
  }) {
    try {
      const result = await this.reportServiceService.getUnmappedDispensedData(data);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('unused-dispensed/excel')
  async generateUnusedDispensedExcel(@Body() data: { date?: string }) {
    try {
      const result = await this.reportServiceService.generateUnusedDispensedExcel(data);
      return toFileResponse(result.buffer, result.filename, EXCEL_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('unused-dispensed/data')
  async getUnusedDispensedData(@Body() data: { date?: string }) {
    try {
      const result = await this.reportServiceService.getUnusedDispensedData(data);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('cancel-bill/data')
  async getCancelBillReportData(@Body() data: { startDate?: string; endDate?: string }) {
    try {
      const result = await this.reportServiceService.getCancelBillReportData(data);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('return/excel')
  async generateReturnReportExcel(@Body() data: {
    date_from?: string;
    date_to?: string;
    return_reason?: string;
    department_code?: string;
    patient_hn?: string;
  }) {
    try {
      const buffer = await this.reportServiceService.generateReturnReportExcel(data);
      return {
        success: true,
        buffer: buffer.toString('base64'),
        contentType: EXCEL_CONTENT,
        filename: `return_report_${new Date().toISOString().split('T')[0]}.xlsx`,
      };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('return/pdf')
  async generateReturnReportPdf(@Body() data: {
    date_from?: string;
    date_to?: string;
    return_reason?: string;
    department_code?: string;
    patient_hn?: string;
  }) {
    try {
      const buffer = await this.reportServiceService.generateReturnReportPdf(data);
      return {
        success: true,
        buffer: buffer.toString('base64'),
        contentType: PDF_CONTENT,
        filename: `return_report_${new Date().toISOString().split('T')[0]}.pdf`,
      };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('cancel-bill/excel')
  async generateCancelBillReportExcel(@Body() data: { startDate?: string; endDate?: string }) {
    try {
      const buffer = await this.reportServiceService.generateCancelBillReportExcel(data);
      return {
        success: true,
        buffer: buffer.toString('base64'),
        contentType: EXCEL_CONTENT,
        filename: `cancel_bill_report_${new Date().toISOString().split('T')[0]}.xlsx`,
      };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('cancel-bill/pdf')
  async generateCancelBillReportPdf(@Body() data: { startDate?: string; endDate?: string }) {
    try {
      const buffer = await this.reportServiceService.generateCancelBillReportPdf(data);
      return {
        success: true,
        buffer: buffer.toString('base64'),
        contentType: PDF_CONTENT,
        filename: `cancel_bill_report_${new Date().toISOString().split('T')[0]}.pdf`,
      };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('return-to-cabinet/excel')
  async generateReturnToCabinetReportExcel(@Body() data: {
    keyword?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    cabinetId?: string;
  }) {
    try {
      const buffer = await this.reportServiceService.generateReturnToCabinetReportExcel(data);
      return {
        success: true,
        buffer: buffer.toString('base64'),
        contentType: EXCEL_CONTENT,
        filename: `return_to_cabinet_report_${new Date().toISOString().split('T')[0]}.xlsx`,
      };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('return-to-cabinet/pdf')
  async generateReturnToCabinetReportPdf(@Body() data: {
    keyword?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    cabinetId?: string;
  }) {
    try {
      const buffer = await this.reportServiceService.generateReturnToCabinetReportPdf(data);
      return {
        success: true,
        buffer: buffer.toString('base64'),
        contentType: PDF_CONTENT,
        filename: `return_to_cabinet_report_${new Date().toISOString().split('T')[0]}.pdf`,
      };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('cabinet-stock/excel')
  async generateCabinetStockExcel(@Body() data: {
    cabinetId?: number;
    cabinetCode?: string;
    departmentId?: number;
    keyword?: string;
    statusFilter?: string;
  }) {
    try {
      const result = await this.reportServiceService.generateCabinetStockExcel(data);
      return toFileResponse(result.buffer, result.filename, EXCEL_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('cabinet-stock/pdf')
  async generateCabinetStockPdf(@Body() data: {
    cabinetId?: number;
    cabinetCode?: string;
    departmentId?: number;
    keyword?: string;
    statusFilter?: string;
  }) {
    try {
      const result = await this.reportServiceService.generateCabinetStockPdf(data);
      return toFileResponse(result.buffer, result.filename, PDF_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('cabinet-stock/data')
  async getCabinetStockData(@Body() data: {
    cabinetId?: number;
    cabinetCode?: string;
    departmentId?: number;
    keyword?: string;
    statusFilter?: string;
  }) {
    try {
      const result = await this.reportServiceService.getCabinetStockData(data);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('weighing-dispense/excel')
  async generateWeighingDispenseExcel(@Body() data: { stockId?: number; itemName?: string; itemcode?: string; dateFrom?: string; dateTo?: string }) {
    try {
      const result = await this.reportServiceService.generateWeighingDispenseExcel(data);
      return toFileResponse(result.buffer, result.filename, EXCEL_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('weighing-dispense/pdf')
  async generateWeighingDispensePdf(@Body() data: { stockId?: number; itemName?: string; itemcode?: string; dateFrom?: string; dateTo?: string }) {
    try {
      const result = await this.reportServiceService.generateWeighingDispensePdf(data);
      return toFileResponse(result.buffer, result.filename, PDF_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('weighing-refill/excel')
  async generateWeighingRefillExcel(@Body() data: { stockId?: number; itemName?: string; itemcode?: string; dateFrom?: string; dateTo?: string }) {
    try {
      const result = await this.reportServiceService.generateWeighingRefillExcel(data);
      return toFileResponse(result.buffer, result.filename, EXCEL_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('weighing-refill/pdf')
  async generateWeighingRefillPdf(@Body() data: { stockId?: number; itemName?: string; itemcode?: string; dateFrom?: string; dateTo?: string }) {
    try {
      const result = await this.reportServiceService.generateWeighingRefillPdf(data);
      return toFileResponse(result.buffer, result.filename, PDF_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('weighing-stock/excel')
  async generateWeighingStockExcel(@Body() data: {
    stockId?: number;
    itemName?: string;
    itemcode?: string;
    statusFilter?: string;
  }) {
    try {
      const result = await this.reportServiceService.generateWeighingStockExcel(data);
      return toFileResponse(result.buffer, result.filename, EXCEL_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('items-stock-combined/excel')
  async generateItemsStockCombinedExcel(@Body() data: { itemName?: string; itemcode?: string; statusFilter?: string }) {
    try {
      const result = await this.reportServiceService.generateItemsStockCombinedExcel(data);
      return toFileResponse(result.buffer, result.filename, EXCEL_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  /** สต็อกต่ำรวม — Excel 2 ชีต (Weighing แล้ว RFID) แยกจากรายงานรวมชิป */
  @Post('items-stock-low-combined/excel')
  async generateItemsStockLowCombinedExcel(@Body() data: { itemName?: string; itemcode?: string }) {
    try {
      const result = await this.reportServiceService.generateItemsStockLowCombinedExcel(data);
      return toFileResponse(result.buffer, result.filename, EXCEL_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  /** สต็อกต่ำรวม — PDF เดียว: Weighing แล้วต่อ RFID (pdfkit เหมือนรายงานอื่น) */
  @Post('items-stock-low-combined/pdf')
  async generateItemsStockLowCombinedPdf(@Body() data: { itemName?: string; itemcode?: string }) {
    try {
      const result = await this.reportServiceService.generateItemsStockLowCombinedPdf(data);
      return toFileResponse(result.buffer, result.filename, PDF_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('weighing-stock/pdf')
  async generateWeighingStockPdf(@Body() data: {
    stockId?: number;
    itemName?: string;
    itemcode?: string;
    statusFilter?: string;
  }) {
    try {
      const result = await this.reportServiceService.generateWeighingStockPdf(data);
      return toFileResponse(result.buffer, result.filename, PDF_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  /** สต๊อก RFID ในตู้ — สอดคล้อง POST /reports/weighing-stock/* (filter + statusFilter, ตอบ JSON base64 เดียวกัน) */
  @Post('rfid-stock/excel')
  async generateRfidStockExcel(@Body() data: {
    cabinetId?: number;
    cabinetCode?: string;
    departmentId?: number;
    keyword?: string;
    statusFilter?: string;
  }) {
    try {
      const result = await this.reportServiceService.generateRfidStockExcel(data);
      return toFileResponse(result.buffer, result.filename, EXCEL_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('rfid-stock/pdf')
  async generateRfidStockPdf(@Body() data: {
    cabinetId?: number;
    cabinetCode?: string;
    departmentId?: number;
    keyword?: string;
    statusFilter?: string;
  }) {
    try {
      const result = await this.reportServiceService.generateRfidStockPdf(data);
      return toFileResponse(result.buffer, result.filename, PDF_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('rfid-stock/data')
  async getRfidStockData(@Body() data: {
    cabinetId?: number;
    cabinetCode?: string;
    departmentId?: number;
    keyword?: string;
    statusFilter?: string;
  }) {
    try {
      const result = await this.reportServiceService.getRfidStockData(data);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('dispensed-items-for-patients/excel')
  async generateDispensedItemsForPatientsExcel(@Body() data: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    patientHn?: string;
    departmentCode?: string;
    usageType?: string;
  }) {
    try {
      const result =
        await this.reportServiceService.generateDispensedItemsForPatientsExcel(data);
      return toFileResponse(result.buffer, result.filename, EXCEL_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('dispensed-items-for-patients/pdf')
  async generateDispensedItemsForPatientsPdf(@Body() data: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    patientHn?: string;
    departmentCode?: string;
    usageType?: string;
  }) {
    try {
      const result = await this.reportServiceService.generateDispensedItemsForPatientsPdf(data);
      return toFileResponse(result.buffer, result.filename, PDF_CONTENT);
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }

  @Post('dispensed-items-for-patients/data')
  async getDispensedItemsForPatientsData(@Body() data: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    patientHn?: string;
    departmentCode?: string;
    usageType?: string;
  }) {
    try {
      const result = await this.reportServiceService.getDispensedItemsForPatientsData(data);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  }
}

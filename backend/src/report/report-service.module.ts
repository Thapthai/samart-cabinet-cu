import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MedicalSuppliesModule } from '../medical-supplies/medical-supplies.module';
import { WeighingModule } from '../weighing/weighing.module';
import { ReportServiceController } from './report.controller';
import { ReportServiceService } from './report-service.service';
import { ComparisonReportExcelService } from './services/comparison_report_excel.service';
import { ComparisonReportPdfService } from './services/comparison_report_pdf.service';
import { EquipmentUsageExcelService } from './services/equipment_usage_excel.service';
import { EquipmentUsagePdfService } from './services/equipment_usage_pdf.service';
import { EquipmentDisbursementExcelService } from './services/equipment_disbursement_excel.service';
import { EquipmentDisbursementPdfService } from './services/equipment_disbursement_pdf.service';
import { ItemComparisonExcelService } from './services/item-comparison-excel.service';
import { ItemComparisonPdfService } from './services/item-comparison-pdf.service';
import { VendingMappingReportExcelService } from './services/vending-mapping-report-excel.service';
import { VendingMappingReportPdfService } from './services/vending-mapping-report-pdf.service';
import { UnmappedDispensedReportExcelService } from './services/unmapped-dispensed-report-excel.service';
import { UnusedDispensedReportExcelService } from './services/unused-dispensed-report-excel.service';
import { ReturnReportExcelService } from './services/return-report-excel.service';
import { ReturnReportPdfService } from './services/return-report-pdf.service';
import { CancelBillReportExcelService } from './services/cancel-bill-report-excel.service';
import { CancelBillReportPdfService } from './services/cancel-bill-report-pdf.service';
import { ReturnToCabinetReportExcelService } from './services/return-to-cabinet-report-excel.service';
import { ReturnToCabinetReportPdfService } from './services/return-to-cabinet-report-pdf.service';
import { DispensedItemsExcelService } from './services/dispensed-items-excel.service';
import { DispensedAllExcelService } from './services/dispensed-all-excel.service';
import { RefillAllExcelService } from './services/refill-all-excel.service';
import { DispensedItemsPdfService } from './services/dispensed-items-pdf.service';
import { CabinetStockReportExcelService } from './services/cabinet-stock-report-excel.service';
import { CabinetStockReportPdfService } from './services/cabinet-stock-report-pdf.service';
import { WeighingDispenseReportExcelService } from './services/weighing-dispense-report-excel.service';
import { WeighingDispenseReportPdfService } from './services/weighing-dispense-report-pdf.service';
import { WeighingRefillReportExcelService } from './services/weighing-refill-report-excel.service';
import { WeighingRefillReportPdfService } from './services/weighing-refill-report-pdf.service';
import { WeighingStockReportExcelService } from './services/weighing-stock-report-excel.service';
import { WeighingStockReportPdfService } from './services/weighing-stock-report-pdf.service';
import { ItemsStockCombinedExcelService } from './services/items-stock-combined-excel.service';
import { ItemsStockLowCombinedExcelService } from './services/items-stock-low-combined-excel.service';
import { ItemsStockLowCombinedPdfService } from './services/items-stock-low-combined-pdf.service';
import { DispensedItemsForPatientsExcelService } from './services/dispensed-items-for-patients-excel.service';
import { DispensedItemsForPatientsPdfService } from './services/dispensed-items-for-patients-pdf.service';
@Module({
  imports: [PrismaModule, MedicalSuppliesModule, WeighingModule],
  controllers: [ReportServiceController],
  providers: [
    ReportServiceService,
    ComparisonReportExcelService,
    ComparisonReportPdfService,
    EquipmentUsageExcelService,
    EquipmentUsagePdfService,
    EquipmentDisbursementExcelService,
    EquipmentDisbursementPdfService,
    ItemComparisonExcelService,
    ItemComparisonPdfService,
    VendingMappingReportExcelService,
    VendingMappingReportPdfService,
    UnmappedDispensedReportExcelService,
    UnusedDispensedReportExcelService,
    ReturnReportExcelService,
    ReturnReportPdfService,
    CancelBillReportExcelService,
    CancelBillReportPdfService,
    ReturnToCabinetReportExcelService,
    ReturnToCabinetReportPdfService,
    DispensedItemsExcelService,
    DispensedAllExcelService,
    RefillAllExcelService,
    DispensedItemsPdfService,
    CabinetStockReportExcelService,
    CabinetStockReportPdfService,
    WeighingDispenseReportExcelService,
    WeighingDispenseReportPdfService,
    WeighingRefillReportExcelService,
    WeighingRefillReportPdfService,
    WeighingStockReportExcelService,
    WeighingStockReportPdfService,
    ItemsStockCombinedExcelService,
    ItemsStockLowCombinedExcelService,
    ItemsStockLowCombinedPdfService,
    DispensedItemsForPatientsExcelService,
    DispensedItemsForPatientsPdfService,
  ],
  exports: [ReportServiceService],
})
export class ReportServiceModule {}

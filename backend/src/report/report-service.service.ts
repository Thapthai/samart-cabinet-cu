import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MedicalSuppliesService } from '../medical-supplies/medical-supplies.service';
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
import { ReturnReportExcelService, ReturnReportData } from './services/return-report-excel.service';
import { ReturnReportPdfService } from './services/return-report-pdf.service';
import { CancelBillReportExcelService, CancelBillReportData } from './services/cancel-bill-report-excel.service';
import { CancelBillReportPdfService } from './services/cancel-bill-report-pdf.service';
import { ReturnToCabinetReportExcelService, ReturnToCabinetReportData } from './services/return-to-cabinet-report-excel.service';
import { ReturnToCabinetReportPdfService } from './services/return-to-cabinet-report-pdf.service';
import { DispensedItemsExcelService, DispensedItemsReportData } from './services/dispensed-items-excel.service';
import { DispensedAllExcelService } from './services/dispensed-all-excel.service';
import { RefillAllExcelService } from './services/refill-all-excel.service';
import { DispensedItemsPdfService } from './services/dispensed-items-pdf.service';
import {
  CabinetStockReportExcelService,
  CabinetStockReportData,
} from './services/cabinet-stock-report-excel.service';
import { CabinetStockReportPdfService } from './services/cabinet-stock-report-pdf.service';
import {
  WeighingDispenseReportExcelService,
  WeighingDispenseReportData,
} from './services/weighing-dispense-report-excel.service';
import { WeighingDispenseReportPdfService } from './services/weighing-dispense-report-pdf.service';
import { WeighingRefillReportExcelService } from './services/weighing-refill-report-excel.service';
import { WeighingRefillReportPdfService } from './services/weighing-refill-report-pdf.service';
import {
  WeighingStockReportExcelService,
  WeighingStockReportData,
} from './services/weighing-stock-report-excel.service';
import {
  ItemsStockCombinedExcelService,
  ItemsStockCombinedRfidRow,
} from './services/items-stock-combined-excel.service';
import { WeighingStockReportPdfService } from './services/weighing-stock-report-pdf.service';
import {
  DispensedItemsForPatientsExcelService,
  DispensedItemsForPatientsReportData,
} from './services/dispensed-items-for-patients-excel.service';
import { DispensedItemsForPatientsPdfService } from './services/dispensed-items-for-patients-pdf.service';
import { ComparisonReportData } from './types/comparison-report.types';
import { EquipmentUsageReportData } from './types/equipment-usage-report.types';
import { EquipmentDisbursementReportData } from './types/equipment-disbursement-report.types';
import { ItemComparisonReportData } from './types/item-comparison-report.types';
import { WeighingService } from '../weighing/weighing.service';

/** ให้ตรงกับ frontend items-stock `NEAR_EXPIRY_DAYS` (30 วัน) */
const CABINET_STOCK_NEAR_EXPIRY_DAYS = 30;

function itemKeywordSql(keyword: string | undefined): Prisma.Sql {
  const kw = keyword?.trim();
  if (!kw) return Prisma.empty;
  const escaped = kw.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  const pattern = `%${escaped}%`;
  return Prisma.sql` AND (
    COALESCE(i.itemname, '') LIKE ${pattern}
    OR i.itemcode LIKE ${pattern}
    OR COALESCE(i.itemcode2, '') LIKE ${pattern}
    OR COALESCE(i.itemcode3, '') LIKE ${pattern}
    OR COALESCE(i.Barcode, '') LIKE ${pattern}
  )`;
}

function cabinetStockRowMatchesStatusFilter(
  chip: string | undefined,
  balanceQty: number,
  stockMin: number | null,
  earliestExpire: Date | string | null | undefined,
): boolean {
  if (!chip || chip === 'all') return true;
  const min = stockMin ?? 0;
  if (chip === 'low') return min > 0 && balanceQty < min;
  const exp = earliestExpire != null ? new Date(earliestExpire as string) : null;
  if (!exp || Number.isNaN(exp.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ed = new Date(exp);
  ed.setHours(0, 0, 0, 0);
  const expired = ed < today;
  if (chip === 'expired') return expired;
  if (chip === 'soon') {
    if (expired) return false;
    const limit = new Date(today);
    limit.setDate(limit.getDate() + CABINET_STOCK_NEAR_EXPIRY_DAYS);
    return ed <= limit;
  }
  return true;
}

function formatYmdReport(d: Date | string | null | undefined): string {
  if (d == null) return '—';
  const x = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(x.getTime())) return '—';
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** สถานะแถวสรุป — ตรง rowBadge หน้า items-stock (EXPIRED > SOON > LOW > OK) */
function cabinetSummaryStatusLabel(
  earliest: Date | string | null | undefined,
  balance: number,
  stockMin: number | null,
): 'EXPIRED' | 'SOON' | 'LOW' | 'OK' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let expired = false;
  let soon = false;
  if (earliest != null) {
    const exp = typeof earliest === 'string' ? new Date(earliest) : earliest;
    if (!Number.isNaN(exp.getTime())) {
      const ed = new Date(exp);
      ed.setHours(0, 0, 0, 0);
      if (ed < today) expired = true;
      else {
        const limit = new Date(today);
        limit.setDate(limit.getDate() + CABINET_STOCK_NEAR_EXPIRY_DAYS);
        if (ed <= limit) soon = true;
      }
    }
  }
  const min = stockMin ?? null;
  const low = min != null && min > 0 && balance < min;
  if (expired) return 'EXPIRED';
  if (soon) return 'SOON';
  if (low) return 'LOW';
  return 'OK';
}

function formatMinMaxCell(min: number | null | undefined, max: number | null | undefined): string {
  const a = min != null && min !== undefined ? String(min) : '—';
  const b = max != null && max !== undefined ? String(max) : '—';
  return `${a} / ${b}`;
}

function weighingStockRowMatchesStatusFilter(row: any, chip: string | undefined): boolean {
  if (!chip || chip === 'all') return true;
  const min = row?.cabinetItemSetting?.stock_min ?? row?.item?.stock_min ?? null;
  const qty = Number(row?.Qty) || 0;
  if (chip === 'low') return min != null && Number(min) > 0 && qty < Number(min);
  return false;
}

/** สอดคล้อง `cabinetStockTableMode` ฝั่ง frontend (admin/items-stock) */
function cabinetEntityStockTableMode(c: {
  cabinet_type?: string | null;
  cabinetTypeDef?: { code?: string | null; show_rfid_code?: boolean | null } | null;
}): 'WEIGHING' | 'RFID' {
  const def = c.cabinetTypeDef;
  if (def?.code) {
    const code = def.code.trim().toUpperCase();
    if (code === 'WEIGHING') return 'WEIGHING';
    if (code === 'RFID') return 'RFID';
    if (def.show_rfid_code === true) return 'RFID';
    return 'WEIGHING';
  }
  const raw = (c.cabinet_type ?? '').toString().trim().toUpperCase();
  if (raw === 'WEIGHING') return 'WEIGHING';
  if (raw === 'RFID') return 'RFID';
  return 'WEIGHING';
}

@Injectable()
export class ReportServiceService {
  constructor(
    private readonly medicalSuppliesService: MedicalSuppliesService,
    private readonly prisma: PrismaService,
    private readonly comparisonReportExcelService: ComparisonReportExcelService,
    private readonly comparisonReportPdfService: ComparisonReportPdfService,
    private readonly equipmentUsageExcelService: EquipmentUsageExcelService,
    private readonly equipmentUsagePdfService: EquipmentUsagePdfService,
    private readonly equipmentDisbursementExcelService: EquipmentDisbursementExcelService,
    private readonly equipmentDisbursementPdfService: EquipmentDisbursementPdfService,
    private readonly itemComparisonExcelService: ItemComparisonExcelService,
    private readonly itemComparisonPdfService: ItemComparisonPdfService,
    private readonly vendingMappingReportExcelService: VendingMappingReportExcelService,
    private readonly vendingMappingReportPdfService: VendingMappingReportPdfService,
    private readonly unmappedDispensedReportExcelService: UnmappedDispensedReportExcelService,
    private readonly unusedDispensedReportExcelService: UnusedDispensedReportExcelService,
    private readonly returnReportExcelService: ReturnReportExcelService,
    private readonly returnReportPdfService: ReturnReportPdfService,
    private readonly cancelBillReportExcelService: CancelBillReportExcelService,
    private readonly cancelBillReportPdfService: CancelBillReportPdfService,
    private readonly returnToCabinetReportExcelService: ReturnToCabinetReportExcelService,
    private readonly returnToCabinetReportPdfService: ReturnToCabinetReportPdfService,
    private readonly dispensedItemsExcelService: DispensedItemsExcelService,
    private readonly dispensedAllExcelService: DispensedAllExcelService,
    private readonly refillAllExcelService: RefillAllExcelService,
    private readonly dispensedItemsPdfService: DispensedItemsPdfService,
    private readonly cabinetStockReportExcelService: CabinetStockReportExcelService,
    private readonly cabinetStockReportPdfService: CabinetStockReportPdfService,
    private readonly weighingDispenseReportExcelService: WeighingDispenseReportExcelService,
    private readonly weighingDispenseReportPdfService: WeighingDispenseReportPdfService,
    private readonly weighingRefillReportExcelService: WeighingRefillReportExcelService,
    private readonly weighingRefillReportPdfService: WeighingRefillReportPdfService,
    private readonly weighingStockReportExcelService: WeighingStockReportExcelService,
    private readonly weighingStockReportPdfService: WeighingStockReportPdfService,
    private readonly weighingService: WeighingService,
    private readonly dispensedItemsForPatientsExcelService: DispensedItemsForPatientsExcelService,
    private readonly dispensedItemsForPatientsPdfService: DispensedItemsForPatientsPdfService,
    private readonly itemsStockCombinedExcelService: ItemsStockCombinedExcelService,
  ) {}

  /**
   * Generate comparison report in Excel format
   */
  async generateComparisonExcel(usageId: number): Promise<{ buffer: Buffer; filename: string }> {
    try {

      // Fetch usage data from medical-supplies-service
      const usage = await this.medicalSuppliesService.findOne(usageId);
      if (!usage) {
        throw new Error(`Usage not found for ID: ${usageId}`);
      }

      // Fetch items data
      const items = await this.medicalSuppliesService.getSupplyItemsByUsageId(usageId);
      if (!items || items.length === 0) {
        throw new Error(`No items found for Usage ID: ${usageId}`);
      }

      // Prepare data for export
      const reportData: ComparisonReportData = {
        usage: {
          id: usage.id,
          patient_hn: usage.patient_hn ?? '',
          first_name: usage.first_name ?? '',
          lastname: usage.lastname ?? '',
          en: usage.en,
          department_code: usage.department_code,
          usage_datetime: usage.usage_datetime != null ? new Date(usage.usage_datetime as any) : undefined,
        },
        items,
      };

      // Generate Excel
      const buffer = await this.comparisonReportExcelService.generateReport(reportData);
      const filename = `comparison_report_${usageId}_${new Date().toISOString().split('T')[0]}.xlsx`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Excel report: ${errorMessage}`);
    }
  }

  /**
   * Generate comparison report in PDF format
   */
  async generateComparisonPDF(usageId: number): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const usage = await this.medicalSuppliesService.findOne(usageId);
      if (!usage) {
        throw new Error(`Usage not found for ID: ${usageId}`);
      }

      const items = await this.medicalSuppliesService.getSupplyItemsByUsageId(usageId);
      if (!items || items.length === 0) {
        throw new Error(`No items found for Usage ID: ${usageId}`);
      }

      const reportData: ComparisonReportData = {
        usage: {
          id: usage.id,
          patient_hn: usage.patient_hn ?? '',
          first_name: usage.first_name ?? '',
          lastname: usage.lastname ?? '',
          en: usage.en,
          department_code: usage.department_code,
          usage_datetime: usage.usage_datetime != null ? new Date(usage.usage_datetime as any) : undefined,
        },
        items,
      };

      // Generate PDF
      const buffer = await this.comparisonReportPdfService.generateReport(reportData);
      const filename = `comparison_report_${usageId}_${new Date().toISOString().split('T')[0]}.pdf`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating PDF:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate PDF report: ${errorMessage}`);
    }
  }

  /**
   * Generate equipment usage report in Excel format
   */
  async generateEquipmentUsageExcel(params: {
    dateFrom?: string;
    dateTo?: string;
    hospital?: string;
    department?: string;
    usageIds?: number[];
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      let items: any[] = [];

      // If usageIds provided, fetch those specific usages
      if (params.usageIds && params.usageIds.length > 0) {
        for (const usageId of params.usageIds) {
          const usageItems = await this.medicalSuppliesService.getSupplyItemsByUsageId(usageId);
          const usage = await this.medicalSuppliesService.findOne(usageId);
          if (usageItems && usageItems.length > 0 && usage) {
            usageItems.forEach((item: any) => {
              items.push({
                en: usage.en,
                hn: usage.patient_hn,
                code: item.order_item_code || item.supply_code || '-',
                description: item.order_item_description || item.supply_name || '-',
                assessionNo: item.assession_no || '-',
                status: item.order_item_status || '-',
                qty: item.qty || 0,
                uom: item.uom || '-',
              });
            });
          }
        }
      } else {
        const queryParams: any = {};
        if (params.dateFrom) queryParams.dateFrom = params.dateFrom;
        if (params.dateTo) queryParams.dateTo = params.dateTo;
        if (params.hospital) queryParams.hospital = params.hospital;
        if (params.department) queryParams.department = params.department;

        const findAllResult = await this.medicalSuppliesService.findAll({
          startDate: queryParams.dateFrom,
          endDate: queryParams.dateTo,
          department_code: queryParams.department,
          page: 1,
          limit: 10000,
        });

        if (findAllResult && findAllResult.data) {
          for (const usage of findAllResult.data) {
            const usageItems = await this.medicalSuppliesService.getSupplyItemsByUsageId(usage.id);
            if (usageItems && usageItems.length > 0) {
              usageItems.forEach((item: any) => {
                items.push({
                  en: usage.en,
                  hn: usage.patient_hn,
                  code: item.order_item_code || item.supply_code || '-',
                  description: item.order_item_description || item.supply_name || '-',
                  assessionNo: item.assession_no || '-',
                  status: item.order_item_status || '-',
                  qty: item.qty || 0,
                  uom: item.uom || '-',
                });
              });
            }
          }
        }
      }

      if (items.length === 0) {
        throw new Error('No items found for the specified criteria');
      }

      // Prepare report data
      const reportData: EquipmentUsageReportData = {
        hospital: params.hospital,
        department: params.department,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        items: items,
      };

      // Generate Excel
      const buffer = await this.equipmentUsageExcelService.generateReport(reportData);
      const dateStr = params.dateFrom ? params.dateFrom.replace(/\//g, '-') : new Date().toISOString().split('T')[0];
      const filename = `equipment_usage_report_${dateStr}.xlsx`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Equipment Usage Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Equipment Usage Excel report: ${errorMessage}`);
    }
  }

  /**
   * Generate equipment usage report in PDF format
   */
  async generateEquipmentUsagePDF(params: {
    dateFrom?: string;
    dateTo?: string;
    hospital?: string;
    department?: string;
    usageIds?: number[];
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      let items: any[] = [];

      // If usageIds provided, fetch those specific usages
      if (params.usageIds && params.usageIds.length > 0) {
        for (const usageId of params.usageIds) {
          const usageItems = await this.medicalSuppliesService.getSupplyItemsByUsageId(usageId);
          const usage = await this.medicalSuppliesService.findOne(usageId);
          if (usageItems && usageItems.length > 0 && usage) {
            usageItems.forEach((item: any) => {
              items.push({
                en: usage.en,
                hn: usage.patient_hn,
                code: item.order_item_code || item.supply_code || '-',
                description: item.order_item_description || item.supply_name || '-',
                assessionNo: item.assession_no || '-',
                status: item.order_item_status || '-',
                qty: item.qty || 0,
                uom: item.uom || '-',
              });
            });
          }
        }
      } else {
        const queryParams: any = {};
        if (params.dateFrom) queryParams.dateFrom = params.dateFrom;
        if (params.dateTo) queryParams.dateTo = params.dateTo;
        if (params.hospital) queryParams.hospital = params.hospital;
        if (params.department) queryParams.department = params.department;

        const findAllResult = await this.medicalSuppliesService.findAll({
          startDate: queryParams.dateFrom,
          endDate: queryParams.dateTo,
          department_code: queryParams.department,
          page: 1,
          limit: 10000,
        });

        if (findAllResult && findAllResult.data) {
          for (const usage of findAllResult.data) {
            const usageItems = await this.medicalSuppliesService.getSupplyItemsByUsageId(usage.id);
            if (usageItems && usageItems.length > 0) {
              usageItems.forEach((item: any) => {
                items.push({
                  en: usage.en,
                  hn: usage.patient_hn,
                  code: item.order_item_code || item.supply_code || '-',
                  description: item.order_item_description || item.supply_name || '-',
                  assessionNo: item.assession_no || '-',
                  status: item.order_item_status || '-',
                  qty: item.qty || 0,
                  uom: item.uom || '-',
                });
              });
            }
          }
        }
      }

      if (items.length === 0) {
        throw new Error('No items found for the specified criteria');
      }

      // Prepare report data
      const reportData: EquipmentUsageReportData = {
        hospital: params.hospital,
        department: params.department,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        items: items,
      };

      // Generate PDF
      const buffer = await this.equipmentUsagePdfService.generateReport(reportData);
      const dateStr = params.dateFrom ? params.dateFrom.replace(/\//g, '-') : new Date().toISOString().split('T')[0];
      const filename = `equipment_usage_report_${dateStr}.pdf`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Equipment Usage PDF:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Equipment Usage PDF report: ${errorMessage}`);
    }
  }

  /**
   * Generate equipment disbursement report in Excel format
   */
  async generateEquipmentDisbursementExcel(params: {
    dateFrom?: string;
    dateTo?: string;
    hospital?: string;
    department?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const queryParams: any = {};
      if (params.dateFrom) queryParams.startDate = params.dateFrom;
      if (params.dateTo) queryParams.endDate = params.dateTo;
      if (params.department) queryParams.department_code = params.department;
      queryParams.page = 1;
      queryParams.limit = 10000;

      const findAllResult = await this.medicalSuppliesService.findAll(queryParams);
      if (!findAllResult || !findAllResult.data) {
        throw new Error('Failed to fetch usage data');
      }

      const records: any[] = [];
      const summaryMap = new Map<string, { code: string; description: string; totalQty: number }>();

      for (const usage of findAllResult.data) {
        const usageItems = await this.medicalSuppliesService.getSupplyItemsByUsageId(usage.id);
        if (usageItems && usageItems.length > 0) {
          usageItems.forEach((item: any) => {
            const code = item.order_item_code || item.supply_code || '-';
            const description = item.order_item_description || item.supply_name || '-';
            const qty = item.qty || 0;

            let date = '';
            let time = '';
            if (usage.usage_datetime) {
              try {
                const dateTime = new Date(usage.usage_datetime);
                date = dateTime.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
                time = dateTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
              } catch (e) {
                const parts = String(usage.usage_datetime).split(' ');
                if (parts.length >= 2) {
                  date = parts[0];
                  time = parts[1];
                } else {
                  date = String(usage.usage_datetime);
                  time = '';
                }
              }
            }

            records.push({
              code,
              description,
              date,
              time,
              recordedBy: usage.recorded_by_user_id || '-',
              qty,
            });

            const key = code;
            if (summaryMap.has(key)) {
              const existing = summaryMap.get(key)!;
              existing.totalQty += qty;
            } else {
              summaryMap.set(key, {
                code,
                description,
                totalQty: qty,
              });
            }
          });
        }
      }

      if (records.length === 0) {
        throw new Error('No records found for the specified criteria');
      }

      const reportData: EquipmentDisbursementReportData = {
        hospital: params.hospital,
        department: params.department,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        records,
        summary: Array.from(summaryMap.values()),
      };

      const buffer = await this.equipmentDisbursementExcelService.generateReport(reportData);
      const dateStr = params.dateFrom ? params.dateFrom.replace(/\//g, '-') : new Date().toISOString().split('T')[0];
      const filename = `equipment_disbursement_report_${dateStr}.xlsx`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Equipment Disbursement Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Equipment Disbursement Excel report: ${errorMessage}`);
    }
  }

  /**
   * Generate equipment disbursement report in PDF format
   */
  async generateEquipmentDisbursementPDF(params: {
    dateFrom?: string;
    dateTo?: string;
    hospital?: string;
    department?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const queryParams: any = {};
      if (params.dateFrom) queryParams.startDate = params.dateFrom;
      if (params.dateTo) queryParams.endDate = params.dateTo;
      if (params.department) queryParams.department_code = params.department;
      queryParams.page = 1;
      queryParams.limit = 10000;

      const findAllResult = await this.medicalSuppliesService.findAll(queryParams);
      if (!findAllResult || !findAllResult.data) {
        throw new Error('Failed to fetch usage data');
      }

      const records: any[] = [];
      const summaryMap = new Map<string, { code: string; description: string; totalQty: number }>();

      for (const usage of findAllResult.data) {
        const usageItems = await this.medicalSuppliesService.getSupplyItemsByUsageId(usage.id);
        if (usageItems && usageItems.length > 0) {
          usageItems.forEach((item: any) => {
            const code = item.order_item_code || item.supply_code || '-';
            const description = item.order_item_description || item.supply_name || '-';
            const qty = item.qty || 0;

            // Parse usage_datetime
            let date = '';
            let time = '';
            if (usage.usage_datetime) {
              try {
                const dateTime = new Date(usage.usage_datetime);
                date = dateTime.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
                time = dateTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
              } catch (e) {
                const parts = String(usage.usage_datetime).split(' ');
                if (parts.length >= 2) {
                  date = parts[0];
                  time = parts[1];
                } else {
                  date = String(usage.usage_datetime);
                  time = '';
                }
              }
            }

            records.push({
              code,
              description,
              date,
              time,
              recordedBy: usage.recorded_by_user_id || '-',
              qty,
            });

            const key = code;
            if (summaryMap.has(key)) {
              const existing = summaryMap.get(key)!;
              existing.totalQty += qty;
            } else {
              summaryMap.set(key, {
                code,
                description,
                totalQty: qty,
              });
            }
          });
        }
      }

      if (records.length === 0) {
        throw new Error('No records found for the specified criteria');
      }

      const reportData: EquipmentDisbursementReportData = {
        hospital: params.hospital,
        department: params.department,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        records,
        summary: Array.from(summaryMap.values()),
      };

      const buffer = await this.equipmentDisbursementPdfService.generateReport(reportData);
      const dateStr = params.dateFrom ? params.dateFrom.replace(/\//g, '-') : new Date().toISOString().split('T')[0];
      const filename = `equipment_disbursement_report_${dateStr}.pdf`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Equipment Disbursement PDF:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Equipment Disbursement PDF report: ${errorMessage}`);
    }
  }

  /**
   * Generate item comparison report in Excel format
   */
  async generateItemComparisonExcel(params: {
    itemCode?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    departmentCode?: string;
    includeUsageDetails?: boolean;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const queryParams: any = {};
      // Use keyword instead of itemCode to match frontend API call
      if (params.itemCode) queryParams.keyword = params.itemCode;
      if (params.itemTypeId) queryParams.itemTypeId = params.itemTypeId;
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;
      if (params.departmentCode) queryParams.departmentCode = params.departmentCode;

      const comparisonResult: any = await this.medicalSuppliesService.compareDispensedVsUsage(queryParams);
      let comparisonData: any[] = [];
      if (comparisonResult && comparisonResult.data) {
        comparisonData = Array.isArray(comparisonResult.data) ? comparisonResult.data : [];
      } else if (Array.isArray(comparisonResult)) {
        comparisonData = comparisonResult;
      }

      let deptNameForExcel: string | undefined;
      if (params.departmentCode) {
        const deptId = parseInt(params.departmentCode, 10);
        if (!Number.isNaN(deptId)) {
          const dept = await this.prisma.department.findUnique({
            where: { ID: deptId },
            select: { DepName: true },
          });
          deptNameForExcel = dept?.DepName ?? undefined;
        }
      }

      const reportData: ItemComparisonReportData = {
        filters: {
          itemCode: params.itemCode,
          itemTypeId: params.itemTypeId,
          startDate: params.startDate,
          endDate: params.endDate,
          departmentCode: params.departmentCode,
          departmentName: deptNameForExcel,
        },
        summary: comparisonResult?.summary || {
          total_items: 0,
          total_dispensed: 0,
          total_used: 0,
          matched_count: 0,
          discrepancy_count: 0,
        },
        comparison: comparisonData.map((item: any) => ({
          ...item,
          usageItems: [],
        })),
      };

      // Fetch usage details for each item to include in excel
      const comparisonWithUsage = await Promise.all(
        comparisonData.map(async (item: any) => {
          try {
            const usageData = await this.medicalSuppliesService.getUsageByItemCodeFromItemTable({
              itemCode: item.itemcode,
              startDate: params.startDate,
              endDate: params.endDate,
              departmentCode: params.departmentCode,
              page: 1,
              limit: 100,
            });
            const usageItems = (usageData && (usageData as any).data) ? (usageData as any).data : (Array.isArray(usageData) ? usageData : []);
            return {
              ...item,
              usageItems,
            };
          } catch (error) {
            console.warn(`Failed to fetch usage details for ${item.itemcode}:`, error);
          }

          return item;
        })
      );

      reportData.comparison = comparisonWithUsage;

      // Generate Excel
      const buffer = await this.itemComparisonExcelService.generateReport(reportData);
      const dateStr = params.startDate ? params.startDate.replace(/\//g, '-') : new Date().toISOString().split('T')[0];
      const itemCodeStr = params.itemCode ? `_${params.itemCode}` : '';
      const filename = `item_comparison_report${itemCodeStr}_${dateStr}.xlsx`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Item Comparison Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Item Comparison Excel report: ${errorMessage}`);
    }
  }

  /**
   * Generate item comparison report in PDF format
   */
  async generateItemComparisonPDF(params: {
    itemCode?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    departmentCode?: string;
    includeUsageDetails?: boolean;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const queryParams: any = {};
      // Use keyword instead of itemCode to match frontend API call
      if (params.itemCode) queryParams.keyword = params.itemCode;
      if (params.itemTypeId) queryParams.itemTypeId = params.itemTypeId;
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;
      if (params.departmentCode) queryParams.departmentCode = params.departmentCode;

      const comparisonResult: any = await this.medicalSuppliesService.compareDispensedVsUsage(queryParams);
      let comparisonData: any[] = [];
      if (comparisonResult && comparisonResult.data) {
        comparisonData = Array.isArray(comparisonResult.data) ? comparisonResult.data : [];
      } else if (Array.isArray(comparisonResult)) {
        comparisonData = comparisonResult;
      }

      let deptNameForPdf: string | undefined;
      if (params.departmentCode) {
        const deptId = parseInt(params.departmentCode, 10);
        if (!Number.isNaN(deptId)) {
          const dept = await this.prisma.department.findUnique({
            where: { ID: deptId },
            select: { DepName: true },
          });
          deptNameForPdf = dept?.DepName ?? undefined;
        }
      }

      const reportData: ItemComparisonReportData = {
        filters: {
          itemCode: params.itemCode,
          itemTypeId: params.itemTypeId,
          startDate: params.startDate,
          endDate: params.endDate,
          departmentCode: params.departmentCode,
          departmentName: deptNameForPdf,
        },
        summary: comparisonResult?.summary || {
          total_items: 0,
          total_dispensed: 0,
          total_used: 0,
          matched_count: 0,
          discrepancy_count: 0,
        },
        comparison: comparisonData.map((item: any) => ({
          ...item,
          usageItems: [],
        })),
      };

      // Fetch usage details for each item to include in PDF
      const comparisonWithUsage = await Promise.all(
        comparisonData.map(async (item: any) => {
          try {
            const usageData = await this.medicalSuppliesService.getUsageByItemCodeFromItemTable({
              itemCode: item.itemcode,
              startDate: params.startDate,
              endDate: params.endDate,
              departmentCode: params.departmentCode,
              page: 1,
              limit: 100,
            });
            const usageItems = (usageData && (usageData as any).data) ? (usageData as any).data : (Array.isArray(usageData) ? usageData : []);
            return {
              ...item,
              usageItems,
            };
          } catch (error) {
            console.warn(`Failed to fetch usage details for ${item.itemcode}:`, error);
          }

          return item;
        })
      );

      reportData.comparison = comparisonWithUsage;

      // Generate PDF
      const buffer = await this.itemComparisonPdfService.generateReport(reportData);
      const dateStr = params.startDate ? params.startDate.replace(/\//g, '-') : new Date().toISOString().split('T')[0];
      const itemCodeStr = params.itemCode ? `_${params.itemCode}` : '';
      const filename = `item_comparison_report${itemCodeStr}_${dateStr}.pdf`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Item Comparison PDF:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Item Comparison PDF report: ${errorMessage}`);
    }
  }

  /**
   * Report 1: Generate Vending Mapping Report (Excel)
   * ดึงข้อมูลจาก database โดยตรงใน report-service
   */
  async generateVendingMappingExcel(params: {
    startDate?: string;
    endDate?: string;
    printDate?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const whereConditions: any = {
        print_date: { not: null },
      };

      if (params?.printDate) {
        whereConditions.print_date = params.printDate;
      } else if (params?.startDate || params?.endDate) {
        whereConditions.print_date = {
          not: null,
        };
        if (params?.startDate) {
          whereConditions.print_date.gte = params.startDate;
        }
        if (params?.endDate) {
          whereConditions.print_date.lte = params.endDate;
        }
      }

      const usageRecords = await this.prisma.medicalSupplyUsage.findMany({
        where: whereConditions,
        include: {
          supply_items: true,
        },
        orderBy: {
          print_date: 'desc',
        },
      });

      const reportByDate = new Map<string, any>();

      for (const usage of usageRecords) {
        const printDate = usage.print_date || usage.update || '';
        if (!printDate) continue;

        if (!reportByDate.has(printDate)) {
          reportByDate.set(printDate, {
            print_date: printDate,
            total_episodes: 0,
            total_patients: new Set<string>(),
            total_items: 0,
            mapped_items: [],
            unmapped_items: [],
          });
        }

        const report = reportByDate.get(printDate);
        report.total_episodes += 1;
        report.total_patients.add(usage.patient_hn);

        for (const item of usage.supply_items) {
          const itemCode = item.order_item_code || item.supply_code;
          if (!itemCode) continue;

          report.total_items += item.qty || 0;

          const dispensedItem = await this.prisma.$queryRaw<any[]>`
            SELECT 
              ist.RowID,
              ist.ItemCode,
              i.itemname,
              ist.LastCabinetModify,
              ist.Qty,
              ist.RfidCode
            FROM itemstock ist
            INNER JOIN item i ON ist.ItemCode = i.itemcode
            WHERE ist.ItemCode = ${itemCode}
              AND ist.StockID = 0
              AND DATE(ist.LastCabinetModify) = DATE(${new Date(printDate)})
            LIMIT 1
          `;

          if (dispensedItem && dispensedItem.length > 0) {
            report.mapped_items.push({
              item_code: itemCode,
              item_name: item.order_item_description || item.supply_name,
              patient_hn: usage.patient_hn,
              patient_name: `${usage.first_name || ''} ${usage.lastname || ''}`.trim(),
              en: usage.en,
              qty: item.qty,
              assession_no: item.assession_no,
              dispensed_date: dispensedItem[0].LastCabinetModify,
              rfid_code: dispensedItem[0].RfidCode,
            });
          } else {
            report.unmapped_items.push({
              item_code: itemCode,
              item_name: item.order_item_description || item.supply_name,
              patient_hn: usage.patient_hn,
              patient_name: `${usage.first_name || ''} ${usage.lastname || ''}`.trim(),
              en: usage.en,
              qty: item.qty,
              assession_no: item.assession_no,
            });
          }
        }
      }

      const result = Array.from(reportByDate.values()).map(report => ({
        ...report,
        total_patients: report.total_patients.size,
      }));

      const reportData = {
        filters: params,
        summary: {
          total_days: result.length,
          total_episodes: result.reduce((sum, r) => sum + r.total_episodes, 0),
          total_patients: result.reduce((sum, r) => sum + r.total_patients, 0),
          total_items: result.reduce((sum, r) => sum + r.total_items, 0),
          total_mapped: result.reduce((sum, r) => sum + r.mapped_items.length, 0),
          total_unmapped: result.reduce((sum, r) => sum + r.unmapped_items.length, 0),
        },
        data: result,
      };

      const buffer = await this.vendingMappingReportExcelService.generateReport(reportData);
      const dateStr = params.printDate || params.startDate || new Date().toISOString().split('T')[0];
      const filename = `vending_mapping_report_${dateStr}.xlsx`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Vending Mapping Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Vending Mapping Excel report: ${errorMessage}`);
    }
  }

  /**
   * Report 1: Generate Vending Mapping Report (PDF)
   * ดึงข้อมูลจาก database โดยตรงใน report-service
   */
  async generateVendingMappingPDF(params: {
    startDate?: string;
    endDate?: string;
    printDate?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const whereConditions: any = {
        print_date: { not: null },
      };

      if (params?.printDate) {
        whereConditions.print_date = params.printDate;
      } else if (params?.startDate || params?.endDate) {
        whereConditions.print_date = {
          not: null,
        };
        if (params?.startDate) {
          whereConditions.print_date.gte = params.startDate;
        }
        if (params?.endDate) {
          whereConditions.print_date.lte = params.endDate;
        }
      }

      const usageRecords = await this.prisma.medicalSupplyUsage.findMany({
        where: whereConditions,
        include: {
          supply_items: true,
        },
        orderBy: {
          print_date: 'desc',
        },
      });

      const reportByDate = new Map<string, any>();

      for (const usage of usageRecords) {
        const printDate = usage.print_date || usage.update || '';
        if (!printDate) continue;

        if (!reportByDate.has(printDate)) {
          reportByDate.set(printDate, {
            print_date: printDate,
            total_episodes: 0,
            total_patients: new Set<string>(),
            total_items: 0,
            mapped_items: [],
            unmapped_items: [],
          });
        }

        const report = reportByDate.get(printDate);
        report.total_episodes += 1;
        report.total_patients.add(usage.patient_hn);

        for (const item of usage.supply_items) {
          const itemCode = item.order_item_code || item.supply_code;
          if (!itemCode) continue;

          report.total_items += item.qty || 0;

          const dispensedItem = await this.prisma.$queryRaw<any[]>`
            SELECT 
              ist.RowID,
              ist.ItemCode,
              i.itemname,
              ist.LastCabinetModify,
              ist.Qty,
              ist.RfidCode
            FROM itemstock ist
            INNER JOIN item i ON ist.ItemCode = i.itemcode
            WHERE ist.ItemCode = ${itemCode}
              AND ist.StockID = 0
              AND DATE(ist.LastCabinetModify) = DATE(${new Date(printDate)})
            LIMIT 1
          `;

          if (dispensedItem && dispensedItem.length > 0) {
            report.mapped_items.push({
              item_code: itemCode,
              item_name: item.order_item_description || item.supply_name,
              patient_hn: usage.patient_hn,
              patient_name: `${usage.first_name || ''} ${usage.lastname || ''}`.trim(),
              en: usage.en,
              qty: item.qty,
              assession_no: item.assession_no,
              dispensed_date: dispensedItem[0].LastCabinetModify,
              rfid_code: dispensedItem[0].RfidCode,
            });
          } else {
            report.unmapped_items.push({
              item_code: itemCode,
              item_name: item.order_item_description || item.supply_name,
              patient_hn: usage.patient_hn,
              patient_name: `${usage.first_name || ''} ${usage.lastname || ''}`.trim(),
              en: usage.en,
              qty: item.qty,
              assession_no: item.assession_no,
            });
          }
        }
      }

      const result = Array.from(reportByDate.values()).map(report => ({
        ...report,
        total_patients: report.total_patients.size,
      }));

      const reportData = {
        filters: params,
        summary: {
          total_days: result.length,
          total_episodes: result.reduce((sum, r) => sum + r.total_episodes, 0),
          total_patients: result.reduce((sum, r) => sum + r.total_patients, 0),
          total_items: result.reduce((sum, r) => sum + r.total_items, 0),
          total_mapped: result.reduce((sum, r) => sum + r.mapped_items.length, 0),
          total_unmapped: result.reduce((sum, r) => sum + r.unmapped_items.length, 0),
        },
        data: result,
      };

      const buffer = await this.vendingMappingReportPdfService.generateReport(reportData);
      const dateStr = params.printDate || params.startDate || new Date().toISOString().split('T')[0];
      const filename = `vending_mapping_report_${dateStr}.pdf`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Vending Mapping PDF:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Vending Mapping PDF report: ${errorMessage}`);
    }
  }

  /**
   * Report 2: Generate Unmapped Dispensed Report (Excel)
   * ดึงข้อมูลจาก database โดยตรงใน report-service
   */
  async generateUnmappedDispensedExcel(params: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'month';
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const groupBy = params.groupBy || 'day';

      let whereClause = Prisma.sql`ist.StockID = 0 AND ist.RfidCode <> ''`;

      if (params?.startDate) {
        whereClause = Prisma.sql`${whereClause} AND DATE(ist.LastCabinetModify) >= DATE(${new Date(params.startDate)})`;
      }
      if (params?.endDate) {
        whereClause = Prisma.sql`${whereClause} AND DATE(ist.LastCabinetModify) <= DATE(${new Date(params.endDate)})`;
      }

      const dateFormat = groupBy === 'day'
        ? Prisma.sql`DATE(ist.LastCabinetModify)`
        : Prisma.sql`DATE_FORMAT(ist.LastCabinetModify, '%Y-%m')`;

      const dispensedItems: any[] = await this.prisma.$queryRaw`
        SELECT
          ist.RowID,
          ist.ItemCode,
          i.itemname,
          ist.LastCabinetModify,
          ist.Qty,
          ist.RfidCode,
          ${dateFormat} as group_date
        FROM itemstock ist
        INNER JOIN item i ON ist.ItemCode = i.itemcode
        WHERE ${whereClause}
        ORDER BY ist.LastCabinetModify DESC
      `;

      const reportByDate = new Map<string, any>();

      for (const dispensed of dispensedItems) {
        const itemCode = dispensed.ItemCode;
        const dispensedDate = dispensed.LastCabinetModify;
        const groupDate = dispensed.group_date;

        const usageRecord = await this.prisma.medicalSupplyUsage.findFirst({
          where: {
            supply_items: {
              some: {
                OR: [
                  { order_item_code: itemCode },
                  { supply_code: itemCode },
                ],
              },
            },
            created_at: {
              gte: new Date(new Date(dispensedDate).setHours(0, 0, 0, 0)),
              lte: new Date(new Date(dispensedDate).setHours(23, 59, 59, 999)),
            },
          },
        });

        if (!usageRecord) {
          if (!reportByDate.has(groupDate)) {
            reportByDate.set(groupDate, {
              date: groupDate,
              items: [],
              total_qty: 0,
            });
          }

          const report = reportByDate.get(groupDate);
          report.items.push({
            item_code: itemCode,
            item_name: dispensed.itemname,
            dispensed_date: dispensedDate,
            qty: Number(dispensed.Qty),
            rfid_code: dispensed.RfidCode,
          });
          report.total_qty += Number(dispensed.Qty);
        }
      }

      const result = Array.from(reportByDate.values());

      const reportData = {
        filters: params,
        summary: {
          total_periods: result.length,
          total_unmapped_items: result.reduce((sum, r) => sum + r.items.length, 0),
          total_unmapped_qty: result.reduce((sum, r) => sum + r.total_qty, 0),
        },
        groupBy,
        data: result,
      };

      const buffer = await this.unmappedDispensedReportExcelService.generateReport(reportData);
      const dateStr = params.startDate || new Date().toISOString().split('T')[0];
      const groupByStr = params.groupBy || 'day';
      const filename = `unmapped_dispensed_report_${groupByStr}_${dateStr}.xlsx`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Unmapped Dispensed Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Unmapped Dispensed Excel report: ${errorMessage}`);
    }
  }

  /**
   * Report 3: Generate Unused Dispensed Report (Excel)
   * ดึงข้อมูลจาก database โดยตรงใน report-service
   */
  async generateUnusedDispensedExcel(params: {
    date?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const targetDate = params?.date
        ? new Date(params.date)
        : new Date();

      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      const dispensedItems: any[] = await this.prisma.$queryRaw`
        SELECT
          ist.RowID,
          ist.ItemCode,
          i.itemname,
          ist.LastCabinetModify,
          ist.Qty,
          ist.RfidCode
        FROM itemstock ist
        INNER JOIN item i ON ist.ItemCode = i.itemcode
        WHERE ist.StockID = 0
          AND ist.RfidCode <> ''
          AND DATE(ist.LastCabinetModify) = DATE(${startOfDay})
        ORDER BY ist.LastCabinetModify DESC
      `;

      const unusedItems: any[] = [];

      for (const dispensed of dispensedItems) {
        const itemCode = dispensed.ItemCode;

        const usageRecord = await this.prisma.medicalSupplyUsage.findFirst({
          where: {
            supply_items: {
              some: {
                OR: [
                  { order_item_code: itemCode },
                  { supply_code: itemCode },
                ],
              },
            },
            created_at: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        });

        if (!usageRecord) {
          unusedItems.push({
            item_code: itemCode,
            item_name: dispensed.itemname,
            dispensed_date: dispensed.LastCabinetModify,
            qty: Number(dispensed.Qty),
            rfid_code: dispensed.RfidCode,
            hours_since_dispense: Math.floor(
              (new Date().getTime() - new Date(dispensed.LastCabinetModify).getTime()) / (1000 * 60 * 60)
            ),
          });
        }
      }

      const reportData = {
        summary: {
          date: targetDate.toISOString().split('T')[0],
          total_unused_items: unusedItems.length,
          total_unused_qty: unusedItems.reduce((sum, item) => sum + item.qty, 0),
        },
        data: unusedItems,
      };

      const buffer = await this.unusedDispensedReportExcelService.generateReport(reportData);
      const dateStr = params.date || new Date().toISOString().split('T')[0];
      const filename = `unused_dispensed_report_${dateStr}.xlsx`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Unused Dispensed Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Unused Dispensed Excel report: ${errorMessage}`);
    }
  }

  /**
   * Get Vending Mapping Report Data (JSON)
   * ดึงข้อมูลจาก database โดยตรงใน report-service
   */
  async getVendingMappingData(params: {
    startDate?: string;
    endDate?: string;
    printDate?: string;
  }): Promise<any> {
    try {
      const whereConditions: any = {};

      if (params?.printDate) {
        // whereConditions.print_date = params.printDate;
        whereConditions.print_date = params.startDate
      }

      if (params?.startDate && params?.endDate) {
        whereConditions.created_at = {
          gte: new Date(params.startDate + 'T00:00:00.000Z'),
          lte: new Date(params.endDate + 'T23:59:59.999Z'),
        };
      }

      const usageRecords = await this.prisma.medicalSupplyUsage.findMany({
        where: whereConditions,
        include: {
          supply_items: true,
        },
        orderBy: {
          print_date: 'desc',
        },
      });

      const reportByDate = new Map<string, any>();

      for (const usage of usageRecords) {
        const printDate = usage.print_date || usage.update || '';
        if (!printDate) continue;

        if (!reportByDate.has(printDate)) {
          reportByDate.set(printDate, {
            print_date: printDate,
            total_episodes: 0,
            total_patients: new Set<string>(),
            total_items: 0,
            mapped_items: [],
            unmapped_items: [],
          });
        }

        const report = reportByDate.get(printDate);
        report.total_episodes += 1;
        report.total_patients.add(usage.patient_hn);

        for (const item of usage.supply_items) {
          const itemCode = item.order_item_code || item.supply_code;
          if (!itemCode) continue;

          report.total_items += item.qty || 0;

          const dispensedItem = await this.prisma.$queryRaw<any[]>`
            SELECT 
              ist.RowID,
              ist.ItemCode,
              i.itemname,
              ist.LastCabinetModify,
              ist.Qty,
              ist.RfidCode
            FROM itemstock ist
            INNER JOIN item i ON ist.ItemCode = i.itemcode
            WHERE ist.ItemCode = ${itemCode}
              AND ist.StockID = 0
           
            LIMIT 1
          `;

          if (dispensedItem && dispensedItem.length > 0) {
            report.mapped_items.push({
              item_code: itemCode,
              item_name: item.order_item_description || item.supply_name,
              patient_hn: usage.patient_hn,
              patient_name: `${usage.first_name || ''} ${usage.lastname || ''}`.trim(),
              en: usage.en,
              qty: item.qty,
              assession_no: item.assession_no,
              dispensed_date: dispensedItem[0].LastCabinetModify,
              rfid_code: dispensedItem[0].RfidCode,
            });
          } else {
            report.unmapped_items.push({
              item_code: itemCode,
              item_name: item.order_item_description || item.supply_name,
              patient_hn: usage.patient_hn,
              patient_name: `${usage.first_name || ''} ${usage.lastname || ''}`.trim(),
              en: usage.en,
              qty: item.qty,
              assession_no: item.assession_no,
            });
          }
        }
      }

      const result = Array.from(reportByDate.values()).map(report => ({
        ...report,
        total_patients: report.total_patients.size,
      }));

      return {
        filters: params,
        summary: {
          total_days: result.length,
          total_episodes: result.reduce((sum, r) => sum + r.total_episodes, 0),
          total_patients: result.reduce((sum, r) => sum + r.total_patients, 0),
          total_items: result.reduce((sum, r) => sum + r.total_items, 0),
          total_mapped: result.reduce((sum, r) => sum + r.mapped_items.length, 0),
          total_unmapped: result.reduce((sum, r) => sum + r.unmapped_items.length, 0),
        },
        data: result,
      };
    } catch (error) {
      console.error('[Report Service] Error getting Vending Mapping data:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to get Vending Mapping data: ${errorMessage}`);
    }
  }

  /**
   * Get Unmapped Dispensed Report Data (JSON)
   * ดึงข้อมูลจาก database โดยตรงใน report-service
   */
  async getUnmappedDispensedData(params: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'month';
  }): Promise<any> {
    try {
      const groupBy = params.groupBy || 'day';

      let whereClause = Prisma.sql`ist.StockID = 0 AND ist.RfidCode <> ''`;

      if (params?.startDate) {
        whereClause = Prisma.sql`${whereClause} AND DATE(ist.LastCabinetModify) >= DATE(${new Date(params.startDate)})`;
      }
      if (params?.endDate) {
        whereClause = Prisma.sql`${whereClause} AND DATE(ist.LastCabinetModify) <= DATE(${new Date(params.endDate)})`;
      }

      const dateFormat = groupBy === 'day'
        ? Prisma.sql`DATE(ist.LastCabinetModify)`
        : Prisma.sql`DATE_FORMAT(ist.LastCabinetModify, '%Y-%m')`;

      const dispensedItems: any[] = await this.prisma.$queryRaw`
        SELECT
          ist.RowID,
          ist.ItemCode,
          i.itemname,
          ist.LastCabinetModify,
          ist.Qty,
          ist.RfidCode,
          ${dateFormat} as group_date
        FROM itemstock ist
        INNER JOIN item i ON ist.ItemCode = i.itemcode
        WHERE ${whereClause}
        ORDER BY ist.LastCabinetModify DESC
      `;

      const reportByDate = new Map<string, any>();

      for (const dispensed of dispensedItems) {
        const itemCode = dispensed.ItemCode;
        const dispensedDate = dispensed.LastCabinetModify;
        const groupDate = dispensed.group_date;

        const usageRecord = await this.prisma.medicalSupplyUsage.findFirst({
          where: {
            supply_items: {
              some: {
                OR: [
                  { order_item_code: itemCode },
                  { supply_code: itemCode },
                ],
              },
            },
            created_at: {
              gte: new Date(new Date(dispensedDate).setHours(0, 0, 0, 0)),
              lte: new Date(new Date(dispensedDate).setHours(23, 59, 59, 999)),
            },
          },
        });

        if (!usageRecord) {
          if (!reportByDate.has(groupDate)) {
            reportByDate.set(groupDate, {
              date: groupDate,
              items: [],
              total_qty: 0,
            });
          }

          const report = reportByDate.get(groupDate);
          report.items.push({
            item_code: itemCode,
            item_name: dispensed.itemname,
            dispensed_date: dispensedDate,
            qty: Number(dispensed.Qty),
            rfid_code: dispensed.RfidCode,
          });
          report.total_qty += Number(dispensed.Qty);
        }
      }

      const result = Array.from(reportByDate.values());

      return {
        filters: params,
        summary: {
          total_periods: result.length,
          total_unmapped_items: result.reduce((sum, r) => sum + r.items.length, 0),
          total_unmapped_qty: result.reduce((sum, r) => sum + r.total_qty, 0),
        },
        groupBy,
        data: result,
      };
    } catch (error) {
      console.error('[Report Service] Error getting Unmapped Dispensed data:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to get Unmapped Dispensed data: ${errorMessage}`);
    }
  }

  /**
   * Get Unused Dispensed Report Data (JSON)
   * ดึงข้อมูลจาก database โดยตรงใน report-service
   */
  async getUnusedDispensedData(params: {
    date?: string;
  }): Promise<any> {
    try {
      const targetDate = params?.date
        ? new Date(params.date)
        : new Date();

      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      const dispensedItems: any[] = await this.prisma.$queryRaw`
        SELECT
          ist.RowID,
          ist.ItemCode,
          i.itemname,
          ist.LastCabinetModify,
          ist.Qty,
          ist.RfidCode
        FROM itemstock ist
        INNER JOIN item i ON ist.ItemCode = i.itemcode
        WHERE ist.StockID = 0
          AND ist.RfidCode <> ''
          AND DATE(ist.LastCabinetModify) = DATE(${startOfDay})
        ORDER BY ist.LastCabinetModify DESC
      `;

      const unusedItems: any[] = [];

      for (const dispensed of dispensedItems) {
        const itemCode = dispensed.ItemCode;

        const usageRecord = await this.prisma.medicalSupplyUsage.findFirst({
          where: {
            supply_items: {
              some: {
                OR: [
                  { order_item_code: itemCode },
                  { supply_code: itemCode },
                ],
              },
            },
            created_at: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          include: {
            supply_items: {
              where: {
                OR: [
                  { order_item_code: itemCode },
                  { supply_code: itemCode },
                ],
              },
            },
          },
        });

        if (!usageRecord) {
          unusedItems.push({
            item_code: itemCode,
            item_name: dispensed.itemname,
            dispensed_date: dispensed.LastCabinetModify,
            qty: Number(dispensed.Qty),
            rfid_code: dispensed.RfidCode,
            hours_since_dispense: Math.floor(
              (new Date().getTime() - new Date(dispensed.LastCabinetModify).getTime()) / (1000 * 60 * 60)
            ),
            supply_usage_item_id: null,
          });
        } else {
          // Find matching supply item that can be returned
          const matchingItem = usageRecord.supply_items.find((item: any) => {
            const availableQty = item.qty - (item.qty_used_with_patient || 0) - (item.qty_returned_to_cabinet || 0);
            return availableQty > 0;
          });

          if (matchingItem) {
            const availableQty = matchingItem.qty || 0 - (matchingItem.qty_used_with_patient || 0) - (matchingItem.qty_returned_to_cabinet || 0);
            unusedItems.push({
              item_code: itemCode,
              item_name: dispensed.itemname,
              dispensed_date: dispensed.LastCabinetModify,
              qty: Number(dispensed.Qty),
              rfid_code: dispensed.RfidCode,
              hours_since_dispense: Math.floor(
                (new Date().getTime() - new Date(dispensed.LastCabinetModify).getTime()) / (1000 * 60 * 60)
              ),
              supply_usage_item_id: matchingItem.id,
              available_qty: availableQty,
            });
          }
        }
      }

      return {
        summary: {
          date: targetDate.toISOString().split('T')[0],
          total_unused_items: unusedItems.length,
          total_unused_qty: unusedItems.reduce((sum, item) => sum + item.qty, 0),
        },
        data: unusedItems,
      };
    } catch (error) {
      console.error('[Report Service] Error getting Unused Dispensed data:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to get Unused Dispensed data: ${errorMessage}`);
    }
  }

  /**
   * Get Cancel Bill Report Data (JSON)
   * ดึงข้อมูลรายการที่ยกเลิก Bill จาก MedicalSupplyUsage
   */
  async getCancelBillReportData(params: {
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    try {
      const whereConditions: any = {
        billing_status: 'CANCELLED',
      };

      if (params?.startDate || params?.endDate) {
        whereConditions.created_at = {};
        if (params?.startDate) {
          whereConditions.created_at.gte = new Date(params.startDate);
        }
        if (params?.endDate) {
          whereConditions.created_at.lte = new Date(params.endDate);
        }
      }

      const cancelledRecords = await this.prisma.medicalSupplyUsage.findMany({
        where: whereConditions,
        include: {
          supply_items: {
            where: {
              order_item_status: 'Discontinue',
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      const result = cancelledRecords.map(record => ({
        id: record.id,
        en: record.en,
        patient_hn: record.patient_hn,
        patient_name: `${record.first_name || ''} ${record.lastname || ''}`.trim() || record.patient_name_th || '-',
        print_date: record.print_date,
        created_at: record.created_at,
        billing_status: record.billing_status,
        cancelled_items: record.supply_items.map(item => ({
          item_code: item.order_item_code || item.supply_code,
          item_name: item.order_item_description || item.supply_name,
          assession_no: item.assession_no,
          qty: item.qty,
          qty_used_with_patient: item.qty_used_with_patient,
          order_item_status: item.order_item_status,
        })),
      }));

      return {
        filters: params,
        summary: {
          total_cancelled_bills: result.length,
          total_cancelled_items: result.reduce((sum, r) => sum + r.cancelled_items.length, 0),
        },
        data: result,
      };
    } catch (error) {
      console.error('[Report Service] Error getting Cancel Bill data:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to get Cancel Bill data: ${errorMessage}`);
    }
  }

  /**
   * Get Return Report Data (JSON)
   * ดึงข้อมูลการคืนเวชภัณฑ์จาก medical-supplies-service
   */
  async getReturnReportData(params: {
    date_from?: string;
    date_to?: string;
    return_reason?: string;
    department_code?: string;
    patient_hn?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    try {
      const result: any = await this.medicalSuppliesService.getReturnHistory(params as any);

      const data = (result && result.data) ? result.data : (result && Array.isArray(result) ? result : []);
      const total = (result && result.total != null) ? result.total : data.length;
      const page = (result && result.page != null) ? result.page : 1;
      const limit = (result && result.limit != null) ? result.limit : 10;

      return {
        data: Array.isArray(data) ? data : [],
        total,
        page,
        limit,
      };
    } catch (error) {
      console.error('[Report Service] Error getting Return Report data:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to get Return Report data: ${errorMessage}`);
    }
  }

  /**
   * Generate Return Report in Excel format
   */
  async generateReturnReportExcel(params: {
    date_from?: string;
    date_to?: string;
    return_reason?: string;
    department_code?: string;
    patient_hn?: string;
  }): Promise<Buffer> {
    try {
      // Get return history data from medical-supplies-service
      const returnData = await this.getReturnReportData({
        ...params,
        page: 1,
        limit: 10000, // Get all records for report
      });

      // Prepare report data
      const reportData: ReturnReportData = {
        filters: {
          date_from: params.date_from,
          date_to: params.date_to,
          return_reason: params.return_reason,
          department_code: params.department_code,
          patient_hn: params.patient_hn,
        },
        summary: {
          total_records: returnData.total || returnData.data?.length || 0,
          total_qty_returned: returnData.data?.reduce(
            (sum: number, record: any) => sum + (record.qty_returned || 0),
            0
          ) || 0,
        },
        data: returnData.data || [],
      };

      // Generate Excel report
      const buffer = await this.returnReportExcelService.generateReport(reportData);
      return buffer;
    } catch (error) {
      console.error('[Report Service] Error generating Return Report Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Return Report Excel: ${errorMessage}`);
    }
  }

  /**
   * Generate Return Report in PDF format
   */
  async generateReturnReportPdf(params: {
    date_from?: string;
    date_to?: string;
    return_reason?: string;
    department_code?: string;
    patient_hn?: string;
  }): Promise<Buffer> {
    try {
      // Get return history data from medical-supplies-service
      const returnData = await this.getReturnReportData({
        ...params,
        page: 1,
        limit: 10000, // Get all records for report
      });

      // Prepare report data
      const reportData: ReturnReportData = {
        filters: {
          date_from: params.date_from,
          date_to: params.date_to,
          return_reason: params.return_reason,
          department_code: params.department_code,
          patient_hn: params.patient_hn,
        },
        summary: {
          total_records: returnData.total || returnData.data?.length || 0,
          total_qty_returned: returnData.data?.reduce(
            (sum: number, record: any) => sum + (record.qty_returned || 0),
            0
          ) || 0,
        },
        data: returnData.data || [],
      };

      // Generate PDF report
      const buffer = await this.returnReportPdfService.generateReport(reportData);
      return buffer;
    } catch (error) {
      console.error('[Report Service] Error generating Return Report PDF:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Return Report PDF: ${errorMessage}`);
    }
  }

  /**
   * Generate Cancel Bill Report in Excel format
   */
  async generateCancelBillReportExcel(params: {
    startDate?: string;
    endDate?: string;
  }): Promise<Buffer> {
    try {
      // Get cancel bill data
      const cancelBillData = await this.getCancelBillReportData(params);

      // Prepare report data
      const reportData: CancelBillReportData = {
        filters: {
          startDate: params.startDate,
          endDate: params.endDate,
        },
        summary: {
          total_cancelled_bills: cancelBillData.summary?.total_cancelled_bills || 0,
          total_cancelled_items: cancelBillData.summary?.total_cancelled_items || 0,
        },
        data: cancelBillData.data || [],
      };

      // Generate Excel report
      const buffer = await this.cancelBillReportExcelService.generateReport(reportData);
      return buffer;
    } catch (error) {
      console.error('[Report Service] Error generating Cancel Bill Report Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Cancel Bill Report Excel: ${errorMessage}`);
    }
  }

  /**
   * Generate Cancel Bill Report in PDF format
   */
  async generateCancelBillReportPdf(params: {
    startDate?: string;
    endDate?: string;
  }): Promise<Buffer> {
    try {
      // Get cancel bill data
      const cancelBillData = await this.getCancelBillReportData(params);

      // Prepare report data
      const reportData: CancelBillReportData = {
        filters: {
          startDate: params.startDate,
          endDate: params.endDate,
        },
        summary: {
          total_cancelled_bills: cancelBillData.summary?.total_cancelled_bills || 0,
          total_cancelled_items: cancelBillData.summary?.total_cancelled_items || 0,
        },
        data: cancelBillData.data || [],
      };

      // Generate PDF report
      const buffer = await this.cancelBillReportPdfService.generateReport(reportData);
      return buffer;
    } catch (error) {
      console.error('[Report Service] Error generating Cancel Bill Report PDF:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Cancel Bill Report PDF: ${errorMessage}`);
    }
  }

  /**
   * Get Returned Items Data (StockID = 1) for report
   */
  async getReturnToCabinetReportData(params: {
    keyword?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    departmentId?: string;
    cabinetId?: string;
  }): Promise<any> {
    try {
      const result: any = await this.medicalSuppliesService.getReturnedItems(params);

      const data = (result && result.data) ? result.data : (result && Array.isArray(result) ? result : []);
      return {
        data: Array.isArray(data) ? data : [],
        total: (result && result.total != null) ? result.total : data.length,
        page: (result && result.page != null) ? result.page : 1,
        limit: (result && result.limit != null) ? result.limit : 10,
      };
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to get Return To Cabinet Report data: ${errorMessage}`);
    }
  }

  /**
   * Generate Return To Cabinet Report in Excel format
   */
  async generateReturnToCabinetReportExcel(params: {
    keyword?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    cabinetId?: string;
  }): Promise<Buffer> {
    try {
      const returnedData = await this.getReturnToCabinetReportData({
        ...params,
        page: 1,
        limit: 10000,
      });

      const labels = await this.getCabinetDepartmentLabels(params.cabinetId, params.departmentId);

      const reportData: ReturnToCabinetReportData = {
        filters: {
          keyword: params.keyword,
          itemTypeId: params.itemTypeId,
          startDate: params.startDate,
          endDate: params.endDate,
          departmentId: params.departmentId,
          cabinetId: params.cabinetId,
          departmentName: labels.departmentName,
          cabinetName: labels.cabinetName,
        },
        summary: {
          total_records: returnedData.total || returnedData.data?.length || 0,
          total_qty: returnedData.data?.reduce(
            (sum: number, record: any) => sum + (record.qty || 0),
            0
          ) || 0,
        },
        data: returnedData.data || [],
      };

      const buffer = await this.returnToCabinetReportExcelService.generateReport(reportData);
      return buffer;
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Return To Cabinet Report Excel: ${errorMessage}`);
    }
  }

  /**
   * Generate Return To Cabinet Report in PDF format
   */
  async generateReturnToCabinetReportPdf(params: {
    keyword?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    cabinetId?: string;
  }): Promise<Buffer> {
    try {
      const returnedData = await this.getReturnToCabinetReportData({
        ...params,
        page: 1,
        limit: 10000,
      });

      const labels = await this.getCabinetDepartmentLabels(params.cabinetId, params.departmentId);

      const reportData: ReturnToCabinetReportData = {
        filters: {
          keyword: params.keyword,
          itemTypeId: params.itemTypeId,
          startDate: params.startDate,
          endDate: params.endDate,
          departmentId: params.departmentId,
          cabinetId: params.cabinetId,
          departmentName: labels.departmentName,
          cabinetName: labels.cabinetName,
        },
        summary: {
          total_records: returnedData.total || returnedData.data?.length || 0,
          total_qty: returnedData.data?.reduce(
            (sum: number, record: any) => sum + (record.qty || 0),
            0
          ) || 0,
        },
        data: returnedData.data || [],
      };

      const buffer = await this.returnToCabinetReportPdfService.generateReport(reportData);
      return buffer;
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Return To Cabinet Report PDF: ${errorMessage}`);
    }
  }

  /**
   * ดึงชื่อแผนกและชื่อตู้ — cabinetId ว่าง = ตู้ทั้งหมด, departmentId ว่าง = แผนกทั้งหมด
   */
  private async getCabinetDepartmentLabels(
    cabinetId?: string,
    departmentId?: string,
  ): Promise<{ cabinetName?: string; departmentName?: string }> {
    const hasCab = cabinetId != null && String(cabinetId).trim() !== '';
    const hasDept = departmentId != null && String(departmentId).trim() !== '';
    if (!hasCab && !hasDept) return {};

    try {
      if (hasCab && hasDept) {
        const cabId = parseInt(String(cabinetId).trim(), 10);
        const deptId = parseInt(String(departmentId).trim(), 10);
        if (Number.isNaN(cabId) || Number.isNaN(deptId)) return {};
        const cd = await this.prisma.cabinetDepartment.findFirst({
          where: { cabinet_id: cabId, department_id: deptId },
          include: { cabinet: true, department: true },
        });
        return {
          cabinetName: cd?.cabinet?.cabinet_name ?? undefined,
          departmentName: cd?.department?.DepName ?? undefined,
        };
      }
      if (hasCab) {
        const cabId = parseInt(String(cabinetId).trim(), 10);
        if (Number.isNaN(cabId)) return {};
        const cabinet = await this.prisma.cabinet.findUnique({
          where: { id: cabId },
          select: { cabinet_name: true },
        });
        return {
          cabinetName: cabinet?.cabinet_name ?? undefined,
          departmentName: undefined,
        };
      }
      // !cabinetId && departmentId → แผนกที่เลือก, ตู้ = ทั้งหมด
      const deptId = parseInt(String(departmentId).trim(), 10);
      if (Number.isNaN(deptId)) return {};
      const department = await this.prisma.department.findUnique({
        where: { ID: deptId },
        select: { DepName: true },
      });
      return {
        cabinetName: undefined,
        departmentName: department?.DepName ?? undefined,
      };
    } catch {
      return {};
    }
  }

  /** ชื่อตู้จาก relation itemSlotInCabinet (รายงาน Weighing เบิก/เติม) */
  private weighingRowCabinetLabel(r: any): string {
    const c = r?.itemSlotInCabinet?.cabinet;
    const name = (c?.cabinet_name ?? '').toString().trim();
    const code = (c?.cabinet_code ?? '').toString().trim();
    if (name && code) return `${name} (${code})`;
    return name || code || '-';
  }

  /** วันที่แก้ไขแบบสั้น YYYY-MM-DD สำหรับคอลัมน์รายงาน */
  private reportModifyDateYmd(d: string | Date | null | undefined): string {
    if (d == null || d === '') return '-';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (Number.isNaN(date.getTime())) return '-';
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /**
   * Generate Dispensed Items Report in Excel format
   */
  async generateDispensedItemsExcel(params: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    departmentId?: string;
    cabinetId?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const result: any = await this.medicalSuppliesService.getDispensedItems({
        keyword: params.keyword,
        startDate: params.startDate,
        endDate: params.endDate,
        page: params.page || 1,
        limit: params.limit || 10000,
        departmentId: params.departmentId,
        cabinetId: params.cabinetId,
      });

      const dispensedItems = (result && result.data) ? result.data : (Array.isArray(result) ? result : []);
      if (!Array.isArray(dispensedItems)) {
        throw new Error('Failed to fetch dispensed items data');
      }

      const labels = await this.getCabinetDepartmentLabels(params.cabinetId, params.departmentId);

      // Prepare report data
      const reportData: DispensedItemsReportData = {
        filters: {
          keyword: params.keyword,
          startDate: params.startDate,
          endDate: params.endDate,
          departmentId: params.departmentId,
          cabinetId: params.cabinetId,
          departmentName: labels.departmentName,
          cabinetName: labels.cabinetName,
        } as DispensedItemsReportData['filters'],
        summary: {
          total_records: result?.total ?? dispensedItems.length,
          total_qty: dispensedItems.reduce((sum: number, item: any) => sum + (item.qty || 0), 0),
        },
        data: dispensedItems,
      };

      // Generate Excel report
      const buffer = await this.dispensedItemsExcelService.generateReport(reportData);
      const dateStr = params.startDate ? params.startDate.replace(/\//g, '-') : new Date().toISOString().split('T')[0];
      const filename = `dispensed_items_report_${dateStr}.xlsx`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Dispensed Items Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Dispensed Items Excel report: ${errorMessage}`);
    }
  }

  /**
   * รายงานเบิกรวม — Excel หลายชีต: Weighing กับ RFID
   */
  async generateDispensedAllExcel(params: {
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
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const w = params?.weighing ?? {};
      const r = params?.rfid ?? {};

      const [weighingRes, rfidResult] = await Promise.all([
        this.weighingService.findDetailsBySign('-', {
          page: 1,
          limit: 10000,
          itemName: w?.itemName?.trim() || undefined,
          itemcode: w?.itemcode?.trim() || undefined,
          stockId: w?.stockId,
          dateFrom: w?.dateFrom?.trim() || undefined,
          dateTo: w?.dateTo?.trim() || undefined,
        }),
        this.medicalSuppliesService.getDispensedItems({
          keyword: r.keyword,
          startDate: r.startDate,
          endDate: r.endDate,
          page: r.page || 1,
          limit: r.limit || 10000,
          departmentId: r.departmentId,
          cabinetId: r.cabinetId,
        }),
      ]);

      const rows = Array.isArray((weighingRes as any)?.data) ? (weighingRes as any).data : [];
      const totalQty = rows.reduce((sum: number, row: any) => sum + (Number(row?.Qty) || 0), 0);
      const employeeName = (row: any) => {
        const emp = row?.userCabinet?.legacyUser?.employee;
        if (!emp) return '-';
        const parts = [emp.FirstName, emp.LastName].filter(Boolean);
        return parts.length ? parts.join(' ') : '-';
      };
      const weighingReportData: WeighingDispenseReportData = {
        filters: {
          stockId: w?.stockId,
          itemName: w?.itemName,
          itemcode: w?.itemcode,
          dateFrom: w?.dateFrom,
          dateTo: w?.dateTo,
        },
        summary: { total_rows: rows.length, total_qty: totalQty },
        data: rows.map((row: any, i: number) => ({
          seq: i + 1,
          item_name: row?.item?.itemname || row?.item?.Alternatename || row?.itemcode || '-',
          cabinet_label: this.weighingRowCabinetLabel(row),
          operator_name: employeeName(row),
          qty: Number(row?.Qty) || 0,
          modify_date: this.reportModifyDateYmd(row?.ModifyDate),
        })),
      };

      const dispensedItems =
        rfidResult && (rfidResult as any).data
          ? (rfidResult as any).data
          : Array.isArray(rfidResult)
            ? rfidResult
            : [];
      if (!Array.isArray(dispensedItems)) {
        throw new Error('Failed to fetch dispensed items data');
      }
      const labels = await this.getCabinetDepartmentLabels(r.cabinetId, r.departmentId);
      const rfidReportData: DispensedItemsReportData = {
        filters: {
          keyword: r.keyword,
          startDate: r.startDate,
          endDate: r.endDate,
          departmentId: r.departmentId,
          cabinetId: r.cabinetId,
          departmentName: labels.departmentName,
          cabinetName: labels.cabinetName,
        } as DispensedItemsReportData['filters'],
        summary: {
          total_records: (rfidResult as any)?.total ?? dispensedItems.length,
          total_qty: dispensedItems.reduce((sum: number, item: any) => sum + (item.qty || 0), 0),
        },
        data: dispensedItems,
      };

      const buffer = await this.dispensedAllExcelService.generateReport({
        weighing: weighingReportData,
        rfid: rfidReportData,
      });
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `dispensed_all_report_${dateStr}.xlsx`;
      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Dispensed All Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Dispensed All Excel report: ${errorMessage}`);
    }
  }

  /**
   * รายงานเติม/คืนรวม — Excel หลายชีต: Weighing เติม กับ RFID คืนเข้าตู้
   */
  async generateRefillAllExcel(params: {
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
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const w = params?.weighing ?? {};
      const rtc = params?.returnToCabinet ?? {};

      const [refillRes, returnedData] = await Promise.all([
        this.weighingService.findDetailsBySign('+', {
          page: 1,
          limit: 10000,
          itemName: w?.itemName?.trim() || undefined,
          itemcode: w?.itemcode?.trim() || undefined,
          stockId: w?.stockId,
          dateFrom: w?.dateFrom?.trim() || undefined,
          dateTo: w?.dateTo?.trim() || undefined,
        }),
        this.getReturnToCabinetReportData({
          keyword: rtc.keyword,
          itemTypeId: rtc.itemTypeId,
          startDate: rtc.startDate,
          endDate: rtc.endDate,
          page: rtc.page || 1,
          limit: rtc.limit || 10000,
          departmentId: rtc.departmentId,
          cabinetId: rtc.cabinetId,
        }),
      ]);

      const rows = Array.isArray((refillRes as any)?.data) ? (refillRes as any).data : [];
      const totalQty = rows.reduce((sum: number, row: any) => sum + (Number(row?.Qty) || 0), 0);
      const employeeName = (row: any) => {
        const emp = row?.userCabinet?.legacyUser?.employee;
        if (!emp) return '-';
        const parts = [emp.FirstName, emp.LastName].filter(Boolean);
        return parts.length ? parts.join(' ') : '-';
      };
      const weighingReportData: WeighingDispenseReportData = {
        filters: {
          stockId: w?.stockId,
          itemName: w?.itemName,
          itemcode: w?.itemcode,
          dateFrom: w?.dateFrom,
          dateTo: w?.dateTo,
        },
        summary: { total_rows: rows.length, total_qty: totalQty },
        data: rows.map((row: any, i: number) => ({
          seq: i + 1,
          item_name: row?.item?.itemname || row?.item?.Alternatename || row?.itemcode || '-',
          cabinet_label: this.weighingRowCabinetLabel(row),
          operator_name: employeeName(row),
          qty: Number(row?.Qty) || 0,
          modify_date: this.reportModifyDateYmd(row?.ModifyDate),
        })),
      };

      const labels = await this.getCabinetDepartmentLabels(rtc.cabinetId, rtc.departmentId);
      const returnData = returnedData?.data ?? [];
      const returnReportData: ReturnToCabinetReportData = {
        filters: {
          keyword: rtc.keyword,
          itemTypeId: rtc.itemTypeId,
          startDate: rtc.startDate,
          endDate: rtc.endDate,
          departmentId: rtc.departmentId,
          cabinetId: rtc.cabinetId,
          departmentName: labels.departmentName,
          cabinetName: labels.cabinetName,
        },
        summary: {
          total_records: returnedData?.total ?? returnData.length,
          total_qty: returnData.reduce((sum: number, record: any) => sum + (record.qty || 0), 0) || 0,
        },
        data: returnData,
      };

      const buffer = await this.refillAllExcelService.generateReport({
        weighing: weighingReportData,
        returnToCabinet: returnReportData,
      });
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `refill_all_report_${dateStr}.xlsx`;
      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Refill All Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Refill All Excel report: ${errorMessage}`);
    }
  }

  /**
   * Generate Dispensed Items Report in PDF format
   */
  async generateDispensedItemsPDF(params: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    departmentId?: string;
    cabinetId?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const result: any = await this.medicalSuppliesService.getDispensedItems({
        keyword: params.keyword,
        startDate: params.startDate,
        endDate: params.endDate,
        page: params.page || 1,
        limit: params.limit || 10000,
        departmentId: params.departmentId,
        cabinetId: params.cabinetId,
      });

      const dispensedItems = (result && result.data) ? result.data : (Array.isArray(result) ? result : []);
      if (!Array.isArray(dispensedItems)) {
        throw new Error('Failed to fetch dispensed items data');
      }

      const labels = await this.getCabinetDepartmentLabels(params.cabinetId, params.departmentId);

      // Prepare report data
      const reportData: DispensedItemsReportData = {
        filters: {
          keyword: params.keyword,
          startDate: params.startDate,
          endDate: params.endDate,
          departmentId: params.departmentId,
          cabinetId: params.cabinetId,
          departmentName: labels.departmentName,
          cabinetName: labels.cabinetName,
        } as DispensedItemsReportData['filters'],
        summary: {
          total_records: result?.total ?? dispensedItems.length,
          total_qty: dispensedItems.reduce((sum: number, item: any) => sum + (item.qty || 0), 0),
        },
        data: dispensedItems,
      };

      // Generate PDF report
      const buffer = await this.dispensedItemsPdfService.generateReport(reportData);
      const dateStr = params.startDate ? params.startDate.replace(/\//g, '-') : new Date().toISOString().split('T')[0];
      const filename = `dispensed_items_report_${dateStr}.pdf`;

      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Dispensed Items PDF:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Dispensed Items PDF report: ${errorMessage}`);
    }
  }

  /** สต๊อก RFID ในตู้ (หรือรวมตามแผนก) — ต้องระบุ cabinetId / cabinetCode หรือ departmentId */
  async getCabinetStockData(params: {
    cabinetId?: number;
    cabinetCode?: string;
    departmentId?: number;
    keyword?: string;
    statusFilter?: string;
  }): Promise<CabinetStockReportData> {
    try {
      const hasCabinet = params?.cabinetId != null || !!params?.cabinetCode?.trim();
      const hasDept = params?.departmentId != null;
      if (!hasCabinet && !hasDept) {
        throw new Error('ต้องระบุ cabinetId, cabinetCode หรือ departmentId');
      }

      const kwSql = itemKeywordSql(params?.keyword);
      const rfidOnlySql = Prisma.sql`AND (ist.RfidCode IS NOT NULL AND TRIM(ist.RfidCode) <> '')`;
      const activeItemSql = Prisma.sql`AND COALESCE(i.item_status, 0) = 0`;

      let query;
      if (hasCabinet) {
        query = this.prisma.$queryRaw<any[]>`
          SELECT
            COALESCE(MIN(dept.DepName), '-') AS department_name,
            i.itemcode AS item_code,
            i.itemname AS item_name,
            MAX(i.Alternatename) AS alternatename,
            /** ตรง RfidStockTable: Qty = item.itemStocks.length (แถว itemstock ที่มี RfidCode ในตู้ — ไม่กรอง IsStock) */
            COALESCE(COUNT(*), 0) AS balance_qty,
            i.stock_max,
            i.stock_min,
            MIN(ist.ExpireDate) AS earliest_expire_date,
            MAX(CASE WHEN ist.ExpireDate IS NOT NULL AND ist.ExpireDate < CURDATE() THEN 1 ELSE 0 END) AS has_expired,
            MAX(CASE WHEN ist.ExpireDate IS NOT NULL AND ist.ExpireDate >= CURDATE() AND ist.ExpireDate <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS has_near_expire
          FROM item i
          INNER JOIN itemstock ist ON ist.ItemCode = i.itemcode
          INNER JOIN app_microservice_cabinets c ON ist.StockID = c.stock_id AND ist.StockID > 0
          LEFT JOIN (
            SELECT cd.cabinet_id, MIN(d.DepName) AS DepName
            FROM app_microservice_cabinet_departments cd
            INNER JOIN department d ON d.ID = cd.department_id
            GROUP BY cd.cabinet_id
          ) dept ON dept.cabinet_id = c.id
          WHERE 1=1
            ${params?.cabinetId != null ? Prisma.sql`AND c.id = ${params.cabinetId}` : Prisma.empty}
            ${params?.cabinetCode ? Prisma.sql`AND c.cabinet_code = ${params.cabinetCode}` : Prisma.empty}
            ${rfidOnlySql}
            ${activeItemSql}
            ${kwSql}
          GROUP BY i.itemcode, i.itemname, i.stock_max, i.stock_min
          ORDER BY i.itemcode
        `;
      } else {
        query = this.prisma.$queryRaw<any[]>`
          SELECT
            dept.DepName AS department_name,
            i.itemcode AS item_code,
            i.itemname AS item_name,
            MAX(i.Alternatename) AS alternatename,
            COALESCE(COUNT(*), 0) AS balance_qty,
            i.stock_max,
            i.stock_min,
            MIN(ist.ExpireDate) AS earliest_expire_date,
            MAX(CASE WHEN ist.ExpireDate IS NOT NULL AND ist.ExpireDate < CURDATE() THEN 1 ELSE 0 END) AS has_expired,
            MAX(CASE WHEN ist.ExpireDate IS NOT NULL AND ist.ExpireDate >= CURDATE() AND ist.ExpireDate <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS has_near_expire
          FROM item i
          INNER JOIN itemstock ist ON ist.ItemCode = i.itemcode
          INNER JOIN app_microservice_cabinets c ON ist.StockID = c.stock_id AND ist.StockID > 0
          INNER JOIN app_microservice_cabinet_departments cd_filter ON cd_filter.cabinet_id = c.id AND cd_filter.department_id = ${params!.departmentId!} AND cd_filter.status = 'ACTIVE'
          LEFT JOIN (
            SELECT cd.cabinet_id, MIN(d.DepName) AS DepName
            FROM app_microservice_cabinet_departments cd
            INNER JOIN department d ON d.ID = cd.department_id
            WHERE cd.department_id = ${params!.departmentId!} AND cd.status = 'ACTIVE'
            GROUP BY cd.cabinet_id
          ) dept ON dept.cabinet_id = c.id
          WHERE 1=1
            ${rfidOnlySql}
            ${activeItemSql}
            ${kwSql}
          GROUP BY dept.DepName, i.itemcode, i.itemname, i.stock_max, i.stock_min
          ORDER BY dept.DepName, i.itemcode
        `;
      }

      const rows = await query;

      type CabinetWorkRow = {
        device_name: string;
        expire_date_ymd: string;
        balance_qty: number;
        min_max_display: string;
        status_label: 'EXPIRED' | 'SOON' | 'LOW' | 'OK';
        _stock_min: number | null;
        _item_code: string;
      };

      const work: CabinetWorkRow[] = [];
      for (const row of rows as any[]) {
        const balanceQty = Number(row.balance_qty ?? 0);
        const smin = row.stock_min != null ? Number(row.stock_min) : null;
        const smax = row.stock_max != null ? Number(row.stock_max) : null;
        const name = String(row.item_name ?? '').trim();
        const alt = String(row.alternatename ?? '').trim();
        /** ลำดับเดียวกับหน้าเว็บ: itemname ก่อน แล้ว Alternatename */
        const deviceName = name || alt || String(row.item_code ?? '—');
        const earliest = row.earliest_expire_date ?? null;
        work.push({
          device_name: deviceName,
          expire_date_ymd: formatYmdReport(earliest),
          balance_qty: balanceQty,
          min_max_display: formatMinMaxCell(smin, smax),
          status_label: cabinetSummaryStatusLabel(earliest, balanceQty, smin),
          _stock_min: smin,
          _item_code: String(row.item_code ?? ''),
        });
      }

      const sortedPairs = work
        .map((dataRow, i) => ({ dataRow, rawRow: (rows as any[])[i] }))
        .sort((a, b) => {
          const hasExpiredA = Number(a.rawRow?.has_expired ?? 0) === 1;
          const hasExpiredB = Number(b.rawRow?.has_expired ?? 0) === 1;
          if (hasExpiredA !== hasExpiredB) return hasExpiredA ? -1 : 1;

          const hasNearExpireA = Number(a.rawRow?.has_near_expire ?? 0) === 1;
          const hasNearExpireB = Number(b.rawRow?.has_near_expire ?? 0) === 1;
          if (hasNearExpireA !== hasNearExpireB) return hasNearExpireA ? -1 : 1;

          const stockMinA = a.dataRow._stock_min ?? 0;
          const stockMinB = b.dataRow._stock_min ?? 0;
          const isLowStockA = stockMinA > 0 && a.dataRow.balance_qty < stockMinA;
          const isLowStockB = stockMinB > 0 && b.dataRow.balance_qty < stockMinB;
          if (isLowStockA !== isLowStockB) return isLowStockA ? -1 : 1;

          const expA = a.rawRow?.earliest_expire_date ? new Date(a.rawRow.earliest_expire_date).getTime() : 0;
          const expB = b.rawRow?.earliest_expire_date ? new Date(b.rawRow.earliest_expire_date).getTime() : 0;
          if (expA && expB) return expA - expB;

          return (a.dataRow._item_code || '').localeCompare(b.dataRow._item_code || '');
        });

      const statusChip = (params?.statusFilter ?? 'all').trim() || 'all';
      const filteredPairs =
        statusChip === 'all'
          ? sortedPairs
          : sortedPairs.filter(({ dataRow, rawRow }) =>
              cabinetStockRowMatchesStatusFilter(
                statusChip,
                dataRow.balance_qty,
                dataRow._stock_min,
                rawRow?.earliest_expire_date,
              ),
            );

      const data: CabinetStockReportData['data'] = filteredPairs.map(({ dataRow }) => ({
        device_name: dataRow.device_name,
        expire_date_ymd: dataRow.expire_date_ymd,
        balance_qty: dataRow.balance_qty,
        min_max_display: dataRow.min_max_display,
        status_label: dataRow.status_label,
      }));

      const totalQty = data.reduce((s, r) => s + r.balance_qty, 0);

      let filterDeptName: string | undefined;
      let filterCabinetName: string | undefined;
      if (params?.departmentId != null) {
        const dept = await this.prisma.department.findUnique({
          where: { ID: params.departmentId },
          select: { DepName: true },
        });
        filterDeptName = dept?.DepName ?? undefined;
      }
      if (params?.cabinetId != null) {
        const cab = await this.prisma.cabinet.findUnique({
          where: { id: params.cabinetId },
          select: { cabinet_name: true, cabinet_code: true },
        });
        filterCabinetName = cab?.cabinet_name ?? cab?.cabinet_code ?? undefined;
      } else if (params?.cabinetCode) {
        const cab = await this.prisma.cabinet.findFirst({
          where: { cabinet_code: params.cabinetCode },
          select: { cabinet_name: true },
        });
        filterCabinetName = cab?.cabinet_name ?? params.cabinetCode;
      }

      return {
        filters: {
          cabinetId: params?.cabinetId,
          cabinetCode: params?.cabinetCode,
          cabinetName: filterCabinetName,
          departmentId: params?.departmentId,
          departmentName: filterDeptName,
          keyword: params?.keyword?.trim() || undefined,
          statusFilter: statusChip !== 'all' ? statusChip : undefined,
        },
        summary: {
          total_rows: data.length,
          total_qty: totalQty,
        },
        data,
      };
    } catch (error) {
      console.error('[Report Service] Error getting Cabinet Stock data:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to get Cabinet Stock report data: ${errorMessage}`);
    }
  }

  /**
   * Generate Cabinet Stock Report (สต๊อกอุปกรณ์ในตู้) - Excel
   */
  async generateCabinetStockExcel(params: {
    cabinetId?: number;
    cabinetCode?: string;
    departmentId?: number;
    keyword?: string;
    statusFilter?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const reportData = await this.getCabinetStockData(params);
      const buffer = await this.cabinetStockReportExcelService.generateReport(reportData);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `cabinet_stock_report_${dateStr}.xlsx`;
      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Cabinet Stock Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Cabinet Stock Excel report: ${errorMessage}`);
    }
  }

  /**
   * Generate Cabinet Stock Report (สต๊อกอุปกรณ์ในตู้) - PDF
   */
  async generateCabinetStockPdf(params: {
    cabinetId?: number;
    cabinetCode?: string;
    departmentId?: number;
    keyword?: string;
    statusFilter?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const reportData = await this.getCabinetStockData(params);
      const buffer = await this.cabinetStockReportPdfService.generateReport(reportData);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `cabinet_stock_report_${dateStr}.pdf`;
      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Cabinet Stock PDF:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Cabinet Stock PDF report: ${errorMessage}`);
    }
  }

  /**
   * Generate Weighing Dispense Report (รายการเบิกตู้ Weighing) - Excel
   */
  async generateWeighingDispenseExcel(params: {
    stockId?: number;
    itemName?: string;
    itemcode?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const res = await this.weighingService.findDetailsBySign('-', {
        page: 1,
        limit: 10000,
        itemName: params?.itemName?.trim() || undefined,
        itemcode: params?.itemcode?.trim() || undefined,
        stockId: params?.stockId,
        dateFrom: params?.dateFrom?.trim() || undefined,
        dateTo: params?.dateTo?.trim() || undefined,
      });
      const rows = Array.isArray((res as any)?.data) ? (res as any).data : [];
      const totalQty = rows.reduce((sum: number, r: any) => sum + (Number(r?.Qty) || 0), 0);
      const employeeName = (r: any) => {
        const emp = r?.userCabinet?.legacyUser?.employee;
        if (!emp) return '-';
        const parts = [emp.FirstName, emp.LastName].filter(Boolean);
        return parts.length ? parts.join(' ') : '-';
      };
      const reportData: WeighingDispenseReportData = {
        filters: { stockId: params?.stockId, itemName: params?.itemName, itemcode: params?.itemcode, dateFrom: params?.dateFrom, dateTo: params?.dateTo },
        summary: { total_rows: rows.length, total_qty: totalQty },
        data: rows.map((r: any, i: number) => ({
          seq: i + 1,
          item_name: r?.item?.itemname || r?.item?.Alternatename || r?.itemcode || '-',
          cabinet_label: this.weighingRowCabinetLabel(r),
          operator_name: employeeName(r),
          qty: Number(r?.Qty) || 0,
          modify_date: this.reportModifyDateYmd(r?.ModifyDate),
        })),
      };
      const buffer = await this.weighingDispenseReportExcelService.generateReport(reportData);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `weighing_dispense_report_${dateStr}.xlsx`;
      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Weighing Dispense Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Weighing Dispense Excel report: ${errorMessage}`);
    }
  }

  /**
   * Generate Weighing Dispense Report (รายการเบิกตู้ Weighing) - PDF
   */
  async generateWeighingDispensePdf(params: {
    stockId?: number;
    itemName?: string;
    itemcode?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const res = await this.weighingService.findDetailsBySign('-', {
        page: 1,
        limit: 10000,
        itemName: params?.itemName?.trim() || undefined,
        itemcode: params?.itemcode?.trim() || undefined,
        stockId: params?.stockId,
        dateFrom: params?.dateFrom?.trim() || undefined,
        dateTo: params?.dateTo?.trim() || undefined,
      });
      const rows = Array.isArray((res as any)?.data) ? (res as any).data : [];
      const totalQty = rows.reduce((sum: number, r: any) => sum + (Number(r?.Qty) || 0), 0);
      const employeeName = (r: any) => {
        const emp = r?.userCabinet?.legacyUser?.employee;
        if (!emp) return '-';
        const parts = [emp.FirstName, emp.LastName].filter(Boolean);
        return parts.length ? parts.join(' ') : '-';
      };
      const reportData: WeighingDispenseReportData = {
        filters: { stockId: params?.stockId, itemName: params?.itemName, itemcode: params?.itemcode, dateFrom: params?.dateFrom, dateTo: params?.dateTo },
        summary: { total_rows: rows.length, total_qty: totalQty },
        data: rows.map((r: any, i: number) => ({
          seq: i + 1,
          item_name: r?.item?.itemname || r?.item?.Alternatename || r?.itemcode || '-',
          cabinet_label: this.weighingRowCabinetLabel(r),
          operator_name: employeeName(r),
          qty: Number(r?.Qty) || 0,
          modify_date: this.reportModifyDateYmd(r?.ModifyDate),
        })),
      };
      const buffer = await this.weighingDispenseReportPdfService.generateReport(reportData);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `weighing_dispense_report_${dateStr}.pdf`;
      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Weighing Dispense PDF:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Weighing Dispense PDF report: ${errorMessage}`);
    }
  }

  /**
   * Generate Weighing Refill Report (รายการเติมตู้ Weighing) - Excel
   */
  async generateWeighingRefillExcel(params: { stockId?: number; itemName?: string; itemcode?: string; dateFrom?: string; dateTo?: string }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const res = await this.weighingService.findDetailsBySign('+', {
        page: 1,
        limit: 10000,
        itemName: params?.itemName?.trim() || undefined,
        itemcode: params?.itemcode?.trim() || undefined,
        stockId: params?.stockId,
        dateFrom: params?.dateFrom?.trim() || undefined,
        dateTo: params?.dateTo?.trim() || undefined,
      });
      const rows = Array.isArray((res as any)?.data) ? (res as any).data : [];
      const totalQty = rows.reduce((sum: number, r: any) => sum + (Number(r?.Qty) || 0), 0);
      const employeeName = (r: any) => {
        const emp = r?.userCabinet?.legacyUser?.employee;
        if (!emp) return '-';
        const parts = [emp.FirstName, emp.LastName].filter(Boolean);
        return parts.length ? parts.join(' ') : '-';
      };
      const reportData: WeighingDispenseReportData = {
        filters: { stockId: params?.stockId, itemName: params?.itemName, itemcode: params?.itemcode, dateFrom: params?.dateFrom, dateTo: params?.dateTo },
        summary: { total_rows: rows.length, total_qty: totalQty },
        data: rows.map((r: any, i: number) => ({
          seq: i + 1,
          item_name: r?.item?.itemname || r?.item?.Alternatename || r?.itemcode || '-',
          cabinet_label: this.weighingRowCabinetLabel(r),
          operator_name: employeeName(r),
          qty: Number(r?.Qty) || 0,
          modify_date: this.reportModifyDateYmd(r?.ModifyDate),
        })),
      };
      const buffer = await this.weighingRefillReportExcelService.generateReport(reportData);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `weighing_refill_report_${dateStr}.xlsx`;
      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Weighing Refill Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Weighing Refill Excel report: ${errorMessage}`);
    }
  }

  /**
   * Generate Weighing Refill Report (รายการเติมตู้ Weighing) - PDF
   */
  async generateWeighingRefillPdf(params: { stockId?: number; itemName?: string; itemcode?: string; dateFrom?: string; dateTo?: string }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const res = await this.weighingService.findDetailsBySign('+', {
        page: 1,
        limit: 10000,
        itemName: params?.itemName?.trim() || undefined,
        itemcode: params?.itemcode?.trim() || undefined,
        stockId: params?.stockId,
        dateFrom: params?.dateFrom?.trim() || undefined,
        dateTo: params?.dateTo?.trim() || undefined,
      });
      const rows = Array.isArray((res as any)?.data) ? (res as any).data : [];
      const totalQty = rows.reduce((sum: number, r: any) => sum + (Number(r?.Qty) || 0), 0);
      const employeeName = (r: any) => {
        const emp = r?.userCabinet?.legacyUser?.employee;
        if (!emp) return '-';
        const parts = [emp.FirstName, emp.LastName].filter(Boolean);
        return parts.length ? parts.join(' ') : '-';
      };
      const reportData: WeighingDispenseReportData = {
        filters: { stockId: params?.stockId, itemName: params?.itemName, itemcode: params?.itemcode, dateFrom: params?.dateFrom, dateTo: params?.dateTo },
        summary: { total_rows: rows.length, total_qty: totalQty },
        data: rows.map((r: any, i: number) => ({
          seq: i + 1,
          item_name: r?.item?.itemname || r?.item?.Alternatename || r?.itemcode || '-',
          cabinet_label: this.weighingRowCabinetLabel(r),
          operator_name: employeeName(r),
          qty: Number(r?.Qty) || 0,
          modify_date: this.reportModifyDateYmd(r?.ModifyDate),
        })),
      };
      const buffer = await this.weighingRefillReportPdfService.generateReport(reportData);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `weighing_refill_report_${dateStr}.pdf`;
      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Weighing Refill PDF:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Weighing Refill PDF report: ${errorMessage}`);
    }
  }

  /**
   * Generate Weighing Stock Report (รายการสต๊อกในตู้ Weighing) - Excel
   */
  async generateWeighingStockExcel(params: {
    stockId?: number;
    itemName?: string;
    itemcode?: string;
    statusFilter?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const res = await this.weighingService.findAll({
        page: 1,
        limit: 10000,
        itemName: params?.itemName?.trim() || undefined,
        itemcode: params?.itemcode?.trim() || undefined,
        stockId: params?.stockId,
      });
      const rawRows = Array.isArray((res as any)?.data) ? (res as any).data : [];
      const chip = params?.statusFilter?.trim() || 'all';
      const rows = rawRows.filter((r: any) => weighingStockRowMatchesStatusFilter(r, chip));
      const totalQty = rows.reduce((sum: number, r: any) => sum + (Number(r?.Qty) || 0), 0);
      const cabinetName = (r: any) =>
        r?.cabinet ? r.cabinet.cabinet_name || r.cabinet.cabinet_code || '-' : '-';
      const slotDisplay = (v: any) => (v === 1 ? 'ใน' : v === 2 ? 'นอก' : v != null ? String(v) : '-');
      const reportData: WeighingStockReportData = {
        filters: { stockId: params?.stockId, itemName: params?.itemName, itemcode: params?.itemcode },
        summary: { total_rows: rows.length, total_qty: totalQty },
        data: rows.map((r: any, i: number) => ({
          seq: i + 1,
          item_name: r?.item?.itemname || r?.item?.Alternatename || r?.itemcode || '-',
          cabinet_name: cabinetName(r),
          slot_no: Number(r?.SlotNo) ?? 0,
          sensor: Number(r?.Sensor) ?? 0,
          channel_display: r?.SlotNo != null ? String(r.SlotNo) : '-',
          slot_display: slotDisplay(r?.Sensor),
          qty: Number(r?.Qty) || 0,
        })),
      };
      const buffer = await this.weighingStockReportExcelService.generateReport(reportData);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `weighing_stock_report_${dateStr}.xlsx`;
      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Weighing Stock Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Weighing Stock Excel report: ${errorMessage}`);
    }
  }

  /**
   * Generate Weighing Stock Report (รายการสต๊อกในตู้ Weighing) - PDF
   */
  async generateWeighingStockPdf(params: {
    stockId?: number;
    itemName?: string;
    itemcode?: string;
    statusFilter?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const res = await this.weighingService.findAll({
        page: 1,
        limit: 10000,
        itemName: params?.itemName?.trim() || undefined,
        itemcode: params?.itemcode?.trim() || undefined,
        stockId: params?.stockId,
      });
      const rawRows = Array.isArray((res as any)?.data) ? (res as any).data : [];
      const chip = params?.statusFilter?.trim() || 'all';
      const rows = rawRows.filter((r: any) => weighingStockRowMatchesStatusFilter(r, chip));
      const totalQty = rows.reduce((sum: number, r: any) => sum + (Number(r?.Qty) || 0), 0);
      const cabinetName = (r: any) =>
        r?.cabinet ? r.cabinet.cabinet_name || r.cabinet.cabinet_code || '-' : '-';
      const slotDisplay = (v: any) => (v === 1 ? 'ใน' : v === 2 ? 'นอก' : v != null ? String(v) : '-');
      const reportData: WeighingStockReportData = {
        filters: { stockId: params?.stockId, itemName: params?.itemName, itemcode: params?.itemcode },
        summary: { total_rows: rows.length, total_qty: totalQty },
        data: rows.map((r: any, i: number) => ({
          seq: i + 1,
          item_name: r?.item?.itemname || r?.item?.Alternatename || r?.itemcode || '-',
          cabinet_name: cabinetName(r),
          slot_no: Number(r?.SlotNo) ?? 0,
          sensor: Number(r?.Sensor) ?? 0,
          channel_display: r?.SlotNo != null ? String(r.SlotNo) : '-',
          slot_display: slotDisplay(r?.Sensor),
          qty: Number(r?.Qty) || 0,
        })),
      };
      const buffer = await this.weighingStockReportPdfService.generateReport(reportData);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `weighing_stock_report_${dateStr}.pdf`;
      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Weighing Stock PDF:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Weighing Stock PDF report: ${errorMessage}`);
    }
  }

  /**
   * รายงานรวมหน้า admin/items-stock — Excel 2 ชีต: Weighing (ทุกตู้) + RFID รวมทุกตู้
   */
  async generateItemsStockCombinedExcel(params: {
    itemName?: string;
    itemcode?: string;
    statusFilter?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const chip = params?.statusFilter?.trim() || 'all';

      const res = await this.weighingService.findAll({
        page: 1,
        limit: 10000,
        itemName: params?.itemName?.trim() || undefined,
        itemcode: params?.itemcode?.trim() || undefined,
        stockId: undefined,
      });
      const rawRows = Array.isArray((res as any)?.data) ? (res as any).data : [];
      const rows = rawRows.filter((r: any) => weighingStockRowMatchesStatusFilter(r, chip));
      const totalQty = rows.reduce((sum: number, r: any) => sum + (Number(r?.Qty) || 0), 0);
      const cabinetName = (r: any) =>
        r?.cabinet ? r.cabinet.cabinet_name || r.cabinet.cabinet_code || '-' : '-';
      const slotDisplay = (v: any) => (v === 1 ? 'ใน' : v === 2 ? 'นอก' : v != null ? String(v) : '-');
      const weighingReportData: WeighingStockReportData = {
        filters: { stockId: undefined, itemName: params?.itemName, itemcode: params?.itemcode },
        summary: { total_rows: rows.length, total_qty: totalQty },
        data: rows.map((r: any, i: number) => ({
          seq: i + 1,
          item_name: r?.item?.itemname || r?.item?.Alternatename || r?.itemcode || '-',
          cabinet_name: cabinetName(r),
          slot_no: Number(r?.SlotNo) ?? 0,
          sensor: Number(r?.Sensor) ?? 0,
          channel_display: r?.SlotNo != null ? String(r.SlotNo) : '-',
          slot_display: slotDisplay(r?.Sensor),
          qty: Number(r?.Qty) || 0,
        })),
      };

      // สอดคล้องรายการตู้บนหน้า items-stock (getAllCabinets ไม่กรอง cabinet_status)
      const cabinets = await this.prisma.cabinet.findMany({
        where: {
          stock_id: { not: null, gt: 0 },
        },
        select: {
          id: true,
          cabinet_name: true,
          cabinet_code: true,
          cabinet_type: true,
          cabinetTypeDef: { select: { code: true, show_rfid_code: true } },
        },
        orderBy: [{ cabinet_name: 'asc' }],
      });
      const rfidCabinets = cabinets.filter((c) => cabinetEntityStockTableMode(c) === 'RFID');

      const keyword = params?.itemName?.trim() || undefined;
      const rfidRows: ItemsStockCombinedRfidRow[] = [];
      let seq = 1;
      for (const c of rfidCabinets) {
        const reportData = await this.getCabinetStockData({
          cabinetId: c.id,
          keyword,
          statusFilter: chip,
        });
        const label = (c.cabinet_name || c.cabinet_code || `ตู้ #${c.id}`).trim();
        for (const d of reportData.data) {
          rfidRows.push({
            seq: seq++,
            cabinet_label: label,
            device_name: d.device_name,
            expire_date_ymd: d.expire_date_ymd,
            balance_qty: d.balance_qty,
            min_max_display: d.min_max_display,
            status_label: d.status_label,
          });
        }
      }

      const buffer = await this.itemsStockCombinedExcelService.generateReport({
        weighing: weighingReportData,
        rfid: {
          rows: rfidRows,
          filters: { keyword, statusFilter: chip !== 'all' ? chip : undefined },
        },
      });
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `items_stock_combined_report_${dateStr}.xlsx`;
      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Items Stock Combined Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Items Stock Combined Excel: ${errorMessage}`);
    }
  }

  /**
   * Get Dispensed Items for Patients Report Data
   * ดึงข้อมูลจาก medical supply usage ที่มี supply_items และเชื่อมโยงกับ dispensed items
   */
  async getDispensedItemsForPatientsData(params: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    patientHn?: string;
    departmentCode?: string;
    usageType?: string;
  }): Promise<DispensedItemsForPatientsReportData> {
    try {
      const baseWhere: any = {};
      if (params.startDate || params.endDate) {
        baseWhere.created_at = {};
        if (params.startDate) {
          baseWhere.created_at.gte = new Date(params.startDate + 'T00:00:00.000Z');
        }
        if (params.endDate) {
          baseWhere.created_at.lte = new Date(params.endDate + 'T23:59:59.999Z');
        }
      }
      if (params?.patientHn) {
        baseWhere.patient_hn = params.patientHn;
      }
      if (params?.departmentCode) {
        baseWhere.department_code = params.departmentCode;
      }
      if (params?.usageType) {
        baseWhere.usage_type = { contains: params.usageType };
      }
      if (params?.keyword?.trim()) {
        const keyword = params.keyword.trim();
        baseWhere.OR = [
          { first_name: { contains: keyword } },
          { lastname: { contains: keyword } },
          { patient_name_th: { contains: keyword } },
          { patient_name_en: { contains: keyword } },
          { en: { contains: keyword } },
          {
            supply_items: {
              some: {
                OR: [
                  { order_item_description: { contains: keyword } },
                  { supply_name: { contains: keyword } },
                  { order_item_code: { contains: keyword } },
                ],
              },
            },
          },
        ];
      }
      const [data, total] = await Promise.all([
        this.prisma.medicalSupplyUsage.findMany({
          where: baseWhere,
          include: {
            supply_items: true,
          },
          orderBy: {
            created_at: 'desc',
          },
        }),
        this.prisma.medicalSupplyUsage.count({ where: baseWhere }),
      ]);

      // Lookup ชื่อแผนกจาก Department table
      const uniqueDeptCodes = [...new Set(
        data.map((u) => u.department_code).filter((c): c is string => !!c)
      )];
      const deptIds = uniqueDeptCodes.map((c: string) => parseInt(c, 10)).filter((n) => !isNaN(n));
      const departments = deptIds.length > 0
        ? await this.prisma.department.findMany({
          where: { ID: { in: deptIds } },
          select: { ID: true, DepName: true },
        })
        : [];
      const deptMap = new Map<number, string>(
        departments.map((d) => [d.ID, d.DepName ?? ''])
      );

      const reportData: DispensedItemsForPatientsReportData['data'] = data.map((usage, index) => {
        const supplyItems = (usage as { supply_items?: Array<{ order_item_code?: string; supply_code?: string; order_item_description?: string; supply_name?: string; qty?: number; quantity?: number; uom?: string; unit?: string; assession_no?: string; order_item_status?: string }> }).supply_items ?? [];
        const supply_items: DispensedItemsForPatientsReportData['data'][0]['supply_items'] = supplyItems.map((item) => ({
          itemcode: item?.order_item_code ?? item?.supply_code ?? '-',
          itemname: item?.order_item_description ?? item?.supply_name ?? '-',
          qty: Number(item?.qty ?? item?.quantity ?? 0),
          uom: item?.uom ?? item?.unit ?? undefined,
          assession_no: item?.assession_no ?? undefined,
          order_item_status: item?.order_item_status ?? undefined,
        }));
        const patientName = [usage.first_name, usage.lastname].filter(Boolean).join(' ').trim()
          || (usage.patient_name_th ?? usage.patient_name_en ?? '-');
        const deptCodeInt = usage.department_code ? parseInt(usage.department_code, 10) : NaN;
        const resolvedDeptName = !isNaN(deptCodeInt) ? (deptMap.get(deptCodeInt) || usage.department_code) : (usage.department_code ?? undefined);
        return {
          usage_id: usage.id,
          seq: index + 1,
          patient_hn: usage.patient_hn ?? '-',
          patient_name: patientName,
          en: usage.en ?? undefined,
          department_code: usage.department_code ?? undefined,
          department_name: resolvedDeptName ?? undefined,
          usage_type: (usage as any).usage_type ?? undefined,
          dispensed_date: usage.usage_datetime ?? usage.created_at?.toISOString() ?? '',
          supply_items,
        };
      });

      // นับเฉพาะอุปกรณ์ที่มีสถานะยืนยัน (Verified) — รายการยกเลิกไม่นำมาคิด
      const isVerified = (status?: string) => {
        const s = (status ?? '').toLowerCase();
        return s === 'verified';
      };
      const totalQty = reportData.reduce(
        (sum, u) =>
          sum +
          u.supply_items.filter((i) => isVerified(i.order_item_status)).reduce((s, i) => s + i.qty, 0),
        0,
      );

      // หาชื่อแผนกจาก filter param
      const filterDeptId = params.departmentCode ? parseInt(params.departmentCode, 10) : NaN;
      const filterDeptName = !isNaN(filterDeptId) ? (deptMap.get(filterDeptId) || params.departmentCode) : params.departmentCode;

      return {
        filters: {
          keyword: params.keyword,
          startDate: params.startDate,
          endDate: params.endDate,
          patientHn: params.patientHn,
          departmentCode: params.departmentCode,
          departmentName: filterDeptName,
          usageType: params.usageType,
        },
        summary: {
          total_records: total,
          total_qty: totalQty,
          total_patients: data.length,
        },
        data: reportData,
      };
    } catch (error) {
      console.error('[Report Service] Error getting Dispensed Items for Patients data:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to get Dispensed Items for Patients report data: ${errorMessage}`);
    }
  }

  /**
   * Generate Dispensed Items for Patients Report (รายการเบิกอุปกรณ์ใช้กับคนไข้) - Excel
   */
  async generateDispensedItemsForPatientsExcel(params: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    patientHn?: string;
    departmentCode?: string;
    usageType?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const reportData = await this.getDispensedItemsForPatientsData(params);
      const buffer = await this.dispensedItemsForPatientsExcelService.generateReport(reportData);
      const dateStr = params.startDate ? params.startDate.replace(/\//g, '-') : new Date().toISOString().split('T')[0];
      const filename = `dispensed_items_for_patients_report_${dateStr}.xlsx`;
      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Dispensed Items for Patients Excel:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Dispensed Items for Patients Excel report: ${errorMessage}`);
    }
  }

  /**
   * Generate Dispensed Items for Patients Report (รายการเบิกอุปกรณ์ใช้กับคนไข้) - PDF
   */
  async generateDispensedItemsForPatientsPdf(params: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    patientHn?: string;
    departmentCode?: string;
    usageType?: string;
  }): Promise<{ buffer: Buffer; filename: string }> {
    try {
      const reportData = await this.getDispensedItemsForPatientsData(params);
      const buffer = await this.dispensedItemsForPatientsPdfService.generateReport(reportData);
      const dateStr = params.startDate ? params.startDate.replace(/\//g, '-') : new Date().toISOString().split('T')[0];
      const filename = `dispensed_items_for_patients_report_${dateStr}.pdf`;
      return { buffer, filename };
    } catch (error) {
      console.error('[Report Service] Error generating Dispensed Items for Patients PDF:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      throw new Error(`Failed to generate Dispensed Items for Patients PDF report: ${errorMessage}`);
    }
  }
}

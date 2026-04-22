import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateMedicalSupplyUsageDto,
  UpdateMedicalSupplyUsageDto,
  GetMedicalSupplyUsagesQueryDto,
  GetMedicalSupplyUsageLogsQueryDto,
  MedicalSupplyUsageResponse,
  RecordItemUsedWithPatientDto,
  RecordItemReturnDto,
  RecordStockReturnDto,
  GetPendingItemsQueryDto,
  GetReturnHistoryQueryDto,
  ItemStatus,
  ReturnReason,
} from './dto';

@Injectable()
export class MedicalSuppliesService {
  constructor(private prisma: PrismaService) {}

  // Create Log - เก็บ log ทุกกรณี รวม error
  private async createLog(usageId: number | null, actionData: any) {
    try {
      await this.prisma.medicalSupplyUsageLog.create({
        data: {
          usage_id: usageId,
          action: actionData,
        },
      });
    } catch (error) {
      console.error('Failed to create log:', error);
    }
  }

  /**
   * Normalize DateBillPrinted to YYYY-MM-DD.
   * Accepts: "23/02/2026" (DD/MM/YYYY), "2026-02-23" (YYYY-MM-DD), or "23-02-2026" (DD-MM-YYYY).
   * Returns null if input is empty or invalid.
   */
  private normalizeDateToYyyyMmDd(value: string | null | undefined): string | null {
    const s = typeof value === 'string' ? value.trim() : '';
    if (!s) return null;
    // Already YYYY-MM-DD
    const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    // DD/MM/YYYY (e.g. 23/02/2026)
    const dmySlash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (dmySlash) {
      const [, d, m, y] = dmySlash;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    // DD-MM-YYYY
    const dmyDash = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(s);
    if (dmyDash) {
      const [, d, m, y] = dmyDash;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    // Fallback: try Date parse and format as YYYY-MM-DD
    try {
      const date = new Date(s);
      if (!Number.isNaN(date.getTime())) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
    } catch {
      // ignore
    }
    return null;
  }


  // Validate single ItemCode - ตรวจสอบว่า ItemCode มีในระบบหรือไม่
  async validateItemCode(itemCode: string): Promise<{ exists: boolean; item?: any }> {
    try {
      if (!itemCode) {
        return { exists: false };
      }

      const item = await this.prisma.item.findFirst({
        where: {
          itemcode: itemCode,
        },
      });

      return {
        exists: !!item,
        item: item || null,
      };
    } catch (error) {
      console.error('Error validating ItemCode:', error);
      throw new BadRequestException(`Failed to validate ItemCode: ${itemCode}`);
    }
  }

  // Validate multiple ItemCodes - ตรวจสอบ ItemCode หลายตัวพร้อมกัน
  async validateItemCodes(itemCodes: string[]): Promise<{
    valid: string[];
    invalid: string[];
    items: any[];
  }> {
    try {
      if (!itemCodes || itemCodes.length === 0) {
        return { valid: [], invalid: [], items: [] };
      }

      // Remove duplicates
      const uniqueCodes = [...new Set(itemCodes)];

      const items = await this.prisma.item.findMany({
        where: {
          itemcode: {
            in: uniqueCodes,
          },
        },
      });

      const foundCodes = items.map(item => item.itemcode);
      const invalidCodes = uniqueCodes.filter(code => !foundCodes.includes(code));

      return {
        valid: foundCodes,
        invalid: invalidCodes,
        items: items,
      };
    } catch (error) {
      console.error('Error validating ItemCodes:', error);
      throw new BadRequestException('Failed to validate ItemCodes');
    }
  }

  // Check Staff User by client_id
  async checkStaffUser(client_id: string): Promise<{ user: any; userType: string } | null> {
    try {
      const staffUser = await this.prisma.staffUser.findUnique({
        where: { client_id },
        select: {
          id: true,
          email: true,
          fname: true,
          lname: true,
          is_active: true,
        }
      });

      if (staffUser && staffUser.is_active) {
        return {
          user: {
            id: staffUser.id,
            email: staffUser.email,
            name: `${staffUser.fname} ${staffUser.lname}`.trim(),
            is_active: staffUser.is_active
          },
          userType: 'staff'
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking staff user:', error);
      return null;
    }
  }

  /**
   * Resolve department_code and usage_type from PatientLocationwhenOrdered
   * Format: "{DepartmentName}-{OPD|IPD}" e.g. "Emergency-OPD", "Emergency-IPD"
   * ส่วนหน้า "-" ใช้เทียบกับ department.DepName2, ส่วนหลัง "-" คือ usage_type (OPD/IPD)
   */
  private async resolveDepartmentCodeFromDepName2(
    patientLocationWhenOrdered: string | undefined,
  ): Promise<{ departmentCode: string | null; usageType: string | null }> {
    if (!patientLocationWhenOrdered || !patientLocationWhenOrdered.trim()) {
      return { departmentCode: null, usageType: null };
    }
    try {
      const raw = patientLocationWhenOrdered.trim();
      const dashIdx = raw.lastIndexOf('-');
      // ถ้ามี "-" ให้แยก departmentPart กับ usageTypePart
      const departmentPart = dashIdx > 0 ? raw.substring(0, dashIdx).trim() : raw;
      const usageTypePart = dashIdx > 0 ? raw.substring(dashIdx + 1).trim().toUpperCase() : null;
      // รับเฉพาะ OPD / IPD เป็น usage_type
      const usageType = usageTypePart === 'OPD' || usageTypePart === 'IPD' ? usageTypePart : null;

      const dept = await this.prisma.department.findFirst({
        where: { DepName2: departmentPart },
        select: { ID: true },
      });
      return { departmentCode: dept ? String(dept.ID) : null, usageType };
    } catch {
      return { departmentCode: null, usageType: null };
    }
  }

  // Create - รับ JSON format ใหม่: Hospital, EN, HN, FirstName, Lastname, Order, DateBillPrinted, TimeBillPrinted
  async create(data: CreateMedicalSupplyUsageDto, userContext?: { user: any; userType: string }): Promise<MedicalSupplyUsageResponse> {
    try {
      // Support both new format (EN, HN, FirstName, Lastname, Order) and legacy format
      const patientHn = data.HN || data.patient_hn || '';
      const episodeNumber = data.EN || '';
      const firstName = data.FirstName || '';
      const lastname = data.Lastname || '';
      const hospital = data.Hospital || null;

      // Resolve department_code and usage_type from first Order item's PatientLocationwhenOrdered
      const orderItems = data.Order || [];
      const firstOrderItem = orderItems[0];
      const resolved = await this.resolveDepartmentCodeFromDepName2(
        firstOrderItem?.PatientLocationwhenOrdered,
      );
      const departmentCode = data.department_code ?? resolved.departmentCode ?? null;
      // usage_type: ใช้ค่าจาก data ก่อน ถ้าไม่มีให้ใช้ค่าที่ parse จาก PatientLocationwhenOrdered
      const resolvedUsageType = data.usage_type ?? resolved.usageType ?? null;

      // Validate department: ต้องมี department อยู่ในระบบ
      if (!departmentCode) {
        const rawLoc = firstOrderItem?.PatientLocationwhenOrdered ?? '';
        const dashIdx = rawLoc.lastIndexOf('-');
        const deptPart = dashIdx > 0 ? rawLoc.substring(0, dashIdx).trim() : rawLoc;
        throw new BadRequestException(
          `ไม่พบข้อมูลแผนก: "${deptPart || rawLoc}" กรุณาตรวจสอบ PatientLocationwhenOrdered (รูปแบบ: <ชื่อแผนก>-<OPD|IPD>) หรือ department_code`,
        );
      }
      const deptIdNum = parseInt(departmentCode, 10);
      const deptRecord = isNaN(deptIdNum)
        ? null
        : await this.prisma.department.findUnique({
          where: { ID: deptIdNum },
          select: { ID: true, DepName: true, DepName2: true },
        });
      if (!deptRecord) {
        throw new BadRequestException(
          `ไม่พบแผนก (department_code: ${departmentCode}) ในระบบ`,
        );
      }

      const printDate = this.normalizeDateToYyyyMmDd(data.DateBillPrinted) ?? (data.DateBillPrinted?.trim() || null);
      const timePrintDate = data.TimeBillPrinted ?? null;

      // Generate recorded_by_user_id from userContext
      let recordedByUserId = data.recorded_by_user_id;
      let finalUserType = 'admin';
      let finalUser: any = null;

      if (userContext && userContext.user) {
        // If userType is 'unknown', check if it's staff (userContext.user is { client_id: '...' } or string)
        if (userContext.userType === 'unknown') {
          const clientId = typeof userContext.user === 'string'
            ? userContext.user
            : userContext.user.client_id;

          if (clientId) {
            const staffCheck = await this.checkStaffUser(clientId);
            if (staffCheck) {
              finalUserType = 'staff';
              finalUser = staffCheck.user;
            } else {
              throw new BadRequestException('Invalid client credential. Not found in admin or staff users.');
            }
          }
        } else if (userContext.user.id) {
          // Normal case: user already validated (admin or staff from auth-service)
          finalUserType = userContext.userType || 'admin';
          finalUser = userContext.user;
        }
      }

      if (finalUser && finalUser.id) {
        recordedByUserId = `${finalUserType}:${finalUser.id}`;
      }

      // Determine if using new format (Order) or legacy format (supplies)
      const legacySupplies = data.supplies || [];

      // Check if there's an existing usage with same EN, HN, FirstName, Lastname
      let existingUsage: (Prisma.MedicalSupplyUsageGetPayload<{
        include: { supply_items: true }
      }> | null) = null;

      if (episodeNumber && patientHn && firstName && lastname) {
        existingUsage = await this.prisma.medicalSupplyUsage.findFirst({
          where: {
            en: episodeNumber,
            patient_hn: patientHn,
            first_name: firstName,
            lastname: lastname,
          },
          include: {
            supply_items: true,
          },
          orderBy: {
            created_at: 'desc',
          },
        });
      }

      // If existing usage found, process items based on AssessionNo
      if (existingUsage && orderItems.length > 0) {
        const itemsToUpdate: Array<{ item: any; newStatus: string }> = [];
        const itemsToCreate: typeof orderItems = [];
        const discontinueItemsInOrder: typeof orderItems = [];
        const discontinueAffectedUsageIds = new Set<number>();

        for (const orderItem of orderItems) {
          // Check if this is a discontinue item (both "discontinue" and "discontinued" are valid)
          const itemStatusLower = orderItem.ItemStatus?.toLowerCase() || '';
          const isDiscontinue = itemStatusLower === 'discontinue' || itemStatusLower === 'discontinued';

          if (isDiscontinue && orderItem.AssessionNo) {
            // Handle discontinue items separately - find and update ALL existing items with same AssessionNo
            // Search across all usage records, not just the current one
            const allItemsWithSameAssessionNo = await this.prisma.supplyUsageItem.findMany({
              where: {
                assession_no: orderItem.AssessionNo,
                order_item_status: {
                  not: 'Discontinue', // Only update items that are not already discontinued
                },
              },
              include: {
                usage: true,
              },
            });

            // Update all items with the same AssessionNo to Discontinue
            for (const item of allItemsWithSameAssessionNo) {
              discontinueAffectedUsageIds.add(item.medical_supply_usage_id);
              await this.prisma.supplyUsageItem.update({
                where: { id: item.id },
                data: {
                  order_item_status: 'Discontinue', // Always use 'Discontinue' (not 'Discontinued')
                  qty_used_with_patient: 0, // Set to 0 to reflect cancellation
                },
              });

              await this.createLog(item.medical_supply_usage_id, {
                type: 'UPDATE',
                status: 'SUCCESS',
                action: 'discontinue_item',
                assession_no: orderItem.AssessionNo,
                item_code: item.order_item_code,
                old_status: item.order_item_status,
                new_status: 'Discontinue',
                reason: 'ItemStatus updated to Discontinue - all items with same AssessionNo are discontinued',
              });
            }
            // Store for later processing in discontinue section if needed
            discontinueItemsInOrder.push(orderItem);
            // Continue to create new item even if AssessionNo matches (don't skip creation)
            // The item will be created with Discontinue status as specified in JSON
          }

          // Find existing item with same AssessionNo in current usage
          // Skip if this is a Discontinue item (already processed above, but still need to create)
          if (isDiscontinue && orderItem.AssessionNo) {
            // For Discontinue items, always create new item even if AssessionNo matches
            // (existing items with same AssessionNo were already updated to Discontinue above)
            itemsToCreate.push(orderItem);
          } else {
            // For non-Discontinue items: match by AssessionNo + ItemCode (หนึ่งบิลมีหลาย line ได้)
            const existingItem = existingUsage.supply_items.find(
              (item) => item.assession_no === orderItem.AssessionNo &&
                item.order_item_code === orderItem.ItemCode &&
                item.order_item_status?.toLowerCase() !== 'discontinue'
            );

            if (existingItem) {
              // If same AssessionNo + ItemCode found, update ItemStatus only
              itemsToUpdate.push({
                item: existingItem,
                newStatus: orderItem.ItemStatus || existingItem.order_item_status || 'Verified',
              });
            } else {
              // Different line (AssessionNo+ItemCode) → add new item
              itemsToCreate.push(orderItem);
            }
          }
        }

        // Update existing items' status
        for (const { item, newStatus } of itemsToUpdate) {
          await this.prisma.supplyUsageItem.update({
            where: { id: item.id },
            data: {
              order_item_status: newStatus,
            },
          });

          await this.createLog(existingUsage.id, {
            type: 'UPDATE',
            status: 'SUCCESS',
            action: 'update_item_status',
            assession_no: item.assession_no,
            item_code: item.order_item_code,
            old_status: item.order_item_status,
            new_status: newStatus,
            reason: 'ItemStatus updated based on AssessionNo match',
          });
        }

        // Add new items if any
        if (itemsToCreate.length > 0) {
          // Validate ItemCodes for new items
          const newItemCodes = itemsToCreate.map((item) => item.ItemCode).filter((code) => code);
          if (newItemCodes.length > 0) {
            const validation = await this.validateItemCodes(newItemCodes);
            if (validation.invalid.length > 0) {
              await this.createLog(null, {
                type: 'CREATE',
                status: 'ERROR',
                action: 'create_medical_supply_usage',
                error_message: `Invalid ItemCodes found: ${validation.invalid.join(', ')}`,
                invalid_item_codes: validation.invalid,
                input_data: data,
              });

              throw new BadRequestException({
                message: 'Invalid ItemCodes found',
                invalidCodes: validation.invalid,
                validCodes: validation.valid,
              });
            }
          }

          // Create new supply items
          await this.prisma.supplyUsageItem.createMany({
            data: itemsToCreate.map((item): Prisma.SupplyUsageItemCreateManyInput => ({
              medical_supply_usage_id: existingUsage.id,
              order_item_code: item.ItemCode,
              order_item_description: item.ItemDescription,
              assession_no: item.AssessionNo,
              order_item_status: item.ItemStatus || 'Verified',
              qty: typeof item.QTY === 'string' ? parseInt(item.QTY) || 0 : item.QTY,
              uom: item.UOM,
              supply_code: item.ItemCode,
              supply_name: item.ItemDescription,
              supply_category: null,
              unit: item.UOM,
              quantity: typeof item.QTY === 'string' ? parseInt(item.QTY) || 0 : item.QTY,
              unit_price: null,
              total_price: null,
              expiry_date: null,
            })),
          });

          await this.createLog(existingUsage.id, {
            type: 'UPDATE',
            status: 'SUCCESS',
            action: 'add_new_items',
            hospital: hospital,
            en: episodeNumber,
            patient_hn: patientHn,
            first_name: firstName,
            lastname: lastname,
            new_items_count: itemsToCreate.length,
            reason: 'New items added based on new AssessionNo',
          });
        }

        // Update usage metadata if provided (billing, print_date, time_print_date, department_code)
        const hasBillingUpdate = data.billing_status || data.billing_total !== undefined;
        const hasPrintUpdate = data.DateBillPrinted !== undefined || data.TimeBillPrinted !== undefined || departmentCode !== null;
        if (hasBillingUpdate || hasPrintUpdate) {
          const updateData: Prisma.MedicalSupplyUsageUpdateInput = {};
          if (hasBillingUpdate) {
            updateData.billing_status = data.billing_status || existingUsage.billing_status;
            updateData.billing_subtotal = data.billing_subtotal ?? existingUsage.billing_subtotal;
            updateData.billing_tax = data.billing_tax ?? existingUsage.billing_tax;
            updateData.billing_total = data.billing_total ?? existingUsage.billing_total;
            updateData.billing_currency = data.billing_currency || existingUsage.billing_currency || 'THB';
          }
          if (data.DateBillPrinted !== undefined) {
            updateData.print_date = this.normalizeDateToYyyyMmDd(data.DateBillPrinted) ?? data.DateBillPrinted?.trim() ?? undefined;
          }
          if (data.TimeBillPrinted !== undefined) updateData.time_print_date = data.TimeBillPrinted;
          if (departmentCode !== null) updateData.department_code = departmentCode;
          if (resolvedUsageType !== null) updateData.usage_type = resolvedUsageType;
          await this.prisma.medicalSupplyUsage.update({
            where: { id: existingUsage.id },
            data: updateData,
          });
        }

        // กรณีมีการยกเลิก (Discontinue) อัปเดต updated_at ของ MedicalSupplyUsage ที่ได้รับผลกระทบ
        const usageIdsToTouch = new Set(discontinueAffectedUsageIds);
        usageIdsToTouch.add(existingUsage.id);
        if (usageIdsToTouch.size > 0) {
          await this.prisma.medicalSupplyUsage.updateMany({
            where: { id: { in: Array.from(usageIdsToTouch) } },
            data: { updated_at: new Date() },
          });
        }

        // Return updated usage
        const updatedUsage = await this.prisma.medicalSupplyUsage.findUnique({
          where: { id: existingUsage.id },
          include: {
            supply_items: true,
          },
        });

        return updatedUsage as unknown as MedicalSupplyUsageResponse;
      }

      // Handle Discontinue items: Update existing items with same assession_no in the same episode
      // Only process discontinue items if we haven't already processed them above (when existingUsage was found)
      const discontinueItems = existingUsage
        ? [] // Already processed above, skip here
        : orderItems.filter(item => {
          const statusLower = item.ItemStatus?.toLowerCase() || '';
          return (statusLower === 'discontinue' || statusLower === 'discontinued') && item.AssessionNo;
        });

      if (discontinueItems.length > 0 && episodeNumber) {
        // First, find all medical supply usages for this episode
        const episodeUsages = await this.prisma.medicalSupplyUsage.findMany({
          where: {
            en: episodeNumber,
            patient_hn: patientHn,
          },
          include: {
            supply_items: true,
          },
        });

        if (episodeUsages.length === 0) {
          throw new BadRequestException(
            `No existing medical supply usage found for EN: ${episodeNumber}, HN: ${patientHn}. Cannot discontinue items without existing records.`
          );
        }

        // Update billing_status to reflect cancellation if needed
        const updatedUsageIds = new Set<number>();

        for (const discontinueItem of discontinueItems) {
          // Find ALL existing items with the same assession_no across ALL usage records
          const allItemsWithSameAssessionNo = await this.prisma.supplyUsageItem.findMany({
            where: {
              assession_no: discontinueItem.AssessionNo,
              order_item_status: {
                not: 'Discontinue', // Only update items that are not already discontinued
              },
            },
            include: {
              usage: true,
            },
          });

          // Track which usage records are affected
          for (const item of allItemsWithSameAssessionNo) {
            updatedUsageIds.add(item.medical_supply_usage_id);
          }

          // Cancel/Discontinue ALL items with the same AssessionNo
          for (const existingItem of allItemsWithSameAssessionNo) {
            await this.prisma.supplyUsageItem.update({
              where: { id: existingItem.id },
              data: {
                order_item_status: 'Discontinue', // Always use 'Discontinue' (not 'Discontinued')
                // Set qty_used_with_patient to 0 to reflect cancellation
                qty_used_with_patient: 0,
              },
            });

            // Log the cancellation
            await this.createLog(existingItem.medical_supply_usage_id, {
              type: 'UPDATE',
              status: 'SUCCESS',
              action: 'discontinue_item',
              assession_no: discontinueItem.AssessionNo,
              item_code: existingItem.order_item_code,
              reason: 'Bill cancelled - Discontinue status received. All items with same AssessionNo are discontinued.',
              cancelled_qty: existingItem.qty,
              original_qty: existingItem.qty,
            });
          }
        }

        // Update billing_status for affected usages
        for (const usageId of updatedUsageIds) {
          await this.prisma.medicalSupplyUsage.update({
            where: { id: usageId },
            data: {
              billing_status: data.billing_status || 'CANCELLED',
            },
          });

          await this.createLog(usageId, {
            type: 'UPDATE',
            status: 'SUCCESS',
            action: 'update_billing_status_for_discontinue',
            billing_status: data.billing_status || 'CANCELLED',
            reason: 'Updated billing status due to Discontinue items',
          });
        }
      }

      // Include all items for creation, including Discontinue items
      // (Discontinue items will create new records with Discontinue status)
      const itemsToCreate = orderItems;

      // Validate ItemCodes ก่อนสร้าง usage (only for items to be created, not Discontinue)
      const allItemCodes = [
        ...itemsToCreate.map(item => item.ItemCode),
        ...legacySupplies.map(item => item.supply_code),
      ].filter(code => code); // Remove empty codes

      if (allItemCodes.length > 0) {
        const validation = await this.validateItemCodes(allItemCodes);

        if (validation.invalid.length > 0) {
          // Log validation error
          await this.createLog(null, {
            type: 'CREATE',
            status: 'ERROR',
            action: 'create_medical_supply_usage',
            error_message: `Invalid ItemCodes found: ${validation.invalid.join(', ')}`,
            invalid_item_codes: validation.invalid,
            input_data: data,
          });

          throw new BadRequestException({
            message: 'Invalid ItemCodes found',
            invalidCodes: validation.invalid,
            validCodes: validation.valid,
          });
        }

      }

      // If no items to create at all, return error (should not happen)
      if (itemsToCreate.length === 0 && legacySupplies.length === 0) {
        throw new BadRequestException(
          `No items to create for EN: ${episodeNumber}, HN: ${patientHn}`
        );
      }

      const usage = await this.prisma.medicalSupplyUsage.create({
        data: {
          hospital: hospital,
          en: episodeNumber,
          patient_hn: patientHn,
          first_name: firstName,
          lastname: lastname,
          // Legacy fields for backward compatibility
          patient_name_th: data.patient_name_th || `${firstName} ${lastname}`,
          patient_name_en: data.patient_name_en || `${firstName} ${lastname}`,
          usage_datetime: data.usage_datetime,
          usage_type: resolvedUsageType,
          purpose: data.purpose,
          department_code: departmentCode,
          print_date: printDate,
          time_print_date: timePrintDate,
          recorded_by_user_id: recordedByUserId,
          billing_status: data.billing_status,
          billing_subtotal: data.billing_subtotal,
          billing_tax: data.billing_tax,
          billing_total: data.billing_total,
          billing_currency: data.billing_currency || 'THB',

          // Create supply items
          supply_items: {
            create: [
              // New format: Order items (only Verified or other non-Discontinue items)
              ...itemsToCreate.map(item => ({
                order_item_code: item.ItemCode,
                order_item_description: item.ItemDescription,
                assession_no: item.AssessionNo,
                order_item_status: item.ItemStatus || 'Verified', // Default to Verified if not specified
                qty: typeof item.QTY === 'string' ? parseInt(item.QTY) || 0 : item.QTY,
                uom: item.UOM,
                // Keep legacy fields as null for new format
                supply_code: item.ItemCode,
                supply_name: item.ItemDescription,
                supply_category: null,
                unit: item.UOM,
                quantity: typeof item.QTY === 'string' ? parseInt(item.QTY) || 0 : item.QTY,
                unit_price: null,
                total_price: null,
                expiry_date: null,
              })),
              // Legacy format: supplies
              ...legacySupplies.map(item => ({
                order_item_code: item.supply_code,
                order_item_description: item.supply_name,
                assession_no: '',
                order_item_status: 'Verified', // Default to Verified for legacy format
                qty: item.quantity,
                uom: item.unit,
                // Legacy fields
                supply_code: item.supply_code,
                supply_name: item.supply_name,
                supply_category: item.supply_category,
                unit: item.unit,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
                expiry_date: item.expiry_date,
              })),
            ],
          },
        },
        include: {
          supply_items: true,
        },
      });

      // Create success log
      await this.createLog(usage.id, {
        type: 'CREATE',
        status: 'SUCCESS',
        hospital: hospital,
        en: episodeNumber,
        patient_hn: patientHn,
        first_name: firstName,
        lastname: lastname,
        user_id: recordedByUserId,
        order_items_count: itemsToCreate.length,
        discontinue_items_count: discontinueItems.length,
        supplies_count: legacySupplies.length,
        total_amount: data.billing_total,
      });

      return usage as unknown as MedicalSupplyUsageResponse;
    } catch (error) {
      // Create error log
      await this.createLog(null, {
        type: 'CREATE',
        status: 'ERROR',
        hospital: data.Hospital,
        en: data.EN,
        patient_hn: data.HN || data.patient_hn,
        first_name: data.FirstName,
        lastname: data.Lastname,
        user_id: data.recorded_by_user_id,
        error_message: error.message,
        error_code: error.code,
        input_data: data,
      });
      throw error;
    }
  }

  // Get All with Pagination
  async findAll(query: GetMedicalSupplyUsagesQueryDto): Promise<{
    data: MedicalSupplyUsageResponse[];
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  }> {
    try {
      const page = Math.max(1, Number(query?.page) || 1);
      const limit = Math.min(500, Math.max(1, Number(query?.limit) || 10));
      const skip = (page - 1) * limit;

      // Build where clause - support both HN and patient_hn
      const baseWhere: any = {};


      if (query.patient_hn || query.HN) {
        baseWhere.patient_hn = query.patient_hn || query.HN;
      }
      if (query.EN) {
        baseWhere.en = query.EN;
      }
      if (query.first_name) {
        baseWhere.first_name = { contains: query.first_name };
      }
      if (query.lastname) {
        baseWhere.lastname = { contains: query.lastname };
      }
      if (query.department_code) {
        baseWhere.department_code = query.department_code;
      } else if (query.department_name && query.department_name.trim()) {
        // กรองตามชื่อแผนก (DepName/DepName2)
        const nameTrim = query.department_name.trim();
        const depts = await this.prisma.department.findMany({
          where: {
            OR: [
              { DepName: { contains: nameTrim } },
              { DepName2: { contains: nameTrim } },
            ],
          },
          select: { ID: true },
        });
        const deptIds = depts.map((d) => String(d.ID));
        if (deptIds.length > 0) {
          baseWhere.department_code = { in: deptIds };
        } else {
          baseWhere.department_code = '__no_match__';
        }
      }
      if (query.print_date && query.print_date.trim()) {
        baseWhere.print_date = { contains: query.print_date.trim() };
      }
      if (query.time_print_date && query.time_print_date.trim()) {
        baseWhere.time_print_date = { contains: query.time_print_date.trim() };
      }
      if (query.billing_status) {
        baseWhere.billing_status = query.billing_status;
      }
      if (query.usage_type) {
        baseWhere.usage_type = query.usage_type;
      }

      // Date range filter - use created_at instead of usage_datetime
      if (query.startDate || query.endDate) {
        baseWhere.created_at = {};
        if (query.startDate) {
          baseWhere.created_at.gte = new Date(query.startDate + 'T00:00:00.000Z');
        }
        if (query.endDate) {
          const endDate = new Date(query.endDate + 'T23:59:59.999Z');
          baseWhere.created_at.lte = endDate;
        }
      }

      // Keyword filter (search in patient name, EN, and item names)
      const keywordConditions: any[] = [];
      if (query.keyword) {
        const keyword = query.keyword.trim();
        keywordConditions.push(
          { first_name: { contains: keyword } },
          { lastname: { contains: keyword } },
          { patient_name_th: { contains: keyword } },
          { patient_name_en: { contains: keyword } },
          { en: { contains: keyword } },
          // Search in item names/descriptions เฉพาะรายการที่ order_item_status != 'Discontinue'
          {
            supply_items: {
              some: {
                order_item_status: {
                  // not: 'Discontinue',
                },
                OR: [
                  { order_item_description: { contains: keyword } },
                  { supply_name: { contains: keyword } },
                  { order_item_code: { contains: keyword } },
                ],
              },
            },
          }
        );
      }

      // User name filter - search by recorded_by_user_id
      let recordedByConditions: string[] = [];
      if (query.user_name) {
        const userName = query.user_name.trim();

        // Find admin users matching the name
        const adminUsers = await this.prisma.user.findMany({
          where: {
            name: { contains: userName },
            is_active: true,
          },
          select: { id: true },
        });

        // Find staff users matching fname or lname
        const staffUsers = await this.prisma.staffUser.findMany({
          where: {
            OR: [
              { fname: { contains: userName } },
              { lname: { contains: userName } },
            ],
            is_active: true,
          },
          select: { id: true },
        });

        // Build recorded_by_user_id conditions
        adminUsers.forEach(user => {
          recordedByConditions.push(`admin:${user.id}`);
        });
        staffUsers.forEach(user => {
          recordedByConditions.push(`staff:${user.id}`);
        });

        // Only add filter if we found matching users
        if (recordedByConditions.length > 0) {
          baseWhere.recorded_by_user_id = { in: recordedByConditions };
        } else {
          // If no users found, return empty result immediately
          return {
            data: [],
            total: 0,
            page,
            limit,
            lastPage: 0,
          };
        }
      }



      // Filter by assession_no in SupplyUsageItem if provided
      if (query.assession_no) {
        baseWhere.supply_items = {
          some: {
            assession_no: { contains: query.assession_no },
          },
        };
      }

      // Combine all conditions properly
      const where: any = { ...baseWhere };

      // Add keyword OR conditions if exists
      if (keywordConditions.length > 0) {
        // If we already have other conditions, use AND to combine
        if (Object.keys(baseWhere).length > 0) {
          const andArray: any[] = [];
          // Add all baseWhere conditions as individual AND conditions
          Object.keys(baseWhere).forEach(key => {
            andArray.push({ [key]: baseWhere[key] });
          });
          // Add keyword OR condition
          andArray.push({ OR: keywordConditions });
          where.AND = andArray;
          // Remove individual properties since they're now in AND
          Object.keys(baseWhere).forEach(key => delete where[key]);
        } else {
          where.OR = keywordConditions;
        }
      }

      // Debug: Log where clause for troubleshooting

      const [data, total] = await Promise.all([
        this.prisma.medicalSupplyUsage.findMany({
          where,
          include: {
            supply_items: true,
          },
          skip,
          take: limit,
          orderBy: {
            created_at: 'desc',
          },
        }),
        this.prisma.medicalSupplyUsage.count({ where }),
      ]);

      // Resolve department names (department_code → DepName/DepName2)
      const deptCodes = [...new Set(data.map((u) => u.department_code).filter(Boolean))] as string[];
      const departmentNameByCode = new Map<string, string>();
      if (deptCodes.length > 0) {
        const deptIds = deptCodes.map((c) => parseInt(c, 10)).filter((n) => !Number.isNaN(n));
        if (deptIds.length > 0) {
          const departments = await this.prisma.department.findMany({
            where: { ID: { in: deptIds } },
            select: { ID: true, DepName: true, DepName2: true },
          });
          departments.forEach((d) => {
            const name = d.DepName ?? d.DepName2 ?? null;
            if (name) departmentNameByCode.set(String(d.ID), name);
          });
        }
      }

      // Add qty_pending to each item and resolve user names + department_name
      const dataWithPending = await Promise.all(data.map(async (usage) => {
        // Resolve user name from recorded_by_user_id
        let recordedByName = '-';
        let recordedByDisplay = usage.recorded_by_user_id || '-';
        let recordedByUserId = usage.recorded_by_user_id || '-';

        if (usage.recorded_by_user_id) {
          // Check if format is "admin:X" or "staff:X" or just "X"
          const parts = usage.recorded_by_user_id.split(':');
          let userType: string | null = null;
          let userId: string | null = null;

          if (parts.length === 2) {
            // Format: "admin:X" or "staff:X"
            userType = parts[0];
            userId = parts[1];
          } else if (parts.length === 1 && /^\d+$/.test(parts[0])) {
            // Format: just "X" (number only) - try to find in both admin and staff
            userId = parts[0];
          }

          if (userId) {
            if (userType === 'admin') {
              // Query admin user
              const adminUser = await this.prisma.user.findUnique({
                where: { id: parseInt(userId) },
                select: { name: true },
              });
              if (adminUser) {
                recordedByName = adminUser.name;
                recordedByDisplay = `admin: ${adminUser.name}`;
                recordedByUserId = userId;
              }
            } else if (userType === 'staff') {
              // Query staff user
              const staffUser = await this.prisma.staffUser.findUnique({
                where: { id: parseInt(userId) },
                select: { fname: true, lname: true },
              });
              if (staffUser) {
                const fullName = `${staffUser.fname} ${staffUser.lname}`.trim();
                recordedByName = fullName;
                recordedByDisplay = `staff: ${fullName}`;
                recordedByUserId = userId;
              }
            } else {
              // No userType specified (just number) - try admin first, then staff
              const adminUser = await this.prisma.user.findUnique({
                where: { id: parseInt(userId) },
                select: { name: true },
              });
              if (adminUser) {
                recordedByName = adminUser.name;
                recordedByDisplay = `admin: ${adminUser.name}`;
                recordedByUserId = userId;
              } else {
                // Try staff
                const staffUser = await this.prisma.staffUser.findUnique({
                  where: { id: parseInt(userId) },
                  select: { fname: true, lname: true },
                });
                if (staffUser) {
                  const fullName = `${staffUser.fname} ${staffUser.lname}`.trim();
                  recordedByName = fullName;
                  recordedByDisplay = `staff: ${fullName}`;
                  recordedByUserId = userId;
                }
              }
            }
          }
        }

        // Create result object with all usage data and add resolved user fields
        // Convert Prisma object to plain object first to ensure all properties are included
        const usagePlain = JSON.parse(JSON.stringify(usage));

        // Convert supply_items to plain objects as well (รวมทั้ง Discontinue และอื่น ๆ)
        const supplyItemsPlain = usage.supply_items.map(item => {
          const itemPlain = JSON.parse(JSON.stringify(item));
          return {
            ...itemPlain,
            qty_pending: (item.qty || 0) - (item.qty_used_with_patient || 0) - (item.qty_returned_to_cabinet || 0),
          };
        });

        const departmentName = usage.department_code
          ? departmentNameByCode.get(usage.department_code) ?? null
          : null;

        const result: any = {
          ...usagePlain,
          department_name: departmentName,
          recorded_by_user_id: recordedByUserId,
          recorded_by_name: recordedByName,
          recorded_by_display: recordedByDisplay,
          supply_items: supplyItemsPlain,
        };

        return result;
      }));

      // Create query log
      await this.createLog(null, {
        type: 'QUERY',
        status: 'SUCCESS',
        action: 'findAll',
        filters: where,
        results_count: dataWithPending.length,
        total: total,
        page: page,
        limit: limit,
      });

      return {
        data: dataWithPending as unknown as MedicalSupplyUsageResponse[],
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      };
    } catch (error) {
      // Create error log
      await this.createLog(null, {
        type: 'QUERY',
        status: 'ERROR',
        action: 'findAll',
        filters: query,
        error_message: error.message,
        error_code: error.code,
      });
      throw error;
    }
  }

  // Get by ID
  async findOne(id: number): Promise<MedicalSupplyUsageResponse> {
    try {
      const usage = await this.prisma.medicalSupplyUsage.findUnique({
        where: { id },
        include: {
          supply_items: true,
        },
      });

      if (!usage) {
        throw new NotFoundException(`Medical supply usage with ID ${id} not found`);
      }

      // Add qty_pending to each item
      const usageWithPending = {
        ...usage,
        supply_items: usage.supply_items.map(item => ({
          ...item,
          qty_pending: (item.qty || 0) - (item.qty_used_with_patient || 0) - (item.qty_returned_to_cabinet || 0),
        })),
      };

      // Create query log
      await this.createLog(usage.id, {
        type: 'QUERY',
        status: 'SUCCESS',
        action: 'findOne',
        usage_id: id,
      });

      return usageWithPending as unknown as MedicalSupplyUsageResponse;
    } catch (error) {
      // Create error log
      await this.createLog(null, {
        type: 'QUERY',
        status: 'ERROR',
        action: 'findOne',
        usage_id: id,
        error_message: error.message,
        error_code: error.code,
      });
      throw error;
    }
  }

  // Get Logs (MedicalSupplyUsageLog) with pagination and filters
  // action JSON shape: { "type": "CREATE" | "QUERY" | "UPDATE" | "UPDATE_PRINT_INFO" | "DELETE", ... }
  async findAllLogs(query: GetMedicalSupplyUsageLogsQueryDto): Promise<{
    data: Array<{ id: number; usage_id: number | null; action: any; created_at: Date }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const method = (query as any).method?.toString?.()?.trim?.()?.toUpperCase?.();
    const typeFilter: string[] = []; // action.type values to allow (from method: GET->QUERY, POST->CREATE, etc.)
    if (method === 'GET') typeFilter.push('QUERY');
    else if (method === 'POST') typeFilter.push('CREATE');
    else if (method === 'PUT') typeFilter.push('UPDATE', 'UPDATE_PRINT_INFO');
    else if (method === 'DELETE') typeFilter.push('DELETE');
    else if (method === 'OTHER') typeFilter.push(''); // will use NOT IN known types

    const table = 'app_microservice_medical_supply_usages_logs';
    const hasTypeFilter = typeFilter.length > 0 && (method === 'OTHER' || typeFilter.some((t) => t.length > 0));
    const statusVal = (query as any).status?.toString?.()?.trim?.()?.toUpperCase?.();
    const hasStatusFilter = statusVal === 'SUCCESS' || statusVal === 'ERROR';

    if (hasTypeFilter || hasStatusFilter) {
      // Use raw SQL so JSON filter on action.type / action.status works reliably in MySQL
      const conditions: string[] = ['1=1'];
      const params: (string | number | Date)[] = [];

      if (query.usage_id != null) {
        conditions.push(`usage_id = ?`);
        params.push(query.usage_id);
      }
      if (query.startDate) {
        conditions.push(`created_at >= ?`);
        params.push(new Date(query.startDate + 'T00:00:00.000Z'));
      }
      if (query.endDate) {
        conditions.push(`created_at <= ?`);
        params.push(new Date(query.endDate + 'T23:59:59.999Z'));
      }

      if (hasTypeFilter) {
        if (method === 'OTHER') {
          conditions.push(`(JSON_UNQUOTE(JSON_EXTRACT(action, '$.type')) NOT IN ('QUERY','CREATE','UPDATE','UPDATE_PRINT_INFO','DELETE') OR JSON_EXTRACT(action, '$.type') IS NULL)`);
        } else {
          const placeholders = typeFilter.map(() => '?').join(',');
          conditions.push(`JSON_UNQUOTE(JSON_EXTRACT(action, '$.type')) IN (${placeholders})`);
          params.push(...typeFilter);
        }
      }

      if (hasStatusFilter) {
        conditions.push(`JSON_UNQUOTE(JSON_EXTRACT(action, '$.status')) = ?`);
        params.push(statusVal);
      }

      const whereSql = conditions.join(' AND ');
      const countResult = await this.prisma.$queryRawUnsafe<[{ cnt: bigint }]>(
        `SELECT COUNT(*) as cnt FROM \`${table}\` WHERE ${whereSql}`,
        ...params,
      );
      const total = Number(countResult[0]?.cnt ?? 0);
      const rows = await this.prisma.$queryRawUnsafe<any[]>(
        `SELECT id, usage_id, action, created_at FROM \`${table}\` WHERE ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        ...params,
        limit,
        skip,
      );
      const data = rows.map((r) => ({
        id: r.id,
        usage_id: r.usage_id,
        action: typeof r.action === 'string' ? JSON.parse(r.action) : r.action,
        created_at: r.created_at,
      }));

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    // No type filter: use Prisma findMany
    const where: any = {};
    if (query.usage_id != null) where.usage_id = query.usage_id;
    if (query.startDate || query.endDate) {
      where.created_at = {};
      if (query.startDate) where.created_at.gte = new Date(query.startDate + 'T00:00:00.000Z');
      if (query.endDate) where.created_at.lte = new Date(query.endDate + 'T23:59:59.999Z');
    }

    const [logs, total] = await Promise.all([
      this.prisma.medicalSupplyUsageLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.medicalSupplyUsageLog.count({ where }),
    ]);

    return {
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Get by HN
  async findByHN(hn: string): Promise<MedicalSupplyUsageResponse[]> {
    try {
      const usages = await this.prisma.medicalSupplyUsage.findMany({
        where: {
          patient_hn: hn,
        },
        include: {
          supply_items: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      // Create query log
      await this.createLog(null, {
        type: 'QUERY',
        status: 'SUCCESS',
        action: 'findByHN',
        patient_hn: hn,
        results_count: usages.length,
      });

      return usages as unknown as MedicalSupplyUsageResponse[];
    } catch (error) {
      // Create error log
      await this.createLog(null, {
        type: 'QUERY',
        status: 'ERROR',
        action: 'findByHN',
        patient_hn: hn,
        error_message: error.message,
        error_code: error.code,
      });
      throw error;
    }
  }

  // Update
  async update(
    id: number,
    data: UpdateMedicalSupplyUsageDto,
  ): Promise<MedicalSupplyUsageResponse> {
    try {
      // Check if exists
      const existing = await this.prisma.medicalSupplyUsage.findUnique({
        where: { id },
        include: {
          supply_items: true,
        },
      });

      if (!existing) {
        throw new NotFoundException(`Medical supply usage with ID ${id} not found`);
      }

      // Handle Discontinue items if provided
      const orderItems = data.Order || [];
      const discontinueItems = orderItems.filter(item =>
        item.ItemStatus && item.ItemStatus.toLowerCase() === 'discontinue'
      );

      if (discontinueItems.length > 0) {
        // Update existing items with Discontinue status
        for (const discontinueItem of discontinueItems) {
          if (discontinueItem.AssessionNo) {
            // Find items with the same assession_no
            const itemsToDiscontinue = existing.supply_items.filter(item =>
              item.assession_no === discontinueItem.AssessionNo &&
              item.order_item_status?.toLowerCase() !== 'discontinue'
            );

            // Update items to Discontinue
            for (const item of itemsToDiscontinue) {
              await this.prisma.supplyUsageItem.update({
                where: { id: item.id },
                data: {
                  order_item_status: 'Discontinue', // Always use 'Discontinue' (not 'Discontinued')
                  qty_used_with_patient: 0,
                },
              });

              // Log the cancellation
              await this.createLog(id, {
                type: 'UPDATE',
                status: 'SUCCESS',
                action: 'discontinue_item',
                assession_no: discontinueItem.AssessionNo,
                item_code: item.order_item_code,
                reason: 'Bill cancelled - Discontinue status received via PATCH',
                cancelled_qty: item.qty,
                original_qty: item.qty,
              });
            }
          } else {
            // If no AssessionNo, discontinue all items in this usage
            for (const item of existing.supply_items) {
              if (item.order_item_status?.toLowerCase() !== 'discontinue') {
                await this.prisma.supplyUsageItem.update({
                  where: { id: item.id },
                  data: {
                    order_item_status: 'Discontinue', // Always use 'Discontinue' (not 'Discontinued')
                    qty_used_with_patient: 0,
                  },
                });

                await this.createLog(id, {
                  type: 'UPDATE',
                  status: 'SUCCESS',
                  action: 'discontinue_item',
                  item_code: item.order_item_code,
                  reason: 'Bill cancelled - Discontinue status received via PATCH (all items)',
                  cancelled_qty: item.qty,
                });
              }
            }
          }
        }

        // Update billing_status if provided or set to CANCELLED
        const billingStatusUpdate: any = {};
        if (data.billing_status) {
          billingStatusUpdate.billing_status = data.billing_status;
        } else if (discontinueItems.length > 0) {
          billingStatusUpdate.billing_status = 'CANCELLED';
        }

        // Update other fields if provided
        const updateData: any = {
          ...billingStatusUpdate,
        };

        if (data.Hospital !== undefined) updateData.hospital = data.Hospital;
        if (data.EN !== undefined) updateData.en = data.EN;
        if (data.FirstName !== undefined) updateData.first_name = data.FirstName;
        if (data.Lastname !== undefined) updateData.lastname = data.Lastname;
        if (data.patient_name_th !== undefined) updateData.patient_name_th = data.patient_name_th;
        if (data.patient_name_en !== undefined) updateData.patient_name_en = data.patient_name_en;
        if (data.usage_datetime !== undefined) updateData.usage_datetime = data.usage_datetime;
        if (data.usage_type !== undefined) updateData.usage_type = data.usage_type;
        if (data.purpose !== undefined) updateData.purpose = data.purpose;
        if (data.department_code !== undefined) updateData.department_code = data.department_code;
        if (data.recorded_by_user_id !== undefined) updateData.recorded_by_user_id = data.recorded_by_user_id;
        if (data.billing_subtotal !== undefined) updateData.billing_subtotal = data.billing_subtotal;
        if (data.billing_tax !== undefined) updateData.billing_tax = data.billing_tax;
        if (data.billing_total !== undefined) updateData.billing_total = data.billing_total;
        if (data.billing_currency !== undefined) updateData.billing_currency = data.billing_currency;

        // Remove undefined values
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === undefined) {
            delete updateData[key];
          }
        });

        // Update the usage record
        const updated = await this.prisma.medicalSupplyUsage.update({
          where: { id },
          data: updateData,
          include: {
            supply_items: true,
          },
        });

        await this.createLog(id, {
          type: 'UPDATE',
          status: 'SUCCESS',
          action: 'patch_medical_supply_usage',
          discontinue_items_count: discontinueItems.length,
          billing_status: updateData.billing_status,
        });

        return updated as unknown as MedicalSupplyUsageResponse;
      }

      // Prepare update data for normal updates
      const updateData: any = {};

      if (data.Hospital !== undefined) updateData.hospital = data.Hospital;
      if (data.EN !== undefined) updateData.en = data.EN;
      if (data.FirstName !== undefined) updateData.first_name = data.FirstName;
      if (data.Lastname !== undefined) updateData.lastname = data.Lastname;
      if (data.patient_name_th !== undefined) updateData.patient_name_th = data.patient_name_th;
      if (data.patient_name_en !== undefined) updateData.patient_name_en = data.patient_name_en;
      if (data.usage_datetime !== undefined) updateData.usage_datetime = data.usage_datetime;
      if (data.usage_type !== undefined) updateData.usage_type = data.usage_type;
      if (data.purpose !== undefined) updateData.purpose = data.purpose;
      if (data.department_code !== undefined) updateData.department_code = data.department_code;
      if (data.recorded_by_user_id !== undefined) updateData.recorded_by_user_id = data.recorded_by_user_id;
      if (data.billing_status !== undefined) updateData.billing_status = data.billing_status;
      if (data.billing_subtotal !== undefined) updateData.billing_subtotal = data.billing_subtotal;
      if (data.billing_tax !== undefined) updateData.billing_tax = data.billing_tax;
      if (data.billing_total !== undefined) updateData.billing_total = data.billing_total;
      if (data.billing_currency !== undefined) updateData.billing_currency = data.billing_currency;

      // Handle supply items update if provided
      if (data.Order && data.Order.length > 0) {
        // Delete existing items
        await this.prisma.supplyUsageItem.deleteMany({
          where: { medical_supply_usage_id: id },
        });

        // Create new items
        updateData.supply_items = {
          create: data.Order.map(item => ({
            order_item_code: item.ItemCode,
            order_item_description: item.ItemDescription,
            assession_no: item.AssessionNo,
            order_item_status: item.ItemStatus || '',
            qty: typeof item.QTY === 'string' ? parseInt(item.QTY) || 0 : item.QTY,
            uom: item.UOM,
            supply_code: item.ItemCode,
            supply_name: item.ItemDescription,
            supply_category: null,
            unit: item.UOM,
            quantity: typeof item.QTY === 'string' ? parseInt(item.QTY) || 0 : item.QTY,
            unit_price: null,
            total_price: null,
            expiry_date: null,
          })),
        };
      } else if (data.supplies && data.supplies.length > 0) {
        // Legacy format
        await this.prisma.supplyUsageItem.deleteMany({
          where: { medical_supply_usage_id: id },
        });

        updateData.supply_items = {
          create: data.supplies.map(item => ({
            order_item_code: item.supply_code,
            order_item_description: item.supply_name,
            assession_no: '',
            order_item_status: '',
            qty: item.quantity,
            uom: item.unit,
            supply_code: item.supply_code,
            supply_name: item.supply_name,
            supply_category: item.supply_category,
            unit: item.unit,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            expiry_date: item.expiry_date,
          })),
        };
      }

      const updated = await this.prisma.medicalSupplyUsage.update({
        where: { id },
        data: updateData,
        include: {
          supply_items: true,
        },
      });

      // Create update log
      await this.createLog(updated.id, {
        type: 'UPDATE',
        status: 'SUCCESS',
        usage_id: id,
        updated_fields: Object.keys(data),
        order_items_count: data.Order?.length || 0,
        supplies_count: data.supplies?.length || 0,
      });

      return updated as unknown as MedicalSupplyUsageResponse;
    } catch (error) {
      // Create error log
      await this.createLog(null, {
        type: 'UPDATE',
        status: 'ERROR',
        usage_id: id,
        error_message: error.message,
        error_code: error.code,
        input_data: data,
      });
      throw error;
    }
  }

  // Delete
  async remove(id: number): Promise<{ message: string }> {
    try {
      const existing = await this.prisma.medicalSupplyUsage.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException(`Medical supply usage with ID ${id} not found`);
      }

      // Create delete log before deleting
      await this.createLog(id, {
        type: 'DELETE',
        status: 'SUCCESS',
        usage_id: id,
        patient_hn: existing.patient_hn,
        en: existing.en,
      });

      await this.prisma.medicalSupplyUsage.delete({
        where: { id },
      });

      return { message: `Medical supply usage with ID ${id} has been deleted` };
    } catch (error) {
      // Create error log
      await this.createLog(null, {
        type: 'DELETE',
        status: 'ERROR',
        usage_id: id,
        error_message: error.message,
        error_code: error.code,
      });
      throw error;
    }
  }

  // Update Print Information (อัพเดตข้อมูล Print ใน medical_supply_usages)
  async updatePrintInfo(
    usageId: number,
    printData: {
      Twu?: string;
      PrintLocation?: string;
      PrintDate?: string;
      TimePrintDate?: string;
      update?: string;
    },
  ): Promise<MedicalSupplyUsageResponse> {
    try {
      // Check if usage exists
      const existing = await this.prisma.medicalSupplyUsage.findUnique({
        where: { id: usageId },
        include: {
          supply_items: true,
        },
      });

      if (!existing) {
        throw new NotFoundException(`Medical supply usage with ID ${usageId} not found`);
      }

      // Prepare update data for medical_supply_usages table
      const updateData: any = {};

      // Update all print information in medical_supply_usages (ทุกฟิลด์อยู่ที่ usage level)
      if (printData.Twu !== undefined) {
        updateData.twu = printData.Twu;
      }
      if (printData.PrintLocation !== undefined) {
        updateData.print_location = printData.PrintLocation;
      }
      if (printData.PrintDate !== undefined) {
        updateData.print_date = printData.PrintDate;
      }
      if (printData.TimePrintDate !== undefined) {
        updateData.time_print_date = printData.TimePrintDate;
      }
      if (printData.update !== undefined) {
        updateData.update = printData.update;
      }

      // Update medical_supply_usages record
      const updated = await this.prisma.medicalSupplyUsage.update({
        where: { id: usageId },
        data: updateData,
        include: {
          supply_items: true,
        },
      });

      // Create update log
      await this.createLog(usageId, {
        type: 'UPDATE_PRINT_INFO',
        status: 'SUCCESS',
        usage_id: usageId,
        patient_hn: existing.patient_hn,
        en: existing.en,
        updated_fields: printData,
        supply_items_count: existing.supply_items.length,
      });

      return updated as unknown as MedicalSupplyUsageResponse;
    } catch (error) {
      // Create error log
      await this.createLog(null, {
        type: 'UPDATE_PRINT_INFO',
        status: 'ERROR',
        usage_id: usageId,
        error_message: error.message,
        error_code: error.code,
        input_data: printData,
      });
      throw error;
    }
  }

  // Get by Department
  async findByDepartment(departmentCode: string): Promise<MedicalSupplyUsageResponse[]> {
    try {
      const usages = await this.prisma.medicalSupplyUsage.findMany({
        where: {
          department_code: departmentCode,
        },
        include: {
          supply_items: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      // Create query log
      await this.createLog(null, {
        type: 'QUERY',
        status: 'SUCCESS',
        action: 'findByDepartment',
        department_code: departmentCode,
        results_count: usages.length,
      });

      return usages as unknown as MedicalSupplyUsageResponse[];
    } catch (error) {
      // Create error log
      await this.createLog(null, {
        type: 'QUERY',
        status: 'ERROR',
        action: 'findByDepartment',
        department_code: departmentCode,
        error_message: error.message,
        error_code: error.code,
      });
      throw error;
    }
  }

  // Get Statistics
  async getStatistics(): Promise<any> {
    try {
      const [totalUsages, totalByStatus, totalByType] = await Promise.all([
        this.prisma.medicalSupplyUsage.count(),
        this.prisma.medicalSupplyUsage.groupBy({
          by: ['billing_status'],
          _count: true,
        }),
        this.prisma.medicalSupplyUsage.groupBy({
          by: ['usage_type'],
          _count: true,
        }),
      ]);

      const stats = {
        total_usages: totalUsages,
        by_billing_status: totalByStatus,
        by_usage_type: totalByType,
      };

      // Create query log
      await this.createLog(null, {
        type: 'QUERY',
        status: 'SUCCESS',
        action: 'getStatistics',
        stats: stats,
      });

      return stats;
    } catch (error) {
      // Create error log
      await this.createLog(null, {
        type: 'QUERY',
        status: 'ERROR',
        action: 'getStatistics',
        error_message: error.message,
        error_code: error.code,
      });
      throw error;
    }
  }

  // Update Billing Status
  async updateBillingStatus(
    id: number,
    status: string,
  ): Promise<MedicalSupplyUsageResponse> {
    try {
      const existing = await this.prisma.medicalSupplyUsage.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException(`Medical supply usage with ID ${id} not found`);
      }

      const updated = await this.prisma.medicalSupplyUsage.update({
        where: { id },
        data: { billing_status: status },
        include: {
          supply_items: true,
        },
      });

      // Create update log
      await this.createLog(updated.id, {
        type: 'UPDATE',
        status: 'SUCCESS',
        action: 'updateBillingStatus',
        usage_id: id,
        old_status: existing.billing_status,
        new_status: status,
      });

      return updated as unknown as MedicalSupplyUsageResponse;
    } catch (error) {
      // Create error log
      await this.createLog(null, {
        type: 'UPDATE',
        status: 'ERROR',
        action: 'updateBillingStatus',
        usage_id: id,
        new_status: status,
        error_message: error.message,
        error_code: error.code,
      });
      throw error;
    }
  }

  // ===============================================
  // Quantity Management & Return System
  // ===============================================

  // Get Supply Item by ID (with quantity breakdown and return records)
  async getSupplyItemById(itemId: number): Promise<any> {
    try {
      const item = await this.prisma.supplyUsageItem.findUnique({
        where: { id: itemId },
        include: {
          usage: true,
        },
      });

      if (!item) {
        throw new NotFoundException(`Supply usage item with ID ${itemId} not found`);
      }

      // Calculate qty_pending
      const qty_pending = (item.qty || 0) - (item.qty_used_with_patient || 0) - (item.qty_returned_to_cabinet || 0);

      const result = {
        ...item,
        qty_pending,
      };

      // Create log
      await this.createLog(item.medical_supply_usage_id, {
        type: 'QUERY',
        status: 'SUCCESS',
        action: 'getSupplyItemById',
        item_id: itemId,
      });

      return result;
    } catch (error) {
      // Create error log
      await this.createLog(null, {
        type: 'QUERY',
        status: 'ERROR',
        action: 'getSupplyItemById',
        item_id: itemId,
        error_message: error.message,
        error_code: error.code,
      });
      throw error;
    }
  }

  // Get Supply Items by Usage ID (with quantity breakdown)
  async getSupplyItemsByUsageId(usageId: number): Promise<any[]> {
    try {
      const items = await this.prisma.supplyUsageItem.findMany({
        where: { medical_supply_usage_id: usageId },
        orderBy: {
          created_at: 'asc',
        },
      });

      // Add qty_pending to each item
      const itemsWithPending = items.map(item => ({
        ...item,
        qty_pending: (item.qty || 0) - (item.qty_used_with_patient || 0) - (item.qty_returned_to_cabinet || 0),
      }));

      // Create log
      await this.createLog(usageId, {
        type: 'QUERY',
        status: 'SUCCESS',
        action: 'getSupplyItemsByUsageId',
        usage_id: usageId,
        items_count: items.length,
      });

      return itemsWithPending;
    } catch (error) {
      // Create error log
      await this.createLog(null, {
        type: 'QUERY',
        status: 'ERROR',
        action: 'getSupplyItemsByUsageId',
        usage_id: usageId,
        error_message: error.message,
        error_code: error.code,
      });
      throw error;
    }
  }

  // Helper: Calculate item status based on quantities
  private calculateItemStatus(qty: number, qtyUsed: number, qtyReturned: number): ItemStatus {
    const qtyPending = qty - qtyUsed - qtyReturned;

    if (qtyPending === qty) {
      return ItemStatus.PENDING;
    } else if (qtyPending === 0) {
      return ItemStatus.COMPLETED;
    } else {
      return ItemStatus.PARTIAL;
    }
  }

  // Helper: Validate quantity
  private validateQuantity(item: any, additionalQty: number, type: 'used' | 'returned'): void {
    const currentQtyUsed = item.qty_used_with_patient || 0;
    const currentQtyReturned = item.qty_returned_to_cabinet || 0;
    const totalQty = item.qty || 0;

    let newQtyUsed = currentQtyUsed;
    let newQtyReturned = currentQtyReturned;

    if (type === 'used') {
      newQtyUsed += additionalQty;
    } else {
      newQtyReturned += additionalQty;
    }

    const total = newQtyUsed + newQtyReturned;

    if (total > totalQty) {
      throw new BadRequestException({
        message: 'จำนวนรวมเกินกว่าที่อนุมัติ',
        error: 'QUANTITY_EXCEEDED',
        details: {
          approved: totalQty,
          used: newQtyUsed,
          returned: newQtyReturned,
          total: total,
        },
      });
    }

    if (additionalQty <= 0) {
      throw new BadRequestException('จำนวนต้องมากกว่า 0');
    }
  }

  // บันทึกการใช้อุปกรณ์กับคนไข้
  async recordItemUsedWithPatient(data: RecordItemUsedWithPatientDto): Promise<any> {
    try {
      // Check if item exists
      const item = await this.prisma.supplyUsageItem.findUnique({
        where: { id: data.item_id },
        include: {
          usage: true,
        },
      });

      if (!item) {
        throw new NotFoundException(`Supply usage item with ID ${data.item_id} not found`);
      }

      // Validate quantity
      this.validateQuantity(item, data.qty_used, 'used');

      // Update item
      const newQtyUsed = (item.qty_used_with_patient || 0) + data.qty_used;
      const newStatus = this.calculateItemStatus(
        item.qty || 0,
        newQtyUsed,
        item.qty_returned_to_cabinet || 0
      );

      const updated = await this.prisma.supplyUsageItem.update({
        where: { id: data.item_id },
        data: {
          qty_used_with_patient: newQtyUsed,
          item_status: newStatus,
        },
      });

      // Create log
      await this.createLog(item.medical_supply_usage_id, {
        type: 'RECORD_USED_WITH_PATIENT',
        status: 'SUCCESS',
        item_id: data.item_id,
        qty_used: data.qty_used,
        total_qty_used: newQtyUsed,
        item_status: newStatus,
        order_item_code: item.order_item_code,
        patient_hn: (item as { usage?: { patient_hn?: string } }).usage?.patient_hn,
        recorded_by_user_id: data.recorded_by_user_id,
      });

      return updated;
    } catch (error) {
      // Create error log
      await this.createLog(null, {
        type: 'RECORD_USED_WITH_PATIENT',
        status: 'ERROR',
        item_id: data.item_id,
        error_message: error.message,
        error_code: error.code,
      });
      throw error;
    }
  }

  // บันทึกการคืนอุปกรณ์เข้าตู้
  async recordItemReturn(data: RecordItemReturnDto): Promise<any> {
    try {
      // Check if item exists
      const item = await this.prisma.supplyUsageItem.findUnique({
        where: { id: data.item_id },
        include: {
          usage: true,
        },
      });

      if (!item) {
        throw new NotFoundException(`Supply usage item with ID ${data.item_id} not found`);
      }

      // Validate quantity
      this.validateQuantity(item, data.qty_returned, 'returned');

      // Create return record and update item in transaction
      const [returnRecord, updatedItem] = await this.prisma.$transaction(async (tx) => {
        // Create return record
        const itemCode = item.order_item_code ?? item.supply_code ?? '';
        const record = await tx.supplyItemReturnRecord.create({
          data: {
            itemCode,
            qty_returned: data.qty_returned,
            return_reason: data.return_reason,
            return_by_user_id: data.return_by_user_id,
            return_note: data.return_note,
          },
        });

        // Update item quantities and status
        const newQtyReturned = (item.qty_returned_to_cabinet || 0) + data.qty_returned;
        const newStatus = this.calculateItemStatus(
          item.qty || 0,
          item.qty_used_with_patient || 0,
          newQtyReturned
        );

        const updated = await tx.supplyUsageItem.update({
          where: { id: data.item_id },
          data: {
            qty_returned_to_cabinet: newQtyReturned,
            item_status: newStatus,
          },
        });

        return [record, updated];
      });

      // Create log
      await this.createLog(item.medical_supply_usage_id, {
        type: 'RECORD_RETURN',
        status: 'SUCCESS',
        item_id: data.item_id,
        return_record_id: returnRecord.id,
        qty_returned: data.qty_returned,
        return_reason: data.return_reason,
        total_qty_returned: updatedItem.qty_returned_to_cabinet,
        item_status: updatedItem.item_status,
        order_item_code: item.order_item_code,
        patient_hn: (item as { usage?: { patient_hn?: string } }).usage?.patient_hn,
        return_by_user_id: data.return_by_user_id,
      });

      return {
        return_record: returnRecord,
        updated_item: updatedItem,
      };
    } catch (error) {
      // Create error log
      await this.createLog(null, {
        type: 'RECORD_RETURN',
        status: 'ERROR',
        item_id: data.item_id,
        error_message: error.message,
        error_code: error.code,
      });
      throw error;
    }
  }

  // ดึงรายการที่รอดำเนินการ
  async getPendingItems(query: GetPendingItemsQueryDto): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (query.item_status) {
        where.item_status = query.item_status;
      } else {
        // Default: show PENDING and PARTIAL
        where.item_status = {
          in: [ItemStatus.PENDING, ItemStatus.PARTIAL],
        };
      }

      // Add usage filters
      if (query.department_code || query.patient_hn) {
        where.usage = {};
        if (query.department_code) {
          where.usage.department_code = query.department_code;
        }
        if (query.patient_hn) {
          where.usage.patient_hn = query.patient_hn;
        }
      }

      const [data, total] = await Promise.all([
        this.prisma.supplyUsageItem.findMany({
          where,
          include: {
            usage: true,
          },
          skip,
          take: limit,
          orderBy: {
            created_at: 'desc',
          },
        }),
        this.prisma.supplyUsageItem.count({ where }),
      ]);

      // Add calculated qty_pending to each item
      const dataWithPending = data.map(item => ({
        ...item,
        qty_pending: (item.qty || 0) - (item.qty_used_with_patient || 0) - (item.qty_returned_to_cabinet || 0),
      }));

      // Create log
      await this.createLog(null, {
        type: 'QUERY',
        status: 'SUCCESS',
        action: 'getPendingItems',
        filters: query,
        results_count: data.length,
        total: total,
      });

      return {
        data: dataWithPending,
        total,
        page,
        limit,
      };
    } catch (error) {
      // Create error log
      await this.createLog(null, {
        type: 'QUERY',
        status: 'ERROR',
        action: 'getPendingItems',
        filters: query,
        error_message: error.message,
        error_code: error.code,
      });
      throw error;
    }
  }

  // ดึงประวัติการคืนอุปกรณ์
  async getReturnHistory(query: GetReturnHistoryQueryDto): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const page = Math.max(1, Number(query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (query.return_reason) {
        where.return_reason = query.return_reason;
      }

      // Department filter via cabinet → cabinetDepartments
      if (query.department_code) {
        const deptId = parseInt(query.department_code, 10);
        if (!isNaN(deptId)) {
          where.cabinet = {
            cabinetDepartments: {
              some: { department_id: deptId },
            },
          };
        }
      }

      // Date range filter
      if (query.date_from || query.date_to) {
        where.return_datetime = {};
        if (query.date_from) {
          where.return_datetime.gte = new Date(query.date_from);
        }
        if (query.date_to) {
          const endDate = new Date(query.date_to);
          endDate.setDate(endDate.getDate() + 1);
          where.return_datetime.lt = endDate;
        }
      }


      // SupplyItemReturnRecord เก็บ itemCode (อ้างอิง) — include cabinet สำหรับแสดงตู้/แผนก
      const [records, total] = await Promise.all([
        this.prisma.supplyItemReturnRecord.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            return_datetime: 'desc',
          },
          include: {
            cabinet: {
              include: {
                cabinetDepartments: {
                  take: 1,
                  include: { department: { select: { DepName: true } } },
                },
              },
            },
          },
        }),
        this.prisma.supplyItemReturnRecord.count({ where }),
      ]);

      // โหลด ItemStock ตาม itemCode (อาจมีหลายแถว ใช้แถวแรก)
      const itemCodes = [...new Set(records.map((r) => r.itemCode).filter(Boolean))];
      const stocks =
        itemCodes.length > 0
          ? await this.prisma.itemStock.findMany({
            where: { ItemCode: { in: itemCodes } },
            include: { item: { select: { itemcode: true, itemname: true } } },
          })
          : [];
      const stockByCode = new Map<string | null, (typeof stocks)[0]>();
      for (const s of stocks) {
        if (s.ItemCode != null && !stockByCode.has(s.ItemCode)) {
          stockByCode.set(s.ItemCode, s);
        }
      }

      // Resolve return_by_user_name และ map เป็น shape ที่ frontend ใช้ (supply_item จาก item_stock)
      const data = await Promise.all(records.map(async (record) => {
        let returnByName = 'ไม่ระบุ';

        if (record.return_by_user_id) {
          const userId = record.return_by_user_id;

          if (userId.includes(':')) {
            const [userType, id] = userId.split(':');
            const userIdNum = parseInt(id, 10);

            if ((userType === 'user' || userType === 'admin') && !isNaN(userIdNum)) {
              const adminUser = await this.prisma.user.findUnique({
                where: { id: userIdNum },
                select: { name: true },
              });
              if (adminUser) returnByName = adminUser.name;
            } else if (userType === 'staff' && !isNaN(userIdNum)) {
              const staffUser = await this.prisma.staffUser.findUnique({
                where: { id: userIdNum },
                select: { fname: true, lname: true },
              });
              if (staffUser) returnByName = `${staffUser.fname} ${staffUser.lname}`.trim();
            }
          } else {
            const userIdNum = parseInt(userId, 10);
            if (!isNaN(userIdNum)) {
              const adminUser = await this.prisma.user.findUnique({
                where: { id: userIdNum },
                select: { name: true },
              });
              if (adminUser) {
                returnByName = adminUser.name;
              } else {
                const staffUser = await this.prisma.staffUser.findUnique({
                  where: { id: userIdNum },
                  select: { fname: true, lname: true },
                });
                if (staffUser) returnByName = `${staffUser.fname} ${staffUser.lname}`.trim();
              }
            }
          }
        }

        const ist = stockByCode.get(record.itemCode) ?? null;
        const itemName = ist?.item?.itemname ?? ist?.item?.itemcode ?? null;
        const itemCodeVal = ist?.ItemCode ?? ist?.item?.itemcode ?? record.itemCode ?? null;

        const cab = record.cabinet;
        const deptName =
          cab?.cabinetDepartments?.[0]?.department?.DepName ?? undefined;

        return {
          id: record.id,
          item_stock_id: ist?.RowID ?? undefined,
          item_code: record.itemCode,
          stock_id: record.stock_id ?? undefined,
          cabinet_name: cab?.cabinet_name ?? undefined,
          cabinet_code: cab?.cabinet_code ?? undefined,
          department_name: deptName,
          qty_returned: record.qty_returned,
          return_reason: record.return_reason,
          return_datetime: record.return_datetime,
          return_note: record.return_note,
          return_by_user_id: record.return_by_user_id,
          return_by_user_name: returnByName,
          created_at: record.created_at,
          supply_item: {
            order_item_code: itemCodeVal ?? undefined,
            supply_code: itemCodeVal ?? undefined,
            order_item_description: itemName ?? undefined,
            supply_name: itemName ?? undefined,
            usage: undefined,
          },
          item_stock: ist ? { ItemCode: ist.ItemCode, RfidCode: ist.RfidCode, item: ist.item } : undefined,
        };
      }));

      // Create log
      await this.createLog(null, {
        type: 'QUERY',
        status: 'SUCCESS',
        action: 'getReturnHistory',
        filters: query,
        results_count: data.length,
        total: total,
      });

      return {
        data,
        total,
        page,
        limit,
      };
    } catch (error) {
      // Create error log
      await this.createLog(null, {
        type: 'QUERY',
        status: 'ERROR',
        action: 'getReturnHistory',
        filters: query,
        error_message: error.message,
        error_code: error.code,
      });
      throw error;
    }
  }

  // สถิติการจัดการอุปกรณ์
  async getQuantityStatistics(departmentCode?: string): Promise<any> {
    try {
      const where: any = {};

      if (departmentCode) {
        where.usage = {
          department_code: departmentCode,
        };
      }

      // Get all items
      const items = await this.prisma.supplyUsageItem.findMany({
        where,
        select: {
          qty: true,
          qty_used_with_patient: true,
          qty_returned_to_cabinet: true,
          item_status: true,
        },
      });

      // Calculate totals
      let totalQty = 0;
      let totalQtyUsed = 0;
      let totalQtyReturned = 0;
      let totalQtyPending = 0;

      items.forEach(item => {
        const qty = item.qty || 0;
        const qtyUsed = item.qty_used_with_patient || 0;
        const qtyReturned = item.qty_returned_to_cabinet || 0;
        const qtyPending = qty - qtyUsed - qtyReturned;

        totalQty += qty;
        totalQtyUsed += qtyUsed;
        totalQtyReturned += qtyReturned;
        totalQtyPending += qtyPending;
      });

      // Get status counts
      const statusCounts = await this.prisma.supplyUsageItem.groupBy({
        by: ['item_status'],
        where,
        _count: true,
      });

      // Get return reason counts (SupplyItemReturnRecord ไม่มี supply_item แล้ว จึงไม่กรอง department)
      const returnReasonCounts = await this.prisma.supplyItemReturnRecord.groupBy({
        by: ['return_reason'],
        where: {},
        _count: true,
        _sum: {
          qty_returned: true,
        },
      });

      const stats = {
        total_qty: totalQty,
        total_qty_used_with_patient: totalQtyUsed,
        total_qty_returned_to_cabinet: totalQtyReturned,
        total_qty_pending: totalQtyPending,
        percentage_used: totalQty > 0 ? ((totalQtyUsed / totalQty) * 100).toFixed(2) : 0,
        percentage_returned: totalQty > 0 ? ((totalQtyReturned / totalQty) * 100).toFixed(2) : 0,
        percentage_pending: totalQty > 0 ? ((totalQtyPending / totalQty) * 100).toFixed(2) : 0,
        by_status: statusCounts,
        by_return_reason: returnReasonCounts,
      };

      // Create log
      await this.createLog(null, {
        type: 'QUERY',
        status: 'SUCCESS',
        action: 'getQuantityStatistics',
        department_code: departmentCode,
        stats: stats,
      });

      return stats;
    } catch (error) {
      // Create error log
      await this.createLog(null, {
        type: 'QUERY',
        status: 'ERROR',
        action: 'getQuantityStatistics',
        department_code: departmentCode,
        error_message: error.message,
        error_code: error.code,
      });
      throw error;
    }
  }

  // Get Dispensed Items (RFID Stock)
  async getDispensedItems(filters?: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    departmentId?: string;
    cabinetId?: string;
  }) {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const offset = (page - 1) * limit;

      // Build WHERE conditions for raw SQL
      const sqlConditions: Prisma.Sql[] = [
        Prisma.sql`ist.IsStock = 0`,
        Prisma.sql`ist.RfidCode <> ''`,
      ];

      if (filters?.keyword) {
        // Escape single quotes to prevent SQL injection
        const escapedKeyword = filters.keyword.replace(/'/g, "''");
        const keywordPattern = `%${escapedKeyword}%`;
        sqlConditions.push(
          Prisma.raw(`(i.itemcode LIKE '${keywordPattern}' OR i.itemname LIKE '${keywordPattern}')`)
        );
      }

      if (filters?.startDate && filters?.endDate) {

        sqlConditions.push(
          Prisma.raw(`(DATE(ist.LastCabinetModify) BETWEEN '${filters.startDate}' AND '${filters.endDate}')`)
        );

      }

      if (filters?.departmentId) {
        const deptId = parseInt(filters.departmentId, 10);
        if (!Number.isNaN(deptId)) {
          sqlConditions.push(Prisma.sql`app_microservice_cabinet_departments.department_id = ${deptId}`);
        }
      }

      if (filters?.cabinetId) {
        const cabId = parseInt(filters.cabinetId, 10);
        if (!Number.isNaN(cabId)) {
          sqlConditions.push(Prisma.sql`app_microservice_cabinets.ID = ${cabId}`);
        }
      }

      // Combine WHERE conditions with AND
      const whereClause = Prisma.join(sqlConditions, ' AND ');

      // Get total count first (include cabinet/department JOINs when filtering by them)
      const countResult: any[] = await this.prisma.$queryRaw`
        SELECT COUNT(*) as total
        FROM itemstock ist
        INNER JOIN item i ON ist.ItemCode = i.itemcode
        LEFT JOIN itemtype it ON i.itemtypeID = it.ID
        LEFT JOIN app_microservice_cabinets ON app_microservice_cabinets.stock_id = ist.StockID
        LEFT JOIN app_microservice_cabinet_departments ON app_microservice_cabinet_departments.cabinet_id = app_microservice_cabinets.ID
        WHERE ${whereClause}
      `;
      const totalCount = Number(countResult[0]?.total || 0);

      // Get data from itemstock with relations using raw query
      const dispensedItems: any[] = await this.prisma.$queryRaw`
        SELECT
          ist.RowID,
          i.itemcode,
          i.itemname,
          ist.LastCabinetModify AS modifyDate,
          ist.Qty AS qty,
          'RFID' AS itemCategory,
          i.itemtypeID,
          ist.RfidCode,
          ist.StockID,
          ist.Istatus_rfid,
          ist.CabinetUserID,
          COALESCE(CONCAT(employee.FirstName, ' ', employee.LastName), 'ไม่ระบุ') AS cabinetUserName,
          department.DepName AS departmentName,
          app_microservice_cabinets.cabinet_name AS cabinetName,
          app_microservice_cabinets.cabinet_code AS cabinetCode
        FROM itemstock ist
        LEFT JOIN item i ON ist.ItemCode = i.itemcode
        LEFT JOIN (
              SELECT uc.*
              FROM user_cabinet uc
              INNER JOIN (
                  SELECT cabinet_finger_id, MAX(id) AS max_id
                  FROM user_cabinet
                  GROUP BY cabinet_finger_id
              ) x ON x.max_id = uc.id
          ) user_cabinet ON ist.CabinetUserID = user_cabinet.cabinet_finger_id
        LEFT JOIN users ON user_cabinet.user_id = users.ID
        LEFT JOIN employee ON employee.EmpCode = users.EmpCode
        LEFT JOIN app_microservice_cabinets on app_microservice_cabinets.stock_id = ist.StockID
        LEFT JOIN app_microservice_cabinet_departments on app_microservice_cabinet_departments.cabinet_id = app_microservice_cabinets.ID
        LEFT JOIN department on department.ID = app_microservice_cabinet_departments.department_id
        WHERE ${whereClause}
        ORDER BY ist.LastCabinetModify DESC , i.itemname ASC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      // Convert BigInt to Number for JSON serialization
      const result = dispensedItems.map(item => ({
        ...item,
        RowID: item.RowID ? Number(item.RowID) : null,
        qty: Number(item.qty),
        itemtypeID: item.itemtypeID ? Number(item.itemtypeID) : null,
        StockID: item.StockID ? Number(item.StockID) : null,
      }));

      const totalPages = Math.ceil(totalCount / limit);

      // Create success log
      await this.createLog(null, {
        type: 'QUERY',
        status: 'SUCCESS',
        action: 'getDispensedItems',
        filters: filters || {},
        result_count: result.length,
      });

      return {
        success: true,
        data: result,
        total: totalCount,
        page,
        limit,
        totalPages,
        filters: filters || {},
      };
    } catch (error) {
      // Create error log
      await this.createLog(null, {
        type: 'QUERY',
        status: 'ERROR',
        action: 'getDispensedItems',
        filters: filters || {},
        error_message: error.message,
        error_code: error.code,
      });
      throw error;
    }
  }

  /**
   * Get Returned Items (StockID = 1) for report
   * Same as getDispensedItems but with StockID = 1 instead of 0
   */
  async getReturnedItems(filters?: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    departmentId?: string;
    cabinetId?: string;
  }) {
    try {

      const page = filters?.page || 1;
      const limit = filters?.limit || 10;
      const offset = (page - 1) * limit;

      // Build WHERE conditions for raw SQL - Same as getDispensedItems but StockID = 1
      const sqlConditions: Prisma.Sql[] = [
        Prisma.sql`ist.IsStock != 0`,
        Prisma.sql`ist.RfidCode <> ''`,
      ];

      if (filters?.keyword) {
        // Escape single quotes to prevent SQL injection
        const escapedKeyword = filters.keyword.replace(/'/g, "''");
        const keywordPattern = `%${escapedKeyword}%`;
        sqlConditions.push(
          Prisma.raw(`(i.itemcode LIKE '${keywordPattern}' OR i.itemname LIKE '${keywordPattern}')`)
        );
      }

      if (filters?.startDate && filters?.endDate) {

        sqlConditions.push(
          Prisma.raw(`DATE(ist.LastCabinetModify) BETWEEN '${filters.startDate}' AND '${filters.endDate}'`)
        );

      }

      if (filters?.departmentId) {
        sqlConditions.push(Prisma.raw(`department.ID = '${filters.departmentId}'`));
      }

      if (filters?.cabinetId) {
        sqlConditions.push(Prisma.raw(`app_microservice_cabinets.id = '${filters.cabinetId}'`));
      }

      // Combine WHERE conditions with AND
      const whereClause = Prisma.join(sqlConditions, ' AND ');

      // Get total count first - Same structure as main query
      const countResult: any[] = await this.prisma.$queryRaw`
        SELECT count(ist.RowID) as total
        FROM itemstock ist
        INNER JOIN item i ON ist.ItemCode = i.itemcode
        LEFT JOIN user_cabinet ON ist.CabinetUserID = user_cabinet.user_id
        LEFT JOIN users ON user_cabinet.user_id = users.ID
        LEFT JOIN employee ON employee.EmpCode = users.EmpCode
        LEFT JOIN app_microservice_cabinets on app_microservice_cabinets.stock_id = ist.StockID
        LEFT JOIN app_microservice_cabinet_departments on app_microservice_cabinet_departments.cabinet_id = app_microservice_cabinets.ID
        LEFT JOIN department on department.id = app_microservice_cabinet_departments.department_id
        WHERE ${whereClause}
      `;
      const totalCount = Number(countResult[0]?.total || 0);

      // Get data from itemstock with relations using raw query - Same as getDispensedItems
      const returnedItems: any[] = await this.prisma.$queryRaw`
        SELECT
          ist.RowID,
          i.itemcode,
          i.itemname,
          ist.LastCabinetModify AS modifyDate,
          ist.Qty AS qty,
          i.itemtypeID,
          ist.RfidCode,
          ist.StockID,
          ist.Istatus_rfid,
          ist.IsStock,
          ist.CabinetUserID,
          COALESCE(CONCAT(employee.FirstName, ' ', employee.LastName), 'ไม่ระบุ') AS cabinetUserName,
          app_microservice_cabinets.cabinet_name AS cabinetName,
          app_microservice_cabinets.cabinet_code AS cabinetCode,
          department.DepName AS departmentName
        FROM itemstock ist
        INNER JOIN item i ON ist.ItemCode = i.itemcode
        LEFT JOIN (
              SELECT uc.*
              FROM user_cabinet uc
              INNER JOIN (
                  SELECT cabinet_finger_id, MAX(id) AS max_id
                  FROM user_cabinet
                  GROUP BY cabinet_finger_id
              ) x ON x.max_id = uc.id
          ) user_cabinet ON ist.CabinetUserID = user_cabinet.cabinet_finger_id
        LEFT JOIN users ON user_cabinet.user_id = users.ID
        LEFT JOIN employee ON employee.EmpCode = users.EmpCode
        LEFT JOIN app_microservice_cabinets on app_microservice_cabinets.stock_id = ist.StockID
        LEFT JOIN app_microservice_cabinet_departments on app_microservice_cabinet_departments.cabinet_id = app_microservice_cabinets.ID
        LEFT JOIN department on department.ID = app_microservice_cabinet_departments.department_id
        WHERE ${whereClause}
        ORDER BY ist.LastCabinetModify DESC , i.itemname ASC
        LIMIT ${limit}
        OFFSET ${offset}
      `;


      // Convert BigInt to Number for JSON serialization
      const result = returnedItems.map(item => ({
        ...item,
        RowID: item.RowID ? Number(item.RowID) : null,
        qty: Number(item.qty),
        itemtypeID: item.itemtypeID ? Number(item.itemtypeID) : null,
        StockID: item.StockID ? Number(item.StockID) : null,
      }));

      const totalPages = Math.ceil(totalCount / limit);

      // Create success log
      await this.createLog(null, {
        type: 'QUERY',
        status: 'SUCCESS',
        action: 'getReturnedItems',
        filters: filters || {},
        result_count: result.length,
      });

      return {
        success: true,
        data: result,
        total: totalCount,
        page,
        limit,
        totalPages,
        filters: filters || {},
      };
    } catch (error) {
      // Create error log
      await this.createLog(null, {
        type: 'QUERY',
        status: 'ERROR',
        action: 'getReturnedItems',
        filters: filters || {},
        error_message: error.message,
        error_code: error.code,
      });
      throw error;
    }
  }

  // Get Usage Records by Item Code (Who used this item)
  async getUsageByItemCode(filters?: {
    itemCode?: string;
    startDate?: string;
    endDate?: string;
    first_name?: string;
    lastname?: string;
    assession_no?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const offset = (page - 1) * limit;

      // Build where conditions
      const whereConditions: any = {
        supply_items: {
          some: {
            supply_code: filters?.itemCode,
          }
        }
      };

      // Filter by usage_datetime - use string comparison since it's String type
      if (filters?.startDate || filters?.endDate) {
        whereConditions.usage_datetime = { not: null };
        if (filters?.startDate && filters?.endDate) {
          // Use string comparison for date range
          whereConditions.usage_datetime.gte = filters.startDate;
          whereConditions.usage_datetime.lte = filters.endDate + ' 23:59:59';
        } else {
          if (filters?.startDate) {
            whereConditions.usage_datetime.gte = filters.startDate;
          }
          if (filters?.endDate) {
            whereConditions.usage_datetime.lte = filters.endDate + ' 23:59:59';
          }
        }
      }

      // Filter by first_name
      if (filters?.first_name) {
        whereConditions.first_name = { contains: filters.first_name };
      }

      // Filter by lastname
      if (filters?.lastname) {
        whereConditions.lastname = { contains: filters.lastname };
      }

      // Filter by assession_no in SupplyUsageItem
      if (filters?.assession_no) {
        // If supply_items.some already exists, merge conditions
        if (whereConditions.supply_items?.some) {
          whereConditions.supply_items.some = {
            AND: [
              whereConditions.supply_items.some,
              { assession_no: { contains: filters.assession_no } }
            ]
          };
        } else {
          whereConditions.supply_items = {
            some: {
              assession_no: { contains: filters.assession_no },
            }
          };
        }
      }

      // Get total count
      const totalCount = await this.prisma.medicalSupplyUsage.count({
        where: whereConditions,
      });

      // Build supply_items where condition for include
      const supplyItemsWhere: any = {};
      if (filters?.itemCode) {
        supplyItemsWhere.supply_code = filters.itemCode;
      }
      if (filters?.assession_no) {
        supplyItemsWhere.assession_no = { contains: filters.assession_no };
      }

      // Get usage records
      const usageRecords = await this.prisma.medicalSupplyUsage.findMany({
        where: whereConditions,
        include: {
          supply_items: {
            where: Object.keys(supplyItemsWhere).length > 0 ? supplyItemsWhere : undefined,
          },
        },
        orderBy: {
          usage_datetime: 'desc',
        },
        skip: offset,
        take: limit,
      });

      // Format result
      const result = usageRecords.map(usage => {
        const supplyItem = usage.supply_items[0]; // Get the first matching supply item
        return {
          usage_id: usage.id,
          patient_hn: usage.patient_hn,
          patient_name: `${usage.first_name || ''} ${usage.lastname || ''}`.trim(),
          patient_en: usage.en,
          department_code: usage.department_code,
          usage_datetime: usage.usage_datetime,
          itemcode: supplyItem?.supply_code,
          itemname: supplyItem?.supply_name,
          qty_used: supplyItem?.qty,
          qty_returned: supplyItem?.qty_returned_to_cabinet,
          created_at: usage.created_at,
          updated_at: usage.updated_at,
        };
      });

      const totalPages = Math.ceil(totalCount / limit);

      return {
        success: true,
        data: result,
        total: totalCount,
        page,
        limit,
        totalPages,
        filters: filters || {},
      };
    } catch (error) {
      throw error;
    }
  }

  // Get Usage Records by Order Item Code (Who used this item by order_item_code)
  async getUsageByOrderItemCode(filters?: {
    orderItemCode?: string;
    startDate?: string;
    endDate?: string;
    first_name?: string;
    lastname?: string;
    assession_no?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const offset = (page - 1) * limit;

      // Build where conditions
      // Support both order_item_code and supply_code for backward compatibility
      const whereConditions: any = {
        supply_items: {
          some: {
            OR: [
              { order_item_code: filters?.orderItemCode },
              { supply_code: filters?.orderItemCode },
            ]
          }
        }
      };

      // Filter by usage_datetime - use string comparison since it's String type
      if (filters?.startDate || filters?.endDate) {
        whereConditions.usage_datetime = { not: null };
        if (filters?.startDate && filters?.endDate) {
          // Use string comparison for date range
          whereConditions.usage_datetime.gte = filters.startDate;
          whereConditions.usage_datetime.lte = filters.endDate + ' 23:59:59';
        } else {
          if (filters?.startDate) {
            whereConditions.usage_datetime.gte = filters.startDate;
          }
          if (filters?.endDate) {
            whereConditions.usage_datetime.lte = filters.endDate + ' 23:59:59';
          }
        }
      }

      // Filter by first_name
      if (filters?.first_name) {
        whereConditions.first_name = { contains: filters.first_name };
      }

      // Filter by lastname
      if (filters?.lastname) {
        whereConditions.lastname = { contains: filters.lastname };
      }

      // Filter by assession_no in SupplyUsageItem
      if (filters?.assession_no) {
        // If supply_items.some already exists, merge conditions
        if (whereConditions.supply_items?.some) {
          whereConditions.supply_items.some = {
            AND: [
              whereConditions.supply_items.some,
              { assession_no: { contains: filters.assession_no } }
            ]
          };
        } else {
          whereConditions.supply_items = {
            some: {
              assession_no: { contains: filters.assession_no },
            }
          };
        }
      }

      // Get total count
      const totalCount = await this.prisma.medicalSupplyUsage.count({
        where: whereConditions,
      });

      // Build supply_items where condition for include
      // Support both order_item_code and supply_code for backward compatibility
      const supplyItemsWhere: any = {};
      if (filters?.orderItemCode) {
        supplyItemsWhere.OR = [
          { order_item_code: filters.orderItemCode },
          { supply_code: filters.orderItemCode },
        ];
      }
      if (filters?.assession_no) {
        if (supplyItemsWhere.OR) {
          supplyItemsWhere.AND = [
            { OR: supplyItemsWhere.OR },
            { assession_no: { contains: filters.assession_no } }
          ];
          delete supplyItemsWhere.OR;
        } else {
          supplyItemsWhere.assession_no = { contains: filters.assession_no };
        }
      }

      // Get usage records
      const usageRecords = await this.prisma.medicalSupplyUsage.findMany({
        where: whereConditions,
        include: {
          supply_items: {
            where: Object.keys(supplyItemsWhere).length > 0 ? supplyItemsWhere : undefined,
          },
        },
        orderBy: {
          usage_datetime: 'desc',
        },
        skip: offset,
        take: limit,
      });

      // Format result
      const result = usageRecords.map(usage => {
        const supplyItem = usage.supply_items[0]; // Get the first matching supply item
        return {
          usage_id: usage.id,
          patient_hn: usage.patient_hn,
          patient_name: `${usage.first_name || ''} ${usage.lastname || ''}`.trim(),
          patient_en: usage.en,
          department_code: usage.department_code,
          usage_datetime: usage.usage_datetime,
          itemcode: supplyItem?.order_item_code || supplyItem?.supply_code,
          itemname: supplyItem?.supply_name,
          qty_used: supplyItem?.qty,
          qty_returned: supplyItem?.qty_returned_to_cabinet,
          created_at: usage.created_at,
          updated_at: usage.updated_at,
        };
      });

      const totalPages = Math.ceil(totalCount / limit);

      return {
        success: true,
        data: result,
        total: totalCount,
        page,
        limit,
        totalPages,
        filters: filters || {},
      };
    } catch (error) {
      throw error;
    }
  }

  // Get Usage Records by Item Code from Item Table (Who used this item by itemcode from item table)
  // Search in SupplyUsageItem using order_item_code to match itemcode from selected item
  async getUsageByItemCodeFromItemTable(filters?: {
    itemCode?: string;
    startDate?: string;
    endDate?: string;
    first_name?: string;
    lastname?: string;
    assession_no?: string;
    departmentCode?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const offset = (page - 1) * limit;

      // Build where conditions - use itemCode from item table
      // Match supply_items where order_item_code equals itemCode (from selected item)
      const whereConditions: any = {
        supply_items: {
          some: {
            order_item_code: filters?.itemCode,
          }
        }
      };

      // Filter by departmentCode
      if (filters?.departmentCode) {
        whereConditions.department_code = filters.departmentCode;
      }

      // Filter by first_name
      if (filters?.first_name) {
        whereConditions.first_name = { contains: filters.first_name };
      }

      // Filter by lastname
      if (filters?.lastname) {
        whereConditions.lastname = { contains: filters.lastname };
      }

      // Filter by assession_no in SupplyUsageItem
      if (filters?.assession_no) {
        // If supply_items.some already exists, merge conditions
        if (whereConditions.supply_items?.some) {
          const existingCondition = whereConditions.supply_items.some;
          whereConditions.supply_items.some = {
            AND: [
              existingCondition,
              { assession_no: { contains: filters.assession_no } }
            ]
          };
        } else {
          whereConditions.supply_items = {
            some: {
              assession_no: { contains: filters.assession_no },
            }
          };
        }
      }

      // Build supply_items where condition for include
      // Use order_item_code to match itemCode from selected item
      const supplyItemsWhere: any = {};
      if (filters?.itemCode) {
        supplyItemsWhere.order_item_code = filters.itemCode;
      }
      if (filters?.assession_no) {
        if (supplyItemsWhere.order_item_code) {
          supplyItemsWhere.AND = [
            { order_item_code: supplyItemsWhere.order_item_code },
            { assession_no: { contains: filters.assession_no } }
          ];
          delete supplyItemsWhere.order_item_code;
        } else {
          supplyItemsWhere.assession_no = { contains: filters.assession_no };
        }
      }

      // Add date range filter on supply_items.created_at
      if (filters?.startDate && filters?.endDate) {
        supplyItemsWhere.created_at = {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate + 'T23:59:59.999Z'),
        };
      } else if (filters?.startDate) {
        supplyItemsWhere.created_at = {
          gte: new Date(filters.startDate),
        };
      } else if (filters?.endDate) {
        supplyItemsWhere.created_at = {
          lte: new Date(filters.endDate + 'T23:59:59.999Z'),
        };
      }

      // item-comparison ไม่เอาแสดงค่า Discontinue
      supplyItemsWhere.order_item_status = {
        notIn: ['Discontinue', 'discontinue', 'Discontinued', 'discontinued'],
      };

      // Get usage records (without pagination first to get all matching supply_items)
      const usageRecords = await this.prisma.medicalSupplyUsage.findMany({
        where: whereConditions,
        include: {
          supply_items: {
            where: Object.keys(supplyItemsWhere).length > 0 ? supplyItemsWhere : undefined,
          },
        },
        orderBy: {
          usage_datetime: 'desc',
        },
      });

      // ดึงชื่อแผนกจาก department (department_code = Department.ID)
      const deptCodes = [...new Set(usageRecords.map((u) => u.department_code).filter(Boolean))] as string[];
      const departmentNameMap = new Map<string, string>();
      if (deptCodes.length > 0) {
        const deptIds = deptCodes.map((c) => parseInt(c, 10)).filter((n) => !Number.isNaN(n));
        if (deptIds.length > 0) {
          const departments = await this.prisma.department.findMany({
            where: { ID: { in: deptIds } },
            select: { ID: true, DepName: true, DepName2: true },
          });
          departments.forEach((d) => {
            const name = d.DepName ?? d.DepName2 ?? null;
            if (name) departmentNameMap.set(String(d.ID), name);
          });
        }
      }

      // Format result - create a row for each supply_item that matches
      const allResults: any[] = [];
      for (const usage of usageRecords) {
        const departmentName = usage.department_code
          ? departmentNameMap.get(usage.department_code) ?? null
          : null;
        // Loop through all matching supply_items, not just the first one
        for (const supplyItem of usage.supply_items) {
          allResults.push({
            usage_id: usage.id,
            supply_item_id: supplyItem?.id,
            patient_hn: usage.patient_hn,
            patient_name: `${usage.first_name || ''} ${usage.lastname || ''}`.trim(),
            patient_en: usage.en,
            department_code: usage.department_code,
            department_name: departmentName,
            usage_type: usage.usage_type ?? null,
            usage_datetime: usage.usage_datetime,
            itemcode: supplyItem?.order_item_code || supplyItem?.supply_code,
            itemname: supplyItem?.supply_name,
            qty_used: supplyItem?.qty,
            qty_returned: supplyItem?.qty_returned_to_cabinet,
            order_item_status: supplyItem?.order_item_status || '',
            created_at: usage.created_at,
            updated_at: usage.updated_at,
          });
        }
      }

      // Get total count of supply_items (not usage records)
      const totalCount = allResults.length;

      // Apply pagination to the results
      const result = allResults.slice(offset, offset + limit);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        success: true,
        data: result,
        total: totalCount,
        page,
        limit,
        totalPages,
        filters: filters || {},
      };
    } catch (error) {
      throw error;
    }
  }
  // ==============================================================
  // ============ Summary: เบิก vs ใช้ โดยรวม (สำหรับ Dashboard) ==============
  // ============================================================
  async getDispensedVsUsageSummary(filters?: { startDate?: string; endDate?: string }) {
    try {
      const sqlConditionsDispensed: Prisma.Sql[] = [
        Prisma.sql`RfidCode <> ''`,
      ];
      const sqlConditionsUsage: Prisma.Sql[] = [
        Prisma.raw(`order_item_status != 'Discontinue' AND order_item_status != 'discontinue' AND order_item_status != 'Discontinued' AND order_item_status != 'discontinued'`),
      ];
      if (filters?.startDate && filters?.endDate) {
        sqlConditionsDispensed.push(
          // Prisma.raw(`(DATE(LastCabinetModify) BETWEEN '${filters.startDate.replace(/'/g, "''")}' AND '${filters.endDate.replace(/'/g, "''")}')`),
          Prisma.raw(`(DATE(LastCabinetModify) BETWEEN '${filters.startDate}' AND '${filters.endDate}')`),
        );
        sqlConditionsUsage.push(
          // Prisma.raw(`(DATE(created_at) BETWEEN '${filters.startDate.replace(/'/g, "''")}' AND '${filters.endDate.replace(/'/g, "''")}')`),
          Prisma.raw(`(DATE(created_at) BETWEEN '${filters.startDate}' AND '${filters.endDate}')`),
        );
      }
      const whereDispensed = Prisma.join(sqlConditionsDispensed, ' AND ');
      const whereUsage = Prisma.join(sqlConditionsUsage, ' AND ');

      const [dispensedRow] = await this.prisma.$queryRaw<Array<{ total_dispensed: number | null }>>`
        SELECT COALESCE(SUM(Qty), 0) AS total_dispensed FROM itemstock WHERE ${whereDispensed}
      `;
      const [usageRow] = await this.prisma.$queryRaw<Array<{ total_used: number | null }>>`
        SELECT COALESCE(SUM(qty), 0) AS total_used FROM app_microservice_supply_usage_items WHERE ${whereUsage}
      `;

      const total_dispensed = Number(dispensedRow?.total_dispensed ?? 0);
      const total_used = Number(usageRow?.total_used ?? 0);
      const difference = total_dispensed - total_used;

      return {
        success: true,
        data: {
          total_dispensed,
          total_used,
          difference,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch dispensed vs usage summary',
        error: error?.message,
      };
    }
  }

  // ==============================================================
  // ============ Compare Dispensed vs Usage Records ==============
  // ============================================================
  async compareDispensedVsUsage(filters?: {
    itemCode?: string;
    itemTypeId?: number;
    keyword?: string;
    startDate?: string;
    endDate?: string;
    departmentCode?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      // 1. Get Dispensed Items (from itemstock)
      const sqlConditionsDispensed: Prisma.Sql[] = [
        // Prisma.sql`ist.StockID = 0`,
        Prisma.sql`IsStock = 0`,
        Prisma.sql`RfidCode <> ''`,
      ];

      if (filters?.itemCode) {
        sqlConditionsDispensed.push(Prisma.sql`ItemCode = ${filters.itemCode}`);
      }
      // itemTypeId and keyword applied on outer query (after JOIN item i)

      const outerConditions: Prisma.Sql[] = [];
      if (filters?.itemTypeId) {
        outerConditions.push(Prisma.sql`i.itemtypeID = ${filters.itemTypeId}`);
      }
      if (filters?.keyword && filters.keyword.trim()) {
        const escapedKeyword = filters.keyword
          .trim()
          .replace(/'/g, "''")
          .replace(/\\/g, '\\\\')
          .replace(/%/g, '\\%')
          .replace(/_/g, '\\_');
        const keywordPattern = `%${escapedKeyword}%`;
        outerConditions.push(
          Prisma.raw(
            `(i.itemcode LIKE '${keywordPattern}' OR i.itemname LIKE '${keywordPattern}')`
          )
        );
      }
      const whereKeyword =
        outerConditions.length > 0
          ? Prisma.sql` WHERE ${Prisma.join(outerConditions, ' AND ')}`
          : Prisma.sql``;

      const sqlConditionsUsage: Prisma.Sql[] = [];

      if (filters?.startDate && filters?.endDate) {

        sqlConditionsUsage.push(
          Prisma.raw(`(DATE(created_at) BETWEEN '${filters.startDate}' AND '${filters.endDate}')`)
        );

        sqlConditionsDispensed.push(
          Prisma.raw(`(DATE(LastCabinetModify) BETWEEN '${filters.startDate}' AND '${filters.endDate}')`)
        );
      }

      sqlConditionsUsage.push(
        Prisma.raw(`order_item_status NOT IN ('Discontinue', 'discontinue', 'Discontinued', 'discontinued')`)
      );

      // กรองตาม department_code: หา stock_ids จาก cabinet_departments → cabinets
      if (filters?.departmentCode && filters.departmentCode.trim()) {
        const deptIdNum = parseInt(filters.departmentCode.trim(), 10);
        const deptCode = filters.departmentCode.trim().replace(/'/g, "''");

        // 1. กรอง supply_usage_items ตาม department_code ใน MedicalSupplyUsage
        sqlConditionsUsage.push(
          Prisma.raw(
            `EXISTS (SELECT 1 FROM app_microservice_medical_supply_usages msu WHERE msu.id = medical_supply_usage_id AND msu.department_code = '${deptCode}')`,
          ),
        );

        // 2. กรอง itemstock ตาม StockID ของตู้ที่ผูกกับแผนกนั้น
        if (!Number.isNaN(deptIdNum)) {
          const cabinetRows = await this.prisma.$queryRaw<{ stock_id: number }[]>`
            SELECT c.stock_id
            FROM app_microservice_cabinet_departments cd
            INNER JOIN app_microservice_cabinets c ON c.id = cd.cabinet_id
            WHERE cd.department_id = ${deptIdNum}
              AND c.stock_id IS NOT NULL
              AND cd.status = 'ACTIVE'
          `;
          const stockIds = cabinetRows.map((r) => r.stock_id).filter(Boolean);
          if (stockIds.length > 0) {
            sqlConditionsDispensed.push(
              Prisma.sql`StockID IN (${Prisma.join(stockIds.map((id) => Prisma.sql`${id}`))})`,
            );
          } else {
            // ไม่มีตู้ที่ผูกกับแผนกนี้ → ไม่มี dispensed items
            sqlConditionsDispensed.push(Prisma.sql`1 = 0`);
          }
        }
      }

      // จำนวนที่ยกเลิก ผ่าน app_microservice_supply_item_return_records (กรองวันที่ return_datetime ถ้ามี)
      const sqlConditionsReturn: Prisma.Sql[] = [];
      if (filters?.startDate && filters?.endDate) {
        sqlConditionsReturn.push(
          Prisma.raw(`(DATE(srr.return_datetime) BETWEEN '${filters.startDate.replace(/'/g, "''")}' AND '${filters.endDate.replace(/'/g, "''")}')`)
        );
      }
      const whereClauseReturn =
        sqlConditionsReturn.length > 0
          ? Prisma.join(sqlConditionsReturn, ' AND ')
          : Prisma.sql`1=1`;

      const whereClauseDispensed = Prisma.join(sqlConditionsDispensed, ' AND ');
      const whereClauseUsage = Prisma.join(sqlConditionsUsage, ' AND ');

      const countResult: any[] = await this.prisma.$queryRaw`
            SELECT COUNT(DISTINCT x.itemcode) AS total
              FROM (
                  /* เอา itemcode จากทั้ง 2 ฝั่ง */
                  SELECT ItemCode AS itemcode
                  FROM itemstock
                  WHERE ${whereClauseDispensed}

                  UNION

                  SELECT order_item_code AS itemcode
                  FROM app_microservice_supply_usage_items
                  WHERE ${whereClauseUsage}
              ) x
              JOIN item i ON i.itemcode = x.itemcode
              ${whereKeyword}
            `;

      // Apply pagination
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const offset = (page - 1) * limit;
      const totalItems = Number(countResult[0]?.total || 0);
      const totalPages = Math.ceil(totalItems / limit);

      const paginatedDispensedItems: any[] = await this.prisma.$queryRaw`
              SELECT
                    i.itemcode,
                    i.itemname,
                    IFNULL(d.total_dispensed, 0) AS total_dispensed,
                    IFNULL(d.dispensed_records, 0) AS dispensed_records,
                    IFNULL(u.total_usage_items, 0) AS total_used,
                    IFNULL(r.total_returned, 0) AS total_returned,
                    i.itemtypeID,
                    CASE
                        WHEN IFNULL(d.total_dispensed, 0) = 0
                            AND IFNULL(u.total_usage_items, 0) > 0
                            THEN 'USED_WITHOUT_DISPENSE'

                        WHEN IFNULL(d.total_dispensed, 0) > 0
                            AND IFNULL(u.total_usage_items, 0) = 0
                            THEN 'DISPENSED_NOT_USED'

                        WHEN IFNULL(d.total_dispensed, 0) > IFNULL(u.total_usage_items, 0)
                            THEN 'DISPENSE_EXCEEDS_USAGE'

                        WHEN IFNULL(d.total_dispensed, 0) < IFNULL(u.total_usage_items, 0)
                            THEN 'USAGE_EXCEEDS_DISPENSE'

                        ELSE 'MATCHED'
                    END AS status
                    FROM (
                          /* เอา itemcode จากทั้ง 2 ฝั่ง */
                          SELECT ItemCode AS itemcode
                          FROM itemstock
                          WHERE ${whereClauseDispensed}

                          UNION

                          SELECT order_item_code AS itemcode
                          FROM app_microservice_supply_usage_items
                          WHERE ${whereClauseUsage}
                      ) x
                      JOIN item i ON i.itemcode = x.itemcode
                      LEFT JOIN (
                            SELECT
                                ItemCode,
                                SUM(Qty) AS total_dispensed,
                                COUNT(DISTINCT RfidCode) AS dispensed_records
                            FROM itemstock
                            WHERE ${whereClauseDispensed}
                            GROUP BY ItemCode
                        ) d ON d.ItemCode = x.itemcode

                        LEFT JOIN (
                            SELECT
                                order_item_code,
                                SUM(qty) AS total_usage_items
                            FROM app_microservice_supply_usage_items
                            WHERE ${whereClauseUsage}
                            GROUP BY order_item_code
                        ) u ON u.order_item_code = x.itemcode

                        LEFT JOIN (
                            SELECT
                                srr.item_code AS ItemCode,
                                SUM(srr.qty_returned) AS total_returned
                            FROM app_microservice_supply_item_return_records srr
                            WHERE ${whereClauseReturn}
                            GROUP BY srr.item_code
                        ) r ON r.ItemCode = x.itemcode
                        ${whereKeyword}

                        ORDER BY i.itemcode
                        LIMIT ${limit}
                        OFFSET ${offset} `;



      // ดึงชื่อแผนกเมื่อมี departmentCode (department_code = Department.ID)
      let departmentName: string | null = null;
      if (filters?.departmentCode && filters.departmentCode.trim()) {
        try {
          const deptId = parseInt(filters.departmentCode.trim(), 10);
          if (!Number.isNaN(deptId)) {
            const dept = await this.prisma.department.findUnique({
              where: { ID: deptId },
              select: { DepName: true, DepName2: true },
            });
            departmentName = dept?.DepName ?? dept?.DepName2 ?? null;
          }
        } catch {
          departmentName = null;
        }
      }

      // Convert BigInt to Number for JSON serialization
      const result = paginatedDispensedItems.map(item => ({
        ...item,
        difference: Number(item.total_dispensed) - Number(item.total_used) + Number(item.total_returned ?? 0),
        total_dispensed: Number(item.total_dispensed),
        dispensed_records: Number(item.dispensed_records),
        total_used: Number(item.total_used),
        total_returned: Number(item.total_returned ?? 0),
        dispensed_datetime: item.dispensed_datetime ? new Date(item.dispensed_datetime) : null,
        itemType: item.itemType || null,
        itemtypeID: item.itemtypeID ? Number(item.itemtypeID) : null,
      }));

      return {
        data: result,
        pagination: {
          page,
          limit,
          total: totalItems,
          totalPages,
        },
        filters,
        department_name: departmentName,
      };


    } catch (error) {
      // Create error log
      await this.createLog(null, {
        type: 'QUERY',
        status: 'ERROR',
        action: 'compareDispensedVsUsage',
        filters: filters || {},
        error_message: error.message,
        error_code: error.code,
      });
      throw error;
    }
  }

  // Handle Cross-Day Cancel Bill (รองรับทั้งข้ามวันและภายในวันเดียวกัน)
  async handleCrossDayCancelBill(data: {
    en: string;
    hn: string;
    oldPrintDate: string;
    newPrintDate: string;
    cancelItems: Array<{
      assession_no: string;
      item_code: string;
      qty: number;
      status?: string;
    }>;
    newItems?: Array<{
      item_code: string;
      item_description: string;
      assession_no: string;
      qty: number;
      uom: string;
      item_status?: string;
    }>;
  }) {
    try {
      const { en, hn, oldPrintDate, newPrintDate, cancelItems, newItems } = data;
      const isSameDay = oldPrintDate === newPrintDate;

      // 1. ค้นหา Usage Records ที่ตรงกับ en, hn, และ oldPrintDate
      const startDate = new Date(oldPrintDate + 'T00:00:00.000Z');
      const endDate = new Date(oldPrintDate + 'T23:59:59.999Z');

      const existingUsages = await this.prisma.medicalSupplyUsage.findMany({
        where: {
          en: en,
          patient_hn: hn,
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          supply_items: true,
        },
      });

      if (existingUsages.length === 0) {
        throw new Error(`ไม่พบ Usage Records ที่ตรงกับ EN: ${en}, HN: ${hn}, วันที่: ${oldPrintDate}`);
      }

      const cancelledUsageIds: number[] = [];
      const updatedItemIds: number[] = [];

      // 2. อัปเดตรายการที่ยกเลิก (Discontinue)
      for (const usage of existingUsages) {
        let hasUpdates = false;

        for (const cancelItem of cancelItems) {
          // หา supply_items ที่ตรงกับ assession_no และ item_code
          const matchingItems = usage.supply_items.filter(item =>
            item.assession_no === cancelItem.assession_no &&
            (item.order_item_code === cancelItem.item_code || item.supply_code === cancelItem.item_code) &&
            item.order_item_status?.toLowerCase() !== 'discontinue'
          );

          for (const item of matchingItems) {
            // อัปเดต status เป็น Discontinue และ set qty_used_with_patient เป็น 0
            // Normalize: Always use 'Discontinue' (not 'Discontinued')
            await this.prisma.supplyUsageItem.update({
              where: { id: item.id },
              data: {
                order_item_status: 'Discontinue', // Always use 'Discontinue' (not 'Discontinued')
                qty_used_with_patient: 0,
              },
            });

            updatedItemIds.push(item.id);
            hasUpdates = true;

            // Log การยกเลิก
            await this.createLog(usage.id, {
              type: 'UPDATE',
              status: 'SUCCESS',
              action: 'cancel_bill_item',
              assession_no: cancelItem.assession_no,
              item_code: cancelItem.item_code,
              reason: `Cancel Bill - ${isSameDay ? 'ภายในวันเดียวกัน' : 'ข้ามวัน'}`,
              cancelled_qty: cancelItem.qty,
              old_print_date: oldPrintDate,
              new_print_date: newPrintDate,
            });
          }
        }

        if (hasUpdates) {
          cancelledUsageIds.push(usage.id);

          // อัปเดต billing_status เป็น CANCELLED
          await this.prisma.medicalSupplyUsage.update({
            where: { id: usage.id },
            data: {
              billing_status: 'CANCELLED',
            },
          });
        }
      }

      // 3. สร้างรายการใหม่ (Verified) ถ้ามี newItems
      let newUsageId: number | null = null;
      if (newItems && newItems.length > 0) {
        // สร้าง Usage Record ใหม่
        const newUsage = await this.prisma.medicalSupplyUsage.create({
          data: {
            en: en,
            patient_hn: hn,
            first_name: existingUsages[0]?.first_name || '',
            lastname: existingUsages[0]?.lastname || '',
            department_code: existingUsages[0]?.department_code || '',
            usage_datetime: new Date(newPrintDate + 'T00:00:00.000Z').toISOString(),
            billing_status: 'PENDING',
            created_at: new Date(newPrintDate + 'T00:00:00.000Z'),
          },
        });

        newUsageId = newUsage.id;

        // สร้าง SupplyUsageItems สำหรับรายการใหม่
        for (const newItem of newItems) {
          await this.prisma.supplyUsageItem.create({
            data: {
              medical_supply_usage_id: newUsage.id,
              order_item_code: newItem.item_code,
              order_item_description: newItem.item_description,
              assession_no: newItem.assession_no,
              qty: newItem.qty,
              uom: newItem.uom,
              order_item_status: newItem.item_status || 'Verified',
              qty_used_with_patient: 0,
              qty_returned_to_cabinet: 0,
            },
          });
        }

        // Log การสร้างรายการใหม่
        await this.createLog(newUsage.id, {
          type: 'CREATE',
          status: 'SUCCESS',
          action: 'cancel_bill_new_items',
          reason: `Cancel Bill - สร้างรายการใหม่ (${isSameDay ? 'ภายในวันเดียวกัน' : 'ข้ามวัน'})`,
          new_items_count: newItems.length,
          old_print_date: oldPrintDate,
          new_print_date: newPrintDate,
        });
      }

      return {
        cancelled_usage_ids: cancelledUsageIds,
        updated_item_ids: updatedItemIds,
        new_usage_id: newUsageId,
        is_same_day: isSameDay,
        message: `จัดการ Cancel Bill สำเร็จ${isSameDay ? ' (ภายในวันเดียวกัน)' : ' (ข้ามวัน)'}`,
      };
    } catch (error) {
      await this.createLog(null, {
        type: 'UPDATE',
        status: 'ERROR',
        action: 'cancel_bill',
        error_message: error.message,
        error_code: error.code,
      });
      throw error;
    }
  }

  // Handle Cancel Bill (เลือกจาก MedicalSupplyUsage และ SupplyUsageItem)
  async handleCancelBill(data: {
    usageId: number;
    supplyItemIds: number[];
    oldPrintDate: string;
    newPrintDate: string;
    newItems?: Array<{
      item_code: string;
      item_description: string;
      assession_no: string;
      qty: number;
      uom: string;
      item_status?: string;
    }>;
  }) {
    try {
      const { usageId, supplyItemIds, oldPrintDate, newPrintDate, newItems } = data;
      const isSameDay = oldPrintDate === newPrintDate;

      // 1. ค้นหา Usage Record ที่เลือก
      const usage = await this.prisma.medicalSupplyUsage.findUnique({
        where: { id: usageId },
        include: {
          supply_items: true,
        },
      });

      if (!usage) {
        throw new Error(`ไม่พบ Usage Record ที่ ID: ${usageId}`);
      }

      // 2. อัปเดต SupplyUsageItems ที่เลือกให้เป็น Discontinue
      const updatedItemIds: number[] = [];
      for (const itemId of supplyItemIds) {
        const item = usage.supply_items.find(si => si.id === itemId);
        // Normalize status: Always use 'Discontinue' (not 'Discontinued')
        if (item && item.order_item_status?.toLowerCase() !== 'discontinue') {
          await this.prisma.supplyUsageItem.update({
            where: { id: itemId },
            data: {
              order_item_status: 'Discontinue', // Always use 'Discontinue' (not 'Discontinued')
              qty_used_with_patient: 0,
            },
          });

          updatedItemIds.push(itemId);

          // Log การยกเลิก
          await this.createLog(usageId, {
            type: 'UPDATE',
            status: 'SUCCESS',
            action: 'cancel_bill_item',
            assession_no: item.assession_no,
            item_code: item.order_item_code || item.supply_code,
            reason: `Cancel Bill - ${isSameDay ? 'ภายในวันเดียวกัน' : 'ข้ามวัน'}`,
            cancelled_qty: item.qty,
            old_print_date: oldPrintDate,
            new_print_date: newPrintDate,
          });
        }
      }

      if (updatedItemIds.length === 0) {
        throw new Error('ไม่พบรายการที่สามารถยกเลิกได้');
      }

      // 3. อัปเดต billing_status เป็น CANCELLED
      await this.prisma.medicalSupplyUsage.update({
        where: { id: usageId },
        data: {
          billing_status: 'CANCELLED',
        },
      });

      // 4. สร้างรายการใหม่ (Verified) ถ้ามี newItems
      let newUsageId: number | null = null;
      if (newItems && newItems.length > 0) {
        // สร้าง Usage Record ใหม่
        const newUsage = await this.prisma.medicalSupplyUsage.create({
          data: {
            en: usage.en,
            patient_hn: usage.patient_hn,
            first_name: usage.first_name || '',
            lastname: usage.lastname || '',
            department_code: usage.department_code || '',
            usage_datetime: new Date(newPrintDate + 'T00:00:00.000Z').toISOString(),
            billing_status: 'PENDING',
            created_at: new Date(newPrintDate + 'T00:00:00.000Z'),
          },
        });

        newUsageId = newUsage.id;

        // สร้าง SupplyUsageItems สำหรับรายการใหม่
        for (const newItem of newItems) {
          await this.prisma.supplyUsageItem.create({
            data: {
              medical_supply_usage_id: newUsage.id,
              order_item_code: newItem.item_code,
              order_item_description: newItem.item_description,
              assession_no: newItem.assession_no,
              qty: newItem.qty,
              uom: newItem.uom,
              order_item_status: newItem.item_status || 'Verified',
              qty_used_with_patient: 0,
              qty_returned_to_cabinet: 0,
            },
          });
        }

        // Log การสร้างรายการใหม่
        await this.createLog(newUsage.id, {
          type: 'CREATE',
          status: 'SUCCESS',
          action: 'cancel_bill_new_items',
          reason: `Cancel Bill - สร้างรายการใหม่ (${isSameDay ? 'ภายในวันเดียวกัน' : 'ข้ามวัน'})`,
          new_items_count: newItems.length,
          old_print_date: oldPrintDate,
          new_print_date: newPrintDate,
        });
      }

      return {
        success: true,
        cancelled_usage_id: usageId,
        updated_item_ids: updatedItemIds,
        new_usage_id: newUsageId,
        is_same_day: isSameDay,
        message: `จัดการ Cancel Bill สำเร็จ${isSameDay ? ' (ภายในวันเดียวกัน)' : ' (ข้ามวัน)'}`,
      };
    } catch (error) {
      await this.createLog(null, {
        type: 'UPDATE',
        status: 'ERROR',
        action: 'cancel_bill',
        error_message: error.message,
        error_code: error.code,
      });
      throw error;
    }
  }

  /**
   * Get ItemStocks with StockID = 0 for returning to cabinet
   */
  async getItemStocksForReturnToCabinet(filters?: {
    itemCode?: string;
    itemTypeId?: number;
    rfidCode?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const offset = (page - 1) * limit;

      // Build WHERE conditions for raw SQL
      // ใช้ IsStock = 0 (เหมือน query findAllItemStockWillReturn) แทน StockID = 0
      const sqlConditions: Prisma.Sql[] = [
        Prisma.sql`ist.IsStock = 0`,
        Prisma.sql`ist.RfidCode <> ''`,
      ];

      if (filters?.itemCode) {
        sqlConditions.push(Prisma.sql`ist.ItemCode = ${filters.itemCode}`);
      }
      if (filters?.itemTypeId) {
        sqlConditions.push(Prisma.sql`i.itemtypeID = ${filters.itemTypeId}`);
      }
      if (filters?.rfidCode) {
        sqlConditions.push(Prisma.sql`ist.RfidCode = ${filters.rfidCode}`);
      }
      if (filters?.startDate) {
        sqlConditions.push(Prisma.sql`DATE(ist.LastCabinetModify) >= ${filters.startDate}`);
      }
      if (filters?.endDate) {
        sqlConditions.push(Prisma.sql`DATE(ist.LastCabinetModify) <= ${filters.endDate}`);
      }

      // Combine WHERE conditions with AND
      const whereClause = Prisma.join(sqlConditions, ' AND ');

      // Get total count first
      const countResult: any[] = await this.prisma.$queryRaw`
        SELECT COUNT(*) as total
        FROM itemstock ist
        INNER JOIN item i ON ist.ItemCode = i.itemcode
        LEFT JOIN itemtype it ON i.itemtypeID = it.ID
        WHERE ${whereClause}
      `;
      const totalCount = Number(countResult[0]?.total || 0);

      // Get data from itemstock with relations using raw query
      const itemStocks: any[] = await this.prisma.$queryRaw`
        SELECT
          ist.RowID,
          ist.ItemCode,
          ist.RfidCode,
          ist.Qty,
          ist.StockID,
          ist.LastCabinetModify,
          ist.CreateDate,
          i.itemcode,
          i.itemname,
          it.TypeName AS itemType,
          i.itemtypeID,
          ist.CabinetUserID,
          COALESCE(u.name, CONCAT(st.fname, ' ', st.lname), 'ไม่ระบุ') AS cabinetUserName
        FROM itemstock ist
        INNER JOIN item i ON ist.ItemCode = i.itemcode
        LEFT JOIN itemtype it ON i.itemtypeID = it.ID
        LEFT JOIN app_microservice_users u ON ist.CabinetUserID = u.id
        LEFT JOIN app_microservice_staff_users st ON ist.CabinetUserID = st.id
        WHERE ${whereClause}
        ORDER BY ist.LastCabinetModify DESC, ist.RowID DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      // Convert BigInt to Number for JSON serialization
      const result = itemStocks.map(item => ({
        ...item,
        RowID: item.RowID ? Number(item.RowID) : null,
        Qty: Number(item.Qty || 0),
        StockID: item.StockID ? Number(item.StockID) : null,
        itemtypeID: item.itemtypeID ? Number(item.itemtypeID) : null,
      }));

      const totalPages = Math.ceil(totalCount / limit);

      // Create success log
      await this.createLog(null, {
        type: 'QUERY',
        status: 'SUCCESS',
        action: 'getItemStocksForReturnToCabinet',
        filters: filters || {},
        result_count: result.length,
      });

      return {
        success: true,
        data: result,
        total: totalCount,
        page,
        limit,
        totalPages,
        filters: filters || {},
      };
    } catch (error) {
      // Create error log
      await this.createLog(null, {
        type: 'QUERY',
        status: 'ERROR',
        action: 'getItemStocksForReturnToCabinet',
        filters: filters || {},
        error_message: error.message,
        error_code: error.code,
      });
      throw error;
    }
  }

  /**
   * บันทึกคืนอุปกรณ์ลง SupplyItemReturnRecord และอัปเดต itemstock (StockID = 1)
   */
  async recordStockReturns(data: RecordStockReturnDto) {
    try {
      if (!data.items || data.items.length === 0) {
        throw new BadRequestException('items is required and must not be empty');
      }
      if (!data.return_by_user_id) {
        throw new BadRequestException('return_by_user_id is required');
      }

      // รองรับรูปแบบ "user:1" / "staff:1" — ดึงตัวเลขสำหรับ CabinetUserID
      const idStr = String(data.return_by_user_id);
      const userIdNum = idStr.includes(':')
        ? parseInt(idStr.split(':')[1], 10) || 0
        : parseInt(idStr, 10) || 0;

      const rowIds = data.items.map((i) => i.item_stock_id);

      const stockIdToUse = data.stock_id ?? null;
      await this.prisma.$transaction(async (tx) => {
        for (const item of data.items) {
          const stock = await tx.itemStock.findUnique({
            where: { RowID: item.item_stock_id },
            select: { ItemCode: true, StockID: true },
          });
          const itemCode = stock?.ItemCode ?? '';
          const recordStockId = stockIdToUse ?? stock?.StockID ?? 0;
          if (recordStockId === 0) {
            throw new BadRequestException(
              `ไม่พบ stock_id สำหรับ RowID ${item.item_stock_id} กรุณาส่ง stock_id ใน request`,
            );
          }
          await tx.supplyItemReturnRecord.create({
            data: {
              itemCode,
              stock_id: recordStockId,
              qty_returned: 1,
              return_reason: item.return_reason,
              return_by_user_id: data.return_by_user_id,
              return_note: item.return_note ?? null,
            },
          });
        }

        if (rowIds.length > 0) {
          await tx.$executeRaw`
            UPDATE itemstock
            SET 
                -- StockID = 1,
                CabinetUserID = ${userIdNum},
                LastCabinetModify = NOW()
            WHERE RowID IN (${Prisma.join(rowIds.map((id) => Prisma.sql`${id}`), ',')})
              AND StockID = 0
          `;
        }
      });

      await this.createLog(null, {
        type: 'CREATE',
        status: 'SUCCESS',
        action: 'recordStockReturns',
        item_stock_ids: rowIds,
        return_by_user_id: data.return_by_user_id,
        count: data.items.length,
      });

      return {
        success: true,
        updatedCount: data.items.length,
        message: `บันทึกการคืนอุปกรณ์เข้าตู้สำเร็จ ${data.items.length} รายการ`,
      };
    } catch (error: any) {
      await this.createLog(null, {
        type: 'CREATE',
        status: 'ERROR',
        action: 'recordStockReturns',
        return_by_user_id: data?.return_by_user_id,
        error_message: error?.message,
        error_code: error?.code,
      });
      throw error;
    }
  }

  /**
   * Return items to cabinet by updating StockID from 0 to 1
   */
  async returnItemsToCabinet(rowIds: number[], userId: number) {
    try {
      if (!rowIds || rowIds.length === 0) {
        throw new Error('Row IDs are required');
      }
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Update StockID from 0 to 1 and CabinetUserID for selected rows
      const updateResult = await this.prisma.$executeRaw`
        UPDATE itemstock
        SET StockID = 1,
            CabinetUserID = ${userId},
            LastCabinetModify = NOW()
        WHERE RowID IN (${Prisma.join(rowIds.map(id => Prisma.sql`${id}`), ',')})
          AND StockID = 0
      `;

      const updatedCount = Number(updateResult || 0);

      // Create success log
      await this.createLog(null, {
        type: 'UPDATE',
        status: 'SUCCESS',
        action: 'returnItemsToCabinet',
        row_ids: rowIds,
        user_id: userId,
        updated_count: updatedCount,
      });

      return {
        success: true,
        updatedCount,
        message: `คืนอุปกรณ์เข้าตู้สำเร็จ ${updatedCount} รายการ`,
      };
    } catch (error) {
      // Create error log
      await this.createLog(null, {
        type: 'UPDATE',
        status: 'ERROR',
        action: 'returnItemsToCabinet',
        row_ids: rowIds,
        user_id: userId,
        error_message: error.message,
        error_code: error.code,
      });
      throw error;
    }
  }

  /**
   * Get ItemStocks with StockID = 1 for dispensing from cabinet
   */
  async getItemStocksForDispenseFromCabinet(filters?: {
    itemCode?: string;
    itemTypeId?: number;
    rfidCode?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const offset = (page - 1) * limit;

      // Build WHERE conditions for raw SQL
      const sqlConditions: Prisma.Sql[] = [
        Prisma.sql`ist.StockID = 1`,
        Prisma.sql`ist.RfidCode <> ''`,
      ];

      if (filters?.itemCode) {
        sqlConditions.push(Prisma.sql`ist.ItemCode = ${filters.itemCode}`);
      }
      if (filters?.itemTypeId) {
        sqlConditions.push(Prisma.sql`i.itemtypeID = ${filters.itemTypeId}`);
      }
      if (filters?.rfidCode) {
        sqlConditions.push(Prisma.sql`ist.RfidCode = ${filters.rfidCode}`);
      }
      if (filters?.startDate) {
        sqlConditions.push(Prisma.sql`DATE(ist.LastCabinetModify) >= ${filters.startDate}`);
      }
      if (filters?.endDate) {
        sqlConditions.push(Prisma.sql`DATE(ist.LastCabinetModify) <= ${filters.endDate}`);
      }

      // Combine WHERE conditions with AND
      const whereClause = Prisma.join(sqlConditions, ' AND ');

      // Get total count first
      const countResult: any[] = await this.prisma.$queryRaw`
        SELECT COUNT(*) as total
        FROM itemstock ist
        INNER JOIN item i ON ist.ItemCode = i.itemcode
        LEFT JOIN itemtype it ON i.itemtypeID = it.ID
        WHERE ${whereClause}
      `;
      const totalCount = Number(countResult[0]?.total || 0);

      // Get data from itemstock with relations using raw query
      const itemStocks: any[] = await this.prisma.$queryRaw`
        SELECT
          ist.RowID,
          ist.ItemCode,
          ist.RfidCode,
          ist.Qty,
          ist.StockID,
          ist.LastCabinetModify,
          ist.CreateDate,
          i.itemcode,
          i.itemname,
          it.TypeName AS itemType,
          i.itemtypeID
        FROM itemstock ist
        INNER JOIN item i ON ist.ItemCode = i.itemcode
        LEFT JOIN itemtype it ON i.itemtypeID = it.ID
        WHERE ${whereClause}
        ORDER BY ist.LastCabinetModify DESC, ist.RowID DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      // Convert BigInt to Number for JSON serialization
      const result = itemStocks.map(item => ({
        ...item,
        RowID: item.RowID ? Number(item.RowID) : null,
        Qty: Number(item.Qty || 0),
        StockID: item.StockID ? Number(item.StockID) : null,
        itemtypeID: item.itemtypeID ? Number(item.itemtypeID) : null,
      }));

      const totalPages = Math.ceil(totalCount / limit);

      // Create success log
      await this.createLog(null, {
        type: 'QUERY',
        status: 'SUCCESS',
        action: 'getItemStocksForDispenseFromCabinet',
        filters: filters || {},
        result_count: result.length,
      });

      return {
        success: true,
        data: result,
        total: totalCount,
        page,
        limit,
        totalPages,
        filters: filters || {},
      };
    } catch (error) {
      // Create error log
      await this.createLog(null, {
        type: 'QUERY',
        status: 'ERROR',
        action: 'getItemStocksForDispenseFromCabinet',
        filters: filters || {},
        error_message: error.message,
        error_code: error.code,
      });
      throw error;
    }
  }

  /**
   * Dispense items from cabinet by updating StockID from 1 to 0
   */
  async dispenseItemsFromCabinet(rowIds: number[], userId: number) {
    try {
      if (!rowIds || rowIds.length === 0) {
        throw new Error('Row IDs are required');
      }
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Update StockID from 1 to 0 and CabinetUserID for selected rows
      const updateResult = await this.prisma.$executeRaw`
        UPDATE itemstock
        SET StockID = 0,
            CabinetUserID = ${userId},
            LastCabinetModify = NOW()
        WHERE RowID IN (${Prisma.join(rowIds.map(id => Prisma.sql`${id}`), ',')})
          AND StockID = 1
      `;

      const updatedCount = Number(updateResult || 0);

      // Create success log
      await this.createLog(null, {
        type: 'UPDATE',
        status: 'SUCCESS',
        action: 'dispenseItemsFromCabinet',
        row_ids: rowIds,
        user_id: userId,
        updated_count: updatedCount,
      });

      return {
        success: true,
        updatedCount,
        message: `เบิกอุปกรณ์จากตู้สำเร็จ ${updatedCount} รายการ`,
      };
    } catch (error) {
      // Create error log
      await this.createLog(null, {
        type: 'UPDATE',
        status: 'ERROR',
        action: 'dispenseItemsFromCabinet',
        row_ids: rowIds,
        user_id: userId,
        error_message: error.message,
        error_code: error.code,
      });
      throw error;
    }
  }
}

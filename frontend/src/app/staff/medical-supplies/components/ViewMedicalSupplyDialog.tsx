'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X, Package, User, Calendar, MapPin, DollarSign } from 'lucide-react';
import { medicalSuppliesApi } from '@/lib/api';
import { toast } from 'sonner';

interface ViewMedicalSupplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplyId: number;
}

interface SupplyDetail {
  id: number;
  hospital?: string;
  en?: string;
  patient_hn?: string;
  first_name?: string;
  lastname?: string;
  patient_name_th?: string;
  patient_name_en?: string;
  usage_datetime?: string;
  usage_type?: string;
  purpose?: string;
  department_code?: string;
  recorded_by_user_id?: number;
  billing_status?: string;
  billing_subtotal?: number;
  billing_tax?: number;
  billing_total?: number;
  billing_currency?: string;
  twu?: string;
  print_location?: string;
  print_date?: string;
  time_print_date?: string;
  update?: string;
  created_at: string;
  updated_at: string;
  supply_items?: SupplyItem[];
}

interface SupplyItem {
  id: number;
  medical_supply_usage_id: number;
  order_item_code?: string;
  order_item_description?: string;
  assession_no?: string;
  order_item_status?: string;
  qty?: number;
  uom?: string;
  supply_code?: string;
  supply_name?: string;
  supply_category?: string;
  unit?: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  expiry_date?: string;
  created_at: string;
  updated_at: string;
}

export default function ViewMedicalSupplyDialog({
  open,
  onOpenChange,
  supplyId,
}: ViewMedicalSupplyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [supply, setSupply] = useState<SupplyDetail | null>(null);

  useEffect(() => {
    if (open && supplyId) {
      fetchSupplyDetail();
    }
  }, [open, supplyId]);

  const fetchSupplyDetail = async () => {
    try {
      setLoading(true);
      const response = await medicalSuppliesApi.getById(supplyId);
      if (response.success && response.data) {
        setSupply(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch supply detail:', error);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    toast.info('กำลังพัฒนาฟีเจอร์พิมพ์');
  };

  const patientName = supply?.patient_name_th || supply?.patient_name_en || 
                      `${supply?.first_name || ''} ${supply?.lastname || ''}`.trim() || '-';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[95vw] w-full max-h-[90vh] overflow-y-auto" style={{ maxWidth: '95vw' }}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">รายละเอียดการใช้เวชภัณฑ์</DialogTitle>
              <DialogDescription>
                {supply?.en && `EN: ${supply.en}`}
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              พิมพ์
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : supply ? (
          <div className="space-y-6">
            {/* Patient Information */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  ข้อมูลผู้ป่วย
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem label="HN" value={supply.patient_hn} />
                <InfoItem label="EN" value={supply.en} />
                <InfoItem label="ชื่อคนไข้" value={patientName} className="md:col-span-2" />
                <InfoItem label="โรงพยาบาล" value={supply.hospital} />
                <InfoItem label="TWU" value={supply.twu} />
              </div>
            </div>

            {/* Print Information */}
            {(supply.print_location || supply.print_date || supply.time_print_date) && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    ข้อมูลการพิมพ์
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoItem label="สถานที่พิมพ์" value={supply.print_location} />
                  <InfoItem label="วันที่พิมพ์" value={supply.print_date} />
                  <InfoItem label="เวลาพิมพ์" value={supply.time_print_date} className="md:col-span-2" />
                </div>
              </div>
            )}

            {/* Usage Information */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  ข้อมูลการใช้งาน
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem label="วันที่ใช้งาน" value={supply.usage_datetime} />
                <InfoItem label="ประเภทการใช้" value={supply.usage_type} />
                <InfoItem label="วัตถุประสงค์" value={supply.purpose} className="md:col-span-2" />
                <InfoItem label="รหัสแผนก" value={supply.department_code} />
                <InfoItem label="อัพเดทล่าสุด" value={supply.update} />
              </div>
            </div>

            {/* Billing Information */}
            {(supply.billing_total || supply.billing_subtotal) && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="h-5 w-5 text-amber-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    ข้อมูลการเรียกเก็บเงิน
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoItem label="สถานะ" value={supply.billing_status} />
                  <InfoItem label="สกุลเงิน" value={supply.billing_currency} />
                  <InfoItem 
                    label="ยอดรวม (ก่อน VAT)" 
                    value={supply.billing_subtotal ? `${supply.billing_subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ${supply.billing_currency}` : undefined}
                  />
                  <InfoItem 
                    label="ภาษี" 
                    value={supply.billing_tax ? `${supply.billing_tax.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ${supply.billing_currency}` : undefined}
                  />
                  <InfoItem 
                    label="ยอดรวมทั้งสิ้น" 
                    value={supply.billing_total ? `${supply.billing_total.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ${supply.billing_currency}` : undefined}
                    className="md:col-span-2 text-lg font-semibold"
                  />
                </div>
              </div>
            )}

            {/* Supply Items */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  รายการเวชภัณฑ์
                </h3>
                <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                  {supply.supply_items?.length || 0} รายการ
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        รหัสสินค้า
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        อุปกรณ์
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        จำนวน
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        หน่วย
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        ราคา/หน่วย
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        ราคารวม
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                    {supply.supply_items && supply.supply_items.length > 0 ? (
                      supply.supply_items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-3 py-3 text-sm text-gray-900 dark:text-white">
                            <div className="font-medium">{item.supply_code || item.order_item_code}</div>
                            {item.assession_no && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                AN: {item.assession_no}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-900 dark:text-white">
                            <div>{item.supply_name || item.order_item_description}</div>
                            {item.supply_category && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {item.supply_category}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-center text-sm text-gray-900 dark:text-white">
                            {item.quantity || item.qty || 0}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
                            {item.unit || item.uom || '-'}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                            {item.unit_price ? (
                              `${item.unit_price.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">
                            {item.total_price ? (
                              `${item.total_price.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                          ไม่มีรายการเวชภัณฑ์
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Timestamps */}
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                สร้างเมื่อ: {new Date(supply.created_at).toLocaleString('th-TH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <div>
                แก้ไขล่าสุด: {new Date(supply.updated_at).toLocaleString('th-TH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            ไม่พบข้อมูล
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({ 
  label, 
  value, 
  className = '' 
}: { 
  label: string; 
  value?: string | null; 
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </dt>
      <dd className="text-sm text-gray-900 dark:text-white font-medium">
        {value || '-'}
      </dd>
    </div>
  );
}


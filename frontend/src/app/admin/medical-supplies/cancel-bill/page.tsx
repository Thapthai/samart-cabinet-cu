'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { XCircle, Plus, Trash2, Save, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { medicalSuppliesApi } from '@/lib/api';
import { toast } from 'sonner';
import { ExpireDateInput } from '@/components/ExpireDateInput';

interface Usage {
  id: number;
  en: string;
  patient_hn: string;
  first_name?: string;
  lastname?: string;
  department_code?: string;
  created_at: string;
  data?: any;
}

interface SupplyItem {
  id: number;
  order_item_code?: string;
  supply_code?: string;
  order_item_description?: string;
  supply_name?: string;
  assession_no: string;
  qty: number;
  qty_used_with_patient?: number;
  qty_returned_to_cabinet?: number;
  order_item_status?: string;
  uom?: string;
}

interface CancelItem {
  supply_item_id: number;
  assession_no: string;
  item_code: string;
  qty: number;
}

interface NewItem {
  item_code: string;
  item_description: string;
  assession_no: string;
  qty: number;
  uom: string;
  item_status?: string;
}

export default function CancelBillPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingUsages, setLoadingUsages] = useState(false);
  const [loadingSupplyItems, setLoadingSupplyItems] = useState(false);

  // Usage selection
  const [usages, setUsages] = useState<Usage[]>([]);
  const [selectedUsageId, setSelectedUsageId] = useState<number | null>(null);
  const [selectedUsage, setSelectedUsage] = useState<Usage | null>(null);

  // Supply items
  const [supplyItems, setSupplyItems] = useState<SupplyItem[]>([]);
  const [selectedSupplyItemIds, setSelectedSupplyItemIds] = useState<number[]>([]);

  // Dates
  const [oldPrintDate, setOldPrintDate] = useState('');
  const [newPrintDate, setNewPrintDate] = useState('');

  // Cancel items (from selected supply items)
  const [cancelItems, setCancelItems] = useState<CancelItem[]>([]);

  // New items
  const [newItems, setNewItems] = useState<NewItem[]>([
    { item_code: '', item_description: '', assession_no: '', qty: 0, uom: '', item_status: 'Verified' },
  ]);

  // Format date helper
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // Fetch MedicalSupplyUsage records
  const fetchUsages = async () => {
    try {
      setLoadingUsages(true);
      const result = await medicalSuppliesApi.getAll({
        page: 1,
        limit: 100,
        startDate: '',
        endDate: '',
      });

      if (result.data) {
        const usagesList = Array.isArray(result.data) ? result.data : [result.data];
        // Filter usages that have supply_items (not Discontinue)
        const usagesWithItems = usagesList.filter((usage: any) => {
          const usageData = usage.data || usage;
          return usageData.supply_items?.some((item: any) => {
            return !['discontinue', 'discontinued'].includes(item.order_item_status?.toLowerCase() ?? '');
          });
        });
        setUsages(usagesWithItems);
      }
    } catch (error: any) {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setLoadingUsages(false);
    }
  };

  // Fetch SupplyUsageItems for selected usage
  const fetchSupplyItems = async (usageId: number) => {
    try {
      setLoadingSupplyItems(true);
      const result = await medicalSuppliesApi.getSupplyItemsByUsageId(usageId);

      if (result.success && result.data) {
        // Filter items that are not Discontinue
        const availableItems = result.data.filter((item: any) => {
          return item.order_item_status?.toLowerCase() !== 'discontinue';
        });
        setSupplyItems(availableItems);
      }
    } catch (error: any) {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setLoadingSupplyItems(false);
    }
  };

  // Handle usage selection
  const handleUsageSelect = async (usageId: number) => {
    setSelectedUsageId(usageId);
    const usage = usages.find((u) => (u.data || u).id === usageId);
    if (usage) {
      const usageData = usage.data || usage;
      setSelectedUsage(usageData);
      setSelectedSupplyItemIds([]);
      setCancelItems([]);
      await fetchSupplyItems(usageId);
    }
  };

  // Handle supply item selection (multi-select)
  const handleSupplyItemToggle = (itemId: number) => {
    setSelectedSupplyItemIds((prev) => {
      const isSelected = prev.includes(itemId);
      if (isSelected) {
        // Remove from selection and cancel items
        setCancelItems((items) => items.filter((item) => item.supply_item_id !== itemId));
        return prev.filter((id) => id !== itemId);
      } else {
        // Add to selection and create cancel item
        const item = supplyItems.find((i) => i.id === itemId);
        if (item) {
          const cancelItem: CancelItem = {
            supply_item_id: itemId,
            assession_no: item.assession_no,
            item_code: item.order_item_code || item.supply_code || '',
            qty: item.qty,
          };
          setCancelItems((items) => [...items, cancelItem]);
        }
        return [...prev, itemId];
      }
    });
  };

  const addNewItem = () => {
    setNewItems([...newItems, { item_code: '', item_description: '', assession_no: '', qty: 0, uom: '', item_status: 'Verified' }]);
  };

  const removeNewItem = (index: number) => {
    setNewItems(newItems.filter((_, i) => i !== index));
  };

  const updateNewItem = (index: number, field: keyof NewItem, value: string | number) => {
    const updated = [...newItems];
    updated[index] = { ...updated[index], [field]: value };
    setNewItems(updated);
  };

  const handleSubmit = async () => {
    if (!selectedUsageId || !selectedUsage) {
      toast.error('กรุณาเลือก MedicalSupplyUsage');
      return;
    }

    if (!oldPrintDate || !newPrintDate) {
      toast.error('กรุณากรอกวันที่ Print เดิมและใหม่');
      return;
    }

    if (cancelItems.length === 0) {
      toast.error('กรุณาเลือกรายการที่ต้องการยกเลิก');
      return;
    }

    // Validate: ถ้าเป็นวันเดียวกัน ต้องมีรายการใหม่
    const isSameDay = oldPrintDate === newPrintDate;
    if (isSameDay && (!newItems || newItems.length === 0 || !newItems.some(item => item.item_code))) {
      toast.error('กรณี Cancel Bill ภายในวันเดียวกัน ต้องมีรายการใหม่ที่ต้องการเพิ่ม');
      return;
    }

    try {
      setLoading(true);
      const usageData = selectedUsage.data || selectedUsage;
      const data = {
        usageId: selectedUsageId,
        supplyItemIds: cancelItems.map(item => item.supply_item_id),
        oldPrintDate,
        newPrintDate,
        newItems: newItems.length > 0 && newItems.some(item => item.item_code)
          ? newItems.filter(item => item.item_code && item.item_description && item.assession_no && item.qty > 0).map(item => ({
              item_code: item.item_code,
              item_description: item.item_description,
              assession_no: item.assession_no,
              qty: item.qty,
              uom: item.uom,
              item_status: item.item_status || 'Verified',
            }))
          : undefined,
      };

      const result = await medicalSuppliesApi.handleCancelBill(data);

      if (result.success) {
        toast.success('จัดการ Cancel Bill สำเร็จ');
        // Reset form
        setSelectedUsageId(null);
        setSelectedUsage(null);
        setSupplyItems([]);
        setSelectedSupplyItemIds([]);
        setCancelItems([]);
        setOldPrintDate('');
        setNewPrintDate('');
        setNewItems([{ item_code: '', item_description: '', assession_no: '', qty: 0, uom: '', item_status: 'Verified' }]);
        // Refresh usages
        await fetchUsages();
      } else {
        toast.error(result.message || 'เกิดข้อผิดพลาด');
      }
    } catch (error: any) {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsages();
  }, []);

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                จัดการ Cancel Bill
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                เลือก MedicalSupplyUsage และ SupplyUsageItem ที่ต้องการยกเลิก
              </p>
            </div>
          </div>

          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">คำอธิบาย</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-blue-800 font-semibold">กรณี Cancel Bill ภายในวันเดียวกัน:</p>
              <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
                <li>เลือก MedicalSupplyUsage และ SupplyUsageItem ที่ต้องการยกเลิก</li>
                <li>API จะอัพเดต SupplyUsageItem status เป็น Discontinue</li>
                <li>API จะส่งรายการใหม่ (Status = Verified) เพื่อ Mapping กับ EN/HN ใน SmartCabinet</li>
              </ul>
              <p className="text-sm text-blue-800 font-semibold mt-3">กรณี Cancel Bill ข้ามวัน:</p>
              <p className="text-sm text-blue-800">
                ส่ง Update รายการเวชภัณฑ์ใน Episode นั้นในวันที่ของการ Print Receipt/Invoice ใหม่
              </p>
            </CardContent>
          </Card>

          {/* Step 1: Select Usage */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>ขั้นตอนที่ 1: เลือก MedicalSupplyUsage</CardTitle>
                <Button onClick={fetchUsages} disabled={loadingUsages} variant="outline" size="sm">
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingUsages ? 'animate-spin' : ''}`} />
                  รีเฟรช
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={selectedUsageId?.toString() || ''}
                onValueChange={(value) => handleUsageSelect(parseInt(value))}
                disabled={loadingUsages}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="เลือก MedicalSupplyUsage" />
                </SelectTrigger>
                <SelectContent>
                  {usages.length === 0 ? (
                    <SelectItem value="no-data" disabled>
                      ไม่พบข้อมูล
                    </SelectItem>
                  ) : (
                    usages.map((usage: Usage) => {
                      const u = usage.data || usage;
                      return (
                        <SelectItem key={u.id} value={u.id.toString()}>
                          {u.en || u.id} - {u.patient_hn} - {u.first_name} {u.lastname}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              {selectedUsage && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-semibold text-blue-900">EN:</span> {selectedUsage.en || '-'}
                    </div>
                    <div>
                      <span className="font-semibold text-blue-900">HN:</span> {selectedUsage.patient_hn || '-'}
                    </div>
                    <div className="col-span-2">
                      <span className="font-semibold text-blue-900">ชื่อคนไข้:</span> {selectedUsage.first_name || ''} {selectedUsage.lastname || ''}
                    </div>
                    <div>
                      <span className="font-semibold text-blue-900">แผนก:</span> {selectedUsage.department_code || '-'}
                    </div>
                    <div>
                      <span className="font-semibold text-blue-900">วันที่:</span> {selectedUsage.created_at ? formatDate(selectedUsage.created_at) : '-'}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Select Supply Items */}
          {selectedUsageId && (
            <Card>
              <CardHeader>
                <CardTitle>ขั้นตอนที่ 2: เลือก SupplyUsageItem ที่ต้องการยกเลิก</CardTitle>
                <CardDescription>เลือกรายการที่ต้องการ Discontinue (สามารถเลือกหลายรายการ)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingSupplyItems ? (
                  <div className="text-center py-4">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                    <p className="text-sm text-gray-500 mt-2">กำลังโหลด...</p>
                  </div>
                ) : supplyItems.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    ไม่พบรายการที่สามารถยกเลิกได้
                  </div>
                ) : (
                  <div className="space-y-2">
                    {supplyItems.map((item) => {
                      const isSelected = selectedSupplyItemIds.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSupplyItemToggle(item.id)}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-red-50 border-red-300'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                              <div>
                                <span className="font-semibold">รหัส:</span> {item.order_item_code || item.supply_code || '-'}
                              </div>
                              <div>
                                <span className="font-semibold">ชื่อ:</span> {item.order_item_description || item.supply_name || '-'}
                              </div>
                              <div>
                                <span className="font-semibold">Assession No:</span> {item.assession_no || '-'}
                              </div>
                              <div>
                                <span className="font-semibold">จำนวน:</span> {item.qty || 0}
                              </div>
                            </div>
                            <Badge variant={isSelected ? 'destructive' : 'outline'}>
                              {isSelected ? 'เลือกแล้ว' : 'คลิกเพื่อเลือก'}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Dates and New Items */}
          {cancelItems.length > 0 && (
            <>
              {/* Dates */}
              <Card>
                <CardHeader>
                  <CardTitle>ขั้นตอนที่ 3: ระบุวันที่ Print</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="old-print-date">วันที่ Print เดิม *</Label>
                      <ExpireDateInput
                        id="old-print-date"
                        value={oldPrintDate}
                        onChange={(ymd) => setOldPrintDate(ymd)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-print-date">วันที่ Print ใหม่ *</Label>
                      <ExpireDateInput
                        id="new-print-date"
                        value={newPrintDate}
                        onChange={(ymd) => setNewPrintDate(ymd)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* New Items */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>
                        รายการใหม่ {oldPrintDate === newPrintDate && '(จำเป็นสำหรับ Cancel Bill ภายในวันเดียวกัน)'}
                      </CardTitle>
                      <CardDescription>
                        รายการใหม่ที่ต้องการเพิ่ม (Status = Verified)
                      </CardDescription>
                    </div>
                    <Button onClick={addNewItem} size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      เพิ่มรายการ
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {newItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg">
                      <div className="space-y-2">
                        <Label>รหัสอุปกรณ์ *</Label>
                        <Input
                          value={item.item_code}
                          onChange={(e) => updateNewItem(index, 'item_code', e.target.value)}
                          placeholder="IER03"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>คำอธิบาย *</Label>
                        <Input
                          value={item.item_description}
                          onChange={(e) => updateNewItem(index, 'item_description', e.target.value)}
                          placeholder="JELCO IV NO,18"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Assession No *</Label>
                        <Input
                          value={item.assession_no}
                          onChange={(e) => updateNewItem(index, 'assession_no', e.target.value)}
                          placeholder="7938884/246"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>จำนวน *</Label>
                        <Input
                          type="number"
                          value={item.qty}
                          onChange={(e) => updateNewItem(index, 'qty', parseInt(e.target.value) || 0)}
                          placeholder="2"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>หน่วยนับ *</Label>
                        <Input
                          value={item.uom}
                          onChange={(e) => updateNewItem(index, 'uom', e.target.value)}
                          placeholder="Each"
                        />
                      </div>
                      <div className="flex items-end">
                        {newItems.length > 1 && (
                          <Button
                            onClick={() => removeNewItem(index)}
                            variant="destructive"
                            size="sm"
                            className="w-full"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            ลบ
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          {/* Submit Button */}
          {cancelItems.length > 0 && oldPrintDate && newPrintDate && (
            <Card>
              <CardContent className="pt-6">
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>กำลังประมวลผล...</>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      บันทึกการ Cancel Bill
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

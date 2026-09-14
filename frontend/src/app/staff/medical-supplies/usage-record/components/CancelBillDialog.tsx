'use client';

import { useState, useEffect } from 'react';
import { XCircle, Plus, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { medicalSuppliesApi } from '@/lib/api';
import { toast } from 'sonner';
import { ExpireDateInput } from '@/components/ExpireDateInput';

interface CancelItem {
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

interface CancelBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supply: any;
  onSuccess?: () => void;
}

export default function CancelBillDialog({
  open,
  onOpenChange,
  supply,
  onSuccess,
}: CancelBillDialogProps) {
  const [loading, setLoading] = useState(false);
  const supplyData = supply?.data || supply || {};

  const [en, setEn] = useState('');
  const [hn, setHn] = useState('');
  const [oldPrintDate, setOldPrintDate] = useState('');
  const [newPrintDate, setNewPrintDate] = useState('');

  const [cancelItems, setCancelItems] = useState<CancelItem[]>([
    { assession_no: '', item_code: '', qty: 0 },
  ]);

  const [newItems, setNewItems] = useState<NewItem[]>([
    { item_code: '', item_description: '', assession_no: '', qty: 0, uom: '', item_status: 'Verified' },
  ]);

  useEffect(() => {
    if (supplyData && open) {
      setEn(supplyData.en || '');
      setHn(supplyData.patient_hn || '');
      
      // ตั้งค่า oldPrintDate จาก print_date หรือ update
      const printDate = supplyData.print_date || supplyData.update;
      if (printDate) {
        try {
          const date = new Date(printDate);
          setOldPrintDate(date.toISOString().split('T')[0]);
        } catch (e) {
          setOldPrintDate('');
        }
      }
      
      // ตั้งค่า newPrintDate เป็นวันปัจจุบัน
      setNewPrintDate(new Date().toISOString().split('T')[0]);
      
      // เตรียมรายการที่ต้องการยกเลิกจาก supply_items
      const supplyItems = supplyData.supply_items || [];
      if (supplyItems.length > 0) {
        setCancelItems(
          supplyItems.map((item: any) => ({
            assession_no: item.assession_no || '',
            item_code: item.order_item_code || item.supply_code || '',
            qty: item.qty || 0,
          }))
        );
      }
    }
  }, [supplyData, open]);

  const addCancelItem = () => {
    setCancelItems([...cancelItems, { assession_no: '', item_code: '', qty: 0 }]);
  };

  const removeCancelItem = (index: number) => {
    setCancelItems(cancelItems.filter((_, i) => i !== index));
  };

  const updateCancelItem = (index: number, field: keyof CancelItem, value: string | number) => {
    const updated = [...cancelItems];
    updated[index] = { ...updated[index], [field]: value };
    setCancelItems(updated);
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
    if (!en || !hn || !oldPrintDate || !newPrintDate) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (cancelItems.length === 0 || cancelItems.some(item => !item.assession_no || !item.item_code || !item.qty)) {
      toast.error('กรุณากรอกรายการที่ต้องการยกเลิกให้ครบถ้วน');
      return;
    }

    try {
      setLoading(true);
      const data = {
        en,
        hn,
        oldPrintDate,
        newPrintDate,
        cancelItems: cancelItems.filter(item => item.assession_no && item.item_code && item.qty > 0),
        newItems: newItems.length > 0 && newItems.some(item => item.item_code)
          ? newItems.filter(item => item.item_code && item.item_description && item.assession_no && item.qty > 0)
          : undefined,
      };

      const result = await medicalSuppliesApi.handleCrossDayCancelBill(data);

      if (result.success) {
        toast.success('จัดการ Cancel Bill สำเร็จ');
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(result.message || 'เกิดข้อผิดพลาด');
      }
    } catch (error: any) {
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            จัดการ Cancel Bill ข้ามวัน
          </DialogTitle>
          <DialogDescription>
            กรณีมีการ Cancel Bill ยกเลิกรายการใบเสร็จข้ามวัน
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              ส่ง Update รายการเวชภัณฑ์ใน Episode นั้นในวันที่ของการ Print Receipt/Invoice ใหม่
              Vending เก็บเป็น Transaction ใหม่ในวันที่และเวลาของการ Print
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="en">Episode Number (EN) *</Label>
                <Input
                  id="en"
                  value={en}
                  onChange={(e) => setEn(e.target.value)}
                  placeholder="O25-000001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hn">Patient HN *</Label>
                <Input
                  id="hn"
                  value={hn}
                  onChange={(e) => setHn(e.target.value)}
                  placeholder="08-020958"
                />
              </div>
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
          </div>

          {/* Cancel Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">รายการที่ต้องการยกเลิก *</h3>
                <p className="text-sm text-gray-500">รายการที่ต้องการ Discontinue</p>
              </div>
              <Button onClick={addCancelItem} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มรายการ
              </Button>
            </div>
            <div className="space-y-3">
              {cancelItems.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Label>Assession No *</Label>
                    <Input
                      value={item.assession_no}
                      onChange={(e) => updateCancelItem(index, 'assession_no', e.target.value)}
                      placeholder="7938884/109"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>รหัสอุปกรณ์ *</Label>
                    <Input
                      value={item.item_code}
                      onChange={(e) => updateCancelItem(index, 'item_code', e.target.value)}
                      placeholder="IER03"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>จำนวน *</Label>
                    <Input
                      type="number"
                      value={item.qty}
                      onChange={(e) => updateCancelItem(index, 'qty', parseInt(e.target.value) || 0)}
                      placeholder="3"
                    />
                  </div>
                  <div className="flex items-end">
                    {cancelItems.length > 1 && (
                      <Button
                        onClick={() => removeCancelItem(index)}
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
            </div>
          </div>

          {/* New Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">รายการใหม่ (ถ้ามี)</h3>
                <p className="text-sm text-gray-500">รายการใหม่ที่ต้องการเพิ่มในวันที่ Print ใหม่</p>
              </div>
              <Button onClick={addNewItem} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มรายการ
              </Button>
            </div>
            <div className="space-y-3">
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
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


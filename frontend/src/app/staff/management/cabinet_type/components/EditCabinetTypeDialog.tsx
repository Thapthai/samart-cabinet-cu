'use client';

import { useEffect, useState } from 'react';
import { cabinetTypeApi, type CabinetTypeRow } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';

interface EditCabinetTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: CabinetTypeRow | null;
  onSuccess: () => void;
}

export default function EditCabinetTypeDialog({
  open,
  onOpenChange,
  row,
  onSuccess,
}: EditCabinetTypeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [nameTh, setNameTh] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [hasExpiry, setHasExpiry] = useState(true);
  const [showRfid, setShowRfid] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (open && row) {
      setNameTh(row.name_th || '');
      setNameEn(row.name_en || '');
      setDescription(row.description || '');
      setSortOrder(String(row.sort_order ?? 0));
      setHasExpiry(row.has_expiry ?? true);
      setShowRfid(row.show_rfid_code ?? false);
      setIsActive(row.is_active ?? true);
    }
  }, [open, row]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!row) return;
    try {
      setLoading(true);
      const so = parseInt(sortOrder, 10);
      const res = await cabinetTypeApi.update(row.code, {
        name_th: nameTh.trim() || undefined,
        name_en: nameEn.trim() || undefined,
        description: description.trim() || undefined,
        sort_order: Number.isNaN(so) ? 0 : so,
        has_expiry: hasExpiry,
        show_rfid_code: showRfid,
        is_active: isActive,
      });
      if (res.success) {
        toast.success('บันทึกแล้ว');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(res.message || 'บันทึกไม่สำเร็จ');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'เกิดข้อผิดพลาด';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            แก้ไขประเภทตู้
          </DialogTitle>
          <DialogDescription>รหัสประเภทไม่สามารถเปลี่ยนได้</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>รหัสประเภท</Label>
            <Input value={row.code} readOnly className="bg-muted font-mono" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ect-nameth">ชื่อ (ไทย)</Label>
              <Input id="ect-nameth" value={nameTh} onChange={(e) => setNameTh(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ect-nameen">ชื่อ (อังกฤษ)</Label>
              <Input id="ect-nameen" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ect-sort">ลำดับแสดง</Label>
            <Input
              id="ect-sort"
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ect-desc">คำอธิบาย</Label>
            <Textarea
              id="ect-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">ใช้วันหมดอายุ</span>
              <Switch checked={hasExpiry} onCheckedChange={setHasExpiry} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">แสดง / ใช้ RFID code</span>
              <Switch checked={showRfid} onCheckedChange={setShowRfid} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">ใช้งาน</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

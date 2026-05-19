'use client';

import { useEffect, useState } from 'react';
import { cabinetTypeApi } from '@/lib/api';
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
import { Layers } from 'lucide-react';

interface CreateCabinetTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateCabinetTypeDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateCabinetTypeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [nameTh, setNameTh] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [hasExpiry, setHasExpiry] = useState(true);
  const [showRfid, setShowRfid] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) {
      setCode('');
      setNameTh('');
      setNameEn('');
      setDescription('');
      setSortOrder('0');
      setHasExpiry(true);
      setShowRfid(false);
      setIsActive(true);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) {
      toast.error('กรุณาระบุรหัสประเภท (เช่น WEIGHING, RFID)');
      return;
    }
    try {
      setLoading(true);
      const so = parseInt(sortOrder, 10);
      const res = await cabinetTypeApi.create({
        code: c,
        name_th: nameTh.trim() || undefined,
        name_en: nameEn.trim() || undefined,
        description: description.trim() || undefined,
        sort_order: Number.isNaN(so) ? 0 : so,
        has_expiry: hasExpiry,
        show_rfid_code: showRfid,
        is_active: isActive,
      });
      if (res.success) {
        toast.success('เพิ่มประเภทตู้แล้ว');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(res.message || 'เพิ่มไม่สำเร็จ');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            เพิ่มประเภทตู้
          </DialogTitle>
          <DialogDescription>
            รหัสจะถูกเก็บเป็นตัวพิมพ์ใหญ่ ใช้ผูกกับฟิลด์ประเภทของตู้แต่ละตัว
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ct-code">รหัสประเภท *</Label>
            <Input
              id="ct-code"
              placeholder="เช่น WEIGHING, RFID"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ct-nameth">ชื่อ (ไทย)</Label>
              <Input id="ct-nameth" value={nameTh} onChange={(e) => setNameTh(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ct-nameen">ชื่อ (อังกฤษ)</Label>
              <Input id="ct-nameen" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ct-sort">ลำดับแสดง</Label>
            <Input
              id="ct-sort"
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ct-desc">คำอธิบาย</Label>
            <Textarea
              id="ct-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">ใช้วันหมดอายุ</p>
                <p className="text-xs text-muted-foreground">RFID มักเปิด, Weighing มักปิด</p>
              </div>
              <Switch checked={hasExpiry} onCheckedChange={setHasExpiry} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">แสดง / ใช้ RFID code</p>
                <p className="text-xs text-muted-foreground">เปิดสำหรับประเภท RFID</p>
              </div>
              <Switch checked={showRfid} onCheckedChange={setShowRfid} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">ใช้งาน</p>
                <p className="text-xs text-muted-foreground">ปิดแล้วจะไม่แสดงในรายการเลือกบางจุด</p>
              </div>
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

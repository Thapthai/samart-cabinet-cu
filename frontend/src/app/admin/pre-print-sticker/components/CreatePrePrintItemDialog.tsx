'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { itemsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type CreatePrePrintItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function CreatePrePrintItemDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreatePrePrintItemDialogProps) {
  const [itemcode2, setItemcode2] = useState('');
  const [itemname, setItemname] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setItemcode2('');
      setItemname('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const code2 = itemcode2.trim();
    const name = itemname.trim();

    if (!code2) {
      toast.error('กรุณากรอกรหัสอุปกรณ์');
      return;
    }
    if (name.length < 2) {
      toast.error('ชื่ออุปกรณ์ต้องมีอย่างน้อย 2 ตัวอักษร');
      return;
    }

    try {
      setLoading(true);
      const res = await itemsApi.createPrePrintItem({ itemcode2: code2, itemname: name });
      if (res?.success === false) {
        toast.error(res.message || 'เพิ่มอุปกรณ์ไม่สำเร็จ');
        return;
      }
      toast.success(`เพิ่มอุปกรณ์ ${code2} สำเร็จ`);
      onOpenChange(false);
      onSuccess();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message ??
        (e as Error)?.message ??
        'เพิ่มอุปกรณ์ไม่สำเร็จ';
      toast.error(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>เพิ่มอุปกรณ์ใหม่</DialogTitle>
          <DialogDescription>
            เพิ่มอุปกรณ์เข้าสู่รายการเตรียมพิมพ์สติ๊กเกอร์
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="pre-print-new-itemcode2">
              รหัสอุปกรณ์ <span className="text-red-500">*</span>
            </Label>
            <Input
              id="pre-print-new-itemcode2"
              placeholder="เช่น 1000123"
              value={itemcode2}
              onChange={(e) => setItemcode2(e.target.value)}
              maxLength={20}
              disabled={loading}
              className="mt-1 font-mono"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="pre-print-new-itemname">
              ชื่ออุปกรณ์ <span className="text-red-500">*</span>
            </Label>
            <Input
              id="pre-print-new-itemname"
              value={itemname}
              onChange={(e) => setItemname(e.target.value)}
              maxLength={255}
              disabled={loading}
              className="mt-1"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading || !itemcode2.trim() || !itemname.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                'บันทึก'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

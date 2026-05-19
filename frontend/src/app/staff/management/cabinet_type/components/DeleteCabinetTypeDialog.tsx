'use client';

import { useState } from 'react';
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
import { toast } from 'sonner';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteCabinetTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: CabinetTypeRow | null;
  onSuccess: () => void;
}

export default function DeleteCabinetTypeDialog({
  open,
  onOpenChange,
  row,
  onSuccess,
}: DeleteCabinetTypeDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!row) return;
    try {
      setLoading(true);
      const res = await cabinetTypeApi.delete(row.code);
      if (res.success) {
        toast.success('ลบแล้ว');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(res.message || 'ลบไม่สำเร็จ');
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            ลบประเภทตู้
          </DialogTitle>
          <DialogDescription>
            {row ? (
              <>
                ยืนยันการลบประเภท <span className="font-mono font-semibold">{row.code}</span>
                {row.name_th ? ` (${row.name_th})` : ''} — ลบไม่ได้หากยังมีตู้อ้างถึงรหัสนี้
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            ยกเลิก
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading || !row}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังลบ...
              </>
            ) : (
              'ลบ'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

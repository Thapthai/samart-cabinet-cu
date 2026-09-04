'use client';

import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { stickerPrintApi, type PrePrintStickerDocument } from '@/lib/api';

type DeletePrePrintStickerDialogProps = {
  open: boolean;
  doc: PrePrintStickerDocument | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: (id: number) => void;
};

export function DeletePrePrintStickerDialog({
  open,
  doc,
  onOpenChange,
  onSuccess,
}: DeletePrePrintStickerDialogProps) {
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!doc) return;
    try {
      setSaving(true);
      const res = await stickerPrintApi.deletePrePrintSticker(doc.id);
      if (res.success) {
        toast.success(res.message || `ลบเอกสาร ${doc.doc_no} สำเร็จ`);
        onSuccess(doc.id);
        onOpenChange(false);
      } else {
        toast.error(res.message || 'ลบเอกสารไม่สำเร็จ');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        'ลบเอกสารไม่สำเร็จ';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ยืนยันการลบ</DialogTitle>
          <DialogDescription>
            ต้องการลบเอกสาร{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{doc?.doc_no}</code>{' '}
            และรายการ lot ทั้งหมดหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            ยกเลิก
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleConfirm()}
            disabled={saving || !doc}
          >
            {saving ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                กำลังลบ…
              </>
            ) : (
              <>
                <Trash2 className="mr-1 h-4 w-4" />
                ลบเอกสาร
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

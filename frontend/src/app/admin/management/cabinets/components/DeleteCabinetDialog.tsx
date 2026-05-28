import { useState } from 'react';
import { cabinetApi } from '@/lib/api';
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
import type { ManagementCabinet } from '../types';
import { cabinetTypeDisplayLabel } from '../types';

interface DeleteCabinetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cabinet: ManagementCabinet | null;
  onSuccess: () => void;
}

export default function DeleteCabinetDialog({
  open,
  onOpenChange,
  cabinet,
  onSuccess,
}: DeleteCabinetDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!cabinet) {
      toast.error('ไม่พบข้อมูลตู้');
      return;
    }

    try {
      setLoading(true);
      const response = await cabinetApi.delete(cabinet.id);

      if (response.success) {
        toast.success('ลบตู้เรียบร้อยแล้ว');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(response.message || 'ไม่สามารถลบตู้ได้');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage =
        err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการลบตู้';

      if (errorMessage.includes('mapping') || errorMessage.includes('ใช้') || errorMessage.includes('department')) {
        toast.error(errorMessage, {
          duration: 5000,
          description: 'กรุณาลบการเชื่อมโยงกับแผนกก่อน',
        });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const typeLine =
    cabinet && (cabinet.cabinet_type || cabinet.cabinetTypeDef)
      ? cabinetTypeDisplayLabel(cabinet)
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <DialogTitle>ยืนยันการลบตู้</DialogTitle>
              <DialogDescription className="mt-1">
                การกระทำนี้ไม่สามารถยกเลิกได้
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-gray-600">
            คุณกำลังจะลบตู้{' '}
            <span className="font-semibold text-gray-900">
              &ldquo;{cabinet?.cabinet_name || cabinet?.cabinet_code || `ID: ${cabinet?.id}`}&rdquo;
            </span>
          </p>
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
            <p className="text-xs text-amber-800">
              <AlertTriangle className="inline h-3 w-3 mr-1" />
              <strong>หมายเหตุ:</strong> หากตู้นี้มีการเชื่อมโยงกับแผนกอยู่ จะไม่สามารถลบได้ กรุณาลบการเชื่อมโยงก่อน
            </p>
          </div>
          {cabinet && (
            <div className="mt-4 rounded-lg bg-gray-50 p-4 space-y-2">
              {cabinet.cabinet_code && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">รหัสตู้:</span>
                  <span className="font-medium">{cabinet.cabinet_code}</span>
                </div>
              )}
              {typeLine && (
                <div className="flex justify-between text-sm gap-2">
                  <span className="text-gray-500 shrink-0">ประเภท:</span>
                  <span className="font-medium text-right">{typeLine}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">สถานะ:</span>
                <span className="font-medium">{cabinet.cabinet_status || 'N/A'}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row gap-3 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            ยกเลิก
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังลบ...
              </>
            ) : (
              'ลบตู้'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

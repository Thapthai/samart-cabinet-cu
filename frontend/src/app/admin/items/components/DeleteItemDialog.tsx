import { useState } from 'react';
import { itemsApi } from '@/lib/api';
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
import type { Item } from '@/types/item';
import { Loader2, AlertTriangle } from 'lucide-react';

interface DeleteItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
  onSuccess: () => void;
}

export default function DeleteItemDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
}: DeleteItemDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!item) {
      toast.error('ไม่พบข้อมูลอุปกรณ์');
      return;
    }

    try {
      setLoading(true);
      const response = await itemsApi.delete(item.itemcode);

      if (response.success) {
        toast.success('ลบอุปกรณ์สำเร็จ');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(response.message || 'ไม่สามารถลบอุปกรณ์ได้');
      }
    } catch (error: any) {
      console.error('Delete item error:', error);
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการลบอุปกรณ์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <DialogTitle>ยืนยันการลบอุปกรณ์</DialogTitle>
              <DialogDescription className="mt-1">
                การกระทำนี้ไม่สามารถยกเลิกได้
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-gray-600">
            คุณกำลังจะลบอุปกรณ์{' '}
            <span className="font-semibold text-gray-900">&quot;{item?.itemname || item?.itemcode}&quot;</span>
          </p>
          {item && (
            <div className="mt-4 rounded-lg bg-gray-50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">รหัสอุปกรณ์:</span>
                <span className="font-medium font-mono">{item.itemcode}</span>
              </div>
              {item.CostPrice !== undefined && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">ราคาทุน:</span>
                  <span className="font-medium">฿{Number(item.CostPrice).toLocaleString()}</span>
                </div>
              )}
              {item.stock_balance !== undefined && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">จำนวนในสต็อก:</span>
                  <span className="font-medium">{item.stock_balance}</span>
                </div>
              )}
              {item.Barcode && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">บาร์โค้ด:</span>
                  <span className="font-medium font-mono">{item.Barcode}</span>
                </div>
              )}
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
              'ลบอุปกรณ์'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

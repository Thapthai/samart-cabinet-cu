import { useState, useEffect } from 'react';
import { itemsApi } from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Item } from '@/types/item';
import { Loader2, AlertCircle } from 'lucide-react';

interface EditItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
  onSuccess: () => void;
}

export default function EditItemDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
}: EditItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [itemname, setItemname] = useState('');
  const [error, setError] = useState('');

  // Update form when item changes or dialog opens
  useEffect(() => {
    if (open && item) {
      setItemname(item.itemname || '');
      setError('');
    }
  }, [open, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!item) {
      toast.error('ไม่พบข้อมูลอุปกรณ์');
      return;
    }

    // Validation
    if (!itemname || itemname.trim().length < 2) {
      setError('อุปกรณ์ต้องมีอย่างน้อย 2 ตัวอักษร');
      return;
    }

    if (itemname.length > 255) {
      setError('อุปกรณ์ต้องไม่เกิน 255 ตัวอักษร');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await itemsApi.update(item.itemcode, { itemname: itemname.trim() });

      if (response.success) {
        toast.success('แก้ไขอุปกรณ์เรียบร้อยแล้ว');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(response.message || 'ไม่สามารถแก้ไขอุปกรณ์ได้');
      }
    } catch (error: any) {
      console.error('Update item error:', error);
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการแก้ไขอุปกรณ์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>แก้ไขอุปกรณ์</DialogTitle>
          <DialogDescription>
            แก้ไขอุปกรณ์: {item?.itemcode || ''}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item Info */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm">
              <span className="text-gray-600">รหัส: </span>
              <code className="text-xs bg-white px-2 py-1 rounded">{item?.itemcode}</code>
            </div>
            <div className="text-sm mt-1">
              <span className="text-gray-600">ชื่อเดิม: </span>
              <span className="font-medium">{item?.itemname}</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* Item Name Input */}
          <div>
            <Label htmlFor="itemname">
              อุปกรณ์ใหม่ <span className="text-red-500">*</span>
            </Label>
            <Input
              id="itemname"
              type="text"
              placeholder="กรอกอุปกรณ์..."
              value={itemname}
              onChange={(e) => {
                setItemname(e.target.value);
                setError('');
              }}
              maxLength={255}
              disabled={loading}
              className="mt-1"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              ความยาว: {itemname.length}/255 ตัวอักษร
            </p>
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
            <Button type="submit" disabled={loading || !itemname.trim()}>
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

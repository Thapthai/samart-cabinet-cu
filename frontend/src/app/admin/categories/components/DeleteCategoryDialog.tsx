import { useState } from 'react';
import { categoriesApi } from '@/lib/api';
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
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import type { Category } from '@/types/item';

interface DeleteCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  onSuccess: () => void;
}

export default function DeleteCategoryDialog({
  open,
  onOpenChange,
  category,
  onSuccess,
}: DeleteCategoryDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!category) {
      toast.error('ไม่พบข้อมูลหมวดหมู่');
      return;
    }

    try {
      setLoading(true);
      const response = await categoriesApi.delete(category.id);

      if (response.success) {
        toast.success('ลบหมวดหมู่เรียบร้อยแล้ว');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(response.message || 'ไม่สามารถลบหมวดหมู่ได้');
      }
    } catch (error: any) {
      // Handle API error response
      const errorMessage = error.response?.data?.message || error.message || 'เกิดข้อผิดพลาดในการลบหมวดหมู่';
      
      // Check if error is about items using this category
      if (errorMessage.includes('item') || errorMessage.includes('อุปกรณ์')) {
        toast.error(errorMessage, {
          duration: 5000,
          description: 'กรุณาลบหรือย้ายอุปกรณ์ที่ใช้หมวดหมู่นี้ออกก่อน',
        });
      } else {
        toast.error(errorMessage);
      }
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
              <DialogTitle>ยืนยันการลบหมวดหมู่</DialogTitle>
              <DialogDescription className="mt-1">
                การกระทำนี้ไม่สามารถยกเลิกได้
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-gray-600">
            คุณกำลังจะลบหมวดหมู่{' '}
            <span className="font-semibold text-gray-900">&quot;{category?.name}&quot;</span>
          </p>
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
            <p className="text-xs text-amber-800">
              <AlertTriangle className="inline h-3 w-3 mr-1" />
              <strong>หมายเหตุ:</strong> หากมีอุปกรณ์ใช้หมวดหมู่นี้อยู่ จะไม่สามารถลบได้ กรุณาลบหรือย้ายอุปกรณ์ก่อน
            </p>
          </div>
          {category && (
            <div className="mt-4 rounded-lg bg-gray-50 p-4 space-y-2">
              {category.description && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">คำอธิบาย:</span>
                  <span className="font-medium">{category.description}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">สถานะ:</span>
                <span className="font-medium">
                  {category.is_active ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                </span>
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
              'ลบหมวดหมู่'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


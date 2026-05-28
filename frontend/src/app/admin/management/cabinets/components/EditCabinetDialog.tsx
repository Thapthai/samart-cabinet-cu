import { useState, useEffect } from 'react';
import { cabinetApi, type CabinetTypeRow } from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Edit } from 'lucide-react';
import type { ManagementCabinet } from '../types';
import CabinetTypeSelect from './CabinetTypeSelect';

interface EditCabinetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cabinet: ManagementCabinet | null;
  onSuccess: () => void;
}

export default function EditCabinetDialog({
  open,
  onOpenChange,
  cabinet,
  onSuccess,
}: EditCabinetDialogProps) {
  const [loading, setLoading] = useState(false);
  const [typesLoading, setTypesLoading] = useState(false);
  const [types, setTypes] = useState<CabinetTypeRow[]>([]);
  const [formData, setFormData] = useState({
    cabinet_name: '',
    stock_id: '',
    cabinet_type: '',
  });

  useEffect(() => {
    if (!open) {
      setFormData({
        cabinet_name: '',
        stock_id: '',
        cabinet_type: '',
      });
      return;
    }
    let cancelled = false;
    (async () => {
      setTypesLoading(true);
      try {
        const res = await cabinetApi.getTypes();
        if (!cancelled && res.success && res.data) {
          setTypes(res.data);
        } else if (!cancelled && res.success === false) {
          toast.error(res.message || 'โหลดประเภทตู้ไม่สำเร็จ');
        }
      } catch {
        if (!cancelled) toast.error('โหลดประเภทตู้ไม่สำเร็จ');
      } finally {
        if (!cancelled) setTypesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (open && cabinet) {
      setFormData({
        cabinet_name: cabinet.cabinet_name || '',
        stock_id: cabinet.stock_id != null ? String(cabinet.stock_id) : '',
        cabinet_type: cabinet.cabinet_type?.trim() || '',
      });
    }
  }, [open, cabinet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cabinet) return;

    try {
      setLoading(true);
      const data: {
        cabinet_name?: string;
        cabinet_type: string;
        stock_id?: number;
      } = {
        cabinet_type: formData.cabinet_type.trim() === '' ? '' : formData.cabinet_type.trim().toUpperCase(),
      };
      if (formData.cabinet_name.trim()) {
        data.cabinet_name = formData.cabinet_name.trim();
      }
      if (formData.stock_id.trim()) {
        const sid = parseInt(formData.stock_id, 10);
        if (!Number.isNaN(sid)) data.stock_id = sid;
      }

      const response = await cabinetApi.update(cabinet.id, data);

      if (response.success) {
        toast.success('แก้ไขตู้เรียบร้อยแล้ว');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(response.message || 'ไม่สามารถแก้ไขตู้ได้');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'เกิดข้อผิดพลาดในการแก้ไขตู้');
    } finally {
      setLoading(false);
    }
  };

  if (!cabinet) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Edit className="h-5 w-5" />
            <span>แก้ไขตู้ Cabinet</span>
          </DialogTitle>
          <DialogDescription>
            เลือก ไม่ระบุ เพื่อถอดประเภทตู้ออกจากตู้นี้
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>รหัสตู้</Label>
            <Input value={cabinet.cabinet_code || '-'} readOnly className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cabinet_type_edit">ประเภทตู้</Label>
            {typesLoading ? (
              <p className="text-sm text-muted-foreground">กำลังโหลดประเภทตู้...</p>
            ) : (
              <CabinetTypeSelect
                id="cabinet_type_edit"
                value={formData.cabinet_type}
                onValueChange={(v) => setFormData({ ...formData, cabinet_type: v })}
                types={types}
                allowNone
                disabled={loading}
                placeholder="เลือกประเภทตู้"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cabinet_name">ชื่อตู้</Label>
            <Input
              id="cabinet_name"
              placeholder="เช่น ตู้ A1, ตู้ห้องผ่าตัด"
              value={formData.cabinet_name}
              onChange={(e) => setFormData({ ...formData, cabinet_name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock_id">Stock ID</Label>
            <Input
              id="stock_id"
              type="number"
              placeholder="กรอก Stock ID"
              value={formData.stock_id}
              onChange={(e) => setFormData({ ...formData, stock_id: e.target.value })}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              disabled={loading || typesLoading}
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { staffItemsApi } from '@/lib/staffApi/itemsApi';
import { itemSchema, type ItemFormData } from '@/lib/validations';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';

interface CreateItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: number;
  onSuccess: () => void;
}

export default function CreateItemDialog({
  open,
  onOpenChange,
  userId,
  onSuccess,
}: CreateItemDialogProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      itemcode: '',
      itemname: '',
      Alternatename: '',
      Barcode: '',
      Description: '',
      CostPrice: 0,
      stock_balance: 0,
      item_status: 0,
    },
  });

  // Reset form when dialog is closed
  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const onSubmit = async (data: ItemFormData) => {
    try {
      setLoading(true);
      const response = await staffItemsApi.create({
        ...data,
        IsNormal: '1',
        IsStock: true,
        item_status: data.item_status || 0,
      });

      if (response.success) {
        toast.success('เพิ่มอุปกรณ์เรียบร้อยแล้ว');
        form.reset();
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(response.message || 'ไม่สามารถเพิ่มอุปกรณ์ได้');
      }
    } catch (error: any) {
      console.error('Create item error:', error);
      toast.error(error.response?.data?.message || 'เกิดข้อผิดพลาดในการเพิ่มอุปกรณ์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>เพิ่มอุปกรณ์ใหม่</DialogTitle>
          <DialogDescription>
            เพิ่มเวชภัณฑ์หรืออุปกรณ์ใหม่เข้าสู่ระบบ
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* รหัสสินค้า */}
            <FormField
              control={form.control}
              name="itemcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>รหัสสินค้า *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="เช่น MED2024001"
                      maxLength={25}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* อุปกรณ์ */}
            <FormField
              control={form.control}
              name="itemname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>อุปกรณ์ *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="เช่น ชุดเครื่องมือผ่าตัดใหญ่"
                      maxLength={255}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ชื่อสำรอง */}
            <FormField
              control={form.control}
              name="Alternatename"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ชื่อสำรอง (EN)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="เช่น Major Surgical Instrument Set"
                      maxLength={100}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Barcode */}
            <FormField
              control={form.control}
              name="Barcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>บาร์โค้ด</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="เช่น 8859876543210"
                      maxLength={50}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* ราคาทุน */}
              <FormField
                control={form.control}
                name="CostPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ราคาทุน</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* จำนวนในสต็อก */}
              <FormField
                control={form.control}
                name="stock_balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>จำนวนในสต็อก</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* คำอธิบาย */}
            <FormField
              control={form.control}
              name="Description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>คำอธิบาย</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="รายละเอียดของสินค้า..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'กำลังบันทึก...' : 'บันทึกสินค้า'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

interface DeleteMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  saving: boolean;
}

export default function DeleteMappingDialog({
  open,
  onOpenChange,
  onConfirm,
  saving,
}: DeleteMappingDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
          <AlertDialogDescription>
            คุณแน่ใจหรือไม่ที่จะลบการเชื่อมโยงนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={saving}>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังลบ...
              </>
            ) : (
              "ลบ"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

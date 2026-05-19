"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import { authApi } from "@/lib/api";
import { registerAdminSchema, type RegisterAdminFormData } from "@/lib/validations";
import { toast } from "sonner";

function apiErrorMessage(err: unknown): string {
  const data = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  const m = data?.message;
  if (Array.isArray(m)) return m.join(" ");
  if (typeof m === "string") return m;
  return (err as Error)?.message || "คำขอไม่สำเร็จ";
}

interface CreateAdminUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function CreateAdminUserDialog({ open, onOpenChange, onCreated }: CreateAdminUserDialogProps) {
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegisterAdminFormData>({
    resolver: zodResolver(registerAdminSchema),
    defaultValues: { fname: "", lname: "", email: "", password: "" },
  });

  useEffect(() => {
    if (open) {
      reset({ fname: "", lname: "", email: "", password: "" });
      setShowPassword(false);
    }
  }, [open, reset]);

  const onSubmit = async (data: RegisterAdminFormData) => {
    try {
      const res = await authApi.registerAdmin({
        email: data.email.trim(),
        password: data.password,
        fname: data.fname.trim(),
        lname: data.lname.trim(),
      });
      if (res.success) {
        toast.success(res.message || "สร้างบัญชี Admin สำเร็จ");
        onOpenChange(false);
        onCreated();
        return;
      }
      toast.error(res.message || "สร้างบัญชีไม่สำเร็จ");
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>เพิ่มผู้ใช้ Admin</DialogTitle>
          <DialogDescription>
            ลงทะเบียนผู้ใช้ Admin ผ่าน POST /auth/register/admin
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="modal-fname">ชื่อ</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="modal-fname"
                    className="pl-10"
                    placeholder="ชื่อ"
                    autoComplete="given-name"
                    {...register("fname")}
                  />
                </div>
                {errors.fname && <p className="text-sm text-red-600">{errors.fname.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="modal-lname">นามสกุล</Label>
                <Input
                  id="modal-lname"
                  placeholder="นามสกุล"
                  autoComplete="family-name"
                  {...register("lname")}
                />
                {errors.lname && <p className="text-sm text-red-600">{errors.lname.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="modal-email">อีเมล</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="modal-email"
                  type="email"
                  className="pl-10"
                  placeholder="admin@example.com"
                  autoComplete="email"
                  {...register("email")}
                />
              </div>
              {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="modal-password">รหัสผ่าน</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="modal-password"
                  type={showPassword ? "text" : "password"}
                  className="pl-10 pr-10"
                  placeholder="พิมพ์เล็ก ใหญ่ ตัวเลข และอักขระพิเศษ"
                  autoComplete="new-password"
                  {...register("password")}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t pt-4 gap-3 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                "บันทึก"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

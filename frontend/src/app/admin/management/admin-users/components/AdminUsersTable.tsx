"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserCog } from "lucide-react";
import type { AdminJwtUserRow } from "@/types/auth";

interface AdminUsersTableProps {
  users: AdminJwtUserRow[];
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("th-TH", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

export default function AdminUsersTable({ users }: AdminUsersTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(users.length / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, Math.max(1, totalPages));
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageRows = users.slice(startIndex, endIndex);

  return (
    <Card className="shadow-sm border-gray-200/80 overflow-hidden rounded-xl">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50">
        <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
          <UserCog className="h-5 w-5 text-amber-600" />
          รายการผู้ใช้ Admin (JWT) ({users.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto rounded-b-xl">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-100/80 hover:bg-slate-100/80 border-b border-slate-200">
                <TableHead className="text-slate-600 font-semibold w-14 text-center">ลำดับ</TableHead>
                <TableHead className="text-slate-600 font-semibold">ชื่อ</TableHead>
                <TableHead className="text-slate-600 font-semibold">อีเมล</TableHead>
                <TableHead className="text-slate-600 font-semibold">รหัสผ่าน</TableHead>
                <TableHead className="text-slate-600 font-semibold text-center">ยืนยันอีเมล</TableHead>
                <TableHead className="text-slate-600 font-semibold text-center">2FA</TableHead>
                <TableHead className="text-slate-600 font-semibold">สถานะ</TableHead>
                <TableHead className="text-slate-600 font-semibold">เข้าสู่ระบบล่าสุด</TableHead>
                <TableHead className="text-slate-600 font-semibold">สร้างเมื่อ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                    ไม่พบข้อมูล
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((row, index) => (
                  <TableRow key={row.id} className="hover:bg-slate-50/80">
                    <TableCell className="text-center tabular-nums text-slate-700">
                      {(safePage - 1) * itemsPerPage + index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">{row.name}</TableCell>
                    <TableCell className="text-slate-700">{row.email}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {row.has_password ? "ตั้งแล้ว" : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={row.email_verified ? "default" : "secondary"}
                        className={
                          row.email_verified
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : ""
                        }
                      >
                        {row.email_verified ? "แล้ว" : "ยัง"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={row.two_factor_enabled ? "default" : "outline"}>
                        {row.two_factor_enabled ? "เปิด" : "ปิด"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={row.is_active ? "default" : "secondary"}
                        className={
                          row.is_active
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : ""
                        }
                      >
                        {row.is_active ? "ใช้งาน" : "ไม่ใช้งาน"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-slate-600">{fmtDate(row.last_login_at)}</TableCell>
                    <TableCell className="text-sm tabular-nums text-slate-600">{fmtDate(row.created_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {users.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-4 pb-4 gap-4 flex-wrap">
            <div className="text-sm text-muted-foreground">
              แสดง {startIndex + 1}-{Math.min(endIndex, users.length)} จาก {users.length} รายการ
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={safePage === 1}
                className="shadow-sm"
              >
                ก่อนหน้า
              </Button>
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={safePage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={safePage === totalPages}
                className="shadow-sm"
              >
                ถัดไป
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

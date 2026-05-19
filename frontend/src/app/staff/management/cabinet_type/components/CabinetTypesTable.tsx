'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Loader2, Trash2, Layers } from 'lucide-react';
import type { CabinetTypeRow } from '@/lib/api';

interface CabinetTypesTableProps {
  rows: CabinetTypeRow[];
  loading: boolean;
  onEdit: (row: CabinetTypeRow) => void;
  onDelete: (row: CabinetTypeRow) => void;
}

function BoolBadge({ value }: { value: boolean }) {
  return value ? (
    <Badge className="bg-emerald-600 hover:bg-emerald-600">ใช่</Badge>
  ) : (
    <Badge variant="secondary">ไม่</Badge>
  );
}

export default function CabinetTypesTable({ rows, loading, onEdit, onDelete }: CabinetTypesTableProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          กำลังโหลด...
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <Layers className="mx-auto mb-3 h-12 w-12 opacity-40" />
          <p>ยังไม่มีประเภทตู้ — เพิ่มจากปุ่มด้านบน หรือรัน SQL seed บน database</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>รายการประเภทตู้ ({rows.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">ลำดับ</TableHead>
                <TableHead className="font-mono">รหัส</TableHead>
                <TableHead>ชื่อ (ไทย)</TableHead>
                <TableHead>ชื่อ (EN)</TableHead>
                <TableHead className="text-center">หมดอายุ</TableHead>
                <TableHead className="text-center">RFID</TableHead>
                <TableHead className="text-center">ใช้งาน</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.code}>
                  <TableCell className="text-center tabular-nums">{r.sort_order}</TableCell>
                  <TableCell className="font-mono font-medium">{r.code}</TableCell>
                  <TableCell>{r.name_th || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{r.name_en || '—'}</TableCell>
                  <TableCell className="text-center">
                    <BoolBadge value={r.has_expiry} />
                  </TableCell>
                  <TableCell className="text-center">
                    <BoolBadge value={r.show_rfid_code} />
                  </TableCell>
                  <TableCell className="text-center">
                    {r.is_active ? (
                      <Badge className="bg-sky-600 hover:bg-sky-600">เปิด</Badge>
                    ) : (
                      <Badge variant="outline">ปิด</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(r)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => onDelete(r)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

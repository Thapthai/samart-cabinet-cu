'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { cabinetTypeApi, type CabinetTypeRow } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Layers, Plus } from 'lucide-react';
import CreateCabinetTypeDialog from './components/CreateCabinetTypeDialog';
import EditCabinetTypeDialog from './components/EditCabinetTypeDialog';
import DeleteCabinetTypeDialog from './components/DeleteCabinetTypeDialog';
import CabinetTypesTable from './components/CabinetTypesTable';

export default function CabinetTypeManagementPage() {
  const [rows, setRows] = useState<CabinetTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<CabinetTypeRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await cabinetTypeApi.getAll();
      if (res.success && Array.isArray(res.data)) {
        setRows(res.data);
      } else {
        setRows([]);
        if (res.message) toast.error(res.message);
      }
    } catch {
      toast.error('โหลดข้อมูลไม่สำเร็จ');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-violet-100 p-2.5">
                <Layers className="h-6 w-6 text-violet-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">จัดการประเภทตู้</h1>
                <p className="text-sm text-slate-500">
                  กำหนดรหัสประเภท การใช้วันหมดอายุ และการแสดง RFID — ใช้คู่กับเมนูจัดการตู้
                </p>
              </div>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="shrink-0 gap-2">
            <Plus className="h-4 w-4" />
            เพิ่มประเภท
          </Button>
        </div>

        <CabinetTypesTable
          rows={rows}
          loading={loading}
          onEdit={(r) => {
            setSelected(r);
            setEditOpen(true);
          }}
          onDelete={(r) => {
            setSelected(r);
            setDeleteOpen(true);
          }}
        />
      </div>

      <CreateCabinetTypeDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={load} />
      <EditCabinetTypeDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        row={selected}
        onSuccess={load}
      />
      <DeleteCabinetTypeDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        row={selected}
        onSuccess={load}
      />
    </>

  );
}

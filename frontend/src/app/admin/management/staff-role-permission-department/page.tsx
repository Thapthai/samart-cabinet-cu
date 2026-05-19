'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { departmentApi, staffRoleApi, staffRolePermissionDepartmentApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Building2, Layers, Loader2, RefreshCw, Save, Search } from 'lucide-react';
import { toast } from 'sonner';

interface StaffRoleRow {
    id: number;
    code: string;
    name: string;
    is_active?: boolean;
}

interface DepartmentRow {
    ID: number;
    DepName?: string | null;
    DepName2?: string | null;
    IsCancel?: number | null;
}

function mainDepartmentLabel(d: DepartmentRow): string {
    return (d.DepName ?? d.DepName2 ?? '').trim() || `แผนก #${d.ID}`;
}

export default function StaffRolePermissionDepartmentPage() {
    const [roles, setRoles] = useState<StaffRoleRow[]>([]);
    const [departments, setDepartments] = useState<DepartmentRow[]>([]);
    const [roleId, setRoleId] = useState<string>('');
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [unrestrictedFromServer, setUnrestrictedFromServer] = useState(false);
    const [loadingBoot, setLoadingBoot] = useState(true);
    const [loadingRole, setLoadingRole] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deptSearch, setDeptSearch] = useState('');

    const loadBootstrap = useCallback(async () => {
        try {
            setLoadingBoot(true);
            const [rolesRes, deptRes] = await Promise.all([
                staffRoleApi.getAll(),
                departmentApi.getAll({ page: 1, limit: 5000, isCancel: false }),
            ]);
            const rolesData = Array.isArray(rolesRes?.data)
                ? rolesRes.data
                : (rolesRes as { data?: StaffRoleRow[] })?.data ?? [];
            const deptData = Array.isArray(deptRes?.data)
                ? deptRes.data
                : (deptRes as { data?: DepartmentRow[] })?.data ?? [];

            setRoles((rolesData as StaffRoleRow[]).sort((a, b) => a.id - b.id));
            setDepartments(
                (deptData as DepartmentRow[])
                    .filter((d) => d?.ID != null && d.ID > 0)
                    .sort((a, b) => mainDepartmentLabel(a).localeCompare(mainDepartmentLabel(b), 'th')),
            );
        } catch (e: unknown) {
            console.error(e);
            toast.error('โหลดข้อมูลไม่สำเร็จ');
        } finally {
            setLoadingBoot(false);
        }
    }, []);

    const loadForRole = useCallback(async (id: number) => {
        try {
            setLoadingRole(true);
            const res = await staffRolePermissionDepartmentApi.getByRole({ role_id: id });
            const data = res?.data;
            if (!data) {
                toast.error(res?.message ?? 'ไม่พบข้อมูลสิทธิ์แผนก');
                setSelected(new Set());
                setUnrestrictedFromServer(true);
                return;
            }
            setUnrestrictedFromServer(data.unrestricted === true);
            setSelected(new Set((data.departments ?? []).map((d) => d.id)));
        } catch (e: unknown) {
            console.error(e);
            toast.error('โหลดสิทธิ์แผนกไม่สำเร็จ');
            setSelected(new Set());
            setUnrestrictedFromServer(true);
        } finally {
            setLoadingRole(false);
        }
    }, []);

    useEffect(() => {
        loadBootstrap();
    }, [loadBootstrap]);

    useEffect(() => {
        if (!roleId) {
            setSelected(new Set());
            setUnrestrictedFromServer(false);
            setDeptSearch('');
            return;
        }
        setDeptSearch('');
        const id = parseInt(roleId, 10);
        if (Number.isNaN(id)) return;
        loadForRole(id);
    }, [roleId, loadForRole]);

    const toggle = (id: number, checked: boolean) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
        });
    };

    const selectAll = () => {
        setSelected(new Set(departments.map((d) => d.ID)));
    };

    const clearAll = () => {
        setSelected(new Set());
    };

    const save = async () => {
        if (!roleId) {
            toast.message('เลือก Staff Role ก่อน');
            return;
        }
        const id = parseInt(roleId, 10);
        if (Number.isNaN(id)) return;
        try {
            setSaving(true);
            const department_ids = [...selected].sort((a, b) => a - b);
            const res = await staffRolePermissionDepartmentApi.set({ role_id: id, department_ids });
            if (res?.success === false) {
                toast.error((res as { message?: string }).message ?? 'บันทึกไม่สำเร็จ');
                return;
            }
            toast.success(res?.message ?? 'บันทึกแล้ว');
            await loadForRole(id);
        } catch (e: unknown) {
            console.error(e);
            toast.error('บันทึกไม่สำเร็จ');
        } finally {
            setSaving(false);
        }
    };

    const roleLabel = (r: StaffRoleRow) => `${r.code} — ${r.name}`;
    const selectedRole = roles.find((r) => String(r.id) === roleId);

    const filteredDepartments = useMemo(() => {
        const q = deptSearch.trim().toLowerCase();
        if (!q) return departments;
        return departments.filter((d) => {
            const label = mainDepartmentLabel(d).toLowerCase();
            const idStr = String(d.ID);
            const n1 = (d.DepName ?? '').toLowerCase();
            const n2 = (d.DepName2 ?? '').toLowerCase();
            return idStr.includes(q) || label.includes(q) || n1.includes(q) || n2.includes(q);
        });
    }, [departments, deptSearch]);

    const deptCountLabel = useMemo(() => {
        if (loadingBoot || loadingRole) return 'กำลังโหลด…';
        const total = departments.length;
        const q = deptSearch.trim();
        const shown = filteredDepartments.length;
        const hint = 'มีเครื่องหมายถูก = Role นี้เห็นข้อมูลแผนกนั้น (เวชภัณฑ์/ที่เกี่ยวข้อง)';
        if (q && shown !== total) {
            return `แสดง ${shown} จาก ${total} รายการที่ตรงคำค้น · ${hint}`;
        }
        return `${total} แผนกหลัก — ${hint}`;
    }, [loadingBoot, loadingRole, departments.length, deptSearch, filteredDepartments.length]);

    return (
        <ProtectedRoute>
            <AppLayout fullWidth>
                <div className="space-y-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 p-2.5 shadow-md">
                                <Layers className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">จัดการ Role กับแผนก</h1>
                                <p className="text-sm text-slate-500">
                                    เลือก Staff Role แล้วติ๊กแผนก (Division) ที่อนุญาตให้เห็นข้อมูล — ไม่ติ๊กเลยแล้วบันทึก = เห็นทุกแผนก
                                </p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={loadingBoot}
                            onClick={() => loadBootstrap()}
                        >
                            <RefreshCw className={`mr-2 h-4 w-4 ${loadingBoot ? 'animate-spin' : ''}`} />
                            รีเฟรชรายการ
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <Card className="lg:col-span-4 xl:col-span-3">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">Staff Role ทั้งหมด</CardTitle>
                                <CardDescription>คลิกเลือก Role ที่ต้องการตั้งค่า</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                                {loadingBoot ? (
                                    <div className="flex justify-center py-10">
                                        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                                    </div>
                                ) : roles.length === 0 ? (
                                    <p className="text-sm text-slate-500">ไม่มี Role</p>
                                ) : (
                                    <div className="max-h-[min(55vh,480px)] overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                                        {roles.map((r) => {
                                            const active = String(r.id) === roleId;
                                            return (
                                                <button
                                                    key={r.id}
                                                    type="button"
                                                    onClick={() => setRoleId(String(r.id))}
                                                    className={cn(
                                                        'flex w-full flex-col items-start gap-1 px-3 py-3 text-left text-sm transition-colors',
                                                        active
                                                            ? 'bg-violet-100 text-violet-950 ring-1 ring-inset ring-violet-300'
                                                            : 'bg-white hover:bg-slate-50 text-slate-800',
                                                    )}
                                                >
                                                    <span className="font-semibold leading-tight">{r.code}</span>
                                                    <span className="text-xs text-slate-600 leading-snug">{r.name}</span>
                                                    {r.is_active === false ? (
                                                        <Badge variant="secondary" className="text-[10px]">
                                                            ไม่ใช้งาน
                                                        </Badge>
                                                    ) : null}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="space-y-4 lg:col-span-8 xl:col-span-9">
                            <Card>
                                <CardHeader>
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <Building2 className="h-5 w-5 text-slate-600" />
                                                Division หลัก (Department)
                                            </CardTitle>
                                            <CardDescription>
                                                {selectedRole
                                                    ? `กำลังแก้: ${roleLabel(selectedRole)}`
                                                    : 'เลือก Role จากคอลัมน์ซ้าย'}
                                            </CardDescription>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Button type="button" variant="secondary" size="sm" onClick={selectAll} disabled={!roleId || loadingBoot}>
                                                เลือกทุก Division
                                            </Button>
                                            <Button type="button" variant="secondary" size="sm" onClick={clearAll} disabled={!roleId || loadingBoot}>
                                                ไม่จำกัด Division (ล้างทั้งหมด)
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={save}
                                                disabled={!roleId || saving || loadingBoot || loadingRole}
                                            >
                                                {saving ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Save className="mr-2 h-4 w-4" />
                                                )}
                                                บันทึก
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                            </Card>

                            {roleId && unrestrictedFromServer && selected.size === 0 && !loadingRole && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                    Role นี้<strong> ไม่จำกัด Division หลัก</strong> (เห็นทุก Division) — ติ๊ก Checkbox ด้านล่างเพื่อจำกัด แล้วกดบันทึก
                                </div>
                            )}

                            <Card>
                                <CardHeader>
                                    <CardTitle>รายการ Division</CardTitle>
                                    <CardDescription>{deptCountLabel}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {!roleId ? (
                                        <p className="text-sm text-slate-500">เลือก Staff Role จากรายการทางซ้าย</p>
                                    ) : loadingRole ? (
                                        <div className="flex justify-center py-12">
                                            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                                        </div>
                                    ) : departments.length === 0 ? (
                                        <p className="text-sm text-slate-500">ไม่มีข้อมูลแผนกหลัก (หรือถูกกรองออก)</p>
                                    ) : (
                                        <>
                                            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                                                <div className="relative flex-1 min-w-0">
                                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                                    <Input
                                                        type="search"
                                                        placeholder="ค้นหา ID หรือชื่อ Division…"
                                                        value={deptSearch}
                                                        onChange={(e) => setDeptSearch(e.target.value)}
                                                        className="pl-9"
                                                        disabled={loadingRole}
                                                        aria-label="ค้นหา Division"
                                                    />
                                                </div>
                                                {deptSearch.trim() ? (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="shrink-0 text-muted-foreground"
                                                        onClick={() => setDeptSearch('')}
                                                    >
                                                        ล้างคำค้น
                                                    </Button>
                                                ) : null}
                                            </div>
                                            <div className="max-h-[min(60vh,560px)] overflow-y-auto pr-1">
                                                {filteredDepartments.length === 0 ? (
                                                    <p className="text-sm text-slate-500 py-6 text-center">
                                                        {`ไม่พบรายการที่ตรงกับ "${deptSearch.trim()}"`}
                                                    </p>
                                                ) : (
                                                    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                                        {filteredDepartments.map((d) => (
                                                            <li
                                                                key={d.ID}
                                                                className="flex items-start gap-3 rounded-md border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                                                            >
                                                                <Checkbox
                                                                    id={`dept-${d.ID}`}
                                                                    checked={selected.has(d.ID)}
                                                                    onCheckedChange={(v) => toggle(d.ID, v === true)}
                                                                    className="mt-0.5"
                                                                />
                                                                <label htmlFor={`dept-${d.ID}`} className="cursor-pointer text-sm leading-tight">
                                                                    <span className="font-mono text-xs text-slate-500">ID {d.ID}</span>
                                                                    <span className="mt-0.5 block font-medium text-slate-800">{mainDepartmentLabel(d)}</span>
                                                                </label>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </AppLayout>
        </ProtectedRoute>
    );
}

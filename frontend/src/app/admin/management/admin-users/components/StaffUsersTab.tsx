'use client';

import { useState, useEffect, useMemo } from 'react';
import { staffUserApi, staffRoleApi, departmentApi } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Pencil,
  Trash2,
  Key,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Users,
} from 'lucide-react';
import StaffUsersFilterSection, { type StaffUserListFilters } from './StaffUsersFilterSection';

interface DepartmentOption {
  ID: number;
  DepName: string | null;
  DepName2: string | null;
}

interface StaffUser {
  id: number;
  email: string;
  fname: string;
  lname: string;
  role: string;
  role_id?: number | null;
  department_id?: number | null;
  department_name?: string | null;
  client_id: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface StaffUsersTabProps {
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
}

export default function StaffUsersTab({
  createOpen: createOpenProp,
  onCreateOpenChange,
}: StaffUsersTabProps = {}) {
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [staffRoles, setStaffRoles] = useState<Array<{ id: number; code: string; name: string; description: string | null }>>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchVersion, setSearchVersion] = useState(0);
  const [activeFilters, setActiveFilters] = useState<StaffUserListFilters>({
    search: '',
    status: 'ALL',
  });
  const [createOpenInternal, setCreateOpenInternal] = useState(false);
  const isCreateDialogOpen = onCreateOpenChange ? (createOpenProp ?? false) : createOpenInternal;
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  const [clientCredentials, setClientCredentials] = useState<{ client_id: string; client_secret: string } | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    fname: '',
    lname: '',
    role_id: '',
    department_id: '' as string,
    password: 'password123',
    expires_at: '',
  });

  useEffect(() => {
    fetchStaffUsers();
    fetchStaffRoles();
    fetchDepartments();
  }, []);

  const resetCreateForm = () => {
    setFormData({
      email: '',
      fname: '',
      lname: '',
      role_id: '',
      department_id: '',
      password: 'password123',
      expires_at: '',
    });
    setClientCredentials(null);
    setShowSecret(false);
  };

  const handleCreateDialogOpenChange = (open: boolean) => {
    if (open) resetCreateForm();
    if (onCreateOpenChange) onCreateOpenChange(open);
    else setCreateOpenInternal(open);
  };

  const setIsCreateDialogOpen = (open: boolean) => {
    handleCreateDialogOpenChange(open);
  };

  useEffect(() => {
    if (createOpenProp) resetCreateForm();
  }, [createOpenProp]);

  const fetchDepartments = async () => {
    try {
      const response = await departmentApi.getAll({ limit: 500 });
      if (response?.success === false) {
        toast.error((response as any)?.message || 'โหลดแผนกไม่สำเร็จ');
        return;
      }
      if (response?.data && Array.isArray(response.data)) {
        setDepartments(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch departments:', error);
      toast.error('โหลดแผนกไม่สำเร็จ');
    }
  };

  const fetchStaffRoles = async () => {
    try {
      const response = await staffRoleApi.getAll() as { success?: boolean; data?: any[]; message?: string };
      if (response?.success === false) {
        toast.error((response as any)?.message || (response as any)?.error || 'โหลดบทบาทไม่สำเร็จ');
        setStaffRoles([]);
        return;
      }
      setStaffRoles(Array.isArray(response?.data) ? response.data : []);
    } catch (error: any) {
      console.error('Failed to fetch staff roles:', error);
      toast.error(error?.message || 'โหลดบทบาทไม่สำเร็จ');
      setStaffRoles([]);
    }
  };

  const fetchStaffUsers = async () => {
    try {
      setLoading(true);
      const response = await staffUserApi.getAllStaffUsers() as { success?: boolean; data?: StaffUser[]; message?: string };
      if (response?.success === false) {
        toast.error((response as any)?.message || (response as any)?.error || 'โหลดข้อมูล Staff User ไม่สำเร็จ');
        setStaffUsers([]);
        return;
      }
      setStaffUsers(Array.isArray(response?.data) ? response.data : []);
    } catch (error: any) {
      toast.error(error?.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์');
      setStaffUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.role_id?.trim()) {
      toast.error('กรุณาเลือกบทบาท (Role)');
      return;
    }
    if (formData.fname.trim().length < 2) {
      toast.error('ชื่อ (Fname) ต้องมีอย่างน้อย 2 ตัวอักษร');
      return;
    }
    if (formData.lname.trim().length < 2) {
      toast.error('นามสกุล (Lname) ต้องมีอย่างน้อย 2 ตัวอักษร');
      return;
    }
    try {
      const response = await staffUserApi.createStaffUser({
        email: formData.email,
        fname: formData.fname,
        lname: formData.lname,
        role_id: parseInt(formData.role_id, 10),
        password: formData.password || undefined,
        expires_at: formData.expires_at || undefined,
      }) as { success?: boolean; data?: { client_id?: string; client_secret?: string }; message?: string };
      if (response?.success && response?.data) {
        toast.success('สร้าง Staff User เรียบร้อยแล้ว');
        setClientCredentials({
          client_id: response.data.client_id ?? '',
          client_secret: response.data.client_secret ?? '',
        });
        fetchStaffUsers();
        setFormData({ email: '', fname: '', lname: '', role_id: '', department_id: '', password: 'password123', expires_at: '' });
      } else {
        toast.error((response as any)?.message || (response as any)?.error || 'ไม่สามารถสร้าง Staff User ได้');
      }
    } catch (error: any) {
      const msg = error?.response?.data?.message ?? error?.message ?? 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    try {
      const updateData: any = {
        email: formData.email,
        fname: formData.fname,
        lname: formData.lname,
      };
      if (formData.role_id) updateData.role_id = parseInt(formData.role_id, 10);
      if (formData.department_id !== undefined) updateData.department_id = formData.department_id === '' ? null : parseInt(formData.department_id, 10);
      if (formData.password && formData.password !== 'password123') updateData.password = formData.password;
      if (formData.expires_at) updateData.expires_at = formData.expires_at;

      const response = await staffUserApi.updateStaffUser(selectedStaff.id, updateData) as { success?: boolean; message?: string };
      if (response?.success) {
        toast.success('อัปเดต Staff User เรียบร้อยแล้ว');
        setIsEditDialogOpen(false);
        setSelectedStaff(null);
        fetchStaffUsers();
      } else {
        toast.error((response as any)?.message || (response as any)?.error || 'ไม่สามารถอัปเดต Staff User ได้');
      }
    } catch (error: any) {
      toast.error(error?.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบ Staff User นี้?')) return;
    try {
      const response = await staffUserApi.deleteStaffUser(id) as { success?: boolean; message?: string };
      if (response?.success) {
        toast.success('ลบ Staff User เรียบร้อยแล้ว');
        fetchStaffUsers();
      } else {
        toast.error((response as any)?.message || (response as any)?.error || 'ไม่สามารถลบ Staff User ได้');
      }
    } catch (error: any) {
      toast.error(error?.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์');
    }
  };

  const handleRegenerateSecret = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการสร้าง Client Secret ใหม่? Secret เก่าจะใช้งานไม่ได้อีก')) return;
    try {
      const response = await staffUserApi.regenerateClientSecret(id) as { success?: boolean; data?: { client_id?: string; client_secret?: string }; message?: string };
      if (response?.success && response?.data) {
        toast.success('สร้าง Client Secret ใหม่เรียบร้อยแล้ว');
        setClientCredentials({
          client_id: response.data.client_id ?? '',
          client_secret: response.data.client_secret ?? '',
        });
      } else {
        toast.error((response as any)?.message || (response as any)?.error || 'ไม่สามารถสร้าง Client Secret ใหม่ได้');
      }
    } catch (error: any) {
      toast.error(error?.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์');
    }
  };

  const openEditDialog = (staff: StaffUser) => {
    setSelectedStaff(staff);
    setFormData({
      email: staff.email,
      fname: staff.fname,
      lname: staff.lname,
      role_id: staff.role_id != null ? String(staff.role_id) : '',
      department_id: staff.department_id != null ? String(staff.department_id) : '',
      password: '',
      expires_at: staff.expires_at || '',
    });
    setIsEditDialogOpen(true);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`คัดลอก ${label} เรียบร้อยแล้ว`);
  };

  const handleSearch = (filters: StaffUserListFilters) => {
    setActiveFilters(filters);
  };

  const filteredUsers = useMemo(() => {
    const q = activeFilters.search.trim().toLowerCase();
    return staffUsers.filter((u) => {
      const fullName = `${u.fname} ${u.lname}`.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        fullName.includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.client_id?.toLowerCase().includes(q) ||
        (u.role ?? '').toLowerCase().includes(q) ||
        (u.department_name ?? '').toLowerCase().includes(q);
      const matchesStatus =
        activeFilters.status === 'ALL' ||
        (activeFilters.status === 'ACTIVE' && u.is_active) ||
        (activeFilters.status === 'INACTIVE' && !u.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [staffUsers, activeFilters]);

  const hasActiveFilter =
    activeFilters.search.trim() !== '' || activeFilters.status !== 'ALL';

  return (
    <div className="space-y-6">
            <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogOpenChange}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>เพิ่ม Staff User ใหม่</DialogTitle>
                </DialogHeader>
                {!clientCredentials ? (
                  <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                      <Label htmlFor="email">อีเมล *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="fname">ชื่อจริง *</Label>
                      <Input id="fname" value={formData.fname} onChange={(e) => setFormData({ ...formData, fname: e.target.value })} required />
                    </div>
                    <div>
                      <Label htmlFor="lname">นามสกุล *</Label>
                      <Input id="lname" value={formData.lname} onChange={(e) => setFormData({ ...formData, lname: e.target.value })} required />
                    </div>
                    <div>
                      <Label>บทบาท (Role) *</Label>
                      <Select value={formData.role_id} onValueChange={(value) => setFormData({ ...formData, role_id: value })} required disabled={staffRoles.length === 0}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={staffRoles.length === 0 ? 'กำลังโหลด...' : 'เลือกบทบาท'} />
                        </SelectTrigger>
                        <SelectContent>
                          {staffRoles.map((role) => (
                            <SelectItem key={role.id} value={String(role.id)}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>แผนก</Label>
                      <Select
                        value={formData.department_id || 'none'}
                        onValueChange={(value) => setFormData({ ...formData, department_id: value === 'none' ? '' : value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="เลือกแผนก (ไม่บังคับ)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- ไม่ระบุ --</SelectItem>
                          {departments.map((dept) => (
                            <SelectItem key={dept.ID} value={String(dept.ID)}>
                              {dept.DepName || dept.DepName2 || `แผนก ${dept.ID}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="password">รหัสผ่าน (ค่าเริ่มต้น: password123)</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="expires_at">วันหมดอายุ Client Credentials (ถ้ามี)</Label>
                      <Input
                        id="expires_at"
                        type="datetime-local"
                        value={formData.expires_at}
                        onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      สร้าง
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800 font-medium">
                        กรุณาบันทึกข้อมูลเหล่านี้ จะไม่สามารถแสดงอีกครั้ง
                      </p>
                    </div>
                    <div>
                      <Label>Client ID</Label>
                      <div className="flex gap-2">
                        <Input value={clientCredentials.client_id} readOnly className="font-mono text-sm" />
                        <Button type="button" size="icon" variant="outline" onClick={() => copyToClipboard(clientCredentials.client_id, 'Client ID')}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Client Secret</Label>
                      <div className="flex gap-2">
                        <Input type={showSecret ? 'text' : 'password'} value={clientCredentials.client_secret} readOnly className="font-mono text-sm" />
                        <Button type="button" size="icon" variant="outline" onClick={() => setShowSecret(!showSecret)}>
                          {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button type="button" size="icon" variant="outline" onClick={() => copyToClipboard(clientCredentials.client_secret, 'Client Secret')}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      type="button"
                      className="w-full"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setClientCredentials(null);
                        setShowSecret(false);
                      }}
                    >
                      ปิด
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>

          <StaffUsersFilterSection
            onSearch={handleSearch}
            onBeforeSearch={() => setSearchVersion((v) => v + 1)}
          />

          <Card key={`staff-table-${searchVersion}`} className="shadow-sm border-gray-200/80 overflow-hidden rounded-xl">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                รายการผู้ใช้ Staff จำนวน {filteredUsers.length} รายการ
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">กำลังโหลดข้อมูล...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {hasActiveFilter ? 'ไม่พบรายการที่ตรงกับเงื่อนไข' : 'ยังไม่มี Staff User'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>ชื่อ-นามสกุล</TableHead>
                        <TableHead>อีเมล</TableHead>
                        <TableHead>บทบาท</TableHead>
                        <TableHead>แผนก</TableHead>
                        <TableHead>Client ID</TableHead>
                        <TableHead>สถานะ</TableHead>
                        <TableHead>วันสร้าง</TableHead>
                        <TableHead className="text-right">จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((staff) => (
                        <TableRow key={staff.id}>
                          <TableCell className="font-medium">{staff.id}</TableCell>
                          <TableCell>{`${staff.fname} ${staff.lname}`}</TableCell>
                          <TableCell>{staff.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{staff.role || '-'}</Badge>
                          </TableCell>
                          <TableCell>{staff.department_name ?? '-'}</TableCell>
                          <TableCell className="font-mono text-xs">{staff.client_id?.substring(0, 20)}...</TableCell>
                          <TableCell>
                            <Badge variant={staff.is_active ? 'default' : 'secondary'}>{staff.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}</Badge>
                          </TableCell>
                          <TableCell>{staff.created_at ? new Date(staff.created_at).toLocaleDateString('th-TH') : '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button size="icon" variant="outline" onClick={() => openEditDialog(staff)} title="แก้ไข">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="outline" onClick={() => handleRegenerateSecret(staff.id)} title="สร้าง Client Secret ใหม่">
                                <Key className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="destructive" onClick={() => handleDelete(staff.id)} title="ลบ">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>แก้ไข Staff User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <Label htmlFor="edit-email">อีเมล *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-fname">ชื่อจริง *</Label>
                <Input id="edit-fname" value={formData.fname} onChange={(e) => setFormData({ ...formData, fname: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="edit-lname">นามสกุล *</Label>
                <Input id="edit-lname" value={formData.lname} onChange={(e) => setFormData({ ...formData, lname: e.target.value })} required />
              </div>
              <div>
                <Label>บทบาท (Role) *</Label>
                <Select value={formData.role_id} onValueChange={(value) => setFormData({ ...formData, role_id: value })} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="เลือกบทบาท" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffRoles.map((role) => (
                      <SelectItem key={role.id} value={String(role.id)}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>แผนก</Label>
                <Select
                  value={formData.department_id || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, department_id: value === 'none' ? '' : value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="เลือกแผนก (ไม่บังคับ)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- ไม่ระบุ --</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.ID} value={String(dept.ID)}>
                        {dept.DepName || dept.DepName2 || `แผนก ${dept.ID}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-password">รหัสผ่านใหม่ (ถ้าต้องการเปลี่ยน)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="ปล่อยว่างถ้าไม่ต้องการเปลี่ยน"
                />
              </div>
              <div>
                <Label htmlFor="edit-expires_at">วันหมดอายุ Client Credentials</Label>
                <Input
                  id="edit-expires_at"
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  บันทึก
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedStaff(null);
                  }}
                >
                  ยกเลิก
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Credentials dialog (after regenerate) */}
        {clientCredentials && !isCreateDialogOpen && (
          <Dialog open={!!clientCredentials} onOpenChange={() => setClientCredentials(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Client Credentials ใหม่</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800 font-medium">กรุณาบันทึกข้อมูลเหล่านี้ จะไม่สามารถแสดงอีกครั้ง</p>
                </div>
                <div>
                  <Label>Client ID</Label>
                  <div className="flex gap-2">
                    <Input value={clientCredentials.client_id} readOnly className="font-mono text-sm" />
                    <Button type="button" size="icon" variant="outline" onClick={() => copyToClipboard(clientCredentials.client_id, 'Client ID')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Client Secret</Label>
                  <div className="flex gap-2">
                    <Input type={showSecret ? 'text' : 'password'} value={clientCredentials.client_secret} readOnly className="font-mono text-sm" />
                    <Button type="button" size="icon" variant="outline" onClick={() => setShowSecret(!showSecret)}>
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button type="button" size="icon" variant="outline" onClick={() => copyToClipboard(clientCredentials.client_secret, 'Client Secret')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button type="button" className="w-full" onClick={() => { setClientCredentials(null); setShowSecret(false); }}>
                  ปิด
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
    </div>
  );
}

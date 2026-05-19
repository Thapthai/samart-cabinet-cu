'use client';

import { useState, useEffect } from 'react';
import { staffUserApi, staffRoleApi } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2, Key, UserPlus, Copy, Eye, EyeOff } from 'lucide-react';

interface StaffUser {
  id: number;
  email: string;
  fname: string;
  lname: string;
  role: string;
  role_id?: number | null;
  client_id: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function StaffUsersPage() {
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [staffRoles, setStaffRoles] = useState<Array<{ id: number; code: string; name: string; description: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  const [clientCredentials, setClientCredentials] = useState<{ client_id: string; client_secret: string } | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  // Simple notification helper
  const showNotification = (title: string, description: string, type: 'success' | 'error' = 'success') => {
    const message = `${title}\n${description}`;
    if (type === 'error') {
      alert(`❌ ${message}`);
    } else {
      alert(`✅ ${message}`);
    }
  };

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    fname: '',
    lname: '',
    role_id: '',
    password: 'password123',
    expires_at: '',
  });

  useEffect(() => {
    fetchStaffUsers();
    fetchStaffRoles();
  }, []);

  const fetchStaffRoles = async () => {
    try {
      const response = await staffRoleApi.getAll();
      if (response.success) {
        setStaffRoles(response.data || []);
      } else {
        console.error('Failed to fetch staff roles:', response.message || 'Unknown error');
        showNotification('ไม่สามารถโหลดบทบาทได้', response.message || 'กรุณาลองใหม่อีกครั้ง', 'error');
      }
    } catch (error: any) {
      console.error('Failed to fetch staff roles:', error);
      showNotification('ไม่สามารถโหลดบทบาทได้', error.message || 'กรุณาตรวจสอบการเชื่อมต่อ', 'error');
    }
  };

  const fetchStaffUsers = async () => {
    try {
      setLoading(true);
      const response = await staffUserApi.getAllStaffUsers();
      if (response.success) {
        setStaffUsers(response.data || []);
      } else {
        showNotification('เกิดข้อผิดพลาด', response.message || 'ไม่สามารถโหลดข้อมูลได้', 'error');
      }
    } catch (error: any) {
      showNotification('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await staffUserApi.createStaffUser({
        email: formData.email,
        fname: formData.fname,
        lname: formData.lname,
        role_id: formData.role_id ? parseInt(formData.role_id, 10) : undefined,
        password: formData.password || undefined,
        expires_at: formData.expires_at || undefined,
      });
      if (response.success) {
        showNotification('สำเร็จ!', 'สร้าง Staff User เรียบร้อยแล้ว');
        setClientCredentials({
          client_id: response.data.client_id,
          client_secret: response.data.client_secret,
        });
        fetchStaffUsers();
        setFormData({ email: '', fname: '', lname: '', role_id: '', password: 'password123', expires_at: '' });
        // Don't close dialog yet - show credentials
      } else {
        showNotification('เกิดข้อผิดพลาด', response.message || 'ไม่สามารถสร้าง Staff User ได้', 'error');
      }
    } catch (error: any) {
      showNotification('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์', 'error');
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

      if (formData.role_id) {
        updateData.role_id = parseInt(formData.role_id, 10);
      }

      if (formData.password && formData.password !== 'password123') {
        updateData.password = formData.password;
      }

      if (formData.expires_at) {
        updateData.expires_at = formData.expires_at;
      }

      const response = await staffUserApi.updateStaffUser(selectedStaff.id, updateData);
      if (response.success) {
        showNotification('สำเร็จ!', 'อัพเดต Staff User เรียบร้อยแล้ว');
        setIsEditDialogOpen(false);
        setSelectedStaff(null);
        fetchStaffUsers();
      } else {
        showNotification('เกิดข้อผิดพลาด', response.message || 'ไม่สามารถอัพเดต Staff User ได้', 'error');
      }
    } catch (error: any) {
      showNotification('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบ Staff User นี้?')) return;

    try {
      const response = await staffUserApi.deleteStaffUser(id);
      if (response.success) {
        showNotification('สำเร็จ!', 'ลบ Staff User เรียบร้อยแล้ว');
        fetchStaffUsers();
      } else {
        showNotification('เกิดข้อผิดพลาด', response.message || 'ไม่สามารถลบ Staff User ได้', 'error');
      }
    } catch (error: any) {
      showNotification('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์', 'error');
    }
  };

  const handleRegenerateSecret = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการสร้าง Client Secret ใหม่? Secret เก่าจะใช้งานไม่ได้อีก')) return;

    try {
      const response = await staffUserApi.regenerateClientSecret(id);
      if (response.success) {
        showNotification('สำเร็จ!', 'สร้าง Client Secret ใหม่เรียบร้อยแล้ว');
        setClientCredentials({
          client_id: response.data.client_id,
          client_secret: response.data.client_secret,
        });
      } else {
        showNotification('เกิดข้อผิดพลาด', response.message || 'ไม่สามารถสร้าง Client Secret ใหม่ได้', 'error');
      }
    } catch (error: any) {
      showNotification('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์', 'error');
    }
  };

  const openEditDialog = (staff: StaffUser) => {
    setSelectedStaff(staff);
    setFormData({
      email: staff.email,
      fname: staff.fname,
      lname: staff.lname,
      role_id: staff.role_id != null ? String(staff.role_id) : '',
      password: '',
      expires_at: staff.expires_at || '',
    });
    setIsEditDialogOpen(true);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showNotification('คัดลอกแล้ว!', `คัดลอก ${label} เรียบร้อยแล้ว`);
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold">จัดการ Staff Users</CardTitle>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setFormData({ email: '', fname: '', lname: '', role_id: '', password: 'password123', expires_at: '' });
                setClientCredentials(null);
                setIsCreateDialogOpen(true);
              }}>
                <UserPlus className="mr-2 h-4 w-4" />
                เพิ่ม Staff User
              </Button>
            </DialogTrigger>
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
                    <Input
                      id="fname"
                      value={formData.fname}
                      onChange={(e) => setFormData({ ...formData, fname: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lname">นามสกุล *</Label>
                    <Input
                      id="lname"
                      value={formData.lname}
                      onChange={(e) => setFormData({ ...formData, lname: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">บทบาท (Role) *</Label>
                    <Select
                      value={formData.role_id}
                      onValueChange={(value) => setFormData({ ...formData, role_id: value })}
                      required
                      disabled={staffRoles.length === 0}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={staffRoles.length === 0 ? "กำลังโหลด..." : "เลือกบทบาท"} />
                      </SelectTrigger>
                      <SelectContent>
                        {staffRoles.map((role: { id: number; code: string; name: string; description: string | null }) => (
                          <SelectItem key={role.id} value={String(role.id)}>
                            {role.name}
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
                  <Button type="submit" className="w-full">สร้าง</Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-800 font-medium mb-2">
                      ⚠️ กรุณาบันทึกข้อมูลเหล่านี้! จะไม่สามารถแสดงอีกครั้ง
                    </p>
                  </div>
                  
                  <div>
                    <Label>Client ID</Label>
                    <div className="flex gap-2">
                      <Input value={clientCredentials.client_id} readOnly />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => copyToClipboard(clientCredentials.client_id, 'Client ID')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Client Secret</Label>
                    <div className="flex gap-2">
                      <Input
                        type={showSecret ? 'text' : 'password'}
                        value={clientCredentials.client_secret}
                        readOnly
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => setShowSecret(!showSecret)}
                      >
                        {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => copyToClipboard(clientCredentials.client_secret, 'Client Secret')}
                      >
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
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-center py-8">กำลังโหลดข้อมูล...</p>
          ) : staffUsers.length === 0 ? (
            <p className="text-center py-8 text-gray-500">ยังไม่มี Staff User</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>ชื่อ-นามสกุล</TableHead>
                  <TableHead>อีเมล</TableHead>
                  <TableHead>บทบาท</TableHead>
                  <TableHead>Client ID</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>วันสร้าง</TableHead>
                  <TableHead className="text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffUsers.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell>{staff.id}</TableCell>
                    <TableCell>{staff.fname} {staff.lname}</TableCell>
                    <TableCell>{staff.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{staff.role || '-'}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{staff.client_id.substring(0, 20)}...</TableCell>
                    <TableCell>
                      <Badge variant={staff.is_active ? 'default' : 'secondary'}>
                        {staff.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(staff.created_at).toLocaleDateString('th-TH')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => openEditDialog(staff)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleRegenerateSecret(staff.id)}
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => handleDelete(staff.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
              <Input
                id="edit-fname"
                value={formData.fname}
                onChange={(e) => setFormData({ ...formData, fname: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-lname">นามสกุล *</Label>
              <Input
                id="edit-lname"
                value={formData.lname}
                onChange={(e) => setFormData({ ...formData, lname: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-role">บทบาท (Role) *</Label>
              <Select
                value={formData.role_id}
                onValueChange={(value) => setFormData({ ...formData, role_id: value })}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="เลือกบทบาท" />
                </SelectTrigger>
                <SelectContent>
                  {staffRoles.map((role: { id: number; code: string; name: string; description: string | null }) => (
                    <SelectItem key={role.id} value={String(role.id)}>
                      {role.name}
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
              <Button type="submit" className="flex-1">บันทึก</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setSelectedStaff(null);
                }}
                className="flex-1"
              >
                ยกเลิก
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Credentials Display Dialog */}
      {clientCredentials && !isCreateDialogOpen && (
        <Dialog open={!!clientCredentials} onOpenChange={() => setClientCredentials(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Client Credentials</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800 font-medium mb-2">
                  ⚠️ กรุณาบันทึกข้อมูลเหล่านี้! จะไม่สามารถแสดงอีกครั้ง
                </p>
              </div>
              
              <div>
                <Label>Client ID</Label>
                <div className="flex gap-2">
                  <Input value={clientCredentials.client_id} readOnly />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(clientCredentials.client_id, 'Client ID')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <Label>Client Secret</Label>
                <div className="flex gap-2">
                  <Input
                    type={showSecret ? 'text' : 'password'}
                    value={clientCredentials.client_secret}
                    readOnly
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(clientCredentials.client_secret, 'Client Secret')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  setClientCredentials(null);
                  setShowSecret(false);
                }}
              >
                ปิด
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      </AppLayout>
    </ProtectedRoute>
  );
}


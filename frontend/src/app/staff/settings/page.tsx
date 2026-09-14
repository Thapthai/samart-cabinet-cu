'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { User, Lock, Save, Eye, EyeOff } from 'lucide-react';
import { staffUserApi } from '@/lib/api';
import { getStaffUserIfSameApp, saveStaffUser } from '@/lib/appAuth';

export default function SettingsPage() {
  const [staffUser, setStaffUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    fname: '',
    lname: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await staffUserApi.getStaffProfile();
      if (response.success && response.data) {
        setStaffUser(response.data);
        setFormData({
          fname: response.data.fname || '',
          lname: response.data.lname || '',
          email: response.data.email || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        // Fallback to localStorage if API fails
        const parsedUser = getStaffUserIfSameApp();
        if (parsedUser) {
          setStaffUser(parsedUser);
          setFormData({
            fname: parsedUser.fname || '',
            lname: parsedUser.lname || '',
            email: parsedUser.email || '',
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          });
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      // Fallback to localStorage
      const parsedUser = getStaffUserIfSameApp();
      if (parsedUser) {
        setStaffUser(parsedUser);
        setFormData({
          fname: parsedUser.fname || '',
          lname: parsedUser.lname || '',
          email: parsedUser.email || '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role?: string) => {
    const roleMap: Record<string, string> = {
      it1: 'IT 1',
      it2: 'IT 2',
      it3: 'IT 3',
      warehouse1: 'Warehouse 1',
      warehouse2: 'Warehouse 2',
      warehouse3: 'Warehouse 3',
    };
    return roleMap[role || ''] || role || '-';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate password if changing
      if (formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          alert('รหัสผ่านใหม่ไม่ตรงกัน');
          setSaving(false);
          return;
        }
        if (formData.newPassword.length < 6) {
          alert('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
          setSaving(false);
          return;
        }
      }

      // Prepare update data
      const updateData: any = {
        fname: formData.fname,
        lname: formData.lname,
        email: formData.email,
      };

      // Add password fields if changing password
      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      // Call API to update profile
      const response = await staffUserApi.updateStaffProfile(updateData);

      if (response.success && response.data) {
        // Update local storage
        const updatedUser = {
          ...staffUser,
          ...response.data,
        };
        saveStaffUser(updatedUser);
        setStaffUser(updatedUser);

        alert('บันทึกข้อมูลเรียบร้อยแล้ว');
        
        // Clear password fields
        setFormData({
          ...formData,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        alert(response.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!staffUser) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-2">ตั้งค่า</h1>
        <p className="text-gray-600">หน้านี้สำหรับตั้งค่าระบบ</p>
      </main>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">ตั้งค่าบัญชี</h2>
        <p className="text-gray-600 mt-1">จัดการข้อมูลส่วนตัวและรหัสผ่าน</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              ข้อมูลส่วนตัว
            </CardTitle>
            <CardDescription>
              แก้ไขข้อมูลส่วนตัวของคุณ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
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
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลบัญชี</CardTitle>
            <CardDescription>
              ข้อมูลบัญชีของคุณ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Client ID</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm font-mono text-gray-700 break-all">
                    {staffUser.client_id || '-'}
                  </p>
                </div>
              </div>
              <div>
                <Label>บทบาท (Role)</Label>
                <div className="mt-1">
                  <Badge variant="outline" className="text-sm">
                    {typeof staffUser.role === 'object' ? (staffUser.role.name || '-') : getRoleLabel(staffUser.role || '')}
                  </Badge>
                </div>
              </div>
            </div>
            <div>
              <Label>สถานะ</Label>
              <div className="mt-1">
                <Badge variant="default" className="bg-green-500">
                  ใช้งานอยู่
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="mr-2 h-5 w-5" />
              เปลี่ยนรหัสผ่าน
            </CardTitle>
            <CardDescription>
              เปลี่ยนรหัสผ่านของคุณ (ปล่อยว่างถ้าไม่ต้องการเปลี่ยน)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">รหัสผ่านปัจจุบัน</Label>
              <div className="relative mt-1">
                <Input
                  id="currentPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  placeholder="กรอกรหัสผ่านปัจจุบัน"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="newPassword">รหัสผ่านใหม่</Label>
              <div className="relative mt-1">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</Label>
              <div className="relative mt-1">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="ยืนยันรหัสผ่านใหม่"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving} size="lg">
            {saving ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                บันทึกการเปลี่ยนแปลง
              </>
            )}
          </Button>
        </div>
      </form>
    </>
  );
}

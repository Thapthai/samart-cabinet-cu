import axios from 'axios';
import { getSession } from 'next-auth/react';
import type { ApiResponse, PaginatedResponse, ItemsStats } from '@/types/common';
import type { AuthResponse, User, RegisterDto, LoginDto } from '@/types/auth';
import type { Item, CreateItemDto, UpdateItemDto, GetItemsQuery } from '@/types/item';

// ต้องตรงกับ backend main.ts: setGlobalPrefix('api/smart-cabinet-cu/v1') และ PORT (ค่าเริ่มต้น Nest มักเป็น 3000)
// Server-side ใช้ BACKEND_API_URL, client ใช้ NEXT_PUBLIC_API_URL
function getApiBaseUrl(): string {
  const fallback = 'http://localhost:3000/api/smart-cabinet-cu/v1';
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || fallback;
  }
  return process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || fallback;
}

// Create axios instance
const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token from NextAuth session or staff token
api.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    // Check if this is a staff API endpoint
    const isStaffEndpoint = config.url?.startsWith('/staff') || config.url?.startsWith('/staff-users');

    if (isStaffEndpoint) {
      // Use staff token from localStorage for staff endpoints
      const staffToken = localStorage.getItem('staff_token');
      if (staffToken) {
        config.headers.Authorization = `Bearer ${staffToken}`;
      }
    } else {
      // Use NextAuth session token for regular endpoints
      const session = await getSession();
      if (session && (session as any).accessToken) {
        const token = (session as any).accessToken;
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn('⚠️ No access token found in session');
      }
    }
  }
  return config;
});

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Check if this is a staff API endpoint
      const isStaffEndpoint = error.config?.url?.startsWith('/staff') || error.config?.url?.startsWith('/staff-users');

      if (isStaffEndpoint) {
        // Only redirect staff routes to staff login
        // Clear staff tokens
        localStorage.removeItem('staff_token');
        localStorage.removeItem('staff_user');

        // Use Next.js router if available, otherwise use window.location
        const currentPath = window.location.pathname;
        if (currentPath.includes('/staff/')) {
          // Next.js automatically handles basePath
          window.location.href = '/auth/staff/login';
        }
      }
      // For non-staff endpoints, let the app handle the redirect
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: async (data: RegisterDto): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginDto): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  getProfile: async (): Promise<ApiResponse<User>> => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  // Firebase Authentication API
  firebaseLogin: async (idToken: string): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post('/auth/firebase/login', { idToken });
    return response.data;
  },

  // 2FA APIs
  enable2FA: async (password: string): Promise<ApiResponse<{ qrCodeUrl: string; secret: string }>> => {
    const response = await api.post('/auth/2fa/enable', { password });
    return response.data;
  },

  verify2FASetup: async (secret: string, token: string): Promise<ApiResponse<{ backupCodes: string[] }>> => {
    const response = await api.post('/auth/2fa/verify-setup', { secret, token });
    return response.data;
  },

  disable2FA: async (password: string, token?: string): Promise<ApiResponse> => {
    const response = await api.post('/auth/2fa/disable', { password, token });
    return response.data;
  },

  loginWith2FA: async (tempToken: string, code: string, type?: string): Promise<ApiResponse<AuthResponse>> => {
    const response = await api.post('/auth/2fa/login', { tempToken, code, type });
    return response.data;
  },

  // User Management APIs — backend: GET/PATCH /auth/profile, PATCH /auth/change-password
  getUserProfile: async (): Promise<ApiResponse<User>> => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  updateUserProfile: async (data: {
    name?: string;
    email?: string;
    preferredAuthMethod?: string;
    currentPassword: string;
  }): Promise<ApiResponse<User>> => {
    const body: Record<string, unknown> = {
      name: data.name,
      email: data.email,
      currentPassword: data.currentPassword,
    };
    if (data.preferredAuthMethod !== undefined) {
      body.preferred_auth_method = data.preferredAuthMethod;
    }
    const response = await api.patch('/auth/profile', body);
    return response.data;
  },

  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<ApiResponse> => {
    const response = await api.patch('/auth/change-password', data);
    return response.data;
  },

  requestPasswordReset: async (email: string): Promise<ApiResponse> => {
    const response = await api.post('/auth/password/reset-request', { email });
    return response.data;
  },
};

// =========================================== Items API ===========================================
export const itemsApi = {
  create: async (data: CreateItemDto): Promise<ApiResponse<Item>> => {
    const { picture, ...restData } = data;

    // If has file, use multipart/form-data with /items/upload endpoint
    if (picture && picture instanceof File) {
      const formData = new FormData();

      // Append all fields to FormData
      Object.keys(restData).forEach((key) => {
        const value = restData[key as keyof typeof restData];
        if (value !== undefined && value !== null && value !== '') {
          formData.append(key, String(value));
        }
      });

      formData.append('picture', picture);

      const response = await api.post('/items/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    }

    // Otherwise, send as JSON to /items endpoint
    const response = await api.post('/items', restData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  },

  getAll: async (query?: GetItemsQuery): Promise<PaginatedResponse<Item>> => {
    const response = await api.get('/items', { params: query });
    return response.data;
  },

  getStats: async (query?: { cabinet_id?: number; department_id?: number }): Promise<ApiResponse<ItemsStats>> => {
    const response = await api.get('/items/stats', { params: query });
    return response.data;
  },

  getItemStocksWillReturn: async (): Promise<{ success: boolean; data: any[] }> => {
    const response = await api.get('/item-stocks/will-return');
    return response.data as { success: boolean; data: any[] };
  },

  getById: async (itemcode: string): Promise<ApiResponse<Item>> => {
    const response = await api.get(`/items/${itemcode}`);
    return response.data;
  },

  update: async (itemcode: string, data: UpdateItemDto): Promise<ApiResponse<Item>> => {
    const { picture, ...restData } = data;

    // If has file, use multipart/form-data with /items/upload endpoint
    if (picture && picture instanceof File) {
      const formData = new FormData();

      // Append all fields to FormData
      Object.keys(restData).forEach((key) => {
        const value = restData[key as keyof typeof restData];
        if (value !== undefined && value !== null && value !== '') {
          formData.append(key, String(value));
        }
      });

      formData.append('picture', picture);

      const response = await api.put(`/items/${itemcode}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    }

    // Otherwise, send as JSON
    const response = await api.put(`/items/${itemcode}`, restData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  },

  delete: async (itemcode: string): Promise<ApiResponse> => {
    const response = await api.delete(`/items/${itemcode}`);
    return response.data;
  },

  updateMinMax: async (itemcode: string, data: { stock_min?: number; stock_max?: number }, cabinetId?: number): Promise<ApiResponse<Item>> => {
    const code = encodeURIComponent(itemcode);
    const url =
      cabinetId != null ? `/items/${code}/minmax?cabinet_id=${cabinetId}` : `/items/${code}/minmax`;
    const response = await api.patch(url, data);
    return response.data;
  },
};

// =========================================== Medical Supplies API ===========================================
// Backend: medical-supplies (list/create/get/update/delete), medical-supply-items (by-usage, return, dispense, record-stock-returns), medical-supply (dispensed/returned items, compare, usage-by-item-code)
export const medicalSuppliesApi = {
  create: async (data: any): Promise<ApiResponse<any>> => {
    const response = await api.post('/medical-supplies', data);
    return response.data;
  },

  getAll: async (query?: {
    page?: number;
    limit?: number;
    keyword?: string;
    patient_hn?: string;  // แก้จาก hn เป็น patient_hn ให้ตรงกับ backend
    hn?: string;  // เก็บไว้เพื่อ backward compatibility
    an?: string;
    sort_by?: string;
    sort_order?: string;
    startDate?: string;
    endDate?: string;
    user_name?: string;
    first_name?: string;
    lastname?: string;
    assession_no?: string;
    department_code?: string;
    department_name?: string;  // ชื่อแผนก (เช็คกับ DepName/DepName2)
    print_date?: string;       // วันที่พิมพ์บิล
    time_print_date?: string;  // เวลาที่พิมพ์บิล
  }): Promise<PaginatedResponse<any>> => {
    const response = await api.get('/medical-supplies', { params: query });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<any>> => {
    const response = await api.get(`/medical-supplies/${id}`);
    return response.data;
  },

  update: async (id: number, data: any): Promise<ApiResponse<any>> => {
    const response = await api.put(`/medical-supplies/${id}`, data);
    return response.data;
  },

  updatePrintInfo: async (id: number, data: {
    print_location?: string;
    print_date?: Date;
    time_print_date?: Date;
  }): Promise<ApiResponse<any>> => {
    const response = await api.patch(`/medical-supplies/${id}/print-info`, data);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse> => {
    const response = await api.delete(`/medical-supplies/${id}`);
    return response.data;
  },

  getStatistics: async (): Promise<ApiResponse<any>> => {
    const response = await api.get('/medical-supplies/statistics');
    return response.data;
  },

  getLogs: async (query?: {
    page?: number;
    limit?: number;
    usage_id?: number;
    action?: string;
    method?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; data: any[]; total: number; page: number; limit: number; totalPages: number }> => {
    const response = await api.get('/medical-supplies/logs', { params: query });
    return response.data;
  },

  // Quantity Management APIs
  getSupplyItemById: async (itemId: number): Promise<ApiResponse<any>> => {
    const response = await api.get(`/medical-supply-items/${itemId}`);
    return response.data;
  },

  getSupplyItemsByUsageId: async (usageId: number): Promise<ApiResponse<any>> => {
    const response = await api.get(`/medical-supply-items/by-usage/${usageId}`);
    return response.data;
  },

  recordItemUsedWithPatient: async (data: {
    item_id: number;
    qty_used: number;
    recorded_by_user_id?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await api.post('/medical-supply-items/record-used', data);
    return response.data;
  },

  recordItemReturn: async (data: {
    item_id: number;
    qty_returned: number;
    return_reason: string;
    return_by_user_id: string;
    return_note?: string;
  }): Promise<ApiResponse<unknown>> => {
    const response = await api.post('/medical-supply-items/record-return', data);
    return response.data;
  },

  getPendingItems: async (query?: {
    department_code?: string;
    patient_hn?: string;
    item_status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<unknown>> => {
    const response = await api.get('/medical-supply-items/pending', { params: query });
    return response.data;
  },

  getReturnHistory: async (query?: {
    department_code?: string;
    patient_hn?: string;
    return_reason?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<unknown>> => {
    const response = await api.get('/medical-supply-items/return-history', { params: query });
    return response.data;
  },

  getItemStocksForReturnToCabinet: async (filters?: {
    itemCode?: string;
    itemTypeId?: number;
    rfidCode?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<unknown>> => {
    const queryParams = new URLSearchParams();
    if (filters?.itemCode) queryParams.append('itemCode', filters.itemCode);
    if (filters?.itemTypeId) queryParams.append('itemTypeId', filters.itemTypeId.toString());
    if (filters?.rfidCode) queryParams.append('rfidCode', filters.rfidCode);
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);
    if (filters?.page) queryParams.append('page', filters.page.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());
    const response = await api.get(`/medical-supply-items/for-return-to-cabinet?${queryParams.toString()}`);
    return response.data;
  },

  recordStockReturn: async (data: {
    items: Array<{ item_stock_id: number; return_reason: string; return_note?: string }>;
    return_by_user_id?: string;
    stock_id?: number;
  }): Promise<ApiResponse<{ updatedCount?: number }>> => {
    const response = await api.post('/medical-supply-items/record-stock-returns', {
      ...data,
      return_by_user_id: data.return_by_user_id || 'admin',
    });
    return response.data;
  },

  returnItemsToCabinet: async (rowIds: number[], userId?: number): Promise<ApiResponse<unknown>> => {
    const response = await api.post('/medical-supply-items/return-to-cabinet', {
      rowIds,
      userId: userId ?? 0,
    });
    return response.data;
  },

  getItemStocksForDispenseFromCabinet: async (filters?: {
    itemCode?: string;
    itemTypeId?: number;
    rfidCode?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any>> => {
    const queryParams = new URLSearchParams();
    if (filters?.itemCode) queryParams.append('itemCode', filters.itemCode);
    if (filters?.itemTypeId) queryParams.append('itemTypeId', filters.itemTypeId.toString());
    if (filters?.rfidCode) queryParams.append('rfidCode', filters.rfidCode);
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);
    if (filters?.page) queryParams.append('page', filters.page.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());
    const response = await api.get(`/medical-supply-items/for-dispense-from-cabinet?${queryParams.toString()}`);
    return response.data;
  },

  dispenseItemsFromCabinet: async (rowIds: number[], userId?: number): Promise<ApiResponse<any>> => {
    const response = await api.post('/medical-supply-items/dispense-from-cabinet', {
      rowIds,
      userId: userId ?? 0,
    });
    return response.data;
  },

  getReturnedItems: async (query?: {
    keyword?: string;
    itemCode?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    departmentId?: string;
    cabinetId?: string;
    departmentCode?: string;
    cabinetCode?: string;
  }): Promise<
    ApiResponse<any> & {
      total?: number;
      page?: number;
      limit?: number;
      totalPages?: number;
    }
  > => {
    const response = await api.get('/medical-supply/returned-items', { params: query });
    return response.data;
  },

  getQuantityStatistics: async (departmentCode?: string): Promise<ApiResponse<any>> => {
    const params = departmentCode ? { department_code: departmentCode } : {};
    const response = await api.get('/medical-supply-items/quantity-statistics', { params });
    return response.data;
  },

  // Item Comparison APIs
  getDispensedItems: async (query?: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    departmentId?: string;
    cabinetId?: string;
  }): Promise<ApiResponse<any> & {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  }> => {
    const response = await api.get('/medical-supply/dispensed-items', { params: query });
    return response.data;
  },

  /** ดาวน์โหลดรายงานเบิกจากตู้ (Excel/PDF) — Backend POST /reports/dispensed-items/excel|pdf returns JSON { success, data: { buffer (base64), filename, contentType } } */
  downloadDispensedItemsExcel: async (params?: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    cabinetId?: string;
  }): Promise<void> => {
    const body = {
      keyword: params?.keyword,
      startDate: params?.startDate,
      endDate: params?.endDate,
      departmentId: params?.departmentId,
      cabinetId: params?.cabinetId,
    };
    const response = await api.post('/reports/dispensed-items/excel', body);
    const res = response.data as { success?: boolean; data?: { buffer?: string; filename?: string; contentType?: string } };
    if (!res?.success || !res?.data?.buffer) throw new Error((res as any)?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.data.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.data.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.data.filename || `dispensed_items_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  downloadDispensedItemsPdf: async (params?: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    cabinetId?: string;
  }): Promise<void> => {
    const body = {
      keyword: params?.keyword,
      startDate: params?.startDate,
      endDate: params?.endDate,
      departmentId: params?.departmentId,
      cabinetId: params?.cabinetId,
    };
    const response = await api.post('/reports/dispensed-items/pdf', body);
    const res = response.data as { success?: boolean; data?: { buffer?: string; filename?: string; contentType?: string } };
    if (!res?.success || !res?.data?.buffer) throw new Error((res as any)?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.data.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.data.contentType || 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.data.filename || `dispensed_items_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  compareDispensedVsUsage: async (query?: {
    itemCode?: string;
    keyword?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    departmentCode?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any>> => {
    const response = await api.get('/medical-supply/compare-dispensed-vs-usage', { params: query });
    return response.data;
  },

  /** สรุปโดยรวม: จำนวนเบิก, จำนวนใช้, ผลต่าง (สำหรับ Dashboard) — backend: medical-supply/dispensed-vs-usage-summary */
  getDispensedVsUsageSummary: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<{ total_dispensed: number; total_used: number; difference: number }>> => {
    const response = await api.get('/medical-supply/dispensed-vs-usage-summary', { params });
    return response.data;
  },

  /** ดาวน์โหลดรายงานเปรียบเทียบการเบิกและใช้ — Backend POST /reports/item-comparison/excel|pdf returns JSON { success, data: { buffer, filename, contentType } } */
  downloadMedicalSuppliesComparisonExcel: async (params?: {
    itemCode?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    departmentCode?: string;
    includeUsageDetails?: boolean | string;
  }): Promise<void> => {
    const body = {
      itemCode: params?.itemCode,
      itemTypeId: params?.itemTypeId,
      startDate: params?.startDate,
      endDate: params?.endDate,
      departmentCode: params?.departmentCode,
      includeUsageDetails: params?.includeUsageDetails === true || params?.includeUsageDetails === 'true',
    };
    const response = await api.post('/reports/item-comparison/excel', body);
    const res = response.data as { success?: boolean; data?: { buffer?: string; filename?: string; contentType?: string } };
    if (!res?.success || !res?.data?.buffer) throw new Error((res as any)?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.data.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.data.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.data.filename || `medical_supplies_comparison_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  downloadMedicalSuppliesComparisonPdf: async (params?: {
    itemCode?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    departmentCode?: string;
    includeUsageDetails?: boolean | string;
  }): Promise<void> => {
    const body = {
      itemCode: params?.itemCode,
      itemTypeId: params?.itemTypeId,
      startDate: params?.startDate,
      endDate: params?.endDate,
      departmentCode: params?.departmentCode,
      includeUsageDetails: params?.includeUsageDetails === true || params?.includeUsageDetails === 'true',
    };
    const response = await api.post('/reports/item-comparison/pdf', body);
    const res = response.data as { success?: boolean; data?: { buffer?: string; filename?: string; contentType?: string } };
    if (!res?.success || !res?.data?.buffer) throw new Error((res as any)?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.data.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.data.contentType || 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.data.filename || `medical_supplies_comparison_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  getUsageByItemCode: async (query?: {
    itemCode?: string;
    startDate?: string;
    endDate?: string;
    first_name?: string;
    lastname?: string;
    assession_no?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any>> => {
    const response = await api.get('/medical-supplies-usage-by-item', { params: query });
    return response.data;
  },

  getUsageByOrderItemCode: async (query?: {
    orderItemCode?: string;
    startDate?: string;
    endDate?: string;
    first_name?: string;
    lastname?: string;
    assession_no?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any>> => {
    const response = await api.get('/medical-supplies-usage-by-order-item', { params: query });
    return response.data;
  },

  getUsageByItemCodeFromItemTable: async (query?: {
    itemCode?: string;
    startDate?: string;
    endDate?: string;
    first_name?: string;
    lastname?: string;
    assession_no?: string;
    departmentCode?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any>> => {
    const response = await api.get('/medical-supply/usage-by-item-code-from-item-table', { params: query });
    return response.data;
  },

  handleCrossDayCancelBill: async (data: {
    en: string;
    hn: string;
    oldPrintDate: string;
    newPrintDate: string;
    cancelItems: Array<{
      assession_no: string;
      item_code: string;
      qty: number;
      status?: string; // Status = Discontinue สำหรับรายการที่ยกเลิก
    }>;
    newItems?: Array<{
      item_code: string;
      item_description: string;
      assession_no: string;
      qty: number;
      uom: string;
      item_status?: string; // Status = Verified สำหรับรายการใหม่
    }>;
  }): Promise<ApiResponse<any>> => {
    const response = await api.post('/medical-supply/handle-cross-day-cancel-bill', data);
    return response.data;
  },

  handleCancelBill: async (data: {
    usageId: number;
    supplyItemIds: number[];
    oldPrintDate: string;
    newPrintDate: string;
    newItems?: Array<{
      item_code: string;
      item_description: string;
      assession_no: string;
      qty: number;
      uom: string;
      item_status?: string;
    }>;
  }): Promise<ApiResponse<any>> => {
    const response = await api.post('/medical-supply/handle-cancel-bill', data);
    return response.data;
  },
};

// Reports API
export const vendingReportsApi = {
  // Get data (JSON)
  getVendingMappingData: async (params?: { startDate?: string; endDate?: string; printDate?: string }): Promise<ApiResponse<any>> => {
    const queryParams = new URLSearchParams();
    if (params?.printDate) queryParams.append('printDate', params.printDate);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    const response = await api.get(`/reports/vending-mapping/data?${queryParams.toString()}`);
    return response.data;
  },
  getUnmappedDispensedData: async (params?: { startDate?: string; endDate?: string; groupBy?: 'day' | 'month' }): Promise<ApiResponse<any>> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.groupBy) queryParams.append('groupBy', params.groupBy);
    const response = await api.get(`/reports/unmapped-dispensed/data?${queryParams.toString()}`);
    return response.data;
  },
  getUnusedDispensedData: async (params?: { date?: string }): Promise<ApiResponse<any>> => {
    const queryParams = new URLSearchParams();
    if (params?.date) queryParams.append('date', params.date);
    const response = await api.get(`/reports/unused-dispensed/data?${queryParams.toString()}`);
    return response.data;
  },
  getCancelBillReportData: async (params?: { startDate?: string; endDate?: string }): Promise<ApiResponse<any>> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    const response = await api.get(`/reports/cancel-bill/data?${queryParams.toString()}`);
    return response.data;
  },
  /** ดาวน์โหลดรายงานเบิกใช้กับคนไข้ (Excel/PDF) โดยไม่เปิดแท็บใหม่ */
  downloadDispensedItemsForPatientsExcel: async (params?: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    patientHn?: string;
    departmentCode?: string;
    usageType?: string;
  }): Promise<void> => {
    const queryParams = new URLSearchParams();
    if (params?.keyword) queryParams.append('keyword', params.keyword);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.patientHn) queryParams.append('patientHn', params.patientHn);
    if (params?.departmentCode) queryParams.append('departmentCode', params.departmentCode);
    if (params?.usageType) queryParams.append('usageType', params.usageType);
    const response = await api.get(
      `/reports/dispensed-items-for-patients/export/excel?${queryParams.toString()}`,
      { responseType: 'blob' },
    );
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dispensed_items_for_patients_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  downloadDispensedItemsForPatientsPdf: async (params?: {
    keyword?: string;
    startDate?: string;
    endDate?: string;
    patientHn?: string;
    departmentCode?: string;
    usageType?: string;
  }): Promise<void> => {
    const queryParams = new URLSearchParams();
    if (params?.keyword) queryParams.append('keyword', params.keyword);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.patientHn) queryParams.append('patientHn', params.patientHn);
    if (params?.departmentCode) queryParams.append('departmentCode', params.departmentCode);
    if (params?.usageType) queryParams.append('usageType', params.usageType);
    const response = await api.get(
      `/reports/dispensed-items-for-patients/export/pdf?${queryParams.toString()}`,
      { responseType: 'blob' },
    );
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `dispensed_items_for_patients_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  // Download reports
  downloadVendingMappingExcel: async (params: { startDate?: string; endDate?: string; printDate?: string }) => {
    const queryParams = new URLSearchParams();
    if (params.printDate) queryParams.append('printDate', params.printDate);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    const response = await api.get(`/reports/vending-mapping/excel?${queryParams.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },
  downloadVendingMappingPDF: async (params: { startDate?: string; endDate?: string; printDate?: string }) => {
    const queryParams = new URLSearchParams();
    if (params.printDate) queryParams.append('printDate', params.printDate);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    const response = await api.get(`/reports/vending-mapping/pdf?${queryParams.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },
  downloadUnmappedDispensedExcel: async (params: { startDate?: string; endDate?: string; groupBy?: 'day' | 'month' }) => {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.groupBy) queryParams.append('groupBy', params.groupBy);
    const response = await api.get(`/reports/unmapped-dispensed/excel?${queryParams.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },
  downloadUnusedDispensedExcel: async (params: { date?: string }) => {
    const queryParams = new URLSearchParams();
    if (params.date) queryParams.append('date', params.date);
    const response = await api.get(`/reports/unused-dispensed/excel?${queryParams.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },
  downloadReturnReportExcel: async (params?: {
    date_from?: string;
    date_to?: string;
    return_reason?: string;
    department_code?: string;
    patient_hn?: string;
  }): Promise<void> => {
    const queryParams = new URLSearchParams();
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);
    if (params?.return_reason) queryParams.append('return_reason', params.return_reason);
    if (params?.department_code) queryParams.append('department_code', params.department_code);
    if (params?.patient_hn) queryParams.append('patient_hn', params.patient_hn);
    const response = await api.get(`/reports/return/excel?${queryParams.toString()}`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `return_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
  downloadReturnReportPdf: async (params?: {
    date_from?: string;
    date_to?: string;
    return_reason?: string;
    department_code?: string;
    patient_hn?: string;
  }): Promise<void> => {
    const queryParams = new URLSearchParams();
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);
    if (params?.return_reason) queryParams.append('return_reason', params.return_reason);
    if (params?.department_code) queryParams.append('department_code', params.department_code);
    if (params?.patient_hn) queryParams.append('patient_hn', params.patient_hn);
    const response = await api.get(`/reports/return/pdf?${queryParams.toString()}`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `return_report_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
  downloadCancelBillReportExcel: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<void> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    const response = await api.get(`/reports/cancel-bill/excel?${queryParams.toString()}`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cancel_bill_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
  downloadCancelBillReportPdf: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<void> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    const response = await api.get(`/reports/cancel-bill/pdf?${queryParams.toString()}`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cancel_bill_report_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
  /** Backend POST /reports/return-to-cabinet/excel|pdf returns JSON { success, buffer (base64), contentType, filename } */
  downloadReturnToCabinetReportExcel: async (params?: {
    keyword?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    cabinetId?: string;
  }): Promise<void> => {
    const body = {
      keyword: params?.keyword,
      itemTypeId: params?.itemTypeId,
      startDate: params?.startDate,
      endDate: params?.endDate,
      departmentId: params?.departmentId,
      cabinetId: params?.cabinetId,
    };
    const response = await api.post('/reports/return-to-cabinet/excel', body);
    const res = response.data as { success?: boolean; buffer?: string; contentType?: string; filename?: string };
    if (!res?.success || !res?.buffer) throw new Error((res as any)?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.filename || `return_to_cabinet_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  downloadReturnToCabinetReportPdf: async (params?: {
    keyword?: string;
    itemTypeId?: number;
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    cabinetId?: string;
  }): Promise<void> => {
    const body = {
      keyword: params?.keyword,
      itemTypeId: params?.itemTypeId,
      startDate: params?.startDate,
      endDate: params?.endDate,
      departmentId: params?.departmentId,
      cabinetId: params?.cabinetId,
    };
    const response = await api.post('/reports/return-to-cabinet/pdf', body);
    const res = response.data as { success?: boolean; buffer?: string; contentType?: string; filename?: string };
    if (!res?.success || !res?.buffer) throw new Error((res as any)?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.contentType || 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.filename || `return_to_cabinet_report_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export const reportsApi = {
  // Comparison Report
  exportComparisonExcel: async (usageId: number): Promise<Blob> => {
    const response = await api.get(`/reports/comparison/${usageId}/excel`, {
      responseType: 'blob',
    });
    return response.data;
  },

  exportComparisonPDF: async (usageId: number): Promise<Blob> => {
    const response = await api.get(`/reports/comparison/${usageId}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Equipment Usage Report
  exportEquipmentUsageExcel: async (params?: {
    dateFrom?: string;
    dateTo?: string;
    hospital?: string;
    department?: string;
    usageIds?: number[];
  }): Promise<Blob> => {
    const queryParams = new URLSearchParams();
    if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) queryParams.append('dateTo', params.dateTo);
    if (params?.hospital) queryParams.append('hospital', params.hospital);
    if (params?.department) queryParams.append('department', params.department);
    if (params?.usageIds && params.usageIds.length > 0) {
      queryParams.append('usageIds', params.usageIds.join(','));
    }

    const response = await api.get(`/reports/equipment-usage/excel?${queryParams.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  exportEquipmentUsagePDF: async (params?: {
    dateFrom?: string;
    dateTo?: string;
    hospital?: string;
    department?: string;
    usageIds?: number[];
  }): Promise<Blob> => {
    const queryParams = new URLSearchParams();
    if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) queryParams.append('dateTo', params.dateTo);
    if (params?.hospital) queryParams.append('hospital', params.hospital);
    if (params?.department) queryParams.append('department', params.department);
    if (params?.usageIds && params.usageIds.length > 0) {
      queryParams.append('usageIds', params.usageIds.join(','));
    }

    const response = await api.get(`/reports/equipment-usage/pdf?${queryParams.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Equipment Disbursement Report
  exportEquipmentDisbursementExcel: async (params?: {
    dateFrom?: string;
    dateTo?: string;
    hospital?: string;
    department?: string;
  }): Promise<Blob> => {
    const queryParams = new URLSearchParams();
    if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) queryParams.append('dateTo', params.dateTo);
    if (params?.hospital) queryParams.append('hospital', params.hospital);
    if (params?.department) queryParams.append('department', params.department);

    const response = await api.get(`/reports/equipment-disbursement/excel?${queryParams.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  exportEquipmentDisbursementPDF: async (params?: {
    dateFrom?: string;
    dateTo?: string;
    hospital?: string;
    department?: string;
  }): Promise<Blob> => {
    const queryParams = new URLSearchParams();
    if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) queryParams.append('dateTo', params.dateTo);
    if (params?.hospital) queryParams.append('hospital', params.hospital);
    if (params?.department) queryParams.append('department', params.department);

    const response = await api.get(`/reports/equipment-disbursement/pdf?${queryParams.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // รายงานสต๊อก RFID ในตู้ — POST /reports/rfid-stock/excel (สอดคล้อง weighing-stock: JSON base64 + statusFilter)
  downloadCabinetStockExcel: async (params?: {
    cabinetId?: number;
    cabinetCode?: string;
    departmentId?: number;
    keyword?: string;
    statusFilter?: string;
  }): Promise<void> => {
    const body = {
      cabinetId: params?.cabinetId,
      cabinetCode: params?.cabinetCode,
      departmentId: params?.departmentId,
      keyword: params?.keyword?.trim() || undefined,
      statusFilter: params?.statusFilter && params.statusFilter !== 'all' ? params.statusFilter : undefined,
    };
    const response = await api.post('/reports/rfid-stock/excel', body);
    const res = response.data as { success?: boolean; data?: { buffer?: string; filename?: string; contentType?: string } };
    if (!res?.success || !res?.data?.buffer) throw new Error((res as any)?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.data.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.data.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.data.filename || `rfid_stock_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  downloadCabinetStockPdf: async (params?: {
    cabinetId?: number;
    cabinetCode?: string;
    departmentId?: number;
    keyword?: string;
    statusFilter?: string;
  }): Promise<void> => {
    const body = {
      cabinetId: params?.cabinetId,
      cabinetCode: params?.cabinetCode,
      departmentId: params?.departmentId,
      keyword: params?.keyword?.trim() || undefined,
      statusFilter: params?.statusFilter && params.statusFilter !== 'all' ? params.statusFilter : undefined,
    };
    const response = await api.post('/reports/rfid-stock/pdf', body);
    const res = response.data as { success?: boolean; data?: { buffer?: string; filename?: string; contentType?: string } };
    if (!res?.success || !res?.data?.buffer) throw new Error((res as any)?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.data.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.data.contentType || 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.data.filename || `rfid_stock_report_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /** รายงานเบิกตู้ Weighing - Excel (เหมือน cabinet-stock: POST แล้ว decode base64 ดาวน์โหลด) */
  downloadWeighingDispenseExcel: async (params?: { stockId?: number; itemName?: string; itemcode?: string; dateFrom?: string; dateTo?: string }): Promise<void> => {
    const body = {
      stockId: params?.stockId,
      itemName: params?.itemName || undefined,
      itemcode: params?.itemcode || undefined,
      dateFrom: params?.dateFrom || undefined,
      dateTo: params?.dateTo || undefined,
    };
    const response = await api.post('/reports/weighing-dispense/excel', body);
    const res = response.data as { success?: boolean; data?: { buffer?: string; filename?: string; contentType?: string } };
    if (!res?.success || !res?.data?.buffer) throw new Error((res as any)?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.data.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.data.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.data.filename || `weighing_dispense_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /** รายงานเบิกตู้ Weighing - PDF (เหมือน cabinet-stock) */
  downloadWeighingDispensePdf: async (params?: { stockId?: number; itemName?: string; itemcode?: string; dateFrom?: string; dateTo?: string }): Promise<void> => {
    const body = {
      stockId: params?.stockId,
      itemName: params?.itemName || undefined,
      itemcode: params?.itemcode || undefined,
      dateFrom: params?.dateFrom || undefined,
      dateTo: params?.dateTo || undefined,
    };
    const response = await api.post('/reports/weighing-dispense/pdf', body);
    const res = response.data as { success?: boolean; data?: { buffer?: string; filename?: string; contentType?: string } };
    if (!res?.success || !res?.data?.buffer) throw new Error((res as any)?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.data.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.data.contentType || 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.data.filename || `weighing_dispense_report_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /** รายงานเบิกรวม Weighing + RFID — Excel หลายชีต */
  downloadDispensedAllExcel: async (params?: {
    weighing?: { stockId?: number; itemName?: string; itemcode?: string; dateFrom?: string; dateTo?: string };
    rfid?: { keyword?: string; startDate?: string; endDate?: string; page?: number; limit?: number; departmentId?: string; cabinetId?: string };
  }): Promise<void> => {
    const response = await api.post('/reports/dispensed-all/excel', params ?? {});
    const res = response.data as { success?: boolean; data?: { buffer?: string; filename?: string; contentType?: string } };
    if (!res?.success || !res?.data?.buffer) throw new Error((res as any)?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.data.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.data.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.data.filename || `dispensed_all_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /** รายงานเติม/คืนรวม Weighing + RFID คืนเข้าตู้ — Excel หลายชีต */
  downloadRefillAllExcel: async (params?: {
    weighing?: { stockId?: number; itemName?: string; itemcode?: string; dateFrom?: string; dateTo?: string };
    returnToCabinet?: {
      keyword?: string;
      itemTypeId?: number;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
      departmentId?: string;
      cabinetId?: string;
    };
  }): Promise<void> => {
    const response = await api.post('/reports/refill-all/excel', params ?? {});
    const res = response.data as { success?: boolean; data?: { buffer?: string; filename?: string; contentType?: string } };
    if (!res?.success || !res?.data?.buffer) throw new Error((res as any)?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.data.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.data.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.data.filename || `refill_all_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /** รายงานเติมตู้ Weighing - Excel */
  downloadWeighingRefillExcel: async (params?: { stockId?: number; itemName?: string; itemcode?: string; dateFrom?: string; dateTo?: string }): Promise<void> => {
    const body = { stockId: params?.stockId, itemName: params?.itemName || undefined, itemcode: params?.itemcode || undefined, dateFrom: params?.dateFrom || undefined, dateTo: params?.dateTo || undefined };
    const response = await api.post('/reports/weighing-refill/excel', body);
    const res = response.data as { success?: boolean; data?: { buffer?: string; filename?: string; contentType?: string } };
    if (!res?.success || !res?.data?.buffer) throw new Error((res as any)?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.data.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.data.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.data.filename || `weighing_refill_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /** รายงานเติมตู้ Weighing - PDF */
  downloadWeighingRefillPdf: async (params?: { stockId?: number; itemName?: string; itemcode?: string; dateFrom?: string; dateTo?: string }): Promise<void> => {
    const body = { stockId: params?.stockId, itemName: params?.itemName || undefined, itemcode: params?.itemcode || undefined, dateFrom: params?.dateFrom || undefined, dateTo: params?.dateTo || undefined };
    const response = await api.post('/reports/weighing-refill/pdf', body);
    const res = response.data as { success?: boolean; data?: { buffer?: string; filename?: string; contentType?: string } };
    if (!res?.success || !res?.data?.buffer) throw new Error((res as any)?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.data.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.data.contentType || 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.data.filename || `weighing_refill_report_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /** รายงานรวมหน้า items-stock — Excel แยกชีตตามชิป (ทั้งหมด/หมดอายุ/ใกล้หมดอายุ/สต็อกต่ำ) × Weighing + RFID */
  downloadItemsStockCombinedExcel: async (params?: {
    itemName?: string;
    itemcode?: string;
    /** ส่งได้เพื่อความเข้ากัน — แบ็กเอนด์ส่งออกครบทุกชิปในชีตแยก */
    statusFilter?: string;
  }): Promise<void> => {
    const body = {
      itemName: params?.itemName || undefined,
      itemcode: params?.itemcode || undefined,
      statusFilter: params?.statusFilter && params.statusFilter !== 'all' ? params.statusFilter : undefined,
    };
    const response = await api.post('/reports/items-stock-combined/excel', body);
    const res = response.data as { success?: boolean; data?: { buffer?: string; filename?: string; contentType?: string } };
    if (!res?.success || !res?.data?.buffer) throw new Error((res as any)?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.data.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.data.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.data.filename || `items_stock_combined_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /** รายงานสต็อกต่ำรวม — Excel 2 ชีต (Weighing แล้ว RFID) endpoint แยกจาก items-stock-combined */
  downloadItemsStockLowCombinedExcel: async (params?: {
    itemName?: string;
    itemcode?: string;
  }): Promise<void> => {
    const body = {
      itemName: params?.itemName || undefined,
      itemcode: params?.itemcode || undefined,
    };
    const response = await api.post('/reports/items-stock-low-combined/excel', body);
    const res = response.data as { success?: boolean; data?: { buffer?: string; filename?: string; contentType?: string } };
    if (!res?.success || !res?.data?.buffer) throw new Error((res as any)?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.data.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.data.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.data.filename || `items_stock_low_combined_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /** รายงานสต็อกต่ำรวม — PDF เดียว (Weighing แล้ว RFID) */
  downloadItemsStockLowCombinedPdf: async (params?: {
    itemName?: string;
    itemcode?: string;
  }): Promise<void> => {
    const body = {
      itemName: params?.itemName || undefined,
      itemcode: params?.itemcode || undefined,
    };
    const response = await api.post('/reports/items-stock-low-combined/pdf', body);
    const res = response.data as { success?: boolean; data?: { buffer?: string; filename?: string; contentType?: string } };
    if (!res?.success || !res?.data?.buffer) throw new Error((res as any)?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.data.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.data.contentType || 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.data.filename || `items_stock_low_combined_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /** รายงานสต๊อกตู้ Weighing - Excel */
  downloadWeighingStockExcel: async (params?: {
    stockId?: number;
    itemName?: string;
    itemcode?: string;
    statusFilter?: string;
  }): Promise<void> => {
    const body = {
      stockId: params?.stockId,
      itemName: params?.itemName || undefined,
      itemcode: params?.itemcode || undefined,
      statusFilter: params?.statusFilter && params.statusFilter !== 'all' ? params.statusFilter : undefined,
    };
    const response = await api.post('/reports/weighing-stock/excel', body);
    const res = response.data as { success?: boolean; data?: { buffer?: string; filename?: string; contentType?: string } };
    if (!res?.success || !res?.data?.buffer) throw new Error((res as any)?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.data.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.data.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.data.filename || `weighing_stock_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /** รายงานสต๊อกตู้ Weighing - PDF */
  downloadWeighingStockPdf: async (params?: {
    stockId?: number;
    itemName?: string;
    itemcode?: string;
    statusFilter?: string;
  }): Promise<void> => {
    const body = {
      stockId: params?.stockId,
      itemName: params?.itemName || undefined,
      itemcode: params?.itemcode || undefined,
      statusFilter: params?.statusFilter && params.statusFilter !== 'all' ? params.statusFilter : undefined,
    };
    const response = await api.post('/reports/weighing-stock/pdf', body);
    const res = response.data as { success?: boolean; data?: { buffer?: string; filename?: string; contentType?: string } };
    if (!res?.success || !res?.data?.buffer) throw new Error((res as any)?.error || 'ไม่สามารถสร้างไฟล์ได้');
    const binary = atob(res.data.buffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: res.data.contentType || 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', res.data.filename || `weighing_stock_report_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

// =========================== Staff User API ===========================
// Backend DTO: CreateStaffUserDto (email, fname, lname, role_code?, role_id?, department_id?, password?, expires_at?)
// Backend DTO: UpdateStaffUserDto (email?, fname?, lname?, role_code?, role_id?, department_id?, password?, is_active?, expires_at?)
// Response shape: { success: boolean; data?: T; message?: string; error?: string }
export const staffUserApi = {
  createStaffUser: async (data: {
    email: string;
    fname: string;
    lname: string;
    role: string;
    role_code?: string;
    department_id?: number | null;
    password?: string;
    expires_at?: string;
  }): Promise<ApiResponse<any>> => {
    const body: Record<string, unknown> = {
      email: data.email.trim(),
      fname: data.fname.trim(),
      lname: data.lname.trim(),
      role_code: data.role_code ?? data.role,
    };
    if (data.department_id != null) body.department_id = Number(data.department_id);
    if (data.password && String(data.password).length >= 8) body.password = data.password;
    if (data.expires_at?.trim()) body.expires_at = data.expires_at.trim();
    const response = await api.post('/staff-users', body);
    return response.data;
  },

  getAllStaffUsers: async (params?: { page?: number; limit?: number; keyword?: string }): Promise<ApiResponse<any[]>> => {
    const response = await api.get('/staff-users', { params: params ?? {} });
    return response.data;
  },

  getStaffUserById: async (id: number): Promise<ApiResponse<any>> => {
    const response = await api.get(`/staff-users/${id}`);
    return response.data;
  },

  updateStaffUser: async (
    id: number,
    data: {
      email?: string;
      fname?: string;
      lname?: string;
      role?: string;
      role_code?: string;
      department_id?: number | null;
      password?: string;
      is_active?: boolean;
      expires_at?: string;
    }
  ): Promise<ApiResponse<any>> => {
    const body: Record<string, unknown> = {};
    if (data.email !== undefined) body.email = data.email.trim();
    if (data.fname !== undefined) body.fname = data.fname.trim();
    if (data.lname !== undefined) body.lname = data.lname.trim();
    if (data.role !== undefined || data.role_code !== undefined) body.role_code = data.role_code ?? data.role;
    if (data.department_id !== undefined) body.department_id = data.department_id === null ? null : Number(data.department_id);
    if (data.password !== undefined && data.password !== '' && data.password.length >= 8) body.password = data.password;
    if (data.is_active !== undefined) body.is_active = data.is_active;
    if (data.expires_at !== undefined) body.expires_at = data.expires_at?.trim() || undefined;
    const response = await api.put(`/staff-users/${id}`, body);
    return response.data;
  },

  deleteStaffUser: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/staff-users/${id}`);
    return response.data;
  },

  regenerateClientSecret: async (id: number, data?: { expires_at?: string }): Promise<ApiResponse<any>> => {
    const body = data?.expires_at ? { expires_at: data.expires_at } : {};
    const response = await api.post(`/staff-users/${id}/regenerate-secret`, body);
    return response.data;
  },

  staffUserLogin: async (data: { email: string; password: string; roleType?: string }): Promise<ApiResponse<any>> => {
    const response = await api.post('/staff-users/login', data);
    return response.data;
  },

  getStaffProfile: async (): Promise<ApiResponse<any>> => {
    const response = await api.get('/staff/profile');
    return response.data;
  },

  updateStaffProfile: async (data: {
    fname?: string;
    lname?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  }): Promise<ApiResponse<any>> => {
    const response = await api.put('/staff/profile', data);
    return response.data;
  },
};

// =========================== Staff Role Permissions API ===========================
export const staffRolePermissionApi = {
  getAll: async (): Promise<ApiResponse<any[]>> => {
    const response = await api.get('/staff-role-permissions');
    return response.data;
  },

  getByRole: async (role: string): Promise<ApiResponse<any[]>> => {
    const response = await api.get(`/staff-role-permissions/${role}`);
    return response.data;
  },

  upsert: async (data: {
    role_code?: string;
    role_id?: number;
    menu_href: string;
    can_access: boolean;
  }): Promise<ApiResponse<any>> => {
    const response = await api.post('/staff-role-permissions', data);
    return response.data;
  },

  bulkUpdate: async (permissions: Array<{
    role_code?: string;
    role_id?: number;
    menu_href: string;
    can_access: boolean;
  }>): Promise<ApiResponse<any>> => {
    const response = await api.put('/staff-role-permissions/bulk', { permissions });
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/staff-role-permissions/${id}`);
    return response.data;
  },
};

// =========================== Staff Roles API ===========================
export const staffRoleApi = {
  getAll: async (): Promise<ApiResponse<any[]>> => {
    const response = await api.get('/staff-roles');
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<any>> => {
    const response = await api.get(`/staff-roles/${id}`);
    return response.data;
  },

  create: async (data: {
    code: string;
    name: string;
    description?: string;
    is_active?: boolean;
  }): Promise<ApiResponse<any>> => {
    const response = await api.post('/staff-roles', data);
    return response.data;
  },

  update: async (
    id: number,
    data: {
      name?: string;
      description?: string;
      is_active?: boolean;
    }
  ): Promise<ApiResponse<any>> => {
    const response = await api.put(`/staff-roles/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/staff-roles/${id}`);
    return response.data;
  },
};

// =========================== Categories API ===========================
export const categoriesApi = {
  getAll: async (params?: { page?: number; limit?: number; parentId?: string }): Promise<ApiResponse<any[]>> => {
    const response = await api.get('/categories', { params });
    return response.data;
  },

  getById: async (id: number | string): Promise<ApiResponse<any>> => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },

  create: async (data: {
    name: string;
    description?: string;
    slug?: string;
    is_active?: boolean;
  }): Promise<ApiResponse<any>> => {
    const response = await api.post('/categories', data);
    return response.data;
  },

  update: async (
    id: number | string,
    data: {
      name?: string;
      description?: string;
      slug?: string;
      is_active?: boolean;
    }
  ): Promise<ApiResponse<any>> => {
    const response = await api.put(`/categories/${id}`, data);
    return response.data;
  },

  delete: async (id: number | string): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  },
};

// Department API
export const departmentApi = {
  getAll: async (params?: { page?: number; limit?: number; keyword?: string; isCancel?: boolean }): Promise<ApiResponse<any[]>> => {
    const safeParams = { ...params };
    if (safeParams.keyword !== undefined && typeof safeParams.keyword === 'string' && !safeParams.keyword.trim()) {
      delete safeParams.keyword;
    }
    const response = await api.get('/departments', { params: safeParams });
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<any>> => {
    const response = await api.get(`/departments/${id}`);
    return response.data;
  },

  create: async (data: any): Promise<ApiResponse<any>> => {
    const response = await api.post('/departments', data);
    return response.data;
  },

  update: async (id: number, data: any): Promise<ApiResponse<any>> => {
    const response = await api.put(`/departments/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/departments/${id}`);
    return response.data;
  },
};

// =========================== ItemStock API ===========================
export const itemStockApi = {
  getAll: async (params?: { page?: number; limit?: number; keyword?: string; sort_by?: string; sort_order?: string }): Promise<ApiResponse<any[]>> => {
    const response = await api.get('/item-stocks', { params });
    return response.data;
  },

  /** รายการ RFID รายชิ้นใน itemstock — GET /item-stocks/rfid-lines?itemcode=&stock_id= */
  getRfidLines: async (
    itemcode: string,
    stockId: number,
  ): Promise<{
    success: boolean;
    message?: string;
    data?: { rowId: number; rfidCode: string; expireDate: string | null }[];
  }> => {
    const response = await api.get('/item-stocks/rfid-lines', {
      params: { itemcode, stock_id: stockId },
    });
    return response.data;
  },

  /**
   * RFID จัดกลุ่มตาม itemcode — GET /item-stocks/rfid-lines-grouped?stock_id=&keyword=
   * data: Record<itemcode, { rowId, rfidCode, expireDate }[]>
   */
  getRfidLinesGroupedByStock: async (
    stockId: number,
    keyword?: string,
  ): Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, { rowId: number; rfidCode: string; expireDate: string | null }[]>;
  }> => {
    const response = await api.get('/item-stocks/rfid-lines-grouped', {
      params: {
        stock_id: stockId,
        keyword: keyword?.trim() || undefined,
      },
    });
    return response.data;
  },
};

/** รายการประเภทตู้จาก master (ใช้ทั้ง cabinetApi.getTypes และ cabinetTypeApi) */
export type CabinetTypeRow = {
  code: string;
  name_th: string | null;
  name_en: string | null;
  has_expiry: boolean;
  show_rfid_code: boolean;
  description: string | null;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

// =========================== Cabinet API ===========================
export const cabinetApi = {
  getAll: async (params?: { page?: number; limit?: number; keyword?: string; sort_by?: string; sort_order?: string }): Promise<PaginatedResponse<any>> => {
    const response = await api.get('/cabinets', { params });
    return response.data;
  },

  /** ประเภทตู้ที่ active — สำหรับ dropdown (GET /cabinets/types) */
  getTypes: async (): Promise<{
    success: boolean;
    data?: CabinetTypeRow[];
    message?: string;
  }> => {
    const response = await api.get('/cabinets/types');
    return response.data;
  },

  getById: async (id: number): Promise<ApiResponse<any>> => {
    const response = await api.get(`/cabinets/${id}`);
    return response.data;
  },

  create: async (data: { cabinet_name?: string; cabinet_code?: string; cabinet_type?: string; stock_id?: number; cabinet_status?: string }): Promise<ApiResponse<any>> => {
    const response = await api.post('/cabinets', data);
    return response.data;
  },

  update: async (id: number, data: { cabinet_name?: string; cabinet_code?: string; cabinet_type?: string; stock_id?: number; cabinet_status?: string }): Promise<ApiResponse<any>> => {
    const response = await api.put(`/cabinets/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/cabinets/${id}`);
    return response.data;
  },
};

// =========================== Cabinet type (master) API ===========================
export const cabinetTypeApi = {
  getAll: async (): Promise<{ success: boolean; data?: CabinetTypeRow[]; message?: string }> => {
    const response = await api.get('/cabinet-types');
    return response.data;
  },
  getByCode: async (
    code: string,
  ): Promise<{ success: boolean; data?: CabinetTypeRow | null; message?: string }> => {
    const response = await api.get(`/cabinet-types/${encodeURIComponent(code)}`);
    return response.data;
  },
  create: async (data: {
    code: string;
    name_th?: string;
    name_en?: string;
    has_expiry?: boolean;
    show_rfid_code?: boolean;
    description?: string;
    sort_order?: number;
    is_active?: boolean;
  }): Promise<{ success: boolean; data?: CabinetTypeRow; message?: string }> => {
    const response = await api.post('/cabinet-types', data);
    return response.data;
  },
  update: async (
    code: string,
    data: {
      name_th?: string;
      name_en?: string;
      has_expiry?: boolean;
      show_rfid_code?: boolean;
      description?: string;
      sort_order?: number;
      is_active?: boolean;
    },
  ): Promise<{ success: boolean; data?: CabinetTypeRow; message?: string }> => {
    const response = await api.put(`/cabinet-types/${encodeURIComponent(code)}`, data);
    return response.data;
  },
  delete: async (code: string): Promise<{ success: boolean; message?: string }> => {
    const response = await api.delete(`/cabinet-types/${encodeURIComponent(code)}`);
    return response.data;
  },
};

// =========================== Cabinet Department Mapping API ===========================
// Backend: cabinet-departments (GET/POST/PUT/DELETE), item-stocks/in-cabinet (GET)
export const cabinetDepartmentApi = {
  getAll: async (params?: { cabinetId?: number; departmentId?: number; status?: string; keyword?: string; onlyWeighingCabinets?: boolean }): Promise<ApiResponse<any[]>> => {
    const apiParams: any = {};
    if (params?.cabinetId !== undefined) apiParams.cabinet_id = params.cabinetId;
    if (params?.departmentId !== undefined) apiParams.department_id = params.departmentId;
    if (params?.status !== undefined) apiParams.status = params.status;
    if (params?.keyword !== undefined && params.keyword !== "") apiParams.keyword = params.keyword;
    if (params?.onlyWeighingCabinets === true) apiParams.only_weighing_cabinets = "true";

    const response = await api.get('/cabinet-departments', { params: apiParams });
    return response.data;
  },

  create: async (data: { cabinet_id: number; department_id: number; status?: string; description?: string }): Promise<ApiResponse<any>> => {
    const response = await api.post('/cabinet-departments', data);
    return response.data;
  },

  update: async (id: number, data: { cabinet_id: number; department_id: number; status?: string; description?: string }): Promise<ApiResponse<any>> => {
    const response = await api.put(`/cabinet-departments/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await api.delete(`/cabinet-departments/${id}`);
    return response.data;
  },

  /** Backend: GET /item-stocks/in-cabinet?cabinet_id=&page=&limit=&keyword= */
  getItemStocksByCabinet: async (cabinetId: number, params?: { page?: number; limit?: number; keyword?: string }): Promise<ApiResponse<any>> => {
    const response = await api.get('/item-stocks/in-cabinet', {
      params: { ...params, cabinet_id: cabinetId },
    });
    return response.data;
  },
};


// =========================== Weighing API (ItemSlotInCabinet) ===========================
export const weighingApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    itemName?: string;
    itemcode?: string;
    stockId?: number;
    stock_status?: string;
  }): Promise<{ success: boolean; data: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> => {
    const response = await api.get('/weighing', { params });
    return response.data;
  },

  /** รายการสต็อกต่ำ Weighing + refillQuantity (max − qty) — GET /weighing/low-stock */
  getLowStockRefill: async (params?: {
    stockId?: number;
    itemName?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    data: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> => {
    const response = await api.get('/weighing/low-stock', { params });
    return response.data;
  },

  getByItemcode: async (itemcode: string): Promise<{ success: boolean; data: any }> => {
    const response = await api.get(`/weighing/${encodeURIComponent(itemcode)}`);
    return response.data;
  },

  getDetailsByItemcode: async (itemcode: string, params?: { page?: number; limit?: number }): Promise<{ success: boolean; data: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> => {
    const response = await api.get(`/weighing/${encodeURIComponent(itemcode)}/details`, { params });
    return response.data;
  },

  /** รายการ Detail ตาม Sign: เบิก = '-', เติม = '+' */
  getDetailsBySign: async (params: { sign: '-' | '+'; page?: number; limit?: number; itemName?: string; itemcode?: string; stockId?: number; dateFrom?: string; dateTo?: string }): Promise<{ success: boolean; data: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> => {
    const response = await api.get('/weighing/by-sign', { params: { ...params, sign: params.sign } });
    return response.data;
  },

  /** รายการตู้ที่มีสต๊อก Weighing (สำหรับ dropdown หน้า weighing-departments) */
  getCabinets: async (): Promise<{ success: boolean; data: { id: number; cabinet_name: string | null; cabinet_code: string | null; cabinet_status?: string; stock_id: number | null }[] }> => {
    const response = await api.get('/weighing/cabinets/list');
    return response.data;
  },

  /** กำหนด min/max ต่อตู้ (CabinetItemSetting) — เทียบเท่า PATCH /items/:itemcode/minmax */
  updateMinMax: async (
    itemcode: string,
    data: { stock_min?: number; stock_max?: number },
    cabinetId?: number,
  ): Promise<ApiResponse<Item>> => {
    const code = encodeURIComponent(itemcode);
    const url =
      cabinetId != null ? `/weighing/${code}/minmax?cabinet_id=${cabinetId}` : `/weighing/${code}/minmax`;
    const response = await api.patch(url, data);
    return response.data;
  },
};

export default api;

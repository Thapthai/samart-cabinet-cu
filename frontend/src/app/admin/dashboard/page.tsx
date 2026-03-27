'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { dashboardApi } from '@/lib/dashboardApi';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import {
  DashboardBelowMinTable,
  DashboardExpiryTables,
  DashboardKpiCards,
  DashboardRecentTable,
} from './components';
import type {
  DashboardBelowMinRow,
  DashboardDetailRow,
  DashboardExpiryStockRow,
  DashboardItemStockAlerts,
} from './types';

const emptyItemStockAlerts: DashboardItemStockAlerts = {
  expiredStockCount: 0,
  nearExpireStockCount: 0,
  belowMinCabinetItemPairs: 0,
};

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemStockAlerts, setItemStockAlerts] = useState<DashboardItemStockAlerts>(emptyItemStockAlerts);
  const [recentDispense, setRecentDispense] = useState<DashboardDetailRow[]>([]);
  const [recentRefill, setRecentRefill] = useState<DashboardDetailRow[]>([]);
  const [expiredStockList, setExpiredStockList] = useState<DashboardExpiryStockRow[]>([]);
  const [nearExpireStockList, setNearExpireStockList] = useState<DashboardExpiryStockRow[]>([]);
  const [belowMinStockList, setBelowMinStockList] = useState<DashboardBelowMinRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardApi.getOverview();
      if (res?.success && res.data) {
        setItemStockAlerts(res.data.itemStockAlerts ?? emptyItemStockAlerts);
        setRecentDispense(Array.isArray(res.data.recentDispense) ? res.data.recentDispense : []);
        setRecentRefill(Array.isArray(res.data.recentRefill) ? res.data.recentRefill : []);
        setExpiredStockList(Array.isArray(res.data.expiredStockList) ? res.data.expiredStockList : []);
        setNearExpireStockList(
          Array.isArray(res.data.nearExpireStockList) ? res.data.nearExpireStockList : [],
        );
        setBelowMinStockList(Array.isArray(res.data.belowMinStockList) ? res.data.belowMinStockList : []);
      } else {
        setError('ไม่สามารถโหลดข้อมูลแดชบอร์ดได้');
      }
    } catch (e) {
      console.error(e);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    load();
  }, [user?.id, load]);

  return (
    <ProtectedRoute>
      <AppLayout fullWidth>
        <div className="space-y-6 pb-8">
          <DashboardKpiCards loading={loading} itemStockAlerts={itemStockAlerts} />

          <DashboardExpiryTables
            loading={loading}
            expiredStockList={expiredStockList}
            nearExpireStockList={nearExpireStockList}
          />

          <DashboardBelowMinTable loading={loading} rows={belowMinStockList} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DashboardRecentTable
              title="เบิกล่าสุด"
              titleIcon={ArrowDownCircle}
              iconClassName="h-5 w-5 text-emerald-600"
              moreHref="/admin/weighing-dispense"
              emptyMessage="ไม่มีรายการเบิกล่าสุด"
              loading={loading}
              rows={recentDispense}
            />
            <DashboardRecentTable
              title="เติมล่าสุด"
              titleIcon={ArrowUpCircle}
              iconClassName="h-5 w-5 text-sky-600"
              moreHref="/admin/weighing-refill"
              emptyMessage="ไม่มีรายการเติมล่าสุด"
              loading={loading}
              rows={recentRefill}
            />
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

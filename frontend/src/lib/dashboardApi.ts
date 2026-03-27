import api from './api';
import type { DashboardBelowMinRow, DashboardExpiryStockRow } from '@/app/admin/dashboard/types';

export type DashboardOverviewResponse = {
  success: boolean;
  data: {
    summary: {
      stockSlotsTotal: number;
      cabinetsCount: number;
      mappingsCount: number;
      dispenseLast7Days: number;
      refillLast7Days: number;
    };
    itemStockAlerts: {
      expiredStockCount: number;
      nearExpireStockCount: number;
      belowMinCabinetItemPairs: number;
    };
    expiredStockList: DashboardExpiryStockRow[];
    nearExpireStockList: DashboardExpiryStockRow[];
    belowMinStockList: DashboardBelowMinRow[];
    activityByDay: { date: string; dispense: number; refill: number }[];
    recentDispense: any[];
    recentRefill: any[];
  };
};

export const dashboardApi = {
  getOverview: async (): Promise<DashboardOverviewResponse> => {
    const response = await api.get('/dashboard/overview');
    return response.data;
  },
};

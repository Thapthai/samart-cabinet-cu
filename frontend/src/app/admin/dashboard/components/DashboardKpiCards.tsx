import Link from 'next/link';
import { CalendarClock, CalendarX, Loader2, TrendingDown } from 'lucide-react';
import type { DashboardItemStockAlerts } from '../types';

interface DashboardKpiCardsProps {
  loading: boolean;
  itemStockAlerts: DashboardItemStockAlerts;
}

export function DashboardKpiCards({ loading, itemStockAlerts }: DashboardKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Link
        href="/admin/items"
        className="group rounded-2xl border border-red-100 bg-white p-5 shadow-sm transition hover:border-red-200 hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">อุปกรณ์หมดอายุ</p>
            {loading ? (
              <Loader2 className="mt-3 h-8 w-8 animate-spin text-sky-500" />
            ) : (
              <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
                {itemStockAlerts.expiredStockCount.toLocaleString()}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">จำนวนชิ้นในสต็อกที่หมดอายุแล้ว</p>
          </div>
          <div className="rounded-xl bg-red-100 p-3 text-red-600 transition group-hover:bg-red-200/80">
            <CalendarX className="h-6 w-6" />
          </div>
        </div>
      </Link>

      <Link
        href="/admin/items"
        className="group rounded-2xl border border-amber-100 bg-white p-5 shadow-sm transition hover:border-amber-200 hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">ใกล้หมดอายุ</p>
            {loading ? (
              <Loader2 className="mt-3 h-8 w-8 animate-spin text-sky-500" />
            ) : (
              <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
                {itemStockAlerts.nearExpireStockCount.toLocaleString()}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">ชิ้นในสต็อกที่หมดอายุภายใน 30 วัน (ยังไม่หมดอายุ)</p>
          </div>
          <div className="rounded-xl bg-amber-100 p-3 text-amber-700 transition group-hover:bg-amber-200/80">
            <CalendarClock className="h-6 w-6" />
          </div>
        </div>
      </Link>

      <Link
        href="/admin/items"
        className="group rounded-2xl border border-orange-100 bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">สต็อกต่ำกว่า Min</p>
            {loading ? (
              <Loader2 className="mt-3 h-8 w-8 animate-spin text-sky-500" />
            ) : (
              <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
                {itemStockAlerts.belowMinCabinetItemPairs.toLocaleString()}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              คู่ตู้–รายการที่กำหนด min ใน cabinet item settings แล้วจำนวนชิ้นในตู้ต่ำกว่า min
            </p>
          </div>
          <div className="rounded-xl bg-orange-100 p-3 text-orange-700 transition group-hover:bg-orange-200/80">
            <TrendingDown className="h-6 w-6" />
          </div>
        </div>
      </Link>
    </div>
  );
}

import Link from 'next/link';
import { AlertTriangle, ExternalLink, Loader2, TrendingDown } from 'lucide-react';
import type { DashboardBelowMinRow } from '../types';

interface DashboardBelowMinTableProps {
  loading: boolean;
  rows: DashboardBelowMinRow[];
  stockHref?: string;
}

export function DashboardBelowMinTable({
  loading,
  rows,
  stockHref = '/admin/weighing-stock',
}: DashboardBelowMinTableProps) {
  const count = rows.length;

  return (
    <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold text-slate-900">
            <TrendingDown className="h-5 w-5 flex-shrink-0 text-orange-600" />
            <span className="truncate">สต็อกต่ำกว่าค่า Min</span>
          </h2>
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-orange-800">
            {loading ? '…' : `${count} รายการ`}
          </span>
        </div>
        <Link
          href={stockHref}
          className="inline-flex flex-shrink-0 items-center gap-1 text-sm font-medium text-sky-600 hover:text-sky-700"
        >
          ไปที่สต็อก
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">ไม่มีรายการที่ต่ำกว่า Min</p>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">ชื่ออุปกรณ์</th>
                <th className="min-w-[140px] px-4 py-2.5">ตู้จัดเก็บ</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-right">จำนวนในตู้</th>
                <th className="w-32 px-4 py-2.5 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <tr key={`below-min-${row.settingId}-${row.itemCode}-${index}`} className="hover:bg-sky-50/40">
                  <td className="max-w-[220px] truncate px-4 py-3 font-medium text-slate-900" title={row.itemName}>
                    {row.itemName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.cabinetLabel}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-800">
                    <span className="inline-flex items-center justify-end gap-1.5 font-medium">
                      <span className="inline-flex shrink-0" title="จำนวนต่ำกว่า Min">
                        <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden />
                      </span>
                      {row.currentQty}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-semibold text-orange-800">
                      ต่ำกว่า Min
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

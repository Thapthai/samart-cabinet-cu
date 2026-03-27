import Link from 'next/link';
import { ChevronRight, Loader2, type LucideIcon } from 'lucide-react';
import type { DashboardDetailRow } from '../types';
import { formatActorName, formatDashboardDate, formatItemLabel } from '../utils';

function recentDetailRowKey(row: DashboardDetailRow, index: number) {
  return `${row.id}-${row.StockID}-${row.SlotNo}-${row.Sensor}-${row.itemcode}-${String(row.ModifyDate)}-${index}`;
}

interface DashboardRecentTableProps {
  title: string;
  titleIcon: LucideIcon;
  iconClassName: string;
  moreHref: string;
  emptyMessage: string;
  loading: boolean;
  rows: DashboardDetailRow[];
}

export function DashboardRecentTable({
  title,
  titleIcon: TitleIcon,
  iconClassName,
  moreHref,
  emptyMessage,
  loading,
  rows,
}: DashboardRecentTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <TitleIcon className={iconClassName} />
          {title}
        </h2>
        <Link
          href={moreHref}
          className="inline-flex items-center gap-0.5 text-sm font-medium text-sky-600 hover:text-sky-700"
        >
          ดูทั้งหมด
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">{emptyMessage}</p>
        ) : (
          <table className="w-full min-w-[320px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">รายการ</th>
                <th className="px-4 py-2.5">ผู้ทำรายการ</th>
                <th className="px-4 py-2.5 text-right">จำนวน</th>
                <th className="hidden px-4 py-2.5 sm:table-cell">เวลา</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <tr key={recentDetailRowKey(row, index)} className="hover:bg-sky-50/40">
                  <td className="max-w-[140px] truncate px-4 py-3 font-medium text-slate-900">{formatItemLabel(row)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatActorName(row)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-800">{row.Qty}</td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-xs text-slate-500 sm:table-cell">
                    {formatDashboardDate(row.ModifyDate)}
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

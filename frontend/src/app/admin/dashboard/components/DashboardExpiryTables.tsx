import Link from 'next/link';
import { CalendarClock, ExternalLink, Loader2, XCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardExpiryStockRow } from '../types';

interface ExpiryPanelProps {
  title: string;
  titleIcon: LucideIcon;
  iconClassName: string;
  variant: 'expired' | 'near';
  showStatus?: boolean;
  rows: DashboardExpiryStockRow[];
  loading: boolean;
  emptyMessage: string;
  stockHref: string;
}

function ExpiryPanel({
  title,
  titleIcon: TitleIcon,
  iconClassName,
  variant,
  showStatus = true,
  rows,
  loading,
  emptyMessage,
  stockHref,
}: ExpiryPanelProps) {
  const count = rows.length;
  const isExpired = variant === 'expired';
  const countBadge = isExpired
    ? 'bg-red-100 text-red-700'
    : 'bg-amber-100 text-amber-800';

  return (
    <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold text-slate-900">
            <TitleIcon className={cn('flex-shrink-0', iconClassName)} />
            <span className="truncate">{title}</span>
          </h2>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
              countBadge,
            )}
          >
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
          <p className="py-10 text-center text-sm text-slate-500">{emptyMessage}</p>
        ) : (
          <table className={cn('w-full text-sm', showStatus ? 'min-w-[520px]' : 'min-w-[400px]')}>
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">ชื่ออุปกรณ์</th>
                <th className="whitespace-nowrap px-4 py-2.5">วันหมดอายุ</th>
                <th className="min-w-[140px] px-4 py-2.5">ตู้จัดเก็บ</th>
                {showStatus ? (
                  <th className="w-28 px-4 py-2.5 text-center">สถานะ</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <tr
                  key={`${row.status}-${row.rowId}-${row.itemCode}-${row.expireDate}-${index}`}
                  className="hover:bg-sky-50/40"
                >
                  <td
                    className="max-w-[220px] truncate px-4 py-3 font-medium text-slate-900"
                    title={row.itemName}
                  >
                    {row.itemName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-700">{row.expireDate}</td>
                  <td className="px-4 py-3 text-slate-600">{row.cabinetLabel}</td>
                  {showStatus ? (
                    <td className="px-4 py-3 text-center">
                      {row.status === 'EXPIRED' ? (
                        <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-red-700">
                          EXPIRED
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                          ใกล้หมดอายุ
                        </span>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

interface DashboardExpiryTablesProps {
  loading: boolean;
  expiredStockList: DashboardExpiryStockRow[];
  nearExpireStockList: DashboardExpiryStockRow[];
}

export function DashboardExpiryTables({
  loading,
  expiredStockList,
  nearExpireStockList,
}: DashboardExpiryTablesProps) {
  const stockHref = '/admin/weighing-stock';

  return (
    <div className="flex flex-col gap-6">
      <ExpiryPanel
        title="อุปกรณ์หมดอายุแล้ว"
        titleIcon={XCircle}
        iconClassName="h-5 w-5 text-red-600"
        variant="expired"
        showStatus={false}
        rows={expiredStockList}
        loading={loading}
        emptyMessage="ไม่มีรายการหมดอายุ"
        stockHref={stockHref}
      />
      <ExpiryPanel
        title="ใกล้หมดอายุ (ภายใน 30 วัน)"
        titleIcon={CalendarClock}
        iconClassName="h-5 w-5 text-amber-600"
        variant="near"
        rows={nearExpireStockList}
        loading={loading}
        emptyMessage="ไม่มีรายการใกล้หมดอายุ"
        stockHref={stockHref}
      />
    </div>
  );
}

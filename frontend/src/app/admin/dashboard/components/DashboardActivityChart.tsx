import { Loader2 } from 'lucide-react';
import type { ActivityDay } from '../types';
import { shortDayLabel } from '../utils';

interface DashboardActivityChartProps {
  loading: boolean;
  activityByDay: ActivityDay[];
}

export function DashboardActivityChart({ loading, activityByDay }: DashboardActivityChartProps) {
  const maxStack = Math.max(1, ...activityByDay.map((d) => d.dispense + d.refill));

  return (
    <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm lg:col-span-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">กิจกรรมรายวัน</h2>
          <p className="text-sm text-slate-500">7 วันล่าสุด (ตามเงื่อนไขรายงาน Weighing)</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> เบิก
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-sky-500" /> เติม
          </span>
        </div>
      </div>
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-sky-400" />
        </div>
      ) : (
        <div className="flex h-52 items-end justify-between gap-2 border-b border-slate-100 pb-1 pt-2">
          {activityByDay.map((d) => {
            const hDispense = (d.dispense / maxStack) * 100;
            const hRefill = (d.refill / maxStack) * 100;
            return (
              <div key={d.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="flex h-40 w-full max-w-[3rem] flex-col justify-end gap-0.5 sm:max-w-none">
                  <div
                    className="w-full rounded-t-md bg-emerald-500 transition-all"
                    style={{ height: `${hDispense}%`, minHeight: d.dispense > 0 ? 4 : 0 }}
                    title={`เบิก ${d.dispense}`}
                  />
                  <div
                    className="w-full rounded-b-md bg-sky-500 transition-all"
                    style={{ height: `${hRefill}%`, minHeight: d.refill > 0 ? 4 : 0 }}
                    title={`เติม ${d.refill}`}
                  />
                </div>
                <span className="text-[10px] font-medium text-slate-500 sm:text-xs">{shortDayLabel(d.date)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

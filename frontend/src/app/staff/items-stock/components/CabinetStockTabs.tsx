'use client';

import { cn } from '@/lib/utils';
import { cabinetDepartmentLine } from '../items-stock-shared';

/** สอดคล้อง master `app_cabinets_type` (code, has_expiry, show_rfid_code) */
export interface CabinetTabCabinet {
  id: number;
  cabinet_name?: string | null;
  cabinet_code?: string | null;
  stock_id?: number | null;
  cabinet_type?: string | null;
  cabinetTypeDef?: {
    code: string;
    name_th?: string | null;
    name_en?: string | null;
    has_expiry?: boolean;
    show_rfid_code?: boolean;
    description?: string | null;
  } | null;
  cabinetDepartments?: {
    id: number;
    department_id: number;
    status: string;
    department?: { ID?: number; DepName?: string | null; DepName2?: string | null } | null;
  }[];
}


/** ค่าตรงกับ code ใน master ประเภทตู้ (WEIGHING / RFID) */
export type CabinetStockTableMode = 'WEIGHING' | 'RFID';

export function cabinetStockTableMode(cabinet: CabinetTabCabinet | null): CabinetStockTableMode {
  if (!cabinet) return 'WEIGHING';

  const def = cabinet.cabinetTypeDef;
  if (def?.code) {
    const code = def.code.trim().toUpperCase();
    if (code === 'WEIGHING') return 'WEIGHING';
    if (code === 'RFID') return 'RFID';
    if (def.show_rfid_code === true) return 'RFID';
    return 'WEIGHING';
  }

  const raw = (cabinet.cabinet_type ?? '').toString().trim().toUpperCase();
  if (raw === 'WEIGHING') return 'WEIGHING';
  if (raw === 'RFID') return 'RFID';
  return 'WEIGHING';
}

/** ชิป «หมดอายุ / ใกล้หมดอายุ (30 วัน)» ใช้เฉพาะตู้ประเภท RFID เท่านั้น */
export function cabinetTypeShowsExpiryFilters(cabinet: CabinetTabCabinet | null): boolean {
  return cabinetStockTableMode(cabinet) === 'RFID';
}

/** ตู้แรกที่เลือกอัตโนมัติ: เน้น Weighing ก่อน */
export function pickDefaultCabinet(sorted: CabinetTabCabinet[]): CabinetTabCabinet | null {
  const ws = sorted.filter((c) => c.stock_id != null && Number(c.stock_id) > 0);
  if (ws.length === 0) return null;
  const firstWeighing = ws.find((c) => cabinetStockTableMode(c) === 'WEIGHING');
  return firstWeighing ?? ws[0];
}

interface CabinetStockTabsProps {
  cabinets: CabinetTabCabinet[];
  selectedCabinetId: number | null;
  onSelectCabinet: (cabinet: CabinetTabCabinet) => void;
  loading?: boolean;
}

function typeLabel(c: CabinetTabCabinet): string {
  const code = c.cabinetTypeDef?.code?.trim() || c.cabinet_type?.trim();
  if (code) return code.toUpperCase();
  return 'ตู้';
}

/** ข้อความในป้ายประเภท: ชื่อไทยจาก master ถ้ามี ไม่เช่นนั้นใช้รหัส */
function typeBadgeText(c: CabinetTabCabinet): string {
  const th = c.cabinetTypeDef?.name_th?.trim();
  if (th) return th;
  return typeLabel(c);
}

function cabinetTitle(c: CabinetTabCabinet): string {
  return (c.cabinet_name || c.cabinet_code || `Stock ${c.stock_id ?? ''}`).trim();
}

export default function CabinetStockTabs({
  cabinets,
  selectedCabinetId,
  onSelectCabinet,
  loading,
}: CabinetStockTabsProps) {
  const withStock = cabinets.filter((c) => c.stock_id != null && Number(c.stock_id) > 0);

  if (loading) {
    return (
      <div className="flex min-h-[72px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-gray-500">
        กำลังโหลดรายการตู้...
      </div>
    );
  }

  if (withStock.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
        ไม่พบตู้ที่มี stock_id — ไม่สามารถแสดงการ์ดตู้ได้
      </div>
    );
  }

  return (
    <div className="relative -mx-1">
      <div className="overflow-x-auto overscroll-x-contain pb-1 scrollbar-thin">
        <div className="flex min-w-min gap-3 px-1 pt-0.5">
          {withStock.map((c) => {
            const selected = selectedCabinetId != null && c.id === selectedCabinetId;
            const mode = cabinetStockTableMode(c);
            const depLine = cabinetDepartmentLine(c.cabinetDepartments);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCabinet(c)}
                className={cn(
                  'shrink-0 text-left rounded-xl border px-4 py-3 min-w-[168px] max-w-[260px] transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2',
                  selected
                    ? 'border-blue-500 bg-blue-50 shadow-md ring-1 ring-blue-500/30'
                    : 'border-slate-200/80 bg-white shadow-sm hover:border-slate-300 hover:bg-slate-50',
                )}
              >
                <span
                  className={cn(
                    'inline-flex max-w-full items-center rounded-md border px-2 py-0.5 text-[10px] font-bold leading-tight tracking-wide',
                    mode === 'RFID'
                      ? selected
                        ? 'border-violet-400 bg-violet-100/90 text-violet-900'
                        : 'border-violet-300/90 bg-violet-50 text-violet-900'
                      : selected
                        ? 'border-amber-400 bg-amber-100/80 text-amber-950'
                        : 'border-amber-300/90 bg-amber-50 text-amber-950',
                  )}
                  title={typeLabel(c)}
                >
                  <span className="min-w-0 truncate">{typeBadgeText(c)}</span>
                </span>
                <p className="mt-2 truncate text-sm font-semibold text-gray-900" title={cabinetTitle(c)}>
                  {cabinetTitle(c)}
                </p>
                <p className="mt-1 truncate text-xs text-gray-500" title={depLine}>
                  {depLine}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

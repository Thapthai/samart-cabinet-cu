'use client';

import { Check } from 'lucide-react';
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

function typeBadgeClass(mode: CabinetStockTableMode, selected: boolean) {
  if (mode === 'RFID') {
    return selected
      ? 'border-violet-400 bg-violet-100/90 text-violet-900'
      : 'border-violet-300/90 bg-violet-50 text-violet-900';
  }
  return selected
    ? 'border-amber-400 bg-amber-100/80 text-amber-950'
    : 'border-amber-300/90 bg-amber-50 text-amber-950';
}

function CabinetTypeBadge({
  cabinet,
  selected,
  compact,
}: {
  cabinet: CabinetTabCabinet;
  selected: boolean;
  compact?: boolean;
}) {
  const mode = cabinetStockTableMode(cabinet);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md border font-bold leading-tight tracking-wide',
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[10px]',
        typeBadgeClass(mode, selected),
      )}
      title={typeLabel(cabinet)}
    >
      <span className="min-w-0 truncate">{typeBadgeText(cabinet)}</span>
    </span>
  );
}

function CabinetTabButton({
  cabinet,
  selected,
  onSelect,
  variant,
}: {
  cabinet: CabinetTabCabinet;
  selected: boolean;
  onSelect: () => void;
  variant: 'mobile' | 'desktop';
}) {
  const depLine = cabinetDepartmentLine(cabinet.cabinetDepartments);
  const title = cabinetTitle(cabinet);

  if (variant === 'mobile') {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2',
          selected
            ? 'border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-500/25'
            : 'border-slate-200/90 bg-white shadow-sm active:bg-slate-50',
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <CabinetTypeBadge cabinet={cabinet} selected={selected} compact />
            <p className="min-w-0 truncate text-sm font-semibold text-gray-900" title={title}>
              {title}
            </p>
          </div>
          {depLine ? (
            <p className="mt-0.5 truncate text-xs text-gray-500" title={depLine}>
              {depLine}
            </p>
          ) : null}
        </div>
        {selected ? (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
            <Check className="size-3.5" strokeWidth={3} />
          </span>
        ) : (
          <span className="size-6 shrink-0 rounded-full border border-slate-200/90 bg-slate-50" aria-hidden />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'shrink-0 text-left rounded-xl border px-4 py-3 min-w-[168px] max-w-[260px] transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2',
        selected
          ? 'border-blue-500 bg-blue-50 shadow-md ring-1 ring-blue-500/30'
          : 'border-slate-200/80 bg-white shadow-sm hover:border-slate-300 hover:bg-slate-50',
      )}
    >
      <CabinetTypeBadge cabinet={cabinet} selected={selected} />
      <p className="mt-2 truncate text-sm font-semibold text-gray-900" title={title}>
        {title}
      </p>
      <p className="mt-1 truncate text-xs text-gray-500" title={depLine}>
        {depLine}
      </p>
    </button>
  );
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
      <div className="flex min-h-[72px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-sm text-gray-500 md:py-6">
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
    <>
      {/* มือถือ — รายการแนวตั้งเต็มความกว้าง */}
      <div className="space-y-2 px-1 py-2 md:hidden">
        <p className="px-1 text-xs font-medium text-muted-foreground">เลือกตู้</p>
        <div className="space-y-2">
          {withStock.map((c) => (
            <CabinetTabButton
              key={c.id}
              cabinet={c}
              selected={selectedCabinetId != null && c.id === selectedCabinetId}
              onSelect={() => onSelectCabinet(c)}
              variant="mobile"
            />
          ))}
        </div>
      </div>

      {/* Desktop — เลื่อนแนวนอน */}
      <div className="relative -mx-1 hidden md:block">
        <div className="overflow-x-auto overscroll-x-contain pb-1 scrollbar-thin">
          <div className="flex min-w-min gap-3 px-1 pt-0.5">
            {withStock.map((c) => (
              <CabinetTabButton
                key={c.id}
                cabinet={c}
                selected={selectedCabinetId != null && c.id === selectedCabinetId}
                onSelect={() => onSelectCabinet(c)}
                variant="desktop"
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

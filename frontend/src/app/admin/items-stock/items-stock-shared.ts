export interface ItemSlotInCabinetRow {
  id: number;
  itemcode: string;
  StockID: number;
  SlotNo: number;
  Sensor: number;
  Qty: number;
  nearestExpireDate?: string | Date | null;
  cabinet?: { id: number; cabinet_name: string | null; cabinet_code: string | null; stock_id: number | null } | null;
  item?: {
    itemcode: string;
    itemname: string | null;
    Alternatename: string | null;
    Barcode: string | null;
    stock_min?: number | null;
    stock_max?: number | null;
  } | null;
  cabinetItemSetting?: { stock_min: number | null; stock_max: number | null } | null;
  _count?: { itemSlotInCabinetDetail: number };
}

export type RfidStockLine = { rowId: number; rfidCode: string; expireDate: string | Date | null };

export type StockStatusFilter = 'all' | 'expired' | 'soon' | 'low';

export const NEAR_EXPIRY_DAYS = 30;

/** กรอบรอบตาราง — ให้สอดคล้องการ์ดหน้า items (slate border) */
export const STOCK_TABLE_FRAME =
  'rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden';

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

type StockExpireFields = {
  ExpireDate?: string | Date | null;
  expDate?: string | Date | null;
  RfidCode?: string | null;
};

/**
 * วันหมดอายุที่เร็วที่สุดตามปฏิทิน (เทียบ startOfDay ก่อน แล้วค่อยเวลาในวันเดียวกัน)
 * รองรับทั้ง ExpireDate และ expDate — ใช้คอลัมน์วันหมดอายุในตาราง RFID ให้ตรงกับ rowFlags / ชิปกรอง
 */
export function earliestExpireRawFromStocks(
  stocks: StockExpireFields[] | undefined | null,
  options?: { rfidOnly?: boolean },
): string | Date | null {
  const list = stocks ?? [];
  const rfidOnly = options?.rfidOnly ?? false;
  let bestRaw: string | Date | null = null;
  let bestDayMs = Infinity;
  let bestTimeMs = Infinity;
  for (const s of list) {
    if (rfidOnly && String(s.RfidCode ?? '').trim() === '') continue;
    const raw = s.ExpireDate ?? s.expDate ?? null;
    if (raw == null || (typeof raw === 'string' && raw.trim() === '')) continue;
    const d = typeof raw === 'string' ? new Date(raw) : new Date(raw as Date);
    if (Number.isNaN(d.getTime())) continue;
    const dayMs = startOfDay(d).getTime();
    const timeMs = d.getTime();
    if (dayMs < bestDayMs || (dayMs === bestDayMs && timeMs < bestTimeMs)) {
      bestDayMs = dayMs;
      bestTimeMs = timeMs;
      bestRaw = raw;
    }
  }
  return bestRaw;
}

export function formatYmd(value: string | Date | null | undefined): string {
  if (value == null) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** จำนวนวันเต็มระหว่างวันนี้กับวันหมดอายุ (ตามปฏิทิน) — บวก = ยังเหลือ, ลบ = เกินแล้ว */
export function expireDayDeltaFromToday(value: string | Date | null | undefined): number | null {
  if (value == null) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  const today = startOfDay(new Date());
  const ed = startOfDay(d);
  return Math.round((ed.getTime() - today.getTime()) / 86_400_000);
}

/** ข้อความสั้น ๆ นับจากวันนี้ — ใช้คู่กับ formatYmd */
export function formatExpireRelativeLabel(value: string | Date | null | undefined): string | null {
  const n = expireDayDeltaFromToday(value);
  if (n == null) return null;
  if (n > 0) return `อีก ${n} วัน`;
  if (n === 0) return 'วันนี้';
  return `เกิน ${-n} วัน`;
}

const YMD_STRICT = /^(\d{4})-(\d{2})-(\d{2})$/;

/** จำนวนวันเต็มจากวันที่ YYYY-MM-DD ถึงวันนี้ (บวก = วันนี้อยู่หลังวันนั้น, ลบ = วันนี้อยู่ก่อน) */
export function calendarDaysFromYmdToToday(ymd: string): number | null {
  const t = (ymd ?? '').trim();
  const m = YMD_STRICT.exec(t);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  const from = startOfDay(d);
  const today = startOfDay(new Date());
  return Math.round((today.getTime() - from.getTime()) / 86_400_000);
}

/** คำอธิบายจำนวนวันนับจากวันที่เลือกถึงวันนี้ — ใช้ใต้ช่องกรองวันที่ */
export function formatDaysFromSelectedYmdToTodayHint(ymd: string): string | null {
  const n = calendarDaysFromYmdToToday(ymd);
  if (n == null) return null;
  if (n === 0) return 'นับจากวันที่เลือกถึงวันนี้: 0 วัน (วันเดียวกัน)';
  if (n > 0) return `นับจากวันที่เลือกถึงวันนี้: ${n} วัน`;
  return `วันนี้อยู่ก่อนวันที่เลือกอีก ${-n} วัน`;
}

/** วันนี้ (เริ่มวัน) + offset วันตามปฏิทินเครื่อง → YYYY-MM-DD */
export function ymdFromTodayOffset(offsetDays: number): string | null {
  if (!Number.isFinite(offsetDays)) return null;
  const d = startOfDay(new Date());
  d.setDate(d.getDate() + Math.trunc(offsetDays));
  return formatYmd(d);
}

/** คำใต้ช่อง «อีกกี่วัน» — อธิบายเงื่อนไข <= n วันจากวันนี้ */
export function hintForExpireAfterDaysInput(daysStr: string): string | null {
  const t = (daysStr ?? '').trim();
  if (!t || !/^\d+$/.test(t)) return null;
  const n = parseInt(t, 10);
  if (!Number.isFinite(n)) return null;
  const toYmd = ymdFromTodayOffset(n);
  if (!toYmd) return null;
  // return `แสดงเฉพาะรายการที่วันหมดเร็วสุดภายใน ${n} วันจากวันนี้ (<= ${toYmd})`;
  return null;
}

/**
 * แปลงค่าช่อง «อีกกี่วัน» เป็นช่วงวันที่สำหรับ API:
 * - expire_to = วันนี้ + n (ต้อง <= วันนี้+n)
 * - expire_from = เมื่อวาน (เพื่อบังคับให้เหลือเฉพาะวันนี้เป็นต้นไป, ตัดที่หมดไปแล้วออก)
 */
export function expireRangeQueryFromAfterDaysField(daysField: string): {
  expire_from?: string;
  expire_to?: string;
} {
  const t = (daysField ?? '').trim();
  if (!t || !/^\d+$/.test(t)) return {};
  const n = parseInt(t, 10);
  if (!Number.isFinite(n)) return {};
  const expire_to = ymdFromTodayOffset(n) ?? undefined;
  const expire_from = ymdFromTodayOffset(-1) ?? undefined;
  return { expire_from, expire_to };
}

/** สล็อต 1 = ใน, 2 = นอก */
export function formatSlotDisplay(value: number | null | undefined): string {
  return value === 1 ? 'ใน' : value === 2 ? 'นอก' : value != null ? String(value) : '—';
}

export function rfidCacheKey(row: ItemSlotInCabinetRow): string {
  return `${row.itemcode}:${row.StockID}`;
}

/** id สำหรับแถวสรุป RFID ที่รวมจาก item_counts (ไม่มี RowID ของสล็อต) */
export function stableRfidSummaryRowId(stockId: number, itemcode: string): number {
  let h = 0;
  for (let i = 0; i < itemcode.length; i++) h = (Math.imul(31, h) + itemcode.charCodeAt(i)) | 0;
  const positive = Math.abs(h) % 900_000;
  return stockId * 1_000_000 + positive;
}

export function effectiveMin(row: ItemSlotInCabinetRow) {
  return row.cabinetItemSetting?.stock_min ?? row.item?.stock_min;
}

export function effectiveMax(row: ItemSlotInCabinetRow) {
  return row.cabinetItemSetting?.stock_max ?? row.item?.stock_max;
}

export function formatMinMax(v: number | null | undefined) {
  return v != null && v !== undefined ? String(v) : '—';
}

export function rowFlags(row: ItemSlotInCabinetRow) {
  const min = effectiveMin(row);
  const qty = row.Qty ?? 0;
  const expRaw = row.nearestExpireDate;
  const exp = expRaw != null ? new Date(expRaw as string) : null;
  const today = startOfDay(new Date());
  let expired = false;
  let soon = false;
  if (exp && !Number.isNaN(exp.getTime())) {
    const ed = startOfDay(exp);
    expired = ed < today;
    if (!expired) {
      const limit = new Date(today);
      limit.setDate(limit.getDate() + NEAR_EXPIRY_DAYS);
      soon = ed <= limit;
    }
  }
  const low = min != null && qty < min;
  return { expired, soon, low };
}

export function rowBadge(row: ItemSlotInCabinetRow): {
  key: 'EXPIRED' | 'SOON' | 'LOW' | 'OK';
  className: string;
} {
  const { expired, soon, low } = rowFlags(row);
  if (expired) return { key: 'EXPIRED', className: 'bg-red-100 text-red-800 border-red-200' };
  if (soon) return { key: 'SOON', className: 'bg-amber-100 text-amber-900 border-amber-200' };
  if (low) return { key: 'LOW', className: 'bg-orange-100 text-orange-900 border-orange-200' };
  return { key: 'OK', className: 'bg-emerald-100 text-emerald-900 border-emerald-200' };
}

export function rfidLineBadge(expireRaw: string | Date | null | undefined): {
  key: 'EXPIRED' | 'SOON' | 'OK';
  className: string;
} {
  const exp = expireRaw != null ? new Date(expireRaw as string) : null;
  const today = startOfDay(new Date());
  if (exp && !Number.isNaN(exp.getTime())) {
    const ed = startOfDay(exp);
    if (ed < today) return { key: 'EXPIRED', className: 'bg-red-100 text-red-800 border-red-200' };
    const limit = new Date(today);
    limit.setDate(limit.getDate() + NEAR_EXPIRY_DAYS);
    if (ed <= limit) return { key: 'SOON', className: 'bg-amber-100 text-amber-900 border-amber-200' };
  }
  return { key: 'OK', className: 'bg-emerald-100 text-emerald-900 border-emerald-200' };
}

export function matchesStatusChip(row: ItemSlotInCabinetRow, chip: StockStatusFilter): boolean {
  if (chip === 'all') return true;
  const { expired, soon, low } = rowFlags(row);
  if (chip === 'expired') return expired;
  if (chip === 'soon') return soon && !expired;
  if (chip === 'low') return low;
  return true;
}

/** แสดงชื่อแผนกจากความสัมพันธ์แรกของตู้ (รองรับข้อมูลจาก GET /cabinets ที่ include department) */
export function cabinetDepartmentLine(
  departments?:
    | Array<{
        department_id?: number | null;
        department?: { DepName?: string | null; DepName2?: string | null } | null;
      }>
    | undefined,
): string {
  const first = departments?.[0];
  if (!first) return '—';
  const name = first.department?.DepName?.trim() || first.department?.DepName2?.trim();
  if (name) return name;
  if (first.department_id != null) return `แผนก #${first.department_id}`;
  return '—';
}

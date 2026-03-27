import type { DashboardDetailRow } from './types';

export function formatDashboardDate(d: string) {
  if (!d) return '-';
  const date = new Date(d);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

export function shortDayLabel(isoDate: string) {
  const [, m, d] = isoDate.split('-');
  return d && m ? `${d}/${m}` : isoDate;
}

export function formatItemLabel(row: DashboardDetailRow) {
  return row.item?.itemname || row.item?.Alternatename || row.itemcode || '-';
}

export function formatActorName(row: DashboardDetailRow) {
  const emp = row.userCabinet?.legacyUser?.employee;
  if (!emp) return '-';
  return [emp.FirstName, emp.LastName].filter(Boolean).join(' ') || '-';
}

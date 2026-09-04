import { MAX_TOTAL_LABELS } from './constants';

export function clampCopies(raw: number, maxCap: number): number {
  const cap = Math.max(0, Math.floor(maxCap));
  if (cap <= 0) return 0;
  if (!Number.isFinite(raw)) return 1;
  return Math.min(cap, Math.max(1, Math.floor(raw)));
}

export function resolveCopies(raw: number | '', maxCap: number): number {
  if (raw === '') return 0;
  return clampCopies(raw, maxCap);
}

export function parseCopiesInput(raw: string): number | '' {
  const v = raw.trim();
  if (v === '') return '';
  const n = parseInt(v, 10);
  if (!Number.isFinite(n) || n <= 0) return '';
  return n;
}

export function hasExpireDate(ymd: string | null | undefined): boolean {
  return (ymd ?? '').trim().length > 0;
}

export function maxCopiesPerItem(): number {
  return MAX_TOTAL_LABELS;
}

export function generatePageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  const pages: (number | string)[] = [];
  const maxVisible = 5;
  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else if (currentPage <= 3) {
    for (let i = 1; i <= 4; i++) pages.push(i);
    pages.push('...');
    pages.push(totalPages);
  } else if (currentPage >= totalPages - 2) {
    pages.push(1);
    pages.push('...');
    for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    pages.push('...');
    for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
    pages.push('...');
    pages.push(totalPages);
  }
  return pages;
}

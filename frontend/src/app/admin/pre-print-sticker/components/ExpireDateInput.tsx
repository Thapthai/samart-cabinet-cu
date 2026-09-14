'use client';

export { ExpireDateInput } from '@/components/ExpireDateInput';

export function ItemLabel({ itemcode, itemname }: { itemcode: string; itemname?: string | null }) {
  return (
    <>
      <p className="font-medium leading-snug text-slate-800">{itemname?.trim() || '—'}</p>
      <p className="mt-0.5 font-mono text-xs text-muted-foreground">{itemcode}</p>
    </>
  );
}

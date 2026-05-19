'use client';

import { formatSlotDisplay } from '../items-stock-shared';
import { cn } from '@/lib/utils';

const pillBase =
  'inline-flex min-w-[2.75rem] items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold shadow-sm ring-1 ring-inset';

/** ป้าย ใน = เขียว, นอก = ฟ้า — สีจาก globals (โทนกลมกลืนธีมชมพู) */
export function WeighingSlotPill({ sensor }: { sensor: number | null | undefined }) {
  const label = formatSlotDisplay(sensor);
  if (label === 'ใน') {
    return (
      <span
        className={cn(
          pillBase,
          'bg-[var(--slot-in-bg)] text-[var(--slot-in-fg)] ring-primary/15 dark:ring-primary/25',
        )}
      >
        ใน
      </span>
    );
  }
  if (label === 'นอก') {
    return (
      <span
        className={cn(
          pillBase,
          'bg-[var(--slot-out-bg)] text-[var(--slot-out-fg)] ring-primary/15 dark:ring-primary/25',
        )}
      >
        นอก
      </span>
    );
  }
  return <span className="tabular-nums text-muted-foreground">{label}</span>;
}

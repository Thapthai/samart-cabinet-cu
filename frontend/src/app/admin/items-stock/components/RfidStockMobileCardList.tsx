'use client';

import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ItemSlotInCabinetRow, StockStatusFilter } from '../items-stock-shared';
import {
  formatExpireRelativeLabel,
  formatYmd,
  itemsStockStatusKeyLabelTh,
  rowBadge,
  rowFlags,
} from '../items-stock-shared';
import {
  StockMobileCard,
  StockMobileCardHeader,
  StockMobileCardList,
  StockMobileCardMeta,
  StockMobileCardQty,
  StockMobileCardRow,
} from './ItemsStockMobileCards';

export interface RfidStockMobileCardListProps {
  pageRows: ItemSlotInCabinetRow[];
  currentPage: number;
  itemsPerPage: number;
  statusFilter: StockStatusFilter;
  onManage?: (row: ItemSlotInCabinetRow) => void;
  showSequence?: boolean;
}

export default function RfidStockMobileCardList({
  pageRows,
  currentPage,
  itemsPerPage,
  statusFilter,
  onManage,
  showSequence = false,
}: RfidStockMobileCardListProps) {
  return (
    <StockMobileCardList>
      {pageRows.map((row, index) => {
        const name = row.item?.itemname || row.item?.Alternatename || '—';
        const { expired, soon, low } = rowFlags(row);
        const expireRel = formatExpireRelativeLabel(row.nearestExpireDate);
        const badge = rowBadge(row);
        const expireText = formatYmd(row.nearestExpireDate);
        const expireClass = expired
          ? 'text-red-600 font-medium'
          : soon
            ? 'text-amber-700 font-medium'
            : undefined;
        const seq = showSequence ? (currentPage - 1) * itemsPerPage + index + 1 : undefined;
        const accent =
          statusFilter === 'all' ? (expired ? 'expired' : soon ? 'soon' : 'default') : 'default';

        return (
          <StockMobileCard key={row.id} accent={accent}>
            <StockMobileCardRow>
              <div className="min-w-0 flex-1">
                <StockMobileCardHeader
                  seq={seq}
                  title={name}
                  badge={
                    <span
                      className={cn(
                        'inline-flex items-center justify-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold',
                        badge.className,
                      )}
                    >
                      {itemsStockStatusKeyLabelTh(badge.key)}
                    </span>
                  }
                  actions={
                    onManage ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                        disabled={!row.cabinet?.id}
                        onClick={() => onManage(row)}
                        title={!row.cabinet?.id ? 'ไม่มีข้อมูลตู้' : 'ตั้งค่า Min/Max ต่อตู้'}
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : null
                  }
                />
                <StockMobileCardMeta className={expireClass}>
                  หมดอายุ {expireText}
                  {expireRel ? ` · ${expireRel}` : ''}
                </StockMobileCardMeta>
              </div>
              <StockMobileCardQty label="คงเหลือ" value={row.Qty} low={low} />
            </StockMobileCardRow>
          </StockMobileCard>
        );
      })}
    </StockMobileCardList>
  );
}

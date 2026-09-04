'use client';

import { Fragment, useMemo, useState } from 'react';
import { PackagePlus, Plus } from 'lucide-react';
import type { Item } from '@/types/item';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { generatePageNumbers, hasExpireDate, parseCopiesInput } from '../utils';
import type { ItemDraft, SelectedLine } from '../types';
import { DEFAULT_ITEM_DRAFT } from '../types';
import PrePrintSubLineRow from './PrePrintSubLineRow';
import { ExpireDateInput, ItemLabel } from './ExpireDateInput';
import { CreatePrePrintItemDialog } from './CreatePrePrintItemDialog';

type PrePrintItemListCardProps = {
  items: Item[];
  loadingList: boolean;
  total: number;
  page: number;
  totalPages: number;
  keywordInput: string;
  onKeywordInputChange: (value: string) => void;
  onPageChange: (nextPage: number) => void;
  getItemDraft: (itemcode: string) => ItemDraft;
  onDraftExpireChange: (itemcode: string, ymd: string) => void;
  onDraftCopiesChange: (itemcode: string, raw: number | '') => void;
  onAddSubLine: (row: Item) => void;
  pendingLines: SelectedLine[];
  onSetCopies: (lineId: string, raw: number | '') => void;
  onExpireDateChange: (lineId: string, ymd: string) => void;
  onRemoveLine: (lineId: string) => void;
  onClearPending: () => void;
  stagedSummary: { rows: number; sheets: number };
  canPrepare: boolean;
  onPrepare: () => void;
  onItemCreated: () => void;
};

function needsExpireWarning(copies: number | '', expireDate: string): boolean {
  if (copies === '') return false;
  return !hasExpireDate(expireDate);
}

function DraftControls({
  row,
  draft,
  onDraftExpireChange,
  onDraftCopiesChange,
  onAddSubLine,
  expireError,
  compact,
}: {
  row: Item;
  draft: ItemDraft;
  onDraftExpireChange: (itemcode: string, ymd: string) => void;
  onDraftCopiesChange: (itemcode: string, raw: number | '') => void;
  onAddSubLine: (row: Item) => void;
  expireError: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-end gap-2 rounded-md p-1.5 -m-1.5 transition-colors',
        expireError && 'ring-2 ring-red-500 bg-red-50/60',
        compact ? 'w-full' : '',
      )}
    >
      <div className={cn('min-w-0', compact ? 'grow basis-[9rem]' : 'min-w-[8.5rem]')}>
        <label
          htmlFor={`draft-expire-${row.itemcode}`}
          className={cn(
            'mb-1 block text-[11px] font-medium md:hidden',
            expireError ? 'text-red-600' : 'text-muted-foreground',
          )}
        >
          วันหมดอายุ
        </label>
        <ExpireDateInput
          id={`draft-expire-${row.itemcode}`}
          value={draft.expireDate}
          onChange={(v) => onDraftExpireChange(row.itemcode, v)}
          className={expireError ? 'border-red-500' : ''}
        />
      </div>
      <div className="w-[4.5rem] shrink-0">
        <label
          htmlFor={`draft-copies-${row.itemcode}`}
          className="mb-1 block text-[11px] font-medium text-muted-foreground md:hidden"
        >
          จำนวน
        </label>
        <Input
          id={`draft-copies-${row.itemcode}`}
          type="text"
          inputMode="numeric"
          className="h-8 w-full bg-white text-center font-mono text-sm"
          value={draft.copies === '' ? '' : draft.copies}
          onChange={(e) => onDraftCopiesChange(row.itemcode, parseCopiesInput(e.target.value))}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        aria-label={`เพิ่ม lot ${row.itemcode}`}
        onClick={() => onAddSubLine(row)}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function PrePrintItemListCard({
  items,
  loadingList,
  total,
  page,
  totalPages,
  keywordInput,
  onKeywordInputChange,
  onPageChange,
  getItemDraft,
  onDraftExpireChange,
  onDraftCopiesChange,
  onAddSubLine,
  pendingLines,
  onSetCopies,
  onExpireDateChange,
  onRemoveLine,
  onClearPending,
  stagedSummary,
  canPrepare,
  onPrepare,
  onItemCreated,
}: PrePrintItemListCardProps) {
  const [createOpen, setCreateOpen] = useState(false);

  const pendingByItem = useMemo(() => {
    const map = new Map<string, SelectedLine[]>();
    for (const line of pendingLines) {
      const list = map.get(line.itemcode) ?? [];
      list.push(line);
      map.set(line.itemcode, list);
    }
    return map;
  }, [pendingLines]);

  return (
    <Card className="min-w-0 overflow-hidden border-slate-200 shadow-sm">
      <CardHeader className="space-y-3 p-4 pb-3 sm:p-6 sm:pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-base sm:text-lg">รายการอุปกรณ์</CardTitle>
            <CardDescription className="mt-0.5 text-xs sm:text-sm">
              {loadingList && items.length === 0
                ? 'กำลังโหลด…'
                : `แสดง ${items.length} จาก ${total} รายการ · กรอกจำนวน/วันหมดอายุ → + เพิ่ม lot`}
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {pendingLines.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs sm:text-sm"
                onClick={onClearPending}
              >
                ล้าง lot เพิ่ม ({pendingLines.length})
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-2 text-xs sm:text-sm"
              onClick={() => setCreateOpen(true)}
            >
              <PackagePlus className="h-4 w-4" />
              เพิ่มอุปกรณ์
            </Button>
          </div>
        </div>
        <Input
          placeholder="ค้นหา itemcode / ชื่อ"
          value={keywordInput}
          onChange={(e) => onKeywordInputChange(e.target.value)}
          className="min-h-10 bg-white shadow-sm"
        />
      </CardHeader>

      <CreatePrePrintItemDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={onItemCreated}
      />

      <CardContent className="min-h-0 space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
        <div className="max-h-[min(58vh,calc(100dvh-16rem))] space-y-2 overflow-y-auto overscroll-contain md:hidden">
          {loadingList ? (
            <p className="rounded-lg border border-dashed py-10 text-center text-sm text-slate-500">
              กำลังโหลด…
            </p>
          ) : items.length === 0 ? (
            <p className="rounded-lg border border-dashed py-10 text-center text-sm text-slate-500">
              ไม่มีรายการ
            </p>
          ) : (
            items.map((row) => {
              const draft = getItemDraft(row.itemcode) ?? DEFAULT_ITEM_DRAFT;
              const itemPending = pendingByItem.get(row.itemcode) ?? [];
              const expireError = needsExpireWarning(draft.copies, draft.expireDate);
              const active = draft.copies !== '' || itemPending.length > 0;

              return (
                <div
                  key={row.itemcode}
                  className={cn(
                    'rounded-xl border bg-white p-3 transition-colors',
                    expireError
                      ? 'border-red-400'
                      : active
                        ? 'border-violet-200 bg-violet-50/80'
                        : 'border-slate-200',
                  )}
                >
                  <div className="min-w-0 text-sm">
                    <ItemLabel itemcode={row.itemcode} itemname={row.itemname} />
                  </div>
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <DraftControls
                      row={row}
                      draft={draft}
                      onDraftExpireChange={onDraftExpireChange}
                      onDraftCopiesChange={onDraftCopiesChange}
                      onAddSubLine={onAddSubLine}
                      expireError={expireError}
                      compact
                    />
                  </div>
                  {itemPending.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {itemPending.map((line) => (
                        <PrePrintSubLineRow
                          key={line.lineId}
                          line={line}
                          idPrefix="pending-m"
                          variant="stack"
                          expireError={needsExpireWarning(line.copies, line.expireDate)}
                          onSetCopies={onSetCopies}
                          onExpireDateChange={onExpireDateChange}
                          onRemoveLine={onRemoveLine}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="hidden max-h-[min(70vh,calc(100dvh-15rem))] overflow-auto rounded-md border md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px] pl-3">ชื่ออุปกรณ์</TableHead>
                <TableHead className="w-[168px]">วันหมดอายุ</TableHead>
                <TableHead className="w-[88px] text-center">จำนวน</TableHead>
                <TableHead className="w-12 text-center" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingList ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-slate-500">
                    กำลังโหลด…
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-slate-500">
                    ไม่มีรายการ
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => {
                  const draft = getItemDraft(row.itemcode) ?? DEFAULT_ITEM_DRAFT;
                  const itemPending = pendingByItem.get(row.itemcode) ?? [];
                  const expireError = needsExpireWarning(draft.copies, draft.expireDate);

                  return (
                    <Fragment key={row.itemcode}>
                      <TableRow
                        className={cn(
                          expireError && 'bg-red-50/70',
                          !expireError && draft.copies !== '' && 'bg-violet-50/90',
                        )}
                      >
                        <TableCell className="min-w-0 py-2 pl-3 text-sm align-middle">
                          <ItemLabel itemcode={row.itemcode} itemname={row.itemname} />
                        </TableCell>
                        <TableCell className="py-2 align-middle">
                          <div
                            className={cn(
                              'flex min-w-[8.5rem] items-center rounded-md p-0.5',
                              expireError && 'ring-2 ring-red-500 bg-red-50/80 [&_input]:border-red-500',
                            )}
                          >
                            <ExpireDateInput
                              id={`draft-expire-d-${row.itemcode}`}
                              value={draft.expireDate}
                              onChange={(v) => onDraftExpireChange(row.itemcode, v)}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-center align-middle">
                          <Input
                            type="text"
                            inputMode="numeric"
                            className="mx-auto h-8 w-16 bg-white text-center font-mono text-sm"
                            value={draft.copies === '' ? '' : draft.copies}
                            onChange={(e) =>
                              onDraftCopiesChange(row.itemcode, parseCopiesInput(e.target.value))
                            }
                          />
                        </TableCell>
                        <TableCell className="py-2 text-center align-middle">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            aria-label={`เพิ่ม lot ${row.itemcode}`}
                            onClick={() => onAddSubLine(row)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {itemPending.map((line) => (
                        <PrePrintSubLineRow
                          key={line.lineId}
                          line={line}
                          idPrefix="pending"
                          expireError={needsExpireWarning(line.copies, line.expireDate)}
                          onSetCopies={onSetCopies}
                          onExpireDateChange={onExpireDateChange}
                          onRemoveLine={onRemoveLine}
                        />
                      ))}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground sm:text-sm">
              หน้า {page} จาก {totalPages} ({total} รายการ)
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1 || loadingList}
              >
                ก่อนหน้า
              </Button>
              {generatePageNumbers(page, totalPages).map((pNum, idx) =>
                pNum === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground">
                    ...
                  </span>
                ) : (
                  <Button
                    key={pNum}
                    type="button"
                    variant={page === pNum ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 min-w-8"
                    onClick={() => onPageChange(pNum as number)}
                    disabled={loadingList}
                  >
                    {pNum}
                  </Button>
                ),
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages || loadingList}
              >
                ถัดไป
              </Button>
            </div>
          </div>
        )}

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:static sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:bg-transparent sm:px-0 sm:py-0 sm:pt-3 sm:backdrop-blur-none">
          {stagedSummary.rows > 0 ? (
            <p className="text-xs text-muted-foreground sm:text-sm">
              รอเตรียม {stagedSummary.rows} lot · รวม {stagedSummary.sheets} แผ่น
            </p>
          ) : (
            <span className="hidden sm:block" />
          )}
          <Button
            type="button"
            className="w-full min-w-[8rem] sm:w-auto"
            onClick={onPrepare}
            disabled={!canPrepare}
          >
            เตรียมพิมพ์
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

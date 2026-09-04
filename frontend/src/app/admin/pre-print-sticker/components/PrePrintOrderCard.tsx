'use client';

import { Fragment, useMemo } from 'react';
import { Minus } from 'lucide-react';
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
import type { SelectedLine } from '../types';
import { resolveCopies, hasExpireDate, parseCopiesInput } from '../utils';
import { cn } from '@/lib/utils';
import { ExpireDateInput, ItemLabel } from './ExpireDateInput';

type PrePrintOrderCardProps = {
  preparedLines: SelectedLine[];
  emptyHint?: string;
  onSetCopies: (lineId: string, raw: number | '') => void;
  onExpireDateChange: (lineId: string, ymd: string) => void;
  onRemoveLine: (lineId: string) => void;
  onClearAll: () => void;
  saving: boolean;
  onSaveDocument: () => void | Promise<void>;
};

function QtyInput({
  line,
  onSetCopies,
}: {
  line: SelectedLine;
  onSetCopies: (lineId: string, raw: number | '') => void;
}) {
  const inputDisabled = line.refillCap <= 0;
  return (
    <Input
      type="text"
      inputMode="numeric"
      className="h-8 w-16 bg-white text-center font-mono text-sm"
      value={line.refillCap <= 0 ? '' : line.copies === '' ? '' : line.copies}
      disabled={inputDisabled}
      onChange={(e) => onSetCopies(line.lineId, parseCopiesInput(e.target.value))}
    />
  );
}

function LotControls({
  line,
  onSetCopies,
  onExpireDateChange,
  onRemoveLine,
  showLabels,
}: {
  line: SelectedLine;
  onSetCopies: (lineId: string, raw: number | '') => void;
  onExpireDateChange: (lineId: string, ymd: string) => void;
  onRemoveLine: (lineId: string) => void;
  showLabels?: boolean;
}) {
  const expireError = line.copies !== '' && !hasExpireDate(line.expireDate);

  return (
    <div
      className={cn(
        'flex flex-wrap items-end gap-2 rounded-md p-1.5 -m-1.5',
        expireError && 'ring-2 ring-red-500 bg-red-50/60',
      )}
    >
      <div className="min-w-0 grow basis-[9rem]">
        {showLabels && (
          <span
            className={cn(
              'mb-1 block text-[11px] font-medium',
              expireError ? 'text-red-600' : 'text-muted-foreground',
            )}
          >
            วันหมดอายุ
          </span>
        )}
        <ExpireDateInput
          id={`prepared-expire-${line.lineId}`}
          value={line.expireDate || ''}
          onChange={(v) => onExpireDateChange(line.lineId, v)}
          className={expireError ? 'border-red-500' : ''}
        />
      </div>
      <div className="w-[4.5rem] shrink-0">
        {showLabels && (
          <span className="mb-1 block text-[11px] font-medium text-muted-foreground">จำนวน</span>
        )}
        <QtyInput line={line} onSetCopies={onSetCopies} />
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
        aria-label={`ลบ lot ${line.itemcode}`}
        onClick={() => onRemoveLine(line.lineId)}
      >
        <Minus className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function PrePrintOrderCard({
  preparedLines,
  emptyHint = 'กดปุ่มเตรียมพิมพ์จากรายการอุปกรณ์เพื่อแสดงที่นี่',
  onSetCopies,
  onExpireDateChange,
  onRemoveLine,
  onClearAll,
  saving,
  onSaveDocument,
}: PrePrintOrderCardProps) {
  const groupedLines = useMemo(() => {
    const map = new Map<string, SelectedLine[]>();
    for (const line of preparedLines) {
      const list = map.get(line.itemcode) ?? [];
      list.push(line);
      map.set(line.itemcode, list);
    }
    return [...map.entries()];
  }, [preparedLines]);

  const totalSheets = preparedLines.reduce((s, l) => s + resolveCopies(l.copies, l.refillCap), 0);

  return (
    <Card className="min-w-0 overflow-hidden border-slate-200 shadow-sm lg:sticky lg:top-4">
      <CardHeader className="space-y-1 p-4 pb-3 sm:p-6 sm:pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="text-base sm:text-lg">รายการเตรียมพิมพ์</CardTitle>
            <CardDescription className="mt-0.5 text-xs sm:text-sm">
              {preparedLines.length === 0
                ? emptyHint
                : `${groupedLines.length} รายการ · ${preparedLines.length} lot · รวม ${totalSheets} แผ่น`}
            </CardDescription>
          </div>
          {preparedLines.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 self-start shrink-0 px-2 text-xs sm:text-sm"
              onClick={onClearAll}
            >
              ล้างทั้งหมด
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="min-h-0 space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
        {preparedLines.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center text-sm text-muted-foreground">
            {emptyHint}
          </p>
        ) : (
          <>
            <div className="max-h-[min(58vh,calc(100dvh-16rem))] space-y-2 overflow-y-auto overscroll-contain md:hidden">
              {groupedLines.map(([itemcode, lines]) => {
                const head = lines[0];
                return (
                  <div key={itemcode} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 text-sm">
                        <ItemLabel itemcode={head.itemcode} itemname={head.itemname} />
                      </div>
                      <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                        {lines.length} lot
                      </span>
                    </div>
                    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                      {lines.map((line, idx) => (
                        <div key={line.lineId} className="rounded-lg bg-slate-50/80 p-2.5">
                          <span className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                            Lot {idx + 1}
                          </span>
                          <LotControls
                            line={line}
                            showLabels
                            onSetCopies={onSetCopies}
                            onExpireDateChange={onExpireDateChange}
                            onRemoveLine={onRemoveLine}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden max-h-[min(70vh,calc(100dvh-15rem))] overflow-auto rounded-md border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">ชื่ออุปกรณ์</TableHead>
                    <TableHead className="w-[168px]">วันหมดอายุ</TableHead>
                    <TableHead className="w-[88px] text-center">จำนวน</TableHead>
                    <TableHead className="w-12 text-center" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedLines.map(([itemcode, lines]) => {
                    const head = lines[0];
                    return (
                      <Fragment key={itemcode}>
                        <TableRow className="bg-violet-50/70 hover:bg-violet-50/70">
                          <TableCell colSpan={4} className="py-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 text-sm font-medium">
                                <ItemLabel itemcode={head.itemcode} itemname={head.itemname} />
                              </div>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {lines.length} lot
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                        {lines.map((line, idx) => {
                          const expireError = line.copies !== '' && !hasExpireDate(line.expireDate);
                          return (
                            <TableRow
                              key={line.lineId}
                              className={cn('bg-white', expireError && 'bg-red-50/70')}
                            >
                              <TableCell className="py-2 pl-6 text-xs text-muted-foreground">
                                Lot {idx + 1}
                              </TableCell>
                              <TableCell className="py-2 align-middle">
                                <div
                                  className={cn(
                                    'flex min-w-[8.5rem] items-center rounded-md p-0.5',
                                    expireError &&
                                      'ring-2 ring-red-500 bg-red-50/80 [&_input]:border-red-500',
                                  )}
                                >
                                  <ExpireDateInput
                                    id={`prepared-d-expire-${line.lineId}`}
                                    value={line.expireDate || ''}
                                    onChange={(v) => onExpireDateChange(line.lineId, v)}
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="py-2 text-center align-middle">
                                <div className="flex justify-center">
                                  <QtyInput line={line} onSetCopies={onSetCopies} />
                                </div>
                              </TableCell>
                              <TableCell className="py-2 text-center align-middle">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                                  aria-label={`ลบ lot ${line.itemcode}`}
                                  onClick={() => onRemoveLine(line.lineId)}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <div
          className={cn(
            'sticky bottom-0 z-10 -mx-4 flex border-t bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:static sm:mx-0 sm:justify-end sm:bg-transparent sm:px-0 sm:py-0 sm:pt-3 sm:backdrop-blur-none',
            preparedLines.length === 0 && 'sm:pt-3',
          )}
        >
          <Button
            type="button"
            className="w-full min-w-[8rem] sm:w-auto"
            onClick={onSaveDocument}
            disabled={saving || preparedLines.length === 0}
          >
            {saving ? 'กำลังบันทึก…' : 'บันทึกเอกสาร'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

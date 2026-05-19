'use client';

import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type WeighingStockCabinetOption = {
  id: number;
  cabinet_name?: string | null;
  cabinet_code?: string | null;
  stock_id?: number | null;
};

type Props = {
  itemNameDraft: string;
  onItemNameDraftChange: (v: string) => void;
  itemcodeDraft: string;
  onItemcodeDraftChange: (v: string) => void;
  selectedStockId: string;
  onSelectedStockIdChange: (v: string) => void;
  cabinets: WeighingStockCabinetOption[];
  loadingCabinets: boolean;
  loading?: boolean;
  onApply: () => void;
  onClear: () => void;
  canClear: boolean;
  className?: string;
};

export default function WeighingStockFilterSection({
  itemNameDraft,
  onItemNameDraftChange,
  itemcodeDraft,
  onItemcodeDraftChange,
  selectedStockId,
  onSelectedStockIdChange,
  cabinets,
  loadingCabinets,
  loading = false,
  onApply,
  onClear,
  canClear,
  className,
}: Props) {
  return (
    <form
      className={cn(
        'rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-1 shadow-sm shadow-slate-200/40',
        'ring-offset-background transition-shadow focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:ring-offset-2',
        className
      )}
      onSubmit={(e) => {
        e.preventDefault();
        onApply();
      }}
    >
      <div className="space-y-5 rounded-xl bg-white/90 px-3 py-4 sm:px-5 sm:py-5 backdrop-blur-sm">
        <div className="flex gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25"
            aria-hidden
          >
            <Filter className="h-[18px] w-[18px] opacity-95" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 pt-0.5">
            <h2 className="text-base font-semibold text-slate-900">ค้นหาและกรอง</h2>
            <p className="text-[11px] text-slate-400 sm:text-xs">
              กรอกเงื่อนไขแล้วกดค้นหา — ถ้ามีชื่ออุปกรณ์ ระบบจะใช้ค้นตามชื่อก่อน (รหัสอุปกรณ์ใช้เมื่อไม่กรอกชื่อ)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="weighing-filter-name" className="text-slate-700">
              ชื่ออุปกรณ์
            </Label>
            <Input
              id="weighing-filter-name"
              name="itemName"
              autoComplete="off"
              placeholder="ค้นหาจากชื่อหรือชื่อรอง..."
              value={itemNameDraft}
              onChange={(e) => onItemNameDraftChange(e.target.value)}
              className="h-10 rounded-lg border-slate-200 bg-white shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="weighing-filter-code" className="text-slate-700">
              รหัสอุปกรณ์ (itemcode)
            </Label>
            <Input
              id="weighing-filter-code"
              name="itemcode"
              autoComplete="off"
              placeholder="ค้นหาจากรหัสอุปกรณ์..."
              value={itemcodeDraft}
              onChange={(e) => onItemcodeDraftChange(e.target.value)}
              disabled={!!itemNameDraft.trim()}
              className="h-10 rounded-lg border-slate-200 bg-white shadow-sm disabled:opacity-60"
            />
          </div>

          <div className="space-y-2 md:col-span-2 lg:col-span-1">
            <Label htmlFor="weighing-filter-cabinet" className="text-slate-700">
              ตู้ Weighing
            </Label>
            <Select
              value={selectedStockId || 'all'}
              onValueChange={(v) => onSelectedStockIdChange(v === 'all' ? '' : v)}
              disabled={loadingCabinets}
            >
              <SelectTrigger
                id="weighing-filter-cabinet"
                className="h-10 w-full rounded-lg border-slate-200 bg-white shadow-sm"
              >
                <SelectValue placeholder="ทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                {cabinets.map((c) => (
                  <SelectItem key={c.id} value={String(c.stock_id)}>
                    {c.cabinet_name || c.cabinet_code || `Stock ${c.stock_id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClear}
            disabled={!canClear || loading}
            className="h-10 rounded-xl border-slate-200 hover:bg-slate-50 sm:min-w-[100px]"
          >
            ล้าง
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="h-10 min-w-[120px] rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 font-medium text-white shadow-md shadow-blue-500/20 hover:from-blue-600 hover:to-indigo-700"
          >
            {loading ? 'กำลังโหลด...' : 'ค้นหา'}
          </Button>
        </div>
      </div>
    </form>
  );
}

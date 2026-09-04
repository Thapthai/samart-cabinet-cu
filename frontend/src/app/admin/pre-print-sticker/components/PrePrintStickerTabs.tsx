'use client';

import { ClipboardList, History } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export type PrePrintStickerTab = 'record' | 'history';

type PrePrintStickerTabsProps = {
  activeTab: PrePrintStickerTab;
  onTabChange: (tab: PrePrintStickerTab) => void;
  recordContent: ReactNode;
  historyContent: ReactNode;
};

export default function PrePrintStickerTabs({
  activeTab,
  onTabChange,
  recordContent,
  historyContent,
}: PrePrintStickerTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => onTabChange(v as PrePrintStickerTab)}
      className="min-w-0 space-y-4"
    >
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardContent className="p-3 sm:p-4 sm:pt-5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
            <button
              type="button"
              onClick={() => onTabChange('record')}
              className={cn(
                'flex items-center gap-3 rounded-xl border bg-background p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-3.5',
                activeTab === 'record'
                  ? 'border-primary bg-primary/[0.06] shadow-sm ring-2 ring-primary/15'
                  : 'border-slate-200 hover:bg-muted/40',
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                <ClipboardList className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 space-y-0.5">
                <span className="block text-base font-medium text-slate-900 sm:text-lg">บันทึก</span>
                <span className="block text-xs text-muted-foreground sm:text-sm">
                  เลือกอุปกรณ์และเตรียมรายการพิมพ์
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => onTabChange('history')}
              className={cn(
                'flex items-center gap-3 rounded-xl border bg-background p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-3.5',
                activeTab === 'history'
                  ? 'border-primary bg-primary/[0.06] shadow-sm ring-2 ring-primary/15'
                  : 'border-slate-200 hover:bg-muted/40',
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <History className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 space-y-0.5">
                <span className="block text-base font-medium text-slate-900 sm:text-lg">ประวัติ</span>
                <span className="block text-xs text-muted-foreground sm:text-sm">
                  เอกสารเตรียมพิมพ์ที่บันทึกไว้
                </span>
              </span>
            </button>
          </div>
        </CardContent>
      </Card>

      <TabsContent value="record" className="mt-0 min-w-0 space-y-4 focus-visible:outline-none">
        {recordContent}
      </TabsContent>

      <TabsContent value="history" className="mt-0 min-w-0 space-y-4 focus-visible:outline-none">
        {historyContent}
      </TabsContent>
    </Tabs>
  );
}

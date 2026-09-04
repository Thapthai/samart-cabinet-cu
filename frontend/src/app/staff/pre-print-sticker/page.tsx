'use client';

import { useState } from 'react';
import { Loader2, Printer } from 'lucide-react';
import PrePrintHistoryTab from '@/app/admin/pre-print-sticker/components/PrePrintHistoryTab';
import PrePrintItemListCard from '@/app/admin/pre-print-sticker/components/PrePrintItemListCard';
import PrePrintOrderCard from '@/app/admin/pre-print-sticker/components/PrePrintOrderCard';
import PrePrintStickerTabs, {
  type PrePrintStickerTab,
} from '@/app/admin/pre-print-sticker/components/PrePrintStickerTabs';
import { usePrePrintSticker } from '@/app/admin/pre-print-sticker/usePrePrintSticker';

export default function StaffPrePrintStickerPage() {
  const s = usePrePrintSticker();
  const [activeTab, setActiveTab] = useState<PrePrintStickerTab>('record');
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const handleSaveDocument = async () => {
    const ok = await s.handleSaveDocument();
    if (ok) {
      setHistoryRefreshKey((k) => k + 1);
      setActiveTab('history');
    }
  };

  const recordContent =
    s.loadingInitial ? (
      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 shadow-sm">
        <div className="text-center">
          <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-violet-500" />
          <p className="text-sm text-muted-foreground">กำลังโหลดข้อมูล…</p>
        </div>
      </div>
    ) : (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
        <PrePrintItemListCard
          items={s.displayItems}
          loadingList={s.loadingList && s.displayItems.length === 0}
          total={s.total}
          page={s.page}
          totalPages={s.totalPages}
          keywordInput={s.keywordInput}
          onKeywordInputChange={s.setKeywordInput}
          onPageChange={s.handlePageChange}
          getItemDraft={s.getItemDraft}
          onDraftExpireChange={s.setItemDraftExpire}
          onDraftCopiesChange={s.setItemDraftCopies}
          onAddSubLine={s.addSubLine}
          pendingLines={s.selectedLines}
          onSetCopies={s.setCopiesFor}
          onExpireDateChange={s.setExpireDateFor}
          onRemoveLine={s.removeLine}
          onClearPending={s.clearSelectedLines}
          stagedSummary={s.stagedSummary}
          canPrepare={s.canPrepare}
          onPrepare={s.handlePrepare}
          onItemCreated={s.reloadItems}
        />

        <PrePrintOrderCard
          preparedLines={s.preparedOrderLines}
          onSetCopies={s.setPreparedCopiesFor}
          onExpireDateChange={s.setPreparedExpireDateFor}
          onRemoveLine={s.removePreparedLine}
          onClearAll={s.clearPreparedOrderLines}
          saving={s.savingDocument}
          onSaveDocument={handleSaveDocument}
        />
      </div>
    );

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 sm:gap-6">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-lg bg-violet-100 p-2 sm:p-2.5">
          <Printer className="h-5 w-5 text-violet-600 sm:h-6 sm:w-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            เตรียมพิมพ์สติ๊กเกอร์
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            ค้นหาอุปกรณ์ → กรอกจำนวน/วันหมดอายุ → (+) เพิ่ม lot → เตรียมพิมพ์ → บันทึกเอกสาร
          </p>
        </div>
      </div>

      <PrePrintStickerTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        recordContent={recordContent}
        historyContent={<PrePrintHistoryTab refreshKey={historyRefreshKey} />}
      />
    </div>
  );
}

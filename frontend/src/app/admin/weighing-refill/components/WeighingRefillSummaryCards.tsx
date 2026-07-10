interface WeighingRefillSummaryCardsProps {
  totalItems: number;
  totalQty: number;
}

export default function WeighingRefillSummaryCards({ totalItems, totalQty }: WeighingRefillSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-4">
      <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-3 shadow-sm sm:p-5">
        <p className="text-[11px] font-medium text-blue-600 sm:text-sm">รายการทั้งหมด</p>
        <p className="mt-0.5 text-xl font-bold tabular-nums text-blue-900 sm:text-2xl">{totalItems}</p>
      </div>
      <div className="rounded-xl border border-green-100 bg-green-50/80 p-3 shadow-sm sm:p-5">
        <p className="text-[11px] font-medium text-green-600 sm:text-sm">จำนวนรวม</p>
        <p className="mt-0.5 text-xl font-bold tabular-nums text-green-900 sm:text-2xl">{totalQty}</p>
      </div>
    </div>
  );
}

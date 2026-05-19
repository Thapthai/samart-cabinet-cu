interface WeighingRefillSummaryCardsProps {
  totalItems: number;
  totalQty: number;
}

export default function WeighingRefillSummaryCards({ totalItems, totalQty }: WeighingRefillSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-blue-50/80 border border-blue-100 p-5 rounded-xl shadow-sm">
        <p className="text-sm text-blue-600 font-medium">รายการทั้งหมด</p>
        <p className="text-2xl font-bold text-blue-900 mt-0.5">{totalItems}</p>
      </div>
      <div className="bg-green-50/80 border border-green-100 p-5 rounded-xl shadow-sm">
        <p className="text-sm text-green-600 font-medium">จำนวนรวม (Qty)</p>
        <p className="text-2xl font-bold text-green-900 mt-0.5">{totalQty}</p>
      </div>
    </div>
  );
}

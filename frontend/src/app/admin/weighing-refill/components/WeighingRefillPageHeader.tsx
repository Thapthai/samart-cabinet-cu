import { RotateCcw } from 'lucide-react';

export default function WeighingRefillPageHeader() {
  return (
    <div className="flex items-start gap-3 sm:items-center">
      <div className="shrink-0 rounded-xl bg-green-100 p-2.5 shadow-sm sm:p-3">
        <RotateCcw className="h-6 w-6 text-green-600 sm:h-7 sm:w-7" />
      </div>
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">เติมอุปกรณ์เข้าตู้</h1>
        <p className="mt-0.5 text-sm text-gray-500">รายการเติมเข้าตู้ Weighing และ RFID ตามตู้ที่เลือก</p>
      </div>
    </div>
  );
}

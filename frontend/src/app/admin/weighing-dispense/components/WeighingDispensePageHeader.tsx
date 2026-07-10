import { Package } from 'lucide-react';

export default function WeighingDispensePageHeader() {
  return (
    <div className="flex items-start gap-3 sm:items-center">
      <div className="shrink-0 rounded-xl bg-purple-100 p-2.5 shadow-sm sm:p-3">
        <Package className="h-6 w-6 text-purple-600 sm:h-7 sm:w-7" />
      </div>
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">เบิกอุปกรณ์จากตู้</h1>
        <p className="mt-0.5 text-sm text-gray-500">รายการเบิกจากตู้ Weighing และ RFID ตามตู้ที่เลือก</p>
      </div>
    </div>
  );
}

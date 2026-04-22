import { RotateCcw } from 'lucide-react';

export default function WeighingRefillPageHeader() {
  return (
    <div className="flex items-center gap-4">
      <div className="p-3 bg-green-100 rounded-xl shadow-sm">
        <RotateCcw className="h-7 w-7 text-green-600" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">เติมอุปกรณ์เข้าตู้ Weighing / RFID</h1>
        <p className="text-sm text-gray-500 mt-0.5">การเติมเข้าตู้ชั่ง (Sign = +) และการคืนเข้าตู้ RFID</p>
      </div>
    </div>
  );
}

import { Package } from 'lucide-react';

export default function WeighingDispensePageHeader() {
  return (
    <div className="flex items-center gap-4">
      <div className="p-3 bg-purple-100 rounded-xl shadow-sm">
        <Package className="h-7 w-7 text-purple-600" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">เบิกอุปกรณ์จากตู้ Weighing</h1>
        <p className="text-sm text-gray-500 mt-0.5">การเบิกอุปกรณ์จากตู้ Weighing</p>
      </div>
    </div>
  );
}

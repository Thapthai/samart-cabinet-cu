"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export type StaffUserListFilters = {
  search: string;
  status: "ALL" | "ACTIVE" | "INACTIVE";
};

interface StaffUsersFilterSectionProps {
  onSearch: (filters: StaffUserListFilters) => void;
  onBeforeSearch?: () => void;
}

export default function StaffUsersFilterSection({
  onSearch,
  onBeforeSearch,
}: StaffUsersFilterSectionProps) {
  const [formFilters, setFormFilters] = useState<StaffUserListFilters>({
    search: "",
    status: "ALL",
  });

  const handleApply = () => {
    onBeforeSearch?.();
    onSearch(formFilters);
  };

  const handleReset = () => {
    const next: StaffUserListFilters = { search: "", status: "ALL" };
    setFormFilters(next);
    onSearch(next);
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 p-1 shadow-sm shadow-slate-200/40",
        "ring-offset-background transition-shadow focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:ring-offset-2",
      )}
    >
      <div className="space-y-5 rounded-xl bg-white/90 px-3 py-4 sm:px-5 sm:py-5 backdrop-blur-sm">
        <div className="flex gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25"
            aria-hidden
          >
            <Filter className="h-[18px] w-[18px] opacity-95" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 pt-0.5">
            <h2 className="text-base font-semibold text-slate-900">ค้นหาและกรอง</h2>
            <p className="text-[11px] text-slate-400 sm:text-xs">
              คำค้นชื่อ อีเมล Client ID บทบาท หรือแผนก — กดค้นหาเพื่อกรองรายการด้านล่าง
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="staff-user-search" className="text-slate-700">
              คำค้น (ชื่อ / อีเมล / Client ID)
            </Label>
            <Input
              id="staff-user-search"
              placeholder="พิมพ์แล้วกดค้นหา..."
              value={formFilters.search}
              onChange={(e) => setFormFilters({ ...formFilters, search: e.target.value })}
              className="h-10 rounded-lg border-slate-200 bg-white shadow-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApply();
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="staff-user-status-filter" className="text-slate-700">
              สถานะบัญชี
            </Label>
            <Select
              value={formFilters.status}
              onValueChange={(value: StaffUserListFilters["status"]) =>
                setFormFilters({ ...formFilters, status: value })
              }
            >
              <SelectTrigger
                id="staff-user-status-filter"
                className="h-10 w-full rounded-lg border-slate-200 bg-white shadow-sm"
              >
                <SelectValue placeholder="ทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทั้งหมด</SelectItem>
                <SelectItem value="ACTIVE">ใช้งาน</SelectItem>
                <SelectItem value="INACTIVE">ไม่ใช้งาน</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="h-10 rounded-xl border-slate-200 hover:bg-slate-50 sm:min-w-[100px]"
          >
            รีเซ็ต
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            className="h-10 min-w-[120px] rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 font-medium text-white shadow-md shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-700"
          >
            ค้นหา
          </Button>
        </div>
      </div>
    </div>
  );
}

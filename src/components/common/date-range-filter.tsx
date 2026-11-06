"use client";

import React from "react";
import { Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";

export type DatePresetType = "all" | "today" | "thisMonth" | "recent3M" | "recent6M" | "6months" | "year2026" | "custom" | string;

export interface DateTypeOption {
  label: string;
  value: string;
}

export interface ExtraDatePreset {
  label: string;
  value: string;
  months?: number;
}

export interface DateRangeFilterProps {
  label?: string;
  dateType?: string;
  onDateTypeChange?: (type: string) => void;
  dateTypeOptions?: DateTypeOption[];
  startDate: string;
  endDate: string;
  onChange?: (startDate: string, endDate: string, preset?: DatePresetType) => void;
  onStartDateChange?: (startDate: string) => void;
  onEndDateChange?: (endDate: string) => void;
  selectedPreset?: DatePresetType | string;
  onPresetChange?: (preset: any) => void;
  extraPresets?: ExtraDatePreset[];
  className?: string;
  compact?: boolean;
}

export function isWithinDateRange(dateStr?: string | null, start?: string, end?: string): boolean {
  if (!start && !end) return true;
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
}

export function DateRangeFilter({
  label = "조회 기간",
  dateType,
  onDateTypeChange,
  dateTypeOptions,
  startDate,
  endDate,
  onChange,
  onStartDateChange,
  onEndDateChange,
  selectedPreset = "all",
  onPresetChange,
  extraPresets,
  className = "",
  compact = false,
}: DateRangeFilterProps) {
  const notifyChange = (start: string, end: string, preset?: DatePresetType) => {
    if (onChange) onChange(start, end, preset);
    if (onStartDateChange) onStartDateChange(start);
    if (onEndDateChange) onEndDateChange(end);
    if (onPresetChange && preset) onPresetChange(preset);
  };

  const handlePresetClick = (preset: DatePresetType) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === "all") {
      notifyChange("", "", "all");
    } else if (preset === "today") {
      const todayStr = toDateStr(now);
      notifyChange(todayStr, todayStr, "today");
    } else if (preset === "thisMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      notifyChange(toDateStr(firstDay), toDateStr(lastDay), "thisMonth");
    } else if (preset === "recent3M") {
      const past = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      notifyChange(toDateStr(past), toDateStr(now), "recent3M");
    } else if (preset === "recent6M" || preset === "6months") {
      const past = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      notifyChange(toDateStr(past), toDateStr(now), preset);
    } else if (preset === "year2026") {
      notifyChange("2026-01-01", "2026-12-31", "year2026");
    } else {
      const mMatch = String(preset).match(/(\d+)\s*(?:m|month|개월)/i);
      if (mMatch) {
        const months = Number(mMatch[1]);
        const past = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
        notifyChange(toDateStr(past), toDateStr(now), preset);
      } else if (onPresetChange) {
        onPresetChange(preset);
      }
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs ${className}`}>
      {/* 라벨 & 아이콘 */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Calendar className="h-4 w-4 text-sky-600 dark:text-sky-400" />
        {label && (
          <span className="font-bold text-zinc-800 dark:text-zinc-200 text-xs shrink-0">
            {label}
          </span>
        )}
      </div>

      {/* 기간 구분 드롭다운 (선택) */}
      {dateTypeOptions && dateTypeOptions.length > 0 && (
        <select
          value={dateType}
          onChange={(e) => onDateTypeChange && onDateTypeChange(e.target.value)}
          className="h-7 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-xs font-bold text-sky-700 dark:text-sky-300 shrink-0"
        >
          {dateTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {/* 시작일 ~ 종료일 인풋 */}
      <div className="flex items-center gap-1 shrink-0">
        <Input
          type="date"
          value={startDate}
          onChange={(e) => {
            notifyChange(e.target.value, endDate, "custom");
          }}
          className="h-7 w-[122px] text-xs font-mono bg-white dark:bg-zinc-900 px-2"
        />
        <span className="text-zinc-400 font-bold">~</span>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => {
            notifyChange(startDate, e.target.value, "custom");
          }}
          className="h-7 w-[122px] text-xs font-mono bg-white dark:bg-zinc-900 px-2"
        />
      </div>

      {/* 프리셋 버튼 */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => handlePresetClick("today")}
          className={`px-2 py-0.5 rounded text-[11px] border font-medium transition-colors ${
            selectedPreset === "today"
              ? "bg-sky-600 text-white border-sky-600 font-bold"
              : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          오늘
        </button>
        <button
          type="button"
          onClick={() => handlePresetClick("thisMonth")}
          className={`px-2 py-0.5 rounded text-[11px] border font-medium transition-colors ${
            selectedPreset === "thisMonth"
              ? "bg-sky-600 text-white border-sky-600 font-bold"
              : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          이번달
        </button>
        {!compact && (
          <button
            type="button"
            onClick={() => handlePresetClick("recent3M")}
            className={`px-2 py-0.5 rounded text-[11px] border font-medium transition-colors ${
              selectedPreset === "recent3M"
                ? "bg-sky-600 text-white border-sky-600 font-bold"
                : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            최근3개월
          </button>
        )}
        {extraPresets?.map((ep) => (
          <button
            key={ep.value}
            type="button"
            onClick={() => handlePresetClick(ep.value)}
            className={`px-2 py-0.5 rounded text-[11px] border font-medium transition-colors ${
              selectedPreset === ep.value
                ? "bg-sky-600 text-white border-sky-600 font-bold"
                : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {ep.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handlePresetClick("year2026")}
          className={`px-2 py-0.5 rounded text-[11px] border font-medium transition-colors ${
            selectedPreset === "year2026"
              ? "bg-sky-600 text-white border-sky-600 font-bold"
              : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          2026연간
        </button>
        <button
          type="button"
          onClick={() => handlePresetClick("all")}
          className={`px-2 py-0.5 rounded text-[11px] border font-medium transition-colors ${
            selectedPreset === "all"
              ? "bg-zinc-700 text-white border-zinc-700 font-bold"
              : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
          }`}
        >
          전체
        </button>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import {
  Wrench,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  RotateCcw,
  Filter,
  Layers,
  Gauge,
  Building2,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

interface MoldItem {
  id: string;
  code: string;
  name: string;
  partNo: string;
  vendor: string;
  location: string;
  status: "MASS_PROD" | "DEV_TEST" | "MAINTENANCE" | "WARNING" | "READY";
  statusText: string;
  currentShots: number;
  maxShots: number;
  cavity: string;
  lastInspection: string;
}

const INITIAL_MOLDS: MoldItem[] = [
  {
    id: "1",
    code: "MD-2024-001",
    name: "Bumper Lower Cover",
    partNo: "P86510-L0000",
    vendor: "(주)동성금형테크",
    location: "화성 1공장 4호기",
    status: "MASS_PROD",
    statusText: "양산 정상 가동",
    currentShots: 182400,
    maxShots: 300000,
    cavity: "1x2",
    lastInspection: "2025-05-18",
  },
  {
    id: "2",
    code: "MD-2024-008",
    name: "Door Trim Side Armrest",
    partNo: "P82305-G2000",
    vendor: "대영정밀",
    location: "평택 2공장 라인B",
    status: "WARNING",
    statusText: "점검 권장 (수명 92%)",
    currentShots: 278500,
    maxShots: 300000,
    cavity: "2x2",
    lastInspection: "2025-05-20",
  },
  {
    id: "3",
    code: "MD-2025-014",
    name: "Battery Housing Top Case",
    partNo: "EV-37510-E100",
    vendor: "삼우엠텍",
    location: "시제품 개발동 T1",
    status: "DEV_TEST",
    statusText: "T2 시사출 진행중",
    currentShots: 1250,
    maxShots: 500000,
    cavity: "1x1",
    lastInspection: "2025-05-21",
  },
  {
    id: "4",
    code: "MD-2023-042",
    name: "Center Fascia Lower Panel",
    partNo: "P84740-K4000",
    vendor: "경북금형정밀",
    location: "외주 보수실 (입고중)",
    status: "MAINTENANCE",
    statusText: "코아 분해 세척/보수",
    currentShots: 215000,
    maxShots: 250000,
    cavity: "1x1",
    lastInspection: "2025-05-19",
  },
  {
    id: "5",
    code: "MD-2024-031",
    name: "Tail Lamp Housing Inner",
    partNo: "P92401-N7000",
    vendor: "(주)동성금형테크",
    location: "화성 2공장 7호기",
    status: "MASS_PROD",
    statusText: "양산 정상 가동",
    currentShots: 94200,
    maxShots: 300000,
    cavity: "2x2",
    lastInspection: "2025-05-15",
  },
  {
    id: "6",
    code: "MD-2025-003",
    name: "HV Junction Box Cover",
    partNo: "EV-91950-B800",
    vendor: "대영정밀",
    location: "금형 보관창고 A-12",
    status: "READY",
    statusText: "생산 대기 (승인완료)",
    currentShots: 15400,
    maxShots: 400000,
    cavity: "1x4",
    lastInspection: "2025-05-10",
  },
];

export default function MoldStatusDashboardPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredMolds = INITIAL_MOLDS.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.code.toLowerCase().includes(search.toLowerCase()) ||
      m.partNo.toLowerCase().includes(search.toLowerCase()) ||
      m.vendor.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === "ALL" ? true : m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalCount = INITIAL_MOLDS.length;
  const massCount = INITIAL_MOLDS.filter((m) => m.status === "MASS_PROD").length;
  const devCount = INITIAL_MOLDS.filter((m) => m.status === "DEV_TEST").length;
  const maintCount = INITIAL_MOLDS.filter((m) => m.status === "MAINTENANCE").length;
  const warnCount = INITIAL_MOLDS.filter((m) => m.status === "WARNING").length;

  const getStatusBadge = (status: MoldItem["status"]) => {
    switch (status) {
      case "MASS_PROD":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
      case "DEV_TEST":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800";
      case "MAINTENANCE":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
      case "WARNING":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 상단 헤더 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-sky-500/10 p-2 text-sky-600 dark:text-sky-400">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                금형 종합 현황 대시보드
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                본사 및 협력사 등록 금형의 실시간 가동, 개발 시험, 타발 수명 및 예방보수 관제
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            실시간 관제 연동중
          </span>
        </div>
      </div>

      {/* 통계 KPI 카드 그리드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-xs font-medium">총 프로젝트 갯수</span>
            <Layers className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totalCount}</span>
            <span className="text-xs text-zinc-400">개</span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-400">진행 4개 / 협력사 2개</div>
        </div>

        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-4 shadow-xs dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
            <span className="text-xs font-medium">양산 가동중</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{massCount}</span>
            <span className="text-xs text-emerald-600/70 dark:text-emerald-400/70">벌</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-600/80 dark:text-emerald-400/80">가동 가동률 96.5%</div>
        </div>

        <div className="rounded-xl border border-blue-200/80 bg-blue-50/30 p-4 shadow-xs dark:border-blue-900/40 dark:bg-blue-950/20">
          <div className="flex items-center justify-between text-blue-700 dark:text-blue-400">
            <span className="text-xs font-medium">신규 개발/시험</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">{devCount}</span>
            <span className="text-xs text-blue-600/70 dark:text-blue-400/70">벌</span>
          </div>
          <div className="mt-1 text-[11px] text-blue-600/80 dark:text-blue-400/80">T1/T2 사출 검증</div>
        </div>

        <div className="rounded-xl border border-amber-200/80 bg-amber-50/30 p-4 shadow-xs dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
            <span className="text-xs font-medium">예방 보수/세척</span>
            <RotateCcw className="h-4 w-4" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700 dark:text-amber-300">{maintCount}</span>
            <span className="text-xs text-amber-600/70 dark:text-amber-400/70">벌</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-600/80 dark:text-amber-400/80">주기 정기점검 진행</div>
        </div>

        <div className="rounded-xl border border-rose-200/80 bg-rose-50/30 p-4 shadow-xs dark:border-rose-900/40 dark:bg-rose-950/20 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
            <span className="text-xs font-medium">한계수명/주의</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-700 dark:text-rose-300">{warnCount}</span>
            <span className="text-xs text-rose-600/70 dark:text-rose-400/70">벌</span>
          </div>
          <div className="mt-1 text-[11px] text-rose-600/80 dark:text-rose-400/80">Shot 수명 90% 이상</div>
        </div>
      </div>

      {/* 가동 및 수명 요약 섹션 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-sky-500" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                주요 양산 금형 타발 수명(Shot Count) 소진율
              </h2>
            </div>
            <span className="text-xs text-zinc-400">임계치 기준 90%</span>
          </div>
          <div className="space-y-4">
            {INITIAL_MOLDS.slice(0, 4).map((mold) => {
              const percentage = Math.round((mold.currentShots / mold.maxShots) * 100);
              const isDanger = percentage >= 90;
              const isWarning = percentage >= 70 && percentage < 90;
              return (
                <div key={mold.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{mold.code}</span>
                      <span className="text-zinc-500 dark:text-zinc-400">{mold.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-zinc-600 dark:text-zinc-300">
                        {mold.currentShots.toLocaleString()} / {mold.maxShots.toLocaleString()} Shot
                      </span>
                      <span
                        className={`font-semibold ${
                          isDanger ? "text-rose-600" : isWarning ? "text-amber-600" : "text-emerald-600"
                        }`}
                      >
                        ({percentage}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isDanger
                          ? "bg-rose-500"
                          : isWarning
                          ? "bg-amber-500"
                          : "bg-sky-500"
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 점검 & 알림 위젯 */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                금형 정밀점검 주의보
              </h2>
            </div>
            <div className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="rounded-lg border border-rose-200/60 bg-rose-50/50 p-2.5 dark:border-rose-900/30 dark:bg-rose-950/30">
                <p className="font-medium text-rose-800 dark:text-rose-300">
                  [수명 임계] MD-2024-008 암레스트 금형
                </p>
                <p className="mt-1 text-[11px] text-rose-600/90 dark:text-rose-400/90">
                  278,500타발 도달 (92.8%). 다음 주 정기 점검 및 코아 마모 상태 전수 계측 필요
                </p>
              </div>
              <div className="rounded-lg border border-amber-200/60 bg-amber-50/50 p-2.5 dark:border-amber-900/30 dark:bg-amber-950/30">
                <p className="font-medium text-amber-800 dark:text-amber-300">
                  [보수 입고] MD-2023-042 센터페시아
                </p>
                <p className="mt-1 text-[11px] text-amber-600/90 dark:text-amber-400/90">
                  협력사 경북금형정밀 입고 완료. 22일 사출 테스트 예정
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400 flex justify-between items-center">
            <span>기준 일자: 2025-05-22</span>
            <span className="font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer">
              보수내역 전체보기 &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* 금형 목록 검색 및 테이블 */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: "전체보기" },
              { key: "MASS_PROD", label: "양산중" },
              { key: "DEV_TEST", label: "개발/시험" },
              { key: "MAINTENANCE", label: "보수/점검" },
              { key: "WARNING", label: "수명경고" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === tab.key
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="금형코드, 품명, 협력사 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* 테이블 */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400">
                <th className="py-2.5 px-3 font-semibold">금형 관리번호</th>
                <th className="py-2.5 px-3 font-semibold">금형명 / 부품번호</th>
                <th className="py-2.5 px-3 font-semibold">제작/관리 협력사</th>
                <th className="py-2.5 px-3 font-semibold">배치 위치</th>
                <th className="py-2.5 px-3 font-semibold">상태</th>
                <th className="py-2.5 px-3 font-semibold text-right">누적 타발 (Shot)</th>
                <th className="py-2.5 px-3 font-semibold text-center">최근 점검일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {filteredMolds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-400">
                    조건에 일치하는 금형 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredMolds.map((item) => {
                  const shotPct = Math.round((item.currentShots / item.maxShots) * 100);
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-3 px-3 font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        {item.code}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-zinc-800 dark:text-zinc-200">
                          {item.name}
                        </div>
                        <div className="font-mono text-[11px] text-zinc-400">{item.partNo}</div>
                      </td>
                      <td className="py-3 px-3 text-zinc-600 dark:text-zinc-300">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                          <span>{item.vendor}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-zinc-500 dark:text-zinc-400">{item.location}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                            getStatusBadge(item.status)
                          }`}
                        >
                          {item.statusText}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                          {item.currentShots.toLocaleString()} / {item.maxShots.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-zinc-400">수명 사용률 {shotPct}%</div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-zinc-500 dark:text-zinc-400">
                        {item.lastInspection}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

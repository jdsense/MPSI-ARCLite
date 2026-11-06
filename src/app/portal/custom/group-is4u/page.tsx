"use client";

import React from "react";

export default function DynamicMenuPortalPage() {
  return (
    <div className="space-y-4">
      {/* 대시보드 요약 카드 영역 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">총 등록 제품</p>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">3 건</h3>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">양산 중</p>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">1 건</h3>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs">
          <p className="text-xs font-medium text-purple-600 dark:text-purple-400">금형 개발</p>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">1 건</h3>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">견적 검토</p>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">1 건</h3>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">제품 리스트</h1>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              등록된 제품 및 양산/금형 현황을 관리합니다. (경로: /portal/custom/group-is4u)
            </p>
          </div>
          <button className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors">
            + 신규 제품 등록
          </button>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
                <th className="py-3 px-4">제품 코드</th>
                <th className="py-3 px-4">제품명</th>
                <th className="py-3 px-4">차종/규격</th>
                <th className="py-3 px-4">담당 협력사</th>
                <th className="py-3 px-4">상태</th>
                <th className="py-3 px-4 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs text-zinc-900 dark:text-zinc-100">
              <tr>
                <td className="py-3 px-4 font-mono font-medium text-sky-600 dark:text-sky-400">PRD-2024-001</td>
                <td className="py-3 px-4 font-semibold">EV 하우징 커버 A</td>
                <td className="py-3 px-4 text-zinc-500">IONIQ-V / Aluminum</td>
                <td className="py-3 px-4">(주)신성금형</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">양산중</span>
                </td>
                <td className="py-3 px-4 text-right">
                  <button className="text-sky-600 hover:underline font-medium">상세</button>
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono font-medium text-sky-600 dark:text-sky-400">PRD-2024-002</td>
                <td className="py-3 px-4 font-semibold">배터리 팩 브래킷</td>
                <td className="py-3 px-4 text-zinc-500">EV-GEN2 / Steel</td>
                <td className="py-3 px-4">대원테크</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">금형개발</span>
                </td>
                <td className="py-3 px-4 text-right">
                  <button className="text-sky-600 hover:underline font-medium">상세</button>
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono font-medium text-sky-600 dark:text-sky-400">PRD-2024-003</td>
                <td className="py-3 px-4 font-semibold">도어 트림 어셈블리</td>
                <td className="py-3 px-4 text-zinc-500">SUV-PRO / Plastic</td>
                <td className="py-3 px-4">한양정밀</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">견적검토</span>
                </td>
                <td className="py-3 px-4 text-right">
                  <button className="text-sky-600 hover:underline font-medium">상세</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

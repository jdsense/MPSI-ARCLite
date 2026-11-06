"use client";

import React from "react";

export default function DynamicMenuPortalPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs">
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">대시보드1</h1>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          경로: /portal/project/page-373m · 상위 메뉴: 프로젝트 관리
        </p>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 p-6 flex flex-col justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">전체 프로젝트 건수</p>
              <h3 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">24 건</h3>
            </div>
            <div className="mt-4 flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <span>전월 대비 +12% 증가</span>
            </div>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 p-6 flex flex-col justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">금형 개발 건수</p>
              <h3 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">18 건</h3>
            </div>
            <div className="mt-4 flex items-center text-xs text-sky-600 dark:text-sky-400 font-medium">
              <span>진행 중: 12건 / 완료: 6건</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

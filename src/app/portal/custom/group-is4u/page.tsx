"use client";

import React from "react";

export default function DynamicMenuPortalPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs">
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">대시보드</h1>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          경로: /portal/custom/group-is4u
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">전체 프로젝트</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400 font-bold text-sm">📁</span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">24개</div>
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">+12% 전월 대비 증가</p>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">금형 개발 진행중</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 font-bold text-sm">⚙️</span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">10개</div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">정상 진행 9개 / 지연 1개</p>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">양산 협력사 연동</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 font-bold text-sm">🏭</span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">8개사</div>
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">모두 활성화 상태</p>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">시스템 가동률</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 font-bold text-sm">⚡</span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">99.8%</div>
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">안정적 운영 중</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

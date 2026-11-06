"use client";

import React from "react";

export default function CustomPortalPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs">
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">최근 3개월</h1>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          경로: /portal/admin/page-4vll · 좌측 메뉴 [시스템관리 &gt; 최근 3개월]에 연결된 페이지입니다.
        </p>
        <div className="mt-6 flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-950/40 p-8 text-center">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">현재 빈 페이지 상태입니다.</p>
          <p className="mt-1 text-xs text-zinc-400">
            우측 하단 ARC-WIZARD에서 이 화면의 타이틀이나 문구를 자유롭게 수정하거나 되돌릴 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

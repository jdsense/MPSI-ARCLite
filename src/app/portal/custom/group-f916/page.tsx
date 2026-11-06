"use client";

import React from "react";

export default function DynamicMenuPortalPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs">
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">테스트 그룹메뉴1</h1>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          경로: /portal/custom/group-f916
        </p>
        <div className="mt-6 flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-950/40 p-8 text-center">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
            [테스트 그룹메뉴1] 신규 메뉴 화면이 생성되었습니다.
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            시스템 최고 관리자 메뉴 에디트 모드에서 생성된 페이지입니다.
          </p>
        </div>
      </div>
    </div>
  );
}

import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

const CONFIG_PATH = path.join(process.cwd(), "src", "config", "menu-config.json");

function ensurePageFileForRoute(routeUrl: string, title: string, parentTitle?: string) {
  if (!routeUrl || !routeUrl.startsWith("/portal/")) return;
  const cleanRoute = routeUrl.replace(/\/+$/, "");
  const relDir = path.join("src", "app", ...cleanRoute.split("/").filter(Boolean));
  const absPage = path.join(process.cwd(), relDir, "page.tsx");
  if (fs.existsSync(absPage)) return;

  const pageContent = `"use client";

import React from "react";

export default function DynamicMenuPortalPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs">
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">${title.replace(/"/g, '\\"')}</h1>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          경로: ${cleanRoute}${parentTitle ? ` · 상위 메뉴: ${parentTitle.replace(/"/g, '\\"')}` : ""}
        </p>
        <div className="mt-6 flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-950/40 p-8 text-center">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
            [${title.replace(/"/g, '\\"')}] 신규 메뉴 화면이 생성되었습니다.
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            시스템 최고 관리자 메뉴 에디트 모드에서 생성된 페이지입니다.
          </p>
        </div>
      </div>
    </div>
  );
}
`;
  try {
    fs.mkdirSync(path.dirname(absPage), { recursive: true });
    fs.writeFileSync(absPage, pageContent, "utf-8");
  } catch {
    // ignore fs error
  }
}

export async function GET() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return NextResponse.json({ ok: true, menus: JSON.parse(raw) });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const menus = body.menus;
    if (!Array.isArray(menus)) {
      return NextResponse.json({ ok: false, error: "유효하지 않은 메뉴 데이터입니다." }, { status: 400 });
    }

    // 신규 추가된 메뉴 URL에 대해 실제 page.tsx 파일이 없으면 자동 생성
    for (const m of menus) {
      if (m.url && typeof m.url === "string") {
        ensurePageFileForRoute(m.url, String(m.title || "신규 메뉴"));
      }
      if (Array.isArray(m.submenus)) {
        for (const sub of m.submenus) {
          if (sub.url && typeof sub.url === "string") {
            ensurePageFileForRoute(sub.url, String(sub.title || "신규 하위 메뉴"), String(m.title || ""));
          }
        }
      }
    }

    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(menus, null, 2) + "\n", "utf-8");

    return NextResponse.json({ ok: true, menus });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}


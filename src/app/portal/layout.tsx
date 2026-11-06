"use client";

import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { LogOut, Clock, Sun, Moon, Sparkles, RefreshCw, ShieldAlert, ArrowLeft } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { NotificationCenter } from "@/components/layout/notification-center";
import { clearRoleSession, useAuthRole, hasStoredRoleSession, getHomePathForRole } from "@/lib/role-store";
import { usePermissionStore, getStoredMenuPermissions } from "@/lib/permission-store";
import {
  useMenuConfigStore,
  getDynamicMenuTitle,
  isUrlExplicitlyAllowedInMenuConfig,
} from "@/lib/menu-store";
import { ArcWizardFloating } from "@/components/vibe-coding/arc-wizard-floating";
import { ArcColumnOverrides } from "@/components/vibe-coding/arc-column-overrides";

interface HeaderAiUsage {
  date: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestCount: number;
  dailyTokenLimit: number;
  dailyRequestLimit: number;
  remainingTokens: number;
  remainingRequests: number;
  remainingPercent: number;
  lastCallTokens: number;
  lastModel: string;
  lastUpdatedAt: string;
}

// 📌 최신 MPSI SCM 서비스 구조에 맞춘 동적 경로별 페이지 타이틀 매핑
const PAGE_TITLES: Record<string, string> = {
  // 1. 대시보드 및 기초정보관리
  "/portal/dashboard": "대시보드",
  "/portal/basic-info": "기초정보관리",
  "/portal/basic-info/employee": "사원정보",
  "/portal/basic-info/customer": "고객정보",
  "/portal/basic-info/vendor": "공급업체정보",
  "/portal/basic-info/item": "품목정보",
  "/portal/basic-info/process": "공정정보",
  "/portal/basic-info/warehouse": "창고정보",

  // 2. 수주관리 및 프로젝트관리
  "/portal/sales-order": "수주관리",
  "/portal/sales-order/drawing-reception": "도면접수 및 검토",
  "/portal/project": "프로젝트 관리",

  // 3. 공정작업관리 (MPSI - 우성정공 - 뉴몰드 SCM 연동)
  "/portal/process": "공정작업관리",
  "/portal/process/process-status": "통합 공정 진행 현황",
  "/portal/process/inspect-approval": "시사출 & 검사 승인 (Pass/Fail)",
  "/portal/process/revision-request": "금형 수정 및 재시출 관리",

  // 4. 단품외주/구매관리 (MPSI 피드백 1번 반영)
  "/portal/outsourcing": "단품외주/구매관리",
  "/portal/outsourcing/order-status": "단품외주 및 구매 발주 현황",
  "/portal/outsourcing/partner-delivery": "거래처 납품/입고 관리 (공유용)",

  // 5. 완제품 납품/마감 관리 및 배송현황
  "/portal/delivery-close": "완제품/납품 마감 관리",
  "/portal/delivery-status": "배송현황",

  // 6. 승인자 및 시스템 관리
  "/portal/approver": "승인 대시보드",
  "/portal/admin": "통합 제어 센터 (최고관리자)",
  "/portal/admin/users": "계정관리 (C991000)",
  "/portal/admin/permissions": "권한관리 (C992000)",
  "/portal/admin/blank": "빈 페이지",
};

function PortalHeader({
  timeString,
  isAccessDenied,
  dynamicTitle,
}: {
  timeString: string;
  isAccessDenied?: boolean;
  dynamicTitle?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { role } = useAuthRole();
  const isAdmin = role === "ADMIN";
  const [aiUsage, setAiUsage] = useState<HeaderAiUsage | null>(null);
  const [showUsageDetail, setShowUsageDetail] = useState(false);

  const fetchUsage = async () => {
    try {
      const res = await fetch("/api/v1/vibe-coding/apply");
      const data = await res.json();
      if (data?.usage) setAiUsage(data.usage);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchUsage();
    const handler = (e: Event) => {
      const ce = e as CustomEvent<HeaderAiUsage>;
      if (ce.detail) setAiUsage(ce.detail);
      else fetchUsage();
    };
    window.addEventListener("arc-wizard-usage-updated", handler);
    return () => window.removeEventListener("arc-wizard-usage-updated", handler);
  }, [isAdmin]);

  // 현재 경로에 맞는 타이틀 찾기 (에디트 모드에서 수정된 메뉴명을 최우선 적용)
  const currentTitle = isAccessDenied
    ? "접근 권한 없음 (Access Denied)"
    : dynamicTitle || PAGE_TITLES[pathname] || "ARCFORGE PLATFORM";

  const handleLogout = () => {
    clearRoleSession();
    router.push("/auth/login");
  };

  return (
    <header className="flex h-14 items-center justify-between border-b px-6 bg-white dark:bg-zinc-900 shrink-0 transition-colors duration-300">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <SidebarTrigger className="shrink-0" />
        
        <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 shrink-0" />
        
        {/* 동적 페이지 타이틀 표시 */}
        <div className="flex items-center gap-2 truncate">
          <h1 className="text-base font-bold text-zinc-800 dark:text-zinc-100 truncate">
            {currentTitle}
          </h1>
        </div>
      </div>
      
      {/* 우측: 타임 컨트롤러 및 포탈 액션 */}
      <div className="flex items-center gap-3 shrink-0 pl-4">
        {/* 시스템 최고 관리자 전용 AI Usage 토큰 사용량 & 잔여량 표시 */}
        {isAdmin && aiUsage && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUsageDetail((v) => !v)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-xs hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
              title="클릭하여 AI 토큰 사용량 및 잔여 한도 상세 보기"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="font-semibold text-emerald-900 dark:text-emerald-200">Usage:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  {aiUsage.totalTokens.toLocaleString()} tok
                </span>
                <span className="text-zinc-400">|</span>
                <span className="text-sky-700 dark:text-sky-300 font-bold">
                  잔여 {aiUsage.remainingPercent}% ({(aiUsage.remainingTokens / 1000).toFixed(1)}k)
                </span>
              </div>
              <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden hidden sm:block">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${aiUsage.remainingPercent}%` }}
                />
              </div>
            </button>

            {showUsageDetail && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl p-3.5 z-50 text-xs space-y-2.5">
                <div className="flex items-center justify-between border-b pb-2 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                    <span>ARC-WIZARD 토큰 사용량</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchUsage()}
                    className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                    title="새로고침"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                </div>

                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-zinc-500 font-sans">활성 AI 모델</span>
                    <span className="font-bold text-sky-600 dark:text-sky-400">{aiUsage.lastModel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 font-sans">오늘 사용한 토큰</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-100">
                      {aiUsage.totalTokens.toLocaleString()} / {aiUsage.dailyTokenLimit.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 font-sans">남은 토큰 (잔여량)</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {aiUsage.remainingTokens.toLocaleString()} ({aiUsage.remainingPercent}%)
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span className="font-sans">↳ 입력 / 출력 토큰</span>
                    <span>
                      In {aiUsage.promptTokens.toLocaleString()} · Out {aiUsage.completionTokens.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t dark:border-zinc-800">
                    <span className="text-zinc-500 font-sans">오늘 API 호출 횟수</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-100">
                      {aiUsage.requestCount.toLocaleString()}회 (잔여 {aiUsage.remainingRequests.toLocaleString()}회)
                    </span>
                  </div>
                </div>

                <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all"
                    style={{ width: `${aiUsage.remainingPercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  * Gemini Flash 일일 한도(1,000,000 토큰 / 1,500 요청) 기준 실시간 누적 및 잔여량입니다.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 상단 업무 메모 알림 센터 */}
        <NotificationCenter />

        {/* 현재 시각 시계 */}
        <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 px-2.5 py-1 rounded-md border dark:border-zinc-700">
          <Clock className="h-3.5 w-3.5 text-zinc-400" />
          <span className="min-w-[170px] font-mono">{timeString || "Loading..."}</span>
        </div>

        {/* 테마 변경 토글 */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md shrink-0"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="테마 변경"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-amber-500 transition-all" />
          ) : (
            <Moon className="h-4 w-4 text-zinc-600 transition-all" />
          )}
        </Button>
        
        <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />

        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 gap-1.5 text-xs text-zinc-500 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          onClick={handleLogout}
        >
          <LogOut className="h-3.5 w-3.5" />
          로그아웃
        </Button>
      </div>
    </header>
  );
}

export default function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [timeString, setTimeString] = useState("");
  const { role, vendorName, isAuthenticated } = useAuthRole();
  const { menuPermissions } = usePermissionStore();
  const { menus: masterMenus } = useMenuConfigStore();
  const dynamicTitle = getDynamicMenuTitle(pathname, masterMenus);

  useEffect(() => {
    setMounted(true);
    const updateClock = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }) +
        " " +
        now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
      );
    };
    updateClock();
    const timerId = setInterval(updateClock, 1000);
    return () => clearInterval(timerId);
  }, []);

  // 1. 로그인 전 상태에서 URL로 /portal/* 직접 접근 시 즉시 로그인 페이지(/auth/login)로 이동
  useEffect(() => {
    if (!mounted) return;
    if (!hasStoredRoleSession()) {
      router.replace("/auth/login");
      return;
    }
    // 기본 포털 루트(/portal 또는 /portal/dashboard) 진입 시 역할별 프로젝트 관리 페이지로 이동
    if (pathname === "/portal" || pathname === "/portal/dashboard") {
      router.replace(getHomePathForRole(role));
    }
  }, [mounted, isAuthenticated, pathname, role, router]);

  // 🛡️ [역할별 URL 직접 접근 엄격 차단 가드 + 메뉴 에디트 모드 권한 연동]
  const isRoleRouteForbidden = (() => {
    if (role === "ADMIN") return false;
    // 1. 최고관리자가 메뉴 에디트 모드에서 명시적으로 설정한 메뉴 권한(menu-config.json) 우선 확인
    const explicit = isUrlExplicitlyAllowedInMenuConfig(pathname, role, masterMenus);
    if (explicit === true) return false;
    if (explicit === false) return true;

    // 2. 메뉴 설정에 없는 세부 URL은 역할별 기본 경로 격리 적용
    if (role === "VENDOR_MOLD") {
      return !pathname.startsWith("/portal/vendor-portal/mold/");
    }
    if (role === "VENDOR_MASS") {
      return !pathname.startsWith("/portal/vendor-portal/mass/");
    }
    if (role === "MPSI") {
      if (pathname.startsWith("/portal/admin")) return true;
      if (pathname.startsWith("/portal/vendor-portal/")) return true;
      return false;
    }
    return false;
  })();

  // 권한관리 매트릭스(permission-store)에서 canRead === false 로 설정된 메뉴 추가 검사
  let isForbiddenByPermission = false;
  if (!isRoleRouteForbidden && role !== "ADMIN") {
    const perms = menuPermissions && menuPermissions.length > 0 ? menuPermissions : getStoredMenuPermissions();
    let checkUrl = pathname;
    if (pathname.includes("/vendor-portal/mold/")) {
      const suffix = pathname.replace("/portal/vendor-portal/mold/", "");
      checkUrl = suffix === "projects" ? "/portal/vendor-portal/mold/projects" : `/portal/mold-dev/${suffix}`;
    } else if (pathname.includes("/vendor-portal/mass/")) {
      const suffix = pathname.replace("/portal/vendor-portal/mass/", "");
      checkUrl = suffix === "projects" ? "/portal/vendor-portal/mass/projects" : `/portal/mass-prod/${suffix}`;
    }

    const matched = perms.find((m) => m.url === checkUrl || m.url === pathname);
    if (matched) {
      const rPerm = matched.permissions[role];
      if (rPerm && rPerm.canRead === false) {
        isForbiddenByPermission = true;
      }
    }
  }

  const isAccessDenied = mounted && (isRoleRouteForbidden || isForbiddenByPermission);
  const homePath = getHomePathForRole(role);

  if (!mounted || !hasStoredRoleSession()) return null;

  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <PortalHeader timeString={timeString} isAccessDenied={isAccessDenied} dynamicTitle={dynamicTitle} />
          <div className="flex-1 overflow-y-auto p-6">
            {isAccessDenied ? (
              <div className="flex min-h-[460px] flex-col items-center justify-center text-center p-8 bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-900/50 rounded-2xl shadow-xs">
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 border border-rose-200 dark:border-rose-900/70 mb-4">
                  <ShieldAlert className="h-10 w-10 animate-pulse" />
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 mb-2">
                  HTTP 403 FORBIDDEN · URL 직접 접근 차단
                </span>
                <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                  권한이 없는 화면입니다. URL 직접 접근이 차단되었습니다.
                </h2>
                <p className="mt-2 text-xs text-zinc-500 max-w-md leading-relaxed">
                  현재 로그인된 소속/권한(<b>{vendorName} · {role}</b>)으로는 요청하신 경로(<code>{pathname}</code>)에 접속하실 수 없습니다.
                  <br />
                  허용된 전용 프로젝트 관리 화면으로 이동해 주세요.
                </p>
                <div className="mt-6 flex items-center gap-2">
                  <Button
                    onClick={() => router.replace(homePath)}
                    variant="default"
                    className="h-9 px-4 text-xs gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    내 프로젝트 관리 화면으로 이동
                  </Button>
                </div>
              </div>
            ) : (
              children
            )}
          </div>
          {/* 시스템 관리자 전용 우측 하단 플로팅 AI 바이브 코딩 위젯 */}
          <ArcWizardFloating />
          {/* ARC-WIZARD 숨김 컬럼 설정 적용 (모든 사용자 공통) */}
          <ArcColumnOverrides />
        </main>
      </div>
    </SidebarProvider>
  );
}

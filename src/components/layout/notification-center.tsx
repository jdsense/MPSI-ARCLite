"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Bell, CheckCircle2, ArrowRight, Building2, 
  Clock, X, Check, ExternalLink, ShieldAlert,
  Inbox, Sparkles, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthRole } from "@/lib/role-store";
import { 
  useNotificationStore, 
  filterNotificationsForAccount,
  AppNotification 
} from "@/lib/notification-store";

export function NotificationCenter() {
  const router = useRouter();
  const { role, vendorName } = useAuthRole();
  const { 
    notifications, 
    confirmNotification, 
    confirmAllNotifications 
  } = useNotificationStore(role, vendorName);

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"UNCONFIRMED" | "CONFIRMED">("UNCONFIRMED");
  const popoverRef = useRef<HTMLDivElement>(null);

  // 현재 로그인된 계정에 수신된 알림 필터링 ("이 알림은 자기 계정에 해당하는 알림만 확인 가능해야돼")
  const myNotifications = filterNotificationsForAccount(notifications, role, vendorName);

  const unconfirmedList = myNotifications.filter((n) => !n.isConfirmed);
  const confirmedList = myNotifications.filter((n) => n.isConfirmed);

  const currentDisplayList = activeTab === "UNCONFIRMED" ? unconfirmedList : confirmedList;

  // 외부 클릭 시 팝오버 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // 알림 클릭 시 해당 메뉴로 이동 ("알림을 클릭하면 해당하는 메뉴로 이동되었으면 좋겠어")
  const handleNavigateToMenu = (notification: AppNotification) => {
    setIsOpen(false);
    router.push(notification.menuPath);
  };

  // 알림 확인 처리 ("알림 확인을 누르기 전까지 알림은 사라지지않고 계속 남아 있어야해")
  const handleConfirm = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    confirmNotification(id);
  };

  // 전체 확인 처리
  const handleConfirmAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    confirmAllNotifications(role, vendorName);
  };

  const getRoleDisplayName = () => {
    if (role === "MPSI") return "MPSI 본사 총괄";
    if (role === "VENDOR_MOLD") return `[금형협력] ${vendorName}`;
    if (role === "VENDOR_MASS") return `[양산협력] ${vendorName}`;
    return "시스템 관리국";
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* 상단 알림 트리거 버튼 (스크린샷 핑크 박스 위치 100% 매칭) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer border ${
          unconfirmedList.length > 0
            ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700 hover:bg-rose-100 shadow-xs"
            : "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100"
        }`}
        title={`업무 알림 (미확인: ${unconfirmedList.length}건)`}
      >
        <Bell className={`h-3.5 w-3.5 ${unconfirmedList.length > 0 ? "text-rose-600 animate-bounce" : "text-zinc-400"}`} />
        <span className="font-semibold text-xs">알림</span>
        {unconfirmedList.length > 0 && (
          <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-mono text-[10px] font-black shrink-0">
            {unconfirmedList.length}
          </span>
        )}
      </button>

      {/* 알림 드롭다운 팝오버 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 sm:w-[440px] max-h-[580px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2">
          
          {/* 1. 팝오버 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-rose-500/20 text-rose-400">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm">업무 메모 알림 센터</h4>
                  {unconfirmedList.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white">
                      {unconfirmedList.length}건 미확인
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3 w-3" />
                  <span>수신 계정: <b>{getRoleDisplayName()}</b></span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* 2. 탭 및 전체 확인 액션 바 */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-700 text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab("UNCONFIRMED")}
                className={`px-2.5 py-1 rounded font-bold text-xs transition-colors cursor-pointer ${
                  activeTab === "UNCONFIRMED"
                    ? "bg-white dark:bg-zinc-900 text-rose-700 dark:text-rose-400 shadow-xs border border-rose-200 dark:border-rose-900/60"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                미확인 알림 ({unconfirmedList.length})
              </button>
              <button
                onClick={() => setActiveTab("CONFIRMED")}
                className={`px-2.5 py-1 rounded font-bold text-xs transition-colors cursor-pointer ${
                  activeTab === "CONFIRMED"
                    ? "bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-xs border border-emerald-200 dark:border-emerald-900/60"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                확인 완료 ({confirmedList.length})
              </button>
            </div>

            {activeTab === "UNCONFIRMED" && unconfirmedList.length > 0 && (
              <Button
                size="xs"
                variant="outline"
                onClick={handleConfirmAll}
                className="h-6 px-2 text-[10.5px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-700 gap-1 cursor-pointer"
              >
                <Check className="h-3 w-3 text-emerald-600" />
                전체 확인
              </Button>
            )}
          </div>

          {/* 3. 알림 목록 */}
          <div className="p-3 flex flex-col gap-2.5 overflow-y-auto max-h-[420px]">
            {currentDisplayList.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-zinc-400">
                <Inbox className="h-8 w-8 text-zinc-300" />
                <p className="text-xs font-medium">
                  {activeTab === "UNCONFIRMED" ? "미확인 업무 알림이 없습니다." : "확인 완료된 알림 내역이 없습니다."}
                </p>
                <span className="text-[10px] text-zinc-400">
                  {activeTab === "UNCONFIRMED" ? "새로운 메모가 등록되면 이곳에 수신됩니다." : "확인한 알림은 이력으로 보관됩니다."}
                </span>
              </div>
            ) : (
              currentDisplayList.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg border transition-all flex flex-col gap-2 shadow-2xs ${
                    !item.isConfirmed
                      ? "bg-white dark:bg-zinc-900 border-rose-200 dark:border-rose-900/60 hover:border-rose-400"
                      : "bg-slate-50/60 dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-700 opacity-80"
                  }`}
                >
                  {/* 알림 상단: 메뉴명 + 보낸회사명 + 일시 */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* 메뉴명 */}
                        <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-bold">
                          {item.menuName}
                        </span>
                        {item.projectNo && (
                          <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-mono font-bold">
                            {item.projectNo}
                          </span>
                        )}
                        {!item.isConfirmed ? (
                          <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[9px] font-bold">
                            미확인
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                            확인완료
                          </span>
                        )}
                      </div>

                      {/* 보낸회사명 (사용자 이름 제외, 회사명 단독 표시) */}
                      <div className="text-[11px] font-medium text-slate-800 dark:text-zinc-200 flex items-center gap-1">
                        <span className="text-slate-500 dark:text-zinc-400 text-[10px]">보낸회사:</span>
                        <b className="text-slate-900 dark:text-white font-bold">{item.senderCompany}</b>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 shrink-0">
                      <Clock className="h-3 w-3" />
                      <span>{item.createdAt}</span>
                    </div>
                  </div>

                  {/* 알림 내용 (메모 본문) */}
                  <div className="bg-slate-50 dark:bg-zinc-800/80 p-2.5 rounded-md border border-slate-200 dark:border-zinc-700 text-xs text-slate-800 dark:text-zinc-200 leading-relaxed font-sans">
                    {item.content}
                  </div>

                  {/* 하단 액션 버튼: 해당 메뉴로 이동 + 알림 확인 버튼 */}
                  <div className="flex items-center justify-between pt-1 gap-2 border-t border-slate-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => handleNavigateToMenu(item)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 hover:underline cursor-pointer"
                    >
                      <span>해당 메뉴로 이동</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>

                    {!item.isConfirmed ? (
                      <Button
                        size="xs"
                        onClick={(e) => handleConfirm(e, item.id)}
                        className="h-6 px-2.5 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 cursor-pointer shadow-2xs"
                        title="알림 확인 (확인을 누르면 미확인 목록에서 제외됩니다)"
                      >
                        <Check className="h-3 w-3" />
                        <span>알림 확인</span>
                      </Button>
                    ) : (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        확인 완료됨
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 4. 팝오버 푸터 안내 ("영구 보존" 표현 제외) */}
          <div className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 border-t border-slate-200 dark:border-zinc-700 text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>* <b>[알림 확인]</b>을 누르기 전까지 알림 목록에 유지됩니다.</span>
            <span className="font-mono text-[10px] text-slate-400">MPSI 알림 통보망</span>
          </div>

        </div>
      )}
    </div>
  );
}


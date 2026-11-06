"use client";

import { useState, useEffect, useCallback } from "react";
import { RoleType } from "./role-store";

// 1. 공통 업무 알림 인터페이스 (사용자 이름 없이 회사명만 사용)
export interface AppNotification {
  id: string;
  menuName: string;          // 메뉴명 (예: "양산외주 - 양산견적관리", "금형외주 - 시사출육성")
  menuPath: string;          // 이동할 메뉴 경로 (예: "/portal/vendor-portal/mass/quotation")
  senderCompany: string;     // 보낸 회사명 (예: "MPSI", "(주)뉴몰드", "우성정공(주)")
  senderName?: string;       // 호환용 (회사명과 동일)
  content: string;           // 알림 내용 (메모 내용 및 이벤트 안내)
  projectNo?: string;        // 프로젝트 관리번호 (예: "MI26005P0")
  targetRole: RoleType | "ALL"; // 수신 대상 계정 권한 ("MPSI" | "VENDOR_MOLD" | "VENDOR_MASS" | "ALL")
  targetVendorName?: string; // 특정 업체 대상 (예: "(주)뉴몰드", "우성정공(주)")
  createdAt: string;         // 등록 일시
  isConfirmed: boolean;      // 확인 여부
  confirmedAt?: string;      // 확인 완료 일시
}

const STORAGE_KEY = "mpsi_app_notifications_v2";
const SYNC_EVENT = "mpsi_notification_sync";

// 2. 계정별 알림 필터링 헬퍼 함수
export function filterNotificationsForAccount(
  notifications: AppNotification[],
  role: RoleType,
  vendorName: string
): AppNotification[] {
  return notifications.filter((item) => {
    if (role === "ADMIN") return true;
    if (item.targetRole === "ALL") return true;

    if (item.targetRole === role) {
      if (item.targetVendorName) {
        const cleanTarget = item.targetVendorName.replace(/[\(\)\s]/g, "");
        const cleanVendor = (vendorName || "").replace(/[\(\)\s]/g, "");
        return cleanTarget.includes(cleanVendor) || cleanVendor.includes(cleanTarget);
      }
      return true;
    }
    return false;
  });
}

// 3. 어디서나 호출 가능한 전역 알림 발송 함수 (백엔드 PostgreSQL DB 연동)
export async function sendAppNotification(data: {
  menuName: string;
  menuPath: string;
  senderCompany?: string; // 회사명만 전달 (사용자 이름 제외)
  senderName?: string;    // 하위 호환
  content: string;
  projectNo?: string;
  projectId?: string;     // projectNo와 상호 호환
  targetRole: RoleType | "ALL";
  targetVendorName?: string;
}) {
  try {
    const rawCompany = data.senderCompany || data.senderName || "MPSI";
    const cleanCompany = rawCompany.replace(
      /\s+[가-힣]+(\s*(차장|부장|과장|대리|팀장|이사|수석|대표|전결|사원))?/g,
      ""
    ).trim();

    const payload = {
      menuName: data.menuName,
      menuPath: data.menuPath,
      content: data.content,
      targetRole: data.targetRole,
      targetVendorName: data.targetVendorName,
      projectNo: data.projectNo || data.projectId,
      senderCompany: cleanCompany || "MPSI",
    };

    const res = await fetch("/api/v1/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const json = await res.json();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: json.data }));
      }
      return json.data;
    }
  } catch (err) {
    console.warn("sendAppNotification error:", err);
  }
}

// 하위 호환용 alias
export const dispatchGlobalNotification = sendAppNotification;

// 4. 알림 상태 관리 커스텀 훅 (DB 실시간 연동)
export function useNotificationStore(role?: RoleType, vendorName?: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // DB로부터 최신 알림 목록 불러오기
  const refreshFromDb = useCallback(async (currentRole?: RoleType, currentVendor?: string) => {
    setIsLoading(true);
    const targetRole = currentRole || role || "MPSI";
    const targetVendor = currentVendor || vendorName || "";

    try {
      const url = `/api/v1/notifications?role=${encodeURIComponent(targetRole)}&vendorName=${encodeURIComponent(targetVendor)}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setNotifications(json.data);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data));
          } catch {}
          setIsLoaded(true);
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn("Failed to fetch notifications from DB:", err);
    }

    // Fallback: 로컬 스토리지
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setNotifications(JSON.parse(stored));
      }
    } catch {}
    setIsLoaded(true);
    setIsLoading(false);
  }, [role, vendorName]);

  useEffect(() => {
    refreshFromDb();

    const handleSync = () => {
      refreshFromDb();
    };

    window.addEventListener(SYNC_EVENT, handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener(SYNC_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [refreshFromDb]);

  // 개별 알림 확인 처리 (DB 연동)
  const confirmNotification = async (id: string) => {
    // 낙관적 UI 업데이트
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isConfirmed: true } : n))
    );

    try {
      await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      window.dispatchEvent(new CustomEvent(SYNC_EVENT));
    } catch (err) {
      console.warn("confirmNotification error:", err);
    }
  };

  // 모든 알림 일괄 확인 처리 (DB 연동)
  const confirmAllNotifications = async (activeRole: RoleType, activeVendor: string) => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isConfirmed: true }))
    );

    try {
      await fetch("/api/v1/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true, role: activeRole, vendorName: activeVendor }),
      });
      window.dispatchEvent(new CustomEvent(SYNC_EVENT));
    } catch (err) {
      console.warn("confirmAllNotifications error:", err);
    }
  };

  return {
    notifications,
    isLoaded,
    isLoading,
    refreshFromDb,
    sendAppNotification,
    addNotification: sendAppNotification, // 하위 호환
    confirmNotification,
    confirmAllNotifications,
  };
}

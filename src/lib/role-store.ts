"use client";

import { useState, useEffect } from "react";
import { getCurrentNodeConfig, NodeConfig } from "@/config/node-config";

// 1. 시스템 사용자 권한 유형
export type RoleType = "MPSI" | "VENDOR_MOLD" | "VENDOR_MASS" | "ADMIN";

// 2. 금형제작 및 사출양산 등록 협력업체 마스터 (외주업체는 변수 + MPSI 자체생산)
export interface VendorItem {
  id: string;
  name: string;
  isSelf: boolean;
  type?: "IN_HOUSE" | "OUTSOURCING";
  bizNo?: string;
  manager?: string;
  tel?: string;
}

export const MOLD_VENDOR_LIST: VendorItem[] = [
  { id: "MPSI_SELF_MOLD", name: "MPSI 자체제작팀", isSelf: true, type: "IN_HOUSE", manager: "김자체 부장", tel: "02-555-0101" },
  { id: "WOOSUNG", name: "우성정공(주)", isSelf: false, type: "OUTSOURCING", bizNo: "123-81-45678", manager: "배희섭 수석", tel: "031-492-1234" },
  { id: "DAEHAN", name: "대한금형정공", isSelf: false, type: "OUTSOURCING", bizNo: "214-85-98765", manager: "정진우 이사", tel: "032-811-5678" },
  { id: "SAMWOO", name: "(주)삼우정밀", isSelf: false, type: "OUTSOURCING", bizNo: "135-86-34567", manager: "박성호 차장", tel: "031-987-6543" },
  { id: "SHINYOUNG", name: "신영테크", isSelf: false, type: "OUTSOURCING", bizNo: "119-82-78901", manager: "이동혁 대표", tel: "031-356-7890" },
];

export const MASS_VENDOR_LIST: VendorItem[] = [
  { id: "MPSI_SELF_MASS", name: "MPSI 자체사출라인", isSelf: true, type: "IN_HOUSE", manager: "이생산 차장", tel: "02-555-0102" },
  { id: "NEWMOLD", name: "(주)뉴몰드", isSelf: false, type: "OUTSOURCING", bizNo: "130-86-54321", manager: "최진호 팀장", tel: "031-498-8888" },
  { id: "SEWON", name: "세원사출(주)", isSelf: false, type: "OUTSOURCING", bizNo: "220-81-67890", manager: "강동원 부장", tel: "032-567-1122" },
  { id: "JEIL", name: "제일프라테크", isSelf: false, type: "OUTSOURCING", bizNo: "128-85-11223", manager: "윤태호 이사", tel: "031-678-9900" },
  { id: "HANIL", name: "한일엔프라", isSelf: false, type: "OUTSOURCING", bizNo: "110-82-44556", manager: "송재민 과장", tel: "041-555-7788" },
];

export interface RoleSession {
  role: RoleType;
  vendorName: string;
  userName: string;
  userTitle: string;
}

export function getDefaultSessionForNode(): RoleSession {
  const node = getCurrentNodeConfig();
  if (node.nodeType === "VENDOR_MOLD") {
    return {
      role: "VENDOR_MOLD",
      vendorName: node.nodeName || "우성정공(주)",
      userName: "배희섭 금형팀장",
      userTitle: `${node.nodeName} 기술개발팀`,
    };
  }
  if (node.nodeType === "VENDOR_MASS") {
    return {
      role: "VENDOR_MASS",
      vendorName: node.nodeName || "(주)뉴몰드",
      userName: "최진호 양산팀장",
      userTitle: `${node.nodeName} 사출품질팀`,
    };
  }
  return {
    role: "MPSI",
    vendorName: "MPSI 본사",
    userName: "김민수 총괄이사",
    userTitle: "MPSI SCM 총괄 관제",
  };
}

const STORAGE_KEY = "mpsi_auth_role_session";
const EVENT_NAME = "mpsi_auth_role_change";

/** 역할별 기본 프로젝트 관리(메인) 페이지 경로 반환 */
export function getHomePathForRole(role?: RoleType | string | null): string {
  if (role === "VENDOR_MOLD") return "/portal/vendor-portal/mold/projects";
  if (role === "VENDOR_MASS") return "/portal/vendor-portal/mass/projects";
  return "/portal/project"; // MPSI 본사 및 ADMIN 기본 프로젝트 관리 페이지
}

/** 현재 브라우저에 실제 로그인된 세션이 존재하는지 확인 */
export function hasStoredRoleSession(): boolean {
  const node = getCurrentNodeConfig();
  if (node.isStandalone) return true;
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed && parsed.role);
  } catch {
    return false;
  }
}

export function getStoredRole(): RoleSession {
  const defaultSession = getDefaultSessionForNode();
  const node = getCurrentNodeConfig();

  if (typeof window === "undefined") return defaultSession;
  try {
    // 독립 설치 외주 노드(우성정공/뉴몰드)인 경우 타 역할 침범 방지 및 강제 보정
    if (node.isStandalone) {
      if (node.nodeType === "VENDOR_MOLD") {
        return {
          role: "VENDOR_MOLD",
          vendorName: node.nodeName,
          userName: "배희섭 금형팀장",
          userTitle: `${node.nodeName} 기술개발팀`,
        };
      }
      if (node.nodeType === "VENDOR_MASS") {
        return {
          role: "VENDOR_MASS",
          vendorName: node.nodeName,
          userName: "최진호 양산팀장",
          userTitle: `${node.nodeName} 사출품질팀`,
        };
      }
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultSession;
    }
    return JSON.parse(raw);
  } catch (e) {
    return defaultSession;
  }
}

export function saveRoleSession(session: RoleSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    document.cookie = `mpsi_auth_role=${encodeURIComponent(session.role)}; path=/; max-age=86400; SameSite=Lax`;
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: session }));
  } catch (e) {
    console.error("Failed to save role session", e);
  }
}

export function clearRoleSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    document.cookie = "mpsi_auth_role=; path=/; max-age=0; SameSite=Lax";
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: null }));
  } catch (e) {
    console.error("Failed to clear role session", e);
  }
}

// React 커스텀 훅
export function useAuthRole() {
  const [session, setSession] = useState<RoleSession>(() => getStoredRole());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => hasStoredRoleSession());
  const nodeConfig = getCurrentNodeConfig();

  useEffect(() => {
    setSession(getStoredRole());
    setIsAuthenticated(hasStoredRoleSession());

    const handleUpdate = () => {
      setSession(getStoredRole());
      setIsAuthenticated(hasStoredRoleSession());
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const switchRole = (newRole: RoleType, vendorName?: string) => {
    // 독립 설치 외주 노드인 경우 역할 전환 차단
    if (nodeConfig.isStandalone) {
      console.warn("독립 설치 인스턴스에서는 시스템 역할을 전환할 수 없습니다.");
      return session;
    }

    let name = vendorName || "";
    let userName = "담당자";
    let userTitle = "";

    if (newRole === "MPSI") {
      name = "MPSI 본사";
      userName = "김민수 총괄이사";
      userTitle = "MPSI 총괄 관제";
    } else if (newRole === "VENDOR_MOLD") {
      name = vendorName || "우성정공(주)";
      userName = "배희섭 금형팀장";
      userTitle = `${name} 기술개발팀`;
    } else if (newRole === "VENDOR_MASS") {
      name = vendorName || "(주)뉴몰드";
      userName = "최진호 양산팀장";
      userTitle = `${name} 사출품질팀`;
    } else if (newRole === "ADMIN") {
      name = "시스템관리국";
      userName = "시스템 최고관리자";
      userTitle = "SCM / 통합제어";
    }

    const nextSession: RoleSession = {
      role: newRole,
      vendorName: name,
      userName,
      userTitle,
    };

    saveRoleSession(nextSession);
    setSession(nextSession);
    setIsAuthenticated(true);
    return nextSession;
  };

  return {
    ...session,
    isAuthenticated,
    nodeConfig,
    switchRole,
  };
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { dispatchGlobalNotification } from "./notification-store";
import { SyncService } from "@/services/sync-service";

// 금형 가공 공정 세부 인터페이스 (7대 핵심 공정: GUN, CNC, ML, HT, PL, WR, ASSY)
export interface ProcessStep {
  code: "GUN" | "CNC" | "ML" | "HT" | "PL" | "WR" | "ASSY";
  name: string;
  planDate: string;
  actualDate: string;
  progress: number; // 0 ~ 100%
  status: "대기" | "진행중" | "완료" | "지연";
}

// 5대 금형 제작 진행 현황 상태
export type MoldManufactureStatus = "미입력" | "금형 설계 중" | "가공 중" | "습합 중" | "금형 육성 중";

// 일정표 엑셀 첨부 파일 인터페이스
export interface ManufactureScheduleFile {
  fileName: string;
  fileSize?: string;
  uploadedAt: string;
  uploadedBy: string; // 예: "우성정공 한승호부장"
  fileUrl?: string;
}

// 업무 이력 메모 인터페이스
export interface ManufactureMemoLog {
  id: string;
  authorId?: string;
  authorName: string; // 예: "우성정공 한승호부장"
  company: string;    // 예: "우성정공(주)"
  tag?: string;       // 예: "261010.제작일정표"
  content: string;    // 예: "상측 방전가공 지연, 상/하측 코어 CNC 2차 정밀가공 75% 진행"
  createdAt: string;  // 예: "2026.10.10 10:54"
  attachedFileName?: string;
  attachedFileUrl?: string;
}

// 금형 제작 진행 현황 항목 인터페이스 (MPSI 본사 ↔ 금형외주업체 공유)
export interface MoldManufactureItem {
  id: number;
  projectNo: string;        // MPSI 프로젝트 번호 (MI26005P0 등)
  moldNo?: string;          // 금형번호
  moldDegree?: string;      // 금형차수 (예: M1, M2 등)
  changeType?: string;      // 신작/설변 (예: N001, E001 등)
  projectName: string;      // 프로젝트 / 차종명
  productName: string;      // 제품명
  customerName: string;     // 원청 고객사
  moldVendor: string;       // 금형제작사 (외주협력사 또는 MPSI 자체제작팀)
  cavity: string;           // Cavity (예: 1*2 Cavity)
  material: string;         // 금형강재 (예: NAK80 / KP4M)
  targetT1Date: string;     // 목표 T1 시사출일
  moldDeliveryDate?: string; // 금형 출고 납기
  // 공정 4: MPSI 공식 금형 발주 정보
  moldPoNo: string;         // MPSI 금형발주번호 (PO)
  orderDate: string;        // 발주일자
  orderAmount: number;      // 발주금액 (원)
  
  // 6번 단계 핵심: 금형 제작 현황 (미입력 | 금형 설계 중 | 가공 중 | 습합 중 | 금형 육성 중)
  manufactureStatus: MoldManufactureStatus;

  // 일정표 엑셀 파일 (금형처 업로드 ↔ MPSI 다운로드)
  scheduleFile?: ManufactureScheduleFile;

  // 업무 이력 메모 목록
  memoLogs: ManufactureMemoLog[];

  // 내부 공정 진행률 및 7대 세부 공정 목록
  coreStatus: "대기" | "코어가공중" | "코어가공완료";
  coreProgress: number;     // 코어 가공 진행률 (%)
  assyStatus: "대기" | "금형조립중" | "금형조립완료";
  assyProgress: number;     // 금형 조립 진행률 (%)
  overallProgress: number;  // 전체 금형제작 진행률 (%)
  scheduleStatus: "정상" | "단축" | "지연주의" | "지연";
  currentStep: number;      // 13단계 중 위치 (6단계: 금형 가공착수)
  processes: ProcessStep[];
  updatedAt: string;
  notes?: string;           // 외주사 현장 작업 특이사항
  newmoldPreShare?: boolean; // 양산처 사전공유 여부
  moldDesignFile?: string;  // 3D 금형설계 출도 파일명
}

const STORAGE_KEY = "mpsi_mold_manufactures_v3";
const EVENT_NAME = "mpsi_mold_manufacture_update_v3";

export function getManufactureStatusBadge(status: MoldManufactureStatus | string) {
  switch (status) {
    case "금형 설계 중":
      return "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold";
    case "가공 중":
      return "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 font-bold";
    case "습합 중":
      return "bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold";
    case "금형 육성 중":
      return "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 font-bold";
    case "미입력":
    default:
      return "bg-zinc-100 text-zinc-500 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 font-medium";
  }
}

// 더미 데이터 초기값 전면 비움
export const INITIAL_MOLD_MANUFACTURES: MoldManufactureItem[] = [];

// 더미 판별 헬퍼
function isDummyManufacture(item: any): boolean {
  if (!item) return true;
  const pNo = String(item.projectNo || "");
  const pName = String(item.projectName || "");
  if (
    pNo.includes("MI25001") ||
    pNo.includes("MI26001") ||
    pNo.includes("MI26002") ||
    pNo.includes("MI26003") ||
    pName.includes("NQ5") ||
    pName.includes("현대 NT5") ||
    pName.includes("A2XT") ||
    pName.includes("SPX")
  ) {
    return true;
  }
  return false;
}

export function getStoredMoldManufactures(): MoldManufactureItem[] {
  if (typeof window === "undefined") return [];
  try {
    localStorage.removeItem("mpsi_mold_manufactures_v1");
    localStorage.removeItem("mpsi_mold_manufactures_v2");
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const cleaned = parsed.filter((it: any) => !isDummyManufacture(it));
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      }
      return cleaned.map((item: any) => ({
        ...item,
        moldNo: item.moldNo || (item.projectNo ? `${item.projectNo.split("-")[0].replace(/P0$/, "")}M` : "-"),
      }));
    }
    return [];
  } catch (e) {
    console.error("Failed to read mold manufactures from storage", e);
    return [];
  }
}

export function saveMoldManufacturesToStorage(items: MoldManufactureItem[]): void {
  if (typeof window === "undefined") return;
  try {
    const cleaned = items.filter((it) => !isDummyManufacture(it));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: cleaned }));
  } catch (e) {
    console.error("Failed to save mold manufactures to storage", e);
  }
}

// 백엔드 DB와 비동기 동기화 헬퍼
export async function syncManufactureToBackend(item: MoldManufactureItem): Promise<boolean> {
  try {
    const res = await fetch("/api/v1/mold-dev/manufactures", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectNo: item.projectNo,
        manufactureStatus: item.manufactureStatus,
        processes: item.processes,
        overallProgress: item.overallProgress,
        scheduleFile: item.scheduleFile,
        memoLogs: item.memoLogs,
        notes: item.notes,
        coreProgress: item.coreProgress,
        assyProgress: item.assyProgress,
        targetT1Date: item.targetT1Date,
        moldDeliveryDate: item.moldDeliveryDate,
      }),
    });
    const json = await res.json();
    return json.success === true;
  } catch (err) {
    console.error("[syncManufactureToBackend Error]", err);
    return false;
  }
}

export function useMoldManufactureStore() {
  const [manufactures, setManufactures] = useState<MoldManufactureItem[]>(() => {
    return getStoredMoldManufactures();
  });
  const [isLoading, setIsLoading] = useState(false);

  // DB로부터 실데이터 패치
  const refreshFromDb = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/mold-dev/manufactures", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const cleaned = json.data.filter((it: any) => !isDummyManufacture(it));
        saveMoldManufacturesToStorage(cleaned);
        setManufactures(cleaned);
      }
    } catch (e) {
      console.warn("[useMoldManufactureStore] DB Fetch failed, fallback to local storage:", e);
      setManufactures(getStoredMoldManufactures());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshFromDb();

    const handleUpdate = () => {
      setManufactures(getStoredMoldManufactures());
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [refreshFromDb]);

  // 진척 현황 업데이트
  const updateManufacture = (id: number, updates: Partial<MoldManufactureItem>) => {
    const current = getStoredMoldManufactures();
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    let updatedTarget: MoldManufactureItem | undefined;
    const updated = current.map((item) => {
      if (item.id !== id) return item;
      const merged = { ...item, ...updates, updatedAt: dateStr };
      updatedTarget = merged;
      return merged;
    });

    saveMoldManufacturesToStorage(updated);
    setManufactures(updated);

    // 백엔드 DB 영구 동기화
    if (updatedTarget) {
      syncManufactureToBackend(updatedTarget);
    }

    // [분산 노드 API 연계]
    if (typeof window !== "undefined" && updatedTarget) {
      SyncService.queueOutboxEvent({
        eventType: "MOLD_PROGRESS_UPDATED",
        targetNodeId: "MPSI_HQ",
        entityName: "MoldManufactureItem",
        entityId: updatedTarget.projectNo,
        data: {
          projectNo: updatedTarget.projectNo,
          projectName: updatedTarget.projectName,
          moldVendor: updatedTarget.moldVendor,
          processes: updatedTarget.processes,
          manufactureStatus: updatedTarget.manufactureStatus,
          updatedAt: dateStr,
        },
      });
    }
  };

  // 일정표 엑셀 업로드
  const uploadScheduleFile = (
    id: number,
    file: ManufactureScheduleFile,
    memoContent?: string,
    authorName?: string,
    authorId?: string
  ) => {
    const current = getStoredMoldManufactures();
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    let updatedTarget: MoldManufactureItem | undefined;
    const updated = current.map((item) => {
      if (item.id !== id) return item;

      const newLogs = [...(item.memoLogs || [])];
      if (memoContent || file) {
        newLogs.unshift({
          id: `memo-${Date.now()}`,
          authorId: authorId || "vendor-user",
          authorName: authorName || file.uploadedBy || item.moldVendor,
          company: item.moldVendor,
          tag: `${file.fileName.slice(0, 6)}.제작일정표`,
          content: memoContent || `금형 제작 일정표 엑셀 파일(${file.fileName})이 신규 등록되었습니다.`,
          createdAt: dateStr,
          attachedFileName: file.fileName,
          attachedFileUrl: file.fileUrl,
        });
      }

      let nextStatus = item.manufactureStatus;
      if (nextStatus === "미입력") {
        nextStatus = "금형 설계 중";
      }

      const merged: MoldManufactureItem = {
        ...item,
        scheduleFile: file,
        manufactureStatus: nextStatus,
        memoLogs: newLogs,
        updatedAt: dateStr,
      };
      updatedTarget = merged;
      return merged;
    });

    saveMoldManufacturesToStorage(updated);
    setManufactures(updated);

    if (updatedTarget) {
      syncManufactureToBackend(updatedTarget);
    }
  };

  // 업무 이력 메모 등록
  const addMemoLog = (
    id: number,
    memo: Omit<ManufactureMemoLog, "id" | "createdAt"> & { createdAt?: string; attachedFileUrl?: string }
  ) => {
    const current = getStoredMoldManufactures();
    const now = new Date();
    const dateStr = memo.createdAt || `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    let updatedTarget: MoldManufactureItem | undefined;
    const updated = current.map((item) => {
      if (item.id !== id) return item;

      const newLog: ManufactureMemoLog = {
        id: `memo-${Date.now()}`,
        authorId: memo.authorId,
        authorName: memo.authorName,
        company: memo.company,
        tag: memo.tag || "업무메모",
        content: memo.content,
        createdAt: dateStr,
        attachedFileName: memo.attachedFileName,
        attachedFileUrl: memo.attachedFileUrl,
      };

      const merged: MoldManufactureItem = {
        ...item,
        memoLogs: [newLog, ...(item.memoLogs || [])],
        updatedAt: dateStr,
      };
      updatedTarget = merged;
      return merged;
    });

    saveMoldManufacturesToStorage(updated);
    setManufactures(updated);

    if (updatedTarget) {
      syncManufactureToBackend(updatedTarget);
    }

    // 전역 알림 발송
    const targetItem = current.find((it) => it.id === id);
    const isMpsi = memo.company.includes("MPSI");
    dispatchGlobalNotification({
      menuName: "금형외주 - 제작관리",
      menuPath: isMpsi ? "/portal/vendor-portal/mold/manufacture" : "/portal/mold-dev/manufacture",
      senderCompany: memo.company,
      senderName: memo.authorName,
      content: `[${targetItem?.projectNo} 금형제작 메모] ${memo.content}`,
      projectNo: targetItem?.projectNo,
      targetRole: isMpsi ? "VENDOR_MOLD" : "MPSI",
      targetVendorName: isMpsi ? targetItem?.moldVendor : undefined,
    });
  };

  // 금형 제작 현황 상태 직접 변경
  const updateManufactureStatus = (id: number, status: MoldManufactureStatus) => {
    const current = getStoredMoldManufactures();
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    let updatedTarget: MoldManufactureItem | undefined;
    const updated = current.map((item) => {
      if (item.id !== id) return item;
      const merged: MoldManufactureItem = {
        ...item,
        manufactureStatus: status,
        updatedAt: dateStr,
      };
      updatedTarget = merged;
      return merged;
    });

    saveMoldManufacturesToStorage(updated);
    setManufactures(updated);

    if (updatedTarget) {
      syncManufactureToBackend(updatedTarget);
    }
  };

  // 초기화
  const resetManufactures = () => {
    saveMoldManufacturesToStorage(INITIAL_MOLD_MANUFACTURES);
    setManufactures(INITIAL_MOLD_MANUFACTURES);
  };

  return {
    manufactures,
    isLoading,
    refreshFromDb,
    updateManufacture,
    uploadScheduleFile,
    addMemoLog,
    updateManufactureStatus,
    resetManufactures,
  };
}

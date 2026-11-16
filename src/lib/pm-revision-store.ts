"use client";

import { useState, useEffect, useCallback } from "react";
import { cleanCompanyAuthor, dispatchGlobalNotification } from "./notification-store";

// 1. 신작/설변 차수별 이력 인터페이스
export interface RevisionHistoryItem {
  revisionCode: string;       // N001, E001, E002 ...
  revisionDate: string;       // 변경/승인 일자
  title: string;              // 제목 (예: 초도 신작 승인, 1차 설계변경 등)
  modelReview: string;        // 3D 제품 모델 검토 승인 내용
  moldCostQuote: string;      // 금형비 견적 검토 확정 내용
  moldTrialReport: string;    // 금형처 시사출 보고서 내용
  massValidationReport: string; // 양산처 시양산 보고서 내용
  author: string;             // 작성자
  memo: string;               // 업무 이력 메모
  createdAt: string;          // 등록일시
}

// 2. 금형 PM 세부 데이터 인터페이스
export interface PmRoundItem {
  round: number;
  currentShots: number | string;
  pmReason: string;
  lastPmDate: string;
  lastPmShots: number | string;
  massStartDate: string;
  pmCycleShots: number | string;
  activeProcess: string;
  schedule: {
    planStartDate: string;
    planEndDate: string;
    planMassStartDate: string;
    actualStartDate: string;
    actualEndDate: string;
    actualMassStartDate: string;
  };
}

export interface PmMoldData {
  currentRound: number;       // 현재 PM 차수 (예: 1차)
  currentShots: number;       // 현재 누적 금형타수
  pmReason: string;           // PM사유
  lastPmDate: string;         // 직전 PM 일자 (YYYY-MM-DD)
  lastPmShots: number;        // 직전 누적 금형 타수
  massStartDate: string;      // 양산 시작 일자 (YYYY-MM-DD)
  warrantyShots: number;      // 금형 보증샷
  pmCycleShots: number;       // PM 주기
  activeProcess: string;      // 현재 진행 공정
  schedule: {
    planStartDate: string;    // PM 시작일 (계획)
    planEndDate: string;      // PM 완료일 (계획)
    planMassStartDate: string;// 양산 시작일 (계획)
    actualStartDate: string;  // PM 시작일 (실적)
    actualEndDate: string;    // PM 완료일 (실적)
    actualMassStartDate: string; // 양산 시작일 (실적)
  };
  roundsData?: Record<number, PmRoundItem>; // 1차~30차 각 차수별 개별 저장 데이터 맵
  memos: Array<{
    id: string;
    author: string;
    content: string;
    createdAt: string;
  }>;
}

// 상태 전환 이력 인터페이스
export interface StateTransitionLogItem {
  id: string;
  fromState: string;
  toState: "설변 중" | "PM 중" | "양산 중";
  reason: string;
  author: string;
  createdAt: string;
}

// 3. 설변 및 PM 관리 프로젝트 아이템 인터페이스
export interface PmRevisionProjectItem {
  id: number;
  projectNo: string;          // 프로젝트번호
  revisionCode: string;       // 신작/설변 (N001, E001, E002...)
  quotationKind: string;      // 견적종류
  projectName: string;        // 프로젝트/차종
  productName: string;        // 제품명
  partNo: string;             // 품번
  moldNo: string;             // 금형번호
  customerName: string;       // 고객사
  cavity: string;             // 캐비티사양
  moldVendor: string;         // 금형제작처
  massVendor: string;         // 사출양산처
  massProductionType?: "IN_HOUSE" | "OUTSOURCING";
  warrantyShots?: number;

  currentState: "설변 중" | "PM 중" | "양산 중";
  lastTransitionReason?: string;
  stateTransitionLogs?: StateTransitionLogItem[];

  // 우측 세부 일정
  moldModStartDate: string;
  progressProcess: string;
  moldModEndDate: string;
  pilotMassDate: string;
  ppapSubmitDate: string;
  mpsiApprovalDate: string;
  massStartDate: string;

  // 설계변경 전용 데이터
  revisionMassStartDate?: string;
  revisionMemos: Array<{
    id: string;
    author: string;
    content: string;
    attachedFileName?: string;
    attachedFileUrl?: string;
    createdAt: string;
  }>;

  // PM 전용 데이터
  pmData?: PmMoldData;

  // 신작/설변 이력 모달용 데이터 (N001, E001, E002...)
  historyList: RevisionHistoryItem[];
  updatedAt: string;
}

export const INITIAL_PM_REVISION_DATA: PmRevisionProjectItem[] = [];

const STORAGE_KEY = "mpsi_pm_revision_store_v6";
const SYNC_EVENT_NAME = "mpsi_pm_revision_updated";

async function syncPmRevisionToBackend(payload: {
  action?: string;
  item: PmRevisionProjectItem;
  roundData?: PmRoundItem;
  author?: string;
  reason?: string;
  memoContent?: string;
  attachedFileName?: string;
}): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch("/api/v1/pm-revisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error("[PM Revision DB Sync Error]", await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[PM Revision DB Sync Failed]", err);
    return false;
  }
}

export function usePmRevisionStore() {
  const [items, setItems] = useState<PmRevisionProjectItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const refreshFromDb = useCallback(async () => {
    if (typeof window === "undefined") return [];
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/pm-revisions?mode=full", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setItems(json.data);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data));
          } catch {}
          setIsLoaded(true);
          setIsLoading(false);
          return json.data as PmRevisionProjectItem[];
        }
      }
    } catch (e) {
      console.warn("Failed to fetch PM revisions from DB:", e);
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      setItems([]);
    }
    setIsLoaded(true);
    setIsLoading(false);
    return [];
  }, []);

  useEffect(() => {
    refreshFromDb();

    const handleSync = (e?: Event) => {
      try {
        const custom = e as CustomEvent | undefined;
        if (custom?.detail && Array.isArray(custom.detail)) {
          setItems(custom.detail);
          return;
        }
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) setItems(JSON.parse(stored));
      } catch (err) {
        console.error("Failed to sync PM revision store:", err);
      }
    };

    window.addEventListener(SYNC_EVENT_NAME, handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [refreshFromDb]);

  const saveItems = (newItems: PmRevisionProjectItem[]) => {
    setItems(newItems);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
      window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, { detail: newItems }));
    } catch (e) {
      console.error("Failed to save PM revision items:", e);
    }
  };

  // 설계변경 양산 시작일자 입력 및 메모 자동 등록 (DB 저장)
  const updateRevisionMassStartDate = async (
    id: number,
    date: string,
    author: string = "(주)뉴몰드",
    memoContent?: string
  ) => {
    const now = new Date();
    const nowStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}. ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const dateSimple = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`.slice(2);

    let updatedItem: PmRevisionProjectItem | undefined;
    const cleanAuthor = cleanCompanyAuthor(author, "(주)뉴몰드");
    const memoText = memoContent?.trim()
      ? memoContent.trim()
      : `${dateSimple}_설계변경 양산 시작일(${date}) 입력 등록`;

    const nextItems = items.map((item) => {
      if (item.id === id) {
        const newMemo = {
          id: `rm-${Date.now()}`,
          author: cleanAuthor,
          content: `${memoText}, ${nowStr} 입력`,
          createdAt: `${nowStr} 입력`
        };

        updatedItem = {
          ...item,
          massStartDate: date,
          revisionMassStartDate: date,
          revisionMemos: [newMemo, ...(item.revisionMemos || [])],
          updatedAt: nowStr
        };
        return updatedItem;
      }
      return item;
    });

    saveItems(nextItems);

    if (updatedItem) {
      await syncPmRevisionToBackend({
        action: "SAVE_REVISION_MASS_START",
        item: updatedItem,
        author: cleanAuthor,
        memoContent: memoText,
      });
    }
  };

  // PM 공정 변경 및 메모 자동 등록 (DB 저장)
  const updatePmProcess = async (
    id: number,
    processName: string,
    author: string = "(주)뉴몰드"
  ) => {
    const now = new Date();
    const nowStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}. ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const cleanAuthor = cleanCompanyAuthor(author, "(주)뉴몰드");

    let updatedItem: PmRevisionProjectItem | undefined;
    const nextItems = items.map((item) => {
      if (item.id === id && item.pmData) {
        const newMemo = {
          id: `pm-m-${Date.now()}`,
          author: cleanAuthor,
          content: `PM공정 ${processName} 등록, ${nowStr} 입력`,
          createdAt: `${nowStr} 입력`
        };

        updatedItem = {
          ...item,
          progressProcess: processName,
          pmData: {
            ...item.pmData,
            activeProcess: processName,
            memos: [newMemo, ...(item.pmData.memos || [])]
          },
          updatedAt: nowStr
        };
        return updatedItem;
      }
      return item;
    });

    saveItems(nextItems);

    if (updatedItem) {
      await syncPmRevisionToBackend({
        action: "UPDATE_PM_PROCESS",
        item: updatedItem,
        author: cleanAuthor,
      });
    }
  };

  // PM 일정 (계획/실적) 업데이트 및 메모 등록 (DB 저장)
  const updatePmSchedule = async (
    id: number,
    schedule: {
      planStartDate?: string;
      planEndDate?: string;
      planMassStartDate?: string;
      actualStartDate?: string;
      actualEndDate?: string;
      actualMassStartDate?: string;
    },
    author: string = "(주)뉴몰드",
    memoContent?: string
  ) => {
    const now = new Date();
    const nowStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}. ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const cleanAuthor = cleanCompanyAuthor(author, "(주)뉴몰드");

    let updatedItem: PmRevisionProjectItem | undefined;
    const nextItems = items.map((item) => {
      if (item.id === id && item.pmData) {
        const nextSchedule = {
          ...item.pmData.schedule,
          ...schedule
        };

        const memoText = memoContent || `PM 일정 계획/실적 등록 (계획: ${nextSchedule.planStartDate}~${nextSchedule.planEndDate} / 실적: ${nextSchedule.actualStartDate}~${nextSchedule.actualEndDate})`;
        const newMemo = {
          id: `pm-m-${Date.now()}`,
          author: cleanAuthor,
          content: `${memoText}, ${nowStr} 입력`,
          createdAt: `${nowStr} 입력`
        };

        updatedItem = {
          ...item,
          massStartDate: nextSchedule.actualMassStartDate || nextSchedule.planMassStartDate || item.massStartDate,
          pmData: {
            ...item.pmData,
            schedule: nextSchedule,
            memos: [newMemo, ...(item.pmData.memos || [])]
          },
          updatedAt: nowStr
        };
        return updatedItem;
      }
      return item;
    });

    saveItems(nextItems);

    if (updatedItem) {
      await syncPmRevisionToBackend({
        action: "UPDATE_PM_SCHEDULE",
        item: updatedItem,
        author: cleanAuthor,
      });
    }
  };

  // PM 기본 사양 업데이트 (DB 저장)
  const updatePmSpecs = async (
    id: number,
    specs: {
      currentRound?: number;
      currentShots?: number;
      pmReason?: string;
      lastPmDate?: string;
      lastPmShots?: number;
      massStartDate?: string;
      warrantyShots?: number;
      pmCycleShots?: number;
    },
    author: string = "(주)뉴몰드"
  ) => {
    const now = new Date();
    const nowStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}. ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    let updatedItem: PmRevisionProjectItem | undefined;
    const nextItems = items.map((item) => {
      if (item.id === id && item.pmData) {
        updatedItem = {
          ...item,
          pmData: {
            ...item.pmData,
            currentRound: specs.currentRound ?? item.pmData.currentRound,
            currentShots: specs.currentShots ?? item.pmData.currentShots,
            pmReason: specs.pmReason ?? item.pmData.pmReason,
            lastPmDate: specs.lastPmDate ?? item.pmData.lastPmDate,
            lastPmShots: specs.lastPmShots ?? item.pmData.lastPmShots,
            massStartDate: specs.massStartDate ?? item.pmData.massStartDate,
            warrantyShots: specs.warrantyShots ?? item.pmData.warrantyShots,
            pmCycleShots: specs.pmCycleShots ?? item.pmData.pmCycleShots,
          },
          updatedAt: nowStr
        };
        return updatedItem;
      }
      return item;
    });

    saveItems(nextItems);

    if (updatedItem) {
      await syncPmRevisionToBackend({
        action: "UPDATE_PM_SPECS",
        item: updatedItem,
        author,
      });
    }
  };

  // 수동 메모 추가 (설계변경 or PM -> DB 영구 저장)
  const addMemo = async (
    id: number,
    type: "REVISION" | "PM",
    content: string,
    author: string = "(주)뉴몰드",
    attachedFile?: { fileName?: string; fileUrl?: string }
  ) => {
    const now = new Date();
    const nowStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}. ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const isMpsi = author.includes("MPSI");
    const cleanAuthor = isMpsi ? "MPSI" : cleanCompanyAuthor(author, "(주)뉴몰드");

    let updatedItem: PmRevisionProjectItem | undefined;
    const nextItems = items.map((item) => {
      if (item.id === id) {
        const newMemo = {
          id: `memo-${Date.now()}`,
          author: cleanAuthor,
          content: `${content}, ${nowStr} 입력`,
          attachedFileName: attachedFile?.fileName,
          attachedFileUrl: attachedFile?.fileUrl,
          createdAt: `${nowStr} 입력`
        };

        if (type === "PM" && item.pmData) {
          updatedItem = {
            ...item,
            pmData: {
              ...item.pmData,
              memos: [newMemo, ...(item.pmData.memos || [])]
            },
            updatedAt: nowStr
          };
          return updatedItem;
        } else {
          updatedItem = {
            ...item,
            revisionMemos: [newMemo, ...(item.revisionMemos || [])],
            updatedAt: nowStr
          };
          return updatedItem;
        }
      }
      return item;
    });

    saveItems(nextItems);

    if (updatedItem) {
      await syncPmRevisionToBackend({
        action: type === "REVISION" ? "ADD_REVISION_MEMO" : "ADD_PM_MEMO",
        item: updatedItem,
        author: cleanAuthor,
        memoContent: content,
        attachedFileName: attachedFile?.fileName,
      });
    }

    // 대상 상대방 회사로만 알림 격리 발송 (자체생산 건은 MPSI 내부 이력으로 발송)
    const targetItem = items.find((it) => it.id === id);
    const targetVendor = targetItem?.massVendor || "";
    const isSelfMass = targetItem?.massProductionType === "IN_HOUSE" || targetVendor.includes("자체") || targetVendor.trim().toUpperCase() === "MPSI";
    dispatchGlobalNotification({
      menuName: type === "PM" ? "양산 - 금형 PM 보전" : "양산 - 설계변경 관리",
      menuPath: isSelfMass ? "/portal/mass-prod/revision" : (isMpsi ? "/portal/vendor-portal/mass/revision" : "/portal/mass-prod/revision"),
      senderCompany: isMpsi ? "MPSI" : (targetVendor || "(주)뉴몰드"),
      senderName: cleanAuthor,
      content: `[${targetItem?.projectNo} ${type === "PM" ? "PM" : "설변"} 메모] ${content}`,
      projectNo: targetItem?.projectNo,
      targetRole: isSelfMass ? "MPSI" : (isMpsi ? "VENDOR_MASS" : "MPSI"),
      targetVendorName: isSelfMass ? undefined : (isMpsi ? targetVendor : undefined),
    });
  };

  // 프로젝트 상태값 변경 (DB 저장)
  const changeProjectState = async (
    id: number,
    newState: "설변 중" | "PM 중" | "양산 중",
    options?: {
      reason?: string;
      author?: string;
      massStartDate?: string;
    }
  ) => {
    const now = new Date();
    const nowStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}. ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const dateSimple = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`.slice(2);
    const dateDash = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const author = cleanCompanyAuthor(options?.author || "(주)뉴몰드", "(주)뉴몰드");

    let updatedItem: PmRevisionProjectItem | undefined;
    const nextItems = items.map((item) => {
      if (item.id === id) {
        const reasonText = (options?.reason || "").trim() || (
          newState === "설변 중"
            ? "설계변경 공정 진행"
            : newState === "PM 중"
            ? "타수 누적에 따른 정기점검 PM 착수"
            : "설변/PM 완료 후 정상 양산 가동 복귀"
        );
        const newLog: StateTransitionLogItem = {
          id: `st-${Date.now()}`,
          fromState: item.currentState,
          toState: newState,
          reason: reasonText,
          author,
          createdAt: nowStr,
        };
        const nextLogs = [newLog, ...(item.stateTransitionLogs || [])];

        if (newState === "설변 중") {
          const targetRevCode = item.revisionCode?.toUpperCase().startsWith("E")
            ? item.revisionCode
            : "E001";

          const newMemo = {
            id: `rm-${Date.now()}`,
            author,
            content: `${dateSimple}_설계변경(${targetRevCode}) 상태 전환: ${reasonText}, ${nowStr} 입력`,
            createdAt: `${nowStr} 입력`
          };

          const hasRevHistory = (item.historyList || []).some(
            (h) => h.revisionCode?.toUpperCase() === targetRevCode.toUpperCase()
          );
          const nextHistoryList = hasRevHistory
            ? (item.historyList || [])
            : [
                ...(item.historyList || []),
                {
                  revisionCode: targetRevCode,
                  revisionDate: dateDash,
                  title: `설계변경 (${targetRevCode}) - ${reasonText}`,
                  modelReview: reasonText,
                  moldCostQuote: "설변 금형 수정비 및 사출 단가 검토 중",
                  moldTrialReport: "시사출 실적 미등록",
                  massValidationReport: "시양산 실적 미등록",
                  author,
                  memo: reasonText,
                  createdAt: nowStr
                }
              ];

          updatedItem = {
            ...item,
            currentState: "설변 중" as const,
            lastTransitionReason: reasonText,
            stateTransitionLogs: nextLogs,
            revisionCode: targetRevCode,
            quotationKind: "(금형견적, 사출견적)",
            progressProcess: "가공 중",
            revisionMassStartDate: options?.massStartDate || item.revisionMassStartDate || (item.massStartDate !== "공급업체입력" ? item.massStartDate : ""),
            revisionMemos: [newMemo, ...(item.revisionMemos || [])],
            historyList: nextHistoryList,
            updatedAt: nowStr
          };
          return updatedItem;
        } else if (newState === "PM 중") {
          const newMemo = {
            id: `pm-m-${Date.now()}`,
            author,
            content: `${dateSimple}_금형 PM 착수 및 상태 전환: ${reasonText}, ${nowStr} 입력`,
            createdAt: `${nowStr} 입력`
          };

          const currentPm: PmMoldData = item.pmData || {
            currentRound: 1,
            currentShots: 0,
            pmReason: reasonText,
            lastPmDate: dateDash,
            lastPmShots: 0,
            massStartDate: item.massStartDate !== "공급업체입력" ? item.massStartDate : "",
            warrantyShots: item.warrantyShots || 0,
            pmCycleShots: 40000,
            activeProcess: "금형 분해 점검 중",
            schedule: {
              planStartDate: dateDash,
              planEndDate: "",
              planMassStartDate: "",
              actualStartDate: dateDash,
              actualEndDate: "",
              actualMassStartDate: "",
            },
            roundsData: {},
            memos: []
          };

          updatedItem = {
            ...item,
            currentState: "PM 중" as const,
            lastTransitionReason: reasonText,
            stateTransitionLogs: nextLogs,
            progressProcess: "금형 분해 점검 중",
            pmData: {
              ...currentPm,
              activeProcess: "금형 분해 점검 중",
              memos: [newMemo, ...(currentPm.memos || [])]
            },
            updatedAt: nowStr
          };
          return updatedItem;
        } else {
          const newMemo = {
            id: `rm-${Date.now()}`,
            author,
            content: `${dateSimple}_양산 정상 가동 상태 전환: ${reasonText}, ${nowStr} 입력`,
            createdAt: `${nowStr} 입력`
          };

          updatedItem = {
            ...item,
            currentState: "양산 중" as const,
            lastTransitionReason: reasonText,
            stateTransitionLogs: nextLogs,
            progressProcess: "양산 납품 중",
            revisionMemos: [newMemo, ...(item.revisionMemos || [])],
            updatedAt: nowStr
          };
          return updatedItem;
        }
      }
      return item;
    });

    saveItems(nextItems);

    if (updatedItem) {
      await syncPmRevisionToBackend({
        action: "CHANGE_STATE",
        item: updatedItem,
        author,
        reason: options?.reason,
      });
    }
  };

  // 차수별 PM 데이터 저장 함수 (1차 ~ 30차 개별 저장 및 DB 영구 동기화)
  const savePmRoundData = async (
    id: number,
    roundData: PmRoundItem,
    author: string = "(주)뉴몰드"
  ) => {
    const now = new Date();
    const nowStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}. ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const cleanAuthor = cleanCompanyAuthor(author, "(주)뉴몰드");

    let updatedItem: PmRevisionProjectItem | undefined;
    const nextItems = items.map((item) => {
      if (item.id === id) {
        const basePm: PmMoldData = item.pmData || {
          currentRound: roundData.round,
          currentShots: 0,
          pmReason: "",
          lastPmDate: "",
          lastPmShots: 0,
          massStartDate: "",
          warrantyShots: item.warrantyShots || 0,
          pmCycleShots: 40000,
          activeProcess: "금형 분해 점검 중",
          schedule: roundData.schedule,
          roundsData: {},
          memos: [],
        };

        const prevRounds = basePm.roundsData || {};
        const updatedRounds = {
          ...prevRounds,
          [roundData.round]: roundData,
        };

        const numShots = parseInt(String(roundData.currentShots).replace(/[^0-9]/g, ""), 10) || 0;
        const numLastShots = parseInt(String(roundData.lastPmShots).replace(/[^0-9]/g, ""), 10) || 0;
        const numCycle = parseInt(String(roundData.pmCycleShots).replace(/[^0-9]/g, ""), 10) || 40000;

        const newMemo = {
          id: `pm-m-${Date.now()}`,
          author: cleanAuthor,
          content: `${roundData.round}차 PM 상세 데이터 저장 (공정: ${roundData.activeProcess}, 타수: ${numShots.toLocaleString()}샷)`,
          createdAt: `${nowStr} 입력`
        };

        updatedItem = {
          ...item,
          progressProcess: roundData.activeProcess || item.progressProcess,
          massStartDate: roundData.schedule.actualMassStartDate || roundData.schedule.planMassStartDate || roundData.massStartDate || item.massStartDate,
          pmData: {
            ...basePm,
            currentRound: roundData.round,
            currentShots: numShots,
            pmReason: roundData.pmReason,
            lastPmDate: roundData.lastPmDate,
            lastPmShots: numLastShots,
            massStartDate: roundData.massStartDate,
            pmCycleShots: numCycle,
            activeProcess: roundData.activeProcess,
            schedule: roundData.schedule,
            roundsData: updatedRounds,
            memos: [newMemo, ...(basePm.memos || [])]
          },
          updatedAt: nowStr
        };
        return updatedItem;
      }
      return item;
    });

    saveItems(nextItems);

    if (updatedItem) {
      await syncPmRevisionToBackend({
        action: "SAVE_PM_ROUND",
        item: updatedItem,
        roundData,
        author: cleanAuthor,
      });
    }
  };

  // DB 재조회를 통한 마스터 동기화 호환
  const syncFromMasterProjects = useCallback((_masterProjects: any[]) => {
    refreshFromDb();
  }, [refreshFromDb]);

  const resetToInitial = () => {
    saveItems(INITIAL_PM_REVISION_DATA);
  };

  return {
    items,
    isLoaded,
    isLoading,
    refreshFromDb,
    updateRevisionMassStartDate,
    updatePmProcess,
    updatePmSchedule,
    updatePmSpecs,
    savePmRoundData,
    changeProjectState,
    addMemo,
    syncFromMasterProjects,
    resetToInitial
  };
}

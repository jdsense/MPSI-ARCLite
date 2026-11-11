"use client";

import { useState, useEffect } from "react";
import { dispatchGlobalNotification, cleanCompanyAuthor } from "./notification-store";
import { SyncService } from "@/services/sync-service";

// 1. 회차별 체크시트 항목 인터페이스
export interface ChecklistItem {
  id: string;
  category: "치수 만족도" | "외관 만족도" | "금형사양검사" | "양산성(목표CT)";
  description: string;
  isResolved: boolean;
  attachedReport?: string;
}

// 1-1. 차수별 4대 영역 업로드 보고서 인터페이스
export interface TrialDocumentItem {
  fileName: string;
  fileSize?: string;
  uploadedAt: string;
  uploadedBy?: string;
  fileUrl?: string;
}

// 1-2. 금형 육성 완료 5대 필수 파일 인터페이스
export interface FinalDeliveryFile {
  key: "approvalCertificate" | "caeReport" | "trialReportWithCond" | "moldSpecification" | "moldChecklist";
  label: string;
  description: string;
  fileName?: string;
  fileSize?: string;
  uploadedAt?: string;
  uploadedBy?: string;
  fileUrl?: string;
  isVerified: boolean;    // MPSI 승인 여부
  isRejected?: boolean;   // MPSI 반려 여부
  verifiedBy?: string;
  verifiedAt?: string;
  rejectReason?: string;
}

// 1-3. 업무 이력 메모 인터페이스
export interface MoldTrialMemoLog {
  id: string;
  authorId?: string;
  authorName: string;     // 예: "우성정공 한승호부장"
  company: string;        // 예: "우성정공(주)" | "MPSI 본사"
  tag: string;            // 예: "261010.치수검토보고서"
  content: string;        // 특이사항 및 보고 내용
  createdAt: string;      // 예: "2026.10.10 10:54"
  attachedFileName?: string;
  attachedFileUrl?: string;
}

// 2. 시사출 차수(T1~Tn) 데이터 인터페이스
export interface TrialRecord {
  trialDegree: string;        // T1, T2, ... Tn
  planDate?: string;          // 시사출 계획일
  trialDate: string;          // 시사출 실적일
  inspector: string;          // 검사자
  
  // 1. 치수검토보고서
  dimResult: "OK" | "NG";
  dimReport?: TrialDocumentItem;

  // 2. 외관검토보고서
  appResult: "OK" | "NG";
  appReport?: TrialDocumentItem;

  // 3. 금형검사보고서
  specResult: "OK" | "NG";
  specReport?: TrialDocumentItem;

  // 4. 양산성 만족도(목표 C/T)
  cycleTime: number;          // 측정 C/T (초)
  targetCycleTime: number;    // 목표 C/T (초)
  condReport?: TrialDocumentItem; // 사출조건표 첨부 파일

  status: "Pass (양산승인)" | "Fail (금형수정)" | "육성 진행중";
  mpsiDecision?: "승인" | "미승인(수정요청)" | "검토중";
  checklist: ChecklistItem[];
  opinion: string;
}

// 3. 프로젝트별 금형 육성 관리 인터페이스
export interface MoldTrialProject {
  id: number;
  projectNo: string;          // MPSI 프로젝트 번호 (MI26005P0 등)
  moldNo?: string;            // 금형번호 (예: MI26005P0M)
  moldDegree?: string;        // 금형차수 (예: M1, M2 등)
  changeType?: string;        // 신작/설변 (예: N001, E001 등)
  projectName: string;        // 차종 / 프로젝트명
  productName: string;        // 제품명
  customerName?: string;      // 원청 고객사
  moldVendor: string;         // 금형제작사 (우성정공 등)
  massVendor: string;         // 사출양산처 ((주)뉴몰드 등)
  cavity?: string;
  material?: string;
  targetT1Date?: string;
  
  // 현재 차수 (승인원 승인 후 '금형 승인'으로 변동됨)
  currentTrial: string;       // 예: "T1", "T2", "T3", "금형 승인"
  isMoldApproved?: boolean;   // 금형 승인 완료 여부

  // 금형 이관 계획일 / 완료일
  transferPlanDate?: string;  // 금형 이관 계획일
  transferActualDate?: string; // 금형 이관 완료일(실적일)

  currentStep: number;        // 13단계 프로세스 중 현재 위치 (7~10단계)
  approvalCertNo?: string;    // 금형제작 승인서 번호
  approvalCertDate?: string;  // 승인서 발급일시
  approvedBy?: string;        // 승인 책임자
  trials: TrialRecord[];      // T1 ~ Tn 누적 이력
  finalDocuments: FinalDeliveryFile[]; // 5대 승인 서류

  // 업무 이력 메모
  memoLogs: MoldTrialMemoLog[];
  updatedAt: string;
}

// 5대 육성 완료 서류 기본 템플릿 생성기
export const createDefaultFinalDocs = (
  overrides?: Partial<Record<FinalDeliveryFile["key"], { fileName?: string; isVerified?: boolean; isRejected?: boolean; rejectReason?: string; fileSize?: string; uploadedAt?: string; uploadedBy?: string; verifiedBy?: string; verifiedAt?: string; fileUrl?: string }>>
): FinalDeliveryFile[] => {
  const templates: { key: FinalDeliveryFile["key"]; label: string; description: string }[] = [
    {
      key: "approvalCertificate",
      label: "금형승인원 (금형 및 최종샘플사진)",
      description: "금형 실물 전체 조립 사진, 명판 및 최종 초물 승인 제품 샘플 전수 촬영본 첨부",
    },
    {
      key: "caeReport",
      label: "CAE 보고서",
      description: "유동/보압 해석, 변형 예측 및 웰드라인 검증 최종 성형해석 완료 보고서",
    },
    {
      key: "trialReportWithCond",
      label: "시사출 완료 보고서 (사출조건표 포함)",
      description: "최종 차수 시사출 성적서 및 기계 조건표(사출압, 형체력, 수지온도, 실측 C/T)",
    },
    {
      key: "moldSpecification",
      label: "금형 제작 사양서",
      description: "금형 규격, 캐비티 배열, 핫러너 및 냉각 채널 설계 최종 확정 사양서",
    },
    {
      key: "moldChecklist",
      label: "금형 검사 체크리스트",
      description: "부품 가공 조립 내역, 슬라이드/경사이젝터 간섭, 건드릴 냉각 채널 통수 검사서",
    },
  ];

  return templates.map((t) => {
    const ov = overrides?.[t.key];
    return {
      key: t.key,
      label: t.label,
      description: t.description,
      fileName: ov?.fileName,
      fileSize: ov?.fileSize,
      uploadedAt: ov?.uploadedAt,
      uploadedBy: ov?.uploadedBy,
      fileUrl: ov?.fileUrl,
      isVerified: ov?.isVerified ?? false,
      isRejected: ov?.isRejected ?? false,
      rejectReason: ov?.rejectReason,
      verifiedBy: ov?.verifiedBy,
      verifiedAt: ov?.verifiedAt,
    };
  });
};

export const calculateFinalCompletionStats = (docs: FinalDeliveryFile[] = []) => {
  const uploadedCount = docs.filter((d) => Boolean(d.fileName)).length;
  const verifiedCount = docs.filter((d) => Boolean(d.fileName) && d.isVerified).length;
  const rate = docs.length > 0 ? Math.round((uploadedCount / docs.length) * 100) : 0;
  return { uploadedCount, verifiedCount, rate };
};

const STORAGE_KEY = "mpsi_mold_trials_v4";
const EVENT_NAME = "mpsi_mold_trial_update_v4";

// 더미 데이터 초기값 전면 비움
export const INITIAL_MOLD_TRIALS: MoldTrialProject[] = [];

// 더미 판별 헬퍼 (실제 프로젝트 MI26001 계열 포함 정상 보존)
function isDummyTrial(item: any): boolean {
  if (!item) return true;
  const pNo = String(item.projectNo || "").trim();
  if (!pNo || pNo === "undefined" || pNo === "null" || pNo === "DUMMY") {
    return true;
  }
  return false;
}

export function getStoredMoldTrials(): MoldTrialProject[] {
  if (typeof window === "undefined") return [];
  try {
    localStorage.removeItem("mpsi_mold_trials_v1");
    localStorage.removeItem("mpsi_mold_trials_v2");
    localStorage.removeItem("mpsi_mold_trials_v3");
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const cleaned = parsed.filter((it: any) => !isDummyTrial(it));
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      }
      return cleaned;
    }
    return [];
  } catch (e) {
    console.error("Failed to read mold trials from storage", e);
    return [];
  }
}

export function saveMoldTrialsToStorage(
  updater: MoldTrialProject[] | ((prev: MoldTrialProject[]) => MoldTrialProject[])
): void {
  if (typeof window === "undefined") return;
  try {
    const current = getStoredMoldTrials();
    const next = typeof updater === "function" ? updater(current) : updater;
    const cleaned = next.filter((it) => !isDummyTrial(it));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: cleaned }));
  } catch (e) {
    console.error("Failed to save mold trials to storage", e);
  }
}

// 백엔드 DB 연동 헬퍼
export async function syncTrialToBackend(item: MoldTrialProject): Promise<boolean> {
  try {
    const res = await fetch("/api/v1/mold-dev/trials", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectNo: item.projectNo,
        trialData: item,
      }),
    });
    const json = await res.json();
    return json.success === true;
  } catch (err) {
    console.error("[syncTrialToBackend Error]", err);
    return false;
  }
}

export function useMoldTrialStore() {
  const [trials, setTrialsState] = useState<MoldTrialProject[]>(() => {
    return getStoredMoldTrials();
  });
  const [isLoading, setIsLoading] = useState(false);

  const refreshFromDb = async (forceSync?: boolean) => {
    try {
      setIsLoading(true);
      if (forceSync) {
        try {
          await fetch("/api/v1/mold-dev/trials", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "sync" }),
          });
        } catch (e) {
          console.warn("[refreshFromDb forceSync warning]", e);
        }
      }
      const res = await fetch("/api/v1/mold-dev/trials", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const cleaned = json.data.filter((it: any) => !isDummyTrial(it));
        saveMoldTrialsToStorage(cleaned);
        setTrialsState(cleaned);
      }
    } catch (e) {
      console.warn("[useMoldTrialStore] Fallback to local storage:", e);
      setTrialsState(getStoredMoldTrials());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshFromDb();

    const handleUpdate = () => {
      setTrialsState(getStoredMoldTrials());
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const setTrials = (
    updater: MoldTrialProject[] | ((prev: MoldTrialProject[]) => MoldTrialProject[])
  ) => {
    saveMoldTrialsToStorage(updater);
  };

  // 프로젝트별 수정 업데이트
  const updateTrialProject = (id: number, updates: Partial<MoldTrialProject>) => {
    const current = getStoredMoldTrials();
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    let updatedTarget: MoldTrialProject | undefined;
    const updated = current.map((item) => {
      if (item.id !== id) return item;
      const merged = { ...item, ...updates, updatedAt: dateStr };
      updatedTarget = merged;
      return merged;
    });

    saveMoldTrialsToStorage(updated);
    setTrialsState(updated);

    if (updatedTarget) {
      syncTrialToBackend(updatedTarget);
    }

    // [분산 노드 API 연계]
    if (typeof window !== "undefined" && updatedTarget) {
      SyncService.queueOutboxEvent({
        eventType: "MOLD_TRIAL_SUBMITTED",
        targetNodeId: "MPSI_HQ",
        entityName: "MoldTrialProject",
        entityId: updatedTarget.projectNo,
        data: {
          projectNo: updatedTarget.projectNo,
          projectName: updatedTarget.projectName,
          currentTrial: updatedTarget.currentTrial,
          isMoldApproved: updatedTarget.isMoldApproved,
          moldVendor: updatedTarget.moldVendor,
          updatedAt: dateStr,
        },
      });
    }
  };

  // 업무 이력 메모 등록
  const addMemoLog = (
    projectId: number,
    memo: Omit<MoldTrialMemoLog, "id" | "createdAt"> & { createdAt?: string }
  ) => {
    const current = getStoredMoldTrials();
    const now = new Date();
    const dateStr = memo.createdAt || `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const isMpsi = memo.company.includes("MPSI") || memo.authorName?.includes("MPSI");
    const cleanAuthor = isMpsi ? "MPSI" : cleanCompanyAuthor(memo.authorName || memo.company, memo.company);
    const cleanComp = isMpsi ? "MPSI" : cleanCompanyAuthor(memo.company, "협력사");

    const newLog: MoldTrialMemoLog = {
      id: `trial-memo-${Date.now()}`,
      authorId: memo.authorId,
      authorName: cleanAuthor,
      company: cleanComp,
      tag: memo.tag,
      content: memo.content,
      createdAt: dateStr,
      attachedFileName: memo.attachedFileName,
      attachedFileUrl: memo.attachedFileUrl,
    };

    let updatedTarget: MoldTrialProject | undefined;
    const updated = current.map((p) => {
      if (p.id !== projectId) return p;
      const merged = {
        ...p,
        memoLogs: [newLog, ...(p.memoLogs || [])],
        updatedAt: dateStr,
      };
      updatedTarget = merged;
      return merged;
    });

    saveMoldTrialsToStorage(updated);
    setTrialsState(updated);

    if (updatedTarget) {
      syncTrialToBackend(updatedTarget);
    }

    // 전역 알림 발송 (해당하는 상대 회사에게만 격리 발송)
    const targetProject = current.find((p) => p.id === projectId);
    dispatchGlobalNotification({
      menuName: isMpsi ? "금형외주 - 시사출 육성관리" : "금형개발 - 시사출 육성 및 승인",
      menuPath: isMpsi ? "/portal/vendor-portal/mold/trial" : "/portal/mold-dev/trial",
      senderCompany: cleanComp,
      senderName: cleanAuthor,
      content: `[${targetProject?.projectNo} 시사출육성 메모] ${memo.content}`,
      projectNo: targetProject?.projectNo,
      targetRole: isMpsi ? "VENDOR_MOLD" : "MPSI",
      targetVendorName: isMpsi ? (targetProject?.moldVendor || "우성정공(주)") : undefined,
    });
  };

  // 5대 서류 승인/반려 및 금형 승인 차수 전환
  const verifyFinalDoc = (
    projectId: number,
    docKey: FinalDeliveryFile["key"],
    isVerified: boolean,
    verifiedBy: string,
    isRejected?: boolean,
    rejectReason?: string
  ) => {
    const current = getStoredMoldTrials();
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    let updatedTarget: MoldTrialProject | undefined;
    const updated = current.map((p) => {
      if (p.id !== projectId) return p;

      const updatedDocs = p.finalDocuments.map((d) => {
        if (d.key !== docKey) return d;
        return {
          ...d,
          isVerified: isVerified,
          isRejected: isRejected ?? false,
          verifiedBy: verifiedBy,
          verifiedAt: dateStr,
          rejectReason: rejectReason,
        };
      });

      const allVerified = updatedDocs.every((d) => Boolean(d.fileName) && d.isVerified);
      const nextDegree = allVerified ? "금형 승인" : p.currentTrial;

      const merged = {
        ...p,
        finalDocuments: updatedDocs,
        currentTrial: nextDegree,
        isMoldApproved: allVerified,
        updatedAt: dateStr,
      };
      updatedTarget = merged;
      return merged;
    });

    saveMoldTrialsToStorage(updated);
    setTrialsState(updated);

    if (updatedTarget) {
      syncTrialToBackend(updatedTarget);
    }
  };

  // 초기화
  const resetTrials = () => {
    saveMoldTrialsToStorage(INITIAL_MOLD_TRIALS);
    setTrialsState(INITIAL_MOLD_TRIALS);
  };

  return {
    trials,
    isLoading,
    refreshFromDb,
    setTrials,
    updateTrialProject,
    addMemoLog,
    verifyFinalDoc,
    resetTrials,
  };
}

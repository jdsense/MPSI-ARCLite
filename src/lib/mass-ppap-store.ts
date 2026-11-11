"use client";

import { useState, useEffect, useCallback } from "react";
import { SyncService } from "@/services/sync-service";
import { cleanCompanyAuthor } from "./notification-store";

// 1. PPAP 필수 제출 서류 6대 핵심 패키지 인터페이스 (레거시 호환용)
export interface PPAPDocumentItem {
  id: string;
  docCode: string;          // 문서 코드 (PSW, DIM, CPK, OQC, MS, SOP)
  docName: string;          // 서류명
  isSubmitted: boolean;     // 등록 여부
  fileName?: string;        // 업로드 파일명
  fileSize?: string;        // 파일 용량 (예: 2.4MB)
  fileUrl?: string;         // 파일 다운로드 URL
  submittedDate?: string;   // 제출일
  reviewStatus: "적합" | "보완요청" | "미검토";
  reviewComment?: string;   // MPSI 개별 서류 심사의견
}

// 2. 양산 승인 통합 패키지 서류 회차별 제출 이력 인터페이스
export interface PPAPPackageSubmissionHistoryItem {
  round: number;                // 1회차, 2회차, 3회차, 4회차 ...
  fileName: string;             // 통합 서류 파일명 (예: 20261014.양산승인서류_Front door upper cover LR.pdf)
  fileSize?: string;            // 파일 크기 (예: 3.5 MB)
  fileUrl?: string;             // 다운로드 URL (/api/v1/files/download?fileName=...)
  submittedAt: string;          // 제출 일시 (예: 2026.10.14. 16:45 입력)
  authorName: string;           // 작성자 (예: 뉴몰드 한승호 부장)
  memo: string;                 // 업무 이력 메모 (예: 261014_조립 갭 전수 측정치 포함 최종 패키지 제출)
  reviewStatus: "승인" | "반려" | "심사진행중" | "검토 대기";
  reviewComment?: string;       // MPSI 심사의견 또는 반려 사유
  reviewedAt?: string;          // 심사 일시
}

// 3. PPAP 양산 승인 대상 프로젝트 인터페이스
export interface PPAPApprovalItem {
  id: number;
  ppapNo: string;           // PPAP 관리번호 (예: PPAP-MI26005P0)
  projectNo: string;        // 프로젝트 관리번호 (MI26005P0 등)
  partNo: string;           // 제품 품번 (예: 84710-MI260-01)
  projectName: string;      // 차종 / 프로젝트명
  productName: string;      // 제품명
  moldVendor: string;       // 우성정공(주) 등
  massVendor: string;       // (주)뉴몰드 등
  moldNo: string;           // 금형번호 (예: MI26005P0M)
  machineNo: string;        // 사출기 호기 (예: 사출 6호기 (650T))
  packageSubmissions: PPAPPackageSubmissionHistoryItem[]; // 양산승인 통합 패키지 회차별 제출 이력 (영구보존)

  // 상태 관리: 서류 제출 전이면 "검토 대기", 승인되면 "승인완료", 나머지 상태는 "검토 진행 중"
  ppapStatus: "작성중" | "서류접수(심사대기)" | "보완 중(진행율)" | "양산 승인 (Pass)" | "수정요청 (Fail)" | "검토 대기" | "검토 진행 중" | "승인완료";

  // 세부 품질 성적 지표
  continuousHours: number;  // 연속사출 가동시간 (실적)
  totalShotCount?: number;  // 연속사출 총 타수 (Shot)
  totalProduced?: number;   // 양품 생산수량 (EA)
  defectRate?: number;      // 불량률 (%)
  measuredCpk: number;      // 공정능력지수 Cpk (실적)
  oqcResult: "OK" | "NG";   // 뉴몰드 자체 OQC 판정 (실적)
  vendorOpinion?: string;   // 외주업체 제출 소견
  vendorSubmittedDate?: string; // 최종 제출일시
  completionRate: number;   // 완성률 (%)
  documents: PPAPDocumentItem[];
  mpsiOpinion: string;      // MPSI 품질책임자 심사의견
  rejectReason?: string;    // MPSI 반려/보완 사유 (Fail 시)
  partPoNo?: string;        // 완제품 구매 PO 번호 (Pass 시 MPSI가 발행)
  partPoDate?: string;      // 발주일자
  approvalOfficer?: string; // 승인권자 (품질본부장)
  currentStep: number;      // 13단계 중 위치 (Step 12: 양산품질 검증 PPAP, Step 13: 승인완료)
  updatedAt: string;
}

// 양산승인 상태 판정 함수
export function getMassPpapStatus(item: PPAPApprovalItem): "검토 대기" | "검토 진행 중" | "승인완료" {
  if (!item.packageSubmissions || item.packageSubmissions.length === 0) {
    return "검토 대기";
  }
  const lastSub = item.packageSubmissions[item.packageSubmissions.length - 1];
  if (lastSub.reviewStatus === "승인" || item.ppapStatus === "양산 승인 (Pass)" || item.ppapStatus === "승인완료") {
    return "승인완료";
  }
  return "검토 진행 중";
}

// 6대 필수 PPAP 서류 기본 템플릿
export const DEFAULT_PPAP_DOCUMENTS: PPAPDocumentItem[] = [
  { id: "d1", docCode: "PSW", docName: "부품제출보증서 (Part Submission Warrant)", isSubmitted: false, reviewStatus: "미검토" },
  { id: "d2", docCode: "DIM", docName: "초·중·종물 전수 치수검사 성적서", isSubmitted: false, reviewStatus: "미검토" },
  { id: "d3", docCode: "CPK", docName: "공정능력분석 보고서 (Cpk ≥ 1.33)", isSubmitted: false, reviewStatus: "미검토" },
  { id: "d4", docCode: "OQC", docName: "양산처 자체 OQC 출하검사 성적서", isSubmitted: false, reviewStatus: "미검토" },
  { id: "d5", docCode: "MS", docName: "마스터 샘플(Master Sample) 한도견본 등록서", isSubmitted: false, reviewStatus: "미검토" },
  { id: "d6", docCode: "SOP", docName: "사출조건표 및 표준작업지침서", isSubmitted: false, reviewStatus: "미검토" },
];

export const INITIAL_PPAP_DATA: PPAPApprovalItem[] = [];

const STORAGE_KEY = "mpsi_mass_ppap_store_v5";
const SYNC_EVENT_NAME = "mpsi_mass_ppap_updated";

export function deriveMoldNo(projectNo?: string): string {
  if (!projectNo) return "-";
  const base = projectNo.replace(/^[Qq]/, "MI").replace(/P\d+$/i, "").replace(/-\d+$/, "");
  return `${base}M`;
}

// 더미 프로젝트 필터링 헬퍼 (실제 프로젝트 MI26001 등은 정상 보존)
export function isDummyPpap(item: any): boolean {
  if (!item) return true;
  const pNo = String(item.projectNo || item.ProjectID || "").trim();
  const pName = String(item.projectName || item.ProjectName || "").trim();
  if (!pNo || pNo === "undefined" || pNo === "null" || pNo === "DUMMY") return true;
  return (
    pNo === "MI25001P1" ||
    pNo === "MI25001P2" ||
    pName.includes("현대 NT5") ||
    pName.includes("NQ5")
  );
}

export function getStoredPpapItems(): PPAPApprovalItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.filter((it: any) => !isDummyPpap(it));
      }
    }
  } catch (e) {
    console.error("Failed to read PPAP from storage", e);
  }
  return [];
}

export function savePpapItemsToStorage(items: PPAPApprovalItem[]): void {
  if (typeof window === "undefined") return;
  try {
    const cleanList = items.filter((it) => !isDummyPpap(it));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanList));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, { detail: cleanList }));
  } catch (e) {
    console.error("Failed to save PPAP items to storage", e);
  }
}

// 백엔드 API DB 동기화 함수
export async function syncPpapToBackend(item: PPAPApprovalItem) {
  try {
    const res = await fetch("/api/v1/mass-prod/ppap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      console.warn("syncPpapToBackend status not ok:", res.status);
    }
  } catch (err) {
    console.warn("syncPpapToBackend error:", err);
  }
}

// 양산성 검증 완료 시 PPAP 자동 등재 전역 함수
export async function autoEnrollMassPpapFromValidation(valProject: any): Promise<PPAPApprovalItem | null> {
  if (typeof window === "undefined" || !valProject?.projectNo || isDummyPpap(valProject)) return null;

  const current = getStoredPpapItems();
  const pid = valProject.officialProjectNo || valProject.projectNo;
  const existing = current.find((p) => p.projectNo === pid || p.projectNo === valProject.projectNo);
  if (existing) return existing;

  const now = new Date();
  const dateFormatted = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;

  const lastTrial = valProject.trials?.[valProject.trials.length - 1] || valProject.trials?.[0];
  const derivedMoldNo = (valProject.moldNo && valProject.moldNo !== "MI26005P0M") 
    ? valProject.moldNo 
    : deriveMoldNo(pid);
  const derivedMachineNo = lastTrial?.machineNo || valProject.machineNo || "사출 6호기 (650T)";

  const newPpap: PPAPApprovalItem = {
    id: Date.now(),
    ppapNo: `PPAP-${pid}`,
    projectNo: pid,
    partNo: valProject.partNo || valProject.partNumber || "-",
    projectName: valProject.projectName || pid,
    productName: valProject.productName || "사출 성형 부품",
    moldVendor: valProject.moldVendor || "우성정공(주)",
    massVendor: valProject.massVendor || "(주)뉴몰드",
    moldNo: derivedMoldNo,
    machineNo: derivedMachineNo,
    packageSubmissions: [],
    ppapStatus: "검토 대기",
    continuousHours: lastTrial?.continuousHours ?? 12,
    totalShotCount: lastTrial?.totalShotCount ?? 0,
    totalProduced: lastTrial?.totalProduced ?? 0,
    defectRate: lastTrial?.defectRate ?? 0,
    measuredCpk: lastTrial?.measuredCpk ?? 1.33,
    oqcResult: "OK",
    vendorOpinion: lastTrial?.opinion || "",
    completionRate: 0,
    documents: DEFAULT_PPAP_DOCUMENTS,
    mpsiOpinion: "",
    currentStep: 12,
    updatedAt: `${dateFormatted} 09:00`,
  };

  const nextItems = [...current, newPpap];
  savePpapItemsToStorage(nextItems);
  await syncPpapToBackend(newPpap);
  return newPpap;
}

export function useMassPpapStore() {
  const [items, setItems] = useState<PPAPApprovalItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // DB로부터 최신 데이터 조회 및 로컬 스토리지 동기화
  const refreshFromDb = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/mass-prod/ppap");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const cleaned = json.data.filter((it: any) => !isDummyPpap(it));
          setItems(cleaned);
          savePpapItemsToStorage(cleaned);
          setIsLoaded(true);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to fetch PPAP from DB, fallback to localStorage:", e);
    }

    // 로컬 스토리지 Fallback
    const stored = getStoredPpapItems();
    setItems(stored);
    setIsLoaded(true);
    setIsLoading(false);
  }, []);

  // 마운트 시 DB 동기화 호출
  useEffect(() => {
    refreshFromDb();

    const handleSync = () => {
      try {
        const stored = getStoredPpapItems();
        setItems(stored);
      } catch (e) {
        console.error("Failed to sync PPAP store:", e);
      }
    };

    window.addEventListener(SYNC_EVENT_NAME, handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [refreshFromDb]);

  const saveItems = (newItems: PPAPApprovalItem[]) => {
    const cleaned = newItems.filter((it) => !isDummyPpap(it));
    setItems(cleaned);
    savePpapItemsToStorage(cleaned);
  };

  // 양산성 검증 완료 시 PPAP 자동 등재
  const autoEnrollPpapFromValidation = async (valProject: any) => {
    return autoEnrollMassPpapFromValidation(valProject);
  };

  // 신규 회차 양산 승인 서류 패키지 업로드 및 메모 등록 (영구 보존, 기존 파일 미삭제)
  const submitPackageSubmission = async (
    id: number,
    submission: {
      fileName?: string;
      fileSize?: string;
      fileUrl?: string;
      authorName?: string;
      memo: string;
      vendorOpinion?: string;
    }
  ) => {
    const now = new Date();
    const dateFormatted = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}. ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const dateSimple = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

    let updatedTarget: PPAPApprovalItem | null = null;

    const nextItems = items.map((item) => {
      if (item.id === id) {
        const currentSubs = item.packageSubmissions || [];
        const nextRound = currentSubs.length + 1;
        const newFileName = submission.fileName || `${dateSimple}.양산승인서류_${item.productName.replace(/[\/\\]/g, "_")}.pdf`;
        
        const newHistoryItem: PPAPPackageSubmissionHistoryItem = {
          round: nextRound,
          fileName: newFileName,
          fileSize: submission.fileSize || "3.5 MB",
          fileUrl: submission.fileUrl || `/api/v1/files/download?fileName=${encodeURIComponent(newFileName)}`,
          submittedAt: `${dateFormatted} 입력`,
          authorName: cleanCompanyAuthor(submission.authorName, item.massVendor || "(주)뉴몰드"),
          memo: submission.memo || `${dateSimple.slice(2)}_양산승인서류 등록`,
          reviewStatus: "심사진행중",
          reviewComment: "MPSI 품질본부 서류 패키지 접수 완료. 정밀 심사진행 중입니다.",
        };

        const updatedSubmissions = [...currentSubs, newHistoryItem];

        const updated: PPAPApprovalItem = {
          ...item,
          packageSubmissions: updatedSubmissions,
          ppapStatus: "검토 진행 중" as const,
          vendorOpinion: submission.vendorOpinion ?? item.vendorOpinion,
          vendorSubmittedDate: dateFormatted,
          completionRate: 50,
          updatedAt: dateFormatted,
        };
        updatedTarget = updated;
        return updated;
      }
      return item;
    });

    saveItems(nextItems);

    if (updatedTarget) {
      await syncPpapToBackend(updatedTarget);
    }

    // [분산 노드 API 연계] PPAP 승인서류 패키지 제출 시 아웃박스 이벤트 자동 큐잉
    if (typeof window !== "undefined") {
      const targetItem = nextItems.find((p) => p.id === id);
      if (targetItem) {
        SyncService.queueOutboxEvent({
          eventType: "MASS_PPAP_SUBMITTED",
          targetNodeId: "MPSI_HQ",
          entityName: "PPAPApprovalItem",
          entityId: targetItem.projectNo,
          data: {
            projectNo: targetItem.projectNo,
            projectName: targetItem.projectName,
            massVendor: targetItem.massVendor,
            status: targetItem.ppapStatus,
            submittedAt: targetItem.updatedAt || new Date().toISOString(),
          },
        });
      }
    }
  };

  // 외주업체(뉴몰드)가 실적 및 서류를 등록/제출할 때 (기존 호환)
  const submitVendorPerformance = async (
    id: number,
    data: {
      continuousHours: number;
      totalShotCount?: number;
      totalProduced?: number;
      defectRate?: number;
      measuredCpk: number;
      oqcResult: "OK" | "NG";
      machineNo: string;
      vendorOpinion: string;
      documents: PPAPDocumentItem[];
    }
  ) => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const submittedCount = data.documents.filter(d => d.isSubmitted).length;
    const completionRate = Math.round((submittedCount / data.documents.length) * 100);

    let updatedTarget: PPAPApprovalItem | null = null;

    const nextItems = items.map(item => {
      if (item.id === id) {
        const updated: PPAPApprovalItem = {
          ...item,
          continuousHours: data.continuousHours,
          totalShotCount: data.totalShotCount,
          totalProduced: data.totalProduced,
          defectRate: data.defectRate,
          measuredCpk: data.measuredCpk,
          oqcResult: data.oqcResult,
          machineNo: data.machineNo || item.machineNo,
          vendorOpinion: data.vendorOpinion,
          vendorSubmittedDate: dateStr,
          documents: data.documents,
          completionRate,
          ppapStatus: "검토 진행 중" as const,
          updatedAt: dateStr,
        };
        updatedTarget = updated;
        return updated;
      }
      return item;
    });

    saveItems(nextItems);

    if (updatedTarget) {
      await syncPpapToBackend(updatedTarget);
    }
  };

  // MPSI 본사가 개별 서류 판정 및 최종 승인(Pass) / 반려(Fail) 내릴 때
  const reviewMpsiDecision = async (
    id: number,
    decision: {
      status: "양산 승인 (Pass)" | "수정요청 (Fail)" | "승인완료" | "검토 진행 중";
      mpsiOpinion: string;
      rejectReason?: string;
      documents?: PPAPDocumentItem[];
      approvalOfficer?: string;
    }
  ) => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    let updatedTarget: PPAPApprovalItem | null = null;

    const nextItems = items.map(item => {
      if (item.id === id) {
        const isPass = decision.status === "양산 승인 (Pass)" || decision.status === "승인완료";
        const generatedPoNo = isPass 
          ? (item.partPoNo || `PO-2026-${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(item.id).padStart(2, "0")}`)
          : item.partPoNo;

        // 최신 회차의 reviewStatus도 승인/반려로 동기화
        const updatedSubs = (item.packageSubmissions || []).map((sub, idx, arr) => {
          if (idx === arr.length - 1) {
            return {
              ...sub,
              reviewStatus: isPass ? ("승인" as const) : ("반려" as const),
              reviewComment: isPass ? decision.mpsiOpinion : (decision.rejectReason || decision.mpsiOpinion),
              reviewedAt: dateStr,
            };
          }
          return sub;
        });

        const updated: PPAPApprovalItem = {
          ...item,
          ppapStatus: isPass ? ("승인완료" as const) : ("검토 진행 중" as const),
          currentStep: isPass ? 13 : 12,
          partPoNo: generatedPoNo,
          partPoDate: isPass ? (item.partPoDate || dateStr.split(" ")[0]) : item.partPoDate,
          approvalOfficer: isPass ? (decision.approvalOfficer || "이진수 품질본부장 (MPSI 전결)") : item.approvalOfficer,
          mpsiOpinion: decision.mpsiOpinion,
          rejectReason: isPass ? "" : (decision.rejectReason || ""),
          documents: decision.documents || item.documents,
          packageSubmissions: updatedSubs,
          completionRate: isPass ? 100 : (item.completionRate || 50),
          updatedAt: dateStr,
        };
        updatedTarget = updated;
        return updated;
      }
      return item;
    });

    saveItems(nextItems);

    if (updatedTarget) {
      await syncPpapToBackend(updatedTarget);
    }

    if (typeof window !== "undefined") {
      const targetItem = nextItems.find((p) => p.id === id);
      if (targetItem) {
        SyncService.queueOutboxEvent({
          eventType: "MASS_PPAP_SUBMITTED",
          targetNodeId: "MPSI_HQ",
          entityName: "PPAPApprovalItem",
          entityId: targetItem.projectNo,
          data: {
            projectNo: targetItem.projectNo,
            projectName: targetItem.projectName,
            massVendor: targetItem.massVendor,
            status: targetItem.ppapStatus,
            submittedAt: targetItem.updatedAt || new Date().toISOString(),
          },
        });
      }
    }
  };

  // 특정 회차 심사 판정 (승인 / 반려) 및 메모 등록
  const reviewRoundSubmission = async (
    id: number,
    round: number,
    status: "승인" | "반려",
    comment: string,
    reviewerName: string = "MPSI 품질관리팀"
  ) => {
    const now = new Date();
    const dateFormatted = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}. ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    let updatedTarget: PPAPApprovalItem | null = null;

    const nextItems = items.map((item) => {
      if (item.id === id) {
        let isLastRoundApproved = false;
        const currentSubs = item.packageSubmissions || [];
        const updatedSubs = currentSubs.map((sub, idx, arr) => {
          if (sub.round === round) {
            if (idx === arr.length - 1 && status === "승인") {
              isLastRoundApproved = true;
            }
            return {
              ...sub,
              reviewStatus: status,
              reviewComment: comment,
              reviewedAt: `${dateFormatted} 심사`,
            };
          }
          return sub;
        });

        const isPass = isLastRoundApproved;
        const generatedPoNo = isPass
          ? (item.partPoNo || `PO-2026-${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(item.id).padStart(2, "0")}`)
          : item.partPoNo;

        const updated: PPAPApprovalItem = {
          ...item,
          packageSubmissions: updatedSubs,
          ppapStatus: isPass ? ("승인완료" as const) : ("검토 진행 중" as const),
          currentStep: isPass ? 13 : item.currentStep,
          partPoNo: generatedPoNo,
          partPoDate: isPass ? (item.partPoDate || dateFormatted.split(" ")[0]) : item.partPoDate,
          mpsiOpinion: comment,
          rejectReason: status === "반려" ? comment : item.rejectReason,
          updatedAt: dateFormatted,
        };
        updatedTarget = updated;
        return updated;
      }
      return item;
    });

    saveItems(nextItems);

    if (updatedTarget) {
      await syncPpapToBackend(updatedTarget);
    }
  };

  const resetToInitial = () => {
    saveItems(INITIAL_PPAP_DATA);
  };

  return {
    items,
    isLoaded,
    isLoading,
    refreshFromDb,
    saveItems,
    autoEnrollPpapFromValidation,
    submitPackageSubmission,
    submitVendorPerformance,
    reviewMpsiDecision,
    reviewRoundSubmission,
    resetToInitial,
  };
}

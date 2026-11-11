"use client";

import { useState, useEffect, useCallback } from "react";

// 1. 양산성 검증 6대 체크리스트 항목 카테고리
export type ValidationCategory = 
  | "치수검토보고서"
  | "외관검토보고서"
  | "금형검사보고서"
  | "시사출 보고서(사출조건표 포함)"
  | "공정능력 검사 보고서"
  | "CAPA 검토 보고서"
  | "치수 만족도"
  | "외관 만족도"
  | "금형사양검사"
  | "양산성(목표CT)"
  | "CPK 검증"
  | "CAPA 검증";

export interface ValidationCheckItem {
  id: string;
  category: ValidationCategory;
  description: string;
  targetSpec: string;     // 목표 기준치 (예: Cpk >= 1.33, CT <= 35s)
  actualValue: string;    // 실측 데이터 (예: Cpk 1.45, CT 34.2s)
  isResolved: boolean;    // 적합/부적합 여부
  attachedReport?: string;// 첨부 성적서/보고서
  attachedReportSize?: string;
  attachedReportUrl?: string; // 실제 다운로드용 파일 URL
  uploadMemo?: string;    // 파일 첨부 시 작성한 메모
  uploadAuthor?: string;  // 작성자
  uploadedAt?: string;    // 업로드 일시
}

// 2. 성적서/보고서 파일 업로드 시 메모 관리 이력 (영구 보존)
export interface ValidationUploadMemoHistory {
  id: string;
  category: string;
  fileName: string;
  fileSize?: string;
  fileUrl?: string;
  memo: string;
  author: string;
  uploadedAt: string;
}

// 3. 시양산 차수(T1~Tn) 데이터 인터페이스 (12~24h 연속사출)
export interface MassValidationRecord {
  trialDegree: string;        // T1, T2, ... Tn
  testDate: string;           // 시양산 일자
  machineNo: string;          // 사출기 호기 (예: 사출 6호기 650T)
  continuousHours: number;    // 연속 가동 시간 (12~24시간)
  totalShotCount: number;     // 연속 사출 타수 (Shot)
  totalProduced: number;      // 생산 수량
  defectCount: number;        // 불량 수량
  defectRate: number;         // 불량률 (%)
  targetDefectRate?: number;  // 시양산 목표 불량률 (%) - 기본 1.0%
  measuredCpk: number;        // 실측 Cpk 지수
  targetCpk?: number;         // 관리기준 Cpk (기본 1.33)
  measuredCycleTime: number;  // 실측 C/T (초)
  targetCycleTime: number;    // 목표 C/T (초)
  dailyCapa: number;          // 일일 생산 캐파 (EA/일)
  targetDailyCapa: number;    // 고객 요구 캐파 (EA/일)
  completionRate: number;     // 양산 검증 완성률 (%)
  status: "양산승인(내부)" | "보완요청(금형수정)" | "시양산 진행중";
  checklist: ValidationCheckItem[];
  opinion: string;            // 종합 평가 소견
  uploadHistory?: ValidationUploadMemoHistory[]; // 영구 보존 메모 이력
}

// 공정 10-1: 뉴몰드 ➔ 우성정공 긴급 금형수정 요청 MPSI CC 모니터링 인터페이스
export interface UrgentMoldRevisionDetail {
  revisionNo: string;
  defectPoint: string;
  defectTiming: string;
  defectType: string;
  defectDescription: string;
  urgency: string;
  woosungAction: string;
  woosungEngineer: string;
  status: "우성수정요청" | "우성엔지니어조치중" | "금형수정완료(재사출대기)";
  requestDate: string;
  completedDate?: string;
  mpsiMonitoringOpinion?: string;
}

// 4. 프로젝트별 시양산 관리 인터페이스
export interface MassValidationProject {
  id: number;
  projectNo: string;          // MPSI 프로젝트 번호 (예: MI26005P0)
  officialProjectNo?: string; // MPSI 수주 관리번호
  projectName: string;        // 프로젝트명 / 차종
  productName: string;        // 제품명
  customerName?: string;      // 원청 고객사
  moldVendor: string;         // 금형 제작처 (우성정공 등)
  massVendor: string;         // 양산처 (뉴몰드 등)
  currentTrial: string;       // 현재 시양산 차수
  moldTransferDate?: string;  // 금형이관일
  targetMassApprovalDate?: string; // 양산승인 납기일
  overallStatus: "시양산 대기" | "시양산 진행중" | "12H 연속사출중" | "CPK 검증완료" | "양산승인 완료" | "검증완료" | "검증 대기" | "검증 진행 중";
  currentStep: number;        // 13단계 중 위치 (Step 11)
  moldTransferConfirmed: boolean; // 금형인수인계증 접수 확인
  urgentMoldRevision?: string;
  urgentRevisionDetail?: UrgentMoldRevisionDetail;
  mpsiWitnessInspector?: string;
  trials: MassValidationRecord[];
  updatedAt: string;
}

export const STORAGE_KEY = "mpsi_mass_validations_v4";
export const EVENT_NAME = "mpsi_mass_validation_update";

// 구형 레거시 정적 더미 프로젝트 필터링 헬퍼 (실제 프로젝트 MI26001P0 등은 정상 허용)
export function isDummyValidation(p: Partial<MassValidationProject>): boolean {
  const pNo = p.projectNo || "";
  const name = p.projectName || "";
  return (
    pNo === "MI25001P1" ||
    pNo === "MI25001P2" ||
    name.includes("현대 NT5") ||
    name.includes("NQ5")
  );
}

// 초기 샘플 데이터 (더미 완전 배제)
export const INITIAL_MASS_VALIDATIONS: MassValidationProject[] = [];

// 백엔드 비동기 동기화 헬퍼
export async function syncMassValidationToBackend(item: MassValidationProject) {
  if (typeof window === "undefined" || !item.projectNo || isDummyValidation(item)) return;
  try {
    await fetch("/api/v1/mass-prod/validations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
  } catch (err) {
    console.warn("[syncMassValidationToBackend Warning]", err);
  }
}

export function getStoredMassValidations(): MassValidationProject[] {
  if (typeof window === "undefined") return [];
  try {
    // 구 버전 더미 스토리지 클린업
    localStorage.removeItem("mpsi_mass_validations_v1");
    localStorage.removeItem("mpsi_mass_validations_v2");
    localStorage.removeItem("mpsi_mass_validations_v3");

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((it: MassValidationProject) => !isDummyValidation(it));
    }
    return [];
  } catch (e) {
    console.error("Failed to read mass validations from storage", e);
    return [];
  }
}

export function saveMassValidationsToStorage(
  updater: MassValidationProject[] | ((prev: MassValidationProject[]) => MassValidationProject[])
): void {
  if (typeof window === "undefined") return;
  try {
    const current = getStoredMassValidations();
    const next = typeof updater === "function" ? updater(current) : updater;
    const cleanList = next.filter((it) => !isDummyValidation(it));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanList));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: cleanList }));
  } catch (e) {
    console.error("Failed to save mass validations to storage", e);
  }
}

export function useMassValidationStore() {
  const [validations, setValidationsState] = useState<MassValidationProject[]>(() => {
    return getStoredMassValidations();
  });
  const [isLoading, setIsLoading] = useState(false);

  // 백엔드 DB로부터 최신 데이터 조회 및 로컬 스토리지 갱신
  const refreshFromDb = useCallback(async () => {
    if (typeof window === "undefined") return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/mass-prod/validations", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const cleanItems: MassValidationProject[] = data.data.filter((it: MassValidationProject) => !isDummyValidation(it));
          saveMassValidationsToStorage(cleanItems);
          setValidationsState(cleanItems);
          return cleanItems;
        }
      }
    } catch (err) {
      console.warn("[refreshFromDb Validations Warning]", err);
    } finally {
      setIsLoading(false);
    }
    return getStoredMassValidations();
  }, []);

  useEffect(() => {
    refreshFromDb();

    const handleUpdate = () => {
      setValidationsState(getStoredMassValidations());
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [refreshFromDb]);

  const setValidations = (
    updater: MassValidationProject[] | ((prev: MassValidationProject[]) => MassValidationProject[])
  ) => {
    saveMassValidationsToStorage(updater);
  };

  // 프로젝트별 수정 업데이트 (로컬 + DB 영구 동기화)
  const updateValidationProject = (id: number, updates: Partial<MassValidationProject>) => {
    const current = getStoredMassValidations();
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    let targetUpdated: MassValidationProject | undefined;

    const updated = current.map((item) => {
      if (item.id === id || (updates.projectNo && item.projectNo === updates.projectNo)) {
        const merged: MassValidationProject = { ...item, ...updates, updatedAt: dateStr };
        targetUpdated = merged;
        return merged;
      }
      return item;
    });

    saveMassValidationsToStorage(updated);
    setValidationsState(updated);

    if (targetUpdated) {
      syncMassValidationToBackend(targetUpdated);
    }
  };

  // 차수 실적 업데이트 헬퍼
  const saveValidationTrial = (
    projectNo: string,
    trialDegree: string,
    trialUpdates: Partial<MassValidationRecord>,
    projectUpdates?: Partial<MassValidationProject>
  ) => {
    const current = getStoredMassValidations();
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    let targetUpdated: MassValidationProject | undefined;

    const nextList = current.map((item) => {
      if (item.projectNo !== projectNo && item.officialProjectNo !== projectNo) return item;

      const updatedTrials = item.trials.map((tr) => {
        if (tr.trialDegree === trialDegree) {
          return { ...tr, ...trialUpdates };
        }
        return tr;
      });

      const merged: MassValidationProject = {
        ...item,
        ...projectUpdates,
        trials: updatedTrials,
        updatedAt: dateStr,
      };
      targetUpdated = merged;
      return merged;
    });

    saveMassValidationsToStorage(nextList);
    setValidationsState(nextList);

    if (targetUpdated) {
      syncMassValidationToBackend(targetUpdated);
    }
  };

  // 초기화
  const resetValidations = () => {
    saveMassValidationsToStorage(INITIAL_MASS_VALIDATIONS);
    setValidationsState(INITIAL_MASS_VALIDATIONS);
  };

  return {
    validations,
    setValidations,
    updateValidationProject,
    saveValidationTrial,
    resetValidations,
    refreshFromDb,
    isLoading,
  };
}

// 양산 견적 수주확정 / 단가합의완료 시 시양산 검증(Step 11) 자동 등재 함수
export function autoEnrollMassValidationFromQuotation(quoteItem: any) {
  if (typeof window === "undefined" || !quoteItem?.projectNo || isDummyValidation(quoteItem)) return;

  const current = getStoredMassValidations();
  const pid = quoteItem.projectNo;
  const isSelf = quoteItem.productionType === "IN_HOUSE" || quoteItem.status === "자체진행";
  const selectedVendor =
    quoteItem.selectedVendorName ||
    quoteItem.vendorQuotes?.find((vq: any) => vq.status === "수주확정")?.vendorName ||
    quoteItem.vendorName ||
    (isSelf ? "MPSI 자체사출공장" : "(주)뉴몰드");

  const exists = current.some((it) => it.projectNo === pid || it.officialProjectNo === pid);
  if (exists) {
    // 이미 등록된 경우 최신 수주확정 양산처 및 사양 정보로 업데이트
    const updated = current.map((it) => {
      if (it.projectNo === pid || it.officialProjectNo === pid) {
        return {
          ...it,
          massVendor: selectedVendor,
          projectName: quoteItem.projectName || it.projectName,
          productName: quoteItem.productName || it.productName,
          customerName: quoteItem.customerName || it.customerName,
          targetMassApprovalDate: quoteItem.targetMassApprovalDate || it.targetMassApprovalDate,
        };
      }
      return it;
    });
    saveMassValidationsToStorage(updated);
    const target = updated.find((it) => it.projectNo === pid || it.officialProjectNo === pid);
    if (target) syncMassValidationToBackend(target);
    return;
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const newProject: MassValidationProject = {
    id: Date.now(),
    projectNo: pid,
    officialProjectNo: quoteItem.officialProjectNo || pid,
    projectName: quoteItem.projectName || "Door Armrest Base",
    productName: quoteItem.productName || "Main Part",
    customerName: quoteItem.customerName || "현대자동차 (1차사)",
    moldVendor: "우성정공(주)",
    massVendor: selectedVendor,
    currentTrial: "T1",
    moldTransferDate: quoteItem.massStartDate || "2026-12-05",
    targetMassApprovalDate: quoteItem.targetMassApprovalDate || "2026-12-20",
    overallStatus: "시양산 대기",
    currentStep: 11,
    moldTransferConfirmed: true,
    mpsiWitnessInspector: "이인배 품질차장 (MPSI 기술품질팀)",
    trials: [
      {
        trialDegree: "T1",
        testDate: dateStr,
        machineNo: quoteItem.machineTonnage || "사출 6호기 (650T)",
        continuousHours: 12,
        totalShotCount: 0,
        totalProduced: 0,
        defectCount: 0,
        defectRate: 0,
        targetDefectRate: 1.0,
        measuredCpk: 0,
        targetCpk: 1.33,
        measuredCycleTime: 0,
        targetCycleTime: quoteItem.targetCycleTime || 35,
        dailyCapa: 0,
        targetDailyCapa: 4500,
        completionRate: 0,
        status: "시양산 진행중",
        checklist: [
          { id: "v1", category: "치수검토보고서", description: "CTQ 주요 치수 5개 포인트 전수 측정", targetSpec: "±0.05mm", actualValue: "", isResolved: false },
          { id: "v2", category: "외관검토보고서", description: "12시간 연속 사출 시 미성형, 가스그을림, 웰드라인 점검", targetSpec: "한도견본 일치", actualValue: "", isResolved: false },
          { id: "v3", category: "금형검사보고서", description: "지정 사출기 취부 및 슬라이드 코어 유압 연동", targetSpec: "작동 이상 무", actualValue: "", isResolved: false },
          { id: "v4", category: "시사출 보고서(사출조건표 포함)", description: "연속 사출 평균 C/T 검증 및 표준 사출 성형 조건표", targetSpec: "35.0s 이하", actualValue: "", isResolved: false },
          { id: "v5", category: "공정능력 검사 보고서", description: "연속 생산 30개 샘플 치수 공정능력지수(Cpk) 산출", targetSpec: "Cpk ≥ 1.33", actualValue: "", isResolved: false },
          { id: "v6", category: "CAPA 검토 보고서", description: "일일 3교대 연속 생산 기준 공급 캐파 검증", targetSpec: "4,500 EA/일 이상", actualValue: "", isResolved: false },
        ],
        opinion: isSelf
          ? "[자체사출 배정] MPSI 사내 공장에서 12시간 연속 사출 및 Cpk 검증 착수 대기 중입니다."
          : `[사출 수주확정 연계] 양산 견적 체결(${selectedVendor})에 따라 12~24H 연속 사출 양산성 검증(Step 11)이 자동 등재되었습니다.`,
        uploadHistory: [],
      },
    ],
    updatedAt: `${dateStr} 09:00`,
  };

  saveMassValidationsToStorage([newProject, ...current]);
  syncMassValidationToBackend(newProject);
}

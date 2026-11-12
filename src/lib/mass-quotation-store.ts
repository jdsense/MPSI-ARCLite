// src/lib/mass-quotation-store.ts
"use client";

import { useState, useEffect } from "react";
import { autoEnrollMassValidationFromQuotation } from "./mass-validation-store";
import { updateProjectProcess } from "./project-store";

// 양산 견적 진행 상태
export type MassQuotationStatus = 
  | "견적요청"       // MPSI에서 양산 외주사로 견적 요청 발행 시
  | "자체진행"       // MPSI 사내 사출공장 직접 진행 시 (견적 패스)
  | "외주견적제출"    // 외주사에서 양산 견적서 작성 후 제출 시
  | "원가검토중"     // MPSI 원가 분석 및 단가 협의 중
  | "단가합의완료"    // 단가 합의 완료
  | "양산계약확정"   // 계약 확정
  | "반려/미성사";   // 반려 또는 미성사

// 양산 견적 협의 댓글
export interface MassQuotationComment {
  id: string;
  author: string;
  authorRole: "MPSI" | "VENDOR";
  content: string;
  createdAt: string;
}

// 개별 사출 양산 협력사의 견적 제출 서류 및 원가 내역 인터페이스
export interface MassVendorQuoteSubmission {
  id: string;
  vendorName: string;                     // 업체명 (예: (주)뉴몰드, 세원사출(주) 등)
  submittedDate: string;                  // 제출일자
  materialCost: number;                   // 재료비 (원/EA)
  processingCost: number;                 // 가공비 (임가공비, 원/EA)
  overheadCost?: number;                  // 일반관리비 (원/EA)
  profitCost?: number;                    // 이윤 (원/EA)
  packagingCost: number;                  // 포장비 (원/EA)
  logisticsCost: number;                  // 운송비 (원/EA)
  unitPrice: number;                      // 견적 제출 단가 = 합계 (원/EA)
  targetCycleTime?: number;               // 제안 C/T (초)
  quotationFileName?: string;             // 첨부 견적서 파일명
  quotationFileSize?: string;             // 파일 크기
  quotationFileUrl?: string;              // 파일 실제 다운로드 URL
  vendorNotes?: string;                   // 공급업체 작성 메모
  mpsiReplies: {                          // 공급업체 메모에 대한 MPSI 답변
    id: string;
    author: string;
    content: string;
    createdAt: string;
  }[];
  status: "제출완료" | "검토협의" | "수주확정" | "반려/미성사";
}

// 공급업체 양산 견적 제출 및 메모 관리 이력 인터페이스 (영구 보존)
export interface MassQuoteSubmissionHistoryItem {
  id: string;
  submissionType: "최초 제출" | "수정 제출";
  revisionNo: number;                     // 차수 (1차, 2차...)
  memo: string;                           // 견적파일 업로드 전 입력한 메모 (필수)
  fileName: string;                       // 당시 첨부된 견적서 파일명
  fileSize?: string;                      // 파일 크기
  fileUrl?: string;                       // 파일 실제 다운로드 URL
  finalUnitPrice: number;                 // 당시 제출 견적단가 (원)
  targetCycleTime?: number;               // 목표 CT (초)
  targetMassApprovalDate?: string;        // 양산 승인 납기일
  massStartDate?: string;                 // 양산 예정일
  submittedAt: string;                    // 제출 일자 및 시간 (YYYY-MM-DD HH:mm:ss)
  author: string;                         // 작성자 / 제출 협력사명
}

// 양산 견적 데이터 인터페이스
export interface MassProductionEstimateItem {
  id: number;
  estimateNo: string;          // 양산견적번호 (예: MI26005P0사출견적)
  projectNo: string;           // 프로젝트 관리번호 (MI26005P0 등)
  officialProjectNo?: string;  // 수주 확정 시 정식 PJT 관리번호
  projectName: string;         // 차종 / 프로젝트명
  productName: string;         // 제품명
  customerName: string;        // 고객사 (원청)
  vendorName: string;          // 사출양산처 표기용 ((주)뉴몰드, MPSI 자체사출공장 등)
  selectedVendorName?: string; // 수주 확정된 최종 사출 양산처
  assignedVendors?: string[];  // 견적 요청 배포 대상 사출처 목록
  productionType: "OUTSOURCING" | "IN_HOUSE"; // 외주생산 vs 자체생산
  
  // 사출 성형 조건 및 사양
  resinSpec: string;           // 적용 수지 (예: PP 컴파운드 사출물, PP-TD20)
  resinPricePerKg: number;     // 수지 원료 단가 (원/kg)
  partWeightGram: number;      // 제품 중량 (g)
  runnerWeightGram: number;    // 런너 중량 (g)
  cavity: string;              // Cavity 수 (예: 1*2 Cavity)
  machineTonnage: string;      // 사출기 사양 (예: 650T)
  targetCycleTime: number;     // 목표 C/T (초)
  targetMassApprovalDate?: string; // 양산 승인 납기일
  massStartDate?: string;      // 양산 예정일
  sph: number;                 // 시간당 Shot 수 (SPH)
  monthlyVolume: number;       // 월간 예상 양산 수량 (EA)

  // 원가 산출 상세 (EA당)
  materialCost: number;        // 재료비 (원)
  processingCost: number;      // 사출 가공비 / 노무비 (원)
  overheadCost?: number;       // 일반관리비 (원)
  profitCost?: number;         // 이윤 (원)
  packagingCost: number;       // 포장 / 부자재비 (원)
  logisticsCost: number;       // 물류 / 운송비 (원)
  finalUnitPrice: number;      // 최종 납품 견적단가 (원)

  // 견적서 첨부 파일 정보
  estimateFileName: string;    // 첨부 양산견적서 파일명 (대표 파일)
  estimateFileSize: string;    // 파일 크기
  estimateFileDate: string;    // 업로드 일자
  estimateFileUrl?: string;    // 파일 실제 다운로드 URL

  // 복수 양산처 견적 제출 내역 리스트
  vendorQuotes?: MassVendorQuoteSubmission[];

  status: MassQuotationStatus; // 진행 상태
  requestDate: string;         // 견적요청일
  submittedDate: string;       // 제출일자
  notes?: string;              // 요청사항 및 비고
  vendorNotes?: string;        // 외주사 견적 제출 소견
  comments: MassQuotationComment[];
  submissionHistory?: MassQuoteSubmissionHistoryItem[]; // 견적서 및 메모 이력 영구 보존
}

const STORAGE_KEY = "mpsi_mass_quotations_v13";
const EVENT_NAME = "mpsi_mass_quotation_update_v13";

// 더미 데이터 초기값 전면 비움
export const INITIAL_MASS_ESTIMATES: MassProductionEstimateItem[] = [];

// 더미 판별 헬퍼
export function isDummyMassEstimate(item: any): boolean {
  if (!item) return true;
  const pNo = String(item.projectNo || "").trim();
  const pName = String(item.projectName || "").trim();
  if (!pNo || pNo === "undefined" || pNo === "null" || pNo === "DUMMY") return true;
  // 과거 하드코딩 샘플 데이터만 배제 (실제 프로젝트 MI26001, MI26002 등은 정상 보존)
  if (
    pNo === "MI25001P1" ||
    pNo === "MI25001P2" ||
    pName.includes("현대 NT5 도어 트림") ||
    pName.includes("NQ5 Door Armrest") ||
    pName === "A2XT" ||
    pName === "SPX"
  ) {
    return true;
  }
  return false;
}

export function getStoredMassEstimates(): MassProductionEstimateItem[] {
  if (typeof window === "undefined") return [];
  try {
    localStorage.removeItem("mpsi_mass_quotations_v12");
    localStorage.removeItem("mpsi_mass_quotations_v11");
    localStorage.removeItem("mpsi_mass_quotations_v10");
    localStorage.removeItem("mpsi_mass_quotations_v9");
    const raw = localStorage.getItem(STORAGE_KEY);
    let items: MassProductionEstimateItem[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(items)) items = [];
    const cleaned = items.filter((it: any) => !isDummyMassEstimate(it));
    if (cleaned.length !== items.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch (e) {
    console.error("Failed to read mass estimates from storage", e);
    return [];
  }
}

export function saveMassEstimatesToStorage(items: MassProductionEstimateItem[]): void {
  if (typeof window === "undefined") return;
  try {
    const cleaned = items.filter((it) => !isDummyMassEstimate(it));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: cleaned }));
  } catch (e) {
    console.error("Failed to save mass estimates to storage", e);
  }
}

// 백엔드 DB 연동 헬퍼
export async function syncMassEstimateToBackend(item: MassProductionEstimateItem): Promise<boolean> {
  try {
    const targetPjtNo = item.officialProjectNo || item.projectNo;
    if (targetPjtNo) {
      const pjtUpdates: Record<string, any> = {};
      if (item.targetMassApprovalDate) pjtUpdates.targetMassDate = item.targetMassApprovalDate;
      if (item.massStartDate) pjtUpdates.massStartDate = item.massStartDate;
      if (item.cavity) pjtUpdates.cavity = item.cavity;
      if (item.resinSpec) pjtUpdates.resinSpec = item.resinSpec;
      if (item.machineTonnage) pjtUpdates.machineTon = item.machineTonnage;
      if (item.selectedVendorName || item.vendorName) pjtUpdates.massVendor = item.selectedVendorName || item.vendorName;
      if (Object.keys(pjtUpdates).length > 0) {
        updateProjectProcess(targetPjtNo, pjtUpdates);
      }
    }
    const res = await fetch("/api/v1/mass-prod/quotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    const json = await res.json();
    return json.success === true;
  } catch (err) {
    console.error("[syncMassEstimateToBackend Error]", err);
    return false;
  }
}

// 금형 이관 완료 시 양산 견적 자동 등재 헬퍼
export function autoEnrollMassQuotationFromTrial(trial: {
  projectNo: string;
  projectName?: string;
  productName?: string;
  customerName?: string;
  moldVendor?: string;
  massVendor?: string;
  cavity?: string;
  material?: string;
  resinSpec?: string;
  machineTon?: string;
  partWeight?: number | string;
  annualVolume?: number | string;
  monthlyVolume?: number;
  targetCycleTime?: number;
  transferPlanDate?: string;
  transferActualDate?: string;
}): MassProductionEstimateItem | null {
  if (typeof window === "undefined" || !trial || !trial.projectNo) return null;

  const current = getStoredMassEstimates();
  const exists = current.find((e) => e.projectNo === trial.projectNo);

  const isSelf = 
    trial.massVendor?.includes("자체") || 
    trial.massVendor?.includes("MPSI") || 
    trial.massVendor === "MPSI 자체사출공장";

  const productionType: "OUTSOURCING" | "IN_HOUSE" = isSelf ? "IN_HOUSE" : "OUTSOURCING";
  const vendorName = isSelf ? "MPSI 자체사출공장" : (trial.massVendor || "(주)뉴몰드");
  const assignedVendors = isSelf ? ["MPSI 자체사출공장"] : [vendorName];
  const status: MassQuotationStatus = isSelf ? "자체진행" : "견적요청";

  const actualMachineTon = trial.machineTon 
    ? (String(trial.machineTon).includes("T") ? String(trial.machineTon) : `${trial.machineTon}T`) 
    : "700T";
  const actualResin = trial.resinSpec || trial.material || "PP 컴파운드 사출물";
  const actualPartWeight = Number(trial.partWeight) || 100;
  const actualMonthlyVolume = trial.monthlyVolume || 
    (trial.annualVolume ? Math.round(Number(trial.annualVolume) / 12) : 250);
  const actualCT = trial.targetCycleTime || 35;

  if (exists) {
    const updated = current.map((item) => {
      if (item.projectNo !== trial.projectNo) return item;
      const merged: MassProductionEstimateItem = {
        ...item,
        projectName: trial.projectName || item.projectName,
        productName: trial.productName || item.productName,
        customerName: trial.customerName || item.customerName,
        productionType,
        vendorName,
        selectedVendorName: vendorName,
        assignedVendors,
        cavity: trial.cavity || item.cavity,
        machineTonnage: actualMachineTon || item.machineTonnage,
        resinSpec: actualResin || item.resinSpec,
        partWeightGram: actualPartWeight || item.partWeightGram,
        monthlyVolume: actualMonthlyVolume || item.monthlyVolume,
        targetCycleTime: actualCT || item.targetCycleTime,
        status: item.status === "단가합의완료" || item.status === "양산계약확정" ? item.status : status,
      };
      syncMassEstimateToBackend(merged);
      return merged;
    });
    saveMassEstimatesToStorage(updated);
    return updated.find((e) => e.projectNo === trial.projectNo) || null;
  }

  const id = current.length > 0 ? Math.max(...current.map((c) => c.id)) + 1 : 1;
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const estimateNo = `${trial.projectNo}사출견적`;

  const newItem: MassProductionEstimateItem = {
    id,
    estimateNo,
    projectNo: trial.projectNo,
    officialProjectNo: trial.projectNo,
    projectName: trial.projectName || "견적명11",
    productName: trial.productName || "BMS Battery Case Module",
    customerName: trial.customerName || "현대자동차 (광주공장)",
    vendorName,
    selectedVendorName: vendorName,
    assignedVendors,
    productionType,
    resinSpec: actualResin,
    resinPricePerKg: 2850,
    partWeightGram: actualPartWeight,
    runnerWeightGram: 15,
    cavity: trial.cavity || "1*3",
    machineTonnage: actualMachineTon,
    targetCycleTime: actualCT,
    targetMassApprovalDate: trial.transferPlanDate || "2026-12-20",
    massStartDate: trial.transferActualDate || "2026-11-12",
    sph: actualCT > 0 ? Math.round(3600 / actualCT) : 102,
    monthlyVolume: actualMonthlyVolume,
    materialCost: 1250,
    processingCost: 720,
    overheadCost: 60,
    profitCost: 40,
    packagingCost: 150,
    logisticsCost: 136,
    finalUnitPrice: isSelf ? 2356 : 0,
    estimateFileName: "",
    estimateFileSize: "",
    estimateFileDate: "",
    status,
    requestDate: dateStr,
    submittedDate: isSelf ? dateStr : "",
    notes: isSelf
      ? "[자체생산 - 견적 패스] MPSI 자체사출공장 배정으로 외주 견적 심의 절차를 패스하고 시양산(Step 11)으로 즉시 진행합니다."
      : `[금형 이관 완료 자동 연계] 금형제작처(${trial.moldVendor || "우성정공(주)"})에서 5대 서류 승인 및 금형 이관 완료에 따라 사출양산처(${vendorName})에 사출 양산 견적 건이 자동 등재되었습니다.`,
    comments: [
      {
        id: `c-init-${Date.now()}`,
        author: "MPSI 시스템",
        authorRole: "MPSI",
        content: isSelf
          ? "금형 이관 완료에 따라 MPSI 사내 사출공장 생산 배정(견적 패스/자체진행) 처리되었습니다."
          : `금형 이관 완료에 따라 지정된 사출 양산처 [${vendorName}]에 양산 견적 요청이 자동 생성되었습니다.`,
        createdAt: dateStr,
      }
    ],
    submissionHistory: [],
    vendorQuotes: []
  };

  const nextList = [newItem, ...current];
  saveMassEstimatesToStorage(nextList);
  syncMassEstimateToBackend(newItem);
  return newItem;
}

export function useMassQuotationStore() {
  const [estimates, setEstimatesState] = useState<MassProductionEstimateItem[]>(() => {
    return getStoredMassEstimates();
  });
  const [isLoading, setIsLoading] = useState(false);

  const refreshFromDb = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/v1/mass-prod/quotations", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const cleaned = json.data.filter((it: any) => !isDummyMassEstimate(it));
        saveMassEstimatesToStorage(cleaned);
        setEstimatesState(cleaned);
      }
    } catch (e) {
      console.warn("[useMassQuotationStore] Fallback to local storage:", e);
      setEstimatesState(getStoredMassEstimates());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshFromDb();

    const handleUpdate = () => {
      setEstimatesState(getStoredMassEstimates());
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // 1. MPSI에서 신규 양산 견적 등록
  const addEstimate = (item: Omit<MassProductionEstimateItem, "id" | "estimateNo" | "requestDate"> & { estimateNo?: string }) => {
    const current = getStoredMassEstimates();
    const id = current.length > 0 ? Math.max(...current.map((c) => c.id)) + 1 : 1;
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const estimateNo = item.estimateNo || `${item.projectNo}사출견적`;

    const status: MassQuotationStatus = item.productionType === "OUTSOURCING" ? "견적요청" : "자체진행";

    const newItem: MassProductionEstimateItem = {
      ...item,
      id,
      estimateNo,
      requestDate: dateStr,
      status: item.status || status,
      comments: item.comments || [],
      submissionHistory: item.submissionHistory || [],
      vendorQuotes: item.vendorQuotes || [],
    };

    const nextList = [newItem, ...current];
    saveMassEstimatesToStorage(nextList);
    setEstimatesState(nextList);
    syncMassEstimateToBackend(newItem);
    return newItem;
  };

  // 2. 외주사(뉴몰드 등)에서 양산 견적서 작성 및 제출 (상태: "외주견적제출"로 동기화, 메모 이력 영구 보존)
  const submitVendorQuote = (
    estimateNo: string,
    submission: {
      finalUnitPrice: number;
      targetCycleTime?: number;
      targetMassApprovalDate?: string;
      massStartDate?: string;
      machineTonnage?: string;
      estimateFileName: string;
      estimateFileSize: string;
      estimateFileUrl?: string;
      notes?: string;
      vendorNotes?: string;
      vendorComment?: string;
      vendorMemo?: string;
      submissionType?: "최초 제출" | "수정 제출";
      authorName?: string;
      materialCost?: number;
      processingCost?: number;
      overheadCost?: number;
      profitCost?: number;
      packagingCost?: number;
      logisticsCost?: number;
    }
  ) => {
    const current = getStoredMassEstimates();
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const timeStr = `${dateStr} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    let updatedTarget: MassProductionEstimateItem | undefined;

    const nextList = current.map((item) => {
      if (item.estimateNo !== estimateNo && item.projectNo !== estimateNo) return item;

      const newComments = [...item.comments];
      if (submission.vendorComment) {
        newComments.push({
          id: `comment-${Date.now()}`,
          author: submission.authorName || `${item.vendorName} 견적담당`,
          authorRole: "VENDOR" as const,
          content: submission.vendorComment,
          createdAt: timeStr,
        });
      }

      // 견적서 세부양식 첨부 시 입력된 메모를 제출 이력으로 영구 보존
      const historyList: MassQuoteSubmissionHistoryItem[] = [...(item.submissionHistory || [])];
      const memoText = submission.vendorMemo?.trim() || submission.vendorComment?.trim() || `${submission.submissionType || "최초 제출"}: 견적서 제출 완료`;
      
      historyList.push({
        id: `hist-${Date.now()}`,
        submissionType: submission.submissionType || (historyList.length > 0 ? "수정 제출" : "최초 제출"),
        revisionNo: historyList.length + 1,
        memo: memoText,
        fileName: submission.estimateFileName,
        fileSize: submission.estimateFileSize,
        fileUrl: submission.estimateFileUrl,
        finalUnitPrice: submission.finalUnitPrice,
        targetCycleTime: submission.targetCycleTime || item.targetCycleTime,
        targetMassApprovalDate: submission.targetMassApprovalDate || item.targetMassApprovalDate,
        massStartDate: submission.massStartDate || item.massStartDate,
        submittedAt: timeStr,
        author: submission.authorName || `${item.vendorName} 김재열 차장`,
      });

      // 복수 업체 견적 리스트(vendorQuotes) 동기화 (정규화 매칭)
      const vName = submission.authorName || item.vendorName;
      let existingQuotes = item.vendorQuotes || [];
      const cleanV = (s?: string) => (s || "").replace(/\([^)]*\)|주식회사|\s/g, "").trim().toLowerCase();
      const vqIndex = existingQuotes.findIndex((q) => {
        const a = cleanV(q.vendorName);
        const b = cleanV(vName);
        return a === b || a.includes(b) || b.includes(a);
      });
      const newVq: MassVendorQuoteSubmission = {
        id: vqIndex >= 0 ? existingQuotes[vqIndex].id : `vq-${Date.now()}`,
        vendorName: vName,
        submittedDate: dateStr,
        materialCost: submission.materialCost ?? item.materialCost,
        processingCost: submission.processingCost ?? item.processingCost,
        overheadCost: submission.overheadCost ?? 60,
        profitCost: submission.profitCost ?? 40,
        packagingCost: submission.packagingCost ?? item.packagingCost,
        logisticsCost: submission.logisticsCost ?? item.logisticsCost,
        unitPrice: submission.finalUnitPrice,
        targetCycleTime: submission.targetCycleTime || item.targetCycleTime,
        quotationFileName: submission.estimateFileName,
        quotationFileSize: submission.estimateFileSize,
        quotationFileUrl: submission.estimateFileUrl,
        vendorNotes: submission.vendorNotes || submission.vendorMemo || "",
        mpsiReplies: vqIndex >= 0 ? existingQuotes[vqIndex].mpsiReplies : [],
        status: "제출완료",
      };

      const updatedVendorQuotes = vqIndex >= 0 
        ? existingQuotes.map((q, i) => i === vqIndex ? newVq : q)
        : [...existingQuotes, newVq];

      const merged: MassProductionEstimateItem = {
        ...item,
        finalUnitPrice: submission.finalUnitPrice,
        targetCycleTime: submission.targetCycleTime || item.targetCycleTime,
        targetMassApprovalDate: submission.targetMassApprovalDate || item.targetMassApprovalDate,
        massStartDate: submission.massStartDate || item.massStartDate,
        machineTonnage: submission.machineTonnage || item.machineTonnage,
        estimateFileName: submission.estimateFileName,
        estimateFileSize: submission.estimateFileSize,
        estimateFileDate: dateStr,
        estimateFileUrl: submission.estimateFileUrl,
        vendorNotes: submission.vendorNotes || item.vendorNotes || "",
        materialCost: submission.materialCost ?? item.materialCost,
        processingCost: submission.processingCost ?? item.processingCost,
        overheadCost: submission.overheadCost ?? item.overheadCost,
        profitCost: submission.profitCost ?? item.profitCost,
        packagingCost: submission.packagingCost ?? item.packagingCost,
        logisticsCost: submission.logisticsCost ?? item.logisticsCost,
        status: "외주견적제출" as MassQuotationStatus,
        submittedDate: dateStr,
        comments: newComments,
        submissionHistory: historyList,
        vendorQuotes: updatedVendorQuotes,
      };

      updatedTarget = merged;
      return merged;
    });

    saveMassEstimatesToStorage(nextList);
    setEstimatesState(nextList);
    if (updatedTarget) {
      syncMassEstimateToBackend(updatedTarget);
    }
  };

  // 3. 상태 변경 (단가합의완료, 양산계약확정 등)
  const updateStatus = async (estimateNo: string, newStatus: MassQuotationStatus) => {
    const current = getStoredMassEstimates();
    let updatedTarget: MassProductionEstimateItem | undefined;

    const nextList = current.map((item) => {
      if (item.estimateNo !== estimateNo && item.projectNo !== estimateNo && item.officialProjectNo !== estimateNo) {
        return item;
      }
      const merged = { ...item, status: newStatus };
      updatedTarget = merged;
      return merged;
    });

    saveMassEstimatesToStorage(nextList);
    setEstimatesState(nextList);
    if (updatedTarget) {
      await syncMassEstimateToBackend(updatedTarget);
      if (newStatus === "단가합의완료" || newStatus === "양산계약확정") {
        autoEnrollMassValidationFromQuotation(updatedTarget);
      }
    }
  };

  // 4. 개별 협력사 견적 상태 변경 (검토시작/검토협의, 수주확정, 반려/미성사)
  const updateVendorQuoteStatus = async (
    estimateNo: string,
    submissionId: string,
    newQuoteStatus: "제출완료" | "검토협의" | "수주확정" | "반려/미성사"
  ) => {
    const current = getStoredMassEstimates();
    let updatedTarget: MassProductionEstimateItem | undefined;

    const nextList = current.map((item) => {
      if (item.estimateNo !== estimateNo && item.projectNo !== estimateNo && item.officialProjectNo !== estimateNo) {
        return item;
      }

      let updatedQuotes = (item.vendorQuotes || []).map((vq) => {
        if (vq.id === submissionId || vq.vendorName === submissionId) {
          return { ...vq, status: newQuoteStatus };
        }
        if (newQuoteStatus === "수주확정") {
          return { ...vq, status: "반려/미성사" as const };
        }
        return vq;
      });

      const confirmedVendor = updatedQuotes.find((vq) => vq.status === "수주확정");
      let itemStatus: MassQuotationStatus = item.status;
      let selectedVendor = item.selectedVendorName;
      let finalPrice = item.finalUnitPrice;

      if (newQuoteStatus === "수주확정" && confirmedVendor) {
        itemStatus = "단가합의완료";
        selectedVendor = confirmedVendor.vendorName;
        finalPrice = confirmedVendor.unitPrice;
      } else if (newQuoteStatus === "검토협의") {
        itemStatus = "원가검토중";
      } else if (newQuoteStatus === "반려/미성사") {
        // 수주 확정된 견적이 없으면 견적요청/원가검토 상태로 정리
        if (!confirmedVendor) {
          const hasPending = updatedQuotes.some((vq) => vq.status === "제출완료" || vq.status === "검토협의");
          itemStatus = hasPending ? "원가검토중" : "견적요청";
          finalPrice = 0;
        }
      }

      const merged: MassProductionEstimateItem = {
        ...item,
        status: itemStatus,
        vendorName: confirmedVendor ? confirmedVendor.vendorName : item.vendorName,
        selectedVendorName: selectedVendor,
        finalUnitPrice: finalPrice,
        vendorQuotes: updatedQuotes,
      };

      updatedTarget = merged;
      return merged;
    });

    saveMassEstimatesToStorage(nextList);
    setEstimatesState(nextList);
    if (updatedTarget) {
      await syncMassEstimateToBackend(updatedTarget);
      if (newQuoteStatus === "수주확정" || updatedTarget.status === "단가합의완료") {
        autoEnrollMassValidationFromQuotation(updatedTarget);
      }
    }
  };

  // 5. 공급업체 메모에 대한 MPSI 답변 저장 (동기화)
  const addMpsiReplyToVendorQuote = (
    estimateNo: string,
    submissionId: string,
    replyText: string
  ) => {
    const current = getStoredMassEstimates();
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const timeStr = `${dateStr} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    let updatedTarget: MassProductionEstimateItem | undefined;

    const nextList = current.map((item) => {
      if (item.estimateNo !== estimateNo && item.projectNo !== estimateNo) return item;
      const updatedQuotes = (item.vendorQuotes || []).map((vq) => {
        if (vq.id !== submissionId) return vq;
        return {
          ...vq,
          mpsiReplies: [
            ...(vq.mpsiReplies || []),
            {
              id: `r-${Date.now()}`,
              author: "MPSI 양산관리팀",
              content: replyText,
              createdAt: timeStr,
            },
          ],
        };
      });

      const merged: MassProductionEstimateItem = {
        ...item,
        vendorQuotes: updatedQuotes,
      };
      updatedTarget = merged;
      return merged;
    });

    saveMassEstimatesToStorage(nextList);
    setEstimatesState(nextList);
    if (updatedTarget) {
      syncMassEstimateToBackend(updatedTarget);
    }
  };

  // 6. 협의 댓글 추가
  const addComment = (estimateNo: string, author: string, authorRole: "MPSI" | "VENDOR", content: string) => {
    const current = getStoredMassEstimates();
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    let updatedTarget: MassProductionEstimateItem | undefined;

    const nextList = current.map((item) => {
      if (item.estimateNo !== estimateNo) return item;
      const merged: MassProductionEstimateItem = {
        ...item,
        comments: [
          ...item.comments,
          {
            id: `comment-${Date.now()}`,
            author,
            authorRole,
            content,
            createdAt: timeStr,
          },
        ],
      };
      updatedTarget = merged;
      return merged;
    });

    saveMassEstimatesToStorage(nextList);
    setEstimatesState(nextList);
    if (updatedTarget) {
      syncMassEstimateToBackend(updatedTarget);
    }
  };

  return {
    estimates,
    addEstimate,
    submitVendorQuote,
    updateStatus,
    updateVendorQuoteStatus,
    addMpsiReplyToVendorQuote,
    addComment,
    refreshFromDb,
    refresh: refreshFromDb,
    isLoading,
  };
}

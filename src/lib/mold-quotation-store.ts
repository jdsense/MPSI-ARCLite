"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { dispatchGlobalNotification, cleanCompanyAuthor } from "./notification-store";
import { updateProjectProcess } from "./project-store";

// 외주 금형 견적 진행 상태
export type MoldQuotationStatus = 
  | "견적요청"       // MPSI에서 외주사로 견적 요청 발행 시 (외주제작 기본값)
  | "자체진행"       // MPSI 자체 금형개발팀에서 진행 시 (자체제작 기본값)
  | "외주견적제출"    // 외주사에서 견적서 작성 후 제출 완료 시
  | "견적검토중"     // MPSI에서 검토 및 사양/가격 협의 중
  | "수주확정"       // 최종 발주 확정
  | "수주미성사";     // 반려 또는 미선정

// 개별 금형 제작 협력사의 견적 제출 서류 및 원가 내역 인터페이스
export interface MoldVendorQuoteSubmission {
  id: string;
  vendorName: string;                     // 업체명 (우성정공(주), 대한금형정공 등)
  submittedDate: string;                  // 제출일자
  availableMfgDays: number;               // 금형 제작 가능일수 (예: 38일)
  materialCostWon: number;                // 재료비
  processingCostWon: number;              // 가공비
  overheadProfitWon: number;              // 일반관리비 및 이윤
  specialSpecWon: number;                 // 특수사양 (HRS포함)
  totalAmountWon: number;                 // 합계금액
  quotationFileName?: string;             // 첨부 견적서 파일명
  quotationFileSize?: string;             // 파일 크기
  quotationFileUrl?: string;              // 파일 다운로드/접근 URL (/uploads/...)
  downloadUrl?: string;                   // 다운로드 스트리밍 URL
  vendorNotes?: string;                   // 공급업체 작성 메모
  mpsiReplies: {                          // 공급업체 메모에 대한 MPSI 답변
    id: string;
    author: string;
    content: string;
    createdAt: string;
  }[];
  status: "제출완료" | "검토협의" | "수주확정" | "반려/미성사";
}

// MPSI가 견적의뢰 시 배포하는 기술 근거 자료 인터페이스 (3D모델, 2D도면, 생산조건 등)
export interface MoldSpecDocumentItem {
  id: string;
  category: "3D_MODEL" | "2D_DRAWING" | "PRODUCTION_COND" | "OTHER";
  categoryName: string;                   // 3D 제품모델, 2D 제품도면, 생산조건(볼륨/납기/톤수/운송), 기타 사양서
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  author: string;
  memo: string;                           // 파일 등록 메모 (필수)
  version: number;                        // Rev 1, Rev 2...
  fileUrl?: string;                       // 서버 저장 파일 URL (/uploads/...)
  downloadUrl?: string;                   // 스트리밍 다운로드 URL
  history?: {
    version: number;
    fileName: string;
    fileSize: string;
    uploadedAt: string;
    author: string;
    memo: string;
    replaceReason?: string;               // 수정 파일 첨부 사유 (필수)
    fileUrl?: string;
    downloadUrl?: string;
  }[];
}

// 공급업체 견적 제출 및 메모 관리 이력 인터페이스 (영구 보존)
export interface MoldQuoteSubmissionHistoryItem {
  id: string;
  submissionType: "최초 제출" | "수정 제출";
  revisionNo: number;                     // 차수 (1차, 2차...)
  memo: string;                           // 견적파일 업로드 전 입력한 메모 (필수)
  fileName: string;                       // 당시 첨부된 견적서 파일명
  fileSize?: string;                      // 파일 크기
  fileUrl?: string;                       // 서버 저장 파일 URL
  downloadUrl?: string;                   // 다운로드 URL
  amountWon: number;                      // 당시 제출 견적가 (원)
  availableMfgDays?: number;              // 당시 제안 제작 가능일수 (일)
  submittedAt: string;                    // 제출 일자 및 시간 (YYYY-MM-DD HH:mm:ss)
  author: string;                         // 작성자 / 제출 협력사명
}

// 금형 견적 데이터 인터페이스
export interface MoldDevEstimateItem {
  id: number;
  estimateNo: string;                     // 견적식별자 (예: MI26001P0금형견적)
  projectNo: string;                      // PJT 관리번호 (예: MI26004P0, MI26005P0)
  officialProjectNo?: string;             // 수주 확정 시 정식 PJT 관리번호
  moldNo?: string;                        // 금형번호 (예: MI26001M)
  moldDegree?: string;                    // 금형차수 (예: M1, M2)
  changeType?: string;                    // 신작/설변 (예: N001, E001)
  projectName: string;                    // 차종 / 프로젝트명
  productName: string;                    // 제품명
  customerName: string;                   // 고객사 (원청)
  vendorName: string;                     // 금형제작처 표기용
  selectedVendorName?: string;            // 최종 수주 확정 시 선정된 금형 제작처
  assignedVendors: string[];              // 견적 요청 발송 대상 금형처 목록
  productionType: "OUTSOURCING" | "IN_HOUSE"; // 외주제작 vs 자체제작
  
  // 1. 금형 및 사출기 사양
  machineTypeTonnage?: string;            // 사출기 타입/톤수 (예: 유압식 450T, 전동식 650T)
  coreStructure?: string;                 // 원판일체형 / 코어삽입형
  moldMaterial?: string;                  // 재질 (상하원판/메인코어)
  cavity: string;                         // Cavity
  gateType: string;                       // GATE형식
  moldSteel: string;                      // 지정 강재
  resin?: string;                         // 레진 (원자재 재질)
  targetT1Date: string;                   // 목표 T1 일정
  moldDeliveryDate?: string;              // 금형 출고 납기
  targetMfgDays: number;                  // MPSI 목표 제작일수
  targetCycleTime?: number;               // 목표 C/T (초)
  
  // 2. 금형비 세부 구성
  materialCostWon?: number;               // 재료비 (원)
  processingCostWon?: number;             // 가공비 (원)
  overheadProfitWon?: number;             // 일반관리비 및 이윤 (원)
  specialSpecWon?: number;                // 특수사양(HRS포함) (원)
  quoteAmountWon: number;                 // 합계금액 (원)
  availableMfgDays?: number;              // 공급업체 금형 제작 가능일수 (일)
  
  targetBudgetWon: number;                // MPSI 목표 예산/수주 목표가 (원)
  
  // 3. 근거 견적서 파일 첨부
  quotationFileName: string;              // 첨부 금형견적서 파일명
  quotationFileSize: string;              // 파일 크기
  quotationFileDate: string;              // 업로드 일자
  quotationFileUrl?: string;              // 파일 서버 URL
  downloadUrl?: string;                   // 다운로드 URL

  // 4. 복수 금형처 견적 제출 내역 리스트
  vendorQuotes: MoldVendorQuoteSubmission[];

  // 5. MPSI 기술 근거자료
  specDocuments: MoldSpecDocumentItem[];
  
  // 6. 견적 제출 및 메모 관리 이력
  submissionHistory?: MoldQuoteSubmissionHistoryItem[];

  status: MoldQuotationStatus;
  requestDate: string;                    // 견적요청일
  submittedDate: string;                  // 견적서제출일
  notes: string;                          // 요청사항 및 비고
  vendorNotes?: string;                   // 외주처 견적 제출 소견
  memos: {
    id: string;
    author: string;
    content: string;
    createdAt: string;
  }[];
}

const EVENT_NAME = "mpsi_mold_quotation_update";

// 하위 호환용 (더 이상 로컬스토리지 사용 안 함)
export const INITIAL_MOLD_ESTIMATES: MoldDevEstimateItem[] = [];
export function getStoredMoldEstimates(): MoldDevEstimateItem[] {
  return [];
}
export function saveMoldEstimatesToStorage(_items: MoldDevEstimateItem[]): void {}

// PostgreSQL DB API 직접 호출 헬퍼 (cache: 'no-store')
export async function fetchEstimatesFromDb(): Promise<MoldDevEstimateItem[]> {
  try {
    const res = await fetch(`/api/v1/mold-dev/quotations?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`DB fetch error: HTTP ${res.status}`);
      return [];
    }
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
    return [];
  } catch (err) {
    console.error("Failed to fetch mold quotations directly from DB:", err);
    return [];
  }
}

// PostgreSQL DB 비동기 동기화 헬퍼 (POST / PUT)
async function syncItemToBackend(item: Partial<MoldDevEstimateItem> & { estimateNo: string }, method: "POST" | "PUT" = "PUT") {
  if (typeof window === "undefined") return null;
  try {
    // 클라이언트 프로젝트 관리대장(localStorage)에도 즉시 동기화
    const targetPjtNo = item.officialProjectNo || item.projectNo;
    if (targetPjtNo) {
      const anyItem = item as any;
      const pjtUpdates: Record<string, any> = {};
      if (item.targetT1Date) pjtUpdates.targetT1Date = item.targetT1Date;
      if (item.moldDeliveryDate || anyItem.expectedDelivery) pjtUpdates.moldDeliveryDate = item.moldDeliveryDate || anyItem.expectedDelivery;
      if (item.cavity) pjtUpdates.cavity = item.cavity;
      if (item.moldSteel || anyItem.material) pjtUpdates.material = item.moldSteel || anyItem.material;
      if (item.moldMaterial) pjtUpdates.moldMaterial = item.moldMaterial;
      if (item.resin || anyItem.resinSpec) pjtUpdates.resinSpec = item.resin || anyItem.resinSpec;
      if (item.machineTypeTonnage || anyItem.machineTon) pjtUpdates.machineTon = item.machineTypeTonnage || anyItem.machineTon;
      if (anyItem.partNo) pjtUpdates.partNo = anyItem.partNo;
      if (item.selectedVendorName || item.vendorName) pjtUpdates.moldVendor = item.selectedVendorName || item.vendorName;
      if ((item.availableMfgDays && Number(item.availableMfgDays) > 0) || (item.targetMfgDays && Number(item.targetMfgDays) > 0)) {
        pjtUpdates.targetMoldDays = Number(item.availableMfgDays || item.targetMfgDays);
      }
      if (Object.keys(pjtUpdates).length > 0) {
        updateProjectProcess(targetPjtNo, pjtUpdates);
      }
    }

    const res = await fetch("/api/v1/mold-dev/quotations", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      console.error(`DB sync error (${method}): HTTP ${res.status} - ${json?.error || "Unknown error"}`);
      return null;
    }
    return json;
  } catch (err) {
    console.warn("Failed to sync quotation to backend DB API:", err);
    return null;
  }
}

/**
 * 금형 견적 전역 관리 훅 (100% PostgreSQL DB API 연동)
 */
export function useMoldQuotationStore() {
  const [estimates, setEstimates] = useState<MoldDevEstimateItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const estimatesRef = useRef<MoldDevEstimateItem[]>([]);
  estimatesRef.current = estimates;

  // DB로부터 최신 데이터 조회
  const reloadFromDb = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchEstimatesFromDb();
      setEstimates(data);
      estimatesRef.current = data;
      return data;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. 구버전 로컬스토리지 잔여 캐시 완전 삭제 (DB 직접 연동 보장)
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("mpsi_mold_quotations_v11");
        localStorage.removeItem("mpsi_mold_quotations_v10");
      } catch {}
    }

    // 2. PostgreSQL DB에서 최신 데이터 직접 로드
    let isMounted = true;
    setIsLoading(true);
    fetchEstimatesFromDb().then((data) => {
      if (isMounted) {
        setEstimates(data);
        estimatesRef.current = data;
        setIsLoading(false);
      }
    });

    const handleUpdate = () => {
      fetchEstimatesFromDb().then((data) => {
        if (isMounted) {
          setEstimates(data);
          estimatesRef.current = data;
        }
      });
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener(EVENT_NAME, handleUpdate);
    };
  }, []);

  // 1. MPSI에서 신규 금형 견적 등록 (PostgreSQL "MpsiMoldQuotation" 직접 INSERT)
  const addEstimate = async (item: Omit<MoldDevEstimateItem, "id" | "estimateNo" | "requestDate">) => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // 채번 규칙: 프로젝트번호 + 금형견적 (예: MI26001P0금형견적)
    const basePjtNo = (item.officialProjectNo || item.projectNo || "MI26001P0").trim();
    const baseEstimateNo = `${basePjtNo}금형견적`;

    // 동일 프로젝트로 등록된 금형견적 일련번호 확인 및 중복 방지
    const existingMatches = estimatesRef.current.filter((it) => 
      it.estimateNo === baseEstimateNo || it.estimateNo.startsWith(`${baseEstimateNo}-`)
    );
    const estimateNo = existingMatches.length === 0
      ? baseEstimateNo
      : `${baseEstimateNo}-${String(existingMatches.length + 1).padStart(2, "0")}`;

    let maxId = 0;
    estimatesRef.current.forEach((it) => {
      if (typeof it.id === "number" && it.id > maxId) maxId = it.id;
    });
    const id = maxId + 1;
    const status: MoldQuotationStatus = item.productionType === "OUTSOURCING" ? "견적요청" : "자체진행";

    const newItem: MoldDevEstimateItem = {
      ...item,
      id,
      estimateNo,
      requestDate: dateStr,
      status: item.status || status,
      vendorQuotes: item.vendorQuotes || [],
      specDocuments: item.specDocuments || [],
      memos: item.memos || [],
    };

    // UI 즉각 반영
    setEstimates((prev) => [newItem, ...prev]);

    // PostgreSQL DB에 즉시 영구 저장
    const result = await syncItemToBackend(newItem, "POST");
    if (result && result.success && result.data) {
      const dbRow: MoldDevEstimateItem = result.data;
      setEstimates((prev) => prev.map((p) => (p.estimateNo === estimateNo ? dbRow : p)));
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    }

    return newItem;
  };

  // 2. 외주사(우성정공 등)에서 견적서 작성 및 제출 (PostgreSQL "MpsiMoldQuotation" UPDATE)
  const submitVendorQuote = async (
    estimateNo: string,
    submission: {
      projectNo?: string;
      officialProjectNo?: string;
      vendorName: string;
      quoteAmountWon: number;
      availableMfgDays?: number;
      materialCostWon?: number;
      processingCostWon?: number;
      overheadProfitWon?: number;
      specialSpecWon?: number;
      machineTypeTonnage?: string;
      coreStructure?: string;
      moldMaterial?: string;
      cavity?: string;
      gateType?: string;
      quotationFileName: string;
      quotationFileSize?: string;
      quotationFileUrl?: string;
      downloadUrl?: string;
      targetT1Date?: string;
      notes?: string;
      vendorNotes?: string;
      vendorMemo?: string;
      submissionType?: "최초 제출" | "수정 제출";
      authorName?: string;
    }
  ) => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const timeStr = `${dateStr} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    // 대상 아이템 찾기 (메모리 우선, 없으면 DB 재조회)
    let target = estimatesRef.current.find((it) => it.estimateNo === estimateNo);
    if (!target) {
      const freshDb = await fetchEstimatesFromDb();
      target = freshDb.find((it) => it.estimateNo === estimateNo);
    }

    if (!target) {
      // 신규 fallback 생성
      target = {
        id: Date.now(),
        estimateNo,
        projectNo: estimateNo,
        projectName: "",
        productName: "",
        customerName: "",
        vendorName: submission.vendorName,
        assignedVendors: [submission.vendorName],
        productionType: "OUTSOURCING",
        targetT1Date: submission.targetT1Date || "",
        targetMfgDays: Number(submission.availableMfgDays || 40),
        quoteAmountWon: submission.quoteAmountWon,
        targetBudgetWon: submission.quoteAmountWon,
        cavity: submission.cavity || "1 X 2",
        gateType: submission.gateType || "Pin Point Gate",
        moldSteel: submission.moldMaterial || "S55C",
        quotationFileName: submission.quotationFileName,
        quotationFileSize: submission.quotationFileSize || "2.1 MB",
        quotationFileDate: dateStr,
        vendorQuotes: [],
        specDocuments: [],
        status: "외주견적제출",
        requestDate: dateStr,
        submittedDate: dateStr,
        notes: "",
        memos: [],
      };
    }

    const currentItem = target;
    const cleanSubmitAuthor = cleanCompanyAuthor(submission.authorName || submission.vendorName, submission.vendorName);
    const newMemos = [...(currentItem.memos || [])];
    if (submission.vendorMemo) {
      newMemos.push({
        id: `memo-${Date.now()}`,
        author: cleanSubmitAuthor,
        content: submission.vendorMemo,
        createdAt: timeStr,
      });
    }

    const existingHistory = currentItem.submissionHistory || [];
    const newHistoryItem: MoldQuoteSubmissionHistoryItem = {
      id: `hist-${Date.now()}`,
      submissionType: submission.submissionType || (existingHistory.length === 0 ? "최초 제출" : "수정 제출"),
      revisionNo: existingHistory.length + 1,
      memo: submission.vendorMemo || (submission.submissionType === "수정 제출" ? "견적서 수정 제출" : "견적서 최초 제출"),
      fileName: submission.quotationFileName,
      fileSize: submission.quotationFileSize || "2.1 MB",
      fileUrl: submission.quotationFileUrl,
      downloadUrl: submission.downloadUrl,
      amountWon: submission.quoteAmountWon,
      availableMfgDays: Number(submission.availableMfgDays || currentItem.availableMfgDays || 40),
      submittedAt: timeStr,
      author: cleanSubmitAuthor,
    };

    const existingQuotes = currentItem.vendorQuotes || [];
    const cleanV = (s?: string) => (s || "").replace(/\([^)]*\)|주식회사|\s/g, "").trim().toLowerCase();
    const vqIndex = existingQuotes.findIndex((q) => {
      const a = cleanV(q.vendorName);
      const b = cleanV(submission.vendorName);
      if (!a || !b) return false;
      if ((a.includes("우성") || a.includes("woosung")) && (b.includes("우성") || b.includes("woosung"))) return true;
      if ((a.includes("대한") || a.includes("daehan")) && (b.includes("대한") || b.includes("daehan"))) return true;
      return a === b || a.includes(b) || b.includes(a);
    });
    const newSubmissionItem: MoldVendorQuoteSubmission = {
      id: vqIndex >= 0 ? existingQuotes[vqIndex].id : `vq-${Date.now()}`,
      vendorName: submission.vendorName,
      submittedDate: dateStr,
      availableMfgDays: Number(submission.availableMfgDays || currentItem.targetMfgDays || 40),
      materialCostWon: submission.materialCostWon || 0,
      processingCostWon: submission.processingCostWon || 0,
      overheadProfitWon: submission.overheadProfitWon || 0,
      specialSpecWon: submission.specialSpecWon || 0,
      totalAmountWon: submission.quoteAmountWon,
      quotationFileName: submission.quotationFileName,
      quotationFileSize: submission.quotationFileSize || "2.1 MB",
      quotationFileUrl: submission.quotationFileUrl,
      downloadUrl: submission.downloadUrl,
      vendorNotes: submission.vendorNotes || submission.vendorMemo || "",
      mpsiReplies: vqIndex >= 0 ? existingQuotes[vqIndex].mpsiReplies : [],
      status: "제출완료",
    };

    const updatedVendorQuotes =
      vqIndex >= 0
        ? existingQuotes.map((q, i) => (i === vqIndex ? newSubmissionItem : q))
        : [...existingQuotes, newSubmissionItem];

    const updatedItem: MoldDevEstimateItem = {
      ...currentItem,
      projectNo: submission.projectNo || currentItem.projectNo,
      officialProjectNo: submission.officialProjectNo || currentItem.officialProjectNo,
      quoteAmountWon: submission.quoteAmountWon,
      materialCostWon: submission.materialCostWon !== undefined ? submission.materialCostWon : currentItem.materialCostWon,
      processingCostWon: submission.processingCostWon !== undefined ? submission.processingCostWon : currentItem.processingCostWon,
      overheadProfitWon: submission.overheadProfitWon !== undefined ? submission.overheadProfitWon : currentItem.overheadProfitWon,
      specialSpecWon: submission.specialSpecWon !== undefined ? submission.specialSpecWon : currentItem.specialSpecWon,
      availableMfgDays: Number(submission.availableMfgDays || currentItem.availableMfgDays || 40),
      machineTypeTonnage: submission.machineTypeTonnage || currentItem.machineTypeTonnage,
      coreStructure: submission.coreStructure || currentItem.coreStructure,
      moldMaterial: submission.moldMaterial || currentItem.moldMaterial,
      cavity: submission.cavity || currentItem.cavity,
      gateType: submission.gateType || currentItem.gateType,
      quotationFileName: submission.quotationFileName,
      quotationFileSize: submission.quotationFileSize || "2.1 MB",
      quotationFileDate: dateStr,
      quotationFileUrl: submission.quotationFileUrl || currentItem.quotationFileUrl,
      downloadUrl: submission.downloadUrl || currentItem.downloadUrl,
      targetT1Date: submission.targetT1Date || currentItem.targetT1Date,
      vendorNotes: submission.vendorNotes || currentItem.vendorNotes || "",
      status: "외주견적제출",
      submittedDate: dateStr,
      vendorQuotes: updatedVendorQuotes,
      memos: newMemos,
      submissionHistory: [...existingHistory, newHistoryItem],
    };

    // 1. 즉시 React 로컬 상태 반영
    setEstimates((prev) => {
      const exists = prev.some((it) => it.estimateNo === estimateNo);
      return exists ? prev.map((it) => (it.estimateNo === estimateNo ? updatedItem : it)) : [updatedItem, ...prev];
    });

    // 2. PostgreSQL DB로 영구 저장 완료 대기
    const syncRes = await syncItemToBackend(updatedItem, "PUT");
    if (syncRes && syncRes.success && syncRes.data) {
      const dbRow: MoldDevEstimateItem = syncRes.data;
      setEstimates((prev) => prev.map((it) => (it.estimateNo === estimateNo ? dbRow : it)));
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    }

    return updatedItem;
  };

  // 3. 업체별 견적 상태 변경 (수주확정, 검토협의 등) -> DB UPDATE
  const updateVendorQuoteStatus = async (
    estimateNo: string,
    submissionId: string,
    nextStatus: "검토협의" | "수주확정" | "반려/미성사"
  ) => {
    let target = estimatesRef.current.find((it) => it.estimateNo === estimateNo);
    if (!target) return;

    const targetSubmission = (target.vendorQuotes || []).find((q) => q.id === submissionId);
    if (!targetSubmission) return;

    const updatedQuotes = (target.vendorQuotes || []).map((q) => {
      if (q.id === submissionId) {
        return { ...q, status: nextStatus };
      }
      if (nextStatus === "수주확정") {
        return { ...q, status: "반려/미성사" as const };
      }
      return q;
    });

    let updatedItem: MoldDevEstimateItem;
    if (nextStatus === "수주확정") {
      updatedItem = {
        ...target,
        vendorQuotes: updatedQuotes,
        selectedVendorName: targetSubmission.vendorName,
        vendorName: targetSubmission.vendorName,
        quoteAmountWon: targetSubmission.totalAmountWon,
        materialCostWon: targetSubmission.materialCostWon,
        processingCostWon: targetSubmission.processingCostWon,
        overheadProfitWon: targetSubmission.overheadProfitWon,
        specialSpecWon: targetSubmission.specialSpecWon,
        availableMfgDays: targetSubmission.availableMfgDays,
        quotationFileName: targetSubmission.quotationFileName || target.quotationFileName,
        quotationFileSize: targetSubmission.quotationFileSize || target.quotationFileSize,
        status: "수주확정",
      };
    } else if (nextStatus === "검토협의") {
      updatedItem = {
        ...target,
        vendorQuotes: updatedQuotes,
        status: "견적검토중",
      };
    } else {
      updatedItem = {
        ...target,
        vendorQuotes: updatedQuotes,
      };
    }

    setEstimates((prev) => prev.map((it) => (it.estimateNo === estimateNo ? updatedItem : it)));

    const syncRes = await syncItemToBackend(updatedItem, "PUT");
    if (syncRes && syncRes.success && syncRes.data) {
      const dbRow: MoldDevEstimateItem = syncRes.data;
      setEstimates((prev) => prev.map((it) => (it.estimateNo === estimateNo ? dbRow : it)));
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    }
  };

  // 4. 공급업체 작성 메모에 대한 MPSI 답변 등록 -> DB UPDATE
  const addMpsiReplyToVendorQuote = async (
    estimateNo: string,
    submissionId: string,
    replyText: string,
    author: string = "MPSI 금형개발팀"
  ) => {
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    let target = estimatesRef.current.find((it) => it.estimateNo === estimateNo);
    if (!target) return;

    const updatedQuotes = (target.vendorQuotes || []).map((q) => {
      if (q.id !== submissionId) return q;
      return {
        ...q,
        mpsiReplies: [
          ...q.mpsiReplies,
          {
            id: `rep-${Date.now()}`,
            author,
            content: replyText.trim(),
            createdAt: timeStr,
          },
        ],
      };
    });

    const updatedItem: MoldDevEstimateItem = {
      ...target,
      vendorQuotes: updatedQuotes,
    };

    setEstimates((prev) => prev.map((it) => (it.estimateNo === estimateNo ? updatedItem : it)));

    const syncRes = await syncItemToBackend(updatedItem, "PUT");
    if (syncRes && syncRes.success && syncRes.data) {
      const dbRow: MoldDevEstimateItem = syncRes.data;
      setEstimates((prev) => prev.map((it) => (it.estimateNo === estimateNo ? dbRow : it)));
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    }
  };

  // 5. MPSI 기술 근거자료 신규 추가 -> DB UPDATE
  const addSpecDocument = async (
    estimateNo: string,
    newDoc: Omit<MoldSpecDocumentItem, "id" | "uploadedAt" | "version">
  ) => {
    const today = new Date().toISOString().split("T")[0];

    let target = estimatesRef.current.find((it) => it.estimateNo === estimateNo);
    if (!target) return;

    const docItem: MoldSpecDocumentItem = {
      ...newDoc,
      id: `sd-${Date.now()}`,
      uploadedAt: today,
      version: 1,
    };

    const updatedItem: MoldDevEstimateItem = {
      ...target,
      specDocuments: [...(target.specDocuments || []), docItem],
    };

    setEstimates((prev) => prev.map((it) => (it.estimateNo === estimateNo ? updatedItem : it)));

    const syncRes = await syncItemToBackend(updatedItem, "PUT");
    if (syncRes && syncRes.success && syncRes.data) {
      const dbRow: MoldDevEstimateItem = syncRes.data;
      setEstimates((prev) => prev.map((it) => (it.estimateNo === estimateNo ? dbRow : it)));
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    }
  };

  // 6. 기술 근거자료 교체 -> DB UPDATE
  const replaceSpecDocument = async (
    estimateNo: string,
    docId: string,
    newFile: { fileName: string; fileSize: string; author: string; memo: string; replaceReason: string; fileUrl?: string; downloadUrl?: string }
  ) => {
    const today = new Date().toISOString().split("T")[0];

    let target = estimatesRef.current.find((it) => it.estimateNo === estimateNo);
    if (!target) return;

    const updatedDocs = (target.specDocuments || []).map((doc) => {
      if (doc.id !== docId) return doc;

      const nextVersion = doc.version + 1;
      const historyItem = {
        version: doc.version,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        uploadedAt: doc.uploadedAt,
        author: doc.author,
        memo: doc.memo,
        replaceReason: newFile.replaceReason,
        fileUrl: doc.fileUrl,
        downloadUrl: doc.downloadUrl,
      };

      return {
        ...doc,
        version: nextVersion,
        fileName: newFile.fileName,
        fileSize: newFile.fileSize,
        fileUrl: newFile.fileUrl || doc.fileUrl,
        downloadUrl: newFile.downloadUrl || doc.downloadUrl,
        uploadedAt: today,
        author: newFile.author,
        memo: newFile.memo,
        history: [...(doc.history || []), historyItem],
      };
    });

    const updatedItem: MoldDevEstimateItem = {
      ...target,
      specDocuments: updatedDocs,
    };

    setEstimates((prev) => prev.map((it) => (it.estimateNo === estimateNo ? updatedItem : it)));

    const syncRes = await syncItemToBackend(updatedItem, "PUT");
    if (syncRes && syncRes.success && syncRes.data) {
      const dbRow: MoldDevEstimateItem = syncRes.data;
      setEstimates((prev) => prev.map((it) => (it.estimateNo === estimateNo ? dbRow : it)));
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    }
  };

  // 7. 전체 견적 상태 변경 -> DB UPDATE
  const updateStatus = async (estimateNo: string, newStatus: MoldQuotationStatus) => {
    let target = estimatesRef.current.find((it) => it.estimateNo === estimateNo);
    if (!target) return;

    const updatedItem: MoldDevEstimateItem = {
      ...target,
      status: newStatus,
    };

    setEstimates((prev) => prev.map((it) => (it.estimateNo === estimateNo ? updatedItem : it)));

    const syncRes = await syncItemToBackend(updatedItem, "PUT");
    if (syncRes && syncRes.success && syncRes.data) {
      const dbRow: MoldDevEstimateItem = syncRes.data;
      setEstimates((prev) => prev.map((it) => (it.estimateNo === estimateNo ? dbRow : it)));
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    }
  };

  // 8. 협의 메모 추가 -> DB UPDATE
  const addMemo = async (estimateNo: string, author: string, content: string) => {
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    let target = estimatesRef.current.find((it) => it.estimateNo === estimateNo);
    if (!target) return;

    const isMpsi = author.includes("MPSI");
    const cleanAuthor = isMpsi ? "MPSI" : cleanCompanyAuthor(author, target?.vendorName || "협력사");
    const cleanCompany = isMpsi ? "MPSI" : cleanCompanyAuthor(target?.vendorName, "협력사");

    const updatedItem: MoldDevEstimateItem = {
      ...target,
      memos: [
        ...(target.memos || []),
        {
          id: `memo-${Date.now()}`,
          author: cleanAuthor,
          content,
          createdAt: timeStr,
        },
      ],
    };

    setEstimates((prev) => prev.map((it) => (it.estimateNo === estimateNo ? updatedItem : it)));

    const syncRes = await syncItemToBackend(updatedItem, "PUT");
    if (syncRes && syncRes.success && syncRes.data) {
      const dbRow: MoldDevEstimateItem = syncRes.data;
      setEstimates((prev) => prev.map((it) => (it.estimateNo === estimateNo ? dbRow : it)));
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    }

    // 전역 알림 발송 (해당 대상 회사에게만 격리 발송)
    dispatchGlobalNotification({
      menuName: isMpsi ? "금형외주 - 금형견적관리" : "금형개발 - 금형견적관리",
      menuPath: isMpsi ? "/portal/vendor-portal/mold/quotation" : "/portal/mold-dev/quotation",
      senderCompany: cleanCompany,
      senderName: cleanAuthor,
      content: `[${estimateNo}] ${content}`,
      projectNo: target?.projectNo,
      targetRole: isMpsi ? "VENDOR_MOLD" : "MPSI",
      targetVendorName: isMpsi ? target?.vendorName || "우성정공(주)" : undefined,
    });
  };

  // 9. 금형 견적 항목 삭제 (PostgreSQL DB DELETE 및 UI 즉각 반영)
  const deleteEstimate = async (estimateNo: string) => {
    if (!estimateNo) return false;

    // UI 즉각 반영
    setEstimates((prev) => prev.filter((it) => it.estimateNo !== estimateNo));
    estimatesRef.current = estimatesRef.current.filter((it) => it.estimateNo !== estimateNo);

    // PostgreSQL DB API 호출
    try {
      const res = await fetch(`/api/v1/mold-dev/quotations?estimateNo=${encodeURIComponent(estimateNo)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent(EVENT_NAME));
          }
          return true;
        }
      }
    } catch (err) {
      console.error("[deleteEstimate] Error:", err);
    }
    return false;
  };

  return {
    estimates,
    isLoading,
    addEstimate,
    deleteEstimate,
    submitVendorQuote,
    updateVendorQuoteStatus,
    addMpsiReplyToVendorQuote,
    addSpecDocument,
    replaceSpecDocument,
    updateStatus,
    addMemo,
    refresh: reloadFromDb,
  };
}

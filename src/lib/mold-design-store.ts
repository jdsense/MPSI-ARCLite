"use client";

import { useState, useEffect } from "react";

// 업무 이력 메모 로그 인터페이스
export interface MoldDesignWorkLog {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: "MPSI" | "VENDOR" | "CUSTOMER";
  fileName?: string;
  content: string;
  timestamp: string;
}

// 1. 제품검토 현황 상태 (개발 1~4단계 통합)
export type ProductReviewStatus = 
  | "검토 대기" 
  | "검토요청" 
  | "수정요청" 
  | "검토완료" 
  | "최종검토완료"
  | "접수완료"       // 레거시 호환
  | "CAE검토중"      // 레거시 호환
  | "수정요청(DR)"   // 레거시 호환
  | "MPSI승인요청"   // 레거시 호환
  | "검토완료(최종확정)"; // 레거시 호환

// 2. 금형설계 현황 상태 (개발 5~6단계 통합)
export type MoldDesignReviewStatus = 
  | "검토 대기" 
  | "검토요청" 
  | "수정요청" 
  | "검토완료" 
  | "발주대기"       // 레거시 호환
  | "설계중"         // 레거시 호환
  | "소재발주완료"   // 레거시 호환
  | "출도완료";       // 레거시 호환

// 제품도면 및 금형설계 데이터 인터페이스 (MPSI 본사 ↔ 금형제작처 동기화)
export interface DrawingDesignItem {
  id: number;
  projectNo: string;        // MPSI 프로젝트 번호 (MI26001-01, MI25001P1 등)
  moldNo?: string;          // 금형번호 (예: MI26001M)
  moldDegree?: string;      // 금형차수 (예: M1, M2)
  changeType?: string;      // 신작/설변 (예: N001, E001)
  projectName: string;      // 차종 / 프로젝트명
  productName: string;      // 제품명
  customerName: string;     // 원청 고객사 (현대/기아 등)
  moldVendor: string;       // 금형제작사 (우성정공(주) 등 외주협력사 또는 MPSI 자체제작팀)
  targetT1Date: string;     // 목표 T1 일정
  targetMfgDays?: number;   // 목표 제작일수 (40일 등)
  currentStep: number;      // 13단계 프로세스 중 현재 위치 (1~6)
  updatedAt: string;

  // [Step 1~4: 제품검토 현황 및 3대 핵심 파일함]
  drStatus: ProductReviewStatus;
  product3DFile: string;             // 1) 3D 제품 data
  product3DNote?: string;
  moldMeetingReportFile?: string;    // 2) 금형 제작 협의록 (DR 보고서 공식 명칭)
  moldMeetingReportNote?: string;
  caeReportFile?: string;            // 3) CAE 해석 보고서
  caeReportNote?: string;

  // [Step 4: 금형 발주서 작성 및 배포]
  moldPoNo?: string;
  moldPoAmount?: number;
  moldPoDays?: number;
  moldPoShot?: number;
  moldPoFile?: string;               // 금형제작 발주서 파일명
  moldPoFileNote?: string;           // 금형제작 발주서 설명 메모
  moldPoAttached?: boolean;          // 발주서 첨부 여부
  moldPoApproved?: boolean;          // 발주서 금형처 발송 승인 여부
  moldPoApprovedDate?: string;

  // [Step 5: 금형설계 현황 및 3대 파일함]
  moldDesignStatus: MoldDesignReviewStatus;
  mold3DDataFile?: string;           // 1) 금형 3D data (금형처 작성)
  mold3DDataNote?: string;

  // [Step 6: 소재 발주 승인 (설계 도중 선발주 가능)]
  materialOrderStatus?: "미승인" | "승인완료";
  materialOrderApprover?: string;
  materialOrderApprovedDate?: string;
  materialOrderNote?: string;

  // [업무 이력 메모 (로그)]
  workLogs: MoldDesignWorkLog[];

  // 호환성 유지용 이전 필드들
  drawing2DFile?: string;
  drawing3DFile?: string;
  modifiedDrawingFile?: string;
  caeEngineer?: string;
  drNotes?: string;
  mpsiApprover?: string;
  mpsiApprovedDate?: string;
  moldSpecFile?: string;
}

const STORAGE_KEY = "mpsi_mold_designs_v5";
const EVENT_NAME = "mpsi_mold_design_update";

// 초기 데이터 (PostgreSQL DB 실데이터 연동으로 빈 배열 기본값)
export const INITIAL_MOLD_DESIGNS: DrawingDesignItem[] = [];

export function getStoredMoldDesigns(): DrawingDesignItem[] {
  if (typeof window === "undefined") return [];
  try {
    // 구버전 목 데이터 캐시 제거
    localStorage.removeItem("mpsi_mold_designs_v3");
    localStorage.removeItem("mpsi_mold_designs_v4");
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to read mold designs from storage", e);
    return [];
  }
}

export function saveMoldDesignsToStorage(items: DrawingDesignItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: items }));
  } catch (e) {
    console.error("Failed to save mold designs to storage", e);
  }
}

// PostgreSQL DB 비동기 동기화 헬퍼 (PUT / POST)
async function syncDesignToBackend(item: Partial<DrawingDesignItem> & { projectNo: string }, method: "PUT" | "POST" = "PUT") {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("/api/v1/mold-dev/designs", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      console.error(`DB design sync error (${method}): HTTP ${res.status}`, json?.error);
      return null;
    }
    return json;
  } catch (err) {
    console.warn("Failed to sync mold design to backend DB:", err);
    return null;
  }
}

// DB 직접 조회 헬퍼
export async function fetchMoldDesignsFromDb(): Promise<DrawingDesignItem[]> {
  try {
    const res = await fetch(`/api/v1/mold-dev/designs?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
    return [];
  } catch (err) {
    console.error("Failed to fetch mold designs from DB:", err);
    return [];
  }
}

export function useMoldDesignStore() {
  const [designs, setDesigns] = useState<DrawingDesignItem[]>(() => {
    return getStoredMoldDesigns();
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // DB 실시간 로드 및 동기화
  useEffect(() => {
    fetchMoldDesignsFromDb()
      .then((data) => {
        saveMoldDesignsToStorage(data);
        setDesigns(data);
      })
      .catch((err) => console.error("Failed to load mold designs:", err))
      .finally(() => setIsLoading(false));

    const handleUpdate = () => {
      setDesigns(getStoredMoldDesigns());
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // 1. 도면 및 설계 항목 수정 (DB PUT 연동)
  const updateDesign = (id: number, updates: Partial<DrawingDesignItem>) => {
    const current = getStoredMoldDesigns();
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    
    let targetItem: DrawingDesignItem | undefined;
    const updated = current.map((item) => {
      if (item.id === id) {
        targetItem = { ...item, ...updates, updatedAt: dateStr };
        return targetItem;
      }
      return item;
    });

    saveMoldDesignsToStorage(updated);
    setDesigns(updated);

    if (targetItem) {
      syncDesignToBackend(targetItem, "PUT");
    }
  };

  // 2. 신규 도면 검토 대상 접수 등록 (MPSI 등록) (DB POST 연동)
  const addDesign = (item: Omit<DrawingDesignItem, "id" | "updatedAt">) => {
    const current = getStoredMoldDesigns();
    const id = current.length > 0 ? Math.max(...current.map((c) => c.id)) + 1 : 1;
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const newItem: DrawingDesignItem = {
      ...item,
      id,
      updatedAt: dateStr,
      workLogs: item.workLogs || [],
    };
    const updated = [newItem, ...current];
    saveMoldDesignsToStorage(updated);
    setDesigns(updated);

    syncDesignToBackend(newItem, "POST");
    return newItem;
  };

  // 3. 업무 이력 메모(로그) 추가 (DB PUT 연동)
  const addWorkLog = (
    designId: number,
    log: {
      authorName: string;
      authorRole: "MPSI" | "VENDOR" | "CUSTOMER";
      fileName?: string;
      content: string;
    }
  ) => {
    const current = getStoredMoldDesigns();
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    
    const newLogItem: MoldDesignWorkLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      authorId: log.authorRole === "MPSI" ? "mpsi_user" : "vendor_user",
      authorName: log.authorName,
      authorRole: log.authorRole,
      fileName: log.fileName,
      content: log.content,
      timestamp: dateStr,
    };

    let targetItem: DrawingDesignItem | undefined;
    const updated = current.map((item) => {
      if (item.id !== designId) return item;
      targetItem = {
        ...item,
        workLogs: [newLogItem, ...(item.workLogs || [])],
        updatedAt: dateStr,
      };
      return targetItem;
    });

    saveMoldDesignsToStorage(updated);
    setDesigns(updated);

    if (targetItem) {
      syncDesignToBackend(targetItem, "PUT");
    }

    return newLogItem;
  };

  // 4. 제품검토 상태 변경 + 업무로그 자동 기록 (DB PUT 연동)
  const updateProductReviewStatus = (
    designId: number,
    newStatus: ProductReviewStatus,
    authorName: string = "MPSI 담당자",
    autoLogText?: string
  ) => {
    const current = getStoredMoldDesigns();
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    let targetItem: DrawingDesignItem | undefined;
    const updated = current.map((item) => {
      if (item.id !== designId) return item;

      const newLogs = [...(item.workLogs || [])];
      if (autoLogText) {
        newLogs.unshift({
          id: `log-${Date.now()}`,
          authorId: "mpsi_user",
          authorName,
          authorRole: "MPSI",
          content: autoLogText,
          timestamp: dateStr,
        });
      }

      let step = item.currentStep;
      if (newStatus === "수정요청" || newStatus === "수정요청(DR)") step = 3;
      else if (newStatus === "검토완료" || newStatus === "최종검토완료") step = 4;

      targetItem = {
        ...item,
        drStatus: newStatus,
        currentStep: step,
        workLogs: newLogs,
        updatedAt: dateStr,
      };
      return targetItem;
    });

    saveMoldDesignsToStorage(updated);
    setDesigns(updated);

    if (targetItem) {
      syncDesignToBackend(targetItem, "PUT");
    }
  };

  // 5. 금형설계 상태 변경 + 업무로그 자동 기록 (DB PUT 연동)
  const updateMoldDesignStatus = (
    designId: number,
    newStatus: MoldDesignReviewStatus,
    authorName: string = "MPSI 담당자",
    autoLogText?: string
  ) => {
    const current = getStoredMoldDesigns();
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    let targetItem: DrawingDesignItem | undefined;
    const updated = current.map((item) => {
      if (item.id !== designId) return item;

      const newLogs = [...(item.workLogs || [])];
      if (autoLogText) {
        newLogs.unshift({
          id: `log-${Date.now()}`,
          authorId: "mpsi_user",
          authorName,
          authorRole: "MPSI",
          content: autoLogText,
          timestamp: dateStr,
        });
      }

      let step = item.currentStep;
      if (newStatus === "검토요청") step = 5;
      else if (newStatus === "검토완료") step = 6;

      targetItem = {
        ...item,
        moldDesignStatus: newStatus,
        currentStep: step,
        workLogs: newLogs,
        updatedAt: dateStr,
      };
      return targetItem;
    });

    saveMoldDesignsToStorage(updated);
    setDesigns(updated);

    if (targetItem) {
      syncDesignToBackend(targetItem, "PUT");
    }
  };

  // 6. 소재 발주 승인 (설계 도중 선발주 가능) (DB PUT 연동)
  const approveMaterialOrder = (
    designId: number,
    approver: string = "홍길동 책임 (MPSI 개발실)",
    note: string = "메인 몰드베이스 및 코어 강재 발주가 승인되었습니다."
  ) => {
    const current = getStoredMoldDesigns();
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    let targetItem: DrawingDesignItem | undefined;
    const updated = current.map((item) => {
      if (item.id !== designId) return item;

      const newLogs = [
        {
          id: `log-${Date.now()}`,
          authorId: "mpsi_user",
          authorName: approver,
          authorRole: "MPSI" as const,
          content: `[소재 발주 승인] ${note}`,
          timestamp: dateStr,
        },
        ...(item.workLogs || []),
      ];

      targetItem = {
        ...item,
        materialOrderStatus: "승인완료" as const,
        materialOrderApprover: approver,
        materialOrderApprovedDate: dateStr,
        materialOrderNote: note,
        workLogs: newLogs,
        updatedAt: dateStr,
      };
      return targetItem;
    });

    saveMoldDesignsToStorage(updated);
    setDesigns(updated);

    if (targetItem) {
      syncDesignToBackend(targetItem, "PUT");
    }
  };

  // 7. 발주서 금형처 발송 승인 (DB PUT 연동)
  const approveMoldPo = (
    designId: number,
    approver: string = "MPSI 구매팀"
  ) => {
    const current = getStoredMoldDesigns();
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    let targetItem: DrawingDesignItem | undefined;
    const updated = current.map((item) => {
      if (item.id !== designId) return item;

      const newLogs = [
        {
          id: `log-${Date.now()}`,
          authorId: "mpsi_user",
          authorName: approver,
          authorRole: "MPSI" as const,
          content: `[금형 발주서 발송 승인] 금형 제작처(${item.moldVendor})로 금형제작 발주서(PO: ${item.moldPoNo || "신규"})가 발송 승인되었습니다.`,
          timestamp: dateStr,
        },
        ...(item.workLogs || []),
      ];

      targetItem = {
        ...item,
        moldPoApproved: true,
        moldPoApprovedDate: dateStr,
        moldPoAttached: true,
        workLogs: newLogs,
        updatedAt: dateStr,
      };
      return targetItem;
    });

    saveMoldDesignsToStorage(updated);
    setDesigns(updated);

    if (targetItem) {
      syncDesignToBackend(targetItem, "PUT");
    }
  };

  // 8. 파일 업로드 및 메모 등록 (DB PUT 연동)
  const uploadDesignFileWithLog = (
    designId: number,
    fileType: "product3D" | "moldMeetingReport" | "caeReport" | "mold3DData" | "moldPoFile",
    fileName: string,
    fileNote: string,
    authorName: string,
    authorRole: "MPSI" | "VENDOR"
  ) => {
    const current = getStoredMoldDesigns();
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const fieldMap = {
      product3D: { fileKey: "product3DFile", noteKey: "product3DNote", title: "3D 제품 data" },
      moldMeetingReport: { fileKey: "moldMeetingReportFile", noteKey: "moldMeetingReportNote", title: "금형 제작 협의록" },
      caeReport: { fileKey: "caeReportFile", noteKey: "caeReportNote", title: "CAE 해석 보고서" },
      mold3DData: { fileKey: "mold3DDataFile", noteKey: "mold3DDataNote", title: "금형 3D data" },
      moldPoFile: { fileKey: "moldPoFile", noteKey: "moldPoFileNote", title: "금형제작 발주서" },
    }[fileType];

    let targetItem: DrawingDesignItem | undefined;
    const updated = current.map((item) => {
      if (item.id !== designId) return item;

      const newLogs = [
        {
          id: `log-${Date.now()}`,
          authorId: authorRole === "MPSI" ? "mpsi_user" : "vendor_user",
          authorName,
          authorRole,
          fileName,
          content: `[${fieldMap.title} 업로드] ${fileNote}`,
          timestamp: dateStr,
        },
        ...(item.workLogs || []),
      ];

      // 금형처가 파일을 업로드하면 검토요청 상태로 자동 전환
      let newDrStatus = item.drStatus;
      let newDesignStatus = item.moldDesignStatus;
      if (authorRole === "VENDOR") {
        if (fileType === "moldMeetingReport" || fileType === "product3D" || fileType === "caeReport") {
          newDrStatus = "검토요청";
        }
        if (fileType === "mold3DData") {
          newDesignStatus = "검토요청";
        }
      }

      targetItem = {
        ...item,
        [fieldMap.fileKey]: fileName,
        [fieldMap.noteKey]: fileNote,
        moldPoAttached: fileType === "moldPoFile" ? true : item.moldPoAttached,
        drStatus: newDrStatus,
        moldDesignStatus: newDesignStatus,
        workLogs: newLogs,
        updatedAt: dateStr,
      };
      return targetItem;
    });

    saveMoldDesignsToStorage(updated);
    setDesigns(updated);

    if (targetItem) {
      syncDesignToBackend(targetItem, "PUT");
    }
  };

  // 9. 삭제 (DB DELETE 연동)
  const deleteDesign = (id: number) => {
    const current = getStoredMoldDesigns();
    const target = current.find((item) => item.id === id);
    const updated = current.filter((item) => item.id !== id);
    saveMoldDesignsToStorage(updated);
    setDesigns(updated);

    if (target?.projectNo) {
      fetch(`/api/v1/mold-dev/designs?projectNo=${encodeURIComponent(target.projectNo)}`, {
        method: "DELETE",
      }).catch(err => console.error("Failed to delete mold design from DB:", err));
    }
  };

  // 10. 새로고침
  const refresh = () => {
    fetchMoldDesignsFromDb().then((data) => {
      saveMoldDesignsToStorage(data);
      setDesigns(data);
    });
  };

  return {
    designs,
    isLoading,
    updateDesign,
    addDesign,
    addWorkLog,
    updateProductReviewStatus,
    updateMoldDesignStatus,
    approveMaterialOrder,
    approveMoldPo,
    uploadDesignFileWithLog,
    deleteDesign,
    refresh,
    resetDesigns: refresh,
  };
}

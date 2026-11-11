"use client";

import { useState, useEffect } from "react";
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
  currentRound: number;       // 현재 PM 차수 (예: 3차)
  currentShots: number;       // 현재 누적 금형타수 (예: 120,000샷)
  pmReason: string;           // PM사유 (예: 정기(정기PM, 불량개선 등))
  lastPmDate: string;         // 직전 PM 일자
  lastPmShots: number;        // 직전 누적 금형 타수
  massStartDate: string;      // 양산 시작 일자
  warrantyShots: number;      // 금형 보증샷 (예: 300,000샷)
  pmCycleShots: number;       // PM 주기 (예: 40,000샷)
  activeProcess: string;      // 현재 진행 공정 (금형 분해 점검 중 등)
  schedule: {
    planStartDate: string;    // PM 시작일 (계획)
    planEndDate: string;      // PM 완료일 (계획)
    planMassStartDate: string;// 양산 시작일 (계획)
    actualStartDate: string;  // PM 시작일 (실적)
    actualEndDate: string;    // PM 완료일 (실적)
    actualMassStartDate: string; // 양산 시작일 (실적)
  };
  roundsData?: Record<number, PmRoundItem>; // [핵심] 1차~30차 각 차수별 개별 저장 데이터 맵
  memos: Array<{
    id: string;
    author: string;
    content: string;
    createdAt: string;
  }>;
}

// 3. 설변 및 PM 관리 프로젝트 아이템 인터페이스
export interface PmRevisionProjectItem {
  id: number;
  projectNo: string;          // 프로젝트번호 (예: MI26003P0, MI26002P0)
  revisionCode: string;       // 신작/설변 (예: E001, N001)
  quotationKind: string;      // 견적종류 (예: "(금형견적, 사출견적)", "신작견적")
  projectName: string;        // 프로젝트/차종 (예: 현대 NT7, 현대 NT6)
  productName: string;        // 제품명 (예: Door Trim, Rear door)
  partNo: string;             // 품번 (예: 84710-NT700, 4850)
  moldNo: string;             // 금형번호 (예: MI26003M1, MI26002M1)
  customerName: string;       // 고객사 (예: HKMC, HMC)
  cavity: string;             // 캐비티사양 (예: 2*1)
  moldVendor: string;         // 금형제작처 (예: 우성정공)
  massVendor: string;         // 사출양산처 (예: (주)뉴몰드)

  currentState: "설변 중" | "PM 중" | "양산 중"; // 현재 상태 (노란색 칸)

  // 우측 세부 일정 (양산관리 메뉴에서 확인)
  moldModStartDate: string;   // 금형 수정 시작 (PO발행일 연동)
  progressProcess: string;    // 진행 공정 (각 소단계의 상태연동)
  moldModEndDate: string;     // 금형 수정 완료 (금형이관일 연동)
  pilotMassDate: string;      // 시양산일자 (시양산일자 연동)
  ppapSubmitDate: string;     // 양산승인서제출 (제출일자 연동)
  mpsiApprovalDate: string;   // 고객사 승인 (MPSI 승인일 연동)
  massStartDate: string;      // 양산시작일 (공급업체가 입력)

  // 설계변경 전용 데이터
  revisionMassStartDate?: string;
  revisionMemos: Array<{
    id: string;
    author: string;
    content: string;
    createdAt: string;
  }>;

  // PM 전용 데이터
  pmData?: PmMoldData;

  // 신작/설변 이력 모달용 데이터 (N001, E001, E002...)
  historyList: RevisionHistoryItem[];
  updatedAt: string;
}

export const INITIAL_PM_REVISION_DATA: PmRevisionProjectItem[] = [];
const OLD_PM_REVISION_DATA: PmRevisionProjectItem[] = [
  // 1행: 현대 NT7 Door Trim (설계변경 E002) - 스크린샷 1과 100% 일치
  {
    id: 1,
    projectNo: "MI26003P0",
    revisionCode: "E002",
    quotationKind: "(금형견적, 사출견적)",
    projectName: "현대 NT7",
    productName: "Door Trim",
    partNo: "84710-NT700",
    moldNo: "MI26003M1",
    customerName: "HKMC",
    cavity: "2*1",
    moldVendor: "우성정공",
    massVendor: "(주)뉴몰드",
    currentState: "설변 중",
    moldModStartDate: "2026-10-12",
    progressProcess: "가공 중",
    moldModEndDate: "2026-10-15",
    pilotMassDate: "2026-10-12",
    ppapSubmitDate: "2026-10-12",
    mpsiApprovalDate: "2026-10-12",
    massStartDate: "2026-10-19",
    revisionMassStartDate: "2026-10-19",
    revisionMemos: [
      {
        id: "rm-1",
        author: "(주)뉴몰드",
        content: "261010_치수검토보고서 등록, 2026.10.10. 10:54 입력",
        createdAt: "2026.10.10. 10:54 입력"
      },
      {
        id: "rm-2",
        author: "(주)뉴몰드",
        content: "261012_설계변경 양산 시작일자(2026-10-19) 공급업체 입력 완료",
        createdAt: "2026.10.12. 14:20 입력"
      }
    ],
    pmData: {
      currentRound: 3,
      currentShots: 120000,
      pmReason: "정기(정기PM, 불량개선등)",
      lastPmDate: "2026.07.05",
      lastPmShots: 80000,
      massStartDate: "2025.01.05",
      warrantyShots: 300000,
      pmCycleShots: 40000,
      activeProcess: "금형 분해 점검 중",
      schedule: {
        planStartDate: "2026-10-19",
        planEndDate: "2026-10-20",
        planMassStartDate: "2026-10-21",
        actualStartDate: "2026-10-19",
        actualEndDate: "2026-10-21",
        actualMassStartDate: "2026-10-22",
      },
      roundsData: {
        1: {
          round: 1,
          currentShots: "40,000",
          pmReason: "초도 1차 정기점검 및 마모 검사",
          lastPmDate: "2025. 01.05",
          lastPmShots: "0",
          massStartDate: "2025. 01.05",
          pmCycleShots: "40,000",
          activeProcess: "양산 대기 중",
          schedule: {
            planStartDate: "2025-03-10",
            planEndDate: "2025-03-11",
            planMassStartDate: "2025-03-12",
            actualStartDate: "2025-03-10",
            actualEndDate: "2025-03-11",
            actualMassStartDate: "2025-03-12",
          }
        },
        2: {
          round: 2,
          currentShots: "80,000",
          pmReason: "2차 정기 PM (부식 및 파팅단차 점검)",
          lastPmDate: "2025. 03.10",
          lastPmShots: "40,000",
          massStartDate: "2025. 01.05",
          pmCycleShots: "40,000",
          activeProcess: "양산 대기 중",
          schedule: {
            planStartDate: "2025-07-05",
            planEndDate: "2025-07-06",
            planMassStartDate: "2025-07-07",
            actualStartDate: "2025-07-05",
            actualEndDate: "2025-07-06",
            actualMassStartDate: "2025-07-07",
          }
        },
        3: {
          round: 3,
          currentShots: "120,000",
          pmReason: "3차 정기 PM (점검 및 세척)",
          lastPmDate: "2026. 07.05",
          lastPmShots: "80,000",
          massStartDate: "2025. 01.05",
          pmCycleShots: "40,000",
          activeProcess: "금형 분해 점검 중",
          schedule: {
            planStartDate: "2026-10-19",
            planEndDate: "2026-10-20",
            planMassStartDate: "2026-10-21",
            actualStartDate: "2026-10-19",
            actualEndDate: "2026-10-21",
            actualMassStartDate: "2026-10-22",
          }
        }
      },
      memos: [
        {
          id: "pm-m-door-1",
          author: "(주)뉴몰드",
          content: "261018_금형 PM 착수 및 상태 전환: 정기 타수 도달에 따른 금형 분해점검 PM 착수, 2026.10.18. 15:25 입력",
          createdAt: "2026.10.18. 15:25 입력"
        }
      ]
    },
    historyList: [
      {
        revisionCode: "E002",
        revisionDate: "2026-10-12",
        title: "2차 설계변경 (E002) - 파팅라인 및 결합 리브 보강",
        modelReview: "현대차 제품도면 v2.1 3D CAD 검토 승인 완료 (중량 +3.2g, CT +1.5초 변동)",
        moldCostQuote: "금형 수정비 9,800,000원 확정 / 사출 단가 +35원 변동 조정 확정 (금형견적, 사출견적)",
        moldTrialReport: "우성정공 가공 진행 중 (방전 및 와이어 가공 보정)",
        massValidationReport: "금형 이관 후 시양산 및 재양산 승인 진행 예정",
        author: "(주)뉴몰드",
        memo: "설변 수주 확정 및 단가조정 반영, 261010_치수검토보고서 등록",
        createdAt: "2026.10.12 10:54"
      }
    ],
    updatedAt: "2026-10-12 14:20"
  },

  // 2행: 현대 NT6 Rear door (설계변경 E001) - 스크린샷 1과 100% 일치
  {
    id: 2,
    projectNo: "MI26002P0",
    revisionCode: "E001",
    quotationKind: "(금형견적, 사출견적)",
    projectName: "현대 NT6",
    productName: "Rear door",
    partNo: "4850",
    moldNo: "MI26002M1",
    customerName: "HMC",
    cavity: "2*1",
    moldVendor: "우성정공",
    massVendor: "(주)뉴몰드",
    currentState: "설변 중",
    moldModStartDate: "공급업체입력",
    progressProcess: "가공 중",
    moldModEndDate: "공급업체입력",
    pilotMassDate: "2026-10-14",
    ppapSubmitDate: "자체검증",
    mpsiApprovalDate: "자체검증",
    massStartDate: "2026-10-22",
    revisionMassStartDate: "2026-10-22",
    revisionMemos: [],
    pmData: {
      currentRound: 3,
      currentShots: 120000,
      pmReason: "정기(정기PM, 불량개선등)",
      lastPmDate: "2026. 07.05",
      lastPmShots: 80000,
      massStartDate: "2025. 01.05",
      warrantyShots: 300000,
      pmCycleShots: 40000,
      activeProcess: "금형 분해 점검 중",
      schedule: {
        planStartDate: "2026-10-19",
        planEndDate: "2026-10-20",
        planMassStartDate: "2026-10-21",
        actualStartDate: "2026-10-19",
        actualEndDate: "2026-10-21",
        actualMassStartDate: "2026-10-22",
      },
      // 1차 ~ 30차 개별 차수별 저장 데이터 맵
      roundsData: {
        1: {
          round: 1,
          currentShots: "40,000",
          pmReason: "초도 1차 정기점검 및 마모 검사",
          lastPmDate: "2025. 01.05",
          lastPmShots: "0",
          massStartDate: "2025. 01.05",
          pmCycleShots: "40,000",
          activeProcess: "양산 대기 중",
          schedule: {
            planStartDate: "2025-03-10",
            planEndDate: "2025-03-11",
            planMassStartDate: "2025-03-12",
            actualStartDate: "2025-03-10",
            actualEndDate: "2025-03-11",
            actualMassStartDate: "2025-03-12",
          }
        },
        2: {
          round: 2,
          currentShots: "80,000",
          pmReason: "2차 정기 PM (부식 및 파팅단차 점검)",
          lastPmDate: "2025. 03.10",
          lastPmShots: "40,000",
          massStartDate: "2025. 01.05",
          pmCycleShots: "40,000",
          activeProcess: "양산 대기 중",
          schedule: {
            planStartDate: "2025-07-05",
            planEndDate: "2025-07-06",
            planMassStartDate: "2025-07-07",
            actualStartDate: "2025-07-05",
            actualEndDate: "2025-07-06",
            actualMassStartDate: "2025-07-07",
          }
        },
        3: {
          round: 3,
          currentShots: "120,000",
          pmReason: "정기(정기PM, 불량개선등)",
          lastPmDate: "2026. 07.05",
          lastPmShots: "80,000",
          massStartDate: "2025. 01.05",
          pmCycleShots: "40,000",
          activeProcess: "금형 분해 점검 중",
          schedule: {
            planStartDate: "2026-10-19",
            planEndDate: "2026-10-20",
            planMassStartDate: "2026-10-21",
            actualStartDate: "2026-10-19",
            actualEndDate: "2026-10-21",
            actualMassStartDate: "2026-10-22",
          }
        }
      },
      memos: [
        {
          id: "pm-m-1",
          author: "(주)뉴몰드",
          content: "PM공정 시사출 확인 등록, 2026.10.10. 10:54 입력",
          createdAt: "2026.10.10. 10:54 입력"
        },
        {
          id: "pm-m-2",
          author: "(주)뉴몰드",
          content: "3차 정기 PM 착수 (누적 타수 120,000샷 도달), 금형 분해 점검 중",
          createdAt: "2026.10.19. 09:30 입력"
        }
      ]
    },
    historyList: [
      {
        revisionCode: "E001",
        revisionDate: "2026-10-14",
        title: "1차 설계변경 (E001) - 힌지 체결부 보강 및 게이트 위치 보정",
        modelReview: "HMC 도면 rev1.2 3D CAD 모델 검토 승인 완료 (수축률 0.45% 보정)",
        moldCostQuote: "금형 수정비 8,200,000원 확정 / 사출 단가 +15원 조정 확정",
        moldTrialReport: "우성정공 가공 진행 중 (방전/와이어 완료 후 피팅)",
        massValidationReport: "자체검증 및 시양산 일정 2026-10-14 진행 예정",
        author: "(주)뉴몰드",
        memo: "도면 변경에 따른 힌지 체결부 리브 추가 및 사출 조건 재수립",
        createdAt: "2026.10.14 09:30"
      }
    ],
    updatedAt: "2026-10-14 09:30"
  },

  // 3행: 현대 NT5 Front Door Upper Cover (설계변경 E002) - 스크린샷 1과 100% 일치
  {
    id: 3,
    projectNo: "MI26001P0",
    revisionCode: "E002",
    quotationKind: "(금형견적, 사출견적)",
    projectName: "현대 NT5",
    productName: "Front Door Upper Cover LH/RH",
    partNo: "84710-NT500-LH",
    moldNo: "MI26001M1",
    customerName: "HKMC",
    cavity: "1*2",
    moldVendor: "우성정공",
    massVendor: "(주)뉴몰드",
    currentState: "설변 중",
    moldModStartDate: "2026-08-10",
    progressProcess: "가공 중",
    moldModEndDate: "2026-08-15",
    pilotMassDate: "2026-10-12",
    ppapSubmitDate: "2026-10-14",
    mpsiApprovalDate: "2026-10-15",
    massStartDate: "2026-10-20",
    revisionMassStartDate: "2026-10-20",
    revisionMemos: [],
    pmData: {
      currentRound: 2,
      currentShots: 95000,
      pmReason: "정기(정기PM, 불량개선등)",
      lastPmDate: "2026.06.20",
      lastPmShots: 50000,
      massStartDate: "2025.02.10",
      warrantyShots: 500000,
      pmCycleShots: 40000,
      activeProcess: "금형 분해 점검 중",
      schedule: {
        planStartDate: "2026-10-19",
        planEndDate: "2026-10-20",
        planMassStartDate: "2026-10-21",
        actualStartDate: "2026-10-19",
        actualEndDate: "2026-10-21",
        actualMassStartDate: "2026-10-22",
      },
      memos: []
    },
    historyList: [
      {
        revisionCode: "E002",
        revisionDate: "2026-10-15",
        title: "2차 설계변경 (E002) - 클립 체결 구조 변경 및 단차 개선",
        modelReview: "3D CAD 제품 모델링 v2.0 검토 승인 완료 (수축률 0.5% 반영)",
        moldCostQuote: "금형 수정비 7,800,000원 확정 / 사출 단가 +25원 변동 조정 확정 (금형견적, 사출견적)",
        moldTrialReport: "우성정공 가공 진행 중 (2026-08-10~2026-08-15 가공 및 조립)",
        massValidationReport: "재양산 승인 및 PPAP 서류 제출 진행 중",
        author: "MPSI 품질본부 / 뉴몰드",
        memo: "클립 홀 위치 1.2mm 상향 이동 및 살두께 보정",
        createdAt: "2026.10.15 10:00"
      }
    ],
    updatedAt: "2026-10-15 10:00"
  }
];

const STORAGE_KEY = "mpsi_pm_revision_store_v5";
const SYNC_EVENT_NAME = "mpsi_pm_revision_updated";

export function usePmRevisionStore() {
  const [items, setItems] = useState<PmRevisionProjectItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((it: any) => !it.projectName?.includes("현대 NT7") && it.projectNo !== "MI26003P0" && it.projectNo !== "MI26001P0");
          setItems(cleaned);
        } else {
          setItems([]);
        }
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    }
    setIsLoaded(true);

    const handleSync = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) setItems(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to sync PM revision store:", e);
      }
    };

    window.addEventListener(SYNC_EVENT_NAME, handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const saveItems = (newItems: PmRevisionProjectItem[]) => {
    setItems(newItems);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
      window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME));
    } catch (e) {
      console.error("Failed to save PM revision items:", e);
    }
  };

  // 설계변경 양산 시작일자 입력 및 메모 자동 등록
  const updateRevisionMassStartDate = (
    id: number,
    date: string,
    author: string = "(주)뉴몰드",
    memoContent?: string
  ) => {
    const now = new Date();
    const nowStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}. ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const dateSimple = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`.slice(2);

    const nextItems = items.map((item) => {
      if (item.id === id) {
        const memoText = memoContent || `${dateSimple}_설계변경 양산 시작일(${date}) 입력 등록`;
        const newMemo = {
          id: `rm-${Date.now()}`,
          author,
          content: `${memoText}, ${nowStr} 입력`,
          createdAt: `${nowStr} 입력`
        };

        return {
          ...item,
          massStartDate: date,
          revisionMassStartDate: date,
          revisionMemos: [newMemo, ...(item.revisionMemos || [])],
          updatedAt: nowStr
        };
      }
      return item;
    });

    saveItems(nextItems);
  };

  // PM 공정 변경 및 메모 자동 등록
  const updatePmProcess = (
    id: number,
    processName: string,
    author: string = "(주)뉴몰드"
  ) => {
    const now = new Date();
    const nowStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}. ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const nextItems = items.map((item) => {
      if (item.id === id && item.pmData) {
        const newMemo = {
          id: `pm-m-${Date.now()}`,
          author,
          content: `PM공정 ${processName} 등록, ${nowStr} 입력`,
          createdAt: `${nowStr} 입력`
        };

        return {
          ...item,
          progressProcess: processName,
          pmData: {
            ...item.pmData,
            activeProcess: processName,
            memos: [newMemo, ...(item.pmData.memos || [])]
          },
          updatedAt: nowStr
        };
      }
      return item;
    });

    saveItems(nextItems);
  };

  // PM 일정 (계획/실적) 업데이트 및 메모 등록
  const updatePmSchedule = (
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

    const nextItems = items.map((item) => {
      if (item.id === id && item.pmData) {
        const nextSchedule = {
          ...item.pmData.schedule,
          ...schedule
        };

        const memoText = memoContent || `PM 일정 계획/실적 등록 (계획: ${nextSchedule.planStartDate}~${nextSchedule.planEndDate} / 실적: ${nextSchedule.actualStartDate}~${nextSchedule.actualEndDate})`;
        const newMemo = {
          id: `pm-m-${Date.now()}`,
          author,
          content: `${memoText}, ${nowStr} 입력`,
          createdAt: `${nowStr} 입력`
        };

        return {
          ...item,
          massStartDate: nextSchedule.actualMassStartDate || nextSchedule.planMassStartDate || item.massStartDate,
          pmData: {
            ...item.pmData,
            schedule: nextSchedule,
            memos: [newMemo, ...(item.pmData.memos || [])]
          },
          updatedAt: nowStr
        };
      }
      return item;
    });

    saveItems(nextItems);
  };

  // PM 기본 사양 (차수, 누적타수, 보증타수 등) 업데이트
  const updatePmSpecs = (
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

    const nextItems = items.map((item) => {
      if (item.id === id && item.pmData) {
        return {
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
      }
      return item;
    });

    saveItems(nextItems);
  };

  // 수동 메모 추가 (설계변경 or PM)
  const addMemo = (
    id: number,
    type: "REVISION" | "PM",
    content: string,
    author: string = "(주)뉴몰드"
  ) => {
    const now = new Date();
    const nowStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}. ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const isMpsi = author.includes("MPSI");
    const cleanAuthor = isMpsi ? "MPSI" : cleanCompanyAuthor(author, "(주)뉴몰드");

    const nextItems = items.map((item) => {
      if (item.id === id) {
        const newMemo = {
          id: `memo-${Date.now()}`,
          author: cleanAuthor,
          content: `${content}, ${nowStr} 입력`,
          createdAt: `${nowStr} 입력`
        };

        if (type === "PM" && item.pmData) {
          return {
            ...item,
            pmData: {
              ...item.pmData,
              memos: [newMemo, ...(item.pmData.memos || [])]
            },
            updatedAt: nowStr
          };
        } else {
          return {
            ...item,
            revisionMemos: [newMemo, ...(item.revisionMemos || [])],
            updatedAt: nowStr
          };
        }
      }
      return item;
    });

    saveItems(nextItems);

    // 대상 상대방 회사로만 알림 격리 발송
    const targetItem = items.find((it) => it.id === id);
    const targetVendor = targetItem?.massVendor || "(주)뉴몰드";
    dispatchGlobalNotification({
      menuName: type === "PM" ? "양산 - 금형 PM 보전" : "양산 - 설계변경 관리",
      menuPath: isMpsi ? "/portal/vendor-portal/mass/revision" : "/portal/mass-prod/revision",
      senderCompany: isMpsi ? "MPSI" : targetVendor,
      senderName: cleanAuthor,
      content: `[${targetItem?.projectNo} ${type === "PM" ? "PM" : "설변"} 메모] ${content}`,
      projectNo: targetItem?.projectNo,
      targetRole: isMpsi ? "VENDOR_MASS" : "MPSI",
      targetVendorName: isMpsi ? targetVendor : undefined,
    });
  };

  // 프로젝트 상태값 변경 (양산 중 ➔ 설변 중(E001 채번) or PM 중)
  const changeProjectState = (
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
    const author = options?.author || "(주)뉴몰드";

    const nextItems = items.map((item) => {
      if (item.id === id) {
        if (newState === "설변 중") {
          // 신규 E 채번 (N001 ➔ E001, 기존 E001 ➔ E002 등)
          let nextRevCode = "E001";
          if (item.revisionCode.startsWith("E")) {
            const num = parseInt(item.revisionCode.replace("E", ""), 10) || 1;
            nextRevCode = `E${String(num + 1).padStart(3, "0")}`;
          }

          const newMemo = {
            id: `rm-${Date.now()}`,
            author,
            content: `${dateSimple}_설계변경(${nextRevCode}) 착수 및 상태 전환: ${options?.reason || "고객사 설계변경 접수"}, ${nowStr} 입력`,
            createdAt: `${nowStr} 입력`
          };

          const newHistory: RevisionHistoryItem = {
            revisionCode: nextRevCode,
            revisionDate: dateDash,
            title: `${nextRevCode === "E001" ? "1차" : "차기"} 설계변경 (${nextRevCode}) - ${options?.reason || "도면 변경 및 단가 조정"}`,
            modelReview: "설계변경 3D 모델링 접수 및 금형 구현성 검토 진행 중",
            moldCostQuote: "설변 금형 수정비 및 사출 단가 변동 견적 검토 중 (금형견적, 사출견적)",
            moldTrialReport: "금형 수정 후 시사출 진행 예정",
            massValidationReport: "금형 이관 후 시양산 및 재양산 승인 진행 예정",
            author,
            memo: options?.reason || "설계변경 착수",
            createdAt: nowStr
          };

          return {
            ...item,
            currentState: "설변 중" as const,
            revisionCode: nextRevCode,
            quotationKind: "(금형견적, 사출견적)",
            progressProcess: "가공 중",
            revisionMassStartDate: options?.massStartDate || item.revisionMassStartDate || item.massStartDate,
            revisionMemos: [newMemo, ...(item.revisionMemos || [])],
            historyList: [...(item.historyList || []), newHistory],
            updatedAt: nowStr
          };
        } else if (newState === "PM 중") {
          const newMemo = {
            id: `pm-m-${Date.now()}`,
            author,
            content: `${dateSimple}_금형 PM 착수 및 상태 전환: ${options?.reason || "타수 누적에 따른 정기점검"}, ${nowStr} 입력`,
            createdAt: `${nowStr} 입력`
          };

          const currentPm = item.pmData || {
            currentRound: 1,
            currentShots: 40000,
            pmReason: options?.reason || "정기(정기PM, 불량개선 등)",
            lastPmDate: dateDash.replace(/-/g, "."),
            lastPmShots: 0,
            massStartDate: item.massStartDate || dateDash,
            warrantyShots: 300000,
            pmCycleShots: 40000,
            activeProcess: "금형분해점검중",
            schedule: {
              planStartDate: dateDash,
              planEndDate: dateDash,
              planMassStartDate: dateDash,
              actualStartDate: dateDash,
              actualEndDate: dateDash,
              actualMassStartDate: dateDash,
            },
            memos: []
          };

          return {
            ...item,
            currentState: "PM 중" as const,
            progressProcess: "금형분해점검중",
            pmData: {
              ...currentPm,
              activeProcess: "금형분해점검중",
              memos: [newMemo, ...(currentPm.memos || [])]
            },
            updatedAt: nowStr
          };
        } else {
          // 양산 중
          const newMemo = {
            id: `rm-${Date.now()}`,
            author,
            content: `${dateSimple}_양산 정상 가동 상태 전환, ${nowStr} 입력`,
            createdAt: `${nowStr} 입력`
          };

          return {
            ...item,
            currentState: "양산 중" as const,
            progressProcess: "양산 납품 중",
            revisionMemos: [newMemo, ...(item.revisionMemos || [])],
            updatedAt: nowStr
          };
        }
      }
      return item;
    });

    saveItems(nextItems);
  };

  // [핵심] 차수별 PM 데이터 저장 함수 (1차 ~ 30차 개별 저장 및 동기화)
  const savePmRoundData = (
    id: number,
    roundData: PmRoundItem,
    author: string = "(주)뉴몰드"
  ) => {
    const now = new Date();
    const nowStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}. ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const nextItems = items.map((item) => {
      if (item.id === id && item.pmData) {
        const prevRounds = item.pmData.roundsData || {};
        const updatedRounds = {
          ...prevRounds,
          [roundData.round]: roundData,
        };

        const numShots = parseInt(String(roundData.currentShots).replace(/[^0-9]/g, ""), 10) || 120000;
        const numLastShots = parseInt(String(roundData.lastPmShots).replace(/[^0-9]/g, ""), 10) || 80000;
        const numCycle = parseInt(String(roundData.pmCycleShots).replace(/[^0-9]/g, ""), 10) || 40000;

        const newMemo = {
          id: `pm-m-${Date.now()}`,
          author,
          content: `${roundData.round}차 PM 상세 데이터 저장 (공정: ${roundData.activeProcess}, 타수: ${numShots.toLocaleString()}샷)`,
          createdAt: `${nowStr} 입력`
        };

        return {
          ...item,
          progressProcess: roundData.activeProcess || item.progressProcess,
          massStartDate: roundData.schedule.actualMassStartDate || roundData.schedule.planMassStartDate || item.massStartDate,
          pmData: {
            ...item.pmData,
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
            memos: [newMemo, ...(item.pmData.memos || [])]
          },
          updatedAt: nowStr
        };
      }
      return item;
    });

    saveItems(nextItems);
  };

  const resetToInitial = () => {
    saveItems(INITIAL_PM_REVISION_DATA);
  };

  return {
    items,
    isLoaded,
    updateRevisionMassStartDate,
    updatePmProcess,
    updatePmSchedule,
    updatePmSpecs,
    savePmRoundData,
    changeProjectState,
    addMemo,
    resetToInitial
  };
}


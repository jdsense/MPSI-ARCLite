"use client";

import { useState, useEffect } from "react";
import { MOLD_VENDOR_LIST, MASS_VENDOR_LIST } from "./role-store";
import { ProjectMaster, toKsxProject, fromKsxProject, MpsiProjectStepAttachment } from "@/types/ksx9101";

export { type ProjectMaster, toKsxProject, fromKsxProject, type MpsiProjectStepAttachment };

// 1. 프로세스 단계 정의 (0단계: 견적 및 수주 포함 총 14개 단계)
export interface StepDefinition {
  step: number;
  name: string;
  bullets: string[]; // 스크린샷 카드별 세부 불릿 목록 (외주업체 템플릿 포함)
  actorRole: "MPSI" | "MOLD_MAKER" | "MASS_PRODUCER" | "MPSI_AND_MOLD" | "MPSI_AND_MASS" | "MASS_AND_MPSI";
  actorDefault: string;
  desc: string;
  stageGroup: "견적/수주" | "도면/수주" | "금형개발" | "시사출육성" | "사출양산";
  url: string;
  menuTitle: string;
}

export const PROCESS_13_STEPS: StepDefinition[] = [
  {
    step: 0,
    name: "견적 및 수주",
    bullets: [
      "3D, 2D data 및 견적 조건 확인(볼륨, 납기, 운송조건 등)",
      "MPSI가 직접 작성해서 고객사에 제출하거나, 우성/뉴몰드에서 고객사 제출용 견적을 받아서 제출가능",
    ],
    actorRole: "MPSI",
    actorDefault: "MPSI",
    desc: "3D, 2D data 및 견적 조건 확인, 고객사 견적서 직접 제출 또는 우성/뉴몰드 견적 취합 제출",
    stageGroup: "견적/수주",
    url: "/portal/quotation",
    menuTitle: "금형-견적관리 > 견적 및 수주",
  },
  {
    step: 1,
    name: "제품 data 접수",
    bullets: [
      "3D, 2D data",
      "견적 조건 확인(볼륨, 납기, 운송조건 등)",
      "2D 도면에서 고객 요구사항 확인",
    ],
    actorRole: "MPSI",
    actorDefault: "MPSI",
    desc: "고객사 2D/3D 제품 데이터 접수, 견적 조건 및 요구사항 확인",
    stageGroup: "도면/수주",
    url: "/portal/sales-order/drawing-reception",
    menuTitle: "수주 및 도면접수",
  },
  {
    step: 2,
    name: "제품 3D data 검토",
    bullets: [
      "금형구현가능성 검토 후 고객사에 제품모델 수정 요청",
      "CAE 해석 검토 후 제품모델 수정요청",
    ],
    actorRole: "MPSI",
    actorDefault: "MPSI",
    desc: "금형구현가능성 및 CAE 유동해석 검토 후 고객사에 제품모델 수정 요청",
    stageGroup: "도면/수주",
    url: "/portal/mold-dev/design",
    menuTitle: "금형개발 > 2. 제품검토 및 금형설계",
  },
  {
    step: 3,
    name: "최종 제품 3D data 수신",
    bullets: [
      "제품모델 수정 후 최종 데이터 확보",
      "수정된 제품모델이 금형제작비에 큰 영향 없으면 금형 발주서 작성",
    ],
    actorRole: "MPSI",
    actorDefault: "MPSI",
    desc: "제품모델 수정 후 최종 데이터 확보 및 금형 발주서 작성",
    stageGroup: "도면/수주",
    url: "/portal/mold-dev/design",
    menuTitle: "금형개발 > 2. 제품검토 및 금형설계",
  },
  {
    step: 4,
    name: "금형 발주",
    bullets: [
      "최종 제품모델링과 금형제작 발주서(T1 및 납기 포함) {moldVendor}에 발송",
    ],
    actorRole: "MPSI",
    actorDefault: "MPSI",
    desc: "최종 제품모델링과 금형제작 발주서(T1 및 납기 포함) 금형제작처 발송",
    stageGroup: "도면/수주",
    url: "/portal/mold-dev/design",
    menuTitle: "금형개발 > 2. 제품검토 및 금형설계",
  },
  {
    step: 5,
    name: "금형 설계",
    bullets: [
      "{moldVendor}에서 금형제작협의록, 3D 금형설계데이터 제출하면, MPSI가 검토 후 승인(컨펌).",
    ],
    actorRole: "MOLD_MAKER",
    actorDefault: "우성정공",
    desc: "금형제작처 금형제작협의록/3D설계 제출 및 MPSI 검토 승인(컨펌)",
    stageGroup: "금형개발",
    url: "/portal/mold-dev/design",
    menuTitle: "금형개발 > 2. 제품검토 및 금형설계",
  },
  {
    step: 6,
    name: "소재발주 및 제작",
    bullets: [
      "금형 설계 진행 중 메인 소재 치수 컨펌 시 사전 선발주 승인 및 가공 시작",
      "공정일정표 제출 및 매주 업데이트",
    ],
    actorRole: "MOLD_MAKER",
    actorDefault: "우성정공",
    desc: "소재 선발주 승인 후 강재 발주/가공 시작 및 공정일정표 매주 업데이트",
    stageGroup: "금형개발",
    url: "/portal/mold-dev/manufacture",
    menuTitle: "금형개발 > 3. 금형제작",
  },
  {
    step: 7,
    name: "금형완료/시사출",
    bullets: [
      "{moldVendor} 자체 금형 육성",
      "시사출 샘플 및 시사출 보고서 제출",
    ],
    actorRole: "MOLD_MAKER",
    actorDefault: "우성정공",
    desc: "금형제작처 자체 금형 육성, 시사출 샘플 및 시사출 보고서 제출",
    stageGroup: "금형개발",
    url: "/portal/mold-dev/trial",
    menuTitle: "금형개발 > 시사출/금형 육성",
  },
  {
    step: 8,
    name: "제품 치수/외관 확인 및 금형검사",
    bullets: [
      "MPSI 담당자 시사출 참관",
      "제품치수/외관 확인 및 금형 검사",
    ],
    actorRole: "MPSI_AND_MOLD",
    actorDefault: "MPSI 및 우성정공",
    desc: "MPSI 담당자 시사출 참관, 제품치수/외관 확인 및 금형 검사",
    stageGroup: "시사출육성",
    url: "/portal/mold-dev/trial",
    menuTitle: "금형개발 > 시사출/금형 육성",
  },
  {
    step: 9,
    name: "금형 육성 완료",
    bullets: [
      "고객요구사항 충족시까지 금형육성",
      "금형승인원, 시사출보고서, 최종샘플, 금형검사체크리스트 작성",
    ],
    actorRole: "MOLD_MAKER",
    actorDefault: "우성정공",
    desc: "고객 요구사항 충족 시까지 금형육성, 승인원/시사출보고서/체크리스트 작성",
    stageGroup: "시사출육성",
    url: "/portal/mold-dev/trial",
    menuTitle: "금형개발 > 시사출/금형 육성",
  },
  {
    step: 10,
    name: "금형 승인 후 이관",
    bullets: [
      "금형승인원, CAE보고서, 최종샘플, 시사출보고서, 금형제작사양서, 금형체크리스트와 함께 금형 양산처 이관",
    ],
    actorRole: "MPSI_AND_MOLD",
    actorDefault: "MPSI 승인 및 우성정공",
    desc: "금형승인원/CAE/최종샘플 등 6대 서류와 함께 금형을 양산처로 이관",
    stageGroup: "시사출육성",
    url: "/portal/mold-dev/trial",
    menuTitle: "금형개발 > 시사출/금형 육성",
  },
  {
    step: 11,
    name: "양산승인 사출(시양산)",
    bullets: [
      "제품2D도면 치수, CPK, CT, 수율 CAPA 충족위한 양산성 검증 시양산",
      "부적합 시 금형 수정 후 재 진행",
    ],
    actorRole: "MASS_PRODUCER",
    actorDefault: "뉴몰드",
    desc: "2D치수, Cpk, CT, 수율 Capa 충족을 위한 양산성 검증 시양산 (부적합 시 금형수정 재진행)",
    stageGroup: "사출양산",
    url: "/portal/mass-prod/validation",
    menuTitle: "양산외주 > 시양산/양산성 검증",
  },
  {
    step: 12,
    name: "양산품질 검증",
    bullets: [
      "PPAP(양산 승인 요청) 서류, OQC, CAPA 분석 보고서 포함, 마스터 샘플",
      "양산승인서류 고객사제출",
    ],
    actorRole: "MPSI_AND_MASS",
    actorDefault: "MPSI 및 뉴몰드",
    desc: "PPAP 서류, OQC, Capa 분석 보고서 포함 샘플 고객사 제출 및 품질 승인",
    stageGroup: "사출양산",
    url: "/portal/mass-prod/ppap",
    menuTitle: "양산외주 > 양산승인 (PPAP)",
  },
  {
    step: 13,
    name: "양산 승인/납품시작",
    bullets: [
      "고객사 양산승인서 승인 후 {massVendor} 납품시작",
      "양산 납품 관리는 SCM발주메뉴 관리",
      "SCM개발은 PM, 설변, 양산대기",
    ],
    actorRole: "MASS_AND_MPSI",
    actorDefault: "뉴몰드 및 MPSI",
    desc: "고객사 승인 후 양산 납품 개시 (납품관리는 SCM발주메뉴, 개발은 PM/설변/대기 관리)",
    stageGroup: "사출양산",
    url: "/portal/mass-prod/delivery",
    menuTitle: "양산외주 > 양산납품 및 설비관제",
  },
];

export function getStepUrl(step: number, projectNo?: string): string {
  const stepObj = PROCESS_13_STEPS.find((s) => s.step === step);
  const baseUrl = stepObj ? stepObj.url : "/portal/project";
  return projectNo ? `${baseUrl}?projectNo=${encodeURIComponent(projectNo)}` : baseUrl;
}

/**
 * 차기 프로젝트 번호 자동 채번 함수
 * 규칙: MI + 2자리 연도(YY) + 3자리 순번(001~) + 차수(P0)
 * 예: 2026년 등록 프로젝트 중 최대 번호 다음인 MI26001P0, MI26002P0 등 자동 산출
 */
export function generateNextProjectNo(existingProjects: { projectNo: string }[]): string {
  const currentYear = String(new Date().getFullYear()).slice(-2);
  const prefix = `MI${currentYear}`;
  
  const seqs: number[] = [];
  (existingProjects || []).forEach((p) => {
    if (p.projectNo && p.projectNo.toUpperCase().startsWith(prefix)) {
      const match = p.projectNo.toUpperCase().match(new RegExp(`^${prefix}(\\d{3})`));
      if (match && match[1]) {
        seqs.push(parseInt(match[1], 10));
      }
    }
  });

  const nextSeq = seqs.length > 0 ? Math.max(...seqs) + 1 : 1;
  return `${prefix}${String(nextSeq).padStart(3, "0")}P0`;
}

/**
 * 견적 단계 프로젝트 번호(Q) 자동 채번 함수
 * 규칙: Q + 2자리 연도(YY) + 3자리 순번(001~) + -01
 * 예: 2026년 등록 기준 Q26001-01, Q26002-01 등 자동 산출
 */
export function generateNextQuoteNo(existingProjects: { projectNo: string }[]): string {
  const currentYear = String(new Date().getFullYear()).slice(-2);
  const prefix = `Q${currentYear}`;
  
  const seqs: number[] = [];
  (existingProjects || []).forEach((p) => {
    if (p.projectNo && p.projectNo.toUpperCase().startsWith(prefix)) {
      const match = p.projectNo.toUpperCase().match(new RegExp(`^${prefix}(\\d{3})`));
      if (match && match[1]) {
        seqs.push(parseInt(match[1], 10));
      }
    }
  });

  const nextSeq = seqs.length > 0 ? Math.max(...seqs) + 1 : 1;
  return `${prefix}${String(nextSeq).padStart(3, "0")}-01`;
}

/**
 * 프로젝트 관리번호(MI...)로부터 견적단계 번호(Q...)를 도출하는 함수
 * 규칙: MI26001P0 -> Q26001-01, MI26002P0 -> Q26002-01
 */
export function deriveQuoteNoFromProjectNo(projectNo?: string): string {
  if (!projectNo) {
    const currentYear = String(new Date().getFullYear()).slice(-2);
    return `Q${currentYear}001-01`;
  }
  const clean = projectNo.trim();
  if (clean.toUpperCase().startsWith("Q")) {
    return clean;
  }
  // MI26001P0 / M26001P0 / MI26001
  const match = clean.match(/^MI?(\d{2})(\d{3})(?:P(\d+))?$/i);
  if (match) {
    const year = match[1];
    const seq = match[2];
    const pDegree = match[3] ? parseInt(match[3], 10) + 1 : 1;
    return `Q${year}${seq}-${String(pDegree).padStart(2, "0")}`;
  }
  const matchAnyNum = clean.match(/(\d{5})/);
  if (matchAnyNum) {
    return `Q${matchAnyNum[1]}-01`;
  }
  const currentYear = String(new Date().getFullYear()).slice(-2);
  return `Q${currentYear}001-01`;
}

/**
 * 외주업체명에서 공정/담당자 등 부가 설명을 제거하고 순수 회사명만 정제하는 함수
 * 예: "우성정공 (금형제작) (배희섭 수석)" -> "우성정공(주)"
 */
export function cleanVendorName(rawName?: string): string {
  if (!rawName) return "";
  let name = rawName.trim();
  name = name.replace(/\s*\((?:금형제작|사출양산|금형|사출|양산)[^\)]*\)/g, "").trim();
  name = name.replace(/\s*\([^\)]*(?:이사|부장|팀장|수석|과장|차장|대표|담당자)[^\)]*\)/g, "").trim();
  if (name === "우성정공") name = "우성정공(주)";
  if (name === "뉴몰드") name = "(주)뉴몰드";
  if (name === "대한금형") name = "대한금형(주)";
  if (name === "한국정밀사출") name = "(주)한국정밀사출";
  return name;
}

// 단계별 동적 담당자(외주업체명 or MPSI 자체생산팀) 추출 함수 (하드코딩 제거 & 동적 외주업체명 바인딩)
export function getStepActor(step: number, project?: ProjectItem): string {
  const moldV = project?.moldVendor || "우성정공(주)";
  const massV = project?.massVendor || "(주)뉴몰드";

  switch (step) {
    case 0:
    case 1:
    case 2:
    case 3:
    case 4:
      return "MPSI";
    case 5:
    case 6:
    case 7:
      return moldV;
    case 8:
      return `MPSI 및 ${moldV}`;
    case 9:
      return moldV;
    case 10:
      return `MPSI 승인 및 ${moldV}`;
    case 11:
      return massV;
    case 12:
      return `MPSI 및 ${massV}`;
    case 13:
      return `${massV} 및 MPSI`;
    default:
      return "MPSI";
  }
}

// 단계별 세부 불릿 텍스트 동적 치환 함수 (프로젝트의 외주업체명 변수 바인딩)
export function getStepBullets(step: number, project?: ProjectItem): string[] {
  const stepObj = PROCESS_13_STEPS.find((s) => s.step === step);
  if (!stepObj || !stepObj.bullets) return [];
  const moldV = project?.moldVendor || "우성정공(주)";
  const massV = project?.massVendor || "(주)뉴몰드";

  return stepObj.bullets.map((b) =>
    b.replace(/\{moldVendor\}/g, moldV).replace(/\{massVendor\}/g, massV)
  );
}


export function get13StepProgress(step: number, isQuotePending?: boolean): { percent: number; text: string } {
  if (isQuotePending || step <= 0) {
    return { percent: 0, text: "N/A" };
  }
  const clampedStep = Math.min(13, Math.max(1, step));
  const percent = Math.round((clampedStep / 13) * 100);
  return { percent, text: `${percent}%` };
}

// 2. 금형 및 양산 세부 공정 데이터 (외주업체 CRUD 연동)
export interface MoldProcessData {
  gunDrill: number;       // 건드릴 가공률 (0~100)
  milling: number;        // 밀링/황삭 가공률 (0~100)
  heatTreatment: number;  // 열처리 가공률 (0~100)
  cnc: number;            // CNC 정밀가공률 (0~100)
  edm: number;            // 방전/와이어 가공률 (0~100)
  polishing: number;      // 래핑/사상 가공률 (0~100)
  assembly: number;       // 금형 조립률 (0~100)
  caeReportFile?: string; // CAE 유동해석 보고서
  drNote?: string;        // 외주사 도면 수정 의견
  modifiedCadFile?: string; // 외주사 보정 3D CAD 파일
  t1Date?: string;        // 실제 T1 시사출 일자
  t1Temp?: string;        // 사출온도 (°C)
  t1Pressure?: string;    // 사출압력 (bar)
  t1CycleTime?: string;   // 사이클 타임 (sec)
  inspectionReportFile?: string; // CMM 성적서
}

export interface MassProcessData {
  continuousHours: number;   // 연속 사출 가동시간 (h)
  shotCount: number;         // 사출 타수
  producedQty: number;       // 생산 수량
  defectQty: number;         // 불량 수량
  cpk: number;               // 공정능력지수 Cpk
  ppapStatus: "미제출" | "검토중" | "승인완료" | "보완요청";
  ppapApproved: boolean;
  shipmentHistory?: { date: string; qty: number; invoiceNo: string }[];
}

// 3. 프로젝트 마스터 아이템 인터페이스 (외주업체 변수화 및 자체생산 지원)
export interface ProjectItem {
  id: number;
  projectNo: string;        // MPSI 프로젝트 번호 (고유 키 PK, 예: MI25001P1, MI26001P0, Q25001-01, Q26001-01)
  projectName: string;      // 차종 / 프로젝트명
  productName: string;      // 제품명
  customerName: string;     // 원청 고객사
  partNo?: string;          // 품번
  moldNo?: string;          // 금형번호 (예: MI25001M)
  moldDegree?: string;      // 금형차수 (예: M1, M2, M3)
  changeType?: "N001" | "E001" | "E002" | string; // 신작(N001) / 설계변경(E001, E002...)

  // 견적/수주 관리 연계 필드
  estimateNo?: string;           // 견적관리번호 (예: EST-2026-001)
  isContractConfirmed?: boolean; // 수주확정 여부 (true: 개발/양산, false: 견적진행중)
  isQuotePending?: boolean;      // 수주미성사 여부
  isPromotedFromQuote?: boolean; // 원청사 견적에서 수주 승격 여부
  isRegistrationCompleted?: boolean; // 프로젝트 생산/외주 스펙 등록 완료 여부
  quotationType?: "VENDOR_FIRST" | "MPSI_FIRST"; // 견적 유형
  quotationStatus?: string;      // 견적 진행 상태
  costEstimateDetails?: {
    moldCost?: number;
    injectionCost?: number;
    moldVendor?: string;
    massVendor?: string;
    isSpecialReview?: boolean;
  };

  // 금형 제작 방식 & 담당처 (변수화)
  moldProductionType: "OUTSOURCING" | "IN_HOUSE" | "CUSTOMER_RENTAL"; // 외주제작 vs MPSI 자체제작 vs 고객사 금형 대여
  moldVendor: string;       // 외주업체명 (우성정공, 대한금형 등) or "MPSI 자체제작팀" or "금형대여"

  // 사출 양산 방식 & 담당처 (변수화)
  massProductionType: "OUTSOURCING" | "IN_HOUSE"; // 외주양산 vs MPSI 자체사출
  massVendor: string;       // 외주업체명 (뉴몰드, 세원사출 등) or "MPSI 자체사출라인"

  cavity: string;           // 캐비티 수 (예: 1*2)
  material: string;         // 금형/제품 재질 (예: NAK80 / PP-EPDM)

  // 클라이언트 피드백 1: 견적 검토를 위한 최소한의 생산 정보
  partWeight?: number | string;      // 제품 중량 (g)
  annualVolume?: number | string;    // 연간 볼륨 (ea)
  machineTon?: number | string;      // 사출기 톤수 (ton)
  hrsSpec?: string;         // HRS 사양 (핫러너 사양)
  moldMaterial?: string;    // 금형 소재
  resinSpec?: string;       // 레진 (수지)
  warrantyShots?: number | string;   // 보증 수명 (타수)
  
  // 8대 핵심 일정 (등록 ➔ 견적 ➔ 수주 ➔ 킥오프 ➔ 금형제작일수 ➔ T1 ➔ 양산승인 ➔ 양산시작)
  registeredDate?: string;    // 1) 프로젝트 등록일
  quoteSubmitDate?: string;   // 2) 견적제출일 (MPSI가 고객사에게)
  orderDate?: string;         // 3) 수주일 (고객사가 MPSI에게 발주 확정일)
  kickoffDate?: string;       // 4) 킥오프일 (3D제품모델링확정일)
  targetMoldDays?: number | string; // 5) 목표 금형 제작 일수
  targetT1Date: string;       // 6) 목표 T1 일정
  actualT1Date?: string;      // 실제 T1 일정
  moldDeliveryDate?: string;  // 금형 출고 납기 (금형 납기 / 이관 예정일)
  targetMassDate: string;     // 7) 목표 양산 승인일 (PPAP)
  massStartDate?: string;     // 8) 목표 양산 시작일
  poDate?: string;            // 발주일 (금형/자재 외주 발주일자)
  
  // 13단계 프로세스 위치 및 동기화 상태
  currentStep: number;      // 1 ~ 13
  stepStatus: "진행중" | "완료" | "Fail(수정중)" | "지연주의";
  stepNameCustom?: string;
  trialDegree: string;      // 현재 차수 (T1, T2 ... T15)
  trialCompletionRate: number; // 금형 완성률 (%)
  
  // 설비 이벤트 상태
  facilityEvent: "양산중" | "PM중 (유지보수)" | "PM중 (정기유지보수)" | "설계변경중 (A/S)" | "가동대기";
  
  // 발주 및 납품 진척
  orderQty: number;
  deliveredQty: number;
  updatedAt: string;
  notes?: string;

  // 외주사 CRUD 세부 실적 데이터
  moldData?: MoldProcessData;
  massData?: MassProcessData;

  // Step 0~13 동적 공정 첨부파일 및 실무 메모 (KS X 9101-1 대응)
  stepAttachments?: Record<number, Array<{ name: string; size: string; date: string; ext: string; url?: string; uploader?: string }>>;
  stepMemos?: Record<number, string>;
}

// 4. 표준 초기 프로젝트 마스터 데이터 (더미 제거됨 - 100% DB 실제 데이터만 취급)
export const INITIAL_PROJECTS: ProjectItem[] = [];

// 4. 견적/수주 vs 개발/양산 판정 함수 (수주확정 프로젝트는 개발/양산, 고객 답변 대기 및 수주 미성사는 견적/수주)
export function isQuoteItem(item: ProjectItem): boolean {
  if (!item) return false;

  // 1. 이미 수주가 확정된 프로젝트(개발/양산, 설계변경 E차수 포함)는 무조건 개발/양산 관리 항목
  if (item.isContractConfirmed === true || item.quotationStatus === "수주확정" || item.estimateNo === "수주확정" || item.changeType?.startsWith("E")) {
    return false;
  }

  // 2. 수주미성사이거나 고객 답변 대기 중인 견적 프로젝트
  if (
    item.quotationStatus === "고객 답변 대기" || 
    item.quotationStatus === "수주 미성사" || 
    item.quotationStatus === "수주미성사"
  ) return true;

  if (
    item.stepNameCustom === "고객 답변 대기" || 
    item.stepNameCustom === "수주 미성사" || 
    item.stepNameCustom === "수주미성사"
  ) return true;

  if (item.isQuotePending === true) return true;
  if (item.isContractConfirmed === false) return true;

  // 3. 프로젝트 번호가 Q로 시작하거나 0단계(신규 견적 단계)
  if (item.projectNo && item.projectNo.toUpperCase().startsWith("Q")) return true;
  if (item.currentStep === 0 && !item.changeType?.startsWith("E")) return true;

  return false;
}

export function isDevItem(item: ProjectItem): boolean {
  return !isQuoteItem(item);
}

const STORAGE_KEY = "mpsi_project_master_list_v19";
const EVENT_NAME = "mpsi_project_master_change";

// 5. 로컬스토리지 헬퍼 함수 (더미 데이터 주입 완전 제거)
export function getStoredProjects(): ProjectItem[] {
  if (typeof window === "undefined") return [];
  try {
    localStorage.removeItem("mpsi_project_master_list_v18");
    localStorage.removeItem("mpsi_project_master_list_v17");
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    let parsed: ProjectItem[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // 금형 시사출/이관 상태(mold-trial)와 ProjectMaster 단계(0~13단계) 자동 동기화
    try {
      const trialRaw = localStorage.getItem("mpsi_mold_trials_v4");
      if (trialRaw) {
        const trials = JSON.parse(trialRaw);
        if (Array.isArray(trials)) {
          let hasChange = false;
          parsed = parsed.map((p) => {
            const matchedTrial = trials.find((t: any) => t.projectNo === p.projectNo);
            if (!matchedTrial) return p;

            const allDocsVerified = matchedTrial.finalDocuments?.every((d: any) => Boolean(d.fileName) && d.isVerified);
            const isApproved = matchedTrial.isMoldApproved || allDocsVerified || matchedTrial.currentTrial === "금형 승인";
            const hasActualTransfer = Boolean(matchedTrial.transferActualDate);

            // 금형 5대 서류 승인 및 이관 완료 상태인 경우 0~13단계 동기화
            if (isApproved) {
              const targetStep = hasActualTransfer ? 11 : 10;
              const targetStatus = hasActualTransfer ? "진행중" : "완료";
              if (p.currentStep < targetStep || (p.currentStep === 10 && hasActualTransfer)) {
                hasChange = true;
                return {
                  ...p,
                  currentStep: targetStep,
                  stepStatus: targetStatus as any,
                  trialCompletionRate: 100,
                  notes: hasActualTransfer 
                    ? `[우성정공(주) -> ${matchedTrial.massVendor || "(주)뉴몰드"}] 금형 이관 완료(${matchedTrial.transferActualDate}), Step 11(양산승인 사출/시양산) 진행중`
                    : `[우성정공(주)] 금형 5대 승인서류 검증 완료 및 금형 이관 승인(Step 10 완료)`,
                };
              }
            }
            return p;
          });

          if (hasChange) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          }
        }
      }
    } catch (e) {}

    // 양산성 검증 상태(mass-validation)와 ProjectMaster 단계(Step 12: 양산품질 검증 PPAP) 자동 동기화
    try {
      const valRaw = localStorage.getItem("mpsi_mass_validations_v4") || localStorage.getItem("mpsi_mass_validation_store_v1");
      if (valRaw) {
        const valProjects = JSON.parse(valRaw);
        if (Array.isArray(valProjects)) {
          let hasChange = false;
          parsed = parsed.map((p) => {
            const matchedVal = valProjects.find((v: any) => v.projectNo === p.projectNo);
            if (!matchedVal) return p;

            const isValApproved =
              matchedVal.overallStatus === "검증완료" ||
              matchedVal.trials?.some((tr: any) => tr.status === "양산승인(내부)");

            if (isValApproved) {
              if (p.currentStep < 12) {
                hasChange = true;
                return {
                  ...p,
                  currentStep: 12,
                  stepStatus: "진행중" as any,
                  notes: `[MPSI 품질팀] 6대 보고서 및 Cpk 검증 적합 판정 완료 -> Step 12(양산품질 검증 PPAP) 진행중`,
                };
              }
            }
            return p;
          });

          if (hasChange) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          }
        }
      }
    } catch (e) {}

    // PPAP 양산 승인 상태(mass-ppap)와 ProjectMaster 단계(Step 13: 양산 승인/납품시작) 자동 동기화
    try {
      const ppapRaw = localStorage.getItem("mpsi_mass_ppap_store_v5") || localStorage.getItem("mpsi_mass_ppap_store_v4");
      if (ppapRaw) {
        const ppapProjects = JSON.parse(ppapRaw);
        if (Array.isArray(ppapProjects)) {
          let hasChange = false;
          parsed = parsed.map((p) => {
            const matchedPpap = ppapProjects.find((pp: any) => pp.projectNo === p.projectNo);
            if (!matchedPpap) return p;

            const isPpapApproved =
              matchedPpap.ppapStatus === "승인완료" ||
              matchedPpap.ppapStatus === "양산 승인 (Pass)" ||
              matchedPpap.packageSubmissions?.some((sub: any) => sub.reviewStatus === "승인");

            if (isPpapApproved) {
              if (p.currentStep < 13) {
                hasChange = true;
                return {
                  ...p,
                  currentStep: 13,
                  stepStatus: "완료" as any,
                  notes: `[MPSI 전결] PPAP 양산승인 완료(PO: ${matchedPpap.partPoNo || "발행완료"}) -> Step 13(양산 납품시작) 승인`,
                };
              }
            }
            return p;
          });

          if (hasChange) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          }
        }
      }
    } catch (e) {}

    // [핵심] 견적 단계 번호(Q) 데이터 자동 보정: 신작(N001 등) 프로젝트의 견적번호가 MI...이거나 누락된 경우 실제 Q 채번값으로 보정
    try {
      let hasEstimateNoChange = false;
      parsed = parsed.map((p) => {
        let modified = false;
        let newEstimateNo = p.estimateNo;
        let newMoldVendor = p.moldVendor;
        let newMassVendor = p.massVendor;

        if (!p.changeType?.startsWith("E")) {
          // 신작 건인데 estimateNo가 비어있거나 MI로 시작하는 경우 Q로 변환
          if (!p.estimateNo || p.estimateNo.trim().toUpperCase().startsWith("MI")) {
            newEstimateNo = deriveQuoteNoFromProjectNo(p.projectNo);
            modified = true;
          }
        }

        // 회사명만 깔끔하게 나오도록 외주업체명 정제
        if (p.moldVendor && (p.moldVendor.includes("(") || p.moldVendor === "우성정공" || p.moldVendor === "대한금형")) {
          const cleanedM = cleanVendorName(p.moldVendor);
          if (cleanedM !== p.moldVendor) {
            newMoldVendor = cleanedM;
            modified = true;
          }
        }
        if (p.massVendor && (p.massVendor.includes("(") || p.massVendor === "뉴몰드" || p.massVendor === "한국정밀사출")) {
          const cleanedS = cleanVendorName(p.massVendor);
          if (cleanedS !== p.massVendor) {
            newMassVendor = cleanedS;
            modified = true;
          }
        }

        // [요구사항] 금형번호 자동 보정: 프로젝트 관리번호(예: MI26001P0)에서 'P' 이전까지만 추출 -> MI26001
        let newMoldNo = p.moldNo;
        if (p.projectNo) {
          const pIdx = p.projectNo.toUpperCase().indexOf("P");
          if (pIdx > 0) {
            const expectedMoldNo = p.projectNo.substring(0, pIdx);
            if (!newMoldNo || newMoldNo.includes("P") || newMoldNo.endsWith("M") || newMoldNo !== expectedMoldNo) {
              newMoldNo = expectedMoldNo;
              modified = true;
            }
          }
        }

        // [요구사항] 품번 자동 보정: 비어있거나 누락된 경우 제품명에 따라 기초정보 품번 자동 매칭
        let newPartNo = p.partNo;
        if (!newPartNo && p.productName) {
          if (p.productName.includes("Front Door")) newPartNo = "84710-NT500-LH";
          else if (p.productName.includes("Rear Pillar")) newPartNo = "85840-NQ500";
          else if (p.productName.includes("BMS") || p.productName.includes("Battery Case")) newPartNo = "37510-SPX00-BM";
          else if (p.productName.includes("Battery Pack")) newPartNo = "37500-EV04-L";
          else if (p.productName.includes("Armrest")) newPartNo = "82710-AA000";
          else if (p.productName.includes("Console")) newPartNo = "84740-A2XT0-MB";
          else if (p.productName.includes("Grille")) newPartNo = "86510-K7000";
          else if (p.productName.includes("Crash Pad")) newPartNo = "84611-L0000";
          if (newPartNo) modified = true;
        }

        if (modified) {
          hasEstimateNoChange = true;
          return {
            ...p,
            estimateNo: newEstimateNo,
            moldVendor: newMoldVendor,
            massVendor: newMassVendor,
            moldNo: newMoldNo,
            partNo: newPartNo,
          };
        }
        return p;
      });

      if (hasEstimateNoChange) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
    } catch (e) {}

    return parsed;
  } catch (e) {
    console.error("Failed to read projects from storage", e);
    return [];
  }
}

export function saveProjectsToStorage(projects: ProjectItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: projects }));
  } catch (e) {
    console.error("Failed to save projects to storage", e);
  }
}

// 6. 공정별 상태 갱신 함수 (외주업체 화면 & MPSI 화면 모두 호출 가능, 복합키 changeType 지원)
export function updateProjectProcess(
  projectNo: string,
  updates: Partial<ProjectItem>,
  changeType?: string
): ProjectItem[] {
  const current = getStoredProjects();
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const updated = current.map((p) => {
    // changeType이 주어진 경우 프로젝트번호와 차수코드가 동시에 일치해야 함 (복합키 충돌 방지)
    if (changeType && p.changeType && p.changeType !== changeType) {
      return p;
    }
    const isTarget = 
      p.projectNo === projectNo || 
      p.estimateNo === projectNo ||
      (p.projectNo && projectNo && p.projectNo.toLowerCase() === projectNo.toLowerCase()) ||
      (p.estimateNo && projectNo && p.estimateNo.toLowerCase() === projectNo.toLowerCase());

    if (!isTarget) return p;
    return {
      ...p,
      ...updates,
      updatedAt: dateStr,
    };
  });

  saveProjectsToStorage(updated);
  return updated;
}

// 6-1. 고유 ID 기반 프로젝트 상태 갱신 함수 (완전 격리 보장)
export function updateProjectById(
  id: number,
  updates: Partial<ProjectItem>
): ProjectItem[] {
  const current = getStoredProjects();
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const updated = current.map((p) => {
    if (p.id !== id) return p;
    return {
      ...p,
      ...updates,
      updatedAt: dateStr,
    };
  });

  saveProjectsToStorage(updated);
  return updated;
}

// 6-2. 공정 단계별 동적 첨부파일 추가 함수 (DB MpsiProjectStepAttachment 연동)
export function addStepAttachment(
  idOrNo: number | string,
  step: number,
  attachment: { name: string; size: string; date: string; ext: string; url?: string; uploader?: string }
): ProjectItem[] {
  const current = getStoredProjects();
  const targetItem = current.find(p => typeof idOrNo === "number" ? p.id === idOrNo : p.projectNo === idOrNo || p.estimateNo === idOrNo);
  const projectNo = targetItem?.projectNo || String(idOrNo);

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const updated = current.map((p) => {
    const isTarget = typeof idOrNo === "number" 
      ? p.id === idOrNo 
      : p.projectNo === idOrNo || p.estimateNo === idOrNo;
    if (!isTarget) return p;

    const existingMap = p.stepAttachments || {};
    const existingList = existingMap[step] || [];
    return {
      ...p,
      stepAttachments: {
        ...existingMap,
        [step]: [...existingList, attachment],
      },
      updatedAt: dateStr,
    };
  });

  saveProjectsToStorage(updated);

  // DB MpsiProjectStepAttachment 테이블에 실시간 저장
  if (typeof window !== "undefined") {
    fetch("/api/v1/projects/attachments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectNo,
        step,
        name: attachment.name,
        size: attachment.size,
        url: attachment.url,
        uploader: attachment.uploader,
      }),
    }).catch(err => console.error("Failed to sync step attachment to DB:", err));
  }

  return updated;
}

// 6-3. 공정 단계별 동적 첨부파일 삭제 함수 (DB 삭제 연동)
export function deleteStepAttachment(
  idOrNo: number | string,
  step: number,
  fileName: string
): ProjectItem[] {
  const current = getStoredProjects();
  const targetItem = current.find(p => typeof idOrNo === "number" ? p.id === idOrNo : p.projectNo === idOrNo || p.estimateNo === idOrNo);
  const projectNo = targetItem?.projectNo || String(idOrNo);

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const updated = current.map((p) => {
    const isTarget = typeof idOrNo === "number" 
      ? p.id === idOrNo 
      : p.projectNo === idOrNo || p.estimateNo === idOrNo;
    if (!isTarget) return p;

    const existingMap = p.stepAttachments || {};
    const existingList = existingMap[step] || [];
    return {
      ...p,
      stepAttachments: {
        ...existingMap,
        [step]: existingList.filter((f) => f.name !== fileName),
      },
      updatedAt: dateStr,
    };
  });

  saveProjectsToStorage(updated);

  // DB MpsiProjectStepAttachment 테이블에서 삭제
  if (typeof window !== "undefined") {
    fetch(`/api/v1/projects/attachments?projectNo=${encodeURIComponent(projectNo)}&step=${step}&fileName=${encodeURIComponent(fileName)}`, {
      method: "DELETE",
    }).catch(err => console.error("Failed to delete step attachment from DB:", err));
  }

  return updated;
}

// 6-4. 공정 단계별 실무 메모 갱신 함수 (DB MpsiProjectStepMemo 연동)
export function updateStepMemo(
  idOrNo: number | string,
  step: number,
  memo: string
): ProjectItem[] {
  const current = getStoredProjects();
  const targetItem = current.find(p => typeof idOrNo === "number" ? p.id === idOrNo : p.projectNo === idOrNo || p.estimateNo === idOrNo);
  const projectNo = targetItem?.projectNo || String(idOrNo);

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const updated = current.map((p) => {
    const isTarget = typeof idOrNo === "number" 
      ? p.id === idOrNo 
      : p.projectNo === idOrNo || p.estimateNo === idOrNo;
    if (!isTarget) return p;

    const existingMap = p.stepMemos || {};
    return {
      ...p,
      stepMemos: {
        ...existingMap,
        [step]: memo,
      },
      updatedAt: dateStr,
    };
  });

  saveProjectsToStorage(updated);

  // DB MpsiProjectStepMemo 테이블에 실시간 저장
  if (typeof window !== "undefined") {
    fetch("/api/v1/projects/memos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectNo,
        step,
        memo,
      }),
    }).catch(err => console.error("Failed to sync step memo to DB:", err));
  }

  return updated;
}

// 6-5. 프로젝트 단일/복수 삭제 함수 (DB 연동)
export function deleteProjectFromStorage(idOrNo: number | string): ProjectItem[] {
  const current = getStoredProjects();
  const target = current.find((p) => (typeof idOrNo === "number" ? p.id === idOrNo : p.projectNo === idOrNo || p.estimateNo === idOrNo));
  const updated = current.filter((p) => {
    return typeof idOrNo === "number"
      ? p.id !== idOrNo
      : p.projectNo !== idOrNo && p.estimateNo !== idOrNo;
  });

  saveProjectsToStorage(updated);

  if (target?.projectNo) {
    const queryParams = new URLSearchParams({
      projectNo: target.projectNo,
      ...(typeof idOrNo === "number" ? { id: String(target.id) } : {}),
      ...(target.changeType ? { changeType: target.changeType } : {}),
    });
    fetch(`/api/v1/projects?${queryParams.toString()}`, {
      method: "DELETE",
    }).catch((err) => console.error("Project DB delete error:", err));
  }

  return updated;
}

// 7. React 전역 동기화 커스텀 훅
export function useProjectMaster() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. 임시로 저장소 데이터 표시
    setProjects(getStoredProjects());

    // 2. DB로부터 최신 프로젝트 목록 실시간 로드 및 동기화
    fetch("/api/v1/projects")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          saveProjectsToStorage(json.data);
          setProjects(json.data);
        }
      })
      .catch((err) => console.error("Project DB fetch error:", err))
      .finally(() => setIsLoading(false));

    const handleUpdate = () => {
      setProjects(getStoredProjects());
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // 신규 등록
  const addProject = (newItem: Omit<ProjectItem, "id">) => {
    const current = getStoredProjects();
    const id = current.length > 0 ? Math.max(...current.map((c) => c.id)) + 1 : 1;
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const project: ProjectItem = {
      ...newItem,
      id,
      updatedAt: dateStr,
    };

    const nextList = [project, ...current];
    saveProjectsToStorage(nextList);
    setProjects(nextList);

    // DB에 비동기 영구 저장 및 DB Sequence ID 동기화
    fetch("/api/v1/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && json?.data?.id && json.data.id !== id) {
          const latest = getStoredProjects().map((item) =>
            item.id === id ? { ...item, id: json.data.id } : item
          );
          saveProjectsToStorage(latest);
          setProjects(latest);
        }
      })
      .catch((err) => console.error("Project DB insert error:", err));

    return project;
  };

  // 공정 단계 및 실적 업데이트 (DB ProjectMaster 및 MpsiProjectStage 동시 동기화)
  const updateStep = (projectNo: string, updates: Partial<ProjectItem>) => {
    const updated = updateProjectProcess(projectNo, updates);
    setProjects(updated);

    // 1. ProjectMaster DB 영구 갱신
    fetch("/api/v1/projects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectNo, ...updates }),
    }).catch((err) => console.error("Project DB update error:", err));

    // 2. MpsiProjectStage DB 단계별 공정 상태 동기화
    if (updates.currentStep !== undefined || updates.stepStatus !== undefined) {
      const target = updated.find(p => p.projectNo === projectNo || p.estimateNo === projectNo);
      const step = updates.currentStep !== undefined ? updates.currentStep : target?.currentStep;
      if (step !== undefined) {
        fetch("/api/v1/projects/stages", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectNo,
            step,
            stepName: updates.stepNameCustom || target?.stepNameCustom,
            stepStatus: updates.stepStatus || target?.stepStatus,
            completionRate: updates.trialCompletionRate || target?.trialCompletionRate,
          }),
        }).catch((err) => console.error("Project Stage DB sync error:", err));
      }
    }
  };

  // 견적 건 -> 공식 프로젝트 승격 (수주확정 시 Step 1 전환 및 정식 관리번호 부여)
  const convertQuoteToOfficial = (estimateNo: string, officialProjectNo: string, officialMoldNo?: string) => {
    const current = getStoredProjects();
    const updated = current.map(p => {
      if (p.estimateNo === estimateNo || p.projectNo === estimateNo) {
        const origEstimateNo = (p.estimateNo && p.estimateNo.toUpperCase().startsWith("Q"))
          ? p.estimateNo
          : (estimateNo && estimateNo.toUpperCase().startsWith("Q")
              ? estimateNo
              : deriveQuoteNoFromProjectNo(officialProjectNo));
        return {
          ...p,
          projectNo: officialProjectNo,
          moldNo: officialMoldNo || (p.moldNo && p.moldNo !== "N/A" ? p.moldNo : `${officialProjectNo}M`),
          isContractConfirmed: true,
          isQuotePending: false,
          currentStep: 1, // 수주 확정 시 1단계(제품 data 접수 / 도면 접수)로 공식 착수
          stepStatus: "진행중" as const,
          quotationStatus: "수주확정",
          stepNameCustom: undefined,
          estimateNo: origEstimateNo, // 최초 견적 번호(Q) 영구 보존
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        };
      }
      return p;
    });
    saveProjectsToStorage(updated);
    setProjects(updated);
  };

  // 설계변경(E채번) 발의 및 상태 전환 함수 (MPSI 프로젝트 관리 주체)
  const triggerProjectRevision = (
    projectNo: string,
    reason: string = "도면 변경 및 단가 변동 조정",
    author: string = "MPSI 기술관리부"
  ) => {
    const current = getStoredProjects();
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const dateSimple = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`.slice(2);

    let generatedCode = "E001";

    const updated = current.map((p) => {
      if (p.projectNo !== projectNo) return p;

      // 차수 자동 채번 (N001 -> E001, E001 -> E002, E002 -> E003 ...)
      if (p.changeType && p.changeType.startsWith("E")) {
        const num = parseInt(p.changeType.replace("E", ""), 10) || 1;
        generatedCode = `E${String(num + 1).padStart(3, "0")}`;
      } else {
        generatedCode = "E001";
      }

      const isSelfMold = p.moldProductionType === "IN_HOUSE";
      const isSelfMass = p.massProductionType === "IN_HOUSE";
      const moldTargetName = isSelfMold ? "MPSI 사내 금형제작팀" : p.moldVendor;
      const massTargetName = isSelfMass ? "MPSI 사내 사출라인" : p.massVendor;

      return {
        ...p,
        changeType: generatedCode,
        currentStep: 0, // 0단계(견적/수주)로 리셋되어 기존 지정처로부터 설변 견적 접수 재개
        stepStatus: "진행중" as const,
        stepNameCustom: `설변 견적 접수 (${generatedCode})`,
        facilityEvent: "설계변경중 (A/S)" as const,
        notes: `${p.notes ? p.notes + "\n" : ""}[${dateSimple}_설계변경 발의 (${generatedCode})]: ${reason} (지정 금형처: ${moldTargetName}, 지정 양산처: ${massTargetName} 설변 견적 접수 착수)`,
        updatedAt: dateStr,
      };
    });

    saveProjectsToStorage(updated);
    setProjects(updated);

    // PM/설변 관리 스토리지(mpsi_pm_revision_store_v1)에도 동기화 반영
    if (typeof window !== "undefined") {
      try {
        const PM_STORAGE_KEY = "mpsi_pm_revision_store_v1";
        const SYNC_EVENT_NAME = "mpsi_pm_revision_updated";
        const rawPm = localStorage.getItem(PM_STORAGE_KEY);
        if (rawPm) {
          const pmList = JSON.parse(rawPm);
          const foundPmIdx = pmList.findIndex((item: { projectNo: string }) => item.projectNo === projectNo);
          const nowDash = dateStr.split(" ")[0];
          const newHistory = {
            revisionCode: generatedCode,
            revisionDate: nowDash,
            title: `${generatedCode === "E001" ? "1차" : "차기"} 설계변경 (${generatedCode}) - ${reason}`,
            modelReview: "설계변경 3D 모델링 접수 및 금형 구현성 검토 진행 중",
            moldCostQuote: "기존 지정처 설변 금형 수정비 및 사출 단가 변동 견적 접수 중 (타사 배포 생략)",
            moldTrialReport: "금형 수정 후 시사출 진행 예정",
            massValidationReport: "금형 이관 후 시양산 및 재양산 승인 진행 예정",
            author,
            memo: reason,
            createdAt: dateStr
          };

          const newMemo = {
            id: `rm-${Date.now()}`,
            author: `${author} 발의`,
            content: `${dateSimple}_MPSI 본사 설계변경(${generatedCode}) 발의 접수: ${reason}`,
            createdAt: `${dateStr} 입력`
          };

          if (foundPmIdx >= 0) {
            pmList[foundPmIdx] = {
              ...pmList[foundPmIdx],
              revisionCode: generatedCode,
              currentState: "설변 중",
              quotationKind: "(금형견적, 사출견적)",
              progressProcess: "가공 중",
              revisionMemos: [newMemo, ...(pmList[foundPmIdx].revisionMemos || [])],
              historyList: [...(pmList[foundPmIdx].historyList || []), newHistory],
              updatedAt: dateStr,
            };
          }
          localStorage.setItem(PM_STORAGE_KEY, JSON.stringify(pmList));
          window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME));
        }
      } catch (err) {
        console.error("Failed to sync PM revision store on revision trigger:", err);
      }
    }

    return generatedCode;
  };

  return {
    projects,
    addProject,
    updateStep,
    updateProjectById: (id: number, updates: Partial<ProjectItem>) => {
      const updated = updateProjectById(id, updates);
      setProjects(updated);
      const target = updated.find((p) => p.id === id);
      if (target?.projectNo) {
        fetch("/api/v1/projects", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...target, ...updates, projectNo: target.projectNo }),
        }).catch((err) => console.error("Project DB update error:", err));
      }
    },
    addStepAttachment: (idOrNo: number | string, step: number, attachment: { name: string; size: string; date: string; ext: string; url?: string; uploader?: string }) => {
      const updated = addStepAttachment(idOrNo, step, attachment);
      setProjects(updated);
    },
    deleteStepAttachment: (idOrNo: number | string, step: number, fileName: string) => {
      const updated = deleteStepAttachment(idOrNo, step, fileName);
      setProjects(updated);
    },
    updateStepMemo: (idOrNo: number | string, step: number, memo: string) => {
      const updated = updateStepMemo(idOrNo, step, memo);
      setProjects(updated);
    },
    deleteProject: (idOrNo: number | string) => {
      const updated = deleteProjectFromStorage(idOrNo);
      setProjects(updated);
      return updated;
    },
    convertQuoteToOfficial,
    triggerProjectRevision,
    isLoading,
    refresh: () => setProjects(getStoredProjects()),
  };
}

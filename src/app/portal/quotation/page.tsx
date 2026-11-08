"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, RefreshCw, Plus, Eye, 
  CheckCircle2, AlertCircle, 
  Building2, Send, Download, X, Upload,
  Paperclip, FileSpreadsheet, Trash2,
  Calendar, Package, Sparkles,
  ArrowRight, Check, User, Clock,
  DollarSign, FileText, Phone, Mail, Edit3, MessageSquare,
  Layers, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangeFilter, isWithinDateRange, DatePresetType } from "@/components/common/date-range-filter";
import { useProjectMaster } from "@/lib/project-store";

// 1. 원청사 견적 진행 상태
export type PrimeQuotationStatus = 
  | "견적요청접수"
  | "견적서작성중"
  | "고객사제출완료"
  | "원청사협의중"
  | "고객 답변 대기"
  | "수주확정"
  | "실주/미체결";

// 2. 패밀리 금형(Family Mold, LH/RH) 등 복수 부품 단가 인터페이스
export interface QuotationPartPriceItem {
  id: string;
  side: "LH" | "RH" | "공용" | "기타"; // 구분
  partName: string;                   // 품목명 (예: Front Door Upper LH)
  partNo?: string;                     // 품번 (예: 82301-NT500)
  unitPriceWon: number;                // 개당 사출 단가 (원)
}

// 3. 견적제출파일 다중 업로드 및 버전/네고 이력 인터페이스
export interface QuotationFileHistoryItem {
  id: string;
  version: number;             // Rev 1, Rev 2 ...
  label: string;               // "최초 제출 견적" | "구매팀 네고 최종 견적" | "설변 반영 견적" 등
  fileName: string;
  fileSize: string;
  uploadedAt: string;          // 등록일시 (YYYY-MM-DD)
  author: string;              // 등록자
  changeReason?: string;       // 파일 교체/수정 사유 (예: "원청 구매팀 CR 2.5% 네고 합의 반영")
  fileUrl?: string;            // 서버 저장 파일 URL (예: /uploads/...)
  downloadUrl?: string;        // 다운로드 전용 스트리밍 API URL
}

// 4. 협의 및 검토 메모 인터페이스 (MPSI 내부 및 고객사 협의 기록)
export interface QuotationMemoItem {
  id: string;
  author: string;          // 작성회사 (예: "MPSI")
  content: string;         // 메모 내용
  createdAt: string;       // 작성일시
}

// 5. 원청사 견적 데이터 인터페이스
export interface PrimeQuotationItem {
  id: number;
  quotationNo: string;        // 견적번호 (프로젝트 관리번호와 1:1 동일, 예: Q26001-01)
  officialProjectNo?: string; // 수주 확정 시 승격된 정식 프로젝트 관리번호 (예: MI26001P0)
  customerName: string;       // 원청사(고객사명)
  customerDept: string;       // 원청사 담당부서 (예: 구매관리부, 의장설계팀)
  customerManager: string;    // 원청사 담당자명
  customerContact: string;    // 원청사 연락처
  customerEmail: string;      // 원청사 이메일
  
  projectNo: string;          // MPSI 관리번호 (견적 단계에서는 quotationNo와 동일)
  projectName: string;        // 차종 / 프로젝트명
  productName: string;        // 제품명
  productionVolume: string;   // 예상 양산 수량 (예: 연 120,000대)
  
  // 견적 금액
  moldEstimateWon: number;    // 금형 견적가 (원) [일회성 투자비]
  partUnitPriceWon?: number;  // 대표 개당 부품 견적가 (원)
  partPriceItems: QuotationPartPriceItem[]; // [신설] 패밀리 금형(LH/RH) 등 복수 부품 단가 리스트
  totalEstimateWon?: number;  // 합산 사용 안 함 (호환용 필드)
  
  // 일정
  submissionDeadline: string; // 제출 마감일
  submittedDate: string;      // 실제 제출일자
  
  // [개편] 견적제출파일 (다중 파일 및 네고 교체 이력 보존)
  quotationFiles: QuotationFileHistoryItem[];
  
  // 하위 호환 필드 (단일 파일 참조용)
  quotationFileName?: string;
  quotationFileSize?: string;
  quotationFileDate?: string;
  quotationFileUrl?: string;
  quotationDownloadUrl?: string;
  
  status: PrimeQuotationStatus; // 진행 상태
  mpsiAuthor: string;         // MPSI 영업/견적 담당자
  notes: string;              // 특약조건 및 특이사항 요약
  memos: QuotationMemoItem[]; // 협의 및 검토 메모 이력
}

// 원청사(고객사) 표준 선택지
const CUSTOMER_OPTIONS = [
  "현대자동차 (남양연구소)",
  "현대자동차 (광주공장)",
  "기아자동차 (화성공장)",
  "현대모비스",
  "삼성전자 VD사업부",
  "LG전자 VS사업본부",
  "SPX 플라스틱",
  "HL 만도",
  "서연이화",
  "덕양산업",
];

// 초기 원청사 견적 샘플 데이터
const initialPrimeQuotations: PrimeQuotationItem[] = [
  {
    id: 1,
    quotationNo: "Q26001-01", // 견적번호 = 프로젝트 관리번호와 동일
    officialProjectNo: "MI26001P0", // 수주 확정으로 정식 프로젝트 번호 승격 완료 (상호 추적성)
    customerName: "현대자동차 (남양연구소)",
    customerDept: "바디의장개발팀",
    customerManager: "김남양 책임연구원",
    customerContact: "031-260-1234",
    customerEmail: "ny.kim@hyundai.com",
    projectNo: "Q26001-01",
    projectName: "현대 NT5 도어 트림 모듈",
    productName: "Front Door Upper Cover LH/RH",
    productionVolume: "연간 150,000대 (월 12,500대)",
    moldEstimateWon: 96000000,
    partUnitPriceWon: 2000,
    // [요청 3] 패밀리 금형(Family Mold): LH와 RH의 형상/단가 분리 적용
    partPriceItems: [
      { id: "p-1", side: "LH", partName: "Front Door Upper LH", partNo: "82301-NT500", unitPriceWon: 2050 },
      { id: "p-2", side: "RH", partName: "Front Door Upper RH", partNo: "82302-NT500", unitPriceWon: 1950 },
    ],
    totalEstimateWon: 0,
    submissionDeadline: "2026-02-25",
    submittedDate: "2026-02-24",
    // [요청 4] 견적제출파일 다중 업로드 및 버전/네고 교체 이력 보존
    quotationFiles: [
      {
        id: "f-1",
        version: 1,
        label: "최초 제출 견적",
        fileName: "[1차제출]MPSI_현대차_NT5_도어커버_최초견적서.xlsx",
        fileSize: "3.2 MB",
        uploadedAt: "2026-02-15",
        author: "MPSI",
        changeReason: "원청사 RFQ 접수 후 1차 공식 견적 제출 (금형 1억, 부품단가 2,100원 기준)",
      },
      {
        id: "f-2",
        version: 2,
        label: "구매팀 네고 최종 견적",
        fileName: "[네고최종]MPSI_현대차_NT5_구매팀합의견적서_Rev02.xlsx",
        fileSize: "3.4 MB",
        uploadedAt: "2026-02-24",
        author: "MPSI",
        changeReason: "현대차 구매팀 2차 CR 네고 협의 반영 (금형 9,600만, 부품단가 LH 2,050원 / RH 1,950원 합의 수주)",
      },
    ],
    quotationFileName: "[네고최종]MPSI_현대차_NT5_구매팀합의견적서_Rev02.xlsx",
    quotationFileSize: "3.4 MB",
    quotationFileDate: "2026-02-24",
    status: "수주확정",
    mpsiAuthor: "MPSI",
    notes: "T1 목표 3/25 일정 보장 조건부 수주 확정 완료. 본사 직접 납품 계약 체결 (MI26001P0 승격)",
    memos: [
      {
        id: "m-1",
        author: "MPSI",
        content: "2/20 남양연구소 방문 기술미팅 진행. 코어 NAK80 적용 및 2Cavity 사출성형 조건 확정.",
        createdAt: "2026-02-20 16:30"
      },
      {
        id: "m-2",
        author: "MPSI",
        content: "구매팀 네고 거쳐 금형비 9,600만원, 부품단가 LH 2,050원 / RH 1,950원으로 최종 LOI(수주의향서) 접수 완료. 정식 프로젝트(MI26001P0)로 승격.",
        createdAt: "2026-02-24 11:20"
      }
    ]
  },
  {
    id: 2,
    quotationNo: "Q26002-01",
    officialProjectNo: "MI26002P0",
    customerName: "현대모비스",
    customerDept: "인테리어모듈 구매팀",
    customerManager: "현대모비스 담당",
    customerContact: "02-2018-5678",
    customerEmail: "mobis_park@mobis.co.kr",
    projectNo: "Q26002-01",
    projectName: "기아 A2XT 센터페시아 콘솔",
    productName: "Console Upper Bezel Assembly",
    productionVolume: "연간 80,000대",
    moldEstimateWon: 45000000,
    partUnitPriceWon: 4450,
    partPriceItems: [
      { id: "p-3", side: "공용", partName: "Console Upper Bezel Main", partNo: "84611-A2000", unitPriceWon: 4450 },
    ],
    totalEstimateWon: 0,
    submissionDeadline: "2026-03-05",
    submittedDate: "2026-03-03",
    quotationFiles: [
      {
        id: "f-3",
        version: 1,
        label: "최초 제출 견적",
        fileName: "[MPSI제출]A2XT_센터콘솔_공식견적서.pdf",
        fileSize: "2.8 MB",
        uploadedAt: "2026-03-03",
        author: "MPSI",
        changeReason: "외관 하이그로시 사양으로 래핑 경면 가공비 포함 1차 공식 견적 제출",
      },
    ],
    quotationFileName: "[MPSI제출]A2XT_센터콘솔_공식견적서.pdf",
    quotationFileSize: "2.8 MB",
    quotationFileDate: "2026-03-03",
    status: "원청사협의중",
    mpsiAuthor: "MPSI",
    notes: "외관 하이그로시 사양으로 래핑 경면 가공비 포함 제출. 부품단가 3% 네고 요청 접수",
    memos: [
      {
        id: "m-3",
        author: "MPSI",
        content: "모비스 구매팀에서 부품 단가 4,450원에서 4,300원으로 조정 요청함. 원재료 로스율 협의 예정.",
        createdAt: "2026-03-04 14:00"
      }
    ]
  },
  {
    id: 3,
    quotationNo: "Q26003-01",
    customerName: "현대자동차 (남양연구소)",
    customerDept: "전동화패키지개발팀",
    customerManager: "최전동 파트장",
    customerContact: "031-260-9988",
    customerEmail: "ev_choi@hyundai.com",
    projectNo: "Q26003-01",
    projectName: "제네시스 EV 배터리팩 부품",
    productName: "Battery Lower Tray Support",
    productionVolume: "연간 100,000대",
    moldEstimateWon: 110000000,
    partUnitPriceWon: 2600,
    partPriceItems: [
      { id: "p-4", side: "공용", partName: "Battery Lower Tray Support", partNo: "37513-EV040", unitPriceWon: 2600 },
    ],
    totalEstimateWon: 0,
    submissionDeadline: "2026-03-15",
    submittedDate: "2026-03-05",
    quotationFiles: [
      {
        id: "f-4",
        version: 1,
        label: "최초 제출 견적",
        fileName: "HM_EV04_배터리트레이_MPSI견적제출본.xlsx",
        fileSize: "4.1 MB",
        uploadedAt: "2026-03-05",
        author: "MPSI",
        changeReason: "PBT-GF30 고난연 수지 적용 사양 전자구매시스템(VAATZ) 공식 견적서 업로드 완료",
      },
    ],
    quotationFileName: "HM_EV04_배터리트레이_MPSI견적제출본.xlsx",
    quotationFileSize: "4.1 MB",
    quotationFileDate: "2026-03-05",
    status: "고객 답변 대기",
    mpsiAuthor: "MPSI",
    notes: "PBT-GF30 고난연 수지 적용 사양. 견적서 제출 완료 후 원청 심사 및 고객 답변 대기 중",
    memos: [
      {
        id: "m-4",
        author: "MPSI",
        content: "현대차 전자구매시스템(VAATZ) 공식 견적서 업로드 완료. 고객사 의사결정 및 답변 대기 중.",
        createdAt: "2026-03-05 17:15"
      }
    ]
  },
  {
    id: 4,
    quotationNo: "Q26004-01",
    officialProjectNo: "MI26003P0",
    customerName: "SPX 플라스틱",
    customerDept: "기구개발1그룹",
    customerManager: "SPX 플라스틱 담당",
    customerContact: "031-277-3344",
    customerEmail: "kigu.jang@spx.com",
    projectNo: "Q26004-01",
    projectName: "SPX 전기차 배터리 모듈 하우징",
    productName: "BMS Battery Case Module",
    productionVolume: "연간 200,000대",
    moldEstimateWon: 150000000,
    partUnitPriceWon: 8500,
    partPriceItems: [
      { id: "p-5", side: "공용", partName: "BMS Battery Case Main", partNo: "SPX-BMS-01", unitPriceWon: 8500 },
    ],
    totalEstimateWon: 0,
    submissionDeadline: "2026-03-20",
    submittedDate: "",
    quotationFiles: [],
    quotationFileName: "",
    quotationFileSize: "",
    quotationFileDate: "",
    status: "견적서작성중",
    mpsiAuthor: "MPSI",
    notes: "초박형 2.0mm 리브 구조 CAE 유동해석 진행 중. 3/18까지 견적서 완성 예정",
    memos: []
  }
];

const PRIME_STORAGE_KEY = "mpsi_prime_quotations_v1";

function getStoredPrimeQuotations(): PrimeQuotationItem[] {
  if (typeof window === "undefined") return initialPrimeQuotations;
  try {
    const raw = localStorage.getItem(PRIME_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PRIME_STORAGE_KEY, JSON.stringify(initialPrimeQuotations));
      return initialPrimeQuotations;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : initialPrimeQuotations;
  } catch (e) {
    return initialPrimeQuotations;
  }
}

function savePrimeQuotationsToStorage(quotes: PrimeQuotationItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PRIME_STORAGE_KEY, JSON.stringify(quotes));
  } catch (e) {}
}

// 업로드된 실제 File/Blob을 브라우저 세션 동안 메모리에 안전하게 보관하는 맵
const uploadedFileBlobMap = new Map<string, { blob: Blob; fileName: string }>();

// 서버 파일 업로드 헬퍼
async function uploadFileToServer(file: File): Promise<{
  success: boolean;
  fileUrl?: string;
  downloadUrl?: string;
  fileName?: string;
  fileSize?: string;
}> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/v1/files/upload", {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        return {
          success: true,
          fileUrl: json.fileUrl,
          downloadUrl: json.downloadUrl,
          fileName: json.fileName,
          fileSize: json.fileSize,
        };
      }
    }
  } catch (err) {
    console.error("Failed to upload file to server API:", err);
  }
  return { success: false };
}

// 실제 파일 다운로드 헬퍼 (서버 저장 원본 파일 > 메모리 원본 파일 > 표준 견적서 파일 다운로드)
function triggerActualFileDownload(
  fileName: string, 
  fileId?: string, 
  downloadUrl?: string,
  fileUrl?: string,
  metaInfo?: { projectNo?: string; customer?: string; version?: number; label?: string }
) {
  if (!fileName) return;

  // 1. 서버에 실제 저장된 스트리밍 downloadUrl 또는 fileUrl이 있는 경우 (가장 확실함!)
  const targetUrl = downloadUrl || fileUrl;
  if (targetUrl) {
    const a = document.createElement("a");
    a.href = targetUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // 2. 메모리 캐시에 사용자가 방금 업로드한 실제 파일 Blob이 있는 경우 원본 그대로 다운로드
  if (fileId && uploadedFileBlobMap.has(fileId)) {
    const cached = uploadedFileBlobMap.get(fileId)!;
    const url = URL.createObjectURL(cached.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = cached.fileName || fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return;
  }

  // 3. 가상 시드 파일이거나 캐시 만료 시: 확장자에 맞는 실제 유효한 파일 생성 다운로드
  let mimeType = "application/octet-stream";
  let content: BlobPart;

  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "xlsx" || ext === "xls" || ext === "csv") {
    mimeType = "application/vnd.ms-excel;charset=utf-8";
    const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];
    // 엑셀에서 완벽히 열리는 UTF-8 BOM 포함 TSV/CSV 견적서 데이터 생성
    const csvContent = "\uFEFF" + [
      `[MPSI 스마트공장 원청사 공식 견적서 (수주 원가 명세서)]`,
      `프로젝트 관리번호\t${metaInfo?.projectNo || "MI26001P0"}`,
      `원청 고객사명\t${metaInfo?.customer || "현대자동차 (남양연구소)"}`,
      `견적 버전 차수\tRev.${metaInfo?.version || 1} (${metaInfo?.label || "공식 견적서"})`,
      `공식 발행일자\t${nowLocal}`,
      `견적 발행처\tMPSI 본사 개발/영업본부 관제센터`,
      `--------------------------------------------------------------------------------`,
      `구분코드\t세부 항목명\t규격/사양\t수량\t단가(원)\t공급가액(원)\t비고`,
      `MOLD-01\t사출금형 제작비 (1*2 Cavity)\tNAK80 코어 / 650T\t1 SET\t85,000,000\t85,000,000\t금형 외주 제작 (우성정공)`,
      `PART-LH\tFront Door Upper LH 사출품\tPP-EPDM\t120,000 EA\t2,050\t246,000,000\t사출 외주 양산 (뉴몰드)`,
      `PART-RH\tFront Door Upper RH 사출품\tPP-EPDM\t120,000 EA\t1,950\t234,000,000\t사출 외주 양산 (뉴몰드)`,
      `DEV-01\t3D 도면 DR 검토 및 Cpk 품질검증\t자동차 1차사 기준\t1 式\t0\t0\t본사 무상 기술지원`,
      `합계\t총 공급가액 (VAT 별도)\t\t\t\t565,000,000\t원청사 LOI 수주 확정 금액`,
    ].join("\n");
    content = csvContent;
  } else if (ext === "pdf") {
    mimeType = "application/pdf";
    content = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF\n`;
  } else {
    mimeType = "text/plain;charset=utf-8";
    content = `[MPSI 스마트공장 공식 견적 첨부파일: ${fileName}]\n프로젝트번호: ${metaInfo?.projectNo}\n고객사: ${metaInfo?.customer}\n버전: Rev.${metaInfo?.version || 1}\n다운로드일시: ${new Date().toLocaleString()}`;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function QuotationPage() {
  const router = useRouter();
  const { projects, updateStep } = useProjectMaster();
  const [data, setDataState] = useState<PrimeQuotationItem[]>(() => getStoredPrimeQuotations());

  const setData = (updater: PrimeQuotationItem[] | ((prev: PrimeQuotationItem[]) => PrimeQuotationItem[])) => {
    setDataState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      savePrimeQuotationsToStorage(next);
      return next;
    });
  };

  // 검색 상태
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePresetType>("all");

  // URL ?search= 쿼리 파라미터가 있는 경우 (프로젝트 관리 대장에서 링크 타고 온 경우 자동 필터링)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const searchVal = params.get("search");
      if (searchVal) {
        setFilterKeyword(searchVal);
      }
    }
  }, []);

  // 모달 상태
  const [selectedItem, setSelectedItem] = useState<PrimeQuotationItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // 메모 작성 상태
  const [newMemoText, setNewMemoText] = useState("");

  // [신설] 상세 모달용 견적제출파일 교체/수정 사유 및 버전 상태
  const [replaceReason, setReplaceReason] = useState("");
  const [replaceLabel, setReplaceLabel] = useState("구매팀 네고 최종 견적");
  const [isReplaceFileFormOpen, setIsReplaceFileFormOpen] = useState(false);
  const [selectedReplaceFile, setSelectedReplaceFile] = useState<File | null>(null);

  // 프로젝트 선택 연동 (0단계 견적과 프로젝트 마스터 키 관계 바인딩)
  const [selectedProjectNo, setSelectedProjectNo] = useState<string>("");

  // 신규 등록 폼 (패밀리 금형 LH/RH 부품단가 & 다중 견적제출파일 지원)
  const [newForm, setNewForm] = useState({
    customerName: "",
    customerDept: "바디의장개발팀",
    customerManager: "",
    customerContact: "",
    customerEmail: "",
    projectNo: "",
    quotationNo: "", // 견적번호 (PJT 번호와 1:1 동일)
    projectName: "",
    productName: "",
    productionVolume: "연간 100,000대",
    moldEstimateWon: 0,
    // [요청 3] 패밀리 금형 부품단가 (기본 LH, RH 세팅)
    partPriceItems: [
      { id: "p-new-1", side: "LH", partName: "Front Door Upper LH", partNo: "", unitPriceWon: 0 },
      { id: "p-new-2", side: "RH", partName: "Front Door Upper RH", partNo: "", unitPriceWon: 0 },
    ] as QuotationPartPriceItem[],
    submissionDeadline: "",
    // [요청 4] 견적제출파일 다중 목록
    quotationFiles: [] as QuotationFileHistoryItem[],
    mpsiAuthor: "MPSI",
    notes: "",
    initialMemo: "",
  });

  const handleSelectProject = (pNo: string) => {
    setSelectedProjectNo(pNo);
    if (!pNo) {
      setNewForm({
        customerName: "",
        customerDept: "",
        customerManager: "",
        customerContact: "",
        customerEmail: "",
        projectNo: "",
        quotationNo: "",
        projectName: "",
        productName: "",
        productionVolume: "",
        moldEstimateWon: 0,
        partPriceItems: [
          { id: "p-new-1", side: "LH", partName: "", partNo: "", unitPriceWon: 0 },
          { id: "p-new-2", side: "RH", partName: "", partNo: "", unitPriceWon: 0 },
        ],
        submissionDeadline: "",
        quotationFiles: [],
        mpsiAuthor: "MPSI",
        notes: "",
        initialMemo: "",
      });
      return;
    }

    const found = projects.find((p) => p.projectNo === pNo);
    if (found) {
      const pName = found.productName || "제품";
      const isLH_RH = pName.toUpperCase().includes("LH") || pName.toUpperCase().includes("RH") || pName.includes("양측");
      
      setNewForm((prev) => ({
        ...prev,
        projectNo: found.projectNo,
        // [요청 1] 견적번호 = 프로젝트 관리번호 1:1 동일 바인딩
        quotationNo: found.projectNo,
        projectName: found.projectName,
        productName: found.productName,
        customerName: found.customerName || prev.customerName,
        productionVolume: found.orderQty ? `연간 ${found.orderQty.toLocaleString()}대` : "연간 120,000대",
        submissionDeadline: found.targetT1Date || "",
        notes: found.notes || `${found.projectName} - ${found.productName} 0단계 원청사 견적 제출 건`,
        // 패밀리 금형 부품 기본 세팅
        partPriceItems: isLH_RH ? [
          { id: `p-${Date.now()}-1`, side: "LH", partName: `${pName.replace(/LH\/RH/i, "").trim()} LH`.trim(), partNo: found.partNo ? `${found.partNo}-L` : "", unitPriceWon: 0 },
          { id: `p-${Date.now()}-2`, side: "RH", partName: `${pName.replace(/LH\/RH/i, "").trim()} RH`.trim(), partNo: found.partNo ? `${found.partNo}-R` : "", unitPriceWon: 0 },
        ] : [
          { id: `p-${Date.now()}-1`, side: "공용", partName: pName, partNo: found.partNo || "", unitPriceWon: 0 }
        ]
      }));
    }
  };

  // [요청 3] 패밀리 금형 부품단가 행 추가/삭제/수정
  const handleAddPartPriceRow = () => {
    const currentLen = newForm.partPriceItems.length;
    const defaultSide = currentLen === 0 ? "LH" : currentLen === 1 ? "RH" : "공용";
    setNewForm(prev => ({
      ...prev,
      partPriceItems: [
        ...prev.partPriceItems,
        {
          id: `p-${Date.now()}`,
          side: defaultSide as any,
          partName: `${prev.productName || "부품"} ${defaultSide}`.trim(),
          partNo: "",
          unitPriceWon: 0
        }
      ]
    }));
  };

  const handleRemovePartPriceRow = (id: string) => {
    if (newForm.partPriceItems.length <= 1) {
      alert("최소 1개 이상의 부품 단가 항목이 필요합니다.");
      return;
    }
    setNewForm(prev => ({
      ...prev,
      partPriceItems: prev.partPriceItems.filter(p => p.id !== id)
    }));
  };

  const handleUpdatePartPriceRow = (id: string, updates: Partial<QuotationPartPriceItem>) => {
    setNewForm(prev => ({
      ...prev,
      partPriceItems: prev.partPriceItems.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const detailFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);

  // [요청 4] 신규 등록 시 견적제출파일 다중 업로드 핸들러 (서버 영구 보존 + 메모리 캐시)
  const handleNewFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingFiles(true);
    const newHistory: QuotationFileHistoryItem[] = [];
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const sizeStr = (f.size / (1024 * 1024)).toFixed(2) + " MB";
      const fileId = `f-${Date.now()}-${i}`;
      
      // 1. 메모리 캐시 저장
      uploadedFileBlobMap.set(fileId, { blob: f, fileName: f.name });

      // 2. 서버 uploads 디렉토리에 실제 원본 파일 영구 저장
      const uploadRes = await uploadFileToServer(f);

      newHistory.push({
        id: fileId,
        version: newForm.quotationFiles.length + i + 1,
        label: newForm.quotationFiles.length === 0 && i === 0 ? "최초 제출 견적" : `견적 제출서류 #${newForm.quotationFiles.length + i + 1}`,
        fileName: f.name,
        fileSize: uploadRes.fileSize || sizeStr,
        uploadedAt: today,
        author: newForm.mpsiAuthor || "MPSI 영업팀",
        changeReason: "신규 원청사 견적 등록 시 초기 첨부",
        fileUrl: uploadRes.fileUrl,
        downloadUrl: uploadRes.downloadUrl,
      });
    }

    setNewForm(prev => ({
      ...prev,
      quotationFiles: [...prev.quotationFiles, ...newHistory]
    }));
    setIsUploadingFiles(false);
  };

  // [요청 4] 상세 모달에서 견적제출파일 교체/갱신 (서버 영구 보존 및 버전 이력)
  const handleExecuteFileReplace = async () => {
    if (!selectedItem) return;
    if (!selectedReplaceFile) {
      alert("교체/추가할 신규 견적서 파일을 선택해주세요.");
      return;
    }
    if (!replaceReason.trim()) {
      alert("파일 교체 사유를 반드시 입력해주세요.\n(예: 고객사 구매팀 2차 CR 네고 단가 2.5% 인하 협의 반영 등)");
      return;
    }

    setIsUploadingFiles(true);
    const file = selectedReplaceFile;
    const sizeStr = (file.size / (1024 * 1024)).toFixed(2) + " MB";
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];
    const newFileId = `f-${Date.now()}`;

    // 1. 메모리 캐시 저장
    uploadedFileBlobMap.set(newFileId, { blob: file, fileName: file.name });

    // 2. 서버 uploads 디렉토리에 실제 원본 파일 영구 저장
    const uploadRes = await uploadFileToServer(file);

    // 기존 단일 파일만 있고 quotationFiles 배열이 비어있던 경우 Rev 1 초기화
    let baseFiles = selectedItem.quotationFiles || [];
    if (baseFiles.length === 0 && selectedItem.quotationFileName) {
      baseFiles = [{
        id: `f-init-${Date.now()}`,
        version: 1,
        label: "최초 제출 견적",
        fileName: selectedItem.quotationFileName,
        fileSize: selectedItem.quotationFileSize || "3.0 MB",
        uploadedAt: selectedItem.quotationFileDate || today,
        author: selectedItem.mpsiAuthor || "MPSI 영업팀",
        changeReason: "원청사 RFQ 1차 공식 견적 제출",
        fileUrl: selectedItem.quotationFileUrl,
        downloadUrl: selectedItem.quotationDownloadUrl,
      }];
    }

    const nextVersion = baseFiles.length + 1;

    const newHistoryItem: QuotationFileHistoryItem = {
      id: newFileId,
      version: nextVersion,
      label: replaceLabel.trim() || `구매팀 네고 견적 (Rev ${nextVersion})`,
      fileName: file.name,
      fileSize: uploadRes.fileSize || sizeStr,
      uploadedAt: today,
      author: "MPSI",
      changeReason: replaceReason.trim(),
      fileUrl: uploadRes.fileUrl,
      downloadUrl: uploadRes.downloadUrl,
    };

    const updatedFiles = [...baseFiles, newHistoryItem];
    const updated: PrimeQuotationItem = {
      ...selectedItem,
      quotationFiles: updatedFiles,
      quotationFileName: file.name,
      quotationFileSize: uploadRes.fileSize || sizeStr,
      quotationFileDate: today,
      quotationFileUrl: uploadRes.fileUrl,
      quotationDownloadUrl: uploadRes.downloadUrl,
    };

    setSelectedItem(updated);
    setData(prev => prev.map(item => item.id === selectedItem.id ? updated : item));
    setReplaceReason("");
    setReplaceLabel("");
    setSelectedReplaceFile(null);
    if (detailFileInputRef.current) {
      detailFileInputRef.current.value = "";
    }
    setIsReplaceFileFormOpen(false);
    setIsUploadingFiles(false);
    alert(`[${file.name}] 견적제출파일이 서버에 안전하게 등록되었습니다! (Rev.${nextVersion})\n다운로드 시 업로드하신 원본 파일이 온전하게 다운로드됩니다.`);
  };

  // 신규 원청사 견적 등록
  const handleSaveNewQuotation = () => {
    if (!selectedProjectNo || !newForm.projectNo) {
      alert("견적을 등록할 대상 프로젝트를 선택해주세요. (0단계 견적과 프로젝트 관리번호 간 키 관계 연동)");
      return;
    }
    if (!newForm.customerName || !newForm.productName.trim()) {
      alert("선택된 프로젝트의 원청사(고객사)와 제품명을 확인해주세요.");
      return;
    }
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];

    const initialMemos: QuotationMemoItem[] = [];
    if (newForm.initialMemo.trim()) {
      initialMemos.push({
        id: `memo-${Date.now()}`,
        author: newForm.mpsiAuthor || "MPSI 영업팀",
        content: newForm.initialMemo.trim(),
        createdAt: today,
      });
    }

    // [요청 1] 견적번호 = 프로젝트 관리번호와 완전 동일
    const assignedQuotationNo = newForm.projectNo;

    const newItem: PrimeQuotationItem = {
      id: Date.now(),
      quotationNo: assignedQuotationNo,
      customerName: newForm.customerName,
      customerDept: newForm.customerDept,
      customerManager: newForm.customerManager,
      customerContact: newForm.customerContact,
      customerEmail: newForm.customerEmail,
      projectNo: newForm.projectNo,
      projectName: newForm.projectName,
      productName: newForm.productName.trim(),
      productionVolume: newForm.productionVolume,
      moldEstimateWon: Number(newForm.moldEstimateWon || 0),
      partUnitPriceWon: newForm.partPriceItems[0]?.unitPriceWon || 0,
      partPriceItems: newForm.partPriceItems,
      totalEstimateWon: 0,
      submissionDeadline: newForm.submissionDeadline || today,
      submittedDate: newForm.quotationFiles.length > 0 ? today : "",
      quotationFiles: newForm.quotationFiles,
      quotationFileName: newForm.quotationFiles[newForm.quotationFiles.length - 1]?.fileName || "",
      quotationFileSize: newForm.quotationFiles[newForm.quotationFiles.length - 1]?.fileSize || "",
      quotationFileDate: newForm.quotationFiles.length > 0 ? today : "",
      quotationFileUrl: newForm.quotationFiles[newForm.quotationFiles.length - 1]?.fileUrl || "",
      quotationDownloadUrl: newForm.quotationFiles[newForm.quotationFiles.length - 1]?.downloadUrl || "",
      status: newForm.quotationFiles.length > 0 ? "고객사제출완료" : "견적서작성중",
      mpsiAuthor: newForm.mpsiAuthor,
      notes: newForm.notes,
      memos: initialMemos,
    };

    setData([newItem, ...data]);
    setIsNewModalOpen(false);
    alert(`[${newItem.quotationNo}] 원청사 견적 건이 등록되었습니다.\n(견적번호 = 프로젝트 번호 일치 및 패밀리 금형 부품단가 저장 완료)`);
  };

  // 메모 추가
  const handleAddMemo = () => {
    if (!newMemoText.trim() || !selectedItem) return;
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];
    const timeStr = `${localDate} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const newMemoItem: QuotationMemoItem = {
      id: `memo-${Date.now()}`,
      author: "MPSI 영업담당",
      content: newMemoText.trim(),
      createdAt: timeStr,
    };

    const updated: PrimeQuotationItem = {
      ...selectedItem,
      memos: [newMemoItem, ...selectedItem.memos],
    };
    setSelectedItem(updated);
    setData((prev) => prev.map((item) => (item.id === selectedItem.id ? updated : item)));
    setNewMemoText("");
  };

  // 상태 변경
  const handleUpdateStatus = (id: number, nextStatus: PrimeQuotationStatus) => {
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];
    const updatedList = data.map((item) => {
      if (item.id === id) {
        // 프로젝트 마스터와도 상태 동기화
        if (nextStatus === "고객 답변 대기") {
          updateStep(item.projectNo, {
            quotationStatus: "고객 답변 대기",
            stepNameCustom: "고객 답변 대기",
            stepStatus: "진행중",
            isQuotePending: true,
          });
        } else if (nextStatus === "수주확정") {
          updateStep(item.projectNo, {
            quotationStatus: "수주확정",
            stepStatus: "진행중",
            isContractConfirmed: true,
            isQuotePending: false,
          });
          if (item.officialProjectNo && item.officialProjectNo !== item.projectNo) {
            updateStep(item.officialProjectNo, {
              quotationStatus: "수주확정",
              stepStatus: "진행중",
              isContractConfirmed: true,
              isQuotePending: false,
            });
          }
          if (item.quotationNo && item.quotationNo !== item.projectNo) {
            updateStep(item.quotationNo, {
              quotationStatus: "수주확정",
              stepStatus: "진행중",
              isContractConfirmed: true,
              isQuotePending: false,
            });
          }
        } else if (nextStatus === "실주/미체결") {
          updateStep(item.projectNo, {
            quotationStatus: "수주 미성사",
            stepNameCustom: "수주 미성사",
            stepStatus: "Fail(수정중)",
            isQuotePending: true,
          });
        }
        return {
          ...item,
          status: nextStatus,
          submittedDate: (nextStatus === "고객사제출완료" || nextStatus === "고객 답변 대기") && !item.submittedDate ? today : item.submittedDate,
        };
      }
      return item;
    });
    setData(updatedList);
    if (selectedItem && selectedItem.id === id) {
      setSelectedItem({
        ...selectedItem,
        status: nextStatus,
        submittedDate: (nextStatus === "고객사제출완료" || nextStatus === "고객 답변 대기") && !selectedItem.submittedDate ? today : selectedItem.submittedDate,
      });
    }
  };

  // 검색 필터링
  const filtered = data.filter((item) => {
    const matchKey = filterKeyword
      ? item.quotationNo.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        item.customerName.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        item.projectNo.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        item.productName.toLowerCase().includes(filterKeyword.toLowerCase())
      : true;

    const matchCust = filterCustomer !== "ALL" ? item.customerName.includes(filterCustomer) : true;
    const matchStatus = filterStatus !== "ALL" ? item.status === filterStatus : true;
    const matchDate = isWithinDateRange(item.submittedDate || item.submissionDeadline, filterDateFrom, filterDateTo);

    return matchKey && matchCust && matchStatus && matchDate;
  });

  // 검색 초기화
  const handleReset = () => {
    setFilterKeyword("");
    setFilterCustomer("ALL");
    setFilterStatus("ALL");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSelectedDatePreset("all");
  };

  // 상태 배지 렌더러
  const renderStatusBadge = (status: PrimeQuotationStatus) => {
    switch (status) {
      case "견적요청접수":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-300">요청접수</span>;
      case "견적서작성중":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">작성중</span>;
      case "고객사제출완료":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">제출완료</span>;
      case "원청사협의중":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">단가협의중</span>;
      case "고객 답변 대기":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">고객 답변 대기</span>;
      case "수주확정":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1"><Check className="h-3 w-3" />수주확정</span>;
      case "실주/미체결":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">실주</span>;
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* KPI 카드 */}
      {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="bg-white dark:bg-zinc-900 border rounded-md p-2.5 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[11px] text-zinc-500">원청사 총 견적건수</div>
            <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">{data.length}건</div>
          </div>
          <div className="h-8 w-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
            <Building2 className="h-4 w-4" />
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border rounded-md p-2.5 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[11px] text-zinc-500">견적 작성 / 검토중</div>
            <div className="text-lg font-bold font-mono text-amber-600">
              {data.filter((d) => d.status === "견적서작성중" || d.status === "견적요청접수").length}건
            </div>
          </div>
          <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border rounded-md p-2.5 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[11px] text-zinc-500">원청사 제출완료 / 협의중</div>
            <div className="text-lg font-bold font-mono text-purple-600">
              {data.filter((d) => d.status === "고객사제출완료" || d.status === "원청사협의중").length}건
            </div>
          </div>
          <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
            <Send className="h-4 w-4" />
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border rounded-md p-2.5 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[11px] text-zinc-500">최종 수주확정</div>
            <div className="text-lg font-bold font-mono text-emerald-600">
              {data.filter((d) => d.status === "수주확정").length}건
            </div>
          </div>
          <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
      </div> */}

      {/* 1. 상단 검색 조건 필터 영역 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex flex-col gap-2">
        {/* 조회기간 필터 */}
        <div className="pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <DateRangeFilter
            label="조회 기간 (제출일/마감일)"
            startDate={filterDateFrom}
            endDate={filterDateTo}
            onChange={(start, end, preset) => {
              setFilterDateFrom(start);
              setFilterDateTo(end);
              if (preset) setSelectedDatePreset(preset);
            }}
            selectedPreset={selectedDatePreset}
            onPresetChange={setSelectedDatePreset}
          />
        </div>

        {/* 상세 조건 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">검색어 (견적번호/원청사/PJT/제품명)</span>
            <Input 
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              placeholder="검색어 입력"
              className="h-7 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">원청사 (고객사)</span>
            <select 
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="h-7 rounded-md border bg-transparent px-2 text-xs font-bold"
            >
              <option value="ALL">전체 원청사</option>
              {CUSTOMER_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">진행 상태</span>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-7 rounded-md border bg-transparent px-2 text-xs"
            >
              <option value="ALL">전체 상태</option>
              <option value="견적요청접수">견적요청접수</option>
              <option value="견적서작성중">견적서작성중</option>
              <option value="고객사제출완료">고객사제출완료</option>
              <option value="원청사협의중">원청사협의중</option>
              <option value="고객 답변 대기">고객 답변 대기</option>
              <option value="수주확정">수주확정</option>
              <option value="실주/미체결">실주/미체결</option>
            </select>
          </div>
          <div className="col-span-2 flex items-end justify-end gap-1.5">
            <Button onClick={() => {}} className="h-7 px-4 bg-sky-600 hover:bg-sky-700 text-white gap-1 text-xs">
              <Search className="h-3.5 w-3.5" />
              검색
            </Button>
            <Button onClick={handleReset} variant="outline" className="h-7 px-3 gap-1 text-xs text-zinc-600">
              <RefreshCw className="h-3.5 w-3.5" />
              초기화
            </Button>
          </div>
        </div>
      </div>

      {/* 2. 메인 견적 목록 테이블 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b">
          <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-100">
            <Building2 className="h-4 w-4 text-sky-600" />
            <span>원청사 견적 관리대장 (MPSI ↔ 원청사 제출 및 수주 관리)</span>
            <span className="text-[11px] font-normal text-zinc-500 ml-1">
              (총 <b className="text-sky-600 font-mono">{filtered.length}</b>건)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button 
              onClick={() => alert("원청사 견적 목록이 Excel 파일로 다운로드되었습니다.")}
              variant="outline" 
              className="h-7 px-2.5 text-xs gap-1 text-zinc-600"
            >
              <Download className="h-3.5 w-3.5" />
              엑셀 다운로드
            </Button>
            <Button 
              onClick={() => setIsNewModalOpen(true)}
              className="h-7 px-3 bg-sky-600 hover:bg-sky-700 text-white text-xs gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              신규 원청사 견적 등록
            </Button>
          </div>
        </div>

        {/* 테이블 */}
        <div className="overflow-x-auto max-h-[calc(100vh-340px)] overflow-y-auto">
          <table className="w-full border-collapse text-left border-spacing-0 whitespace-nowrap">
            <thead className="sticky top-0 bg-[#2d3748] text-white text-[11px] z-10">
              <tr>
                <th className="p-1.5 w-10 text-center border-r border-slate-600">No</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[130px]">견적번호 (PJT 번호)</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[140px]">원청사 (고객사)</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[100px]">원청사 담당자</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[130px]">차종/프로젝트</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[160px]">제품명</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[105px] text-right">금형 견적가</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[125px] text-right">부품 단가 (패밀리/EA)</th>
                {/* [요청 4] 제목을 '견적제출파일'로 변경 */}
                <th className="p-1.5 border-r border-slate-600 min-w-[150px]">견적제출파일</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px] text-center">제출 마감일</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px] text-center">실제 제출일</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[85px] text-center">진행상태</th>
                <th className="p-1.5 min-w-[80px] text-center">상세/메모</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px]">
              {filtered.map((row, idx) => (
                <tr key={row.id} className="hover:bg-sky-50/50 dark:hover:bg-zinc-800/60 transition-colors odd:bg-white even:bg-zinc-50/40 dark:odd:bg-zinc-900 dark:even:bg-zinc-900/50">
                  <td className="p-1.5 text-center font-mono text-zinc-400 border-r">{idx + 1}</td>
                  
                  {/* [요청 1 & 2] 견적번호 = PJT번호 및 수주확정 시 승격된 정식 PJT 번호(MI26001P0) 양방향 표기 */}
                  <td className="p-1.5 border-r font-mono">
                    <span className="font-bold text-sky-700 dark:text-sky-400">{row.quotationNo}</span>
                    {row.officialProjectNo && (
                      <div className="mt-0.5">
                        <span 
                          className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[9px] border border-emerald-300 dark:border-emerald-700 inline-flex items-center gap-0.5 shadow-2xs cursor-pointer hover:bg-emerald-200"
                          title="수주 확정으로 승격된 정식 프로젝트 관리번호 (프로젝트 대장 연동)"
                          onClick={() => alert(`[${row.quotationNo}] 건은 수주 확정되어 정식 프로젝트 [${row.officialProjectNo}]로 승격 진행 중입니다.`)}
                        >
                          <span className="font-sans">승격:</span>
                          <span className="font-mono">{row.officialProjectNo}</span>
                        </span>
                      </div>
                    )}
                  </td>
                  
                  <td className="p-1.5 border-r font-bold text-zinc-900 dark:text-zinc-100">{row.customerName}</td>
                  <td className="p-1.5 border-r text-zinc-600">
                    <span className="font-medium text-zinc-800">{row.customerManager}</span>
                    {row.customerDept && <span className="text-[10px] text-zinc-400 ml-1">({row.customerDept})</span>}
                  </td>
                  <td className="p-1.5 border-r font-medium truncate max-w-[130px]" title={row.projectName}>{row.projectName}</td>
                  <td className="p-1.5 border-r font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[160px]" title={row.productName}>{row.productName}</td>
                  <td className="p-1.5 border-r text-right font-mono">
                    {row.moldEstimateWon > 0 ? `${row.moldEstimateWon.toLocaleString()}원` : "-"}
                  </td>

                  {/* [요청 3] 패밀리 금형(Family Mold, LH/RH) 개별 부품단가 독립 표기 */}
                  <td className="p-1.5 border-r text-right font-mono">
                    {row.partPriceItems && row.partPriceItems.length > 1 ? (
                      <div className="flex flex-col gap-0.5 text-[10px]">
                        {row.partPriceItems.map((p) => (
                          <div key={p.id} className="flex items-center justify-end gap-1">
                            <span className={`px-1 py-0.2 rounded font-bold text-[9px] ${
                              p.side === "LH" ? "bg-blue-100 text-blue-800 border border-blue-200" :
                              p.side === "RH" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                              "bg-zinc-100 text-zinc-700 border border-zinc-200"
                            }`}>
                              {p.side}
                            </span>
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">
                              {p.unitPriceWon > 0 ? `${p.unitPriceWon.toLocaleString()}원` : "-"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : row.partPriceItems && row.partPriceItems.length === 1 ? (
                      <span>{row.partPriceItems[0].unitPriceWon > 0 ? `${row.partPriceItems[0].unitPriceWon.toLocaleString()}원` : "-"}</span>
                    ) : row.partUnitPriceWon ? (
                      <span>{row.partUnitPriceWon.toLocaleString()}원</span>
                    ) : (
                      "-"
                    )}
                  </td>

                  {/* [요청 4] 견적제출파일 다중 업로드 및 버전(최초 vs 네고 최종본) 이력 표시 */}
                  <td className="p-1.5 border-r font-mono text-[10px]">
                    {row.quotationFiles && row.quotationFiles.length > 0 ? (
                      <div 
                        className="flex items-center gap-1 text-sky-600 hover:underline cursor-pointer"
                        onClick={() => { setSelectedItem(row); setIsDetailModalOpen(true); }}
                        title={`총 ${row.quotationFiles.length}건 견적제출파일 (클릭 시 상세/이력 확인)`}
                      >
                        <Paperclip className="h-3 w-3 shrink-0 text-sky-600" />
                        <span className="truncate max-w-[100px]">
                          {row.quotationFiles[row.quotationFiles.length - 1].fileName}
                        </span>
                        {row.quotationFiles.length > 1 && (
                          <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-bold text-[9px] shrink-0 border border-amber-300">
                            Rev.{row.quotationFiles.length}
                          </span>
                        )}
                      </div>
                    ) : row.quotationFileName ? (
                      <div className="flex items-center gap-1 text-sky-600 hover:underline cursor-pointer" onClick={() => { setSelectedItem(row); setIsDetailModalOpen(true); }}>
                        <Paperclip className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[120px]">{row.quotationFileName}</span>
                      </div>
                    ) : (
                      <span className="text-zinc-400">견적제출파일 없음</span>
                    )}
                  </td>

                  <td className="p-1.5 border-r text-center font-mono text-zinc-500">{row.submissionDeadline}</td>
                  <td className="p-1.5 border-r text-center font-mono font-bold text-sky-700">{row.submittedDate || "-"}</td>
                  <td className="p-1.5 border-r text-center">{renderStatusBadge(row.status)}</td>
                  <td className="p-1.5 text-center">
                    <Button 
                      onClick={() => { setSelectedItem(row); setIsDetailModalOpen(true); }}
                      size="xs" 
                      variant="outline" 
                      className="h-6 px-2 text-[10px] gap-1 text-sky-700 border-sky-300 hover:bg-sky-50"
                    >
                      <Eye className="h-3 w-3" />
                      상세/메모
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. 신규 원청사 견적 등록 모달 */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
          <div className="bg-white dark:bg-zinc-900 border rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-b">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Building2 className="h-4 w-4 text-sky-600" />
                <span>신규 원청사 견적 등록 (MPSI ↔ 고객사 제출 관리)</span>
              </div>
              <button onClick={() => setIsNewModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex flex-col gap-4 text-xs">
              {/* 0단계 견적 ↔ 프로젝트 마스터 키 관계 연동 */}
              <div className="p-2.5 bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-md flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-sky-600" />
                    대상 프로젝트 선택 (0단계 견적 및 수주 ↔ 프로젝트 관리번호 키 연동)
                  </label>
                  <span className="text-[10px] text-sky-600 font-medium">선택 시 PJT 번호·고객사·제품명 자동 바인딩</span>
                </div>
                <select
                  value={selectedProjectNo}
                  onChange={(e) => handleSelectProject(e.target.value)}
                  className="w-full h-8 rounded-md border border-sky-300 dark:border-sky-700 bg-white dark:bg-zinc-900 px-2 text-xs font-bold text-sky-900 dark:text-sky-200 shadow-xs"
                >
                  <option value="">-- 대상 프로젝트를 선택하세요 (필수 선택) --</option>
                  {projects.map((p) => (
                    <option key={`${p.id}-${p.projectNo}`} value={p.projectNo}>
                      [{p.projectNo}] {p.projectName} - {p.productName} ({p.customerName}){p.changeType ? ` [${p.changeType}]` : ""}
                    </option>
                  ))}
                </select>
                {!selectedProjectNo && (
                  <p className="text-[11px] text-amber-600 font-semibold mt-0.5">
                    * 0단계 원청사 견적 관리는 프로젝트 관리번호(PJT No)를 키(Key)로 연동하므로 반드시 프로젝트를 먼저 선택해야 합니다.
                  </p>
                )}
              </div>

              {/* 프로젝트 및 품목 정보 (프로젝트 마스터 연동 - 키 일관성 유지) */}
              <div className="grid grid-cols-2 gap-2 border rounded-md p-3 bg-zinc-50/40 dark:bg-zinc-800/20">
                <div>
                  <label className="text-zinc-600 font-medium block mb-0.5">
                    PJT 관리번호 & 견적번호 <span className="text-[10px] text-sky-600 font-bold">(1:1 동일 바인딩)</span>
                  </label>
                  <Input 
                    value={newForm.projectNo}
                    readOnly
                    placeholder="프로젝트 선택 시 자동입력 (예: Q26001-01)"
                    className="h-7 text-xs font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-sky-800 dark:text-sky-300 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-zinc-600 font-medium block mb-0.5">
                    원청사 (고객사명) <span className="text-[10px] text-zinc-400">(자동연동)</span>
                  </label>
                  <Input 
                    value={newForm.customerName}
                    readOnly
                    placeholder="프로젝트 선택 시 자동입력"
                    className="h-7 text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-zinc-600 font-medium block mb-0.5">
                    차종 / 프로젝트명 <span className="text-[10px] text-zinc-400">(자동연동)</span>
                  </label>
                  <Input 
                    value={newForm.projectName}
                    readOnly
                    placeholder="프로젝트 선택 시 자동입력"
                    className="h-7 text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-zinc-600 font-medium block mb-0.5">
                    제품명(품목명) <span className="text-[10px] text-zinc-400">(자동연동)</span>
                  </label>
                  <Input 
                    value={newForm.productName}
                    readOnly
                    placeholder="프로젝트 선택 시 자동입력"
                    className="h-7 text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* 원청사(고객사) 담당자 정보 */}
              <div className="border rounded-md p-3 flex flex-col gap-2 bg-sky-50/30">
                <div className="font-bold text-sky-900 dark:text-sky-300 flex items-center gap-1.5 pb-1 border-b border-sky-200">
                  <User className="h-3.5 w-3.5 text-sky-600" />
                  <span>원청사(고객사) 담당자 및 협의 채널</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-zinc-600 font-medium block mb-0.5">고객사 담당 부서</label>
                    <Input 
                      value={newForm.customerDept}
                      onChange={(e) => setNewForm({ ...newForm, customerDept: e.target.value })}
                      placeholder="예: 바디설계팀, 구매기획부"
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-600 font-medium block mb-0.5">담당자명</label>
                    <Input 
                      value={newForm.customerManager}
                      onChange={(e) => setNewForm({ ...newForm, customerManager: e.target.value })}
                      placeholder="예: 김남양 책임"
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-600 font-medium block mb-0.5">연락처 / 이메일</label>
                    <Input 
                      value={newForm.customerContact}
                      onChange={(e) => setNewForm({ ...newForm, customerContact: e.target.value })}
                      placeholder="010-1234-5678 / kkh@hyundai.com"
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 양산 볼륨 및 금형 견적가 / 제출 마감일 */}
              <div className="grid grid-cols-3 gap-2 border rounded-md p-3 bg-zinc-50 dark:bg-zinc-800/40">
                <div>
                  <label className="text-zinc-600 font-medium block mb-0.5">예상 양산 볼륨 (조건)</label>
                  <Input 
                    value={newForm.productionVolume}
                    onChange={(e) => setNewForm({ ...newForm, productionVolume: e.target.value })}
                    placeholder="예: 연간 120,000대"
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <label className="text-zinc-600 font-medium block mb-0.5">금형 견적가 (원) <span className="text-[10px] text-sky-600 font-bold">[일회성 투자비]</span></label>
                  <Input 
                    type="number"
                    value={newForm.moldEstimateWon || ""}
                    onChange={(e) => setNewForm({ ...newForm, moldEstimateWon: Number(e.target.value) })}
                    placeholder="0"
                    className="h-7 text-xs font-mono text-right font-bold text-sky-700"
                  />
                </div>
                <div>
                  <label className="text-zinc-600 font-medium block mb-0.5">제출 마감일</label>
                  <Input 
                    type="date"
                    value={newForm.submissionDeadline}
                    onChange={(e) => setNewForm({ ...newForm, submissionDeadline: e.target.value })}
                    className="h-7 text-xs font-mono font-bold text-zinc-700"
                  />
                </div>
              </div>

              {/* [요청 3 신설] 패밀리 금형(Family Mold, LH/RH) 및 부품별 사출 단가 등록 */}
              <div className="border border-amber-200 dark:border-amber-900/60 rounded-md p-3 flex flex-col gap-2.5 bg-amber-50/30 dark:bg-amber-950/10">
                <div className="flex items-center justify-between pb-1 border-b border-amber-200/60 dark:border-amber-900/40">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-amber-600" />
                    <span className="font-bold text-xs text-amber-900 dark:text-amber-200">
                      사출 부품 개당 단가 등록 (패밀리 금형 LH/RH 및 다품목 개별 단가 지원)
                    </span>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddPartPriceRow}
                    size="xs"
                    variant="outline"
                    className="h-6 px-2 text-[10px] gap-1 border-amber-300 text-amber-800 hover:bg-amber-100"
                  >
                    <Plus className="h-3 w-3" />
                    단가 행 추가 (+)
                  </Button>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  {newForm.partPriceItems.map((item, pIdx) => (
                    <div key={item.id} className="grid grid-cols-12 gap-1.5 items-center p-1.5 rounded bg-white dark:bg-zinc-800 border text-[11px]">
                      {/* 구분 (LH / RH / 공용) */}
                      <div className="col-span-2">
                        <select
                          value={item.side}
                          onChange={(e) => handleUpdatePartPriceRow(item.id, { side: e.target.value as any })}
                          className="h-6 w-full rounded border bg-zinc-50 dark:bg-zinc-900 px-1 text-[11px] font-bold"
                        >
                          <option value="LH">LH (좌측)</option>
                          <option value="RH">RH (우측)</option>
                          <option value="공용">공용(Single)</option>
                          <option value="기타">기타</option>
                        </select>
                      </div>

                      {/* 품목명 */}
                      <div className="col-span-4">
                        <Input
                          value={item.partName}
                          onChange={(e) => handleUpdatePartPriceRow(item.id, { partName: e.target.value })}
                          placeholder="부품명 (예: Front Door Upper LH)"
                          className="h-6 text-[11px]"
                        />
                      </div>

                      {/* 품번 */}
                      <div className="col-span-3">
                        <Input
                          value={item.partNo || ""}
                          onChange={(e) => handleUpdatePartPriceRow(item.id, { partNo: e.target.value })}
                          placeholder="품번 (예: 82301-NT500)"
                          className="h-6 text-[11px] font-mono"
                        />
                      </div>

                      {/* 개당 단가 */}
                      <div className="col-span-2">
                        <div className="relative">
                          <Input
                            type="number"
                            value={item.unitPriceWon || ""}
                            onChange={(e) => handleUpdatePartPriceRow(item.id, { unitPriceWon: Number(e.target.value) })}
                            placeholder="단가(원)"
                            className="h-6 text-[11px] font-mono text-right pr-4 font-bold text-emerald-700"
                          />
                          <span className="absolute right-1 top-1 text-[9px] text-zinc-400 pointer-events-none">원</span>
                        </div>
                      </div>

                      {/* 삭제 */}
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemovePartPriceRow(item.id)}
                          className="h-6 w-6 rounded hover:bg-rose-50 text-rose-500 hover:text-rose-700 inline-flex items-center justify-center transition-colors"
                          title="항목 삭제"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* [요청 4 개편] 견적제출파일 (다중 첨부 가능) */}
              <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-md p-3.5 flex flex-col gap-2.5 bg-zinc-50/50">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleNewFilesUpload} 
                  multiple
                  className="hidden" 
                  accept=".xlsx,.xls,.pdf,.dwg,.stp,.zip"
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-sky-600" />
                    <div>
                      <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                        견적제출파일 첨부 (다중 선택 가능 - Excel, PDF, 도면 등)
                      </span>
                      <p className="text-[10px] text-zinc-500">원청사 공식 제출 견적서, 견적원가명세서, 사양서를 빠짐없이 첨부하세요.</p>
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={isUploadingFiles}
                    variant="outline" 
                    className="h-6 text-[11px] gap-1 border-sky-500 text-sky-700 hover:bg-sky-50"
                  >
                    {isUploadingFiles ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                    {isUploadingFiles ? "서버 저장 중..." : "파일 추가 (+)"}
                  </Button>
                </div>

                {newForm.quotationFiles.length > 0 && (
                  <div className="flex flex-col gap-1 pt-1">
                    {newForm.quotationFiles.map((f, fIdx) => (
                      <div key={f.id} className="flex items-center justify-between px-2.5 py-1.5 rounded bg-white dark:bg-zinc-800 border text-[11px]">
                        <div className="flex items-center gap-2 truncate">
                          <span className="px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 font-bold text-[9px] shrink-0 font-mono">
                            Rev.{f.version}
                          </span>
                          <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{f.fileName}</span>
                          <span className="text-[10px] text-zinc-400 shrink-0">({f.fileSize})</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => triggerActualFileDownload(f.fileName, f.id, f.downloadUrl, f.fileUrl, {
                              projectNo: newForm.projectNo,
                              customer: newForm.customerName,
                              version: f.version,
                              label: f.label
                            })}
                            className="text-sky-600 hover:text-sky-800 p-0.5 inline-flex items-center gap-0.5 text-[10px]"
                            title="업로드된 파일 다운로드 확인"
                          >
                            <Download className="h-3 w-3" />
                            <span>다운로드</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewForm(prev => ({ ...prev, quotationFiles: prev.quotationFiles.filter((_, idx) => idx !== fIdx) }))}
                            className="text-rose-500 hover:text-rose-700 p-0.5 ml-1"
                            title="파일 제거"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 메모 및 특약사항 */}
              <div>
                <label className="text-zinc-600 font-medium block mb-1">원청사 협의 메모 및 특약사항</label>
                <textarea 
                  value={newForm.initialMemo}
                  onChange={(e) => setNewForm({ ...newForm, initialMemo: e.target.value })}
                  placeholder="예: 고객사 단가 네고 조건(2.5% 인하 조건부 수주), T1 납기 마감 확정, 결제조건 60일 어음 등"
                  className="w-full h-16 p-2 rounded-md border text-xs bg-transparent"
                />
              </div>
            </div>

            <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-t flex justify-end gap-2">
              <Button onClick={() => setIsNewModalOpen(false)} variant="outline" className="h-7 text-xs">
                취소
              </Button>
              <Button onClick={handleSaveNewQuotation} className="h-7 text-xs bg-sky-600 hover:bg-sky-700 text-white gap-1">
                <Check className="h-3.5 w-3.5" />
                원청사 견적 등록
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. 원청사 견적 상세 및 메모 관리 모달 */}
      {isDetailModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
          <div className="bg-white dark:bg-zinc-900 border rounded-lg shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-b">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 font-mono">
                  [{selectedItem.quotationNo}]
                </span>
                <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
                  {selectedItem.customerName} - {selectedItem.productName}
                </span>
                {renderStatusBadge(selectedItem.status)}
                {selectedItem.officialProjectNo && (
                  <button
                    onClick={() => router.push(`/portal/project?search=${selectedItem.officialProjectNo}`)}
                    className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 font-mono hover:bg-emerald-200 cursor-pointer shadow-2xs"
                    title="클릭 시 프로젝트 관리 대장으로 이동"
                  >
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    수주승격 PJT: {selectedItem.officialProjectNo}
                    <ArrowRight className="h-2.5 w-2.5 ml-0.5" />
                  </button>
                )}
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex flex-col gap-4 text-xs">
              {/* 원청사 및 프로젝트 요약 그리드 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-sky-50/40 dark:bg-zinc-800/40 p-3 rounded-md border border-sky-100 dark:border-zinc-700">
                <div>
                  <div className="text-[10px] text-zinc-400">원청사(고객사)</div>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100">{selectedItem.customerName}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">원청사 담당자</div>
                  <div className="font-medium text-zinc-800 dark:text-zinc-200">
                    {selectedItem.customerManager} ({selectedItem.customerDept})
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">원청사 연락처</div>
                  <div className="font-mono text-zinc-700">{selectedItem.customerContact}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">PJT 관리번호 (견적번호)</div>
                  <div className="font-mono font-bold text-sky-700 flex items-center gap-1.5 flex-wrap">
                    <span>{selectedItem.projectNo}</span>
                    {selectedItem.officialProjectNo && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-normal">
                        (정식 승격: {selectedItem.officialProjectNo})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* [요청 3] 패밀리 금형 부품별 개별 단가 구성 (LH / RH / 공용) */}
              <div className="border rounded-md p-3 flex flex-col gap-2.5 bg-white dark:bg-zinc-900">
                <div className="flex items-center justify-between pb-1.5 border-b">
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-purple-600" />
                    <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                      패밀리 금형 및 사출 부품별 개별 단가 구성
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400">
                    동일 금형 내 LH/RH 형상 차이에 따른 부품단가 개별 적용
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* 금형 견적 금액 (일회성 투자비) */}
                  <div className="p-2.5 rounded bg-sky-50/50 dark:bg-zinc-800 border border-sky-100 dark:border-zinc-700 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 block">금형 견적금액 (일회성 투자비)</span>
                      <span className="text-[10px] text-zinc-400">금형 제작 및 사출 초기 투자비</span>
                    </div>
                    <div className="font-mono font-bold text-sky-700 dark:text-sky-400 text-sm">
                      {selectedItem.moldEstimateWon.toLocaleString()}원
                    </div>
                  </div>

                  {/* 대표 사출단가 */}
                  <div className="p-2.5 rounded bg-emerald-50/50 dark:bg-zinc-800 border border-emerald-100 dark:border-zinc-700 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 block">사출 부품 개당 단가 (EA)</span>
                      <span className="text-[10px] text-zinc-400">
                        {selectedItem.partPriceItems && selectedItem.partPriceItems.length > 1 ? "LH/RH 패밀리 개별 단가 적용" : "단일 부품 기준 단가"}
                      </span>
                    </div>
                    <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                      {(selectedItem.partUnitPriceWon ?? 0).toLocaleString()}원
                    </div>
                  </div>
                </div>

                {/* 부품별 개별 단가 상세 리스트 */}
                {selectedItem.partPriceItems && selectedItem.partPriceItems.length > 0 && (
                  <div className="border rounded overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 text-[10px] font-bold border-b">
                        <tr>
                          <th className="py-1.5 px-2.5 w-16 text-center">구분</th>
                          <th className="py-1.5 px-2.5">부품명 (Part Name)</th>
                          <th className="py-1.5 px-2.5">품번 (Part No)</th>
                          <th className="py-1.5 px-2.5 text-right">개당 견적단가 (EA)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {selectedItem.partPriceItems.map((part) => (
                          <tr key={part.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40">
                            <td className="py-1.5 px-2.5 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                                part.side === "LH"
                                  ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200"
                                  : part.side === "RH"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200"
                                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                              }`}>
                                {part.side}
                              </span>
                            </td>
                            <td className="py-1.5 px-2.5 font-medium text-zinc-800 dark:text-zinc-200">
                              {part.partName}
                            </td>
                            <td className="py-1.5 px-2.5 font-mono text-[11px] text-zinc-500">
                              {part.partNo || "-"}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              {part.unitPriceWon.toLocaleString()}원
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* [요청 4] 견적제출파일 이력 및 네고 버전 관리 */}
              <div className="border rounded-md p-3 flex flex-col gap-2.5 bg-white dark:bg-zinc-900">
                <div className="flex items-center justify-between pb-1.5 border-b flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-sky-600" />
                    <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                      견적제출파일 이력 및 네고 버전 관리 (총 {(selectedItem.quotationFiles?.length || (selectedItem.quotationFileName ? 1 : 0))}건)
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      (최초 제출본 ➔ 구매팀 네고 최종본 이력 보존)
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    onClick={() => setIsReplaceFileFormOpen(!isReplaceFileFormOpen)}
                    className="h-6 text-[11px] gap-1 border-sky-400 text-sky-700 hover:bg-sky-50"
                  >
                    <Upload className="h-3 w-3" />
                    {isReplaceFileFormOpen ? "교체 폼 닫기" : "견적파일 교체/신규 버전 등록 (+)"}
                  </Button>
                </div>

                {/* 파일 교체 및 신규 버전 등록 폼 */}
                {isReplaceFileFormOpen && (
                  <div className="p-3 bg-sky-50/60 dark:bg-zinc-800/60 rounded-md border border-sky-200 dark:border-zinc-700 flex flex-col gap-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-sky-900 dark:text-sky-300 flex items-center gap-1.5">
                        <Upload className="h-3.5 w-3.5" />
                        견적제출파일 신규 버전 등록 (Rev.{(selectedItem.quotationFiles?.length || (selectedItem.quotationFileName ? 1 : 0)) + 1})
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setIsReplaceFileFormOpen(false)}
                        className="text-zinc-400 hover:text-zinc-600 text-xs"
                      >
                        닫기
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                          버전 라벨 (구분)
                        </label>
                        <input
                          type="text"
                          value={replaceLabel}
                          onChange={(e) => setReplaceLabel(e.target.value)}
                          placeholder="예: 구매팀 2차 CR 네고 최종 견적, 사양 변경 견적"
                          className="w-full h-7 px-2 rounded border text-xs bg-white dark:bg-zinc-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                          새 견적서 파일 선택 <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="file"
                          ref={detailFileInputRef}
                          onChange={(e) => setSelectedReplaceFile(e.target.files?.[0] || null)}
                          className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-sky-100 file:text-sky-800 hover:file:bg-sky-200 cursor-pointer"
                          accept=".xlsx,.xls,.pdf,.dwg,.stp,.zip"
                        />
                        {selectedReplaceFile && (
                          <div className="mt-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                            <span>선택됨: {selectedReplaceFile.name} ({(selectedReplaceFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                          파일 교체 사유 <span className="text-rose-500 font-bold">* (필수 - 감사/원가 네고 근거 보존)</span>
                        </label>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-zinc-400">예시 입력:</span>
                          <button
                            type="button"
                            onClick={() => setReplaceReason("고객사 구매팀 2차 CR 네고 협의 반영 (금형비 및 부품단가 2.5% 인하 합의 수주에 따른 견적서 갱신)")}
                            className="text-[10px] bg-sky-100 text-sky-800 hover:bg-sky-200 px-1.5 py-0.5 rounded"
                          >
                            구매팀 CR 네고 반영
                          </button>
                          <button
                            type="button"
                            onClick={() => setReplaceReason("설계 변경(E001)에 따른 코어 가공비 및 원재료 수지 스펙 갱신 반영")}
                            className="text-[10px] bg-amber-100 text-amber-800 hover:bg-amber-200 px-1.5 py-0.5 rounded"
                          >
                            설변(E001) 반영
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={replaceReason}
                        onChange={(e) => setReplaceReason(e.target.value)}
                        placeholder="예: 고객사 구매팀 2차 CR 네고 협의 반영 (금형비 400만원 감액 및 부품단가 2.5% 인하 합의 수주에 따른 견적서 갱신)"
                        className="w-full h-14 p-2 rounded border text-xs bg-white dark:bg-zinc-900 resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-zinc-500">
                        ※ 교체 시 기존 최초 제출본(Rev 1)은 삭제되지 않고 감사 추적을 위해 누적 보존됩니다.
                      </span>
                      <Button
                        type="button"
                        onClick={handleExecuteFileReplace}
                        disabled={isUploadingFiles}
                        className="h-7 px-3 text-xs bg-sky-600 hover:bg-sky-700 text-white font-bold gap-1"
                      >
                        {isUploadingFiles ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        {isUploadingFiles ? "서버에 파일 저장 중..." : `신규 버전(Rev.${(selectedItem.quotationFiles?.length || (selectedItem.quotationFileName ? 1 : 0)) + 1}) 등록`}
                      </Button>
                    </div>
                  </div>
                )}

                {/* 파일 이력 목록 */}
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-0.5">
                  {(selectedItem.quotationFiles && selectedItem.quotationFiles.length > 0) ? (
                    selectedItem.quotationFiles.map((file) => (
                      <div key={file.id} className="p-2.5 rounded-md border bg-zinc-50/70 dark:bg-zinc-800/60 flex flex-col gap-1.5 text-xs">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              file.version === 1 
                                ? "bg-slate-200 text-slate-800 dark:bg-zinc-700 dark:text-zinc-200" 
                                : "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300"
                            }`}>
                              Rev.{file.version}
                            </span>
                            <span className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">
                              {file.label}
                            </span>
                            <span className="text-zinc-500 font-mono text-[11px]">
                              {file.fileName} ({file.fileSize})
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                            <span>{file.uploadedAt} | {file.author}</span>
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => triggerActualFileDownload(file.fileName, file.id, file.downloadUrl, file.fileUrl, { 
                                projectNo: selectedItem.projectNo, 
                                customer: selectedItem.customerName, 
                                version: file.version, 
                                label: file.label 
                              })}
                              className="h-5 px-2 text-[10px] gap-1 text-sky-700 hover:bg-sky-50 border-sky-300 font-semibold"
                            >
                              <Download className="h-2.5 w-2.5" />
                              다운로드
                            </Button>
                          </div>
                        </div>
                        {file.changeReason && (
                          <div className="p-1.5 rounded bg-white dark:bg-zinc-900 border text-[11px] text-zinc-600 dark:text-zinc-300 flex items-start gap-1.5">
                            <span className="font-bold text-amber-600 dark:text-amber-400 shrink-0">교체/제출 사유:</span>
                            <span>{file.changeReason}</span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : selectedItem.quotationFileName ? (
                    <div className="p-2.5 rounded-md border bg-zinc-50/70 dark:bg-zinc-800/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-200 text-slate-800">
                          Rev.1
                        </span>
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{selectedItem.quotationFileName}</span>
                        <span className="text-[10px] text-zinc-400">({selectedItem.quotationFileSize || "3.0 MB"})</span>
                      </div>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => triggerActualFileDownload(
                          selectedItem.quotationFileName || "견적서.xlsx", 
                          undefined, 
                          selectedItem.quotationDownloadUrl, 
                          selectedItem.quotationFileUrl, 
                          { 
                            projectNo: selectedItem.projectNo, 
                            customer: selectedItem.customerName, 
                            version: 1, 
                            label: "최초 제출 견적" 
                          }
                        )}
                        className="h-6 px-2 text-[10px] gap-1 text-sky-700 hover:bg-sky-50 border-sky-300 font-semibold"
                      >
                        <Download className="h-3 w-3" />
                        다운로드
                      </Button>
                    </div>
                  ) : (
                    <div className="text-zinc-400 text-center py-3 text-xs">
                      등록된 견적제출파일이 없습니다. 상단 [견적파일 교체/신규 버전 등록]을 통해 등록해주세요.
                    </div>
                  )}
                </div>
              </div>

              {/* 상태 변경 바 */}
              <div className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-md border flex-wrap gap-2">
                <span className="font-bold text-zinc-700 dark:text-zinc-300">원청사 진행 상태 전환:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button 
                    onClick={() => handleUpdateStatus(selectedItem.id, "고객사제출완료")}
                    size="xs" 
                    variant="outline" 
                    className="h-6 text-[10px] border-sky-300 text-sky-700 hover:bg-sky-50"
                  >
                    고객사 제출완료
                  </Button>
                  <Button 
                    onClick={() => handleUpdateStatus(selectedItem.id, "원청사협의중")}
                    size="xs" 
                    variant="outline" 
                    className="h-6 text-[10px] border-purple-300 text-purple-700 hover:bg-purple-50"
                  >
                    단가 협의중
                  </Button>
                  <Button 
                    onClick={() => handleUpdateStatus(selectedItem.id, "고객 답변 대기")}
                    size="xs" 
                    variant="outline" 
                    className="h-6 text-[10px] border-blue-400 text-blue-800 bg-blue-50 hover:bg-blue-100 font-bold"
                  >
                    고객 답변 대기
                  </Button>
                  <Button 
                    onClick={() => handleUpdateStatus(selectedItem.id, "수주확정")}
                    size="xs" 
                    className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    수주 확정 (계약완료)
                  </Button>
                </div>
              </div>

              {/* 메모 입력 및 이력 영역 (댓글 제거, 영업/협의 메모로 대체) */}
              <div className="border rounded-md p-3 flex flex-col gap-2">
                <div className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-between pb-1 border-b">
                  <div className="flex items-center gap-1.5">
                    <Edit3 className="h-3.5 w-3.5 text-sky-600" />
                    <span>원청사 견적 협의 및 검토 메모 ({selectedItem.memos.length}건)</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-normal">고객사 미팅 및 단가 조율 기록</span>
                </div>

                {/* 메모 작성 인풋 */}
                <div className="flex items-start gap-1.5 bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded-md border">
                  <textarea 
                    value={newMemoText}
                    onChange={(e) => setNewMemoText(e.target.value)}
                    placeholder="원청사 미팅 내용, 네고 조건, 결제 조건, 특약 사항 등 협의 메모를 기록하세요..."
                    className="w-full h-14 p-2 text-xs bg-white dark:bg-zinc-900 border rounded-md resize-none"
                  />
                  <Button 
                    onClick={handleAddMemo} 
                    size="xs" 
                    className="h-14 px-3 bg-sky-600 hover:bg-sky-700 text-white text-xs shrink-0"
                  >
                    메모 저장
                  </Button>
                </div>

                {/* 메모 히스토리 목록 */}
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1 mt-1">
                  {selectedItem.memos.length === 0 ? (
                    <div className="text-zinc-400 text-center py-4 text-xs">등록된 협의 메모가 없습니다. 위 입력란에 메모를 남겨주세요.</div>
                  ) : (
                    selectedItem.memos.map((m) => (
                      <div key={m.id} className="p-2.5 rounded-md border bg-zinc-50/70 dark:bg-zinc-800/40 text-xs">
                        <div className="flex items-center justify-between font-bold mb-1">
                          <span className="text-sky-700 dark:text-sky-400 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {m.author}
                          </span>
                          <span className="text-[10px] font-normal text-zinc-400">{m.createdAt}</span>
                        </div>
                        <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">{m.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-t flex justify-end">
              <Button onClick={() => setIsDetailModalOpen(false)} className="h-7 text-xs px-4">
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Search, RefreshCw, Truck, CheckCircle2, XCircle, 
  Layers, ExternalLink, Download, UploadCloud, Eye, 
  X, Check, AlertTriangle, FileText, Factory, Clock, 
  ShieldCheck, ArrowRight, ArrowLeft, Calendar, AlertCircle, Wrench,
  FileCheck, DollarSign, PackageCheck, ShoppingCart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangeFilter, isWithinDateRange, DatePresetType } from "@/components/common/date-range-filter";

// 1. 양산 이벤트 상태 타입 (8/19 회의록: 양산중 / PM중 / 설계변경중 / 대기중)
type FacilityEventType = "양산중" | "PM중 (정기유지보수)" | "설계변경중 (A/S)" | "가동대기";

// 2. 외주 발주-생산-납품 통합 아이템 인터페이스 (8/14 엑셀 외주관리 시트 반영)
interface MassDeliveryItem {
  id: number;
  poNo: string;              // MPSI 양산발주번호 (PO) - 공정 12 PPAP 승인 시 자동 생성
  projectNo: string;         // MPSI 고객 관리번호 (NT5-2026-A 등)
  projectName: string;       // 차종 / 프로젝트명
  productName: string;       // 제품명
  massVendor: string;        // 사출양산사 (뉴몰드)
  moldNo: string;            // 적용 금형번호 (우성정공)
  machineNo: string;         // 뉴몰드 사출기 호기
  
  // 수량 및 진척 지표
  orderQty: number;          // 발주 수량 (EA)
  producedQty: number;       // 뉴몰드 누적 생산완료 수량
  inspectingQty: number;     // 출하검사 중 수량
  defectQty: number;         // 불량 수량
  deliverableQty: number;    // 납품 가능(양품) 수량
  deliveredQty: number;      // MPSI 기납품 수량
  holdQty: number;           // 승인 보류 수량
  remainingQty: number;      // 발주서별 납품 잔량 (발주량 - 기납품량)
  
  // 설비 이벤트 관리
  facilityEvent: FacilityEventType;
  eventPeriod?: string;      // PM 또는 설변 기간
  eventProgress?: number;    // 이벤트 진행율 (%)
  safetyStockQty?: number;   // 이벤트 대비 사전 안전재고 수량

  // 품질/수입검사 및 정산 상태 (MPSI 연계)
  oqcReportFile?: string;    // 뉴몰드 OQC 출하검사성적서
  statementNo?: string;      // 거래명세서 번호
  statementDate?: string;    // 거래명세서 발행일
  iqcStatus: "수입검사대기" | "수입검사합격" | "승인보류" | "납품불가(반품)";
  approvedInboundQty: number;// 수입검사 최종 승인 입고수량
  // 공정 13: 전자세금계산서 매입 정산 마감
  taxInvoiceNo?: string;     // 전자세금계산서 번호
  taxInvoiceStatus?: "정산대기" | "발행완료" | "정산마감";
  
  currentStep: number;       // 13단계 중 위치 (Step 13: 납품 및 정산)
  updatedAt: string;
}

// 13단계 프로세스 마일스톤
const PROCESS_STEPS = [
  { step: 1, name: "제품도면접수" },
  { step: 2, name: "도면검토/CAE" },
  { step: 3, name: "도면수정(DR)" },
  { step: 4, name: "금형제작발주" },
  { step: 5, name: "금형설계" },
  { step: 6, name: "소재발주/가공" },
  { step: 7, name: "금형완료/시사출" },
  { step: 8, name: "치수/외관검사" },
  { step: 9, name: "금형수정" },
  { step: 10, name: "금형승인/이관" },
  { step: 11, name: "양산승인사출" },
  { step: 12, name: "양산 OQC검증" },
  { step: 13, name: "양산승인/납품" },
];

// 초기 샘플 데이터 (PPAP 승인 후 생성된 정식 완제품 구매 PO 건들)
const initialDeliveries: MassDeliveryItem[] = [
  {
    id: 1,
    poNo: "PO-2026-0810-01",
    projectNo: "NT5-2026-A",
    projectName: "현대 NT5 도어 트림 모듈",
    productName: "Front Door Upper Cover LH/RH",
    massVendor: "(주)뉴몰드",
    moldNo: "WS-M-NT5-01",
    machineNo: "사출 3호기 (450T)",
    orderQty: 20000,
    producedQty: 12500,
    inspectingQty: 500,
    defectQty: 120,
    deliverableQty: 11880,
    deliveredQty: 8000,
    holdQty: 0,
    remainingQty: 12000,
    facilityEvent: "양산중",
    oqcReportFile: "OQC_Report_NT5_Lot0819.pdf",
    statementNo: "TR-NM-260819-01",
    statementDate: "2026-08-19",
    iqcStatus: "수입검사합격",
    approvedInboundQty: 8000,
    taxInvoiceNo: "TAX-NM-2026-08-01",
    taxInvoiceStatus: "정산마감",
    currentStep: 13,
    updatedAt: "2026-08-19 16:30",
  },
  {
    id: 2,
    poNo: "PO-2026-0815-02",
    projectNo: "A2XT-M01",
    projectName: "기아 A2XT 센터페시아 콘솔",
    productName: "Center Console Main Bracket",
    massVendor: "(주)한국정밀사출",
    moldNo: "DH-M-A2XT-02",
    machineNo: "사출 2호기 (280T)",
    orderQty: 15000,
    producedQty: 4500,
    inspectingQty: 200,
    defectQty: 85,
    deliverableQty: 4215,
    deliveredQty: 3000,
    holdQty: 200,
    remainingQty: 12000,
    facilityEvent: "PM중 (정기유지보수)",
    eventPeriod: "2026-08-19 ~ 2026-08-21 (3일간)",
    eventProgress: 40,
    safetyStockQty: 3500,
    oqcReportFile: "OQC_A2XT_Lot0818.pdf",
    statementNo: "TR-NM-260818-03",
    statementDate: "2026-08-18",
    iqcStatus: "승인보류",
    approvedInboundQty: 3000,
    taxInvoiceStatus: "정산대기",
    currentStep: 13,
    updatedAt: "2026-08-19 14:00",
  },
  {
    id: 3,
    poNo: "PO-2026-0801-03",
    projectNo: "SPX-EV-09",
    projectName: "SPX 전기차 배터리 모듈 하우징",
    productName: "BMS Battery Case Module",
    massVendor: "MPSI 자체생산라인",
    moldNo: "MPSI-M-SPX-04",
    machineNo: "사출 6호기 (650T)",
    orderQty: 30000,
    producedQty: 30000,
    inspectingQty: 0,
    defectQty: 240,
    deliverableQty: 29760,
    deliveredQty: 29760,
    holdQty: 0,
    remainingQty: 240,
    facilityEvent: "설계변경중 (A/S)",
    eventPeriod: "2026-08-18 ~ 2026-08-25 (7일간)",
    eventProgress: 60,
    safetyStockQty: 5000,
    oqcReportFile: "SPX_OQC_LotFinal.pdf",
    statementNo: "TR-NM-260817-02",
    statementDate: "2026-08-17",
    iqcStatus: "수입검사합격",
    approvedInboundQty: 29760,
    taxInvoiceNo: "TAX-NM-2026-08-02",
    taxInvoiceStatus: "정산마감",
    currentStep: 13,
    updatedAt: "2026-08-18 18:20",
  }
];

export default function MassProdDeliveryPage() {
  const [data, setData] = useState<MassDeliveryItem[]>(initialDeliveries);
  const [filterProjectNo, setFilterProjectNo] = useState("");
  const [filterProductName, setFilterProductName] = useState("");
  const [filterMassVendor, setFilterMassVendor] = useState("ALL");
  const [filterEvent, setFilterEvent] = useState("ALL");
  const [filterIqcStatus, setFilterIqcStatus] = useState("ALL");
  const [filterDateType, setFilterDateType] = useState<"statementDate" | "updatedAt">("statementDate");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePresetType>("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 상세/납품처리 모달
  const [selectedItem, setSelectedItem] = useState<MassDeliveryItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [formState, setFormState] = useState<Partial<MassDeliveryItem>>({});

  // 13단계 프로세스 다이어그램 모달
  const [diagramItem, setDiagramItem] = useState<MassDeliveryItem | null>(null);
  const [isDiagramModalOpen, setIsDiagramModalOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 공정 12(PPAP 양산승인)에서 자동 생성된 PO 건 동기화
  const syncApprovedDeliveries = (notify = false) => {
    try {
      const storedRaw = localStorage.getItem("mpsi_approved_deliveries");
      if (storedRaw) {
        const storedItems: MassDeliveryItem[] = JSON.parse(storedRaw);
        if (storedItems && storedItems.length > 0) {
          setData(prev => {
            const existingPoNos = new Set(prev.map(p => p.poNo));
            const newItems = storedItems.filter(item => !existingPoNos.has(item.poNo));
            if (newItems.length > 0) {
              if (notify) {
                showToast(`[PPAP 승인 연동] 양산 승인(Pass) 확정된 신규 발주서 [${newItems.map(n => n.poNo).join(", ")}] ${newItems.length}건이 그리드로 자동 이관되었습니다.`);
              }
              return [...newItems, ...prev];
            } else if (notify) {
              showToast("현재 모든 PPAP 승인 완료 발주서가 이미 반영되어 있습니다.");
            }
            return prev;
          });
        } else if (notify) {
          showToast("새로 불러올 신규 PPAP 승인 발주 데이터가 없습니다.");
        }
      } else if (notify) {
        showToast("새로 불러올 신규 PPAP 승인 발주 데이터가 없습니다.");
      }
    } catch (err) {
      console.error("Delivery sync error:", err);
    }
  };

  useEffect(() => {
    syncApprovedDeliveries(false);
  }, []);

  // 검색
  const handleSearch = () => {
    const filtered = initialDeliveries.filter((item) => {
      const matchNo = filterProjectNo ? item.projectNo.toLowerCase().includes(filterProjectNo.toLowerCase()) : true;
      const matchProd = filterProductName ? item.productName.includes(filterProductName) : true;
      const matchMass = filterMassVendor !== "ALL" ? item.massVendor === filterMassVendor : true;
      const matchEvent = filterEvent !== "ALL" ? item.facilityEvent === filterEvent : true;
      const matchIqc = filterIqcStatus !== "ALL" ? item.iqcStatus === filterIqcStatus : true;
      const targetDate = item[filterDateType] || "";
      const matchDate = isWithinDateRange(targetDate, filterDateFrom, filterDateTo);
      return matchNo && matchProd && matchMass && matchEvent && matchIqc && matchDate;
    });
    setData(filtered);
  };

  const handleReset = () => {
    setFilterProjectNo("");
    setFilterProductName("");
    setFilterMassVendor("ALL");
    setFilterEvent("ALL");
    setFilterIqcStatus("ALL");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSelectedDatePreset("all");
    setData(initialDeliveries);
  };

  // 상세 모달 열기
  const handleOpenDetail = (item: MassDeliveryItem) => {
    setSelectedItem(item);
    setFormState({ ...item });
    setIsDetailModalOpen(true);
  };

  // 13단계 다이어그램 열기
  const handleOpenDiagram = (item: MassDeliveryItem) => {
    setDiagramItem(item);
    setIsDiagramModalOpen(true);
  };

  // 저장 및 수입검사 확정 처리
  const handleSaveDelivery = () => {
    if (!selectedItem) return;
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const updatedRemaining = (formState.orderQty || selectedItem.orderQty) - (formState.deliveredQty || selectedItem.deliveredQty);

    setData(data.map(item => item.id === selectedItem.id ? {
      ...item,
      ...formState,
      remainingQty: updatedRemaining >= 0 ? updatedRemaining : 0,
      updatedAt: dateStr,
    } as MassDeliveryItem : item));

    showToast(`[${selectedItem.poNo}] 양산 납품 및 수입검사 판정 내역이 성공적으로 저장되었습니다.`);
    setIsDetailModalOpen(false);
  };

  // 거래명세서 신규 발행 시뮬레이션
  const handleGenerateStatement = () => {
    const today = new Date();
    const stNo = `TR-NM-${String(today.getFullYear()).slice(2)}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-0${Math.floor(Math.random() * 9 + 1)}`;
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    setFormState({
      ...formState,
      statementNo: stNo,
      statementDate: dateStr,
      deliveredQty: (formState.deliveredQty || 0) + (formState.deliverableQty || 0),
      approvedInboundQty: (formState.approvedInboundQty || 0) + (formState.deliverableQty || 0),
      iqcStatus: "수입검사합격",
    });

    showToast(`${formState.massVendor || "사출 양산처"} 납품 거래명세서 [${stNo}]가 생성되어 MPSI 수입검사(IQC) 합격 처리되었습니다.`);
  };

  // 이벤트 배지
  const getEventBadge = (event: FacilityEventType) => {
    switch (event) {
      case "양산중":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 font-bold";
      case "PM중 (정기유지보수)":
        return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300";
      case "설계변경중 (A/S)":
        return "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300";
      default:
        return "bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400";
    }
  };

  // 수입검사 배지
  const getIqcBadge = (status: MassDeliveryItem["iqcStatus"]) => {
    switch (status) {
      case "수입검사합격":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 font-bold";
      case "승인보류":
        return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300";
      case "납품불가(반품)":
        return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 font-bold";
      default:
        return "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300";
    }
  };

  // 통계 계산
  const totalCount = data.length;
  const runningCount = data.filter(d => d.facilityEvent === "양산중").length;
  const iqcPassCount = data.filter(d => d.iqcStatus === "수입검사합격").length;
  const taxClosedCount = data.filter(d => d.taxInvoiceStatus === "정산마감").length;

  return (
    <div className="flex flex-col gap-3 text-xs relative pb-8">
      {/* 토스트 알림창 */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-zinc-900 text-white px-4 py-2.5 rounded-lg shadow-xl border border-sky-500/40 text-xs animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-sky-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 표준 SCM 프로세스 공정 설명 배너 */}
      <div className="bg-gradient-to-r from-sky-50 via-teal-50 to-white dark:from-sky-950/40 dark:via-zinc-900 dark:to-zinc-900 border border-sky-200 dark:border-sky-800 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-2.5">
          <Truck className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sky-950 dark:text-sky-100 text-sm">
                [공정 13] 완제품 수입검사(IQC), 납품 입고 승인 및 전자세금계산서 정산 마감
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-600 text-white font-mono">
                PPAP 승인 PO 자동 연동 대장
              </span>
            </div>
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400 block mt-0.5">
              공정 12에서 <b className="text-zinc-800 dark:text-zinc-200">[양산승인(PPAP Pass)]</b> 확정 시 자동 발행된 완제품 구매발주서(PO)를 기준으로, 
              ① 사출 양산처 완제품 납품 출하 및 MPSI 창고 입고 수입검사(IQC), ② 납품 거래명세서 확인, ③ 월마감 전자세금계산서 매입 정산 및 회계 마감을 완결합니다.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button 
            onClick={() => syncApprovedDeliveries(true)}
            variant="outline"
            className="h-8 px-2.5 text-xs gap-1 border-sky-300 text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950 font-bold"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>PPAP 승인 PO 불러오기</span>
          </Button>
          <Link href="/portal/mass-prod/ppap">
            <Button size="xs" variant="outline" className="h-8 px-2.5 text-[11px] gap-1 text-zinc-600">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>2. PPAP 양산승인</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 1. 상단 검색 및 필터 바 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex flex-col gap-2.5">
        {/* 상단 기간조회 바 */}
        <div className="pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <DateRangeFilter
            dateType={filterDateType}
            onDateTypeChange={(v) => setFilterDateType(v as any)}
            dateTypeOptions={[
              { label: "거래명세서 발행일", value: "statementDate" },
              { label: "최근 갱신일", value: "updatedAt" },
            ]}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">관리번호</span>
            <Input 
              value={filterProjectNo} 
              onChange={(e) => setFilterProjectNo(e.target.value)} 
              placeholder="예: NT5, A2XT, SPX, FF" 
              className="h-7 text-xs font-mono" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">제품명</span>
            <Input 
              value={filterProductName} 
              onChange={(e) => setFilterProductName(e.target.value)} 
              placeholder="제품명 검색" 
              className="h-7 text-xs" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">사출 양산처</span>
            <select 
              value={filterMassVendor} 
              onChange={(e) => setFilterMassVendor(e.target.value)} 
              className="h-7 rounded-md border bg-white dark:bg-zinc-800 px-2 text-xs text-zinc-800 dark:text-zinc-200"
            >
              <option value="ALL">전체 양산처</option>
              <option value="(주)뉴몰드">(주)뉴몰드</option>
              <option value="(주)한국정밀사출">(주)한국정밀사출</option>
              <option value="MPSI 자체생산라인">MPSI 자체생산라인</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">설비/이벤트 상태</span>
            <select 
              value={filterEvent} 
              onChange={(e) => setFilterEvent(e.target.value)} 
              className="h-7 rounded-md border bg-white dark:bg-zinc-800 px-2 text-xs text-zinc-800 dark:text-zinc-200"
            >
              <option value="ALL">전체 이벤트</option>
              <option value="양산중">양산중</option>
              <option value="PM중 (정기유지보수)">PM중 (정기유지보수)</option>
              <option value="설계변경중 (A/S)">설계변경중 (A/S)</option>
              <option value="가동대기">가동대기</option>
            </select>
          </div>
          <div className="flex items-end gap-1.5">
            <Button onClick={handleReset} variant="outline" className="h-7 px-3 gap-1 text-xs text-zinc-600">
              <RefreshCw className="h-3.5 w-3.5" />
              초기화
            </Button>
            <Button onClick={handleSearch} className="h-7 px-4 bg-sky-600 hover:bg-sky-700 text-white gap-1 text-xs flex-1 font-medium">
              <Search className="h-3.5 w-3.5" />
              검색
            </Button>
          </div>
        </div>
      </div>

      {/* 2. 메인 데이터 그리드 (8/19 통합 요구사항: 발주현황 + 납품등록 + 이벤트관리 일원화) */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs overflow-hidden flex flex-col min-h-[480px]">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b">
          <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-100">
            <Truck className="h-4 w-4 text-sky-600" />
            <span>완제품 양산 납품 입고(IQC) 및 세금계산서 정산 대장 (공정 13)</span>
            <span className="text-[11px] font-normal text-zinc-500 ml-1">
              (총 <b className="text-sky-600 font-mono font-bold">{data.length}</b>건)
            </span>
          </div>
          <span className="text-[11px] text-zinc-500 hidden sm:inline">
            * <b className="text-sky-600 font-bold">PPAP 승인(Pass)</b> 완료 건에 한하여 정식 완제품 구매 PO가 생성되어 납품/정산이 진행됩니다.
          </span>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full border-collapse text-left border-spacing-0 whitespace-nowrap">
            <thead className="sticky top-0 bg-[#2d3748] text-white text-[11px] z-10">
              <tr>
                <th className="p-1.5 w-10 text-center border-r border-slate-600">No</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[125px]">구매 발주번호 (PO)</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px]">프로젝트 번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[150px]">제품명</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[100px] text-center">사출 양산처</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px]">양산설비</th>
                
                {/* 수량 관련 지표 */}
                <th className="p-1.5 border-r border-slate-600 min-w-[90px] text-right">발주수량</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px] text-right">생산완료</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[95px] text-right text-emerald-300">납품가능(양품)</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px] text-right text-sky-300">기납품수량</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[95px] text-right text-amber-300 font-bold bg-slate-700/60">발주잔량</th>
                
                {/* 이벤트 및 수입검사 상태 */}
                <th className="p-1.5 border-r border-slate-600 min-w-[125px] text-center">설비/이벤트 상태</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[100px] text-center">MPSI 수입검사</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px]">거래명세서</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[100px] text-center">세금계산서</th>
                <th className="p-1.5 min-w-[90px] text-center">납품/검수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px]">
              {data.map((row, idx) => (
                <tr key={row.id} className="hover:bg-sky-50/70 dark:hover:bg-zinc-800/60 transition-colors odd:bg-white even:bg-zinc-50/40 dark:odd:bg-zinc-900 dark:even:bg-zinc-900/50">
                  <td className="p-1.5 text-center font-mono text-zinc-400 border-r">{idx + 1}</td>
                  
                  {/* 발주번호 */}
                  <td className="p-1.5 border-r font-mono font-bold text-sky-600 flex items-center gap-1">
                    <ShoppingCart className="h-3 w-3 text-sky-500 shrink-0" />
                    <span>{row.poNo}</span>
                  </td>
                  
                  {/* 관리번호 클릭 -> 13단계 다이어그램 */}
                  <td className="p-1.5 border-r font-mono font-bold text-zinc-900 dark:text-zinc-100 hover:underline cursor-pointer">
                    <button onClick={() => handleOpenDiagram(row)} className="flex items-center gap-1">
                      <span>{row.projectNo}</span>
                      <ExternalLink className="h-3 w-3 text-sky-400" />
                    </button>
                  </td>

                  <td className="p-1.5 border-r font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[150px]" title={row.productName}>{row.productName}</td>
                  
                  {/* 사출 양산처 뱃지 */}
                  <td className="p-1.5 border-r text-center">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                      {row.massVendor}
                    </span>
                  </td>

                  <td className="p-1.5 border-r text-zinc-600">{row.machineNo}</td>

                  {/* 수량 5종 */}
                  <td className="p-1.5 border-r text-right font-mono font-bold">{row.orderQty.toLocaleString()}</td>
                  <td className="p-1.5 border-r text-right font-mono">{row.producedQty.toLocaleString()}</td>
                  <td className="p-1.5 border-r text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{row.deliverableQty.toLocaleString()}</td>
                  <td className="p-1.5 border-r text-right font-mono font-bold text-sky-600 dark:text-sky-400">{row.deliveredQty.toLocaleString()}</td>
                  
                  {/* 발주 잔량 */}
                  <td className="p-1.5 border-r text-right font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/10">
                    {row.remainingQty.toLocaleString()}
                  </td>

                  {/* 설비 이벤트 */}
                  <td className="p-1.5 border-r text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] border ${getEventBadge(row.facilityEvent)}`}>
                      {row.facilityEvent}
                    </span>
                  </td>

                  {/* 수입검사 상태 */}
                  <td className="p-1.5 border-r text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] border ${getIqcBadge(row.iqcStatus)}`}>
                      {row.iqcStatus}
                    </span>
                  </td>

                  {/* 거래명세서 */}
                  <td className="p-1.5 border-r font-mono text-[10px] text-zinc-500 truncate max-w-[110px]">
                    {row.statementNo && row.statementNo !== "-" ? (
                      <span className="text-zinc-700 dark:text-zinc-300 font-bold">{row.statementNo}</span>
                    ) : (
                      <span className="text-zinc-400">발행대기</span>
                    )}
                  </td>

                  {/* 세금계산서 */}
                  <td className="p-1.5 border-r text-center">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      row.taxInvoiceStatus === "정산마감" 
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                        : "bg-zinc-100 text-zinc-500"
                    }`}>
                      {row.taxInvoiceStatus || "정산대기"}
                    </span>
                  </td>

                  {/* 액션 버튼 */}
                  <td className="p-1.5 text-center">
                    <Button 
                      onClick={() => handleOpenDetail(row)} 
                      size="xs" 
                      variant="outline" 
                      className="h-6 px-2 text-[10px] gap-1 bg-white hover:bg-zinc-100 dark:bg-zinc-800"
                    >
                      <Eye className="h-3 w-3 text-zinc-500" />
                      처리/검수
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. [모달 1] 상세 납품등록, 수입검사(IQC) 및 거래명세서 처리 모달 */}
      {isDetailModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-3xl rounded-lg shadow-xl border overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 text-white">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-xs">
                  완제품 납품 입고 검수 및 수입검사(IQC) 처리 [{selectedItem.poNo}]
                </h3>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs">
              {/* 프로젝트 & 발주 기본정보 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded border text-[11px]">
                <div><span className="text-zinc-500">발주번호 (PO):</span> <b className="font-mono text-sky-600">{selectedItem.poNo}</b></div>
                <div><span className="text-zinc-500">프로젝트 번호:</span> <b className="font-mono">{selectedItem.projectNo}</b></div>
                <div><span className="text-zinc-500">제품명:</span> <b className="text-zinc-900 dark:text-zinc-100">{selectedItem.productName}</b></div>
                <div><span className="text-zinc-500">사출협력사:</span> <b>{selectedItem.massVendor}</b> ({selectedItem.machineNo})</div>
              </div>

              {/* 1. 수량 진척 및 납품 실적 관리 */}
              <div className="border rounded p-3 flex flex-col gap-2.5 bg-sky-50/20 dark:bg-sky-950/10">
                <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center justify-between">
                  <span>1. 발주 수량 및 납품 진척 현황</span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    발주 잔량: {((formState.orderQty || selectedItem.orderQty) - (formState.deliveredQty || selectedItem.deliveredQty)).toLocaleString()} EA
                  </span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                  <div className="p-2 border rounded bg-white dark:bg-zinc-900">
                    <span className="text-[10px] text-zinc-500">총 발주수량</span>
                    <div className="text-sm font-bold font-mono mt-0.5">
                      {formState.orderQty?.toLocaleString()} EA
                    </div>
                  </div>
                  <div className="p-2 border rounded bg-white dark:bg-zinc-900">
                    <span className="text-[10px] text-zinc-500">생산수량</span>
                    <div className="text-sm font-bold font-mono mt-0.5 text-zinc-700 dark:text-zinc-300">
                      {formState.producedQty?.toLocaleString()} EA
                    </div>
                  </div>
                  <div className="p-2 border rounded bg-white dark:bg-zinc-900">
                    <span className="text-[10px] text-zinc-500">납품가능(양품)</span>
                    <div className="text-sm font-bold font-mono mt-0.5 text-emerald-600">
                      {formState.deliverableQty?.toLocaleString()} EA
                    </div>
                  </div>
                  <div className="p-2 border rounded bg-white dark:bg-zinc-900">
                    <span className="text-[10px] text-zinc-500">MPSI 기납품수량</span>
                    <div className="text-sm font-bold font-mono mt-0.5 text-sky-600">
                      {formState.deliveredQty?.toLocaleString()} EA
                    </div>
                  </div>
                  <div className="p-2 border rounded bg-amber-50 dark:bg-amber-950/20 border-amber-200">
                    <span className="text-[10px] text-amber-700 dark:text-amber-400">납품 잔량</span>
                    <div className="text-sm font-bold font-mono mt-0.5 text-amber-700 dark:text-amber-400">
                      {((formState.orderQty || 0) - (formState.deliveredQty || 0)).toLocaleString()} EA
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. MPSI 수입검사(IQC) 및 거래명세서 처리 */}
              <div className="border rounded p-3 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                    <FileCheck className="h-4 w-4 text-sky-600" />
                    2. MPSI 물류 입고 수입검사(IQC) 및 거래명세서 인수 확인
                  </h4>
                  <Button 
                    onClick={handleGenerateStatement} 
                    size="xs" 
                    variant="outline" 
                    className="h-6 px-2 text-[10px] gap-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                  >
                    <PackageCheck className="h-3 w-3" />
                    {formState.massVendor || "사출 양산처"} 납품 거래명세서 승인/인수
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-zinc-600 dark:text-zinc-400 font-medium">수입검사(IQC) 판정</label>
                    <select 
                      value={formState.iqcStatus} 
                      onChange={(e) => setFormState({ ...formState, iqcStatus: e.target.value as any })}
                      className="h-7 rounded border bg-transparent px-2 text-xs font-bold"
                    >
                      <option value="수입검사대기">수입검사대기</option>
                      <option value="수입검사합격">수입검사합격 (입고 승인)</option>
                      <option value="승인보류">승인보류</option>
                      <option value="납품불가(반품)">납품불가(반품)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-zinc-600 dark:text-zinc-400 font-medium">최종 입고 승인수량 (EA)</label>
                    <Input 
                      type="number" 
                      value={formState.approvedInboundQty || 0} 
                      onChange={(e) => setFormState({ ...formState, approvedInboundQty: Number(e.target.value) })}
                      className="h-7 text-xs font-mono font-bold text-emerald-600" 
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-zinc-600 dark:text-zinc-400 font-medium">거래명세서 번호</label>
                    <Input 
                      value={formState.statementNo || ""} 
                      onChange={(e) => setFormState({ ...formState, statementNo: e.target.value })}
                      placeholder="TR-NM-..." 
                      className="h-7 text-xs font-mono" 
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-zinc-50 dark:bg-zinc-800/40 text-[11px]">
                  <span className="text-zinc-500">첨부 OQC 출하검사 성적서:</span>
                  <span className="font-mono text-sky-600 font-medium">{selectedItem.oqcReportFile || "미첨부"}</span>
                </div>
              </div>

              {/* 3. 사출 설비 이벤트 관리 (PM/설변) */}
              <div className="border rounded p-3 flex flex-col gap-3">
                <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                  <Wrench className="h-4 w-4 text-purple-600" />
                  3. {formState.massVendor || "사출 양산처"} 사출기 설비 이벤트 관제 (유지보수 / 설계변경)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-zinc-600 dark:text-zinc-400 font-medium">설비 상태 구분</label>
                    <select 
                      value={formState.facilityEvent} 
                      onChange={(e) => setFormState({ ...formState, facilityEvent: e.target.value as any })}
                      className="h-7 rounded border bg-transparent px-2 text-xs"
                    >
                      <option value="양산중">양산중</option>
                      <option value="PM중 (정기유지보수)">PM중 (정기유지보수)</option>
                      <option value="설계변경중 (A/S)">설계변경중 (A/S)</option>
                      <option value="가동대기">가동대기</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-zinc-600 dark:text-zinc-400 font-medium">사전 확보 안전재고 (EA)</label>
                    <Input 
                      type="number" 
                      value={formState.safetyStockQty || 0} 
                      onChange={(e) => setFormState({ ...formState, safetyStockQty: Number(e.target.value) })}
                      className="h-7 text-xs font-mono" 
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-zinc-600 dark:text-zinc-400 font-medium">정산 마감 상태</label>
                    <select 
                      value={formState.taxInvoiceStatus} 
                      onChange={(e) => setFormState({ ...formState, taxInvoiceStatus: e.target.value as any })}
                      className="h-7 rounded border bg-transparent px-2 text-xs"
                    >
                      <option value="정산대기">정산대기</option>
                      <option value="발행완료">세금계산서 발행완료</option>
                      <option value="정산마감">월정산 마감완료</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800 border-t">
              <Button onClick={() => setIsDetailModalOpen(false)} variant="outline" className="h-8 px-3 text-xs">
                취소
              </Button>
              <Button 
                onClick={handleSaveDelivery} 
                className="h-8 px-4 text-xs bg-sky-600 hover:bg-sky-700 text-white gap-1.5 font-bold"
              >
                <Check className="h-3.5 w-3.5" />
                저장 및 수입검사 판정 완료
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. [모달 2] 13단계 프로세스 다이어그램 모달 */}
      {isDiagramModalOpen && diagramItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-lg shadow-2xl border overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#1e293b] text-white">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-xs">
                  전체 13단계 금형/사출 프로세스 진행 현황 다이어그램
                </h3>
              </div>
              <button onClick={() => setIsDiagramModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6 overflow-y-auto">
              <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg border text-xs">
                <div className="flex items-center gap-4">
                  <div><span className="text-zinc-500">발주번호:</span> <b className="font-mono text-sky-600 text-sm ml-1">{diagramItem.poNo}</b></div>
                  <div className="h-4 w-px bg-zinc-300" />
                  <div><span className="text-zinc-500">제품명:</span> <b className="text-zinc-900 dark:text-zinc-100 ml-1">{diagramItem.productName}</b></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">현재 위치:</span>
                  <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-bold text-xs">
                    {diagramItem.currentStep}단계 : {PROCESS_STEPS.find(s => s.step === diagramItem.currentStep)?.name}
                  </span>
                </div>
              </div>

              {/* 13단계 타임라인 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {PROCESS_STEPS.map((item) => {
                  const isCurrent = item.step === diagramItem.currentStep;
                  const isCompleted = item.step < diagramItem.currentStep;

                  return (
                    <div 
                      key={item.step}
                      className={`flex flex-col p-2.5 rounded-md border text-center relative transition-all ${
                        isCurrent 
                          ? "bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-300 scale-105 z-10" 
                          : isCompleted 
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300" 
                          : "bg-zinc-50 text-zinc-400 border-zinc-200 dark:bg-zinc-800/40 dark:border-zinc-800"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                        <span>Step {item.step}</span>
                        {isCompleted && <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />}
                        {isCurrent && <Clock className="h-3 w-3 text-white animate-pulse" />}
                      </div>
                      <span className="font-bold text-[11px] leading-tight truncate" title={item.name}>
                        {item.name}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 rounded-md p-3 text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
                <div>
                  <b className="text-sky-700 dark:text-sky-300">💡 최종 정산 완료:</b> Step 13은 완제품 수입검사(IQC), 거래명세서 인수 및 전자세금계산서 매입 마감 단계입니다.
                </div>
                <Button onClick={() => setIsDiagramModalOpen(false)} size="xs" className="h-6 px-3 bg-zinc-800 text-white text-[10px]">
                  확인 완료
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
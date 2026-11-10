"use client";

import React, { useState } from "react";
import { 
  Search, RefreshCw, ShoppingCart, Plus, 
  FileText, CheckCircle2, AlertTriangle, Download, 
  Eye, X, Check, Truck, Building2, Layers, 
  Package, Boxes, Calendar, ExternalLink, ArrowRight,
  ShieldCheck, FileCode, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DateRangeFilter, isWithinDateRange } from "@/components/common/date-range-filter";

// 1. 품목 구분 타입 (8/14 엑셀 시트 8대 품목 마스터 기준)
type ProcurementItemCategory = "원재료 (레진)" | "부자재" | "부품 (기계/금형)" | "소모품" | "구매완제품" | "구매반제품";

// 2. 구매 발주 품목 데이터 인터페이스
interface PurchaseOrderItem {
  id: number;
  poNo: string;              // 구매 발주번호 (PO-MAT-202608-001)
  projectNo: string;         // MPSI 고객 관리번호 (NT5-2026-A, A2XT-M01 등 직접 지정)
  projectName: string;       // 차종 / 프로젝트명
  category: ProcurementItemCategory; // 품목 구분
  itemCode: string;          // 품목 식별자
  itemName: string;          // 품목명 (규격/스펙 상세)
  vendorName: string;        // 공급업체명
  vendorCode: string;        // 공급처 식별자 (S시작)
  unit: string;              // 단위 (kg, EA, Set, Roll, Box)
  orderQty: number;          // 발주 수량
  unitPrice: number;         // 확정 단가 (원)
  totalPrice: number;        // 발주 총액 (원)
  orderDate: string;         // 발주일자 (공정 2)
  targetDeliveryDate: string;// 입고 희망일자
  
  // 입고 및 수입검사(IQC) 상태 (공정 10~21 연계)
  receivedQty: number;       // 실 입고 수량
  inboundWarehouse: string;  // 창고 분할 구역 (A~H 구역)
  lotNo?: string;            // 원재료 관리번호 / Lot No (공정 31)
  poStatus: "발주등록" | "발주서발송" | "수입검사대기" | "입고완료" | "발주취소";
  iqcResult?: "합격" | "보류" | "불합격"; // 수입검사 판정 (공정 20~21)
  dryingCondition?: string;  // 건조 조건 (공정 40: 온도/시간)
  notes?: string;            // 비고
  updatedAt: string;
}

// 13단계 프로세스 마일스톤 정의
const PROCESS_STEPS = [
  { step: 1, name: "제품도면접수" },
  { step: 2, name: "도면검토/CAE" },
  { step: 3, name: "도면수정(DR)" },
  { step: 4, name: "금형발주(PO)" },
  { step: 5, name: "금형설계" },
  { step: 6, name: "소재발주/가공" },
  { step: 7, name: "금형완료/시사출" },
  { step: 8, name: "치수/외관검사" },
  { step: 9, name: "금형수정" },
  { step: 10, name: "금형승인/이관" },
  { step: 11, name: "양산승인사출" },
  { step: 12, name: "양산/OQC검증" },
  { step: 13, name: "양산승인/납품" },
];

// 초기 샘플 데이터
const initialOrders: PurchaseOrderItem[] = [
  {
    id: 1,
    poNo: "PO-MAT-2608-01",
    projectNo: "NT5-2026-A",
    projectName: "현대 NT5 도어 트림 모듈",
    category: "원재료 (레진)",
    itemCode: "RESIN-PP-01",
    itemName: "PP-EPDM (LUPOX GP-2200 사출용)",
    vendorName: "LG화학 (소재영업)",
    vendorCode: "S-LGC-001",
    unit: "kg",
    orderQty: 5000,
    unitPrice: 2800,
    totalPrice: 14000000,
    orderDate: "2026-08-18",
    targetDeliveryDate: "2026-08-22",
    receivedQty: 5000,
    inboundWarehouse: "C구역 (원재료 보관고)",
    lotNo: "LGC-260818-PP01",
    poStatus: "입고완료",
    iqcResult: "합격",
    dryingCondition: "80℃, 3시간 건조 (공정 40)",
    notes: "사출 생산용 정품 수지 (공정 10 입고 완료)",
    updatedAt: "2026-08-19 11:20",
  },
  {
    id: 2,
    poNo: "PO-MAT-2608-02",
    projectNo: "A2XT-M01",
    projectName: "기아 A2XT 센터페시아 콘솔",
    category: "원재료 (레진)",
    itemCode: "RESIN-ABS-03",
    itemName: "ABS HI-121 (내열성형용 레진)",
    vendorName: "롯데케미칼",
    vendorCode: "S-LTC-004",
    unit: "kg",
    orderQty: 3000,
    unitPrice: 3200,
    totalPrice: 9600000,
    orderDate: "2026-08-19",
    targetDeliveryDate: "2026-08-25",
    receivedQty: 0,
    inboundWarehouse: "C구역 (원재료 보관고)",
    poStatus: "발주서발송",
    dryingCondition: "85℃, 4시간 건조 (공정 40)",
    notes: "A2XT 시양산 투입용 사급 수지 조달",
    updatedAt: "2026-08-19 14:00",
  },
  {
    id: 3,
    poNo: "PO-MAT-2608-03",
    projectNo: "SPX-EV-09",
    projectName: "SPX 전기차 배터리 모듈 하우징",
    category: "부자재",
    itemCode: "PKG-BX-09",
    itemName: "수출용 중량물 포장 카톤박스 (500*400*350)",
    vendorName: "한솔패키징",
    vendorCode: "S-HSP-012",
    unit: "EA",
    orderQty: 1000,
    unitPrice: 4500,
    totalPrice: 4500000,
    orderDate: "2026-08-16",
    targetDeliveryDate: "2026-08-20",
    receivedQty: 1000,
    inboundWarehouse: "G구역 (부자재 창고)",
    poStatus: "입고완료",
    iqcResult: "합격",
    notes: "공정 72 현품표 부착 및 100 팔레트 적재용",
    updatedAt: "2026-08-18 16:50",
  },
  {
    id: 4,
    poNo: "PO-MAT-2608-04",
    projectNo: "NT5-2026-A",
    projectName: "현대 NT5 도어 트림 모듈",
    category: "부품 (기계/금형)",
    itemCode: "PART-HT-02",
    itemName: "사출기 히터 밴드 450T용 (Ø80*120)",
    vendorName: "대성산업기계",
    vendorCode: "S-DSI-008",
    unit: "Set",
    orderQty: 4,
    unitPrice: 180000,
    totalPrice: 720000,
    orderDate: "2026-08-19",
    targetDeliveryDate: "2026-08-21",
    receivedQty: 0,
    inboundWarehouse: "F구역 (부품 보관고)",
    poStatus: "발주등록",
    notes: "공정 62 사출기 예방보전(PM) 예비품",
    updatedAt: "2026-08-19 17:00",
  }
];

export default function PurchaseProcurementPage() {
  const [data, setData] = useState<PurchaseOrderItem[]>(initialOrders);
  const [filterProjectNo, setFilterProjectNo] = useState("");
  const [filterItemName, setFilterItemName] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDateType, setFilterDateType] = useState("orderDate");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState("all");

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewRegister, setIsNewRegister] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PurchaseOrderItem | null>(null);

  // 13단계 프로세스 다이어그램 모달
  const [diagramProjectNo, setDiagramProjectNo] = useState("");
  const [isDiagramModalOpen, setIsDiagramModalOpen] = useState(false);

  // 폼 상태
  const [formState, setFormState] = useState<Partial<PurchaseOrderItem>>({
    poNo: "",
    projectNo: "",
    projectName: "",
    category: "원재료 (레진)",
    itemCode: "",
    itemName: "",
    vendorName: "",
    vendorCode: "",
    unit: "kg",
    orderQty: 1000,
    unitPrice: 0,
    totalPrice: 0,
    orderDate: "",
    targetDeliveryDate: "",
    receivedQty: 0,
    inboundWarehouse: "C구역 (원재료 보관고)",
    poStatus: "발주등록",
    dryingCondition: "",
    notes: "",
  });

  // 검색
  const handleSearch = () => {
    const filtered = initialOrders.filter((item) => {
      const matchNo = filterProjectNo ? item.projectNo.toLowerCase().includes(filterProjectNo.toLowerCase()) : true;
      const matchName = filterItemName ? item.itemName.includes(filterItemName) : true;
      const matchCat = filterCategory !== "ALL" ? item.category === filterCategory : true;
      const matchStatus = filterStatus !== "ALL" ? item.poStatus === filterStatus : true;
      const targetDate = 
        filterDateType === "targetDeliveryDate" 
          ? item.targetDeliveryDate 
          : filterDateType === "updatedAt"
          ? item.updatedAt
          : item.orderDate;
      const matchDate = isWithinDateRange(targetDate, filterDateFrom, filterDateTo);
      return matchNo && matchName && matchCat && matchStatus && matchDate;
    });
    setData(filtered);
  };

  const handleReset = () => {
    setFilterProjectNo("");
    setFilterItemName("");
    setFilterCategory("ALL");
    setFilterStatus("ALL");
    setFilterDateType("orderDate");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSelectedDatePreset("all");
    setData(initialOrders);
  };

  // 신규 발주 모달 열기
  const handleOpenNewModal = () => {
    setIsNewRegister(true);
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const nextPoNo = `PO-MAT-${String(today.getFullYear()).slice(2)}${String(today.getMonth() + 1).padStart(2, "0")}-0${data.length + 1}`;

    setFormState({
      poNo: nextPoNo,
      projectNo: "NT5-2026-A",
      projectName: "현대 NT5 도어 트림 모듈",
      category: "원재료 (레진)",
      itemCode: "RESIN-PP-02",
      itemName: "PP-GF30 (유리섬유 30% 강화 레진)",
      vendorName: "LG화학 (소재영업)",
      vendorCode: "S-LGC-001",
      unit: "kg",
      orderQty: 2000,
      unitPrice: 3500,
      totalPrice: 7000000,
      orderDate: dateStr,
      targetDeliveryDate: dateStr,
      receivedQty: 0,
      inboundWarehouse: "C구역 (원재료 보관고)",
      poStatus: "발주등록",
      dryingCondition: "80℃, 3시간 건조",
      notes: "사출 생산용 정품 수지 발주 (공정 2)",
    });
    setIsModalOpen(true);
  };

  // 상세 모달 열기
  const handleOpenDetail = (item: PurchaseOrderItem) => {
    setIsNewRegister(false);
    setSelectedItem(item);
    setFormState({ ...item });
    setIsModalOpen(true);
  };

  // 13단계 다이어그램 열기
  const handleOpenDiagram = (pNo: string) => {
    setDiagramProjectNo(pNo);
    setIsDiagramModalOpen(true);
  };

  // 저장 처리
  const handleSaveForm = () => {
    if (!formState.projectNo?.trim()) {
      alert("고객사 지정 관리번호(프로젝트코드)를 입력해주세요.");
      return;
    }
    if (!formState.itemName?.trim()) {
      alert("구매 품목명을 입력해주세요.");
      return;
    }

    const calculatedTotal = (Number(formState.orderQty) || 0) * (Number(formState.unitPrice) || 0);
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    if (isNewRegister) {
      const newItem: PurchaseOrderItem = {
        id: data.length + 1,
        poNo: formState.poNo || `PO-MAT-2608-0${data.length + 1}`,
        projectNo: formState.projectNo || "",
        projectName: formState.projectName || "",
        category: formState.category as ProcurementItemCategory || "원재료 (레진)",
        itemCode: formState.itemCode || "ITEM-NEW",
        itemName: formState.itemName || "",
        vendorName: formState.vendorName || "거래처",
        vendorCode: formState.vendorCode || "S-001",
        unit: formState.unit || "kg",
        orderQty: Number(formState.orderQty || 0),
        unitPrice: Number(formState.unitPrice || 0),
        totalPrice: calculatedTotal,
        orderDate: formState.orderDate || dateStr.slice(0, 10),
        targetDeliveryDate: formState.targetDeliveryDate || dateStr.slice(0, 10),
        receivedQty: Number(formState.receivedQty || 0),
        inboundWarehouse: formState.inboundWarehouse || "C구역 (원재료 보관고)",
        poStatus: formState.poStatus as any || "발주등록",
        dryingCondition: formState.dryingCondition || "",
        notes: formState.notes || "",
        updatedAt: dateStr,
      };
      setData([newItem, ...data]);
      alert("구매 발주서가 성공적으로 발행 및 등록되었습니다.");
    } else if (selectedItem) {
      setData(data.map(item => item.id === selectedItem.id ? {
        ...item,
        ...formState,
        totalPrice: calculatedTotal,
        updatedAt: dateStr,
      } as PurchaseOrderItem : item));
      alert("구매 발주 및 입고/검수 정보가 수정되었습니다.");
    }
    setIsModalOpen(false);
  };

  // 상태 배지
  const getPoStatusBadge = (status: PurchaseOrderItem["poStatus"]) => {
    switch (status) {
      case "입고완료":
        return "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300";
      case "발주서발송":
        return "bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-950 dark:text-sky-300";
      case "수입검사대기":
        return "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300";
      case "발주취소":
        return "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300";
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 1. 상단 검색 필터 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex flex-col gap-2">
        <div className="pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <DateRangeFilter
            startDate={filterDateFrom}
            endDate={filterDateTo}
            onStartDateChange={setFilterDateFrom}
            onEndDateChange={setFilterDateTo}
            selectedPreset={selectedDatePreset}
            onPresetChange={setSelectedDatePreset}
            dateType={filterDateType}
            onDateTypeChange={setFilterDateType}
            dateTypeOptions={[
              { value: "orderDate", label: "발주일자" },
              { value: "targetDeliveryDate", label: "입고희망일" },
              { value: "updatedAt", label: "수정일시" },
            ]}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">관리번호 (고객 PJT코드)</span>
            <Input 
              value={filterProjectNo} 
              onChange={(e) => setFilterProjectNo(e.target.value)} 
              placeholder="예: NT5, A2XT, SPX" 
              className="h-7 text-xs font-mono" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">구매 품목명</span>
            <Input 
              value={filterItemName} 
              onChange={(e) => setFilterItemName(e.target.value)} 
              placeholder="레진, 박스, 부품명" 
              className="h-7 text-xs" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">품목 구분 (8종 기준)</span>
            <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)} 
              className="h-7 rounded-md border bg-transparent px-2 text-xs font-medium"
            >
              <option value="ALL">전체 품목구분</option>
              <option value="원재료 (레진)">원재료 (레진)</option>
              <option value="부자재">부자재 (포장/라벨)</option>
              <option value="부품 (기계/금형)">부품 (기계/금형)</option>
              <option value="소모품">소모품</option>
              <option value="구매완제품">구매완제품</option>
              <option value="구매반제품">구매반제품</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">발주/입고 상태</span>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)} 
              className="h-7 rounded-md border bg-transparent px-2 text-xs font-medium"
            >
              <option value="ALL">전체 상태</option>
              <option value="발주등록">발주등록</option>
              <option value="발주서발송">발주서발송</option>
              <option value="수입검사대기">수입검사대기</option>
              <option value="입고완료">입고완료</option>
            </select>
          </div>
          <div className="flex items-end gap-1.5">
            <Button onClick={handleSearch} className="h-7 px-3 bg-sky-600 hover:bg-sky-700 text-white gap-1 text-xs flex-1">
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

      {/* 2. 메인 데이터 그리드 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs overflow-hidden flex flex-col min-h-[480px]">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b">
          <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-100">
            <ShoppingCart className="h-4 w-4 text-sky-600" />
            <span>원부자재 및 부품 구매 발주 관리대장 (공정 0~21 연계)</span>
            <span className="text-[11px] font-normal text-zinc-500 ml-1">
              (총 <b className="text-sky-600 font-mono">{data.length}</b>건)
            </span>
          </div>
          <Button onClick={handleOpenNewModal} size="xs" className="h-7 px-2.5 bg-sky-600 hover:bg-sky-700 text-white gap-1 text-xs">
            <Plus className="h-3.5 w-3.5" />
            신규 구매발주(PO) 등록
          </Button>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full border-collapse text-left border-spacing-0 whitespace-nowrap">
            <thead className="sticky top-0 bg-[#2d3748] text-white text-[11px] z-10">
              <tr>
                <th className="p-1.5 w-10 text-center border-r border-slate-600">No</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[120px]">발주번호 (PO)</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px]">고객 관리번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[100px]">품목구분</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[180px]">품목명 (규격/스펙)</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[120px]">공급업체</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[85px] text-right">발주수량</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[85px] text-right">확정단가</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[100px] text-right bg-slate-700">발주금액</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px] text-center">발주일자</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px] text-center">입고희망일</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px]">입고창고(구역)</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px] text-center">발주상태</th>
                <th className="p-1.5 min-w-[90px] text-center">발주서/입고</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px]">
              {data.map((row, idx) => (
                <tr key={row.id} className="hover:bg-sky-50/70 dark:hover:bg-zinc-800/60 transition-colors odd:bg-white even:bg-zinc-50/40 dark:odd:bg-zinc-900 dark:even:bg-zinc-900/50">
                  <td className="p-1.5 text-center font-mono text-zinc-400 border-r">{idx + 1}</td>
                  <td className="p-1.5 border-r font-mono font-medium text-sky-600">{row.poNo}</td>
                  
                  {/* 관리번호 클릭 -> 13단계 다이어그램 */}
                  <td className="p-1.5 border-r font-mono font-bold text-zinc-900 dark:text-zinc-100 hover:underline cursor-pointer">
                    <button onClick={() => handleOpenDiagram(row.projectNo)} className="flex items-center gap-1">
                      <span>{row.projectNo}</span>
                      <ExternalLink className="h-3 w-3 text-sky-400" />
                    </button>
                  </td>

                  <td className="p-1.5 border-r">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-zinc-800 font-medium">
                      {row.category}
                    </span>
                  </td>

                  <td className="p-1.5 border-r font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[180px]" title={row.itemName}>
                    {row.itemName}
                  </td>
                  
                  <td className="p-1.5 border-r truncate max-w-[120px]" title={row.vendorName}>
                    {row.vendorName}
                  </td>

                  <td className="p-1.5 border-r text-right font-mono font-bold">
                    {row.orderQty.toLocaleString()} <span className="text-[10px] font-normal text-zinc-400">{row.unit}</span>
                  </td>

                  <td className="p-1.5 border-r text-right font-mono">
                    {row.unitPrice.toLocaleString()}원
                  </td>

                  <td className="p-1.5 border-r text-right font-mono font-bold text-sky-700 dark:text-sky-400 bg-sky-50/30 dark:bg-sky-950/10">
                    {row.totalPrice.toLocaleString()}원
                  </td>

                  <td className="p-1.5 border-r text-center font-mono text-zinc-500">{row.orderDate}</td>
                  <td className="p-1.5 border-r text-center font-mono text-amber-600">{row.targetDeliveryDate}</td>
                  <td className="p-1.5 border-r truncate max-w-[110px]" title={row.inboundWarehouse}>{row.inboundWarehouse}</td>

                  {/* 상태 배지 */}
                  <td className="p-1.5 border-r text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPoStatusBadge(row.poStatus)}`}>
                      {row.poStatus}
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
                      발주/입고
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. [모달 1] 구매 발주서 등록 및 입고 검수 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-3xl rounded-lg shadow-xl border overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 text-white">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-xs">
                  {isNewRegister ? "원부자재/부품 신규 구매발주서(PO) 발행" : `구매 발주 및 입고 상세 [${formState.poNo}]`}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs">
              {/* 1. 발주 프로젝트 & 공급처 정보 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded border text-[11px]">
                <div>
                  <label className="block text-zinc-500 mb-1">구매 발주번호 (PO)</label>
                  <Input value={formState.poNo || ""} readOnly className="h-7 text-xs bg-zinc-100 font-mono text-zinc-600" />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1">고객 관리번호 <span className="text-red-500">*</span></label>
                  <Input 
                    value={formState.projectNo || ""} 
                    onChange={(e) => setFormState({ ...formState, projectNo: e.target.value })}
                    placeholder="예: NT5-2026-A"
                    className="h-7 text-xs bg-white font-mono font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-zinc-500 mb-1">연계 프로젝트명 / 차종</label>
                  <Input 
                    value={formState.projectName || ""} 
                    onChange={(e) => setFormState({ ...formState, projectName: e.target.value })}
                    placeholder="예: 현대 NT5 도어 트림 모듈"
                    className="h-7 text-xs bg-white"
                  />
                </div>
              </div>

              {/* 2. 발주 품목 및 단가/수량 (8/14 엑셀 품목체계 매핑) */}
              <div className="border rounded p-3.5 flex flex-col gap-3">
                <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-sky-600" />
                  1. 발주 품목 및 금액 산출 (확정 단가 기준)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                  <div>
                    <label className="block text-zinc-500 mb-1">품목 구분</label>
                    <select
                      value={formState.category || "원재료 (레진)"}
                      onChange={(e) => setFormState({ ...formState, category: e.target.value as any })}
                      className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-bold"
                    >
                      <option value="원재료 (레진)">원재료 (레진)</option>
                      <option value="부자재">부자재 (박스/라벨/밴딩)</option>
                      <option value="부품 (기계/금형)">부품 (기계/금형 유지보수)</option>
                      <option value="소모품">소모품</option>
                      <option value="구매완제품">구매완제품</option>
                      <option value="구매반제품">구매반제품</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">공급업체 (Vendor)</label>
                    <Input 
                      value={formState.vendorName || ""} 
                      onChange={(e) => setFormState({ ...formState, vendorName: e.target.value })}
                      placeholder="예: LG화학, 롯데케미칼"
                      className="h-7 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">단위 (Unit)</label>
                    <select
                      value={formState.unit || "kg"}
                      onChange={(e) => setFormState({ ...formState, unit: e.target.value })}
                      className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-mono"
                    >
                      <option value="kg">kg (원재료/레진)</option>
                      <option value="EA">EA (개수)</option>
                      <option value="Set">Set (세트)</option>
                      <option value="Roll">Roll (롤/테이프)</option>
                      <option value="Box">Box (박스)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-[11px]">
                  <div className="col-span-2">
                    <label className="block text-zinc-500 mb-1">품목명 (규격/스펙 상세) <span className="text-red-500">*</span></label>
                    <Input 
                      value={formState.itemName || ""} 
                      onChange={(e) => setFormState({ ...formState, itemName: e.target.value })}
                      placeholder="예: PP-EPDM LUPOX GP-2200 사출용"
                      className="h-7 text-xs bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">품목코드</label>
                    <Input 
                      value={formState.itemCode || ""} 
                      onChange={(e) => setFormState({ ...formState, itemCode: e.target.value })}
                      placeholder="RESIN-PP-01"
                      className="h-7 text-xs bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-[11px] bg-sky-50/40 dark:bg-sky-950/20 p-2.5 rounded border border-sky-100 dark:border-zinc-800">
                  <div>
                    <label className="block text-zinc-600 mb-1 font-bold">발주 수량</label>
                    <Input 
                      type="number"
                      value={formState.orderQty || 0} 
                      onChange={(e) => setFormState({ ...formState, orderQty: Number(e.target.value) })}
                      className="h-7 text-xs bg-white font-mono text-right font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 mb-1 font-bold">확정 단가 (원)</label>
                    <CurrencyInput 
                      value={formState.unitPrice} 
                      onChange={(val) => setFormState({ ...formState, unitPrice: val })}
                      placeholder="0"
                      className="h-7 text-xs bg-white font-mono text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 mb-1 font-bold">발주 총액 (자동산출)</label>
                    <div className="h-7 px-2.5 rounded border bg-white dark:bg-zinc-900 flex items-center justify-end font-mono font-bold text-sky-600">
                      {((formState.orderQty || 0) * (formState.unitPrice || 0)).toLocaleString()} 원
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. 입고 창고 구역 지정 및 검수 처리 (공정 10~40 연계) */}
              <div className="border rounded p-3.5 flex flex-col gap-3 bg-zinc-50 dark:bg-zinc-800/40">
                <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Boxes className="h-4 w-4 text-emerald-600" />
                    2. 입고 일정, 창고 구역(A~H) 및 수입검사 연계 (공정 10~21)
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPoStatusBadge(formState.poStatus as any)}`}>
                    상태: {formState.poStatus}
                  </span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div>
                    <label className="block text-zinc-500 mb-1">발주일자</label>
                    <Input 
                      type="date"
                      value={formState.orderDate || ""} 
                      onChange={(e) => setFormState({ ...formState, orderDate: e.target.value })}
                      className="h-7 text-xs bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">입고 희망일자</label>
                    <Input 
                      type="date"
                      value={formState.targetDeliveryDate || ""} 
                      onChange={(e) => setFormState({ ...formState, targetDeliveryDate: e.target.value })}
                      className="h-7 text-xs bg-white font-mono text-amber-600"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">입고 창고 구역 (8/14 지정)</label>
                    <select
                      value={formState.inboundWarehouse || "C구역 (원재료 보관고)"}
                      onChange={(e) => setFormState({ ...formState, inboundWarehouse: e.target.value })}
                      className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-bold"
                    >
                      <option value="A구역 (판매완제품)">A구역 (판매완제품)</option>
                      <option value="B구역 (구매완제품)">B구역 (구매완제품)</option>
                      <option value="C구역 (원재료 보관고)">C구역 (원재료 보관고)</option>
                      <option value="D구역 (판매반제품)">D구역 (판매반제품)</option>
                      <option value="E구역 (구매반제품)">E구역 (구매반제품)</option>
                      <option value="F구역 (부품 보관고)">F구역 (부품 보관고)</option>
                      <option value="G구역 (부자재 창고)">G구역 (부자재 창고)</option>
                      <option value="H구역 (외주양산 보관소)">H구역 (외주양산 보관소)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">발주 진행 상태</label>
                    <select
                      value={formState.poStatus || "발주등록"}
                      onChange={(e) => setFormState({ ...formState, poStatus: e.target.value as any })}
                      className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-bold text-sky-700"
                    >
                      <option value="발주등록">발주등록 (기안)</option>
                      <option value="발주서발송">발주서발송 (발주완료)</option>
                      <option value="수입검사대기">수입검사대기 (입고중)</option>
                      <option value="입고완료">입고완료 (수불반영)</option>
                      <option value="발주취소">발주취소</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <label className="block text-zinc-500 mb-1">실입고 수량 / 원재료 Lot No</label>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number"
                        value={formState.receivedQty || 0} 
                        onChange={(e) => setFormState({ ...formState, receivedQty: Number(e.target.value) })}
                        placeholder="입고수량"
                        className="h-7 text-xs bg-white font-mono text-right w-28"
                      />
                      <Input 
                        value={formState.lotNo || ""} 
                        onChange={(e) => setFormState({ ...formState, lotNo: e.target.value })}
                        placeholder="관리번호/Lot No 부착 (공정 31)"
                        className="h-7 text-xs bg-white font-mono flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">건조 조건 및 특이사항 (공정 40~41 연계)</label>
                    <Input 
                      value={formState.dryingCondition || ""} 
                      onChange={(e) => setFormState({ ...formState, dryingCondition: e.target.value })}
                      placeholder="예: 80℃ 3시간 건조 필수, 흡습 주의"
                      className="h-7 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 border-t">
              <Button onClick={() => setIsModalOpen(false)} variant="outline" className="h-8 px-3 text-xs">
                닫기
              </Button>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => alert("MPSI 정식 구매발주서(PO) PDF가 출력되었습니다.")}
                  variant="outline" 
                  className="h-8 px-3 text-xs gap-1"
                >
                  <Download className="h-3.5 w-3.5 text-zinc-500" />
                  발주서 출력
                </Button>
                <Button 
                  onClick={handleSaveForm} 
                  className="h-8 px-4 text-xs bg-sky-600 hover:bg-sky-700 text-white gap-1.5 font-bold"
                >
                  <Check className="h-3.5 w-3.5" />
                  발주 정보 저장
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. [모달 2] 13단계 프로세스 다이어그램 모달 */}
      {isDiagramModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-lg shadow-2xl border overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 bg-[#1e293b] text-white">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-xs">
                  전체 13단계 금형/사출 프로세스 진행 현황 다이어그램
                </h3>
              </div>
              <button onClick={() => setIsDiagramModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6 overflow-y-auto">
              <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg border text-xs">
                <div className="flex items-center gap-4">
                  <div><span className="text-zinc-500">관리번호:</span> <b className="font-mono text-sky-600 text-sm ml-1">{diagramProjectNo}</b></div>
                  <div className="h-4 w-px bg-zinc-300" />
                  <div><span className="text-zinc-500">공정 단계:</span> <b className="text-zinc-900 dark:text-zinc-100 ml-1">공정 0~2 : 자재 소요 검토 및 구매 발주</b></div>
                </div>
                <span className="px-3 py-1 rounded-full bg-sky-600 text-white font-bold text-xs">
                  원부자재 조달 및 입고 관리 중
                </span>
              </div>

              {/* 13단계 타임라인 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {PROCESS_STEPS.map((item) => (
                  <div 
                    key={item.step}
                    className="flex flex-col p-2.5 rounded-md border text-center relative transition-all bg-zinc-50 text-zinc-500 border-zinc-200 dark:bg-zinc-800/40 dark:border-zinc-800"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                      <span>Step {item.step}</span>
                      <CheckCircle2 className="h-3 w-3 text-zinc-300" />
                    </div>
                    <span className="font-bold text-[11px] leading-tight truncate" title={item.name}>
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 rounded-md p-3 text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
                <div>
                  <b className="text-sky-700 dark:text-sky-300">💡 자재-생산 연계 가이드:</b> 발주된 원재료(레진)는 입고 및 수입검사(IQC) 합격 후 창고 구역(C구역)에 보관되며, 공정 31~41(건조 투입) 및 사출성형(공정 60)으로 투입 연계됩니다[cite: 7].
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
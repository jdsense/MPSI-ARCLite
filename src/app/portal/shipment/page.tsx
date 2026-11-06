"use client";

import React, { useState } from "react";
import { 
  Truck, Search, RefreshCw, PackageCheck, 
  Barcode, FileText, CheckCircle2, AlertCircle, 
  X, Building2, Calendar, Layers, Download, 
  ExternalLink, Eye, Check, ShieldCheck, Printer, 
  ArrowRight, Box, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangeFilter, isWithinDateRange, DatePresetType } from "@/components/common/date-range-filter";

// 1. 출하/선적 관리 아이템 인터페이스 (공정 90~140 매핑)
export interface ShipmentItem {
  id: number;
  shipmentNo: string;       // 출하 관리번호 (SHP-202608-001)
  projectNo: string;        // MPSI 고객 관리번호 (NT5-2026-A 등 직접지정)
  projectName: string;      // 프로젝트명 / 차종
  productName: string;      // 제품명
  customerName: string;     // 납품 대상 고객사 (현대차, 모비스 등)
  producedVendor: string;   // 사출생산처 (뉴몰드 / MPSI 자체)
  
  // 수량 및 적재 사양 (공정 100~110)
  orderQty: number;         // 고객 확정 발주량 (EA)
  shipmentQty: number;      // 금회 출하 수량 (EA)
  boxCount: number;         // 포장 박스 수량 (BOX)
  palletCount: number;      // 적재 팔레트 수 (PLT)
  palletNo: string;         // 팔레트 식별번호 (PLT-2608-01)
  
  // 품질 및 바코드 검증 (공정 90~120)
  oqcResult: "합격 (Pass)" | "검사대기" | "불합격 (Fail)"; // 공정 90~91
  oqcInspector: string;     // OQC 검사자
  oqcReportFile?: string;   // OQC 검사성적서
  barcodeStatus: "부착 및 리딩완료" | "미부착(대기)";      // 공정 120 바코드
  barcodeValue?: string;    // 20~21자리 고객사 바코드
  
  // 선적 및 배송/운송 정보 (공정 102, 130~140)
  destination: string;      // 목적지 (예: 현대차 광주공장, 베트남 현지법인)
  vehicleNo: string;        // 배차 차량번호 (예: 전남80아 1234, 5톤)
  driverContact: string;    // 기사 성함 및 연락처
  shippingDocNo: string;    // 거래명세서 / 선적서류 번호 (TR-202608-01)
  shippingDate: string;     // 출하 처리일자
  
  status: "출하대기" | "OQC검사완료" | "출하완료(운송중)" | "고객사납품완료";
  currentStep: number;      // 13단계 중 위치 (Step 12~13)
  updatedAt: string;
}

// 13단계 프로세스 마일스톤
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
const initialShipmentList: ShipmentItem[] = [
  {
    id: 1,
    shipmentNo: "SHP-202608-01",
    projectNo: "NT5-2026-A",
    projectName: "현대 NT5 도어 트림 모듈",
    productName: "Front Door Upper Cover LH/RH",
    customerName: "현대자동차 (광주공장)",
    producedVendor: "(주)뉴몰드 (외주양산)",
    orderQty: 20000,
    shipmentQty: 5000,
    boxCount: 250,
    palletCount: 5,
    palletNo: "PLT-NT5-260819-01~05",
    oqcResult: "합격 (Pass)",
    oqcInspector: "MPSI",
    oqcReportFile: "OQC_NT5_Lot0819_Pass.pdf",
    barcodeStatus: "부착 및 리딩완료",
    barcodeValue: "HK-NT5-260819-005000-01",
    destination: "광주광역시 광산구 현대자동차 의장공장",
    vehicleNo: "광주85사 4421 (5톤 윙바디)",
    driverContact: "김영수 (010-3344-9988)",
    shippingDocNo: "TR-MPSI-260819-01",
    shippingDate: "2026-08-19",
    status: "출하완료(운송중)",
    currentStep: 13,
    updatedAt: "2026-08-19 17:30",
  },
  {
    id: 2,
    shipmentNo: "SHP-202608-02",
    projectNo: "A2XT-M01",
    projectName: "기아 A2XT 센터페시아 콘솔",
    productName: "Center Console Main Bracket",
    customerName: "현대모비스",
    producedVendor: "(주)한국정밀사출 (외주양산)",
    orderQty: 15000,
    shipmentQty: 3000,
    boxCount: 150,
    palletCount: 3,
    palletNo: "PLT-A2XT-260820-01~03",
    oqcResult: "검사대기",
    oqcInspector: "고병진 대리",
    barcodeStatus: "미부착(대기)",
    barcodeValue: "MOBIS-A2XT-260820-003000",
    destination: "울산 물류센터",
    vehicleNo: "울산88바 1928 (11톤)",
    driverContact: "박진호 (010-8877-2233)",
    shippingDocNo: "TR-MPSI-260820-02",
    shippingDate: "2026-08-20",
    status: "출하대기",
    currentStep: 12,
    updatedAt: "2026-08-19 14:00",
  },
  {
    id: 3,
    shipmentNo: "SHP-202608-03",
    projectNo: "SPX-EV-09",
    projectName: "SPX 전기차 배터리 모듈 하우징",
    productName: "BMS Battery Case Module",
    customerName: "SPX 베트남 법인",
    producedVendor: "MPSI 자체생산라인",
    orderQty: 30000,
    shipmentQty: 10000,
    boxCount: 400,
    palletCount: 10,
    palletNo: "PLT-SPX-EXP-01~10",
    oqcResult: "합격 (Pass)",
    oqcInspector: "MPSI",
    oqcReportFile: "OQC_SPX_Final_Cert.pdf",
    barcodeStatus: "부착 및 리딩완료",
    barcodeValue: "SPX-VN-260818-010000-A",
    destination: "베트남 하노이 현지공장 (해상운송)",
    vehicleNo: "부산90바 7731 (컨테이너 트레일러)",
    driverContact: "정해운 (010-5544-1122)",
    shippingDocNo: "EXP-INV-202608-03",
    shippingDate: "2026-08-18",
    status: "고객사납품완료",
    currentStep: 13,
    updatedAt: "2026-08-18 18:20",
  }
];

export default function ShipmentManagementPage() {
  const [data, setData] = useState<ShipmentItem[]>(initialShipmentList);
  const [filterProjectNo, setFilterProjectNo] = useState("");
  const [filterProductName, setFilterProductName] = useState("");
  const [filterVendor, setFilterVendor] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDateType, setFilterDateType] = useState<"shippingDate" | "updatedAt">("shippingDate");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePresetType>("all");

  // 상세/출하처리 모달 상태
  const [selectedItem, setSelectedItem] = useState<ShipmentItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formState, setFormState] = useState<Partial<ShipmentItem>>({});

  // 13단계 프로세스 다이어그램 모달
  const [diagramItem, setDiagramItem] = useState<ShipmentItem | null>(null);
  const [isDiagramModalOpen, setIsDiagramModalOpen] = useState(false);

  // 검색
  const handleSearch = () => {
    const filtered = initialShipmentList.filter((item) => {
      const matchNo = filterProjectNo ? item.projectNo.toLowerCase().includes(filterProjectNo.toLowerCase()) : true;
      const matchProd = filterProductName ? item.productName.includes(filterProductName) : true;
      const matchVendor = filterVendor !== "ALL" ? item.producedVendor.includes(filterVendor) : true;
      const matchStatus = filterStatus !== "ALL" ? item.status === filterStatus : true;
      const targetDate = item[filterDateType] || "";
      const matchDate = isWithinDateRange(targetDate, filterDateFrom, filterDateTo);
      return matchNo && matchProd && matchVendor && matchStatus && matchDate;
    });
    setData(filtered);
  };

  const handleReset = () => {
    setFilterProjectNo("");
    setFilterProductName("");
    setFilterVendor("ALL");
    setFilterStatus("ALL");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSelectedDatePreset("all");
    setData(initialShipmentList);
  };

  // 상세/출하처리 모달 열기
  const handleOpenDetail = (item: ShipmentItem) => {
    setSelectedItem(item);
    setFormState({ ...item });
    setIsModalOpen(true);
  };

  // 13단계 다이어그램 열기
  const handleOpenDiagram = (item: ShipmentItem) => {
    setDiagramItem(item);
    setIsDiagramModalOpen(true);
  };

  // 출하 확정 및 선적 처리
  const handleConfirmShipment = () => {
    if (!selectedItem) return;

    if (formState.oqcResult !== "합격 (Pass)") {
      alert("출하 검사(OQC)가 '합격 (Pass)' 상태여야 출하 처리가 가능합니다.");
      return;
    }

    if (formState.barcodeStatus !== "부착 및 리딩완료") {
      alert("고객사 전산 바코드 부착 및 리딩 확인이 완료되어야 출하 가능합니다.");
      return;
    }

    if (!formState.vehicleNo?.trim()) {
      alert("배차 차량 번호를 입력해주세요.");
      return;
    }

    if (confirm(`[최종 출하 및 선적 확정]\n출하번호: ${selectedItem.shipmentNo}\n품목: ${selectedItem.productName} (${formState.shipmentQty?.toLocaleString()} EA)\n\n선적서류 발행 및 배송 처리를 진행하시겠습니까?`)) {
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const timeStr = `${dateStr} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      setData(prev => prev.map(row => 
        row.id === selectedItem.id 
          ? {
              ...row,
              ...formState,
              status: "출하완료(운송중)",
              currentStep: 13,
              shippingDate: dateStr,
              updatedAt: timeStr,
            } as ShipmentItem
          : row
      ));

      alert("최종 출하 확정 및 거래명세서/선적서류가 등록되었습니다. 운송 트래킹이 개시됩니다.");
      setIsModalOpen(false);
    }
  };

  // 상태 배지 스타일
  const getShipmentStatusBadge = (status: ShipmentItem["status"]) => {
    switch (status) {
      case "고객사납품완료":
        return "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300";
      case "출하완료(운송중)":
        return "bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-950 dark:text-sky-300";
      case "OQC검사완료":
        return "bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300";
      default:
        return "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300";
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 1. 상단 검색 필터 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex flex-col gap-2.5">
        {/* 상단 기간조회 바 */}
        <div className="pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <DateRangeFilter
            dateType={filterDateType}
            onDateTypeChange={(v) => setFilterDateType(v as any)}
            dateTypeOptions={[
              { label: "출하일자", value: "shippingDate" },
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
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">관리번호 (고객 PJT코드)</span>
            <Input 
              value={filterProjectNo} 
              onChange={(e) => setFilterProjectNo(e.target.value)} 
              placeholder="예: NT5, A2XT, SPX" 
              className="h-7 text-xs font-mono font-bold" 
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
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">사출 생산처</span>
            <select 
              value={filterVendor} 
              onChange={(e) => setFilterVendor(e.target.value)} 
              className="h-7 rounded-md border bg-transparent px-2 text-xs font-medium"
            >
              <option value="ALL">전체 생산처</option>
              <option value="뉴몰드">(주)뉴몰드 (외주)</option>
              <option value="한국정밀사출">(주)한국정밀사출 (외주)</option>
              <option value="자체">MPSI 자체생산라인</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">출하 진행상태</span>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)} 
              className="h-7 rounded-md border bg-transparent px-2 text-xs font-medium"
            >
              <option value="ALL">전체 상태</option>
              <option value="출하대기">출하대기</option>
              <option value="OQC검사완료">OQC검사완료</option>
              <option value="출하완료(운송중)">출하완료(운송중)</option>
              <option value="고객사납품완료">고객사납품완료</option>
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

      {/* 2. 메인 출하 및 선적 관리 대장 그리드 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs overflow-hidden flex flex-col min-h-[480px]">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b">
          <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-100">
            <Truck className="h-4 w-4 text-sky-600" />
            <span>출하 관리 (OQC 검사 및 완제품 선적·운송 대장)</span>
            <span className="text-[11px] font-normal text-zinc-500 ml-1">
              (총 <b className="text-sky-600 font-mono">{data.length}</b>건)
            </span>
          </div>
          <span className="text-[11px] text-zinc-500 font-normal">
            * 공정 90(OQC검사) ➔ 공정 100~110(팔레트적재) ➔ 공정 120(바코드) ➔ 공정 130~140(출하운송)
          </span>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full border-collapse text-left border-spacing-0 whitespace-nowrap">
            <thead className="sticky top-0 bg-[#2d3748] text-white text-[11px] z-10">
              <tr>
                <th className="p-1.5 w-10 text-center border-r border-slate-600">No</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px]">출하 관리번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[120px]">프로젝트 번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[160px]">제품명</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px]">납품 고객사</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px] text-center">사출 생산처</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[85px] text-right">출하수량</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[80px] text-center">적재(PLT)</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[95px] text-center">OQC 검사</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[105px] text-center">고객 바코드</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[140px]">도착지 / 목적지</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px] text-center">출하일자</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[100px] text-center">진행상태</th>
                <th className="p-1.5 min-w-[85px] text-center">출하처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px]">
              {data.map((row, idx) => (
                <tr key={row.id} className="hover:bg-sky-50/70 dark:hover:bg-zinc-800/60 transition-colors odd:bg-white even:bg-zinc-50/40 dark:odd:bg-zinc-900 dark:even:bg-zinc-900/50">
                  <td className="p-1.5 text-center font-mono text-zinc-400 border-r">{idx + 1}</td>
                  <td className="p-1.5 border-r font-mono text-sky-600 font-medium">{row.shipmentNo}</td>
                  
                  {/* 관리번호 클릭 -> 13단계 다이어그램 */}
                  <td className="p-1.5 border-r font-mono font-bold text-zinc-900 dark:text-zinc-100 hover:underline cursor-pointer">
                    <button onClick={() => handleOpenDiagram(row)} className="flex items-center gap-1">
                      <span>{row.projectNo}</span>
                      <ExternalLink className="h-3 w-3 text-sky-400" />
                    </button>
                  </td>

                  <td className="p-1.5 border-r font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[160px]" title={row.productName}>{row.productName}</td>
                  <td className="p-1.5 border-r truncate max-w-[110px]" title={row.customerName}>{row.customerName}</td>
                  <td className="p-1.5 border-r text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      row.producedVendor.includes("자체")
                        ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                    }`}>
                      {row.producedVendor}
                    </span>
                  </td>
                  <td className="p-1.5 border-r text-right font-mono font-bold text-sky-700 dark:text-sky-400">{row.shipmentQty.toLocaleString()} EA</td>
                  <td className="p-1.5 border-r text-center font-mono">{row.palletCount} PLT</td>

                  {/* OQC 판정 */}
                  <td className="p-1.5 border-r text-center font-bold">
                    <span className={row.oqcResult.includes("합격") ? "text-emerald-600" : row.oqcResult.includes("불합격") ? "text-rose-600" : "text-amber-500"}>
                      {row.oqcResult}
                    </span>
                  </td>

                  {/* 바코드 매핑 상태 */}
                  <td className="p-1.5 border-r text-center">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                      row.barcodeStatus === "부착 및 리딩완료"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                    }`}>
                      {row.barcodeStatus}
                    </span>
                  </td>

                  <td className="p-1.5 border-r truncate max-w-[140px]" title={row.destination}>{row.destination}</td>
                  <td className="p-1.5 border-r text-center font-mono text-zinc-500">{row.shippingDate}</td>

                  {/* 상태 배지 */}
                  <td className="p-1.5 border-r text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getShipmentStatusBadge(row.status)}`}>
                      {row.status}
                    </span>
                  </td>

                  {/* 액션 버튼 */}
                  <td className="p-1.5 text-center">
                    <Button 
                      onClick={() => handleOpenDetail(row)} 
                      size="xs" 
                      variant="outline" 
                      className="h-6 px-2 text-[10px] gap-1 bg-white hover:bg-zinc-100 dark:bg-zinc-800 text-sky-700 font-medium"
                    >
                      <Eye className="h-3 w-3" />
                      출하/검수
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. [모달 1] OQC 출하검사 확인 및 선적/배송 확정 모달 */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-3xl rounded-lg shadow-xl border overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 text-white">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-xs">
                  완제품 출하 승인 및 선적·운송 처리 [{selectedItem.projectNo}]
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs">
              {/* 기본 제품/주문 요약 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded border text-[11px]">
                <div><span className="text-zinc-500">출하번호:</span> <b className="font-mono text-sky-600">{selectedItem.shipmentNo}</b></div>
                <div><span className="text-zinc-500">프로젝트 번호:</span> <b className="font-mono">{selectedItem.projectNo}</b></div>
                <div><span className="text-zinc-500">제품명:</span> <b className="text-zinc-900 dark:text-zinc-100 truncate">{selectedItem.productName}</b></div>
                <div><span className="text-zinc-500">납품고객사:</span> <b>{selectedItem.customerName}</b></div>
              </div>

              {/* 1. OQC 출하검사 및 고객사 바코드 검증 (공정 90~120) */}
              <div className="border rounded p-3.5 flex flex-col gap-3 bg-sky-50/20 dark:bg-sky-950/10">
                <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    1. 출하 전 품질 검증 및 바코드 매핑 (공정 90~120)
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">OQC & Barcode Verification</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div className="p-2.5 bg-white dark:bg-zinc-900 rounded border flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">OQC 출하검사 판정 (공정 90~91)</span>
                      <select
                        value={formState.oqcResult || "합격 (Pass)"}
                        onChange={(e) => setFormState({ ...formState, oqcResult: e.target.value as any })}
                        className="h-6 rounded border bg-zinc-50 dark:bg-zinc-800 px-2 text-xs font-bold text-emerald-700"
                      >
                        <option value="합격 (Pass)">합격 (Pass - 출하가능)</option>
                        <option value="검사대기">검사대기 (샘플링 중)</option>
                        <option value="불합격 (Fail)">불합격 (출하보류/재선별)</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between text-zinc-500 pt-1 border-t">
                      <span>검사처: <b>{formState.oqcInspector || "MPSI"}</b></span>
                      <Button size="xs" variant="outline" className="h-6 px-2 text-[10px] gap-1 text-emerald-600">
                        <FileText className="h-3 w-3" />
                        성적서 열람
                      </Button>
                    </div>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-zinc-900 rounded border flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">고객사 바코드 매핑 (공정 120)</span>
                      <Button
                        size="xs"
                        variant={formState.barcodeStatus === "부착 및 리딩완료" ? "default" : "outline"}
                        className={`h-6 text-[10px] ${formState.barcodeStatus === "부착 및 리딩완료" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                        onClick={() => setFormState({
                          ...formState,
                          barcodeStatus: formState.barcodeStatus === "부착 및 리딩완료" ? "미부착(대기)" : "부착 및 리딩완료"
                        })}
                      >
                        <Barcode className="h-3 w-3 mr-1" />
                        {formState.barcodeStatus === "부착 및 리딩완료" ? "스캔 리딩 완료 (Pass)" : "바코드 리딩 확인"}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between text-zinc-500 pt-1 border-t font-mono text-[10px]">
                      <span>바코드: <b>{formState.barcodeValue || "HK-NT5-260819-005000"}</b></span>
                      <span className="text-emerald-600 font-bold">검증완료</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. 포장/팔레트 적재 정보 (공정 100~110) */}
              <div className="border rounded p-3.5 flex flex-col gap-3">
                <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                  <Box className="h-4 w-4 text-sky-600" />
                  2. 포장 박스 및 팔레트 적재 사양 (공정 100~110)
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div>
                    <label className="block text-zinc-500 mb-1">확정 출하수량 (EA)</label>
                    <Input 
                      type="number"
                      value={formState.shipmentQty || 0} 
                      onChange={(e) => setFormState({ ...formState, shipmentQty: Number(e.target.value) })}
                      className="h-7 text-xs font-mono font-bold text-sky-600 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">포장 박스수 (BOX)</label>
                    <Input 
                      type="number"
                      value={formState.boxCount || 0} 
                      onChange={(e) => setFormState({ ...formState, boxCount: Number(e.target.value) })}
                      className="h-7 text-xs font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">적재 팔레트수 (PLT)</label>
                    <Input 
                      type="number"
                      value={formState.palletCount || 0} 
                      onChange={(e) => setFormState({ ...formState, palletCount: Number(e.target.value) })}
                      className="h-7 text-xs font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">팔레트 식별번호</label>
                    <Input 
                      value={formState.palletNo || ""} 
                      onChange={(e) => setFormState({ ...formState, palletNo: e.target.value })}
                      className="h-7 text-xs font-mono bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* 3. 선적서류 및 운송 차량 배차 (공정 102, 130~140) */}
              <div className="border rounded p-3.5 flex flex-col gap-3 bg-zinc-50 dark:bg-zinc-800/40">
                <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-purple-600" />
                    3. 선적서류(명세서) 및 운송 배차 정보 (공정 102, 130~140)
                  </span>
                  <Button 
                    onClick={() => alert("거래명세서, Invoice, Packing List(PDF)가 출력되었습니다.")}
                    size="xs" 
                    variant="outline" 
                    className="h-6 px-2 text-[10px] gap-1 bg-white text-zinc-700"
                  >
                    <Printer className="h-3 w-3" />
                    선적서류 즉시출력
                  </Button>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                  <div>
                    <label className="block text-zinc-500 mb-1">선적서류(명세서) 번호</label>
                    <Input 
                      value={formState.shippingDocNo || ""} 
                      onChange={(e) => setFormState({ ...formState, shippingDocNo: e.target.value })}
                      className="h-7 text-xs font-mono bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">배차 차량번호 / 차종</label>
                    <Input 
                      value={formState.vehicleNo || ""} 
                      onChange={(e) => setFormState({ ...formState, vehicleNo: e.target.value })}
                      placeholder="예: 광주85사 4421 (5톤)"
                      className="h-7 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">운송 기사 연락처</label>
                    <Input 
                      value={formState.driverContact || ""} 
                      onChange={(e) => setFormState({ ...formState, driverContact: e.target.value })}
                      placeholder="성함 및 연락처"
                      className="h-7 text-xs bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-500 mb-1">도착지 / 납품 목적지 상세</label>
                  <Input 
                    value={formState.destination || ""} 
                    onChange={(e) => setFormState({ ...formState, destination: e.target.value })}
                    placeholder="공장 주소 및 하차 도크 위치"
                    className="h-7 text-xs bg-white"
                  />
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
                  onClick={() => alert("출하 인수증 및 패킹리스트 다운로드가 완료되었습니다.")}
                  variant="outline" 
                  className="h-8 px-3 text-xs gap-1"
                >
                  <Download className="h-3.5 w-3.5 text-zinc-500" />
                  인수증 다운로드
                </Button>
                <Button 
                  onClick={handleConfirmShipment}
                  className="h-8 px-4 text-xs bg-sky-600 hover:bg-sky-700 text-white gap-1.5 font-bold"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  최종 출하 확정 및 운송 개시
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. [모달 2] 13단계 프로세스 다이어그램 모달 */}
      {isDiagramModalOpen && diagramItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-xl shadow-2xl border overflow-hidden flex flex-col">
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
                  <div><span className="text-zinc-500">관리번호:</span> <b className="font-mono text-sky-600 text-sm ml-1">{diagramItem.projectNo}</b></div>
                  <div className="h-4 w-px bg-zinc-300" />
                  <div><span className="text-zinc-500">제품명:</span> <b className="text-zinc-900 dark:text-zinc-100 ml-1">{diagramItem.productName}</b></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">현재 위치:</span>
                  <span className="px-3 py-1 rounded-full bg-sky-600 text-white font-bold text-xs">
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
                          ? "bg-sky-500 text-white border-sky-600 shadow-md ring-2 ring-sky-300 scale-105 z-10" 
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
                  <b className="text-sky-700 dark:text-sky-300">💡 출하 및 SCM 납품 연계 안내:</b> 출하 완료 시 고객사 납품 마감 처리(Step 13)가 확정되며, 거래명세서와 세금계산서 정산 데이터가 자동 생성됩니다[cite: 7].
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
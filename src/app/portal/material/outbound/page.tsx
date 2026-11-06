"use client";

import React, { useState } from "react";
import { 
  Truck, 
  Search, 
  RefreshCw, 
  PackageCheck, 
  Barcode, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  X,
  Building2,
  Calendar,
  Layers,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangeFilter, isWithinDateRange } from "@/components/common/date-range-filter";

// 출고 대기 및 출고 완료 품목 인터페이스
export interface OutboundItem {
  id: number;
  idx: number;
  outboundNo: string;        // 출고 식별자 (OB-YYYYMM-XXX)
  projectNo: string;         // 고객사 지정 프로젝트 관리코드 (예: PRJ-2026-001 / NT5 / A2XT)
  projectName?: string;      // 프로젝트명
  productName: string;       // 제품명
  customerName: string;      // 원청 납품 대상 (고객사)
  orderQty: number;          // 수주/요청 수량 (EA)
  outboundQty: number;       // 금회 출고 수량 (EA)
  oqcStatus: "합격" | "대기" | "불합격"; // 공정 90~91 OQC 합격 여부
  palletNo: string;          // 공정 100~110 적재 팔레트 식별자
  barcodeYn: "부착완료" | "미부착"; // 공정 120 바코드 발행 및 부착 여부
  destination: string;       // 목적지 (예: 베트남 현지공장, 국내 물류)
  deliveryDate: string;      // 출하일자 / 출하예정일
  status: "출고대기" | "출고검증중" | "출고완료";
  shipper: string;           // 출하 담당자
}

// 초기 샘플 데이터 (MPSI - 사출양산 입고 후 MPSI 최종 출하 데이터)
const initialOutboundList: OutboundItem[] = [
  {
    id: 1,
    idx: 1,
    outboundNo: "OB-202608-001",
    projectNo: "PRJ-2026-001",
    projectName: "스마트 팩토리 사출 고도화",
    productName: "전기모터 5HP 하우징",
    customerName: "현대모비스",
    orderQty: 500,
    outboundQty: 500,
    oqcStatus: "합격",
    palletNo: "PLT-2608-012",
    barcodeYn: "부착완료",
    destination: "베트남 현지 공장 (공정 140)",
    deliveryDate: "2026-08-21",
    status: "출고대기",
    shipper: "고병진 대리",
  },
  {
    id: 2,
    idx: 2,
    outboundNo: "OB-202608-002",
    projectNo: "PRJ-2026-003",
    projectName: "라인3 자동화 제어반 구축",
    productName: "완성형 컨베이어 브라켓",
    customerName: "삼성전자 생산기술연구소",
    orderQty: 1200,
    outboundQty: 1200,
    oqcStatus: "합격",
    palletNo: "PLT-2608-009",
    barcodeYn: "부착완료",
    destination: "국내 평택 물류센터",
    deliveryDate: "2026-08-19",
    status: "출고완료",
    shipper: "김양훈 부장",
  },
  {
    id: 3,
    idx: 3,
    outboundNo: "OB-202608-003",
    projectNo: "PRJ-2026-002",
    projectName: "SCM 공급망 데이터통합 솔루션",
    productName: "제어 판넬 커버",
    customerName: "LS ELECTRIC",
    orderQty: 300,
    outboundQty: 300,
    oqcStatus: "대기",
    palletNo: "PLT-2608-015",
    barcodeYn: "미부착",
    destination: "청주 사업장",
    deliveryDate: "2026-08-25",
    status: "출고검증중",
    shipper: "김태훈 실장",
  },
];

export default function OutboundManagementPage() {
  // 1. 검색 조건 필터 상태
  const [filterProjectNo, setFilterProjectNo] = useState("");
  const [filterProductName, setFilterProductName] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<string>("all");

  // 2. 테이블 데이터 및 모달 상태
  const [data, setData] = useState<OutboundItem[]>(initialOutboundList);
  const [selectedItem, setSelectedItem] = useState<OutboundItem | null>(null);

  // 3. 출고 및 운송 서류 입력 상태
  const [truckNo, setTruckNo] = useState("경기 88 바 1234");
  const [shippingDocNo, setShippingDocNo] = useState("DOC-202608-99");
  const [shippingRemarks, setShippingRemarks] = useState("");

  // 검색/초기화 핸들러
  const handleSearch = () => {
    const filtered = initialOutboundList.filter((item) => {
      const matchNo = filterProjectNo
        ? item.projectNo.toLowerCase().includes(filterProjectNo.toLowerCase()) ||
          (item.projectName && item.projectName.toLowerCase().includes(filterProjectNo.toLowerCase()))
        : true;
      const matchProd = filterProductName ? item.productName.includes(filterProductName) : true;
      const matchStatus = filterStatus !== "ALL" ? item.status === filterStatus : true;
      const matchDate = isWithinDateRange(item.deliveryDate, filterDateFrom, filterDateTo);
      return matchNo && matchProd && matchStatus && matchDate;
    });
    setData(filtered);
  };

  const handleReset = () => {
    setFilterProjectNo("");
    setFilterProductName("");
    setFilterStatus("ALL");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSelectedDatePreset("all");
    setData(initialOutboundList);
  };

  // 모달 열기
  const handleOpenOutboundModal = (item: OutboundItem) => {
    setSelectedItem(item);
    setShippingRemarks("");
  };

  // 출고 확정 처리 (공정 130~140 완료)
  const handleConfirmOutbound = () => {
    if (!selectedItem) return;

    if (selectedItem.oqcStatus !== "합격") {
      alert("출하 검사(OQC)가 '합격' 상태인 품목만 출고를 확정할 수 있습니다.");
      return;
    }

    if (selectedItem.barcodeYn !== "부착완료") {
      alert("고객사 바코드 부착 및 리딩 확인이 완료되어야 출하 가능합니다.");
      return;
    }

    if (
      confirm(
        `[제품 출고 확정]\n출고식별자: ${selectedItem.outboundNo}\n프로젝트: ${selectedItem.projectNo} (${selectedItem.projectName || ""})\n품목: ${selectedItem.productName} (${selectedItem.outboundQty.toLocaleString()} EA)\n\n선적서류 발행 및 최종 출하를 완료 처리하시겠습니까?`
      )
    ) {
      setData((prev) =>
        prev.map((row) =>
          row.id === selectedItem.id
            ? {
                ...row,
                status: "출고완료",
                deliveryDate: new Date().toISOString().split("T")[0],
              }
            : row
        )
      );
      alert("출고 처리 및 선적서류 등록이 정상 완료되었습니다.");
      setSelectedItem(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 1. 상단 검색 조건 필터 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex flex-col gap-2">
        <div className="pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <DateRangeFilter
            startDate={filterDateFrom}
            endDate={filterDateTo}
            onStartDateChange={setFilterDateFrom}
            onEndDateChange={setFilterDateTo}
            selectedPreset={selectedDatePreset}
            onPresetChange={setSelectedDatePreset}
            label="출하(예정)일자"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">고객사 관리번호 / 프로젝트</span>
            <Input
              value={filterProjectNo}
              onChange={(e) => setFilterProjectNo(e.target.value)}
              placeholder="예: PRJ-2026-001, NT5"
              className="h-7 text-xs"
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
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">출고 상태</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-7 rounded-md border bg-transparent px-2 text-xs"
            >
              <option value="ALL">전체</option>
              <option value="출고대기">출고대기</option>
              <option value="출고검증중">출고검증중</option>
              <option value="출고완료">출고완료</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-1.5 pt-1 border-t border-zinc-100 dark:border-zinc-800">
          <Button onClick={handleSearch} className="h-7 px-3 bg-sky-600 hover:bg-sky-700 text-white gap-1 text-xs">
            <Search className="h-3.5 w-3.5" />
            검색
          </Button>
          <Button onClick={handleReset} variant="outline" className="h-7 px-3 gap-1 text-xs text-zinc-600">
            <RefreshCw className="h-3.5 w-3.5" />
            초기화
          </Button>
        </div>
      </div>

      {/* 2. 제품 출고 현황 테이블 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs overflow-hidden flex flex-col min-h-[480px]">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b">
          <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-100">
            <Truck className="h-4 w-4 text-sky-600" />
            <span>완제품 출고 및 출하 관리 (/material/outbound)</span>
          </div>
          <span className="text-[11px] text-zinc-500 font-normal">
            공정흐름: OQC 검사합격(90) → 팔레트적재(100) → 바코드부착(120) → 선적서류 및 운송(130~140)
          </span>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full border-collapse text-left border-spacing-0 whitespace-nowrap">
            <thead className="sticky top-0 bg-[#2d3748] text-white text-[11px] z-10">
              <tr>
                <th className="p-1.5 w-10 text-center border-r border-slate-600">Idx</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[120px]">출고식별자</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[120px]">관리번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[150px]">프로젝트명</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[150px]">제품명</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[120px]">납품처(고객사)</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[80px] text-right">출고수량</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px] text-center">OQC 검사</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px]">적재 팔레트</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px] text-center">고객 바코드</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[140px]">도착지/목적지</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[95px] text-center">출하일자</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px] text-center">출고상태</th>
                <th className="p-1.5 min-w-[100px] text-center">출고 실행</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
              {data.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-sky-50 dark:hover:bg-zinc-800/60 transition-colors odd:bg-white even:bg-zinc-50/50 dark:odd:bg-zinc-900 dark:even:bg-zinc-900/50"
                >
                  <td className="p-1.5 text-center font-mono text-zinc-500 border-r">{row.idx}</td>
                  <td className="p-1.5 border-r font-mono text-sky-600 font-medium">{row.outboundNo}</td>
                  <td className="p-1.5 border-r font-mono font-medium">{row.projectNo}</td>
                  <td className="p-1.5 border-r text-zinc-600 truncate max-w-[150px]" title={row.projectName}>
                    {row.projectName || "-"}
                  </td>
                  <td className="p-1.5 border-r font-medium">{row.productName}</td>
                  <td className="p-1.5 border-r">{row.customerName}</td>
                  <td className="p-1.5 border-r text-right font-mono font-semibold">
                    {row.outboundQty.toLocaleString()} EA
                  </td>
                  <td className="p-1.5 border-r text-center font-bold">
                    <span
                      className={
                        row.oqcStatus === "합격"
                          ? "text-emerald-600"
                          : row.oqcStatus === "불합격"
                          ? "text-rose-600"
                          : "text-amber-500"
                      }
                    >
                      {row.oqcStatus}
                    </span>
                  </td>
                  <td className="p-1.5 border-r font-mono text-zinc-600">{row.palletNo}</td>
                  <td className="p-1.5 border-r text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                        row.barcodeYn === "부착완료"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {row.barcodeYn}
                    </span>
                  </td>
                  <td className="p-1.5 border-r text-zinc-600 truncate max-w-[140px]" title={row.destination}>
                    {row.destination}
                  </td>
                  <td className="p-1.5 border-r text-center font-mono">{row.deliveryDate}</td>
                  <td className="p-1.5 border-r text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.status === "출고완료"
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                          : row.status === "출고검증중"
                          ? "bg-amber-100 text-amber-700 border border-amber-300"
                          : "bg-sky-100 text-sky-700 border border-sky-300"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="p-1.5 text-center">
                    <Button
                      onClick={() => handleOpenOutboundModal(row)}
                      size="xs"
                      variant="outline"
                      disabled={row.status === "출고완료"}
                      className={`h-6 px-2 text-[11px] gap-1 ${
                        row.status === "출고완료" ? "opacity-50 cursor-not-allowed" : "bg-white hover:bg-zinc-100"
                      }`}
                    >
                      <PackageCheck className="h-3 w-3 text-sky-600" />
                      {row.status === "출고완료" ? "출고완료" : "출고처리"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. 출고 확정 및 선적서류/운송 등록 모달 */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-lg shadow-xl border overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 text-white">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-xs">완제품 출고 승인 및 운송 등록</h3>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-md border text-[11px]">
                <div><span className="text-zinc-500">출고번호:</span> <b>{selectedItem.outboundNo}</b></div>
                <div><span className="text-zinc-500">관리번호:</span> <b>{selectedItem.projectNo}</b></div>
                <div><span className="text-zinc-500">프로젝트:</span> <b>{selectedItem.projectName || "-"}</b></div>
                <div><span className="text-zinc-500">제품명:</span> <b>{selectedItem.productName}</b></div>
                <div><span className="text-zinc-500">출고수량:</span> <b className="text-sky-600">{selectedItem.outboundQty.toLocaleString()} EA</b></div>
                <div><span className="text-zinc-500">적재팔레트:</span> <b>{selectedItem.palletNo}</b></div>
                <div><span className="text-zinc-500">OQC판정:</span> <b className="text-emerald-600">{selectedItem.oqcStatus}</b></div>
                <div><span className="text-zinc-500">출하담당:</span> <b>{selectedItem.shipper}</b></div>
              </div>

              {/* 필수 공정 검증 체크 */}
              <div className="border rounded-md p-3 flex flex-col gap-2 bg-sky-50/40 dark:bg-zinc-800/30">
                <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                  <Barcode className="h-3.5 w-3.5 text-sky-600" />
                  사출 공정 완료 상태 검증
                </h4>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span>1. OQC 출하 샘플링 검사 합격 및 날인 (공정 90~91):</span>
                  <b className={selectedItem.oqcStatus === "합격" ? "text-emerald-600" : "text-rose-600"}>
                    {selectedItem.oqcStatus === "합격" ? "✓ 적합 (Pass)" : "✗ 미완료"}
                  </b>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span>2. 고객사 전산 바코드 부착 및 리딩 확인 (공정 120):</span>
                  <b className={selectedItem.barcodeYn === "부착완료" ? "text-emerald-600" : "text-rose-600"}>
                    {selectedItem.barcodeYn === "부착완료" ? "✓ 부착완료" : "✗ 미부착"}
                  </b>
                </div>
              </div>

              {/* 운송 및 선적 정보 입력 */}
              <div className="border rounded-md p-3 flex flex-col gap-3">
                <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-sky-600" />
                  운송 및 선적서류 정보 (공정 102 / 140)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 mb-1">운송 차량 번호</label>
                    <Input
                      value={truckNo}
                      onChange={(e) => setTruckNo(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 mb-1">선적/출하 서류번호</label>
                    <Input
                      value={shippingDocNo}
                      onChange={(e) => setShippingDocNo(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">비고 및 배송 특이사항</label>
                  <Input
                    value={shippingRemarks}
                    onChange={(e) => setShippingRemarks(e.target.value)}
                    placeholder="운송 기사 연락처 또는 베트남 현지 공장 인계 조건"
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 border-t">
              <Button onClick={() => setSelectedItem(null)} variant="outline" className="h-8 px-3 text-xs">
                취소
              </Button>
              <Button
                onClick={handleConfirmOutbound}
                className="h-8 px-4 text-xs bg-sky-600 hover:bg-sky-700 text-white gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                출고 확정 및 선적 완료
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
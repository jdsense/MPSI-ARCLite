"use client";

import { useState } from "react";
import { 
  Search, RefreshCw, PackageCheck, FileSpreadsheet, Building2, CheckCircle2, FileText 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// 완제품 및 납품 마감 관리 데이터 타입 (Process 11~13단계 연동)
interface DeliveryCloseItem {
  id: number;
  idx: number;
  orderNo: string;         // 구매 발주서 번호 (Process 12)
  projectNo: string;       // 소속 프로젝트 번호
  projectName: string;     // 프로젝트/품명
  supplier: string;        // 납품 협력사 (뉴몰드)
  deliveryQty: number;     // 납품 수량 (EA)
  supplyAmount: number;    // 공급가액 (원)
  vatAmount: number;       // 부가세 (원)
  ppapStatus: "PPAP 승인완료" | "검토중"; // 양산승인 상태
  closeStatus: "납품완료(마감대기)" | "월마감완료" | "세금계산서발행"; // 마감 상태
  deliveryDate: string;    // 납품일자
  managerName: string;     // MPSI 구매 담당자
}

// 초기 샘플 데이터 (양산외주/자체생산 납품 및 월 마감 연동 반영)
const initialDeliveries: DeliveryCloseItem[] = [
  {
    id: 1,
    idx: 1,
    orderNo: "PO-202608-001",
    projectNo: "PRJ-202608-001",
    projectName: "FF 플라스틱 사출 커버 A형",
    supplier: "(주)뉴몰드",
    deliveryQty: 15000,
    supplyAmount: 45000000,
    vatAmount: 4500000,
    ppapStatus: "PPAP 승인완료",
    closeStatus: "납품완료(마감대기)",
    deliveryDate: "2026-08-12",
    managerName: "김양훈",
  },
  {
    id: 2,
    idx: 2,
    orderNo: "PO-202608-002",
    projectNo: "PRJ-202608-002",
    projectName: "배터리 케이스 하부 하우징",
    supplier: "(주)한국정밀사출",
    deliveryQty: 8000,
    supplyAmount: 32000000,
    vatAmount: 3200000,
    ppapStatus: "PPAP 승인완료",
    closeStatus: "월마감완료",
    deliveryDate: "2026-08-05",
    managerName: "고병진",
  },
  {
    id: 3,
    idx: 3,
    orderNo: "PO-202608-003",
    projectNo: "SPX-EV-09",
    projectName: "SPX 전기차 배터리 모듈 하우징",
    supplier: "MPSI 자체생산라인",
    deliveryQty: 20000,
    supplyAmount: 60000000,
    vatAmount: 6000000,
    ppapStatus: "PPAP 승인완료",
    closeStatus: "월마감완료",
    deliveryDate: "2026-08-16",
    managerName: "김양훈",
  },
];

export default function DeliveryClosePage() {
  // 1. 검색 조건 State
  const [filterOrderNo, setFilterOrderNo] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("ALL");
  const [filterCloseStatus, setFilterCloseStatus] = useState("ALL");

  // 2. 테이블 데이터 State
  const [data, setData] = useState<DeliveryCloseItem[]>(initialDeliveries);

  // 검색
  const handleSearch = () => {
    const filtered = initialDeliveries.filter((item) => {
      const matchOrder = filterOrderNo ? item.orderNo.toLowerCase().includes(filterOrderNo.toLowerCase()) : true;
      const matchProject = filterProject ? item.projectName.includes(filterProject) || item.projectNo.toLowerCase().includes(filterProject.toLowerCase()) : true;
      const matchSupplier = filterSupplier !== "ALL" ? item.supplier === filterSupplier : true;
      const matchStatus = filterCloseStatus !== "ALL" ? item.closeStatus === filterCloseStatus : true;
      return matchOrder && matchProject && matchSupplier && matchStatus;
    });
    setData(filtered);
  };

  const handleReset = () => {
    setFilterOrderNo("");
    setFilterProject("");
    setFilterSupplier("ALL");
    setFilterCloseStatus("ALL");
    setData(initialDeliveries);
  };

  // 월 마감 및 세금계산서 발행 처리
  const handleProcessMonthlyClose = (row: DeliveryCloseItem) => {
    if (confirm(`[월 마감 및 세금계산서 발행]\n'${row.projectName}' 건의 ${row.supplier} 납품 내역(레진, 포장자재 재고 포함)을 최종 마감하시겠습니까?`)) {
      setData(prev => prev.map(item => 
        item.id === row.id ? { ...item, closeStatus: "세금계산서발행" } : item
      ));
      alert(`${row.supplier} 월 마감 내역서가 확정되었고 세금계산서/정산 연동이 완료되었습니다.`);
    }
  };

  // 월 보고 및 재고 내역 엑셀 업로드 시뮬레이션
  const handleUploadMonthlyReport = () => {
    alert("[협력사 월 마감 내역서 및 레진/포장자재 재고 양식] 업로드가 완료되었습니다.");
  };

  return (
    <div className="flex flex-col gap-3 text-xs relative">
      {/* 1. 상단 검색 필터 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex flex-col gap-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">구매 발주서 번호</span>
            <Input 
              value={filterOrderNo} 
              onChange={(e) => setFilterOrderNo(e.target.value)} 
              placeholder="PO-2026..." 
              className="h-7 text-xs" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">프로젝트/품명</span>
            <Input 
              value={filterProject} 
              onChange={(e) => setFilterProject(e.target.value)} 
              placeholder="검색어 입력" 
              className="h-7 text-xs" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">납품 협력사/생산처</span>
            <select 
              value={filterSupplier} 
              onChange={(e) => setFilterSupplier(e.target.value)} 
              className="h-7 rounded-md border bg-transparent px-2 text-xs"
            >
              <option value="ALL">전체 협력사/자체</option>
              <option value="(주)뉴몰드">(주)뉴몰드</option>
              <option value="(주)한국정밀사출">(주)한국정밀사출</option>
              <option value="MPSI 자체생산라인">MPSI 자체생산라인</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">마감 진행 상태</span>
            <select 
              value={filterCloseStatus} 
              onChange={(e) => setFilterCloseStatus(e.target.value)} 
              className="h-7 rounded-md border bg-transparent px-2 text-xs"
            >
              <option value="ALL">전체 상태</option>
              <option value="납품완료(마감대기)">납품완료(마감대기)</option>
              <option value="월마감완료">월마감완료</option>
              <option value="세금계산서발행">세금계산서발행</option>
            </select>
          </div>
          <div className="flex items-end gap-1.5">
            <Button onClick={handleSearch} className="h-7 px-3 bg-sky-600 hover:bg-sky-700 text-white gap-1 text-xs flex-1">
              <Search className="h-3.5 w-3.5 mr-1" /> 검색
            </Button>
            <Button onClick={handleReset} variant="outline" className="h-7 px-3 gap-1 text-xs text-zinc-600">
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> 초기화
            </Button>
          </div>
        </div>
      </div>

      {/* 2. 데이터 그리드 영역 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs overflow-hidden flex flex-col min-h-[480px]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border-b">
          <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-100">
            <PackageCheck className="h-4 w-4 text-sky-600" />
            <span>완제품 납품 및 월 마감 관리 (양산외주 · 자체생산 연동)</span>
          </div>
        </div>

        {/* 데이터 테이블 */}
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full border-collapse text-left whitespace-nowrap">
            <thead className="sticky top-0 bg-[#2d3748] text-white text-[11px] z-10">
              <tr>
                <th className="p-1.5 w-10 text-center border-r border-slate-600">Idx</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[120px]">구매 발주서 번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[120px]">프로젝트 번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[170px]">프로젝트/품명</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px] text-center">납품 협력사</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[100px] text-right pr-3">납품 수량</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px] text-right pr-3">공급가액 (원)</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[100px] text-center">PPAP 양산승인</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[130px] text-center">마감 진행 상태</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[130px] text-center">월 마감 및 세금계산서</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px]">납품일자</th>
                <th className="p-1.5 min-w-[90px]">MPSI 담당</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {data.map((row) => (
                <tr key={row.id} className="hover:bg-sky-50 dark:hover:bg-zinc-800/60 transition-colors odd:bg-white even:bg-zinc-50/50">
                  <td className="p-1.5 text-center font-mono text-zinc-500 border-r">{row.idx}</td>
                  <td className="p-1.5 border-r font-mono text-sky-600 font-bold">{row.orderNo}</td>
                  <td className="p-1.5 border-r font-mono">{row.projectNo}</td>
                  <td className="p-1.5 border-r font-medium">{row.projectName}</td>
                  <td className="p-1.5 border-r text-center font-bold">
                    <span className={`px-2 py-0.5 rounded text-[10px] border ${
                      row.supplier.includes("자체")
                        ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                    }`}>
                      {row.supplier}
                    </span>
                  </td>
                  <td className="p-1.5 border-r font-mono text-right pr-3 font-bold text-sky-700">{row.deliveryQty.toLocaleString()} EA</td>
                  <td className="p-1.5 border-r font-mono text-right pr-3">{row.supplyAmount.toLocaleString()}</td>
                  
                  {/* PPAP 양산승인 상태 */}
                  <td className="p-1.5 border-r text-center">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700">
                      {row.ppapStatus}
                    </span>
                  </td>

                  {/* 마감 진행 상태 */}
                  <td className="p-1.5 border-r text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      row.closeStatus === "세금계산서발행" ? "bg-emerald-100 text-emerald-700 border border-emerald-300" :
                      row.closeStatus === "월마감완료" ? "bg-purple-100 text-purple-700 border border-purple-300" :
                      "bg-amber-100 text-amber-700 border border-amber-300 animate-pulse"
                    }`}>
                      {row.closeStatus}
                    </span>
                  </td>

                  {/* 월 마감 및 세금계산서 발행 액션 */}
                  <td className="p-1.5 border-r text-center">
                    {row.closeStatus === "납품완료(마감대기)" ? (
                      <Button 
                        onClick={() => handleProcessMonthlyClose(row)} 
                        size="xs" 
                        className="h-5 px-2 bg-sky-600 hover:bg-sky-700 text-white text-[10px] gap-1 font-bold"
                      >
                        <FileText className="h-3 w-3" />
                        월 마감 실행
                      </Button>
                    ) : (
                      <span className="text-[10px] font-bold text-sky-600">발행완료</span>
                    )}
                  </td>

                  <td className="p-1.5 border-r font-mono">{row.deliveryDate}</td>
                  <td className="p-1.5">{row.managerName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
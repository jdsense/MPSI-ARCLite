"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  FileText, 
  ShoppingCart, 
  Factory, 
  Truck, 
  Layers, 
  Wrench, 
  Workflow, 
  ExternalLink, 
  Search, 
  Activity, 
  CheckCircle2, 
  Clock, 
  AlertTriangle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangeFilter, isWithinDateRange } from "@/components/common/date-range-filter";

// 3사 SCM/MES 프로젝트 데이터 인터페이스
interface DashboardProject {
  id: number;
  projectNo: string;        // MPSI 고객사 지정 관리번호 (예: NT5, A2XT)
  projectName: string;      // 프로젝트명
  productName: string;      // 품목명
  customerName: string;     // 원청 고객사
  moldVendor: string;       // 금형처 (우성정공)
  massVendor: string;       // 사출양산처 (뉴몰드)
  stepNumber: number;       // 전체 13단계 중 현재 스텝 (1~13)
  stepName: string;         // 현재 공정 단계명
  stepGroup: "수주/설계" | "금형제작" | "시사출/검사" | "양산/검증" | "출하/납품";
  trialDegree?: string;     // 시사출 차수 (T1, T2...)
  moldEvent?: "양산중" | "PM중" | "설계변경중"; // 설비 이벤트
  progress: number;         // 공정 진행률 (%)
  targetDelivery: string;   // 납기 목표일
  status: "정상진행" | "일정지연" | "승인완료" | "수정진행";
  routeUrl: string;         // 화면 이동 링크
}

// 실증 Mockup 데이터 (MPSI - 금형외주/자체 - 양산외주/자체 연계)
const mockProjects: DashboardProject[] = [
  {
    id: 1,
    projectNo: "NT5",
    projectName: "스마트 모터 하우징 개발",
    productName: "전기모터 5HP 하우징",
    customerName: "현대모비스",
    moldVendor: "우성정공(주)",
    massVendor: "(주)뉴몰드",
    stepNumber: 8,
    stepName: "시사출 치수 및 외관 검사 (MPSI 품질)",
    stepGroup: "시사출/검사",
    trialDegree: "T1 (완성률 70%)",
    moldEvent: "양산중",
    progress: 62,
    targetDelivery: "2026-09-15",
    status: "정상진행",
    routeUrl: "/portal/process/inspect-approval",
  },
  {
    id: 2,
    projectNo: "A2XT",
    projectName: "고효율 제어 판넬 커버 모듈",
    productName: "제어 판넬 커버",
    customerName: "LS ELECTRIC",
    moldVendor: "대한금형(주)",
    massVendor: "(주)한국정밀사출",
    stepNumber: 6,
    stepName: "금형 수정 및 코어 재가공 (T2 대비)",
    stepGroup: "금형제작",
    trialDegree: "T2 준비",
    moldEvent: "설계변경중",
    progress: 45,
    targetDelivery: "2026-09-30",
    status: "수정진행",
    routeUrl: "/portal/process/revision-request",
  },
  {
    id: 3,
    projectNo: "CT-09",
    projectName: "자동화 라인3 컨베이어 브라켓",
    productName: "완성형 컨베이어 브라켓",
    customerName: "삼성전자 생산기술연구소",
    moldVendor: "MPSI 자체제작팀",
    massVendor: "MPSI 자체생산라인",
    stepNumber: 11,
    stepName: "사출양산 12H 연속 사출 & CPK 검증",
    stepGroup: "양산/검증",
    moldEvent: "양산중",
    progress: 85,
    targetDelivery: "2026-08-31",
    status: "정상진행",
    routeUrl: "/portal/mass-prod/validation",
  },
  {
    id: 4,
    projectNo: "EV-M04",
    projectName: "전장 모듈용 배터리 팩 프레임",
    productName: "배터리 팩 프레임",
    customerName: "LG에너지솔루션",
    moldVendor: "우성정공(주)",
    massVendor: "(주)뉴몰드",
    stepNumber: 2,
    stepName: "제품 3D 도면검토 & CAE 성형해석",
    stepGroup: "수주/설계",
    moldEvent: "양산중",
    progress: 15,
    targetDelivery: "2026-10-20",
    status: "정상진행",
    routeUrl: "/portal/sales-order/drawing-reception",
  },
  {
    id: 5,
    projectNo: "HD-88X",
    projectName: "고정밀 다단 기어 케이스",
    productName: "다단 기어 케이스",
    customerName: "현대트랜시스",
    moldVendor: "대한금형(주)",
    massVendor: "(주)뉴몰드",
    stepNumber: 13,
    stepName: "OQC 출하합격 및 베트남 선적 완료",
    stepGroup: "출하/납품",
    moldEvent: "PM중",
    progress: 100,
    targetDelivery: "2026-08-25",
    status: "승인완료",
    routeUrl: "/portal/material/outbound",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [filterText, setFilterText] = useState("");
  const [filterGroup, setFilterGroup] = useState<string>("ALL");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState("all");

  // 1. 핵심 KPI 카운트 집계 (수주, 발주, 생산, 납품)
  const kpiData = {
    salesOrderCount: 14,       // 원청 고객사 수주 확정 건수
    purchaseOrderCount: 8,     // 우성정공/뉴몰드 외주 및 구매 발주 건수
    massProdCount: 6,          // 뉴몰드 사출 양산 가동 및 CPK 검증 건수
    deliveryCount: 12,         // 완제품 OQC 출하 및 납품 완료 건수
  };

  // 파이프라인 단계별 건수
  const inDesignCount = mockProjects.filter(p => p.stepGroup === "수주/설계").length;
  const inMoldCount = mockProjects.filter(p => p.stepGroup === "금형제작").length;
  const inTrialCount = mockProjects.filter(p => p.stepGroup === "시사출/검사").length;
  const inMassCount = mockProjects.filter(p => p.stepGroup === "양산/검증").length;
  const inShipmentCount = mockProjects.filter(p => p.stepGroup === "출하/납품").length;

  // 필터링 적용 리스트
  const filteredProjects = mockProjects.filter((p) => {
    const matchText = filterText
      ? p.projectNo.toLowerCase().includes(filterText.toLowerCase()) ||
        p.projectName.toLowerCase().includes(filterText.toLowerCase()) ||
        p.productName.toLowerCase().includes(filterText.toLowerCase())
      : true;
    const matchGroup = filterGroup !== "ALL" ? p.stepGroup === filterGroup : true;
    const matchDate = isWithinDateRange(p.targetDelivery, filterDateFrom, filterDateTo);
    return matchText && matchGroup && matchDate;
  });

  return (
    <div className="flex flex-col gap-4 text-xs">
      {/* 1. 상단 핵심 KPI 4종 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* A. 수주 확정 건수 */}
        <div 
          onClick={() => router.push("/portal/sales-order/drawing-reception")}
          className="bg-white dark:bg-zinc-900 border rounded-lg p-3.5 shadow-xs hover:border-amber-400 cursor-pointer transition-colors flex items-center justify-between"
        >
          <div className="flex flex-col gap-1">
            <span className="text-zinc-500 font-medium">수주 확정 (원청 PO)</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {kpiData.salesOrderCount}
              </span>
              <span className="text-xs font-normal text-zinc-400">건</span>
            </div>
            <span className="text-[10px] text-amber-600 font-medium">도면접수 & CAE 검토</span>
          </div>
          <div className="p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        {/* B. 외주/구매 발주 건수 */}
        <div 
          onClick={() => router.push("/portal/outsourcing/order-status")}
          className="bg-white dark:bg-zinc-900 border rounded-lg p-3.5 shadow-xs hover:border-blue-400 cursor-pointer transition-colors flex items-center justify-between"
        >
          <div className="flex flex-col gap-1">
            <span className="text-zinc-500 font-medium">외주 / 구매 발주</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {kpiData.purchaseOrderCount}
              </span>
              <span className="text-xs font-normal text-zinc-400">건</span>
            </div>
            <span className="text-[10px] text-blue-600 font-medium">금형외주/자체 & 자재구매</span>
          </div>
          <div className="p-2.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600">
            <ShoppingCart className="h-5 w-5" />
          </div>
        </div>

        {/* C. 사출 양산 / 가동 건수 */}
        <div 
          onClick={() => router.push("/portal/mass-prod/validation")}
          className="bg-white dark:bg-zinc-900 border rounded-lg p-3.5 shadow-xs hover:border-emerald-400 cursor-pointer transition-colors flex items-center justify-between"
        >
          <div className="flex flex-col gap-1">
            <span className="text-zinc-500 font-medium">사출 양산 / 검증</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {kpiData.massProdCount}
              </span>
              <span className="text-xs font-normal text-zinc-400">건</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-medium">사출양산 12H 연속사출·CPK</span>
          </div>
          <div className="p-2.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
            <Factory className="h-5 w-5" />
          </div>
        </div>

        {/* D. 완제품 납품 / 출하 건수 */}
        <div 
          onClick={() => router.push("/portal/material/outbound")}
          className="bg-white dark:bg-zinc-900 border rounded-lg p-3.5 shadow-xs hover:border-purple-400 cursor-pointer transition-colors flex items-center justify-between"
        >
          <div className="flex flex-col gap-1">
            <span className="text-zinc-500 font-medium">완제품 납품 / 출하</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {kpiData.deliveryCount}
              </span>
              <span className="text-xs font-normal text-zinc-400">건</span>
            </div>
            <span className="text-[10px] text-purple-600 font-medium">OQC 합격 & 선적/납품</span>
          </div>
          <div className="p-2.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600">
            <Truck className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 2. 공급망 공정 파이프라인 (금형외주 · 양산외주 · 자체생산 13단계 통합) */}
      <div className="bg-white dark:bg-zinc-900 border rounded-lg p-3.5 shadow-xs flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-100">
            <Layers className="h-4 w-4 text-sky-600" />
            <span>MPSI 공급망 13단계 공정 파이프라인 (금형외주 · 양산외주 · 자체생산)</span>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">
            총 {mockProjects.length}개 프로젝트 추적 중
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 pt-1">
          <div 
            onClick={() => setFilterGroup(filterGroup === "수주/설계" ? "ALL" : "수주/설계")}
            className={`p-2.5 rounded-md border cursor-pointer transition-all flex flex-col justify-between ${
              filterGroup === "수주/설계" ? "border-amber-500 ring-1 ring-amber-500 bg-amber-100/50" : "bg-amber-50/50 border-amber-200"
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-amber-800 dark:text-amber-300">1. 도면접수/검토</span>
              <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{inDesignCount}건</span>
            </div>
            <span className="text-[10px] text-zinc-500">MPSI 개발 + 금형 CAE</span>
          </div>

          <div 
            onClick={() => setFilterGroup(filterGroup === "금형제작" ? "ALL" : "금형제작")}
            className={`p-2.5 rounded-md border cursor-pointer transition-all flex flex-col justify-between ${
              filterGroup === "금형제작" ? "border-blue-500 ring-1 ring-blue-500 bg-blue-100/50" : "bg-blue-50/50 border-blue-200"
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-blue-800 dark:text-blue-300">2. 금형설계/제작</span>
              <span className="font-mono font-bold text-blue-700 dark:text-blue-400">{inMoldCount}건</span>
            </div>
            <span className="text-[10px] text-zinc-500">금형 정밀가공/조립</span>
          </div>

          <div 
            onClick={() => setFilterGroup(filterGroup === "시사출/검사" ? "ALL" : "시사출/검사")}
            className={`p-2.5 rounded-md border cursor-pointer transition-all flex flex-col justify-between ${
              filterGroup === "시사출/검사" ? "border-rose-500 ring-1 ring-rose-500 bg-rose-100/50" : "bg-rose-50/50 border-rose-200"
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-rose-800 dark:text-rose-300">3. 시사출/검사승인</span>
              <span className="font-mono font-bold text-rose-700 dark:text-rose-400">{inTrialCount}건</span>
            </div>
            <span className="text-[10px] text-zinc-500">T1~T4 육성 / Pass 판정</span>
          </div>

          <div 
            onClick={() => setFilterGroup(filterGroup === "양산/검증" ? "ALL" : "양산/검증")}
            className={`p-2.5 rounded-md border cursor-pointer transition-all flex flex-col justify-between ${
              filterGroup === "양산/검증" ? "border-emerald-500 ring-1 ring-emerald-500 bg-emerald-100/50" : "bg-emerald-50/50 border-emerald-200"
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-emerald-800 dark:text-emerald-300">4. 양산검증/사출</span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{inMassCount}건</span>
            </div>
            <span className="text-[10px] text-zinc-500">사출양산 12H 연속사출·PPAP</span>
          </div>

          <div 
            onClick={() => setFilterGroup(filterGroup === "출하/납품" ? "ALL" : "출하/납품")}
            className={`p-2.5 rounded-md border cursor-pointer transition-all flex flex-col justify-between ${
              filterGroup === "출하/납품" ? "border-purple-500 ring-1 ring-purple-500 bg-purple-100/50" : "bg-purple-50/50 border-purple-200"
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-purple-800 dark:text-purple-300">5. OQC출하/납품</span>
              <span className="font-mono font-bold text-purple-700 dark:text-purple-400">{inShipmentCount}건</span>
            </div>
            <span className="text-[10px] text-zinc-500">바코드 부착 / 선적 마감</span>
          </div>
        </div>
      </div>

      {/* 3. 프로젝트별 공정 진행 현황표 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-lg shadow-xs overflow-hidden flex flex-col min-h-[440px]">
        <div className="flex flex-col p-3 bg-zinc-50 dark:bg-zinc-800/50 border-b gap-2">
          <div className="pb-2 border-b border-zinc-200 dark:border-zinc-700">
            <DateRangeFilter
              startDate={filterDateFrom}
              endDate={filterDateTo}
              onStartDateChange={setFilterDateFrom}
              onEndDateChange={setFilterDateTo}
              selectedPreset={selectedDatePreset}
              onPresetChange={setSelectedDatePreset}
              label="납기목표일"
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-sky-600" />
              <span className="font-bold text-zinc-800 dark:text-zinc-100">전체 프로젝트 공정 진행 현황표</span>
              <span className="text-[11px] text-zinc-400 font-normal">
                (총 {filteredProjects.length}건)
              </span>
            </div>

            {/* 검색 및 단계 필터 */}
            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-60">
                <Input
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="관리번호(NT5 등), 제품명 검색"
                  className="h-7 text-xs pr-7"
                />
                <Search className="h-3.5 w-3.5 absolute right-2 top-2 text-zinc-400" />
              </div>

              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="h-7 rounded-md border bg-transparent px-2 text-xs text-zinc-700 dark:text-zinc-300"
              >
                <option value="ALL">전체 단계</option>
                <option value="수주/설계">수주/설계</option>
                <option value="금형제작">금형제작</option>
                <option value="시사출/검사">시사출/검사</option>
                <option value="양산/검증">양산/검증</option>
                <option value="출하/납품">출하/납품</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full border-collapse text-left border-spacing-0 whitespace-nowrap">
            <thead className="sticky top-0 bg-[#2d3748] text-white text-[11px] z-10">
              <tr>
                <th className="p-2 border-r border-slate-600 min-w-[100px]">관리번호</th>
                <th className="p-2 border-r border-slate-600 min-w-[160px]">프로젝트명 / 품명</th>
                <th className="p-2 border-r border-slate-600 min-w-[110px]">고객사</th>
                <th className="p-2 border-r border-slate-600 min-w-[120px]">협력사 (금형/사출)</th>
                <th className="p-2 border-r border-slate-600 min-w-[200px]">현재 공정 단계 (13단계 기준)</th>
                <th className="p-2 border-r border-slate-600 min-w-[90px] text-center">설비 이벤트</th>
                <th className="p-2 border-r border-slate-600 min-w-[120px]">진행률 (%)</th>
                <th className="p-2 border-r border-slate-600 min-w-[90px] text-center">납기 목표</th>
                <th className="p-2 border-r border-slate-600 min-w-[80px] text-center">상태</th>
                <th className="p-2 min-w-[80px] text-center">바로가기</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs">
              {filteredProjects.map((prj) => (
                <tr
                  key={prj.id}
                  className="hover:bg-sky-50/70 dark:hover:bg-zinc-800/60 transition-colors odd:bg-white even:bg-zinc-50/50 dark:odd:bg-zinc-900 dark:even:bg-zinc-900/50"
                >
                  <td className="p-2 border-r font-mono font-bold text-sky-600 dark:text-sky-400">
                    {prj.projectNo}
                  </td>
                  <td className="p-2 border-r">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[180px]" title={prj.projectName}>
                      {prj.projectName}
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {prj.productName}
                    </div>
                  </td>
                  <td className="p-2 border-r">{prj.customerName}</td>
                  <td className="p-2 border-r text-[11px]">
                    <div>금형: <span className="font-medium text-zinc-800 dark:text-zinc-200">{prj.moldVendor}</span></div>
                    <div>사출: <span className="font-medium text-zinc-800 dark:text-zinc-200">{prj.massVendor}</span></div>
                  </td>
                  <td className="p-2 border-r">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        STEP {prj.stepNumber}/13
                      </span>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">{prj.stepName}</span>
                    </div>
                    {prj.trialDegree && (
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono font-medium">
                        [{prj.trialDegree}]
                      </span>
                    )}
                  </td>
                  <td className="p-2 border-r text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      prj.moldEvent === "PM중" ? "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300" :
                      prj.moldEvent === "설계변경중" ? "bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-950 dark:text-purple-300" :
                      "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                    }`}>
                      {prj.moldEvent || "양산중"}
                    </span>
                  </td>
                  <td className="p-2 border-r">
                    <div className="flex justify-between items-center mb-1 text-[11px] font-mono">
                      <span>{prj.progress}%</span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-sky-600 dark:bg-sky-500 h-full transition-all"
                        style={{ width: `${prj.progress}%` }}
                      />
                    </div>
                  </td>
                  <td className="p-2 border-r text-center font-mono text-zinc-600 dark:text-zinc-400">
                    {prj.targetDelivery}
                  </td>
                  <td className="p-2 border-r text-center">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      prj.status === "승인완료" ? "text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300" :
                      prj.status === "수정진행" ? "text-purple-700 bg-purple-50 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300" :
                      prj.status === "일정지연" ? "text-rose-700 bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300" :
                      "text-sky-700 bg-sky-50 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300"
                    }`}>
                      {prj.status}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    <Button
                      onClick={() => router.push(prj.routeUrl)}
                      size="xs"
                      variant="outline"
                      className="h-6 px-2 text-[11px] gap-1 bg-white hover:bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    >
                      <span>이동</span>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
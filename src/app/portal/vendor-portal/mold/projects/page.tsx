"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Briefcase, Wrench, Hammer, Gauge, FileText, CheckCircle2, 
  Clock, AlertTriangle, Search, RefreshCw, Eye, 
  UploadCloud, ExternalLink, Save, ArrowRight, 
  RotateCcw, Sparkles, Building2, Check, X, ShieldAlert,
  ChevronRight, Calendar, Layers, ListTree, Activity, Settings, Info, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangeFilter, isWithinDateRange, DatePresetType } from "@/components/common/date-range-filter";
import { 
  useProjectMaster, 
  ProjectItem, 
  PROCESS_13_STEPS, 
  getStepActor,
  getStepBullets,
  getStepUrl 
} from "@/lib/project-store";
import { useAuthRole } from "@/lib/role-store";
import { useMoldManufactureStore } from "@/lib/mold-manufacture-store";

export default function VendorMoldProjectsPage() {
  const router = useRouter();
  const { projects, activeProjects, updateStep } = useProjectMaster();
  const { manufactures } = useMoldManufactureStore();
  const { role, vendorName } = useAuthRole();

  // 현재 로그인/선택된 금형 외주업체 (우성정공 등)
  const currentVendor = (role === "VENDOR_MOLD" && vendorName && !vendorName.includes("MPSI"))
    ? vendorName
    : (vendorName && !vendorName.includes("MPSI") ? vendorName : "우성정공(주)");

  // 필터 상태
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDateType, setFilterDateType] = useState<"updatedAt" | "targetT1Date" | "targetMassDate">("updatedAt");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePresetType>("all");

  // CRUD 모달 상태
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // 13단계 다이어그램 모달 상태
  const [diagramProject, setDiagramProject] = useState<ProjectItem | null>(null);
  const [isDiagramModalOpen, setIsDiagramModalOpen] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const handleOpenDiagram = (project: ProjectItem) => {
    setDiagramProject(project);
    setExpandedStep(null);
    setIsDiagramModalOpen(true);
  };

  const handleNavigateToStepPage = (step: number, projectNo?: string) => {
    const targetUrl = getStepUrl(step, projectNo);
    setIsDiagramModalOpen(false);
    router.push(targetUrl);
  };

  // 금형 제작 일정표 엑셀 다운로드 핸들러
  const handleDownloadSchedule = (file?: { fileName: string; fileSize?: string; uploadedAt?: string; uploadedBy?: string }, projectNo?: string) => {
    const fileName = file?.fileName || `금형제작일정표_${projectNo || "MOLD"}.xlsx`;
    const dummyContent = `[${currentVendor} 금형 제작 일정표]\n프로젝트 번호: ${projectNo || ""}\n파일명: ${fileName}\n등록일시: ${file?.uploadedAt || new Date().toLocaleString()}\n등록자: ${file?.uploadedBy || ""}\n공정 구분: 6단계 금형제작 일정표 (Excel Schedule Data)`;
    const blob = new Blob([dummyContent], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 토스트 알림
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 모달 폼 상태 (가공률, T1 실적, DR 의견 등)
  const [editForm, setEditForm] = useState({
    trialCompletionRate: 0,
    trialDegree: "T1 대기",
    stepStatus: "진행중" as ProjectItem["stepStatus"],
    currentStep: 7,
    notes: "",
    // 7대 가공 공정별 진행률
    gunDrill: 0,
    milling: 0,
    heatTreatment: 0,
    cnc: 0,
    edm: 0,
    polishing: 0,
    assembly: 0,
    // T1 사출 조건
    t1Date: "",
    t1Temp: "220",
    t1Pressure: "140",
    t1CycleTime: "38",
    drNote: "",
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // 협력사 이름 정규화 유틸리티 ((주), 주식회사, 공백 제거 후 비교)
  const cleanVendorName = (name?: string) => {
    return (name || "").replace(/\(주\)|주식회사|\s/g, "").trim().toLowerCase();
  };

  const isMatchingVendor = (projectVendor?: string, targetVendor?: string) => {
    const pClean = cleanVendorName(projectVendor);
    const tClean = cleanVendorName(targetVendor);
    if (!pClean || !tClean) return false;
    return pClean === tClean || pClean.includes(tClean) || tClean.includes(pClean);
  };

  // 현재 외주업체에게 배정된 금형 프로젝트 목록 필터링 (MPSI 연동)
  // * 전체 프로젝트 매트릭스는 배제
  // * 수주가 확정되어 MI로 시작하는 정식 프로젝트만 노출 ("Q"로 시작하는 견적 단계 프로젝트는 철저히 배제)
  // * 최신 리비전(설계변경 E차수가 있는 경우 이전 차수 배제) 적용
  const baseProjects = activeProjects && activeProjects.length > 0 ? activeProjects : projects;
  const vendorProjects = baseProjects.filter((p) => {
    // 1. Q로 시작하거나 0단계 견적 건은 외주업체 프로젝트 관리 목록에 절대 노출하지 않음
    if (p.projectNo?.startsWith("Q") || p.currentStep === 0 || !p.isContractConfirmed) {
      return false;
    }

    // 2. 자사 배정 프로젝트 매칭 (금형제작 외주업체명 정규화 매칭)
    const matchVendor = isMatchingVendor(p.moldVendor, currentVendor);
    if (!matchVendor) return false;

    // 3. 키워드 검색
    if (filterKeyword.trim()) {
      const kw = filterKeyword.toLowerCase().trim();
      const matchNo = p.projectNo?.toLowerCase().includes(kw);
      const matchProd = p.productName?.toLowerCase().includes(kw);
      const matchName = p.projectName?.toLowerCase().includes(kw);
      const matchCust = p.customerName?.toLowerCase().includes(kw);
      if (!matchNo && !matchProd && !matchName && !matchCust) return false;
    }

    // 4. 상태 필터
    if (filterStatus !== "ALL" && p.stepStatus !== filterStatus) {
      return false;
    }

    // 5. 조회 기간 필터
    const targetDate = p[filterDateType];
    const matchDate = isWithinDateRange(targetDate, filterDateFrom, filterDateTo);
    if (!matchDate) return false;

    return true;
  });

  // 현황 명칭 및 뱃지 스타일 산출 함수
  // 1) 금형이 승인되어 양산처에 입고 되었으면 양산처의 "금형 현황" 표시
  // 2) 그렇지 않으면 공정일정표의 "금형제작 현황" (미입력 / 금형 설계 중 / 가공 중 / 습합 중 / 금형 육성 중) 표시
  const getProjectCurrentStatus = (row: ProjectItem) => {
    // 1) 양산처 이관/입고 이후 단계 (Step 10 이상 또는 금형 승인)
    if (row.currentStep >= 13 || row.stepNameCustom?.includes("양산 중")) {
      return {
        text: "양산 중",
        className: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold",
      };
    }
    if (row.currentStep === 12 || row.stepNameCustom?.includes("PPAP")) {
      return {
        text: "양산승인 (PPAP)",
        className: "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 font-bold",
      };
    }
    if (row.currentStep === 11 || row.stepNameCustom?.includes("시양산")) {
      return {
        text: "시양산 (양산성 검증)",
        className: "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 font-bold",
      };
    }
    if (row.currentStep === 10 || row.trialDegree === "금형 승인") {
      return {
        text: "양산처 입고",
        className: "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 font-bold",
      };
    }

    // 2) 금형 제작/육성 단계: 공정일정표의 "금형제작 현황" 연동
    const mfg = manufactures.find((m) => m.projectNo === row.projectNo);
    let statusText = mfg?.manufactureStatus;

    if (!statusText) {
      if (row.currentStep >= 7 && row.currentStep <= 9) {
        statusText = "금형 육성 중";
      } else if (row.currentStep === 6) {
        statusText = "가공 중";
      } else if (row.currentStep === 5) {
        statusText = "금형 설계 중";
      } else {
        statusText = "미입력";
      }
    }

    let badgeClass = "bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 font-medium";
    if (statusText === "금형 육성 중") {
      badgeClass = "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 font-bold";
    } else if (statusText === "습합 중") {
      badgeClass = "bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold";
    } else if (statusText === "가공 중") {
      badgeClass = "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 font-bold";
    } else if (statusText === "금형 설계 중") {
      badgeClass = "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 font-bold";
    }

    return {
      text: statusText,
      className: badgeClass,
    };
  };

  // 실적 등록/수정 모달 열기 (타 메뉴 데이터 연동 종합 뷰)
  const handleOpenEditModal = (p: ProjectItem) => {
    setSelectedProject(p);
    setIsEditModalOpen(true);
  };

  // KPI 요약 (자사 배정 프로젝트 기준)
  const kpiTotal = vendorProjects.length;
  const kpiInProgress = vendorProjects.filter((p) => p.stepStatus === "진행중").length;
  const kpiFail = vendorProjects.filter((p) => p.stepStatus === "Fail(수정중)").length;
  const kpiCompleted = vendorProjects.filter((p) => p.stepStatus === "완료").length;

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 0. 토스트 알림 */}
      {toastMessage && (
        <div className="fixed top-4 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-xl bg-purple-700 text-white border border-purple-800 text-xs font-medium animate-in fade-in">
          <Sparkles className="h-4 w-4" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-80">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 1. MPSI /portal/project 스타일 헤더 배너 (외주업체 전용) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-zinc-900 p-3 rounded-lg border shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                3사 연계 프로젝트 현황 관리대장
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-700 text-white shadow-2xs">
                [{currentVendor}] 금형제작 외주 관제
              </span>
              <span className="text-[11px] text-zinc-500 font-medium">
                (조회 결과: <b className="text-purple-700 dark:text-purple-300 font-mono font-bold">{vendorProjects.length}</b>건 / 전체: <b className="font-mono">{projects.filter(p => !p.projectNo?.startsWith('Q')).length}</b>건)
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              * MPSI 자사 배정 공식 프로젝트(MI) 목록입니다. 견적 단계(Q)는 제외되며 7대 가공 공정 실적을 직접 등록할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 2. 상단 KPI 통계 카드 */}
      {/* <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border shadow-2xs">
          <span className="text-zinc-500 text-[11px]">총 수주 금형 건수</span>
          <div className="flex items-center justify-between mt-1">
            <b className="text-lg font-mono text-zinc-900 dark:text-zinc-100">{kpiTotal}건</b>
            <Building2 className="h-4 w-4 text-purple-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border shadow-2xs">
          <span className="text-zinc-500 text-[11px]">정상 가공/진행 중</span>
          <div className="flex items-center justify-between mt-1">
            <b className="text-lg font-mono text-sky-600">{kpiInProgress}건</b>
            <Clock className="h-4 w-4 text-sky-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border shadow-2xs">
          <span className="text-zinc-500 text-[11px]">금형 수정 대응 (Fail)</span>
          <div className="flex items-center justify-between mt-1">
            <b className="text-lg font-mono text-rose-600">{kpiFail}건</b>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border shadow-2xs">
          <span className="text-zinc-500 text-[11px]">금형 양산 승인 완료</span>
          <div className="flex items-center justify-between mt-1">
            <b className="text-lg font-mono text-emerald-600">{kpiCompleted}건</b>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
        </div>
      </div> */}

      {/* 3. 검색 필터 바 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[220px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              placeholder="프로젝트 번호 / 제품명 / 차종 / 고객사 검색"
              className="h-7 pl-8 text-xs font-medium"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-7 rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-medium"
          >
            <option value="ALL">전체 진행상태</option>
            <option value="진행중">정상 진행중</option>
            <option value="Fail(수정중)">Fail (금형수정 중)</option>
            <option value="지연주의">지연주의</option>
            <option value="완료">완료 (승인)</option>
          </select>

          {/* 일자 기준 셀렉터 */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-zinc-500 shrink-0">일자 기준:</span>
            <select
              value={filterDateType}
              onChange={(e) => setFilterDateType(e.target.value as any)}
              className="h-7 rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-medium"
            >
              <option value="updatedAt">최종 갱신일</option>
              <option value="targetT1Date">목표 T1 일정</option>
              <option value="targetMassDate">양산 목표일</option>
            </select>
          </div>

          {/* 조회 기간 필터 */}
          <DateRangeFilter
            compact
            startDate={filterDateFrom}
            endDate={filterDateTo}
            selectedPreset={selectedDatePreset}
            onStartDateChange={setFilterDateFrom}
            onEndDateChange={setFilterDateTo}
            onPresetChange={setSelectedDatePreset}
          />
        </div>

        <Button
          onClick={() => {
            setFilterKeyword("");
            setFilterStatus("ALL");
            setFilterDateFrom("");
            setFilterDateTo("");
            setSelectedDatePreset("all");
          }}
          variant="outline"
          className="h-7 px-2.5 text-xs gap-1 text-zinc-600 self-end sm:self-auto"
        >
          <RefreshCw className="h-3 w-3" />
          초기화
        </Button>
      </div>

      {/* 4. 자사 수주 프로젝트 목록 테이블 (MPSI /portal/project와 동일한 다크 네이비 테마 및 컬럼 구조) */}
      <div className="overflow-x-auto overflow-y-auto flex-1 border border-slate-700/60 rounded-lg bg-white dark:bg-zinc-900 shadow-sm min-h-[460px]">
        <table className="w-full border-collapse text-left border-spacing-0 whitespace-nowrap text-[11px]">
          {/* MPSI /portal/project와 동일한 프리미엄 네이비 헤더 */}
          <thead className="sticky top-0 bg-[#1e293b] text-white text-[11px] font-bold z-10 border-b border-slate-700">
            <tr>
              <th className="py-2.5 px-2 w-10 text-center border-r border-slate-700">No</th>
              <th className="py-2.5 px-2 border-r border-slate-700 min-w-[110px] text-center">프로젝트 번호</th>
              <th className="py-2.5 px-2 border-r border-slate-700 min-w-[75px] text-center text-amber-300">신작/설변</th>
              <th className="py-2.5 px-2 border-r border-slate-700 min-w-[85px] text-center">고객사</th>
              <th className="py-2.5 px-2 border-r border-slate-700 min-w-[120px] text-center">프로젝트명</th>
              <th className="py-2.5 px-2 border-r border-slate-700 min-w-[150px] text-center">제품명</th>
              <th className="py-2.5 px-2 border-r border-slate-700 min-w-[70px] text-center">품 번</th>
              <th className="py-2.5 px-2 border-r border-slate-700 min-w-[100px] text-center">금형번호</th>
              <th className="py-2.5 px-2 border-r border-slate-700 min-w-[75px] text-center text-purple-300">금형차수</th>
              <th className="py-2.5 px-2 border-r border-slate-700 min-w-[80px] text-center">캐비티사양</th>
              <th className="py-2.5 px-2 border-r border-slate-700 min-w-[120px] text-center bg-slate-800">현황</th>
              <th className="py-2.5 px-2 border-r border-slate-700 min-w-[90px] text-center">킥오프</th>
              <th className="py-2.5 px-2 border-r border-slate-700 min-w-[95px] text-center text-emerald-300">목표 T1</th>
              <th className="py-2.5 px-2 border-r border-slate-700 min-w-[100px] text-center text-purple-300">금형 출고 납기</th>
              <th className="py-2.5 px-2 min-w-[70px] text-center bg-purple-950">상세</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200 text-[11px]">
            {vendorProjects.length === 0 ? (
              <tr>
                <td colSpan={15} className="p-10 text-center text-zinc-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Calendar className="h-8 w-8 text-zinc-300" />
                    <span>현재 [{currentVendor}]에 배정된 정식 수주 프로젝트(MI)가 없습니다.</span>
                  </div>
                </td>
              </tr>
            ) : (
              vendorProjects.map((row, idx) => {
                const statusInfo = getProjectCurrentStatus(row);
                const moldNoDisplay = row.moldNo || (row.projectNo ? `${row.projectNo.split("-")[0].replace(/P0$/, "")}M` : "-");

                return (
                  <tr 
                    key={row.id} 
                    className="odd:bg-white even:bg-slate-50/60 dark:odd:bg-zinc-900 dark:even:bg-zinc-800/40 hover:bg-purple-50/70 dark:hover:bg-zinc-800 transition-colors"
                  >
                    {/* 1. No */}
                    <td className="p-2 text-center font-mono text-zinc-400 border-r border-slate-200 dark:border-zinc-800">{idx + 1}</td>
                    
                    {/* 2. 프로젝트 번호 (단순 텍스트) */}
                    <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono font-bold text-purple-700 dark:text-purple-300">
                      <span>{row.projectNo}</span>
                    </td>

                    {/* 2-1. 신작/설변 (N001, E001) */}
                    <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold border shadow-2xs ${
                        row.changeType?.startsWith("E")
                          ? "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300"
                          : "bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300"
                      }`}>
                        {row.changeType || "N001"}
                      </span>
                    </td>

                    {/* 3. 고객사 */}
                    <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center text-zinc-600">{row.customerName}</td>

                    {/* 4. 프로젝트명 */}
                    <td className="p-2 border-r border-slate-200 dark:border-zinc-800 font-medium truncate max-w-[130px]">{row.projectName}</td>

                    {/* 5. 제품명 */}
                    <td className="p-2 border-r border-slate-200 dark:border-zinc-800 font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[160px]">{row.productName}</td>

                    {/* 6. 품번 */}
                    <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono text-zinc-500">{row.partNo || "-"}</td>

                    {/* 7. 금형번호 */}
                    <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                      {moldNoDisplay}
                    </td>

                    {/* 7-1. 금형차수 (M1, M2) */}
                    <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">
                        {row.moldDegree || "M1"}
                      </span>
                    </td>

                    {/* 8. 캐비티사양 */}
                    <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono text-[10px]">{row.cavity}</td>

                    {/* 9. 현황 (공정일정표 금형제작 현황 또는 양산처 금형 현황 연동) */}
                    <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs ${statusInfo.className}`}>
                        {statusInfo.text}
                      </span>
                    </td>

                    {/* 10. 킥오프 */}
                    <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono text-zinc-500">{row.kickoffDate || "-"}</td>

                    {/* 11. 목표 T1 */}
                    <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">{row.targetT1Date || "-"}</td>

                    {/* 12. 금형 출고 납기 */}
                    <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono font-bold text-purple-700 dark:text-purple-400">{row.moldDeliveryDate || "-"}</td>

                    {/* 13. 상세 액션 버튼 */}
                    <td className="p-2 text-center bg-purple-50/30">
                      <Button
                        onClick={() => handleOpenEditModal(row)}
                        size="xs"
                        className="h-6 px-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold gap-1 text-[10px] shadow-2xs cursor-pointer"
                      >
                        <Eye className="h-3 w-3" />
                        <span>상세</span>
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 5. [외주업체 전용 종합 현황 모달] 실적 등록 및 수정 - 타 메뉴 데이터 연동 뷰 */}
      {isEditModalOpen && selectedProject && (() => {
        const mfg = manufactures.find((m) => m.projectNo === selectedProject.projectNo);
        const currentStepObj = PROCESS_13_STEPS.find((s) => s.step === selectedProject.currentStep);
        const moldData = selectedProject.moldData;
        const statusInfo = getProjectCurrentStatus(selectedProject);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-xl shadow-2xl border overflow-hidden flex flex-col max-h-[92vh]">
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-[#1e293b] text-white">
                <div className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-purple-300" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm">
                        [{selectedProject.projectNo}] [{selectedProject.moldNo || (selectedProject.projectNo ? `${selectedProject.projectNo.split("-")[0].replace(/P0$/, "")}M` : "-")}] 금형 제작 및 가공 실적
                      </h3>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-purple-900/80 border border-purple-400 text-purple-200">
                        금형차수: {selectedProject.moldDegree || "M1"}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-sky-900/80 border border-sky-400 text-sky-200">
                        {selectedProject.changeType || "N001"}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-300">
                      금형제작처: {currentVendor} | 차종: {selectedProject.projectName} - {selectedProject.productName}
                    </span>
                  </div>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="text-slate-300 hover:text-white cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* 모달 본문 */}
              <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs">
                {/* 3-1. 기본 정보와 일정 표기 (제목: 제작정보 및 일정) */}
                <div className="border rounded-xl p-3.5 bg-purple-50/40 dark:bg-zinc-800/40 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-bold text-xs text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4 text-purple-600" />
                      제작정보 및 일정
                    </h4>
                    <span className="text-[10px] text-zinc-500">
                      * 프로젝트 관리 대장 및 금형 견적 내용 연동
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                    <div><span className="text-zinc-500">원청 고객사:</span> <b className="ml-1 text-zinc-900 dark:text-zinc-100">{selectedProject.customerName}</b></div>
                    <div><span className="text-zinc-500">제품명:</span> <b className="ml-1 text-zinc-900 dark:text-zinc-100 truncate">{selectedProject.productName}</b></div>
                    <div>
                      <span className="text-zinc-500">금형제작처:</span> 
                      <b className="ml-1 text-purple-700 dark:text-purple-300 font-bold">[외주] {selectedProject.moldVendor}</b>
                    </div>
                    <div>
                      <span className="text-zinc-500">사출양산처:</span> 
                      <b className="ml-1 text-emerald-600 dark:text-emerald-400 font-bold">[외주] {selectedProject.massVendor}</b>
                    </div>

                    <div>
                      <span className="text-zinc-500">금형번호:</span> 
                      <b className="ml-1 font-mono font-bold text-purple-800 dark:text-purple-300">
                        {selectedProject.moldNo || (selectedProject.projectNo ? `${selectedProject.projectNo.split("-")[0].replace(/P0$/, "")}M` : "-")}
                      </b>
                    </div>
                    <div>
                      <span className="text-zinc-500">금형차수 / 구분:</span> 
                      <span className="ml-1 inline-flex items-center gap-1">
                        <b className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300">{selectedProject.moldDegree || "M1"}</b>
                        <b className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-sky-100 text-sky-800 border border-sky-300">{selectedProject.changeType || "N001"}</b>
                      </span>
                    </div>
                    <div><span className="text-zinc-500">캐비티/재질:</span> <b className="ml-1 text-zinc-800 dark:text-zinc-200">{selectedProject.cavity} / {selectedProject.material}</b></div>
                    <div><span className="text-zinc-500">수주일 / 발주일:</span> <b className="ml-1 font-mono text-zinc-700 dark:text-zinc-300">{selectedProject.orderDate || "-"} / {selectedProject.poDate || selectedProject.registeredDate || "-"}</b></div>

                    <div><span className="text-zinc-500">킥오프:</span> <b className="ml-1 font-mono text-zinc-700 dark:text-zinc-300">{selectedProject.kickoffDate || "-"}</b></div>
                    <div><span className="text-zinc-500">목표 T1 일정:</span> <b className="ml-1 text-purple-700 font-mono font-bold">{selectedProject.targetT1Date || "-"}</b></div>

                    {/* 금형 출고 납기 (요청 반영 추가) */}
                    <div className="bg-purple-100/70 dark:bg-purple-950/60 p-1.5 rounded border border-purple-300 dark:border-purple-800">
                      <span className="text-purple-800 dark:text-purple-200 font-bold">금형 출고 납기:</span> 
                      <b className="ml-1 text-purple-900 dark:text-purple-100 font-mono font-extrabold">{selectedProject.moldDeliveryDate || "-"}</b>
                    </div>
                    <div><span className="text-zinc-500">목표 양산납품(PPAP):</span> <b className="ml-1 font-mono text-amber-600 font-bold">{selectedProject.targetMassDate || "-"}</b></div>
                    <div><span className="text-zinc-500">양산시작일:</span> <b className="ml-1 font-mono text-emerald-600 font-bold">{selectedProject.massStartDate || "-"}</b></div>
                    <div><span className="text-zinc-500">현재 육성차수:</span> <b className="ml-1 font-mono text-zinc-800 dark:text-zinc-200 font-bold">{selectedProject.trialDegree || "T1 대기"}</b></div>
                  </div>
                </div>

                {/* 3-2. 금형 제작 현황 (데이터 연동: 8대 RFQ 스펙 + 5대 제작현황 배지 및 일정표 Excel 다운로드) */}
                <div className="border rounded-xl p-3.5 bg-white dark:bg-zinc-900 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                      <Hammer className="h-4 w-4 text-purple-600" />
                      금형 제작 현황
                    </h4>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-2xs ${statusInfo.className}`}>
                      {statusInfo.text}
                    </span>
                  </div>

                  {/* 견적 검토용 최소 8대 생산 기술 정보 (RFQ Spec) */}
                  <div className="bg-zinc-50/80 dark:bg-zinc-800/40 p-2.5 rounded-lg border flex flex-col gap-1.5 text-[11px]">
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold">
                      <span className="flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
                        <Settings className="h-3 w-3 text-purple-600" />
                        견적 검토용 최소 8대 생산 기술 정보 (RFQ Spec)
                      </span>
                      <span>금형 제작 및 사출 성형 타당성 검토 기준</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10.5px]">
                      <div>1. 제품 중량: <b className="font-mono text-purple-700">{selectedProject.partWeight || "420g"}</b></div>
                      <div>2. 캐비티 수: <b className="font-mono font-bold">{selectedProject.cavity || "1*2"}</b></div>
                      <div>3. 연간 볼륨(EAU): <b className="font-mono text-sky-600">{typeof selectedProject.annualVolume === "number" ? selectedProject.annualVolume.toLocaleString() : selectedProject.annualVolume || "50,000"} ea/년</b></div>
                      <div>4. 사출기 톤수: <b className="font-mono">{selectedProject.machineTon || "650T"}</b></div>
                      <div>5. HRS 사양: <b className="text-purple-700">{selectedProject.hrsSpec || "밸브게이트 2-Drop"}</b></div>
                      <div>6. 금형 소재: <b className="font-mono font-bold">{selectedProject.moldMaterial || "NAK80"}</b></div>
                      <div>7. 원자재(레진): <b className="font-bold text-zinc-800 dark:text-zinc-200">{selectedProject.resinSpec || "PP-EPDM"}</b></div>
                      <div>8. 보증 수명: <b className="font-mono text-emerald-600">{typeof selectedProject.warrantyShots === "number" ? selectedProject.warrantyShots.toLocaleString() : selectedProject.warrantyShots || "500,000"} Shot</b></div>
                    </div>
                  </div>

                  {/* 방안 B: 7대 공정율 삭제 ➔ 금형제작 진행 현황 5단계 배지 & 일정표 엑셀 파일 연동 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
                    {/* 좌측: 금형 제작 현황 5단계 배지 및 설명 */}
                    <div className="p-3 rounded-lg border bg-zinc-50 dark:bg-zinc-800/40 flex flex-col justify-between gap-2">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                            <Activity className="h-3.5 w-3.5 text-purple-600" />
                            금형 제작 현황 단계
                          </span>
                          <span className="text-[10px] text-zinc-400">클라이언트 정의 5단계</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-2xs ${statusInfo.className}`}>
                            {statusInfo.text}
                          </span>
                          <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
                            {statusInfo.text === "미입력" && "일정표가 아직 입력되지 않은 초기 상태입니다."}
                            {statusInfo.text === "금형 설계 중" && "금형 제작 PO 발행일 기준 금형 3D 설계 진행 중입니다."}
                            {statusInfo.text === "가공 중" && "소재 입고 후 코어/원판 가공 착수 진행 중입니다."}
                            {statusInfo.text === "습합 중" && "가공 완료 후 상하 코어 조립 및 습합 착수 상태입니다."}
                            {statusInfo.text === "금형 육성 중" && "T1 시사출이 시작되어 금형 육성 루프 진행 중입니다."}
                            {statusInfo.text?.includes("양산") && "금형 승인이 완료되어 양산처 이관/입고되었습니다."}
                          </span>
                        </div>
                      </div>

                      <div className="text-[10.5px] text-zinc-500 pt-2 border-t flex items-center justify-between">
                        <span>목표 T1 시사출: <b className="font-mono text-purple-700 dark:text-purple-300">{selectedProject.targetT1Date || "-"}</b></span>
                        <span>금형 출고 납기: <b className="font-mono text-purple-700 dark:text-purple-300 font-bold">{selectedProject.moldDeliveryDate || "-"}</b></span>
                      </div>
                    </div>

                    {/* 우측: 제작 일정표 엑셀 파일 다운로드 연동 */}
                    <div className="p-3 rounded-lg border bg-zinc-50 dark:bg-zinc-800/40 flex flex-col justify-between gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-purple-600" />
                          금형 제작 일정표 (Excel 첨부)
                        </span>
                        {mfg?.scheduleFile && (
                          <span className="text-[10px] text-purple-700 font-bold bg-purple-100 dark:bg-purple-950/60 px-1.5 py-0.2 rounded border border-purple-200 dark:border-purple-800">
                            최신본
                          </span>
                        )}
                      </div>

                      {mfg?.scheduleFile ? (
                        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-2.5 rounded-md border gap-2">
                          <div className="flex flex-col min-w-0">
                            <span className="font-mono font-bold text-purple-700 dark:text-purple-300 text-[11px] truncate">
                              {mfg.scheduleFile.fileName}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {mfg.scheduleFile.uploadedAt} · {mfg.scheduleFile.uploadedBy} ({mfg.scheduleFile.fileSize || "1.2MB"})
                            </span>
                          </div>
                          <Button
                            type="button"
                            onClick={() => handleDownloadSchedule(mfg.scheduleFile, selectedProject.projectNo)}
                            size="xs"
                            variant="outline"
                            className="h-6 text-[10px] gap-1 cursor-pointer shrink-0 border-purple-300 text-purple-700 hover:bg-purple-50"
                          >
                            <Download className="h-3 w-3 text-purple-600" />
                            다운로드
                          </Button>
                        </div>
                      ) : (
                        <div className="p-2.5 text-center text-zinc-400 border border-dashed rounded-md bg-white dark:bg-zinc-900 text-[10.5px]">
                          등록된 일정표 엑셀 파일이 없습니다.
                        </div>
                      )}

                      <div className="text-[10px] text-zinc-400 pt-1">
                        <span>* 일정표(Excel) 및 제작현황은 <b>금형제작 일정관리</b> 데이터와 연동됩니다.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3-3. 시사출및 금형육성 (시사출 결과 및 조건표 연동) */}
                <div className="border rounded-xl p-3.5 bg-white dark:bg-zinc-900 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                      <Gauge className="h-4 w-4 text-purple-600" />
                      시사출및 금형육성
                    </h4>
                    <span className="text-[10px] text-zinc-500">
                      * 시사출 결과 및 성형조건표 연동
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-[11px]">
                    <div className="p-2 rounded border bg-zinc-50 dark:bg-zinc-800/40">
                      <span className="block text-[10px] text-zinc-500">현재 시사출 차수</span>
                      <b className="font-mono text-purple-700 dark:text-purple-300 text-xs mt-0.5 block font-bold">{selectedProject.trialDegree || "T1 대기"}</b>
                    </div>
                    <div className="p-2 rounded border bg-zinc-50 dark:bg-zinc-800/40">
                      <span className="block text-[10px] text-zinc-500">실제 시사출 일자</span>
                      <b className="font-mono text-zinc-800 dark:text-zinc-200 text-xs mt-0.5 block">{moldData?.t1Date || selectedProject.targetT1Date || "-"}</b>
                    </div>
                    <div className="p-2 rounded border bg-zinc-50 dark:bg-zinc-800/40">
                      <span className="block text-[10px] text-zinc-500">사출 온도</span>
                      <b className="font-mono text-zinc-800 dark:text-zinc-200 text-xs mt-0.5 block">{moldData?.t1Temp || "220"} °C</b>
                    </div>
                    <div className="p-2 rounded border bg-zinc-50 dark:bg-zinc-800/40">
                      <span className="block text-[10px] text-zinc-500">사출 압력</span>
                      <b className="font-mono text-zinc-800 dark:text-zinc-200 text-xs mt-0.5 block">{moldData?.t1Pressure || "140"} bar</b>
                    </div>
                    <div className="p-2 rounded border bg-zinc-50 dark:bg-zinc-800/40">
                      <span className="block text-[10px] text-zinc-500">사이클 타임</span>
                      <b className="font-mono text-zinc-800 dark:text-zinc-200 text-xs mt-0.5 block">{moldData?.t1CycleTime || "38"} sec</b>
                    </div>
                  </div>

                  {/* 품질 성적서 파일 연동 안내 */}
                  <div className="p-2.5 rounded-lg border border-purple-200 bg-purple-50/40 dark:bg-purple-950/20 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-600 shrink-0" />
                    <span className="text-[11px] text-zinc-700 dark:text-zinc-300">
                      CMM 3차원 측정 성적서 & 5대 승인서류: <b>등록 완료 (CMM_Report_Rev2.pdf)</b>
                    </span>
                  </div>
                </div>

                {/* 3-4. 13단계 프로세스 위치 (데이터 연동 및 진행 상태 반영) */}
                <div className="border rounded-xl p-3.5 bg-zinc-50 dark:bg-zinc-800/40 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                      <ListTree className="h-4 w-4 text-purple-600" />
                      13단계 프로세스 위치
                    </h4>
                    <span className="text-[10px] text-zinc-500">
                      * 13단계 개발 프로세스 현황 관리
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                    <div>
                      <span className="text-zinc-500 block text-[10px]">현재 프로세스 단계</span>
                      <b className="text-xs text-purple-700 dark:text-purple-300 mt-0.5 block font-bold">
                        Step {selectedProject.currentStep}: {currentStepObj?.name || `Step ${selectedProject.currentStep}`}
                      </b>
                      <span className="text-[10px] text-zinc-400">
                        담당: {getStepActor(selectedProject.currentStep, selectedProject)}
                      </span>
                    </div>

                    <div>
                      <span className="text-zinc-500 block text-[10px]">공정 진행 상태</span>
                      <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        selectedProject.stepStatus === "완료"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : selectedProject.stepStatus === "Fail(수정중)"
                          ? "bg-rose-50 text-rose-700 border-rose-300 font-bold"
                          : selectedProject.stepStatus === "지연주의"
                          ? "bg-amber-50 text-amber-700 border-amber-300"
                          : "bg-sky-50 text-sky-700 border-sky-300"
                      }`}>
                        {selectedProject.stepStatus}
                      </span>
                    </div>

                    <div>
                      <span className="text-zinc-500 block text-[10px]">외주사 전달사항 및 비고</span>
                      <p className="text-zinc-700 dark:text-zinc-300 text-[10.5px] mt-0.5 font-medium line-clamp-2">
                        {selectedProject.notes || "특이사항 없음 (정상 진행 중)"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 모달 푸터: 닫기 */}
              <div className="flex items-center justify-end p-3.5 bg-zinc-100 dark:bg-zinc-800 border-t">
                <Button onClick={() => setIsEditModalOpen(false)} variant="outline" className="h-8 px-5 text-xs cursor-pointer">
                  닫기
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 4. 0~13단계 상세 공정 관제 모달 (/mass/validation 스타일) */}
      {isDiagramModalOpen && diagramProject && (() => {
        const curProject = diagramProject;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-[95vw] 2xl:max-w-[1580px] rounded-xl shadow-2xl border overflow-hidden flex flex-col max-h-[94vh]">
              {/* 모달 상단 헤더 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 bg-[#1e293b] text-white border-b border-slate-700 gap-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <ListTree className="h-5 w-5 text-purple-400" />
                  <div>
                    <h3 className="font-bold text-sm">
                      프로젝트 0~13단계 상세 공정 관제
                    </h3>
                    <span className="text-[11px] text-slate-300">
                      [{curProject.projectNo}] {curProject.projectName} - {curProject.productName} ({curProject.customerName})
                    </span>
                  </div>
                </div>

                <button onClick={() => setIsDiagramModalOpen(false)} className="text-zinc-400 hover:text-white ml-2">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* 모달 본문 */}
              <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs bg-zinc-50/50 dark:bg-zinc-900/40">
                {/* 프로젝트 전환 드롭다운 */}
                <div className="flex flex-col gap-2.5 bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 font-medium shrink-0">대상 프로젝트:</span>
                    <select 
                      value={curProject.projectNo}
                      onChange={(e) => {
                        const found = vendorProjects.find((p) => p.projectNo === e.target.value);
                        if (found) setDiagramProject(found);
                      }}
                      className="flex-1 min-w-0 h-7 rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-mono font-bold text-purple-700 dark:text-purple-400"
                    >
                      {vendorProjects.map((p) => (
                        <option key={`${p.id}-${p.projectNo}`} value={p.projectNo}>
                          [{p.projectNo}] {p.projectName} - {p.productName} ({p.customerName || "고객사"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-[11px] shrink-0">현재 상태:</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300">
                        Step {curProject.currentStep} : {PROCESS_13_STEPS.find((s) => s.step === curProject.currentStep)?.name || `Step ${curProject.currentStep}`} ({curProject.stepStatus})
                      </span>
                    </div>
                  </div>
                </div>

                {/* 마스터 요약 정보 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 bg-white dark:bg-zinc-900 p-3 rounded-lg border text-[11px]">
                  <div><span className="text-zinc-500">원청 고객사:</span> <b className="text-zinc-800 dark:text-zinc-200 ml-1">{curProject.customerName}</b></div>
                  <div><span className="text-zinc-500">제품명:</span> <b className="text-zinc-900 dark:text-zinc-100 ml-1 truncate">{curProject.productName}</b></div>
                  <div>
                    <span className="text-zinc-500">금형제작처:</span> 
                    <b className="text-purple-700 ml-1 font-bold">
                      {curProject.moldProductionType === "IN_HOUSE" ? "[자체] " : "[외주] "}{curProject.moldVendor}
                    </b>
                  </div>
                  <div>
                    <span className="text-zinc-500">사출양산처:</span> 
                    <b className="text-emerald-700 ml-1 font-bold">
                      {curProject.massProductionType === "IN_HOUSE" ? "[자체] " : "[외주] "}{curProject.massVendor}
                    </b>
                  </div>
                  <div><span className="text-zinc-500">캐비티/재질:</span> <b className="text-zinc-700 dark:text-zinc-300 ml-1">{curProject.cavity} / {curProject.material || "NAK80"}</b></div>
                  <div><span className="text-zinc-500">현재 육성차수:</span> <b className="font-mono text-zinc-800 dark:text-zinc-200 font-bold ml-1">{curProject.trialDegree || "T1 대기"}</b></div>
                  <div><span className="text-zinc-500">목표 T1 일정:</span> <b className="font-mono text-zinc-700 dark:text-zinc-300 ml-1">{curProject.targetT1Date || "-"}</b></div>
                  <div><span className="text-zinc-500">금형 출고 납기:</span> <b className="font-mono text-purple-700 dark:text-purple-300 font-bold ml-1">{curProject.moldDeliveryDate || "-"}</b></div>
                  <div><span className="text-zinc-500">목표 양산납품:</span> <b className="font-mono text-amber-600 ml-1">{curProject.targetMassDate || "-"}</b></div>
                </div>

                {/* 8대 생산 기술 정보 & 시사출 Plan vs Actual */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-8 bg-zinc-50/70 dark:bg-zinc-800/40 p-3 rounded-lg border flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <Settings className="h-3.5 w-3.5 text-purple-600" />
                        견적 검토용 최소 8대 생산 기술 정보 (RFQ Spec)
                      </span>
                      <span className="text-[10px] text-zinc-400">금형 제작 및 사출 타당성 검토 기준</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-white dark:bg-zinc-900 p-2.5 rounded border">
                      <div><span className="text-zinc-500">1. 제품 중량:</span> <b className="font-mono text-zinc-800 dark:text-zinc-200 ml-1">{curProject.partWeight || "420g"}</b></div>
                      <div><span className="text-zinc-500">2. 캐비티 수:</span> <b className="font-mono text-zinc-800 dark:text-zinc-200 ml-1">{curProject.cavity || "1*2"}</b></div>
                      <div><span className="text-zinc-500">3. 연간 볼륨:</span> <b className="font-mono text-purple-700 ml-1">{curProject.annualVolume ? `${Number(curProject.annualVolume).toLocaleString()} ea` : "50,000 ea/년"}</b></div>
                      <div><span className="text-zinc-500">4. 사출기 톤수:</span> <b className="font-mono text-zinc-800 dark:text-zinc-200 ml-1">{curProject.machineTon || "650T"}</b></div>
                      <div><span className="text-zinc-500">5. HRS 사양:</span> <b className="font-mono text-indigo-700 ml-1">{curProject.hrsSpec || "밸브게이트 2-Drop"}</b></div>
                      <div><span className="text-zinc-500">6. 금형 소재:</span> <b className="font-mono text-purple-700 ml-1">{curProject.moldMaterial || "NAK80"}</b></div>
                      <div><span className="text-zinc-500">7. 원자재:</span> <b className="font-mono text-zinc-800 dark:text-zinc-200 ml-1">{curProject.resinSpec || "PP-EPDM"}</b></div>
                      <div><span className="text-zinc-500">8. 보증 수명:</span> <b className="font-mono text-emerald-700 ml-1">{curProject.warrantyShots ? `${Number(curProject.warrantyShots).toLocaleString()} Shot` : "500,000 Shot"}</b></div>
                    </div>
                  </div>

                  <div className="md:col-span-4 bg-purple-50/50 dark:bg-purple-950/30 p-3 rounded-lg border border-purple-200 dark:border-purple-800 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-purple-600" />
                        시사출 일정 (Plan vs Actual)
                      </span>
                      <span className="text-[10px] font-bold text-purple-600 font-mono">T1 실적 비교</span>
                    </div>
                    <div className="flex flex-col gap-1.5 bg-white dark:bg-zinc-900 p-2.5 rounded border text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">목표 T1 일정 (Plan):</span>
                        <b className="font-mono text-zinc-700 dark:text-zinc-300">{curProject.targetT1Date || "-"}</b>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500">실제 T1 완료 (Actual):</span>
                        <b className="font-mono text-emerald-600 font-bold">{curProject.actualT1Date || curProject.targetT1Date || "-"}</b>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t">
                        <span className="text-zinc-500">일정 준수 편차:</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                          정상 진행 (±0일)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 13단계 개별 카드 타임라인 그리드 */}
                <div className="flex flex-col gap-3 border rounded-xl p-4 bg-white dark:bg-zinc-900">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-purple-600" />
                      0~13단계 세부 공정 진행 흐름 관제
                    </h4>
                    <span className="text-[11px] text-zinc-500">
                      전체 13단계 프로세스의 진행 흐름 및 현재 위치를 모니터링합니다.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
                    {PROCESS_13_STEPS.map((item) => {
                      const isCurrent = item.step === curProject.currentStep;
                      const isCompleted = item.step < curProject.currentStep;
                      const dynamicActor = getStepActor(item.step, curProject);
                      const isExpanded = expandedStep === item.step;

                      return (
                        <div 
                          key={item.step}
                          className={`p-2.5 rounded-lg border flex flex-col justify-between transition-all ${
                            isCurrent 
                              ? "bg-purple-50/90 border-purple-500 ring-2 ring-purple-400/40 dark:bg-purple-950/40 shadow-xs" 
                              : isCompleted 
                                ? "bg-emerald-50/40 border-emerald-300 dark:bg-emerald-950/20" 
                                : "bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 opacity-80"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                                isCurrent ? "bg-purple-600 text-white" : isCompleted ? "bg-emerald-600 text-white" : "bg-zinc-300 text-zinc-700"
                              }`}>
                                Step {item.step}
                              </span>
                              {isCompleted && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                              {isCurrent && <span className="text-[9px] font-bold text-purple-700 animate-pulse">● 진행중</span>}
                            </div>
                            <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate" title={item.name}>
                              {item.name}
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-0.5 truncate" title={dynamicActor}>
                              {dynamicActor}
                            </div>
                            <div className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
                              {item.desc}
                            </div>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-700/60 flex items-center justify-end">
                            <button
                              onClick={() => setExpandedStep(isExpanded ? null : item.step)}
                              className="text-[10px] text-zinc-500 hover:text-zinc-800 flex items-center gap-0.5"
                            >
                              <Info className="h-3 w-3" />
                              <span>{isExpanded ? "접기" : "산출물 상세"}</span>
                            </button>
                          </div>

                          {/* 카드 확장 영역 */}
                          {isExpanded && (
                            <div className="mt-2 p-2 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-700 text-[10px] flex flex-col gap-1.5 animate-in fade-in">
                              <b className="text-zinc-800 dark:text-zinc-200">주요 산출물 및 체크항목:</b>
                              <ul className="list-disc pl-3 text-zinc-600 dark:text-zinc-400 space-y-0.5">
                                {getStepBullets(item.step).map((bullet, bIdx) => (
                                  <li key={bIdx}>{bullet}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 모달 푸터 */}
              <div className="flex items-center justify-end px-5 py-3 bg-zinc-50 dark:bg-zinc-800 border-t shrink-0">
                <Button onClick={() => setIsDiagramModalOpen(false)} variant="outline" className="h-8 px-4 text-xs font-medium">
                  닫기
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

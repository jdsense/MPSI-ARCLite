"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Briefcase, Factory, Gauge, FileCheck2, PackageCheck, CheckCircle2, 
  Clock, AlertTriangle, Search, RefreshCw, Eye, 
  UploadCloud, ExternalLink, Save, ArrowRight, 
  RotateCcw, Sparkles, Building2, Check, X, ShieldAlert,
  ChevronRight, Calendar, TrendingUp, Truck, Layers,
  ListTree, Activity, Settings, Info, Wrench, History, Award, FileSpreadsheet, FileText
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
import { useMassValidationStore } from "@/lib/mass-validation-store";
import { useMassPpapStore } from "@/lib/mass-ppap-store";
import { usePmRevisionStore, RevisionHistoryItem } from "@/lib/pm-revision-store";

export default function VendorMassProjectsPage() {
  const router = useRouter();
  const { projects } = useProjectMaster();
  const { validations } = useMassValidationStore();
  const { items: ppapItems } = useMassPpapStore();
  const { items: pmRevisionItems } = usePmRevisionStore();
  const { role, vendorName } = useAuthRole();

  // 현재 로그인/선택된 양산 외주업체 (뉴몰드 등)
  const currentVendor = (role === "VENDOR_MASS" && vendorName && !vendorName.includes("MPSI"))
    ? vendorName
    : (vendorName && !vendorName.includes("MPSI") ? vendorName : "(주)뉴몰드");

  // 필터 상태
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterChangeType, setFilterChangeType] = useState("ALL");
  const [filterDateType, setFilterDateType] = useState<"updatedAt" | "targetMassDate" | "targetT1Date">("updatedAt");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePresetType>("all");

  // CRUD 모달 상태
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // 신작/설변 이력 모달 상태
  const [historyProject, setHistoryProject] = useState<ProjectItem | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

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

  // 토스트 알림
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // 현재 외주업체에게 배정된 양산 프로젝트 목록 필터링 (MPSI 연동)
  // * 전체 프로젝트 매트릭스는 배제
  // * 수주가 확정되어 MI로 시작하는 정식 프로젝트만 노출 ("Q"로 시작하는 견적 단계 프로젝트는 철저히 배제)
  const vendorProjects = projects.filter((p) => {
    // 1. Q로 시작하거나 0단계 견적 건은 외주업체 프로젝트 관리 목록에 절대 노출하지 않음
    if (p.projectNo?.startsWith("Q") || p.currentStep === 0 || !p.isContractConfirmed) {
      return false;
    }

    // 2. 자사 배정 프로젝트 매칭 (사출양산 외주업체명 정규화 매칭)
    const matchVendor = isMatchingVendor(p.massVendor, currentVendor);
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

    // 4-1. 신작/설변 필터 (N001 vs E001)
    const rowChangeType = p.changeType || (p.projectNo?.includes("E") || p.projectNo === "MI26003P0" ? "E001" : "N001");
    if (filterChangeType !== "ALL" && rowChangeType !== filterChangeType) {
      return false;
    }

    // 5. 조회 기간 필터
    const targetDate = p[filterDateType];
    const matchDate = isWithinDateRange(targetDate, filterDateFrom, filterDateTo);
    if (!matchDate) return false;

    return true;
  });

  // 상세 모달 열기
  const handleOpenDetailModal = (p: ProjectItem) => {
    setSelectedProject(p);
    setIsEditModalOpen(true);
  };

  // KPI 요약
  const kpiTotal = vendorProjects.length;
  const kpiProduction = vendorProjects.filter((p) => p.currentStep >= 11 && p.currentStep <= 13).length;
  const kpiPpap = vendorProjects.filter((p) => p.currentStep === 12).length;
  const kpiCompleted = vendorProjects.filter((p) => p.stepStatus === "완료").length;

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 0. 토스트 알림 */}
      {toastMessage && (
        <div className="fixed top-4 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-xl bg-emerald-700 text-white border border-emerald-800 text-xs font-medium animate-in fade-in">
          <Sparkles className="h-4 w-4" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-80">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 1. MPSI /portal/project 스타일 헤더 배너 (양산외주 전용) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-zinc-900 p-3 rounded-lg border shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                3사 연계 프로젝트 현황 관리대장
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-700 text-white shadow-2xs">
                [{currentVendor}] 사출양산 외주 관제
              </span>
              <span className="text-[11px] text-zinc-500 font-medium">
                (조회 결과: <b className="text-emerald-700 dark:text-emerald-300 font-mono font-bold">{vendorProjects.length}</b>건 / 전체: <b className="font-mono">{projects.filter(p => !p.projectNo?.startsWith('Q')).length}</b>건)
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              * MPSI 자사 배정 공식 프로젝트(MI) 목록입니다. 각 단계별 상세 현황을 조회할 수 있으며, 12H 연속사출 검증 및 출하/납품 실적은 해당 전용 메뉴에서 등록 가능합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 2. 상단 KPI 통계 카드 */}
      {/* <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border shadow-2xs">
          <span className="text-zinc-500 text-[11px]">배정 양산 프로젝트</span>
          <div className="flex items-center justify-between mt-1">
            <b className="text-lg font-mono text-zinc-900 dark:text-zinc-100">{kpiTotal}건</b>
            <Building2 className="h-4 w-4 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border shadow-2xs">
          <span className="text-zinc-500 text-[11px]">12H 연속사출 / 시양산</span>
          <div className="flex items-center justify-between mt-1">
            <b className="text-lg font-mono text-sky-600">{kpiProduction}건</b>
            <Gauge className="h-4 w-4 text-sky-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border shadow-2xs">
          <span className="text-zinc-500 text-[11px]">PPAP 18대 서류 심사</span>
          <div className="flex items-center justify-between mt-1">
            <b className="text-lg font-mono text-amber-600">{kpiPpap}건</b>
            <FileCheck2 className="h-4 w-4 text-amber-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border shadow-2xs">
          <span className="text-zinc-500 text-[11px]">양산 납품 완료 마감</span>
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
            <option value="Fail(수정중)">Fail (수정 중)</option>
            <option value="지연주의">지연주의</option>
            <option value="완료">완료 (납품마감)</option>
          </select>

          {/* 신작/설변 구분 필터 */}
          <select
            value={filterChangeType}
            onChange={(e) => setFilterChangeType(e.target.value)}
            className="h-7 rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-bold"
          >
            <option value="ALL">전체 구분 (신작/설변)</option>
            <option value="N001">신규 신작 (N001)</option>
            <option value="E001">설계변경 (E001)</option>
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
              <option value="targetMassDate">목표 양산 납기</option>
              <option value="targetT1Date">T1 목표일</option>
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
            setFilterChangeType("ALL");
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

      {/* 4. 자사 배정 프로젝트 목록 테이블 (MPSI /portal/project와 동일한 다크 네이비 테마 및 컬럼 구조) */}
      <div className="overflow-x-auto overflow-y-auto flex-1 border border-slate-700/60 rounded-lg bg-white dark:bg-zinc-900 shadow-sm min-h-[460px]">
        <table className="w-full border-collapse text-left border-spacing-0 whitespace-nowrap text-[11px]">
          {/* MPSI /portal/project와 동일한 프리미엄 네이비 헤더 */}
          <thead className="sticky top-0 bg-[#1e293b] text-white text-[11px] font-bold z-10 border-b border-slate-700">
            <tr>
              <th className="py-2.5 px-2 w-10 text-center border-r border-slate-700">No</th>
              <th className="py-2.5 px-2 border-r border-slate-700 min-w-[110px] text-center">프로젝트 번호</th>
              <th className="py-2.5 px-2 border-r border-slate-700 min-w-[85px] text-center bg-amber-400 text-slate-900">신작/설변</th>
              <th className="py-2.5 px-2 border-r border-slate-700 min-w-[85px] text-center">고객사</th>
              <th className="py-2.5 px-2 border-r border-slate-700 min-w-[120px] text-center">프로젝트명</th>
              <th className="py-2.5 px-2 border-r border-slate-700 min-w-[150px] text-center">제품명</th>
              <th className="py-2.5 px-2 border-r border-slate-700 min-w-[70px] text-center">품 번</th>
              <th className="py-2.5 px-2 border-r border-slate-700 min-w-[100px] text-center">금형번호</th>
              <th className="py-2.5 px-2 border-r border-slate-700 min-w-[80px] text-center">캐비티사양</th>
              <th className="py-2.5 px-2 border-r border-slate-700 min-w-[100px] text-center">금형 제작처</th>
              <th className="py-2.5 px-2 border-r border-slate-700 min-w-[110px] text-center">현재 스텝</th>
              <th className="py-2.5 px-2 border-r border-slate-700 min-w-[90px] text-center">킥오프</th>
              <th className="py-2.5 px-2 border-r border-slate-700 min-w-[95px] text-center">목표 T1</th>
              <th className="py-2.5 px-2 border-r border-slate-700 min-w-[95px] text-center text-emerald-300">목표 양산승인</th>
              <th className="py-2.5 px-2 min-w-[70px] text-center bg-emerald-950">상세</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200 text-[11px]">
            {vendorProjects.length === 0 ? (
              <tr>
                <td colSpan={15} className="p-10 text-center text-zinc-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Calendar className="h-8 w-8 text-zinc-300" />
                    <span>현재 [{currentVendor}]에 배정된 정식 수주 양산 프로젝트(MI)가 없습니다.</span>
                  </div>
                </td>
              </tr>
            ) : (
              vendorProjects.map((row, idx) => {
                const currentStepObj = PROCESS_13_STEPS.find((s) => s.step === row.currentStep);
                let stepDisplayName = row.stepNameCustom || currentStepObj?.name || `Step ${row.currentStep}`;

                return (
                  <tr 
                    key={row.id} 
                    className="odd:bg-white even:bg-slate-50/60 dark:odd:bg-zinc-900 dark:even:bg-zinc-800/40 hover:bg-emerald-50/70 dark:hover:bg-zinc-800 transition-colors"
                  >
                    {/* 1. No */}
                    <td className="p-2 text-center font-mono text-zinc-400 border-r border-slate-200 dark:border-zinc-800">{idx + 1}</td>
                    
                    {/* 2. 프로젝트 번호 */}
                    <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono font-bold text-emerald-700 dark:text-emerald-300">
                      <span>{row.projectNo}</span>
                    </td>

                    {/* 2-1. 신작/설변 (클릭 시 이력 모달) */}
                    <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center">
                      <button 
                        onClick={() => {
                          setHistoryProject(row);
                          setIsHistoryModalOpen(true);
                        }}
                        className={`px-2 py-0.5 rounded font-mono font-bold text-[10.5px] cursor-pointer transition-all hover:scale-105 shadow-xs ${
                          (row.changeType === "E001" || row.projectNo?.includes("E") || row.projectNo === "MI26003P0")
                            ? "bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200"
                            : "bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200"
                        }`}
                        title="클릭하여 신작/설변 차수별 상세 이력 확인"
                      >
                        {row.changeType || (row.projectNo?.includes("E") || row.projectNo === "MI26003P0" ? "E001" : "N001")}
                      </button>
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
                    <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono font-semibold text-zinc-700 dark:text-zinc-300">{row.moldNo || "-"}</td>

                    {/* 8. 캐비티사양 */}
                    <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono text-[10px]">{row.cavity}</td>

                    {/* 9. 금형 제작처 */}
                    <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center text-zinc-600">{row.moldVendor}</td>

                    {/* 10. 현재 스텝 */}
                    <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        row.stepStatus === "완료"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : row.stepStatus === "Fail(수정중)"
                          ? "bg-rose-50 text-rose-700 border-rose-300 font-bold"
                          : row.stepStatus === "지연주의"
                          ? "bg-amber-50 text-amber-700 border-amber-300"
                          : "bg-sky-50 text-sky-700 border-sky-300"
                      }`}>
                        {stepDisplayName}
                      </span>
                    </td>

                    {/* 11. 킥오프 */}
                    <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono text-zinc-500">{row.kickoffDate || "-"}</td>

                    {/* 12. 목표 T1 */}
                    <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono text-zinc-600">{row.targetT1Date || "-"}</td>

                    {/* 13. 목표 양산승인 */}
                    <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">{row.targetMassDate || "-"}</td>

                    {/* 14. 상세 액션 버튼 */}
                    <td className="p-2 text-center bg-emerald-50/30">
                      <Button
                        onClick={() => handleOpenDetailModal(row)}
                        size="xs"
                        className="h-6 px-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold gap-1 text-[10px] shadow-2xs cursor-pointer"
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

      {/* 5. [양산 외주업체 전용 상세 모달] 양산 승인 및 PM/설변 관리 상세 현황 (MPSI 동기화) */}
      {isEditModalOpen && selectedProject && (() => {
        const validation = validations.find((v) => 
          v.projectNo === selectedProject.projectNo ||
          v.projectNo?.replace(/-01$/, "P0") === selectedProject.projectNo ||
          (Boolean(selectedProject.projectNo && v.projectNo) && selectedProject.projectNo.substring(0, 7) === v.projectNo.substring(0, 7))
        );

        const ppap = ppapItems.find((p) => 
          p.projectNo === selectedProject.projectNo ||
          p.projectNo?.replace(/-01$/, "P0") === selectedProject.projectNo ||
          (Boolean(selectedProject.projectNo && p.projectNo) && selectedProject.projectNo.substring(0, 7) === p.projectNo.substring(0, 7))
        );

        const currentStepObj = PROCESS_13_STEPS.find((s) => s.step === selectedProject.currentStep);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-xl shadow-2xl border overflow-hidden flex flex-col max-h-[92vh]">
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-[#1e293b] text-white">
                <div className="flex items-center gap-2">
                  <Factory className="h-5 w-5 text-emerald-300" />
                  <div>
                    <h3 className="font-bold text-sm">
                      [{selectedProject.projectNo}] 양산 프로젝트 상세 정보
                    </h3>
                    <span className="text-[11px] text-slate-300">
                      사출양산처: {currentVendor} | 차종: {selectedProject.projectName} - {selectedProject.productName}
                    </span>
                  </div>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="text-slate-300 hover:text-white cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* 모달 본문 */}
              <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs">
                {/* 1. 기본 정보와 일정 표기 (양산 정보 및 일정) */}
                <div className="border rounded-xl p-3.5 bg-emerald-50/40 dark:bg-zinc-800/40 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4 text-emerald-600" />
                      양산 정보 및 일정
                    </h4>
                    <span className="text-[10px] text-zinc-500">
                      * 프로젝트 관리대장 및 양산 마스터 연동
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                    <div><span className="text-zinc-500">원청 고객사:</span> <b className="ml-1 text-zinc-900 dark:text-zinc-100">{selectedProject.customerName}</b></div>
                    <div><span className="text-zinc-500">제품명 / 차종:</span> <b className="ml-1 text-zinc-900 dark:text-zinc-100 truncate">{selectedProject.productName} ({selectedProject.projectName})</b></div>
                    <div><span className="text-zinc-500">품번:</span> <b className="ml-1 font-mono text-zinc-800 dark:text-zinc-200">{selectedProject.partNo || "-"}</b></div>
                    <div><span className="text-zinc-500">금형번호:</span> <b className="ml-1 font-mono font-bold text-zinc-800 dark:text-zinc-200">{selectedProject.moldNo || "-"}</b></div>

                    <div>
                      <span className="text-zinc-500">금형제작처:</span> 
                      <b className="ml-1 text-purple-700 dark:text-purple-300 font-bold">[외주] {selectedProject.moldVendor}</b>
                    </div>
                    <div>
                      <span className="text-zinc-500">사출양산처:</span> 
                      <b className="ml-1 text-emerald-600 dark:text-emerald-400 font-bold">[외주] {selectedProject.massVendor}</b>
                    </div>
                    <div><span className="text-zinc-500">캐비티 / 원재료:</span> <b className="ml-1 text-zinc-800 dark:text-zinc-200">{selectedProject.cavity || "1*2"} / {selectedProject.material || "PP-EPDM"}</b></div>
                    <div><span className="text-zinc-500">사출기 사양:</span> <b className="ml-1 font-mono text-zinc-800 dark:text-zinc-200">{selectedProject.machineTon || "450T"}</b></div>

                    <div><span className="text-zinc-500">총 발주 수량:</span> <b className="ml-1 font-mono font-bold text-zinc-800 dark:text-zinc-200">{selectedProject.orderQty?.toLocaleString() || "10,000"} EA</b></div>
                    <div><span className="text-zinc-500">수주일 / 발주일:</span> <b className="ml-1 font-mono text-zinc-700 dark:text-zinc-300">{selectedProject.orderDate || "-"} / {selectedProject.poDate || selectedProject.registeredDate || "-"}</b></div>
                    <div><span className="text-zinc-500">킥오프:</span> <b className="ml-1 font-mono text-zinc-700 dark:text-zinc-300">{selectedProject.kickoffDate || "-"}</b></div>
                    <div><span className="text-zinc-500">목표 T1 일정:</span> <b className="ml-1 font-mono text-zinc-700 dark:text-zinc-300">{selectedProject.targetT1Date || "-"}</b></div>

                    <div><span className="text-zinc-500">금형 이관(입고)일:</span> <b className="ml-1 font-mono text-purple-700 font-bold">{selectedProject.moldDeliveryDate || selectedProject.targetT1Date || "-"}</b></div>
                    <div><span className="text-zinc-500">목표 양산 승인 일정:</span> <b className="ml-1 font-mono text-emerald-700 dark:text-emerald-400 font-bold">{selectedProject.targetMassDate || "-"}</b></div>
                    <div><span className="text-zinc-500">양산 시작일:</span> <b className="ml-1 font-mono text-emerald-700 dark:text-emerald-400 font-bold">{selectedProject.massStartDate || selectedProject.targetMassDate || "-"}</b></div>
                    <div><span className="text-zinc-500">누적 납품 수량:</span> <b className="ml-1 font-mono font-bold text-zinc-800 dark:text-zinc-200">{selectedProject.deliveredQty?.toLocaleString() || "0"} EA</b></div>
                  </div>
                </div>

                {/* 2. 시양산 및 12H 연속사출 검증 현황 (타 메뉴 데이터 연동 뷰) */}
                <div className="border rounded-xl p-3.5 bg-white dark:bg-zinc-900 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                      <Gauge className="h-4 w-4 text-emerald-600" />
                      시양산 및 12H 연속사출 검증 현황
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                      {validation?.overallStatus || (selectedProject.currentStep >= 11 ? "CPK 검증완료" : "시양산 진행중")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-[11px]">
                    <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-800/40 border">
                      <span className="text-zinc-500 block text-[10px]">사출기 호기</span>
                      <b className="text-xs text-zinc-800 dark:text-zinc-200 mt-0.5 block font-mono">
                        {validation?.trials[0]?.machineNo || `사출 3호기 (${selectedProject.machineTon || "450T"})`}
                      </b>
                    </div>

                    <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-800/40 border">
                      <span className="text-zinc-500 block text-[10px]">연속 가동시간</span>
                      <b className="text-xs text-zinc-800 dark:text-zinc-200 mt-0.5 block font-mono">
                        {validation?.trials[0]?.continuousHours || 12}시간 연속가동
                      </b>
                    </div>

                    <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-800/40 border">
                      <span className="text-zinc-500 block text-[10px]">사출 타수 / 생산량</span>
                      <b className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5 block font-mono font-bold">
                        {(validation?.trials[0]?.totalShotCount || 1250).toLocaleString()} Shot / {(validation?.trials[0]?.totalProduced || 2500).toLocaleString()} EA
                      </b>
                    </div>

                    <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-800/40 border">
                      <span className="text-zinc-500 block text-[10px]">공정능력지수 (Cpk)</span>
                      <b className="text-xs text-sky-700 dark:text-sky-400 mt-0.5 block font-mono font-bold">
                        Cpk {validation?.trials[0]?.measuredCpk || 1.45} <span className="text-[10px] text-zinc-400 font-normal">(기준 ≥ 1.33)</span>
                      </b>
                    </div>

                    <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-800/40 border">
                      <span className="text-zinc-500 block text-[10px]">Cycle Time (C/T)</span>
                      <b className="text-xs text-zinc-800 dark:text-zinc-200 mt-0.5 block font-mono font-bold">
                        {validation?.trials[0]?.measuredCycleTime || 34.2}초 <span className="text-[10px] text-zinc-400 font-normal">(목표 {validation?.trials[0]?.targetCycleTime || 35}초)</span>
                      </b>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border bg-zinc-50 dark:bg-zinc-800/40 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="text-zinc-700 dark:text-zinc-300">
                        <b>시양산 검증 의견:</b> {validation?.trials[0]?.opinion || (selectedProject.currentStep >= 11 ? "시양산 12H 연속 가동 검증 진행 대기" : "시양산 단계 착수 전")}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 shrink-0 font-mono">
                      검증 참관: {validation?.mpsiWitnessInspector || "MPSI 품질팀"}
                    </span>
                  </div>
                </div>

                {/* 3. 양산 승인 (PPAP 6대 필수 품질 요건) 현황 (타 메뉴 데이터 연동 뷰) */}
                <div className="border rounded-xl p-3.5 bg-white dark:bg-zinc-900 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                      <FileCheck2 className="h-4 w-4 text-emerald-600" />
                      양산 승인 (PPAP 6대 필수 품질 요건) 현황
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-400 font-mono">서류 완성률:</span>
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                        {ppap?.completionRate || 100}%
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                        ppap?.ppapStatus === "양산 승인 (Pass)"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : ppap?.ppapStatus === "서류접수(심사대기)"
                          ? "bg-sky-100 text-sky-800 border-sky-300"
                          : "bg-amber-100 text-amber-800 border-amber-300"
                      }`}>
                        {ppap?.ppapStatus || (selectedProject.currentStep >= 12 ? "양산 승인 (Pass)" : "서류접수(심사대기)")}
                      </span>
                    </div>
                  </div>

                  {/* 6대 필수 패키지 배지 그리드 */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    {[
                      { code: "PSW", name: "부품제출보증서 (PSW)", status: "적합 완료" },
                      { code: "DIM", name: "초·중·종물 전수 치수 성적서", status: "적합 완료" },
                      { code: "CPK", name: "공정능력분석 보고서 (Cpk≥1.33)", status: "적합 완료" },
                      { code: "OQC", name: "자체 OQC 출하검사 성적서", status: "적합 완료" },
                      { code: "MS", name: "마스터 샘플 한도견본 등록서", status: "적합 완료" },
                      { code: "SOP", name: "사출조건표 및 표준작업지침서", status: "적합 완료" },
                    ].map((doc) => (
                      <div key={doc.code} className="p-2 rounded border bg-zinc-50/70 dark:bg-zinc-800/40 flex items-center justify-between">
                        <div className="min-w-0 pr-1">
                          <span className="font-mono font-bold text-emerald-700 text-[10px] block">{doc.code}</span>
                          <span className="text-zinc-700 dark:text-zinc-300 truncate block text-[10.5px]">{doc.name}</span>
                        </div>
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                          {doc.status}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="p-2.5 rounded-lg border bg-zinc-50 dark:bg-zinc-800/40 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="text-zinc-700 dark:text-zinc-300">
                        <b>MPSI 승인 소견:</b> {ppap?.mpsiOpinion || (selectedProject.currentStep >= 12 ? "양산 승인(PPAP) 종합 심사 진행 중" : "서류 제출 및 심사 대기")}
                      </span>
                    </div>
                    <div className="text-[10px] text-right text-zinc-500 shrink-0 font-mono">
                      <div>승인권자: {ppap?.approvalOfficer || "MPSI 품질본부"}</div>
                      {ppap?.partPoNo && <div className="text-emerald-700 font-bold">발주 PO: {ppap.partPoNo}</div>}
                    </div>
                  </div>
                </div>

                {/* 4. 양산 금형 PM(예방보전) 및 설계변경(MCR) 현황 */}
                <div className="border rounded-xl p-3.5 bg-white dark:bg-zinc-900 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                      <Wrench className="h-4 w-4 text-emerald-600" />
                      양산 금형 PM(예방보전) 및 설계변경(MCR) 현황
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                      PM 정상 유지관리중
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                    <div className="p-2.5 rounded-lg border bg-zinc-50 dark:bg-zinc-800/40">
                      <span className="text-zinc-500 block text-[10px]">금형 보증 수명 대비 누적 타수</span>
                      <div className="mt-1 flex items-baseline justify-between">
                        <b className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {(validation?.trials[0]?.totalShotCount || 1250).toLocaleString()} Shot
                        </b>
                        <span className="text-[10px] font-mono text-zinc-400">
                          / {typeof selectedProject.warrantyShots === "number" ? selectedProject.warrantyShots.toLocaleString() : "500,000"} Shot
                        </span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div 
                          className="bg-emerald-600 h-full rounded-full" 
                          style={{ width: `${Math.min(100, Math.max(1, Math.round(((validation?.trials[0]?.totalShotCount || 1250) / (typeof selectedProject.warrantyShots === "number" ? selectedProject.warrantyShots : 500000)) * 100)))}%` }} 
                        />
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg border bg-zinc-50 dark:bg-zinc-800/40">
                      <span className="text-zinc-500 block text-[10px]">정기 PM 주기 및 점검 상태</span>
                      <b className="text-xs font-medium text-zinc-800 dark:text-zinc-200 mt-1 block">
                        매 20,000 Shot 분해세척 / 구리스 주입
                      </b>
                      <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                        차기 정기 PM까지 잔여 18,750 Shot
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg border bg-zinc-50 dark:bg-zinc-800/40">
                      <span className="text-zinc-500 block text-[10px]">설계변경(MCR) 및 금형수정 이력</span>
                      <b className="text-xs font-medium text-zinc-800 dark:text-zinc-200 mt-1 block">
                        {validation?.urgentMoldRevision || "최신 설계(Rev.02) 반영 완료"}
                      </b>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">
                        우성정공(주) 금형수정 및 사출성형 타당성 검증 합격
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. 13단계 프로세스 위치 */}
                <div className="border rounded-xl p-3.5 bg-zinc-50 dark:bg-zinc-800/40 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                      <ListTree className="h-4 w-4 text-emerald-600" />
                      13단계 프로세스 위치
                    </h4>
                    <span className="text-[10px] text-zinc-500">
                      * 13단계 개발 프로세스 현황 관리
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                    <div>
                      <span className="text-zinc-500 block text-[10px]">현재 프로세스 단계</span>
                      <b className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5 block font-bold">
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
                        {selectedProject.notes || "양산 승인 및 PM/설변 관리 정상 진행 중"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 모달 푸터: 출하/납품 및 시양산 실적 등록 바로가기 버튼 제공 */}
              <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 bg-zinc-100 dark:bg-zinc-800 border-t gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/portal/vendor-portal/mass/delivery`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-colors"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    <span>출하/납품 실적 등록 화면 이동</span>
                  </Link>
                  <Link
                    href={`/portal/vendor-portal/mass/validation`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-700 hover:bg-sky-800 text-white shadow-xs transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>시양산 검증 실적 등록 화면 이동</span>
                  </Link>
                </div>
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
                  <ListTree className="h-5 w-5 text-emerald-400" />
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
                      className="flex-1 min-w-0 h-7 rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400"
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
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
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
                  <div><span className="text-zinc-500">목표 양산납품:</span> <b className="font-mono text-amber-600 ml-1">{curProject.targetMassDate || "-"}</b></div>
                </div>

                {/* 8대 생산 기술 정보 & 시사출 Plan vs Actual */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-8 bg-zinc-50/70 dark:bg-zinc-800/40 p-3 rounded-lg border flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <Settings className="h-3.5 w-3.5 text-emerald-600" />
                        견적 검토용 최소 8대 생산 기술 정보 (RFQ Spec)
                      </span>
                      <span className="text-[10px] text-zinc-400">금형 제작 및 사출 타당성 검토 기준</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-white dark:bg-zinc-900 p-2.5 rounded border">
                      <div><span className="text-zinc-500">1. 제품 중량:</span> <b className="font-mono text-zinc-800 dark:text-zinc-200 ml-1">{curProject.partWeight || "420g"}</b></div>
                      <div><span className="text-zinc-500">2. 캐비티 수:</span> <b className="font-mono text-zinc-800 dark:text-zinc-200 ml-1">{curProject.cavity || "1*2"}</b></div>
                      <div><span className="text-zinc-500">3. 연간 볼륨:</span> <b className="font-mono text-emerald-700 ml-1">{curProject.annualVolume ? `${Number(curProject.annualVolume).toLocaleString()} ea` : "50,000 ea/년"}</b></div>
                      <div><span className="text-zinc-500">4. 사출기 톤수:</span> <b className="font-mono text-zinc-800 dark:text-zinc-200 ml-1">{curProject.machineTon || "650T"}</b></div>
                      <div><span className="text-zinc-500">5. HRS 사양:</span> <b className="font-mono text-indigo-700 ml-1">{curProject.hrsSpec || "밸브게이트 2-Drop"}</b></div>
                      <div><span className="text-zinc-500">6. 금형 소재:</span> <b className="font-mono text-purple-700 ml-1">{curProject.moldMaterial || "NAK80"}</b></div>
                      <div><span className="text-zinc-500">7. 원자재:</span> <b className="font-mono text-zinc-800 dark:text-zinc-200 ml-1">{curProject.resinSpec || "PP-EPDM"}</b></div>
                      <div><span className="text-zinc-500">8. 보증 수명:</span> <b className="font-mono text-emerald-700 ml-1">{curProject.warrantyShots ? `${Number(curProject.warrantyShots).toLocaleString()} Shot` : "500,000 Shot"}</b></div>
                    </div>
                  </div>

                  <div className="md:col-span-4 bg-emerald-50/50 dark:bg-emerald-950/30 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-emerald-600" />
                        시사출 일정 (Plan vs Actual)
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 font-mono">T1 실적 비교</span>
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
                      <Activity className="h-4 w-4 text-emerald-600" />
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
                              ? "bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-400/40 dark:bg-emerald-950/40 shadow-xs" 
                              : isCompleted 
                                ? "bg-emerald-50/40 border-emerald-300 dark:bg-emerald-950/20" 
                                : "bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 opacity-80"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                                isCurrent ? "bg-emerald-600 text-white" : isCompleted ? "bg-emerald-600 text-white" : "bg-zinc-300 text-zinc-700"
                              }`}>
                                Step {item.step}
                              </span>
                              {isCompleted && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                              {isCurrent && <span className="text-[9px] font-bold text-emerald-700 animate-pulse">● 진행중</span>}
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

      {/* 5. [신작/설변(N001, E001...) 차수별 이력 조회 모달] */}
      {isHistoryModalOpen && historyProject && (() => {
        const pmProject = pmRevisionItems.find(
          (p) => p.projectNo === historyProject.projectNo ||
                 (Boolean(historyProject.projectNo && p.projectNo) && historyProject.projectNo.substring(0, 7) === p.projectNo.substring(0, 7))
        );

        const historyList: RevisionHistoryItem[] = pmProject?.historyList || [
          {
            revisionCode: "N001",
            revisionDate: historyProject.kickoffDate || "2026-03-15",
            title: `초도 신작 승인 및 양산 진입 (N001)`,
            modelReview: "3D CAD 제품 모델링 v1.0 검토 승인 완료 (수축률 0.5% 반영)",
            moldCostQuote: `신작 금형제작비 125,000,000원 / 사출 단가 2,450원 확정`,
            moldTrialReport: `${historyProject.moldVendor || "우성정공"} T1~T3 시사출 성적서 치수 공차 100% 만족`,
            massValidationReport: `${historyProject.massVendor || "뉴몰드"} 12H 연속사출 및 Cpk 1.42 달성, PPAP Pass 승인`,
            author: "MPSI 품질본부 / 뉴몰드",
            memo: "초도 신작 양산 PO 발행 및 공급 개시",
            createdAt: `${historyProject.kickoffDate || "2026-03-15"} 11:00`
          },
          ...(historyProject.changeType === "E001" || historyProject.projectNo?.includes("E") || historyProject.projectNo === "MI26003P0" ? [
            {
              revisionCode: "E001",
              revisionDate: "2026-10-10",
              title: "1차 설계변경 (E001) - 조립 리브 보강 및 파팅 단차 개선",
              modelReview: "제품도면 v2.0 변경 접수. 3D 모델 검토 승인 (중량 +3.2g, CT +1.5초 변동)",
              moldCostQuote: "금형 수정비 9,800,000원 확정 / 사출 단가 +35원 변동 조정 확정 (금형견적, 사출견적)",
              moldTrialReport: "금형 수정 가공 진행 중 (방전 및 와이어 컷팅 보정)",
              massValidationReport: "금형 이관 후 시양산 및 재양산 승인 진행 예정",
              author: "(주)뉴몰드",
              memo: "설변 수주 확정 및 단가조정 반영, 261010_치수검토보고서 등록",
              createdAt: "2026.10.10 10:54"
            }
          ] : [])
        ];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-3xl rounded-xl shadow-2xl border overflow-hidden flex flex-col max-h-[92vh]">
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-[#1e293b] text-white">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-emerald-400" />
                  <div>
                    <h3 className="font-bold text-sm">
                      [{historyProject.projectNo}] 신작(N001) 및 설계변경(E001...) 차수별 종합 이력
                    </h3>
                    <span className="text-[11px] text-slate-300">
                      차종: {historyProject.projectName} | 제품명: {historyProject.productName} | 금형번호: {historyProject.moldNo || "-"}
                    </span>
                  </div>
                </div>
                <button onClick={() => setIsHistoryModalOpen(false)} className="text-zinc-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* 모달 본문 (아래로 스크롤하여 N001, E001 이력 순차 확인) */}
              <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border text-[11px] text-zinc-600 dark:text-zinc-400">
                  • <b>N001은 신규(신작)</b>, <b>E001은 1차 설계변경</b>, E002는 2차 설계변경입니다.
                  <br />
                  • 아래 스크롤을 통해 각 차수별 <b>① 3D 모델 검토 승인</b>, <b>② 금형비 견적 확정</b>, <b>③ 금형처 시사출 보고서</b>, <b>④ 양산처 시양산 보고서</b> 내용을 확인하실 수 있습니다.
                </div>

                <div className="flex flex-col gap-4">
                  {historyList.map((hist) => (
                    <div 
                      key={hist.revisionCode} 
                      className="border-2 rounded-xl p-4 bg-white dark:bg-zinc-900 shadow-xs flex flex-col gap-3 border-slate-300 dark:border-slate-700"
                    >
                      {/* 차수 헤더 */}
                      <div className="flex items-center justify-between border-b pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded font-mono font-bold text-xs ${
                            hist.revisionCode.startsWith("E")
                              ? "bg-rose-100 text-rose-800 border border-rose-300"
                              : "bg-blue-100 text-blue-800 border border-blue-300"
                          }`}>
                            {hist.revisionCode}
                          </span>
                          <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                            {hist.title}
                          </h4>
                        </div>
                        <span className="font-mono text-zinc-500 text-[11px]">{hist.revisionDate}</span>
                      </div>

                      {/* 4대 필수 이력 내용 그리드 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                        <div className="p-2.5 rounded-lg border bg-zinc-50/70 dark:bg-zinc-800/40 flex flex-col gap-1">
                          <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            1. 3D 제품 모델 검토 승인 내용
                          </span>
                          <p className="text-zinc-600 dark:text-zinc-400 pl-5 leading-relaxed">
                            {hist.modelReview}
                          </p>
                        </div>

                        <div className="p-2.5 rounded-lg border bg-zinc-50/70 dark:bg-zinc-800/40 flex flex-col gap-1">
                          <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                            <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" />
                            2. 금형비 견적 검토 확정 내용
                          </span>
                          <p className="text-zinc-600 dark:text-zinc-400 pl-5 leading-relaxed">
                            {hist.moldCostQuote}
                          </p>
                        </div>

                        <div className="p-2.5 rounded-lg border bg-zinc-50/70 dark:bg-zinc-800/40 flex flex-col gap-1">
                          <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-purple-600" />
                            3. 금형처 시사출 보고서 내용
                          </span>
                          <p className="text-zinc-600 dark:text-zinc-400 pl-5 leading-relaxed">
                            {hist.moldTrialReport}
                          </p>
                        </div>

                        <div className="p-2.5 rounded-lg border bg-zinc-50/70 dark:bg-zinc-800/40 flex flex-col gap-1">
                          <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                            <Award className="h-3.5 w-3.5 text-amber-600" />
                            4. 양산처 시양산 보고서 내용
                          </span>
                          <p className="text-zinc-600 dark:text-zinc-400 pl-5 leading-relaxed">
                            {hist.massValidationReport}
                          </p>
                        </div>
                      </div>

                      {/* 이력 메모 */}
                      <div className="bg-zinc-100 dark:bg-zinc-800/80 p-2 rounded text-[10.5px] flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                        <div>
                          <b>작성/승인처:</b> {hist.author} • <span>{hist.memo}</span>
                        </div>
                        <span className="font-mono">{hist.createdAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 모달 푸터 */}
              <div className="flex items-center justify-end p-3.5 bg-zinc-50 dark:bg-zinc-800 border-t">
                <Button onClick={() => setIsHistoryModalOpen(false)} variant="outline" className="h-8 px-5 text-xs">
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

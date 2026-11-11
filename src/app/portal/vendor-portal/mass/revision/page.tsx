"use client";

import React, { useState } from "react";
import { 
  Wrench, AlertTriangle, Clock, CheckCircle2, 
  Calendar, FileSpreadsheet, PlusCircle, Sparkles, 
  X, Check, Send, Search, RefreshCw, Eye, ArrowRight,
  Upload, FileText, Layers, ShieldCheck, History,
  Info, ChevronRight, Award, MessageSquare, Paperclip,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangeFilter, isWithinDateRange, DatePresetType } from "@/components/common/date-range-filter";
import { useAuthRole } from "@/lib/role-store";
import { useProjectMaster } from "@/lib/project-store";
import { useNotificationStore, cleanCompanyAuthor } from "@/lib/notification-store";
import { 
  usePmRevisionStore, 
  PmRevisionProjectItem,
  RevisionHistoryItem 
} from "@/lib/pm-revision-store";

export default function VendorMassPmRevisionPage() {
  const { 
    items, 
    updateRevisionMassStartDate, 
    updatePmProcess, 
    updatePmSchedule, 
    updatePmSpecs, 
    savePmRoundData,
    changeProjectState,
    addMemo 
  } = usePmRevisionStore();
  const { projects: masterProjects } = useProjectMaster();
  const { addNotification } = useNotificationStore();
  const { vendorName } = useAuthRole();
  const currentVendor = vendorName || "(주)뉴몰드";

  // 검색 및 필터 상태
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterCategory, setFilterCategory] = useState<"ALL" | "REVISION_AND_PM" | "REVISION_ONLY" | "PM_ONLY">("ALL");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePresetType>("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 모달 제어 상태
  const [selectedProject, setSelectedProject] = useState<PmRevisionProjectItem | null>(null);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [isPmModalOpen, setIsPmModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // 신규 설변/PM 상태 전환 모달 상태
  const [isStateTransitionModalOpen, setIsStateTransitionModalOpen] = useState(false);
  const [targetTransitionProject, setTargetTransitionProject] = useState<PmRevisionProjectItem | null>(null);
  const [transitionTargetState, setTransitionTargetState] = useState<"설변 중" | "PM 중" | "양산 중">("설변 중");
  const [transitionReason, setTransitionReason] = useState("");

  // 설계변경 모달 폼 상태
  const [revDateInput, setRevDateInput] = useState("2026-10-19");
  const [revFileInput, setRevFileInput] = useState("261010_치수검토보고서.pdf");
  const [revMemoInput, setRevMemoInput] = useState("");

  // PM 모달 폼 상태 (스크린샷 2 분홍색 수기 입력 필드)
  const [pmActiveRound, setPmActiveRound] = useState(3);
  const [pmCurrentShotsInput, setPmCurrentShotsInput] = useState("120,000");
  const [pmReasonInput, setPmReasonInput] = useState("정기(정기PM, 불량개선등)");
  const [pmLastDate, setPmLastDate] = useState("2026. 07.05");
  const [pmLastShots, setPmLastShots] = useState("80,000");
  const [pmMassStartDate, setPmMassStartDate] = useState("2025. 01.05 /");
  const [pmCycleShots, setPmCycleShots] = useState("40,000");
  const [pmActiveProcess, setPmActiveProcess] = useState("금형 분해 점검 중");

  const [planStart, setPlanStart] = useState("2026-10-19");
  const [planEnd, setPlanEnd] = useState("2026-10-20");
  const [planMass, setPlanMass] = useState("2026-10-21");
  const [actStart, setActStart] = useState("2026-10-19");
  const [actEnd, setActEnd] = useState("2026-10-21");
  const [actMass, setActMass] = useState("2026-10-22");

  const [pmMemoInput, setPmMemoInput] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 외주처 배정 프로젝트 필터링
  const vendorProjects = items.filter(
    (item) => item.massVendor.includes(currentVendor) || currentVendor.includes(item.massVendor)
  );

  // [핵심 요구사항 1] 신작/설변 항목은 MPSI가 설변설계(E채번)로 등록한 것만 불러옴
  const filteredProjects = vendorProjects.filter((item) => {
    // MPSI가 설변설계로 등록한 프로젝트만 필터 (E001, E002 등 E채번 및 설변 중)
    const isMpsiRevisionOnly = item.revisionCode.startsWith("E") || item.currentState === "설변 중";
    if (!isMpsiRevisionOnly) return false;

    const matchKey = filterKeyword
      ? (item.projectNo.toLowerCase().includes(filterKeyword.toLowerCase()) ||
         item.productName.toLowerCase().includes(filterKeyword.toLowerCase()) ||
         item.projectName.toLowerCase().includes(filterKeyword.toLowerCase()) ||
         item.moldNo.toLowerCase().includes(filterKeyword.toLowerCase()))
      : true;

    let matchCategory = true;
    if (filterCategory === "REVISION_AND_PM") {
      matchCategory = item.currentState === "설변 중" || item.currentState === "PM 중";
    } else if (filterCategory === "REVISION_ONLY") {
      matchCategory = item.currentState === "설변 중" || item.revisionCode.startsWith("E");
    } else if (filterCategory === "PM_ONLY") {
      matchCategory = item.currentState === "PM 중";
    }

    const matchDate = isWithinDateRange(item.updatedAt, filterDateFrom, filterDateTo);

    return matchKey && matchCategory && matchDate;
  });

  // 상태 전환 모달 열기 핸들러
  const handleOpenTransitionModal = (project?: PmRevisionProjectItem, targetState: "설변 중" | "PM 중" | "양산 중" = "설변 중") => {
    setTargetTransitionProject(project || vendorProjects[0] || null);
    setTransitionTargetState(targetState);
    setTransitionReason(
      targetState === "설변 중" 
        ? "원청 고객사 도면 변경 및 금형/사출 단가 조정 접수" 
        : targetState === "PM 중"
        ? "정기 타수 도달에 따른 금형 분해점검 PM 착수"
        : "설변/PM 완료 후 정상 양산 가동 복귀"
    );
    setIsStateTransitionModalOpen(true);
  };

  const handleConfirmStateTransition = () => {
    if (!targetTransitionProject) return;
    changeProjectState(targetTransitionProject.id, transitionTargetState, {
      reason: transitionReason.trim() || (transitionTargetState === "설변 중" ? "설계변경 접수" : "PM 착수"),
      author: currentVendor
    });
    setIsStateTransitionModalOpen(false);
    showToast(`[${targetTransitionProject.projectNo}] 프로젝트가 [${transitionTargetState}] 상태로 전환되었습니다.`);
  };

  // [핵심 요구사항] 특정 차수(1차~30차) 클릭 시 해당 차수의 저장된 데이터를 불러오는 함수
  const switchPmRound = (targetRound: number, targetProject?: PmRevisionProjectItem) => {
    const proj = targetProject || selectedProject;
    if (!proj) return;
    setPmActiveRound(targetRound);

    const rounds = proj.pmData?.roundsData || {};
    const roundData = rounds[targetRound];

    if (roundData) {
      setPmCurrentShotsInput(String(roundData.currentShots));
      setPmReasonInput(roundData.pmReason || `${targetRound}차 정기 PM`);
      setPmLastDate(roundData.lastPmDate || "2026. 07.05");
      setPmLastShots(String(roundData.lastPmShots || "80,000"));
      setPmMassStartDate(roundData.massStartDate || "2025. 01.05");
      setPmCycleShots(String(roundData.pmCycleShots || "40,000"));
      setPmActiveProcess(roundData.activeProcess || "금형 분해 점검 중");
      setPlanStart(roundData.schedule.planStartDate || "2026-10-19");
      setPlanEnd(roundData.schedule.planEndDate || "2026-10-20");
      setPlanMass(roundData.schedule.planMassStartDate || "2026-10-21");
      setActStart(roundData.schedule.actualStartDate || "2026-10-19");
      setActEnd(roundData.schedule.actualEndDate || "2026-10-21");
      setActMass(roundData.schedule.actualMassStartDate || "2026-10-22");
    } else {
      // 해당 차수에 아직 저장된 데이터가 없는 경우 직전 차수 데이터 기반 기본값 자동 생성
      const prevRound = rounds[targetRound - 1];
      const prevShots = prevRound
        ? parseInt(String(prevRound.currentShots).replace(/[^0-9]/g, ""), 10) || ((targetRound - 1) * 40000)
        : ((targetRound - 1) * 40000);
      const cycle = prevRound
        ? parseInt(String(prevRound.pmCycleShots).replace(/[^0-9]/g, ""), 10) || 40000
        : 40000;
      const calcShots = prevShots + cycle;
      const prevDate = prevRound?.schedule?.actualEndDate || prevRound?.schedule?.planEndDate || prevRound?.lastPmDate || "2026. 07.05";

      setPmCurrentShotsInput(calcShots.toLocaleString());
      setPmReasonInput(`${targetRound}차 정기 PM (점검 및 세척)`);
      setPmLastDate(prevDate);
      setPmLastShots(prevShots.toLocaleString());
      setPmMassStartDate(proj.pmData?.massStartDate || "2025. 01.05");
      setPmCycleShots(cycle.toLocaleString());
      setPmActiveProcess("금형 분해 점검 중");
      setPlanStart("2026-10-19");
      setPlanEnd("2026-10-20");
      setPlanMass("2026-10-21");
      setActStart("2026-10-19");
      setActEnd("2026-10-21");
      setActMass("2026-10-22");
    }
  };

  // PM 모달 열기 핸들러
  const openPmModalForProject = (item: PmRevisionProjectItem) => {
    setSelectedProject(item);
    const roundToOpen = item.pmData?.currentRound || 3;
    switchPmRound(roundToOpen, item);
    setPmMemoInput("");
    setIsPmModalOpen(true);
  };

  // 상태(설변 중 / PM 중 / 양산 중) 클릭 핸들러
  const handleOpenStatusModal = (item: PmRevisionProjectItem) => {
    if (item.currentState === "PM 중") {
      openPmModalForProject(item);
    } else if (item.currentState === "설변 중") {
      setSelectedProject(item);
      setRevDateInput(item.revisionMassStartDate || item.massStartDate || "2026-10-19");
      setRevMemoInput("");
      setIsRevisionModalOpen(true);
    } else {
      // 양산 중 상태인 경우 상태 전환 모달 띄우기
      handleOpenTransitionModal(item, "설변 중");
    }
  };

  // [핵심 요구사항] 모달 내 [저장] 하기 버튼 핸들러: 현재 차수의 모든 입력값을 해당 차수 맵과 프로젝트에 영구 저장
  const handleSaveCurrentRound = () => {
    if (!selectedProject) return;

    const roundDataToSave = {
      round: pmActiveRound,
      currentShots: pmCurrentShotsInput,
      pmReason: pmReasonInput,
      lastPmDate: pmLastDate,
      lastPmShots: pmLastShots,
      massStartDate: pmMassStartDate,
      pmCycleShots: pmCycleShots,
      activeProcess: pmActiveProcess,
      schedule: {
        planStartDate: planStart,
        planEndDate: planEnd,
        planMassStartDate: planMass,
        actualStartDate: actStart,
        actualEndDate: actEnd,
        actualMassStartDate: actMass,
      }
    };

    savePmRoundData(selectedProject.id, roundDataToSave, currentVendor);
    
    // 로컬 상태 즉시 동기화
    setSelectedProject((prev) => {
      if (!prev || !prev.pmData) return prev;
      const prevRounds = prev.pmData.roundsData || {};
      return {
        ...prev,
        progressProcess: pmActiveProcess,
        massStartDate: actMass || planMass || prev.massStartDate,
        pmData: {
          ...prev.pmData,
          currentRound: pmActiveRound,
          currentShots: parseInt(pmCurrentShotsInput.replace(/[^0-9]/g, ""), 10) || 120000,
          pmReason: pmReasonInput,
          lastPmDate: pmLastDate,
          lastPmShots: parseInt(pmLastShots.replace(/[^0-9]/g, ""), 10) || 80000,
          massStartDate: pmMassStartDate,
          pmCycleShots: parseInt(pmCycleShots.replace(/[^0-9]/g, ""), 10) || 40000,
          activeProcess: pmActiveProcess,
          schedule: roundDataToSave.schedule,
          roundsData: {
            ...prevRounds,
            [pmActiveRound]: roundDataToSave
          }
        }
      };
    });

    showToast(`[${selectedProject.projectNo}] ${pmActiveRound}차 PM 정보가 성공적으로 저장되었습니다.`);

    // [공통 알림 발송] 공급업체가 PM 차수 저장 시 MPSI 본사에 알림 전송
    addNotification({
      menuName: "양산외주 - PM 및 설변관리",
      menuPath: "/portal/vendor-portal/mass/revision",
      senderCompany: currentVendor,
      senderName: currentVendor,
      content: `[${selectedProject.projectNo} / ${selectedProject.productName}] ${pmActiveRound}차 PM 정보 저장 완료 (누적 ${pmCurrentShotsInput}샷, 공정: ${pmActiveProcess})`,
      projectNo: selectedProject.projectNo,
      targetRole: "MPSI",
    });
  };

  // 신작/설변(N001, E001...) 클릭 시 이력 모달 오픈
  const handleOpenHistoryModal = (item: PmRevisionProjectItem) => {
    setSelectedProject(item);
    setIsHistoryModalOpen(true);
  };

  // 설계변경 양산시작일 저장
  const handleSaveRevisionMassStartDate = () => {
    if (!selectedProject) return;
    if (!revDateInput) {
      alert("양산 시작일을 입력해 주세요.");
      return;
    }
    updateRevisionMassStartDate(selectedProject.id, revDateInput, currentVendor, revMemoInput);
    setIsRevisionModalOpen(false);
    showToast(`[${selectedProject.projectNo}] 설계변경 양산 시작일(${revDateInput})이 등록되었습니다.`);
  };

  // 설계변경 파일 및 메모 추가
  const handleSaveRevisionFileMemo = () => {
    if (!selectedProject || !revMemoInput.trim()) {
      alert("업무 이력 메모를 입력해 주세요.");
      return;
    }
    const content = revFileInput ? `[${revFileInput}] ${revMemoInput.trim()}` : revMemoInput.trim();
    addMemo(selectedProject.id, "REVISION", content, currentVendor);

    // [공통 알림 발송]
    addNotification({
      menuName: "양산외주 - PM 및 설변관리",
      menuPath: "/portal/vendor-portal/mass/revision",
      senderCompany: currentVendor,
      senderName: currentVendor,
      content: `[${selectedProject.projectNo} 설계변경(E채번) 메모] ${content}`,
      projectNo: selectedProject.projectNo,
      targetRole: "MPSI",
    });

    setRevMemoInput("");
    showToast("설계변경 업무 이력 메모가 영구 보존 기록되었으며, MPSI 본사에 알림이 발송되었습니다.");
  };

  // PM 공정 버튼 클릭
  const handleSelectPmProcess = (processName: string) => {
    if (!selectedProject) return;
    updatePmProcess(selectedProject.id, processName, currentVendor);
    showToast(`PM 공정이 [${processName}]으로 등록 및 메모 기록되었습니다.`);
  };

  // PM 계획 일정 저장
  const handleSavePmPlanSchedule = () => {
    if (!selectedProject) return;
    updatePmSchedule(selectedProject.id, {
      planStartDate: planStart,
      planEndDate: planEnd,
      planMassStartDate: planMass,
    }, currentVendor, `PM 계획일정 등록 (시작: ${planStart}, 완료: ${planEnd}, 양산시작: ${planMass})`);
    showToast("PM 계획 일정이 등록되었습니다.");
  };

  // PM 실적 일정 저장
  const handleSavePmActualSchedule = () => {
    if (!selectedProject) return;
    updatePmSchedule(selectedProject.id, {
      actualStartDate: actStart,
      actualEndDate: actEnd,
      actualMassStartDate: actMass,
    }, currentVendor, `PM 실적일정 등록 (시작: ${actStart}, 완료: ${actEnd}, 양산시작: ${actMass})`);
    showToast("PM 실적 일정이 등록되었습니다.");
  };

  // PM 메모 등록
  const handleSavePmMemo = () => {
    if (!selectedProject || !pmMemoInput.trim()) {
      alert("업무 이력 메모를 입력해 주세요.");
      return;
    }
    addMemo(selectedProject.id, "PM", pmMemoInput.trim(), currentVendor);

    // [공통 알림 발송] 공급업체가 메모 등록 시 MPSI 본사에 알림 전송
    addNotification({
      menuName: "양산외주 - PM 및 설변관리",
      menuPath: "/portal/vendor-portal/mass/revision",
      senderCompany: currentVendor,
      senderName: currentVendor,
      content: `[${selectedProject.projectNo} / ${selectedProject.productName} PM메모] ${pmMemoInput.trim()}`,
      projectNo: selectedProject.projectNo,
      targetRole: "MPSI",
    });

    setPmMemoInput("");
    showToast("PM 공정 업무 이력 메모가 영구 보존 기록되었으며, MPSI 본사에 알림이 발송되었습니다.");
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 토스트 알림창 */}
      {toastMessage && (
        <div className="fixed top-4 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-xl bg-emerald-700 text-white text-xs font-medium animate-in fade-in">
          <Sparkles className="h-4 w-4" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-80">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 1. 상단 안내 배너 (스크린샷 주석 규격 반영) */}
      <div className="bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-transparent border border-amber-500/30 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>[{currentVendor}] 설계변경(MCR) 및 금형 PM(예방보전) 관리</span>
              
            </h3>
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5 block leading-relaxed">
              • 설변 발생 시 E채번(E001)으로 단가/견적/프로젝트 관리 | • PM은 공급업체가 금형 수명·타수·공정을 자체 관리하고 SCM에 연동 공유합니다.
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-[11px] text-purple-700 dark:text-purple-300 font-bold">
            <span className="inline-block w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            <span>MPSI 설계변경 상태 연동 (확인 전용)</span>
          </div>

          <Button
            onClick={() => handleOpenTransitionModal(undefined, "PM 중")}
            size="xs"
            className="h-8 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5 text-xs shadow-xs"
          >
            <Wrench className="h-3.5 w-3.5" />
            + 금형 PM 착수
          </Button>
        </div>
      </div>

      {/* 2. 검색 및 필터 바 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[220px] max-w-xs">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" />
            <Input 
              value={filterKeyword} 
              onChange={(e) => setFilterKeyword(e.target.value)} 
              placeholder="프로젝트 번호, 차종, 제품명, 금형번호 검색..." 
              className="h-7 pl-8 text-xs font-mono" 
            />
          </div>

          {/* 대상 구분 필터 */}
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value as any)} 
            className="h-7 rounded-md border bg-transparent px-2.5 text-xs font-bold text-zinc-800 dark:text-zinc-200"
          >
            <option value="REVISION_AND_PM">PM 및 설변 대상 전체보기</option>
            <option value="REVISION_ONLY">설계변경 프로젝트 (설변 중 / E001)</option>
            <option value="PM_ONLY">금형 PM 프로젝트 (PM 중)</option>
            <option value="ALL">전체 프로젝트 보기 (양산 중 포함)</option>
          </select>

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
            setFilterCategory("REVISION_AND_PM");
            setFilterDateFrom("");
            setFilterDateTo("");
            setSelectedDatePreset("all");
          }} 
          variant="outline" 
          className="h-7 px-3 gap-1 text-xs text-zinc-600"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          초기화
        </Button>
      </div>

      {/* 3. 메인 데이터 그리드 (스크린샷 엑셀 양식 100% 일치) */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-700/60 rounded-md shadow-xs overflow-hidden flex flex-col min-h-[460px]">
        <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800/60 border-b">
          <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-100">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>[{currentVendor}] 설계변경(MCR) 및 금형 PM 진행 현황표</span>
            <span className="text-[11px] font-normal text-zinc-500 ml-1">
              (총 <b className="text-emerald-600 font-mono">{filteredProjects.length}</b>건)
            </span>
          </div>
          <span className="text-[11px] text-zinc-500">
            * <b>신작/설변</b> 클릭 시 차수별 이력 조회 | * 노란색 칸 <b>현재 상태</b> 클릭 시 공정 및 일정 직접 입력
          </span>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full border-collapse text-left border-spacing-0 whitespace-nowrap text-[11px]">
            {/* 스크린샷과 동일한 네이비 헤더 + 노란색 현재 상태 강조 */}
            <thead className="sticky top-0 bg-[#1e293b] text-white text-[11px] font-bold z-10 border-b border-slate-700">
              <tr>
                <th className="py-2.5 px-2 w-10 text-center border-r border-slate-700">No</th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[110px] text-center">프로젝트번호</th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[85px] text-center bg-amber-400 text-slate-900">
                  신작/설변
                </th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[125px] text-center">견적종류</th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[110px] text-center">프로젝트/차종</th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[130px] text-center">제품명</th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[100px] text-center">금형번호</th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[95px] text-center bg-amber-400 text-slate-900">
                  현재 상태
                </th>
                
                {/* 우측 세부 일정 (양산관리 메뉴에서 확인되는 컬럼들) */}
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[105px] text-center">
                  금형 수정 시작<br/><span className="text-[9.5px] font-normal text-slate-300">PO발행일 연동</span>
                </th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[105px] text-center">
                  진행 공정<br/><span className="text-[9.5px] font-normal text-slate-300">상태 연동</span>
                </th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[105px] text-center">
                  금형 수정 완료<br/><span className="text-[9.5px] font-normal text-slate-300">금형이관일 연동</span>
                </th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[100px] text-center">
                  시양산일자<br/><span className="text-[9.5px] font-normal text-slate-300">시양산일자 연동</span>
                </th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[105px] text-center">
                  양산승인서제출<br/><span className="text-[9.5px] font-normal text-slate-300">제출일자 연동</span>
                </th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[100px] text-center">
                  고객사 승인<br/><span className="text-[9.5px] font-normal text-slate-300">MPSI 승인일 연동</span>
                </th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[110px] text-center bg-emerald-950 text-emerald-300">
                  양산시작일<br/><span className="text-[9.5px] font-normal text-emerald-400">공급업체 입력</span>
                </th>
                <th className="py-2.5 px-2 min-w-[80px] text-center">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200 text-[11px]">
              {filteredProjects.map((row, idx) => (
                <tr 
                  key={row.id} 
                  className="odd:bg-white even:bg-slate-50/60 dark:odd:bg-zinc-900 dark:even:bg-zinc-800/40 hover:bg-amber-50/50 dark:hover:bg-zinc-800 transition-colors"
                >
                  {/* 1. No */}
                  <td className="p-2 text-center font-mono text-zinc-400 border-r border-slate-200 dark:border-zinc-800">{idx + 1}</td>
                  
                  {/* 2. 프로젝트번호 */}
                  <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono font-bold text-emerald-700 dark:text-emerald-300">
                    {row.projectNo}
                  </td>

                  {/* 3. 신작/설변 (클릭 시 이력 모달) */}
                  <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center">
                    <button 
                      onClick={() => handleOpenHistoryModal(row)}
                      className={`px-2 py-0.5 rounded font-mono font-bold text-[10.5px] shadow-xs cursor-pointer transition-all hover:scale-105 ${
                        row.revisionCode.startsWith("E")
                          ? "bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200"
                          : "bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200"
                      }`}
                      title="클릭하여 신작/설변 차수별 상세 이력 확인"
                    >
                      {row.revisionCode}
                    </button>
                  </td>

                  {/* 4. 견적종류 */}
                  <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-medium text-zinc-700 dark:text-zinc-300">
                    <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10.5px]">
                      {row.quotationKind}
                    </span>
                  </td>

                  {/* 5. 프로젝트/차종 */}
                  <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-semibold text-zinc-800 dark:text-zinc-200">
                    {row.projectName}
                  </td>

                  {/* 6. 제품명 */}
                  <td className="p-2 border-r border-slate-200 dark:border-zinc-800 font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[140px]" title={row.productName}>
                    {row.productName}
                  </td>

                  {/* 7. 금형번호 */}
                  <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                    {row.moldNo}
                  </td>

                  {/* 8. 현재 상태 (노란색 강조 칸 - 클릭 시 공정/일정 입력 모달 오픈) */}
                  <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center bg-amber-50/80 dark:bg-amber-950/20">
                    <button 
                      onClick={() => handleOpenStatusModal(row)}
                      className={`px-3 py-1 rounded font-bold text-xs shadow-xs cursor-pointer transition-all hover:scale-105 border ${
                        row.currentState === "설변 중"
                          ? "bg-amber-400 text-amber-950 border-amber-500 hover:bg-amber-500"
                          : row.currentState === "PM 중"
                          ? "bg-amber-400 text-amber-950 border-amber-500 hover:bg-amber-500"
                          : "bg-emerald-100 text-emerald-800 border-emerald-300"
                      }`}
                      title="클릭하여 공정 및 일정 직접 입력"
                    >
                      {row.currentState}
                    </button>
                  </td>

                  {/* 9. 금형 수정 시작 */}
                  <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono">
                    {row.moldModStartDate === "공급업체입력" ? (
                      <span className="text-zinc-400 text-[10px]">공급업체입력</span>
                    ) : (
                      <span>{row.moldModStartDate}</span>
                    )}
                  </td>

                  {/* 10. 진행 공정 */}
                  <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-medium">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 border">
                      {row.progressProcess}
                    </span>
                  </td>

                  {/* 11. 금형 수정 완료 */}
                  <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono">
                    {row.moldModEndDate === "공급업체입력" ? (
                      <span className="text-zinc-400 text-[10px]">공급업체입력</span>
                    ) : (
                      <span>{row.moldModEndDate}</span>
                    )}
                  </td>

                  {/* 12. 시양산일자 */}
                  <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono text-zinc-700 dark:text-zinc-300">
                    {row.pilotMassDate}
                  </td>

                  {/* 13. 양산승인서제출 */}
                  <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono text-zinc-700 dark:text-zinc-300">
                    {row.ppapSubmitDate === "자체검증" ? (
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">자체검증</span>
                    ) : (
                      <span>{row.ppapSubmitDate}</span>
                    )}
                  </td>

                  {/* 14. 고객사 승인 */}
                  <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono text-zinc-700 dark:text-zinc-300">
                    {row.mpsiApprovalDate === "자체검증" ? (
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">자체검증</span>
                    ) : (
                      <span>{row.mpsiApprovalDate}</span>
                    )}
                  </td>

                  {/* 15. 양산시작일 (공급업체 입력) */}
                  <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20">
                    {row.massStartDate === "공급업체입력" ? (
                      <Button 
                        onClick={() => handleOpenStatusModal(row)}
                        size="xs" 
                        variant="outline" 
                        className="h-5 px-2 text-[10px] border-emerald-400 text-emerald-700 hover:bg-emerald-100"
                      >
                        입력
                      </Button>
                    ) : (
                      <button 
                        onClick={() => handleOpenStatusModal(row)}
                        className="hover:underline cursor-pointer"
                        title="클릭하여 수정"
                      >
                        {row.massStartDate}
                      </button>
                    )}
                  </td>

                  {/* 16. 작업 버튼 */}
                  <td className="p-2 text-center">
                    <Button 
                      onClick={() => handleOpenStatusModal(row)} 
                      size="xs" 
                      className="h-6 px-2.5 text-[10px] gap-1 font-bold bg-slate-800 hover:bg-slate-700 text-white"
                    >
                      <Eye className="h-3 w-3" />
                      입력/상세
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={16} className="p-8 text-center text-zinc-500">
                    설계변경 또는 PM 관리 대상 프로젝트가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. [공급업체 PM 입력화면] 모달 - 컴팩트 대시보드 리팩토링 */}
      {/* ========================================================================= */}
      {isPmModalOpen && selectedProject && (() => {
        // [핵심] MPSI 프로젝트 마스터에 등록된 '8. 보증 수명(Shot)' 값 자동 연동
        const masterProject = masterProjects.find(
          (p) => p.projectNo === selectedProject.projectNo || p.projectNo === selectedProject.projectNo?.replace(/P\d+$/, "P0")
        );
        const resolvedWarrantyShots = masterProject?.warrantyShots 
          ? Number(String(masterProject.warrantyShots).replace(/[^0-9]/g, "")).toLocaleString() + "샷"
          : (selectedProject.pmData?.warrantyShots ? selectedProject.pmData.warrantyShots.toLocaleString() + "샷" : "300,000샷");

        const roundsMap = selectedProject.pmData?.roundsData || {};
        const savedRoundNumbers = Object.keys(roundsMap).map(Number).sort((a, b) => a - b);
        const maxSavedRound = savedRoundNumbers.length > 0 ? Math.max(...savedRoundNumbers) : 0;
        const nextAvailableRound = maxSavedRound + 1;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-5xl rounded-xl shadow-2xl border overflow-hidden flex flex-col max-h-[94vh]">
              
              {/* 모달 상단 헤더: 깔끔한 오렌지 바 */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#ea580c] text-white">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-amber-200" />
                  <h3 className="font-bold text-sm">
                    [공급업체 PM 입력] - {selectedProject.projectNo} ({selectedProject.productName})
                  </h3>
                </div>
                <button 
                  onClick={() => setIsPmModalOpen(false)} 
                  className="text-orange-200 hover:text-white p-1 rounded hover:bg-orange-700/60 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* 모달 본문 (컴팩트 대시보드 뷰) */}
              <div className="p-4 flex flex-col gap-3 overflow-y-auto text-xs">
                
                {/* 1. 상단 요약 배너: 한 줄 컴팩트 정보 배너 */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-lg text-[11px] border border-slate-800 shadow-2xs">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <div><span className="text-slate-400">고객사:</span> <b className="text-zinc-100">{selectedProject.customerName}</b></div>
                    <div><span className="text-slate-400">차종:</span> <b className="text-zinc-100">{selectedProject.projectName}</b></div>
                    <div><span className="text-slate-400">제품명:</span> <b className="text-zinc-100">{selectedProject.productName}</b></div>
                    <div><span className="text-slate-400">품번:</span> <b className="font-mono text-zinc-200">{selectedProject.partNo}</b></div>
                    <div><span className="text-slate-400">금형번호:</span> <b className="font-mono text-sky-400">{selectedProject.moldNo}</b></div>
                    <div><span className="text-slate-400">캐비티:</span> <b className="font-mono">{selectedProject.cavity}</b></div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-900 text-purple-200 border border-purple-700">
                      제작: {selectedProject.moldVendor}
                    </span>
                  </div>
                </div>

                {/* 2. [요구사항 2] 1차 ~ 30차 차수 선택 (순번 진행 원칙 및 완료 차수 색상 구분) */}
                <div className="border border-slate-300 dark:border-zinc-700 rounded-lg p-2.5 bg-zinc-50 dark:bg-zinc-800/40 flex flex-col gap-2 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                        PM 차수 순차 관리 (1차 ~ 30차) :
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-black bg-amber-400 text-slate-950 border border-amber-600 shadow-2xs">
                        {pmActiveRound}차 선택 중
                      </span>
                    </div>

                    {/* 범례 (Legend) */}
                    <div className="flex items-center gap-3 text-[10px] text-zinc-600 dark:text-zinc-400">
                      <span className="flex items-center gap-1 font-medium">
                        <span className="w-3.5 h-3.5 rounded bg-sky-100 border border-sky-400 inline-flex items-center justify-center text-[9px] text-sky-800 font-bold">✓</span>
                        진행 완료
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <span className="w-3.5 h-3.5 rounded bg-amber-400 border border-amber-600 inline-block"></span>
                        현재 선택
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <span className="w-3.5 h-3.5 rounded bg-white dark:bg-zinc-800 border border-dashed border-slate-400 inline-block"></span>
                        차기 착수
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <span className="w-3.5 h-3.5 rounded bg-zinc-200/80 dark:bg-zinc-700 border border-zinc-300 inline-block"></span>
                        순차 대기
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-10 gap-1.5 text-center font-mono text-[11px]">
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((round) => {
                      const isSelected = pmActiveRound === round;
                      const hasSavedData = !!roundsMap[round];
                      const isCompleted = hasSavedData;
                      const isNext = round === nextAvailableRound;
                      const isLocked = round > nextAvailableRound && !hasSavedData;

                      const handleRoundClick = () => {
                        if (isLocked) {
                          showToast(`PM 차수는 순번대로 진행해야 합니다. 먼저 ${nextAvailableRound}차를 완료해 주세요.`);
                          return;
                        }
                        switchPmRound(round);
                      };

                      return (
                        <button
                          key={round}
                          type="button"
                          onClick={handleRoundClick}
                          title={
                            isLocked
                              ? `이전 차수(${nextAvailableRound}차) 완료 후 진행 가능`
                              : isCompleted
                              ? `${round}차 PM 기록 열람`
                              : isNext
                              ? `${round}차 신규 PM 착수`
                              : `${round}차 선택`
                          }
                          className={`h-7 rounded border transition-all font-bold flex items-center justify-center gap-0.5 text-xs ${
                            isSelected
                              ? "bg-amber-400 text-slate-950 border-amber-600 font-black shadow-sm ring-2 ring-amber-500 scale-105 z-10 cursor-pointer"
                              : isCompleted
                              ? "bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-200 border-sky-400 hover:bg-sky-200 cursor-pointer"
                              : isNext
                              ? "bg-white dark:bg-zinc-900 text-slate-800 dark:text-slate-200 border-slate-400 dark:border-zinc-500 border-dashed hover:bg-slate-100 cursor-pointer"
                              : "bg-zinc-100/70 dark:bg-zinc-800/40 text-zinc-300 dark:text-zinc-600 border-zinc-200 dark:border-zinc-800 cursor-not-allowed select-none opacity-50"
                          }`}
                        >
                          <span>{round}차</span>
                          {isCompleted && !isSelected && (
                            <Check className="h-3 w-3 text-sky-700 dark:text-sky-300 stroke-[2.5]" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <span className="text-[10px] text-zinc-500">
                    * PM 차수는 1차부터 30차까지 순차적으로 진행됩니다. 진행 완료된 차수는 언제든 클릭하여 과거 내역을 열람할 수 있습니다.
                  </span>
                </div>

                {/* 3. [요구사항 1] PM 사양 수기 입력 카드 (주변 톤과 어울리는 슬레이트/네이비 톤, 타이틀 상단 / 인풋 하단 세로 배치) */}
                <div className="border border-slate-300 dark:border-zinc-700 rounded-lg p-2.5 bg-slate-50/70 dark:bg-zinc-800/40 flex flex-col gap-2.5 shadow-2xs">
                  
                  {/* 상단 1행: 현재 PM 차수 (1열), 누적 금형타수 (1열), PM 사유 (1열) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* 현재 PM 차수 */}
                    <div className="border border-slate-300 dark:border-zinc-700 rounded-md overflow-hidden shadow-2xs bg-white dark:bg-zinc-900">
                      <div className="bg-slate-700 dark:bg-slate-800 text-white py-1 px-2.5 text-center font-bold text-[11px]">
                        현재 PM 차수
                      </div>
                      <div className="p-1.5 flex items-center justify-center h-9 bg-slate-50/50 dark:bg-zinc-800/60">
                        <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">
                          {pmActiveRound} 차
                        </span>
                        <span className="ml-2 text-[10px] text-slate-500 font-medium">
                          ({roundsMap[pmActiveRound] ? "기록 보관" : "작성 중"})
                        </span>
                      </div>
                    </div>

                    {/* 현재 누적 금형타수 */}
                    <div className="border border-slate-300 dark:border-zinc-700 rounded-md overflow-hidden shadow-2xs bg-white dark:bg-zinc-900">
                      <div className="bg-slate-700 dark:bg-slate-800 text-white py-1 px-2.5 text-center font-bold text-[11px]">
                        누적 금형타수 (Shot)
                      </div>
                      <div className="p-1.5 flex items-center justify-center h-9">
                        <Input 
                          type="text"
                          value={pmCurrentShotsInput}
                          onChange={(e) => setPmCurrentShotsInput(e.target.value)}
                          placeholder="120,000"
                          className="h-7 text-center font-mono font-bold text-xs bg-slate-50/40 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
                        />
                      </div>
                    </div>

                    {/* PM 사유 */}
                    <div className="border border-slate-300 dark:border-zinc-700 rounded-md overflow-hidden shadow-2xs bg-white dark:bg-zinc-900">
                      <div className="bg-slate-700 dark:bg-slate-800 text-white py-1 px-2.5 text-center font-bold text-[11px]">
                        PM 사유 (작업 개요)
                      </div>
                      <div className="p-1.5 flex items-center h-9">
                        <Input 
                          type="text"
                          value={pmReasonInput}
                          onChange={(e) => setPmReasonInput(e.target.value)}
                          placeholder="정기(정기PM, 불량개선등)"
                          className="h-7 px-2 font-medium text-xs bg-slate-50/40 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 하단 2행: 4대 스펙 박스 (타이틀 상단, 인풋 하단 세로 배치) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* 직전 PM 일자 / 누적 금형 타수 */}
                    <div className="border border-slate-300 dark:border-zinc-700 rounded-md overflow-hidden shadow-2xs bg-white dark:bg-zinc-900">
                      <div className="bg-slate-700 dark:bg-slate-800 text-white py-1 px-2 text-center font-bold text-[11px]">
                        직전 PM 일자 / 누적 타수
                      </div>
                      <div className="p-1.5 flex items-center justify-center h-9">
                        <Input 
                          type="text"
                          value={`${pmLastDate} / ${pmLastShots} 샷`}
                          onChange={(e) => {
                            const parts = e.target.value.split("/");
                            setPmLastDate(parts[0]?.trim() || "");
                            if (parts[1]) setPmLastShots(parts[1].replace(/[^0-9,]/g, "").trim());
                          }}
                          placeholder="2026. 07.05 / 80,000 샷"
                          className="h-7 text-center font-mono font-bold text-[11px] bg-slate-50/40 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
                        />
                      </div>
                    </div>

                    {/* 양산 시작 일자 */}
                    <div className="border border-slate-300 dark:border-zinc-700 rounded-md overflow-hidden shadow-2xs bg-white dark:bg-zinc-900">
                      <div className="bg-slate-700 dark:bg-slate-800 text-white py-1 px-2 text-center font-bold text-[11px]">
                        양산 시작 일자
                      </div>
                      <div className="p-1.5 flex items-center justify-center h-9">
                        <Input 
                          type="text"
                          value={pmMassStartDate}
                          onChange={(e) => setPmMassStartDate(e.target.value)}
                          placeholder="2025. 01.05"
                          className="h-7 text-center font-mono font-bold text-xs bg-slate-50/40 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
                        />
                      </div>
                    </div>

                    {/* [핵심] 금형 보증 샷 (MPSI 보증수명 연동) */}
                    <div className="border-2 border-blue-500 rounded-md overflow-hidden shadow-2xs bg-white dark:bg-zinc-900">
                      <div className="bg-blue-600 text-white py-1 px-2 text-center font-bold text-[11px] flex items-center justify-center gap-1">
                        <span>금형 보증 샷</span>
                      </div>
                      <div className="p-1.5 flex flex-col items-center justify-center h-9 bg-blue-50/60 dark:bg-zinc-800">
                        <div className="font-mono font-black text-xs text-blue-900 dark:text-blue-200 leading-tight">
                          {resolvedWarrantyShots}
                        </div>
                        <span className="text-[8.5px] text-blue-700 dark:text-blue-400 font-bold leading-none">
                          MPSI 보증수명 연동
                        </span>
                      </div>
                    </div>

                    {/* PM 주기 */}
                    <div className="border border-slate-300 dark:border-zinc-700 rounded-md overflow-hidden shadow-2xs bg-white dark:bg-zinc-900">
                      <div className="bg-slate-700 dark:bg-slate-800 text-white py-1 px-2 text-center font-bold text-[11px]">
                        PM 주기
                      </div>
                      <div className="p-1.5 flex items-center justify-center h-9">
                        <Input 
                          type="text"
                          value={`${pmCycleShots} 샷`}
                          onChange={(e) => setPmCycleShots(e.target.value.replace(/[^0-9,]/g, ""))}
                          placeholder="40,000 샷"
                          className="h-7 text-center font-mono font-bold text-xs bg-slate-50/40 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. [요구사항 2] 진행 공정 (셀렉트 박스 처리) + 진행 일정 (계획/실적) 통합 카드 */}
                <div className="border border-slate-300 dark:border-zinc-700 rounded-lg p-2.5 bg-white dark:bg-zinc-900 flex flex-col gap-2.5 shadow-2xs">
                  {/* 진행 공정 셀렉트 박스 행 */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 rounded-md">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-emerald-950 dark:text-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        진행 공정 선택:
                      </span>
                      <select
                        value={pmActiveProcess}
                        onChange={(e) => setPmActiveProcess(e.target.value)}
                        className="h-7 px-2.5 text-xs font-bold text-emerald-900 bg-white border border-emerald-400 rounded-md shadow-2xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      >
                        <option value="금형 분해 점검 중">1. 금형 분해 점검 중</option>
                        <option value="부식 수정 중">2. 부식 수정 중</option>
                        <option value="금형 조립 중">3. 금형 조립 중</option>
                        <option value="시사출 확인 중">4. 시사출 확인 중</option>
                        <option value="양산 대기 중">5. 양산 대기 중</option>
                      </select>
                    </div>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-white dark:bg-zinc-800 px-2 py-0.5 rounded border border-emerald-200">
                      현재 상태: {pmActiveProcess}
                    </span>
                  </div>

                  {/* 진행 일정 테이블 (계획 / 실적) */}
                  <div className="border border-orange-300 dark:border-orange-800 rounded-md overflow-hidden bg-white dark:bg-zinc-900">
                    <table className="w-full text-center border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#ea580c] text-white font-bold text-[11px]">
                          <th className="py-1 px-2 border-r border-orange-600 w-16">구분</th>
                          <th className="py-1 px-2 border-r border-orange-600">PM 시작 일</th>
                          <th className="py-1 px-2 border-r border-orange-600">PM 완료 일</th>
                          <th className="py-1 px-2">양산 시작 일</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {/* 계획 행 - 빨간색 바탕 */}
                        <tr className="bg-[#f87171]/15 dark:bg-rose-950/20">
                          <td className="py-1 px-2 font-bold text-white bg-[#dc2626] border-r border-zinc-200">
                            계획
                          </td>
                          <td className="p-1 border-r border-zinc-200">
                            <Input 
                              type="date"
                              value={planStart}
                              onChange={(e) => setPlanStart(e.target.value)}
                              className="h-7 text-xs font-mono font-bold text-rose-950 dark:text-rose-100 bg-[#fca5a5]/70 dark:bg-rose-900 border-rose-400 text-center"
                            />
                          </td>
                          <td className="p-1 border-r border-zinc-200">
                            <Input 
                              type="date"
                              value={planEnd}
                              onChange={(e) => setPlanEnd(e.target.value)}
                              className="h-7 text-xs font-mono font-bold text-rose-950 dark:text-rose-100 bg-[#fca5a5]/70 dark:bg-rose-900 border-rose-400 text-center"
                            />
                          </td>
                          <td className="p-1">
                            <Input 
                              type="date"
                              value={planMass}
                              onChange={(e) => setPlanMass(e.target.value)}
                              className="h-7 text-xs font-mono font-bold text-rose-950 dark:text-rose-100 bg-[#fca5a5]/70 dark:bg-rose-900 border-rose-400 text-center"
                            />
                          </td>
                        </tr>

                        {/* 실적 행 - 파란색 바탕 */}
                        <tr className="bg-[#60a5fa]/15 dark:bg-blue-950/20">
                          <td className="py-1 px-2 font-bold text-white bg-[#2563eb] border-r border-zinc-200">
                            실적
                          </td>
                          <td className="p-1 border-r border-zinc-200">
                            <Input 
                              type="date"
                              value={actStart}
                              onChange={(e) => setActStart(e.target.value)}
                              className="h-7 text-xs font-mono font-bold text-blue-950 dark:text-blue-100 bg-[#93c5fd]/70 dark:bg-blue-900 border-blue-400 text-center"
                            />
                          </td>
                          <td className="p-1 border-r border-zinc-200">
                            <Input 
                              type="date"
                              value={actEnd}
                              onChange={(e) => setActEnd(e.target.value)}
                              className="h-7 text-xs font-mono font-bold text-blue-950 dark:text-blue-100 bg-[#93c5fd]/70 dark:bg-blue-900 border-blue-400 text-center"
                            />
                          </td>
                          <td className="p-1">
                            <Input 
                              type="date"
                              value={actMass}
                              onChange={(e) => setActMass(e.target.value)}
                              className="h-7 text-xs font-mono font-bold text-blue-950 dark:text-blue-100 bg-[#93c5fd]/70 dark:bg-blue-900 border-blue-400 text-center"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. 컴팩트 업무 이력 메모 */}
                <div className="bg-[#1e293b] text-white p-2.5 rounded-lg border border-slate-700 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-[11px] flex items-center gap-1.5 text-emerald-400">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>업무 이력 메모</span>
                    </div>
                    <span className="text-[9.5px] text-slate-400">
                      작성자 및 등록시간 영구 보존
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Input 
                      value={pmMemoInput}
                      onChange={(e) => setPmMemoInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSavePmMemo()}
                      placeholder="PM 공정 또는 일정 관련 업무 메모를 입력하세요"
                      className="h-7 text-[11px] bg-slate-900/80 border-slate-700 text-white flex-1"
                    />
                    <Button 
                      onClick={handleSavePmMemo}
                      size="xs"
                      className="h-7 px-3 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      등록
                    </Button>
                  </div>

                  {(selectedProject.pmData?.memos || []).length > 0 && (
                    <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pt-0.5">
                      {(selectedProject.pmData?.memos || []).map((m) => (
                        <div key={m.id} className="p-1.5 rounded bg-slate-800/80 border border-slate-700 text-[10px] flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-bold text-emerald-400 shrink-0">{m.author}:</span>
                            <span className="text-slate-200 truncate">{m.content}</span>
                          </div>
                          <span className="text-[9px] text-slate-400 font-mono shrink-0">{m.createdAt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* [핵심 요구사항 4] 모달 푸터: 명확한 [저장] 하기 버튼 배치 */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-zinc-50 dark:bg-zinc-800 border-t">
                <span className="text-[11px] text-zinc-500">
                  * <b>[저장하기]</b> 버튼을 누르면 현재 선택된 <b>{pmActiveRound}차 PM 정보</b>가 영구 저장되며, 다음 순차 PM이 활성화됩니다.
                </span>
                <div className="flex items-center gap-2">
                  {nextAvailableRound <= 30 && nextAvailableRound !== pmActiveRound && (
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => switchPmRound(nextAvailableRound)}
                      className="h-8 px-3 text-xs font-bold border-amber-500 text-amber-800 bg-amber-50 hover:bg-amber-100 cursor-pointer"
                    >
                      다음 {nextAvailableRound}차 PM 작성 →
                    </Button>
                  )}
                  <Button 
                    onClick={handleSaveCurrentRound}
                    className="h-8 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    저장하기
                  </Button>
                  <Button 
                    onClick={() => setIsPmModalOpen(false)} 
                    variant="outline" 
                    className="h-8 px-4 text-xs font-bold cursor-pointer"
                  >
                    닫기
                  </Button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 5. [공급업체 설계 변경 입력 화면] 모달 (스크린샷 우측 양식 100% 일치) */}
      {/* ========================================================================= */}
      {isRevisionModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-xl shadow-2xl border overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#ea580c] text-white">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-amber-200" />
                <div>
                  <h3 className="font-bold text-sm">
                    [공급업체 설계 변경 입력 화면] - 현재 상태(설변 중) 입력
                  </h3>
                  <span className="text-[11px] text-orange-100">
                    - 다른 정보들은 기 입력된 데이터와 연동되어 자동 입력됩니다.
                  </span>
                </div>
              </div>
              <button onClick={() => setIsRevisionModalOpen(false)} className="text-orange-200 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs">
              
              {/* 프로젝트 요약 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-orange-50/50 dark:bg-zinc-800/60 p-3 rounded-lg border border-orange-200 text-[11px]">
                <div>
                  <span className="text-zinc-500 block text-[10px]">프로젝트번호</span>
                  <b className="font-mono text-emerald-700 dark:text-emerald-400 text-xs">{selectedProject.projectNo}</b>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">신작/설변</span>
                  <b className="font-mono text-rose-700 text-xs">{selectedProject.revisionCode}</b>
                  <span className="text-zinc-500 text-[10px] ml-1">{selectedProject.quotationKind}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">제품명</span>
                  <b className="text-zinc-900 dark:text-zinc-100 text-xs truncate block">{selectedProject.productName}</b>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">금형번호</span>
                  <b className="font-mono text-blue-600 text-xs">{selectedProject.moldNo}</b>
                </div>
              </div>

              {/* 주황색 입력 블록: 양산 시작 일 (스크린샷 오렌지 버튼 박스) */}
              <div className="border-2 border-orange-400 rounded-xl p-5 bg-orange-50/40 dark:bg-orange-950/20 flex flex-col gap-3">
                <div className="font-bold text-sm text-orange-950 dark:text-orange-200">
                  양산 시작 일자 입력 (설계변경 반영 후 초도 양산 개시일)
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                      양산 시작 일
                    </label>
                    <Input 
                      type="date"
                      value={revDateInput}
                      onChange={(e) => setRevDateInput(e.target.value)}
                      className="h-10 text-sm font-mono font-bold text-orange-900 bg-white dark:bg-zinc-900 border-orange-400"
                    />
                  </div>

                  <div className="pt-5">
                    <Button 
                      onClick={handleSaveRevisionMassStartDate}
                      className="h-10 px-6 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                    >
                      <Check className="h-4 w-4" />
                      입력 확인
                    </Button>
                  </div>
                </div>

                <span className="text-[11px] text-zinc-500">
                  * 양산 시작일을 입력하고 확인을 누르면, 양산 시작일정 등록 메모가 자동으로 영구 보존됩니다.
                </span>
              </div>

              {/* 남색 박스: 3-4) 업무 이력 메모 (스크린샷 하단 우측 박스) */}
              <div className="bg-[#1e293b] text-white p-4 rounded-xl border border-slate-700 flex flex-col gap-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-slate-700">
                  <div className="font-bold text-xs flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-orange-400" />
                    <span>3-4) 업무 이력 메모</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    예) (주)뉴몰드: 261010_치수검토보고서 등록, 2026.10.10. 10:54 입력
                  </span>
                </div>

                <span className="text-[11px] text-slate-300">
                  • 각자 파일 업로드 시 메모 입력되고, 작성자 ID/이름, 메모 등록한 시간이 자동 표시됩니다.
                  <br />
                  • 파일 수정하여 다시 업로드할 경우, 기존 파일은 삭제하되 기 입력된 메모 이력은 <b>영구 보존</b>됩니다.
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[10.5px] text-slate-400 block mb-0.5">첨부 파일명</label>
                    <Input 
                      value={revFileInput}
                      onChange={(e) => setRevFileInput(e.target.value)}
                      placeholder="예: 261010_치수검토보고서.pdf"
                      className="h-8 text-xs bg-slate-900/80 border-slate-700 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] text-slate-400 block mb-0.5">업무 이력 메모</label>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={revMemoInput}
                        onChange={(e) => setRevMemoInput(e.target.value)}
                        placeholder="예: 261010_치수검토보고서 등록"
                        className="h-8 text-xs bg-slate-900/80 border-slate-700 text-white"
                      />
                      <Button 
                        onClick={handleSaveRevisionFileMemo}
                        size="sm"
                        className="h-8 px-3 text-xs bg-orange-600 hover:bg-orange-700 text-white font-bold shrink-0"
                      >
                        등록
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pt-1">
                  {(selectedProject.revisionMemos || []).map((m) => (
                    <div key={m.id} className="p-2 rounded bg-slate-800/80 border border-slate-700 text-[11px] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-orange-400 shrink-0">{cleanCompanyAuthor(m.author, currentVendor)}:</span>
                        <span className="text-slate-200">{m.content}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">{m.createdAt}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-end p-3.5 bg-zinc-50 dark:bg-zinc-800 border-t">
              <Button onClick={() => setIsRevisionModalOpen(false)} variant="outline" className="h-8 px-5 text-xs">
                닫기
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. [신작/설변(E001, E002...) 차수별 이력 조회 모달] - 사용자의 요청: N001부터 나오는 것이 아니라, 해당하는 정보만 단독 표기 */}
      {/* ========================================================================= */}
      {isHistoryModalOpen && selectedProject && (() => {
        // [핵심 요구사항 2] N001부터 전부 나오는 것이 아니라, 클릭한 해당 차수(E001, E002 등)에 해당하는 정보만 단독 노출
        const targetHist = selectedProject.historyList.find((h) => h.revisionCode === selectedProject.revisionCode) || selectedProject.historyList[0] || {
          revisionCode: selectedProject.revisionCode,
          revisionDate: "2026-10-14",
          title: `${selectedProject.revisionCode} 설계변경 상세 내역`,
          modelReview: "3D CAD 제품 모델링 검토 승인 완료",
          moldCostQuote: "금형 수정비 및 사출 단가 조정 확정 (금형견적, 사출견적)",
          moldTrialReport: "우성정공 가공 진행 중 (방전/와이어 완료 후 피팅)",
          massValidationReport: "자체검증 및 시양산 일정 확정",
          author: currentVendor,
          memo: "도면 변경에 따른 설계변경 확정",
          createdAt: "2026.10.14 09:30"
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-xl shadow-2xl border overflow-hidden flex flex-col max-h-[92vh]">
              
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-[#1e293b] text-white">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-emerald-400" />
                  <div>
                    <h3 className="font-bold text-sm">
                      [{selectedProject.projectNo}] {selectedProject.revisionCode} 설계변경 상세 내역
                    </h3>
                    <span className="text-[11px] text-slate-300">
                      차종: {selectedProject.projectName} | 제품명: {selectedProject.productName} | 금형번호: {selectedProject.moldNo}
                    </span>
                  </div>
                </div>
                <button onClick={() => setIsHistoryModalOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* 모달 본문 - N001 제외하고 오직 클릭한 차수(E001/E002 등)만 단독 노출 */}
              <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs">
                <div className="p-3 bg-purple-50/70 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800 text-[11px] text-purple-900 dark:text-purple-300 flex items-center justify-between">
                  <div>
                    • 선택하신 <b>[{selectedProject.revisionCode}]</b> 설계변경 건의 4대 핵심 이력 정보입니다.
                  </div>
                  <span className="px-2 py-0.5 rounded font-mono font-bold bg-purple-600 text-white text-[10.5px]">
                    {targetHist.revisionCode}
                  </span>
                </div>

                <div className="border-2 rounded-xl p-4 bg-white dark:bg-zinc-900 shadow-xs flex flex-col gap-3 border-slate-300 dark:border-slate-700">
                  {/* 차수 헤더 */}
                  <div className="flex items-center justify-between border-b pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded font-mono font-bold text-xs bg-rose-100 text-rose-800 border border-rose-300">
                        {targetHist.revisionCode}
                      </span>
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                        {targetHist.title}
                      </h4>
                    </div>
                    <span className="font-mono text-zinc-500 text-[11px]">{targetHist.revisionDate}</span>
                  </div>

                  {/* 4대 필수 이력 내용 그리드 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                    {/* 1. 3D 제품 모델 검토 승인 내용 */}
                    <div className="p-2.5 rounded-lg border bg-zinc-50/70 dark:bg-zinc-800/40 flex flex-col gap-1">
                      <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        1. 3D 제품 모델 검토 승인 내용
                      </span>
                      <p className="text-zinc-600 dark:text-zinc-400 pl-5 leading-relaxed">
                        {targetHist.modelReview}
                      </p>
                    </div>

                    {/* 2. 금형비 견적 검토 확정 내용 */}
                    <div className="p-2.5 rounded-lg border bg-zinc-50/70 dark:bg-zinc-800/40 flex flex-col gap-1">
                      <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" />
                        2. 금형비 견적 검토 확정 내용
                      </span>
                      <p className="text-zinc-600 dark:text-zinc-400 pl-5 leading-relaxed">
                        {targetHist.moldCostQuote}
                      </p>
                    </div>

                    {/* 3. 금형처 시사출 보고서 내용 */}
                    <div className="p-2.5 rounded-lg border bg-zinc-50/70 dark:bg-zinc-800/40 flex flex-col gap-1">
                      <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-purple-600" />
                        3. 금형처 시사출 보고서 내용
                      </span>
                      <p className="text-zinc-600 dark:text-zinc-400 pl-5 leading-relaxed">
                        {targetHist.moldTrialReport}
                      </p>
                    </div>

                    {/* 4. 양산처 시양산 보고서 내용 */}
                    <div className="p-2.5 rounded-lg border bg-zinc-50/70 dark:bg-zinc-800/40 flex flex-col gap-1">
                      <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5 text-amber-600" />
                        4. 양산처 시양산 보고서 내용
                      </span>
                      <p className="text-zinc-600 dark:text-zinc-400 pl-5 leading-relaxed">
                        {targetHist.massValidationReport}
                      </p>
                    </div>
                  </div>

                  {/* 이력 메모 */}
                  <div className="bg-zinc-100 dark:bg-zinc-800/80 p-2 rounded text-[10.5px] flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                    <div>
                      <b>작성/승인처:</b> {targetHist.author} • <span>{targetHist.memo}</span>
                    </div>
                    <span className="font-mono">{targetHist.createdAt}</span>
                  </div>
                </div>
              </div>

              {/* 모달 푸터 */}
              <div className="flex items-center justify-end p-3.5 bg-zinc-50 dark:bg-zinc-800 border-t">
                <Button onClick={() => setIsHistoryModalOpen(false)} variant="outline" className="h-8 px-5 text-xs cursor-pointer">
                  닫기
                </Button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 7. [설계변경 / PM 상태 전환 및 E채번 등록 모달] */}
      {/* ========================================================================= */}
      {isStateTransitionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-xl shadow-2xl border overflow-hidden flex flex-col">
            
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#1e293b] text-white">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-amber-400" />
                <h3 className="font-bold text-sm">
                  프로젝트 상태 전환 및 신규 설계변경(E채번) / PM 착수 등록
                </h3>
              </div>
              <button onClick={() => setIsStateTransitionModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="p-5 flex flex-col gap-4 text-xs">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-300 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200">
                • <b>설계변경(E001)</b> 전환 시: 제품 도면 버전 변경에 따른 E채번이 자동 부여되며, <b>(금형견적, 사출견적)</b> 견적 관리 체계로 즉시 연동됩니다.
                <br />
                • <b>금형 PM(PM 중)</b> 전환 시: 1~30차 PM 차수, 분해점검 공정 및 계획/실적 일정 관리가 시작됩니다.
              </div>

              {/* 대상 프로젝트 선택 */}
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">
                  대상 프로젝트 선택
                </label>
                <select
                  value={targetTransitionProject?.id || ""}
                  onChange={(e) => {
                    const found = vendorProjects.find((p) => p.id === Number(e.target.value));
                    if (found) setTargetTransitionProject(found);
                  }}
                  className="h-8 rounded-md border bg-white dark:bg-zinc-900 px-2.5 text-xs font-bold text-zinc-800 dark:text-zinc-100"
                >
                  {vendorProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.projectNo}] {p.projectName} - {p.productName} ({p.moldNo}) | 현재: {p.currentState} ({p.revisionCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* 변경할 목표 상태 선택 */}
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">
                  전환할 목표 상태 선택
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { state: "설변 중" as const, label: "설계변경 (설변 중)", badge: "E001 채번 자동 부여", color: "border-rose-400 bg-rose-50/50 text-rose-800" },
                    { state: "PM 중" as const, label: "금형 PM (PM 중)", badge: "정기점검/보수 착수", color: "border-amber-400 bg-amber-50/50 text-amber-800" },
                    { state: "양산 중" as const, label: "정상 양산 (양산 중)", badge: "정상 납품 가동", color: "border-emerald-400 bg-emerald-50/50 text-emerald-800" },
                  ].map((opt) => (
                    <button
                      type="button"
                      key={opt.state}
                      onClick={() => setTransitionTargetState(opt.state)}
                      className={`p-2.5 rounded-lg border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                        transitionTargetState === opt.state
                          ? `${opt.color} ring-2 ring-slate-800 dark:ring-white font-bold`
                          : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      <span className="text-xs">{opt.label}</span>
                      <span className="text-[10px] opacity-80">{opt.badge}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 전환 사유 및 메모 입력 */}
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">
                  상태 전환 사유 및 업무 이력 메모 입력 (영구 보존)
                </label>
                <textarea
                  value={transitionReason}
                  onChange={(e) => setTransitionReason(e.target.value)}
                  placeholder="예: 261018_원청 고객사 도면 v2.0 변경 접수 및 중량 +3.2g 단가 변동 반영"
                  className="w-full h-18 p-2.5 rounded-md border text-xs bg-white dark:bg-zinc-900 resize-none font-medium"
                />
              </div>

            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800 border-t">
              <Button onClick={() => setIsStateTransitionModalOpen(false)} variant="outline" className="h-8 px-4 text-xs">
                취소
              </Button>

              <Button 
                onClick={handleConfirmStateTransition}
                className="h-8 px-5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white gap-1.5 shadow-sm"
              >
                <Check className="h-4 w-4 text-emerald-400" />
                상태 전환 및 채번 확정
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

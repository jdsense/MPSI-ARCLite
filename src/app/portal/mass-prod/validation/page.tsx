"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, RefreshCw, CheckCircle2, XCircle, 
  Layers, Plus, CheckSquare, Clock, ArrowRight, 
  ExternalLink, UploadCloud, Download, X, Check, Eye,
  Factory, Activity, ShieldCheck, AlertTriangle, FileText, BarChart3,
  ChevronRight, Sparkles, Building2, ListTree, Settings, Info, Gauge,
  FileSpreadsheet, Upload, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangeFilter, isWithinDateRange, DatePresetType } from "@/components/common/date-range-filter";
import { 
  useProjectMaster, 
  PROCESS_13_STEPS, 
  getStepActor, 
  getStepBullets, 
  getStepUrl,
  ProjectItem 
} from "@/lib/project-store";
import { sendAppNotification } from "@/lib/notification-store";

import { 
  useMassValidationStore, 
  MassValidationProject, 
  MassValidationRecord, 
  ValidationCheckItem, 
  ValidationUploadMemoHistory,
  UrgentMoldRevisionDetail,
  INITIAL_MASS_VALIDATIONS 
} from "@/lib/mass-validation-store";

export default function MassValidationPage() {
  const router = useRouter();
  const { projects: masterProjects, updateStep } = useProjectMaster();
  const { 
    validations: projects, 
    updateValidationProject,
    refreshFromDb,
    isLoading
  } = useMassValidationStore();
  const [selectedProjectId, setSelectedProjectId] = useState<number>(0);
  const [selectedTrialDegree, setSelectedTrialDegree] = useState<string>("T1");

  // 상세 모달 상태
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // 2-6) 성적서 파일 업로드 및 업무 이력 메모 입력 모달 상태
  const [uploadModalItem, setUploadModalItem] = useState<{
    checkId: string;
    category: string;
    currentFile?: string;
    currentFileUrl?: string;
  } | null>(null);

  const [uploadForm, setUploadForm] = useState({
    fileName: "",
    fileSize: "",
    fileUrl: "",
    memo: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 실제 스트리밍 파일 다운로드
  const handleDownloadFile = async (fileName?: string, fileUrl?: string) => {
    if (!fileName) {
      alert("다운로드할 첨부파일이 없습니다.");
      return;
    }
    try {
      const url = fileUrl || `/api/v1/files/download?fileName=${encodeURIComponent(fileName)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.warn("Download fallback:", err);
      window.open(fileUrl || `/uploads/${encodeURIComponent(fileName)}`, "_blank");
    }
  };

  // 검색 필터
  const [filterProjectNo, setFilterProjectNo] = useState("");
  const [filterProductName, setFilterProductName] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterMassVendor, setFilterMassVendor] = useState("ALL");
  const [filterMoldVendor, setFilterMoldVendor] = useState("ALL");
  const [filterDateType, setFilterDateType] = useState<"targetMassApprovalDate" | "testDate">("targetMassApprovalDate");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePresetType>("all");

  // 13단계 프로세스 상세 공정 모달 상태
  const [diagramItem, setDiagramItem] = useState<MassValidationProject | null>(null);
  const [isDiagramModalOpen, setIsDiagramModalOpen] = useState(false);
  const [modalSelectedItem, setModalSelectedItem] = useState<ProjectItem | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  // 긴급 금형수정 CC 모니터링 모달
  const [isUrgentRevisionModalOpen, setIsUrgentRevisionModalOpen] = useState(false);
  const [monitoringOpinionText, setMonitoringOpinionText] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // MPSI 현장 입회 참관 및 최종 판정 인라인 상태
  const [verdictInspector, setVerdictInspector] = useState("이인배 품질차장 (MPSI 기술품질팀)");
  const [verdictOpinion, setVerdictOpinion] = useState("");

  // 선택된 프로젝트 및 회차 데이터
  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const activeTrial = currentProject?.trials.find((t) => t.trialDegree === selectedTrialDegree) || currentProject?.trials[currentProject.trials.length - 1];

  // 회차나 프로젝트 변경 시 인라인 판정 소견 및 검사원 동기화
  useEffect(() => {
    if (activeTrial) {
      setVerdictOpinion(activeTrial.opinion || "");
    }
    if (currentProject?.mpsiWitnessInspector) {
      setVerdictInspector(currentProject.mpsiWitnessInspector);
    }
  }, [selectedTrialDegree, selectedProjectId, currentProject?.id, activeTrial?.trialDegree]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1-6) 프로젝트 관리번호 포맷 헬퍼 (수주 시 MI26001P0 형식)
  const getProjectNoDisplay = (project?: MassValidationProject) => {
    if (!project) return "";
    if (project.officialProjectNo) return project.officialProjectNo;
    if (project.projectNo.startsWith("MI")) {
      const parts = project.projectNo.split("-");
      if (parts.length > 1) {
        return `${parts[0]}P0`;
      }
      return project.projectNo;
    }
    return project.projectNo;
  };

  // 1-2, 7) 첨부된 보고서 수 계산 (X/6)
  const getReportCount = (record?: MassValidationRecord) => {
    if (!record || !record.checklist) return 0;
    return record.checklist.filter((item) => Boolean(item.attachedReport)).length;
  };

  // 1-3, 7) 양산성 검증상태 판정 (6대 보고서 완비 및 Cpk 기준치 충족 또는 MPSI 내부승인 시 검증완료)
  const getValidationStatus = (record?: MassValidationRecord): "검증완료" | "검증 대기" | "검증 진행 중" => {
    if (!record) return "검증 대기";
    if (record.status === "양산승인(내부)") return "검증완료";
    const count = getReportCount(record);
    if (count === 0) return "검증 대기";
    const targetCpk = record.targetCpk ?? 1.33;
    const isCpkPassed = record.measuredCpk !== undefined && record.measuredCpk >= targetCpk;
    if (count >= 6 && isCpkPassed) return "검증완료";
    return "검증 진행 중";
  };

  // 1-2) 시양산 결과 보고 배지 렌더러 (6/6, 대기, 3/6)
  const renderReportCountBadge = (count: number) => {
    if (count === 0) {
      return (
        <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold bg-rose-600 text-white shadow-2xs">
          대기
        </span>
      );
    }
    if (count >= 6) {
      return (
        <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-600 text-white shadow-2xs font-mono">
          6/6
        </span>
      );
    }
    return (
      <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-500 text-white shadow-2xs font-mono">
        {count}/6
      </span>
    );
  };

  // 1-3) 양산성 검증상태 배지 렌더러
  const renderValidationStatusBadge = (status?: string) => {
    switch (status) {
      case "검증완료":
      case "양산승인 완료":
      case "CPK 검증완료":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-700 text-white shadow-2xs">
            <CheckCircle2 className="h-3 w-3" />
            {status}
          </span>
        );
      case "검증 대기":
      case "시양산 대기":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-rose-600 text-white shadow-2xs">
            <Clock className="h-3 w-3" />
            {status}
          </span>
        );
      case "검증 진행 중":
      case "시양산 진행중":
      case "12H 연속사출중":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-600 text-white shadow-2xs">
            <Activity className="h-3 w-3 animate-pulse" />
            {status || "검증 진행 중"}
          </span>
        );
    }
  };

  // 상세 모달 열기 핸들러
  const handleOpenDetailModal = (proj: MassValidationProject) => {
    setSelectedProjectId(proj.id);
    setSelectedTrialDegree(proj.currentTrial || proj.trials[proj.trials.length - 1]?.trialDegree || "T1");
    setIsDetailModalOpen(true);
  };

  // 13단계 프로세스 모달 열기 핸들러
  const handleOpenDiagram = (proj: MassValidationProject) => {
    setDiagramItem(proj);
    const matched = masterProjects.find((p) => p.projectNo === proj.projectNo);
    if (matched) {
      setModalSelectedItem(matched);
    } else {
      setModalSelectedItem({
        id: proj.id,
        projectNo: proj.projectNo,
        customerName: proj.customerName || "현대자동차",
        projectName: proj.projectName,
        productName: proj.productName,
        partNo: "4890",
        moldNo: `${proj.projectNo.split("-")[0]}M`,
        cavity: "1*2 Cavity",
        material: "NAK80",
        moldProductionType: proj.moldVendor.includes("자체") ? "IN_HOUSE" : "OUTSOURCING",
        moldVendor: proj.moldVendor,
        massProductionType: proj.massVendor.includes("자체") ? "IN_HOUSE" : "OUTSOURCING",
        massVendor: proj.massVendor,
        currentStep: proj.currentStep,
        stepStatus: proj.overallStatus === "검증완료" ? "완료" : "진행중",
        trialDegree: proj.currentTrial,
        trialCompletionRate: proj.trials[proj.trials.length - 1]?.completionRate || 80,
        facilityEvent: "가동대기",
        orderQty: 10000,
        deliveredQty: 0,
        targetT1Date: "2026-09-30",
        targetMassDate: "2026-11-30",
        updatedAt: proj.updatedAt,
      });
    }
    setExpandedStep(null);
    setIsDiagramModalOpen(true);
  };

  // 13단계 프로세스 스텝 이동 핸들러
  const handleNavigateToStepPage = (step: number, projectNo?: string) => {
    const targetUrl = getStepUrl(step, projectNo);
    setIsDiagramModalOpen(false);
    router.push(targetUrl);
  };

  // 현재 활성 회차 데이터 업데이트 헬퍼
  const updateCurrentTrial = (updates: Partial<MassValidationRecord>) => {
    if (!currentProject || !activeTrial) return;
    const updatedTrials = currentProject.trials.map((tr) =>
      tr.trialDegree === activeTrial.trialDegree ? { ...tr, ...updates } : tr
    );
    updateValidationProject(currentProject.id, {
      trials: updatedTrials,
    });
  };

  // 체크리스트 상태 토글
  const handleToggleChecklist = (checkId: string) => {
    if (!activeTrial) return;
    const updated = activeTrial.checklist.map((c) =>
      c.id === checkId ? { ...c, isResolved: !c.isResolved } : c
    );
    const resolved = updated.filter((i) => i.isResolved).length;
    const rate = Math.round((resolved / updated.length) * 100);
    updateCurrentTrial({ checklist: updated, completionRate: rate });
  };

  // 실측치 입력 핸들러
  const handleUpdateCheckActual = (checkId: string, val: string) => {
    if (!activeTrial) return;
    const updated = activeTrial.checklist.map((c) =>
      c.id === checkId ? { ...c, actualValue: val } : c
    );
    updateCurrentTrial({ checklist: updated });
  };

  // 2-6) 성적서 파일 업로드 및 메모 등록 모달 열기
  const handleOpenUploadModal = (checkId: string, category: string, currentFile?: string, currentFileUrl?: string) => {
    setUploadModalItem({ checkId, category, currentFile, currentFileUrl });
    setUploadForm({
      fileName: currentFile || "",
      fileSize: "2.4 MB",
      fileUrl: currentFileUrl || "",
      memo: "",
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      let uploadedUrl = "";
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/v1/files/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (res.ok && (data.fileUrl || data.url)) {
          uploadedUrl = data.fileUrl || data.url;
        }
      } catch (err) {
        console.warn("File upload failed:", err);
      }

      const sizeStr = file.size < 1024 * 1024
        ? (file.size / 1024).toFixed(1) + " KB"
        : (file.size / (1024 * 1024)).toFixed(1) + " MB";

      setUploadForm((prev) => ({
        ...prev,
        fileName: file.name,
        fileSize: sizeStr,
        fileUrl: uploadedUrl || `/uploads/${encodeURIComponent(file.name)}`,
      }));
    }
  };

  const handleSaveUpload = () => {
    if (!uploadModalItem || !uploadForm.fileName) {
      alert("업로드할 성적서 파일을 선택해주세요.");
      return;
    }
    if (!uploadForm.memo.trim()) {
      alert("성적서 파일 업로드 시 업무 이력 메모(설명)를 반드시 입력해야 합니다.");
      return;
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const fullTimeStr = `${dateStr} ${timeStr}`;

    const authorString = currentProject.massVendor || "(주)뉴몰드";

    const newHistoryItem: ValidationUploadMemoHistory = {
      id: `hist-${Date.now()}`,
      category: uploadModalItem.category,
      fileName: uploadForm.fileName,
      fileSize: uploadForm.fileSize,
      fileUrl: uploadForm.fileUrl,
      memo: uploadForm.memo.trim(),
      author: authorString,
      uploadedAt: fullTimeStr,
    };

    const updatedChecklist = activeTrial.checklist.map((item) => {
      if (item.id === uploadModalItem.checkId) {
        return {
          ...item,
          attachedReport: uploadForm.fileName,
          attachedReportSize: uploadForm.fileSize,
          attachedReportUrl: uploadForm.fileUrl,
          uploadMemo: uploadForm.memo.trim(),
          uploadAuthor: authorString,
          uploadedAt: fullTimeStr,
          isResolved: true,
        };
      }
      return item;
    });

    const updatedHistory = [...(activeTrial.uploadHistory || []), newHistoryItem];
    const newReportCount = updatedChecklist.filter((c) => Boolean(c.attachedReport)).length;
    const newStatus = newReportCount >= 6 ? "검증완료" : newReportCount === 0 ? "검증 대기" : "검증 진행 중";

    const updatedTrials = currentProject.trials.map((tr) =>
      tr.trialDegree === activeTrial.trialDegree
        ? {
            ...tr,
            checklist: updatedChecklist,
            uploadHistory: updatedHistory,
          }
        : tr
    );

    updateValidationProject(currentProject.id, {
      trials: updatedTrials,
      overallStatus: newStatus,
    });

    setUploadModalItem(null);
    showToast(`[${uploadModalItem.category}] 성적서 및 메모가 등록되었습니다.`);
  };

  // MPSI 현장 입회 최종 판정 저장 (2-7: 검증완료 확인 후 승인)
  const handleConfirmVerdict = (verdict: "양산승인(내부)" | "보완요청(금형수정)") => {
    const reportCount = getReportCount(activeTrial);
    if (verdict === "양산승인(내부)" && reportCount < 6) {
      if (!confirm(`현재 양산성 검증 성적서가 ${reportCount}/6 건 첨부되어 있습니다.\n모든 성적서(6/6) 확인 전 양산승인을 진행하시겠습니까?`)) {
        return;
      }
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const updatedTrials = currentProject.trials.map((tr) =>
      tr.trialDegree === activeTrial.trialDegree
        ? {
            ...tr,
            status: verdict,
            opinion: verdictOpinion.trim() || tr.opinion,
          }
        : tr
    );

    const newOverallStatus = verdict === "양산승인(내부)" ? "검증완료" : "검증 진행 중";
    const targetStep = verdict === "양산승인(내부)" ? 12 : 11;
    const targetStatus = verdict === "양산승인(내부)" ? "진행중" : "진행중";

    updateValidationProject(currentProject.id, {
      mpsiWitnessInspector: "MPSI",
      overallStatus: newOverallStatus,
      currentStep: targetStep,
      updatedAt: `${dateStr} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      trials: updatedTrials,
    });

    // 프로젝트 마스터 Step 12 동기화
    updateStep(currentProject.projectNo, {
      currentStep: targetStep,
      stepStatus: targetStatus,
      notes: `[MPSI] ${activeTrial.trialDegree} 시양산 검증 ${verdict === "양산승인(내부)" ? "최종 적합 판정 완료 -> Step 12(양산품질 검증 PPAP) 진행중" : "보완요청 통보"}`,
    });

    // 외주사(뉴몰드)로 알림 발송
    sendAppNotification({
      menuName: "양산외주 - 시양산/양산성 검증",
      menuPath: "/portal/vendor-portal/mass/validation",
      senderCompany: "MPSI",
      content: `[${currentProject.projectNo}] ${activeTrial.trialDegree} 시양산 검증 결과: ${verdict === "양산승인(내부)" ? "양산승인(내부) 완료 -> Step 12 PPAP 착수" : "보완요청 통보"}`,
      projectNo: currentProject.projectNo,
      targetRole: "VENDOR_MASS",
      targetVendorName: currentProject.massVendor,
    });

    // PPAP 테이블 자동 등재 트리거 (백엔드 MpsiMassPpap 동기화)
    if (verdict === "양산승인(내부)") {
      fetch("/api/v1/mass-prod/ppap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectNo: currentProject.projectNo,
          ppapNo: `PPAP-${currentProject.projectNo}`,
          partNo: (currentProject as any).partNo || (currentProject as any).partNumber || "-",
          projectName: currentProject.projectName,
          productName: currentProject.productName,
          moldVendor: currentProject.moldVendor,
          massVendor: currentProject.massVendor,
          ppapStatus: "검토 대기",
          currentStep: 12,
          completionRate: 0,
        }),
      }).catch((e) => console.warn("Auto-sync PPAP failed:", e));
    }

    if (verdict === "양산승인(내부)") {
      showToast(`[${activeTrial.trialDegree} 양산승인 완료] 6대 보고서 및 Cpk 검증이 최종 적합 판정되었습니다. 공정 관제 Step 12 및 [양산 승인 (PPAP)] 메뉴로 실시간 연동되었습니다.`);
    } else {
      showToast(`[${activeTrial.trialDegree} 보완요청 통보] ${currentProject.moldVendor}(금형수정) 및 ${currentProject.massVendor}(조건튜닝)로 보완 지시서가 전송되었습니다.`);
    }
  };

  // 검색 필터링
  const filteredProjects = projects.filter((p) => {
    const projNo = getProjectNoDisplay(p).toLowerCase();
    const matchNo = filterProjectNo
      ? p.projectNo.toLowerCase().includes(filterProjectNo.toLowerCase()) || projNo.includes(filterProjectNo.toLowerCase())
      : true;
    const matchProd = filterProductName ? p.productName.includes(filterProductName) || p.projectName.includes(filterProductName) : true;
    
    const latestTrial = p.trials[p.trials.length - 1];
    const validationStatus = getValidationStatus(latestTrial);
    const matchStatus = filterStatus !== "ALL"
      ? (p.overallStatus === filterStatus || validationStatus === filterStatus)
      : true;

    const matchMass = filterMassVendor !== "ALL" ? p.massVendor === filterMassVendor : true;
    const matchMold = filterMoldVendor !== "ALL" ? p.moldVendor === filterMoldVendor : true;
    
    const targetDate = filterDateType === "testDate"
      ? latestTrial?.testDate || ""
      : p.targetMassApprovalDate || (p.updatedAt || "").slice(0, 10);
    const matchDate = isWithinDateRange(targetDate, filterDateFrom, filterDateTo);

    return matchNo && matchProd && matchStatus && matchMass && matchMold && matchDate;
  });

  return (
    <div className="flex flex-col gap-3 text-xs relative">
      {/* 토스트 알림창 */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-zinc-900 text-white px-4 py-2.5 rounded-lg shadow-lg border border-sky-500/30 text-xs animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. 관리 메뉴 변경: 헤더 배너 (3번째 스크린샷 빨간색 박스 통계 카드 완전 삭제) */}
      <div className="bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-lg p-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-600 text-white shadow-xs shrink-0">
            <Factory className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-sky-950 dark:text-sky-100">
                1. 양산성 검증 / 시양산 관제 (Step 11)
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300">
                공정 10 ~ 11
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
              금형 이관 접수 확인 후 사출 양산기 취부 12~24H 연속사출, 공정능력지수(Cpk ≥ 1.33) 검증 및 시양산 결과 보고서를 통합 관제합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 상단 검색 및 필터 바 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex flex-col gap-2.5">
        <div className="pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <DateRangeFilter
            dateType={filterDateType}
            onDateTypeChange={(v) => setFilterDateType(v as any)}
            dateTypeOptions={[
              { label: "양산승인 납기일", value: "targetMassApprovalDate" },
              { label: "시양산일자", value: "testDate" },
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
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">프로젝트 번호:</span>
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-zinc-400" />
              <Input 
                value={filterProjectNo} 
                onChange={(e) => setFilterProjectNo(e.target.value)} 
                placeholder="예: MI26001, MI26002" 
                className="pl-7 h-7 text-xs font-mono w-36" 
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">제품명:</span>
            <Input 
              value={filterProductName} 
              onChange={(e) => setFilterProductName(e.target.value)} 
              placeholder="제품명 검색" 
              className="h-7 text-xs w-36" 
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">사출 양산처:</span>
            <select 
              value={filterMassVendor} 
              onChange={(e) => setFilterMassVendor(e.target.value)} 
              className="h-7 rounded-md border bg-transparent px-2 text-xs font-semibold"
            >
              <option value="ALL">전체 양산처</option>
              <option value="(주)뉴몰드">(주)뉴몰드</option>
              <option value="세원사출(주)">세원사출(주)</option>
              <option value="대동사출(주)">대동사출(주)</option>
              <option value="(주)우진사출">(주)우진사출</option>
              <option value="MPSI 자체사출공장">MPSI 자체사출공장</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">금형 제작처:</span>
            <select 
              value={filterMoldVendor} 
              onChange={(e) => setFilterMoldVendor(e.target.value)} 
              className="h-7 rounded-md border bg-transparent px-2 text-xs font-semibold"
            >
              <option value="ALL">전체 제작처</option>
              <option value="우성정공(주)">우성정공(주)</option>
              <option value="대한금형(주)">대한금형(주)</option>
              <option value="MPSI 자체제작팀">MPSI 자체제작팀</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">양산성 검증상태:</span>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)} 
              className="h-7 rounded-md border bg-transparent px-2 text-xs font-semibold"
            >
              <option value="ALL">전체 상태</option>
              <option value="검증완료">검증완료</option>
              <option value="검증 대기">검증 대기</option>
              <option value="검증 진행 중">검증 진행 중</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end items-center gap-1.5 pt-1">
          <Button
            onClick={() => refreshFromDb()}
            disabled={isLoading}
            size="xs"
            variant="outline"
            className="h-7 px-3 gap-1 text-sky-700 dark:text-sky-300 border-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 cursor-pointer font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-sky-600" : ""}`} />
            DB 동기화
          </Button>
          <Button 
            onClick={() => { 
              setFilterProjectNo(""); 
              setFilterProductName(""); 
              setFilterStatus("ALL"); 
              setFilterMassVendor("ALL"); 
              setFilterMoldVendor("ALL"); 
              setFilterDateFrom(""); 
              setFilterDateTo(""); 
              setSelectedDatePreset("all"); 
            }} 
            size="xs" 
            variant="outline" 
            className="h-7 px-3 gap-1 text-zinc-600 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            초기화
          </Button>
        </div>
      </div>

      {/* 2. 메인 데이터 그리드 (전체 너비 다크 네이비 테이블 - 요청 1-1 ~ 1-6 반영) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1e293b] text-white text-[11px] font-semibold border-b border-zinc-700 whitespace-nowrap">
                <th className="py-2.5 px-3 text-center w-10">No</th>
                {/* 1-6) 프로젝트관리 번호 */}
                <th className="py-2.5 px-3 min-w-[110px]">프로젝트 번호</th>
                <th className="py-2.5 px-3 min-w-[140px]">프로젝트명 / 차종</th>
                <th className="py-2.5 px-3 min-w-[150px]">제품명</th>
                <th className="py-2.5 px-3 text-center min-w-[95px]">사출 양산처</th>
                <th className="py-2.5 px-3 text-center min-w-[95px]">금형 제작처</th>
                <th className="py-2.5 px-3 text-center min-w-[65px]">현재 차수</th>
                {/* 1-2) 시양산 결과 보고 (6/6, 대기, 3/6) */}
                <th className="py-2.5 px-3 text-center min-w-[105px]">시양산 결과 보고</th>
                {/* 1-3) 양산성 검증상태 (검증완료, 검증 대기, 검증 진행 중) */}
                <th className="py-2.5 px-3 text-center min-w-[100px]">양산성 검증상태</th>
                {/* 1-4) 최종 갱신일 삭제하고 대신 양산 승인 납기일 기입 */}
                <th className="py-2.5 px-3 text-center min-w-[110px]">양산 승인 납기일</th>
                {/* 1-5: 검증 완성율, 공정 10-1(긴급수정), 최종 갱신일은 삭제됨 */}
                <th className="py-2.5 px-3 text-center min-w-[95px]">상세 검증/판정</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-[11px]">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-zinc-400">
                    조회된 양산성 검증 대상 프로젝트가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((proj, idx) => {
                  const latestTrial = proj.trials[proj.trials.length - 1];
                  const projectNoDisplay = getProjectNoDisplay(proj);
                  const reportCount = getReportCount(latestTrial);
                  const validationStatus = getValidationStatus(latestTrial);

                  return (
                    <tr
                      key={proj.id}
                      onClick={() => handleOpenDetailModal(proj)}
                      className="hover:bg-sky-50/40 dark:hover:bg-sky-950/20 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center text-zinc-400 font-mono">
                        {idx + 1}
                      </td>

                      {/* 1-6) 프로젝트 관리번호 (수주 시 MI26001P0 형식) */}
                      <td className="py-2.5 px-3 font-bold text-sky-700 dark:text-sky-300 font-mono whitespace-nowrap">
                        <span>{projectNoDisplay}</span>
                      </td>

                      <td className="py-2.5 px-3 font-medium text-zinc-800 dark:text-zinc-200">
                        {proj.projectName}
                      </td>

                      <td className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300 font-medium">
                        {proj.productName}
                      </td>

                      {/* 사출 양산처 */}
                      <td className="py-2.5 px-3 text-center text-zinc-700 dark:text-zinc-300 font-medium whitespace-nowrap">
                        {proj.massVendor}
                      </td>

                      {/* 금형 제작처 */}
                      <td className="py-2.5 px-3 text-center text-zinc-600 dark:text-zinc-400 font-medium whitespace-nowrap">
                        {proj.moldVendor}
                      </td>

                      {/* 현재 차수 */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 font-bold rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200">
                          {proj.currentTrial}
                        </span>
                      </td>

                      {/* 1-2) 시양산 결과 보고 (6/6, 대기, 3/6) */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {renderReportCountBadge(reportCount)}
                      </td>

                      {/* 1-3) 양산성 검증상태 (검증완료, 검증 대기, 검증 진행 중) */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {renderValidationStatusBadge(proj.overallStatus || validationStatus)}
                      </td>

                      {/* 1-4) 양산 승인 납기일 (최종 갱신일 대체) */}
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-purple-700 dark:text-purple-300 whitespace-nowrap">
                        {proj.targetMassApprovalDate || "2026-08-30"}
                      </td>

                      {/* 상세 검증/판정 버튼 */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetailModal(proj);
                          }}
                          className="h-6 px-2.5 text-[11px] bg-sky-600 hover:bg-sky-700 text-white font-medium shadow-xs cursor-pointer"
                        >
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          상세 검증/판정
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. 양산성 검증 및 시양산 결과 상세 모달 (요청 2-1 ~ 2-7 반영)                */}
      {/* ========================================================================= */}
      {isDetailModalOpen && currentProject && activeTrial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-5xl my-6 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95">
            {/* 2-6) 모달 상단 헤더: 프로젝트 관리 번호(MI26001P0) 및 제목 표준화 */}
            <div className="bg-[#1e293b] text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-sky-600 text-white">
                  <Factory className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sky-300 font-bold text-sm">
                      {getProjectNoDisplay(currentProject)}
                    </span>
                    <h3 className="font-bold text-sm text-white">
                      사출 양산성 검증 및 시양산 결과 상세
                    </h3>
                    {currentProject.mpsiWitnessInspector && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/30 text-sky-200 border border-sky-400/30 font-bold">
                        입회: {currentProject.mpsiWitnessInspector}
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-400 text-[11px] mt-0.5">
                    차종: {currentProject.projectName} | 제품명: {currentProject.productName} | 양산처: {currentProject.massVendor} (금형제작: {currentProject.moldVendor})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* 2-1) T1 차수 정보에서 CPK 및 완성율 삭제 & 2-2) 금형이관일 및 양산승인 납기일 표기 */}
            <div className="bg-zinc-100 dark:bg-zinc-800/80 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mr-1 shrink-0">
                  검증 차수:
                </span>
                {currentProject.trials.map((tr) => {
                  const isActive = tr.trialDegree === selectedTrialDegree;
                  return (
                    <button
                      key={tr.trialDegree}
                      onClick={() => setSelectedTrialDegree(tr.trialDegree)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? "border-sky-600 bg-sky-600 text-white shadow-xs"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                      }`}
                    >
                      {/* 2-1) CPK 및 완성율 삭제: T1 차수 실적만 표기 */}
                      <span className="font-mono">{tr.trialDegree} 차수 실적</span>
                    </button>
                  );
                })}
              </div>

              {/* 2-2) 금형이관일 및 양산승인 납기일 표기 */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 px-2.5 py-1 rounded text-xs shadow-2xs">
                  <span className="text-amber-800 dark:text-amber-300 font-bold">금형이관일:</span>
                  <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                    {currentProject.moldTransferDate || "2026-08-10"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800 px-2.5 py-1 rounded text-xs shadow-2xs">
                  <span className="text-purple-800 dark:text-purple-300 font-bold">양산승인 납기일:</span>
                  <span className="font-mono font-bold text-purple-900 dark:text-purple-200">
                    {currentProject.targetMassApprovalDate || "2026-08-30"}
                  </span>
                </div>
              </div>
            </div>

            {/* 모달 바디 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* 4) 금형처 시사출 및 육성 과정은 양산처에 미공유, 결과(5대 승인서류 및 최종 샘플)만 금형 이관 시 공유 안내 바 */}
              <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-2.5 rounded-lg flex items-center justify-between text-xs text-blue-950 dark:text-blue-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>
                    <b>금형 이관 결과 공유 확인</b>: 금형처({currentProject.moldVendor})의 5대 승인서류 및 최종 시사출 샘플이 금형 이관 시 양산처로 정상 인계되었습니다. (육성 과정 비공개, 최종 결과만 공유)
                  </span>
                </div>
                <span className="text-[10px] text-blue-700 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded font-bold shrink-0">
                  금형 인수인계 완료
                </span>
              </div>

              {/* 기본 가동 환경 바 */}
              <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-zinc-500">시양산 테스트 일자:</span>{" "}
                    <b className="font-mono text-zinc-800 dark:text-zinc-200">{activeTrial.testDate}</b>
                  </div>
                  <div>
                    <span className="text-zinc-500">배정 설비:</span>{" "}
                    <b className="text-zinc-800 dark:text-zinc-200">{activeTrial.machineNo}</b>
                  </div>
                  <div>
                    <span className="text-zinc-500">연속 사출 시간:</span>{" "}
                    <b className="font-mono text-sky-700 dark:text-sky-300">{activeTrial.continuousHours}시간</b>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500">시양산 결과 보고:</span>
                  {renderReportCountBadge(getReportCount(activeTrial))}
                </div>
              </div>

              {/* 2-3 & 2-4) 4대 양산 지표 요약 카드: 관리 기준 입력 가능 & 시양산 불량률 입력 (실적 / 목표) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-center">
                {/* 1. 공정능력지수 (CPK) */}
                <div className="p-3 rounded-lg border bg-sky-50/50 dark:bg-sky-950/20 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-bold block">1. 공정능력지수 (CPK)</span>
                  <div className={`text-xl font-bold font-mono my-1 ${activeTrial.measuredCpk >= (activeTrial.targetCpk ?? 1.33) ? "text-emerald-600" : "text-rose-600"}`}>
                    Cpk {activeTrial.measuredCpk}
                  </div>
                  <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-500 pt-1 border-t">
                    <span>관리 기준: Cpk ≥</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={activeTrial.targetCpk ?? 1.33}
                      onChange={(e) => updateCurrentTrial({ targetCpk: Number(e.target.value) || 0 })}
                      className="h-6 w-16 text-xs text-center font-mono font-bold bg-white dark:bg-zinc-900 border-sky-300"
                    />
                  </div>
                </div>

                {/* 2. 공급능력 (CAPA) */}
                <div className="p-3 rounded-lg border bg-zinc-50/80 dark:bg-zinc-800/40 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-bold block">2. 공급능력 (CAPA)</span>
                  <div className="text-xl font-bold font-mono my-1 text-sky-700 dark:text-sky-300">
                    {activeTrial.dailyCapa.toLocaleString()} <span className="text-[10px] font-normal text-zinc-400">EA/일</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-500 pt-1 border-t">
                    <span>요구 캐파:</span>
                    <Input
                      type="number"
                      value={activeTrial.targetDailyCapa ?? 4500}
                      onChange={(e) => updateCurrentTrial({ targetDailyCapa: Number(e.target.value) || 0 })}
                      className="h-6 w-20 text-xs text-center font-mono font-bold bg-white dark:bg-zinc-900 border-zinc-300"
                    />
                    <span>EA/일</span>
                  </div>
                </div>

                {/* 3. 사이클타임 (C/T) */}
                <div className="p-3 rounded-lg border bg-zinc-50/80 dark:bg-zinc-800/40 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-bold">3. 사이클타임 (C/T)</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      activeTrial.measuredCycleTime <= (activeTrial.targetCycleTime ?? 35.0) ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {activeTrial.measuredCycleTime <= (activeTrial.targetCycleTime ?? 35.0) ? "목표 달성" : "C/T 지연"}
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono my-1 text-zinc-800 dark:text-zinc-100">
                    {activeTrial.measuredCycleTime}s
                  </div>
                  <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-500 pt-1 border-t">
                    <span>목표 C/T:</span>
                    <Input
                      type="number"
                      step="0.1"
                      value={activeTrial.targetCycleTime ?? 35.0}
                      onChange={(e) => updateCurrentTrial({ targetCycleTime: Number(e.target.value) || 0 })}
                      className="h-6 w-16 text-xs text-center font-mono font-bold bg-white dark:bg-zinc-900 border-zinc-300"
                    />
                    <span>초</span>
                  </div>
                </div>

                {/* 4. 시양산 불량률 (2-4 실적 / 목표 관리) */}
                <div className="p-3 rounded-lg border bg-zinc-50/80 dark:bg-zinc-800/40 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-bold">4. 시양산 불량률</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      activeTrial.defectRate <= (activeTrial.targetDefectRate ?? 1.0) ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    }`}>
                      {activeTrial.defectRate <= (activeTrial.targetDefectRate ?? 1.0) ? "적합" : "초과"}
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono my-1 text-rose-600">
                    {activeTrial.defectRate}%
                    <span className="text-[10px] text-zinc-400 font-normal ml-1">
                      ({activeTrial.defectCount}EA / {activeTrial.totalProduced}EA)
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-1 text-[10px] text-zinc-500 pt-1 border-t">
                    <span>목표 불량률:</span>
                    <Input
                      type="number"
                      step="0.1"
                      value={activeTrial.targetDefectRate ?? 1.0}
                      onChange={(e) => updateCurrentTrial({ targetDefectRate: Number(e.target.value) || 0 })}
                      className="h-6 w-16 text-xs text-center font-mono font-bold bg-white dark:bg-zinc-900 border-zinc-300"
                    />
                    <span>%</span>
                  </div>
                </div>
              </div>

              {/* 2-5) 양산성 검증 6대 항목 및 성적서 관리 */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 bg-white dark:bg-zinc-800/60 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <CheckSquare className="h-4 w-4 text-sky-600" />
                    양산성 검증 6대 항목 및 성적서 관리 (공식 보고서 규격)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-500 font-mono font-medium">
                      성적서 취합:
                    </span>
                    {renderReportCountBadge(getReportCount(activeTrial))}
                  </div>
                </div>

                <div className="border border-zinc-200 dark:border-zinc-700 rounded divide-y divide-zinc-200 dark:divide-zinc-700 overflow-hidden">
                  {activeTrial.checklist.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={item.isResolved}
                          onChange={() => handleToggleChecklist(item.id)}
                          className="rounded border-zinc-300 text-sky-600 focus:ring-sky-500 h-4 w-4 cursor-pointer"
                        />
                        {/* 2-5) 6대 항목 제목 수정 */}
                        <span className="px-2.5 py-1 rounded bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-xs font-bold text-sky-800 dark:text-sky-300 shrink-0">
                          {item.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Input
                          value={item.actualValue}
                          onChange={(e) => handleUpdateCheckActual(item.id, e.target.value)}
                          placeholder="실측치 입력"
                          className="h-6 w-32 text-[11px] font-mono"
                        />

                        {item.attachedReport ? (
                          <Button 
                            size="xs" 
                            variant="outline" 
                            onClick={() => handleDownloadFile(item.attachedReport, item.attachedReportUrl)}
                            className="h-6 px-2 text-[10px] gap-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50 cursor-pointer max-w-[150px] truncate"
                            title={item.attachedReport}
                          >
                            <FileText className="h-3 w-3 shrink-0" />
                            <span className="truncate">{item.attachedReport}</span>
                            <Download className="h-2.5 w-2.5 ml-0.5 shrink-0" />
                          </Button>
                        ) : null}

                        {/* 2-6 파일 업로드 및 메모 등록 모달 호출 버튼 */}
                        <Button 
                          size="xs" 
                          variant="outline" 
                          onClick={() => handleOpenUploadModal(item.id, item.category, item.attachedReport, item.attachedReportUrl)}
                          className="h-6 px-2 text-[10px] gap-1 text-sky-700 border-sky-300 hover:bg-sky-50 cursor-pointer"
                        >
                          <UploadCloud className="h-3 w-3" />
                          {item.attachedReport ? "재첨부" : "성적서 첨부"}
                        </Button>

                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          item.isResolved ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}>
                          {item.isResolved ? "적합(Pass)" : "부적합"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2-6) 업무 이력 메모 관리 내역 */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 bg-white dark:bg-zinc-800/60 shadow-xs space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b">
                  <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-sky-600" />
                    성적서 파일 업로드 및 업무 이력 메모
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    파일 수정/재업로드 시 이력 누적 보존
                  </span>
                </div>

                {(!activeTrial.uploadHistory || activeTrial.uploadHistory.length === 0) ? (
                  <p className="text-[11px] text-zinc-400 py-2 text-center">
                    아직 등록된 성적서 파일 및 업무 이력 메모가 없습니다.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {activeTrial.uploadHistory.map((hist) => (
                      <div key={hist.id} className="p-2 rounded bg-zinc-50 dark:bg-zinc-900 border text-xs flex flex-col gap-0.5">
                        <div className="flex items-center justify-between font-bold text-[11px]">
                          <span className="text-sky-700 dark:text-sky-300 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            {hist.author}: {hist.fileName} 등록
                            {hist.fileName && (
                              <button 
                                onClick={() => handleDownloadFile(hist.fileName, hist.fileUrl)}
                                className="ml-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 font-normal cursor-pointer"
                              >
                                <Download className="h-2.5 w-2.5" />
                                다운로드
                              </button>
                            )}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">{hist.uploadedAt} 입력</span>
                        </div>
                        <p className="text-zinc-700 dark:text-zinc-300 text-[11px] pl-4">
                          ↳ {hist.memo}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2-7) MPSI 기술품질팀 최종 양산 판정 및 검증완료 승인 */}
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-zinc-200 dark:border-zinc-800 flex flex-col gap-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-700 pb-2">
                  <span className="font-bold text-zinc-800 dark:text-zinc-100 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-sky-600" />
                    MPSI 기술품질팀 최종 양산 검증 판정
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 font-medium shrink-0">입회 검사원:</span>
                    <Input
                      value={verdictInspector}
                      onChange={(e) => setVerdictInspector(e.target.value)}
                      placeholder="입회 검사원 이름"
                      className="h-6 w-48 text-[11px] bg-white dark:bg-zinc-900"
                    />
                  </div>
                </div>

                {/* 종합 판정 소견 작성 */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-zinc-500 font-medium">
                    {currentProject.massVendor} 사출기술팀 제출 성적서 검토 및 MPSI 종합 판정 소견:
                  </label>
                  <textarea
                    value={verdictOpinion}
                    onChange={(e) => setVerdictOpinion(e.target.value)}
                    rows={3}
                    placeholder="12시간 연속 사출 안정화 여부 및 Cpk 검증 소견을 입력하세요."
                    className="w-full text-xs p-2.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-sky-500 leading-relaxed text-zinc-800 dark:text-zinc-200"
                  />
                </div>

                {/* 판정 실행 버튼 (2-7: 검증완료 확인 후 승인) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-zinc-400">검증 현황:</span>
                    {renderValidationStatusBadge(getValidationStatus(activeTrial))}
                    <span className="text-[10.5px] text-zinc-500 ml-1">
                      (성적서 취합: <b className="font-mono">{getReportCount(activeTrial)}/6</b>)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      onClick={() => handleConfirmVerdict("보완요청(금형수정)")}
                      size="sm"
                      className="h-7 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1 shadow-xs cursor-pointer"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      [보완 판정] 금형수정 및 조건튜닝 요청
                    </Button>
                    <Button
                      onClick={() => handleConfirmVerdict("양산승인(내부)")}
                      size="sm"
                      className="h-7 px-4 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      [적합 판정] 양산승인 및 PPAP 연동 확정
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="bg-zinc-100 dark:bg-zinc-800/80 p-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailModalOpen(false)}
                className="h-8 px-4 text-xs cursor-pointer"
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. 2-6 성적서 파일 업로드 및 업무 이력 메모 입력 팝업 모달                     */}
      {/* ========================================================================= */}
      {uploadModalItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 bg-sky-50 dark:bg-sky-950/40 border-b">
              <span className="font-bold text-xs text-sky-900 dark:text-sky-100 flex items-center gap-1.5">
                <UploadCloud className="h-4 w-4 text-sky-600" />
                [{uploadModalItem.category}] 성적서 첨부 및 메모 입력
              </span>
              <button onClick={() => setUploadModalItem(null)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="text-zinc-600 dark:text-zinc-400 font-bold block mb-1">
                  1. 성적서/보고서 파일 선택 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.xlsx,.xls,.dwg,.zip"
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="h-7 text-xs gap-1 border-sky-400 text-sky-700 hover:bg-sky-50 cursor-pointer"
                  >
                    <Upload className="h-3 w-3" />
                    파일 선택
                  </Button>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300 truncate">
                    {uploadForm.fileName ? `${uploadForm.fileName} (${uploadForm.fileSize})` : "선택된 파일 없음"}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-zinc-600 dark:text-zinc-400 font-bold block mb-1">
                  2. 업무 이력 메모 (필수 입력) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={uploadForm.memo}
                  onChange={(e) => setUploadForm({ ...uploadForm, memo: e.target.value })}
                  placeholder="예: 261010_치수검토보고서 등록. CTQ 주요 5개 포인트 전수 측정 적합 확인 완료."
                  className="w-full h-20 p-2 text-xs border rounded-md bg-zinc-50 dark:bg-zinc-800 resize-none"
                />
                <p className="text-[10px] text-zinc-400 mt-1">
                  ※ 등록 회사명, 입력 일시가 자동으로 기록되며 수정 재업로드 시에도 이력이 보존됩니다.
                </p>
              </div>
            </div>

            <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border-t flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setUploadModalItem(null)} className="h-7 text-xs cursor-pointer">
                취소
              </Button>
              <Button size="sm" onClick={handleSaveUpload} className="h-7 text-xs bg-sky-600 hover:bg-sky-700 text-white font-bold cursor-pointer">
                <Check className="h-3.5 w-3.5 mr-1" />
                업로드 및 메모 보존
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. 0~13단계 상세 공정 관제 모달                                              */}
      {/* ========================================================================= */}
      {isDiagramModalOpen && diagramItem && (() => {
        const curProject = modalSelectedItem || {
          id: diagramItem.id,
          projectNo: diagramItem.projectNo,
          customerName: diagramItem.customerName || "현대자동차",
          projectName: diagramItem.projectName,
          productName: diagramItem.productName,
          partNo: "4890",
          moldNo: `${diagramItem.projectNo.split("-")[0]}M`,
          cavity: "1*2 Cavity",
          material: "NAK80",
          moldProductionType: diagramItem.moldVendor.includes("자체") ? "IN_HOUSE" : "OUTSOURCING",
          moldVendor: diagramItem.moldVendor,
          massProductionType: diagramItem.massVendor.includes("자체") ? "IN_HOUSE" : "OUTSOURCING",
          massVendor: diagramItem.massVendor,
          currentStep: diagramItem.currentStep,
          stepStatus: diagramItem.overallStatus === "검증완료" ? "완료" : "진행중",
          trialDegree: diagramItem.currentTrial,
          trialCompletionRate: diagramItem.trials[diagramItem.trials.length - 1]?.completionRate || 80,
          facilityEvent: "가동대기",
          orderQty: 10000,
          deliveredQty: 0,
          targetT1Date: "2026-09-30",
          targetMassDate: "2026-11-30",
          updatedAt: diagramItem.updatedAt,
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-[95vw] 2xl:max-w-[1580px] rounded-xl shadow-2xl border overflow-hidden flex flex-col max-h-[94vh]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 bg-[#1e293b] text-white border-b border-slate-700 gap-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <ListTree className="h-5 w-5 text-sky-400" />
                  <div>
                    <h3 className="font-bold text-sm">
                      프로젝트 0~13단계 상세 공정 관제
                    </h3>
                    <span className="text-[11px] text-slate-300">
                      [{getProjectNoDisplay(diagramItem)}] {curProject.projectName} - {curProject.productName} ({curProject.customerName})
                    </span>
                  </div>
                </div>

                <button onClick={() => setIsDiagramModalOpen(false)} className="text-zinc-400 hover:text-white ml-2 cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs bg-zinc-50/50 dark:bg-zinc-900/40">
                <div className="flex flex-col gap-2.5 bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 font-medium shrink-0">대상 프로젝트:</span>
                    <select 
                      value={curProject.projectNo}
                      onChange={(e) => {
                        const found = masterProjects.find((p) => p.projectNo === e.target.value);
                        if (found) setModalSelectedItem(found);
                      }}
                      className="flex-1 min-w-0 h-7 rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-mono font-bold text-sky-600"
                    >
                      {projects.map((p) => (
                        <option key={`${p.id}-${p.projectNo}`} value={p.projectNo}>
                          [{getProjectNoDisplay(p)}] {p.projectName} - {p.productName} ({p.customerName || "고객사"})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 13단계 개별 카드 타임라인 그리드 */}
                <div className="flex flex-col gap-3 border rounded-xl p-4 bg-white dark:bg-zinc-900">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
                    {PROCESS_13_STEPS.map((item) => {
                      const isCurrent = item.step === curProject.currentStep;
                      const isCompleted = item.step < curProject.currentStep;
                      const dynamicActor = getStepActor(item.step, curProject);

                      return (
                        <div 
                          key={item.step}
                          className={`p-2.5 rounded-lg border flex flex-col justify-between transition-all ${
                            isCurrent 
                              ? "bg-sky-50/90 border-sky-500 ring-2 ring-sky-400/40 dark:bg-sky-950/40 shadow-xs" 
                              : isCompleted 
                                ? "bg-emerald-50/40 border-emerald-300 dark:bg-emerald-950/20" 
                                : "bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 opacity-80"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                                isCurrent ? "bg-sky-600 text-white" : isCompleted ? "bg-emerald-600 text-white" : "bg-zinc-300 text-zinc-700"
                              }`}>
                                Step {item.step}
                              </span>
                              {isCompleted && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                              {isCurrent && <span className="text-[9px] font-bold text-sky-700 animate-pulse">● 진행중</span>}
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

                          <div className="pt-2 mt-2 border-t flex justify-end">
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleNavigateToStepPage(item.step, curProject.projectNo)}
                              className="h-6 text-[10px] px-2 text-sky-600 hover:text-sky-700 border-sky-200"
                            >
                              화면이동
                              <ArrowRight className="h-2.5 w-2.5 ml-0.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-zinc-100 dark:bg-zinc-800/80 p-3 border-t flex justify-end shrink-0">
                <Button variant="outline" size="sm" onClick={() => setIsDiagramModalOpen(false)}>
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
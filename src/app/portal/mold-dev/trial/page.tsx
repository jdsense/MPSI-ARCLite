"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, RefreshCw, CheckCircle2, XCircle, 
  Layers, Plus, CheckSquare, Clock, ArrowRight, 
  ExternalLink, UploadCloud, Download, X, Check, 
  Wrench, Activity, ShieldCheck, AlertTriangle, FileText, Save, Award, Calendar,
  Building2, Eye, ListTree, Settings, Info, MessageSquare, Send, FileCheck
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

import { autoEnrollMassQuotationFromTrial } from "@/lib/mass-quotation-store";

import { 
  useMoldTrialStore, 
  MoldTrialProject, 
  TrialRecord, 
  TrialDocumentItem,
  FinalDeliveryFile, 
  ChecklistItem,
  MoldTrialMemoLog,
  INITIAL_MOLD_TRIALS
} from "@/lib/mold-trial-store";
import { sendAppNotification, cleanCompanyAuthor } from "@/lib/notification-store";

export default function MoldTrialPage() {
  const router = useRouter();
  const { projects: masterProjects, updateStep } = useProjectMaster();
  const { trials: projects, updateTrialProject, addMemoLog, verifyFinalDoc, refreshFromDb, isLoading } = useMoldTrialStore();

  // 검색 필터 상태
  const [filterProjectNo, setFilterProjectNo] = useState("");
  const [filterProductName, setFilterProductName] = useState("");
  const [filterCurrentTrial, setFilterCurrentTrial] = useState("ALL");
  const [filterDateType, setFilterDateType] = useState<"trialDate" | "updatedAt">("trialDate");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePresetType>("all");

  // 상세 모달 상태
  const [selectedProjectId, setSelectedProjectId] = useState<number>(1);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTrialDegree, setSelectedTrialDegree] = useState<string>("T1");

  // 13단계 프로세스 상세 공정 모달 상태
  const [diagramItem, setDiagramItem] = useState<MoldTrialProject | null>(null);
  const [isDiagramModalOpen, setIsDiagramModalOpen] = useState(false);
  const [modalSelectedItem, setModalSelectedItem] = useState<ProjectItem | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  // 공식 [금형제작 승인서] 팝업 모달 상태
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  // 시사출 계획/일정 등록 모달 상태 (2-1)
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [tempPlanDate, setTempPlanDate] = useState("");

  // 신규 차수($T_{n+1}$) 등록 팝업 모달 상태 (스크린샷 3)
  const [isNewTrialModalOpen, setIsNewTrialModalOpen] = useState(false);
  const [newInspector, setNewInspector] = useState("담당자");
  const [newDimRes, setNewDimRes] = useState<"OK" | "NG">("OK");
  const [newAppRes, setNewAppRes] = useState<"OK" | "NG">("OK");
  const [newSpecRes, setNewSpecRes] = useState<"OK" | "NG">("OK");
  const [newCycleTime, setNewCycleTime] = useState<number>(35);
  const [newOpinion, setNewOpinion] = useState("");

  // 업무 이력 메모 입력 상태 (2-4, 2-13)
  const [memoTag, setMemoTag] = useState("261105.시사출육성");
  const [memoInput, setMemoInput] = useState("");

  // 현재 모달에서 선택된 프로젝트
  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0] || null;

  // 활성화된 회차 레코드
  const activeTrial: TrialRecord =
    currentProject?.trials?.find((t) => t.trialDegree === selectedTrialDegree) ||
    currentProject?.trials?.[currentProject?.trials?.length - 1] || {
      trialDegree: "T1",
      trialDate: "2026-11-06",
      inspector: "담당자",
      dimResult: "OK",
      appResult: "OK",
      specResult: "OK",
      cycleTime: 35,
      targetCycleTime: 35,
      status: "육성 진행중",
      checklist: [],
      opinion: "",
    };

  // 상세 폼 수정 상태
  const [activeInspector, setActiveInspector] = useState(activeTrial.inspector);
  const [activeDimResult, setActiveDimResult] = useState<"OK" | "NG">(activeTrial.dimResult);
  const [activeDimReport, setActiveDimReport] = useState<TrialDocumentItem | undefined>(activeTrial.dimReport);
  const [activeAppResult, setActiveAppResult] = useState<"OK" | "NG">(activeTrial.appResult);
  const [activeAppReport, setActiveAppReport] = useState<TrialDocumentItem | undefined>(activeTrial.appReport);
  const [activeSpecResult, setActiveSpecResult] = useState<"OK" | "NG">(activeTrial.specResult);
  const [activeSpecReport, setActiveSpecReport] = useState<TrialDocumentItem | undefined>(activeTrial.specReport);
  const [activeCycleTime, setActiveCycleTime] = useState<number>(activeTrial.cycleTime);
  const [activeCondReport, setActiveCondReport] = useState<TrialDocumentItem | undefined>(activeTrial.condReport);
  const [activeStatus, setActiveStatus] = useState<TrialRecord["status"]>(activeTrial.status);
  const [activeOpinion, setActiveOpinion] = useState(activeTrial.opinion);
  const [mpsiDecisionOpinion, setMpsiDecisionOpinion] = useState("");

  // 이관 계획일/실적일 로컬 상태 (2-8, 2-9)
  const [transferPlanDate, setTransferPlanDate] = useState(currentProject?.transferPlanDate || "");
  const [transferActualDate, setTransferActualDate] = useState(currentProject?.transferActualDate || "");

  // 차수 전환 시 폼 상태 동기화
  useEffect(() => {
    if (activeTrial) {
      setActiveInspector(activeTrial.inspector);
      setActiveDimResult(activeTrial.dimResult);
      setActiveDimReport(activeTrial.dimReport);
      setActiveAppResult(activeTrial.appResult);
      setActiveAppReport(activeTrial.appReport);
      setActiveSpecResult(activeTrial.specResult);
      setActiveSpecReport(activeTrial.specReport);
      setActiveCycleTime(activeTrial.cycleTime);
      setActiveCondReport(activeTrial.condReport);
      setActiveStatus(activeTrial.status);
      setActiveOpinion(activeTrial.opinion);
      setMpsiDecisionOpinion("");
    }
  }, [activeTrial, selectedTrialDegree]);

  useEffect(() => {
    if (currentProject) {
      setTransferPlanDate(currentProject.transferPlanDate || "");
      setTransferActualDate(currentProject.transferActualDate || "");
    }
  }, [currentProject]);

  // 검색 필터링된 프로젝트 목록
  const filteredProjects = projects.filter((p) => {
    const matchProject = filterProjectNo
      ? p.projectNo.toLowerCase().includes(filterProjectNo.toLowerCase())
      : true;
    const matchProd = filterProductName
      ? p.productName.toLowerCase().includes(filterProductName.toLowerCase()) ||
        p.projectName.toLowerCase().includes(filterProductName.toLowerCase())
      : true;
    const matchTrial = filterCurrentTrial !== "ALL"
      ? p.currentTrial === filterCurrentTrial
      : true;
    return matchProject && matchProd && matchTrial;
  });

  const handleReset = () => {
    setFilterProjectNo("");
    setFilterProductName("");
    setFilterCurrentTrial("ALL");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSelectedDatePreset("all");
  };

  // 상세 모달 열기
  const handleOpenDetail = (project: MoldTrialProject) => {
    setSelectedProjectId(project.id);
    setSelectedTrialDegree(project.currentTrial === "금형 승인" ? "TRANSFER" : project.currentTrial || "T1");
    setIsDetailModalOpen(true);
  };

  // 13단계 프로세스 상세 공정 모달 열기
  const handleOpenDiagram = (item: MoldTrialProject) => {
    setDiagramItem(item);
    const matched = masterProjects.find((p) => p.projectNo === item.projectNo);
    if (matched) {
      setModalSelectedItem(matched);
    } else {
      setModalSelectedItem({
        id: item.id,
        projectNo: item.projectNo,
        customerName: item.customerName || "원청 고객사",
        projectName: item.projectName,
        productName: item.productName,
        partNo: "4890",
        moldNo: `${item.projectNo.split("-")[0]}M`,
        cavity: item.cavity || "1*2 Cavity",
        material: item.material || "NAK80",
        moldProductionType: item.moldVendor.includes("자체") ? "IN_HOUSE" : "OUTSOURCING",
        moldVendor: item.moldVendor,
        massProductionType: "OUTSOURCING",
        massVendor: item.massVendor,
        currentStep: item.currentStep,
        stepStatus: item.isMoldApproved ? "완료" : "진행중",
        trialDegree: item.currentTrial,
        trialCompletionRate: item.isMoldApproved ? 100 : 80,
        facilityEvent: "가동대기",
        orderQty: 10000,
        deliveredQty: 0,
        targetT1Date: item.targetT1Date || "2026-09-30",
        targetMassDate: "2026-11-30",
        updatedAt: item.updatedAt,
      });
    }
    setExpandedStep(null);
    setIsDiagramModalOpen(true);
  };

  // 13단계 프로세스 스텝 이동
  const handleNavigateToStepPage = (step: number, projectNo?: string) => {
    const targetUrl = getStepUrl(step, projectNo);
    setIsDiagramModalOpen(false);
    router.push(targetUrl);
  };

  // Step 상태 배지 클래스
  const getStepStatusBadge = (status: string) => {
    switch (status) {
      case "완료":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300";
      case "Fail(수정중)":
        return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 animate-pulse font-bold";
      case "지연주의":
        return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300";
      default:
        return "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300";
    }
  };

  // 2-6) MPSI 시사출 결과 승인/미승인 결정 핸들러
  const handleMpsiDecision = (decision: "승인" | "미승인(수정요청)") => {
    const isPass = decision === "승인";
    const nextStatus = isPass ? "Pass (양산승인)" : "Fail (금형수정)";

    const updatedTrials = currentProject.trials.map(tr => {
      if (tr.trialDegree !== selectedTrialDegree) return tr;
      return {
        ...tr,
        status: nextStatus as any,
        mpsiDecision: decision,
      };
    });

    updateTrialProject(currentProject.id, {
      trials: updatedTrials,
      currentStep: isPass ? 9 : 8,
    });

    addMemoLog(currentProject.id, {
      authorId: "mpsi-mgr",
      authorName: "MPSI",
      company: "MPSI",
      tag: `시사출_${decision}`,
      content: `[${selectedTrialDegree} 시사출] ${decision} 처리 완료: ${mpsiDecisionOpinion || "소견 없음"}`,
    });

    alert(`[${selectedTrialDegree} 시사출 결과] ${decision} 처리되었습니다.`);
  };

  // 2-11, 2-12) 5대 서류 승인 및 반려 핸들러
  const handleApproveDoc = async (docKey: FinalDeliveryFile["key"]) => {
    verifyFinalDoc(currentProject.id, docKey, true, "MPSI", false);
    const doc = currentProject.finalDocuments.find(d => d.key === docKey);
    addMemoLog(currentProject.id, {
      authorId: "mpsi-dev",
      authorName: "MPSI",
      company: "MPSI",
      tag: "서류승인",
      content: `5대 서류 [${doc?.label || docKey}] 승인 완료`,
    });

    // 외주 금형처로 승인 알림 발송 (사용자 이름 제외, 회사명 단독)
    await sendAppNotification({
      menuName: "금형 육성 및 시사출",
      menuPath: "/portal/vendor-portal/mold/trial",
      senderCompany: "MPSI",
      content: `[${currentProject.projectNo}] MPSI에서 5대 서류 [${doc?.label || docKey}]를 승인하였습니다.`,
      projectId: currentProject.projectNo,
      targetRole: "VENDOR_MOLD",
      targetVendorName: currentProject.moldVendor
    });

    // 5대 서류 전수 승인 완료 여부 확인
    const remainingUnverified = currentProject.finalDocuments.filter(
      d => d.key !== docKey && (!d.fileName || !d.isVerified)
    );

    if (remainingUnverified.length === 0) {
      // 5대 서류 모두 승인 완료됨 -> Step 10 완료 또는 Step 11(시양산) 착수
      const hasActualTransfer = Boolean(transferActualDate || currentProject.transferActualDate);
      const nextStep = hasActualTransfer ? 11 : 10;
      const nextStatus = hasActualTransfer ? "진행중" : "완료";

      updateStep(currentProject.projectNo, {
        currentStep: nextStep,
        stepStatus: nextStatus as any,
        trialCompletionRate: 100,
        notes: hasActualTransfer 
          ? `[금형 이관 완료] 사출양산처(${currentProject.massVendor})로 금형 이관 완료, Step 11(시양산/양산성검증) 착수`
          : `[금형 승인] 5대 필수서류 검증 완료 및 금형 양산처 이관 승인(Step 10 완료)`,
      });

      // 양산 견적 관리대장(/portal/mass-prod/quotation) 자동 등재
      autoEnrollMassQuotationFromTrial({
        ...currentProject,
        transferPlanDate: transferPlanDate || currentProject.transferPlanDate,
        transferActualDate: transferActualDate || currentProject.transferActualDate,
      });

      // 외주 금형처로 5대 서류 완결 알림
      await sendAppNotification({
        menuName: "금형 육성 및 시사출",
        menuPath: "/portal/vendor-portal/mold/trial",
        senderCompany: "MPSI",
        content: `[${currentProject.projectNo}] 축하합니다! 5대 필수 서류가 모두 승인되어 금형 이관 승인이 완료되었습니다.`,
        projectId: currentProject.projectNo,
        targetRole: "VENDOR_MOLD",
        targetVendorName: currentProject.moldVendor
      });

      // 사출 양산 외주처가 지정되어 있으면 견적 등록 알림
      if (currentProject.massVendor && currentProject.massVendor !== "자체생산") {
        await sendAppNotification({
          menuName: "사출 양산 견적",
          menuPath: "/portal/vendor-portal/mass/quotation",
          senderCompany: "MPSI",
          content: `[${currentProject.projectNo}] 금형 이관 승인 완료에 따라 사출 양산 견적 요청이 배정되었습니다.`,
          projectId: currentProject.projectNo,
          targetRole: "VENDOR_MASS",
          targetVendorName: currentProject.massVendor
        });
      }

      alert(`[금형 승인 완료] 5대 필수 서류가 모두 승인되었습니다.\n- 0~13단계 총괄 관제: ${hasActualTransfer ? "Step 11(시양산) 진행중" : "Step 10(금형 승인 후 이관) 완료"}\n- 양산 견적 관리대장(/portal/mass-prod/quotation)에 자동 등재되었습니다.`);
    }
  };

  const handleRejectDoc = async (docKey: FinalDeliveryFile["key"]) => {
    const reason = prompt("반려 사유(보완 요청 내용)를 입력하세요:", "측정 데이터 보완 및 사진 재촬영 요망");
    if (reason === null) return;

    verifyFinalDoc(currentProject.id, docKey, false, "MPSI", true, reason);
    const doc = currentProject.finalDocuments.find(d => d.key === docKey);
    addMemoLog(currentProject.id, {
      authorId: "mpsi-dev",
      authorName: "MPSI",
      company: "MPSI",
      tag: "서류반려",
      content: `5대 서류 [${doc?.label || docKey}] 반려(보완요청): ${reason}`,
    });

    // 외주 금형처로 반려 알림 발송 (사용자 이름 제외, 회사명 단독)
    await sendAppNotification({
      menuName: "금형 육성 및 시사출",
      menuPath: "/portal/vendor-portal/mold/trial",
      senderCompany: "MPSI",
      content: `[${currentProject.projectNo}] MPSI에서 5대 서류 [${doc?.label || docKey}]를 반려(보완요청)하였습니다: "${reason}"`,
      projectId: currentProject.projectNo,
      targetRole: "VENDOR_MOLD",
      targetVendorName: currentProject.moldVendor
    });
  };

  // 2-8, 2-9) 이관 계획일 / 완료일 저장 핸들러
  const handleSaveTransferDates = () => {
    updateTrialProject(currentProject.id, {
      transferPlanDate,
      transferActualDate,
    });
    addMemoLog(currentProject.id, {
      authorId: "mpsi-dev",
      authorName: "MPSI",
      company: "MPSI",
      tag: "이관일정등록",
      content: `금형 이관 일정 갱신 (계획일: ${transferPlanDate || "미정"}, 완료실적일: ${transferActualDate || "미완료"})`,
    });

    // 5대 서류 승인 상태이고 이관 완료일(실적)이 입력된 경우 -> Step 11 전환 및 양산 견적 자동 등재
    const allVerified = currentProject.finalDocuments.every(d => Boolean(d.fileName) && d.isVerified);
    if (allVerified && transferActualDate) {
      updateStep(currentProject.projectNo, {
        currentStep: 11,
        stepStatus: "진행중",
        trialCompletionRate: 100,
        notes: `[우성정공(주) -> ${currentProject.massVendor}] 금형 이관 완료(${transferActualDate}), Step 11(시양산/양산성검증) 착수`,
      });

      autoEnrollMassQuotationFromTrial({
        ...currentProject,
        transferPlanDate,
        transferActualDate,
      });

      alert(`금형 이관 실적일(${transferActualDate})이 저장되었습니다.\n- 0~13단계 총괄 관제: Step 11(양산승인 사출/시양산)으로 전환 완료\n- 양산 견적 관리대장(/portal/mass-prod/quotation)에 자동 연계되었습니다.`);
    } else {
      alert("금형 이관 계획일 및 실적일이 저장되었습니다.");
    }
  };

  // 2-4, 2-13) 업무 이력 메모 수동 작성
  const handleAddMemo = async () => {
    if (!memoInput.trim()) return;
    const memoContent = memoInput.trim();
    addMemoLog(currentProject.id, {
      authorId: "mpsi-dev",
      authorName: "MPSI",
      company: "MPSI",
      tag: memoTag || "업무메모",
      content: memoContent,
    });

    // 외주 금형처로 메모 알림 발송 (사용자 이름 제외, 회사명 단독)
    await sendAppNotification({
      menuName: "금형 육성 및 시사출",
      menuPath: "/portal/vendor-portal/mold/trial",
      senderCompany: "MPSI",
      content: `[${currentProject.projectNo}] MPSI에서 검토 메모를 등록하였습니다: "${memoContent.slice(0, 30)}..."`,
      projectId: currentProject.projectNo,
      targetRole: "VENDOR_MOLD",
      targetVendorName: currentProject.moldVendor
    });

    setMemoInput("");
  };

  // 3번째 스크린샷: 신규 차수 판정 저장
  const handleSaveNewTrial = () => {
    const nextTrialNum = currentProject.trials.length + 1;
    const nextDegree = `T${nextTrialNum}`;
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;

    const newRecord: TrialRecord = {
      trialDegree: nextDegree,
      trialDate: dateStr,
      inspector: newInspector,
      dimResult: newDimRes,
      appResult: newAppRes,
      specResult: newSpecRes,
      cycleTime: Number(newCycleTime),
      targetCycleTime: 35,
      status: "육성 진행중",
      mpsiDecision: "검토중",
      checklist: [],
      opinion: newOpinion,
    };

    updateTrialProject(currentProject.id, {
      trials: [...currentProject.trials, newRecord],
      currentTrial: nextDegree,
    });

    addMemoLog(currentProject.id, {
      authorId: "mpsi-dev",
      authorName: "MPSI 개발팀",
      company: "MPSI 본사",
      tag: `${nextDegree}결과등록`,
      content: `${nextDegree} 시사출 검사 결과 등록 완료 (치수:${newDimRes}, 외관:${newAppRes}, 사양:${newSpecRes}, C/T:${newCycleTime}s)`,
    });

    setIsNewTrialModalOpen(false);
    setSelectedTrialDegree(nextDegree);
  };

  // 파일 실제 스트리밍 다운로드
  const handleDownloadFile = async (fileName?: string, fileUrl?: string) => {
    const targetFile = fileUrl || fileName;
    if (!targetFile) return;
    try {
      const downloadUrl = `/api/v1/files/download?file=${encodeURIComponent(targetFile)}&name=${encodeURIComponent(fileName || "시사출보고서")}`;
      const res = await fetch(downloadUrl);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName || "시사출보고서";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    } catch (e) {
      console.warn("Download failed:", e);
    }
    if (fileUrl) {
      window.open(fileUrl, "_blank");
    } else {
      alert("다운로드할 원본 파일이 서버에 등록되지 않았습니다.");
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 상단 SCM 프로세스 공정 7~10 배너 */}
      <div className="bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sky-900 dark:text-sky-200 text-xs">
                [공정 7, 8, 9, 10] 금형개발 시사출/금형 육성 및 5대 승인서류 검증 관리 대장
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-sky-200 text-sky-800">
                시사출 관제 대장
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
              T1~Tn 차수별 육성 항목(치수/외관/사양/C/T) 검토 및 5대 필수 승인 서류 완비 시 공식 [금형승인원]을 발급하여 양산처 이관을 승인합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 1. 검색 및 필터 바 */}
      <div className="bg-zinc-50 dark:bg-zinc-900/60 border rounded-lg p-2.5 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* 프로젝트 번호 검색 */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-zinc-500 shrink-0">프로젝트 번호:</span>
            <Input
              value={filterProjectNo}
              onChange={(e) => setFilterProjectNo(e.target.value)}
              placeholder="예: MI26001"
              className="h-7 w-28 text-xs bg-white dark:bg-zinc-900"
            />
          </div>

          {/* 제품명 / 차종 검색 */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-zinc-500 shrink-0">제품명/차종:</span>
            <Input
              value={filterProductName}
              onChange={(e) => setFilterProductName(e.target.value)}
              placeholder="예: Door Cover"
              className="h-7 w-32 text-xs bg-white dark:bg-zinc-900"
            />
          </div>

          {/* 차수 필터 */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-zinc-500 shrink-0">차수:</span>
            <select
              value={filterCurrentTrial}
              onChange={(e) => setFilterCurrentTrial(e.target.value)}
              className="h-7 rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-medium"
            >
              <option value="ALL">전체 차수</option>
              <option value="T1">T1</option>
              <option value="T2">T2</option>
              <option value="T3">T3</option>
              <option value="금형 승인">금형 승인</option>
            </select>
          </div>

          {/* 일자 기준 셀렉터 */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-zinc-500 shrink-0">일자 기준:</span>
            <select
              value={filterDateType}
              onChange={(e) => setFilterDateType(e.target.value as any)}
              className="h-7 rounded border bg-white dark:bg-zinc-900 px-2 text-xs"
            >
              <option value="trialDate">시사출일/갱신일</option>
              <option value="updatedAt">최종 갱신일</option>
            </select>
          </div>

          {/* 일자 범위 및 프리셋 필터 */}
          <div className="flex items-center">
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

          <div className="flex items-center gap-1 ml-auto">
            <Button onClick={() => refreshFromDb(true)} variant="outline" size="xs" className="h-7 text-xs gap-1 text-sky-700 border-sky-300 dark:text-sky-300 cursor-pointer">
              <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
              DB 동기화
            </Button>
            <Button onClick={handleReset} variant="outline" size="xs" className="h-7 text-xs gap-1 cursor-pointer">
              초기화
            </Button>
          </div>
        </div>
      </div>

      {/* 2. 메인 데이터 그리드 (1번째 스크린샷 요구사항: 사선 표시된 메뉴 삭제 및 컬럼명 변경) */}
      <div className="border rounded-lg bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[580px]">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead className="sticky top-0 z-10 bg-[#1e293b] text-white font-medium text-[11px]">
              <tr className="border-b border-slate-700">
                <th className="p-2 w-10 text-center border-r border-slate-600">No</th>
                <th className="p-2 border-r border-slate-600 min-w-[125px]">프로젝트 번호</th>
                <th className="p-2 border-r border-slate-600 min-w-[120px] text-center">금형제작처</th>
                <th className="p-2 border-r border-slate-600 min-w-[120px] text-center">사출양산처</th>
                <th className="p-2 border-r border-slate-600 min-w-[160px]">프로젝트 / 차종</th>
                <th className="p-2 border-r border-slate-600 min-w-[180px]">제품명</th>
                <th className="p-2 border-r border-slate-600 min-w-[105px] text-center">금형번호</th>
                <th className="p-2 border-r border-slate-600 min-w-[90px] text-center">차수</th>
                {/* 스크린샷 1 수정: 4대 검사결과 -> '육성 항목' */}
                <th className="p-2 border-r border-slate-600 min-w-[170px] text-center bg-slate-800">육성 항목</th>
                {/* 스크린샷 1 수정: 5대 서류 검증 -> '승인 서류' */}
                <th className="p-2 border-r border-slate-600 min-w-[110px] text-center bg-slate-800">승인 서류</th>
                <th className="p-2 min-w-[85px] text-center">육성 상세</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px]">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-zinc-400">
                    조회 조건에 부합하는 시사출/금형 육성 프로젝트가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((row, idx) => {
                  const lastTrial = row.trials[row.trials.length - 1] || row.trials[0];
                  const verifiedDocCount = row.finalDocuments.filter(d => Boolean(d.fileName) && d.isVerified).length;
                  const isApproved = row.currentTrial === "금형 승인" || row.isMoldApproved;

                  return (
                    <tr 
                      key={row.id} 
                      className="hover:bg-sky-50/70 dark:hover:bg-zinc-800/60 transition-colors odd:bg-white even:bg-zinc-50/40 dark:odd:bg-zinc-900 dark:even:bg-zinc-900/50"
                    >
                      <td className="p-2 text-center font-mono text-zinc-400 border-r">{idx + 1}</td>
                      
                      {/* 프로젝트 번호 */}
                      <td className="p-2 border-r font-mono font-bold text-sky-600 dark:text-sky-400">
                        <span>{row.projectNo}</span>
                      </td>

                      {/* 금형제작처 */}
                      <td className="p-2 border-r text-center">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          row.moldVendor.includes("자체")
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                            : "bg-blue-50 text-blue-700 border border-blue-300"
                        }`}>
                          <Building2 className="h-3 w-3" />
                          {row.moldVendor}
                        </span>
                      </td>

                      {/* 사출양산처 */}
                      <td className="p-2 border-r text-center font-medium text-emerald-700">
                        {row.massVendor}
                      </td>

                      <td className="p-2 border-r font-medium truncate max-w-[160px]" title={row.projectName}>{row.projectName}</td>
                      <td className="p-2 border-r font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[180px]" title={row.productName}>{row.productName}</td>

                      {/* 금형번호 */}
                      <td className="p-2 border-r text-center font-mono font-bold text-zinc-800 dark:text-zinc-200">
                        {row.moldNo || (row.projectNo ? `${row.projectNo.split("-")[0].replace(/P0$/, "")}M` : "-")}
                      </td>

                      {/* 차수 (2-14 금형 승인원 제출 및 승인 후 'T3'가 '금형 승인'으로 변동) */}
                      <td className="p-2 border-r text-center font-mono font-bold">
                        {isApproved ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                            금형 승인
                          </span>
                        ) : (
                          <span className="text-sky-700 font-bold">{row.currentTrial}</span>
                        )}
                      </td>

                      {/* 육성 항목 (구 4대 검사결과: 치수/외관/사양/CT) */}
                      <td className="p-2 border-r text-center">
                        <div className="flex items-center justify-center gap-1 font-mono text-[10px]">
                          <span className={`px-1.5 py-0.2 rounded font-bold ${lastTrial.dimResult === "OK" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                            치수:{lastTrial.dimResult}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded font-bold ${lastTrial.appResult === "OK" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                            외관:{lastTrial.appResult}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded font-bold ${lastTrial.specResult === "OK" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                            사양:{lastTrial.specResult}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-700 font-bold">
                            {lastTrial.cycleTime}s
                          </span>
                        </div>
                      </td>

                      {/* 승인 서류 (구 5대 서류 검증) */}
                      <td className="p-2 border-r text-center font-mono font-bold">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          verifiedDocCount === 5 
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : verifiedDocCount > 0
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                        }`}>
                          {verifiedDocCount}/5건 확인
                        </span>
                      </td>

                      {/* 육성 상세 버튼 */}
                      <td className="p-2 text-center">
                        <Button 
                          onClick={() => handleOpenDetail(row)} 
                          size="xs" 
                          variant="outline" 
                          className="h-6 px-2.5 text-[10px] gap-1 bg-white hover:bg-zinc-100 dark:bg-zinc-800 font-bold text-sky-700 border-sky-300 cursor-pointer"
                        >
                          <Eye className="h-3 w-3 text-sky-600" />
                          상세보기
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

      {/* 3. [모달 1] 2번째 스크린샷 & 4번째 스크린샷 통합 모달 */}
      {isDetailModalOpen && currentProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-5xl rounded-xl shadow-2xl border overflow-hidden flex flex-col max-h-[92vh]">
            {/* 모달 헤더 (2번째 스크린샷: <- 금형 육성 및 승인원 제출) */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#1e293b] text-white">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-sky-400" />
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm">
                    [{currentProject.moldVendor} ➔ {currentProject.massVendor}] 금형 시사출 육성 및 5대 승인서류 검증 상세
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-amber-600 text-white font-bold text-[10px]">
                    금형 육성 및 승인원 제출
                  </span>
                </div>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 모달 바디 */}
            <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs bg-zinc-50/40 dark:bg-zinc-900/40">
              {/* 상단 프로젝트 요약 & 액션 헤더 */}
              <div className="bg-white dark:bg-zinc-900 border rounded-lg p-3.5 shadow-xs flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2.5 gap-2">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-[11px]">
                    <div><span className="text-zinc-500">프로젝트 번호:</span> <b className="font-mono text-sky-600 ml-1">{currentProject.projectNo}</b></div>
                    <div><span className="text-zinc-500">금형번호:</span> <b className="font-mono font-bold text-zinc-800 dark:text-zinc-200 ml-1">{currentProject.moldNo || (currentProject.projectNo ? `${currentProject.projectNo.split("-")[0].replace(/P0$/, "")}M` : "-")}</b></div>
                    <div><span className="text-zinc-500">원청 고객사:</span> <b className="text-zinc-800 dark:text-zinc-200 ml-1">{currentProject.customerName || "현대자동차"}</b></div>
                    <div><span className="text-zinc-500">금형제작처:</span> <b className="text-blue-600 ml-1">{currentProject.moldVendor}</b></div>
                    <div><span className="text-zinc-500">사출양산처:</span> <b className="text-emerald-700 ml-1">{currentProject.massVendor}</b></div>
                  </div>

                  {/* 버튼 그룹: 다음 차수 등록 / 승인서 */}
                  <div className="flex items-center gap-2 shrink-0">
                    {currentProject.isMoldApproved ? (
                      <Button
                        onClick={() => setIsCertModalOpen(true)}
                        size="xs"
                        className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs font-bold shadow-xs cursor-pointer"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        금형제작 승인서 확인
                      </Button>
                    ) : (
                      <span className="text-[10px] text-zinc-400 font-medium">승인서 발급대기</span>
                    )}

                    <Button
                      onClick={() => {
                        setIsNewTrialModalOpen(true);
                      }}
                      size="xs"
                      className="h-7 px-2.5 bg-sky-600 hover:bg-sky-700 text-white gap-1 text-xs font-bold cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      다음 차수 (T{currentProject.trials.length + 1}) 검사등록
                    </Button>
                  </div>
                </div>

                {/* 4) 안내 배너 (요구사항 4번: 양산처는 시사출결과 안보고 최종 결과만 공유) */}
                <div className="p-2.5 rounded bg-sky-50/80 border border-sky-200 text-sky-900 text-[11px] flex items-center gap-2">
                  <Info className="h-4 w-4 text-sky-600 shrink-0" />
                  <span>
                    <b>공정 분리 원칙:</b> 금형처의 시사출 및 육성 과정은 양산처에 미공유되며, 최종 5대 승인 서류 및 최종 시사출 샘플만 금형 이관(양산처) 시 공유됩니다.
                  </span>
                </div>

                {/* T1 ~ Tn 탭 네비게이션 + [금형 이관 (5대 서류)] 탭 (완성률 삭제 반영: 2-5, 2-10) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                        시사출/육성 진행 회차 (T1~Tn) 및 최종 금형 이관
                      </span>
                      {/* 2-1) 시사출 계획(일정)표 등록 아이콘 */}
                      <Button
                        onClick={() => setIsPlanModalOpen(true)}
                        size="xs"
                        variant="outline"
                        className="h-6 px-2 text-[10px] gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50 cursor-pointer font-bold"
                      >
                        <Calendar className="h-3 w-3 text-emerald-600" />
                        시사출 계획(일정)표 등록
                      </Button>
                    </div>
                    <span className="text-[10px] text-zinc-400">계획 대비 실적관리</span>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {currentProject.trials.map((tr) => {
                      const isActive = tr.trialDegree === selectedTrialDegree;
                      const isPass = tr.status.includes("Pass");

                      return (
                        <button
                          key={tr.trialDegree}
                          onClick={() => setSelectedTrialDegree(tr.trialDegree)}
                          className={`flex flex-col items-center min-w-[95px] p-2 rounded-lg border transition-all cursor-pointer ${
                            isActive
                              ? "border-sky-600 bg-sky-50 dark:bg-sky-950/60 shadow-xs ring-1 ring-sky-500"
                              : "border-zinc-200 bg-zinc-50/80 hover:bg-zinc-100 dark:bg-zinc-800 dark:border-zinc-700"
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <span className="font-bold font-mono text-xs">{tr.trialDegree}</span>
                            {isPass ? (
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <XCircle className="h-3 w-3 text-rose-500" />
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-400 font-mono mt-0.5">{tr.trialDate}</span>
                          {/* 2-5 완성율 삭제: 완성률 텍스트 미표시 */}
                          <span className={`text-[10px] font-bold mt-0.5 ${isPass ? "text-emerald-700" : "text-amber-700"}`}>
                            {tr.status.split(" ")[0]}
                          </span>
                        </button>
                      );
                    })}

                    {/* [금형 이관 (5대 필수 서류)] 탭 */}
                    {(() => {
                      const verifiedCount = currentProject.finalDocuments.filter(d => Boolean(d.fileName) && d.isVerified).length;
                      const isSelected = selectedTrialDegree === "TRANSFER";
                      return (
                        <button
                          onClick={() => setSelectedTrialDegree("TRANSFER")}
                          className={`flex flex-col items-center min-w-[130px] p-2 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? "border-amber-500 bg-amber-50 dark:bg-amber-950/60 shadow-xs ring-2 ring-amber-400"
                              : verifiedCount === 5
                              ? "border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100"
                              : "border-amber-200 bg-amber-50/50 hover:bg-amber-100/60"
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-xs text-amber-900 dark:text-amber-200">금형 이관</span>
                            {verifiedCount === 5 ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono mt-0.5">5대 필수 서류</span>
                          {/* 2-10 완성율 삭제: 건수 표기 */}
                          <span className={`text-[10px] font-bold mt-0.5 ${verifiedCount === 5 ? "text-emerald-700" : "text-amber-700"}`}>
                            {verifiedCount}/5건 승인
                          </span>
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* [분기 1] 금형 이관 (5대 필수 서류) 탭 (4번째 스크린샷 반영) */}
              {selectedTrialDegree === "TRANSFER" ? (
                <div className="bg-white dark:bg-zinc-900 border rounded-xl p-4 shadow-xs flex flex-col gap-4">
                  {/* 상단 이관 헤더 및 계획일/실적일 (2-8, 2-9) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-500 text-white font-bold text-xs">
                          공정 9~10 금형 육성 완료 & 금형 이관 승인
                        </span>
                        <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                          [{currentProject.projectNo}] {currentProject.productName}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-1">
                        금형제작처: <b className="text-zinc-800 dark:text-zinc-200">{currentProject.moldVendor}</b> ➔ 사출양산처: <b className="text-emerald-700">{currentProject.massVendor}</b>
                      </div>
                    </div>

                    {/* 2-8) 금형 이관 계획일, 2-9) 금형 이관 완료일(실적일) 입력 */}
                    <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 p-2 rounded-lg border text-[11px]">
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-500 font-medium">이관 계획일:</span>
                        <Input
                          type="date"
                          value={transferPlanDate}
                          onChange={(e) => setTransferPlanDate(e.target.value)}
                          className="h-6 w-28 text-[11px]"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-500 font-medium">이관 완료일(실적):</span>
                        <Input
                          type="date"
                          value={transferActualDate}
                          onChange={(e) => setTransferActualDate(e.target.value)}
                          className="h-6 w-28 text-[11px]"
                        />
                      </div>
                      <Button
                        onClick={handleSaveTransferDates}
                        size="xs"
                        className="h-6 px-2 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold cursor-pointer"
                      >
                        저장
                      </Button>
                    </div>
                  </div>

                  {/* 5대 서류 목록 (2-11 반려 / 2-12 승인 버튼) */}
                  <div className="border rounded-lg divide-y divide-zinc-200 dark:divide-zinc-800 overflow-hidden">
                    {currentProject.finalDocuments.map((doc, idx) => {
                      const isUploaded = Boolean(doc.fileName);
                      return (
                        <div 
                          key={doc.key} 
                          className={`p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                            !isUploaded 
                              ? "bg-rose-50/20 dark:bg-rose-950/10" 
                              : doc.isVerified 
                              ? "bg-emerald-50/20 dark:bg-emerald-950/10" 
                              : doc.isRejected
                              ? "bg-rose-50/30"
                              : "bg-white dark:bg-zinc-900"
                          }`}
                        >
                          <div className="flex items-start gap-3 flex-1">
                            <span className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-mono font-bold text-xs shrink-0 text-zinc-600">
                              {idx + 1}
                            </span>
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                                  {doc.label}
                                </span>
                                {isUploaded ? (
                                  doc.isVerified ? (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">승인완료</span>
                                  ) : doc.isRejected ? (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800">반려(보완요청)</span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">검토대기</span>
                                  )
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800">미등록 (필수)</span>
                                )}
                              </div>
                              <span className="text-[11px] text-zinc-500">{doc.description}</span>

                              {isUploaded && (
                                <div className="flex items-center gap-2 mt-1">
                                  <button
                                    onClick={() => handleDownloadFile(doc.fileName, doc.fileUrl)}
                                    className="font-mono text-[11px] text-sky-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <FileText className="h-3 w-3" />
                                    {doc.fileName} ({doc.fileSize || "첨부파일"})
                                    <Download className="h-3 w-3" />
                                  </button>
                                  <span className="text-[10px] text-zinc-400">· {doc.uploadedAt} ({doc.uploadedBy || "금형처"})</span>
                                </div>
                              )}
                              {doc.isRejected && doc.rejectReason && (
                                <div className="text-[10px] text-rose-600 font-medium mt-0.5">
                                  반려 사유: {doc.rejectReason}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 2-11) 반려, 2-12) 승인 버튼 */}
                          <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0">
                            {isUploaded ? (
                              <>
                                <Button
                                  onClick={() => handleRejectDoc(doc.key)}
                                  size="xs"
                                  variant="outline"
                                  className={`h-7 px-3 text-xs font-bold border-rose-300 text-rose-700 hover:bg-rose-50 cursor-pointer ${
                                    doc.isRejected ? "bg-rose-100" : ""
                                  }`}
                                >
                                  반려
                                </Button>
                                <Button
                                  onClick={() => handleApproveDoc(doc.key)}
                                  size="xs"
                                  className={`h-7 px-3 text-xs font-bold text-white cursor-pointer ${
                                    doc.isVerified ? "bg-emerald-700" : "bg-emerald-600 hover:bg-emerald-700"
                                  }`}
                                >
                                  승인
                                </Button>
                              </>
                            ) : (
                              <span className="text-[10px] text-zinc-400">금형처 서류 업로드 대기</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 2-13) 업무 이력 메모 타임라인 */}
                  <div className="border border-indigo-200 dark:border-indigo-900/60 rounded-xl p-3.5 bg-indigo-50/20 dark:bg-indigo-950/10 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 text-xs flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
                        업무 이력 메모 (서류 업로드 및 검토 이력)
                      </span>
                      <span className="text-[10px] text-zinc-400">등록 회사명, 시간 표기</span>
                    </div>

                    <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto">
                      {currentProject.memoLogs.length === 0 ? (
                        <div className="p-3 text-center text-zinc-400 bg-white rounded border text-xs">
                          등록된 업무 이력 메모가 없습니다.
                        </div>
                      ) : (
                        currentProject.memoLogs.map((m) => (
                          <div key={m.id} className="p-2 rounded border bg-white dark:bg-zinc-900 text-xs flex flex-col gap-0.5 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-bold text-[9px]">
                                  {m.tag}
                                </span>
                                <b className="text-zinc-800 dark:text-zinc-200">{cleanCompanyAuthor(m.authorName, m.company)}</b>
                              </div>
                              <span className="text-[10px] text-zinc-400 font-mono">{m.createdAt}</span>
                            </div>
                            <p className="text-[11px] text-zinc-600 dark:text-zinc-300 pl-1">{m.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* [분기 2] T1 ~ Tn 차수별 검사 결과 및 4대 영역 보고서 (2번째 스크린샷 반영) */
                <div className="bg-white dark:bg-zinc-900 border rounded-xl p-4 shadow-xs flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-white font-mono font-bold text-xs">
                        {activeTrial.trialDegree} 검사 결과서
                      </span>
                      <span className="text-zinc-500 text-[11px]">시사출일: {activeTrial.trialDate}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-500 text-[11px]">검사원:</span>
                        <span className="h-6 px-2 text-[11px] font-semibold flex items-center border rounded bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {activeTrial.inspector || "우성정공 기술팀"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-zinc-600">진행 상태:</span>
                      <span className="px-2 py-0.5 rounded font-bold text-xs bg-amber-100 text-amber-800 border border-amber-300">
                        {activeTrial.status}
                      </span>
                    </div>
                  </div>

                  {/* 4대 검사 영역 제목 수정 (스크린샷 2 반영) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* 1. 치수검토보고서 (구 치수 만족도) */}
                    <div className="border rounded-lg p-3 bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">1. 치수검토보고서</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setActiveDimResult("OK")}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${activeDimResult === "OK" ? "bg-emerald-600 text-white" : "bg-white text-zinc-600"}`}
                          >
                            OK
                          </button>
                          <button
                            onClick={() => setActiveDimResult("NG")}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${activeDimResult === "NG" ? "bg-rose-600 text-white" : "bg-white text-zinc-600"}`}
                          >
                            NG
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-2 rounded border text-[11px]">
                        <span className={`truncate flex-1 font-mono ${activeDimReport?.fileName ? "text-zinc-700 dark:text-zinc-300 font-bold" : "text-zinc-400 italic"}`}>
                          {activeDimReport?.fileName || "치수검토보고서 미등록"}
                        </span>
                        {activeDimReport?.fileName && (
                          <Button 
                            size="xs" 
                            variant="outline" 
                            onClick={() => handleDownloadFile(activeDimReport.fileName, activeDimReport.fileUrl)}
                            className="h-6 text-[10px] shrink-0 gap-1 cursor-pointer"
                          >
                            <Download className="h-3 w-3" />
                            다운로드
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* 2. 외관검토보고서 (구 외관 만족도) */}
                    <div className="border rounded-lg p-3 bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">2. 외관검토보고서</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setActiveAppResult("OK")}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${activeAppResult === "OK" ? "bg-emerald-600 text-white" : "bg-white text-zinc-600"}`}
                          >
                            OK
                          </button>
                          <button
                            onClick={() => setActiveAppResult("NG")}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${activeAppResult === "NG" ? "bg-rose-600 text-white" : "bg-white text-zinc-600"}`}
                          >
                            NG
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-2 rounded border text-[11px]">
                        <span className={`truncate flex-1 font-mono ${activeAppReport?.fileName ? "text-zinc-700 dark:text-zinc-300 font-bold" : "text-zinc-400 italic"}`}>
                          {activeAppReport?.fileName || "외관검토보고서 미등록"}
                        </span>
                        {activeAppReport?.fileName && (
                          <Button 
                            size="xs" 
                            variant="outline" 
                            onClick={() => handleDownloadFile(activeAppReport.fileName, activeAppReport.fileUrl)}
                            className="h-6 text-[10px] shrink-0 gap-1 cursor-pointer"
                          >
                            <Download className="h-3 w-3" />
                            다운로드
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* 3. 금형검사보고서 (구 금형사양검사) */}
                    <div className="border rounded-lg p-3 bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">3. 금형검사보고서</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setActiveSpecResult("OK")}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${activeSpecResult === "OK" ? "bg-emerald-600 text-white" : "bg-white text-zinc-600"}`}
                          >
                            OK
                          </button>
                          <button
                            onClick={() => setActiveSpecResult("NG")}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${activeSpecResult === "NG" ? "bg-rose-600 text-white" : "bg-white text-zinc-600"}`}
                          >
                            NG
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-2 rounded border text-[11px]">
                        <span className={`truncate flex-1 font-mono ${activeSpecReport?.fileName ? "text-zinc-700 dark:text-zinc-300 font-bold" : "text-zinc-400 italic"}`}>
                          {activeSpecReport?.fileName || "금형검사보고서 미등록"}
                        </span>
                        {activeSpecReport?.fileName && (
                          <Button 
                            size="xs" 
                            variant="outline" 
                            onClick={() => handleDownloadFile(activeSpecReport.fileName, activeSpecReport.fileUrl)}
                            className="h-6 text-[10px] shrink-0 gap-1 cursor-pointer"
                          >
                            <Download className="h-3 w-3" />
                            다운로드
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* 4. 양산성 만족도(목표 C/T) 및 조건표 파일 표시 (2-3) */}
                    <div className="border rounded-lg p-3 bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">4. 양산성 만족도(목표 C/T)</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          activeCycleTime <= activeTrial.targetCycleTime 
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-amber-100 text-amber-800 border border-amber-300"
                        }`}>
                          {activeCycleTime <= activeTrial.targetCycleTime ? "목표 충족 (OK)" : "목표 초과"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-2 rounded border text-[11px] gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-500">실측 C/T:</span>
                          <b className="font-mono font-bold text-xs text-sky-700">{activeCycleTime}초</b>
                          <span className="text-zinc-400">(목표: {activeTrial.targetCycleTime}초)</span>
                        </div>
                        {/* 2-3) 조건표 등록 시 파일 표시 */}
                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                            activeCondReport?.fileName
                              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                              : "text-zinc-400 bg-zinc-50 border-zinc-200"
                          }`}>
                            {activeCondReport?.fileName || "사출조건표 미등록"}
                          </span>
                          {activeCondReport?.fileName && (
                            <Button 
                              size="xs" 
                              variant="outline" 
                              onClick={() => handleDownloadFile(activeCondReport.fileName, activeCondReport.fileUrl)}
                              className="h-6 text-[10px] gap-0.5 cursor-pointer"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 차수별 문제점 트러블슈팅 체크리스트 (MPSI 본사 관제 - 조회 전용 / 수정 불가) */}
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 bg-white dark:bg-zinc-800/60 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-purple-600" />
                        <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                          {activeTrial.trialDegree} 차수 문제점 트러블슈팅 체크리스트
                        </h4>
                        <span className="text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-medium border border-zinc-200 dark:border-zinc-700">
                          조회 전용 (금형처 등록)
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                        조치 완료: {(activeTrial.checklist || []).filter(c => c.isResolved).length} / {(activeTrial.checklist || []).length}건
                      </div>
                    </div>

                    {/* 체크 항목 리스트 (Read-only) */}
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {(!activeTrial.checklist || activeTrial.checklist.length === 0) ? (
                        <div className="p-3 text-center text-zinc-400 text-[11px] bg-zinc-50 dark:bg-zinc-900/40 rounded border border-dashed">
                          등록된 트러블슈팅 체크 항목이 없습니다.
                        </div>
                      ) : (
                        activeTrial.checklist.map((item) => (
                          <div
                            key={item.id}
                            className={`p-2 rounded border flex items-center justify-between transition-colors ${
                              item.isResolved
                                ? "bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800"
                                : "bg-zinc-50 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 flex-1 mr-2">
                              <input
                                type="checkbox"
                                checked={item.isResolved}
                                disabled
                                readOnly
                                className="h-4 w-4 text-purple-600 rounded cursor-not-allowed opacity-80"
                              />
                              <div>
                                <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] mr-1.5 font-medium ${
                                  item.category === "치수 만족도" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" :
                                  item.category === "외관 만족도" ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" :
                                  item.category === "금형사양검사" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" : 
                                  "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                }`}>
                                  {item.category}
                                </span>
                                <span className={`text-[11px] ${item.isResolved ? "line-through text-zinc-400" : "text-zinc-800 dark:text-zinc-200 font-medium"}`}>
                                  {item.description}
                                </span>
                              </div>
                            </div>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                              item.isResolved ? "bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-100" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                            }`}>
                              {item.isResolved ? "조치완료" : "미조치"}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 금형처 현장 종합 소견 및 개선 방향 (MPSI 본사 관제 - 조회 전용 / 수정 불가) */}
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 bg-white dark:bg-zinc-800/60 shadow-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-zinc-500" />
                        현장 종합 소견 및 개선 방향
                        <span className="text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded font-normal border border-zinc-200 dark:border-zinc-700">
                          금형처 입력 (조회 전용)
                        </span>
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        작성자: {activeTrial.inspector || currentProject.moldVendor}
                      </span>
                    </div>
                    <div className="w-full text-xs p-2.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 min-h-[48px] whitespace-pre-wrap leading-relaxed">
                      {activeTrial.opinion ? (
                        activeTrial.opinion
                      ) : (
                        <span className="text-zinc-400 italic">금형처에서 등록된 현장 종합 소견이 없습니다.</span>
                      )}
                    </div>
                  </div>

                  {/* 2-4) 업무 이력 메모 */}
                  <div className="border border-indigo-200 dark:border-indigo-900/60 rounded-xl p-3.5 bg-indigo-50/20 dark:bg-indigo-950/10 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 text-xs flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
                        업무 이력 메모
                      </span>
                      <span className="text-[10px] text-zinc-400">시사출/육성 특이사항 누적</span>
                    </div>

                    <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto">
                      {currentProject.memoLogs.map((m) => (
                        <div key={m.id} className="p-2 rounded border bg-white dark:bg-zinc-900 text-xs flex flex-col gap-0.5 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-bold text-[9px]">
                                {m.tag}
                              </span>
                              <b className="text-zinc-800 dark:text-zinc-200">{cleanCompanyAuthor(m.authorName, m.company)}</b>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono">{m.createdAt}</span>
                          </div>
                          <p className="text-[11px] text-zinc-600 dark:text-zinc-300 pl-1">{m.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* MPSI 종합 판정 소견 & 액션 버튼 (2-6) */}
                  <div className="flex flex-col gap-2 pt-2 border-t">
                    <label className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                      MPSI 기술품질팀 종합 판정 소견
                    </label>
                    <textarea
                      rows={2}
                      value={mpsiDecisionOpinion}
                      onChange={(e) => setMpsiDecisionOpinion(e.target.value)}
                      className="w-full rounded-md border p-2 text-xs bg-white dark:bg-zinc-900"
                      placeholder="검사 소견 및 승인/미승인 결정 사유를 입력하세요."
                    />

                    {/* 2-6) 시사출 결과 승인/미승인 결정 버튼 */}
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button
                        onClick={() => handleMpsiDecision("미승인(수정요청)")}
                        variant="outline"
                        className="h-8 px-4 text-xs text-rose-700 border-rose-300 hover:bg-rose-50 font-bold cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        금형 수정 요청 (미승인)
                      </Button>
                      <Button
                        onClick={() => handleMpsiDecision("승인")}
                        className="h-8 px-4 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 cursor-pointer shadow-xs"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        시사출 결과 승인 (Pass)
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-between px-5 py-3 bg-zinc-50 dark:bg-zinc-800 border-t">
              <span className="text-zinc-400 text-[11px]">
                * MPSI 시사출 육성 및 5대 승인서류 검증 관리
              </span>
              <Button onClick={() => setIsDetailModalOpen(false)} variant="outline" className="h-8 px-4 text-xs font-medium cursor-pointer">
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. 시사출 계획(일정)표 등록 모달 (2-1) */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-xl shadow-2xl border p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-emerald-600" />
                시사출 계획(일정)표 등록
              </h3>
              <button onClick={() => setIsPlanModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-3 text-xs">
              <div>
                <span className="text-zinc-500 block mb-1">대상 프로젝트:</span>
                <b className="font-mono">{currentProject.projectNo} ({currentProject.productName})</b>
              </div>
              <div>
                <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1">
                  시사출 계획일자 지정:
                </label>
                <Input
                  type="date"
                  value={tempPlanDate}
                  onChange={(e) => setTempPlanDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button onClick={() => setIsPlanModalOpen(false)} variant="outline" size="xs" className="h-7 px-3">
                취소
              </Button>
              <Button
                onClick={() => {
                  if (tempPlanDate) {
                    addMemoLog(currentProject.id, {
                      authorId: "mpsi-mgr",
                      authorName: "MPSI",
                      company: "MPSI",
                      tag: "시사출계획",
                      content: `시사출 계획일 등록 완료 (${tempPlanDate})`,
                    });
                    alert(`시사출 계획일(${tempPlanDate})이 등록되었습니다.`);
                  }
                  setIsPlanModalOpen(false);
                }}
                size="xs"
                className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                등록 완료
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. [모달 3] 신규 차수 ($T_{n+1}$) 등록 모달 (3번째 스크린샷 반영: 시사출결과 등록) */}
      {isNewTrialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-xl shadow-2xl border overflow-hidden flex flex-col my-8">
            <div className="flex items-center justify-between px-5 py-3 bg-sky-900 text-white">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-xs">
                  [{currentProject.projectNo}] 시사출결과 등록 (T{currentProject.trials.length + 1})
                </h3>
              </div>
              <button onClick={() => setIsNewTrialModalOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-zinc-50 dark:bg-zinc-800 p-2.5 rounded border text-[11px]">
                <div><span className="text-zinc-500">진행 프로젝트:</span> <b>{currentProject.productName}</b></div>
                <div><span className="text-zinc-500">금형제작처:</span> <b>{currentProject.moldVendor}</b></div>
              </div>

              {/* 4대 검사 판정 및 보고서 등록 */}
              <div className="border rounded-md p-3 flex flex-col gap-2.5">
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  4대 검사 판정 및 보고서 등록:
                </span>
                
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center justify-between p-2 rounded border bg-zinc-50 dark:bg-zinc-800">
                    <span>1. 치수 만족도</span>
                    <button
                      type="button"
                      onClick={() => setNewDimRes(newDimRes === "OK" ? "NG" : "OK")}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer ${newDimRes === "OK" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}
                    >
                      {newDimRes}
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded border bg-zinc-50 dark:bg-zinc-800">
                    <span>2. 외관 만족도</span>
                    <button
                      type="button"
                      onClick={() => setNewAppRes(newAppRes === "OK" ? "NG" : "OK")}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer ${newAppRes === "OK" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}
                    >
                      {newAppRes}
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded border bg-zinc-50 dark:bg-zinc-800">
                    <span>3. 금형사양검사</span>
                    <button
                      type="button"
                      onClick={() => setNewSpecRes(newSpecRes === "OK" ? "NG" : "OK")}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer ${newSpecRes === "OK" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}
                    >
                      {newSpecRes}
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded border bg-zinc-50 dark:bg-zinc-800">
                    <span>4. 실측 C/T:</span>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={newCycleTime}
                        onChange={(e) => setNewCycleTime(Number(e.target.value))}
                        className="h-6 w-14 text-center font-mono font-bold text-xs"
                      />
                      <span>초</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 검사 소견 */}
              <div>
                <label className="block text-zinc-600 mb-1 font-bold text-[11px]">
                  차수 종합 검사원 소견
                </label>
                <textarea
                  rows={2}
                  value={newOpinion}
                  onChange={(e) => setNewOpinion(e.target.value)}
                  className="w-full rounded-md border p-2 text-xs bg-white dark:bg-zinc-900"
                  placeholder="금형 판정 결과 및 개선 지시사항을 입력하세요."
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-3 bg-zinc-50 dark:bg-zinc-800 border-t">
              <Button onClick={() => setIsNewTrialModalOpen(false)} variant="outline" className="h-8 px-3 text-xs cursor-pointer">
                취소
              </Button>
              <Button
                onClick={handleSaveNewTrial}
                className="h-8 px-4 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold gap-1 cursor-pointer shadow-xs"
              >
                <Save className="h-3.5 w-3.5" />
                시사출 결과 등록 완료
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 6. [모달 2] 0~13단계 상세 공정 관제 모달 */}
      {isDiagramModalOpen && diagramItem && (() => {
        const curProject: ProjectItem = modalSelectedItem || masterProjects.find(p => p.projectNo === diagramItem.projectNo) || {
          id: diagramItem.id,
          projectNo: diagramItem.projectNo,
          customerName: diagramItem.customerName || "원청 고객사",
          projectName: diagramItem.projectName,
          productName: diagramItem.productName,
          partNo: "4890",
          moldNo: `${diagramItem.projectNo.split("-")[0]}M`,
          cavity: diagramItem.cavity || "1*2 Cavity",
          material: diagramItem.material || "NAK80",
          moldProductionType: diagramItem.moldVendor.includes("자체") ? "IN_HOUSE" : "OUTSOURCING",
          moldVendor: diagramItem.moldVendor,
          massProductionType: "OUTSOURCING",
          massVendor: diagramItem.massVendor,
          currentStep: diagramItem.currentStep,
          stepStatus: diagramItem.isMoldApproved ? "완료" : "진행중",
          trialDegree: diagramItem.currentTrial,
          trialCompletionRate: diagramItem.isMoldApproved ? 100 : 80,
          facilityEvent: "가동대기",
          orderQty: 10000,
          deliveredQty: 0,
          targetT1Date: diagramItem.targetT1Date || "2026-09-30",
          targetMassDate: "2026-11-30",
          updatedAt: diagramItem.updatedAt,
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-[95vw] 2xl:max-w-[1580px] rounded-xl shadow-2xl border overflow-hidden flex flex-col max-h-[94vh]">
              {/* 모달 상단 헤더 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 bg-[#1e293b] text-white border-b border-slate-700 gap-3">
                <div className="flex items-center gap-2.5">
                  <ListTree className="h-5 w-5 text-sky-400" />
                  <div>
                    <h3 className="font-bold text-sm">
                      프로젝트 0~13단계 상세 공정 관제
                    </h3>
                    <span className="text-[11px] text-slate-300">
                      [{curProject.projectNo}] {curProject.projectName} - {curProject.productName} ({curProject.customerName})
                    </span>
                  </div>
                </div>

                <button onClick={() => setIsDiagramModalOpen(false)} className="text-zinc-400 hover:text-white ml-2 cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* 모달 본문 */}
              <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs bg-zinc-50/50 dark:bg-zinc-900/40">
                {/* 대상 프로젝트 선택 */}
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
                          [{p.projectNo}] {p.projectName} - {p.productName} ({p.customerName || "고객사"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-[11px] shrink-0">현재 상태:</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStepStatusBadge(curProject.stepStatus)}`}>
                        Step {curProject.currentStep} : {PROCESS_13_STEPS.find((s) => s.step === curProject.currentStep)?.name || "금형개발"} ({curProject.stepStatus})
                      </span>
                    </div>
                  </div>
                </div>

                {/* 13단계 개별 카드 타임라인 그리드 */}
                <div className="flex flex-col gap-3 border rounded-xl p-4 bg-white dark:bg-zinc-900">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-sky-600" />
                      0~13단계 세부 공정 타임라인 (클릭 시 해당 화면으로 이동)
                    </h4>
                    <span className="text-[11px] text-zinc-500">
                      각 카드의 <b className="text-sky-600">[화면이동]</b>을 클릭하면 해당 실무 화면으로 직행합니다.
                    </span>
                  </div>

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
                              ? "bg-sky-50/80 border-sky-400 dark:bg-sky-950/40 shadow-xs ring-1 ring-sky-400"
                              : isCompleted
                              ? "bg-emerald-50/40 border-emerald-300 dark:bg-emerald-950/20"
                              : "bg-zinc-50/50 border-zinc-200 dark:bg-zinc-800/30 opacity-70"
                          }`}
                        >
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                                isCurrent
                                  ? "bg-sky-600 text-white"
                                  : isCompleted
                                  ? "bg-emerald-600 text-white"
                                  : "bg-zinc-300 text-zinc-700"
                              }`}>
                                Step {item.step}
                              </span>
                              <span className="text-[10px] text-zinc-400 truncate max-w-[70px]">
                                {dynamicActor}
                              </span>
                            </div>

                            <b className="text-zinc-900 dark:text-zinc-100 text-xs truncate" title={item.name}>
                              {item.name}
                            </b>

                            <p className="text-[10px] text-zinc-500 line-clamp-2">
                              {item.desc}
                            </p>
                          </div>

                          <div className="mt-2 pt-2 border-t flex items-center justify-between">
                            <span className={`text-[9px] font-bold ${
                              isCurrent ? "text-sky-600" : isCompleted ? "text-emerald-600" : "text-zinc-400"
                            }`}>
                              {isCurrent ? "진행 중" : isCompleted ? "완료" : "대기"}
                            </span>

                            <button
                              onClick={() => handleNavigateToStepPage(item.step, curProject.projectNo)}
                              className="text-[10px] text-sky-600 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                            >
                              화면이동
                              <ExternalLink className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 모달 하단 푸터 */}
              <div className="flex items-center justify-between px-5 py-3 bg-zinc-50 dark:bg-zinc-800 border-t">
                <span className="text-zinc-500 text-[11px]">
                  * MPSI 본사 SCM 종합 프로세스 관제 시스템
                </span>
                <Button onClick={() => setIsDiagramModalOpen(false)} variant="outline" className="h-8 px-4 text-xs cursor-pointer">
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
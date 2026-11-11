"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Factory, Gauge, Wrench, CheckCircle2, Clock, 
  AlertTriangle, Search, RefreshCw, Save, 
  Sparkles, X, ChevronRight, Layers, FileText,
  Building2, ExternalLink, Download, UploadCloud,
  Check, Activity, ListTree, Settings, Info,
  Plus, CheckSquare, ShieldCheck, Award, Eye, ArrowRight,
  FileSpreadsheet, Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DateRangeFilter, isWithinDateRange, DatePresetType } from "@/components/common/date-range-filter";
import { 
  useProjectMaster, 
  PROCESS_13_STEPS, 
  getStepActor, 
  getStepBullets, 
  ProjectItem 
} from "@/lib/project-store";
import { useAuthRole } from "@/lib/role-store";
import { sendAppNotification } from "@/lib/notification-store";
import { 
  useMassValidationStore, 
  MassValidationProject, 
  MassValidationRecord, 
  ValidationCheckItem, 
  ValidationUploadMemoHistory,
  UrgentMoldRevisionDetail 
} from "@/lib/mass-validation-store";

export default function VendorMassValidationPage() {
  const { 
    validations: projects, 
    updateValidationProject,
    refreshFromDb,
    isLoading
  } = useMassValidationStore();
  const { projects: masterProjects, updateStep } = useProjectMaster();
  const { vendorName } = useAuthRole();
  const currentVendor = vendorName || "(주)뉴몰드";

  // 마운트 시 DB 데이터 자동 동기화
  useEffect(() => {
    refreshFromDb();
  }, [refreshFromDb]);

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

  // 검색 및 필터 상태
  const [filterProjectNo, setFilterProjectNo] = useState("");
  const [filterProductName, setFilterProductName] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDateType, setFilterDateType] = useState<"targetMassApprovalDate" | "testDate">("targetMassApprovalDate");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePresetType>("all");

  // 토스트 메시지
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 실적 입력 모달 상태
  const [selectedProject, setSelectedProject] = useState<MassValidationProject | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("T1");

  // 편집 중인 프로젝트 임시 복사본
  const [editingTrials, setEditingTrials] = useState<MassValidationRecord[]>([]);
  const [editingOverallStatus, setEditingOverallStatus] = useState<MassValidationProject["overallStatus"]>("검증 대기");
  const [editingUrgentRevision, setEditingUrgentRevision] = useState<UrgentMoldRevisionDetail | undefined>(undefined);

  // 긴급 금형수정 작성 여부 토글
  const [showUrgentForm, setShowUrgentForm] = useState(false);

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

  // 13단계 프로세스 상세 공정 모달
  const [diagramItem, setDiagramItem] = useState<MassValidationProject | null>(null);
  const [isDiagramModalOpen, setIsDiagramModalOpen] = useState(false);
  const [modalSelectedItem, setModalSelectedItem] = useState<ProjectItem | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  // 1-6) 프로젝트 관리번호 포맷 헬퍼 (수주 시 MI26001P0 형식)
  const getProjectNoDisplay = (project: MassValidationProject) => {
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

  // 7) 업로드 파일 수 계산 (X/6)
  const getReportCount = (record?: MassValidationRecord) => {
    if (!record || !record.checklist) return 0;
    return record.checklist.filter((item) => Boolean(item.attachedReport)).length;
  };

  // 1-3, 7) 양산성 검증 상태 판정 (6대 보고서 완비 및 Cpk 기준치 충족 시에만 검증완료)
  const getValidationStatus = (record?: MassValidationRecord): "검증완료" | "검증 대기" | "검증 진행 중" => {
    if (!record) return "검증 대기";
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

  // 외주사 전용 프로젝트 필터링
  const vendorProjects = projects.filter((item) => {
    if (item.projectNo.startsWith("Q") && !item.projectNo.startsWith("Q26")) return false;
    const isMatched = item.massVendor.includes(currentVendor) || 
                      currentVendor.includes(item.massVendor) ||
                      item.massVendor.includes("뉴몰드");
    return isMatched;
  });

  // 검색 필터 적용
  const filteredData = vendorProjects.filter((item) => {
    const projNo = getProjectNoDisplay(item).toLowerCase();
    const matchProject = filterProjectNo
      ? item.projectNo.toLowerCase().includes(filterProjectNo.toLowerCase()) ||
        projNo.includes(filterProjectNo.toLowerCase())
      : true;
    const matchProd = filterProductName
      ? item.productName.toLowerCase().includes(filterProductName.toLowerCase()) ||
        item.projectName.toLowerCase().includes(filterProductName.toLowerCase())
      : true;
    
    const latestTrial = item.trials[item.trials.length - 1];
    const currentValidationStatus = item.overallStatus || getValidationStatus(latestTrial);
    const matchStatus = filterStatus !== "ALL"
      ? (currentValidationStatus === filterStatus)
      : true;
    const targetDate = filterDateType === "testDate"
      ? latestTrial?.testDate || ""
      : item.targetMassApprovalDate || (item.updatedAt || "").slice(0, 10);
    const matchDate = isWithinDateRange(targetDate, filterDateFrom, filterDateTo);
    return matchProject && matchProd && matchStatus && matchDate;
  });

  const handleReset = () => {
    setFilterProjectNo("");
    setFilterProductName("");
    setFilterStatus("ALL");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSelectedDatePreset("all");
  };

  // 실적 입력 모달 열기
  const handleOpenDetail = (project: MassValidationProject) => {
    setSelectedProject(project);
    setEditingTrials(JSON.parse(JSON.stringify(project.trials)));
    const latestTrial = project.trials[project.trials.length - 1];
    setEditingOverallStatus(project.overallStatus || getValidationStatus(latestTrial) || "검증 대기");
    setEditingUrgentRevision(
      project.urgentRevisionDetail ? JSON.parse(JSON.stringify(project.urgentRevisionDetail)) : undefined
    );
    setShowUrgentForm(false);
    setActiveTab(project.currentTrial || latestTrial?.trialDegree || "T1");
    setIsDetailModalOpen(true);
  };

  // 현재 탭의 TrialRecord
  const currentRecordIndex = editingTrials.findIndex((t) => t.trialDegree === activeTab);
  const currentRecord = currentRecordIndex >= 0 ? editingTrials[currentRecordIndex] : null;

  // 차수 필드 업데이트 헬퍼
  const updateCurrentRecord = (updates: Partial<MassValidationRecord>) => {
    if (currentRecordIndex < 0) return;
    setEditingTrials((prev) => {
      const next = [...prev];
      const target = { ...next[currentRecordIndex], ...updates };
      
      // 불량률 자동 계산
      if (target.totalProduced > 0 && target.defectCount !== undefined) {
        target.defectRate = Number(((target.defectCount / target.totalProduced) * 100).toFixed(2));
      }

      // 체크리스트 해결율 기반 completionRate 재계산
      if (target.checklist && target.checklist.length > 0) {
        const resolved = target.checklist.filter((c) => c.isResolved).length;
        target.completionRate = Math.round((resolved / target.checklist.length) * 100);
      }

      next[currentRecordIndex] = target;
      return next;
    });
  };

  // 체크리스트 적합/부적합 판정 권한은 MPSI 본사 전용 (협력사 임의 조작 방지)
  const handleToggleCheck = (checkId: string) => {
    alert("항목별 최종 적합/부적합 판정(체크박스)은 MPSI 본사 기술품질팀 검증 전용 권한입니다.\n외주사는 실측치 입력 및 성적서 첨부 후 제출하시면 MPSI에서 최종 검토 및 판정을 진행합니다.");
  };

  // 체크리스트 실측치 수정 (2-5 말풍선: 결과가 기준 충족 시 보조 메모 없어도 됨)
  const handleUpdateCheckActual = (checkId: string, val: string) => {
    if (!currentRecord) return;
    const updatedList = currentRecord.checklist.map((c) =>
      c.id === checkId ? { ...c, actualValue: val } : c
    );
    updateCurrentRecord({ checklist: updatedList });
  };

  // 2-6 성적서 업로드 모달 열기
  const handleOpenUploadModal = (checkId: string, category: string, currentFile?: string, currentFileUrl?: string) => {
    setUploadModalItem({
      checkId,
      category,
      currentFile,
      currentFileUrl,
    });
    setUploadForm({
      fileName: currentFile || "",
      fileSize: currentFile ? "첨부 완료" : "",
      fileUrl: currentFileUrl || "",
      memo: "",
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        ? `${(file.size / 1024).toFixed(1)} KB` 
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

      setUploadForm((prev) => ({
        ...prev,
        fileName: file.name,
        fileSize: sizeStr,
        fileUrl: uploadedUrl || `/uploads/${encodeURIComponent(file.name)}`,
      }));
    }
  };

  // 2-6 성적서 및 메모 등록 (영구 보존 처리)
  const handleSaveUploadWithMemo = () => {
    if (!uploadModalItem || !currentRecord) return;
    if (!uploadForm.fileName) {
      alert("성적서/보고서 파일을 선택해주세요.");
      return;
    }
    if (!uploadForm.memo.trim()) {
      alert("파일 업로드 시 업무 이력 메모를 입력해주세요.");
      return;
    }

    const today = new Date();
    const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")} ${String(today.getHours()).padStart(2, "0")}:${String(today.getMinutes()).padStart(2, "0")}`;
    const authorName = currentVendor;

    // 1. 체크리스트 항목 업데이트
    const updatedList = currentRecord.checklist.map((c) =>
      c.id === uploadModalItem.checkId
        ? {
            ...c,
            attachedReport: uploadForm.fileName,
            attachedReportSize: uploadForm.fileSize || "첨부 완료",
            attachedReportUrl: uploadForm.fileUrl,
            uploadMemo: uploadForm.memo,
            uploadAuthor: authorName,
            uploadedAt: dateStr,
            isResolved: c.isResolved,
          }
        : c
    );

    // 2. 메모 이력(uploadHistory)에 새 레코드 추가
    const newHistoryItem: ValidationUploadMemoHistory = {
      id: Date.now().toString(),
      category: uploadModalItem.category,
      fileName: uploadForm.fileName,
      fileSize: uploadForm.fileSize || "첨부 완료",
      fileUrl: uploadForm.fileUrl,
      memo: uploadForm.memo,
      author: authorName,
      uploadedAt: dateStr,
    };
    const prevHistory = currentRecord.uploadHistory || [];
    const updatedHistory = [newHistoryItem, ...prevHistory];

    const resolved = updatedList.filter((c) => c.isResolved).length;
    const rate = Math.round((resolved / updatedList.length) * 100);

    updateCurrentRecord({
      checklist: updatedList,
      completionRate: rate,
      uploadHistory: updatedHistory,
    });

    // MPSI 본사에 알림 전송 (DB 연동)
    const pNo = selectedProject ? getProjectNoDisplay(selectedProject) : "MI26001P0";
    sendAppNotification({
      menuName: "양산성 검증/시양산",
      menuPath: "/portal/mass-prod/validation",
      senderCompany: currentVendor,
      content: `[${pNo} 시양산 검증] ${currentVendor}에서 [${uploadModalItem.category}] 성적서 및 업무 메모를 등록하였습니다: "${uploadForm.memo}"`,
      projectNo: selectedProject?.projectNo || pNo,
      targetRole: "MPSI",
    });

    setUploadModalItem(null);
    showToast(`[${uploadModalItem.category}] 성적서 및 업무 이력 메모가 성공적으로 등록되었습니다. 기존 파일은 대체되었으며 메모는 관리 이력으로 보존됩니다.`);
  };

  // 신규 차수($T_{n+1}$) 추가 (이전 차수 실적 데이터 자동 계승 및 바인딩)
  const handleAddNewDegree = () => {
    let maxDegreeNum = 0;
    editingTrials.forEach((t) => {
      const match = t.trialDegree.match(/T(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxDegreeNum) maxDegreeNum = num;
      }
    });
    const nextNum = maxDegreeNum > 0 ? maxDegreeNum + 1 : editingTrials.length + 1;
    const nextDegree = `T${nextNum}`;
    const today = new Date().toISOString().split("T")[0];
    const prev = editingTrials.find((t) => t.trialDegree === activeTab) || currentRecord || editingTrials[editingTrials.length - 1];

    const newRec: MassValidationRecord = {
      trialDegree: nextDegree,
      testDate: prev?.testDate || today,
      machineNo: prev ? prev.machineNo : "사출 3호기 (450T)",
      continuousHours: prev ? prev.continuousHours : 12,
      totalShotCount: prev ? prev.totalShotCount : 0,
      totalProduced: prev ? prev.totalProduced : 0,
      defectCount: prev ? prev.defectCount : 0,
      defectRate: prev ? prev.defectRate : 0,
      targetDefectRate: prev?.targetDefectRate ?? 1.0,
      measuredCpk: prev ? prev.measuredCpk : 1.33,
      targetCpk: prev?.targetCpk ?? 1.33,
      measuredCycleTime: prev ? (prev.measuredCycleTime ?? prev.targetCycleTime ?? 35.0) : 35.0,
      targetCycleTime: prev?.targetCycleTime ?? 35.0,
      dailyCapa: prev ? prev.dailyCapa : 0,
      targetDailyCapa: prev?.targetDailyCapa ?? 4500,
      completionRate: prev ? prev.completionRate : 0,
      status: prev ? prev.status : "시양산 진행중",
      checklist: (prev && prev.checklist && prev.checklist.length > 0)
        ? prev.checklist.map((c) => ({
            ...c,
            id: `${c.id.split("_")[0]}_${nextDegree}`,
          }))
        : [
            { id: `v1_${nextDegree}`, category: "치수검토보고서", description: "CTQ 주요 치수 5개 포인트 전수 측정", targetSpec: "±0.05mm", actualValue: "", isResolved: false },
            { id: `v2_${nextDegree}`, category: "외관검토보고서", description: "웰드라인, 수축, 가스자국 등 외관 품질", targetSpec: "외관 한도견본 기준 합격", actualValue: "", isResolved: false },
            { id: `v3_${nextDegree}`, category: "금형검사보고서", description: "파팅라인 일치도, 슬라이드 코어 작동 상태", targetSpec: "유격 0.02mm 이내 작동 원활", actualValue: "", isResolved: false },
            { id: `v4_${nextDegree}`, category: "시사출 보고서(사출조건표 포함)", description: "수지온도, 사출압력, 보압 4단 최적 튜닝 조건", targetSpec: "최적 레시피 조건 도출", actualValue: "", isResolved: false },
            { id: `v5_${nextDegree}`, category: "공정능력 검사 보고서", description: "연속 300Shot 연속 추출 Cpk 산출 보고서", targetSpec: "Cpk >= 1.33 충족", actualValue: "", isResolved: false },
            { id: `v6_${nextDegree}`, category: "CAPA 검토 보고서", description: "일일 3교대 가동 기준 납품 캐파 충족 여부", targetSpec: "일 4,500EA 생산 가능", actualValue: "", isResolved: false },
          ],
      opinion: prev?.opinion || `${nextDegree} 12시간 연속 사출 가동 및 Cpk 안정화 검증 진행`,
      uploadHistory: prev?.uploadHistory ? [...prev.uploadHistory] : [],
    };

    if (newRec.totalProduced > 0 && newRec.defectCount !== undefined) {
      newRec.defectRate = Number(((newRec.defectCount / newRec.totalProduced) * 100).toFixed(2));
    }

    if (newRec.checklist && newRec.checklist.length > 0) {
      const resolved = newRec.checklist.filter((c) => c.isResolved).length;
      newRec.completionRate = Math.round((resolved / newRec.checklist.length) * 100);
    }

    setEditingTrials((prevList) => [...prevList, newRec]);
    setActiveTab(nextDegree);
    showToast(`신규 ${nextDegree} 시양산 검증 차수가 생성되었습니다. 이전 차수(${prev?.trialDegree || "T1"}) 실적 및 성적서 데이터가 연동되었습니다.`);
  };

  // 2-7) 양산 검증 자료 제출 처리
  const handleSaveModal = async () => {
    if (!selectedProject) return;

    const latestTrial = editingTrials[editingTrials.length - 1] || editingTrials[0];
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const reportCount = getReportCount(latestTrial);
    const finalOverallStatus = editingOverallStatus || getValidationStatus(latestTrial);

    // 1. MassValidationStore 및 DB 업데이트
    updateValidationProject(selectedProject.id, {
      trials: editingTrials,
      currentTrial: activeTab || latestTrial.trialDegree,
      overallStatus: finalOverallStatus,
      urgentRevisionDetail: editingUrgentRevision,
      urgentMoldRevision: editingUrgentRevision 
        ? `${selectedProject.moldVendor} 긴급 출장지원 요청 접수 (${editingUrgentRevision.defectType})`
        : undefined,
      updatedAt: dateStr,
    });

    // 2. ProjectMaster 스토어 동기화
    updateStep(selectedProject.projectNo, {
      currentStep: 11, // Step 11: 양산승인사출
      stepStatus: finalOverallStatus === "검증완료" ? "완료" : "진행중",
      notes: `[${currentVendor}] ${activeTab || latestTrial.trialDegree} 시양산 및 양산성 검증 자료 제출 (상태: ${finalOverallStatus}, 보고서 ${reportCount}/6, Cpk ${latestTrial.measuredCpk}, 불량률 ${latestTrial.defectRate}%) - MPSI 검토 진행`,
    });

    // 3. 상태 변경 및 실적 제출 알림 전송 (MPSI 본사로 전송)
    const isStatusChanged = selectedProject.overallStatus !== finalOverallStatus;
    const pNo = getProjectNoDisplay(selectedProject);
    const notifyContent = isStatusChanged
      ? `[${pNo} 시양산 검증] ${currentVendor}에서 전체 프로젝트 상태를 [${selectedProject.overallStatus || "검증 대기"} ➔ ${finalOverallStatus}]로 변경 제출하였습니다.`
      : `[${pNo} 시양산 검증] ${currentVendor}에서 ${activeTab || latestTrial.trialDegree} 실적 및 검증 자료를 제출하였습니다. (상태: ${finalOverallStatus}, 불량률: ${latestTrial.defectRate}%, Cpk: ${latestTrial.measuredCpk})`;

    sendAppNotification({
      menuName: "양산성 검증/시양산",
      menuPath: "/portal/mass-prod/validation",
      senderCompany: currentVendor,
      content: notifyContent,
      projectNo: selectedProject.projectNo,
      targetRole: "MPSI",
    });

    setIsDetailModalOpen(false);
    showToast(`[${pNo}] 시양산 및 양산성 검증 실적이 성공적으로 제출되었습니다. (상태: ${finalOverallStatus})`);
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 토스트 알림 */}
      {toastMessage && (
        <div className="fixed top-4 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-xl bg-emerald-700 text-white text-xs font-medium animate-in fade-in">
          <Sparkles className="h-4 w-4" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-80 cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 1-1) 헤더 배너: 양산성 검증/시양산으로 변경 */}
      <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-xs">
            <Factory className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-emerald-950 dark:text-emerald-100">
                [{currentVendor}] 양산성 검증 / 시양산 실적 등록
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                사출양산 포털 (Step 11)
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
              사출기 취부 후 12~24H 연속 사출 가동 실적(타수/수량/불량률), Cpk 및 양산성 검증 6대 보고서/성적서를 등록합니다. 제출 후 MPSI 본사 승인이 진행됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 영역 */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 shadow-xs flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 font-medium">프로젝트 관리번호:</span>
          <div className="relative">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              value={filterProjectNo}
              onChange={(e) => setFilterProjectNo(e.target.value)}
              placeholder="예: MI26001P0"
              className="pl-7 h-7 text-xs w-36 font-mono font-bold"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 font-medium">제품명/차종:</span>
          <Input
            value={filterProductName}
            onChange={(e) => setFilterProductName(e.target.value)}
            placeholder="예: Front Door, 콘솔"
            className="h-7 text-xs w-36"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 font-medium">검증상태:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-7 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 font-semibold"
          >
            <option value="ALL">전체 상태</option>
            <option value="검증완료">검증완료</option>
            <option value="검증 대기">검증 대기</option>
            <option value="검증 진행 중">검증 진행 중</option>
          </select>
        </div>

        {/* 날짜 필터 */}
        <div className="flex items-center gap-1.5 border-l border-zinc-200 dark:border-zinc-700 pl-2">
          <select
            value={filterDateType}
            onChange={(e) => setFilterDateType(e.target.value as any)}
            className="h-7 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 font-medium"
          >
            <option value="targetMassApprovalDate">양산승인 납기일</option>
            <option value="testDate">시양산일자</option>
          </select>
          <DateRangeFilter
            startDate={filterDateFrom}
            endDate={filterDateTo}
            onChange={(start, end) => {
              setFilterDateFrom(start);
              setFilterDateTo(end);
            }}
            selectedPreset={selectedDatePreset}
            onPresetChange={setSelectedDatePreset}
          />
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshFromDb()}
            disabled={isLoading}
            className="h-7 px-2.5 text-xs text-emerald-700 dark:text-emerald-300 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer font-semibold gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
            DB 동기화
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-7 px-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            초기화
          </Button>
        </div>
      </div>

      {/* 1. 관리 메뉴 변경: 데이터 그리드 (전체 너비 다크 네이비 테이블) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1e293b] text-white text-[11px] font-semibold border-b border-zinc-700 whitespace-nowrap">
                <th className="py-2.5 px-3 text-center w-10">No</th>
                {/* 1-6) 프로젝트관리 번호 */}
                <th className="py-2.5 px-3 min-w-[110px]">프로젝트 관리번호</th>
                <th className="py-2.5 px-3 min-w-[140px]">프로젝트명 / 차종</th>
                <th className="py-2.5 px-3 min-w-[150px]">제품명</th>
                <th className="py-2.5 px-3 text-center min-w-[95px]">금형 제작처</th>
                <th className="py-2.5 px-3 text-center min-w-[65px]">현재 차수</th>
                {/* 1-2) 시양산 결과 보고 (6/6, 대기, 3/6) */}
                <th className="py-2.5 px-3 text-center min-w-[105px]">시양산 결과 보고</th>
                {/* 1-3) 양산성 검증상태 (검증완료, 검증 대기, 검증 진행 중) */}
                <th className="py-2.5 px-3 text-center min-w-[100px]">양산성 검증상태</th>
                {/* 1-4) 최종 갱신일 삭제하고 대신 양산 승인 납기일 기입 */}
                <th className="py-2.5 px-3 text-center min-w-[110px]">양산 승인 납기일</th>
                {/* 1-5) 검증 완성율, 공정 10-1(긴급수정), 최종 갱신일은 삭제됨 */}
                <th className="py-2.5 px-3 text-center min-w-[95px]">실적 등록/수정</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-[11px]">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-zinc-400">
                    배정된 시양산 검증 대상 프로젝트가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredData.map((project, idx) => {
                  const latestTrial = project.trials[project.trials.length - 1];
                  const projectNoDisplay = getProjectNoDisplay(project);
                  const reportCount = getReportCount(latestTrial);
                  const validationStatus = getValidationStatus(latestTrial);

                  return (
                    <tr 
                      key={project.id}
                      className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center text-zinc-400 font-mono">
                        {idx + 1}
                      </td>

                      {/* 1-6) 프로젝트 관리번호 (수주 시 MI26001P0 형식) */}
                      <td className="py-2.5 px-3 font-bold text-purple-700 dark:text-purple-300 font-mono whitespace-nowrap">
                        <span>{projectNoDisplay}</span>
                      </td>

                      <td className="py-2.5 px-3 font-medium text-zinc-800 dark:text-zinc-200">
                        {project.projectName}
                      </td>

                      <td className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300 font-medium">
                        {project.productName}
                      </td>

                      {/* 금형 제작처 */}
                      <td className="py-2.5 px-3 text-center text-zinc-600 dark:text-zinc-400 font-medium whitespace-nowrap">
                        {project.moldVendor}
                      </td>

                      {/* 현재 차수 */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                          {project.currentTrial}
                        </span>
                      </td>

                      {/* 1-2) 시양산 결과 보고 (6/6, 대기, 3/6) */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {renderReportCountBadge(reportCount)}
                      </td>

                      {/* 1-3) 양산성 검증상태 (검증완료, 검증 대기, 검증 진행 중) */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {renderValidationStatusBadge(project.overallStatus || validationStatus)}
                      </td>

                      {/* 1-4) 양산 승인 납기일 */}
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-purple-700 dark:text-purple-300 whitespace-nowrap">
                        {project.targetMassApprovalDate || "2026-08-30"}
                      </td>

                      {/* 실적 등록/수정 버튼 */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <Button
                          size="sm"
                          onClick={() => handleOpenDetail(project)}
                          className="h-6 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs cursor-pointer"
                        >
                          <Save className="h-3 w-3 mr-1" />
                          실적 등록/수정
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
      {/* 2. 실적 등록: 시양산 및 양산성 검증 실적 등록 모달                               */}
      {/* ========================================================================= */}
      {isDetailModalOpen && selectedProject && currentRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-5xl my-6 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95">
            {/* 2-8) 실적 등록 메뉴 제목 변경 및 프로젝트 관리 번호 변경 */}
            <div className="bg-[#1e293b] text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-emerald-600 text-white">
                  <Factory className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-emerald-300 font-bold text-sm">
                      {getProjectNoDisplay(selectedProject)}
                    </span>
                    <h3 className="font-bold text-sm text-white">
                      시양산 및 양산성 검증 실적 등록
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                      {currentVendor}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-[11px] mt-0.5">
                    차종: {selectedProject.projectName} | 제품명: {selectedProject.productName} | 금형제작처: {selectedProject.moldVendor}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 2-1) T1 차수 정보에서 CPK 및 완성율 삭제 & 2-2) 금형이관일 및 양산승인 납기일 표기 */}
            <div className="bg-zinc-100 dark:bg-zinc-800/80 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {editingTrials.map((tr) => (
                  <button
                    key={tr.trialDegree}
                    onClick={() => setActiveTab(tr.trialDegree)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === tr.trialDegree
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {/* 2-1) CPK 및 완성율 삭제됨: 순수 차수명만 표기 */}
                    <span>{tr.trialDegree} 차수 실적</span>
                  </button>
                ))}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddNewDegree}
                  className="h-7 px-2 text-xs bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300 border-dashed border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                  title="새로운 시양산 차수(T+1)를 추가합니다"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  차수 추가
                </Button>
              </div>

              {/* 2-2) 금형이관일 및 양산승인 납기일 표기 */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 px-2.5 py-1 rounded text-xs shadow-2xs">
                  <span className="text-amber-800 dark:text-amber-300 font-bold">금형이관일:</span>
                  <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                    {selectedProject.moldTransferDate || "2026-08-10"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800 px-2.5 py-1 rounded text-xs shadow-2xs">
                  <span className="text-purple-800 dark:text-purple-300 font-bold">양산승인 납기일:</span>
                  <span className="font-mono font-bold text-purple-900 dark:text-purple-200">
                    {selectedProject.targetMassApprovalDate || "2026-08-30"}
                  </span>
                </div>
              </div>
            </div>

            {/* 모달 본문 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* 4) 금형처 시사출 결과 공유 안내 바 (금형인수인계 확인 여부 연동) */}
              <div className={`border p-2.5 rounded-lg flex items-center justify-between text-xs ${
                selectedProject.moldTransferConfirmed
                  ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900 text-blue-950 dark:text-blue-200"
                  : "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-950 dark:text-amber-200"
              }`}>
                <div className="flex items-center gap-2">
                  <ShieldCheck className={`h-4 w-4 shrink-0 ${selectedProject.moldTransferConfirmed ? "text-blue-600" : "text-amber-600"}`} />
                  <span>
                    <b>금형처 이관 결과 공유</b>: {selectedProject.moldTransferConfirmed 
                      ? `금형처(${selectedProject.moldVendor})의 5대 승인서류 및 최종 시사출 샘플이 금형 이관 시 인계 완료되었습니다.`
                      : `금형처(${selectedProject.moldVendor})로부터 금형 인수인계 및 서류 접수 대기 중입니다.`}
                  </span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold shrink-0 ${
                  selectedProject.moldTransferConfirmed
                    ? "text-blue-700 bg-blue-100 dark:bg-blue-900/60"
                    : "text-amber-700 bg-amber-100 dark:bg-amber-900/60"
                }`}>
                  {selectedProject.moldTransferConfirmed ? "금형 인수인계 확인됨" : "인수인계 확인 대기"}
                </span>
              </div>

              {/* 기본 가동 조건 입력 바 */}
              <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-zinc-500 font-medium text-[11px] block mb-1">
                    시양산 일자
                  </span>
                  <Input
                    type="date"
                    value={currentRecord.testDate}
                    onChange={(e) => updateCurrentRecord({ testDate: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div>
                  <span className="text-zinc-500 font-medium text-[11px] block mb-1">
                    사출기 호기 및 사양
                  </span>
                  <Input
                    value={currentRecord.machineNo}
                    onChange={(e) => updateCurrentRecord({ machineNo: e.target.value })}
                    placeholder="예: 사출 3호기 (450T)"
                    className="h-8 text-xs"
                  />
                </div>

                <div>
                  <span className="text-zinc-500 font-medium text-[11px] block mb-1">
                    연속 가동 시간 (시간)
                  </span>
                  <Input
                    type="number"
                    value={currentRecord.continuousHours}
                    onChange={(e) => updateCurrentRecord({ continuousHours: Number(e.target.value) || 0 })}
                    className="h-8 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <span className="text-zinc-500 font-medium text-[11px] block mb-1">
                    전체 프로젝트 상태
                  </span>
                  <select
                    value={editingOverallStatus}
                    onChange={(e) => setEditingOverallStatus(e.target.value as any)}
                    className="h-8 text-xs w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 font-bold text-emerald-700 dark:text-emerald-300"
                  >
                    <option value="검증 대기">검증 대기</option>
                    <option value="검증 진행 중">검증 진행 중</option>
                    <option value="검증완료">검증완료</option>
                  </select>
                </div>
              </div>

              {/* 2-4) 시양산 불량률 입력, 실적 / 목표 관리 패널 */}
              <div className="bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Gauge className="h-4 w-4 text-emerald-600" />
                    연속 가동 생산 실적 및 불량률 (실적 / 목표 관리)
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] text-zinc-500">불량률 판정:</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      currentRecord.defectRate <= (currentRecord.targetDefectRate ?? 1.0)
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}>
                      {currentRecord.defectRate <= (currentRecord.targetDefectRate ?? 1.0) ? "목표 달성 (양호)" : "목표 초과 (관리요망)"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <span className="text-[11px] text-zinc-500 block mb-1">총 사출 타수 (Shot)</span>
                    <CurrencyInput
                      value={currentRecord.totalShotCount}
                      onChange={(val) => updateCurrentRecord({ totalShotCount: val })}
                      placeholder="0"
                      className="h-8 text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] text-zinc-500 block mb-1">총 생산 수량 (EA)</span>
                    <CurrencyInput
                      value={currentRecord.totalProduced}
                      onChange={(val) => updateCurrentRecord({ totalProduced: val })}
                      placeholder="0"
                      className="h-8 text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] text-zinc-500 block mb-1">불량 수량 (EA)</span>
                    <CurrencyInput
                      value={currentRecord.defectCount}
                      onChange={(val) => updateCurrentRecord({ defectCount: val })}
                      placeholder="0"
                      className="h-8 text-xs font-mono font-bold text-rose-600"
                    />
                  </div>

                  {/* 2-4) 시양산 목표 불량률 (%) */}
                  <div>
                    <span className="text-[11px] text-amber-700 dark:text-amber-300 font-bold block mb-1 flex items-center justify-between">
                      <span>목표 불량률 (%)</span>
                      <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded">목표치</span>
                    </span>
                    <Input
                      type="number"
                      step="0.1"
                      value={currentRecord.targetDefectRate ?? 1.0}
                      onChange={(e) => updateCurrentRecord({ targetDefectRate: Number(e.target.value) || 0 })}
                      className="h-8 text-xs font-mono font-bold bg-amber-50/50 text-amber-900 border-amber-200"
                    />
                  </div>

                  {/* 2-4) 시양산 실적 불량률 (%) */}
                  <div>
                    <span className="text-[11px] text-zinc-700 dark:text-zinc-300 font-bold block mb-1 flex items-center justify-between">
                      <span>실적 불량률 (%)</span>
                      <span className="text-[9px] bg-zinc-100 text-zinc-600 px-1 rounded">실적치</span>
                    </span>
                    <div className="h-8 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex items-center px-3 font-mono font-bold text-xs text-rose-600 justify-between">
                      <span>{currentRecord.defectRate}%</span>
                      <span className="text-[10px] text-zinc-400 font-normal">
                        ({currentRecord.defectCount.toLocaleString()}/{currentRecord.totalProduced.toLocaleString()}EA)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2-3) 3대 관리 기준 입력 가능 및 실측치 (Cpk, C/T, CAPA) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. CPK 검증 (2-3 관리기준 입력 가능) */}
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 bg-white dark:bg-zinc-800/60 shadow-xs flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                      1. 공정능력지수 (Cpk)
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      currentRecord.measuredCpk >= (currentRecord.targetCpk ?? 1.33) ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    }`}>
                      {currentRecord.measuredCpk >= (currentRecord.targetCpk ?? 1.33) ? `Pass (≥${currentRecord.targetCpk ?? 1.33})` : `Fail (<${currentRecord.targetCpk ?? 1.33})`}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t">
                    <div>
                      <span className="text-[10.5px] text-zinc-500 block mb-1">
                        관리기준 Cpk <span className="text-[9px] text-purple-600">(입력가능)</span>
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        value={currentRecord.targetCpk ?? 1.33}
                        onChange={(e) => updateCurrentRecord({ targetCpk: Number(e.target.value) || 0 })}
                        className="h-7 text-xs font-mono font-bold bg-purple-50/50 text-purple-800 border-purple-200"
                      />
                    </div>
                    <div>
                      <span className="text-[10.5px] text-zinc-500 block mb-1">실측 Cpk</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={currentRecord.measuredCpk}
                        onChange={(e) => updateCurrentRecord({ measuredCpk: Number(e.target.value) || 0 })}
                        className="h-7 text-xs font-mono font-bold text-emerald-600"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. C/T 양산성 (2-3 관리기준 입력 가능) */}
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 bg-white dark:bg-zinc-800/60 shadow-xs flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                      2. 사이클타임 (C/T)
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      currentRecord.measuredCycleTime <= (currentRecord.targetCycleTime ?? 35.0) ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {currentRecord.measuredCycleTime <= (currentRecord.targetCycleTime ?? 35.0) ? "목표 달성" : "C/T 지연"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t">
                    <div>
                      <span className="text-[10.5px] text-zinc-500 block mb-1">
                        목표 C/T (초) <span className="text-[9px] text-purple-600">(입력가능)</span>
                      </span>
                      <Input
                        type="number"
                        step="0.1"
                        value={currentRecord.targetCycleTime ?? 35.0}
                        onChange={(e) => updateCurrentRecord({ targetCycleTime: Number(e.target.value) || 0 })}
                        className="h-7 text-xs font-mono font-bold bg-purple-50/50 text-purple-800 border-purple-200"
                      />
                    </div>
                    <div>
                      <span className="text-[10.5px] text-zinc-500 block mb-1">실측 C/T (초)</span>
                      <Input
                        type="number"
                        step="0.1"
                        value={currentRecord.measuredCycleTime}
                        onChange={(e) => updateCurrentRecord({ measuredCycleTime: Number(e.target.value) || 0 })}
                        className="h-7 text-xs font-mono font-bold text-zinc-800"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. CAPA 공급능력 (2-3 관리기준 입력 가능) */}
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 bg-white dark:bg-zinc-800/60 shadow-xs flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                      3. 일일 생산 캐파 (CAPA)
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      currentRecord.dailyCapa >= (currentRecord.targetDailyCapa ?? 4500) ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {currentRecord.dailyCapa >= (currentRecord.targetDailyCapa ?? 4500) ? "캐파 충족" : "캐파 부족"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t">
                    <div>
                      <span className="text-[10.5px] text-zinc-500 block mb-1">
                        요구 캐파 (EA/일) <span className="text-[9px] text-purple-600">(입력가능)</span>
                      </span>
                      <CurrencyInput
                        value={currentRecord.targetDailyCapa ?? 4500}
                        onChange={(val) => updateCurrentRecord({ targetDailyCapa: val })}
                        placeholder="4,500"
                        className="h-7 text-xs font-mono font-bold bg-purple-50/50 text-purple-800 border-purple-200"
                      />
                    </div>
                    <div>
                      <span className="text-[10.5px] text-zinc-500 block mb-1">실제 캐파 (EA/일)</span>
                      <CurrencyInput
                        value={currentRecord.dailyCapa}
                        onChange={(val) => updateCurrentRecord({ dailyCapa: val })}
                        placeholder="0"
                        className="h-7 text-xs font-mono font-bold text-sky-700"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2-5) 양산성 검증 6대 항목 제목 수정 & 2-6 성적서 첨부 및 업무 이력 메모 */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 bg-white dark:bg-zinc-800/60 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <CheckSquare className="h-4 w-4 text-emerald-600" />
                    <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                      양산성 검증 6대 항목 실측 데이터 및 성적서 첨부
                    </span>
                    <span className="text-[10px] text-zinc-400 font-normal">
                      (※ 항목 적합 판정 체크는 MPSI 본사 기술품질팀 검증 전용 권한입니다)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-500">
                      성적서 첨부 현황:
                    </span>
                    {renderReportCountBadge(getReportCount(currentRecord))}
                  </div>
                </div>

                <div className="border border-zinc-200 dark:border-zinc-700 rounded divide-y divide-zinc-200 dark:divide-zinc-700 overflow-hidden">
                  {currentRecord.checklist.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2.5 flex-1">
                        <input
                          type="checkbox"
                          checked={item.isResolved}
                          disabled={true}
                          readOnly={true}
                          onClick={() => handleToggleCheck(item.id)}
                          title="MPSI 본사 기술품질팀 검증 판정 전용 (외주사 체크 불가)"
                          className="rounded border-zinc-300 text-emerald-600 h-4 w-4 opacity-70 cursor-not-allowed"
                        />
                        {/* 2-5) 6대 항목 제목 표기 */}
                        <span className="px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 shrink-0">
                          {item.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* 2-5 말풍선: 결과가 기준 충족 시 보조 메모 없어도 됨 */}
                        <Input
                          value={item.actualValue}
                          onChange={(e) => handleUpdateCheckActual(item.id, e.target.value)}
                          placeholder="실측치 입력"
                          className="h-6 w-36 text-[11px] font-mono"
                        />

                        {item.attachedReport ? (
                          <button
                            type="button"
                            onClick={() => handleDownloadFile(item.attachedReport, item.attachedReportUrl)}
                            className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-mono max-w-[130px] truncate hover:underline cursor-pointer"
                            title={item.attachedReport}
                          >
                            <FileText className="h-3 w-3 shrink-0" />
                            <span className="truncate">{item.attachedReport}</span>
                            <Download className="h-2.5 w-2.5 shrink-0" />
                          </button>
                        ) : null}

                        {/* 2-6 성적서 첨부 및 메모 등록 모달 호출 버튼 */}
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleOpenUploadModal(item.id, item.category, item.attachedReport, item.attachedReportUrl)}
                          className="h-6 px-2 text-[10px] gap-1 cursor-pointer border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                        >
                          <UploadCloud className="h-3 w-3" />
                          {item.attachedReport ? "재첨부" : "성적서 첨부"}
                        </Button>

                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          item.isResolved 
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300" 
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                        }`}>
                          {item.isResolved ? "✓ MPSI 적합 승인" : "MPSI 판정 대기"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 2-6 누적 관리 이력 리스트 */}
                {currentRecord.uploadHistory && currentRecord.uploadHistory.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-center justify-between pb-1.5 mb-2">
                      <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-emerald-600" />
                        성적서 파일 업로드 및 업무 이력 메모 ({currentRecord.uploadHistory.length}건 보존 중)
                      </span>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                        과거 제출 이력
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {currentRecord.uploadHistory.map((hist) => (
                        <div key={hist.id} className="p-2 rounded bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs shadow-2xs">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                {hist.category}
                              </span>
                              <span className="font-bold text-zinc-800 dark:text-zinc-200">{hist.author}</span>
                              <span className="text-zinc-400 font-mono text-[10px]">{hist.uploadedAt}</span>
                            </div>
                            <span className="text-[10.5px] text-zinc-500 font-mono flex items-center gap-1">
                              {hist.fileName}
                              {hist.fileName && (
                                <button
                                  type="button"
                                  onClick={() => handleDownloadFile(hist.fileName, hist.fileUrl)}
                                  className="text-emerald-700 dark:text-emerald-300 hover:underline inline-flex items-center gap-0.5 font-normal cursor-pointer"
                                >
                                  <Download className="h-2.5 w-2.5" />
                                  다운로드
                                </button>
                              )}
                            </span>
                          </div>
                          <div className="bg-white dark:bg-zinc-900 p-1.5 rounded text-zinc-700 dark:text-zinc-300 text-[11px] whitespace-pre-wrap">
                            {hist.memo}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 종합 사출기술 소견 작성 */}
              <div>
                <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 block mb-1">
                  사출기술팀 현장 종합 가동 소견
                </span>
                <textarea
                  value={currentRecord.opinion}
                  onChange={(e) => updateCurrentRecord({ opinion: e.target.value })}
                  placeholder="12시간 연속 사출 안정화 상태 및 성형 조건 튜닝 내역을 상세히 입력하세요."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* 2-7) 모달 푸터: 양산 검증 자료 제출 버튼 (빨간색 버튼) */}
            <div className="bg-zinc-100 dark:bg-zinc-800/80 p-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div className="text-[11px] text-zinc-500">
                * 제출 시 등록된 시양산 실적 및 성적서는 MPSI 본사로 즉시 전달되어 최종 판정이 진행됩니다.
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="h-8 px-3 text-xs cursor-pointer"
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveModal}
                  className="h-8 px-4 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  양산 검증 자료 제출
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2-6 성적서 파일 첨부 및 업무 이력 메모 입력 모달 */}
      {uploadModalItem && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="bg-[#1e293b] text-white p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="h-4 w-4 text-emerald-400" />
                <span className="font-bold text-sm">
                  [{uploadModalItem.category}] 성적서 첨부 및 업무 이력 메모
                </span>
              </div>
              <button 
                onClick={() => setUploadModalItem(null)} 
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-2.5 rounded border text-[11px] text-zinc-600 dark:text-zinc-300">
                · 검증 보고서 항목: <b className="text-emerald-700 dark:text-emerald-300">{uploadModalItem.category}</b>
              </div>

              {/* 파일 선택 */}
              <div>
                <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1">
                  검증 성적서 / 보고서 파일 (.pdf, .xlsx, .jpg) <span className="text-red-500">*</span>
                </label>
                <div className="border border-dashed rounded-md p-2.5 bg-white dark:bg-zinc-800 flex items-center justify-between">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.xlsx,.xls,.jpg,.png"
                  />
                  {uploadForm.fileName ? (
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                      <div className="truncate">
                        <span className="font-bold text-zinc-800 dark:text-zinc-200 text-xs block truncate">
                          {uploadForm.fileName}
                        </span>
                        <span className="text-[10px] text-zinc-400">{uploadForm.fileSize || "첨부 완료"}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-zinc-400 text-xs">파일을 선택해주세요</span>
                  )}
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    size="xs"
                    variant="outline"
                    className="h-7 text-xs gap-1 border-emerald-600 text-emerald-700 shrink-0 cursor-pointer hover:bg-emerald-50"
                  >
                    <UploadCloud className="h-3.5 w-3.5" />
                    파일 선택
                  </Button>
                </div>
              </div>

              {/* 업무 이력 메모 입력 (2-6) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-zinc-700 dark:text-zinc-300 font-bold">
                    업무 이력 메모 (제출 사유 및 특기사항) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded font-bold">
                    관리 이력
                  </span>
                </div>
                <textarea
                  value={uploadForm.memo}
                  onChange={(e) => setUploadForm({ ...uploadForm, memo: e.target.value })}
                  rows={3}
                  placeholder="예: 261010_치수검토보고서 등록 (CTQ 치수 허용공차 이내 만족 초도 첨부)..."
                  className="w-full text-xs p-2 rounded border bg-white dark:bg-zinc-800"
                />
              </div>

              {/* 안내 배너 (2-6) */}
              <div className="p-2.5 rounded bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-[10.5px] text-zinc-600 dark:text-zinc-300 flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  ※ <b>파일 교체 및 메모 보존</b>: 파일 수정 시 기존 파일은 자동 교체(기존 파일 삭제)되지만, 제출 당시의 메모·등록회사명·시간은 <b>관리 이력으로 보존</b>됩니다.
                </span>
              </div>
            </div>

            <div className="bg-zinc-100 dark:bg-zinc-800 p-3 border-t flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUploadModalItem(null)}
                className="h-7 text-xs cursor-pointer"
              >
                취소
              </Button>
              <Button
                size="sm"
                onClick={handleSaveUploadWithMemo}
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                성적서 및 메모 등록
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

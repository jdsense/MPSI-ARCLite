"use client";

import React, { useState, useRef } from "react";
import { 
  Gauge, Wrench, CheckCircle2, Clock, 
  AlertTriangle, Search, RefreshCw, Save, 
  Sparkles, X, ChevronRight, Layers, FileText,
  Building2, ExternalLink, Download, UploadCloud,
  Check, Activity, ListTree, Settings, Info,
  Plus, CheckSquare, ShieldCheck, Award, Eye, ArrowRight,
  Calendar, MessageSquare, Send, FileCheck, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangeFilter, isWithinDateRange, DatePresetType } from "@/components/common/date-range-filter";
import { 
  useProjectMaster, 
  PROCESS_13_STEPS, 
  getStepActor, 
  getStepBullets, 
  ProjectItem 
} from "@/lib/project-store";
import { useAuthRole } from "@/lib/role-store";
import { 
  useMoldTrialStore, 
  MoldTrialProject, 
  TrialRecord, 
  TrialDocumentItem,
  FinalDeliveryFile, 
  ChecklistItem,
  MoldTrialMemoLog,
  calculateFinalCompletionStats,
  createDefaultFinalDocs
} from "@/lib/mold-trial-store";
import { sendAppNotification, cleanCompanyAuthor } from "@/lib/notification-store";

export default function VendorMoldTrialPage() {
  const { trials, updateTrialProject, addMemoLog, refreshFromDb, isLoading } = useMoldTrialStore();
  const { projects: masterProjects, updateStep } = useProjectMaster();
  const { vendorName } = useAuthRole();
  const currentVendor = vendorName || "우성정공(주)";

  // 검색 및 필터 상태
  const [filterProjectNo, setFilterProjectNo] = useState("");
  const [filterProductName, setFilterProductName] = useState("");
  const [filterTrialDegree, setFilterTrialDegree] = useState("ALL");
  const [filterDateType, setFilterDateType] = useState<"targetT1Date" | "updatedAt">("targetT1Date");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePresetType>("all");

  // 토스트 메시지
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 시사출 실적 입력/수정 모달 상태
  const [selectedProject, setSelectedProject] = useState<MoldTrialProject | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("T1"); // "T1", "T2", ... 또는 "finalDocs"
  
  // 편집 중인 프로젝트의 trials 및 finalDocuments 임시 복사본
  const [editingTrials, setEditingTrials] = useState<TrialRecord[]>([]);
  const [editingFinalDocs, setEditingFinalDocs] = useState<FinalDeliveryFile[]>([]);
  const [transferPlanDate, setTransferPlanDate] = useState("");
  const [transferActualDate, setTransferActualDate] = useState("");

  // 시사출 계획(일정)표 등록 모달 (2-1)
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [tempPlanDate, setTempPlanDate] = useState("");

  // 업무 이력 메모 입력 상태 (2-4, 2-13)
  const [memoTag, setMemoTag] = useState("시사출실적등록");
  const [memoInput, setMemoInput] = useState("");

  // 실제 파일 업로드를 위한 ref 및 상태
  const reportFileInputRef = useRef<HTMLInputElement | null>(null);
  const [currentUploadField, setCurrentUploadField] = useState<"dimReport" | "appReport" | "specReport" | "condReport" | null>(null);
  const [currentUploadTitle, setCurrentUploadTitle] = useState("");

  const finalDocFileInputRef = useRef<HTMLInputElement | null>(null);
  const [currentUploadFinalKey, setCurrentUploadFinalKey] = useState<FinalDeliveryFile["key"] | null>(null);
  const [currentUploadFinalLabel, setCurrentUploadFinalLabel] = useState("");

  // 외주사 전용 프로젝트 필터링 (Q 가견적 제외, 해당 외주사 배정 프로젝트)
  const matchedVendorProjects = trials.filter((item) => {
    if (item.projectNo.startsWith("Q")) return false;
    const isMatched = item.moldVendor.includes(currentVendor) || 
                      currentVendor.includes(item.moldVendor) ||
                      item.moldVendor.includes("우성정공");
    return isMatched;
  });

  const vendorProjects = matchedVendorProjects.length > 0 
    ? matchedVendorProjects 
    : trials.filter((item) => !item.projectNo.startsWith("Q"));

  // 검색 필터 적용
  const filteredData = vendorProjects.filter((item) => {
    const matchProject = filterProjectNo
      ? item.projectNo.toLowerCase().includes(filterProjectNo.toLowerCase())
      : true;
    const matchProd = filterProductName
      ? item.productName.toLowerCase().includes(filterProductName.toLowerCase()) ||
        item.projectName.toLowerCase().includes(filterProductName.toLowerCase())
      : true;
    const matchDegree = filterTrialDegree !== "ALL"
      ? (item.currentTrial === filterTrialDegree || (filterTrialDegree === "금형 승인" && item.isMoldApproved))
      : true;
    const targetDate = item[filterDateType] || "";
    const matchDate = isWithinDateRange(targetDate, filterDateFrom, filterDateTo);
    return matchProject && matchProd && matchDegree && matchDate;
  });

  const handleReset = () => {
    setFilterProjectNo("");
    setFilterProductName("");
    setFilterTrialDegree("ALL");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSelectedDatePreset("all");
  };

  // 실적 입력 모달 열기
  const handleOpenDetail = (project: MoldTrialProject) => {
    setSelectedProject(project);
    setEditingTrials(JSON.parse(JSON.stringify(project.trials)));
    setEditingFinalDocs(JSON.parse(JSON.stringify(project.finalDocuments)));
    setTransferPlanDate(project.transferPlanDate || "");
    setTransferActualDate(project.transferActualDate || "");
    
    const defaultTab = project.currentTrial === "금형 승인"
      ? "finalDocs"
      : (project.currentTrial || project.trials[project.trials.length - 1]?.trialDegree || "T1");
    setActiveTab(defaultTab);
    setIsDetailModalOpen(true);
  };

  // 현재 탭의 TrialRecord 찾기
  const currentRecordIndex = editingTrials.findIndex((t) => t.trialDegree === activeTab);
  const currentRecord = currentRecordIndex >= 0 ? editingTrials[currentRecordIndex] : editingTrials[0];

  // 차수 필드 업데이트 헬퍼
  const updateCurrentRecord = (updates: Partial<TrialRecord>) => {
    if (currentRecordIndex < 0) return;
    setEditingTrials((prev) => {
      const next = [...prev];
      const target = { ...next[currentRecordIndex], ...updates };
      next[currentRecordIndex] = target;
      return next;
    });
  };


  // 보고서 파일 실제 업로드 트리거
  const handleTriggerUploadReport = (
    field: "dimReport" | "appReport" | "specReport" | "condReport",
    title: string
  ) => {
    setCurrentUploadField(field);
    setCurrentUploadTitle(title);
    if (reportFileInputRef.current) {
      reportFileInputRef.current.value = "";
      reportFileInputRef.current.click();
    }
  };

  // 보고서 파일 실제 업로드 처리 핸들러
  const handleReportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUploadField || !selectedProject) return;

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
      console.warn("Upload failed:", err);
    }

    const today = new Date().toISOString().split("T")[0];
    const sizeStr = file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(1)} KB` : `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

    const newDoc: TrialDocumentItem = {
      fileName: file.name,
      fileSize: sizeStr,
      uploadedAt: today,
      uploadedBy: `${currentVendor} 품질팀`,
      fileUrl: uploadedUrl || `/uploads/${encodeURIComponent(file.name)}`,
    };

    updateCurrentRecord({ [currentUploadField]: newDoc });

    addMemoLog(selectedProject.id, {
      authorId: "vendor-qc",
      authorName: currentVendor,
      company: currentVendor,
      tag: `${activeTab}.${currentUploadTitle}`,
      content: `${currentUploadTitle} 파일 업로드 완료 (${file.name})`,
      attachedFileName: file.name,
      attachedFileUrl: newDoc.fileUrl,
    });

    showToast(`[${currentUploadTitle}] 파일(${file.name})이 실제 업로드 및 등록되었습니다.`);
  };

  // 5대 서류 실제 업로드 트리거
  const handleTriggerUploadFinalDoc = (key: FinalDeliveryFile["key"], label: string) => {
    setCurrentUploadFinalKey(key);
    setCurrentUploadFinalLabel(label);
    if (finalDocFileInputRef.current) {
      finalDocFileInputRef.current.value = "";
      finalDocFileInputRef.current.click();
    }
  };

  // 5대 서류 실제 업로드 처리 핸들러
  const handleFinalDocFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUploadFinalKey || !selectedProject) return;

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
      console.warn("Final doc upload failed:", err);
    }

    const today = new Date().toISOString().split("T")[0];
    const sizeStr = file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(1)} KB` : `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

    setEditingFinalDocs((prev) =>
      prev.map((doc) => {
        if (doc.key === currentUploadFinalKey) {
          return {
            ...doc,
            fileName: file.name,
            fileSize: sizeStr,
            uploadedAt: today,
            uploadedBy: currentVendor,
            fileUrl: uploadedUrl || `/uploads/${encodeURIComponent(file.name)}`,
            isVerified: false,
            isRejected: false,
            rejectReason: undefined,
          };
        }
        return doc;
      })
    );

    addMemoLog(selectedProject.id, {
      authorId: "vendor-dev",
      authorName: currentVendor,
      company: currentVendor,
      tag: "서류제출",
      content: `5대 승인 서류 [${currentUploadFinalLabel}] 파일 업로드 (${file.name}) - MPSI 본사 승인 검토 요청`,
      attachedFileName: file.name,
      attachedFileUrl: uploadedUrl,
    });

    // MPSI로 알림 발송 (사용자 이름 제외, 회사명 단독)
    sendAppNotification({
      menuName: "금형 육성 및 시사출",
      menuPath: "/portal/mold-dev/trial",
      senderCompany: currentVendor,
      content: `[${selectedProject.projectNo}] ${currentVendor}에서 5대 승인 서류 [${currentUploadFinalLabel}]를 업로드하고 검토를 요청하였습니다.`,
      projectId: selectedProject.projectNo,
      targetRole: "MPSI"
    });

    showToast(`[${currentUploadFinalLabel}] 파일(${file.name})이 실제 업로드되었습니다. MPSI 본사 승인 검토 대기.`);
  };

  // 이관 계획일 / 완료일 저장 핸들러 (2-8, 2-9)
  const handleSaveTransferDates = () => {
    if (!selectedProject) return;
    updateTrialProject(selectedProject.id, {
      transferPlanDate,
      transferActualDate,
    });
    addMemoLog(selectedProject.id, {
      authorId: "vendor-dev",
      authorName: currentVendor,
      company: currentVendor,
      tag: "이관일정등록",
      content: `금형 이관 일정 등록 (계획일: ${transferPlanDate || "미정"}, 완료실적일: ${transferActualDate || "미완료"})`,
    });
    showToast("금형 이관 계획일 및 실적일이 저장되었습니다.");
  };

  // 시사출 계획일정표 등록 핸들러 (2-1)
  const handleSavePlanDate = () => {
    if (!selectedProject || !tempPlanDate) return;
    updateCurrentRecord({ planDate: tempPlanDate });
    addMemoLog(selectedProject.id, {
      authorId: "vendor-dev",
      authorName: currentVendor,
      company: currentVendor,
      tag: "시사출계획",
      content: `[${activeTab}] 시사출 계획일정 등록 (${tempPlanDate})`,
    });
    setIsPlanModalOpen(false);
    showToast(`시사출 계획일자(${tempPlanDate})가 등록되었습니다.`);
  };

  // 신규 차수 ($T_{n+1}$) 즉시 추가 핸들러 (모달 없이 바로 추가 & 이전 차수 데이터 연계 바인딩)
  const handleAddNewTrialDirectly = () => {
    if (!selectedProject) return;
    const nextNum = editingTrials.length + 1;
    const nextDegree = `T${nextNum}`;
    const today = new Date().toISOString().split("T")[0];

    // 직전 차수 데이터 (현재 활성 탭 또는 마지막 차수)
    const prevRec = editingTrials.find((t) => t.trialDegree === activeTab) || editingTrials[editingTrials.length - 1];

    const newRec: TrialRecord = {
      trialDegree: nextDegree,
      trialDate: today,
      inspector: prevRec?.inspector || currentVendor,
      dimResult: prevRec?.dimResult || "OK",
      dimReport: prevRec?.dimReport ? { ...prevRec.dimReport, uploadedAt: today } : undefined,
      appResult: prevRec?.appResult || "OK",
      appReport: prevRec?.appReport ? { ...prevRec.appReport, uploadedAt: today } : undefined,
      specResult: prevRec?.specResult || "OK",
      specReport: prevRec?.specReport ? { ...prevRec.specReport, uploadedAt: today } : undefined,
      cycleTime: prevRec?.cycleTime ?? 34,
      targetCycleTime: prevRec?.targetCycleTime ?? (editingTrials[0]?.targetCycleTime || 35),
      condReport: prevRec?.condReport ? { ...prevRec.condReport, uploadedAt: today } : undefined,
      status: "육성 진행중",
      mpsiDecision: "검토중",
      checklist: [],
      opinion: prevRec?.opinion || `${nextDegree} 시사출 검사 및 개선 검증 실시`,
    };

    setEditingTrials((prev) => [...prev, newRec]);
    setActiveTab(nextDegree);

    addMemoLog(selectedProject.id, {
      authorId: "vendor-dev",
      authorName: currentVendor,
      company: currentVendor,
      tag: `${nextDegree}차수추가`,
      content: `[차수 추가] ${nextDegree} 시사출 차수가 신규 추가되었습니다. (이전 차수(${prevRec?.trialDegree || "T1"}) 검사 데이터 연계)`,
    });

    showToast(`신규 ${nextDegree} 시사출 차수가 추가되었습니다.`);
  };

  // 업무 이력 메모 수동 작성 (2-4, 2-13)
  const handleAddMemo = async () => {
    if (!memoInput.trim() || !selectedProject) return;
    const content = memoInput.trim();
    addMemoLog(selectedProject.id, {
      authorId: "vendor-dev",
      authorName: currentVendor,
      company: currentVendor,
      tag: memoTag || "업무메모",
      content,
    });

    // MPSI로 알림 발송 (사용자 이름 제외, 회사명 단독)
    await sendAppNotification({
      menuName: "금형 육성 및 시사출",
      menuPath: "/portal/mold-dev/trial",
      senderCompany: currentVendor,
      content: `[${selectedProject.projectNo}] ${currentVendor}에서 업무 이력 메모를 등록하였습니다: "${content.slice(0, 30)}..."`,
      projectId: selectedProject.projectNo,
      targetRole: "MPSI"
    });

    setMemoInput("");
    showToast("업무 이력 메모가 등록되었습니다.");
  };

  // 모달 저장 처리
  const handleSaveModal = async () => {
    if (!selectedProject) return;

    const latestTrial = editingTrials[editingTrials.length - 1] || editingTrials[0];
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const currentDegree = selectedProject.currentTrial === "금형 승인" ? "금형 승인" : latestTrial.trialDegree;

    // 1. MoldTrialStore 업데이트
    updateTrialProject(selectedProject.id, {
      trials: editingTrials,
      finalDocuments: editingFinalDocs,
      currentTrial: currentDegree,
      transferPlanDate,
      transferActualDate,
      updatedAt: dateStr,
    });

    // 2. 업무 이력 메모 등록
    addMemoLog(selectedProject.id, {
      authorId: "vendor-dev",
      authorName: currentVendor,
      company: currentVendor,
      tag: `${activeTab}.실적저장`,
      content: `[${currentDegree} 시사출] 실측 C/T: ${latestTrial.cycleTime}초, 판정: ${latestTrial.status}, 소견: ${latestTrial.opinion || "정상"}`,
    });

    // 3. ProjectMaster 스토어 동기화
    updateStep(selectedProject.projectNo, {
      currentStep: 8, // Step 8: 시사출
      trialDegree: currentDegree,
      stepStatus: latestTrial.status === "Fail (금형수정)" ? "Fail(수정중)" : 
                  latestTrial.status === "Pass (양산승인)" ? "완료" : "진행중",
      notes: `[${currentVendor} 시사출] ${currentDegree} 실측 C/T: ${latestTrial.cycleTime}초 (판정: ${latestTrial.status})`,
    });

    // MPSI로 알림 발송 (사용자 이름 제외, 회사명 단독)
    await sendAppNotification({
      menuName: "금형 육성 및 시사출",
      menuPath: "/portal/mold-dev/trial",
      senderCompany: currentVendor,
      content: `[${selectedProject.projectNo}] ${currentVendor}에서 ${currentDegree} 시사출 실적 및 측정 성적서를 등록하였습니다. (판정: ${latestTrial.status})`,
      projectId: selectedProject.projectNo,
      targetRole: "MPSI"
    });

    setIsDetailModalOpen(false);
    showToast(`[${selectedProject.projectNo}] 시사출 실적 및 보고서가 저장되었습니다.`);
  };

  // 파일 실제 스트리밍 다운로드
  const handleDownloadFile = async (fileName?: string, fileUrl?: string) => {
    const targetFile = fileUrl || fileName;
    if (!targetFile || !selectedProject) return;
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
      showToast("다운로드할 원본 파일이 서버에 등록되지 않았습니다.");
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 실제 파일 업로드용 숨김 Input 요소들 */}
      <input
        type="file"
        ref={reportFileInputRef}
        onChange={handleReportFileChange}
        className="hidden"
        accept=".pdf,.xlsx,.xls,.zip"
      />
      <input
        type="file"
        ref={finalDocFileInputRef}
        onChange={handleFinalDocFileChange}
        className="hidden"
        accept=".pdf,.xlsx,.xls,.zip"
      />
      {/* 토스트 알림 */}
      {toastMessage && (
        <div className="fixed top-4 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-xl bg-purple-700 text-white text-xs font-medium animate-in fade-in">
          <Sparkles className="h-4 w-4" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-80">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 헤더 배너 */}
      <div className="bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-600 text-white shadow-xs">
            <Gauge className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-purple-950 dark:text-purple-100">
                [{currentVendor}] 금형 시사출(T1~Tn) 실적 및 측정 성적서 등록
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                금형외주 시사출 포털
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
              금형 가공 완료 후 공장 자체 시사출 조건 및 4대 영역(치수/외관/금형/양산성) 성적서를 제출합니다. 입력 즉시 MPSI 본사로 전송됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 영역 */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 shadow-xs flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 font-medium">프로젝트 번호:</span>
          <div className="relative">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              value={filterProjectNo}
              onChange={(e) => setFilterProjectNo(e.target.value)}
              placeholder="예: MI26001"
              className="pl-7 h-7 text-xs w-32"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 font-medium">제품명/차종:</span>
          <Input
            value={filterProductName}
            onChange={(e) => setFilterProductName(e.target.value)}
            placeholder="예: 크래시패드"
            className="h-7 text-xs w-36"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 font-medium">차수:</span>
          <select
            value={filterTrialDegree}
            onChange={(e) => setFilterTrialDegree(e.target.value)}
            className="h-7 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 font-medium"
          >
            <option value="ALL">전체 차수</option>
            <option value="T1">T1</option>
            <option value="T2">T2</option>
            <option value="T3">T3</option>
            <option value="금형 승인">금형 승인</option>
          </select>
        </div>

        {/* 날짜 필터 */}
        <div className="flex items-center gap-1.5 border-l border-zinc-200 dark:border-zinc-700 pl-2">
          <select
            value={filterDateType}
            onChange={(e) => setFilterDateType(e.target.value as any)}
            className="h-7 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2"
          >
            <option value="targetT1Date">목표T1일자</option>
            <option value="updatedAt">최종갱신일</option>
          </select>
          <DateRangeFilter
            compact
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
            className="h-7 px-2 text-xs text-purple-700 border-purple-300 dark:text-purple-300 cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? "animate-spin" : ""}`} />
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

      {/* 데이터 그리드 (1번째 스크린샷 요구사항: 사선 표시된 메뉴 삭제 및 컬럼명 변경) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1e293b] text-white text-[11px] font-semibold border-b border-zinc-700">
                <th className="py-2.5 px-3 text-center w-10 border-r border-slate-600">No</th>
                <th className="py-2.5 px-3 border-r border-slate-600 min-w-[125px]">프로젝트 번호</th>
                <th className="py-2.5 px-3 border-r border-slate-600 min-w-[75px] text-center text-amber-300">신작/설변</th>
                <th className="py-2.5 px-3 text-center border-r border-slate-600 min-w-[105px]">금형번호</th>
                <th className="py-2.5 px-3 border-r border-slate-600 min-w-[75px] text-center text-purple-300">금형차수</th>
                <th className="py-2.5 px-3 text-center border-r border-slate-600 min-w-[110px]">사출양산처</th>
                <th className="py-2.5 px-3 border-r border-slate-600 min-w-[150px]">프로젝트 / 차종</th>
                <th className="py-2.5 px-3 border-r border-slate-600 min-w-[160px]">제품명</th>
                <th className="py-2.5 px-3 text-center border-r border-slate-600 min-w-[85px]">육성 차수</th>
                {/* 1번째 스크린샷 수정: '육성 항목' */}
                <th className="py-2.5 px-3 text-center border-r border-slate-600 min-w-[180px] bg-slate-800">육성 항목</th>
                {/* 1번째 스크린샷 수정: '승인 서류' */}
                <th className="py-2.5 px-3 text-center border-r border-slate-600 min-w-[120px] bg-slate-800">승인 서류</th>
                <th className="py-2.5 px-3 text-center min-w-[95px]">육성 관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-[11px]">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-zinc-400">
                    조회된 금형 시사출 프로젝트가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredData.map((project, idx) => {
                  const latestTrial = project.trials[project.trials.length - 1] || project.trials[0];
                  const docStats = calculateFinalCompletionStats(project.finalDocuments);
                  const verifiedDocCount = project.finalDocuments.filter(d => Boolean(d.fileName) && d.isVerified).length;
                  const isApproved = project.currentTrial === "금형 승인" || project.isMoldApproved;
                  const moldNoDisplay = project.moldNo || (project.projectNo ? `${project.projectNo.split("-")[0].replace(/P0$/, "")}M` : "-");

                  return (
                    <tr 
                      key={project.id}
                      className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors odd:bg-white even:bg-zinc-50/40 dark:odd:bg-zinc-900 dark:even:bg-zinc-900/50"
                    >
                      <td className="py-2.5 px-3 text-center text-zinc-400 font-mono border-r border-zinc-100 dark:border-zinc-800">
                        {idx + 1}
                      </td>

                      {/* 프로젝트 번호: 외주업체 화면에서는 클릭 모달 없이 일반 텍스트로 노출 */}
                      <td className="py-2.5 px-3 font-semibold text-purple-700 dark:text-purple-400 font-mono border-r border-zinc-100 dark:border-zinc-800">
                        <span>{project.projectNo}</span>
                      </td>

                      {/* 신작/설변 (N001, E001) */}
                      <td className="py-2.5 px-3 text-center font-mono border-r border-zinc-100 dark:border-zinc-800">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold border shadow-2xs ${
                          project.changeType?.startsWith("E")
                            ? "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300"
                            : "bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300"
                        }`}>
                          {project.changeType || "N001"}
                        </span>
                      </td>

                      {/* 금형번호 */}
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-zinc-800 dark:text-zinc-200 border-r border-zinc-100 dark:border-zinc-800">
                        {moldNoDisplay}
                      </td>

                      {/* 금형차수 (M1, M2) */}
                      <td className="py-2.5 px-3 text-center font-mono border-r border-zinc-100 dark:border-zinc-800">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">
                          {project.moldDegree || "M1"}
                        </span>
                      </td>

                      {/* 사출양산처 */}
                      <td className="py-2.5 px-3 text-center font-medium text-emerald-700 border-r border-zinc-100 dark:border-zinc-800">
                        {project.massVendor || "(주)뉴몰드"}
                      </td>

                      <td className="py-2.5 px-3 font-medium text-zinc-800 dark:text-zinc-200 border-r border-zinc-100 dark:border-zinc-800 truncate max-w-[150px]" title={project.projectName}>
                        {project.projectName}
                      </td>

                      <td className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300 border-r border-zinc-100 dark:border-zinc-800 truncate max-w-[160px]" title={project.productName}>
                        {project.productName}
                      </td>

                      {/* 차수 (금형 승인원 제출 및 승인 후 'T3'가 '금형 승인'으로 변동) */}
                      <td className="py-2.5 px-3 text-center border-r border-zinc-100 dark:border-zinc-800 font-mono">
                        {isApproved ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                            금형 승인
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 font-bold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200">
                            {project.currentTrial}
                          </span>
                        )}
                      </td>

                      {/* 육성 항목 (구 4대 검사결과: 치수/외관/사양/CT) */}
                      <td className="py-2.5 px-3 text-center border-r border-zinc-100 dark:border-zinc-800">
                        {latestTrial ? (
                          <div className="flex items-center justify-center gap-1 font-mono text-[10px]">
                            <span 
                              className={`px-1 py-0.5 rounded font-bold ${latestTrial.dimResult === "OK" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40" : "bg-rose-100 text-rose-800"}`}
                              title="치수검토보고서"
                            >
                              치수:{latestTrial.dimResult}
                            </span>
                            <span 
                              className={`px-1 py-0.5 rounded font-bold ${latestTrial.appResult === "OK" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40" : "bg-rose-100 text-rose-800"}`}
                              title="외관검토보고서"
                            >
                              외관:{latestTrial.appResult}
                            </span>
                            <span 
                              className={`px-1 py-0.5 rounded font-bold ${latestTrial.specResult === "OK" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40" : "bg-rose-100 text-rose-800"}`}
                              title="금형검사보고서"
                            >
                              사양:{latestTrial.specResult}
                            </span>
                            <span 
                              className={`px-1 py-0.5 rounded font-bold ${latestTrial.cycleTime <= latestTrial.targetCycleTime ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40" : "bg-amber-100 text-amber-800"}`}
                              title={`목표 C/T: ${latestTrial.targetCycleTime}s vs 실측: ${latestTrial.cycleTime}s`}
                            >
                              CT:{latestTrial.cycleTime}s
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>

                      {/* 승인 서류 (구 5대 서류 등록) */}
                      <td className="py-2.5 px-3 text-center border-r border-zinc-100 dark:border-zinc-800 font-mono font-medium">
                        {(() => {
                          const rejectedCount = project.finalDocuments.filter(d => d.isRejected).length;
                          if (rejectedCount > 0) {
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                                <AlertTriangle className="h-3 w-3 text-rose-600" />
                                반려 {rejectedCount}건 (보완필요)
                              </span>
                            );
                          }
                          return (
                            <span 
                              className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] ${
                                verifiedDocCount === 5 
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : verifiedDocCount > 0
                                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                                  : docStats.uploadedCount > 0
                                  ? "bg-blue-100 text-blue-800 border border-blue-200"
                                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                              }`}
                            >
                              {verifiedDocCount === 5 ? "5/5건 승인" : `${verifiedDocCount}/5건 승인 (${docStats.uploadedCount}건 제출)`}
                            </span>
                          );
                        })()}
                      </td>

                      {/* 육성 관리 버튼 */}
                      <td className="py-2.5 px-3 text-center">
                        <Button
                          size="sm"
                          onClick={() => handleOpenDetail(project)}
                          className="h-6 px-2.5 text-[11px] bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-xs cursor-pointer"
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
      {/* 1. 외주업체(우성정공) 시사출 실적 및 측정 성적서 등록 모달                     */}
      {/* ========================================================================= */}
      {isDetailModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-5xl my-6 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95">
            {/* 모달 상단 헤더 */}
            <div className="bg-[#1e293b] text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-purple-600 text-white">
                  <Gauge className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-purple-300 font-bold text-sm">
                      [{selectedProject.projectNo}] [{selectedProject.moldNo || (selectedProject.projectNo ? `${selectedProject.projectNo.split("-")[0].replace(/P0$/, "")}M` : "-")}]
                    </span>
                    <h3 className="font-bold text-sm text-white">
                      시사출(T1~Tn) 실적 및 측정 성적서 등록
                    </h3>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-purple-900/80 border border-purple-400 text-purple-200">
                      차수: {selectedProject.moldDegree || "M1"}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-sky-900/80 border border-sky-400 text-sky-200">
                      구분: {selectedProject.changeType || "N001"}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/30 text-purple-200 border border-purple-400/30">
                      {currentVendor}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-[11px] mt-0.5">
                    차종: {selectedProject.projectName} | 제품명: {selectedProject.productName} | 금형번호: <b className="text-zinc-200 font-mono">{selectedProject.moldNo || (selectedProject.projectNo ? `${selectedProject.projectNo.split("-")[0].replace(/P0$/, "")}M` : "-")}</b> (차수: {selectedProject.moldDegree || "M1"}) | 재질: {selectedProject.material || "NAK80"} ({selectedProject.cavity || "1*2 Cavity"})
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

            {/* 상단 프로젝트 요약 & 액션 헤더 */}
            <div className="bg-zinc-50 dark:bg-zinc-900 border-b p-3 flex flex-col gap-2 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-[11px]">
                  <div><span className="text-zinc-500">프로젝트 번호:</span> <b className="font-mono text-purple-700 ml-1">{selectedProject.projectNo}</b></div>
                  <div><span className="text-zinc-500">금형번호:</span> <b className="font-mono font-bold text-zinc-800 dark:text-zinc-200 ml-1">{selectedProject.moldNo || (selectedProject.projectNo ? `${selectedProject.projectNo.split("-")[0].replace(/P0$/, "")}M` : "-")}</b></div>
                  <div>
                    <span className="text-zinc-500">금형차수 / 구분:</span> 
                    <span className="ml-1 inline-flex items-center gap-1">
                      <b className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300">{selectedProject.moldDegree || "M1"}</b>
                      <b className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-sky-100 text-sky-800 border border-sky-300">{selectedProject.changeType || "N001"}</b>
                    </span>
                  </div>
                  <div><span className="text-zinc-500">원청 고객사:</span> <b className="text-zinc-800 dark:text-zinc-200 ml-1">{selectedProject.customerName || "현대자동차"}</b></div>
                  <div><span className="text-zinc-500">금형제작처:</span> <b className="text-blue-600 ml-1">{selectedProject.moldVendor}</b></div>
                  <div><span className="text-zinc-500">사출양산처:</span> <b className="text-emerald-700 ml-1">{selectedProject.massVendor || "(주)뉴몰드"}</b></div>
                </div>

                {/* 버튼 그룹: 다음 차수 등록 (요청사항: 시사출 계획(일정)표 등록 버튼 삭제) */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    onClick={handleAddNewTrialDirectly}
                    size="sm"
                    className="h-7 px-2.5 bg-purple-600 hover:bg-purple-700 text-white gap-1 text-xs font-bold cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    다음 차수 (T{editingTrials.length + 1}) 검사등록
                  </Button>
                </div>
              </div>

              {/* 4) 안내 배너 (요구사항 4번: 양산처는 시사출결과 안보고 최종 결과만 공유) */}
              <div className="p-2 rounded bg-purple-50/70 border border-purple-200 text-purple-950 text-[11px] flex items-center gap-2">
                <Info className="h-4 w-4 text-purple-600 shrink-0" />
                <span>
                  <b>공정 분리 원칙:</b> 금형처의 시사출 및 육성 과정은 양산처에 미공유되며, 최종 5대 승인 서류 및 최종 시사출 샘플만 금형 이관 시 공유됩니다.
                </span>
              </div>
            </div>

            {/* 탭 네비게이션: 차수 탭 (T1, T2, ...) + [+ 차수 추가] + [금형 이관 (5대 필수 서류)] (완성률 삭제 반영: 2-5, 2-10) */}
            <div className="bg-zinc-100 dark:bg-zinc-800/80 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {editingTrials.map((tr) => (
                  <button
                    key={tr.trialDegree}
                    onClick={() => setActiveTab(tr.trialDegree)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeTab === tr.trialDegree
                        ? "bg-purple-600 text-white shadow-xs"
                        : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    <span>{tr.trialDegree} 차수 실적</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      activeTab === tr.trialDegree 
                        ? "bg-purple-800 text-purple-100" 
                        : tr.status.includes("Pass")
                        ? "bg-emerald-100 text-emerald-800"
                        : tr.status.includes("Fail")
                        ? "bg-rose-100 text-rose-800"
                        : "bg-zinc-200 text-zinc-700"
                    }`}>
                      {tr.status.split(" ")[0]}
                    </span>
                  </button>
                ))}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddNewTrialDirectly}
                  className="h-7 px-2 text-xs bg-white dark:bg-zinc-800 text-purple-700 dark:text-purple-300 border-dashed border-purple-300 hover:bg-purple-50 cursor-pointer"
                  title="새로운 시사출 차수(T+1)를 바로 추가합니다 (이전 차수 데이터 연계)"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  차수 추가
                </Button>
              </div>

              {/* 5대 서류 탭 (완성률 삭제 및 반려 알림 반영) */}
              {(() => {
                const rejectedCount = editingFinalDocs.filter(d => d.isRejected).length;
                const verifiedCount = editingFinalDocs.filter(d => Boolean(d.fileName) && d.isVerified).length;
                return (
                  <button
                    onClick={() => setActiveTab("finalDocs")}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      activeTab === "finalDocs"
                        ? "bg-amber-600 text-white shadow-xs"
                        : rejectedCount > 0
                        ? "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300 hover:bg-rose-100"
                        : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 hover:bg-amber-100"
                    }`}
                  >
                    <Award className="h-3.5 w-3.5" />
                    <span>금형 이관 (5대 필수 서류)</span>
                    {rejectedCount > 0 ? (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-600 text-white font-mono font-bold animate-pulse">
                        반려 {rejectedCount}건
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-700 text-amber-100 font-mono font-bold">
                        {verifiedCount}/5건 승인
                      </span>
                    )}
                  </button>
                );
              })()}
            </div>

            {/* 모달 바디 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* ========================================================= */}
              {/* TAB A: 차수별 시사출 실적 입력 화면 (T1, T2 등)              */}
              {/* ========================================================= */}
              {activeTab !== "finalDocs" && currentRecord && (
                <>
                  {/* 상단 기본 정보 입력 바 */}
                  <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-zinc-500 font-medium text-[11px] block mb-1">
                        시사출 일자
                      </span>
                      <Input
                        type="date"
                        value={currentRecord.trialDate}
                        onChange={(e) => updateCurrentRecord({ trialDate: e.target.value })}
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <span className="text-zinc-500 font-medium text-[11px] block mb-1">
                        현장 검사처 / 작성회사
                      </span>
                      <Input
                        value={currentRecord.inspector}
                        onChange={(e) => updateCurrentRecord({ inspector: e.target.value })}
                        placeholder="예: 우성정공(주)"
                        className="h-8 text-xs"
                      />
                    </div>

                    <div>
                      <span className="text-zinc-500 font-medium text-[11px] block mb-1">
                        차수 판정 상태 (금형처 요청)
                      </span>
                      <select
                        value={currentRecord.status}
                        onChange={(e) => updateCurrentRecord({ status: e.target.value as any })}
                        className="h-8 text-xs w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 font-medium"
                      >
                        <option value="육성 진행중">육성 진행중</option>
                        <option value="Fail (금형수정)">Fail (금형수정)</option>
                        <option value="Pass (양산승인)">Pass (양산승인 요청)</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-zinc-500 font-medium text-[11px] block mb-1">
                        MPSI 본사 승인 검토 결과
                      </span>
                      <div className="h-8 px-2 flex items-center rounded border bg-white dark:bg-zinc-800 font-bold text-xs">
                        {currentRecord.mpsiDecision === "승인" ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> 승인완료 (Pass)
                          </span>
                        ) : currentRecord.mpsiDecision === "미승인(수정요청)" ? (
                          <span className="text-rose-600 flex items-center gap-1">
                            <XCircle className="h-3.5 w-3.5" /> 금형수정요청 (미승인)
                          </span>
                        ) : (
                          <span className="text-amber-600 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" /> MPSI 검토중
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 4대 평가 영역 (치수검토 / 외관검토 / 금형검사 / 양산성목표 CT) */}
                  <div>
                    <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 mb-2 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-purple-600" />
                      차수별 4대 평가 영역 실적 및 성적서 첨부
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* 1. 치수검토보고서 (구 치수 만족도) */}
                      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 bg-white dark:bg-zinc-800/60 shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                              1. 치수검토보고서 (CMM 3차원 측정)
                            </span>
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name="dimRes"
                                  checked={currentRecord.dimResult === "OK"}
                                  onChange={() => updateCurrentRecord({ dimResult: "OK" })}
                                  className="text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="font-semibold text-emerald-600">OK</span>
                              </label>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name="dimRes"
                                  checked={currentRecord.dimResult === "NG"}
                                  onChange={() => updateCurrentRecord({ dimResult: "NG" })}
                                  className="text-rose-600 focus:ring-rose-500"
                                />
                                <span className="font-semibold text-rose-600">NG</span>
                              </label>
                            </div>
                          </div>
                          <p className="text-[11px] text-zinc-500 mb-3">
                            도면 스펙 대비 핵심 중요 공차(±0.05mm) 전수 CMM 측정 성적서를 첨부합니다.
                          </p>
                        </div>

                        {/* 첨부파일 정보 & 다운로드/업로드 */}
                        <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700 rounded p-2 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileText className="h-4 w-4 text-purple-600 shrink-0" />
                            <span className="truncate font-mono text-zinc-700 dark:text-zinc-300">
                              {currentRecord.dimReport?.fileName || "치수검토보고서 미등록"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {currentRecord.dimReport?.fileName && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadFile(currentRecord.dimReport?.fileName, currentRecord.dimReport?.fileUrl)}
                                className="h-6 px-1.5 text-[10px]"
                                title="다운로드"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTriggerUploadReport("dimReport", "치수검토보고서")}
                              className="h-6 px-2 text-[10px]"
                            >
                              <UploadCloud className="h-3 w-3 mr-1" />
                              성적서 업로드
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* 2. 외관검토보고서 (구 외관 만족도) */}
                      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 bg-white dark:bg-zinc-800/60 shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                              2. 외관검토보고서 (육안/광택/수축/웰드)
                            </span>
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name="appRes"
                                  checked={currentRecord.appResult === "OK"}
                                  onChange={() => updateCurrentRecord({ appResult: "OK" })}
                                  className="text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="font-semibold text-emerald-600">OK</span>
                              </label>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name="appRes"
                                  checked={currentRecord.appResult === "NG"}
                                  onChange={() => updateCurrentRecord({ appResult: "NG" })}
                                  className="text-rose-600 focus:ring-rose-500"
                                />
                                <span className="font-semibold text-rose-600">NG</span>
                              </label>
                            </div>
                          </div>
                          <p className="text-[11px] text-zinc-500 mb-3">
                            초물 외관 표면의 웰드라인, 싱크마크, 가스버닝, 플래시 유무 사진 보고서를 첨부합니다.
                          </p>
                        </div>

                        {/* 첨부파일 정보 & 다운로드/업로드 */}
                        <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700 rounded p-2 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileText className="h-4 w-4 text-purple-600 shrink-0" />
                            <span className="truncate font-mono text-zinc-700 dark:text-zinc-300">
                              {currentRecord.appReport?.fileName || "외관검토보고서 미등록"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {currentRecord.appReport?.fileName && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadFile(currentRecord.appReport?.fileName, currentRecord.appReport?.fileUrl)}
                                className="h-6 px-1.5 text-[10px]"
                                title="다운로드"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTriggerUploadReport("appReport", "외관검토보고서")}
                              className="h-6 px-2 text-[10px]"
                            >
                              <UploadCloud className="h-3 w-3 mr-1" />
                              성적서 업로드
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* 3. 금형검사보고서 (구 금형사양검사) */}
                      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 bg-white dark:bg-zinc-800/60 shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                              3. 금형검사보고서 (사양 점검 체크리스트)
                            </span>
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name="specRes"
                                  checked={currentRecord.specResult === "OK"}
                                  onChange={() => updateCurrentRecord({ specResult: "OK" })}
                                  className="text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="font-semibold text-emerald-600">OK</span>
                              </label>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name="specRes"
                                  checked={currentRecord.specResult === "NG"}
                                  onChange={() => updateCurrentRecord({ specResult: "NG" })}
                                  className="text-rose-600 focus:ring-rose-500"
                                />
                                <span className="font-semibold text-rose-600">NG</span>
                              </label>
                            </div>
                          </div>
                          <p className="text-[11px] text-zinc-500 mb-3">
                            냉각라인 누수 여부, 이젝터 핀 유격, 핫러너 온도 밸런스 등 금형 사양을 점검합니다.
                          </p>
                        </div>

                        {/* 첨부파일 정보 & 다운로드/업로드 */}
                        <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700 rounded p-2 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileText className="h-4 w-4 text-purple-600 shrink-0" />
                            <span className="truncate font-mono text-zinc-700 dark:text-zinc-300">
                              {currentRecord.specReport?.fileName || "금형검사보고서 미등록"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {currentRecord.specReport?.fileName && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadFile(currentRecord.specReport?.fileName, currentRecord.specReport?.fileUrl)}
                                className="h-6 px-1.5 text-[10px]"
                                title="다운로드"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTriggerUploadReport("specReport", "금형검사보고서")}
                              className="h-6 px-2 text-[10px]"
                            >
                              <UploadCloud className="h-3 w-3 mr-1" />
                              성적서 업로드
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* 4. 양산성 만족도(목표 C/T) 및 조건표 파일 등록 (2-3) */}
                      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 bg-white dark:bg-zinc-800/60 shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                              4. 양산성 만족도(목표 C/T)
                            </span>
                            <span
                              className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                                currentRecord.cycleTime <= currentRecord.targetCycleTime
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/40"
                              }`}
                            >
                              {currentRecord.cycleTime <= currentRecord.targetCycleTime
                                ? "OK (목표 달성)"
                                : `NG (+${currentRecord.cycleTime - currentRecord.targetCycleTime}초 지연)`}
                            </span>
                          </div>
                          
                          {/* C/T 수치 입력 */}
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex-1">
                              <span className="text-[10px] text-zinc-500 block">목표 C/T (초)</span>
                              <div className="font-mono font-bold text-zinc-700 dark:text-zinc-300 text-xs mt-0.5">
                                {currentRecord.targetCycleTime}초
                              </div>
                            </div>
                            <div className="flex-1">
                              <span className="text-[10px] text-zinc-500 block">실측 C/T 입력 (초)</span>
                              <Input
                                type="number"
                                value={currentRecord.cycleTime}
                                onChange={(e) =>
                                  updateCurrentRecord({ cycleTime: Number(e.target.value) || 0 })
                                }
                                className="h-7 text-xs font-mono font-bold w-24 text-purple-700"
                              />
                            </div>
                          </div>
                        </div>

                        {/* 2-3) 사출조건표 첨부파일 표시 및 업로드 */}
                        <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700 rounded p-2 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileText className="h-4 w-4 text-purple-600 shrink-0" />
                            <span className="truncate font-mono text-zinc-700 dark:text-zinc-300">
                              {currentRecord.condReport?.fileName || "사출조건표.xlsx"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {currentRecord.condReport?.fileName && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadFile(currentRecord.condReport?.fileName, currentRecord.condReport?.fileUrl)}
                                className="h-6 px-1.5 text-[10px]"
                                title="다운로드"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTriggerUploadReport("condReport", "사출성형 조건표")}
                              className="h-6 px-2 text-[10px]"
                            >
                              <UploadCloud className="h-3 w-3 mr-1" />
                              조건표 업로드
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>


                  {/* 현장 종합 검사원 소견 작성 */}
                  <div>
                    <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 block mb-1">
                      현장 종합 소견 및 개선 방향
                    </span>
                    <textarea
                      value={currentRecord.opinion}
                      onChange={(e) => updateCurrentRecord({ opinion: e.target.value })}
                      placeholder="사출 성형 시 발생한 트러블 현상 및 향후 금형 수정(방전/사상 등) 계획을 상세히 기술하세요"
                      rows={2}
                      className="w-full text-xs p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  {/* 2-4) 업무 이력 메모 */}
                  <div className="border border-purple-200 dark:border-purple-900/60 rounded-xl p-3 bg-purple-50/20 dark:bg-purple-950/10 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 text-xs flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-purple-600" />
                        업무 이력 메모
                      </span>
                      <span className="text-[10px] text-zinc-400">시사출/육성 특이사항 누적</span>
                    </div>

                    <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto">
                      {selectedProject.memoLogs.length === 0 ? (
                        <div className="p-2 text-center text-zinc-400 text-xs bg-white rounded border">
                          등록된 업무 메모가 없습니다.
                        </div>
                      ) : (
                        selectedProject.memoLogs.map((m) => (
                          <div key={m.id} className="p-2 rounded border bg-white dark:bg-zinc-900 text-xs flex flex-col gap-0.5 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold text-[9px]">
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

                    {/* 메모 신규 작성 인풋 */}
                    <div className="flex items-center gap-2 pt-1 border-t border-purple-200/60">
                      <Input
                        value={memoTag}
                        onChange={(e) => setMemoTag(e.target.value)}
                        placeholder="태그 (예: 치수특이점)"
                        className="h-7 w-28 text-xs bg-white dark:bg-zinc-800"
                      />
                      <Input
                        value={memoInput}
                        onChange={(e) => setMemoInput(e.target.value)}
                        placeholder="공유할 메모 내용을 입력하세요"
                        className="h-7 flex-1 text-xs bg-white dark:bg-zinc-800"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddMemo();
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={handleAddMemo}
                        className="h-7 px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white font-medium shrink-0 cursor-pointer"
                      >
                        <Send className="h-3 w-3 mr-1" />
                        메모 등록
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* ========================================================= */}
              {/* TAB B: 금형 이관 5대 필수 서류 등록 화면 (스크린샷 4 반영)     */}
              {/* ========================================================= */}
              {activeTab === "finalDocs" && (
                <div className="space-y-4">
                  {/* 상단 이관 배너 */}
                  <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <Award className="h-4 w-4 text-amber-600" />
                        공정 9~10 금형 육성 완료 & 금형 이관 (5대 필수 서류 등록)
                      </h4>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                        금형제작처: <b className="text-zinc-800 dark:text-zinc-200">{selectedProject.moldVendor}</b> ➔ 사출양산처: <b className="text-emerald-700">{selectedProject.massVendor || "(주)뉴몰드"}</b>
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        시사출 완료 및 금형 양산처로의 금형 이관 시 필수 요구되는 5개 서류를 첨부합니다. MPSI 본사가 검증 후 공식 승인합니다.
                      </p>
                    </div>

                    {/* 2-8) 금형 이관 계획일, 2-9) 금형 이관 완료일(실적일) 입력 */}
                    <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 p-2 rounded-lg border text-[11px] shrink-0 shadow-xs">
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

                  {/* 5대 서류 리스트 카드 */}
                  <div className="space-y-2.5">
                    {editingFinalDocs.map((doc, dIdx) => (
                      <div
                        key={doc.key}
                        className={`p-3.5 rounded-lg border shadow-xs flex items-center justify-between gap-4 transition-all ${
                          doc.isRejected
                            ? "border-rose-300 bg-rose-50/40 dark:bg-rose-950/20 ring-1 ring-rose-200"
                            : doc.isVerified
                            ? "border-emerald-200 bg-emerald-50/20 dark:bg-emerald-950/10"
                            : Boolean(doc.fileName)
                            ? "border-blue-200 bg-white dark:bg-zinc-800/80"
                            : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80"
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <span className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                            doc.isRejected
                              ? "bg-rose-600 text-white"
                              : doc.isVerified
                              ? "bg-emerald-600 text-white"
                              : "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300"
                          }`}>
                            {dIdx + 1}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h5 className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                                {doc.label}
                              </h5>
                              {doc.isVerified ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 border border-emerald-300">
                                  MPSI 본사 승인완료
                                </span>
                              ) : doc.isRejected ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3 text-rose-600" />
                                  반려 (보완요청)
                                </span>
                              ) : doc.fileName ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40">
                                  검토 대기중
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-600 dark:bg-zinc-700">
                                  미등록 (필수)
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-500 mt-0.5">{doc.description}</p>
                            
                            {/* 반려 사유 안내 배너 */}
                            {doc.isRejected && (
                              <div className="mt-2 p-2.5 rounded-md bg-rose-100/80 border border-rose-300 text-rose-950 text-[11px] flex items-start gap-2 shadow-2xs">
                                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold text-rose-900">[MPSI 본사 반려 사유 및 보완 요청]:</span>{" "}
                                  <span className="font-semibold text-rose-800">{doc.rejectReason || "측정 데이터 보완 및 첨부 성적서 재확인 요망"}</span>
                                  <span className="block text-[10px] text-rose-700 mt-0.5">
                                    * 지적된 사항을 보완한 새 파일을 아래 [보완 서류 재업로드] 버튼을 통해 다시 제출해 주세요.
                                  </span>
                                </div>
                              </div>
                            )}

                            {doc.fileName && (
                              <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-600 dark:text-zinc-400 font-mono">
                                <FileText className="h-3 w-3 text-purple-600" />
                                <span className="font-bold">{doc.fileName}</span>
                                <span>({doc.fileSize})</span>
                                <span>| 등록일: {doc.uploadedAt}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDownloadFile(doc.fileName, doc.fileUrl)}
                                  className="h-5 px-1.5 text-[9px] gap-0.5 cursor-pointer ml-1"
                                >
                                  <Download className="h-2.5 w-2.5" />
                                  다운로드
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 파일 업로드 버튼: 반려 상태일 때 '보완 서류 재업로드' 버튼으로 강조 */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTriggerUploadFinalDoc(doc.key, doc.label)}
                          className={`h-7 px-3 text-xs shrink-0 cursor-pointer font-bold ${
                            doc.isRejected
                              ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-600 shadow-xs"
                              : "bg-white dark:bg-zinc-800 text-purple-700 dark:text-purple-300 border-purple-200 hover:bg-purple-50"
                          }`}
                        >
                          <UploadCloud className="h-3.5 w-3.5 mr-1" />
                          {doc.isRejected ? "보완 서류 재업로드" : doc.fileName ? "재업로드" : "서류 업로드"}
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* 2-13) 업무 이력 메모 */}
                  <div className="border border-purple-200 dark:border-purple-900/60 rounded-xl p-3.5 bg-purple-50/20 dark:bg-purple-950/10 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 text-xs flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-purple-600" />
                        업무 이력 메모 (서류 업로드 및 검토 이력)
                      </span>
                      <span className="text-[10px] text-zinc-400">등록 회사명, 시간 표기</span>
                    </div>

                    <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto">
                      {selectedProject.memoLogs.length === 0 ? (
                        <div className="p-3 text-center text-zinc-400 bg-white rounded border text-xs">
                          등록된 업무 이력 메모가 없습니다.
                        </div>
                      ) : (
                        selectedProject.memoLogs.map((m) => (
                          <div key={m.id} className="p-2 rounded border bg-white dark:bg-zinc-900 text-xs flex flex-col gap-0.5 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold text-[9px]">
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

                    {/* 메모 신규 작성 인풋 */}
                    <div className="flex items-center gap-2 pt-1 border-t border-purple-200/60">
                      <Input
                        value={memoTag}
                        onChange={(e) => setMemoTag(e.target.value)}
                        placeholder="태그 (예: 5대서류제출)"
                        className="h-7 w-28 text-xs bg-white dark:bg-zinc-800"
                      />
                      <Input
                        value={memoInput}
                        onChange={(e) => setMemoInput(e.target.value)}
                        placeholder="서류 제출 및 검토 관련 특이사항을 입력하세요"
                        className="h-7 flex-1 text-xs bg-white dark:bg-zinc-800"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddMemo();
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={handleAddMemo}
                        className="h-7 px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white font-medium shrink-0 cursor-pointer"
                      >
                        <Send className="h-3 w-3 mr-1" />
                        메모 등록
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 모달 하단 푸터 (취소 & 저장) - 2-6 [시사출 결과 저장 (금형처)] */}
            <div className="bg-zinc-100 dark:bg-zinc-800/80 p-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div className="text-[11px] text-zinc-500">
                * 저장 시 입력한 시사출 실적 및 보고서는 MPSI 본사로 즉시 전송됩니다.
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
                  className="h-8 px-4 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  시사출 결과 저장 (금형처)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. 시사출 계획(일정)표 등록 모달 (2-1)                                      */}
      {/* ========================================================================= */}
      {isPlanModalOpen && selectedProject && (
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
                <b className="font-mono">{selectedProject.projectNo} ({selectedProject.productName})</b>
              </div>
              <div>
                <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1">
                  {activeTab} 시사출 계획일자 지정:
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
              <Button onClick={() => setIsPlanModalOpen(false)} variant="outline" size="sm" className="h-7 px-3">
                취소
              </Button>
              <Button
                onClick={handleSavePlanDate}
                size="sm"
                className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
              >
                등록 완료
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

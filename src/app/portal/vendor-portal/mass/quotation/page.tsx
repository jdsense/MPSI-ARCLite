"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  FileSpreadsheet, Upload, Download, Search, RefreshCw, 
  Eye, CheckCircle2, Clock, AlertCircle, Building2, Send, 
  MessageSquare, Check, X, Paperclip, Plus, ArrowRight, Factory, Gauge,
  DollarSign, Calculator, Edit3, Info, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DateRangeFilter, isWithinDateRange, DatePresetType } from "@/components/common/date-range-filter";
import { useAuthRole } from "@/lib/role-store";
import { 
  useMassQuotationStore, 
  MassProductionEstimateItem, 
  MassQuotationStatus 
} from "@/lib/mass-quotation-store";
import { sendAppNotification } from "@/lib/notification-store";

export default function VendorMassQuotationPage() {
  const { vendorName } = useAuthRole();
  const currentVendor = vendorName || "(주)뉴몰드";

  const { 
    estimates, 
    submitVendorQuote, 
    addComment,
    refreshFromDb,
    isLoading
  } = useMassQuotationStore();

  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDateType, setFilterDateType] = useState<"requestDate" | "submittedDate">("requestDate");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePresetType>("all");

  const [selectedItem, setSelectedItem] = useState<MassProductionEstimateItem | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [newComment, setNewComment] = useState("");

  // 마운트 시 DB 데이터 자동 동기화
  useEffect(() => {
    refreshFromDb();
  }, []);

  // estimates 변경 시 열려 있는 selectedItem 실시간 동기화
  useEffect(() => {
    if (selectedItem) {
      const found = estimates.find((e) => e.estimateNo === selectedItem.estimateNo || e.id === selectedItem.id);
      if (found) {
        setSelectedItem(found);
      }
    }
  }, [estimates]);

  // 모달 등에서 실시간 최신 상태를 참조할 수 있도록 동기화된 item 조회
  const currentItem = (selectedItem ? estimates.find((e) => e.estimateNo === selectedItem.estimateNo || e.projectNo === selectedItem.projectNo) : null) || selectedItem;

  // 프로젝트 관리번호 및 견적 관리번호 포맷 헬퍼 (요청 1-1, 1-2, 2 반영)
  const getProjectNoDisplay = (item: MassProductionEstimateItem) => {
    const isWon = item.status === "단가합의완료" || item.status === "양산계약확정" || (item.officialProjectNo && item.officialProjectNo.startsWith("MI"));
    return isWon ? (item.officialProjectNo || item.projectNo) : item.projectNo;
  };

  const getQuoteNoDisplay = (item: MassProductionEstimateItem) => {
    const pNo = getProjectNoDisplay(item);
    if (item.estimateNo && item.estimateNo.includes("사출견적")) return item.estimateNo;
    return `${pNo}사출견적`;
  };

  const [submitForm, setSubmitForm] = useState({
    finalUnitPrice: 0,
    quoteFileName: "",
    quoteFileSize: "",
    quoteFileUrl: "",
    targetCycleTime: 32,
    targetMassApprovalDate: "2026-08-30",
    massStartDate: "2026-09-15",
    machineTonnage: "450T 정밀사출기",
    materialCost: 0,
    processingCost: 0,
    overheadCost: 0,
    profitCost: 0,
    packagingCost: 0,
    logisticsCost: 0,
    submissionType: "최초 제출" as "최초 제출" | "수정 제출",
    vendorNotes: "",
    vendorComment: "",
    vendorMemo: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 실제 파일 스트리밍 다운로드
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

  const handleOpenSubmit = (item: MassProductionEstimateItem) => {
    setSelectedItem(item);
    const myQuote = getMyVendorQuote(item);
    const isAlreadySubmitted = !!myQuote;

    // 자사 제출 내역이 있으면 자사 내역으로 채우고, 미제출이면 0원/빈값으로 완전 격리 초기화
    const matCost = myQuote?.materialCost || 0;
    const procCost = myQuote?.processingCost || 0;
    const overCost = myQuote?.overheadCost || 0;
    const profCost = myQuote?.profitCost || 0;
    const packCost = myQuote?.packagingCost || 0;
    const logCost = myQuote?.logisticsCost || 0;
    const unitPrice = myQuote?.unitPrice || (matCost + procCost + overCost + profCost + packCost + logCost);

    setSubmitForm({
      finalUnitPrice: unitPrice,
      quoteFileName: myQuote?.quotationFileName || "",
      quoteFileSize: myQuote?.quotationFileSize || "",
      quoteFileUrl: myQuote?.quotationFileUrl || "",
      targetCycleTime: myQuote?.targetCycleTime || item.targetCycleTime || 0,
      targetMassApprovalDate: item.targetMassApprovalDate || "",
      massStartDate: item.massStartDate || "",
      machineTonnage: item.machineTonnage || "",
      materialCost: matCost,
      processingCost: procCost,
      overheadCost: overCost,
      profitCost: profCost,
      packagingCost: packCost,
      logisticsCost: logCost,
      submissionType: isAlreadySubmitted ? "수정 제출" : "최초 제출",
      vendorNotes: myQuote?.vendorNotes || "",
      vendorComment: "",
      vendorMemo: "",
    });
    setIsSubmitModalOpen(true);
  };

  // 6대 세부 원가 수기 입력 시 합계 단가 자동 계산
  const handleUpdateCost = (
    field: "materialCost" | "processingCost" | "overheadCost" | "profitCost" | "packagingCost" | "logisticsCost",
    value: number
  ) => {
    setSubmitForm((prev) => {
      const updated = { ...prev, [field]: value };
      const sum = Number(updated.materialCost || 0) + 
                  Number(updated.processingCost || 0) + 
                  Number(updated.overheadCost || 0) + 
                  Number(updated.profitCost || 0) + 
                  Number(updated.packagingCost || 0) + 
                  Number(updated.logisticsCost || 0);
      return {
        ...updated,
        finalUnitPrice: sum
      };
    });
  };

  // 실제 파일 업로드 핸들러
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      : `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

    setSubmitForm((prev) => ({
      ...prev,
      quoteFileName: file.name,
      quoteFileSize: sizeStr,
      quoteFileUrl: uploadedUrl || `/uploads/${encodeURIComponent(file.name)}`,
    }));
  };

  const handleSaveQuoteSubmit = () => {
    if (!selectedItem) return;
    if (Number(submitForm.finalUnitPrice) <= 0) {
      alert("양산 납품 견적단가를 입력해주세요.");
      return;
    }
    if (!submitForm.quoteFileName) {
      alert("양산 단가 원가계산서 파일(Excel/PDF)을 첨부해주세요.");
      return;
    }
    if (!submitForm.vendorMemo.trim()) {
      alert("견적 파일 업로드 전 메모(최초 또는 수정 제출 사유 및 특기사항)를 입력해 주세요.");
      return;
    }

    submitVendorQuote(selectedItem.estimateNo, {
      finalUnitPrice: Number(submitForm.finalUnitPrice),
      targetCycleTime: Number(submitForm.targetCycleTime),
      targetMassApprovalDate: submitForm.targetMassApprovalDate,
      massStartDate: submitForm.massStartDate,
      machineTonnage: submitForm.machineTonnage,
      estimateFileName: submitForm.quoteFileName,
      estimateFileSize: submitForm.quoteFileSize || "2.1 MB",
      estimateFileUrl: submitForm.quoteFileUrl,
      vendorNotes: submitForm.vendorNotes,
      vendorComment: submitForm.vendorComment || submitForm.vendorMemo,
      vendorMemo: submitForm.vendorMemo,
      submissionType: submitForm.submissionType,
      authorName: currentVendor,
      materialCost: Number(submitForm.materialCost || 0),
      processingCost: Number(submitForm.processingCost || 0),
      overheadCost: Number(submitForm.overheadCost || 0),
      profitCost: Number(submitForm.profitCost || 0),
      packagingCost: Number(submitForm.packagingCost || 0),
      logisticsCost: Number(submitForm.logisticsCost || 0),
    });

    // MPSI 본사로 알림 발송 (DB 연동)
    sendAppNotification({
      menuName: "양산견적관리",
      menuPath: "/portal/mass-prod/quotation",
      senderCompany: currentVendor,
      content: `[${getQuoteNoDisplay(selectedItem)}] 양산 견적서 제출 (단가: ${Number(submitForm.finalUnitPrice).toLocaleString()}원, C/T: ${submitForm.targetCycleTime}초)`,
      projectNo: selectedItem.projectNo || selectedItem.estimateNo,
      targetRole: "MPSI",
    });

    setIsSubmitModalOpen(false);
    alert(`[${getQuoteNoDisplay(selectedItem)}] MPSI로 양산 견적서가 성공적으로 제출되었습니다.\n기존 견적서 파일은 신규 파일로 교체되었으며, 제출 메모는 관리 이력으로 저장되었습니다.`);
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !selectedItem) return;
    const text = newComment.trim();
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const newCommentObj = {
      id: `comment-${Date.now()}`,
      author: currentVendor,
      authorRole: "VENDOR" as const,
      content: text,
      createdAt: timeStr,
    };

    // 1. 현재 모달의 selectedItem 상태 즉시 업데이트 (화면에 0초 만에 바로 등록되어 표시)
    setSelectedItem((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        comments: [...(prev.comments || []), newCommentObj],
      };
    });

    // 2. 스토어 및 백엔드 DB 영구 저장
    addComment(selectedItem.estimateNo, currentVendor, "VENDOR", text);

    // 3. MPSI 본사로 댓글 알림 발송
    sendAppNotification({
      menuName: "양산견적관리",
      menuPath: "/portal/mass-prod/quotation",
      senderCompany: currentVendor,
      content: `[${getQuoteNoDisplay(selectedItem)}] ${currentVendor} 견적 협의 메모: ${text}`,
      projectNo: selectedItem.projectNo || selectedItem.estimateNo,
      targetRole: "MPSI",
    });

    setNewComment("");
  };

  // 협력사 이름 정규화 유틸리티 ((주), 주식회사, 공백 제거 후 비교)
  const cleanVendorName = (name?: string) => {
    return (name || "").replace(/\(주\)|주식회사|\s/g, "").trim().toLowerCase();
  };

  const isMatchingVendor = (vendorA?: string, vendorB?: string) => {
    const a = cleanVendorName(vendorA);
    const b = cleanVendorName(vendorB);
    if (!a || !b) return false;
    return a === b || a.includes(b) || b.includes(a);
  };

  // 현재 외주업체에 실제 배포된 양산 견적 목록만 필터링 (배포 대상 협력사 보안 격리)
  const vendorEstimates = estimates.filter((item) => {
    // 1. MPSI 자체생산 건은 외주사에게 절대 비노출
    if (item.productionType === "IN_HOUSE") return false;

    // 2. MPSI가 전체 업체 일괄 배포한 건은 모든 양산 협력사에 노출
    if (item.assignedVendors?.includes("전체 업체")) return true;

    // 3. MPSI가 특정 협력사들을 지정하여 배포한 경우: 자사가 배포 대상에 포함되어 있을 때만 노출
    if (item.assignedVendors && item.assignedVendors.length > 0) {
      return item.assignedVendors.some((assigned) => isMatchingVendor(assigned, currentVendor));
    }

    // 4. 레거시 호환: 주 제작처 또는 최종 확정처가 자사인 경우만 노출
    return isMatchingVendor(item.vendorName, currentVendor) || isMatchingVendor(item.selectedVendorName, currentVendor);
  });

  // 자사 제출 견적건 조회 (MPSI 답변 포함)
  const getMyVendorQuote = (item: MassProductionEstimateItem) => {
    return (item.vendorQuotes || []).find((q) => isMatchingVendor(q.vendorName, currentVendor));
  };

  // 현재 로그인한 양산 협력사(자사) 관점 진행상태 판별 (MPSI 본사 대장과 100% 동기화)
  const getVendorSpecificStatus = (item: MassProductionEstimateItem): MassQuotationStatus => {
    // 1. MPSI 본사 진행상태가 명시되어 있는 경우 본사 상태 우선 동기화
    if (item.status === "양산계약확정" || item.status === "단가합의완료" || item.status === "원가검토중" || item.status === "반려/미성사") {
      return item.status;
    }
    // 2. 자사 제출 내역 확인
    const myQuote = getMyVendorQuote(item);
    if (myQuote) {
      if (myQuote.status === "수주확정") return "단가합의완료";
      if (myQuote.status === "검토협의") return "원가검토중";
      if (myQuote.status === "반려/미성사") return "반려/미성사";
      return item.status || "외주견적제출";
    }
    // 3. 자사가 아직 미제출한 경우 -> "견적요청"
    return item.status || "견적요청";
  };

  const filtered = vendorEstimates.filter((item) => {
    const quoteNo = getQuoteNoDisplay(item).toLowerCase();
    const projNo = getProjectNoDisplay(item).toLowerCase();
    const matchKey = filterKeyword
      ? item.projectNo.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        projNo.includes(filterKeyword.toLowerCase()) ||
        quoteNo.includes(filterKeyword.toLowerCase()) ||
        item.productName.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        item.estimateNo.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        item.resinSpec.toLowerCase().includes(filterKeyword.toLowerCase())
      : true;
    const myStatus = getVendorSpecificStatus(item);
    const matchStatus = filterStatus !== "ALL" ? myStatus === filterStatus : true;
    const targetDate = item[filterDateType];
    const matchDate = isWithinDateRange(targetDate, filterDateFrom, filterDateTo);
    return matchKey && matchStatus && matchDate;
  });

  const renderStatusBadge = (status: MassQuotationStatus) => {
    switch (status) {
      case "견적요청":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300">
            <Clock className="h-3 w-3 animate-pulse text-amber-600" />
            견적요청 (작성요망)
          </span>
        );
      case "자체진행":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-300">
            자체진행
          </span>
        );
      case "외주견적제출":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-300">
            <CheckCircle2 className="h-3 w-3 text-blue-600" />
            외주견적제출
          </span>
        );
      case "원가검토중":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 border border-yellow-300">
            <Calculator className="h-3 w-3 text-yellow-600" />
            원가검토/단가협의중
          </span>
        );
      case "단가합의완료":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-300">
            <Check className="h-3 w-3 text-teal-600" />
            단가합의완료
          </span>
        );
      case "양산계약확정":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            양산계약확정 (수주)
          </span>
        );
      case "반려/미성사":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300">
            <XCircle className="h-3 w-3 text-rose-600" />
            반려·미성사
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 헤더 배너 */}
      <div className="bg-blue-50 dark:bg-zinc-800/60 border border-blue-200 dark:border-zinc-700 rounded-md p-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <Factory className="h-5 w-5 text-blue-600" />
          <div>
            <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>[{currentVendor}] 양산 견적 관리</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold">
                MPSI 시스템 연동
              </span>
            </div>
            <div className="text-[11px] text-zinc-500">
              MPSI로부터 접수된 사출 양산 견적요청을 확인하고, 사출기 배정·C/T 기준 견적단가 및 계산서(Excel/PDF)를 작성하여 제출합니다.
            </div>
          </div>
        </div>
      </div>

      {/* 요약 카드 */}
      {/* <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-md border shadow-xs">
          <div className="text-[11px] text-zinc-400">총 접수 건수</div>
          <div className="text-base font-bold font-mono text-zinc-800 dark:text-zinc-100">
            {filtered.length}건
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-md border shadow-xs">
          <div className="text-[11px] text-zinc-400">견적서 작성 요청 (대기)</div>
          <div className="text-base font-bold font-mono text-amber-600">
            {filtered.filter((q) => q.status === "견적요청").length}건
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-md border shadow-xs">
          <div className="text-[11px] text-zinc-400">견적 제출 / 협의중</div>
          <div className="text-base font-bold font-mono text-blue-600">
            {filtered.filter((q) => q.status === "외주견적제출" || q.status === "원가검토중").length}건
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-md border shadow-xs">
          <div className="text-[11px] text-zinc-400">단가확정 / 계약</div>
          <div className="text-base font-bold font-mono text-emerald-600">
            {filtered.filter((q) => q.status === "단가합의완료" || q.status === "양산계약확정").length}건
          </div>
        </div>
      </div> */}

      {/* 검색 및 필터 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <Input
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.target.value)}
            placeholder="PJT 관리번호, 제품명, 수지스펙 검색..."
            className="h-7 w-48 text-xs"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-7 rounded-md border bg-transparent px-2 text-xs font-semibold"
          >
            <option value="ALL">전체 상태</option>
            <option value="견적요청">견적요청 (작성요망)</option>
            <option value="외주견적제출">외주견적제출</option>
            <option value="원가검토중">원가검토/단가협의중</option>
            <option value="단가합의완료">단가합의완료</option>
            <option value="양산계약확정">양산계약확정</option>
            <option value="반려/미성사">반려·미성사</option>
          </select>

          {/* 일자 기준 셀렉터 */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-zinc-500 shrink-0">일자 기준:</span>
            <select
              value={filterDateType}
              onChange={(e) => setFilterDateType(e.target.value as any)}
              className="h-7 rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-medium"
            >
              <option value="requestDate">견적요청일</option>
              <option value="submittedDate">견적제출일</option>
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

        <div className="flex items-center gap-2">
          <Button
            onClick={refreshFromDb}
            disabled={isLoading}
            variant="outline"
            className="h-7 px-2.5 text-xs gap-1 text-sky-700 dark:text-sky-300 border-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 cursor-pointer font-semibold"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin text-sky-600" : ""}`} />
            DB 동기화
          </Button>

          <Button
            onClick={() => {
              setFilterKeyword("");
              setFilterStatus("ALL");
              setFilterDateFrom("");
              setFilterDateTo("");
              setSelectedDatePreset("all");
            }}
            variant="outline"
            className="h-7 px-2.5 text-xs gap-1 text-zinc-600"
          >
            <RefreshCw className="h-3 w-3" />
            초기화
          </Button>

          <div className="text-[11px] text-zinc-500 shrink-0">
            표시 중: <b className="text-blue-600 font-mono">{filtered.length}</b>건
          </div>
        </div>
      </div>

      {/* 견적 리스트 테이블 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b text-[11px] text-zinc-500 font-semibold whitespace-nowrap">
              <th className="py-2.5 px-2 text-center w-10">No</th>
              <th className="py-2.5 px-2 text-center min-w-[85px]">진행상태</th>
              <th className="py-2.5 px-2 text-center min-w-[105px]">프로젝트 관리번호</th>
              <th className="py-2.5 px-2 text-center min-w-[130px]">견적 관리번호</th>
              <th className="py-2.5 px-2.5 min-w-[150px]">제품명 / 고객사</th>
              <th className="py-2.5 px-2 text-center min-w-[140px]">적용수지 / Cavity / 사출기</th>
              <th className="py-2.5 px-2 text-center min-w-[70px]">목표 C/T</th>
              <th className="py-2.5 px-2.5 text-right min-w-[90px]">월간 수량 (EA)</th>
              <th className="py-2.5 px-2.5 text-right min-w-[110px]">제출 견적단가 (원/EA)</th>
              <th className="py-2.5 px-2 text-center min-w-[85px]">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-zinc-400">
                  접수된 양산 견적 요청 내역이 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((item, idx) => {
                const projectNoDisplay = getProjectNoDisplay(item);
                const quoteNoDisplay = getQuoteNoDisplay(item);
                const myQuote = getMyVendorQuote(item);
                const myStatus = getVendorSpecificStatus(item);

                return (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors ${
                      myStatus === "견적요청" ? "bg-amber-50/20" : ""
                    }`}
                  >
                    <td className="py-2 px-2 text-center text-zinc-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      {renderStatusBadge(myStatus)}
                    </td>
                    {/* 1-1) 프로젝트 관리번호 (수주 시 MI26001P0, 미수주 시 Q26001-01) */}
                    <td className="py-2 px-2 text-center whitespace-nowrap font-mono font-bold">
                      <span className={projectNoDisplay.startsWith("MI") ? "text-purple-700 dark:text-purple-300" : "text-sky-700 dark:text-sky-300"}>
                        {projectNoDisplay}
                      </span>
                    </td>
                    {/* 1-2) 견적 관리번호 (수주 시 MI26001P0사출견적, 미수주 시 Q26001-01사출견적) */}
                    <td className="py-2 px-2 text-center whitespace-nowrap font-mono font-bold text-zinc-800 dark:text-zinc-200">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border text-[10.5px]">
                        {quoteNoDisplay}
                      </span>
                    </td>
                    <td className="py-2 px-2.5">
                      <div className="font-bold text-zinc-800 dark:text-zinc-200">
                        {item.productName}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {item.customerName}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <div className="text-zinc-700 dark:text-zinc-300 font-medium">
                        {item.resinSpec}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {item.cavity} · {item.machineTonnage}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center font-mono text-blue-600 font-bold whitespace-nowrap">
                      {item.targetCycleTime > 0 ? `${item.targetCycleTime}초` : "-"}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono text-zinc-600 whitespace-nowrap">
                      {item.monthlyVolume > 0 ? `${item.monthlyVolume.toLocaleString()} EA` : "-"}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold whitespace-nowrap">
                      {myQuote && (myQuote.unitPrice || 0) > 0 ? (
                        <span className="text-blue-600 font-bold">{(myQuote.unitPrice || 0).toLocaleString()}원</span>
                      ) : (
                        <span className="text-zinc-400 italic">견적서 미제출</span>
                      )}
                    </td>
                    {/* 1-3) 작업 버튼 영역 (자사 제출 여부에 따라 견적서 작성 / 수정제출 분기) */}
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {!myQuote ? (
                          <Button
                            onClick={() => handleOpenSubmit(item)}
                            size="xs"
                            className="h-6 text-[11px] px-2.5 bg-amber-500 hover:bg-amber-600 text-white gap-1 font-bold shadow-xs cursor-pointer animate-pulse"
                          >
                            <Edit3 className="h-3 w-3" />
                            견적서 작성
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleOpenSubmit(item)}
                            size="xs"
                            variant="outline"
                            className="h-6 text-[11px] px-2 text-zinc-700 hover:text-blue-600 cursor-pointer"
                          >
                            <Upload className="h-3 w-3" />
                            수정제출
                          </Button>
                        )}
                        <Button
                          onClick={() => {
                            setSelectedItem(item);
                            setIsDetailModalOpen(true);
                          }}
                          size="xs"
                          variant="ghost"
                          className="h-6 text-[11px] px-1.5 text-zinc-600 hover:text-zinc-900 cursor-pointer"
                          title="상세보기"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 2 & 3. 사출 양산 견적서 작성 및 제출 모달 */}
      {isSubmitModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border rounded-lg shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* 2. 견적서 제출 양식의 제목 수정 */}
            <div className="flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-950/50 border-b">
              <div className="flex items-center gap-2">
                <Factory className="h-4 w-4 text-blue-600" />
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  사출 양산 견적서 작성 및 제출 ({getQuoteNoDisplay(selectedItem)})
                </span>
                <span className="text-[10.5px] px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold">
                  MPSI 시스템 연동
                </span>
              </div>
              <button onClick={() => setIsSubmitModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex flex-col gap-3.5 text-xs">
              {/* MPSI 요청 정보 요약 */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-md border space-y-1.5">
                <div className="font-bold text-blue-700 dark:text-blue-400 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-blue-600" />
                    <span>MPSI 양산 견적 요청 요건</span>
                    <span className="text-[10px] font-normal text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded font-mono">
                      PJT: {getProjectNoDisplay(selectedItem)}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-zinc-600 dark:text-zinc-300">
                    월간 소요량: {selectedItem.monthlyVolume?.toLocaleString() || 40000} EA
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-zinc-700 dark:text-zinc-300 pt-1">
                  <div>· 제품명: <b className="text-zinc-900 dark:text-zinc-100">{selectedItem.productName}</b></div>
                  <div>· 고객사: <b>{selectedItem.customerName}</b></div>
                  <div>· 수지(Resin): <b className="font-mono text-emerald-700 dark:text-emerald-400">{selectedItem.resinSpec}</b></div>
                  <div>· Cavity/사출기: <b>{selectedItem.cavity} / {selectedItem.machineTonnage}</b></div>
                </div>
                {selectedItem.notes && (
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 pt-1 border-t">
                    요청비고: {selectedItem.notes}
                  </div>
                )}
              </div>

              {/* 3-1, 3-2, 3-3: 목표 C/T, 양산 승인 납기일, 양산 예정일 입력 섹션 */}
              <div className="border rounded-md p-3.5 bg-blue-50/30 dark:bg-zinc-800/40 space-y-2">
                <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                    <Clock className="h-3.5 w-3.5" />
                    1. 핵심 공정 C/T 및 일정 계획
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    ※ 목표 C/T 및 양산 승인 납기일, 양산 예정일을 입력합니다.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* 3-1. 목표 CT 입력 */}
                  <div>
                    <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1 flex items-center gap-1">
                      <span>3-1. 목표 C/T (초)</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={1}
                        value={submitForm.targetCycleTime || ""}
                        onChange={(e) => setSubmitForm({ ...submitForm, targetCycleTime: Number(e.target.value) })}
                        placeholder="예: 32"
                        className="h-7 text-xs font-mono font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-zinc-900"
                      />
                      <span className="text-xs font-bold text-zinc-600 shrink-0">초</span>
                    </div>
                  </div>

                  {/* 3-2. 양산 승인 납기일 입력 */}
                  <div>
                    <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1 flex items-center gap-1">
                      <span>3-2. 양산 승인 납기일</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={submitForm.targetMassApprovalDate}
                      onChange={(e) => setSubmitForm({ ...submitForm, targetMassApprovalDate: e.target.value })}
                      className="h-7 text-xs font-mono font-bold bg-white dark:bg-zinc-900"
                    />
                  </div>

                  {/* 3-3. 양산 예정일 입력 */}
                  <div>
                    <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1 flex items-center gap-1">
                      <span>3-3. 양산 예정일</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={submitForm.massStartDate}
                      onChange={(e) => setSubmitForm({ ...submitForm, massStartDate: e.target.value })}
                      className="h-7 text-xs font-mono font-bold bg-white dark:bg-zinc-900"
                    />
                  </div>
                </div>
              </div>

              {/* 3-4. 견적 단가 및 정보 입력 (미니 테이블 + 6대 세부 원가 구성) */}
              <div className="border rounded-md p-3.5 bg-white dark:bg-zinc-900 space-y-3">
                <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
                    <DollarSign className="h-3.5 w-3.5 text-blue-600" />
                    2. 3-4. 견적 단가 및 정보 입력
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    ※ 세부 원가(6대 항목)를 입력하면 견적 제출 단가가 자동 산출됩니다.
                  </span>
                </div>

                {/* 미니 테이블 (순, 업체명, 제출일자, 견적 제출 단가) */}
                <div className="border rounded overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-100 dark:bg-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-300 font-semibold border-b">
                        <th className="py-1.5 px-3 text-center w-12 border-r">순</th>
                        <th className="py-1.5 px-3 border-r">업체명</th>
                        <th className="py-1.5 px-3 border-r text-center w-32">제출일자</th>
                        <th className="py-1.5 px-3 text-right">견적 제출 단가 (원/EA)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-blue-50/30 dark:bg-blue-950/20">
                        <td className="py-2 px-3 text-center font-mono border-r text-zinc-500">1</td>
                        <td className="py-2 px-3 font-bold text-zinc-800 dark:text-zinc-200 border-r">{currentVendor}</td>
                        <td className="py-2 px-3 text-center font-mono border-r text-zinc-600">
                          {new Date().toISOString().split("T")[0]}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                          {submitForm.finalUnitPrice ? `${submitForm.finalUnitPrice.toLocaleString()}원` : "0원"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 6대 세부 원가 구성 (재료비, 사출가공비, 일반관리비, 이윤, 포장비, 운송비) */}
                <div>
                  <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                    세부 원가 구성 (EA당, 수기 입력)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    <div>
                      <label className="text-[10.5px] text-zinc-500 block mb-1">재료비 (원)</label>
                      <CurrencyInput
                        value={submitForm.materialCost}
                        onChange={(val) => handleUpdateCost("materialCost", val)}
                        placeholder="예: 700"
                        className="h-7 text-xs font-mono font-bold bg-white dark:bg-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10.5px] text-zinc-500 block mb-1">사출가공비 (원)</label>
                      <CurrencyInput
                        value={submitForm.processingCost}
                        onChange={(val) => handleUpdateCost("processingCost", val)}
                        placeholder="예: 700"
                        className="h-7 text-xs font-mono font-bold bg-white dark:bg-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10.5px] text-zinc-500 block mb-1">일반관리비 (원)</label>
                      <CurrencyInput
                        value={submitForm.overheadCost}
                        onChange={(val) => handleUpdateCost("overheadCost", val)}
                        placeholder="예: 60"
                        className="h-7 text-xs font-mono font-bold bg-white dark:bg-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10.5px] text-zinc-500 block mb-1">이윤 (원)</label>
                      <CurrencyInput
                        value={submitForm.profitCost}
                        onChange={(val) => handleUpdateCost("profitCost", val)}
                        placeholder="예: 40"
                        className="h-7 text-xs font-mono font-bold bg-white dark:bg-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10.5px] text-zinc-500 block mb-1">포장비 (원)</label>
                      <CurrencyInput
                        value={submitForm.packagingCost}
                        onChange={(val) => handleUpdateCost("packagingCost", val)}
                        placeholder="예: 700"
                        className="h-7 text-xs font-mono font-bold bg-white dark:bg-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10.5px] text-zinc-500 block mb-1">운송비 (원)</label>
                      <CurrencyInput
                        value={submitForm.logisticsCost}
                        onChange={(val) => handleUpdateCost("logisticsCost", val)}
                        placeholder="예: 70,000"
                        className="h-7 text-xs font-mono font-bold bg-white dark:bg-zinc-900"
                      />
                    </div>
                  </div>
                </div>

                {/* 단가 합계 바 */}
                <div className="p-2.5 rounded-md bg-blue-50/70 border border-blue-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-900 font-bold text-xs">
                      견적 제출 단가 합계 (원/EA):
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      (재료비 + 가공비 + 일반관리비 + 이윤 + 포장비 + 운송비)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CurrencyInput
                      value={submitForm.finalUnitPrice}
                      onChange={(val) => setSubmitForm({ ...submitForm, finalUnitPrice: val })}
                      className="h-7 w-28 text-right font-mono font-bold text-blue-700 text-sm bg-white"
                    />
                    <span className="font-bold text-xs text-blue-900">원 / EA</span>
                  </div>
                </div>
              </div>

              {/* 3-5. 견적서 세부 양식 첨부 및 업무 이력 메모 (제출 이력 기록) */}
              <div className="border rounded-md p-3.5 bg-zinc-50/50 dark:bg-zinc-800/40 space-y-3">
                <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center justify-between pb-1 border-b">
                  <span className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
                    <Paperclip className="h-3.5 w-3.5 text-blue-600" />
                    3. 3-5. 견적서 세부 양식 첨부 및 업무 이력 메모
                  </span>
                  <span className="text-red-500 font-medium text-[11px]">
                    * 세부 양식 첨부 및 제출 메모 필수
                  </span>
                </div>

                {/* 견적서 파일 첨부 */}
                <div>
                  <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1">
                    양산 견적서 / 세부 원가계산서 파일 (Excel, PDF) <span className="text-red-500">*</span>
                  </label>
                  <div className="border border-dashed rounded-md p-2.5 flex items-center justify-between bg-white dark:bg-zinc-900">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".xlsx,.xls,.pdf"
                    />
                    {submitForm.quoteFileName ? (
                      <div className="flex items-center gap-2 truncate">
                        <FileSpreadsheet className="h-5 w-5 text-blue-600 shrink-0" />
                        <div className="truncate">
                          <div className="font-bold text-zinc-900 dark:text-zinc-100 text-[11.5px] truncate">
                            {submitForm.quoteFileName}
                          </div>
                          <div className="text-[10px] text-zinc-400">{submitForm.quoteFileSize || "1.8 MB"}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-zinc-400 text-xs">
                        양산 단가 원가계산서 세부 파일(Excel/PDF)을 첨부하세요
                      </div>
                    )}
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      size="xs"
                      className="h-7 text-xs gap-1 border-blue-500 text-blue-700 hover:bg-blue-50 shrink-0 cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      파일 선택
                    </Button>
                  </div>
                </div>

                {/* 업무 이력 메모 입력 박스 */}
                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-md space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-950 dark:text-blue-300 text-xs flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-blue-700" />
                      업무 이력 메모 (제출 사유 및 특기사항)
                      <span className="text-[10px] font-normal text-blue-700 bg-blue-200/60 px-1.5 py-0.2 rounded">
                        관리 이력
                      </span>
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="submissionType"
                          checked={submitForm.submissionType === "최초 제출"}
                          onChange={() => setSubmitForm({ ...submitForm, submissionType: "최초 제출" })}
                        />
                        <span>최초 제출</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer text-blue-700 dark:text-blue-300 font-bold">
                        <input
                          type="radio"
                          name="submissionType"
                          checked={submitForm.submissionType === "수정 제출"}
                          onChange={() => setSubmitForm({ ...submitForm, submissionType: "수정 제출" })}
                        />
                        <span>수정 제출 (재견적)</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <textarea
                      value={submitForm.vendorMemo}
                      onChange={(e) => setSubmitForm({ ...submitForm, vendorMemo: e.target.value })}
                      rows={2}
                      placeholder="견적 파일 업로드 전 메모를 입력하세요 (예: 450T 정밀사출기 배정, 원재료비 수지단가 인상분 반영 초도 제출)..."
                      className="w-full rounded border bg-white dark:bg-zinc-900 p-2 text-xs"
                    />
                  </div>

                  {/* 관리 이력 안내 배너 */}
                  <div className="text-[10.5px] text-zinc-600 dark:text-zinc-400 bg-white/80 dark:bg-zinc-900/80 p-2 rounded border border-blue-100 dark:border-zinc-700 flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span>
                      ※ <b>견적서 파일 교체 및 이력 보존 안내</b>: 수정된 견적서 첨부 시 기존 견적서 파일은 신규 파일로 자동 대체(기존 파일 삭제)되지만, 제출 당시의 메모·등록회사명·시간·제출 금액은 <b>관리 이력으로 체계적으로 관리</b>됩니다.
                    </span>
                  </div>

                  {/* 누적 관리 이력 리스트 - 자사(currentVendor) 이력만 격리 필터링 */}
                  {(() => {
                    const myHistory = (selectedItem.submissionHistory || []).filter((hist) => 
                      isMatchingVendor(hist.author, currentVendor)
                    );
                    if (myHistory.length === 0) return null;

                    return (
                      <div className="mt-2 pt-2 border-t border-blue-200/80">
                        <div className="text-[11px] font-bold text-blue-950 dark:text-blue-300 mb-1.5 flex items-center justify-between">
                          <span>[{currentVendor}] 제출 메모 및 견적 관리 이력 ({myHistory.length}건)</span>
                          <span className="text-[10px] text-zinc-400 font-normal">자사 과거 제출 이력</span>
                        </div>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {myHistory.map((hist) => (
                            <div key={hist.id} className="p-2 rounded bg-white dark:bg-zinc-900 border border-blue-100 dark:border-zinc-700 text-[11px] shadow-2xs">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                    hist.submissionType === "수정 제출" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                                  }`}>
                                    [{hist.revisionNo}차] {hist.submissionType}
                                  </span>
                                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{hist.author}</span>
                                  <span className="text-zinc-400 font-mono text-[10px]">{hist.submittedAt}</span>
                                </div>
                                <div className="font-mono font-bold text-blue-700 dark:text-blue-300">
                                  {hist.finalUnitPrice.toLocaleString()}원/EA
                                  {hist.targetCycleTime && <span className="text-zinc-500 font-normal ml-1">({hist.targetCycleTime}초)</span>}
                                </div>
                              </div>
                              <div className="bg-zinc-50 dark:bg-zinc-800 p-1.5 rounded text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                                {hist.memo}
                              </div>
                              <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-400">
                                <span className="flex items-center gap-1">
                                  <FileSpreadsheet className="h-3 w-3 text-emerald-600" />
                                  당시 첨부: <b className="text-zinc-600 dark:text-zinc-300">{hist.fileName}</b> {hist.fileSize && `(${hist.fileSize})`}
                                </span>
                                <span className="text-blue-600 dark:text-blue-400">관리 이력</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* 4. MPSI ↔ 협력사 단가 협의 및 전체 소견 (MPSI 및 자사 댓글만 필터링) */}
              {(() => {
                const visibleComments = (currentItem?.comments || []).filter((c) => 
                  c.authorRole === "MPSI" || isMatchingVendor(c.author, currentVendor)
                );
                if (visibleComments.length === 0) return null;

                return (
                  <div className="border rounded-md p-3 bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 space-y-2">
                    <div className="font-bold text-xs text-blue-950 dark:text-blue-300 flex items-center justify-between pb-1 border-b border-blue-200/80">
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" />
                        4. MPSI 본사 단가 협의 및 검토 피드백 이력 ({visibleComments.length}건)
                      </span>
                      <span className="text-[10px] text-blue-600 bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded font-normal">
                        MPSI 실시간 동기화
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {visibleComments.map((c) => (
                        <div key={c.id} className="p-2 rounded border bg-white dark:bg-zinc-900 text-xs shadow-2xs">
                          <div className="flex items-center justify-between font-bold mb-0.5">
                            <span className={c.authorRole === "MPSI" ? "text-blue-700 dark:text-blue-300 font-bold" : "text-emerald-700 dark:text-emerald-300"}>
                              {c.author}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">{c.createdAt}</span>
                          </div>
                          <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 3-6. 견적 제출 버튼 */}
            <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-t flex justify-end gap-2">
              <Button onClick={() => setIsSubmitModalOpen(false)} variant="outline" className="h-7 text-xs">
                취소
              </Button>
              <Button 
                onClick={handleSaveQuoteSubmit} 
                className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1 font-bold shadow-xs cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                MPSI로 견적서 제출
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 상세 보기 모달 */}
      {isDetailModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-b">
              <div className="flex items-center gap-2">
                <Factory className="h-4 w-4 text-blue-600" />
                <span className="font-bold text-sm">
                  [{getQuoteNoDisplay(selectedItem)}] {selectedItem.productName} 견적 상세
                </span>
                {renderStatusBadge(getVendorSpecificStatus(selectedItem))}
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex flex-col gap-3 text-xs">
              {/* 프로젝트 & 견적 번호 요약 바 */}
              <div className="p-2.5 rounded bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-zinc-400 text-[10px] block">프로젝트 관리번호</span>
                    <span className="font-mono font-bold text-purple-700 dark:text-purple-300">{getProjectNoDisplay(selectedItem)}</span>
                  </div>
                  <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700" />
                  <div>
                    <span className="text-zinc-400 text-[10px] block">견적 관리번호</span>
                    <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{getQuoteNoDisplay(selectedItem)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-zinc-400 text-[10px] block">고객사 · 월간 수량</span>
                  <span className="font-bold">{selectedItem.customerName} · {selectedItem.monthlyVolume?.toLocaleString() || 40000} EA</span>
                </div>
              </div>

              {/* 핵심 납기 및 단가 정보 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-md border text-center">
                <div>
                  <span className="text-zinc-400 text-[10px] block">제출 견적단가</span>
                  <span className="font-mono font-bold text-blue-600 text-sm">
                    {(() => {
                      const myQuote = getMyVendorQuote(selectedItem);
                      const myPrice = myQuote?.unitPrice || 0;
                      return myPrice > 0 ? `${myPrice.toLocaleString()}원/EA` : "미제출";
                    })()}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 text-[10px] block">목표 C/T</span>
                  <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{selectedItem.targetCycleTime || "-"}초</span>
                </div>
                <div>
                  <span className="text-zinc-400 text-[10px] block">양산 승인 납기일</span>
                  <span className="font-mono font-bold text-purple-700 dark:text-purple-300">{selectedItem.targetMassApprovalDate || "-"}</span>
                </div>
                <div>
                  <span className="text-zinc-400 text-[10px] block">양산 예정일</span>
                  <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{selectedItem.massStartDate || "-"}</span>
                </div>
              </div>

              {/* 협력사 세부 원가 산출 내역 (6대 원가 구성비) */}
              {(() => {
                const myQuote = getMyVendorQuote(selectedItem);
                const isMyItem = isMatchingVendor(selectedItem.vendorName, currentVendor);
                const matCost = myQuote?.materialCost || (isMyItem ? selectedItem.materialCost : 0);
                const procCost = myQuote?.processingCost || (isMyItem ? selectedItem.processingCost : 0);
                const overCost = myQuote?.overheadCost || (isMyItem ? (selectedItem as any).overheadCost : 0) || 60;
                const profCost = myQuote?.profitCost || (isMyItem ? (selectedItem as any).profitCost : 0) || 40;
                const packCost = myQuote?.packagingCost || (isMyItem ? selectedItem.packagingCost : 0);
                const logCost = myQuote?.logisticsCost || (isMyItem ? selectedItem.logisticsCost : 0);
                const unitPrice = myQuote?.unitPrice || (matCost + procCost + overCost + profCost + packCost + logCost);
                const submittedDate = myQuote?.submittedDate || (isMyItem ? selectedItem.submittedDate : "") || new Date().toISOString().split("T")[0];

                if (!matCost && !procCost && !packCost && !logCost && !myQuote) return null;

                const displayVendorName = myQuote?.vendorName || (isMyItem ? selectedItem.vendorName : currentVendor);

                return (
                  <div className="p-3 bg-white dark:bg-zinc-900 border rounded-md space-y-2">
                    <div className="flex items-center justify-between font-bold text-xs pb-1 border-b">
                      <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                        <DollarSign className="h-3.5 w-3.5" />
                        1. [{displayVendorName}] 세부 원가 산출 내역 (6대 원가 구성비)
                      </span>
                      <span className="text-[11px] text-zinc-500 font-mono font-normal">
                        제출일자: <b className="text-zinc-700 dark:text-zinc-300">{submittedDate}</b> (목표 C/T {selectedItem.targetCycleTime || 35}초)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-7 gap-1.5 text-center text-xs">
                      <div className="bg-zinc-50 dark:bg-zinc-800 p-2 rounded border">
                        <span className="text-[10px] text-zinc-400 block">재료비</span>
                        <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                          {matCost ? `${matCost.toLocaleString()}원` : "0원"}
                        </span>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-800 p-2 rounded border">
                        <span className="text-[10px] text-zinc-400 block">가공비(임가공)</span>
                        <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                          {procCost ? `${procCost.toLocaleString()}원` : "0원"}
                        </span>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-800 p-2 rounded border">
                        <span className="text-[10px] text-zinc-400 block">일반관리비</span>
                        <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                          {overCost ? `${overCost.toLocaleString()}원` : "0원"}
                        </span>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-800 p-2 rounded border">
                        <span className="text-[10px] text-zinc-400 block">이윤</span>
                        <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                          {profCost ? `${profCost.toLocaleString()}원` : "0원"}
                        </span>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-800 p-2 rounded border">
                        <span className="text-[10px] text-zinc-400 block">포장비</span>
                        <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                          {packCost ? `${packCost.toLocaleString()}원` : "0원"}
                        </span>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-800 p-2 rounded border">
                        <span className="text-[10px] text-zinc-400 block">운송비</span>
                        <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                          {logCost ? `${logCost.toLocaleString()}원` : "0원"}
                        </span>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-950/40 p-2 rounded border border-blue-300">
                        <span className="text-[10px] text-blue-700 font-bold block">합계 단가</span>
                        <span className="font-mono font-bold text-blue-900 dark:text-blue-200">
                          {unitPrice ? `${unitPrice.toLocaleString()}원` : "0원"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 현재 첨부 견적서 파일 - 자사 제출 건만 표시 */}
              {(() => {
                const myQuote = getMyVendorQuote(selectedItem);
                const isMyItem = isMatchingVendor(selectedItem.vendorName, currentVendor);
                const fileName = myQuote?.quotationFileName || (isMyItem ? selectedItem.estimateFileName : undefined);
                const fileSize = myQuote?.quotationFileSize || (isMyItem ? selectedItem.estimateFileSize : "첨부 완료");
                const fileUrl = myQuote?.quotationFileUrl || (isMyItem ? selectedItem.estimateFileUrl : undefined);

                if (!fileName) return null;

                return (
                  <div className="bg-blue-50/70 dark:bg-blue-950/30 p-2.5 rounded-md border border-blue-200 dark:border-blue-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                      <div>
                        <span className="font-bold block text-[11.5px]">{fileName}</span>
                        <span className="text-[10px] text-zinc-400">{fileSize}</span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleDownloadFile(fileName, fileUrl)}
                      size="xs" 
                      className="h-6 text-xs bg-blue-600 hover:bg-blue-700 text-white cursor-pointer font-semibold shadow-xs"
                    >
                      다운로드
                    </Button>
                  </div>
                );
              })()}

              {/* 견적 제출 메모 및 관리 이력 (자사 제출 기록만 필터링 격리) */}
              {selectedItem.submissionHistory && selectedItem.submissionHistory.length > 0 && (() => {
                const myHistory = selectedItem.submissionHistory.filter(h => isMatchingVendor(h.author, currentVendor));
                if (myHistory.length === 0) return null;
                return (
                  <div className="border rounded-md p-3 flex flex-col gap-2">
                    <div className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-between pb-1 border-b">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                        <span>자사 견적 제출 메모 및 관리 이력 ({myHistory.length}건)</span>
                      </div>
                      <span className="text-[10px] text-blue-600 font-normal">관리 이력</span>
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {myHistory.map((hist) => (
                        <div key={hist.id} className="p-2 rounded bg-zinc-50 dark:bg-zinc-800 border text-xs">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">
                              [{hist.revisionNo}차 {hist.submissionType}] {hist.author}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">{hist.submittedAt}</span>
                          </div>
                          <div className="text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 p-1.5 rounded my-1">
                            {hist.memo}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-zinc-400">
                            <span>제출 단가: <b className="text-blue-600">{hist.finalUnitPrice.toLocaleString()}원</b></span>
                            <span>파일: {hist.fileName}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* 협의 이력 */}
              {(() => {
                const targetItem = selectedItem || currentItem;
                const visibleComments = (targetItem?.comments || []).filter(
                  (c) => c.authorRole === "MPSI" || isMatchingVendor(c.author, currentVendor)
                );

                return (
                  <div className="border rounded-md p-3 flex flex-col gap-2">
                    <div className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-between pb-1 border-b">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                        <span>MPSI ↔ {currentVendor} 단가/일정 협의 이력 ({visibleComments.length}건)</span>
                      </div>
                      <span className="text-[10px] text-blue-600 font-normal">실시간 소통</span>
                    </div>
                    <div className="flex items-start gap-1.5 bg-zinc-50 dark:bg-zinc-800 p-2 rounded-md border">
                      <textarea 
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="MPSI에 전달할 사출 단가 및 일정 협의 내용을 입력하세요..."
                        className="w-full h-12 p-1.5 text-xs bg-white dark:bg-zinc-900 border rounded resize-none"
                      />
                      <Button onClick={handleAddComment} size="xs" className="h-12 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs cursor-pointer font-bold">
                        등록
                      </Button>
                    </div>
                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                      {visibleComments.length === 0 ? (
                        <div className="p-3 text-center text-zinc-400 text-xs">
                          등록된 협의 메모가 없습니다. 위의 입력창에 작성 후 [등록]을 눌러주세요.
                        </div>
                      ) : (
                        visibleComments.map((c) => (
                          <div key={c.id} className="p-2 rounded border bg-zinc-50 dark:bg-zinc-800 text-xs shadow-2xs">
                            <div className="flex items-center justify-between font-bold mb-0.5">
                              <span className={c.authorRole === "MPSI" ? "text-blue-700 dark:text-blue-300 font-bold" : "text-emerald-700 dark:text-emerald-300 font-bold"}>
                                {c.author}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-mono">{c.createdAt}</span>
                            </div>
                            <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{c.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-t flex justify-end">
              <Button onClick={() => setIsDetailModalOpen(false)} className="h-7 text-xs px-4 cursor-pointer">
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

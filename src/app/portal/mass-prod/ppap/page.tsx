"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Search, RefreshCw, FileCheck2, CheckCircle2, XCircle, 
  Layers, ExternalLink, Download, UploadCloud, Eye, 
  X, Check, AlertTriangle, FileText, Factory, Clock, 
  ShieldCheck, FileCode, CheckSquare, Send, ArrowUpRight,
  MessageSquare, PlusCircle, Paperclip, Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangeFilter, isWithinDateRange, DatePresetType } from "@/components/common/date-range-filter";
import { useProjectMaster } from "@/lib/project-store";
import { sendAppNotification } from "@/lib/notification-store";

import { 
  useMassPpapStore, 
  PPAPApprovalItem, 
  PPAPPackageSubmissionHistoryItem,
  getMassPpapStatus 
} from "@/lib/mass-ppap-store";

export default function MassProdPPAPPage() {
  const { 
    items, 
    isLoading,
    refreshFromDb,
    reviewMpsiDecision, 
    reviewRoundSubmission,
    submitPackageSubmission, 
  } = useMassPpapStore();

  const { updateStep } = useProjectMaster();

  // 검색 및 필터 상태
  const [filterProjectNo, setFilterProjectNo] = useState("");
  const [filterProductName, setFilterProductName] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterMassVendor, setFilterMassVendor] = useState("ALL");
  const [filterMoldVendor, setFilterMoldVendor] = useState("ALL");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePresetType>("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 심사/상세 모달 상태
  const [selectedItem, setSelectedItem] = useState<PPAPApprovalItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 모달 내부 편집 상태
  const [mpsiOpinionText, setMpsiOpinionText] = useState("");
  const [rejectReasonText, setRejectReasonText] = useState("");

  // 회차별 승인/반려 인라인 메모 입력 상태
  const [reviewingRound, setReviewingRound] = useState<number | null>(null);
  const [reviewingAction, setReviewingAction] = useState<"승인" | "반려" | null>(null);
  const [roundComment, setRoundComment] = useState("");

  // MPSI 서류 패키지 신규/수정본 직접 업로드 폼 토글 및 상태
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadFileSize, setUploadFileSize] = useState("3.5 MB");
  const [uploadFileUrl, setUploadFileUrl] = useState("");
  const [uploadMemo, setUploadMemo] = useState("");
  const [uploadAuthor, setUploadAuthor] = useState("MPSI");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // items 변경 시 열려 있는 모달의 selectedItem 동기화
  useEffect(() => {
    if (selectedItem) {
      const refreshed = items.find(i => i.id === selectedItem.id || i.projectNo === selectedItem.projectNo);
      if (refreshed) {
        setSelectedItem(refreshed);
      }
    }
  }, [items]);

  // 실제 스트리밍 파일 다운로드 함수
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

  // 실제 물리 파일 업로드
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
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
        console.warn("File upload fallback:", err);
      } finally {
        setIsUploading(false);
      }

      const sizeStr = file.size < 1024 * 1024
        ? `${Math.round(file.size / 1024)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

      setUploadFileName(file.name);
      setUploadFileSize(sizeStr);
      setUploadFileUrl(uploadedUrl || `/api/v1/files/download?fileName=${encodeURIComponent(file.name)}`);
      showToast(`[${file.name}] 파일이 첨부되었습니다.`);
    }
  };

  // 검색 필터 적용 (더미 데이터 배제)
  const filteredData = items.filter((item) => {
    if (
      item.projectName?.includes("현대 NT5") ||
      item.projectName?.includes("NQ5") ||
      item.projectNo === "MI25001P1" ||
      item.projectNo === "MI25001P2"
    ) {
      return false;
    }
    const status = getMassPpapStatus(item);
    const matchNo = filterProjectNo 
      ? (item.projectNo.toLowerCase().includes(filterProjectNo.toLowerCase()) || 
         item.partNo.toLowerCase().includes(filterProjectNo.toLowerCase()) ||
         item.moldNo.toLowerCase().includes(filterProjectNo.toLowerCase()))
      : true;
    const matchProd = filterProductName ? item.productName.includes(filterProductName) : true;
    const matchStatus = filterStatus !== "ALL" ? status === filterStatus : true;
    const matchMass = filterMassVendor !== "ALL" ? item.massVendor === filterMassVendor : true;
    const matchMold = filterMoldVendor !== "ALL" ? item.moldVendor === filterMoldVendor : true;
    const matchDate = isWithinDateRange(item.updatedAt, filterDateFrom, filterDateTo);
    return matchNo && matchProd && matchStatus && matchMass && matchMold && matchDate;
  });

  const handleReset = () => {
    setFilterProjectNo("");
    setFilterProductName("");
    setFilterStatus("ALL");
    setFilterMassVendor("ALL");
    setFilterMoldVendor("ALL");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSelectedDatePreset("all");
  };

  // 심사 모달 열기
  const handleOpenReview = (item: PPAPApprovalItem) => {
    setSelectedItem(item);
    setMpsiOpinionText(item.mpsiOpinion || "");
    setRejectReasonText(item.rejectReason || "");
    setReviewingRound(null);
    setReviewingAction(null);
    setRoundComment("");
    setShowUploadForm(false);
    setIsModalOpen(true);
  };

  // 회차별 승인/반려 모달 인라인 열기 (기본 문구 자동기입 제거 및 하단 사유 입력칸과 연동)
  const handleStartRoundReview = (round: number, action: "승인" | "반려") => {
    setReviewingRound(round);
    setReviewingAction(action);
    const existing = selectedItem?.packageSubmissions.find(s => s.round === round);
    if (action === "승인") {
      setRoundComment(existing?.reviewComment || mpsiOpinionText.trim() || "");
    } else {
      setRoundComment(existing?.reviewComment || rejectReasonText.trim() || "");
    }
  };

  // 회차별 승인/반려 확정
  const handleConfirmRoundReview = async () => {
    if (!selectedItem || reviewingRound === null || reviewingAction === null) return;
    const finalComment = roundComment.trim() || (reviewingAction === "반려" ? rejectReasonText.trim() : mpsiOpinionText.trim());
    if (!finalComment) {
      alert("심사 메모 및 보완 요청 사유를 입력해 주세요.");
      return;
    }

    if (reviewingAction === "반려") {
      setRejectReasonText(finalComment);
    } else {
      setMpsiOpinionText(finalComment);
    }

    await reviewRoundSubmission(selectedItem.id, reviewingRound, reviewingAction, finalComment, "MPSI");
    showToast(`[${selectedItem.projectNo}] ${reviewingRound}회차 서류 패키지가 [${reviewingAction}] 처리되었습니다.`);

    // 외주사(뉴몰드)로 알림 발송
    sendAppNotification({
      menuName: "양산외주 - 양산승인 (PPAP)",
      menuPath: "/portal/vendor-portal/mass/ppap",
      senderCompany: "MPSI",
      content: `[${selectedItem.projectNo}] ${reviewingRound}회차 서류 패키지 [${reviewingAction}] 판정: ${finalComment}`,
      projectNo: selectedItem.projectNo,
      targetRole: "VENDOR_MASS",
      targetVendorName: selectedItem.massVendor,
    });

    setReviewingRound(null);
    setReviewingAction(null);
    setRoundComment("");
  };

  // MPSI 직접 서류 패키지 업로드 및 메모 등록
  const handleUploadPackage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedItem) return;

    if (!uploadMemo.trim()) {
      alert("업무 이력 메모를 반드시 입력해 주세요.");
      return;
    }

    const nextRound = (selectedItem.packageSubmissions?.length || 0) + 1;
    const now = new Date();
    const dateSimple = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const finalFileName = uploadFileName.trim() || `${dateSimple}.양산승인서류_${selectedItem.productName.replace(/[\/\\]/g, "_")}_Rev${nextRound}.pdf`;

    await submitPackageSubmission(selectedItem.id, {
      fileName: finalFileName,
      fileSize: uploadFileSize,
      fileUrl: uploadFileUrl,
      authorName: "MPSI",
      memo: uploadMemo.trim(),
    });

    // 외주사로 알림 발송
    sendAppNotification({
      menuName: "양산외주 - 양산승인 (PPAP)",
      menuPath: "/portal/vendor-portal/mass/ppap",
      senderCompany: "MPSI",
      content: `[${selectedItem.projectNo}] ${nextRound}회차 서류 패키지 및 메모 등록: ${uploadMemo.trim()}`,
      projectNo: selectedItem.projectNo,
      targetRole: "VENDOR_MASS",
      targetVendorName: selectedItem.massVendor,
    });

    setShowUploadForm(false);
    setUploadFileName("");
    setUploadMemo("");
    showToast(`[${selectedItem.projectNo}] ${nextRound}회차 서류 패키지 및 메모가 DB에 등록되었습니다.`);
  };

  // Pass (최종 양산 승인) 처리
  const handleApprovePass = async () => {
    if (!selectedItem) return;

    const currentStatus = getMassPpapStatus(selectedItem);
    if (currentStatus === "검토 대기") {
      alert("제출된 양산 승인 서류 패키지가 없습니다. 서류 패키지 제출 후 승인을 진행해 주세요.");
      return;
    }

    if (confirm(`[양산 승인 (PPAP Pass 확정)]\n\n프로젝트 [${selectedItem.projectNo}]의 최종 양산 승인을 확정하시겠습니까?\n\n• ${selectedItem.massVendor}(으)로 [제품공급승인서(PPAP Signed)]가 전자 직인 날인되어 전달됩니다.\n• MPSI 정식 완제품 구매 발주(PO)가 자동 생성되어 공정 13으로 연동됩니다.`)) {
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const generatedPoNo = `PO-2026-${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(selectedItem.id).slice(-3) || "001"}`;

      await reviewMpsiDecision(selectedItem.id, {
        status: "양산 승인 (Pass)",
        mpsiOpinion: mpsiOpinionText.trim() || "전 항목 심사 통과로 제품공급승인서(PPAP) 최종 승인 및 완제품 구매발주서 발행",
        approvalOfficer: "MPSI",
      });

      // 프로젝트 마스터 Step 13(완료) 연동
      updateStep(selectedItem.projectNo, {
        currentStep: 13,
        stepStatus: "완료",
        notes: `[MPSI] PPAP 양산승인 최종 통과(Pass). 완제품 구매발주(PO: ${generatedPoNo}) 생성 완료.`,
      });

      // 외주사(뉴몰드)로 최종 승인 알림 발송
      sendAppNotification({
        menuName: "양산외주 - 양산승인 (PPAP)",
        menuPath: "/portal/vendor-portal/mass/ppap",
        senderCompany: "MPSI",
        content: `[${selectedItem.projectNo}] PPAP 최종 양산 승인(Pass) 확정! 완제품 구매발주서 [${generatedPoNo}] 발행 완료`,
        projectNo: selectedItem.projectNo,
        targetRole: "VENDOR_MASS",
        targetVendorName: selectedItem.massVendor,
      });

      // 공정 13 (양산/납품 관리) 연동
      try {
        const approvedItemForDelivery = {
          id: Date.now(),
          poNo: generatedPoNo,
          projectNo: selectedItem.projectNo,
          projectName: selectedItem.projectName,
          productName: selectedItem.productName,
          massVendor: selectedItem.massVendor,
          moldNo: selectedItem.moldNo,
          machineNo: selectedItem.machineNo,
          orderQty: 25000,
          producedQty: 0,
          inspectingQty: 0,
          defectQty: 0,
          deliverableQty: 0,
          deliveredQty: 0,
          holdQty: 0,
          remainingQty: 25000,
          facilityEvent: "양산중",
          oqcReportFile: `OQC_${selectedItem.projectNo}_초도.pdf`,
          statementNo: "-",
          statementDate: "-",
          iqcStatus: "수입검사대기",
          approvedInboundQty: 0,
          taxInvoiceStatus: "정산대기",
          currentStep: 13,
          updatedAt: dateStr,
        };

        const existingRaw = localStorage.getItem("mpsi_approved_deliveries");
        const existingList = existingRaw ? JSON.parse(existingRaw) : [];
        const filteredList = existingList.filter((x: any) => x.projectNo !== selectedItem.projectNo);
        localStorage.setItem("mpsi_approved_deliveries", JSON.stringify([approvedItemForDelivery, ...filteredList]));
      } catch (err) {
        console.error("localStorage sync error:", err);
      }

      setIsModalOpen(false);
      showToast(`[${selectedItem.projectNo}] 양산승인(PPAP) 완료! 완제품 구매발주서 [${generatedPoNo}]가 자동 발행되었습니다.`);
    }
  };

  // Fail (보완/수정 요청) 처리
  const handleApproveFail = async () => {
    if (!selectedItem) return;
    if (!rejectReasonText.trim()) {
      alert("Fail / 보완 요청 시 보완 사유를 반드시 입력해야 합니다.");
      return;
    }

    if (confirm(`[보완 및 금형수정 요청]\n\n보완 사유를 ${selectedItem.massVendor} 및 ${selectedItem.moldVendor}(으)로 전송하시겠습니까?`)) {
      await reviewMpsiDecision(selectedItem.id, {
        status: "수정요청 (Fail)",
        mpsiOpinion: mpsiOpinionText.trim(),
        rejectReason: rejectReasonText.trim(),
      });

      updateStep(selectedItem.projectNo, {
        currentStep: 12,
        stepStatus: "진행중",
        notes: `[MPSI] PPAP 서류 보완요청 통보: ${rejectReasonText.trim()}`,
      });

      // 외주사(뉴몰드)로 보완요청 알림 발송
      sendAppNotification({
        menuName: "양산외주 - 양산승인 (PPAP)",
        menuPath: "/portal/vendor-portal/mass/ppap",
        senderCompany: "MPSI",
        content: `[${selectedItem.projectNo}] PPAP 보완 및 금형수정 요청: ${rejectReasonText.trim()}`,
        projectNo: selectedItem.projectNo,
        targetRole: "VENDOR_MASS",
        targetVendorName: selectedItem.massVendor,
      });

      setIsModalOpen(false);
      showToast(`[${selectedItem.projectNo}] 보완 및 금형수정 요청이 등록되었습니다.`);
    }
  };

  // 양산승인 상태 뱃지
  const renderStatusBadge = (status: "검토 대기" | "검토 진행 중" | "승인완료") => {
    switch (status) {
      case "승인완료":
        return (
          <span className="inline-flex items-center justify-center px-3 py-1 rounded text-xs font-bold bg-[#059669] text-white shadow-xs">
            승인완료
          </span>
        );
      case "검토 대기":
        return (
          <span className="inline-flex items-center justify-center px-3 py-1 rounded text-xs font-bold bg-[#b91c1c] text-white shadow-xs">
            검토 대기
          </span>
        );
      case "검토 진행 중":
      default:
        return (
          <span className="inline-flex items-center justify-center px-3 py-1 rounded text-xs font-bold bg-[#d97706] text-white shadow-xs">
            검토 진행 중
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs relative">
      {/* 숨겨진 실제 파일 업로드 input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept=".pdf,.xlsx,.xls,.dwg,.zip"
      />

      {/* 토스트 알림창 */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-zinc-900 text-white px-4 py-2.5 rounded-lg shadow-xl border border-sky-500/40 text-xs animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-sky-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 표준 SCM 프로세스 공정 설명 배너 */}
      <div className="bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
        <div className="flex items-start gap-2.5">
          <FileCheck2 className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-sky-900 dark:text-sky-200 block text-xs">
              [공정 12] 완제품 검토(PPAP 6대 패키지) 및 MPSI 완제품 구매발주(PO) 발행
            </span>
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
              ① 사출 양산처 자체 OQC 출하검사, 초중종물 치수, Cpk 공정능력, 마스터 샘플 등 6대 서류 심사(공정 12), ② MPSI [제품공급 승인서(PPAP)] 전자 직인 날인 및 정식 완제품 구매 발주서(PO) 자동 발행을 총괄합니다.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
          <Button
            onClick={() => refreshFromDb()}
            variant="outline"
            disabled={isLoading}
            size="sm"
            className="h-7 px-2.5 text-xs gap-1 border-sky-300 text-sky-700 hover:bg-sky-50 dark:hover:bg-zinc-800 font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-sky-600" : ""}`} />
            DB 동기화
          </Button>
          <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-sky-300 text-sky-700 font-bold dark:bg-zinc-800 dark:text-sky-300">
            MPSI PPAP 전결 & PO 발행 (Step 12)
          </span>
        </div>
      </div>

      {/* 1. 상단 검색 필터 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex flex-col gap-2">
        <div className="pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <DateRangeFilter
            startDate={filterDateFrom}
            endDate={filterDateTo}
            onStartDateChange={setFilterDateFrom}
            onEndDateChange={setFilterDateTo}
            selectedPreset={selectedDatePreset}
            onPresetChange={setSelectedDatePreset}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">관리번호</span>
            <Input 
              value={filterProjectNo} 
              onChange={(e) => setFilterProjectNo(e.target.value)} 
              placeholder="예: MI26005, Door Armrest" 
              className="h-7 text-xs font-mono" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">제품명</span>
            <Input 
              value={filterProductName} 
              onChange={(e) => setFilterProductName(e.target.value)} 
              placeholder="제품명 검색" 
              className="h-7 text-xs" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">사출 양산처</span>
            <select 
              value={filterMassVendor} 
              onChange={(e) => setFilterMassVendor(e.target.value)} 
              className="h-7 rounded-md border bg-transparent px-2 text-xs"
            >
              <option value="ALL">전체 양산처</option>
              <option value="(주)뉴몰드">(주)뉴몰드</option>
              <option value="세원사출(주)">세원사출(주)</option>
              <option value="대동사출(주)">대동사출(주)</option>
              <option value="MPSI 자체사출공장">MPSI 자체사출공장</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">금형 제작처</span>
            <select 
              value={filterMoldVendor} 
              onChange={(e) => setFilterMoldVendor(e.target.value)} 
              className="h-7 rounded-md border bg-transparent px-2 text-xs"
            >
              <option value="ALL">전체 제작처</option>
              <option value="우성정공(주)">우성정공(주)</option>
              <option value="대한금형(주)">대한금형(주)</option>
              <option value="MPSI 자체제작팀">MPSI 자체제작팀</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">PPAP 승인 상태</span>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)} 
              className="h-7 rounded-md border bg-transparent px-2 text-xs font-medium"
            >
              <option value="ALL">전체 상태</option>
              <option value="검토 대기">검토 대기</option>
              <option value="검토 진행 중">검토 진행 중</option>
              <option value="승인완료">승인완료</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-1.5 pt-1">
          <Button onClick={handleReset} variant="outline" className="h-7 px-3 gap-1 text-xs text-zinc-600">
            <RefreshCw className="h-3.5 w-3.5" />
            초기화
          </Button>
          <Button onClick={() => showToast("검색 결과가 갱신되었습니다.")} className="h-7 px-4 bg-sky-600 hover:bg-sky-700 text-white gap-1 text-xs font-medium">
            <Search className="h-3.5 w-3.5" />
            검색
          </Button>
        </div>
      </div>

      {/* 2. 메인 데이터 그리드 (실제 DB 데이터 바인딩) */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs overflow-hidden flex flex-col min-h-[480px]">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b">
          <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-100">
            <FileCheck2 className="h-4 w-4 text-sky-600" />
            <span>2. PPAP 양산승인 및 구매발주 대장 (공정 12)</span>
            <span className="text-[11px] font-normal text-zinc-500 ml-1">
              (실제 데이터 <b className="text-sky-600 font-mono">{filteredData.length}</b>건)
            </span>
          </div>
          <span className="text-[11px] text-zinc-500">
            * 사출 양산처 6대 PPAP 패키지 심사 완료 시 <b className="text-emerald-600 font-bold">완제품 구매 발주서(PO)</b>가 자동 발행됩니다.
          </span>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full border-collapse text-left border-spacing-0 whitespace-nowrap">
            <thead className="sticky top-0 bg-[#2d3748] text-white text-[11px] z-10">
              <tr>
                <th className="p-2 w-12 text-center border-r border-slate-600">No</th>
                <th className="p-2 border-r border-slate-600 min-w-[120px]">프로젝트 번호</th>
                <th className="p-2 border-r border-slate-600 min-w-[130px]">제품 품번</th>
                <th className="p-2 border-r border-slate-600 min-w-[180px]">제품명</th>
                <th className="p-2 border-r border-slate-600 min-w-[110px] text-center">사출 양산처</th>
                <th className="p-2 border-r border-slate-600 min-w-[110px] text-center">금형 제작처</th>
                <th className="p-2 border-r border-slate-600 min-w-[110px] text-center">금형번호</th>
                <th className="p-2 border-r border-slate-600 min-w-[110px] text-center">양산승인 상태</th>
                <th className="p-2 min-w-[90px] text-center">심사/승인</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px]">
              {filteredData.map((row, idx) => {
                const status = getMassPpapStatus(row);
                return (
                  <tr key={row.id || row.projectNo} className="hover:bg-sky-50/70 dark:hover:bg-zinc-800/60 transition-colors odd:bg-white even:bg-zinc-50/40 dark:odd:bg-zinc-900 dark:even:bg-zinc-900/50">
                    <td className="p-2 text-center font-mono text-zinc-400 border-r">{idx + 1}</td>
                    
                    <td className="p-2 border-r font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      <span className="flex items-center gap-1">
                        {row.projectNo}
                        <ExternalLink className="h-3 w-3 text-zinc-400" />
                      </span>
                    </td>

                    <td className="p-2 border-r font-mono font-medium text-zinc-800 dark:text-zinc-200">
                      {row.partNo}
                    </td>

                    <td className="p-2 border-r font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[200px]" title={row.productName}>
                      {row.productName}
                    </td>

                    <td className="p-2 border-r text-center">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium dark:bg-emerald-950/40 dark:text-emerald-300">
                        {row.massVendor}
                      </span>
                    </td>

                    <td className="p-2 border-r text-center">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-blue-50 text-blue-700 border border-blue-200 font-medium dark:bg-blue-950/40 dark:text-blue-300">
                        {row.moldVendor}
                      </span>
                    </td>

                    <td className="p-2 border-r text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                      {row.moldNo}
                    </td>

                    <td className="p-2 border-r text-center">
                      {renderStatusBadge(status)}
                    </td>

                    <td className="p-2 text-center">
                      <Button 
                        onClick={() => handleOpenReview(row)} 
                        size="xs" 
                        variant="outline" 
                        className="h-6 px-2.5 text-[11px] gap-1 bg-white hover:bg-zinc-100 dark:bg-zinc-800 shadow-xs font-semibold cursor-pointer"
                      >
                        <Eye className="h-3 w-3 text-zinc-500" />
                        심사/승인
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-zinc-500">
                    현재 등록된 PPAP 양산 승인 대상 프로젝트가 없습니다.
                    <br />
                    <span className="text-[11px] text-zinc-400 mt-1 block">
                      (양산성 검증 메뉴에서 시양산 승인 완료 시 자동 등재됩니다.)
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. [모달] PPAP 양산승인 심사 및 판정 모달 */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-lg shadow-2xl border overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#1e293b] text-white">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-sky-400" />
                <h3 className="font-bold text-sm">
                  MPSI 양산 승인(PPAP) 종합 심사 및 판정 [{selectedItem.projectNo}]
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-zinc-400 hover:text-white transition-colors p-1 rounded-md cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs">
              {/* 프로젝트 & 금형 제원 요약 카드 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-lg border text-xs">
                <div>
                  <span className="text-zinc-500 block text-[11px]">프로젝트 관리번호:</span>
                  <b className="font-mono text-sky-600 text-sm">{selectedItem.projectNo}</b>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">제품명 / 품번:</span>
                  <b className="text-zinc-900 dark:text-zinc-100 block truncate" title={selectedItem.productName}>
                    {selectedItem.productName}
                  </b>
                  <span className="font-mono text-[10px] text-zinc-500">{selectedItem.partNo}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">사출협력사:</span>
                  <b className="text-zinc-900 dark:text-zinc-100">{selectedItem.massVendor}</b>
                  <span className="text-[10px] text-zinc-500 block font-mono">({selectedItem.machineNo})</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">적용금형 (금형번호):</span>
                  <b className="font-mono text-blue-600 dark:text-blue-400 text-sm">{selectedItem.moldNo}</b>
                  <span className="text-[10px] text-zinc-500 block font-medium">({selectedItem.moldVendor})</span>
                </div>
              </div>

              {/* 1. 양산 승인 서류 제출 및 승인 메뉴 */}
              <div className="border rounded-lg p-4 flex flex-col gap-3 bg-white dark:bg-zinc-900 shadow-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                      1. 양산 승인 서류 제출 및 승인
                    </h4>
                    <span className="text-[11px] text-zinc-500">
                      (양산 승인 서류는 패키지 통합 파일로 매 제출 시마다 첨부 저장되며 기존 회차 이력이 함께 보존됩니다)
                    </span>
                  </div>
                  <Button 
                    onClick={() => setShowUploadForm(!showUploadForm)} 
                    size="xs" 
                    variant="outline" 
                    className="h-7 px-2.5 text-xs gap-1 text-sky-600 border-sky-300 hover:bg-sky-50 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    {showUploadForm ? "업로드 닫기" : "서류 패키지 / 수정본 추가 첨부"}
                  </Button>
                </div>

                {/* MPSI 직접 서류 패키지 추가 첨부 폼 */}
                {showUploadForm && (
                  <div className="bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/50 rounded-lg p-3 flex flex-col gap-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-900 dark:text-sky-200 text-xs flex items-center gap-1.5">
                        <UploadCloud className="h-4 w-4 text-sky-600" />
                        신규 회차 양산 승인 서류 통합 패키지 파일 첨부 및 메모 등록 (DB 연동)
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        * 기존 회차 서류는 삭제되지 않고 누적 이력으로 보존됩니다.
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-zinc-600 dark:text-zinc-400 block text-[11px]">첨부 파일 선택:</span>
                        <div className="flex items-center gap-2">
                          <Input 
                            value={uploadFileName}
                            onChange={(e) => setUploadFileName(e.target.value)}
                            placeholder="파일을 선택하거나 파일명을 입력하세요"
                            className="h-7 text-xs bg-white dark:bg-zinc-900"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="h-7 px-2.5 text-xs gap-1 shrink-0 border-sky-400 text-sky-700 hover:bg-sky-100 cursor-pointer"
                          >
                            <Upload className="h-3 w-3" />
                            {isUploading ? "업로드중..." : "파일 선택"}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <span className="text-zinc-600 dark:text-zinc-400 block mb-1 text-[11px]">작성 회사:</span>
                        <Input 
                          value={uploadAuthor}
                          onChange={(e) => setUploadAuthor(e.target.value)}
                          placeholder="MPSI"
                          className="h-7 text-xs bg-white dark:bg-zinc-900"
                        />
                      </div>
                    </div>
                    <div>
                      <span className="text-zinc-600 dark:text-zinc-400 block mb-1 text-[11px]">업무 이력 메모 (필수):</span>
                      <Input 
                        value={uploadMemo}
                        onChange={(e) => setUploadMemo(e.target.value)}
                        placeholder="예: 261016_보완 요청 사항 반영된 최종 패키지 서류 등록"
                        className="h-7 text-xs bg-white dark:bg-zinc-900"
                      />
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <Button onClick={() => setShowUploadForm(false)} size="xs" variant="outline" className="h-7 px-3 text-xs cursor-pointer">
                        취소
                      </Button>
                      <Button onClick={handleUploadPackage} size="xs" className="h-7 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs gap-1 cursor-pointer">
                        <UploadCloud className="h-3.5 w-3.5" />
                        파일 업로드 및 메모 등록
                      </Button>
                    </div>
                  </div>
                )}

                {/* 각 회차별 파일 첨부 및 [승인] [반려] 버튼 리스트 */}
                <div className="flex flex-col gap-2.5">
                  {(!selectedItem.packageSubmissions || selectedItem.packageSubmissions.length === 0) ? (
                    <div className="p-6 text-center text-zinc-400 border border-dashed rounded-lg bg-zinc-50 dark:bg-zinc-800/40">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-zinc-300" />
                      <p className="font-medium text-xs">제출된 양산 승인 서류 패키지가 없습니다.</p>
                      <p className="text-[11px] text-zinc-400 mt-1">외주 협력사 포털에서 서류 패키지 제출 후 심사를 진행할 수 있습니다.</p>
                    </div>
                  ) : (
                    selectedItem.packageSubmissions.map((sub) => {
                      const isReviewingThis = reviewingRound === sub.round;
                      return (
                        <div key={sub.round} className="flex flex-col gap-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border hover:border-zinc-300 transition-colors">
                            {/* 좌측: 회차별 파일 첨부 표시 */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="px-3 py-1.5 rounded-md bg-[#22c55e] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs shrink-0">
                                <FileText className="h-3.5 w-3.5" />
                                {sub.round}회차. 파일 첨부:
                              </span>
                              <span 
                                className="font-medium text-zinc-800 dark:text-zinc-200 truncate cursor-pointer hover:underline text-xs flex items-center gap-1"
                                title={sub.fileName}
                                onClick={() => handleDownloadFile(sub.fileName, sub.fileUrl)}
                              >
                                {sub.fileName}
                                <Download className="h-3 w-3 text-sky-600" />
                              </span>
                              {sub.fileSize && (
                                <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                                  ({sub.fileSize})
                                </span>
                              )}
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => handleDownloadFile(sub.fileName, sub.fileUrl)}
                                className="h-6 px-1.5 text-[10px] text-sky-600 hover:text-sky-700 hover:bg-sky-50 gap-0.5 cursor-pointer font-semibold"
                              >
                                <Download className="h-3 w-3" />
                                다운로드
                              </Button>
                            </div>

                            {/* 우측: 회차 심사 상태 뱃지 및 [승인] / [반려] 버튼 */}
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              {sub.reviewStatus === "승인" && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                                  승인 완료
                                </span>
                              )}
                              {sub.reviewStatus === "반려" && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-300">
                                  반려됨
                                </span>
                              )}
                              {sub.reviewStatus === "심사진행중" && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300">
                                  심사 대기중
                                </span>
                              )}

                              <Button
                                onClick={() => handleStartRoundReview(sub.round, "승인")}
                                size="xs"
                                className="h-7 px-3 text-xs bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold shadow-xs cursor-pointer"
                              >
                                승인
                              </Button>
                              <Button
                                onClick={() => handleStartRoundReview(sub.round, "반려")}
                                size="xs"
                                className="h-7 px-3 text-xs bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold shadow-xs cursor-pointer"
                              >
                                반려
                              </Button>
                            </div>
                          </div>

                          {/* 회차별 심사 인라인 메모 입력창 */}
                          {isReviewingThis && (
                            <div className="ml-4 p-3 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 flex flex-col gap-2 animate-in fade-in">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-amber-900 dark:text-amber-200 text-xs flex items-center gap-1.5">
                                  <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                                  {sub.round}회차 서류 [{reviewingAction}] 메모 및 사유 입력
                                </span>
                                <span className="text-[10px] text-zinc-500">
                                  * 메모 등록 시 하단 업무 이력 및 시스템 DB에 기록됩니다.
                                </span>
                              </div>
                              <textarea
                                value={roundComment}
                                onChange={(e) => setRoundComment(e.target.value)}
                                placeholder={reviewingAction === "승인" ? "승인 소견 및 적합 판정 메모를 입력하세요." : "반려 사유 및 수정/보완 요청 사항을 상세히 입력하세요."}
                                className="w-full h-14 p-2 rounded border text-xs bg-white dark:bg-zinc-900 resize-none"
                              />
                              <div className="flex justify-end gap-1.5">
                                <Button 
                                  onClick={() => { setReviewingRound(null); setReviewingAction(null); setRoundComment(""); }} 
                                  size="xs" 
                                  variant="outline" 
                                  className="h-6 px-2.5 text-xs cursor-pointer"
                                >
                                  취소
                                </Button>
                                <Button 
                                  onClick={handleConfirmRoundReview} 
                                  size="xs" 
                                  className={`h-6 px-3.5 text-xs text-white font-bold cursor-pointer ${reviewingAction === "승인" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}
                                >
                                  [{reviewingAction}] 메모 저장 및 판정
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 업무 이력 메모 박스 */}
                <div className="rounded-lg p-4 bg-[#0f2d4a] text-white flex flex-col gap-2.5 shadow-md">
                  <div className="flex items-center justify-between border-b border-sky-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-sky-400" />
                      <h5 className="font-bold text-xs text-sky-200">
                        2-4) 업무 이력 메모
                      </h5>
                    </div>
                    <span className="text-[10px] text-sky-300">
                      등록 회사명, 메모 등록 시간 표시
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 max-h-40 overflow-y-auto text-xs pr-1">
                    {(!selectedItem.packageSubmissions || selectedItem.packageSubmissions.length === 0) ? (
                      <div className="text-zinc-400 text-xs py-2">
                        등록된 업무 이력 메모가 없습니다.
                      </div>
                    ) : (
                      selectedItem.packageSubmissions.flatMap((sub) => {
                        const historyEntries = [];
                        
                        // 1. 제출자 메모
                        if (sub.memo || sub.authorName) {
                          historyEntries.push({
                            key: `${sub.round}-sub`,
                            author: sub.authorName || selectedItem.massVendor || "(주)뉴몰드",
                            memo: sub.memo || `${sub.round}차 양산승인 서류 패키지 등록`,
                            time: sub.submittedAt,
                            type: "submit",
                            status: null,
                          });
                        }

                        // 2. 심사자 메모
                        if (sub.reviewComment && (sub.reviewStatus === "승인" || sub.reviewStatus === "반려")) {
                          historyEntries.push({
                            key: `${sub.round}-rev`,
                            author: "MPSI",
                            memo: sub.reviewComment,
                            time: sub.reviewedAt || sub.submittedAt,
                            type: "review",
                            status: sub.reviewStatus,
                          });
                        }

                        return historyEntries;
                      }).map((entry) => (
                        <div key={entry.key} className="flex items-start justify-between gap-2 py-1 border-b border-sky-900/60 last:border-0">
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-sky-400 font-bold shrink-0">
                              {entry.author}:
                            </span>
                            <span className="text-zinc-100 break-all">
                              {entry.memo}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {entry.status && (
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${entry.status === "승인" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
                                {entry.status}
                              </span>
                            )}
                            <span className="text-[10px] text-sky-300 font-mono shrink-0">
                              {entry.time}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* 3. MPSI 품질책임자 종합 심사의견 */}
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1 text-xs">
                  3. MPSI 품질책임자 종합 심사의견
                </label>
                <textarea
                  value={mpsiOpinionText}
                  onChange={(e) => setMpsiOpinionText(e.target.value)}
                  placeholder="12시간 연속 사출 및 CPK 1.45로 양호. OQC 출하성적서 확인 후 SOP 등록 확인 시 최종 Pass 확정"
                  className="w-full h-14 p-2 rounded border text-xs bg-white dark:bg-zinc-900 resize-none text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* 4. 보완/수정 요청 사유 */}
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1 text-xs">
                  4. 보완/수정 요청 사유 (반려 시 {selectedItem.massVendor}·{selectedItem.moldVendor} 자동 전달)
                </label>
                <Input
                  value={rejectReasonText}
                  onChange={(e) => setRejectReasonText(e.target.value)}
                  placeholder="보완이 필요한 서류명 또는 금형/사출조건 수정 내용을 입력하세요."
                  className="h-7 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            {/* 모달 푸터 액션 */}
            <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800 border-t">
              <Button onClick={() => setIsModalOpen(false)} variant="outline" className="h-8 px-4 text-xs font-medium cursor-pointer">
                닫기
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleApproveFail}
                  className="h-8 px-4 text-xs bg-[#e11d48] hover:bg-[#be123c] text-white gap-1.5 font-bold shadow-xs cursor-pointer"
                >
                  <XCircle className="h-4 w-4" />
                  [Fail] 보완 및 금형수정 요청
                </Button>
                <Button
                  onClick={handleApprovePass}
                  className="h-8 px-4 text-xs bg-[#059669] hover:bg-[#047857] text-white gap-1.5 font-bold shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  [Pass] 최종 양산 승인 (PO 생성 연동)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useRef } from "react";
import { 
  FileSpreadsheet, Upload, Download, Search, RefreshCw, 
  Eye, CheckCircle2, Clock, AlertCircle, Building2, Send, 
  MessageSquare, Check, X, Paperclip, Plus, ArrowRight, Wrench,
  DollarSign, Calendar, Edit3, ShieldAlert, Sparkles, FileText,
  Activity, Layers, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DateRangeFilter, isWithinDateRange, DatePresetType } from "@/components/common/date-range-filter";
import { useAuthRole } from "@/lib/role-store";
import { 
  useMoldQuotationStore, 
  MoldDevEstimateItem, 
  MoldQuotationStatus,
  MoldSpecDocumentItem 
} from "@/lib/mold-quotation-store";
import { sendAppNotification, cleanCompanyAuthor } from "@/lib/notification-store";

export default function VendorMoldQuotationPage() {
  const { vendorName } = useAuthRole();
  const currentVendor = vendorName || "우성정공(주)";

  const { 
    estimates, 
    isLoading,
    submitVendorQuote, 
    addMemo,
    refresh
  } = useMoldQuotationStore();

  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDateType, setFilterDateType] = useState<"requestDate" | "targetT1Date" | "submittedDate">("requestDate");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePresetType>("all");

  // 모달 상태
  const [selectedItem, setSelectedItem] = useState<MoldDevEstimateItem | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [newComment, setNewComment] = useState("");

  // 실제 파일 다운로드 헬퍼
  const triggerActualFileDownload = (
    fileName: string,
    fileId?: string,
    downloadUrl?: string,
    fileUrl?: string,
    metaInfo?: { categoryName?: string; version?: number }
  ) => {
    if (!fileName) return;

    const targetUrl = downloadUrl || fileUrl;
    if (targetUrl) {
      const a = document.createElement("a");
      a.href = targetUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    let mimeType = "application/octet-stream";
    let content: BlobPart;
    const ext = fileName.split(".").pop()?.toLowerCase();

    if (ext === "pdf") {
      mimeType = "application/pdf";
      content = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF\n`;
    } else {
      mimeType = "text/plain;charset=utf-8";
      content = `[MPSI 금형 기술 근거자료: ${fileName}]\n구분: ${metaInfo?.categoryName || "기술사양서"}\n버전: Rev.${metaInfo?.version || 1}\n다운로드일시: ${new Date().toLocaleString()}`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  // 프로젝트 관리번호 및 견적 관리번호 포맷 헬퍼 (요청 1-1, 1-2, 3-1)
  const getProjectNoDisplay = (item: MoldDevEstimateItem) => {
    const raw = item.officialProjectNo || item.projectNo;
    if (raw && raw.toUpperCase().startsWith("M")) return raw;
    if (raw && raw.toUpperCase().startsWith("Q")) {
      return raw.toUpperCase().replace(/^Q/, "MI").replace(/-0?(\d+)/, "P$1");
    }
    return raw ? `MI${raw}` : "MI26001P0";
  };

  const getQuoteNoDisplay = (item: MoldDevEstimateItem) => {
    const pNo = getProjectNoDisplay(item);
    if (item.estimateNo && item.estimateNo.includes("금형견적")) return item.estimateNo;
    return `${pNo}금형견적`;
  };

  // 견적서 제출 폼 (3-3, 3-4 반영)
  const [submitForm, setSubmitForm] = useState({
    materialCostWon: 0,
    processingCostWon: 0,
    overheadProfitWon: 0,
    specialSpecWon: 0,
    quoteAmountWon: 0,
    machineTypeTonnage: "",
    coreStructure: "",
    moldMaterial: "",
    cavity: "",
    gateType: "",
    quoteFileName: "",
    quoteFileSize: "",
    quoteFileUrl: "",
    downloadUrl: "",
    targetT1Date: "",
    availableMfgDays: 0,
    submissionType: "최초 제출" as "최초 제출" | "수정 제출",
    vendorNotes: "",
    vendorMemo: "",
  });
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenSubmit = (item: MoldDevEstimateItem) => {
    setSelectedItem(item);
    const myQuote = getMyVendorQuote(item);
    const isAlreadySubmitted = !!myQuote;

    // 자사 제출 내역이 있으면 본인 내역으로 채우고, 미제출 협력사라면 0원/빈값으로 완전 격리 초기화
    const mCost = myQuote?.materialCostWon || 0;
    const pCost = myQuote?.processingCostWon || 0;
    const oCost = myQuote?.overheadProfitWon || 0;
    const sCost = myQuote?.specialSpecWon || 0;
    const totalCost = myQuote?.totalAmountWon || (mCost + pCost + oCost + sCost);

    setSubmitForm({
      materialCostWon: mCost,
      processingCostWon: pCost,
      overheadProfitWon: oCost,
      specialSpecWon: sCost,
      quoteAmountWon: totalCost,
      machineTypeTonnage: item.machineTypeTonnage || "",
      coreStructure: item.coreStructure || "",
      moldMaterial: item.moldMaterial || item.moldSteel || "",
      cavity: item.cavity || "",
      gateType: item.gateType || "",
      quoteFileName: myQuote?.quotationFileName || "",
      quoteFileSize: myQuote?.quotationFileSize || "",
      quoteFileUrl: myQuote?.quotationFileUrl || "",
      downloadUrl: myQuote?.downloadUrl || "",
      targetT1Date: item.targetT1Date || "",
      availableMfgDays: myQuote?.availableMfgDays || item.targetMfgDays || 0,
      submissionType: isAlreadySubmitted ? "수정 제출" : "최초 제출",
      vendorNotes: myQuote?.vendorNotes || "",
      vendorMemo: "",
    });
    setIsSubmitModalOpen(true);
  };

  const handleOpenDetail = (item: MoldDevEstimateItem) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  // 4대 금형비 수기 입력 시 합계 자동 계산
  const handleUpdateCost = (field: "materialCostWon" | "processingCostWon" | "overheadProfitWon" | "specialSpecWon", value: number) => {
    setSubmitForm((prev) => {
      const updated = { ...prev, [field]: value };
      const sum = Number(updated.materialCostWon || 0) + 
                  Number(updated.processingCostWon || 0) + 
                  Number(updated.overheadProfitWon || 0) + 
                  Number(updated.specialSpecWon || 0);
      return {
        ...updated,
        quoteAmountWon: sum
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/v1/files/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSubmitForm((prev) => ({
          ...prev,
          quoteFileName: json.fileName || file.name,
          quoteFileSize: json.fileSize || `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          quoteFileUrl: json.fileUrl || "",
          downloadUrl: json.downloadUrl || "",
        }));
      } else {
        const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + " MB";
        setSubmitForm((prev) => ({
          ...prev,
          quoteFileName: file.name,
          quoteFileSize: sizeStr,
        }));
        console.warn("File upload to server failed, used local metadata fallback:", json?.error);
      }
    } catch (err) {
      console.error("Upload error:", err);
      const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + " MB";
      setSubmitForm((prev) => ({
        ...prev,
        quoteFileName: file.name,
        quoteFileSize: sizeStr,
      }));
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleSaveQuoteSubmit = async () => {
    if (!selectedItem || isSubmitting) return;

    // 1. 견적 금액 확인 (0원 제출 시 확인 팝업)
    const totalAmount = Number(submitForm.quoteAmountWon || 0);
    if (totalAmount <= 0) {
      const proceedZero = confirm(
        "금형 제작 견적 금액이 0원(미입력)입니다.\n견적 금액 0원으로 MPSI에 최종 제출하시겠습니까?"
      );
      if (!proceedZero) {
        return;
      }
    }

    // 2. 근거 견적서 첨부 확인 (미첨부 시 확인 후 유연 처리)
    if (!submitForm.quoteFileName) {
      const proceedWithoutFile = confirm(
        "산출 근거 견적서(엑셀 파일)가 첨부되지 않았습니다.\n견적서 파일 첨부 없이 수기 입력된 견적 정보만으로 MPSI에 최종 제출하시겠습니까?"
      );
      if (!proceedWithoutFile) {
        return;
      }
    }

    // 3. 제출 메모 기본값 보정
    let memoText = submitForm.vendorMemo.trim();
    if (!memoText) {
      memoText = `[${submitForm.submissionType}] ${currentVendor} 금형 제작 견적서 제출 (견적총액: ${totalAmount.toLocaleString()}원)`;
    }

    setIsSubmitting(true);
    try {
      await submitVendorQuote(selectedItem.estimateNo, {
        projectNo: selectedItem.projectNo,
        officialProjectNo: selectedItem.officialProjectNo,
        vendorName: currentVendor,
        quoteAmountWon: totalAmount,
        availableMfgDays: Number(submitForm.availableMfgDays || selectedItem.availableMfgDays || selectedItem.targetMfgDays || 0),
        materialCostWon: Number(submitForm.materialCostWon || 0),
        processingCostWon: Number(submitForm.processingCostWon || 0),
        overheadProfitWon: Number(submitForm.overheadProfitWon || 0),
        specialSpecWon: Number(submitForm.specialSpecWon || 0),
        machineTypeTonnage: selectedItem.machineTypeTonnage || submitForm.machineTypeTonnage || "",
        coreStructure: selectedItem.coreStructure || submitForm.coreStructure || "코어삽입형",
        moldMaterial: selectedItem.moldMaterial || submitForm.moldMaterial || selectedItem.moldSteel || "",
        cavity: selectedItem.cavity || submitForm.cavity || "",
        gateType: selectedItem.gateType || submitForm.gateType || "",
        quotationFileName: submitForm.quoteFileName || "",
        quotationFileSize: submitForm.quoteFileSize || "",
        quotationFileUrl: submitForm.quoteFileUrl,
        downloadUrl: submitForm.downloadUrl,
        targetT1Date: submitForm.targetT1Date || selectedItem.targetT1Date,
        vendorNotes: submitForm.vendorNotes,
        vendorMemo: memoText,
        submissionType: submitForm.submissionType,
        authorName: currentVendor
      });

      // MPSI로 실시간 알림 발송 (사용자 이름 제외, 회사명 단독)
      await sendAppNotification({
        menuName: "금형 개발 견적",
        menuPath: "/portal/mold-dev/quotation",
        senderCompany: currentVendor,
        content: `[${selectedItem.projectNo}] ${currentVendor}에서 금형 견적서(${submitForm.submissionType})를 제출하였습니다. (견적가: ${totalAmount.toLocaleString()}원)`,
        projectId: selectedItem.projectNo,
        targetRole: "MPSI"
      });

      setIsSubmitModalOpen(false);
      alert(`[${getQuoteNoDisplay(selectedItem)}] MPSI로 금형 견적서가 성공적으로 제출되었습니다.\nPostgreSQL DB에 정상 저장 완료되었습니다.`);
    } catch (err: any) {
      console.error("Failed to submit vendor quote:", err);
      alert(`견적 제출 중 오류가 발생했습니다: ${err.message || "서버 응답 오류"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedItem) return;
    const commentText = newComment.trim();
    addMemo(selectedItem.estimateNo, currentVendor, commentText);

    // MPSI로 메모 등록 알림 발송
    await sendAppNotification({
      menuName: "금형 개발 견적",
      menuPath: "/portal/mold-dev/quotation",
      senderCompany: currentVendor,
      content: `[${selectedItem.projectNo}] ${currentVendor}에서 견적 상세 메모를 등록하였습니다: "${commentText.slice(0, 30)}..."`,
      projectId: selectedItem.projectNo,
      targetRole: "MPSI"
    });

    setNewComment("");
  };

  // 협력사 이름 정규화 유틸리티 (모든 괄호 (주), (배희섭 수석) 및 공백 제거 후 비교)
  const cleanVendorName = (name?: string) => {
    if (!name) return "";
    return name
      .replace(/\([^)]*\)/g, "") // 모든 괄호 안 문구 통째로 제거
      .replace(/주식회사|\s/g, "")
      .trim()
      .toLowerCase();
  };

  const isMatchingVendor = (vendorA?: string, vendorB?: string) => {
    if (!vendorA || !vendorB) return false;
    const a = cleanVendorName(vendorA);
    const b = cleanVendorName(vendorB);
    if (!a || !b) return false;
    // 우성정공 / WOOSUNG 동의어 매칭
    if ((a.includes("우성") || a.includes("woosung")) && (b.includes("우성") || b.includes("woosung"))) {
      return true;
    }
    // 대한금형 / DAEHAN 동의어 매칭
    if ((a.includes("대한") || a.includes("daehan")) && (b.includes("대한") || b.includes("daehan"))) {
      return true;
    }
    return a === b || a.includes(b) || b.includes(a);
  };

  // 현재 외주업체에 실제 배포된 견적 목록만 필터링 (배포 대상 협력사 보안 격리)
  const vendorEstimates = estimates.filter((item) => {
    // 1. MPSI 자체제작 건은 외주사에게 절대 비노출
    if (item.productionType === "IN_HOUSE") return false;

    // 2. MPSI가 전체 업체 일괄 배포한 건은 모든 금형 협력사에 노출
    if (item.assignedVendors?.includes("전체 업체")) return true;

    // 3. MPSI가 특정 협력사들을 지정하여 배포한 경우
    if (item.assignedVendors && item.assignedVendors.length > 0) {
      if (item.assignedVendors.some((assigned) => isMatchingVendor(assigned, currentVendor))) {
        return true;
      }
    }

    // 4. 주 제작처 또는 최종 확정처가 자사인 경우 노출
    if (isMatchingVendor(item.vendorName, currentVendor) || isMatchingVendor(item.selectedVendorName, currentVendor)) {
      return true;
    }

    // 5. 배포처가 지정되지 않은 일반 외주 건은 기본 노출
    if (!item.assignedVendors || item.assignedVendors.length === 0) {
      return true;
    }

    return false;
  });

  // 자사 제출 견적건 조회 (MPSI 답변 포함)
  const getMyVendorQuote = (item: MoldDevEstimateItem) => {
    return (item.vendorQuotes || []).find((q) => isMatchingVendor(q.vendorName, currentVendor));
  };

  // 현재 로그인한 협력사(자사) 관점 진행상태 판별 (복수 협력사 데이터 격리)
  const getVendorSpecificStatus = (item: MoldDevEstimateItem): MoldQuotationStatus => {
    // 1. MPSI에서 최종 수주 확정한 경우
    if (item.status === "수주확정") {
      const isWinner = isMatchingVendor(item.selectedVendorName, currentVendor) || 
                       isMatchingVendor(item.vendorName, currentVendor);
      return isWinner ? "수주확정" : "수주미성사";
    }
    // 2. 자사가 제출한 견적이 있는 경우
    const myQuote = getMyVendorQuote(item);
    if (myQuote) {
      if (myQuote.status === "제출완료") return "외주견적제출";
      if (myQuote.status === "검토협의") return "견적검토중";
      if (myQuote.status === "수주확정") return "수주확정";
      if (myQuote.status === "반려/미성사") return "수주미성사";
      return "외주견적제출";
    }
    // 3. 자사가 아직 제출하지 않은 경우 (타사 제출 여부와 무관하게 자사 관점은 견적요청)
    return "견적요청";
  };

  const filtered = vendorEstimates.filter((item) => {
    const pNo = item.officialProjectNo || item.projectNo;
    const matchKey = filterKeyword
      ? pNo.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        item.productName.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        item.estimateNo.toLowerCase().includes(filterKeyword.toLowerCase())
      : true;
    const myStatus = getVendorSpecificStatus(item);
    const matchStatus = filterStatus !== "ALL" ? myStatus === filterStatus : true;
    const targetDate = item[filterDateType];
    const matchDate = isWithinDateRange(targetDate, filterDateFrom, filterDateTo);
    return matchKey && matchStatus && matchDate;
  });

  const renderStatusBadge = (status: MoldQuotationStatus) => {
    switch (status) {
      case "견적요청":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-300">
            <Clock className="h-3 w-3 animate-pulse text-amber-600" />
            견적요청 (작성요망)
          </span>
        );
      case "자체진행":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            자체제작
          </span>
        );
      case "외주견적제출":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="h-3 w-3 text-blue-600" />
            견적제출완료
          </span>
        );
      case "견적검토중":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">
            <Edit3 className="h-3 w-3 text-yellow-600" />
            MPSI 검토/협의중
          </span>
        );
      case "수주확정":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            수주확정 (낙찰)
          </span>
        );
      case "수주미성사":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-500 border border-zinc-200">
            수주미성사
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 헤더 안내 배너 */}
      <div className="bg-purple-50 dark:bg-zinc-800/60 border border-purple-200 dark:border-zinc-700 rounded-md p-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-purple-600" />
          <div>
            <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>[{currentVendor}] 금형 견적 관리</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-semibold">
                MPSI 시스템 연동
              </span>
            </div>
            <div className="text-[11px] text-zinc-500">
              MPSI가 등록한 <b>기술 근거 자료(3D/2D/생산조건/목표 C/T)</b>를 확인하고, 4대 원가 및 <b>금형 제작 가능일수(Days)</b>를 산출하여 견적서를 제출합니다. (MPSI 답변 확인 가능)
            </div>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <Input
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.target.value)}
            placeholder="PJT 관리번호, 제품명, 견적식별번호 검색..."
            className="h-7 w-52 text-xs"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-7 rounded-md border bg-transparent px-2 text-xs font-semibold"
          >
            <option value="ALL">전체 상태</option>
            <option value="견적요청">견적요청 (작성요망)</option>
            <option value="외주견적제출">견적제출완료</option>
            <option value="견적검토중">MPSI 검토/협의중</option>
            <option value="수주확정">수주확정</option>
            <option value="수주미성사">수주미성사</option>
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
              <option value="targetT1Date">목표 T1 납기</option>
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
            표시 중: <b className="text-purple-600 font-mono">{filtered.length}</b>건
          </div>
        </div>
      </div>

      {/* 견적 리스트 테이블 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b text-[11px] text-zinc-500 font-semibold whitespace-nowrap">
              <th className="py-2.5 px-2 text-center w-10">No</th>
              <th className="py-2.5 px-2 text-center min-w-[105px] font-bold text-purple-700 dark:text-purple-300">프로젝트 관리번호</th>
              <th className="py-2.5 px-2 text-center min-w-[110px] font-bold text-indigo-700 dark:text-indigo-300">견적 관리번호</th>
              <th className="py-2.5 px-2 text-center min-w-[85px]">진행상태</th>
              <th className="py-2.5 px-2 text-center min-w-[70px] text-amber-600 font-bold">신작/설변</th>
              <th className="py-2.5 px-2 text-center min-w-[115px] text-purple-700 font-bold">금형번호 / 차수</th>
              <th className="py-2.5 px-2.5 min-w-[150px]">제품명 / 고객사</th>
              <th className="py-2.5 px-2 text-center min-w-[75px]">캐비티사양</th>
              <th className="py-2.5 px-2 text-center min-w-[115px]">상하코어 재질</th>
              <th className="py-2.5 px-2 text-center min-w-[85px]">레진</th>
              <th className="py-2.5 px-2 text-center min-w-[95px] text-purple-700 dark:text-purple-400 font-bold">출고 납기</th>
              <th className="py-2.5 px-2 text-center min-w-[85px]">제작 가능 일수</th>
              <th className="py-2.5 px-2.5 text-right min-w-[105px]">제출 견적가 (원)</th>
              <th className="py-2.5 px-2 text-center min-w-[95px]">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {isLoading ? (
              <tr>
                <td colSpan={14} className="py-10 text-center text-zinc-500">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-purple-600" />
                    <span>PostgreSQL DB에서 견적 요청 데이터를 불러오는 중입니다...</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-8 text-center text-zinc-400">
                  접수된 견적 요청 내역이 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((item, idx) => {
                const projectNoDisplay = getProjectNoDisplay(item);
                const quoteNoDisplay = getQuoteNoDisplay(item);
                const moldNoDisplay = item.moldNo || (projectNoDisplay.startsWith("MI") ? `${projectNoDisplay.split("-")[0].replace(/P0$/, "")}M` : "-");
                const myQuote = getMyVendorQuote(item);
                const myStatus = getVendorSpecificStatus(item);

                return (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors ${
                      myStatus === "견적요청" ? "bg-amber-50/20" : ""
                    }`}
                  >
                    {/* 1. No */}
                    <td className="py-2 px-2 text-center text-zinc-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>

                    {/* 2. 프로젝트 관리번호 */}
                    <td className="py-2 px-2 text-center whitespace-nowrap font-mono font-bold">
                      <span className="text-purple-700 dark:text-purple-300">
                        {projectNoDisplay}
                      </span>
                    </td>

                    {/* 3. 견적 관리번호 */}
                    <td className="py-2 px-2 text-center whitespace-nowrap font-mono font-bold text-zinc-800 dark:text-zinc-200">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border text-[10.5px]">
                        {quoteNoDisplay}
                      </span>
                    </td>

                    {/* 4. 진행상태 (자사 제출 관점) */}
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      {renderStatusBadge(myStatus)}
                    </td>

                    {/* 5. 신작/설변 (N001, E001) */}
                    <td className="py-2 px-2 text-center whitespace-nowrap font-mono">
                      <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-extrabold border shadow-2xs ${
                        item.changeType?.startsWith("E")
                          ? "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300"
                          : "bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300"
                      }`}>
                        {item.changeType || "N001"}
                      </span>
                    </td>

                    {/* 6. 금형번호 / 차수 */}
                    <td className="py-2 px-2 text-center whitespace-nowrap font-mono text-[11px]">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        {moldNoDisplay}
                      </span>
                      <span className="ml-1 inline-block px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">
                        {item.moldDegree || "M1"}
                      </span>
                    </td>

                    {/* 5. 제품명 / 고객사 */}
                    <td className="py-2 px-2.5">
                      <div className="font-bold text-zinc-800 dark:text-zinc-200">
                        {item.productName}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {item.customerName} · {item.projectName}
                      </div>
                    </td>

                    {/* 6. 2-1) 캐비티사양 */}
                    <td className="py-2 px-2 text-center font-mono font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                      {item.cavity || "-"}
                    </td>

                    {/* 7. 2-2) 상하코어 재질 */}
                    <td className="py-2 px-2 text-center font-mono text-zinc-700 dark:text-zinc-300 whitespace-nowrap text-[11px]">
                      {item.moldSteel || item.moldMaterial || "-"}
                    </td>

                    {/* 8. 2-3) 레진 */}
                    <td className="py-2 px-2 text-center font-mono font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      {item.resin || "PP-TD20"}
                    </td>

                    {/* 9. 2-4) 출고 납기 */}
                    <td className="py-2 px-2 text-center font-mono font-bold text-purple-700 dark:text-purple-400 whitespace-nowrap">
                      {item.moldDeliveryDate || "-"}
                    </td>

                    {/* 10. 2-5) 제작 가능 일수 */}
                    <td className="py-2 px-2 text-center font-mono font-bold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                      {item.availableMfgDays ? `${item.availableMfgDays}일` : "-"}
                    </td>

                    {/* 11. 제출 견적가 (원) - 자사 제출 견적가만 엄격히 표시 */}
                    <td className="py-2 px-2.5 text-right font-mono font-bold whitespace-nowrap">
                      {myQuote ? (
                        <span className="text-purple-600 font-extrabold">
                          {(myQuote.totalAmountWon || 0) > 0 
                            ? `${(myQuote.totalAmountWon || 0).toLocaleString()}원` 
                            : "0원 (제출완료)"}
                        </span>
                      ) : (
                        <span className="text-zinc-400 italic">견적서 미제출</span>
                      )}
                    </td>

                    {/* 12. 작업 (자사 제출 여부에 따라 견적서 작성 / 수정제출 분기) */}
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
                            className="h-6 text-[11px] px-2 text-zinc-700 hover:text-purple-600 cursor-pointer"
                          >
                            수정제출
                          </Button>
                        )}
                        <Button
                          onClick={() => handleOpenDetail(item)}
                          size="xs"
                          variant="ghost"
                          className="h-6 text-[11px] px-2 text-zinc-600 hover:text-purple-600 cursor-pointer"
                        >
                          <Eye className="h-3 w-3 mr-0.5" />
                          상세
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

      {/* ========================================================================= */}
      {/* 1. 견적서 작성 및 제출 모달 */}
      {/* ========================================================================= */}
      {isSubmitModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border rounded-lg shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-5 py-3.5 bg-purple-50 dark:bg-purple-950/50 border-b">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-purple-600 shrink-0" />
                <div>
                  <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2 flex-wrap">
                    <span>금형 제작 견적서 작성 및 제출</span>
                    <span className="text-[11px] font-mono text-purple-700 bg-purple-100 dark:bg-purple-900/50 dark:text-purple-300 px-2 py-0.5 rounded font-bold">
                      [{getQuoteNoDisplay(selectedItem)}]
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500 flex items-center gap-2 flex-wrap mt-0.5">
                    <span>PJT: <b className="text-zinc-800 dark:text-zinc-200 font-mono">{getProjectNoDisplay(selectedItem)}</b></span>
                    <span>·</span>
                    <span>금형번호: <b className="text-purple-700 dark:text-purple-300 font-mono font-bold">{selectedItem.moldNo || (getProjectNoDisplay(selectedItem).startsWith("MI") ? `${getProjectNoDisplay(selectedItem).split("-")[0].replace(/P0$/, "")}M` : "-")}</b></span>
                    <span>·</span>
                    <span>차수: <b className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300">{selectedItem.moldDegree || "M1"}</b></span>
                    <span>·</span>
                    <span>구분: <b className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-sky-100 text-sky-800 border border-sky-300">{selectedItem.changeType || "N001"}</b></span>
                    <span>·</span>
                    <span>제품: <b>{selectedItem.productName}</b> ({selectedItem.customerName})</span>
                    <span>·</span>
                    <span>금형 출고 납기: <b className="font-mono text-purple-700 dark:text-purple-300 font-bold">{selectedItem.moldDeliveryDate || "-"}</b></span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsSubmitModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex flex-col gap-4 text-xs">
              {/* [신규 기능 1] MPSI 기술 근거 자료 및 사양 확인 (3D/2D/생산조건/목표 C/T) */}
              <div className="border border-sky-300 rounded-md p-3.5 bg-sky-50/40 dark:bg-sky-950/20 space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-sky-200">
                  <span className="font-bold text-sky-950 dark:text-sky-200 flex items-center gap-1.5 text-xs">
                    <FileText className="h-4 w-4 text-sky-600" />
                    MPSI 기술 근거 자료 및 생산 조건 확인 (견적 검토 기준자료)
                  </span>
                  {selectedItem.targetCycleTime && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-800 border border-purple-200">
                      ★ MPSI 목표 C/T: <b>{selectedItem.targetCycleTime}초</b> (싸이클타임 준수)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  {selectedItem.specDocuments && selectedItem.specDocuments.length > 0 ? (
                    selectedItem.specDocuments.map((doc) => (
                      <div key={doc.id} className="p-2 rounded border bg-white dark:bg-zinc-800 flex flex-col justify-between shadow-2xs">
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-0.5">
                            <span className="font-semibold text-sky-700">{doc.categoryName}</span>
                            <span className="font-mono text-[9px] bg-zinc-100 px-1 rounded">Rev {doc.version}</span>
                          </div>
                          <div className="font-bold text-[11px] text-zinc-800 truncate" title={doc.fileName}>
                            {doc.fileName}
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2" title={doc.memo}>
                            {doc.memo}
                          </p>
                        </div>
                        <Button
                          onClick={() => triggerActualFileDownload(doc.fileName, doc.id, doc.downloadUrl, doc.fileUrl, { categoryName: doc.categoryName, version: doc.version })}
                          size="xs"
                          variant="outline"
                          className="h-5 text-[10px] mt-2 gap-1 text-sky-700 border-sky-200 hover:bg-sky-50 font-semibold"
                        >
                          <Download className="h-3 w-3" />
                          다운로드
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-4 text-center py-2 text-zinc-400">
                      등록된 기술 근거 자료가 없습니다.
                    </div>
                  )}
                </div>
              </div>

              {/* 3-2. 1. 금형 및 사출기 필수 사양 (MPSI 프로젝트 관리대장 지정값 - 우성정공 확인 전용) */}
              <div className="border border-purple-200 dark:border-purple-800/80 rounded-md p-3.5 bg-purple-50/30 dark:bg-purple-950/20">
                <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200 mb-2.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400">
                    <Wrench className="h-3.5 w-3.5" />
                    1. 금형 및 사출기 필수 사양
                    <span className="text-[10px] font-normal text-purple-700 bg-purple-100 dark:bg-purple-900/60 dark:text-purple-200 px-1.5 py-0.5 rounded">
                      MPSI 지정 사양 (입력 불필요)
                    </span>
                  </span>
                  <span className="text-[11px] text-purple-600 dark:text-purple-300 font-medium">
                    ※ MPSI 등록 사양 자동 연동 (금형사 입력 불필요 / 확인 전용)
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-zinc-600 dark:text-zinc-400 font-medium block mb-1">
                      사출기 타입 / 톤수
                    </label>
                    <div 
                      className="h-7 px-2.5 flex items-center rounded border border-purple-200 bg-white dark:bg-zinc-900 text-purple-900 dark:text-purple-200 font-mono font-bold text-xs shadow-2xs"
                      title="MPSI에서 지정 배포한 사출기 조건 (수정 불가)"
                    >
                      {selectedItem.machineTypeTonnage || submitForm.machineTypeTonnage || "-"}
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-600 dark:text-zinc-400 font-medium block mb-1">
                      원판일체형 / 코어삽입형
                    </label>
                    <div 
                      className="h-7 px-2.5 flex items-center rounded border border-purple-200 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-semibold text-xs shadow-2xs"
                      title="MPSI에서 지정한 원판/코어 구조"
                    >
                      {selectedItem.coreStructure || submitForm.coreStructure || "코어삽입형 (Core Insert)"}
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-600 dark:text-zinc-400 font-medium block mb-1">
                      금형 재질 (상하원판 / 메인코어)
                    </label>
                    <div 
                      className="h-7 px-2.5 flex items-center rounded border border-purple-200 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-semibold text-xs truncate shadow-2xs"
                      title={selectedItem.moldMaterial || submitForm.moldMaterial || selectedItem.moldSteel || "-"}
                    >
                      {selectedItem.moldMaterial || submitForm.moldMaterial || selectedItem.moldSteel || "-"}
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-600 dark:text-zinc-400 font-medium block mb-1">
                      캐비티 구성 (Cavity)
                    </label>
                    <div 
                      className="h-7 px-2.5 flex items-center rounded border border-purple-200 bg-white dark:bg-zinc-900 text-purple-900 dark:text-purple-200 font-mono font-bold text-xs shadow-2xs"
                      title="MPSI 지정 캐비티 구성"
                    >
                      {selectedItem.cavity || submitForm.cavity || "-"}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-zinc-600 dark:text-zinc-400 font-medium block mb-1">
                      게이트 타입 (GATE 형식)
                    </label>
                    <div 
                      className="h-7 px-2.5 flex items-center rounded border border-purple-200 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-semibold text-xs truncate shadow-2xs"
                      title={selectedItem.gateType || submitForm.gateType || "-"}
                    >
                      {selectedItem.gateType || submitForm.gateType || "-"}
                    </div>
                  </div>

                  {/* 프로젝트 정보 연동 항목: 목표 CT & 금형출하 납기 */}
                  <div>
                    <label className="text-purple-900 dark:text-purple-300 font-bold block mb-1 flex items-center justify-between">
                      <span>목표 CT</span>
                      <span className="text-[10px] text-purple-600 bg-purple-100 dark:bg-purple-900/60 dark:text-purple-300 px-1 py-0.2 rounded font-normal">MPSI 기준</span>
                    </label>
                    <div className="h-7 px-2.5 flex items-center rounded border border-purple-200 bg-white dark:bg-zinc-900 text-purple-900 dark:text-purple-200 font-mono font-bold text-xs shadow-2xs">
                      {selectedItem.targetCycleTime ? `${selectedItem.targetCycleTime} 초` : "-"}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-purple-900 dark:text-purple-300 font-bold block mb-1 flex items-center justify-between">
                      <span>금형출하 납기 (출고 납기)</span>
                      <span className="text-[10px] text-purple-600 bg-purple-100 dark:bg-purple-900/60 dark:text-purple-300 px-1 py-0.2 rounded font-normal">MPSI 기준</span>
                    </label>
                    <div className="h-7 px-2.5 flex items-center justify-between rounded border border-purple-200 bg-white dark:bg-zinc-900 text-purple-900 dark:text-purple-200 font-mono font-bold text-xs shadow-2xs">
                      <span>{selectedItem.moldDeliveryDate || "-"}</span>
                      <span className="text-[10.5px] text-zinc-500 font-normal font-sans">(금형 승인 및 양산처 이관일)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. 금형비 구성 (수기 입력: 재료비 + 가공비 + 일반관리비/이윤 + 특수사양 = 합계) */}
              <div className="border rounded-md p-3.5 bg-white dark:bg-zinc-900">
                <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
                    <DollarSign className="h-3.5 w-3.5 text-purple-600" />
                    2. 금형비 구성 (수기 입력)
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    ※ 4개 항목을 수기 입력하면 금형비 합계가 자동 계산됩니다.
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                  <div>
                    <label className="text-zinc-600 dark:text-zinc-400 text-[11px] font-medium block mb-1">
                      재료비 (원)
                    </label>
                    <CurrencyInput 
                      value={submitForm.materialCostWon}
                      onChange={(val) => handleUpdateCost("materialCostWon", val)}
                      placeholder="0"
                      className="h-7 text-xs font-mono font-bold bg-white dark:bg-zinc-900"
                    />
                    <span className="text-[10px] text-zinc-400 mt-0.5 block truncate">
                      {submitForm.materialCostWon ? `${(submitForm.materialCostWon / 10000).toLocaleString()}만원` : "-"}
                    </span>
                  </div>

                  <div>
                    <label className="text-zinc-600 dark:text-zinc-400 text-[11px] font-medium block mb-1">
                      가공비 (원)
                    </label>
                    <CurrencyInput 
                      value={submitForm.processingCostWon}
                      onChange={(val) => handleUpdateCost("processingCostWon", val)}
                      placeholder="0"
                      className="h-7 text-xs font-mono font-bold bg-white dark:bg-zinc-900"
                    />
                    <span className="text-[10px] text-zinc-400 mt-0.5 block truncate">
                      {submitForm.processingCostWon ? `${(submitForm.processingCostWon / 10000).toLocaleString()}만원` : "-"}
                    </span>
                  </div>

                  <div>
                    <label className="text-zinc-600 dark:text-zinc-400 text-[11px] font-medium block mb-1">
                      일반관리비 및 이윤 (원)
                    </label>
                    <CurrencyInput 
                      value={submitForm.overheadProfitWon}
                      onChange={(val) => handleUpdateCost("overheadProfitWon", val)}
                      placeholder="0"
                      className="h-7 text-xs font-mono font-bold bg-white dark:bg-zinc-900"
                    />
                    <span className="text-[10px] text-zinc-400 mt-0.5 block truncate">
                      {submitForm.overheadProfitWon ? `${(submitForm.overheadProfitWon / 10000).toLocaleString()}만원` : "-"}
                    </span>
                  </div>

                  <div>
                    <label className="text-zinc-600 dark:text-zinc-400 text-[11px] font-medium block mb-1">
                      특수사양 (HRS포함) (원)
                    </label>
                    <CurrencyInput 
                      value={submitForm.specialSpecWon}
                      onChange={(val) => handleUpdateCost("specialSpecWon", val)}
                      placeholder="0"
                      className="h-7 text-xs font-mono font-bold text-purple-700 bg-white dark:bg-zinc-900"
                    />
                    <span className="text-[10px] text-zinc-400 mt-0.5 block truncate">
                      {submitForm.specialSpecWon ? `${(submitForm.specialSpecWon / 10000).toLocaleString()}만원` : "-"}
                    </span>
                  </div>
                </div>

                {/* 금형비 합계 자동 계산 결과 바 */}
                <div className="p-2.5 rounded-md bg-purple-50/70 border border-purple-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-900 font-bold text-xs">
                      금형비 합계금액 (제출 견적가):
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      (재료비 + 가공비 + 관리비및이윤 + 특수사양)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-base font-bold text-purple-700">
                      {submitForm.quoteAmountWon.toLocaleString()} 원
                    </span>
                    <span className="text-[11px] text-zinc-500 ml-2">
                      ({submitForm.quoteAmountWon > 0 ? (submitForm.quoteAmountWon / 10000).toLocaleString() : 0} 만원)
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. 근거 견적서(엑셀 파일) 첨부 및 납기 */}
              <div className="border rounded-md p-3.5 bg-zinc-50/50 space-y-3">
                <div className="font-bold text-xs text-zinc-800 flex items-center justify-between pb-1 border-b">
                  <span className="flex items-center gap-1.5 text-zinc-800">
                    <Paperclip className="h-3.5 w-3.5 text-purple-600" />
                    3. 근거 견적서(엑셀 파일) 첨부 및 납기
                  </span>
                  <span className="text-rose-500 font-medium text-[11px]">
                    * 근거 견적서(엑셀) 첨부 필수
                  </span>
                </div>

                {/* 3-3. 제안 T1 시험사출 납기일 + 금형 제작일수(수기입력) + 엑셀 파일 첨부 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-zinc-600 font-medium block mb-1">
                      제안 T1 시험사출 납기일
                    </label>
                    <Input 
                      type="date"
                      value={submitForm.targetT1Date}
                      onChange={(e) => setSubmitForm({ ...submitForm, targetT1Date: e.target.value })}
                      className="h-7 text-xs font-mono font-bold bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-700 font-bold block mb-1 flex items-center gap-1">
                      <span>금형 제작일수(Days)</span>
                      <span className="text-[10px] text-purple-600 font-normal">(수기입력) *</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={1}
                        value={submitForm.availableMfgDays || ""}
                        onChange={(e) => setSubmitForm({ ...submitForm, availableMfgDays: Number(e.target.value) })}
                        placeholder="예: 38"
                        className="h-7 text-xs font-mono font-bold text-right bg-white text-purple-800"
                      />
                      <span className="text-xs font-bold text-zinc-600 shrink-0">일</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-600 font-medium block mb-1">
                      근거 견적서 엑셀 파일 (.xlsx, .xls) <span className="text-red-500">*</span>
                    </label>
                    <div className="border border-dashed rounded-md p-1.5 bg-white flex items-center justify-between">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        accept=".xlsx,.xls,.pdf" 
                      />
                      {submitForm.quoteFileName ? (
                        <div className="flex items-center gap-1.5 truncate">
                          <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                          <div className="truncate">
                            <span className="font-bold text-zinc-900 text-[11px] block truncate">
                              {submitForm.quoteFileName}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {submitForm.quoteFileSize || ""}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-zinc-400 text-[11px]">
                          산출 내역 엑셀 첨부
                        </span>
                      )}
                      <Button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={isUploadingFile}
                        size="xs" 
                        variant="outline" 
                        className="h-6 text-xs gap-1 ml-1.5 shrink-0"
                      >
                        {isUploadingFile ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin text-purple-600" />
                            업로드중
                          </>
                        ) : (
                          <>
                            <Upload className="h-3 w-3" />
                            파일선택
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 3-4. 견적 파일 업로드 전 메모 입력해서 이력 관리 */}
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-md space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-950 text-xs flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-purple-700" />
                      견적 제출 메모 입력 및 이력 관리
                      <span className="text-[10px] font-normal text-purple-700 bg-purple-200/60 px-1.5 py-0.5 rounded">
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
                      <label className="flex items-center gap-1 cursor-pointer text-purple-700 font-bold">
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
                    <label className="text-zinc-700 font-medium block mb-1">
                      견적 제출 메모 (최초 또는 수정 제출 사유) <span className="text-purple-600 font-normal">(미입력 시 기본 문구 자동 완성)</span>
                    </label>
                    <textarea 
                      value={submitForm.vendorMemo}
                      onChange={(e) => setSubmitForm({ ...submitForm, vendorMemo: e.target.value })}
                      rows={2}
                      placeholder="견적 파일 업로드 전 제출 사유 및 전달사항을 입력하세요 (예: 550T 기준 핫런너 2점 적용 초도 제출 / 구매팀 단가 협의에 따른 가공비 5% 네고 수정 반영 등)..."
                      className="w-full rounded border bg-white p-2 text-xs"
                    />
                  </div>

                  {/* 안내 배너: 파일 교체 시 기존 파일 삭제, 메모는 이력 관리 */}
                  <div className="text-[10.5px] text-zinc-600 bg-white/80 p-2 rounded border border-purple-100 flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 text-purple-600 shrink-0 mt-0.5" />
                    <span>
                      ※ <b>견적서 파일 교체 및 이력 보존 안내</b>: 수정된 견적서 첨부 시 기존 견적서 파일은 신규 파일로 자동 대체(기존 파일 삭제)되지만, 제출 당시의 메모·일자·시간·제출 금액은 <b>관리 이력으로 체계적으로 관리</b>됩니다.
                    </span>
                  </div>

                  {/* 과거 메모 및 견적 제출 이력 - 철저히 자사(currentVendor) 이력만 격리 필터링 */}
                  {(() => {
                    const myHistory = (selectedItem.submissionHistory || []).filter((hist) => 
                      isMatchingVendor(hist.author, currentVendor)
                    );
                    if (myHistory.length === 0) return null;

                    return (
                      <div className="mt-2 pt-2 border-t border-purple-200/80">
                        <div className="text-[11px] font-bold text-purple-900 mb-1.5 flex items-center justify-between">
                          <span>[{currentVendor}] 제출 메모 및 견적 관리 이력 ({myHistory.length}건)</span>
                          <span className="text-[10px] text-zinc-400 font-normal">자사 과거 제출 이력</span>
                        </div>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {myHistory.map((hist) => (
                            <div key={hist.id} className="p-2 rounded bg-white border border-purple-100 shadow-2xs text-[11px]">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                    hist.submissionType === "수정 제출" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                                  }`}>
                                    [{hist.revisionNo}차] {hist.submissionType}
                                  </span>
                                  <span className="font-bold text-zinc-800">{cleanCompanyAuthor(hist.author, currentVendor)}</span>
                                  <span className="text-zinc-400 font-mono text-[10px]">{hist.submittedAt}</span>
                                </div>
                                <div className="font-mono font-bold text-purple-700">
                                  {hist.amountWon.toLocaleString()}원
                                  {hist.availableMfgDays && <span className="text-zinc-500 font-normal ml-1">({hist.availableMfgDays}일)</span>}
                                </div>
                              </div>
                              <div className="bg-zinc-50 p-1.5 rounded text-zinc-700 whitespace-pre-wrap">
                                {hist.memo}
                              </div>
                              <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-400">
                                <span className="flex items-center gap-1">
                                  <FileSpreadsheet className="h-3 w-3 text-emerald-600" />
                                  당시 파일: <b className="text-zinc-600">{hist.fileName}</b> {hist.fileSize && `(${hist.fileSize})`}
                                </span>
                                <div className="flex items-center gap-2">
                                  {hist.fileName && (
                                    <button
                                      type="button"
                                      onClick={() => triggerActualFileDownload(hist.fileName, hist.id, hist.downloadUrl, hist.fileUrl)}
                                      className="text-purple-600 hover:text-purple-800 underline font-semibold flex items-center gap-0.5"
                                    >
                                      <Download className="h-2.5 w-2.5" />
                                      다운로드
                                    </button>
                                  )}
                                  <span className="text-purple-600">관리 이력</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="text-zinc-600 font-medium block mb-1">
                    견적 산출 조건 및 협력사 특기사항 (선택 입력)
                  </label>
                  <textarea 
                    value={submitForm.vendorNotes}
                    onChange={(e) => setSubmitForm({ ...submitForm, vendorNotes: e.target.value })}
                    rows={2}
                    placeholder="상하원판 S55C, 메인코어 NAK80 열처리 강재 사용 및 핫러너(HRS+EDGE) 특수사양 반영 완료 등..."
                    className="w-full rounded border bg-white p-2 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-zinc-50 border-t flex items-center justify-between">
              <span className="text-[11px] text-zinc-500">
                * 제출 즉시 MPSI 금형 견적 심의 화면으로 전달됩니다.
              </span>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setIsSubmitModalOpen(false)} 
                  disabled={isSubmitting}
                  variant="outline" 
                  className="h-8 text-xs px-3"
                >
                  취소
                </Button>
                <Button 
                  onClick={handleSaveQuoteSubmit} 
                  disabled={isSubmitting || isUploadingFile}
                  className="h-8 text-xs px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold gap-1 shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>DB 저장 중...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>MPSI로 견적서 최종 제출</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. 견적서 상세 조회 모달 (MPSI 답변 확인 포함) */}
      {/* ========================================================================= */}
      {isDetailModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border rounded-lg shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 border-b">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">
                  [{getQuoteNoDisplay(selectedItem)}] {selectedItem.productName} 견적 상세
                </span>
                {renderStatusBadge(getVendorSpecificStatus(selectedItem))}
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex flex-col gap-3 text-xs">
              {/* 요약 바 */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 bg-zinc-50 p-3 rounded-md border text-center">
                <div>
                  <div className="text-[10px] text-zinc-400">PJT 관리번호</div>
                  <div className="font-mono font-bold text-purple-700">
                    {getProjectNoDisplay(selectedItem)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">금형번호 / 차수</div>
                  <div className="font-mono text-purple-900 font-bold mt-0.5">
                    {selectedItem.moldNo || (getProjectNoDisplay(selectedItem).startsWith("MI") ? `${getProjectNoDisplay(selectedItem).split("-")[0].replace(/P0$/, "")}M` : "-")}
                    <span className="ml-1 text-[10px] px-1 py-0.2 rounded bg-purple-100 text-purple-800 border">{selectedItem.moldDegree || "M1"}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">제작 가능일수</div>
                  <div className="font-bold text-zinc-800">{selectedItem.availableMfgDays || 38}일</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">목표 T1 납기</div>
                  <div className="font-bold text-purple-600">{selectedItem.targetT1Date}</div>
                </div>
                <div>
                  <div className="text-[10px] text-purple-700 font-bold">금형 출고 납기</div>
                  <div className="font-bold text-purple-700">{selectedItem.moldDeliveryDate || "-"}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">제출 견적금액</div>
                  <div className="font-mono font-bold text-amber-600 text-sm">
                    {(() => {
                      const myQuote = getMyVendorQuote(selectedItem);
                      return myQuote && (myQuote.totalAmountWon || 0) > 0 
                        ? `${(myQuote.totalAmountWon || 0).toLocaleString()}원` 
                        : (myQuote ? "0원 (제출완료)" : "미제출");
                    })()}
                  </div>
                </div>
              </div>

              {/* MPSI 기술 근거 자료 뷰어 */}
              {selectedItem.specDocuments && selectedItem.specDocuments.length > 0 && (
                <div className="border border-sky-200 rounded p-2.5 bg-sky-50/30">
                  <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-sky-100 font-bold text-sky-900 text-xs">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-sky-600" />
                      MPSI 기술 근거 자료 (배포 문서)
                    </span>
                    {selectedItem.targetCycleTime && (
                      <span className="text-[10px] text-purple-700">목표 C/T: {selectedItem.targetCycleTime}초</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {selectedItem.specDocuments.map((doc) => (
                      <div key={doc.id} className="p-1.5 rounded bg-white border text-[11px] flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] text-sky-600 font-semibold block">{doc.categoryName}</span>
                          <span className="font-bold truncate block" title={doc.fileName}>{doc.fileName}</span>
                          <span className="text-[10px] text-zinc-400 truncate block">{doc.memo}</span>
                        </div>
                        <Button 
                          onClick={() => triggerActualFileDownload(doc.fileName, doc.id, doc.downloadUrl, doc.fileUrl, { categoryName: doc.categoryName, version: doc.version })}
                          size="xs" 
                          variant="ghost" 
                          className="h-5 text-[10px] p-0 text-sky-700 hover:underline mt-1 font-semibold"
                        >
                          다운로드
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 금형비 세부 산출 내역 (4대 원가) */}
              <div className="border rounded-md p-3 bg-zinc-50/60">
                <div className="font-bold text-xs text-zinc-800 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-zinc-800">
                    <DollarSign className="h-3.5 w-3.5 text-purple-600" />
                    제출 금형비 세부 산출 내역
                  </span>
                  <span className="text-[10px] text-zinc-400 font-normal">
                    재료비 + 가공비 + 일반관리비/이윤 + 특수사양
                  </span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                  <div className="p-2 bg-white rounded border">
                    <div className="text-[10px] text-zinc-400">1. 재료비</div>
                    <div className="font-mono font-bold text-zinc-800 text-xs">
                      {selectedItem.materialCostWon ? `${selectedItem.materialCostWon.toLocaleString()}원` : "-"}
                    </div>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <div className="text-[10px] text-zinc-400">2. 가공비</div>
                    <div className="font-mono font-bold text-zinc-800 text-xs">
                      {selectedItem.processingCostWon ? `${selectedItem.processingCostWon.toLocaleString()}원` : "-"}
                    </div>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <div className="text-[10px] text-zinc-400">3. 일반관리비 및 이윤</div>
                    <div className="font-mono font-bold text-zinc-800 text-xs">
                      {selectedItem.overheadProfitWon ? `${selectedItem.overheadProfitWon.toLocaleString()}원` : "-"}
                    </div>
                  </div>
                  <div className="p-2 bg-white rounded border">
                    <div className="text-[10px] text-zinc-400">4. 특수사양</div>
                    <div className="font-mono font-bold text-purple-700 text-xs">
                      {selectedItem.specialSpecWon ? `${selectedItem.specialSpecWon.toLocaleString()}원` : "-"}
                    </div>
                  </div>
                  <div className="p-2 bg-purple-50 rounded border border-purple-300">
                    <div className="text-[10px] text-purple-700 font-semibold">금형비 합계금액</div>
                    <div className="font-mono font-bold text-purple-900 text-xs">
                      {selectedItem.quoteAmountWon ? `${selectedItem.quoteAmountWon.toLocaleString()}원` : "-"}
                    </div>
                  </div>
                </div>
              </div>

              {/* 견적 제출 메모 및 변경 이력 - 자사 제출 건만 필터링 */}
              {selectedItem.submissionHistory && selectedItem.submissionHistory.length > 0 && (() => {
                const myHistory = selectedItem.submissionHistory.filter(h => isMatchingVendor(h.author, currentVendor));
                if (myHistory.length === 0) return null;
                return (
                  <div className="border border-purple-200 rounded-md p-3 bg-purple-50/30 space-y-2">
                    <div className="font-bold text-purple-950 flex items-center justify-between pb-1 border-b border-purple-200">
                      <span className="flex items-center gap-1.5 text-xs">
                        <MessageSquare className="h-3.5 w-3.5 text-purple-700" />
                        [{currentVendor}] 견적 제출 메모 및 변경 이력 (관리 이력 {myHistory.length}건)
                      </span>
                      <span className="text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                        관리 이력
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {myHistory.map((hist) => (
                        <div key={hist.id} className="p-2 rounded bg-white border border-purple-100 flex flex-col gap-1 text-[11px] shadow-2xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                hist.submissionType === "수정 제출" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                              }`}>
                                [{hist.revisionNo}차] {hist.submissionType}
                              </span>
                              <span className="font-bold text-zinc-800">{cleanCompanyAuthor(hist.author, currentVendor)}</span>
                              <span className="text-zinc-400 font-mono text-[10px]">{hist.submittedAt}</span>
                            </div>
                            <div className="font-mono font-bold text-purple-700">
                              {hist.amountWon.toLocaleString()}원
                              {hist.availableMfgDays && <span className="text-zinc-500 font-normal ml-1">({hist.availableMfgDays}일)</span>}
                            </div>
                          </div>
                          <p className="bg-zinc-50 p-1.5 rounded text-zinc-700 whitespace-pre-wrap">{hist.memo}</p>
                          <div className="flex items-center justify-between text-[10px] text-zinc-400">
                            <span className="flex items-center gap-1">
                              <FileSpreadsheet className="h-3 w-3 text-emerald-600" />
                              당시 파일: <b className="text-zinc-600">{hist.fileName}</b> {hist.fileSize && `(${hist.fileSize})`}
                            </span>
                            <div className="flex items-center gap-2">
                              {hist.fileName && (
                                <button
                                  type="button"
                                  onClick={() => triggerActualFileDownload(hist.fileName, hist.id, hist.downloadUrl, hist.fileUrl)}
                                  className="text-purple-600 hover:text-purple-800 underline font-semibold flex items-center gap-0.5"
                                >
                                  <Download className="h-2.5 w-2.5" />
                                  다운로드
                                </button>
                              )}
                              <span className="text-purple-600 font-medium">관리 이력</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* [신규 기능 2] MPSI 답변 및 네고 협의 이력 */}
              {(() => {
                const myQuote = getMyVendorQuote(selectedItem);
                return (
                  <div className="border border-purple-200 rounded-md p-3 bg-purple-50/30 space-y-2">
                    <div className="font-bold text-purple-950 flex items-center justify-between pb-1 border-b border-purple-200">
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-purple-600" />
                        MPSI 본사 검토 의견 및 네고 협의 내역
                      </span>
                      <span className="text-[10px] text-purple-700">
                        답변 {myQuote?.mpsiReplies?.length || 0}건
                      </span>
                    </div>

                    {myQuote?.mpsiReplies && myQuote.mpsiReplies.length > 0 ? (
                      <div className="space-y-1.5 max-h-32 overflow-y-auto">
                        {myQuote.mpsiReplies.map((rep) => (
                          <div key={rep.id} className="p-2 rounded bg-white border border-purple-100 flex flex-col gap-0.5">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-bold text-purple-800">{rep.author}</span>
                              <span className="text-zinc-400 font-mono">{rep.createdAt}</span>
                            </div>
                            <p className="text-zinc-700 text-[11px]">{rep.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-zinc-400 py-2 text-center">
                        아직 등록된 MPSI 검토 답변이 없습니다. (심의 진행중)
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 일반 메모 및 협의 이력 - MPSI 및 자사 작성 메모만 필터링 (타사 메모 비노출) */}
              {(() => {
                const visibleMemos = (selectedItem.memos || []).filter((m) => 
                  m.author.includes("MPSI") || isMatchingVendor(m.author, currentVendor)
                );
                return (
                  <div className="border rounded-md p-3 flex flex-col gap-2">
                    <div className="font-bold text-zinc-800 flex items-center gap-1 pb-1 border-b">
                      <MessageSquare className="h-3.5 w-3.5 text-purple-600" />
                      <span>협의 메모 이력 ({visibleMemos.length})</span>
                    </div>
                    <div className="flex items-start gap-1.5 bg-zinc-50 p-2 rounded-md border">
                      <textarea 
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="MPSI에 전달할 문의 또는 협의 내용을 입력하세요..."
                        className="w-full h-12 p-1.5 text-xs bg-white border rounded resize-none"
                      />
                      <Button onClick={handleAddComment} size="xs" className="h-12 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs">
                        등록
                      </Button>
                    </div>
                    <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                      {visibleMemos.length === 0 ? (
                        <div className="p-2 text-center text-zinc-400 text-xs">등록된 협의 메모가 없습니다.</div>
                      ) : (
                        visibleMemos.map((m) => (
                          <div key={m.id} className="p-2 rounded border bg-zinc-50 text-xs">
                            <div className="flex items-center justify-between font-bold mb-0.5">
                              <span className={m.author.includes("MPSI") ? "text-purple-700 font-bold" : "text-zinc-800"}>{m.author}</span>
                              <span className="text-[10px] text-zinc-400">{m.createdAt}</span>
                            </div>
                            <p>{m.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="px-4 py-3 bg-zinc-50 border-t flex justify-end">
              <Button onClick={() => setIsDetailModalOpen(false)} className="h-7 text-xs px-4">
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Search, RefreshCw, Plus, Eye, 
  CheckCircle2, AlertCircle, 
  Building2, Send, Download, X, Layers, Upload,
  Paperclip, FileSpreadsheet, Trash2,
  Calendar, Package, Sparkles, MessageSquare,
  ArrowRight, ThumbsUp, ThumbsDown, Check, User, Clock,
  SendHorizontal, Factory, Gauge, DollarSign, Calculator, FileCheck2,
  Wrench, ChevronDown, ChevronUp, CheckSquare, Square, MessageCircle, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangeFilter, isWithinDateRange, DatePresetType } from "@/components/common/date-range-filter";
import { useProjectMaster } from "@/lib/project-store";
import { MASS_VENDOR_LIST } from "@/lib/role-store";
import { sendAppNotification } from "@/lib/notification-store";
import { 
  useMassQuotationStore, 
  MassProductionEstimateItem, 
  MassQuotationStatus,
  MassVendorQuoteSubmission
} from "@/lib/mass-quotation-store";

export default function MassProductionQuotationPage() {
  const { projects } = useProjectMaster();
  const { 
    estimates, 
    addEstimate, 
    updateStatus, 
    updateVendorQuoteStatus,
    addMpsiReplyToVendorQuote,
    addComment,
    refreshFromDb,
    isLoading
  } = useMassQuotationStore();

  // 검색 상태
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("ALL");
  const [filterVendor, setFilterVendor] = useState("ALL");
  const [filterType, setFilterType] = useState<"ALL" | "OUTSOURCING" | "IN_HOUSE">("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePresetType>("all");

  // 모달 상태
  const [selectedItem, setSelectedItem] = useState<MassProductionEstimateItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // 상세 모달 내 확장(Accordion) 상태 및 공급업체 메모 MPSI 답변 입력 상태
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});

  // 댓글 입력 상태
  const [newComment, setNewComment] = useState("");

  // 신규 등록 폼 상태
  const [newForm, setNewForm] = useState({
    productionType: "OUTSOURCING" as "OUTSOURCING" | "IN_HOUSE",
    projectNo: "MI26001P0",
    projectName: "현대 NT5 도어 트림 모듈",
    productName: "",
    customerName: "현대자동차 (1차사)",
    vendorName: "(주)뉴몰드",
    assignedVendors: ["전체 업체"] as string[], // 견적 요청 대상 사출처 목록
    targetMassApprovalDate: "2026-08-30",       // 양산 승인 납기일
    resinSpec: "PP-TD20",
    resinPricePerKg: 2800,
    partWeightGram: 320,
    runnerWeightGram: 35,
    cavity: "1*2 Cavity",
    machineTonnage: "650T",
    targetCycleTime: 36,
    sph: 100,
    monthlyVolume: 25000,
    materialCost: 994,
    processingCost: 720,
    packagingCost: 150,
    logisticsCost: 136,
    finalUnitPrice: 0,
    estimateFileName: "",
    estimateFileSize: "",
    notes: ""
  });

  // 프로젝트 선택 연동 (직접 입력 없이 등록된 프로젝트 선택만 허용)
  const [selectedProjectNo, setSelectedProjectNo] = useState<string>("");

  // estimates 변경 시 열려 있는 selectedItem 동기화
  useEffect(() => {
    if (selectedItem) {
      const found = estimates.find((e) => e.estimateNo === selectedItem.estimateNo || e.id === selectedItem.id);
      if (found) {
        setSelectedItem(found);
      }
    }
  }, [estimates]);

  const handleSelectProject = (pNo: string) => {
    setSelectedProjectNo(pNo);
    if (!pNo) {
      setNewForm({
        productionType: "OUTSOURCING",
        projectNo: "",
        projectName: "",
        productName: "",
        customerName: "",
        vendorName: "(주)뉴몰드",
        assignedVendors: ["전체 업체"],
        targetMassApprovalDate: "2026-08-30",
        resinSpec: "",
        resinPricePerKg: 0,
        partWeightGram: 0,
        runnerWeightGram: 0,
        cavity: "",
        machineTonnage: "",
        targetCycleTime: 0,
        sph: 0,
        monthlyVolume: 0,
        materialCost: 0,
        processingCost: 0,
        packagingCost: 0,
        logisticsCost: 0,
        finalUnitPrice: 0,
        estimateFileName: "",
        estimateFileSize: "",
        notes: ""
      });
      return;
    }

    const found = projects.find((p) => p.projectNo === pNo);
    if (found) {
      let matchedVendor = "(주)뉴몰드";
      if (found.massVendor) {
        if (found.massVendor.includes("뉴몰드")) matchedVendor = "(주)뉴몰드";
        else if (found.massVendor.includes("세원")) matchedVendor = "세원사출(주)";
        else matchedVendor = found.massVendor;
      }

      const resin = (found as any).resinSpec || found.material || "PP-TD20";
      const cav = found.cavity ? (found.cavity.includes("Cavity") ? found.cavity : `${found.cavity} Cavity`) : "1*3 Cavity";
      const monthlyVol = found.orderQty 
        ? Math.round(found.orderQty / 12) 
        : ((found as any).annualVolume ? Math.round(Number((found as any).annualVolume) / 12) : 250);
      const partW = Number(String((found as any).partWeight || "").replace(/[^0-9.]/g, "")) || 100;
      const runnerW = 15;
      const resinPrice = 2800;
      const machineTon = (found as any).machineTon 
        ? (String((found as any).machineTon).includes("T") ? String((found as any).machineTon) : `${(found as any).machineTon}T`) 
        : (found.facilityEvent?.includes("T") ? found.facilityEvent : "700T");
      const calc = calculateCosts(resinPrice, partW, runnerW, cav, 35);

      // 프로젝트 번호는 항상 M으로 시작 보장
      const pjtDisplayName = found.projectNo.toUpperCase().startsWith("M")
        ? found.projectNo
        : `MI${found.projectNo.replace(/^Q/i, "")}`;

      setNewForm((prev) => ({
        ...prev,
        projectNo: pjtDisplayName,
        projectName: found.projectName,
        productName: found.productName,
        customerName: found.customerName,
        vendorName: found.massProductionType === "IN_HOUSE" ? "MPSI 자체사출공장" : matchedVendor,
        assignedVendors: found.massProductionType === "IN_HOUSE" ? ["MPSI 자체사출공장"] : [matchedVendor],
        productionType: found.massProductionType === "IN_HOUSE" ? "IN_HOUSE" : "OUTSOURCING",
        targetMassApprovalDate: found.targetMassDate || "2026-12-20",
        targetCycleTime: 35,
        machineTonnage: machineTon,
        resinSpec: resin,
        resinPricePerKg: resinPrice,
        partWeightGram: partW,
        runnerWeightGram: runnerW,
        cavity: cav,
        monthlyVolume: monthlyVol,
        materialCost: calc.materialCost,
        processingCost: calc.processingCost,
        packagingCost: calc.packagingCost,
        logisticsCost: calc.logisticsCost,
        finalUnitPrice: found.massProductionType === "IN_HOUSE" ? calc.finalUnitPrice : 0,
        sph: calc.sph,
        notes: found.notes || `${found.projectName} - ${found.productName} 양산 사출 견적 요청`
      }));
    }
  };

  // 외주처 다중 선택 토글 핸들러 (체크박스 필터 방식)
  const handleToggleVendor = (vendorName: string) => {
    if (vendorName === "전체 업체") {
      setNewForm((prev) => ({
        ...prev,
        assignedVendors: prev.assignedVendors.includes("전체 업체") ? [] : ["전체 업체"]
      }));
      return;
    }

    setNewForm((prev) => {
      let current = prev.assignedVendors.filter((v) => v !== "전체 업체");
      if (current.includes(vendorName)) {
        current = current.filter((v) => v !== vendorName);
      } else {
        current = [...current, vendorName];
      }
      return {
        ...prev,
        assignedVendors: current.length === MASS_VENDOR_LIST.length ? ["전체 업체"] : current
      };
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 원가 자동 계산 헬퍼
  const calculateCosts = (
    resinPrice: number, 
    partWeight: number, 
    runnerWeight: number, 
    cavityStr: string,
    cycleTime: number
  ) => {
    const match = cavityStr.match(/\*(\d+)/);
    const cavCount = match ? parseInt(match[1]) : 1;
    
    const totalWeightPerPart = partWeight + (runnerWeight / cavCount);
    const matCost = Math.round((totalWeightPerPart / 1000) * resinPrice * 1.02);
    const procCost = Math.round((cycleTime * 20) / cavCount);
    const packCost = 150;
    const logCost = Math.round((matCost + procCost + packCost) * 0.06);
    const total = matCost + procCost + packCost + logCost;

    return {
      materialCost: matCost,
      processingCost: procCost,
      packagingCost: packCost,
      logisticsCost: logCost,
      finalUnitPrice: total,
      sph: cycleTime > 0 ? Math.round(3600 / cycleTime) : 0
    };
  };

  // 신규 등록 시 파라미터 변경 핸들러
  const handleParamChange = (field: string, value: any) => {
    const updated = { ...newForm, [field]: value };
    if (["resinPricePerKg", "partWeightGram", "runnerWeightGram", "cavity", "targetCycleTime"].includes(field)) {
      const calc = calculateCosts(
        Number(updated.resinPricePerKg || 0),
        Number(updated.partWeightGram || 0),
        Number(updated.runnerWeightGram || 0),
        updated.cavity,
        Number(updated.targetCycleTime || 30)
      );
      updated.materialCost = calc.materialCost;
      updated.processingCost = calc.processingCost;
      updated.packagingCost = calc.packagingCost;
      updated.logisticsCost = calc.logisticsCost;
      if (updated.productionType === "IN_HOUSE") {
        updated.finalUnitPrice = calc.finalUnitPrice;
      }
      updated.sph = calc.sph;
    }
    setNewForm(updated);
  };

  // 실제 파일 다운로드 핸들러
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

  // 실제 파일 업로드
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

    setNewForm((prev) => ({
      ...prev,
      estimateFileName: file.name,
      estimateFileSize: sizeStr,
      estimateFileUrl: uploadedUrl || `/uploads/${encodeURIComponent(file.name)}`,
    }));
  };

  // 검색 필터링
  const filteredEstimates = estimates.filter((item) => {
    const matchKeyword = filterKeyword
      ? item.estimateNo.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        item.projectNo.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        item.productName.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        item.resinSpec.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        item.vendorName.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        item.customerName.toLowerCase().includes(filterKeyword.toLowerCase())
      : true;

    const matchCust = filterCustomer !== "ALL" ? item.customerName === filterCustomer : true;
    const matchVendor = filterVendor !== "ALL" ? item.vendorName === filterVendor : true;
    const matchType = filterType !== "ALL" ? item.productionType === filterType : true;
    const matchStatus = filterStatus !== "ALL" ? item.status === filterStatus : true;
    
    const targetDate = item.submittedDate || item.requestDate;
    const matchDate = isWithinDateRange(targetDate, filterDateFrom, filterDateTo);

    return matchKeyword && matchCust && matchVendor && matchType && matchStatus && matchDate;
  });

  const handleReset = () => {
    setFilterKeyword("");
    setFilterCustomer("ALL");
    setFilterVendor("ALL");
    setFilterType("ALL");
    setFilterStatus("ALL");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSelectedDatePreset("all");
  };

  // 신규 등록 저장
  const handleSaveNewEstimate = () => {
    if (!selectedProjectNo || !newForm.projectNo) {
      alert("견적을 등록할 대상 프로젝트를 선택해주세요.");
      return;
    }
    if (!newForm.productName.trim()) {
      alert("선택된 프로젝트의 제품명이 올바르지 않습니다.");
      return;
    }
    if (newForm.productionType === "OUTSOURCING" && newForm.assignedVendors.length === 0) {
      alert("견적 요청을 발송할 사출 양산처를 최소 1개사 이상 선택해주세요.");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const initialStatus: MassQuotationStatus = 
      newForm.productionType === "OUTSOURCING" ? "견적요청" : "자체진행";

    // 프로젝트 번호는 항상 M으로 시작 보장
    const formattedPjtNo = newForm.projectNo.toUpperCase().startsWith("M")
      ? newForm.projectNo
      : `MI${newForm.projectNo.replace(/^Q/i, "")}`;

    // 외주사 표기명 결정
    let vendorDisplayName = "(주)뉴몰드";
    if (newForm.productionType === "IN_HOUSE") {
      vendorDisplayName = "MPSI 자체사출공장";
    } else if (newForm.assignedVendors.includes("전체 업체")) {
      vendorDisplayName = `전체 양산처 (${MASS_VENDOR_LIST.length}개사)`;
    } else if (newForm.assignedVendors.length === 1) {
      vendorDisplayName = newForm.assignedVendors[0];
    } else {
      vendorDisplayName = `${newForm.assignedVendors[0]} 외 ${newForm.assignedVendors.length - 1}개사`;
    }

    const generatedEstimateNo = `${formattedPjtNo}사출견적`;

    addEstimate({
      estimateNo: generatedEstimateNo,
      projectNo: formattedPjtNo,
      officialProjectNo: formattedPjtNo,
      projectName: newForm.projectName,
      productName: newForm.productName.trim(),
      customerName: newForm.customerName,
      vendorName: vendorDisplayName,
      assignedVendors: newForm.productionType === "IN_HOUSE" ? ["MPSI 자체사출공장"] : newForm.assignedVendors,
      productionType: newForm.productionType,
      resinSpec: newForm.resinSpec,
      resinPricePerKg: Number(newForm.resinPricePerKg || 0),
      partWeightGram: Number(newForm.partWeightGram || 0),
      runnerWeightGram: Number(newForm.runnerWeightGram || 0),
      cavity: newForm.cavity,
      machineTonnage: newForm.machineTonnage,
      targetCycleTime: Number(newForm.targetCycleTime || 0),
      targetMassApprovalDate: newForm.targetMassApprovalDate || "2026-08-30",
      sph: Number(newForm.sph || 0),
      monthlyVolume: Number(newForm.monthlyVolume || 0),
      materialCost: newForm.productionType === "IN_HOUSE" ? newForm.materialCost : 0,
      processingCost: newForm.productionType === "IN_HOUSE" ? newForm.processingCost : 0,
      packagingCost: newForm.productionType === "IN_HOUSE" ? newForm.packagingCost : 0,
      logisticsCost: newForm.productionType === "IN_HOUSE" ? newForm.logisticsCost : 0,
      finalUnitPrice: newForm.productionType === "IN_HOUSE" ? Number(newForm.finalUnitPrice) : 0,
      estimateFileName: newForm.estimateFileName,
      estimateFileSize: newForm.estimateFileSize,
      estimateFileDate: newForm.estimateFileName ? today : "",
      status: initialStatus,
      submittedDate: newForm.estimateFileName ? today : "",
      notes: newForm.notes,
      comments: []
    });

    setIsNewModalOpen(false);
    if (newForm.productionType === "OUTSOURCING") {
      const assignedNames = newForm.assignedVendors.includes("전체 업체") ? "전체 협력사(4개사)" : newForm.assignedVendors.join(", ");
      alert(`[외주요청 완료] 사출 협력사(${assignedNames})에 양산 견적요청이 전송되었습니다.\n상단 역할 전환에서 [양산외주] 협력사로 이동하시면 바로 견적서 작성이 가능합니다.`);
    } else {
      alert(`[자체생산 등록 완료] MPSI 자체 사출공장 건으로 '자체생산' 상태로 등록되었습니다.`);
    }
  };

  // 협력사 견적 상태 변경 (검토시작, 수주확정, 반려/미성사)
  const handleVendorQuoteStatusChange = (
    quote: MassVendorQuoteSubmission,
    newStatus: "검토협의" | "수주확정" | "반려/미성사"
  ) => {
    if (!selectedItem) return;
    updateVendorQuoteStatus(selectedItem.estimateNo, quote.id, newStatus);

    setSelectedItem((prev) => {
      if (!prev) return null;
      const updatedQuotes = (prev.vendorQuotes || []).map((vq) => {
        if (newStatus === "수주확정") {
          return {
            ...vq,
            status: vq.id === quote.id ? ("수주확정" as const) : ("반려/미성사" as const),
          };
        }
        if (vq.id === quote.id) {
          return { ...vq, status: newStatus };
        }
        return vq;
      });

      let nextEstimateStatus = prev.status;
      let nextVendorName = prev.vendorName;
      let nextSelectedVendorName = prev.selectedVendorName;
      let nextUnitPrice = prev.finalUnitPrice;
      let nextMatCost = prev.materialCost;
      let nextProcCost = prev.processingCost;
      let nextPackCost = prev.packagingCost;
      let nextLogCost = prev.logisticsCost;

      if (newStatus === "수주확정") {
        nextEstimateStatus = "단가합의완료";
        nextVendorName = quote.vendorName;
        nextSelectedVendorName = quote.vendorName;
        nextUnitPrice = quote.unitPrice;
        nextMatCost = quote.materialCost;
        nextProcCost = quote.processingCost;
        nextPackCost = quote.packagingCost;
        nextLogCost = quote.logisticsCost;

        sendAppNotification({
          menuName: "양산외주 - 양산견적관리",
          menuPath: "/portal/vendor-portal/mass/quotation",
          senderCompany: "MPSI",
          content: `[${prev.projectNo || prev.estimateNo}] 양산 견적 수주 확정 완료! (양산성 검증 단계로 연계됩니다)`,
          projectNo: prev.projectNo || prev.estimateNo,
          targetRole: "VENDOR_MASS",
          targetVendorName: quote.vendorName,
        });
      } else if (newStatus === "검토협의") {
        nextEstimateStatus = "원가검토중";
      }

      return {
        ...prev,
        status: nextEstimateStatus,
        vendorName: nextVendorName,
        selectedVendorName: nextSelectedVendorName,
        finalUnitPrice: nextUnitPrice,
        materialCost: nextMatCost,
        processingCost: nextProcCost,
        packagingCost: nextPackCost,
        logisticsCost: nextLogCost,
        vendorQuotes: updatedQuotes,
      };
    });
  };

  // 공급업체 메모에 대한 MPSI 답변 작성 및 등록
  const handleSaveMpsiReply = (submissionId: string) => {
    if (!selectedItem) return;
    const replyText = replyInputs[submissionId]?.trim();
    if (!replyText) {
      alert("공급업체 메모에 대한 MPSI 답변 내용을 입력해주세요.");
      return;
    }

    addMpsiReplyToVendorQuote(selectedItem.estimateNo, submissionId, replyText);
    setReplyInputs((prev) => ({ ...prev, [submissionId]: "" }));

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const timeStr = `${dateStr} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    setSelectedItem((prev) => {
      if (!prev) return null;
      const updatedQuotes = (prev.vendorQuotes || []).map((vq) => {
        if (vq.id !== submissionId) return vq;
        return {
          ...vq,
          mpsiReplies: [
            ...(vq.mpsiReplies || []),
            {
              id: `reply-${Date.now()}`,
              author: "MPSI 양산관리팀",
              content: replyText,
              createdAt: timeStr,
            },
          ],
        };
      });
      return { ...prev, vendorQuotes: updatedQuotes };
    });
  };

  // 댓글 등록
  const handleAddComment = () => {
    if (!newComment.trim() || !selectedItem) return;
    addComment(selectedItem.estimateNo, "MPSI", "MPSI", newComment.trim());

    // 외주사로 알림 발송
    sendAppNotification({
      menuName: "양산외주 - 양산견적관리",
      menuPath: "/portal/vendor-portal/mass/quotation",
      senderCompany: "MPSI",
      content: `[${selectedItem.projectNo || selectedItem.estimateNo}] MPSI 견적 단가 협의 소견: ${newComment.trim()}`,
      projectNo: selectedItem.projectNo || selectedItem.estimateNo,
      targetRole: "VENDOR_MASS",
      targetVendorName: selectedItem.vendorQuotes?.[0]?.vendorName || "(주)뉴몰드",
    });

    setNewComment("");

    setSelectedItem((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        comments: [
          ...prev.comments,
          {
            id: `comm-${Date.now()}`,
            author: "MPSI",
            authorRole: "MPSI",
            content: newComment.trim(),
            createdAt: new Date().toISOString().replace("T", " ").substring(0, 16)
          }
        ]
      };
    });
  };

  // 상태 변경
  const handleStatusChange = (newStatus: MassQuotationStatus) => {
    if (!selectedItem) return;
    updateStatus(selectedItem.estimateNo, newStatus);
    setSelectedItem((prev) => prev ? { ...prev, status: newStatus } : null);
  };

  // 상태 배지 렌더러
  const renderStatusBadge = (status: MassQuotationStatus) => {
    switch (status) {
      case "견적요청":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300">
            <Clock className="h-3 w-3 animate-pulse text-amber-600" />
            견적요청 (외주대기)
          </span>
        );
      case "자체진행":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-300">
            <Factory className="h-3 w-3 text-purple-600" />
            자체생산 (MPSI)
          </span>
        );
      case "외주견적제출":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-300">
            <Send className="h-3 w-3 text-blue-600" />
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
            양산계약확정
          </span>
        );
      default:
        return <span className="text-zinc-500">{status}</span>;
    }
  };

  // 견적서 첨부 건수 렌더러 (예: 2/4, 0/4)
  const getAttachmentDisplay = (item: MassProductionEstimateItem) => {
    if (item.productionType === "IN_HOUSE") {
      return item.estimateFileName ? "1/1" : "0/1";
    }
    const totalVendors = item.assignedVendors?.includes("전체 업체") 
      ? MASS_VENDOR_LIST.length 
      : (item.assignedVendors?.length || MASS_VENDOR_LIST.length);
    const submittedCount = item.vendorQuotes?.length || (item.estimateFileName ? 1 : 0);
    return `${submittedCount}/${totalVendors}`;
  };

  return (
    <div className="flex flex-col gap-3 p-3 max-w-full text-xs">
      {/* 헤더 */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-950/50 rounded text-blue-700 dark:text-blue-300">
              <Factory className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                양산 견적 관리
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  사출 임가공 단가 & 원가 계산 (외주 시스템 연동)
                </span>
              </h1>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                사출 양산 부품의 수지(Resin) 단가, C/T, 임가공비, 부자재비를 바탕으로 신규 양산 견적을 요청하거나 자체 진행하며 외주사((주)뉴몰드 등)와 시스템을 통해 협업합니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button 
              onClick={() => setIsNewModalOpen(true)}
              className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1 font-bold shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              신규 양산 견적 등록
            </Button>
          </div>
        </div>
      </div>

      {/* 필터 바 */}
      <div className="bg-white dark:bg-zinc-900 p-3 rounded-md border shadow-xs flex flex-col gap-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">검색어</span>
            <Input 
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              placeholder="예: MI26001, PP-TD20, 뉴몰드..."
              className="h-7 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">생산 방식</span>
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="h-7 rounded-md border bg-transparent px-2 text-xs font-semibold"
            >
              <option value="ALL">전체 방식</option>
              <option value="OUTSOURCING">외주생산</option>
              <option value="IN_HOUSE">자체생산 (MPSI)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">사출처 (협력사)</span>
            <select 
              value={filterVendor}
              onChange={(e) => setFilterVendor(e.target.value)}
              className="h-7 rounded-md border bg-transparent px-2 text-xs font-semibold"
            >
              <option value="ALL">전체 사출처</option>
              {MASS_VENDOR_LIST.map((v) => (
                <option key={v.id} value={v.name}>{v.name}</option>
              ))}
              <option value="MPSI 자체사출공장">MPSI 자체사출공장</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">진행 상태</span>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-7 rounded-md border bg-transparent px-2 text-xs font-semibold"
            >
              <option value="ALL">전체 상태</option>
              <option value="견적요청">견적요청 (외주대기)</option>
              <option value="자체진행">자체생산 (MPSI)</option>
              <option value="외주견적제출">외주견적제출</option>
              <option value="원가검토중">원가검토/단가협의중</option>
              <option value="단가합의완료">단가합의완료</option>
              <option value="양산계약확정">양산계약확정</option>
            </select>
          </div>
          <div className="flex items-end justify-end gap-1.5">
            <Button onClick={() => {}} className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white gap-1 text-xs">
              <Search className="h-3.5 w-3.5" />
              검색
            </Button>
            <Button onClick={handleReset} variant="outline" className="h-7 px-2.5 gap-1 text-xs text-zinc-600">
              <RefreshCw className="h-3.5 w-3.5" />
              초기화
            </Button>
          </div>
        </div>
      </div>

      {/* 테이블 목록 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b">
          <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-100">
            <Factory className="h-4 w-4 text-blue-600" />
            <span>양산 견적 관리대장 (사출단가 및 원가 심의)</span>
            <span className="text-[11px] font-normal text-zinc-500 ml-1">
              (총 <b className="text-blue-600 font-mono">{filteredEstimates.length}</b>건)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              onClick={refreshFromDb}
              disabled={isLoading}
              variant="outline"
              className="h-7 px-2.5 text-xs gap-1 text-sky-700 dark:text-sky-300 border-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 cursor-pointer font-semibold"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-sky-600" : ""}`} />
              DB 동기화
            </Button>
            <Button 
              onClick={() => alert("양산 견적 목록이 엑셀 파일로 다운로드되었습니다.")}
              variant="outline" 
              className="h-7 px-2.5 text-xs gap-1 text-zinc-600 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              엑셀 다운로드
            </Button>
            <Button 
              onClick={() => setIsNewModalOpen(true)}
              className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1 cursor-pointer font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              신규 등록
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b text-[11px] text-zinc-500 font-semibold whitespace-nowrap">
                {/* 1열: No 컬럼 맨 앞 배치 */}
                <th className="py-2.5 px-2 text-center w-10">No</th>
                {/* 2열: 프로젝트 번호 (항상 M으로 시작) */}
                <th className="py-2.5 px-2.5">프로젝트 번호</th>
                {/* 3열: 견적번호 */}
                <th className="py-2.5 px-2.5">견적번호</th>
                {/* 4열: 진행상태 */}
                <th className="py-2.5 px-2.5">진행상태</th>
                {/* 5열: 구분 (외주생산 / 자체생산) */}
                <th className="py-2.5 px-2.5">구분</th>
                {/* 6열: 제품명 / 고객사 */}
                <th className="py-2.5 px-2.5">제품명 / 고객사</th>
                {/* 7열: 사출양산처 */}
                <th className="py-2.5 px-2.5">사출양산처</th>
                {/* 8열: 레진(Resin) / 사양 */}
                <th className="py-2.5 px-2.5">레진(Resin) / 사양</th>
                {/* 9열: 목표 C/T (초) */}
                <th className="py-2.5 px-2.5 text-center">목표 C/T (초)</th>
                {/* 10열: 월간 수량 (EA) */}
                <th className="py-2.5 px-2.5 text-right">월간 수량 (EA)</th>
                {/* 11열: 최종 납품단가 (원/EA) */}
                <th className="py-2.5 px-2.5 text-right">최종 납품단가 (원/EA)</th>
                {/* 12열: 견적서 첨부 (2/4 표기) */}
                <th className="py-2.5 px-2.5 text-center">견적서 첨부</th>
                {/* 13열: 양산승인 납기일 (협의 메모 삭제 후 대체) */}
                <th className="py-2.5 px-2.5 text-center">양산승인 납기일</th>
                {/* 14열: 관리 */}
                <th className="py-2.5 px-2.5 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredEstimates.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-8 text-center text-zinc-400">
                    조회된 양산 견적 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredEstimates.map((item, idx) => {
                  const pjtDisplay = item.projectNo.toUpperCase().startsWith("M") 
                    ? item.projectNo 
                    : (item.officialProjectNo || `MI${item.projectNo.replace(/^Q/i, "")}`);

                  return (
                    <tr 
                      key={item.id} 
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      {/* 1열 No */}
                      <td className="py-2 px-2 text-center text-zinc-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* 2열 프로젝트 번호 */}
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        <div className="font-mono font-bold text-blue-700 dark:text-blue-300">
                          {pjtDisplay}
                        </div>
                      </td>

                      {/* 3열 견적번호 */}
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        <div className="font-mono text-zinc-700 dark:text-zinc-300 font-semibold">
                          {item.estimateNo}
                        </div>
                      </td>

                      {/* 4열 진행상태 */}
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        {renderStatusBadge(item.status)}
                      </td>

                      {/* 5열 구분 (외주생산 / 자체생산) */}
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        {item.productionType === "OUTSOURCING" ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                            외주생산
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                            자체생산
                          </span>
                        )}
                      </td>

                      {/* 6열 제품명 / 고객사 */}
                      <td className="py-2 px-2.5">
                        <div className="font-bold text-zinc-800 dark:text-zinc-200">
                          {item.productName}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {item.projectName} · {item.customerName}
                        </div>
                      </td>

                      {/* 7열 사출양산처 (수주 확정 시 결정된 업체만 표기, 미정 시 배포 정보) */}
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        <div className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-blue-500 shrink-0" />
                          <span>
                            {item.status === "단가합의완료" || item.status === "양산계약확정"
                              ? (item.selectedVendorName || item.vendorName)
                              : item.productionType === "IN_HOUSE"
                              ? "MPSI 자체사출공장"
                              : item.assignedVendors?.includes("전체 업체")
                              ? "전체 양산처 (4개사)"
                              : (item.assignedVendors && item.assignedVendors.length > 0)
                              ? (item.assignedVendors.length === 1 ? item.assignedVendors[0] : `${item.assignedVendors[0]} 외 ${item.assignedVendors.length - 1}개사`)
                              : (item.vendorName || "미정")}
                          </span>
                        </div>
                      </td>

                      {/* 8열 레진(Resin) / 사양 */}
                      <td className="py-2 px-2.5">
                        <div className="text-zinc-700 dark:text-zinc-300 font-medium">
                          {item.resinSpec}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {item.cavity} · {item.machineTonnage}
                        </div>
                      </td>

                      {/* 9열 목표 C/T (초) */}
                      <td className="py-2 px-2.5 text-center font-mono text-[11px] text-blue-600 font-bold whitespace-nowrap">
                        {item.targetCycleTime > 0 ? `${item.targetCycleTime}초` : "-"}
                      </td>

                      {/* 10열 월간 수량 (EA) */}
                      <td className="py-2 px-2.5 text-right font-mono text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                        {item.monthlyVolume > 0 ? `${item.monthlyVolume.toLocaleString()} EA` : "-"}
                      </td>

                      {/* 11열 최종 납품단가 (원/EA) */}
                      <td className="py-2 px-2.5 text-right font-mono font-bold whitespace-nowrap">
                        {item.finalUnitPrice > 0 ? (
                          <span className="text-blue-600 text-sm">{item.finalUnitPrice.toLocaleString()}원</span>
                        ) : (
                          <span className="text-zinc-400 italic">견적 대기중</span>
                        )}
                      </td>

                      {/* 12열 견적서 첨부 (2/4 형식 표기, 파일명 X) */}
                      <td className="py-2 px-2.5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center font-mono font-bold text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {getAttachmentDisplay(item)}
                        </span>
                      </td>

                      {/* 13열 양산승인 납기일 (협의 메모 컬럼 대체) */}
                      <td className="py-2 px-2.5 text-center font-mono text-[11px] text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                        {item.targetMassApprovalDate || "-"}
                      </td>

                      {/* 14열 관리 */}
                      <td className="py-2 px-2.5 text-center whitespace-nowrap">
                        <Button 
                          onClick={() => {
                            setSelectedItem(item);
                            setExpandedSubmissionId(item.vendorQuotes?.[0]?.id || null);
                            setIsDetailModalOpen(true);
                          }}
                          variant="outline" 
                          size="xs" 
                          className="h-6 text-[11px] px-2 gap-1 text-blue-700 hover:bg-blue-50 cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                          상세/심의
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

      {/* 신규 등록 모달 */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-950/50 border-b">
              <div className="flex items-center gap-2">
                <Factory className="h-4 w-4 text-blue-600" />
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  신규 양산 견적 등록
                </span>
              </div>
              <button onClick={() => setIsNewModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex flex-col gap-3.5 text-xs">
              {/* 1. 대상 프로젝트 선택 (프로젝트 마스터 연동) */}
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-blue-600" />
                    대상 프로젝트 선택 (프로젝트 마스터 연동)
                  </label>
                  <span className="text-[10px] text-blue-600 font-medium">선택 시 프로젝트 및 사양 자동 연동</span>
                </div>
                <select
                  value={selectedProjectNo}
                  onChange={(e) => handleSelectProject(e.target.value)}
                  className="w-full h-8 rounded-md border border-blue-300 dark:border-blue-700 bg-white dark:bg-zinc-900 px-2 text-xs font-bold text-blue-900 dark:text-blue-200 shadow-xs cursor-pointer"
                >
                  <option value="">-- 대상 프로젝트를 선택하세요 (필수 선택) --</option>
                  {projects.map((p) => {
                    const pNoDisplay = p.projectNo.toUpperCase().startsWith("M") 
                      ? p.projectNo 
                      : `MI${p.projectNo.replace(/^Q/i, "")}`;
                    return (
                      <option key={`${p.id}-${p.projectNo}`} value={p.projectNo}>
                        [{pNoDisplay}] {p.projectName} - {p.productName} ({p.customerName} / {p.massVendor || "사출처미지정"}){p.changeType ? ` [${p.changeType}]` : ""}
                      </option>
                    );
                  })}
                </select>
                {!selectedProjectNo && (
                  <p className="text-[11px] text-amber-600 font-semibold mt-0.5">
                    * 위 목록에서 견적을 진행할 대상 프로젝트를 반드시 선택해야 합니다. (M 채번 프로젝트 자동 연동)
                  </p>
                )}
              </div>

              {/* 2. 진행 방식 선택 (외주생산 / 자체생산) */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-md border flex flex-col gap-2">
                <span className="font-bold text-zinc-800 dark:text-zinc-200">
                  생산 진행 방식 선택
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewForm({ ...newForm, productionType: "OUTSOURCING" })}
                    className={`py-2 px-3 rounded-md border flex items-center justify-center gap-2 font-bold cursor-pointer transition-all ${
                      newForm.productionType === "OUTSOURCING"
                        ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                        : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>외주생산 ("견적요청" 상태)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewForm({ ...newForm, productionType: "IN_HOUSE" })}
                    className={`py-2 px-3 rounded-md border flex items-center justify-center gap-2 font-bold cursor-pointer transition-all ${
                      newForm.productionType === "IN_HOUSE"
                        ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                        : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    <Factory className="h-3.5 w-3.5" />
                    <span>MPSI 자체생산 ("자체생산" 상태)</span>
                  </button>
                </div>
              </div>

              {/* 3. 외주배포 시 협력사 다중 선택 (전체 업체 또는 개별 체크박스 필터 선택) */}
              {newForm.productionType === "OUTSOURCING" ? (
                <div className="p-3 bg-blue-50/40 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-zinc-800 dark:text-zinc-200 font-bold text-xs flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      견적 요청 발송 대상 사출 양산처 (복수 선택 가능)
                    </label>
                    <span className="text-[10px] text-zinc-400">
                      선택: {newForm.assignedVendors.includes("전체 업체") ? "전체 협력사 (4개사)" : (newForm.assignedVendors.join(", ") || "미선택")}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {/* "전체 업체" 토글 버튼 */}
                    <button
                      type="button"
                      onClick={() => handleToggleVendor("전체 업체")}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                        newForm.assignedVendors.includes("전체 업체")
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-300 hover:bg-zinc-50"
                      }`}
                    >
                      {newForm.assignedVendors.includes("전체 업체") ? (
                        <CheckSquare className="h-3.5 w-3.5" />
                      ) : (
                        <Square className="h-3.5 w-3.5" />
                      )}
                      전체 업체 (4개사 일괄 배포)
                    </button>

                    {/* 개별 사출처 체크박스 */}
                    {MASS_VENDOR_LIST.map((v) => {
                      const isSelected = newForm.assignedVendors.includes("전체 업체") || newForm.assignedVendors.includes(v.name);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleToggleVendor(v.name)}
                          className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200"
                              : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 hover:bg-zinc-50"
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
                          ) : (
                            <Square className="h-3.5 w-3.5 text-zinc-400" />
                          )}
                          {v.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-md border border-purple-200">
                  <div className="flex items-center gap-2">
                    <Factory className="h-4 w-4 text-purple-600" />
                    <span className="font-bold text-xs text-purple-900 dark:text-purple-200">MPSI 자체 사출공장 직접 생산 관리</span>
                  </div>
                </div>
              )}

              {/* 기본 정보 (프로젝트 마스터 연동 - 직접 수정 불가) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-600 font-medium block mb-1">
                    PJT 관리번호 <span className="text-[10px] text-zinc-400">(자동연동)</span>
                  </label>
                  <Input 
                    value={newForm.projectNo}
                    readOnly
                    placeholder="프로젝트 선택 시 자동입력"
                    className="h-7 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono font-bold cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-zinc-600 font-medium block mb-1">
                    원청 고객사명 <span className="text-[10px] text-zinc-400">(자동연동)</span>
                  </label>
                  <Input 
                    value={newForm.customerName}
                    readOnly
                    placeholder="프로젝트 선택 시 자동입력"
                    className="h-7 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-600 font-medium block mb-1">
                    프로젝트명 / 차종 <span className="text-[10px] text-zinc-400">(자동연동)</span>
                  </label>
                  <Input 
                    value={newForm.projectName}
                    readOnly
                    placeholder="프로젝트 선택 시 자동입력"
                    className="h-7 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-zinc-600 font-medium block mb-1">
                    제품명 <span className="text-[10px] text-zinc-400">(자동연동)</span>
                  </label>
                  <Input 
                    value={newForm.productName}
                    readOnly
                    placeholder="프로젝트 선택 시 자동입력"
                    className="h-7 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold cursor-not-allowed"
                  />
                </div>
              </div>

              {/* 4. 사출기 사양 옆에 양산 승인 납기일 및 목표 CT 표기/입력 */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-md border space-y-2">
                <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5 text-blue-600" />
                  사출 생산 조건 및 납기 사양 (필수 사양)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-zinc-600 font-medium block mb-1">사출기 사양 (톤수)</label>
                    <Input 
                      value={newForm.machineTonnage}
                      onChange={(e) => handleParamChange("machineTonnage", e.target.value)}
                      placeholder="예: 650T"
                      className="h-7 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-blue-700 dark:text-blue-300 font-bold block mb-1">목표 C/T (초)</label>
                    <div className="relative">
                      <Input 
                        type="number"
                        min={1}
                        value={newForm.targetCycleTime || ""}
                        onChange={(e) => handleParamChange("targetCycleTime", Number(e.target.value))}
                        placeholder="예: 36"
                        className="h-7 text-xs font-mono font-bold text-blue-700 pr-6"
                      />
                      <span className="absolute right-2 top-1.5 text-[10px] text-zinc-400 pointer-events-none">초</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-blue-700 dark:text-blue-300 font-bold block mb-1">양산 승인 납기일</label>
                    <Input 
                      type="date"
                      value={newForm.targetMassApprovalDate || ""}
                      onChange={(e) => setNewForm({ ...newForm, targetMassApprovalDate: e.target.value })}
                      className="h-7 text-xs font-mono font-bold border-blue-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div>
                    <label className="text-zinc-600 font-medium block mb-1">적용 수지(Resin)</label>
                    <Input 
                      value={newForm.resinSpec}
                      onChange={(e) => handleParamChange("resinSpec", e.target.value)}
                      placeholder="예: PP-TD20"
                      className="h-7 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-600 font-medium block mb-1">Cavity</label>
                    <Input 
                      value={newForm.cavity}
                      onChange={(e) => handleParamChange("cavity", e.target.value)}
                      placeholder="예: 1*2 Cavity"
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-600 font-medium block mb-1">월간 예상 양산 수량 (EA)</label>
                    <Input 
                      type="number"
                      value={newForm.monthlyVolume || ""}
                      onChange={(e) => setNewForm({ ...newForm, monthlyVolume: Number(e.target.value) })}
                      placeholder="예: 25000"
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* 자체생산 시 자동 원가 계산 표시 */}
              {newForm.productionType === "IN_HOUSE" ? (
                <div className="p-3 bg-blue-50/60 rounded-md border border-blue-200 flex flex-col gap-2">
                  <span className="font-bold text-blue-800">MPSI 사내 원가 산출 (EA당)</span>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white p-1.5 rounded border">
                      <span className="text-[10px] text-zinc-400 block">재료비</span>
                      <span className="font-bold font-mono">{newForm.materialCost}원</span>
                    </div>
                    <div className="bg-white p-1.5 rounded border">
                      <span className="text-[10px] text-zinc-400 block">가공비</span>
                      <span className="font-bold font-mono">{newForm.processingCost}원</span>
                    </div>
                    <div className="bg-white p-1.5 rounded border">
                      <span className="text-[10px] text-zinc-400 block">포장/물류</span>
                      <span className="font-bold font-mono">{newForm.packagingCost + newForm.logisticsCost}원</span>
                    </div>
                    <div className="bg-blue-100 p-1.5 rounded border border-blue-300">
                      <span className="text-[10px] text-blue-600 block font-bold">최종 단가</span>
                      <span className="font-bold font-mono text-blue-700">{newForm.finalUnitPrice}원</span>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* 자체생산 시 견적서 파일 첨부 */}
              {newForm.productionType === "IN_HOUSE" && (
                <div className="border border-dashed rounded-md p-3 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    accept=".xlsx,.xls,.pdf"
                  />
                  {newForm.estimateFileName ? (
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-bold">{newForm.estimateFileName}</div>
                        <div className="text-[10px] text-zinc-400">{newForm.estimateFileSize}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-zinc-500">
                      자체 양산 단가 산출서 (Excel/PDF) 첨부
                    </div>
                  )}
                  <Button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline" 
                    className="h-7 text-xs gap-1 border-blue-500 text-blue-700 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    파일 선택
                  </Button>
                </div>
              )}

              <div>
                <label className="text-zinc-600 font-medium block mb-1">양산 조건 및 요청 비고</label>
                <textarea 
                  value={newForm.notes}
                  onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
                  placeholder="예: 월 25,000EA 납품 가능 여부, C/T 36초 이하 조건, 로스율 3% 반영 등"
                  className="w-full h-14 p-2 rounded-md border text-xs bg-transparent resize-none"
                />
              </div>
            </div>

            <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-t flex justify-end gap-2">
              <Button onClick={() => setIsNewModalOpen(false)} variant="outline" className="h-7 text-xs cursor-pointer">
                취소
              </Button>
              <Button onClick={handleSaveNewEstimate} className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1 font-bold cursor-pointer">
                <Check className="h-3.5 w-3.5" />
                {newForm.productionType === "OUTSOURCING" ? "외주 양산 견적요청 발송" : "자체생산 등록"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 상세 심의 모달 (복수 협력사 견적 제출 내역 및 6대 세부 원가 아코디언) */}
      {isDetailModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border rounded-lg shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* 모달 제목: [{견적관리번호}] {제품명} 양산 견적 상세 */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-b">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  [{selectedItem.estimateNo}] {selectedItem.productName} 양산 견적 상세
                </span>
                {renderStatusBadge(selectedItem.status)}
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex flex-col gap-3.5 text-xs">
              {/* 상단 4대 요약 카드: PJT 관리번호 / 사출양산처 / 프로젝트명·제품명 / 양산승인 납기일 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-md border text-center">
                <div className="p-1">
                  <div className="text-[10px] text-zinc-400 font-medium">PJT 관리번호</div>
                  <div className="font-mono font-bold text-blue-700 dark:text-blue-300 text-sm mt-0.5">
                    {selectedItem.projectNo.toUpperCase().startsWith("M") 
                      ? selectedItem.projectNo 
                      : (selectedItem.officialProjectNo || `MI${selectedItem.projectNo.replace(/^Q/i, "")}`)}
                  </div>
                  <span className="text-[9.5px] text-zinc-400">정식 관리번호</span>
                </div>
                <div className="p-1">
                  <div className="text-[10px] text-zinc-400 font-medium">사출양산처</div>
                  <div className="font-bold text-zinc-800 dark:text-zinc-100 text-sm mt-0.5 truncate">
                    {selectedItem.status === "단가합의완료" || selectedItem.status === "양산계약확정"
                      ? (selectedItem.selectedVendorName || selectedItem.vendorName)
                      : selectedItem.productionType === "IN_HOUSE"
                      ? "MPSI 자체사출공장"
                      : selectedItem.assignedVendors?.includes("전체 업체")
                      ? "[전체업체] (4개사)"
                      : (selectedItem.assignedVendors && selectedItem.assignedVendors.length > 0)
                      ? (selectedItem.assignedVendors.length === 1 ? selectedItem.assignedVendors[0] : `${selectedItem.assignedVendors[0]} 외 ${selectedItem.assignedVendors.length - 1}개사`)
                      : (selectedItem.vendorName || "미정")}
                  </div>
                  <span className="text-[9.5px] text-zinc-400">
                    {selectedItem.status === "단가합의완료" || selectedItem.status === "양산계약확정" ? "✓ 최종 확정처" : "배포 대상"}
                  </span>
                </div>
                <div className="p-1">
                  <div className="text-[10px] text-zinc-400 font-medium">프로젝트명 / 제품명</div>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs mt-0.5 truncate" title={`${selectedItem.projectName} · ${selectedItem.productName}`}>
                    {selectedItem.productName}
                  </div>
                  <span className="text-[9.5px] text-zinc-400 truncate block">{selectedItem.projectName}</span>
                </div>
                <div className="p-1">
                  <div className="text-[10px] text-blue-700 dark:text-blue-300 font-bold">양산승인 납기일</div>
                  <div className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm mt-0.5">
                    {selectedItem.targetMassApprovalDate || "2026-08-30"}
                  </div>
                  <span className="text-[9.5px] text-zinc-400">PPAP 승인 목표일</span>
                </div>
              </div>

              {/* 1. 사출 성형 및 생산 기본 사양 */}
              <div className="border rounded-lg p-3 bg-white dark:bg-zinc-900 shadow-xs">
                <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-blue-700 dark:text-blue-400 font-bold">
                    <Gauge className="h-3.5 w-3.5" />
                    사출 성형 및 생산 기본 사양 (필수 사양 규격)
                  </span>
                  <span className="text-[10px] text-zinc-400">사출기 사양 · 적용수지 · Cavity · 중량 · C/T · 월간수량</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                  <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded border">
                    <span className="text-zinc-400 text-[10px] block">사출기 사양</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{selectedItem.machineTonnage || "650T"}</span>
                  </div>
                  <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded border">
                    <span className="text-zinc-400 text-[10px] block">적용 수지(Resin)</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate block" title={selectedItem.resinSpec}>{selectedItem.resinSpec}</span>
                  </div>
                  <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded border">
                    <span className="text-zinc-400 text-[10px] block">Cavity 구성</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{selectedItem.cavity || "-"}</span>
                  </div>
                  <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded border">
                    <span className="text-zinc-400 text-[10px] block">제품 / 런너 중량</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{selectedItem.partWeightGram}g / {selectedItem.runnerWeightGram}g</span>
                  </div>
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded border border-blue-200 dark:border-blue-800">
                    <span className="text-blue-700 dark:text-blue-300 text-[10px] font-bold block">목표 C/T (초)</span>
                    <span className="font-mono font-bold text-blue-950 dark:text-blue-200">{selectedItem.targetCycleTime || 36} 초</span>
                  </div>
                  <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded border">
                    <span className="text-zinc-400 text-[10px] block">월간 예상 수량</span>
                    <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{selectedItem.monthlyVolume ? `${selectedItem.monthlyVolume.toLocaleString()} EA` : "-"}</span>
                  </div>
                </div>
              </div>

              {/* 2. 복수 사출 협력사 견적 제출 목록 (직관적 비교 심의 및 수주확정 선택) */}
              <div className="border rounded-lg p-3 bg-white dark:bg-zinc-900 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                      사출 협력사별 견적 제출 목록 (직관적 비교 심의 및 수주확정)
                    </span>
                    <span className="text-[11px] text-blue-700 font-mono font-bold ml-1">
                      (총 {selectedItem.vendorQuotes?.length || 0}개사 접수)
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400">
                    각 업체를 클릭하면 6대 세부 원가구성/견적서 파일/공급업체 메모가 확장됩니다.
                  </span>
                </div>

                {(!selectedItem.vendorQuotes || selectedItem.vendorQuotes.length === 0) ? (
                  <div className="p-6 text-center text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border">
                    <Clock className="h-8 w-8 mx-auto text-amber-500/70 mb-2 animate-pulse" />
                    <p className="font-bold text-xs text-zinc-700 dark:text-zinc-300">
                      아직 협력사로부터 제출된 양산 견적서가 없습니다.
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      사출 협력사((주)뉴몰드 등) 화면에서 견적서를 작성·제출하면 여기에 비교 리스트가 자동 취합됩니다.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <table className="w-full text-left text-xs border-collapse border rounded-md overflow-hidden">
                      <thead className="bg-zinc-100 dark:bg-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-300 font-bold border-b">
                        <tr>
                          <th className="py-2 px-2.5 text-center w-10">순</th>
                          <th className="py-2 px-2.5">업체명</th>
                          <th className="py-2 px-2.5 text-center">제출일자</th>
                          <th className="py-2 px-2.5 text-right font-bold text-blue-700 dark:text-blue-300">견적 제출 단가 (원/EA)</th>
                          <th className="py-2 px-2.5 text-center w-64">상태변환</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                        {selectedItem.vendorQuotes.map((vq, vIdx) => {
                          const isExpanded = expandedSubmissionId === vq.id;
                          const isWinner = vq.status === "수주확정";

                          return (
                            <React.Fragment key={vq.id}>
                              <tr 
                                onClick={() => setExpandedSubmissionId(isExpanded ? null : vq.id)}
                                className={`cursor-pointer transition-colors ${
                                  isWinner 
                                    ? "bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100/60" 
                                    : isExpanded 
                                    ? "bg-blue-50/50 dark:bg-zinc-800" 
                                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                }`}
                              >
                                <td className="py-2.5 px-2.5 text-center font-mono font-bold text-zinc-500">
                                  {vIdx + 1}
                                </td>
                                <td className="py-2.5 px-2.5">
                                  <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                    <span>{vq.vendorName}</span>
                                    {isWinner && (
                                      <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-emerald-600 text-white shadow-2xs">
                                        수주확정
                                      </span>
                                    )}
                                    <span className="text-[10px] text-blue-600 hover:underline inline-flex items-center">
                                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-2.5 text-center font-mono text-zinc-600 dark:text-zinc-400">
                                  {vq.submittedDate}
                                </td>
                                <td className="py-2.5 px-2.5 text-right font-mono font-bold text-sm text-blue-700 dark:text-blue-300">
                                  {vq.unitPrice.toLocaleString()}원
                                </td>
                                <td className="py-2.5 px-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      size="xs"
                                      variant={vq.status === "검토협의" ? "default" : "outline"}
                                      onClick={() => handleVendorQuoteStatusChange(vq, "검토협의")}
                                      className={`h-6 text-[10px] px-2 cursor-pointer ${
                                        vq.status === "검토협의" 
                                          ? "bg-yellow-500 hover:bg-yellow-600 text-white font-bold" 
                                          : "border-yellow-400 text-yellow-800 hover:bg-yellow-50"
                                      }`}
                                    >
                                      검토시작
                                    </Button>
                                    <Button
                                      size="xs"
                                      onClick={() => handleVendorQuoteStatusChange(vq, "수주확정")}
                                      className={`h-6 text-[10px] px-2 font-bold cursor-pointer ${
                                        isWinner 
                                          ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs" 
                                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                                      }`}
                                    >
                                      <Check className="h-3 w-3 mr-0.5" />
                                      수주 확정
                                    </Button>
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      onClick={() => handleVendorQuoteStatusChange(vq, "반려/미성사")}
                                      className={`h-6 text-[10px] px-1.5 cursor-pointer ${
                                        vq.status === "반려/미성사"
                                          ? "bg-rose-100 text-rose-800 border-rose-300"
                                          : "text-zinc-400 hover:text-rose-600 border-zinc-200"
                                      }`}
                                    >
                                      반려·미성사
                                    </Button>
                                  </div>
                                </td>
                              </tr>

                              {/* 아코디언 확장 영역 (6대 세부 원가 구성 + 파일다운로드 + 메모 + MPSI 답변) */}
                              {isExpanded && (
                                <tr>
                                  <td colSpan={5} className="p-0 border-t bg-zinc-50/70 dark:bg-zinc-800/40">
                                    <div className="p-3.5 space-y-3 text-xs animate-in fade-in">
                                      {/* 1. 6대 세부 원가 구성 (사출단가 구성요소) */}
                                      <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border">
                                        <div className="font-bold text-zinc-800 dark:text-zinc-200 text-xs mb-2 flex items-center justify-between">
                                          <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                                            <DollarSign className="h-3.5 w-3.5" />
                                            1. [{vq.vendorName}] 세부 원가 산출 내역 (6대 원가 구성비)
                                          </span>
                                          <span className="font-mono text-zinc-500">
                                            제출일자: <b className="text-zinc-700 dark:text-zinc-300">{vq.submittedDate}</b> (목표 C/T {selectedItem.targetCycleTime || 36}초)
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-7 gap-1.5 text-center">
                                          <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded border">
                                            <span className="text-[10px] text-zinc-400 block">재료비</span>
                                            <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                                              {vq.materialCost ? `${vq.materialCost.toLocaleString()}원` : "-"}
                                            </span>
                                          </div>
                                          <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded border">
                                            <span className="text-[10px] text-zinc-400 block">가공비(임가공)</span>
                                            <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                                              {vq.processingCost ? `${vq.processingCost.toLocaleString()}원` : "-"}
                                            </span>
                                          </div>
                                          <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded border">
                                            <span className="text-[10px] text-zinc-400 block">일반관리비</span>
                                            <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                                              {vq.overheadCost ? `${vq.overheadCost.toLocaleString()}원` : "-"}
                                            </span>
                                          </div>
                                          <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded border">
                                            <span className="text-[10px] text-zinc-400 block">이윤</span>
                                            <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                                              {vq.profitCost ? `${vq.profitCost.toLocaleString()}원` : "-"}
                                            </span>
                                          </div>
                                          <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded border">
                                            <span className="text-[10px] text-zinc-400 block">포장비</span>
                                            <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                                              {vq.packagingCost ? `${vq.packagingCost.toLocaleString()}원` : "-"}
                                            </span>
                                          </div>
                                          <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded border">
                                            <span className="text-[10px] text-zinc-400 block">운송비</span>
                                            <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                                              {vq.logisticsCost ? `${vq.logisticsCost.toLocaleString()}원` : "-"}
                                            </span>
                                          </div>
                                          <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded border border-blue-300">
                                            <span className="text-[10px] text-blue-700 font-bold block">합계 단가</span>
                                            <span className="font-mono font-bold text-blue-900 dark:text-blue-200">
                                              {vq.unitPrice.toLocaleString()}원
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* 2. 공급업체 제출 견적서 파일 내역 */}
                                      <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <FileSpreadsheet className="h-5 w-5 text-blue-600 shrink-0" />
                                          <div>
                                            <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                              <span>{vq.quotationFileName || "첨부 견적서 파일 없음"}</span>
                                              <span className="text-[10px] text-zinc-400">({vq.quotationFileSize || "2.1 MB"})</span>
                                            </div>
                                            <div className="text-[10px] text-zinc-500">
                                              공급업체 공식 제출 사출 단가계산서 (제출일자: {vq.submittedDate})
                                            </div>
                                          </div>
                                        </div>
                                        {vq.quotationFileName && (
                                          <Button
                                            size="xs"
                                            onClick={() => handleDownloadFile(vq.quotationFileName, vq.quotationFileUrl)}
                                            className="h-6 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1 cursor-pointer font-semibold shadow-xs"
                                          >
                                            <Download className="h-3 w-3" />
                                            견적서 다운로드
                                          </Button>
                                        )}
                                      </div>

                                      {/* 3. 공급업체 작성 소견 및 메모 */}
                                      {/* [히든 처리] 사용자 요청: 하단 '단가 협의 및 전체 소견'과 중복되어 3. 소견 메모 숨김 처리 */}
                                      {false && vq.vendorNotes && (
                                        <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-blue-950 dark:text-blue-200">
                                          <span className="font-bold block text-[11px] text-blue-700 dark:text-blue-300 mb-0.5">
                                            3. 공급업체({vq.vendorName}) 작성 소견 및 특약 메모:
                                          </span>
                                          <p className="text-xs">{vq.vendorNotes}</p>
                                        </div>
                                      )}

                                      {/* 4. 공급업체 메모에 대한 MPSI 답변 작성 및 이력 */}
                                      {/* [히든 처리] 사용자 요청: 하단 '단가 협의 및 전체 소견'과 중복되어 4. MPSI 답변 영역 비노출 */}
                                      <div className="hidden p-2.5 rounded-lg bg-white dark:bg-zinc-900 border space-y-2">
                                        <div className="flex items-center justify-between pb-1 border-b">
                                          <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                                            <MessageCircle className="h-3.5 w-3.5 text-blue-600" />
                                            4. 공급업체 메모에 대한 MPSI 답변 및 단가 네고 기록 ({vq.mpsiReplies?.length || 0}건)
                                          </span>
                                          <span className="text-[10px] text-zinc-400">외주사와 단가/일정 조율 피드백</span>
                                        </div>

                                        {/* 답변 입력 폼 */}
                                        <div className="flex items-start gap-1.5">
                                          <textarea
                                            value={replyInputs[vq.id] || ""}
                                            onChange={(e) => setReplyInputs({ ...replyInputs, [vq.id]: e.target.value })}
                                            placeholder={`${vq.vendorName}의 견적 내용 및 메모에 대한 MPSI 피드백/단가 협의 답변을 작성하세요...`}
                                            className="w-full h-12 p-2 text-xs bg-zinc-50 dark:bg-zinc-800 border rounded resize-none"
                                          />
                                          <Button
                                            size="xs"
                                            onClick={() => handleSaveMpsiReply(vq.id)}
                                            className="h-12 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs shrink-0 cursor-pointer"
                                          >
                                            답변 등록
                                          </Button>
                                        </div>

                                        {/* 답변 내역 리스트 */}
                                        {vq.mpsiReplies && vq.mpsiReplies.length > 0 ? (
                                          <div className="space-y-1.5 pt-1">
                                            {vq.mpsiReplies.map((r) => (
                                              <div key={r.id} className="p-2 rounded bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 text-xs">
                                                <div className="flex items-center justify-between font-bold mb-0.5">
                                                  <span className="text-blue-700 dark:text-blue-300 flex items-center gap-1">
                                                    <Check className="h-3 w-3" />
                                                    {r.author}
                                                  </span>
                                                  <span className="text-[10px] text-zinc-400 font-mono">{r.createdAt}</span>
                                                </div>
                                                <p className="text-zinc-700 dark:text-zinc-200">{r.content}</p>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="text-[10px] text-zinc-400 py-1 text-center">
                                            아직 등록된 MPSI 답변이 없습니다.
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* MPSI 자체진행인 경우 원가 표시 */}
              {selectedItem.productionType === "IN_HOUSE" && (
                <div className="p-3 bg-blue-50/60 rounded-md border border-blue-200 flex flex-col gap-2">
                  <span className="font-bold text-blue-800">MPSI 사내 원가 산출 상세 (EA당)</span>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white p-1.5 rounded border">
                      <span className="text-[10px] text-zinc-400 block">재료비</span>
                      <span className="font-bold font-mono">{selectedItem.materialCost.toLocaleString()}원</span>
                    </div>
                    <div className="bg-white p-1.5 rounded border">
                      <span className="text-[10px] text-zinc-400 block">가공비</span>
                      <span className="font-bold font-mono">{selectedItem.processingCost.toLocaleString()}원</span>
                    </div>
                    <div className="bg-white p-1.5 rounded border">
                      <span className="text-[10px] text-zinc-400 block">포장/물류</span>
                      <span className="font-bold font-mono">{(selectedItem.packagingCost + selectedItem.logisticsCost).toLocaleString()}원</span>
                    </div>
                    <div className="bg-blue-100 p-1.5 rounded border border-blue-300">
                      <span className="text-[10px] text-blue-600 block font-bold">최종 단가</span>
                      <span className="font-bold font-mono text-blue-700">{selectedItem.finalUnitPrice.toLocaleString()}원</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 댓글 및 협의 이력 */}
              <div className="border rounded-md p-3 flex flex-col gap-2">
                <div className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1 pb-1 border-b">
                  <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                  <span>단가 협의 및 전체 소견 ({selectedItem.comments.length})</span>
                </div>
                <div className="flex items-start gap-1.5 bg-zinc-50 dark:bg-zinc-800 p-2 rounded-md border">
                  <textarea 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="단가 네고 소견 및 사출 조건 협의 사항을 입력하세요..."
                    className="w-full h-12 p-1.5 text-xs bg-white dark:bg-zinc-900 border rounded resize-none"
                  />
                  <Button onClick={handleAddComment} size="xs" className="h-12 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs cursor-pointer">
                    등록
                  </Button>
                </div>
                <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                  {selectedItem.comments.map((c) => (
                    <div key={c.id} className="p-2 rounded border bg-zinc-50 dark:bg-zinc-800 text-xs">
                      <div className="flex items-center justify-between font-bold mb-0.5">
                        <span className={c.authorRole === "MPSI" ? "text-blue-700 dark:text-blue-300" : "text-emerald-700 dark:text-emerald-300"}>
                          {c.author}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">{c.createdAt}</span>
                      </div>
                      <p>{c.content}</p>
                    </div>
                  ))}
                </div>
              </div>
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

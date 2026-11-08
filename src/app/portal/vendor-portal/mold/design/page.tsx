"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  FileText, CheckCircle2, AlertTriangle, UploadCloud, Download, 
  Send, Clock, ExternalLink, FileCode, Check, X, 
  Activity, ListTree, Settings, Sparkles, Building2, Eye,
  Search, RefreshCw, MessageSquare, Info, ShieldCheck, CheckSquare,
  Wrench, Layers, FileSpreadsheet, Paperclip, ArrowRight, FolderKanban
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUploader, UploadedFileInfo } from "@/components/common/file-uploader";
import { DateRangeFilter, isWithinDateRange, DatePresetType } from "@/components/common/date-range-filter";
import { 
  useProjectMaster, 
  PROCESS_13_STEPS, 
  getStepActor, 
  getStepBullets, 
  getStepUrl,
  ProjectItem 
} from "@/lib/project-store";
import { useAuthRole } from "@/lib/role-store";
import { 
  useMoldDesignStore, 
  DrawingDesignItem, 
  ProductReviewStatus, 
  MoldDesignReviewStatus 
} from "@/lib/mold-design-store";

export default function VendorMoldDesignPage() {
  const router = useRouter();
  const { 
    designs, 
    updateDesign, 
    addWorkLog, 
    updateProductReviewStatus, 
    updateMoldDesignStatus, 
    uploadDesignFileWithLog 
  } = useMoldDesignStore();

  const { projects, updateStep } = useProjectMaster();
  const { vendorName } = useAuthRole();
  const currentVendor = vendorName || "우성정공(주)";

  // 검색 및 필터 상태
  const [filterProjectNo, setFilterProjectNo] = useState("");
  const [filterProductName, setFilterProductName] = useState("");
  const [filterDrStatus, setFilterDrStatus] = useState("ALL");
  const [filterDesignStatus, setFilterDesignStatus] = useState("ALL");
  const [filterDateType, setFilterDateType] = useState<"updatedAt" | "targetT1Date">("updatedAt");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePresetType>("all");

  // 토스트 메시지
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. [2. 제품검토 협업 모달] (Step 1~4)
  const [isProductReviewModalOpen, setIsProductReviewModalOpen] = useState(false);
  const [selectedReviewItem, setSelectedReviewItem] = useState<DrawingDesignItem | null>(null);

  // 2. [5. 금형설계 협업 모달] (Step 5~6)
  const [isMoldDesignModalOpen, setIsMoldDesignModalOpen] = useState(false);
  const [selectedDesignItem, setSelectedDesignItem] = useState<DrawingDesignItem | null>(null);

  // 3. 파일 업로드 + 메모 필수 입력 팝업 모달 상태
  const [uploadModalTarget, setUploadModalTarget] = useState<{
    isOpen: boolean;
    designId: number;
    fileType: "product3D" | "moldMeetingReport" | "caeReport" | "mold3DData";
    title: string;
    targetName: string;
  }>({
    isOpen: false,
    designId: 0,
    fileType: "moldMeetingReport",
    title: "",
    targetName: "",
  });
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadFileNote, setUploadFileNote] = useState("");
  const [uploadAuthorName, setUploadAuthorName] = useState(`${currentVendor} 한승호 부장`);
  const [selectedUploadFile, setSelectedUploadFile] = useState<UploadedFileInfo | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // 4. 발주서 미리보기 팝업 모달 상태
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [poModalItem, setPoModalItem] = useState<DrawingDesignItem | null>(null);

  // 5. 13단계 프로세스 상세공정 모달 상태
  const [diagramItem, setDiagramItem] = useState<DrawingDesignItem | null>(null);
  const [isDiagramModalOpen, setIsDiagramModalOpen] = useState(false);
  const [modalSelectedItem, setModalSelectedItem] = useState<ProjectItem | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  // 모달 내부 수동 메모 입력
  const [manualNoteContent, setManualNoteContent] = useState("");

  // 스토어의 designs 상태 변경 시 열려있는 모달 아이템 실시간 동기화
  React.useEffect(() => {
    if (selectedReviewItem) {
      const updated = designs.find((d) => d.id === selectedReviewItem.id);
      if (updated) setSelectedReviewItem(updated);
    }
    if (selectedDesignItem) {
      const updated = designs.find((d) => d.id === selectedDesignItem.id);
      if (updated) setSelectedDesignItem(updated);
    }
  }, [designs]);

  // 외주사 전용 프로젝트 필터링 (해당 외주사 배정 프로젝트)
  const vendorDesigns = designs.filter((item) => {
    if (item.projectNo.startsWith("Q")) return false; // 정식 프로젝트 우선
    const isMatched = item.moldVendor.includes(currentVendor) || 
                      currentVendor.includes(item.moldVendor) ||
                      item.moldVendor.includes("우성정공");
    return isMatched;
  });

  // 검색 필터 적용
  const filteredData = vendorDesigns.filter((item) => {
    const matchProject = filterProjectNo
      ? item.projectNo.toLowerCase().includes(filterProjectNo.toLowerCase())
      : true;
    const matchProd = filterProductName
      ? item.productName.toLowerCase().includes(filterProductName.toLowerCase()) ||
        item.projectName.toLowerCase().includes(filterProductName.toLowerCase())
      : true;
    const matchDr = filterDrStatus !== "ALL"
      ? item.drStatus === filterDrStatus
      : true;
    const matchDesign = filterDesignStatus !== "ALL"
      ? item.moldDesignStatus === filterDesignStatus
      : true;
    const targetDate = item[filterDateType];
    const matchDate = isWithinDateRange(targetDate, filterDateFrom, filterDateTo);
    return matchProject && matchProd && matchDr && matchDesign && matchDate;
  });

  // 필터 초기화
  const handleReset = () => {
    setFilterProjectNo("");
    setFilterProductName("");
    setFilterDrStatus("ALL");
    setFilterDesignStatus("ALL");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSelectedDatePreset("all");
  };

  // 1. 제품검토 모달 열기
  const handleOpenProductReviewModal = (item: DrawingDesignItem) => {
    setSelectedReviewItem(item);
    setIsProductReviewModalOpen(true);
  };

  // 2. 금형설계 모달 열기
  const handleOpenMoldDesignModal = (item: DrawingDesignItem) => {
    setSelectedDesignItem(item);
    setIsMoldDesignModalOpen(true);
  };

  // 화면 표시용 파일명 추출 유틸 (URL 인코딩 및 타임스탬프 정돈)
  const getDisplayFileName = (filePath?: string) => {
    if (!filePath || filePath === "파일 없음") return "파일 없음";
    if (filePath.startsWith("미등록")) return filePath;
    try {
      let decoded = decodeURIComponent(filePath);
      if (decoded.startsWith("/uploads/")) {
        decoded = decoded.replace(/^\/uploads\//, "");
      }
      return decoded.replace(/^\d+_/, "");
    } catch {
      return filePath;
    }
  };

  // 실제 파일 다운로드 핸들러 (업로드된 실제 파일명 및 원본 확장자 보존)
  const handleDownloadFile = (filePath?: string, fallbackTitle?: string) => {
    if (!filePath || filePath === "파일 없음" || filePath.startsWith("미등록")) {
      alert("다운로드할 실제 파일이 등록되지 않았습니다.");
      return;
    }

    // 외부 URL인 경우
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      window.open(filePath, "_blank");
      return;
    }

    // /uploads/ 경로 또는 로컬 저장 파일명 처리
    let storedFileName = filePath;
    if (storedFileName.startsWith("/uploads/")) {
      storedFileName = storedFileName.replace(/^\/uploads\//, "");
    }
    try {
      storedFileName = decodeURIComponent(storedFileName);
    } catch {}

    // 실제 원본 파일명 추출 (타임스탬프 접두사 제거) -> 원래 확장자(.zip, .stp, .pdf 등)를 무조건 온전히 보존
    const originalRealName = storedFileName.replace(/^\d+_/, "");
    const finalDownloadName = originalRealName || fallbackTitle || "download";
    const downloadEndpoint = `/api/v1/files/download?file=${encodeURIComponent(storedFileName)}&name=${encodeURIComponent(finalDownloadName)}`;

    const link = document.createElement("a");
    link.href = downloadEndpoint;
    link.setAttribute("download", finalDownloadName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 파일 업로드 모달 열기
  const handleOpenFileUploadModal = (
    designId: number,
    fileType: "product3D" | "moldMeetingReport" | "caeReport" | "mold3DData",
    title: string,
    defaultName: string
  ) => {
    setUploadModalTarget({
      isOpen: true,
      designId,
      fileType,
      title,
      targetName: defaultName,
    });
    setSelectedUploadFile(null);
    setUploadFileName(defaultName);
    setUploadFileNote("");
    setUploadAuthorName(`${currentVendor} 한승호 부장`);
  };

  // 파일 업로드 모달 확인 (실제 서버 업로드 연동)
  const handleConfirmFileUpload = async () => {
    if (!selectedUploadFile && !uploadFileName.trim()) {
      alert("업로드할 실제 파일을 선택해 주세요.");
      return;
    }
    if (!uploadFileNote.trim()) {
      alert("파일 업로드 시 설명 메모 입력은 필수입니다.\n업로드 사유 및 특이사항을 반드시 입력해 주세요.");
      return;
    }

    setIsUploadingFile(true);
    try {
      let finalFilePath = uploadFileName.trim() || selectedUploadFile?.name || "첨부파일";

      // 실제 파일이 선택된 경우 /api/v1/files/upload 엔드포인트로 실제 서버 업로드 실행
      if (selectedUploadFile?.file) {
        const formData = new FormData();
        formData.append("file", selectedUploadFile.file);
        const res = await fetch("/api/v1/files/upload", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (res.ok && json.success) {
          finalFilePath = json.fileUrl || json.downloadUrl || `/uploads/${encodeURIComponent(selectedUploadFile.name)}`;
        }
      }

      uploadDesignFileWithLog(
        uploadModalTarget.designId,
        uploadModalTarget.fileType,
        finalFilePath,
        uploadFileNote.trim(),
        uploadAuthorName.trim() || `${currentVendor} 담당자`,
        "VENDOR"
      );

      // 모달 내부 상태 갱신
      const current = designs.find((d) => d.id === uploadModalTarget.designId);
      if (current) {
        const fieldKey = {
          product3D: "product3DFile",
          moldMeetingReport: "moldMeetingReportFile",
          caeReport: "caeReportFile",
          mold3DData: "mold3DDataFile",
        }[uploadModalTarget.fileType] as keyof DrawingDesignItem;

        const noteKey = {
          product3D: "product3DNote",
          moldMeetingReport: "moldMeetingReportNote",
          caeReport: "caeReportNote",
          mold3DData: "mold3DDataNote",
        }[uploadModalTarget.fileType] as keyof DrawingDesignItem;

        const updatedItem = {
          ...current,
          [fieldKey]: finalFilePath,
          [noteKey]: uploadFileNote.trim(),
        };

        if (selectedReviewItem?.id === current.id) {
          setSelectedReviewItem(updatedItem);
        }
        if (selectedDesignItem?.id === current.id) {
          setSelectedDesignItem(updatedItem);
        }
      }

      showToast(`[${uploadModalTarget.title}] 파일 및 설명 메모가 MPSI 본사로 성공적으로 등록되었습니다.`);
      setUploadModalTarget({ isOpen: false, designId: 0, fileType: "moldMeetingReport", title: "", targetName: "" });
      setSelectedUploadFile(null);
    } catch (err: any) {
      console.error("Vendor design upload error:", err);
      alert(`파일 업로드 실패: ${err.message}`);
    } finally {
      setIsUploadingFile(false);
    }
  };

  // 수동 메모 등록
  const handleAddManualNote = (designId: number) => {
    if (!manualNoteContent.trim()) {
      alert("메모 내용을 입력해 주세요.");
      return;
    }

    addWorkLog(designId, {
      authorName: `${currentVendor} 담당자`,
      authorRole: "VENDOR",
      content: manualNoteContent.trim(),
    });

    setManualNoteContent("");
    showToast("검토 메모가 등록되었습니다.");
  };

  // 제품검토 상태 배지 (1~4단계)
  const getProductReviewBadge = (status: ProductReviewStatus) => {
    switch (status) {
      case "검토 대기":
      case "접수완료":
        return "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300";
      case "검토요청":
      case "CAE검토중":
        return "bg-amber-100 text-amber-800 border-amber-400 dark:bg-amber-950 dark:text-amber-300 font-bold";
      case "수정요청":
      case "수정요청(DR)":
        return "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300 font-bold";
      case "검토완료":
      case "MPSI승인요청":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 font-bold";
      case "최종검토완료":
      case "검토완료(최종확정)":
        return "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300 font-bold";
      default:
        return "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300";
    }
  };

  // 금형설계 현황 배지 (5~6단계)
  const getMoldDesignBadge = (status: MoldDesignReviewStatus) => {
    switch (status) {
      case "검토 대기":
      case "발주대기":
        return "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300";
      case "검토요청":
      case "설계중":
        return "bg-amber-100 text-amber-800 border-amber-400 dark:bg-amber-950 dark:text-amber-300 font-bold";
      case "수정요청":
        return "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300 font-bold";
      case "검토완료":
      case "출도완료":
      case "소재발주완료":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 font-bold";
      default:
        return "bg-zinc-100 text-zinc-600 border-zinc-300";
    }
  };

  // 13단계 다이어그램 모달 열기
  const handleOpenDiagram = (item: DrawingDesignItem) => {
    setDiagramItem(item);
    const matched = projects.find(p => p.projectNo === item.projectNo);
    if (matched) {
      setModalSelectedItem(matched);
    } else {
      setModalSelectedItem({
        id: item.id,
        projectNo: item.projectNo,
        customerName: item.customerName,
        projectName: item.projectName,
        productName: item.productName,
        partNo: "4890",
        moldNo: `${item.projectNo.split("-")[0]}M`,
        cavity: "1*2 Cavity",
        material: "NAK80 / PP-EPDM",
        moldProductionType: "OUTSOURCING",
        moldVendor: item.moldVendor,
        massProductionType: "OUTSOURCING",
        massVendor: "(주)뉴몰드",
        currentStep: item.currentStep,
        stepStatus: "진행중",
        trialDegree: "T1 대기",
        trialCompletionRate: item.currentStep >= 5 ? 50 : 20,
        facilityEvent: "가동대기",
        orderQty: 10000,
        deliveredQty: 0,
        targetT1Date: item.targetT1Date,
        targetMassDate: "2026-11-30",
        updatedAt: item.updatedAt,
      });
    }
    setExpandedStep(null);
    setIsDiagramModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 토스트 알림창 */}
      {toastMessage && (
        <div className="fixed top-4 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-xl bg-purple-700 text-white text-xs font-medium animate-in fade-in">
          <Sparkles className="h-4 w-4" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-80">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 상단 배너 */}
      <div className="bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
        <div className="flex items-start gap-2.5">
          <FileCode className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-purple-900 dark:text-purple-200 text-xs">
                [{currentVendor}] 2. 제품검토 및 금형설계 협업 (MPSI 본사 1:1 연동)
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-200 text-purple-800">
                금형제작처 포털
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
              ① <b>제품검토 협업 (Step 1~4)</b>: 3D 제품 데이터 확인 ➔ <b>금형제작협의록(DR)</b> 및 CAE 보고서 등록 ➔ 금형 발주서(PO) 수신 확인<br />
              ② <b>금형설계 협업 (Step 5~6)</b>: 발주서 확인 후 <b>금형 3D Data</b> 제출 ➔ MPSI의 <b>소재 사전 선발주 승인</b> 상태를 확인하고 가공을 착수합니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white dark:bg-zinc-800 border border-purple-200 text-purple-700 font-semibold text-[11px]">
            <Building2 className="h-3.5 w-3.5" />
            <span>협력사: <b>{currentVendor}</b></span>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 바 */}
      <div className="bg-zinc-50 dark:bg-zinc-900/60 border rounded-lg p-2.5 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-zinc-500 shrink-0">프로젝트 번호:</span>
            <Input
              value={filterProjectNo}
              onChange={(e) => setFilterProjectNo(e.target.value)}
              placeholder="예: MI26001"
              className="h-7 w-28 text-xs bg-white dark:bg-zinc-900 font-mono"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[11px] text-zinc-500 shrink-0">제품명/차종:</span>
            <Input
              value={filterProductName}
              onChange={(e) => setFilterProductName(e.target.value)}
              placeholder="예: Door Cover"
              className="h-7 w-32 text-xs bg-white dark:bg-zinc-900"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[11px] text-zinc-500 shrink-0">제품검토 현황:</span>
            <select
              value={filterDrStatus}
              onChange={(e) => setFilterDrStatus(e.target.value)}
              className="h-7 rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-medium"
            >
              <option value="ALL">전체 현황</option>
              <option value="검토 대기">검토 대기</option>
              <option value="검토요청">검토요청 (협력사 제출)</option>
              <option value="수정요청">수정요청</option>
              <option value="검토완료">검토완료</option>
              <option value="최종검토완료">최종검토완료</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[11px] text-zinc-500 shrink-0">금형설계 현황:</span>
            <select
              value={filterDesignStatus}
              onChange={(e) => setFilterDesignStatus(e.target.value)}
              className="h-7 rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-medium"
            >
              <option value="ALL">전체 현황</option>
              <option value="검토 대기">검토 대기</option>
              <option value="검토요청">검토요청</option>
              <option value="수정요청">수정요청</option>
              <option value="검토완료">검토완료</option>
            </select>
          </div>

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
            <Button onClick={handleReset} variant="outline" size="xs" className="h-7 text-xs gap-1">
              <RefreshCw className="h-3 w-3" />
              초기화
            </Button>
          </div>
        </div>
      </div>

      {/* 메인 데이터 그리드 테이블 */}
      <div className="border rounded-lg bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[580px]">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead className="sticky top-0 z-10 bg-[#1e293b] text-white font-medium text-[11px]">
              <tr className="border-b border-slate-700">
                <th className="p-1.5 w-10 text-center border-r border-slate-600">No</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[120px]">프로젝트 번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[75px] text-center text-amber-300">신작/설변</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[105px] text-center">금형번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[75px] text-center text-purple-300">금형차수</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[150px]">프로젝트 / 차종</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[170px]">제품명</th>
                
                {/* 제품검토 현황 및 협업 액션 */}
                <th className="p-1.5 border-r border-slate-600 min-w-[110px] text-center bg-slate-800">제품검토 현황</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[130px] text-center bg-slate-800">제품검토 협업</th>
                
                {/* 금형설계 현황 및 협업 액션 */}
                <th className="p-1.5 border-r border-slate-600 min-w-[120px] text-center bg-purple-950">금형설계 현황</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[130px] text-center bg-purple-950">금형설계 협업</th>

                <th className="p-1.5 border-r border-slate-600 min-w-[90px] text-center">목표 T1</th>
                <th className="p-1.5 min-w-[100px] text-center">금형 발주서(PO)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-[11px]">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-zinc-400">
                    현재 배정된 제품검토 및 금형설계 대상 프로젝트가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredData.map((row, idx) => {
                  const moldNoDisplay = row.moldNo || (row.projectNo ? `${row.projectNo.split("-")[0].replace(/P0$/, "")}M` : "-");

                  return (
                    <tr key={row.id} className="hover:bg-purple-50/50 dark:hover:bg-zinc-800/60 transition-colors odd:bg-white even:bg-zinc-50/50 dark:odd:bg-zinc-900 dark:even:bg-zinc-900/40">
                      <td className="p-1.5 text-center font-mono text-zinc-400 border-r">{idx + 1}</td>
                      
                      <td className="p-1.5 border-r font-mono font-bold text-purple-700 dark:text-purple-300">
                        <span>{row.projectNo}</span>
                      </td>

                      {/* 신작/설변 (N001, E001) */}
                      <td className="p-1.5 border-r text-center font-mono">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold border shadow-2xs ${
                          row.changeType?.startsWith("E")
                            ? "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300"
                            : "bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300"
                        }`}>
                          {row.changeType || "N001"}
                        </span>
                      </td>

                      {/* 금형번호 */}
                      <td className="p-1.5 border-r text-center font-mono font-bold text-zinc-800 dark:text-zinc-200">
                        {moldNoDisplay}
                      </td>

                      {/* 금형차수 (M1, M2) */}
                      <td className="p-1.5 border-r text-center font-mono">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">
                          {row.moldDegree || "M1"}
                        </span>
                      </td>

                      <td className="p-1.5 border-r font-medium truncate max-w-[150px]" title={row.projectName}>{row.projectName}</td>
                      <td className="p-1.5 border-r font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[170px]" title={row.productName}>{row.productName}</td>

                      {/* 1. 제품검토 현황 */}
                      <td className="p-1.5 border-r text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getProductReviewBadge(row.drStatus)}`}>
                          {row.drStatus}
                        </span>
                      </td>

                      {/* 1-1. 제품검토 협업 버튼 */}
                      <td className="p-1.5 border-r text-center">
                        <Button
                          onClick={() => handleOpenProductReviewModal(row)}
                          size="xs"
                          variant="outline"
                          className="h-6 px-2 text-[10px] gap-1 bg-white hover:bg-sky-50 text-sky-700 border-sky-300 font-bold shadow-xs"
                        >
                          <FileText className="h-3 w-3 text-sky-600" />
                          협의록/CAE 제출
                        </Button>
                      </td>

                      {/* 2. 금형설계 현황 */}
                      <td className="p-1.5 border-r text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getMoldDesignBadge(row.moldDesignStatus)}`}>
                            {row.moldDesignStatus}
                          </span>
                          {row.materialOrderStatus === "승인완료" && (
                            <span className="text-[9px] px-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-bold">
                              ✓ 소재발주 승인됨
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2-1. 금형설계 협업 버튼 */}
                      <td className="p-1.5 border-r text-center">
                        <Button
                          onClick={() => handleOpenMoldDesignModal(row)}
                          size="xs"
                          variant="outline"
                          className="h-6 px-2 text-[10px] gap-1 bg-white hover:bg-purple-50 text-purple-700 border-purple-300 font-bold shadow-xs"
                        >
                          <Wrench className="h-3 w-3 text-purple-600" />
                          금형 3D/소재 확인
                        </Button>
                      </td>

                      <td className="p-1.5 border-r text-center font-mono text-zinc-500">{row.targetT1Date}</td>

                      {/* 발주서 수신 여부 */}
                      <td className="p-1.5 text-center">
                        {row.moldPoApproved ? (
                          <span className="text-[10px] font-bold text-emerald-700 flex items-center justify-center gap-0.5">
                            <Check className="h-3 w-3" />
                            발주서 수신완료
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400">발주 대기</span>
                        )}
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
      {/* [모달 1] 2. 제품검토 협업 모달 (Step 1~4 협력사 뷰) */}
      {/* ========================================================================= */}
      {isProductReviewModalOpen && selectedReviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border rounded-lg shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-xs">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-sky-800 to-indigo-900 text-white">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-sky-200" />
                <span className="font-bold text-sm">
                  도면 성형성검토(DR) 및 제품검토 협업 [{selectedReviewItem.projectNo}]
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-sky-950/60 border border-sky-400/40 text-sky-200 font-medium">
                  2. 제품검토 메뉴 (협력사)
                </span>
              </div>
              <button onClick={() => setIsProductReviewModalOpen(false)} className="text-white/80 hover:text-white p-1 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* 프로젝트 요약 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 bg-sky-50/50 p-2.5 rounded-lg border border-sky-200 text-center text-[11px]">
                <div>
                  <div className="text-[10px] text-zinc-400">프로젝트 번호</div>
                  <div className="font-mono font-bold text-sky-900 mt-0.5">{selectedReviewItem.projectNo}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">금형번호</div>
                  <div className="font-mono font-bold text-purple-800 mt-0.5">
                    {selectedReviewItem.moldNo || (selectedReviewItem.projectNo ? `${selectedReviewItem.projectNo.split("-")[0].replace(/P0$/, "")}M` : "-")}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">금형차수 / 구분</div>
                  <div className="mt-0.5 flex items-center justify-center gap-1">
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300">{selectedReviewItem.moldDegree || "M1"}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-sky-100 text-sky-800 border border-sky-300">{selectedReviewItem.changeType || "N001"}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">프로젝트명</div>
                  <div className="font-bold text-zinc-800 mt-0.5 truncate">{selectedReviewItem.projectName}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">고객사</div>
                  <div className="font-semibold text-zinc-700 mt-0.5">{selectedReviewItem.customerName}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">제품명</div>
                  <div className="font-bold text-zinc-900 mt-0.5 truncate">{selectedReviewItem.productName}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">금형제작처</div>
                  <div className="font-bold text-sky-700 mt-0.5">{selectedReviewItem.moldVendor}</div>
                </div>
              </div>

              {/* 3대 파일함 (협력사 업/다운로드) */}
              <div className="border border-sky-200 rounded-lg p-3.5 bg-white space-y-3 shadow-xs">
                <div className="flex items-center justify-between pb-1 border-b border-sky-100">
                  <span className="font-bold text-sky-900 flex items-center gap-1.5 text-xs">
                    <Layers className="h-4 w-4 text-sky-600" />
                    [Step 1~3] 3D 제품 데이터 확인 & 금형제작협의록/CAE 등록
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400">MPSI 검토 현황:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getProductReviewBadge(selectedReviewItem.drStatus)}`}>
                      {selectedReviewItem.drStatus}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* 1. 3D 제품 data */}
                  <div className="border border-emerald-300 bg-emerald-50/40 rounded-md p-2.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-900 flex items-center gap-1">
                          <FileCode className="h-3.5 w-3.5 text-emerald-600" />
                          3D 제품 data
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenFileUploadModal(selectedReviewItem.id, "product3D", "보정 3D 제품 data", `${selectedReviewItem.projectNo}_Vendor_Rev1.stp`)}
                            title="보정 3D 모델링 업로드"
                            className="p-1 hover:bg-emerald-100 rounded text-emerald-700"
                          >
                            <UploadCloud className="h-3.5 w-3.5" />
                          </button>
                          {selectedReviewItem.product3DFile && (
                            <button
                              onClick={() => handleDownloadFile(selectedReviewItem.product3DFile, `${selectedReviewItem.projectNo}_3D.stp`)}
                              title="다운로드"
                              className="p-1 hover:bg-emerald-100 rounded text-emerald-700 cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 font-mono text-[11px] font-semibold text-emerald-800 truncate" title={selectedReviewItem.product3DFile}>
                        {getDisplayFileName(selectedReviewItem.product3DFile)}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">
                        {selectedReviewItem.product3DNote || "MPSI 배포 3D 제품 원본 데이터"}
                      </p>
                    </div>
                    <div className="text-[9.5px] text-emerald-700 font-medium pt-1.5 border-t border-emerald-200 mt-2">
                      * MPSI 배포 데이터 다운로드 및 보정 3D 업로드
                    </div>
                  </div>

                  {/* 2. 금형 제작 협의록 */}
                  <div className="border border-sky-300 bg-sky-50/40 rounded-md p-2.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sky-900 flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5 text-sky-600" />
                          금형 제작 협의록
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenFileUploadModal(selectedReviewItem.id, "moldMeetingReport", "금형 제작 협의록", `금형제작협의록_${selectedReviewItem.projectNo}_${currentVendor}.pdf`)}
                            title="협의록 업로드"
                            className="p-1 hover:bg-sky-100 rounded text-sky-700"
                          >
                            <UploadCloud className="h-3.5 w-3.5" />
                          </button>
                          {selectedReviewItem.moldMeetingReportFile && (
                            <button
                              onClick={() => handleDownloadFile(selectedReviewItem.moldMeetingReportFile, `금형제작협의록_${selectedReviewItem.projectNo}.pdf`)}
                              title="다운로드"
                              className="p-1 hover:bg-sky-100 rounded text-sky-700 cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 font-mono text-[11px] font-semibold text-sky-800 truncate" title={selectedReviewItem.moldMeetingReportFile}>
                        {getDisplayFileName(selectedReviewItem.moldMeetingReportFile) || "미등록 (업로드 필요)"}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">
                        {selectedReviewItem.moldMeetingReportNote || "파팅라인, 게이트 및 구배각 검토 협의록"}
                      </p>
                    </div>
                    <div className="text-[9.5px] text-sky-700 font-medium pt-1.5 border-t border-sky-200 mt-2">
                      * 협력사 작성 DR 보고서 업로드 필수
                    </div>
                  </div>

                  {/* 3. CAE 해석 보고서 */}
                  <div className="border border-purple-300 bg-purple-50/40 rounded-md p-2.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-900 flex items-center gap-1">
                          <Activity className="h-3.5 w-3.5 text-purple-600" />
                          CAE 해석 보고서
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenFileUploadModal(selectedReviewItem.id, "caeReport", "CAE 해석 보고서", `CAE_Report_${selectedReviewItem.projectNo}_${currentVendor}.pdf`)}
                            title="CAE 보고서 업로드"
                            className="p-1 hover:bg-purple-100 rounded text-purple-700"
                          >
                            <UploadCloud className="h-3.5 w-3.5" />
                          </button>
                          {selectedReviewItem.caeReportFile && (
                            <button
                              onClick={() => handleDownloadFile(selectedReviewItem.caeReportFile, `CAE_Report_${selectedReviewItem.projectNo}.pdf`)}
                              title="다운로드"
                              className="p-1 hover:bg-purple-100 rounded text-purple-700 cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 font-mono text-[11px] font-semibold text-purple-800 truncate" title={selectedReviewItem.caeReportFile}>
                        {getDisplayFileName(selectedReviewItem.caeReportFile) || "미등록 (해석 대기)"}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">
                        {selectedReviewItem.caeReportNote || "유동해석 수축/변형/에어트랩 해석 결과"}
                      </p>
                    </div>
                    <div className="text-[9.5px] text-purple-700 font-medium pt-1.5 border-t border-purple-200 mt-2">
                      * 성형성 해석 결과 보고서 업로드
                    </div>
                  </div>
                </div>

                {/* 업무 이력 메모 (로그) */}
                <div className="bg-slate-900 text-slate-100 p-3 rounded-md space-y-2 border border-slate-700">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-200 pb-1 border-b border-slate-800">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-sky-400" />
                      MPSI ↔ 협력사 업무 이력 메모 스레드
                    </span>
                    <span className="text-[10px] text-slate-400">
                      총 {selectedReviewItem.workLogs?.length || 0}건
                    </span>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
                    {selectedReviewItem.workLogs && selectedReviewItem.workLogs.length > 0 ? (
                      selectedReviewItem.workLogs.map((log) => (
                        <div key={log.id} className="bg-slate-800/80 p-1.5 rounded border border-slate-700/60 flex flex-col gap-0.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className={`font-bold ${log.authorRole === "MPSI" ? "text-sky-300" : "text-emerald-300"}`}>
                              {log.authorName}
                            </span>
                            <span className="text-slate-400">{log.timestamp}</span>
                          </div>
                          {log.fileName && (
                            <button
                              onClick={() => handleDownloadFile(log.fileName)}
                              className="text-[10px] text-amber-300 hover:text-amber-200 underline flex items-center gap-1 cursor-pointer text-left"
                              title="첨부파일 다운로드"
                            >
                              <Paperclip className="h-3 w-3" />
                              <span className="truncate max-w-xs">{getDisplayFileName(log.fileName)}</span>
                            </button>
                          )}
                          <div className="text-slate-200 text-[11px]">{log.content}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-zinc-500 py-3 text-center">등록된 업무 이력 메모가 없습니다.</div>
                    )}
                  </div>

                  {/* 메모 직접 등록창 */}
                  <div className="flex gap-1.5 pt-1 border-t border-slate-800">
                    <Input 
                      value={manualNoteContent}
                      onChange={(e) => setManualNoteContent(e.target.value)}
                      placeholder="MPSI 담당자에게 전달할 기술 검토 의견을 입력하세요"
                      className="h-6 flex-1 bg-slate-800 border-slate-700 text-white text-[10px]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddManualNote(selectedReviewItem.id);
                      }}
                    />
                    <Button 
                      onClick={() => handleAddManualNote(selectedReviewItem.id)}
                      size="xs"
                      className="h-6 px-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px]"
                    >
                      메모 등록
                    </Button>
                  </div>
                </div>

                {/* 협력사 제출 액션 버튼 */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button 
                    onClick={() => {
                      updateProductReviewStatus(
                        selectedReviewItem.id, 
                        "수정요청", 
                        `${currentVendor} 기술팀`,
                        `[도면 수정(DR) 피드백] ${currentVendor}에서 제품 형상 언더컷 부위 수정 피드백을 전달하였습니다.`
                      );
                      setSelectedReviewItem({ ...selectedReviewItem, drStatus: "수정요청" });
                      showToast("MPSI 본사로 도면 수정 피드백이 전송되었습니다.");
                    }}
                    size="xs"
                    variant="outline"
                    className="h-7 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300 font-bold"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                    도면 수정(DR) 피드백 제출
                  </Button>

                  <Button 
                    onClick={() => {
                      updateProductReviewStatus(
                        selectedReviewItem.id, 
                        "검토요청", 
                        `${currentVendor} 한승호 부장`,
                        `[금형제작협의록 및 CAE 제출] MPSI 본사 승인 요청 접수 완료.`
                      );
                      setSelectedReviewItem({ ...selectedReviewItem, drStatus: "검토요청" });
                      showToast("MPSI 본사로 검토 승인 요청이 제출되었습니다.");
                    }}
                    size="xs"
                    className="h-7 px-3 bg-sky-600 hover:bg-sky-700 text-white font-bold"
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    MPSI로 검토요청 (협의록/CAE 제출)
                  </Button>
                </div>
              </div>

              {/* [Step 4] 금형 발주서(PO) 수신 확인 */}
              <div className="border border-indigo-200 rounded-lg p-3.5 bg-indigo-50/30 space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-indigo-100">
                  <span className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
                    <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
                    [Step 4] MPSI 금형제작 발주서(PO) 수신 확인
                  </span>
                  <div>
                    {selectedReviewItem.moldPoApproved ? (
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ✓ 발주서 정식 수신 완료 ({selectedReviewItem.moldPoApprovedDate || "완료"})
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        MPSI 발주 승인 대기중
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-2.5 rounded border border-indigo-100 text-[11px]">
                  <div>
                    <span className="text-zinc-400 block text-[10px]">금형 PO 번호</span>
                    <span className="font-mono font-bold text-indigo-700">
                      {selectedReviewItem.moldPoNo || (selectedReviewItem.projectNo ? `PO-${selectedReviewItem.projectNo}` : "발주대기")}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px]">목표 제작일수</span>
                    <span className="font-bold text-zinc-800">
                      {selectedReviewItem.moldPoDays || selectedReviewItem.targetMfgDays ? `${selectedReviewItem.moldPoDays || selectedReviewItem.targetMfgDays}일` : "-일"}
                      {selectedReviewItem.targetT1Date ? ` (T1: ${selectedReviewItem.targetT1Date})` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px]">발주 금액</span>
                    <span className="font-mono font-bold text-zinc-900">
                      {selectedReviewItem.moldPoAmount ? `${Number(selectedReviewItem.moldPoAmount).toLocaleString()}원` : "발주서 확인 대기"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px]">금형 보증 타수</span>
                    <span className="font-bold text-zinc-800">
                      {selectedReviewItem.moldPoShot ? `${Number(selectedReviewItem.moldPoShot).toLocaleString()} shots` : "- shots"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-1">
                  <Button 
                    onClick={() => {
                      setPoModalItem(selectedReviewItem);
                      setIsPoModalOpen(true);
                    }}
                    size="xs"
                    className="h-7 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                  >
                    <Paperclip className="h-3.5 w-3.5 mr-1" />
                    금형제작 발주서(PO) 열람
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end px-4 py-2.5 bg-zinc-50 border-t">
              <Button onClick={() => setIsProductReviewModalOpen(false)} variant="outline" className="h-7 px-4">
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* [모달 2] 5. 금형설계 협업 모달 (Step 5~6 협력사 뷰) */}
      {/* ========================================================================= */}
      {isMoldDesignModalOpen && selectedDesignItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border rounded-lg shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-xs">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-purple-800 to-indigo-900 text-white">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-purple-200" />
                <span className="font-bold text-sm">
                  금형 3D 설계 등록 및 소재 발주 승인 확인 [{selectedDesignItem.projectNo}]
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-purple-950/60 border border-purple-400/40 text-purple-200 font-medium">
                  5. 금형설계 메뉴 (협력사)
                </span>
              </div>
              <button onClick={() => setIsMoldDesignModalOpen(false)} className="text-white/80 hover:text-white p-1 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* 프로젝트 요약 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 bg-purple-50/50 p-2.5 rounded-lg border border-purple-200 text-center text-[11px]">
                <div>
                  <div className="text-[10px] text-zinc-400">프로젝트 번호</div>
                  <div className="font-mono font-bold text-purple-900 mt-0.5">{selectedDesignItem.projectNo}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">금형번호</div>
                  <div className="font-mono font-bold text-purple-800 mt-0.5">
                    {selectedDesignItem.moldNo || (selectedDesignItem.projectNo ? `${selectedDesignItem.projectNo.split("-")[0].replace(/P0$/, "")}M` : "-")}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">금형차수 / 구분</div>
                  <div className="mt-0.5 flex items-center justify-center gap-1">
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300">{selectedDesignItem.moldDegree || "M1"}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-sky-100 text-sky-800 border border-sky-300">{selectedDesignItem.changeType || "N001"}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">프로젝트명</div>
                  <div className="font-bold text-zinc-800 mt-0.5 truncate">{selectedDesignItem.projectName}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">고객사</div>
                  <div className="font-semibold text-zinc-700 mt-0.5">{selectedDesignItem.customerName}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">제품명</div>
                  <div className="font-bold text-zinc-900 mt-0.5 truncate">{selectedDesignItem.productName}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">금형제작처</div>
                  <div className="font-bold text-purple-700 mt-0.5">{selectedDesignItem.moldVendor}</div>
                </div>
              </div>

              {/* [Step 5] 금형 3D data 제출 및 협의록 */}
              <div className="border border-purple-200 rounded-lg p-3.5 bg-white space-y-3 shadow-xs">
                <div className="flex items-center justify-between pb-1 border-b border-purple-100">
                  <span className="font-bold text-purple-900 flex items-center gap-1.5 text-xs">
                    <Layers className="h-4 w-4 text-purple-600" />
                    [Step 5] 금형 3D CAD 설계 데이터 업로드
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400">금형설계 현황:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getMoldDesignBadge(selectedDesignItem.moldDesignStatus)}`}>
                      {selectedDesignItem.moldDesignStatus}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* 1. 금형 3D data (협력사 작성 업로드) */}
                  <div className="border border-indigo-300 bg-indigo-50/40 rounded-md p-2.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-900 flex items-center gap-1">
                          <FileCode className="h-3.5 w-3.5 text-indigo-600" />
                          금형 3D data
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenFileUploadModal(selectedDesignItem.id, "mold3DData", "금형 3D data", `MOLD_${selectedDesignItem.projectNo}_${currentVendor}_3D.stp`)}
                            title="3D 금형설계 업로드"
                            className="p-1 hover:bg-indigo-100 rounded text-indigo-700"
                          >
                            <UploadCloud className="h-3.5 w-3.5" />
                          </button>
                          {selectedDesignItem.mold3DDataFile && (
                            <button
                              onClick={() => handleDownloadFile(selectedDesignItem.mold3DDataFile, `MOLD_${selectedDesignItem.projectNo}_3D.stp`)}
                              title="다운로드"
                              className="p-1 hover:bg-indigo-100 rounded text-indigo-700 cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 font-mono text-[11px] font-semibold text-indigo-800 truncate" title={selectedDesignItem.mold3DDataFile}>
                        {getDisplayFileName(selectedDesignItem.mold3DDataFile) || "미등록 (설계 진행중)"}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">
                        {selectedDesignItem.mold3DDataNote || "3D 금형설계 조립도 및 코어/캐비티 모델링"}
                      </p>
                    </div>
                    <div className="text-[9.5px] text-indigo-700 font-medium pt-1.5 border-t border-indigo-200 mt-2">
                      * 금형처 3D CAD 모델링 업로드 필수
                    </div>
                  </div>

                  {/* 2. 금형 제작 협의록 */}
                  <div className="border border-sky-300 bg-sky-50/40 rounded-md p-2.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sky-900 flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5 text-sky-600" />
                          금형 제작 협의록
                        </span>
                        <div className="flex items-center gap-1">
                          {selectedDesignItem.moldMeetingReportFile && (
                            <button
                              onClick={() => handleDownloadFile(selectedDesignItem.moldMeetingReportFile, `금형제작협의록_${selectedDesignItem.projectNo}.pdf`)}
                              title="다운로드"
                              className="p-1 hover:bg-sky-100 rounded text-sky-700 cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 font-mono text-[11px] font-semibold text-sky-800 truncate" title={selectedDesignItem.moldMeetingReportFile}>
                        {getDisplayFileName(selectedDesignItem.moldMeetingReportFile) || "미등록"}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">
                        {selectedDesignItem.moldMeetingReportNote || "금형 구조/파팅라인 설계 협의록"}
                      </p>
                    </div>
                    <div className="text-[9.5px] text-sky-700 font-medium pt-1.5 border-t border-sky-200 mt-2">
                      * 금형 구조 협의록 열람 및 다운로드
                    </div>
                  </div>

                  {/* 3. CAE 해석 보고서 (다운로드 전용) */}
                  <div className="border border-zinc-300 bg-zinc-50 rounded-md p-2.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-700 flex items-center gap-1">
                          <Activity className="h-3.5 w-3.5 text-zinc-500" />
                          CAE 해석 보고서
                        </span>
                        <div className="flex items-center gap-1">
                          {selectedDesignItem.caeReportFile ? (
                            <button
                              onClick={() => handleDownloadFile(selectedDesignItem.caeReportFile, `CAE_Report_${selectedDesignItem.projectNo}.pdf`)}
                              title="다운로드"
                              className="p-1 hover:bg-zinc-200 rounded text-zinc-700 cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span className="text-[9px] text-zinc-400">파일 없음</span>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 font-mono text-[11px] font-semibold text-zinc-700 truncate" title={selectedDesignItem.caeReportFile}>
                        {getDisplayFileName(selectedDesignItem.caeReportFile) || "연동 파일 없음"}
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-2">
                        {selectedDesignItem.caeReportNote || "제품 검토 단계 연동 CAE 결과"}
                      </p>
                    </div>
                    <div className="text-[9.5px] text-zinc-500 font-medium pt-1.5 border-t border-zinc-200 mt-2">
                      🔒 다운로드 전용 (제품검토 연동)
                    </div>
                  </div>
                </div>

                {/* 업무 이력 메모 스레드 */}
                <div className="bg-slate-900 text-slate-100 p-3 rounded-md space-y-2 border border-slate-700">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-200 pb-1 border-b border-slate-800">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-purple-400" />
                      설계 변경 및 승인 이력 메모
                    </span>
                    <span className="text-[10px] text-slate-400">
                      총 {selectedDesignItem.workLogs?.length || 0}건
                    </span>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
                    {selectedDesignItem.workLogs && selectedDesignItem.workLogs.length > 0 ? (
                      selectedDesignItem.workLogs.map((log) => (
                        <div key={log.id} className="bg-slate-800/80 p-1.5 rounded border border-slate-700/60 flex flex-col gap-0.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className={`font-bold ${log.authorRole === "MPSI" ? "text-purple-300" : "text-emerald-300"}`}>
                              {log.authorName}
                            </span>
                            <span className="text-slate-400">{log.timestamp}</span>
                          </div>
                          {log.fileName && (
                            <button
                              onClick={() => handleDownloadFile(log.fileName)}
                              className="text-[10px] text-amber-300 hover:text-amber-200 underline flex items-center gap-1 cursor-pointer text-left"
                              title="첨부파일 다운로드"
                            >
                              <Paperclip className="h-3 w-3" />
                              <span className="truncate max-w-xs">{getDisplayFileName(log.fileName)}</span>
                            </button>
                          )}
                          <div className="text-slate-200 text-[11px]">{log.content}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-zinc-500 py-3 text-center">등록된 설계 이력 메모가 없습니다.</div>
                    )}
                  </div>
                </div>

                {/* 설계 승인 요청 액션 */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button 
                    onClick={() => {
                      updateMoldDesignStatus(
                        selectedDesignItem.id, 
                        "검토요청", 
                        `${currentVendor} 설계팀`,
                        `[금형 3D 설계 승인 요청] 3D CAD 설계 완료에 따른 MPSI 최종 컨펌 요청.`
                      );
                      setSelectedDesignItem({ ...selectedDesignItem, moldDesignStatus: "검토요청" });
                      showToast("MPSI 본사로 금형 3D 설계 승인 요청이 제출되었습니다.");
                    }}
                    size="xs"
                    className="h-7 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold"
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    MPSI로 금형 3D 설계 승인 요청
                  </Button>
                </div>
              </div>

              {/* [Step 6] 소재 발주 승인 여부 확인 (중요) */}
              <div className="border border-emerald-300 rounded-lg p-3.5 bg-emerald-50/40 space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-emerald-200">
                  <span className="font-bold text-emerald-900 flex items-center gap-1.5 text-xs">
                    <CheckSquare className="h-4 w-4 text-emerald-600" />
                    [Step 6] MPSI 소재 사전 선발주 승인 현황 확인
                  </span>
                  <div>
                    {selectedDesignItem.materialOrderStatus === "승인완료" ? (
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-600 text-white shadow-xs">
                        ✓ 소재 발주 승인 완료
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-zinc-100 text-zinc-600 border border-zinc-300">
                        MPSI 소재 발주 미승인
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-white p-3 rounded border border-emerald-200 flex flex-col gap-1 text-[11px]">
                  {selectedDesignItem.materialOrderStatus === "승인완료" ? (
                    <>
                      <div className="font-bold text-emerald-800 flex items-center gap-1">
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span>MPSI 개발실의 소재 발주 공식 승인이 완료되었습니다.</span>
                        {selectedDesignItem.materialOrderApprover && (
                          <span className="text-zinc-500 font-normal">
                            ({selectedDesignItem.materialOrderApprover}, {selectedDesignItem.materialOrderApprovedDate})
                          </span>
                        )}
                      </div>
                      <p className="text-zinc-600 text-[10.5px]">
                        👉 설계가 완전히 끝나지 않았더라도 확정된 치수를 기준으로 <b>메인 몰드베이스 및 코어 강재 발주</b>를 진행하여 납기를 준수해 주십시오.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="font-bold text-zinc-700">MPSI 소재 사전 선발주 승인 대기중입니다.</div>
                      <p className="text-zinc-500 text-[10.5px]">
                        * 메인 블록 치수가 확정되면 MPSI 담당자에게 구두/메모 협의 후 승인을 받아 강재 발주를 진행하실 수 있습니다.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end px-4 py-2.5 bg-zinc-50 border-t">
              <Button onClick={() => setIsMoldDesignModalOpen(false)} variant="outline" className="h-7 px-4">
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* [파일 업로드 모달] 설명 메모 필수 입력 팝업 */}
      {/* ========================================================================= */}
      {uploadModalTarget.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border rounded-lg shadow-xl w-full max-w-lg p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2.5 border-b">
              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <UploadCloud className="h-4 w-4 text-purple-600" />
                {uploadModalTarget.title} 실제 파일 업로드 및 설명 메모 등록
              </span>
              <button 
                onClick={() => {
                  setUploadModalTarget({ isOpen: false, designId: 0, fileType: "moldMeetingReport", title: "", targetName: "" });
                  setSelectedUploadFile(null);
                }}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* 실제 파일 업로더 컴포넌트 */}
              <div>
                <FileUploader
                  label={`${uploadModalTarget.title} 파일 첨부 (드래그 앤 드롭 또는 파일 선택)`}
                  required
                  accept={
                    uploadModalTarget.fileType === "product3D" || uploadModalTarget.fileType === "mold3DData"
                      ? ".stp,.step,.x_t,.catpart,.iges,.dwg,.dxf,.zip"
                      : ".pdf,.pptx,.ppt,.xlsx,.xls,.doc,.docx,.hwp,.zip"
                  }
                  maxSizeMB={100}
                  value={selectedUploadFile || undefined}
                  onSingleChange={(file) => {
                    setSelectedUploadFile(file);
                    if (file) {
                      setUploadFileName(file.name);
                    }
                  }}
                  description={
                    uploadModalTarget.fileType === "product3D" || uploadModalTarget.fileType === "mold3DData"
                      ? "3D CAD 모델링(STP, STEP, X_T, CATPart) 또는 도면(DWG, DXF), 압축파일(ZIP)"
                      : "보고서 문서(PDF, PPTX, XLSX, HWP) 또는 압축파일(ZIP)"
                  }
                />
              </div>

              {selectedUploadFile && (
                <div>
                  <label className="block text-zinc-600 font-medium mb-1">등록 파일명 확인 / 별칭</label>
                  <Input 
                    value={uploadFileName}
                    onChange={(e) => setUploadFileName(e.target.value)}
                    className="h-7 text-xs font-mono"
                    placeholder="파일명 확인"
                  />
                </div>
              )}

              <div>
                <label className="block text-zinc-600 font-medium mb-1">작성자 / 소속</label>
                <Input 
                  value={uploadAuthorName}
                  onChange={(e) => setUploadAuthorName(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-bold mb-1 flex items-center justify-between">
                  <span>설명 메모 및 특이사항 (필수) *</span>
                  <span className="text-[10px] text-rose-500 font-normal">필수입력</span>
                </label>
                <textarea 
                  value={uploadFileNote}
                  onChange={(e) => setUploadFileNote(e.target.value)}
                  rows={3}
                  className="w-full rounded border bg-transparent p-2 text-xs focus:ring-1 focus:ring-purple-500"
                  placeholder="도면 검토 의견, 파팅라인 수정 부위, CAE 검토 소견을 반드시 기재해 주세요."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button 
                onClick={() => {
                  setUploadModalTarget({ isOpen: false, designId: 0, fileType: "moldMeetingReport", title: "", targetName: "" });
                  setSelectedUploadFile(null);
                }}
                variant="outline"
                size="xs"
                className="h-8 px-3"
                disabled={isUploadingFile}
              >
                취소
              </Button>
              <Button 
                onClick={handleConfirmFileUpload}
                size="xs"
                className="h-8 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold gap-1.5"
                disabled={isUploadingFile}
              >
                {isUploadingFile ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    MPSI 전송 중...
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-3.5 w-3.5" />
                    실제 파일 업로드 및 MPSI 전송
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* [발주서 미리보기 팝업 모달] */}
      {/* ========================================================================= */}
      {isPoModalOpen && poModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-xs">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 text-white font-bold">
              <span>MPSI 금형 제작 발주서 (Purchase Order)</span>
              <button onClick={() => setIsPoModalOpen(false)} className="hover:opacity-80">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto flex-1 font-sans">
              <div className="text-center pb-3 border-b">
                <h3 className="text-base font-bold text-zinc-900">금형 제작 발주서 (PO)</h3>
                <span className="font-mono text-xs text-zinc-500">발주번호: {poModalItem.moldPoNo || (poModalItem.projectNo ? `PO-${poModalItem.projectNo}` : "PO-NEW")}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="border p-2.5 rounded bg-zinc-50 space-y-1">
                  <div className="font-bold text-zinc-800 mb-1">[발주사] (주)엠피에스아이</div>
                  <div>담당부서: 금형개발실 / 구매팀</div>
                  <div>담당자: MPSI 구매개발실</div>
                </div>
                <div className="border p-2.5 rounded bg-zinc-50 space-y-1">
                  <div className="font-bold text-zinc-800 mb-1">[수주사] {poModalItem.moldVendor}</div>
                  <div>프로젝트: {poModalItem.projectName}</div>
                  <div>대상제품: {poModalItem.productName}</div>
                </div>
              </div>

              <div className="border rounded overflow-hidden">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-zinc-100 font-bold border-b">
                    <tr>
                      <th className="p-2 border-r">항목</th>
                      <th className="p-2 border-r">발주 세부 사양</th>
                      <th className="p-2 text-right">금액/수치</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-zinc-700">
                    <tr>
                      <td className="p-2 border-r font-medium">금형 관리번호</td>
                      <td className="p-2 border-r">금형 식별번호 / 차수 / 구분</td>
                      <td className="p-2 text-right font-mono font-bold text-purple-700">
                        {poModalItem.moldNo || (poModalItem.projectNo ? `${poModalItem.projectNo.split("-")[0].replace(/P0$/, "")}M` : "-")} 
                        <span className="ml-1 text-[10px] px-1 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-200">{poModalItem.moldDegree || "M1"}</span>
                        <span className="ml-1 text-[10px] px-1 py-0.2 rounded bg-sky-100 text-sky-800 border border-sky-200">{poModalItem.changeType || "N001"}</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r font-medium">금형 발주 금액</td>
                      <td className="p-2 border-r">재료비+가공비+일반관리비 포함 (수주확정 견적가)</td>
                      <td className="p-2 text-right font-mono font-bold text-zinc-900">
                        {poModalItem.moldPoAmount ? `${Number(poModalItem.moldPoAmount).toLocaleString()}원` : "견적 확인중 (0원)"}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r font-medium">목표 T1 일정</td>
                      <td className="p-2 border-r">최종 3D 확정 후 T1 시사출까지</td>
                      <td className="p-2 text-right font-bold text-sky-700">
                        {poModalItem.targetT1Date || "-"} 
                        {poModalItem.moldPoDays || poModalItem.targetMfgDays ? ` (${poModalItem.moldPoDays || poModalItem.targetMfgDays}일)` : ""}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r font-medium">보증 타수</td>
                      <td className="p-2 border-r">금형 내구 보증 shot 수</td>
                      <td className="p-2 text-right font-mono">
                        {poModalItem.moldPoShot ? `${Number(poModalItem.moldPoShot).toLocaleString()} shots` : "- shots"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex items-center justify-end px-4 py-2 bg-zinc-50 border-t">
              <Button onClick={() => setIsPoModalOpen(false)} size="xs" className="h-7 px-3">닫기</Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 13단계 프로세스 다이어그램 모달 */}
      {/* ========================================================================= */}
      {isDiagramModalOpen && diagramItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-xs">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#2d3748] text-white">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-purple-400" />
                <span className="font-bold text-sm">
                  13단계 세부 공정 타임라인 [{diagramItem.projectNo}]
                </span>
              </div>
              <button onClick={() => setIsDiagramModalOpen(false)} className="hover:opacity-80">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              <div className="space-y-1.5 pt-2">
                {PROCESS_13_STEPS.map((step) => {
                  const isCurrent = step.step === diagramItem.currentStep;
                  const isDone = step.step < diagramItem.currentStep;

                  return (
                    <div 
                      key={step.step}
                      className={`border rounded p-2 transition-all ${
                        isCurrent 
                          ? "border-purple-500 bg-purple-50/50" 
                          : isDone 
                          ? "border-emerald-200 bg-emerald-50/20" 
                          : "border-zinc-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                            isDone ? "bg-emerald-600 text-white" : isCurrent ? "bg-purple-600 text-white animate-pulse" : "bg-zinc-200 text-zinc-600"
                          }`}>
                            {isDone ? "✓" : step.step}
                          </span>
                          <span className="font-bold text-zinc-900">{step.name}</span>
                          <span className="text-[10px] text-zinc-400">({getStepActor(step.step)})</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-end px-4 py-2 bg-zinc-50 border-t">
              <Button onClick={() => setIsDiagramModalOpen(false)} size="xs" className="h-7 px-3">닫기</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

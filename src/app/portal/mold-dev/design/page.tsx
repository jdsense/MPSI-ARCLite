"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, RefreshCw, FileText, CheckCircle2, 
  AlertTriangle, UploadCloud, Download, Eye, 
  Send, Layers, ArrowRight, Clock, Building2, 
  ExternalLink, FileCode, Check, X, Plus, FolderKanban,
  Activity, LayoutGrid, ListTree, Settings, MessageSquare, Info,
  Wrench, CheckSquare, Sparkles, FileSpreadsheet, Paperclip
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
import { MOLD_VENDOR_LIST } from "@/lib/role-store";
import { 
  useMoldDesignStore, 
  DrawingDesignItem, 
  ProductReviewStatus, 
  MoldDesignReviewStatus, 
  MoldDesignWorkLog 
} from "@/lib/mold-design-store";

export default function ProductReviewAndMoldDesignPage() {
  const router = useRouter();
  const { 
    designs, 
    isLoading,
    refresh,
    updateDesign, 
    addDesign, 
    addWorkLog, 
    updateProductReviewStatus, 
    updateMoldDesignStatus, 
    approveMaterialOrder, 
    approveMoldPo, 
    uploadDesignFileWithLog 
  } = useMoldDesignStore();

  const { projects, updateStep } = useProjectMaster();

  // 검색 필터 상태
  const [filterProjectNo, setFilterProjectNo] = useState("");
  const [filterProductName, setFilterProductName] = useState("");
  const [filterVendorName, setFilterVendorName] = useState("ALL");
  const [filterDrStatus, setFilterDrStatus] = useState("ALL");
  const [filterDesignStatus, setFilterDesignStatus] = useState("ALL");
  const [filterDateType, setFilterDateType] = useState<"updatedAt" | "targetT1Date">("updatedAt");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePresetType>("all");

  // 1. [2. 제품 검토 승인 메뉴] 모달 상태 (개발 1~4단계 통합)
  const [isProductReviewModalOpen, setIsProductReviewModalOpen] = useState(false);
  const [productReviewItem, setProductReviewItem] = useState<DrawingDesignItem | null>(null);

  // 2. [5. 금형설계 승인 메뉴] 모달 상태 (개발 5~6단계 통합)
  const [isMoldDesignModalOpen, setIsMoldDesignModalOpen] = useState(false);
  const [moldDesignItem, setMoldDesignItem] = useState<DrawingDesignItem | null>(null);

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
    fileType: "product3D",
    title: "",
    targetName: "",
  });
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadFileNote, setUploadFileNote] = useState("");
  const [uploadAuthorName, setUploadAuthorName] = useState("MPSI 담당자");
  const [selectedUploadFile, setSelectedUploadFile] = useState<UploadedFileInfo | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // 4. 발주서 미리보기 팝업 모달 상태
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [poModalItem, setPoModalItem] = useState<DrawingDesignItem | null>(null);

  // 5. 13단계 프로세스 다이어그램 모달 상태
  const [diagramItem, setDiagramItem] = useState<DrawingDesignItem | null>(null);
  const [isDiagramModalOpen, setIsDiagramModalOpen] = useState(false);
  const [modalSelectedItem, setModalSelectedItem] = useState<ProjectItem | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  // 개별 메모 입력 상태 (모달 내부)
  const [manualNoteAuthor, setManualNoteAuthor] = useState("MPSI 김양훈 부장");
  const [manualNoteContent, setManualNoteContent] = useState("");

  // 스토어의 designs 상태 변경 시 열려있는 모달 아이템 실시간 동기화
  React.useEffect(() => {
    if (productReviewItem) {
      const updated = designs.find((d) => d.id === productReviewItem.id);
      if (updated) setProductReviewItem(updated);
    }
    if (moldDesignItem) {
      const updated = designs.find((d) => d.id === moldDesignItem.id);
      if (updated) setMoldDesignItem(updated);
    }
  }, [designs]);

  // 필터링된 데이터
  const filteredData = designs.filter((item) => {
    const matchProject = filterProjectNo
      ? item.projectNo.toLowerCase().includes(filterProjectNo.toLowerCase())
      : true;
    const matchProd = filterProductName
      ? item.productName.toLowerCase().includes(filterProductName.toLowerCase()) ||
        item.projectName.toLowerCase().includes(filterProductName.toLowerCase())
      : true;
    const matchVendor = filterVendorName !== "ALL"
      ? item.moldVendor.includes(filterVendorName)
      : true;
    const matchDr = filterDrStatus !== "ALL"
      ? item.drStatus === filterDrStatus
      : true;
    const matchDesign = filterDesignStatus !== "ALL"
      ? item.moldDesignStatus === filterDesignStatus
      : true;
    const targetDate = item[filterDateType];
    const matchDate = isWithinDateRange(targetDate, filterDateFrom, filterDateTo);
    return matchProject && matchProd && matchVendor && matchDr && matchDesign && matchDate;
  });

  const handleReset = () => {
    setFilterProjectNo("");
    setFilterProductName("");
    setFilterVendorName("ALL");
    setFilterDrStatus("ALL");
    setFilterDesignStatus("ALL");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSelectedDatePreset("all");
  };

  // 모달 1 열기: 제품검토 승인 (개발 1~4단계)
  const handleOpenProductReviewModal = (item: DrawingDesignItem) => {
    setProductReviewItem(item);
    setIsProductReviewModalOpen(true);
  };

  // 모달 2 열기: 금형설계 승인 (개발 5~6단계)
  const handleOpenMoldDesignModal = (item: DrawingDesignItem) => {
    setMoldDesignItem(item);
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
    setUploadAuthorName("MPSI 김양훈 부장");
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
        } else {
          console.warn("File server upload response not ok, fallback to filename", json);
        }
      }

      uploadDesignFileWithLog(
        uploadModalTarget.designId,
        uploadModalTarget.fileType,
        finalFilePath,
        uploadFileNote.trim(),
        uploadAuthorName.trim() || "MPSI 담당자",
        "MPSI"
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

        if (productReviewItem?.id === current.id) {
          setProductReviewItem(updatedItem);
        }
        if (moldDesignItem?.id === current.id) {
          setMoldDesignItem(updatedItem);
        }
      }

      alert(`[${uploadModalTarget.title}] 파일이 서버에 안전하게 업로드되고 DB에 동기화되었습니다.`);
      setUploadModalTarget({ isOpen: false, designId: 0, fileType: "product3D", title: "", targetName: "" });
      setSelectedUploadFile(null);
    } catch (err: any) {
      console.error("Design file upload error:", err);
      alert(`파일 업로드 실패: ${err.message}`);
    } finally {
      setIsUploadingFile(false);
    }
  };

  // 모달 내부 메모 수동 추가
  const handleAddManualNote = (designId: number) => {
    if (!manualNoteContent.trim()) {
      alert("메모 내용을 입력해 주세요.");
      return;
    }

    addWorkLog(designId, {
      authorName: manualNoteAuthor.trim() || "MPSI 담당자",
      authorRole: "MPSI",
      content: manualNoteContent.trim(),
    });

    setManualNoteContent("");
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
        moldProductionType: item.moldVendor.includes("자체") ? "IN_HOUSE" : "OUTSOURCING",
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

  // 실무 페이지 이동
  const handleNavigateToStepPage = (step: number, projectNo?: string) => {
    const targetUrl = getStepUrl(step, projectNo);
    setIsDiagramModalOpen(false);
    router.push(targetUrl);
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 상단 SCM 프로세스 공정 1~6 통합 배너 */}
      <div className="bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
        <div className="flex items-start gap-2.5">
          <FileCode className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-sky-900 dark:text-sky-200 block text-xs">
              [공정 1~6] 2. 제품검토 및 금형설계 통합 관제 (MPSI ↔ 금형 제작처 연동)
            </span>
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
              ① <b>제품검토 승인 (Step 1~4)</b>: 원본 3D 배포 ➔ 금형제작협의록(DR) & CAE 검토 ➔ 고객 도면수정 루프 ➔ 금형 발주서(PO) 발행<br />
              ② <b>금형설계 승인 (Step 5~6)</b>: 금형 3D Data 승인 & 특수강 코어/몰드베이스 <b>소재 사전 선발주 승인</b>을 유기적으로 관제합니다.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
          <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-purple-300 text-purple-700 font-bold dark:bg-zinc-800 dark:text-purple-300">
            신속 일정 관리(Fast-track)
          </span>
        </div>
      </div>

      {/* 1. 상단 검색바 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex flex-col gap-2.5">
        <div className="pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <DateRangeFilter
            dateType={filterDateType}
            onDateTypeChange={(v) => setFilterDateType(v as any)}
            dateTypeOptions={[
              { label: "최근 갱신일", value: "updatedAt" },
              { label: "목표 T1일", value: "targetT1Date" },
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">프로젝트 번호</span>
            <Input 
              value={filterProjectNo} 
              onChange={(e) => setFilterProjectNo(e.target.value)} 
              placeholder="예: MI26001, MI25001" 
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
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">금형 제작처</span>
            <select 
              value={filterVendorName} 
              onChange={(e) => setFilterVendorName(e.target.value)} 
              className="h-7 rounded-md border bg-transparent px-2 text-xs"
            >
              <option value="ALL">전체 제작처</option>
              {MOLD_VENDOR_LIST.map((v) => (
                <option key={v.id} value={v.name}>
                  {v.name} ({v.type === "IN_HOUSE" ? "자체제작" : "외주"})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">제품검토 현황</span>
            <select 
              value={filterDrStatus} 
              onChange={(e) => setFilterDrStatus(e.target.value)} 
              className="h-7 rounded-md border bg-transparent px-2 text-xs"
            >
              <option value="ALL">전체 현황</option>
              <option value="검토 대기">검토 대기</option>
              <option value="검토요청">검토요청</option>
              <option value="수정요청">수정요청</option>
              <option value="검토완료">검토완료</option>
              <option value="최종검토완료">최종검토완료</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">금형설계 현황</span>
            <select 
              value={filterDesignStatus} 
              onChange={(e) => setFilterDesignStatus(e.target.value)} 
              className="h-7 rounded-md border bg-transparent px-2 text-xs"
            >
              <option value="ALL">전체 현황</option>
              <option value="검토 대기">검토 대기</option>
              <option value="검토요청">검토요청</option>
              <option value="수정요청">수정요청</option>
              <option value="검토완료">검토완료</option>
            </select>
          </div>
          <div className="flex items-end gap-1.5">
            <Button onClick={() => {}} className="h-7 px-3 bg-sky-600 hover:bg-sky-700 text-white gap-1 text-xs flex-1">
              <Search className="h-3.5 w-3.5" />
              검색
            </Button>
            <Button onClick={handleReset} variant="outline" className="h-7 px-3 gap-1 text-xs text-zinc-600">
              <RefreshCw className="h-3.5 w-3.5" />
              초기화
            </Button>
          </div>
        </div>
      </div>

      {/* 2. 메인 데이터 그리드 (Image 1 피드백 반영: 제품검토 현황/승인 + 금형설계 현황/승인) */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs overflow-hidden flex flex-col min-h-[480px]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b gap-2">
          <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-100">
            <Layers className="h-4 w-4 text-sky-600" />
            <span>2. 제품검토 및 금형설계 관리대장 (Step 1~6 통합)</span>
            <span className="text-[11px] font-normal text-zinc-500 ml-1">
              (총 <b className="text-sky-600 font-mono">{filteredData.length}</b>건)
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
              제품검토: 3D CAD/금형제작협의록/CAE
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-purple-500"></span>
              금형설계: 3D 금형설계/소재선발주 승인
            </span>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full border-collapse text-left border-spacing-0 whitespace-nowrap">
            <thead className="sticky top-0 bg-[#2d3748] text-white text-[11px] z-10">
              <tr>
                <th className="p-1.5 w-10 text-center border-r border-slate-600">No</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[120px]">프로젝트 번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[150px]">프로젝트 / 차종</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[170px]">제품명</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[120px] text-center">금형제작처</th>
                
                {/* [피드백 1] 도면 DR 상태 -> 제품검토 현황 */}
                <th className="p-1.5 border-r border-slate-600 min-w-[110px] text-center bg-slate-700/80">제품검토 현황</th>
                {/* [피드백 1] 검토/승인 -> 제품검토 승인 버튼 */}
                <th className="p-1.5 border-r border-slate-600 min-w-[110px] text-center bg-slate-700/80">제품검토 승인</th>
                
                {/* [피드백 2] 금형설계 상태 -> 금형설계 현황 */}
                <th className="p-1.5 border-r border-slate-600 min-w-[120px] text-center bg-slate-800">금형설계 현황</th>
                {/* [피드백 2] 검토/승인 -> 금형 설계 승인 버튼 */}
                <th className="p-1.5 border-r border-slate-600 min-w-[110px] text-center bg-slate-800">금형 설계 승인</th>

                <th className="p-1.5 border-r border-slate-600 min-w-[85px] text-center">목표 T1</th>
                <th className="p-1.5 min-w-[80px] text-center">발주(PO) 상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px]">
              {filteredData.map((row, idx) => (
                <tr key={row.id} className="hover:bg-sky-50/70 dark:hover:bg-zinc-800/60 transition-colors odd:bg-white even:bg-zinc-50/40 dark:odd:bg-zinc-900 dark:even:bg-zinc-900/50">
                  <td className="p-1.5 text-center font-mono text-zinc-400 border-r">{idx + 1}</td>
                  
                  {/* 프로젝트 번호 */}
                  <td className="p-1.5 border-r font-mono font-bold text-sky-600 dark:text-sky-400">
                    <span>{row.projectNo}</span>
                  </td>

                  <td className="p-1.5 border-r font-medium truncate max-w-[150px]" title={row.projectName}>{row.projectName}</td>
                  <td className="p-1.5 border-r font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[170px]" title={row.productName}>{row.productName}</td>
                  
                  {/* 금형제작처 (외주업체명 / 자체제작 명확 표기) */}
                  <td className="p-1.5 border-r text-center">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      row.moldVendor.includes("자체")
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-blue-50 text-blue-700 border border-blue-300 dark:bg-blue-950/40 dark:text-blue-300"
                    }`}>
                      <Building2 className="h-3 w-3" />
                      {row.moldVendor}
                    </span>
                  </td>

                  {/* 1. 제품검토 현황 */}
                  <td className="p-1.5 border-r text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getProductReviewBadge(row.drStatus)}`}>
                      {row.drStatus}
                    </span>
                  </td>

                  {/* 1-1. 제품검토 승인 버튼 (Image 2 모달 호출) */}
                  <td className="p-1.5 border-r text-center">
                    <Button 
                      onClick={() => handleOpenProductReviewModal(row)} 
                      size="xs" 
                      variant="outline" 
                      className="h-6 px-2 text-[10px] gap-1 bg-white hover:bg-sky-50 text-sky-700 border-sky-300 font-bold shadow-xs"
                    >
                      <Eye className="h-3 w-3 text-sky-600" />
                      제품검토 승인
                    </Button>
                  </td>

                  {/* 2. 금형설계 현황 (+ 소재선발주 승인 배지) */}
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

                  {/* 2-1. 금형 설계 승인 버튼 (Image 3 모달 호출) */}
                  <td className="p-1.5 border-r text-center">
                    <Button 
                      onClick={() => handleOpenMoldDesignModal(row)} 
                      size="xs" 
                      variant="outline" 
                      className="h-6 px-2 text-[10px] gap-1 bg-white hover:bg-purple-50 text-purple-700 border-purple-300 font-bold shadow-xs"
                    >
                      <Wrench className="h-3 w-3 text-purple-600" />
                      금형 설계 승인
                    </Button>
                  </td>

                  <td className="p-1.5 border-r text-center font-mono text-zinc-500">{row.targetT1Date}</td>

                  {/* 발주(PO) 상태 */}
                  <td className="p-1.5 text-center">
                    {row.moldPoApproved ? (
                      <span className="text-[10px] font-bold text-emerald-700 flex items-center justify-center gap-0.5">
                        <Check className="h-3 w-3" />
                        PO 발송완료
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-400">발주대기</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-zinc-400">
                    <Layers className="h-8 w-8 mx-auto mb-2 text-zinc-300 opacity-50" />
                    {isLoading ? "PostgreSQL DB에서 설계 관리대장 로딩 중..." : "등록된 제품검토 및 금형설계 프로젝트가 없습니다."}
                    <p className="text-[11px] text-zinc-400 mt-1">
                      (금형 견적 관리에서 수주확정된 프로젝트가 자동으로 등재됩니다.)
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* [모달 1] 2. 제품 검토 승인 메뉴 (Image 2 기반, 개발 1~4단계 통합) */}
      {/* ========================================================================= */}
      {isProductReviewModalOpen && productReviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border rounded-lg shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-xs">
            {/* 상단 타이틀 바 */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-sky-800 to-indigo-900 text-white">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-sky-200" />
                <span className="font-bold text-sm">
                  도면 성형성검토(DR) 및 MPSI 최종승인 전결 [{productReviewItem.projectNo}]
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-sky-950/60 border border-sky-400/40 text-sky-200 font-medium">
                  2. 제품 검토 승인 메뉴
                </span>
              </div>
              <button 
                onClick={() => setIsProductReviewModalOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* 기본 프로젝트 정보 헤더 */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-sky-50/50 dark:bg-zinc-800/40 p-2.5 rounded-lg border border-sky-200 dark:border-zinc-700 text-center">
                <div>
                  <div className="text-[10px] text-zinc-400">프로젝트 번호</div>
                  <div className="font-mono font-bold text-sky-900 dark:text-sky-200 mt-0.5">{productReviewItem.projectNo}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">프로젝트명</div>
                  <div className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 truncate">{productReviewItem.projectName}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">고객사</div>
                  <div className="font-semibold text-zinc-700 dark:text-zinc-300 mt-0.5">{productReviewItem.customerName}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">제품명</div>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5 truncate">{productReviewItem.productName}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">금형제작처</div>
                  <div className="font-bold text-sky-700 dark:text-sky-300 mt-0.5">{productReviewItem.moldVendor}</div>
                </div>
              </div>

              {/* [Step 1~3] 고객 제품도면 및 제작처 CAE 성형성 보정 CAD 검토 */}
              <div className="border border-sky-200 rounded-lg p-3.5 bg-white dark:bg-zinc-900 space-y-3 shadow-xs">
                <div className="flex items-center justify-between pb-1 border-b border-sky-100">
                  <span className="font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5 text-xs">
                    <Layers className="h-4 w-4 text-sky-600" />
                    [Step 1~3] 고객 제품도면 및 제작처 CAE 성형성 보정 CAD 검토
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400">현재 상태:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getProductReviewBadge(productReviewItem.drStatus)}`}>
                      {productReviewItem.drStatus}
                    </span>
                  </div>
                </div>

                {/* 3대 핵심 파일함 카드 (3D 제품 data / 금형 제작 협의록 / CAE 해석 보고서) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* 1. 3D 제품 data */}
                  <div className="border border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-md p-2.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
                          <FileCode className="h-3.5 w-3.5 text-emerald-600" />
                          3D 제품 data
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenFileUploadModal(productReviewItem.id, "product3D", "3D 제품 data", `${productReviewItem.projectNo}_3D_Update.stp`)}
                            title="파일 업로드 (메모 필수입력)"
                            className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded text-emerald-700"
                          >
                            <UploadCloud className="h-3.5 w-3.5" />
                          </button>
                          {productReviewItem.product3DFile && (
                            <button
                              onClick={() => handleDownloadFile(productReviewItem.product3DFile, `${productReviewItem.projectNo}_3D.stp`)}
                              title="다운로드"
                              className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded text-emerald-700 cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 font-mono text-[11px] font-semibold text-emerald-800 dark:text-emerald-200 truncate" title={productReviewItem.product3DFile}>
                        {getDisplayFileName(productReviewItem.product3DFile)}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">
                        {productReviewItem.product3DNote || "견적의뢰 시 배포자료 / 추가 접수 제품데이터"}
                      </p>
                    </div>
                    <div className="text-[9.5px] text-emerald-700 font-medium pt-1.5 border-t border-emerald-200/60 mt-2">
                      * MPSI/금형처 파일 수정 업로드 지원 (메모 필수)
                    </div>
                  </div>

                  {/* 2. 금형 제작 협의록 (DR 자료 공식 명칭) */}
                  <div className="border border-sky-300 bg-sky-50/40 dark:bg-sky-950/20 rounded-md p-2.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sky-900 dark:text-sky-300 flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5 text-sky-600" />
                          금형 제작 협의록
                        </span>
                        <div className="flex items-center gap-1">
                          {/* 외주제작 프로젝트의 경우 MPSI는 업로드 불가 (외주 금형사 제출 전용) */}
                          {productReviewItem.moldVendor?.includes("자체") ? (
                            <button
                              onClick={() => handleOpenFileUploadModal(productReviewItem.id, "moldMeetingReport", "금형 제작 협의록", `금형제작협의록_${productReviewItem.projectNo}.pdf`)}
                              title="파일 업로드 (자체개발팀 전용)"
                              className="p-1 hover:bg-sky-100 dark:hover:bg-sky-900/50 rounded text-sky-700"
                            >
                              <UploadCloud className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span 
                              title="금형 제작 협의록은 외주 금형처 전용 제출물입니다. (MPSI 업로드 제한)" 
                              className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium"
                            >
                              외주사 제출
                            </span>
                          )}
                          {productReviewItem.moldMeetingReportFile && (
                            <button
                              onClick={() => handleDownloadFile(productReviewItem.moldMeetingReportFile, `금형제작협의록_${productReviewItem.projectNo}.pdf`)}
                              title="다운로드"
                              className="p-1 hover:bg-sky-100 dark:hover:bg-sky-900/50 rounded text-sky-700 cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 font-mono text-[11px] font-semibold text-sky-800 dark:text-sky-200 truncate" title={productReviewItem.moldMeetingReportFile}>
                        {getDisplayFileName(productReviewItem.moldMeetingReportFile) || "미등록 (외주처 제출 대기)"}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">
                        {productReviewItem.moldMeetingReportNote || "금형처 작성 DR 회의록 및 MPSI 검토 협의록"}
                      </p>
                    </div>
                    <div className="text-[9.5px] text-sky-700 font-medium pt-1.5 border-t border-sky-200/60 mt-2">
                      {productReviewItem.moldVendor?.includes("자체") ? "* MPSI 자체개발팀 업다운로드 지원" : "* 외주 금형사 작성·제출 전용 (MPSI 열람 및 승인)"}
                    </div>
                  </div>

                  {/* 3. CAE 해석 보고서 */}
                  <div className="border border-purple-300 bg-purple-50/40 dark:bg-purple-950/20 rounded-md p-2.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1">
                          <Activity className="h-3.5 w-3.5 text-purple-600" />
                          CAE 해석 보고서
                        </span>
                        <div className="flex items-center gap-1">
                          {/* 외주제작 프로젝트의 경우 MPSI는 업로드 불가 (외주 금형사 제출 전용) */}
                          {productReviewItem.moldVendor?.includes("자체") ? (
                            <button
                              onClick={() => handleOpenFileUploadModal(productReviewItem.id, "caeReport", "CAE 해석 보고서", `CAE_Report_${productReviewItem.projectNo}.pdf`)}
                              title="파일 업로드 (자체개발팀 전용)"
                              className="p-1 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded text-purple-700"
                            >
                              <UploadCloud className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span 
                              title="CAE 해석 보고서는 외주 금형처 전용 제출물입니다. (MPSI 업로드 제한)" 
                              className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium"
                            >
                              외주사 제출
                            </span>
                          )}
                          {productReviewItem.caeReportFile && (
                            <button
                              onClick={() => handleDownloadFile(productReviewItem.caeReportFile, `CAE_Report_${productReviewItem.projectNo}.pdf`)}
                              title="다운로드"
                              className="p-1 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded text-purple-700 cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 font-mono text-[11px] font-semibold text-purple-800 dark:text-purple-200 truncate" title={productReviewItem.caeReportFile}>
                        {getDisplayFileName(productReviewItem.caeReportFile) || "미등록 (외주처 해석 대기)"}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">
                        {productReviewItem.caeReportNote || "제작처 작성 유동해석 보고서 / MPSI 검토"}
                      </p>
                    </div>
                    <div className="text-[9.5px] text-purple-700 font-medium pt-1.5 border-t border-purple-200/60 mt-2">
                      {productReviewItem.moldVendor?.includes("자체") ? "* MPSI 자체개발팀 업다운로드 지원" : "* 외주 금형사 작성·제출 전용 (MPSI 열람 및 승인)"}
                    </div>
                  </div>
                </div>

                {/* 업무 이력 메모 (로그 목록) */}
                <div className="bg-slate-900 text-slate-100 p-3 rounded-md space-y-2 border border-slate-700">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-200 pb-1 border-b border-slate-800">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-sky-400" />
                      업무 이력 메모 (작성자 ID, 업로드 파일, 사유/특이사항 이력)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      총 {productReviewItem.workLogs?.length || 0}건
                    </span>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
                    {productReviewItem.workLogs && productReviewItem.workLogs.length > 0 ? (
                      productReviewItem.workLogs.map((log) => (
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
                      value={manualNoteAuthor}
                      onChange={(e) => setManualNoteAuthor(e.target.value)}
                      placeholder="작성자"
                      className="h-6 w-28 bg-slate-800 border-slate-700 text-white text-[10px]"
                    />
                    <Input 
                      value={manualNoteContent}
                      onChange={(e) => setManualNoteContent(e.target.value)}
                      placeholder="특이사항 및 파일 검토 의견을 입력하세요"
                      className="h-6 flex-1 bg-slate-800 border-slate-700 text-white text-[10px]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddManualNote(productReviewItem.id);
                      }}
                    />
                    <Button 
                      onClick={() => handleAddManualNote(productReviewItem.id)}
                      size="xs"
                      className="h-6 px-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px]"
                    >
                      메모 등록
                    </Button>
                  </div>
                </div>

                {/* 중간 검토/수정 액션 버튼들 (Image 2 - 문자발송 제외) */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button 
                    onClick={() => {
                      updateProductReviewStatus(
                        productReviewItem.id, 
                        "수정요청", 
                        "MPSI 김양훈 부장",
                        "[제품 모델링 수정 요청] MPSI가 고객사/금형처에 모델링 형상 및 게이트 위치 수정 검토를 요청하였습니다."
                      );
                      setProductReviewItem({ ...productReviewItem, drStatus: "수정요청" });
                      alert("제품 모델링 수정 요청이 접수되었습니다. (업무 메모 자동 기록됨)");
                    }}
                    size="xs"
                    variant="outline"
                    className="h-7 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300 font-bold"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                    제품 모델링 수정 요청
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      updateProductReviewStatus(
                        productReviewItem.id, 
                        "검토완료", 
                        "MPSI 김양훈 부장",
                        "[제품 모델링 검토 완료] MPSI 담당자가 제품 모델링 성형성 및 DR 검토를 완료하였습니다. (금형 발주 진행 가능)"
                      );
                      setProductReviewItem({ ...productReviewItem, drStatus: "검토완료" });
                      alert("제품 모델링 검토 완료 처리되었습니다. (금형발주서 배포 가능)");
                    }}
                    size="xs"
                    className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    제품 모델링 검토 완료
                  </Button>

                  <Button 
                    onClick={() => {
                      updateProductReviewStatus(
                        productReviewItem.id, 
                        "최종검토완료", 
                        "MPSI 기술팀장",
                        "[최종검토완료] 원청 고객사 승인 최종 3D 제품데이터 확정 완료"
                      );
                      setProductReviewItem({ ...productReviewItem, drStatus: "최종검토완료" });
                      alert("원청 고객사 도면 최종검토완료로 확정되었습니다.");
                    }}
                    size="xs"
                    className="h-7 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    최종검토완료 확정
                  </Button>
                </div>
              </div>

              {/* [Step 4] 3. 금형 발주시 작성 및 배포 (개발스텝 4번) */}
              <div className="border border-indigo-200 rounded-lg p-3.5 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-indigo-100">
                  <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5 text-xs">
                    <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
                    3. 금형 발주시 작성 및 배포 (개발스텝 4번)
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-zinc-500">발송 승인 여부:</span>
                    {productReviewItem.moldPoApproved ? (
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ✓ 금형처 발송 승인 완료 ({productReviewItem.moldPoApprovedDate || "완료"})
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        발주서 미승인 (발송 대기)
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white dark:bg-zinc-900 p-2.5 rounded border border-indigo-100 text-[11px]">
                  <div>
                    <span className="text-zinc-400 block text-[10px]">금형 PO 번호</span>
                    <span className="font-mono font-bold text-indigo-700">
                      {productReviewItem.moldPoNo || (productReviewItem.projectNo ? `PO-${productReviewItem.projectNo}` : "발주대기")}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px]">목표 제작일수</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      {productReviewItem.moldPoDays || productReviewItem.targetMfgDays ? `${productReviewItem.moldPoDays || productReviewItem.targetMfgDays}일` : "-일"}
                      {productReviewItem.targetT1Date ? ` (T1: ${productReviewItem.targetT1Date})` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px]">발주 금액 (원)</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {productReviewItem.moldPoAmount ? `${Number(productReviewItem.moldPoAmount).toLocaleString()}원` : "견적 확인중 (0원)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px]">금형 보증샷</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      {productReviewItem.moldPoShot ? `${Number(productReviewItem.moldPoShot).toLocaleString()} shots` : "- shots"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-[10px] text-zinc-500">
                    * 금형처 제출 견적서 정보(캐비티/강재/금형비)가 발주서에 자동 연동되며, 목표 T1 및 보증샷이 명기됩니다.
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={() => {
                        setPoModalItem(productReviewItem);
                        setIsPoModalOpen(true);
                      }}
                      size="xs"
                      variant="outline"
                      className="h-7 px-3 bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-300 font-bold"
                    >
                      <Paperclip className="h-3.5 w-3.5 mr-1" />
                      금형제작 발주서 첨부 / 보기
                    </Button>

                    <Button 
                      onClick={() => {
                        approveMoldPo(productReviewItem.id, "MPSI 구매개발실");
                        setProductReviewItem({
                          ...productReviewItem,
                          moldPoApproved: true,
                          moldPoAttached: true,
                          moldPoApprovedDate: "방금 완료",
                        });
                        alert(`[${productReviewItem.moldVendor}] 금형처에 금형제작 발주서가 성공적으로 발송 승인되었습니다.`);
                      }}
                      size="xs"
                      className="h-7 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                    >
                      <Send className="h-3.5 w-3.5 mr-1" />
                      발주서 금형처에 발송 승인
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* 하단 닫기 */}
            <div className="flex items-center justify-end px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border-t">
              <Button 
                onClick={() => setIsProductReviewModalOpen(false)}
                variant="outline"
                className="h-7 px-4 text-xs font-semibold"
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* [모달 2] 5. 금형설계 승인 메뉴 (Image 3 기반, 개발 5~6단계 통합) */}
      {/* ========================================================================= */}
      {isMoldDesignModalOpen && moldDesignItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border rounded-lg shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-xs">
            {/* 상단 타이틀 바 */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-purple-800 to-indigo-900 text-white">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-purple-200" />
                <span className="font-bold text-sm">
                  금형설계 승인 [{moldDesignItem.projectNo}]
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-purple-950/60 border border-purple-400/40 text-purple-200 font-medium">
                  5. 금형설계 승인 메뉴
                </span>
              </div>
              <button 
                onClick={() => setIsMoldDesignModalOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* 기본 프로젝트 정보 헤더 */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-purple-50/50 dark:bg-zinc-800/40 p-2.5 rounded-lg border border-purple-200 dark:border-zinc-700 text-center">
                <div>
                  <div className="text-[10px] text-zinc-400">프로젝트 번호</div>
                  <div className="font-mono font-bold text-purple-900 dark:text-purple-200 mt-0.5">{moldDesignItem.projectNo}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">프로젝트명</div>
                  <div className="font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 truncate">{moldDesignItem.projectName}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">고객사</div>
                  <div className="font-semibold text-zinc-700 dark:text-zinc-300 mt-0.5">{moldDesignItem.customerName}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">제품명</div>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 mt-0.5 truncate">{moldDesignItem.productName}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">금형제작처</div>
                  <div className="font-bold text-purple-700 dark:text-purple-300 mt-0.5">{moldDesignItem.moldVendor}</div>
                </div>
              </div>

              {/* [Step 5] 금형 3D 설계 데이터 검토 및 파일함 */}
              <div className="border border-purple-200 rounded-lg p-3.5 bg-white dark:bg-zinc-900 space-y-3 shadow-xs">
                <div className="flex items-center justify-between pb-1 border-b border-purple-100">
                  <span className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5 text-xs">
                    <Layers className="h-4 w-4 text-purple-600" />
                    [Step 5] 금형 3D 설계 데이터 & 금형제작협의록 검토
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400">금형설계 현황:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getMoldDesignBadge(moldDesignItem.moldDesignStatus)}`}>
                      {moldDesignItem.moldDesignStatus}
                    </span>
                  </div>
                </div>

                {/* 3대 파일함 (금형 3D data / 금형 제작 협의록 / CAE 해석 보고서 - CAE는 다운로드만) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* 1. 금형 3D data */}
                  <div className="border border-indigo-300 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-md p-2.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1">
                          <FileCode className="h-3.5 w-3.5 text-indigo-600" />
                          금형 3D data
                        </span>
                        <div className="flex items-center gap-1">
                          {/* 외주제작 프로젝트의 경우 MPSI는 업로드 불가 (외주 금형사 제출 전용) */}
                          {moldDesignItem.moldVendor?.includes("자체") ? (
                            <button
                              onClick={() => handleOpenFileUploadModal(moldDesignItem.id, "mold3DData", "금형 3D data", `MOLD_${moldDesignItem.projectNo}_3D.stp`)}
                              title="파일 업로드 (자체개발팀 전용)"
                              className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded text-indigo-700"
                            >
                              <UploadCloud className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span 
                              title="금형 3D data는 외주 금형처 전용 제출물입니다. (MPSI 업로드 제한)" 
                              className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium"
                            >
                              외주사 제출
                            </span>
                          )}
                          {moldDesignItem.mold3DDataFile && (
                            <button
                              onClick={() => handleDownloadFile(moldDesignItem.mold3DDataFile, `MOLD_${moldDesignItem.projectNo}_3D.stp`)}
                              title="다운로드"
                              className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded text-indigo-700 cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 font-mono text-[11px] font-semibold text-indigo-800 dark:text-indigo-200 truncate" title={moldDesignItem.mold3DDataFile}>
                        {getDisplayFileName(moldDesignItem.mold3DDataFile) || "미등록 (외주처 설계 진행중)"}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">
                        {moldDesignItem.mold3DDataNote || "금형처 작성 3D 설계데이터 (발주서 발행 후 착수)"}
                      </p>
                    </div>
                    <div className="text-[9.5px] text-indigo-700 font-medium pt-1.5 border-t border-indigo-200/60 mt-2">
                      {moldDesignItem.moldVendor?.includes("자체") ? "* MPSI 자체개발팀 업다운로드 지원" : "* 외주 금형사 작성·제출 전용 (MPSI 열람 및 승인)"}
                    </div>
                  </div>

                  {/* 2. 금형 제작 협의록 */}
                  <div className="border border-sky-300 bg-sky-50/40 dark:bg-sky-950/20 rounded-md p-2.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sky-900 dark:text-sky-300 flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5 text-sky-600" />
                          금형 제작 협의록
                        </span>
                        <div className="flex items-center gap-1">
                          {moldDesignItem.moldVendor?.includes("자체") ? (
                            <button
                              onClick={() => handleOpenFileUploadModal(moldDesignItem.id, "moldMeetingReport", "금형 제작 협의록", `금형제작협의록_${moldDesignItem.projectNo}.pdf`)}
                              title="파일 업로드 (자체개발팀 전용)"
                              className="p-1 hover:bg-sky-100 dark:hover:bg-sky-900/50 rounded text-sky-700"
                            >
                              <UploadCloud className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span 
                              title="금형 제작 협의록은 외주 금형처 전용 제출물입니다. (MPSI 업로드 제한)" 
                              className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium"
                            >
                              외주사 제출
                            </span>
                          )}
                          {moldDesignItem.moldMeetingReportFile && (
                            <button
                              onClick={() => handleDownloadFile(moldDesignItem.moldMeetingReportFile, `금형제작협의록_${moldDesignItem.projectNo}.pdf`)}
                              title="다운로드"
                              className="p-1 hover:bg-sky-100 dark:hover:bg-sky-900/50 rounded text-sky-700 cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 font-mono text-[11px] font-semibold text-sky-800 dark:text-sky-200 truncate" title={moldDesignItem.moldMeetingReportFile}>
                        {getDisplayFileName(moldDesignItem.moldMeetingReportFile) || "미등록"}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">
                        {moldDesignItem.moldMeetingReportNote || "금형 구조/파팅라인 설계 협의록"}
                      </p>
                    </div>
                    <div className="text-[9.5px] text-sky-700 font-medium pt-1.5 border-t border-sky-200/60 mt-2">
                      {moldDesignItem.moldVendor?.includes("자체") ? "* MPSI 자체개발팀 업다운로드 지원" : "* 외주 금형사 작성·제출 전용 (MPSI 열람 및 승인)"}
                    </div>
                  </div>

                  {/* 3. CAE 해석 보고서 (Image 3 피드백: 다운로드만 가능, 제품검토 연동) */}
                  <div className="border border-zinc-300 bg-zinc-50/50 dark:bg-zinc-800/40 rounded-md p-2.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                          <Activity className="h-3.5 w-3.5 text-zinc-500" />
                          CAE 해석 보고서
                        </span>
                        <div className="flex items-center gap-1">
                          {moldDesignItem.caeReportFile ? (
                            <button
                              onClick={() => handleDownloadFile(moldDesignItem.caeReportFile, `CAE_Report_${moldDesignItem.projectNo}.pdf`)}
                              title="다운로드"
                              className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-700 cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span className="text-[9px] text-zinc-400">파일 없음</span>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 font-mono text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 truncate" title={moldDesignItem.caeReportFile}>
                        {getDisplayFileName(moldDesignItem.caeReportFile) || "연동 파일 없음"}
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-2">
                        {moldDesignItem.caeReportNote || "제품 검토 단계에서 연동된 CAE 결과 (다운로드 전용)"}
                      </p>
                    </div>
                    <div className="text-[9.5px] text-amber-600 font-medium pt-1.5 border-t border-zinc-200 mt-2">
                      🔒 다운로드 전용 (제품검토 메뉴에서 업로드 관리)
                    </div>
                  </div>
                </div>

                {/* 업무 이력 메모 로그 */}
                <div className="bg-slate-900 text-slate-100 p-3 rounded-md space-y-2 border border-slate-700">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-200 pb-1 border-b border-slate-800">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-purple-400" />
                      업무 이력 메모 (설계 변경, 승인 이력)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      총 {moldDesignItem.workLogs?.length || 0}건
                    </span>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
                    {moldDesignItem.workLogs && moldDesignItem.workLogs.length > 0 ? (
                      moldDesignItem.workLogs.map((log) => (
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

                  {/* 메모 직접 등록창 */}
                  <div className="flex gap-1.5 pt-1 border-t border-slate-800">
                    <Input 
                      value={manualNoteAuthor}
                      onChange={(e) => setManualNoteAuthor(e.target.value)}
                      placeholder="작성자"
                      className="h-6 w-28 bg-slate-800 border-slate-700 text-white text-[10px]"
                    />
                    <Input 
                      value={manualNoteContent}
                      onChange={(e) => setManualNoteContent(e.target.value)}
                      placeholder="금형설계 검토 의견을 입력하세요"
                      className="h-6 flex-1 bg-slate-800 border-slate-700 text-white text-[10px]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddManualNote(moldDesignItem.id);
                      }}
                    />
                    <Button 
                      onClick={() => handleAddManualNote(moldDesignItem.id)}
                      size="xs"
                      className="h-6 px-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px]"
                    >
                      메모 등록
                    </Button>
                  </div>
                </div>

                {/* 설계 검토 액션 버튼들 (Image 3 - 문자발송 제외) */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button 
                    onClick={() => {
                      updateMoldDesignStatus(
                        moldDesignItem.id, 
                        "수정요청", 
                        "MPSI 김양훈 부장",
                        "[금형 3D data 수정요청] MPSI가 금형 3D 설계 데이터 수정 보완을 요청하였습니다."
                      );
                      setMoldDesignItem({ ...moldDesignItem, moldDesignStatus: "수정요청" });
                      alert("금형 3D 설계 수정요청이 전달되었습니다. (메모 자동 기록됨)");
                    }}
                    size="xs"
                    variant="outline"
                    className="h-7 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300 font-bold"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                    금형 3D data 수정요청
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      updateMoldDesignStatus(
                        moldDesignItem.id, 
                        "검토완료", 
                        "MPSI 김양훈 부장",
                        "[금형 3D data 검토 완료] MPSI 담당자가 금형 3D 설계를 최종 검토 승인하였습니다. (가공 및 조립 착수)"
                      );
                      setMoldDesignItem({ ...moldDesignItem, moldDesignStatus: "검토완료" });
                      alert("금형 3D 설계 데이터가 최종 승인되었습니다.");
                    }}
                    size="xs"
                    className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    금형 3D data 검토 완료
                  </Button>
                </div>
              </div>

              {/* [Step 6 통합] 3. 소재 발주 승인 (설계 완료 전 사전 선발주 가능) */}
              <div className="border border-emerald-300 rounded-lg p-3.5 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-emerald-200">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 text-xs">
                    <CheckSquare className="h-4 w-4 text-emerald-600" />
                    3. 소재 발주 승인 (개발 6단계 통합 - 설계 도중 선발주 가능)
                  </span>
                  <div>
                    {moldDesignItem.materialOrderStatus === "승인완료" ? (
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-600 text-white shadow-xs">
                        ✓ 소재 발주 승인 완료
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-zinc-100 text-zinc-600 border border-zinc-300">
                        소재 발주 미승인
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 rounded border border-emerald-200">
                  <div className="space-y-1">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 text-xs">
                      <span>몰드베이스 및 코어 특수강재 사전 발주 승인</span>
                      {moldDesignItem.materialOrderApprover && (
                        <span className="text-[10px] text-emerald-700 font-semibold">
                          (최종승인: {moldDesignItem.materialOrderApprover}, {moldDesignItem.materialOrderApprovedDate})
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      * 금형설계가 완전히 끝나지 않아도 메인 소재 사이즈만 컨펌되면 즉시 발주 승인하여 납기를 단축합니다.<br />
                      * 승인 버튼 클릭 시 해당 금형의 소재 발주가 승인되며, 업무 메모에 승인 내역이 자동 등록됩니다.
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <Button 
                      onClick={() => {
                        const approver = "홍길동 책임 (MPSI 개발실)";
                        approveMaterialOrder(
                          moldDesignItem.id, 
                          approver, 
                          "메인 몰드베이스 및 코어 강재 규격 사전 발주 승인 완료."
                        );
                        setMoldDesignItem({
                          ...moldDesignItem,
                          materialOrderStatus: "승인완료",
                          materialOrderApprover: approver,
                          materialOrderApprovedDate: "방금 완료",
                        });
                        alert(`[${moldDesignItem.projectNo}] 해당 금형의 소재 발주가 공식 승인되었습니다.`);
                      }}
                      size="xs"
                      className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-xs"
                    >
                      <Check className="h-4 w-4" />
                      소재 발주 승인
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* 하단 닫기 */}
            <div className="flex items-center justify-end px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border-t">
              <Button 
                onClick={() => setIsMoldDesignModalOpen(false)}
                variant="outline"
                className="h-7 px-4 text-xs font-semibold"
              >
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
                <UploadCloud className="h-4 w-4 text-sky-600" />
                {uploadModalTarget.title} 실제 파일 업로드 및 설명 메모 등록
              </span>
              <button 
                onClick={() => {
                  setUploadModalTarget({ isOpen: false, designId: 0, fileType: "product3D", title: "", targetName: "" });
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
                  placeholder="예: MPSI 김양훈 부장"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-bold mb-1 flex items-center justify-between">
                  <span>설명 메모 및 사유 (필수 입력) *</span>
                  <span className="text-[10px] text-rose-500 font-normal">필수</span>
                </label>
                <textarea 
                  value={uploadFileNote}
                  onChange={(e) => setUploadFileNote(e.target.value)}
                  rows={3}
                  className="w-full rounded border bg-transparent p-2 text-xs focus:ring-1 focus:ring-sky-500"
                  placeholder="업로드 사유, 도면 변경 부위, 특이사항을 상세히 입력하세요. (등록 시간과 함께 보존됩니다)"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button 
                onClick={() => {
                  setUploadModalTarget({ isOpen: false, designId: 0, fileType: "product3D", title: "", targetName: "" });
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
                className="h-8 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold gap-1.5"
                disabled={isUploadingFile}
              >
                {isUploadingFile ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    서버 업로드 중...
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-3.5 w-3.5" />
                    실제 파일 업로드 및 저장
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
              <span>금형제작 발주서 (Purchase Order) 미리보기</span>
              <button onClick={() => setIsPoModalOpen(false)} className="hover:opacity-80">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto flex-1 font-sans">
              <div className="text-center pb-3 border-b">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">금형 제작 발주서 (PO)</h3>
                <span className="font-mono text-xs text-zinc-500">발주번호: {poModalItem.moldPoNo || (poModalItem.projectNo ? `PO-${poModalItem.projectNo}` : "PO-NEW")}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="border p-2.5 rounded bg-zinc-50 dark:bg-zinc-800/40 space-y-1">
                  <div className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">[발주사 (MPSI)]</div>
                  <div>회사명: (주)엠피에스아이</div>
                  <div>담당부서: 금형개발실 / 구매팀</div>
                  <div>담당자: MPSI 담당자</div>
                </div>
                <div className="border p-2.5 rounded bg-zinc-50 dark:bg-zinc-800/40 space-y-1">
                  <div className="font-bold text-zinc-800 dark:text-zinc-200 mb-1">[수주사 (금형제작처)]</div>
                  <div>업체명: {poModalItem.moldVendor}</div>
                  <div>프로젝트: {poModalItem.projectName}</div>
                  <div>대상제품: {poModalItem.productName}</div>
                </div>
              </div>

              <div className="border rounded overflow-hidden">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-zinc-100 dark:bg-zinc-800 font-bold border-b">
                    <tr>
                      <th className="p-2 border-r">항목</th>
                      <th className="p-2 border-r">발주 세부 사양</th>
                      <th className="p-2 text-right">금액/수치</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-zinc-700 dark:text-zinc-300">
                    <tr>
                      <td className="p-2 border-r font-medium">금형 발주 금액</td>
                      <td className="p-2 border-r">재료비+가공비+일반관리비 포함 (수주확정 견적가)</td>
                      <td className="p-2 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
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
              <div className="text-[10px] text-zinc-500 bg-amber-50 p-2 rounded border border-amber-200">
                * 본 발주서는 MPSI ERP 및 SCM 발주 시스템과 연동되어 법적 효력을 갖습니다.
              </div>
            </div>
            <div className="flex items-center justify-end px-4 py-2 bg-zinc-50 border-t">
              <Button onClick={() => setIsPoModalOpen(false)} size="xs" className="h-7 px-3">닫기</Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 13단계 프로세스 다이어그램 모달 (기존 연계 유지) */}
      {/* ========================================================================= */}
      {isDiagramModalOpen && diagramItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-xs">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#2d3748] text-white">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-sky-400" />
                <span className="font-bold text-sm">
                  13단계 세부 공정 타임라인 [{diagramItem.projectNo}]
                </span>
              </div>
              <button onClick={() => setIsDiagramModalOpen(false)} className="hover:opacity-80">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-50 p-2 rounded border text-center">
                <div>
                  <div className="text-zinc-400 text-[10px]">프로젝트</div>
                  <div className="font-bold">{diagramItem.projectName}</div>
                </div>
                <div>
                  <div className="text-zinc-400 text-[10px]">제품명</div>
                  <div className="font-bold">{diagramItem.productName}</div>
                </div>
                <div>
                  <div className="text-zinc-400 text-[10px]">금형제작처</div>
                  <div className="font-bold text-sky-700">{diagramItem.moldVendor}</div>
                </div>
                <div>
                  <div className="text-zinc-400 text-[10px]">목표 T1</div>
                  <div className="font-bold text-emerald-700">{diagramItem.targetT1Date}</div>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                {PROCESS_13_STEPS.map((step) => {
                  const isCurrent = step.step === diagramItem.currentStep;
                  const isDone = step.step < diagramItem.currentStep;
                  const isExpanded = expandedStep === step.step;

                  return (
                    <div 
                      key={step.step}
                      className={`border rounded p-2 transition-all ${
                        isCurrent 
                          ? "border-sky-500 bg-sky-50/50 dark:bg-sky-950/30" 
                          : isDone 
                          ? "border-emerald-200 bg-emerald-50/20" 
                          : "border-zinc-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                            isDone ? "bg-emerald-600 text-white" : isCurrent ? "bg-sky-600 text-white animate-pulse" : "bg-zinc-200 text-zinc-600"
                          }`}>
                            {isDone ? "✓" : step.step}
                          </span>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">{step.name}</span>
                          <span className="text-[10px] text-zinc-400">({getStepActor(step.step)})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setExpandedStep(isExpanded ? null : step.step)}
                            className="text-[10px] text-zinc-500 hover:text-zinc-800 underline"
                          >
                            {isExpanded ? "접기" : "상세"}
                          </button>
                          <Button 
                            onClick={() => handleNavigateToStepPage(step.step, diagramItem.projectNo)}
                            size="xs"
                            variant="outline"
                            className="h-5 px-1.5 text-[10px] gap-0.5"
                          >
                            화면이동
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-2 pt-2 border-t text-[11px] text-zinc-600 space-y-1">
                          <div className="font-semibold text-zinc-800">핵심 과업:</div>
                          <ul className="list-disc pl-4 space-y-0.5">
                            {getStepBullets(step.step).map((bullet, bIdx) => (
                              <li key={bIdx}>{bullet}</li>
                            ))}
                          </ul>
                        </div>
                      )}
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
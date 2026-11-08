"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Search, RefreshCw, Plus, Eye, 
  CheckCircle2, AlertCircle, 
  Wrench, Send, Download, X, Upload,
  Paperclip, FileSpreadsheet, Trash2,
  Calendar, Package, Sparkles,
  ArrowRight, Check, User, Clock,
  DollarSign, FileText, Phone, Mail, Edit3, MessageSquare, Hammer, Gauge,
  Building2, ArrowUpRight, ChevronDown, ChevronUp, CheckSquare, Square,
  HelpCircle, ExternalLink, MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangeFilter, isWithinDateRange, DatePresetType } from "@/components/common/date-range-filter";
import { MOLD_VENDOR_LIST } from "@/lib/role-store";
import { useProjectMaster } from "@/lib/project-store";
import { 
  useMoldQuotationStore, 
  MoldDevEstimateItem, 
  MoldQuotationStatus,
  MoldVendorQuoteSubmission,
  MoldSpecDocumentItem
} from "@/lib/mold-quotation-store";
import { sendAppNotification } from "@/lib/notification-store";

export default function MoldDevQuotationPage() {
  const { projects } = useProjectMaster();
  const { 
    estimates, 
    isLoading,
    addEstimate, 
    updateStatus, 
    updateVendorQuoteStatus,
    addMpsiReplyToVendorQuote,
    addSpecDocument,
    replaceSpecDocument,
    addMemo,
    refresh
  } = useMoldQuotationStore();

  // 검색 상태
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterVendor, setFilterVendor] = useState("ALL");
  const [filterType, setFilterType] = useState<"ALL" | "OUTSOURCING" | "IN_HOUSE">("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePresetType>("all");

  // 모달 상태
  const [selectedItem, setSelectedItem] = useState<MoldDevEstimateItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // 상세 모달 내 확장(Accordion) 상태 및 답변 상태
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});

  // 기술 근거문서 수정/교체 모달 상태
  const [isReplaceDocModalOpen, setIsReplaceDocModalOpen] = useState(false);
  const [replacingDoc, setReplacingDoc] = useState<MoldSpecDocumentItem | null>(null);
  const [replaceDocReason, setReplaceDocReason] = useState("");
  const [replaceDocMemo, setReplaceDocMemo] = useState("");
  const [replaceFileObj, setReplaceFileObj] = useState<File | null>(null);

  // 업로드된 파일 메모리 캐시 맵
  const uploadedFileBlobMap = useRef<Map<string, { blob: Blob; fileName: string }>>(new Map());

  // 서버 파일 업로드 헬퍼
  const uploadFileToServer = async (file: File): Promise<{
    success: boolean;
    fileUrl?: string;
    downloadUrl?: string;
    fileName?: string;
    fileSize?: string;
  }> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/v1/files/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          return {
            success: true,
            fileUrl: json.fileUrl,
            downloadUrl: json.downloadUrl,
            fileName: json.fileName,
            fileSize: json.fileSize,
          };
        }
      }
    } catch (err) {
      console.error("Failed to upload spec file to server:", err);
    }
    return { success: false };
  };

  // 실제 파일 다운로드 헬퍼
  const triggerActualFileDownload = (
    fileName: string,
    fileId?: string,
    downloadUrl?: string,
    fileUrl?: string,
    metaInfo?: { categoryName?: string; version?: number }
  ) => {
    if (!fileName) return;

    // 1. 서버 저장 스트리밍 downloadUrl 또는 fileUrl이 있는 경우
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

    // 2. 메모리 캐시에 업로드된 파일 Blob이 있는 경우
    if (fileId && uploadedFileBlobMap.current.has(fileId)) {
      const cached = uploadedFileBlobMap.current.get(fileId)!;
      const url = URL.createObjectURL(cached.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = cached.fileName || fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return;
    }

    // 3. 데모 데이터 fallback (확장자에 맞는 유효 파일 생성)
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

  // DB 거래처 마스터에서 금형 협력사 목록 동적 로드
  const [vendorList, setVendorList] = useState<{ id: string; name: string }[]>(MOLD_VENDOR_LIST);

  useEffect(() => {
    async function loadVendorsFromDb() {
      try {
        const res = await fetch("/api/v1/basic-info/vendors");
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            // 공급업체 중 금형 제작이 가능한 업체 목록 추출
            const molds = json.data
              .filter((v: any) => v.category === "공급업체" || (v.bizItem && v.bizItem.includes("금형")))
              .map((v: any) => ({
                id: v.vendorCode || v.companyName,
                name: v.companyName,
              }));
            if (molds.length > 0) {
              setVendorList(molds);
            }
          }
        }
      } catch (e) {
        console.warn("DB vendor fetch error, fallback to default vendor list:", e);
      }
    }
    loadVendorsFromDb();
  }, []);

  // 일반 MPSI 검토 메모 작성
  const [newMemoText, setNewMemoText] = useState("");

  // 신규 등록 폼 상태 (하드코딩 제거: 초기에는 완전히 빈 값으로 대기)
  const [newForm, setNewForm] = useState({
    productionType: "OUTSOURCING" as "OUTSOURCING" | "IN_HOUSE",
    projectNo: "",
    projectName: "",
    productName: "",
    customerName: "",
    assignedVendors: [] as string[], // 초기에는 빈 배열 (선택 없으면 비워둠)
    moldDegree: "M1",
    machineTypeTonnage: "",
    coreStructure: "",
    moldMaterial: "",
    cavity: "",
    gateType: "",
    moldSteel: "",
    resin: "",
    targetT1Date: "",
    moldDeliveryDate: "",
    targetMfgDays: 0,
    targetCycleTime: 0,
    targetBudgetWon: 0,
    notes: ""
  });

  // 신규 등록 시 배포 기술 근거 파일 목록 (3D, 2D, 생산조건, 기타)
  const [newSpecDocs, setNewSpecDocs] = useState<{
    category: "3D_MODEL" | "2D_DRAWING" | "PRODUCTION_COND" | "OTHER";
    categoryName: string;
    file: File | null;
    fileName: string;
    fileSize: string;
    memo: string;
    fileUrl?: string;
    downloadUrl?: string;
    isUploading?: boolean;
  }[]>([
    { category: "3D_MODEL", categoryName: "3D 제품모델 (CATIA/STEP)", file: null, fileName: "", fileSize: "", memo: "" },
    { category: "2D_DRAWING", categoryName: "2D 제품도면 (CAD/PDF)", file: null, fileName: "", fileSize: "", memo: "" },
    { category: "PRODUCTION_COND", categoryName: "생산조건 파일 (볼륨/사출기/납기/운송)", file: null, fileName: "", fileSize: "", memo: "" },
    { category: "OTHER", categoryName: "기타 품질/원가 요구사양서", file: null, fileName: "", fileSize: "", memo: "" },
  ]);

  // 프로젝트 선택 연동 (프로젝트의 실제 DB 등록 데이터만 바인딩)
  const [selectedProjectNo, setSelectedProjectNo] = useState<string>("");

  const handleSelectProject = (pNo: string) => {
    setSelectedProjectNo(pNo);
    if (!pNo) {
      setNewForm({
        productionType: "OUTSOURCING",
        projectNo: "",
        projectName: "",
        productName: "",
        customerName: "",
        assignedVendors: [],
        moldDegree: "M1",
        machineTypeTonnage: "",
        coreStructure: "코어삽입형",
        moldMaterial: "",
        cavity: "",
        gateType: "",
        moldSteel: "",
        resin: "",
        targetT1Date: "",
        moldDeliveryDate: "",
        targetMfgDays: 0,
        targetCycleTime: 0,
        targetBudgetWon: 0,
        notes: ""
      });
      return;
    }

    const found = projects.find((p) => p.projectNo === pNo);
    if (found) {
      // 1. 프로젝트 등록 시 지정했던 외주 금형업체 자동 바인딩
      let targetVendors: string[] = [];
      if (found.moldProductionType === "IN_HOUSE") {
        targetVendors = ["MPSI 자체개발팀"];
      } else if (found.moldVendor) {
        // "우성정공(주) (배희섭 수석)" 등 프로젝트 등록 시 선택한 업체 바인딩
        targetVendors = [found.moldVendor];
      }

      // 2. 프로젝트에서 입력된 실제 RFQ 스펙 추출
      const rfq = (found as any).rfqSpec || {};
      const tonnage = rfq.tonnage || (found.facilityEvent?.includes("T") ? found.facilityEvent : "");
      const cavity = rfq.cavity || found.cavity || "";
      const hrs = rfq.hrs || (found as any).hrsSpec || "";
      const moldSteel = rfq.moldSteel || found.material || "";
      const resin = (found as any).resinSpec || rfq.resin || "";

      setNewForm((prev) => ({
        ...prev,
        projectNo: found.projectNo,
        projectName: found.projectName || "",
        productName: found.productName || "",
        customerName: found.customerName || "",
        assignedVendors: targetVendors,
        productionType: found.moldProductionType === "IN_HOUSE" ? "IN_HOUSE" : "OUTSOURCING",
        moldDegree: found.moldDegree || "M1",
        machineTypeTonnage: tonnage,
        coreStructure: "",
        moldMaterial: moldSteel ? `상하원판: S55C / 메인코어: ${moldSteel}` : "",
        cavity: cavity,
        gateType: hrs,
        moldSteel: moldSteel,
        resin: resin,
        targetT1Date: found.targetT1Date || "",
        moldDeliveryDate: found.moldDeliveryDate || "",
        targetMfgDays: Number(found.targetMoldDays || 0),
        targetCycleTime: 0,
        targetBudgetWon: 0,
        notes: found.notes || ""
      }));
    }
  };

  // 외주처 다중 선택 토글 핸들러
  const handleToggleVendor = (vendorName: string) => {
    if (vendorName === "전체 업체") {
      setNewForm((prev) => ({
        ...prev,
        assignedVendors: prev.assignedVendors.includes("전체 업체") ? [] : ["전체 업체"]
      }));
      return;
    }

    setNewForm((prev) => {
      let current = prev.assignedVendors.filter(v => v !== "전체 업체");
      if (current.includes(vendorName)) {
        current = current.filter(v => v !== vendorName);
      } else {
        current = [...current, vendorName];
      }
      return {
        ...prev,
        assignedVendors: current.length === vendorList.length ? ["전체 업체"] : current
      };
    });
  };

  // 기술 근거 파일 등록 파일 선택 (서버 실제 저장 연동)
  const handleNewSpecFileChange = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeStr = (file.size / (1024 * 1024)).toFixed(2) + " MB";
      const fileId = `spec-${Date.now()}-${index}`;
      uploadedFileBlobMap.current.set(fileId, { blob: file, fileName: file.name });

      // 로딩 상태 표시
      setNewSpecDocs(prev => prev.map((doc, idx) => idx === index ? {
        ...doc,
        file,
        fileName: file.name,
        fileSize: sizeStr,
        isUploading: true
      } : doc));

      // 서버 uploads에 실제 파일 영구 업로드
      const uploadRes = await uploadFileToServer(file);

      setNewSpecDocs(prev => prev.map((doc, idx) => idx === index ? {
        ...doc,
        file,
        fileName: file.name,
        fileSize: uploadRes.fileSize || sizeStr,
        fileUrl: uploadRes.fileUrl,
        downloadUrl: uploadRes.downloadUrl,
        isUploading: false
      } : doc));
    }
  };

  // 신규 금형 견적 의뢰 등록 저장
  const handleSaveNew = () => {
    if (!selectedProjectNo || !newForm.projectNo) {
      alert("견적을 진행할 대상 프로젝트를 선택해주세요.");
      return;
    }
    if (!newForm.productName.trim()) {
      alert("제품명을 입력해주세요.");
      return;
    }
    if (newForm.productionType === "OUTSOURCING" && newForm.assignedVendors.length === 0) {
      alert("견적 요청을 발송할 금형제작처를 최소 1개사 이상 선택해주세요.");
      return;
    }

    // 파일 등록 메모 검증 (파일이 선택된 항목은 메모 필수)
    for (const doc of newSpecDocs) {
      if (doc.fileName && !doc.memo.trim()) {
        alert(`[${doc.categoryName}] 첨부 파일에 대한 기술 메모/설명을 반드시 입력해주세요.\n(클라이언트 품질 규정 준수 필수)`);
        return;
      }
    }

    const today = new Date().toISOString().split("T")[0];
    const initialStatus: MoldQuotationStatus = newForm.productionType === "OUTSOURCING" ? "견적요청" : "자체진행";

    // 배포 기술 근거자료 변환
    const specDocs: MoldSpecDocumentItem[] = newSpecDocs
      .filter(doc => doc.fileName)
      .map((doc, idx) => ({
        id: `sd-new-${Date.now()}-${idx}`,
        category: doc.category,
        categoryName: doc.categoryName,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        uploadedAt: today,
        author: "MPSI 금형개발팀",
        memo: doc.memo.trim(),
        version: 1,
        fileUrl: doc.fileUrl,
        downloadUrl: doc.downloadUrl,
        history: []
      }));

    // 제작처 표기명 결정
    const vendorDisplayName = newForm.productionType === "IN_HOUSE"
      ? "MPSI 자체개발팀"
      : newForm.assignedVendors.includes("전체 업체")
      ? "전체 금형처 (4개사)"
      : newForm.assignedVendors.length > 1
      ? `${newForm.assignedVendors[0]} 외 ${newForm.assignedVendors.length - 1}개사`
      : newForm.assignedVendors[0] || "-";

    addEstimate({
      projectNo: newForm.projectNo,
      projectName: newForm.projectName,
      productName: newForm.productName.trim(),
      customerName: newForm.customerName,
      vendorName: vendorDisplayName,
      assignedVendors: newForm.productionType === "IN_HOUSE" ? ["MPSI 자체개발팀"] : newForm.assignedVendors,
      productionType: newForm.productionType,
      machineTypeTonnage: newForm.machineTypeTonnage,
      coreStructure: newForm.coreStructure,
      moldMaterial: newForm.moldMaterial,
      cavity: newForm.cavity,
      gateType: newForm.gateType,
      moldSteel: newForm.moldSteel,
      resin: newForm.resin,
      targetT1Date: newForm.targetT1Date || today,
      moldDeliveryDate: newForm.moldDeliveryDate || "",
      targetMfgDays: Number(newForm.targetMfgDays || 0),
      targetCycleTime: Number(newForm.targetCycleTime || 0),
      quoteAmountWon: 0,
      targetBudgetWon: Number(newForm.targetBudgetWon || 0),
      quotationFileName: "",
      quotationFileSize: "",
      quotationFileDate: "",
      status: initialStatus,
      submittedDate: "",
      notes: newForm.notes,
      vendorQuotes: [],
      specDocuments: specDocs,
      memos: []
    });

    setIsNewModalOpen(false);
    setSelectedProjectNo("");
    alert(`[신규 등록 완료] ${newForm.productionType === "OUTSOURCING" ? "외주제작 견적요청" : "자체제작 등록"}이 성공적으로 처리되었습니다.\n(배포 금형처: ${vendorDisplayName}, 목표 제작일수: ${newForm.targetMfgDays}일, 목표 C/T: ${newForm.targetCycleTime}초)`);
  };

  // 공급업체 메모에 대한 MPSI 답변 저장
  const handleSaveMpsiReply = async (submissionId: string) => {
    if (!selectedItem) return;
    const replyText = replyInputs[submissionId];
    if (!replyText || !replyText.trim()) {
      alert("답변 내용을 입력해주세요.");
      return;
    }

    addMpsiReplyToVendorQuote(selectedItem.estimateNo, submissionId, replyText.trim());
    setReplyInputs(prev => ({ ...prev, [submissionId]: "" }));

    const targetSub = (selectedItem.vendorQuotes || []).find(q => q.id === submissionId);

    // selectedItem 로컬 상태 동기화
    setSelectedItem(prev => {
      if (!prev) return null;
      const updatedQuotes = (prev.vendorQuotes || []).map(q => {
        if (q.id !== submissionId) return q;
        return {
          ...q,
          mpsiReplies: [
            ...q.mpsiReplies,
            {
              id: `rep-${Date.now()}`,
              author: "MPSI",
              content: replyText.trim(),
              createdAt: new Date().toISOString().replace("T", " ").substring(0, 16)
            }
          ]
        };
      });
      return { ...prev, vendorQuotes: updatedQuotes };
    });

    // 외주 협력사로 알림 발송 (사용자 이름 제외, 회사명 단독)
    if (targetSub) {
      await sendAppNotification({
        menuName: "금형 견적 관리",
        menuPath: "/portal/vendor-portal/mold/quotation",
        senderCompany: "MPSI",
        content: `[${selectedItem.projectNo}] MPSI에서 견적 제출 소견에 대한 답변을 등록하였습니다: "${replyText.trim().slice(0, 30)}..."`,
        projectId: selectedItem.projectNo,
        targetRole: "VENDOR_MOLD",
        targetVendorName: targetSub.vendorName
      });
    }

    alert("공급업체 제출 소견에 대한 MPSI 답변이 등록되었습니다.");
  };

  // 공급업체 견적 상태 전환 (수주 확정, 검토협의 등)
  const handleVendorQuoteStatusChange = async (
    submission: MoldVendorQuoteSubmission, 
    nextStatus: "검토협의" | "수주확정" | "반려/미성사"
  ) => {
    if (!selectedItem) return;

    if (nextStatus === "수주확정") {
      const ok = confirm(`[${submission.vendorName}] 업체를 최종 금형 제작처로 '수주 확정'하시겠습니까?\n\n• 확정 금액: ${submission.totalAmountWon.toLocaleString()}원\n• 제작 가능일수: ${submission.availableMfgDays}일\n\n확정 시 타 업체의 견적은 반려 처리되며, 본 금형의 제작처로 고정됩니다.`);
      if (!ok) return;
    }

    updateVendorQuoteStatus(selectedItem.estimateNo, submission.id, nextStatus);

    // selectedItem 동기화
    setSelectedItem(prev => {
      if (!prev) return null;
      const updatedQuotes = (prev.vendorQuotes || []).map(q => {
        if (q.id === submission.id) return { ...q, status: nextStatus };
        if (nextStatus === "수주확정") return { ...q, status: "반려/미성사" as const };
        return q;
      });

      return {
        ...prev,
        vendorQuotes: updatedQuotes,
        status: nextStatus === "수주확정" ? "수주확정" : nextStatus === "검토협의" ? "견적검토중" : prev.status,
        selectedVendorName: nextStatus === "수주확정" ? submission.vendorName : prev.selectedVendorName,
        vendorName: nextStatus === "수주확정" ? submission.vendorName : prev.vendorName,
        quoteAmountWon: nextStatus === "수주확정" ? submission.totalAmountWon : prev.quoteAmountWon,
        availableMfgDays: nextStatus === "수주확정" ? submission.availableMfgDays : prev.availableMfgDays,
      };
    });

    // 외주 협력사로 상태 변경 알림 발송
    if (nextStatus === "수주확정") {
      await sendAppNotification({
        menuName: "금형 견적 관리",
        menuPath: "/portal/vendor-portal/mold/quotation",
        senderCompany: "MPSI",
        content: `[${selectedItem.projectNo}] 축하합니다! MPSI에서 ${submission.vendorName}을(를) 금형 제작처로 최종 수주 확정하였습니다. (확정금액: ${submission.totalAmountWon.toLocaleString()}원)`,
        projectId: selectedItem.projectNo,
        targetRole: "VENDOR_MOLD",
        targetVendorName: submission.vendorName
      });
    } else if (nextStatus === "반려/미성사") {
      await sendAppNotification({
        menuName: "금형 견적 관리",
        menuPath: "/portal/vendor-portal/mold/quotation",
        senderCompany: "MPSI",
        content: `[${selectedItem.projectNo}] MPSI에서 견적을 반려/미성사 처리하였습니다.`,
        projectId: selectedItem.projectNo,
        targetRole: "VENDOR_MOLD",
        targetVendorName: submission.vendorName
      });
    }

    alert(`[${submission.vendorName}] 견적 상태가 [${nextStatus}]로 변경되었습니다.`);
  };

  // 기술 근거자료 교체/수정 저장
  const handleSaveDocReplace = () => {
    if (!selectedItem || !replacingDoc) return;
    if (!replaceFileObj) {
      alert("수정할 새 파일을 선택해주세요.");
      return;
    }
    if (!replaceDocReason.trim()) {
      alert("파일 수정 및 교체 사유를 반드시 입력해주세요.\n(예: 고객사 모델링 R02 출도 반영, 치수공차 보정 등)");
      return;
    }

    const sizeStr = (replaceFileObj.size / (1024 * 1024)).toFixed(1) + " MB";
    replaceSpecDocument(selectedItem.estimateNo, replacingDoc.id, {
      fileName: replaceFileObj.name,
      fileSize: sizeStr,
      author: "MPSI",
      memo: replaceDocMemo.trim() || replacingDoc.memo,
      replaceReason: replaceDocReason.trim()
    });

    setIsReplaceDocModalOpen(false);
    setReplacingDoc(null);
    setReplaceFileObj(null);
    setReplaceDocReason("");
    setReplaceDocMemo("");

    // 로컬 selectedItem 동기화
    const refreshed = estimates.find(e => e.estimateNo === selectedItem.estimateNo);
    if (refreshed) setSelectedItem(refreshed);

    alert("기술 근거 자료가 신규 버전으로 교체되었으며, 기존 파일의 메모 및 교체 사유가 관리 이력에 정상 등록되었습니다.");
  };

  // 일반 MPSI 검토 메모 추가
  const handleAddMemo = async () => {
    if (!newMemoText.trim() || !selectedItem) return;
    const memoContent = newMemoText.trim();
    addMemo(selectedItem.estimateNo, "MPSI", memoContent);
    setNewMemoText("");

    setSelectedItem((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        memos: [
          ...prev.memos,
          {
            id: `memo-${Date.now()}`,
            author: "MPSI",
            content: memoContent,
            createdAt: new Date().toISOString().replace("T", " ").substring(0, 16)
          }
        ]
      };
    });

    // 지정 협력사에 알림 발송
    const targetVendor = selectedItem.selectedVendorName || selectedItem.vendorName;
    if (targetVendor) {
      await sendAppNotification({
        menuName: "금형 견적 관리",
        menuPath: "/portal/vendor-portal/mold/quotation",
        senderCompany: "MPSI",
        content: `[${selectedItem.projectNo}] MPSI에서 검토 메모를 등록하였습니다: "${memoContent.slice(0, 30)}..."`,
        projectId: selectedItem.projectNo,
        targetRole: "VENDOR_MOLD",
        targetVendorName: targetVendor
      });
    }
  };

  const handleReset = () => {
    setFilterKeyword("");
    setFilterVendor("ALL");
    setFilterType("ALL");
    setFilterStatus("ALL");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSelectedDatePreset("all");
  };

  // 필터링
  const filtered = estimates.filter((item) => {
    if (filterVendor !== "ALL") {
      const matchVendor = item.vendorName === filterVendor || (item.assignedVendors && item.assignedVendors.includes(filterVendor));
      if (!matchVendor) return false;
    }
    if (filterType !== "ALL" && item.productionType !== filterType) return false;
    if (filterStatus !== "ALL" && item.status !== filterStatus) return false;

    if (filterKeyword) {
      const q = filterKeyword.toLowerCase();
      const match = 
        item.estimateNo.toLowerCase().includes(q) ||
        item.projectNo.toLowerCase().includes(q) ||
        item.projectName.toLowerCase().includes(q) ||
        item.productName.toLowerCase().includes(q) ||
        item.vendorName.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (filterDateFrom || filterDateTo) {
      const targetDate = item.submittedDate || item.requestDate || item.targetT1Date;
      if (!isWithinDateRange(targetDate, filterDateFrom, filterDateTo)) {
        return false;
      }
    }

    return true;
  });

  // 상태 배지
  const renderStatusBadge = (status: MoldQuotationStatus) => {
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
            <Wrench className="h-3 w-3 text-purple-600" />
            자체제작 (MPSI)
          </span>
        );
      case "외주견적제출":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-300">
            <Send className="h-3 w-3 text-blue-600" />
            외주견적제출
          </span>
        );
      case "견적검토중":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 border border-yellow-300">
            <Edit3 className="h-3 w-3 text-yellow-600" />
            견적검토/협의중
          </span>
        );
      case "수주확정":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            수주확정 (발주승인)
          </span>
        );
      case "수주미성사":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-300">
            <AlertCircle className="h-3 w-3" />
            수주미성사
          </span>
        );
      default:
        return <span className="text-zinc-500">{status}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-3 p-3 max-w-full text-xs">
      {/* 상단 타이틀 */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 dark:bg-purple-950/50 rounded text-purple-700 dark:text-purple-300">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                금형 견적 관리
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-50 text-purple-700 border border-purple-200">
                  MPSI ↔ 금형 제작처 (외주제작 / 자체제작)
                </span>
              </h1>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                MPSI 금형개발팀의 신규 금형 외주제작 견적요청 발행 및 자체제작 관리, 다수 외주 협력사(우성정공, 대한금형 등)의 견적 제출 내역 및 목표 제작일수를 총괄 관제합니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button 
              onClick={() => setIsNewModalOpen(true)}
              className="h-8 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1 font-bold shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              신규 금형 견적 등록
            </Button>
          </div>
        </div>
      </div>

      {/* 상단 검색 조건 필터 영역 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex flex-col gap-2">
        <div className="pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <DateRangeFilter
            label="조회 기간 (제출일 / 요청일 / 목표T1)"
            startDate={filterDateFrom}
            endDate={filterDateTo}
            onChange={(start, end, preset) => {
              setFilterDateFrom(start);
              setFilterDateTo(end);
              if (preset) setSelectedDatePreset(preset);
            }}
            selectedPreset={selectedDatePreset}
            onPresetChange={setSelectedDatePreset}
            extraPresets={[
              { label: "6개월", value: "6months" }
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2">
          <div className="flex flex-col gap-1 md:col-span-2">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">통합 검색어 (견적번호 / PJT / 제품명 / 고객사)</span>
            <Input 
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              placeholder="예: NT5, 우성정공, Upper Cover, Q26001..."
              className="h-7 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">제작 방식</span>
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="h-7 rounded-md border bg-transparent px-2 text-xs font-semibold"
            >
              <option value="ALL">전체 방식</option>
              <option value="OUTSOURCING">외주제작</option>
              <option value="IN_HOUSE">자체제작 (MPSI)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">금형제작처</span>
            <select 
              value={filterVendor}
              onChange={(e) => setFilterVendor(e.target.value)}
              className="h-7 rounded-md border bg-transparent px-2 text-xs font-semibold"
            >
              <option value="ALL">전체 금형처</option>
              {MOLD_VENDOR_LIST.map((v) => (
                <option key={v.id} value={v.name}>{v.name}</option>
              ))}
              <option value="MPSI 자체개발팀">MPSI 자체개발팀</option>
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
              <option value="자체진행">자체제작 (MPSI)</option>
              <option value="외주견적제출">외주견적제출</option>
              <option value="견적검토중">견적검토/협의중</option>
              <option value="수주확정">수주확정</option>
              <option value="수주미성사">수주미성사</option>
            </select>
          </div>
          <div className="flex items-end justify-end gap-1.5">
            <Button onClick={() => {}} className="h-7 px-3 bg-purple-600 hover:bg-purple-700 text-white gap-1 text-xs">
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

      {/* 2. 금형 견적 목록 테이블 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b">
          <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-100">
            <Wrench className="h-4 w-4 text-purple-600" />
            <span>금형 견적 관리대장</span>
            <span className="text-[11px] font-normal text-zinc-500 ml-1">
              (총 <b className="text-purple-600 font-mono">{filtered.length}</b>건)
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-normal bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300">
              ● DB 연동 (PostgreSQL: MpsiMoldQuotation)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button 
              onClick={() => refresh()}
              variant="outline" 
              className="h-7 px-2.5 text-xs gap-1 text-zinc-600 hover:text-purple-600"
              title="PostgreSQL DB 실시간 새로고침"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-purple-600" : ""}`} />
              DB 새로고침
            </Button>
            <Button 
              onClick={() => alert("금형 견적 목록이 엑셀 파일로 다운로드되었습니다.")}
              variant="outline" 
              className="h-7 px-2.5 text-xs gap-1 text-zinc-600"
            >
              <Download className="h-3.5 w-3.5" />
              엑셀 다운로드
            </Button>
            <Button 
              onClick={() => setIsNewModalOpen(true)}
              className="h-7 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1 font-semibold"
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
                <th className="py-2 px-2.5 text-center w-10">No</th>
                <th className="py-2 px-2.5 text-center min-w-[105px] font-bold text-purple-700 dark:text-purple-300">프로젝트 번호</th>
                <th className="py-2 px-2.5 text-center min-w-[105px] font-bold text-indigo-700 dark:text-indigo-300">견적번호</th>
                <th className="py-2 px-2.5">진행상태</th>
                <th className="py-2 px-2.5 text-center">구분</th>
                <th className="py-2 px-2.5">제품명 / 고객사</th>
                <th className="py-2 px-2.5">금형제작처</th>
                <th className="py-2 px-2.5">Cavity / 강재 / 게이트</th>
                {/* [요청 4] 목표 제작일수 컬럼 추가 (목표 T1 좌측/옆) */}
                <th className="py-2 px-2.5 text-center text-indigo-700 dark:text-indigo-400">
                  <div className="flex items-center justify-center gap-0.5" title="최종 3D 모델 확정 후 T1까지 소요 목표 (MPSI 내부 관리용, 공급업체 미공유)">
                    <span>목표 제작일수</span>
                    <HelpCircle className="h-3 w-3 text-indigo-400" />
                  </div>
                </th>
                <th className="py-2 px-2.5 text-center">목표 T1</th>
                <th className="py-2 px-2.5 text-center text-purple-700 dark:text-purple-400">금형 출고 납기</th>
                <th className="py-2 px-2.5 text-right">제출 견적가 (원)</th>
                <th className="py-2 px-2.5 text-right">MPSI 목표예산</th>
                {/* [요청 5] 견적서 첨부 컬럼: 제출건수/요청업체수 (2/4 형태 표기) */}
                <th className="py-2 px-2.5 text-center">견적서 첨부</th>
                <th className="py-2 px-2.5 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {isLoading ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-purple-600" />
                      <span className="font-medium text-xs">PostgreSQL DB ("MpsiMoldQuotation")에서 실데이터를 불러오는 중입니다...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-8 text-center text-zinc-400">
                    조회된 금형 견적 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => {
                  const totalAssigned = item.assignedVendors?.includes("전체 업체") ? 4 : (item.assignedVendors?.length || 1);
                  const submittedCount = item.vendorQuotes?.length || (item.quotationFileName ? 1 : 0);
                  const isConfirmed = item.status === "수주확정";

                  // 수주 확정 전 vs 후 금형제작처 표기 규칙
                  let vendorLabel = item.vendorName;
                  if (isConfirmed) {
                    vendorLabel = item.selectedVendorName || item.vendorName;
                  } else if (item.assignedVendors && item.assignedVendors.length > 0) {
                    if (item.assignedVendors.includes("전체 업체")) {
                      vendorLabel = "전체 금형처 (4개사)";
                    } else if (item.assignedVendors.length === 1) {
                      vendorLabel = item.assignedVendors[0];
                    } else {
                      vendorLabel = `${item.assignedVendors[0]} 외 ${item.assignedVendors.length - 1}개사`;
                    }
                  }

                  const rawPjt = item.officialProjectNo || item.projectNo;
                  const pjtDisplay = rawPjt?.toUpperCase().startsWith("M")
                    ? rawPjt
                    : (rawPjt?.toUpperCase().startsWith("Q") ? rawPjt.replace(/^Q/i, "MI").replace(/-0?(\d+)/, "P$1") : `MI${rawPjt || "26001P0"}`);

                  return (
                    <tr 
                      key={item.id} 
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      {/* 1. 맨 앞 컬럼: No */}
                      <td className="py-2 px-2.5 text-center text-zinc-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* 2. 프로젝트 번호 (항상 M으로 시작) */}
                      <td className="py-2 px-2.5 font-mono font-bold text-center whitespace-nowrap">
                        <span className="text-purple-700 dark:text-purple-300">
                          {pjtDisplay}
                        </span>
                      </td>

                      {/* 3. 견적번호 */}
                      <td className="py-2 px-2.5 font-mono font-bold text-center text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
                        {item.estimateNo}
                      </td>

                      {/* 4. 진행상태 */}
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        {renderStatusBadge(item.status)}
                      </td>

                      {/* 5. 구분 (외주제작 / 자체제작) */}
                      <td className="py-2 px-2.5 text-center whitespace-nowrap">
                        {item.productionType === "OUTSOURCING" ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            외주제작
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            자체제작
                          </span>
                        )}
                      </td>

                      {/* 6. 제품명 / 고객사 */}
                      <td className="py-2 px-2.5">
                        <div className="font-bold text-zinc-800 dark:text-zinc-200">
                          {item.productName}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {item.projectName} · {item.customerName}
                        </div>
                      </td>

                      {/* 7. 금형제작처 */}
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        <div className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-purple-500 shrink-0" />
                          <span>{vendorLabel}</span>
                        </div>
                        {isConfirmed ? (
                          <span className="text-[9.5px] text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 inline-block mt-0.5 font-bold">
                            ✓ 최종 수주확정
                          </span>
                        ) : (
                          <span className="text-[9.5px] text-zinc-400 block mt-0.5">
                            {submittedCount > 0 ? `${submittedCount}개사 견적 접수` : "견적 회신 대기"}
                          </span>
                        )}
                      </td>

                      {/* 8. Cavity / 강재 / 게이트 */}
                      <td className="py-2 px-2.5">
                        <div className="text-zinc-700 font-medium">
                          {item.cavity} · {item.moldSteel}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {item.gateType} {item.targetCycleTime ? `· C/T: ${item.targetCycleTime}초` : ""}
                        </div>
                      </td>

                      {/* 9. 목표 제작일수 */}
                      <td className="py-2 px-2.5 text-center font-mono text-[11px] font-bold whitespace-nowrap text-indigo-700 dark:text-indigo-300">
                        <span title="최종 3D 모델 확정 후 T1 시사출까지 목표 (MPSI 관리용, 공급업체 미공유)">
                          {item.targetMfgDays ? `${item.targetMfgDays}일` : "40일"}
                        </span>
                      </td>

                      {/* 10. 목표 T1 */}
                      <td className="py-2 px-2.5 text-center font-mono text-[11px] text-purple-600 font-semibold whitespace-nowrap">
                        {item.targetT1Date}
                      </td>

                      {/* 11. 금형 출고 납기 */}
                      <td className="py-2 px-2.5 text-center font-mono text-[11px] text-purple-700 dark:text-purple-400 font-bold whitespace-nowrap">
                        {item.moldDeliveryDate || "-"}
                      </td>

                      {/* 12. 제출 견적가 */}
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-amber-600 whitespace-nowrap">
                        {item.quoteAmountWon > 0 ? (
                          `${item.quoteAmountWon.toLocaleString()}원`
                        ) : (
                          <span className="text-zinc-400 font-normal italic">
                            {item.status === "견적요청" ? "견적 대기중" : "미등록"}
                          </span>
                        )}
                      </td>

                      {/* 13. MPSI 목표예산 */}
                      <td className="py-2 px-2.5 text-right font-mono text-zinc-500 whitespace-nowrap">
                        {item.targetBudgetWon > 0 ? `${item.targetBudgetWon.toLocaleString()}원` : "-"}
                      </td>

                      {/* 14. 견적서 첨부 */}
                      <td className="py-2 px-2.5 text-center whitespace-nowrap">
                        <span 
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold ${
                            submittedCount >= totalAssigned
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : submittedCount > 0
                              ? "bg-sky-100 text-sky-800 border border-sky-300"
                              : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                          }`}
                          title={`총 ${totalAssigned}개 의뢰처 중 ${submittedCount}개사 견적서 제출 완료 (상세심의에서 확인)`}
                        >
                          <FileSpreadsheet className="h-3 w-3 shrink-0" />
                          <span>{submittedCount}/{totalAssigned}</span>
                        </span>
                      </td>

                      {/* 15. 관리 */}
                      <td className="py-2 px-2.5 text-center whitespace-nowrap">
                        <Button 
                          onClick={() => {
                            setSelectedItem(item);
                            setIsDetailModalOpen(true);
                          }}
                          variant="outline" 
                          size="xs" 
                          className="h-6 text-[11px] px-2 gap-1 text-purple-700 hover:bg-purple-50 border-purple-300"
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

      {/* 3. 신규 금형 견적 의뢰 등록 모달 */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* 모달 상단 헤더 */}
            <div className="shrink-0 flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-purple-800 to-indigo-900 text-white border-b">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur-xs">
                  <Wrench className="h-5 w-5 text-purple-200" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    신규 금형 견적 의뢰 및 등록 (MPSI ➔ 금형제작처 배포)
                  </h3>
                  <p className="text-[11px] text-purple-200">
                    사출기 사양, 4대 기술문서(3D/2D/생산조건), 목표 제작일수 및 견적요청 대상을 설정합니다.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsNewModalOpen(false)}
                className="text-purple-200 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs">
              {/* 1단계: 대상 프로젝트 선택 */}
              <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/80 rounded-lg flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5 text-xs">
                    <Package className="h-4 w-4 text-purple-600" />
                    대상 프로젝트 선택 (프로젝트 마스터 연동)
                  </label>
                  <span className="text-[10px] text-purple-700 dark:text-purple-300 font-medium">선택 시 차종/품명/고객사 정보 자동 반영</span>
                </div>
                <select
                  value={selectedProjectNo}
                  onChange={(e) => handleSelectProject(e.target.value)}
                  className="w-full h-8 rounded-md border border-purple-300 dark:border-purple-700 bg-white dark:bg-zinc-900 px-2.5 text-xs font-bold text-purple-900 dark:text-purple-200 shadow-xs"
                >
                  <option value="">-- 대상 프로젝트를 선택하세요 (필수 선택) --</option>
                  {projects.map((p) => (
                    <option key={`${p.id}-${p.projectNo}`} value={p.projectNo}>
                      [{p.projectNo}] {p.projectName} - {p.productName} ({p.customerName}){p.changeType ? ` [${p.changeType}]` : ""}
                    </option>
                  ))}
                </select>
                {!selectedProjectNo && (
                  <p className="text-[11px] text-amber-600 font-semibold">
                    * 위 목록에서 견적을 진행할 대상 프로젝트를 반드시 선택해야 합니다.
                  </p>
                )}
              </div>

              {/* 진행 방식 선택 (외주제작 vs 자체제작) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border flex flex-col gap-1.5">
                  <span className="font-bold text-zinc-700 dark:text-zinc-200 text-[11px]">
                    제작 진행 방식
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setNewForm({ ...newForm, productionType: "OUTSOURCING" })}
                      className={`py-1.5 px-2 rounded-md border flex items-center justify-center gap-1.5 font-bold text-xs transition-all ${
                        newForm.productionType === "OUTSOURCING"
                          ? "bg-purple-600 text-white border-purple-700 shadow-xs"
                          : "bg-white dark:bg-zinc-900 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
                      }`}
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>외주제작</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewForm({ ...newForm, productionType: "IN_HOUSE" })}
                      className={`py-1.5 px-2 rounded-md border flex items-center justify-center gap-1.5 font-bold text-xs transition-all ${
                        newForm.productionType === "IN_HOUSE"
                          ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                          : "bg-white dark:bg-zinc-900 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
                      }`}
                    >
                      <Wrench className="h-3.5 w-3.5" />
                      <span>자체제작</span>
                    </button>
                  </div>
                </div>

                {/* [요청 3] 금형처 전체 선택 + 엑셀 필터 스타일 다중 체크박스 선택 */}
                <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-zinc-700 dark:text-zinc-200 text-[11px]">
                      {newForm.productionType === "OUTSOURCING" ? "견적 요청 대상 금형처 (다중 선택 가능)" : "제작 담당 부서"}
                    </label>
                    {newForm.productionType === "OUTSOURCING" && (
                      <button
                        type="button"
                        onClick={() => handleToggleVendor("전체 업체")}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${
                          newForm.assignedVendors.includes("전체 업체")
                            ? "bg-purple-600 text-white border-purple-700"
                            : "bg-white text-purple-700 border-purple-300 hover:bg-purple-50"
                        }`}
                      >
                        ✓ 전체 업체 일괄 배포
                      </button>
                    )}
                  </div>

                  {newForm.productionType === "OUTSOURCING" ? (
                    <div className="p-2 bg-white dark:bg-zinc-900 border rounded-md flex flex-wrap gap-2">
                      {vendorList.map((v) => {
                        const cleanV = (str?: string) => (str || "").replace(/\([^)]*\)/g, "").replace(/주식회사|\s/g, "").trim().toLowerCase();
                        const isChecked = newForm.assignedVendors.includes("전체 업체") || 
                          newForm.assignedVendors.some(assigned => {
                            const a = cleanV(assigned);
                            const b = cleanV(v.name);
                            return a === b || a.includes(b) || b.includes(a);
                          });
                        return (
                          <label 
                            key={v.id} 
                            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer border transition-colors ${
                              isChecked 
                                ? "bg-purple-50 text-purple-900 border-purple-300 font-bold" 
                                : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleVendor(v.name)}
                              className="rounded text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                            />
                            <span>{v.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <Input 
                      value="MPSI 자체개발팀"
                      disabled
                      className="h-8 text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-purple-700"
                    />
                  )}
                </div>
              </div>

              {/* 1. 금형 및 사출기 기본 사양 (+ 목표 제작일수 + 목표 C/T) */}
              <div className="border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-zinc-900 shadow-xs">
                <div className="bg-slate-100 dark:bg-slate-800 px-3.5 py-2 rounded-t-lg border-b flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <Gauge className="h-4 w-4 text-purple-600" />
                    1. 금형 및 사출기 기본 사양 (필수 확인 사양)
                  </span>
                  <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    목표 제작일수 & 목표 C/T 포함
                  </span>
                </div>

                <div className="p-3.5 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
                    <div>
                      <label className="text-zinc-500 text-[11px] font-medium block mb-1">
                        모델 (차종 / 프로젝트)
                      </label>
                      <Input 
                        value={newForm.projectName}
                        onChange={(e) => setNewForm({ ...newForm, projectName: e.target.value })}
                        placeholder="예: 현대 NT5 도어 트림"
                        className="h-8 text-xs font-semibold bg-zinc-50 dark:bg-zinc-800"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-500 text-[11px] font-medium block mb-1">
                        품명 (제품명)
                      </label>
                      <Input 
                        value={newForm.productName}
                        onChange={(e) => setNewForm({ ...newForm, productName: e.target.value })}
                        placeholder="예: Front Door Upper Cover"
                        className="h-8 text-xs font-semibold bg-zinc-50 dark:bg-zinc-800"
                      />
                    </div>
                    {/* [신설] 금형차수 선택 폼 */}
                    <div>
                      <label className="text-purple-700 dark:text-purple-300 text-[11px] font-bold block mb-1 flex items-center justify-between">
                        <span>금형차수</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold border border-purple-200">
                          {newForm.moldDegree || "M1"}
                        </span>
                      </label>
                      <select
                        value={newForm.moldDegree || "M1"}
                        onChange={(e) => setNewForm({ ...newForm, moldDegree: e.target.value })}
                        className="w-full h-8 rounded-lg border border-purple-300 bg-purple-50/50 dark:bg-zinc-900 px-2 text-xs font-bold text-purple-800 dark:text-purple-200"
                      >
                        <option value="M1">M1 (1차 금형 - 초도제작)</option>
                        <option value="M2">M2 (2차 복수금형 - 증설/이원화)</option>
                        <option value="M3">M3 (3차 복수금형)</option>
                        <option value="M4">M4 (4차 복수금형)</option>
                      </select>
                    </div>
                    {/* [요청 4] 목표 제작일수 입력란 */}
                    <div>
                      <label className="text-indigo-700 dark:text-indigo-300 text-[11px] font-bold block mb-1 flex items-center gap-1">
                        <span>목표 제작일수 (일)</span>
                        <span className="text-[9px] text-rose-500 font-normal">*비공개</span>
                      </label>
                      <div className="relative">
                        <Input 
                          type="number"
                          min={1}
                          value={newForm.targetMfgDays || ""}
                          onChange={(e) => setNewForm({ ...newForm, targetMfgDays: Number(e.target.value) })}
                          placeholder="예: 40"
                          className="h-8 text-xs font-mono font-bold pr-7 border-indigo-300 text-indigo-800 dark:text-indigo-200 bg-indigo-50/40"
                        />
                        <span className="absolute right-2 top-2 text-[11px] font-bold text-zinc-500 pointer-events-none">일</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-zinc-500 text-[11px] font-medium block mb-1">
                        목표 T1 일정
                      </label>
                      <Input 
                        type="date"
                        value={newForm.targetT1Date}
                        onChange={(e) => setNewForm({ ...newForm, targetT1Date: e.target.value })}
                        className="h-8 text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-purple-700 dark:text-purple-300 text-[11px] font-bold block mb-1">
                        금형 출고 납기
                      </label>
                      <Input 
                        type="date"
                        value={newForm.moldDeliveryDate || ""}
                        onChange={(e) => setNewForm({ ...newForm, moldDeliveryDate: e.target.value })}
                        className="h-8 text-xs font-mono font-bold border-purple-300"
                      />
                    </div>
                  </div>

                  {/* 하단 사양 6개 컨트롤 (+ 목표 C/T 추가) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5 pt-3 pb-1 border-t border-dashed">
                    <div>
                      <label className="text-purple-700 dark:text-purple-300 text-[11px] font-bold block mb-1">
                        사출기 타입 / ton수
                      </label>
                      <Input 
                        value={newForm.machineTypeTonnage}
                        onChange={(e) => setNewForm({ ...newForm, machineTypeTonnage: e.target.value })}
                        placeholder="예: 유압식 450T"
                        className="h-8 text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-purple-700 dark:text-purple-300 text-[11px] font-bold block mb-1">
                        원판일체 / 코어삽입
                      </label>
                      <select
                        value={newForm.coreStructure}
                        onChange={(e) => setNewForm({ ...newForm, coreStructure: e.target.value })}
                        className="w-full h-8 rounded-lg border border-input bg-white dark:bg-zinc-900 px-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100"
                      >
                        <option value="">선택</option>
                        <option value="코어삽입형">코어삽입형</option>
                        <option value="원판일체형">원판일체형</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-purple-700 dark:text-purple-300 text-[11px] font-bold block mb-1">
                        재질 (원판/코어)
                      </label>
                      <Input 
                        value={newForm.moldMaterial}
                        onChange={(e) => setNewForm({ ...newForm, moldMaterial: e.target.value, moldSteel: e.target.value })}
                        placeholder="예: 상하원판:S55C / 코어:NAK80"
                        className="h-8 text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-purple-700 dark:text-purple-300 text-[11px] font-bold block mb-1">
                        cavity (캐비티)
                      </label>
                      <Input 
                        value={newForm.cavity}
                        onChange={(e) => setNewForm({ ...newForm, cavity: e.target.value })}
                        placeholder="예: 1 X 2"
                        className="h-8 text-xs font-semibold text-center font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-purple-700 dark:text-purple-300 text-[11px] font-bold block mb-1">
                        GATE형식 (게이트)
                      </label>
                      <Input 
                        value={newForm.gateType}
                        onChange={(e) => setNewForm({ ...newForm, gateType: e.target.value })}
                        placeholder="예: HRS+EDGE"
                        className="h-8 text-xs font-semibold font-mono"
                      />
                    </div>

                    {/* [요청 2-2] 목표 C/T (싸이클타임) 추가 */}
                    <div>
                      <label className="text-purple-700 dark:text-purple-300 text-[11px] font-bold block mb-1">
                        목표 C/T (초)
                      </label>
                      <div className="relative">
                        <Input 
                          type="number"
                          min={1}
                          value={newForm.targetCycleTime || ""}
                          onChange={(e) => setNewForm({ ...newForm, targetCycleTime: Number(e.target.value) })}
                          placeholder="예: 42"
                          className="h-8 text-xs font-semibold font-mono pr-6 text-right"
                        />
                        <span className="absolute right-2 top-2 text-[10px] text-zinc-400 pointer-events-none">초</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* [요청 2-1 & 2-3] 기술 근거 파일 첨부 영역 (3D, 2D, 생산조건, 기타) & 메모 필수 입력 */}
              <div className="border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-zinc-900 shadow-xs">
                <div className="bg-slate-100 dark:bg-slate-800 px-3.5 py-2 rounded-t-lg border-b flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    2. 근거 파일 첨부 (MPSI 첨부 ➔ 금형처 내용 검토 및 견적 기준)
                  </span>
                  <span className="text-[10px] text-rose-600 font-semibold">
                    * 파일 첨부 시 기술 메모 필수 입력 (이력 보존)
                  </span>
                </div>

                <div className="p-3.5 space-y-3">
                  <p className="text-[11px] text-zinc-500">
                    신규 금형 견적의뢰 시 3D 모델, 2D 도면, 생산조건(볼륨, 납기, 사출기 사양, 운송조건)을 빠짐없이 첨부하세요.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {newSpecDocs.map((item, idx) => (
                      <div key={item.category} className="p-2.5 rounded-lg border bg-zinc-50/70 dark:bg-zinc-800/40 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[11px] text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                            <Paperclip className="h-3.5 w-3.5 text-purple-600" />
                            {item.categoryName}
                          </span>
                          {item.fileName && (
                            <span className="text-[10px] text-emerald-600 font-bold">✓ 첨부완료</span>
                          )}
                        </div>

                        {/* 파일 선택 버튼 & 파일명 */}
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            id={`spec-file-${idx}`}
                            onChange={(e) => handleNewSpecFileChange(idx, e)}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            onClick={() => document.getElementById(`spec-file-${idx}`)?.click()}
                            disabled={item.isUploading}
                            className="h-7 text-xs border-purple-300 text-purple-700 hover:bg-purple-50 shrink-0"
                          >
                            {item.isUploading ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                            {item.isUploading ? "저장 중..." : "파일 선택"}
                          </Button>
                          <span className="text-[11px] text-zinc-600 dark:text-zinc-300 truncate font-mono">
                            {item.fileName ? `${item.fileName} (${item.fileSize})` : "미첨부"}
                          </span>
                          {item.fileName && (
                            <button
                              type="button"
                              onClick={() => triggerActualFileDownload(item.fileName, undefined, item.downloadUrl, item.fileUrl, { categoryName: item.categoryName, version: 1 })}
                              className="text-sky-600 hover:text-sky-800 p-0.5 inline-flex items-center gap-0.5 text-[10px] ml-auto shrink-0 font-medium"
                              title="업로드된 파일 다운로드 확인"
                            >
                              <Download className="h-3 w-3" />
                              <span>다운로드</span>
                            </button>
                          )}
                        </div>

                        {/* 파일 기술 메모 필수 입력 */}
                        <div>
                          <label className="text-[10px] text-zinc-500 font-semibold block mb-0.5">
                            파일 설명 메모 <span className="text-rose-500">* (필수 입력)</span>
                          </label>
                          <Input
                            value={item.memo}
                            onChange={(e) => setNewSpecDocs(prev => prev.map((d, i) => i === idx ? { ...d, memo: e.target.value } : d))}
                            placeholder="예: 남양연구소 최종 출도 CATIA R03 모델, 치수공차 ±0.05 적용 등"
                            className="h-7 text-xs bg-white dark:bg-zinc-900"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* MPSI 수주 목표가 (목표 예산) & 요청 특약/비고 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border">
                  <label className="text-zinc-700 dark:text-zinc-300 font-bold block mb-1 text-[11px]">
                    MPSI 수주 목표가 (목표 예산)
                  </label>
                  <Input 
                    type="number"
                    min={0}
                    value={newForm.targetBudgetWon || ""}
                    onChange={(e) => setNewForm({ ...newForm, targetBudgetWon: Number(e.target.value) })}
                    placeholder="예: 82000000"
                    className="h-8 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-zinc-900"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    ※ MPSI 내부 심의용 목표가이며, 협력사 화면에는 일체 노출되지 않습니다.
                  </p>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border">
                  <label className="text-zinc-600 font-medium block mb-1">요청 특약 및 비고</label>
                  <textarea 
                    value={newForm.notes}
                    onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
                    placeholder="예: 핫러너(HRS+EDGE) 특수사양 준수, T1 일정 엄수 특약 등"
                    className="w-full h-14 p-2 rounded-md border text-xs bg-white dark:bg-zinc-900 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* 모달 하단 푸터 */}
            <div className="shrink-0 px-5 py-3.5 bg-zinc-50 dark:bg-zinc-800 border-t flex justify-end gap-2">
              <Button onClick={() => setIsNewModalOpen(false)} variant="outline" className="h-8 text-xs px-4">
                취소
              </Button>
              <Button onClick={handleSaveNew} className="h-8 text-xs bg-purple-700 hover:bg-purple-800 text-white gap-1.5 font-bold px-5 shadow-xs">
                <Check className="h-4 w-4" />
                {newForm.productionType === "OUTSOURCING" ? "외주제작 견적요청 발송" : "자체제작 등록"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. 견적 검토 및 확정 메뉴 (상세심의 모달) */}
      {isDetailModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* 모달 상단 헤더 */}
            <div className="shrink-0 flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-purple-800 to-indigo-900 text-white border-b">
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-sm font-mono text-purple-200">
                  [{selectedItem.estimateNo}]
                </span>
                <span className="font-bold text-sm text-white">
                  {selectedItem.productName} 금형 견적 상세 및 심의
                </span>
                {renderStatusBadge(selectedItem.status)}
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-purple-200 hover:text-white p-1 rounded-lg hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              {/* 상단 4대 요약 카드 (+ 목표 제작일수 추가) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-purple-50/50 dark:bg-zinc-800/40 p-3 rounded-lg border border-purple-200 dark:border-zinc-700 text-center">
                <div>
                  <div className="text-[10px] text-zinc-400">PJT 관리번호</div>
                  <div className="font-mono font-bold text-sm text-purple-950 dark:text-purple-200 mt-0.5">
                    {selectedItem.status === "수주확정" ? (selectedItem.officialProjectNo || selectedItem.projectNo) : selectedItem.projectNo}
                  </div>
                  <span className="text-[9.5px] text-zinc-400">
                    {selectedItem.status === "수주확정" ? "수주확정 승격" : "견적 심의 단계"}
                  </span>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">금형제작처</div>
                  <div className="font-bold text-purple-700 dark:text-purple-300 text-sm mt-0.5">
                    {selectedItem.status === "수주확정" 
                      ? (selectedItem.selectedVendorName || selectedItem.vendorName)
                      : selectedItem.assignedVendors?.includes("전체 업체")
                      ? "전체 업체 (4개사)"
                      : selectedItem.vendorName}
                  </div>
                  <span className="text-[9.5px] text-zinc-400">
                    {selectedItem.status === "수주확정" ? "✓ 최종 확정처" : "배포 대상"}
                  </span>
                </div>
                {/* [요청 3] 목표 T1 납기 좌측에 목표제작일수 배치 */}
                <div className="bg-indigo-50/60 dark:bg-indigo-950/40 rounded p-1 border border-indigo-200 dark:border-indigo-800">
                  <div className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold">목표제작일수</div>
                  <div className="font-mono font-bold text-indigo-900 dark:text-indigo-200 text-sm mt-0.5">
                    {selectedItem.targetMfgDays ? `${selectedItem.targetMfgDays}일` : "-"}
                  </div>
                  <span className="text-[9px] text-rose-500 font-semibold block">MPSI 미공유 관리용</span>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">목표 T1 납기</div>
                  <div className="font-mono font-bold text-purple-600 dark:text-purple-400 text-sm mt-0.5">
                    {selectedItem.targetT1Date}
                  </div>
                  <span className="text-[9.5px] text-zinc-400">시사출 목표</span>
                </div>
                <div>
                  <div className="text-[10px] text-purple-700 dark:text-purple-300 font-bold">금형 출고 납기</div>
                  <div className="font-mono font-bold text-purple-700 dark:text-purple-400 text-sm mt-0.5">
                    {selectedItem.moldDeliveryDate || "-"}
                  </div>
                  <span className="text-[9.5px] text-zinc-400">양산처 이관일</span>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">제출 견적금액</div>
                  <div className="font-mono font-bold text-amber-600 text-sm mt-0.5">
                    {selectedItem.quoteAmountWon > 0 ? `${selectedItem.quoteAmountWon.toLocaleString()}원` : "심의 진행중"}
                  </div>
                  {selectedItem.availableMfgDays && (
                    <span className="text-[9.5px] text-zinc-500 block">제작 가능: {selectedItem.availableMfgDays}일</span>
                  )}
                </div>
              </div>

              {/* 1. 금형 및 사출기 필수 사양 (+ 목표 C/T) */}
              <div className="border rounded-lg p-3 bg-white dark:bg-zinc-900 shadow-xs">
                <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-purple-700 dark:text-purple-400 font-bold">
                    <Wrench className="h-3.5 w-3.5" />
                    금형 및 사출기 필수 사양 (기본 사양 규격)
                  </span>
                  <span className="text-[10px] text-zinc-400">사출기 사양 · 구조 · 재질 · Cavity · Gate · C/T</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                  <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded border">
                    <span className="text-zinc-400 text-[10px] block">사출기 타입 / 톤수</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{selectedItem.machineTypeTonnage || "-"}</span>
                  </div>
                  <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded border">
                    <span className="text-zinc-400 text-[10px] block">구조 형태</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{selectedItem.coreStructure || "-"}</span>
                  </div>
                  <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded border">
                    <span className="text-zinc-400 text-[10px] block">재질 (원판/코어)</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate block" title={selectedItem.moldMaterial || selectedItem.moldSteel}>
                      {selectedItem.moldMaterial || selectedItem.moldSteel || "-"}
                    </span>
                  </div>
                  <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded border">
                    <span className="text-zinc-400 text-[10px] block">Cavity 구성</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{selectedItem.cavity || "-"}</span>
                  </div>
                  <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded border">
                    <span className="text-zinc-400 text-[10px] block">게이트 타입</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate block">{selectedItem.gateType || "-"}</span>
                  </div>
                  {/* [요청 2-2] 목표 C/T 표시 */}
                  <div className="p-2 bg-purple-50 dark:bg-purple-950/40 rounded border border-purple-200 dark:border-purple-800">
                    <span className="text-purple-700 dark:text-purple-300 text-[10px] font-bold block">목표 C/T (초)</span>
                    <span className="font-mono font-bold text-purple-950 dark:text-purple-200">{selectedItem.targetCycleTime ? `${selectedItem.targetCycleTime} 초` : "-"}</span>
                  </div>
                </div>
              </div>

              {/* [요청 2] 근거 기술자료 확인 및 교체 이력 보존 영역 */}
              <div className="border rounded-lg p-3 bg-white dark:bg-zinc-900 shadow-xs space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b">
                  <div className="flex items-center gap-1.5">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                      MPSI 기술 근거자료 (3D 제품모델, 2D 도면, 생산조건 등)
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400">
                    파일 교체 시 수정 사유 필수 기록 & 이전 파일 메모 보존
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(selectedItem.specDocuments && selectedItem.specDocuments.length > 0) ? (
                    selectedItem.specDocuments.map((doc) => (
                      <div key={doc.id} className="p-2.5 rounded-lg border bg-zinc-50 dark:bg-zinc-800/50 flex flex-col gap-1.5 text-xs">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                            <Paperclip className="h-3 w-3 text-purple-600" />
                            {doc.categoryName}
                            <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-mono font-bold">
                              Rev.{doc.version}
                            </span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => {
                                setReplacingDoc(doc);
                                setReplaceDocMemo(doc.memo);
                                setIsReplaceDocModalOpen(true);
                              }}
                              className="h-5 px-1.5 text-[10px] text-purple-700 border-purple-300 hover:bg-purple-50 gap-0.5"
                            >
                              <Upload className="h-2.5 w-2.5" />
                              파일수정/교체
                            </Button>
                            <Button
                              size="xs"
                              onClick={() => triggerActualFileDownload(doc.fileName, doc.id, doc.downloadUrl, doc.fileUrl, { categoryName: doc.categoryName, version: doc.version })}
                              className="h-5 px-1.5 text-[10px] bg-purple-600 hover:bg-purple-700 text-white gap-0.5 font-semibold"
                            >
                              <Download className="h-2.5 w-2.5" />
                              다운로드
                            </Button>
                          </div>
                        </div>

                        <div className="font-mono text-[11px] text-zinc-600 dark:text-zinc-300 truncate">
                          {doc.fileName} <span className="text-[10px] text-zinc-400">({doc.fileSize})</span>
                        </div>

                        {doc.memo && (
                          <div className="p-1.5 rounded bg-white dark:bg-zinc-900 border text-[11px] text-zinc-600 dark:text-zinc-300">
                            <span className="font-bold text-zinc-700 dark:text-zinc-300 mr-1">설명메모:</span>
                            {doc.memo}
                          </div>
                        )}

                        {/* 교체 이력 내역 */}
                        {doc.history && doc.history.length > 0 && (
                          <div className="text-[10px] text-zinc-400 space-y-0.5 pt-1 border-t">
                            <span className="font-semibold block text-zinc-500">이전 버전 교체 이력 ({doc.history.length}건):</span>
                            {doc.history.map((h, hIdx) => (
                              <div key={hIdx} className="text-[9.5px]">
                                • Rev.{h.version} ({h.fileName}): <span className="text-amber-600 font-medium">{h.replaceReason || "사양 변경"}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="sm:col-span-2 text-center py-4 text-zinc-400">
                      등록된 기술 근거문서가 없습니다.
                    </div>
                  )}
                </div>
              </div>

              {/* [요청 4 & 5 핵심] 공급업체별 금형 견적 제출 목록 & 아코디언 세부확장 & MPSI 답변 */}
              <div className="border rounded-lg p-3 bg-white dark:bg-zinc-900 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-purple-600" />
                    <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                      금형 견적 제출 업체 목록 (직관적 비교 심의 및 수주확정 선택)
                    </span>
                    <span className="text-[11px] text-purple-700 font-mono font-bold ml-1">
                      (총 {selectedItem.vendorQuotes?.length || 0}개사 접수)
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400">
                    각 업체를 클릭하면 세부 원가구성/파일/공급업체 메모가 확장됩니다.
                  </span>
                </div>

                {/* 다수 공급업체 제출 리스트 테이블 */}
                {(!selectedItem.vendorQuotes || selectedItem.vendorQuotes.length === 0) ? (
                  <div className="p-6 text-center text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border">
                    <Clock className="h-8 w-8 mx-auto text-amber-500/70 mb-2 animate-pulse" />
                    <p className="font-bold text-xs text-zinc-700 dark:text-zinc-300">
                      아직 협력사로부터 제출된 견적서가 없습니다.
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      금형 협력사(우성정공 등) 화면에서 견적서를 작성·제출하면 여기에 비교 리스트가 생성됩니다.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <table className="w-full text-left text-xs border-collapse border rounded-md overflow-hidden">
                      <thead className="bg-zinc-100 dark:bg-zinc-800 text-[11px] text-zinc-600 font-bold border-b">
                        <tr>
                          <th className="py-2 px-2.5 text-center w-10">순</th>
                          <th className="py-2 px-2.5">업체명</th>
                          <th className="py-2 px-2.5 text-center">제출일자</th>
                          <th className="py-2 px-2.5 text-center font-bold text-amber-700 dark:text-amber-300">제작 가능일수</th>
                          <th className="py-2 px-2.5 text-right font-bold text-purple-700 dark:text-purple-300">견적 제출 금액</th>
                          <th className="py-2 px-2.5 text-center w-60">상태변환</th>
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
                                    ? "bg-purple-50/50 dark:bg-zinc-800" 
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
                                    <span className="text-[10px] text-purple-600 hover:underline inline-flex items-center">
                                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-2.5 text-center font-mono text-zinc-600 dark:text-zinc-400">
                                  {vq.submittedDate}
                                </td>
                                <td className="py-2.5 px-2.5 text-center font-mono font-bold text-amber-700 dark:text-amber-400">
                                  {vq.availableMfgDays}일
                                </td>
                                <td className="py-2.5 px-2.5 text-right font-mono font-bold text-sm text-purple-700 dark:text-purple-300">
                                  {vq.totalAmountWon.toLocaleString()}원
                                </td>
                                <td className="py-2.5 px-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      size="xs"
                                      variant={vq.status === "검토협의" ? "default" : "outline"}
                                      onClick={() => handleVendorQuoteStatusChange(vq, "검토협의")}
                                      className={`h-6 text-[10px] px-2 ${
                                        vq.status === "검토협의" 
                                          ? "bg-yellow-500 hover:bg-yellow-600 text-white font-bold" 
                                          : "border-yellow-400 text-yellow-800 hover:bg-yellow-50"
                                      }`}
                                    >
                                      검토/협의시작
                                    </Button>
                                    <Button
                                      size="xs"
                                      onClick={() => handleVendorQuoteStatusChange(vq, "수주확정")}
                                      className={`h-6 text-[10px] px-2 font-bold ${
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
                                      className={`h-6 text-[10px] px-1.5 ${
                                        vq.status === "반려/미성사"
                                          ? "bg-rose-100 text-rose-800 border-rose-300"
                                          : "text-zinc-400 hover:text-rose-600 border-zinc-200"
                                      }`}
                                    >
                                      반려/미성사
                                    </Button>
                                  </div>
                                </td>
                              </tr>

                              {/* 아코디언 확장 영역 (세부내역, 파일첨부, 공급업체 메모, MPSI 답변) */}
                              {isExpanded && (
                                <tr>
                                  <td colSpan={6} className="p-0 border-t bg-zinc-50/70 dark:bg-zinc-800/40">
                                    <div className="p-3.5 space-y-3 text-xs animate-in fade-in">
                                      {/* 1. 세부 내역 (재료비+가공비+일반관리비+특수사양=합계) */}
                                      <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border">
                                        <div className="font-bold text-zinc-800 dark:text-zinc-200 text-xs mb-2 flex items-center justify-between">
                                          <span className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                                            <DollarSign className="h-3.5 w-3.5" />
                                            1. [{vq.vendorName}] 세부 원가 산출 내역 (금형비 4대 구성비)
                                          </span>
                                          <span className="font-mono text-zinc-500">
                                            제작 가능일수: <b className="text-amber-700">{vq.availableMfgDays}일</b> (목표 T1 {selectedItem.targetT1Date})
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                                          <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded border">
                                            <span className="text-[10px] text-zinc-400 block">재료비</span>
                                            <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                                              {vq.materialCostWon ? `${vq.materialCostWon.toLocaleString()}원` : "-"}
                                            </span>
                                          </div>
                                          <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded border">
                                            <span className="text-[10px] text-zinc-400 block">가공비</span>
                                            <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                                              {vq.processingCostWon ? `${vq.processingCostWon.toLocaleString()}원` : "-"}
                                            </span>
                                          </div>
                                          <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded border">
                                            <span className="text-[10px] text-zinc-400 block">일반관리비 및 이윤</span>
                                            <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                                              {vq.overheadProfitWon ? `${vq.overheadProfitWon.toLocaleString()}원` : "-"}
                                            </span>
                                          </div>
                                          <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded border">
                                            <span className="text-[10px] text-zinc-400 block">특수사양 (HRS포함)</span>
                                            <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                                              {vq.specialSpecWon ? `${vq.specialSpecWon.toLocaleString()}원` : "-"}
                                            </span>
                                          </div>
                                          <div className="p-2 bg-purple-50 dark:bg-purple-950/40 rounded border border-purple-300">
                                            <span className="text-[10px] text-purple-700 font-bold block">금형비 합계금액</span>
                                            <span className="font-mono font-bold text-purple-900 dark:text-purple-200">
                                              {vq.totalAmountWon.toLocaleString()}원
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* 2. 공급업체 제출 견적서 파일 내역 */}
                                      <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <FileSpreadsheet className="h-5 w-5 text-purple-600 shrink-0" />
                                          <div>
                                            <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                              <span>{vq.quotationFileName || "첨부 견적서 파일 없음"}</span>
                                              <span className="text-[10px] text-zinc-400">({vq.quotationFileSize || "2.0 MB"})</span>
                                            </div>
                                            <div className="text-[10px] text-zinc-500">
                                              공급업체 공식 제출 금형견적서 (제출일자: {vq.submittedDate})
                                            </div>
                                          </div>
                                        </div>
                                        {vq.quotationFileName && (
                                          <Button
                                            size="xs"
                                            onClick={() => triggerActualFileDownload(vq.quotationFileName!, vq.id, vq.downloadUrl, vq.quotationFileUrl)}
                                            className="h-6 text-xs bg-purple-600 hover:bg-purple-700 text-white gap-1"
                                          >
                                            <Download className="h-3 w-3" />
                                            견적서 다운로드
                                          </Button>
                                        )}
                                      </div>

                                      {/* 3. 공급업체 작성 소견/메모 */}
                                      {vq.vendorNotes && (
                                        <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-blue-950 dark:text-blue-200">
                                          <span className="font-bold block text-[11px] text-blue-700 dark:text-blue-300 mb-0.5">
                                            3. 공급업체({vq.vendorName}) 작성 소견 및 특약 메모:
                                          </span>
                                          <p className="text-xs">{vq.vendorNotes}</p>
                                        </div>
                                      )}

                                      {/* 4. [요청 4-2] 공급업체 메모에 대한 MPSI 답변 작성 및 이력 */}
                                      <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border space-y-2">
                                        <div className="flex items-center justify-between pb-1 border-b">
                                          <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                                            <MessageCircle className="h-3.5 w-3.5 text-purple-600" />
                                            4. 공급업체 메모에 대한 MPSI 답변 및 네고 기록 ({vq.mpsiReplies?.length || 0}건)
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
                                            className="h-12 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs shrink-0"
                                          >
                                            답변 등록
                                          </Button>
                                        </div>

                                        {/* 답변 이력 리스트 */}
                                        {vq.mpsiReplies && vq.mpsiReplies.length > 0 && (
                                          <div className="space-y-1.5 pt-1">
                                            {vq.mpsiReplies.map((rep) => (
                                              <div key={rep.id} className="p-2 rounded bg-purple-50/60 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900 text-xs">
                                                <div className="flex items-center justify-between font-bold text-purple-900 dark:text-purple-200 mb-0.5">
                                                  <span>{rep.author}</span>
                                                  <span className="text-[10px] font-normal text-zinc-400">{rep.createdAt}</span>
                                                </div>
                                                <p className="text-zinc-700 dark:text-zinc-300">{rep.content}</p>
                                              </div>
                                            ))}
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

              {/* MPSI 내부 금형 견적 검토 메모 */}
              <div className="border rounded-lg p-3 bg-white dark:bg-zinc-900 shadow-xs flex flex-col gap-2">
                <div className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-between pb-1 border-b">
                  <div className="flex items-center gap-1.5">
                    <Edit3 className="h-3.5 w-3.5 text-purple-600" />
                    <span>MPSI 금형 견적 종합 검토 메모 ({selectedItem.memos.length}건)</span>
                  </div>
                  <span className="text-[10px] text-zinc-400">내부 기술/구매팀 심의 이력</span>
                </div>
                <div className="flex items-start gap-1.5 bg-zinc-50 dark:bg-zinc-800 p-2 rounded-md border">
                  <textarea 
                    value={newMemoText}
                    onChange={(e) => setNewMemoText(e.target.value)}
                    placeholder="금형 견적 종합 소견, 코어 가공일정, 핫러너 사양 승인 메모 등을 입력하세요..."
                    className="w-full h-12 p-1.5 text-xs bg-white dark:bg-zinc-900 border rounded resize-none"
                  />
                  <Button onClick={handleAddMemo} size="xs" className="h-12 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs shrink-0">
                    메모 저장
                  </Button>
                </div>
                <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                  {selectedItem.memos.map((m) => (
                    <div key={m.id} className="p-2 rounded border bg-zinc-50 dark:bg-zinc-800/40 text-xs">
                      <div className="flex items-center justify-between font-bold mb-0.5">
                        <span className="text-purple-700 dark:text-purple-300">{m.author}</span>
                        <span className="text-[10px] text-zinc-400">{m.createdAt}</span>
                      </div>
                      <p className="text-zinc-700 dark:text-zinc-300">{m.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 모달 하단 푸터 */}
            <div className="shrink-0 px-5 py-3 bg-zinc-50 dark:bg-zinc-800 border-t flex justify-end">
              <Button onClick={() => setIsDetailModalOpen(false)} className="h-8 text-xs px-5">
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. 기술 근거자료 수정/교체 모달 (사유 필수 입력 및 이전 파일 메모 보존) */}
      {isReplaceDocModalOpen && replacingDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-purple-700 text-white font-bold text-sm flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Upload className="h-4 w-4" />
                <span>기술 근거자료 수정 및 재첨부</span>
              </div>
              <button onClick={() => setIsReplaceDocModalOpen(false)} className="text-purple-200 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="p-2 rounded bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
                <div className="font-bold text-purple-900 dark:text-purple-200">
                  [{replacingDoc.categoryName}] Rev.{replacingDoc.version} ➔ Rev.{replacingDoc.version + 1} 교체
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5 truncate">
                  기존 파일: {replacingDoc.fileName}
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  새 대체 파일 선택 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  onChange={(e) => setReplaceFileObj(e.target.files?.[0] || null)}
                  className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-purple-100 file:text-purple-800 hover:file:bg-purple-200 cursor-pointer"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  수정 파일 첨부 사유 <span className="text-rose-500">* (필수 - 이력 보존)</span>
                </label>
                <textarea
                  value={replaceDocReason}
                  onChange={(e) => setReplaceDocReason(e.target.value)}
                  placeholder="예: 원청 남양연구소 R03 3D 모델 형상 변경 출도에 따른 재배포 (슬라이드 코어 구역 수정)"
                  className="w-full h-16 p-2 rounded border text-xs bg-white dark:bg-zinc-900 resize-none"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  신규 파일 설명 메모 (선택 시 기존 메모 유지)
                </label>
                <Input
                  value={replaceDocMemo}
                  onChange={(e) => setReplaceDocMemo(e.target.value)}
                  placeholder={replacingDoc.memo}
                  className="h-8 text-xs bg-white dark:bg-zinc-900"
                />
              </div>
            </div>

            <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-t flex justify-end gap-2">
              <Button onClick={() => setIsReplaceDocModalOpen(false)} variant="outline" className="h-7 text-xs">
                취소
              </Button>
              <Button onClick={handleSaveDocReplace} className="h-7 text-xs bg-purple-700 hover:bg-purple-800 text-white font-bold">
                수정 파일 등록 (Rev.{replacingDoc.version + 1})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
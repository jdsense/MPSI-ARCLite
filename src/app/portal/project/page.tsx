"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, RefreshCw, Briefcase, Plus, Package,
  Layers, ExternalLink, Download, Eye, 
  X, Check, AlertTriangle, FileText, Factory, Clock, 
  CheckCircle2, XCircle, Wrench, ShieldCheck, ArrowRight,
  RotateCcw, Activity, Building2, Calendar, MessageSquare,
  ChevronDown, ChevronUp, Filter, PlayCircle, ArrowUpRight,
  Sparkles, CheckCheck, HelpCircle, LayoutGrid, ListTree,
  FastForward, CheckSquare, Info, Hammer, Truck,
  Settings, Send, Paperclip, Edit3, Trash2, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { FileUploader, UploadedFileInfo } from "@/components/common/file-uploader";

import { 
  StepDefinition, 
  PROCESS_13_STEPS, 
  ProjectItem, 
  useProjectMaster,
  getStepUrl,
  getStepActor,
  getStepBullets,
  get13StepProgress,
  isQuoteItem,
  isDevItem,
  generateNextProjectNo,
  generateNextQuoteNo,
  deriveQuoteNoFromProjectNo,
  cleanVendorName
} from "@/lib/project-store";
import { MOLD_VENDOR_LIST, MASS_VENDOR_LIST } from "@/lib/role-store";

// 원청 고객사 표준 선택 목록
const CUSTOMER_OPTIONS = [
  "현대자동차 (1차사)",
  "기아자동차",
  "현대모비스",
  "삼성전자 VD사업부",
  "LG전자 VS사업본부",
  "SPX 플라스틱",
  "HL 만도",
  "한국단자공업(KET)",
  "서연이화",
  "덕양산업",
];

// 기초정보 등록 품목 연동 인터페이스 (DB 실제 등록 품목만 연동)
interface RegisteredItemOption {
  itemCode: string;
  itemName: string;
  category?: string;
  spec?: string;
  unit?: string;
  drawingNo?: string;
}

// 실제 DB 연동 협력업체(외주업체) 인터페이스
interface DbVendorOption {
  id: number | string;
  vendorCode: string;
  companyName: string;
  managerName?: string;
  bizItem?: string;
  category?: string;
}

const DEFAULT_ITEM_OPTIONS: RegisteredItemOption[] = [
  { itemCode: "84710-NT500-LH", itemName: "Front Door Upper Cover LH/RH", category: "판매반제품", spec: "PP-EPDM", unit: "EA" },
  { itemCode: "85840-NQ500", itemName: "Rear Pillar Trim Inner LH/RH", category: "판매반제품", spec: "PP-EPDM", unit: "EA" },
  { itemCode: "37500-EV04-L", itemName: "Battery Pack Under Tray LH/RH", category: "판매반제품", spec: "PP-GF30", unit: "EA" },
  { itemCode: "37510-SPX00-BM", itemName: "BMS Battery Case Module", category: "판매반제품", spec: "PA66-GF30", unit: "EA" },
  { itemCode: "82710-AA000", itemName: "Door Armrest Base", category: "판매반제품", spec: "ABS", unit: "EA" },
  { itemCode: "84740-A2XT0-MB", itemName: "Center Console Main Bracket", category: "판매반제품", spec: "PC/ABS", unit: "EA" },
  { itemCode: "86510-K7000", itemName: "Radiator Lower Grille", category: "판매반제품", spec: "ASA", unit: "EA" },
  { itemCode: "84611-L0000", itemName: "Crash Pad Lower Panel", category: "판매반제품", spec: "PP-TD20", unit: "EA" },
];

export { type StepDefinition, PROCESS_13_STEPS, type ProjectItem, getStepUrl, getStepActor, generateNextProjectNo };

export default function ProjectStatus13StepsPage() {
  const router = useRouter();
  const { 
    projects, 
    addProject, 
    updateStep, 
    updateProjectById,
    deleteProject,
    convertQuoteToOfficial, 
    triggerProjectRevision,
    addStepAttachment,
    deleteStepAttachment,
    updateStepMemo
  } = useProjectMaster();

  // 기초정보 품목 목록 상태 및 선택 핸들러
  const [registeredItems, setRegisteredItems] = useState<RegisteredItemOption[]>(DEFAULT_ITEM_OPTIONS);
  const [selectedItemCode, setSelectedItemCode] = useState<string>("");

  // 실제 DB 연동 협력업체(금형제작처 / 사출양산처) 목록 상태
  const [dbMoldVendors, setDbMoldVendors] = useState<DbVendorOption[]>([]);
  const [dbMassVendors, setDbMassVendors] = useState<DbVendorOption[]>([]);

  useEffect(() => {
    // 1. 기초정보 등록 품목 DB 연동
    fetch("/api/v1/basic-info/items")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setRegisteredItems(
            json.data.map((it: any) => ({
              itemCode: it.itemCode,
              itemName: it.itemName,
              category: it.category,
              spec: it.spec,
              unit: it.unit,
              drawingNo: it.drawingNo,
            }))
          );
        }
      })
      .catch((err) => console.error("Failed to load basic-info items:", err));

    // 2. 실제 협력업체(외주업체) DB 연동
    fetch("/api/v1/basic-info/vendors")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const vendors: DbVendorOption[] = json.data
            .filter((v: any) => v.category === "공급업체" || !String(v.vendorCode).startsWith("C-"))
            .map((v: any) => ({
              id: v.id,
              vendorCode: v.vendorCode,
              companyName: v.companyName,
              managerName: v.managerName,
              bizItem: v.bizItem,
              category: v.category,
            }));

          // 금형 제작 협력사: 이름이나 종목에 '금형', '정공' 포함 (사출양산 전용 업체 제외)
          const mList = vendors.filter((v) => {
            const cName = v.companyName || "";
            const bItem = v.bizItem || "";
            return (cName.includes("금형") || cName.includes("정공") || bItem.includes("금형제작")) &&
                   !cName.includes("사출양산");
          });
          setDbMoldVendors(mList.length > 0 ? mList : vendors);

          // 사출 양산 협력사: 이름이나 종목에 '사출', '몰드', '양산' 포함 (금형제작 전용 업체 제외)
          const sList = vendors.filter((v) => {
            const cName = v.companyName || "";
            const bItem = v.bizItem || "";
            if (cName.includes("금형제작") || (cName.includes("금형") && !cName.includes("사출"))) {
              return false;
            }
            return cName.includes("사출") || cName.includes("뉴몰드") || cName.includes("몰드") || cName.includes("양산") || bItem.includes("사출성형") || bItem.includes("양산");
          });
          setDbMassVendors(sList.length > 0 ? sList : vendors);
        }
      })
      .catch((err) => console.error("Failed to load basic-info vendors:", err));
  }, []);

  // 실제 DB 연동 금형제작 외주업체 옵션 목록 (순수 회사명만 추출, fallback: MOLD_VENDOR_LIST)
  const moldVendorOptions = React.useMemo(() => {
    if (dbMoldVendors.length > 0) {
      return dbMoldVendors.map((v) => ({
        id: String(v.vendorCode || v.id),
        name: cleanVendorName(v.companyName),
      }));
    }
    return MOLD_VENDOR_LIST.filter((v) => !v.isSelf).map((v) => ({
      id: v.id,
      name: cleanVendorName(v.name),
    }));
  }, [dbMoldVendors]);

  // 실제 DB 연동 사출양산 외주업체 옵션 목록 (순수 회사명만 추출, fallback: MASS_VENDOR_LIST)
  const massVendorOptions = React.useMemo(() => {
    if (dbMassVendors.length > 0) {
      return dbMassVendors.map((v) => ({
        id: String(v.vendorCode || v.id),
        name: cleanVendorName(v.companyName),
      }));
    }
    return MASS_VENDOR_LIST.filter((v) => !v.isSelf).map((v) => ({
      id: v.id,
      name: cleanVendorName(v.name),
    }));
  }, [dbMassVendors]);

  const handleSelectRegisteredItem = (itemCode: string) => {
    setSelectedItemCode(itemCode);
    if (!itemCode) return;
    const found = registeredItems.find((it) => it.itemCode === itemCode);
    if (found) {
      setFormState((prev) => ({
        ...prev,
        partNo: found.itemCode,
        productName: found.itemName,
        material: found.spec || prev.material,
        resinSpec: found.spec || prev.resinSpec,
      }));
    }
  };

  // 프로젝트 삭제 핸들러 (DB 및 스토어 영구 삭제)
  const handleDeleteProject = (row: ProjectItem) => {
    const pNo = row.projectNo || row.estimateNo || row.id;
    const pName = row.productName || row.projectName;
    if (confirm(`[프로젝트 삭제 확인]\n\n프로젝트 [${pNo}] (${pName})을(를) 정말 삭제하시겠습니까?\n이 작업은 데이터베이스(PostgreSQL)에서 즉시 삭제됩니다.`)) {
      deleteProject(pNo);
      alert(`프로젝트 [${pNo}]가 정상적으로 삭제되었습니다.`);
    }
  };

  // 공정 단계별 파일 추가 / 메모 수정 모달 상태 (KS X 9101-1 대응)
  const [stepAttachModal, setStepAttachModal] = useState<{
    open: boolean;
    projectId: number;
    step: number;
    stepTitle: string;
    uploadedFile: UploadedFileInfo | null;
  } | null>(null);

  const [stepMemoModal, setStepMemoModal] = useState<{
    open: boolean;
    projectId: number;
    step: number;
    stepTitle: string;
    memo: string;
  } | null>(null);

  // 0. 견적/수주 관리 vs 개발/양산 관리 분리 체크박스 필터 (사용자 피드백 3 반영)
  const [includeQuote, setIncludeQuote] = useState(true); // * 견적/수주 관리
  const [includeDev, setIncludeDev] = useState(true);     // * 개발/양산 관리

  // 1. 기간별 조회 조건 (상단 기본 영역 전면 배치 - 수주일, 발주일, 양산시작일, 킥오프, T1, PPAP 등)
  const [filterDateType, setFilterDateType] = useState<"order" | "po" | "massStart" | "kickoff" | "t1" | "mass" | "updated">("order");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<"all" | "today" | "thisMonth" | "recent3M" | "year2026" | "custom">("all");

  // 2. 기본 검색 조건 (통합 검색, 공정 구간, 진행 상태, 고객사)
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterStageGroup, setFilterStageGroup] = useState("ALL");
  const [filterStepStatus, setFilterStepStatus] = useState("ALL");
  const [filterCustomer, setFilterCustomer] = useState("ALL");

  // 등록된 프로젝트 기반 동적 원청사 목록 (HKMC 포함)
  const availableCustomerOptions = Array.from(
    new Set([
      ...projects.map((p) => p.customerName).filter(Boolean),
      "현대자동차",
      "모비스",
      "기아자동차",
      "SPX 플라스틱",
      "HKMC",
    ])
  );

  // 3. 외주/자체 협력사 필터 및 상세 조건
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [filterMoldVendor, setFilterMoldVendor] = useState("ALL");
  const [filterMassVendor, setFilterMassVendor] = useState("ALL");
  const [filterSpecificStep, setFilterSpecificStep] = useState<number | "ALL">("ALL");
  const [filterSpecificProjectNo, setFilterSpecificProjectNo] = useState("ALL");

  // 알림 토스트 상태
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" | "warning" } | null>(null);
  const [isUploadingAttach, setIsUploadingAttach] = useState(false);

  // 모달 상태
  const [selectedItem, setSelectedItem] = useState<ProjectItem | null>(null);
  const [isDiagramModalOpen, setIsDiagramModalOpen] = useState(false);
  const [modalActiveTab, setModalActiveTab] = useState<"matrix" | "detail">("matrix");
  const [modalFilterOnly, setModalFilterOnly] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  // 프로젝트 기본정보 수정 모달 상태 (Project ID는 협력사 연계 고유식별자로 읽기 전용)
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [editFormState, setEditFormState] = useState<Partial<ProjectItem>>({});

  // 신규 등록 시 프로젝트 번호 지정 모드 (신규 자동 채번 vs 기존 프로젝트 번호 연동 vs 승격 프로젝트 확정 등록)
  const [projectCreationMode, setProjectCreationMode] = useState<"NEW" | "EXISTING" | "PROMOTED">("NEW");
  const [selectedExistingProjectNo, setSelectedExistingProjectNo] = useState("");
  const [promotedOriginalProjectNo, setPromotedOriginalProjectNo] = useState("");

  // 설계변경(E채번) 발의 모달 상태
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionTargetProject, setRevisionTargetProject] = useState<ProjectItem | null>(null);
  const [revisionReason, setRevisionReason] = useState("");

  // 신작/설변 이력 모달 상태
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTargetProject, setHistoryTargetProject] = useState<ProjectItem | null>(null);

  // 0~13단계 세부 공정 타임라인 카드 요약 상세 펼침 상태
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  // 클라이언트 피드백 9: SCM 10대 표준 공정 양식 & 캡처 가이드 모달
  const [isDocGuideModalOpen, setIsDocGuideModalOpen] = useState(false);

  // 클라이언트 피드백 5: 외주 협력사 SMS/알림톡 긴급 통보 모달
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [smsTargetProject, setSmsTargetProject] = useState<ProjectItem | null>(null);
  const [smsMessageType, setSmsMessageType] = useState<"도면수정요청(DR)" | "시사출일정통보" | "품질개선요청" | "PPAP심사결과">("도면수정요청(DR)");
  const [smsMessageContent, setSmsMessageContent] = useState("");

  // 설계변경 발의 완료된 프로젝트 키 Set (신규 등록 시 동일 번호로 E차수 등록하여 이력 관리)
  const [initiatedRevisions, setInitiatedRevisions] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("mpsi_revision_initiated_projects");
        if (saved) return new Set(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
    return new Set<string>();
  });

  const markRevisionInitiated = (key: string) => {
    setInitiatedRevisions((prev) => {
      const next = new Set(prev);
      next.add(key);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("mpsi_revision_initiated_projects", JSON.stringify(Array.from(next)));
        } catch (e) {
          console.error(e);
        }
      }
      return next;
    });
  };

  // 클라이언트 피드백 1: 수주 성사 시 정식 관리번호 부여 전환 모달
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertTargetProject, setConvertTargetProject] = useState<ProjectItem | null>(null);
  const [inputOfficialProjectNo, setInputOfficialProjectNo] = useState("");
  const [inputOfficialMoldNo, setInputOfficialMoldNo] = useState("");

  // 신규 등록 폼 상태 (초기 하드코딩 더미값 완전 제거, 수기 및 기초정보 선택 기반)
  const [formState, setFormState] = useState<Partial<ProjectItem>>({
    projectNo: "",
    projectName: "",
    productName: "",
    customerName: "",
    partNo: "",
    moldNo: "",
    moldDegree: "M1",
    changeType: "N001",
    moldProductionType: "OUTSOURCING",
    moldVendor: "",
    massProductionType: "OUTSOURCING",
    massVendor: "",
    cavity: "",
    material: "",
    partWeight: "",
    annualVolume: "",
    machineTon: "",
    hrsSpec: "",
    moldMaterial: "",
    resinSpec: "",
    warrantyShots: "",
    kickoffDate: "",
    orderDate: "",
    poDate: "",
    massStartDate: "",
    targetT1Date: "",
    moldDeliveryDate: "",
    targetMassDate: "",
    registeredDate: "",
    quoteSubmitDate: "",
    targetMoldDays: "",
    currentStep: 1,
    stepStatus: "진행중",
    trialDegree: "T1 대기",
    trialCompletionRate: 0,
    facilityEvent: "가동대기",
    orderQty: 0,
    deliveredQty: 0,
    notes: "",
  });



  const showToast = (text: string, type: "success" | "info" | "warning" = "info") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // URL 쿼리 파라미터 연동 (?highlight=MI26001-01) - 원청사 견적 승격 건 자동 검색 필터 적용
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const highlight = params.get("highlight");
      if (highlight) {
        setFilterKeyword(highlight);
        showToast(`승격된 프로젝트 [${highlight}] 가 검색 필터에 적용되었습니다. 그리드의 '등록' 버튼을 눌러 생산 방식 및 외주업체를 확정 등록하세요.`, "info");
      }
    }
  }, []);

  // 날짜 프리셋 설정 함수
  const setDatePreset = (preset: "all" | "today" | "thisMonth" | "recent3M" | "year2026") => {
    setSelectedDatePreset(preset);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === "all") {
      setFilterDateFrom("");
      setFilterDateTo("");
      showToast("기간 조회 조건이 [전체 기간]으로 초기화되었습니다.", "info");
    } else if (preset === "today") {
      const todayStr = toDateStr(now);
      setFilterDateFrom(todayStr);
      setFilterDateTo(todayStr);
      showToast(`조회 기간: 오늘 (${todayStr})`, "info");
    } else if (preset === "thisMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFilterDateFrom(toDateStr(firstDay));
      setFilterDateTo(toDateStr(lastDay));
      showToast(`조회 기간: 이번 달 (${toDateStr(firstDay)} ~ ${toDateStr(lastDay)})`, "info");
    } else if (preset === "recent3M") {
      const past = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      setFilterDateFrom(toDateStr(past));
      setFilterDateTo(toDateStr(now));
      showToast(`조회 기간: 최근 3개월 (${toDateStr(past)} ~ ${toDateStr(now)})`, "info");
    } else if (preset === "year2026") {
      setFilterDateFrom("2026-01-01");
      setFilterDateTo("2026-12-31");
      showToast("조회 기간: 2026년 연간 (2026-01-01 ~ 2026-12-31)", "info");
    }
  };

  // 필터링된 프로젝트 목록 (외주사 필터 포함)
  const filteredProjects = projects.filter((item) => {
    // 0. 견적/수주 관리 vs 개발/양산 관리 분리 필터 (사용자 피드백 3 반영)
    const isQuote = isQuoteItem(item);
    if (isQuote && !includeQuote) return false;
    if (!isQuote && !includeDev) return false;

    // 1. 기간별 조회 필터 (수주일, 발주일, 양산시작일, 킥오프, 목표 T1, 목표 양산, 최근 갱신일)
    if (filterDateFrom || filterDateTo) {
      let targetDate = "";
      if (filterDateType === "order") targetDate = item.orderDate || item.registeredDate || item.quoteSubmitDate || "";
      else if (filterDateType === "po") targetDate = item.poDate || item.orderDate || "";
      else if (filterDateType === "massStart") targetDate = item.massStartDate || "";
      else if (filterDateType === "kickoff") targetDate = item.kickoffDate || item.orderDate || "";
      else if (filterDateType === "t1") targetDate = item.targetT1Date;
      else if (filterDateType === "mass") targetDate = item.targetMassDate;
      else if (filterDateType === "updated") targetDate = (item.updatedAt || "").slice(0, 10);

      if (!targetDate) return false;
      if (filterDateFrom && targetDate < filterDateFrom) return false;
      if (filterDateTo && targetDate > filterDateTo) return false;
    }

    // 2. 키워드 검색 (관리번호, 견적번호, 금형번호, 품번, 신작/설변, 차종명, 제품명, 원청사)
    if (filterKeyword.trim()) {
      const kw = filterKeyword.toLowerCase().trim();
      const matchNo = item.projectNo?.toLowerCase().includes(kw);
      const matchEstNo = item.estimateNo?.toLowerCase().includes(kw);
      const matchMoldNo = item.moldNo?.toLowerCase().includes(kw);
      const matchPartNo = item.partNo?.toLowerCase().includes(kw);
      const matchChange = item.changeType?.toLowerCase().includes(kw);
      const matchName = item.projectName?.toLowerCase().includes(kw);
      const matchProd = item.productName?.toLowerCase().includes(kw);
      const matchCust = item.customerName?.toLowerCase().includes(kw);
      if (!matchNo && !matchEstNo && !matchMoldNo && !matchPartNo && !matchChange && !matchName && !matchProd && !matchCust) return false;
    }

    // 3. 대공정 구간 필터
    const currentStepDef = PROCESS_13_STEPS.find((s) => s.step === item.currentStep);
    if (filterStageGroup !== "ALL") {
      if (filterStageGroup === "견적/수주") {
        if (!isQuoteItem(item) && currentStepDef?.stageGroup !== "견적/수주") return false;
      } else {
        if (currentStepDef?.stageGroup !== filterStageGroup) return false;
      }
    }

    // 4. 진행 상태 필터
    if (filterStepStatus !== "ALL") {
      if (filterStepStatus === "고객 답변 대기") {
        if (item.changeType?.startsWith("E") || item.estimateNo === "수주확정" || item.quotationStatus === "수주확정" || item.stepNameCustom === "수주확정") {
          return false;
        }
        const isWaiting = item.quotationStatus === "고객 답변 대기" || item.stepNameCustom === "고객 답변 대기" || (item.isQuotePending && item.quotationStatus !== "수주 미성사");
        if (!isWaiting) return false;
      } else if (filterStepStatus === "수주 미성사") {
        const isFailed = item.quotationStatus === "수주 미성사" || item.stepNameCustom === "수주 미성사";
        if (!isFailed) return false;
      } else if (filterStepStatus === "진행중") {
        if (isQuoteItem(item) && item.quotationStatus !== "수주확정") return false;
        if (item.stepStatus !== "진행중") return false;
      } else {
        if (item.stepStatus !== filterStepStatus) return false;
      }
    }

    // 5. 고객사 필터 (양방향 부분 일치 검색 지원)
    if (filterCustomer !== "ALL") {
      const custA = (item.customerName || "").toLowerCase();
      const custB = filterCustomer.toLowerCase();
      if (!custA.includes(custB) && !custB.includes(custA)) {
        return false;
      }
    }

    // 6. 금형제작처 필터
    if (filterMoldVendor !== "ALL" && !item.moldVendor?.includes(filterMoldVendor)) {
      return false;
    }

    // 7. 사출양산처 필터
    if (filterMassVendor !== "ALL" && !item.massVendor?.includes(filterMassVendor)) {
      return false;
    }

    // 8. 세부 스텝 및 프로젝트 지정
    if (filterSpecificStep !== "ALL" && item.currentStep !== Number(filterSpecificStep)) return false;
    if (filterSpecificProjectNo !== "ALL" && item.projectNo !== filterSpecificProjectNo) return false;

    return true;
  });

  const handleReset = () => {
    setFilterKeyword("");
    setFilterStageGroup("ALL");
    setFilterStepStatus("ALL");
    setFilterCustomer("ALL");
    setFilterMoldVendor("ALL");
    setFilterMassVendor("ALL");
    setFilterSpecificStep("ALL");
    setFilterSpecificProjectNo("ALL");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSelectedDatePreset("all");
    setIncludeQuote(true);
    setIncludeDev(true);
    showToast("조회 조건이 초기화되었습니다.", "info");
  };

  // 모달 열기 (13단계 프로세스 흐름도 제외, 매트릭스 & 상세공정)
  const handleOpenModal = (item?: ProjectItem, initialTab: "matrix" | "detail" = "matrix") => {
    if (item) {
      setSelectedItem(item);
    } else if (projects.length > 0 && !selectedItem) {
      setSelectedItem(projects[0]);
    }
    setModalActiveTab(initialTab);
    setIsDiagramModalOpen(true);
  };

  // 단계 클릭 시 상세 화면으로 이동
  const handleNavigateToStepPage = (step: number, projectNo?: string) => {
    const url = getStepUrl(step, projectNo);
    router.push(url);
  };

  // 상태값 변경
  const handleStatusChange = (projectNo: string, newStatus: ProjectItem["stepStatus"]) => {
    updateStep(projectNo, { stepStatus: newStatus });
    showToast(`[${projectNo}] 상태값이 [${newStatus}]로 변경되었습니다.`, "info");
  };

  // 완료 처리 -> 다음 단계 자동 전환
  const handleAdvanceNextStep = (item: ProjectItem) => {
    if (item.currentStep < 13) {
      const nextStep = item.currentStep + 1;
      const nextStepDef = PROCESS_13_STEPS.find((s) => s.step === nextStep);
      updateStep(item.projectNo, {
        currentStep: nextStep,
        stepStatus: "진행중",
      });
      showToast(
        `[${item.projectNo}] Step ${item.currentStep} (${PROCESS_13_STEPS.find((s) => s.step === item.currentStep)?.name}) 완료 처리됨 ➔ Step ${nextStep} (${nextStepDef?.name})로 자동 전환되었습니다.`,
        "success"
      );
    } else {
      updateStep(item.projectNo, { stepStatus: "완료" });
      showToast(`[${item.projectNo}] 최종 Step 13 (완제품 납품 및 정산) 완료로 마감 처리되었습니다.`, "success");
    }
  };

  // 신규 등록 모달 열기 핸들러 (원청사 견적을 거치지 않고 프로젝트 관리대장에서 직접 등록하는 경우: 무조건 기존 프로젝트 번호 연동으로 처리)
  const handleOpenNewProjectModal = () => {
    setProjectCreationMode("EXISTING");
    setSelectedExistingProjectNo("");
    const defaultMold = moldVendorOptions[0]?.name || "우성정공(주)";
    const defaultMass = massVendorOptions[0]?.name || "(주)뉴몰드";

    setFormState({
      projectNo: "",
      estimateNo: "수주확정",
      projectName: "",
      productName: "",
      customerName: CUSTOMER_OPTIONS[0],
      partNo: "",
      moldNo: "",
      moldDegree: "M1",
      changeType: "E001",
      moldProductionType: "OUTSOURCING",
      moldVendor: defaultMold,
      massProductionType: "OUTSOURCING",
      massVendor: defaultMass,
      cavity: "",
      material: "",
      partWeight: "",
      annualVolume: "",
      machineTon: "",
      hrsSpec: "",
      moldMaterial: "",
      resinSpec: "",
      warrantyShots: "",
      registeredDate: "",
      quoteSubmitDate: "",
      orderDate: "",
      kickoffDate: "",
      targetMoldDays: "",
      targetT1Date: "",
      moldDeliveryDate: "",
      targetMassDate: "",
      massStartDate: "",
      currentStep: 0,
      stepStatus: "진행중",
      trialDegree: "T1 대기",
    });
    setSelectedItemCode("");
    setIsNewProjectModalOpen(true);
  };

  // 원청사 견적 승격 건 생산 및 외주업체 등록 모달 열기 핸들러
  const handleOpenPromotedRegisterModal = (row: ProjectItem) => {
    setProjectCreationMode("PROMOTED");
    setSelectedExistingProjectNo("");
    setPromotedOriginalProjectNo(row.projectNo);
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // [요구사항 1] 견적 단계 번호 (Q): 실제 MI가 아니라 견적단계에서 생성된 Q로 시작되는 데이터값 바인딩
    let targetQuoteNo = row.estimateNo || "";
    if (!targetQuoteNo || targetQuoteNo.toUpperCase().startsWith("MI")) {
      targetQuoteNo = deriveQuoteNoFromProjectNo(row.projectNo || row.estimateNo);
    }

    // [요구사항 2] 품목(품번) 자동 바인딩
    let targetPartNo = row.partNo || "";
    let targetProductName = row.productName || "";
    let matchedSpec = "";

    if (!targetPartNo) {
      // 1) 견적 저장소(mpsi_prime_quotations_v1)에서 해당 견적/승격 건의 품번 탐색
      try {
        const rawQuotes = localStorage.getItem("mpsi_prime_quotations_v1");
        if (rawQuotes) {
          const quotes = JSON.parse(rawQuotes);
          const matchedQ = quotes.find(
            (q: any) =>
              q.officialProjectNo === row.projectNo ||
              q.projectNo === row.projectNo ||
              q.quotationNo === targetQuoteNo ||
              (q.productName && q.productName === row.productName)
          );
          if (matchedQ?.partPriceItems?.length) {
            targetPartNo = matchedQ.partPriceItems.find((p: any) => p.partNo)?.partNo || "";
          }
        }
      } catch (e) {}
    }

    // 2) 기초정보 등록 품목(registeredItems)에서 제품명 매칭으로 품번 도출
    if (!targetPartNo && targetProductName) {
      const matchedItem = registeredItems.find(
        (it) =>
          it.itemName === targetProductName ||
          targetProductName.toLowerCase().includes(it.itemName.toLowerCase()) ||
          it.itemName.toLowerCase().includes(targetProductName.toLowerCase())
      );
      if (matchedItem) {
        targetPartNo = matchedItem.itemCode;
        matchedSpec = matchedItem.spec || "";
      }
    }

    if (targetPartNo && !matchedSpec) {
      const foundItem = registeredItems.find((it) => it.itemCode === targetPartNo);
      if (foundItem?.spec) matchedSpec = foundItem.spec;
    }

    setSelectedItemCode(targetPartNo);

    // [요구사항 3] 금형번호 자동 입력: 프로젝트 번호(예: MI26001P0)에서 'P' 문자 이전까지만 추출 -> MI26001
    let targetMoldNo = "";
    const pjtNo = row.projectNo || "";
    const pIndex = pjtNo.toUpperCase().indexOf("P");
    if (pIndex > 0) {
      targetMoldNo = pjtNo.substring(0, pIndex);
    } else if (pjtNo) {
      targetMoldNo = pjtNo.replace(/M$/i, "");
    }

    // [요구사항 4] 실제 DB 연동 협력업체(외주업체) 바인딩 (순수 회사명만 적용)
    const defaultMold = cleanVendorName(row.moldVendor) || moldVendorOptions[0]?.name || "우성정공(주)";
    const defaultMass = cleanVendorName(row.massVendor) || massVendorOptions[0]?.name || "(주)뉴몰드";

    setFormState({
      projectNo: row.projectNo, // 견적에서 승격된 프로젝트 번호 바인딩 (모달에서 수정 가능)
      estimateNo: targetQuoteNo, // 견적단계에서 생성된 Q 번호 바인딩
      projectName: row.projectName || "",
      productName: targetProductName,
      customerName: row.customerName || CUSTOMER_OPTIONS[0],
      partNo: targetPartNo,
      moldNo: targetMoldNo,
      moldDegree: row.moldDegree || "M1",
      changeType: (row.changeType as any) || "N001",
      moldProductionType: row.moldProductionType || "OUTSOURCING",
      moldVendor: defaultMold,
      massProductionType: row.massProductionType || "OUTSOURCING",
      massVendor: defaultMass,
      cavity: row.cavity || "",
      material: row.material || matchedSpec || "",
      partWeight: row.partWeight || "",
      annualVolume: row.annualVolume || "",
      machineTon: row.machineTon || "",
      hrsSpec: row.hrsSpec || "",
      moldMaterial: row.moldMaterial || "",
      resinSpec: row.resinSpec || matchedSpec || "",
      warrantyShots: row.warrantyShots || "",
      registeredDate: row.registeredDate || dateStr,
      quoteSubmitDate: row.quoteSubmitDate || "",
      orderDate: row.orderDate || dateStr,
      kickoffDate: row.kickoffDate || "",
      targetMoldDays: row.targetMoldDays || 45,
      targetT1Date: row.targetT1Date || "",
      moldDeliveryDate: row.moldDeliveryDate || "",
      targetMassDate: row.targetMassDate || "",
      massStartDate: row.massStartDate || "",
      currentStep: 1, // 등록 완료 시 1단계(제품 data 접수)로 전환
      stepStatus: "진행중",
      trialDegree: "T1 대기",
    });
    setIsNewProjectModalOpen(true);
  };

  // 기존 프로젝트 번호 연동 선택 시 기본 정보 자동 세팅 핸들러
  const handleSelectExistingProject = (pNo: string) => {
    setSelectedExistingProjectNo(pNo);
    if (!pNo) {
      setFormState((prev) => ({
        ...prev,
        projectNo: "",
        projectName: "",
        productName: "",
        customerName: CUSTOMER_OPTIONS[0],
        partNo: "",
        moldNo: "",
      }));
      return;
    }
    const existing = projects.find(p => p.projectNo === pNo);
    if (existing) {
      const nextQNo = generateNextQuoteNo(projects);
      const nextChangeType = existing.changeType?.startsWith("E")
        ? `E${String((parseInt(existing.changeType.replace("E", ""), 10) || 1) + 1).padStart(3, "0")}`
        : "E001";
      const isEChange = nextChangeType.startsWith("E");

      // 금형번호 자동 입력: 프로젝트 번호에서 "P" 이전까지만 추출
      let autoMoldNo = "";
      const pjtNo = existing.projectNo || "";
      const pIndex = pjtNo.toUpperCase().indexOf("P");
      if (pIndex > 0) {
        autoMoldNo = pjtNo.substring(0, pIndex);
      } else {
        autoMoldNo = existing.moldNo || pjtNo;
      }
      setSelectedItemCode(existing.partNo || "");

      setFormState((prev) => ({
        ...prev,
        projectNo: existing.projectNo,
        estimateNo: isEChange ? "수주확정" : nextQNo,
        projectName: existing.projectName,
        customerName: existing.customerName,
        productName: existing.productName,
        partNo: existing.partNo || "",
        moldNo: autoMoldNo,
        moldDegree: existing.moldDegree || "M1",
        changeType: nextChangeType,
        moldProductionType: existing.moldProductionType,
        moldVendor: existing.moldVendor,
        massProductionType: existing.massProductionType,
        massVendor: existing.massVendor,
        cavity: existing.cavity,
        material: existing.material,
        partWeight: existing.partWeight || "420g",
        annualVolume: existing.annualVolume || 50000,
        machineTon: existing.machineTon || "650T",
        hrsSpec: existing.hrsSpec || "밸브게이트 2-Drop",
        moldMaterial: existing.moldMaterial || "NAK80",
        resinSpec: existing.resinSpec || "PP-EPDM",
        warrantyShots: existing.warrantyShots || 500000,
        currentStep: 0,
        stepStatus: "진행중",
        trialDegree: "T1 대기",
      }));
    }
  };

  // 신규 프로젝트 등록 (M으로 시작하는 프로젝트 번호 & Q 견적번호 분리)
  const handleCreateProject = () => {
    // [사용자 요청] 연동할 기존 프로젝트를 선택하지 않으면 등록 차단
    if (projectCreationMode === "EXISTING" && !selectedExistingProjectNo?.trim()) {
      alert("연동할 기존 프로젝트를 반드시 선택해야 프로젝트 등록이 가능합니다.");
      return;
    }
    if (!formState.projectNo?.trim()) {
      alert("연동할 기존 프로젝트를 선택하여 프로젝트 번호를 지정해주세요.");
      return;
    }
    const trimmedNo = formState.projectNo.trim();
    if (!trimmedNo.toUpperCase().startsWith("M")) {
      alert("프로젝트 번호는 반드시 'M'으로 시작해야 합니다 (예: MI26001P0, MI26002P0).");
      return;
    }
    if (!formState.productName?.trim()) {
      alert("제품명을 입력해주세요 (상단 기초정보 품목 선택 시 자동 입력).");
      return;
    }
    if (!formState.partNo?.trim()) {
      alert("품목식별자 / 품번(Part No.)을 입력하거나 기초정보 품목을 선택해주세요.");
      return;
    }

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const rawChangeType = formState.changeType || (projectCreationMode === "EXISTING" ? "E001" : "N001");
    const isEChange = rawChangeType.startsWith("E");
    const estimateNo = isEChange ? "수주확정" : (formState.estimateNo?.trim() || generateNextQuoteNo(projects));
    const isQuote = !isEChange && Number(formState.currentStep) === 0;

    // 원청사 견적 승격 건 등록 완료 처리 (기존 행 갱신)
    if (projectCreationMode === "PROMOTED") {
      const originalNo = promotedOriginalProjectNo || trimmedNo;

      // 프로젝트 번호를 수정한 경우 중복 검사
      if (trimmedNo.toUpperCase() !== originalNo.toUpperCase()) {
        const isDuplicate = projects.some(
          (p) => p.projectNo?.toUpperCase() === trimmedNo.toUpperCase() && p.projectNo?.toUpperCase() !== originalNo.toUpperCase()
        );
        if (isDuplicate) {
          alert(`이미 존재하는 프로젝트 번호 [${trimmedNo}] 입니다.\n다른 프로젝트 번호를 입력해 주세요.`);
          return;
        }
      }

      const finalPromotedEstimateNo = isEChange
        ? "수주확정"
        : (formState.estimateNo?.trim().toUpperCase().startsWith("Q")
            ? formState.estimateNo.trim()
            : deriveQuoteNoFromProjectNo(trimmedNo));

      updateStep(originalNo, {
        projectNo: trimmedNo,
        estimateNo: finalPromotedEstimateNo,
        projectName: formState.projectName || "",
        productName: formState.productName.trim(),
        customerName: formState.customerName || "고객사",
        partNo: formState.partNo || "",
        moldNo: formState.moldNo || "",
        moldDegree: formState.moldDegree || "M1",
        changeType: (formState.changeType as any) || "N001",
        moldProductionType: formState.moldProductionType || "OUTSOURCING",
        moldVendor: formState.moldVendor || "",
        massProductionType: formState.massProductionType || "OUTSOURCING",
        massVendor: formState.massVendor || "",
        cavity: formState.cavity || "",
        material: formState.material || "",
        partWeight: formState.partWeight || "",
        annualVolume: Number(formState.annualVolume || 0),
        machineTon: formState.machineTon || "",
        hrsSpec: formState.hrsSpec || "",
        moldMaterial: formState.moldMaterial || "",
        resinSpec: formState.resinSpec || "",
        warrantyShots: Number(formState.warrantyShots || 0),
        registeredDate: formState.registeredDate || dateStr,
        quoteSubmitDate: formState.quoteSubmitDate || "",
        orderDate: formState.orderDate || dateStr,
        kickoffDate: formState.kickoffDate || "",
        targetMoldDays: Number(formState.targetMoldDays || 45),
        targetT1Date: formState.targetT1Date || "",
        moldDeliveryDate: formState.moldDeliveryDate || "",
        targetMassDate: formState.targetMassDate || "",
        massStartDate: formState.massStartDate || "",
        currentStep: 1, // 1단계(제품 data 접수)로 전환
        stepStatus: "진행중",
        stepNameCustom: "제품 data 접수",
        isContractConfirmed: true,
        isQuotePending: false,
        quotationStatus: "수주확정",
        isRegistrationCompleted: true, // 등록 완료 플래그
      });

      // 프로젝트 번호가 변경되었을 때만 원청사 견적(DB 및 스토리지) 동기화
      if (typeof window !== "undefined") {
        try {
          if (trimmedNo !== originalNo) {
            fetch("/api/v1/prime-quotations", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                originalQuotationNo: originalNo,
                quotationNo: trimmedNo,
                officialProjectNo: trimmedNo,
                projectNo: trimmedNo,
                status: "프로젝트 승격",
              }),
            }).catch((err) => console.warn("[Project] Failed to sync quote update:", err));
          }

          const rawQ = localStorage.getItem("mpsi_prime_quotations_v1");
          if (rawQ && trimmedNo !== originalNo) {
            const list = JSON.parse(rawQ);
            if (Array.isArray(list)) {
              const updatedQ = list.map((q: any) =>
                q.quotationNo === originalNo || q.officialProjectNo === originalNo
                  ? { ...q, quotationNo: trimmedNo, officialProjectNo: trimmedNo, projectNo: trimmedNo }
                  : q
              );
              localStorage.setItem("mpsi_prime_quotations_v1", JSON.stringify(updatedQ));
            }
          }
        } catch (e) {
          console.error("Failed to sync quotation storage:", e);
        }
      }

      showToast(`승격 프로젝트 [${trimmedNo}] 생산 방식 및 외주업체 등록이 완료되었습니다. 1단계(제품 data 접수)가 시작됩니다.`, "success");
      setIsNewProjectModalOpen(false);
      return;
    }

    addProject({
      projectNo: trimmedNo,
      estimateNo: estimateNo,
      projectName: formState.projectName || "",
      productName: formState.productName.trim(),
      customerName: formState.customerName || "고객사",
      partNo: formState.partNo,
      moldNo: formState.moldNo || `${trimmedNo}M`,
      moldDegree: formState.moldDegree || "M1",
      changeType: rawChangeType,
      isContractConfirmed: isEChange ? true : !isQuote,
      isQuotePending: isEChange ? false : isQuote,
      quotationStatus: isEChange ? "수주확정" : (isQuote ? "고객 답변 대기" : undefined),
      stepNameCustom: isEChange ? "수주확정" : (isQuote ? "고객 답변 대기" : undefined),
      moldProductionType: formState.moldProductionType || "OUTSOURCING",
      moldVendor: formState.moldVendor || "우성정공(주)",
      massProductionType: formState.massProductionType || "OUTSOURCING",
      massVendor: formState.massVendor || "(주)뉴몰드",
      cavity: formState.cavity || "1*2 Cavity",
      material: formState.material || "NAK80",
      partWeight: formState.partWeight || "420g",
      annualVolume: Number(formState.annualVolume || 50000),
      machineTon: formState.machineTon || "650T",
      hrsSpec: formState.hrsSpec || "밸브게이트 2-Drop",
      moldMaterial: formState.moldMaterial || "NAK80",
      resinSpec: formState.resinSpec || "PP-EPDM",
      warrantyShots: Number(formState.warrantyShots || 500000),
      // 일정 항목: 사용자가 직접 입력한 값만 전달하며, 미입력 시 강제 오늘날짜(2026-11-05) 대체 없이 빈값("") 유지
      registeredDate: formState.registeredDate || dateStr, // 프로젝트 등록일만 등록시점(오늘) 기본값 적용
      quoteSubmitDate: formState.quoteSubmitDate || "",
      orderDate: formState.orderDate || "",
      kickoffDate: formState.kickoffDate || "",
      targetMoldDays: Number(formState.targetMoldDays || 45),
      targetT1Date: formState.targetT1Date || "",
      moldDeliveryDate: formState.moldDeliveryDate || "",
      targetMassDate: formState.targetMassDate || "",
      massStartDate: formState.massStartDate || "",
      currentStep: Number(formState.currentStep !== undefined ? formState.currentStep : 0),
      stepStatus: (formState.stepStatus as any) || "진행중",
      trialDegree: formState.trialDegree || "T1 대기",
      trialCompletionRate: Number(formState.trialCompletionRate || 0),
      facilityEvent: (formState.facilityEvent as any) || "가동대기",
      orderQty: Number(formState.orderQty || 0),
      deliveredQty: 0,
      notes: formState.notes || "",
      updatedAt: `${dateStr} 09:00`,
    });

    showToast(`프로젝트 [${trimmedNo}] (견적: ${estimateNo}, 구분 필터 ${formState.changeType || "N001"}) 등록 완료`, "success");
    setIsNewProjectModalOpen(false);
  };

  // 프로젝트 기본정보 수정 모달 열기
  const handleOpenEditModal = (item: ProjectItem) => {
    setEditingProject(item);
    setEditFormState({
      ...item,
      notes: item.notes || "",
    });
    setIsEditProjectModalOpen(true);
  };

  // 프로젝트 기본정보 수정 저장 (Project ID는 고유 식별자로 변경 불가)
  const handleSaveEditProject = () => {
    if (!editingProject) return;
    if (!editFormState.productName?.trim()) {
      showToast("제품명을 입력해주세요.", "warning");
      return;
    }

    const rawChangeType = editFormState.changeType || "N001";
    const isEChange = rawChangeType.startsWith("E");
    const estimateNo = isEChange ? "수주확정" : (editFormState.estimateNo?.trim() || "");

    const updatedData: Partial<ProjectItem> = {
      ...editFormState,
      estimateNo,
      changeType: rawChangeType,
      isContractConfirmed: isEChange ? true : editFormState.isContractConfirmed,
      quotationStatus: isEChange ? "수주확정" : editFormState.quotationStatus,
      projectNo: editingProject.projectNo, // 프로젝트 ID는 협력사 연계 고유 식별자로 수정 불가 유지
      productName: editFormState.productName.trim(),
      notes: editFormState.notes || "",
    };

    if (editingProject.id) {
      updateProjectById(editingProject.id, updatedData);
    } else {
      updateStep(editingProject.projectNo, updatedData);
    }

    showToast(`프로젝트 [${editingProject.projectNo}] 정보가 성공적으로 수정되었습니다.`, "success");
    setIsEditProjectModalOpen(false);
    setEditingProject(null);
  };

  // 상태 배지 스타일
  const getStepStatusBadge = (status: ProjectItem["stepStatus"]) => {
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

  // 대공정 요약 집계 (0단계 견적/수주 포함)
  const summaryByGroup = {
    group0: projects.filter((p) => p.currentStep === 0 || isQuoteItem(p)).length,
    group1: projects.filter((p) => !isQuoteItem(p) && p.currentStep >= 1 && p.currentStep <= 4).length,
    group2: projects.filter((p) => !isQuoteItem(p) && p.currentStep >= 5 && p.currentStep <= 7).length,
    group3: projects.filter((p) => !isQuoteItem(p) && p.currentStep >= 8 && p.currentStep <= 10).length,
    group4: projects.filter((p) => !isQuoteItem(p) && p.currentStep >= 11 && p.currentStep <= 13).length,
    failCount: projects.filter((p) => p.stepStatus === "Fail(수정중)").length,
  };

  // 공정별 첨부파일 확장자 배지 색상 함수
  const getFileBadgeClass = (ext: string): string => {
    switch (ext.toLowerCase()) {
      case "pdf":
        return "bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300";
      case "dwg":
        return "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300";
      case "stp":
      case "step":
        return "bg-indigo-100 text-indigo-700 border border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300";
      case "xlsx":
      case "xls":
        return "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300";
      case "zip":
        return "bg-purple-100 text-purple-700 border border-purple-300 dark:bg-purple-950/60 dark:text-purple-300";
      default:
        return "bg-slate-100 text-slate-700 border border-slate-300 dark:bg-zinc-800 dark:text-zinc-300";
    }
  };

  // 공정 단계(Step 0~13)별 첨부파일 목록 및 실무 메모 (100% DB 실제 연동 데이터만 취급, 더미 완전 제거)
  const getStepDetailMeta = (step: number, project: ProjectItem) => {
    const customAttachments = project.stepAttachments?.[step];
    const customMemo = project.stepMemos?.[step];

    return {
      attachments: customAttachments || [],
      memo: customMemo || "",
    };
  };

  // 0~13단계별 요약 상세 데이터 렌더러 (공정 타임라인 카드 아래에 표기)
  const renderStepSummaryData = (step: number, project: ProjectItem) => {
    const stepDef = PROCESS_13_STEPS.find((s) => s.step === step);
    if (!stepDef) return null;

    const dynamicActor = getStepActor(step, project);
    const detailMeta = getStepDetailMeta(step, project);
    const isStepCompleted = step < project.currentStep;
    const isStepCurrent = step === project.currentStep;
    const isFailLoop = step === 9 && project.stepStatus === "Fail(수정중)";

    const statusBadge = isStepCurrent ? (
      <span className="px-2 py-0.5 rounded-full bg-sky-600 text-white font-bold text-[10px] animate-pulse">
        {project.stepStatus === "Fail(수정중)" ? "Fail (금형 수정 루프 진행 중)" : "현재 공정 진행 중"}
      </span>
    ) : isStepCompleted ? (
      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px]">
        공정 완료 (Pass)
      </span>
    ) : (
      <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200 text-[10px]">
        착수 대기 (Pending)
      </span>
    );

    // 공정별 맞춤 상세 요약 데이터 카드
    let stepContent = null;

    switch (step) {
      case 0:
        stepContent = (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-[11px]">
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">견적 관리번호 / 진행 상태</span>
              <b className="font-mono text-blue-600 block text-xs mt-0.5">{project.estimateNo || "-"}</b>
              <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold">
                {project.quotationStatus || (project.isContractConfirmed ? "수주확정 (공식 프로젝트 승격)" : "외주통보 / 내부검토중")}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">견적 볼륨 & 성형기 사양</span>
              <div className="text-zinc-800 dark:text-zinc-200 mt-1">
                연간 볼륨: <b>{project.annualVolume ? `${typeof project.annualVolume === "number" ? project.annualVolume.toLocaleString() : project.annualVolume} ea/년` : "-"}</b>
              </div>
              <div className="text-zinc-600 dark:text-zinc-400 text-[10px] mt-0.5">
                사출기 톤수: <b>{project.machineTon ? `${project.machineTon} T` : "-"}</b> | 부품 중량: <b>{project.partWeight ? `${project.partWeight} g` : "-"}</b>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">금형 강재 및 원재료 레진</span>
              <div className="font-medium text-purple-700 dark:text-purple-300 mt-1">
                코어 강재: <b>{project.moldMaterial || project.material?.split("/")[0]?.trim() || "-"}</b>
              </div>
              <div className="text-zinc-600 dark:text-zinc-400 text-[10px] mt-0.5">
                원재료(수지): <b>{project.resinSpec || project.material?.split("/")[1]?.trim() || "-"}</b>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">견적 제출 방식 & 주체</span>
              <div className="text-zinc-800 dark:text-zinc-200 font-bold mt-1">
                {project.moldProductionType === "IN_HOUSE" ? "MPSI 직접 작성 고객사 제출" : "우성/뉴몰드 견적 취합 후 MPSI 제출"}
              </div>
              <div className="text-sky-600 text-[10px] mt-0.5 font-medium">
                담당부서: <b>MPSI 기술영업팀</b>
              </div>
            </div>
          </div>
        );
        break;

      case 1:
        stepContent = (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-[11px]">
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">접수 모델링 & 도면 사양</span>
              <b className="text-zinc-800 dark:text-zinc-200 block text-xs mt-0.5">CATIA V5 3D & 2D 도면</b>
              <span className="text-zinc-500 text-[10px]">STEP / IGES 공용 포맷 검증</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">원청 고객사 및 담당자</span>
              <b className="text-zinc-800 dark:text-zinc-200 block text-xs mt-0.5">{project.customerName}</b>
              <span className="text-zinc-500 text-[10px]">설계개발팀 도면 출도 접수</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">고객 요구사항 확인</span>
              <div className="text-zinc-700 dark:text-zinc-300 text-[10px] mt-1 space-y-0.5">
                <div>• 조립 체결부 공차 ±0.1mm 관리</div>
                <div>• 외관 표면 파팅라인 0.03mm 이하 유지</div>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">수주 확정 일자</span>
              <b className="font-mono text-emerald-600 block text-xs mt-0.5">{project.orderDate || "-"}</b>
              <span className="text-zinc-500 text-[10px]">도면 데이터 정합성 검증 완료</span>
            </div>
          </div>
        );
        break;

      case 2:
        stepContent = (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-[11px]">
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">금형 구현성(DFM) 검토</span>
              <b className="text-zinc-800 dark:text-zinc-200 block text-xs mt-0.5">슬라이드 코어 3개소 적용</b>
              <span className="text-zinc-500 text-[10px]">리브 살두께 2.2mm 수축방지 권고</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">Moldflow CAE 유동해석</span>
              <b className="text-indigo-600 block text-xs mt-0.5">충진시간 2.8초 / 변형량 0.35mm</b>
              <span className="text-zinc-500 text-[10px]">웰드라인 체결 보스 회피 통과</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">고객사 도면수정 요청(DR)</span>
              <b className="text-zinc-800 dark:text-zinc-200 block text-xs mt-0.5">보스 R각 0.5R 보강 요청</b>
              <span className="text-emerald-600 text-[10px]">고객사 설계팀 승인 완료</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">검토 주체</span>
              <b className="text-zinc-800 dark:text-zinc-200 block text-xs mt-0.5">MPSI 설계기술팀 전담</b>
              <span className="text-zinc-500 text-[10px]">금형제작처 ({project.moldVendor}) 사전 합의</span>
            </div>
          </div>
        );
        break;

      case 3:
        stepContent = (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-[11px]">
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">최종 확정 모델링</span>
              <b className="text-zinc-800 dark:text-zinc-200 block text-xs mt-0.5">3D CAD REV.02 최종 픽스</b>
              <span className="text-emerald-600 text-[10px]">체크섬 검증 및 출도 완료</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">금형제작비 영향 분석</span>
              <b className="text-zinc-800 dark:text-zinc-200 block text-xs mt-0.5">제작비 변동 없음 (±0%)</b>
              <span className="text-zinc-500 text-[10px]">수정 형상 추가 가공비 발생 방어</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">금형 발주서(PO) 준비</span>
              <b className="text-sky-600 block text-xs mt-0.5">발주 품의 및 일정표 세팅</b>
              <span className="text-zinc-500 text-[10px]">외주 금형처 즉시 발송 대기</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">킥오프(Kickoff) 일자</span>
              <b className="font-mono text-zinc-800 dark:text-zinc-200 block text-xs mt-0.5">{project.kickoffDate || project.orderDate || "-"}</b>
              <span className="text-zinc-500 text-[10px]">금형제작 공식 개발 착수일</span>
            </div>
          </div>
        );
        break;

      case 4:
        stepContent = (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-[11px]">
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">발주 대상 금형처</span>
              <b className="text-purple-700 dark:text-purple-300 block text-xs mt-0.5">{project.moldVendor}</b>
              <span className="text-zinc-500 text-[10px]">{project.moldProductionType === "IN_HOUSE" ? "[MPSI 자체제작팀]" : "[외주 금형사무처]"}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">금형 발주일 (PO Date)</span>
              <b className="font-mono text-zinc-800 dark:text-zinc-200 block text-xs mt-0.5">{project.poDate || project.orderDate || "-"}</b>
              <span className="text-zinc-500 text-[10px]">제작 사양서 및 CAD 첨부 발송</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">목표 T1 납기 일정</span>
              <b className="font-mono text-emerald-600 block text-xs mt-0.5">{project.targetT1Date}</b>
              <span className="text-zinc-500 text-[10px]">초도 시사출 마일스톤 확정</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">발주 핵심 스펙</span>
              <div className="text-zinc-700 dark:text-zinc-300 text-[10px] mt-1">
                • Cavity: <b>{project.cavity}</b> | 강재: <b>{project.moldMaterial || "-"}</b><br />
                • HRS: <b>{project.hrsSpec || "-"}</b>
              </div>
            </div>
          </div>
        );
        break;

      case 5:
        stepContent = (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-[11px]">
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">설계 주관 협력사</span>
              <b className="text-purple-700 dark:text-purple-300 block text-xs mt-0.5">{project.moldVendor} 기술설계실</b>
              <span className="text-zinc-500 text-[10px]">3D 금형 상세설계</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">제출 서류 패키지</span>
              <div className="text-zinc-700 dark:text-zinc-300 text-[10px] mt-1 space-y-0.5">
                <div>• 금형제작사양서 (조립 CAD)</div>
                <div>• DR 검토 자료 & CAE 보고서</div>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">MPSI 검토 승인(컨펌)</span>
              <b className="text-emerald-600 block text-xs mt-0.5">금형 도면 승인 완료 (Sign-off)</b>
              <span className="text-zinc-500 text-[10px]">수정사항 반영 확인 후 출도</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">몰드베이스 & 표준부품</span>
              <b className="text-zinc-800 dark:text-zinc-200 block text-xs mt-0.5">LKM 5050 표준 몰드베이스</b>
              <span className="text-zinc-500 text-[10px]">핫러너 시스템 사양 확정</span>
            </div>
          </div>
        );
        break;

      case 6:
        const md = project.moldData;
        stepContent = (
          <div className="flex flex-col gap-2.5 text-[11px]">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              <div className="p-2 rounded bg-white dark:bg-zinc-800 border text-center shadow-2xs">
                <span className="text-[10px] text-zinc-500 block">건드릴(냉각)</span>
                <b className="font-mono text-sky-600 text-xs">{md?.gunDrill ?? 100}%</b>
              </div>
              <div className="p-2 rounded bg-white dark:bg-zinc-800 border text-center shadow-2xs">
                <span className="text-[10px] text-zinc-500 block">밀링/황삭</span>
                <b className="font-mono text-sky-600 text-xs">{md?.milling ?? 100}%</b>
              </div>
              <div className="p-2 rounded bg-white dark:bg-zinc-800 border text-center shadow-2xs">
                <span className="text-[10px] text-zinc-500 block">열처리</span>
                <b className="font-mono text-sky-600 text-xs">{md?.heatTreatment ?? 100}%</b>
              </div>
              <div className="p-2 rounded bg-white dark:bg-zinc-800 border text-center shadow-2xs">
                <span className="text-[10px] text-zinc-500 block">CNC 정밀</span>
                <b className="font-mono text-sky-600 text-xs">{md?.cnc ?? 100}%</b>
              </div>
              <div className="p-2 rounded bg-white dark:bg-zinc-800 border text-center shadow-2xs">
                <span className="text-[10px] text-zinc-500 block">방전/와이어</span>
                <b className="font-mono text-sky-600 text-xs">{md?.edm ?? 100}%</b>
              </div>
              <div className="p-2 rounded bg-white dark:bg-zinc-800 border text-center shadow-2xs">
                <span className="text-[10px] text-zinc-500 block">래핑/사상</span>
                <b className="font-mono text-sky-600 text-xs">{md?.polishing ?? 100}%</b>
              </div>
              <div className="p-2 rounded bg-white dark:bg-zinc-800 border text-center shadow-2xs">
                <span className="text-[10px] text-zinc-500 block">금형조립</span>
                <b className="font-mono text-purple-600 text-xs">{md?.assembly ?? 100}%</b>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-100/70 dark:bg-zinc-800/50 border flex items-center justify-between text-[11px] flex-wrap gap-2">
              <div>
                가공 주관: <b className="text-purple-700 dark:text-purple-300">{project.moldVendor} 정밀가공동</b> | 강재: <b>{project.material || "NAK80"} 코어 가공 완료</b>
              </div>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                공정일정표(Weekly Schedule) 매주 정기 업데이트 정상 제출
              </span>
            </div>
          </div>
        );
        break;

      case 7:
        stepContent = (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-[11px]">
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">T1 시사출 일자</span>
              <b className="font-mono text-emerald-600 block text-xs mt-0.5">{project.actualT1Date || project.moldData?.t1Date || project.targetT1Date}</b>
              <span className="text-zinc-500 text-[10px]">목표일: {project.targetT1Date}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">시사출 성형 조건</span>
              <div className="text-zinc-700 dark:text-zinc-300 text-[10px] mt-1 space-y-0.5">
                <div>• 사출온도: <b>{project.moldData?.t1Temp ? `${project.moldData.t1Temp} ℃` : "-"}</b></div>
                <div>• 사출압력: <b>{project.moldData?.t1Pressure ? `${project.moldData.t1Pressure} bar` : "-"}</b></div>
                <div>• C/Time: <b>{project.moldData?.t1CycleTime ? `${project.moldData.t1CycleTime} 초` : "-"}</b></div>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">샘플 및 결과 보고서</span>
              <b className="text-zinc-800 dark:text-zinc-200 block text-xs mt-0.5">T1 샘플 확보</b>
              <span className="text-sky-600 text-[10px]">시사출 성형조건표 제출</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">시사출 장비 및 장소</span>
              <b className="text-purple-700 dark:text-purple-300 block text-xs mt-0.5">{project.moldVendor || "-"} 시험사출동</b>
              <span className="text-zinc-500 text-[10px]">사출기: {project.machineTon ? `${project.machineTon}T급 시험사출` : "-"}</span>
            </div>
          </div>
        );
        break;

      case 8:
        stepContent = (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-[11px]">
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">MPSI 담당자 현장 참관</span>
              <b className="text-sky-600 block text-xs mt-0.5">MPSI 품질보증팀장 입회 검수</b>
              <span className="text-zinc-500 text-[10px]">시사출 육안 및 작동성 검사 완료</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">제품 외관 판정 결과</span>
              <b className="text-emerald-600 block text-xs mt-0.5">외관 품질 검사</b>
              <span className="text-zinc-500 text-[10px]">표면 부식/광택도 고객사 기준 확인</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">CMM 3차원 정밀 측정</span>
              <b className="font-mono text-zinc-800 dark:text-zinc-200 block text-xs mt-0.5">3D 정밀 치수 검사</b>
              <span className="text-amber-600 text-[10px]">공차 분석 및 성적서 발행</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">품질 성적서 및 체크리스트</span>
              <b className="text-zinc-800 dark:text-zinc-200 block text-xs mt-0.5">3D 컬러맵 & CMM 성적서</b>
              <span className="text-zinc-500 text-[10px]">금형검사 체크리스트 관리</span>
            </div>
          </div>
        );
        break;

      case 9:
        stepContent = (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-[11px]">
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">현재 금형 육성 차수</span>
              <b className="text-sky-600 block text-xs mt-0.5">{project.trialDegree || "-"}</b>
              <span className="text-zinc-500 text-[10px]">시사출 차수 육성</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">금형 완성률</span>
              <b className="font-mono text-purple-700 dark:text-purple-300 block text-xs mt-0.5">{project.trialCompletionRate !== undefined ? `${project.trialCompletionRate}%` : "-"}</b>
              <span className="text-zinc-500 text-[10px]">가공 및 조립 진척률</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">수정 루프(Fail) 관리</span>
              <b className={isFailLoop ? "text-rose-600 block text-xs mt-0.5 font-bold animate-pulse" : "text-emerald-600 block text-xs mt-0.5"}>
                {isFailLoop ? "Fail (금형 수정 작업 진행 중)" : "육성 완료 및 승인 대기"}
              </b>
              <span className="text-zinc-500 text-[10px]">불합격 시 T(n+1) 차수 재진행</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">작성 완료 서류</span>
              <div className="text-zinc-700 dark:text-zinc-300 text-[10px] mt-1 space-y-0.5">
                <div>• 금형승인원 (초안)</div>
                <div>• 시사출 최종 보고서</div>
                <div>• 체크리스트 (120개 항목)</div>
              </div>
            </div>
          </div>
        );
        break;

      case 10:
        stepContent = (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-[11px]">
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">인계(금형) ➔ 인수(양산)</span>
              <div className="text-zinc-800 dark:text-zinc-200 mt-1 font-bold">
                <span className="text-purple-700">{project.moldVendor}</span> ➔ <span className="text-emerald-700">{project.massVendor}</span>
              </div>
              <span className="text-zinc-500 text-[10px]">MPSI 승인 날인 후 이관</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">6대 필수 이관 서류</span>
              <div className="text-zinc-700 dark:text-zinc-300 text-[10px] mt-1 space-y-0.5">
                <div>①금형승인원 ②CAE보고서 ③최종샘플</div>
                <div>④시사출보고서 ⑤제작사양서 ⑥체크리스트</div>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">금형 실물 및 쇼트 카운터</span>
              <b className="text-emerald-600 block text-xs mt-0.5">방청제 도포 및 리셋 완료</b>
              <span className="text-zinc-500 text-[10px]">카운터 장착: 0 Shot 리셋 인계</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">이관 승인 주체</span>
              <b className="text-zinc-800 dark:text-zinc-200 block text-xs mt-0.5">MPSI 총괄 개발팀 승인</b>
              <span className="text-zinc-500 text-[10px]">양산 협력사 인수증 접수 완료</span>
            </div>
          </div>
        );
        break;

      case 11:
        const mass = project.massData;
        stepContent = (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-[11px]">
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">시양산 연속 사출 검증</span>
              <b className="font-mono text-sky-600 block text-xs mt-0.5">{mass?.continuousHours ? `${mass.continuousHours}시간 연속 가동` : "-"}</b>
              <span className="text-zinc-500 text-[10px]">설비 안정성 및 금형 온도 검증</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">타수 및 생산 수량</span>
              <b className="font-mono text-zinc-800 dark:text-zinc-200 block text-xs mt-0.5">
                {mass?.shotCount ? `${mass.shotCount.toLocaleString()} Shot / ${(mass?.producedQty || 0).toLocaleString()} EA` : "-"}
              </b>
              <span className="text-zinc-500 text-[10px]">{mass?.defectQty !== undefined ? `불량: ${mass.defectQty} EA` : "-"}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">공정능력지수 (Cpk)</span>
              <b className="font-mono text-emerald-600 block text-xs mt-0.5">{mass?.cpk ? `Cpk ${mass.cpk}` : "-"}</b>
              <span className="text-zinc-500 text-[10px]">목표 1.33 이상 달성 (합격)</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">양산성 적합 판정</span>
              <b className="text-emerald-600 block text-xs mt-0.5">CT/CAPA 합격 (부적합 없음)</b>
              <span className="text-zinc-500 text-[10px]">사출처: {project.massVendor}</span>
            </div>
          </div>
        );
        break;

      case 12:
        stepContent = (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-[11px]">
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">PPAP 18대 서류 제출</span>
              <b className="text-emerald-600 block text-xs mt-0.5">{project.massData?.ppapStatus || "-"}</b>
              <span className="text-zinc-500 text-[10px]">양산 부품 승인 요청서(PSW) 승인</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">제출 품질 서류 목록</span>
              <div className="text-zinc-700 dark:text-zinc-300 text-[10px] mt-1 space-y-0.5">
                <div>• OQC 출하검사 성적서</div>
                <div>• CAPA 설비능력 분석 보고서</div>
                <div>• 마스터 샘플 고객사 제출</div>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">원청 고객사 품질 승인</span>
              <b className="text-zinc-800 dark:text-zinc-200 block text-xs mt-0.5">{project.customerName} 품질본부</b>
              <span className="text-emerald-600 text-[10px]">최종 양산승인서 날인 접수</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">검증 주체</span>
              <b className="text-zinc-800 dark:text-zinc-200 block text-xs mt-0.5">MPSI 품질총괄 & {project.massVendor}</b>
              <span className="text-zinc-500 text-[10px]">양산 라인 가동 컨펌 완료</span>
            </div>
          </div>
        );
        break;

      case 13:
        stepContent = (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-[11px]">
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">양산 시작일 / 목표일</span>
              <b className="font-mono text-zinc-800 dark:text-zinc-200 block text-xs mt-0.5">{project.massStartDate || project.targetMassDate || "-"}</b>
              <span className="text-zinc-500 text-[10px]">양산 라인 운영 상태</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">발주량 vs 납품 진척</span>
              <b className="font-mono text-emerald-600 block text-xs mt-0.5">
                {project.orderQty ? `${(project.deliveredQty || 0).toLocaleString()} / ${project.orderQty.toLocaleString()} EA` : "-"}
              </b>
              <span className="text-zinc-500 text-[10px]">{project.orderQty ? `납품 잔여: ${(project.orderQty - (project.deliveredQty || 0)).toLocaleString()} EA` : "-"}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">설비/금형 운영 이벤트</span>
              <b className="text-purple-700 dark:text-purple-300 block text-xs mt-0.5">{project.facilityEvent || "-"}</b>
              <span className="text-zinc-500 text-[10px]">정기 유지보수 및 PM 관제 연동</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border shadow-2xs">
              <span className="text-zinc-500 block text-[10px] font-bold">SCM 연계 관리</span>
              <b className="text-sky-600 block text-xs mt-0.5">SCM 양산발주/출하 메뉴 연동</b>
              <span className="text-zinc-500 text-[10px]">개발팀 PM, 설계변경, 양산지원</span>
            </div>
          </div>
        );
        break;

      default:
        break;
    }

    return (
      <div className="mt-3 p-4 rounded-xl border border-sky-300 dark:border-sky-800 bg-linear-to-r from-sky-50/80 via-indigo-50/40 to-slate-50 dark:from-zinc-900 dark:via-zinc-900/90 dark:to-zinc-800/80 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
        {/* 헤더 바 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-sky-200/80 dark:border-zinc-800 gap-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-sky-600 text-white font-mono font-bold text-xs shadow-2xs">
              Step {step}
            </span>
            <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>{stepDef.name}</span>
              <span className="text-zinc-500 font-normal text-xs">— 공정 상세 데이터</span>
            </h4>
            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[11px] border border-purple-200">
              담당: {dynamicActor}
            </span>
            {statusBadge}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => handleNavigateToStepPage(step, project.projectNo)}
              className="h-7 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <span>{stepDef.menuTitle} 실무 화면 직행</span>
              <ArrowRight className="h-3 w-3" />
            </button>
            <button
              onClick={() => setExpandedStep(null)}
              className="h-7 w-7 rounded-lg border bg-white dark:bg-zinc-800 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
              title="상세 닫기"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 1. 단계별 핵심 실적 & 지표 카드 영역 */}
        <div className="pt-3">
          {stepContent}
        </div>

        {/* 2. 공정 첨부파일 목록 & 실무 메모 섹션 */}
        <div className="mt-3 pt-3 border-t border-sky-200/60 dark:border-zinc-800">
          {detailMeta.attachments && detailMeta.attachments.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              {/* 첨부파일 리스트 (7열) */}
              <div className="lg:col-span-7 flex flex-col gap-2 p-3 rounded-lg bg-white dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700 shadow-2xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100 dark:border-zinc-700/60">
                  <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5 text-sky-600" />
                    <span>공정 첨부파일 ({detailMeta.attachments.length}건)</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setStepAttachModal({
                          open: true,
                          projectId: project.id,
                          step: step,
                          stepTitle: `Step ${step}: ${PROCESS_13_STEPS.find(s => s.step === step)?.name || '공정'}`,
                          uploadedFile: null,
                        });
                      }}
                      className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="첨부파일 신규 등록"
                    >
                      <Plus className="h-2.5 w-2.5" />
                      <span>파일 추가</span>
                    </button>
                    <span className="text-[10px] text-zinc-500 hidden sm:inline">미리보기/다운로드</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  {detailMeta.attachments.map((file, fIdx) => (
                    <div
                      key={fIdx}
                      className="flex items-center justify-between p-2 rounded-md bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-700 hover:border-sky-300 dark:hover:border-sky-700 hover:bg-sky-50/50 dark:hover:bg-zinc-800/80 transition-all text-[11px]"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 ${getFileBadgeClass(file.ext)}`}>
                          {file.ext.toUpperCase()}
                        </span>
                        <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate" title={file.name}>
                          {file.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-zinc-500">{file.size}</span>
                        <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline">{file.date}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (file.url) {
                              const a = document.createElement("a");
                              a.href = file.url;
                              a.download = file.name;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            } else {
                              const blob = new Blob([`[MPSI 공정 첨부파일: ${file.name}]\n프로젝트: ${project.projectNo}\n단계: Step ${step}\n일자: ${file.date}`], { type: "text/plain;charset=utf-8" });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = file.name;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              setTimeout(() => URL.revokeObjectURL(url), 2000);
                            }
                            showToast(`'${file.name}' 다운로드를 완료했습니다.`, "success");
                          }}
                          className="px-2 py-0.5 rounded bg-white dark:bg-zinc-800 hover:bg-sky-50 dark:hover:bg-zinc-700 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-zinc-600 font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                          title={`${file.name} 다운로드`}
                        >
                          <Download className="h-2.5 w-2.5" />
                          <span>다운로드</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`'${file.name}' 첨부파일을 삭제하시겠습니까?`)) {
                              deleteStepAttachment(project.id, step, file.name);
                              showToast(`'${file.name}' 파일이 삭제되었습니다.`, "info");
                            }
                          }}
                          className="p-1 rounded text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="첨부파일 삭제"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 공정 메모 / 특이사항 (5열) */}
              <div className="lg:col-span-5 flex flex-col gap-2 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 shadow-2xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/60 dark:border-amber-900/40">
                  <span className="font-bold text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                    <span>공정 실무 메모 & 특이사항</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStepMemoModal({
                        open: true,
                        projectId: project.id,
                        step: step,
                        stepTitle: `Step ${step}: ${PROCESS_13_STEPS.find(s => s.step === step)?.name || '공정'}`,
                        memo: detailMeta.memo || "",
                      });
                    }}
                    className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="실무 메모 수정"
                  >
                    <Edit3 className="h-2.5 w-2.5" />
                    <span>메모 수정</span>
                  </button>
                </div>

                <div className="p-2.5 rounded-md bg-white/90 dark:bg-zinc-900/80 border border-amber-200/60 dark:border-amber-900/30 text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                  {detailMeta.memo || "등록된 공정 실무 메모가 없습니다. [메모 수정]을 눌러 메모를 작성하세요."}
                </div>
              </div>
            </div>
          ) : (
            /* 첨부파일이 없는 현장 작업/가공/운영 단계: 실무 메모가 전체 너비(12열)로 깔끔하게 단독 표시 */
            <div className="flex flex-col gap-2 p-3.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 shadow-2xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/60 dark:border-amber-900/40">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                    <span>공정 실무 메모 & 특이사항</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 text-[10px] font-medium">
                    현장 실행/작업 공정 (별도 제출 첨부파일 없음)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setStepAttachModal({
                        open: true,
                        projectId: project.id,
                        step: step,
                        stepTitle: `Step ${step}: ${PROCESS_13_STEPS.find(s => s.step === step)?.name || '공정'}`,
                        uploadedFile: null,
                      });
                    }}
                    className="px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="첨부파일 신규 등록"
                  >
                    <Plus className="h-2.5 w-2.5" />
                    <span>파일 등록</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStepMemoModal({
                        open: true,
                        projectId: project.id,
                        step: step,
                        stepTitle: `Step ${step}: ${PROCESS_13_STEPS.find(s => s.step === step)?.name || '공정'}`,
                        memo: detailMeta.memo || "",
                      });
                    }}
                    className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="실무 메모 수정"
                  >
                    <Edit3 className="h-2.5 w-2.5" />
                    <span>메모 편집</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-md bg-white/90 dark:bg-zinc-900/80 border border-amber-200/60 dark:border-amber-900/30 text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                {detailMeta.memo || "등록된 공정 실무 메모가 없습니다. [메모 편집]을 눌러 메모를 작성하세요."}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const modalProjects = modalFilterOnly ? filteredProjects : projects;

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 0. 토스트 알림 */}
      {toastMessage && (
        <div className={`fixed top-4 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-lg shadow-xl border text-xs font-medium animate-in fade-in slide-in-from-top-3 ${
          toastMessage.type === "success" 
            ? "bg-emerald-600 text-white border-emerald-700 shadow-emerald-900/20"
            : toastMessage.type === "warning"
            ? "bg-amber-600 text-white border-amber-700 shadow-amber-900/20"
            : "bg-sky-700 text-white border-sky-800 shadow-sky-900/20"
        }`}>
          {toastMessage.type === "success" && <CheckCircle2 className="h-4 w-4" />}
          {toastMessage.type === "warning" && <AlertTriangle className="h-4 w-4" />}
          {toastMessage.type === "info" && <Sparkles className="h-4 w-4" />}
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-white/80 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* SCM 프로세스 공정 설명 배너 */}
      <div className="bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
        <div className="flex items-start gap-2.5">
          <Briefcase className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-sky-900 dark:text-sky-200 block text-xs">
              [프로젝트 마스터 총괄] 0단계(견적/수주)부터 금형개발·양산까지 0~13단계 통합 관제
            </span>
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
              금형제작(우성정공, 대한금형, 삼우정밀 or 자체제작)과 사출양산(뉴몰드, 세원사출, 제일프라 or 자체사출)의 생산방식을 유연하게 선택하고 공정 실적을 관제합니다.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
          <Button 
            onClick={() => handleOpenModal(undefined, "matrix")}
            className="h-7 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 shadow-sm"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            전체 0~13단계 파이프라인 매트릭스
          </Button>
        </div>
      </div>

      {/* 1. 상단 조회 조건 (기간별, 프로젝트별, 상태별, 외주업체별 즉시 조회) */}
      <div className="bg-white dark:bg-zinc-900 border rounded-lg p-3 shadow-xs flex flex-col gap-2.5">
        
        {/* [0열]: *견적/수주 관리 & *개발/양산 관리 탭 + 체크박스 분리 필터 (사용자 피드백 3 반영) */}
        <div className="flex flex-wrap items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800 gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-zinc-700 dark:text-zinc-300 text-xs shrink-0">구분 필터</span>
            
            {/* 원클릭 프리셋 버튼 탭 */}
            <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5 bg-zinc-100 dark:bg-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => { setIncludeQuote(true); setIncludeDev(true); }}
                className={`px-3 py-1 font-bold rounded-md transition-all flex items-center gap-1.5 ${
                  includeQuote && includeDev
                    ? "bg-white dark:bg-zinc-900 text-sky-800 dark:text-sky-300 shadow-xs border border-zinc-200 dark:border-zinc-700"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                }`}
              >
                <span>전체 보기</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono">
                  {projects.length}건
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setIncludeQuote(true); setIncludeDev(false); }}
                className={`px-3 py-1 font-bold rounded-md transition-all flex items-center gap-1.5 ${
                  includeQuote && !includeDev
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-amber-800 dark:text-amber-400 hover:bg-amber-100/60"
                }`}
              >
                <span>* 견적/수주 관리만</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  includeQuote && !includeDev ? "bg-black/20 text-white" : "bg-amber-100 text-amber-800"
                }`}>
                  {projects.filter(p => isQuoteItem(p)).length}건
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setIncludeQuote(false); setIncludeDev(true); }}
                className={`px-3 py-1 font-bold rounded-md transition-all flex items-center gap-1.5 ${
                  !includeQuote && includeDev
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-emerald-800 dark:text-emerald-400 hover:bg-emerald-100/60"
                }`}
              >
                <span>* 개발/양산 관리만</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  !includeQuote && includeDev ? "bg-black/20 text-white" : "bg-emerald-100 text-emerald-800"
                }`}>
                  {projects.filter(p => isDevItem(p)).length}건
                </span>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-zinc-500">
            {includeQuote && includeDev ? (
              <span className="text-zinc-600 dark:text-zinc-400 font-medium">
                전체 통합 표출: <b className="text-amber-700 dark:text-amber-400">견적/수주({projects.filter(p => isQuoteItem(p)).length}건)</b> + <b className="text-emerald-700 dark:text-emerald-400">개발/양산({projects.filter(p => isDevItem(p)).length}건)</b> 전체 표시
              </span>
            ) : includeQuote ? (
              <span className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1">
                📋 [견적/수주 관리] 표출 중: 고객 답변 대기 및 견적 검토({projects.filter(p => isQuoteItem(p)).length}건)
              </span>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                🚀 [개발/양산 관리] 표출 중: 수주 확정 13단계 실무 프로젝트({projects.filter(p => isDevItem(p)).length}건, 고객 답변 대기 제외)
              </span>
            )}
          </div>
        </div>

        {/* [1열]: 조회 기간 (전면 배치) + 프로젝트 키워드 검색 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
          <div className="lg:col-span-8 flex flex-wrap sm:flex-nowrap items-center gap-2">
            <div className="flex items-center gap-1.5 shrink-0">
              <Calendar className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <span className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">
                조회 기간
              </span>
            </div>

            {/* 기간 구분 드롭다운 (피드백 2 반영) */}
            <select
              value={filterDateType}
              onChange={(e) => setFilterDateType(e.target.value as any)}
              className="h-7 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-xs font-bold text-sky-700 dark:text-sky-300 shrink-0"
            >
              <option value="order">수주일</option>
              <option value="po">발주일</option>
              <option value="massStart">양산시작일</option>
              <option value="kickoff">금형 확정일 (킥오프)</option>
              <option value="t1">T1 시사출 목표일</option>
              <option value="mass">PPAP 양산승인 완료일</option>
              <option value="updated">최근 갱신일</option>
            </select>

            {/* 날짜 범위 인풋 */}
            <div className="flex items-center gap-1">
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => {
                  setFilterDateFrom(e.target.value);
                  setSelectedDatePreset("custom");
                }}
                className="h-7 w-[125px] text-xs font-mono bg-white dark:bg-zinc-900"
              />
              <span className="text-zinc-400 font-bold">~</span>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => {
                  setFilterDateTo(e.target.value);
                  setSelectedDatePreset("custom");
                }}
                className="h-7 w-[125px] text-xs font-mono bg-white dark:bg-zinc-900"
              />
            </div>

            {/* 퀵 프리셋 버튼 */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setDatePreset("today")}
                className={`px-2 py-0.5 rounded text-[11px] border font-medium transition-colors ${
                  selectedDatePreset === "today" 
                    ? "bg-sky-600 text-white border-sky-600 font-bold" 
                    : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700"
                }`}
              >
                오늘
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("thisMonth")}
                className={`px-2 py-0.5 rounded text-[11px] border font-medium transition-colors ${
                  selectedDatePreset === "thisMonth" 
                    ? "bg-sky-600 text-white border-sky-600 font-bold" 
                    : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700"
                }`}
              >
                이번달
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("recent3M")}
                className={`px-2 py-0.5 rounded text-[11px] border font-medium transition-colors ${
                  selectedDatePreset === "recent3M" 
                    ? "bg-sky-600 text-white border-sky-600 font-bold" 
                    : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700"
                }`}
              >
                최근3개월
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("year2026")}
                className={`px-2 py-0.5 rounded text-[11px] border font-medium transition-colors ${
                  selectedDatePreset === "year2026" 
                    ? "bg-sky-600 text-white border-sky-600 font-bold" 
                    : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700"
                }`}
              >
                2026연간
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("all")}
                className={`px-2 py-0.5 rounded text-[11px] border font-medium transition-colors ${
                  selectedDatePreset === "all" 
                    ? "bg-zinc-700 text-white border-zinc-700 font-bold" 
                    : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-500"
                }`}
              >
                전체
              </button>
            </div>
          </div>

          {/* 통합 검색창 */}
          <div className="lg:col-span-4 flex items-center gap-2">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium text-xs shrink-0">
              프로젝트 검색:
            </span>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <Input
                value={filterKeyword}
                onChange={(e) => setFilterKeyword(e.target.value)}
                placeholder="관리번호 / 차종명 / 제품명"
                className="h-7 pl-8 text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {/* [2열]: 공정구간, 진행상태, 고객사, 조회/초기화 버튼 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 items-center">
          <div className="md:col-span-3 flex items-center gap-1.5">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium text-[11px] shrink-0">공정구간:</span>
            <select
              value={filterStageGroup}
              onChange={(e) => setFilterStageGroup(e.target.value)}
              className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-medium"
            >
              <option value="ALL">전체 공정구간 (Step 0~13)</option>
              <option value="견적/수주">견적/수주 (Step 0)</option>
              <option value="도면/수주">도면/수주 (Step 1~4)</option>
              <option value="금형개발">금형개발 (Step 5~7)</option>
              <option value="시사출육성">시사출/육성 (Step 8~10)</option>
              <option value="사출양산">사출양산 (Step 11~13)</option>
            </select>
          </div>

          <div className="md:col-span-3 flex items-center gap-1.5">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium text-[11px] shrink-0">진행상태:</span>
            <select
              value={filterStepStatus}
              onChange={(e) => setFilterStepStatus(e.target.value)}
              className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-medium"
            >
              <option value="ALL">전체 상태</option>
              <option value="고객 답변 대기">⏳ 고객 답변 대기 (견적회신 대기)</option>
              <option value="수주 미성사">❌ 수주 미성사 (수주 실패)</option>
              <option value="진행중">정상 진행중 (Step 1~13)</option>
              <option value="지연주의">지연주의</option>
              <option value="Fail(수정중)">Fail (금형수정 중)</option>
              <option value="완료">완료 (양산/납품)</option>
            </select>
          </div>

          <div className="md:col-span-3 flex items-center gap-1.5">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium text-[11px] shrink-0">원청사:</span>
            <select
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-medium"
            >
              <option value="ALL">전체 원청사</option>
              {availableCustomerOptions.map((cust) => (
                <option key={cust} value={cust}>{cust}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 flex items-center gap-1.5 justify-end">
            <Button
              onClick={() => {
                showToast(`조회 완료: 조건에 일치하는 프로젝트 ${filteredProjects.length}건이 검색되었습니다.`, "info");
              }}
              className="h-7 px-3 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold gap-1 shadow-xs"
            >
              <Search className="h-3.5 w-3.5" />
              조회
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              className="h-7 px-2.5 gap-1 text-xs text-zinc-600"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              초기화
            </Button>
            <Button
              onClick={() => setIsAdvancedSearchOpen(!isAdvancedSearchOpen)}
              variant="outline"
              className={`h-7 px-2 text-xs gap-1 font-medium ${
                isAdvancedSearchOpen || (filterMoldVendor !== "ALL" || filterMassVendor !== "ALL")
                  ? "border-sky-500 text-sky-600 bg-sky-50/50"
                  : "text-zinc-600"
              }`}
              title="추가 조건 (금형제작처, 양산처, 세부단계 필터)"
            >
              <Filter className="h-3 w-3" />
              {isAdvancedSearchOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {/* [3열]: 상세 조건 펼침 패널 (금형제작처 필터, 사출양산처 필터 등) */}
        {isAdvancedSearchOpen && (
          <div className="pt-2.5 border-t border-dashed border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 bg-zinc-50/70 dark:bg-zinc-800/40 p-2.5 rounded-lg text-xs">
            {/* 금형제작처 필터 */}
            <div className="md:col-span-3 flex items-center gap-1.5">
              <span className="font-bold text-zinc-700 dark:text-zinc-200 shrink-0">금형제작처:</span>
              <select
                value={filterMoldVendor}
                onChange={(e) => setFilterMoldVendor(e.target.value)}
                className="h-7 flex-1 rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-medium text-purple-700"
              >
                <option value="ALL">전체 금형처 (외주/자체)</option>
                <option value="MPSI 자체제작팀">[자체] MPSI 자체제작팀</option>
                {moldVendorOptions.map((v) => (
                  <option key={v.id} value={v.name}>
                    [외주] {v.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 사출양산처 필터 */}
            <div className="md:col-span-3 flex items-center gap-1.5">
              <span className="font-bold text-zinc-700 dark:text-zinc-200 shrink-0">사출양산처:</span>
              <select
                value={filterMassVendor}
                onChange={(e) => setFilterMassVendor(e.target.value)}
                className="h-7 flex-1 rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-medium text-emerald-700"
              >
                <option value="ALL">전체 양산처 (외주/자체)</option>
                <option value="MPSI 자체사출라인">[자체] MPSI 자체사출라인</option>
                {massVendorOptions.map((v) => (
                  <option key={v.id} value={v.name}>
                    [외주] {v.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 특정 프로젝트 지정 */}
            <div className="md:col-span-3 flex items-center gap-1.5">
              <span className="font-bold text-zinc-700 dark:text-zinc-200 shrink-0">PJT 지정:</span>
              <select
                value={filterSpecificProjectNo}
                onChange={(e) => setFilterSpecificProjectNo(e.target.value)}
                className="h-7 flex-1 rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-mono font-medium"
              >
                <option value="ALL">전체 프로젝트</option>
                {Array.from(new Set(projects.map((p) => p.projectNo))).map((pNo) => {
                  const p = projects.find((item) => item.projectNo === pNo);
                  const pNoDisplay = pNo?.toUpperCase().startsWith("M")
                    ? pNo
                    : pNo?.toUpperCase().replace(/^Q/, "MI").replace(/-0?(\d+)/, "P$1");
                  return (
                    <option key={pNo} value={pNo}>
                      {pNoDisplay} ({p?.projectName.slice(0, 10) || ""})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 세부 스텝 필터 */}
            <div className="md:col-span-3 flex items-center gap-1.5">
              <span className="font-bold text-zinc-700 dark:text-zinc-200 shrink-0">세부 Step:</span>
              <select
                value={filterSpecificStep}
                onChange={(e) => setFilterSpecificStep(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
                className="h-7 flex-1 rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-medium"
              >
                <option value="ALL">전체 단계 (0~13)</option>
                {PROCESS_13_STEPS.map((s) => (
                  <option key={s.step} value={s.step}>
                    Step {s.step}: {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 2. 메인 프로젝트 현황 대장 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs overflow-hidden flex flex-col min-h-[480px]">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b">
          <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-100">
            <Briefcase className="h-4 w-4 text-sky-600" />
            <span>2. 프로젝트 현황</span> 
            <span className="text-[11px] font-normal text-zinc-500 ml-1">
              (조회 결과: <b className="text-sky-600 font-mono">{filteredProjects.length}</b>건 / 전체 {projects.length}건)
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Button 
              onClick={() => handleOpenModal(undefined, "matrix")} 
              size="xs" 
              variant="outline" 
              className="h-6 px-2.5 border-zinc-200 hover:bg-zinc-100 text-zinc-700 dark:text-zinc-200 gap-1 text-[10px] font-bold bg-white dark:bg-zinc-800"
            >
              <LayoutGrid className="h-3 w-3 text-indigo-600" />
              0~13단계 매트릭스
            </Button>
            <Button onClick={handleOpenNewProjectModal} size="xs" className="h-6 px-2.5 bg-sky-600 hover:bg-sky-700 text-white gap-1 text-[10px] font-bold">
              <Plus className="h-3 w-3" />
              신규 프로젝트 등록
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1 border border-slate-700/60 rounded-lg bg-white dark:bg-zinc-900 shadow-sm">
          <table className="w-full border-collapse text-left border-spacing-0 whitespace-nowrap">
            {/* 스크린샷과 동일한 짙은 네이비 톤 프리미엄 헤더 */}
            <thead className="sticky top-0 bg-[#1e293b] text-white text-[11px] font-bold z-10 border-b border-slate-700">
              <tr>
                <th className="py-2.5 px-2 w-10 text-center border-r border-slate-700">No</th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[110px] text-center">프로젝트 번호</th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[95px] text-center text-indigo-300">견적번호</th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[75px] text-center text-amber-300">신작/설변</th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[85px] text-center">고객사</th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[95px] text-center">프로젝트명</th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[140px] text-center">제품명</th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[70px] text-center">품 번</th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[100px] text-center">금형번호</th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[75px] text-center text-purple-300">금형차수</th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[75px] text-center">캐비티사양</th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[100px] text-center">금형 제작처</th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[100px] text-center">사출 양산처</th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[110px] text-center">현재 스텝</th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[95px] text-center">킥오프</th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[95px] text-center text-emerald-300">목표 T1</th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[100px] text-center text-purple-300">금형 출고 납기</th>
                <th className="py-2.5 px-2 border-r border-slate-700 min-w-[100px] text-center text-amber-300">목표 양산승인</th>
                <th className="py-2.5 px-2 min-w-[170px] text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 text-zinc-800 dark:text-zinc-200 text-[11px]">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={19} className="p-8 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Calendar className="h-8 w-8 text-zinc-300" />
                      <span>설정하신 조건에 해당하는 프로젝트가 없습니다.</span>
                      <Button onClick={handleReset} variant="outline" size="xs" className="mt-1">
                        조회 조건 초기화
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((row, idx) => {
                  const currentStepObj = PROCESS_13_STEPS.find((s) => s.step === row.currentStep);
                  
                  // 스텝 표시 명칭 결정 (수주 확정되어 currentStep > 0 진행 중인 프로젝트는 실제 공정 스텝 표시)
                  const isProjectInProcess = row.currentStep > 0 && !row.projectNo.startsWith("Q");
                  const isEChange = Boolean(row.changeType?.startsWith("E"));
                  const isConfirmed = row.isContractConfirmed || row.quotationStatus === "수주확정" || row.estimateNo === "수주확정" || row.stepNameCustom === "수주확정";
                  const isFailedQuote = (row.quotationStatus === "수주 미성사" || row.stepNameCustom === "수주 미성사") && !isProjectInProcess;
                  const isWaitCustomer = !isProjectInProcess && !isEChange && !isConfirmed && (row.quotationStatus === "고객 답변 대기" || row.stepNameCustom === "고객 답변 대기" || (row.isQuotePending && row.projectNo.startsWith("Q") && row.quotationStatus !== "수주 미성사" && row.stepNameCustom !== "수주 미성사") || row.currentStep === 0);

                  let stepDisplayName = "";
                  if (row.isPromotedFromQuote && !row.isRegistrationCompleted) {
                    // 승격 건은 등록 전까지 기본 입력(고객 답변 대기 등)을 노출하지 않음
                    stepDisplayName = "";
                  } else if (isProjectInProcess) {
                    stepDisplayName = (row.stepNameCustom && row.stepNameCustom !== "고객 답변 대기" && row.stepNameCustom !== "수주 미성사")
                      ? row.stepNameCustom
                      : (currentStepObj?.name || `Step ${row.currentStep}`);
                  } else if (isFailedQuote) {
                    stepDisplayName = "수주 미성사";
                  } else if (isEChange || isConfirmed) {
                    stepDisplayName = "수주확정";
                  } else if (isWaitCustomer) {
                    stepDisplayName = "고객 답변 대기";
                  } else {
                    stepDisplayName = "";
                  }

                  // 상태 뱃지 스타일 (스크린샷 알약 형태)
                  const getStepPillClass = () => {
                    if (stepDisplayName === "수주확정") {
                      return "bg-emerald-50 text-emerald-800 border-emerald-400 font-extrabold shadow-2xs dark:bg-emerald-950/40 dark:text-emerald-300";
                    }
                    if (stepDisplayName === "고객 답변 대기") {
                      return "bg-sky-50 text-sky-800 border-sky-400 font-extrabold shadow-2xs dark:bg-sky-950/40 dark:text-sky-300";
                    }
                    if (stepDisplayName === "수주 미성사") {
                      return "bg-rose-50 text-rose-700 border-rose-400 font-extrabold shadow-2xs dark:bg-rose-950/40 dark:text-rose-300";
                    }
                    if (row.currentStep === 0 || stepDisplayName.includes("견적")) {
                      return "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 font-bold";
                    }
                    if (stepDisplayName.includes("양산") || row.currentStep === 13) {
                      return "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300";
                    }
                    if (stepDisplayName.includes("시양산") || row.currentStep === 11) {
                      return "bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300";
                    }
                    if (stepDisplayName.includes("금형육성") || row.stepStatus === "Fail(수정중)") {
                      return "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300";
                    }
                    return "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300";
                  };

                  // 같은 프로젝트 번호를 가진 행 개수 확인 (설변, 금형차수 공유 여부)
                  const siblingCount = projects.filter(p => p.projectNo === row.projectNo).length;

                  return (
                    <tr 
                      key={`${row.id}-${row.projectNo}`} 
                      className="odd:bg-white even:bg-slate-50/60 dark:odd:bg-zinc-900 dark:even:bg-zinc-800/40 hover:bg-sky-50/70 dark:hover:bg-zinc-800 transition-colors"
                    >
                      {/* 1. No */}
                      <td className="p-2 text-center font-mono text-zinc-400 border-r border-slate-200 dark:border-zinc-800">{idx + 1}</td>
                      
                      {/* 2. 프로젝트 번호 (항상 M으로 시작) */}
                      <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono">
                        <button 
                          onClick={() => handleOpenModal(row, "detail")} 
                          className="font-bold text-sky-600 hover:text-sky-800 hover:underline flex items-center justify-center gap-1 mx-auto"
                          title="클릭 시 프로젝트 상세 공정 확인"
                        >
                          <span>
                            {row.projectNo?.toUpperCase().startsWith("M")
                              ? row.projectNo
                              : row.projectNo?.toUpperCase().replace(/^Q/, "MI").replace(/-0?(\d+)/, "P$1")}
                          </span>
                          <ExternalLink className="h-3 w-3 text-sky-400" />
                        </button>
                      </td>

                      {/* 2-1. 견적번호 (수주확정 시 "수주확정" 상태값 표기, 견적 단계 시 순수 텍스트 표기) */}
                      <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono">
                        {(row.isContractConfirmed || row.quotationStatus === "수주확정" || row.estimateNo === "수주확정") ? (
                          <span 
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-2xs"
                            title={row.estimateNo ? `견적번호: ${row.estimateNo} (수주확정 완료)` : "수주확정 완료"}
                          >
                            <Check className="h-3 w-3 text-emerald-600" />
                            수주확정
                          </span>
                        ) : row.estimateNo ? (
                          <span className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300 font-medium">
                            {row.estimateNo}
                          </span>
                        ) : (
                          <span className="text-zinc-400 font-mono text-[10px]">-</span>
                        )}
                      </td>

                      {/* 2-2. 신작/설변 (N001, E001) - 단순 상태 뱃지 표기 (클릭 모달 제거) */}
                      <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold border shadow-2xs ${
                            row.changeType?.startsWith("E")
                              ? "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300"
                              : "bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300"
                          }`}
                        >
                          {row.changeType || "N001"}
                        </span>
                      </td>

                      {/* 3. 고객사 */}
                      <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-bold text-zinc-800 dark:text-zinc-200">
                        {row.customerName}
                      </td>

                      {/* 4. 프로젝트명 */}
                      <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-medium text-zinc-700 dark:text-zinc-300">
                        {row.projectName}
                      </td>

                      {/* 5. 제품명 (품명) */}
                      <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-left pl-3 font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[160px]" title={row.productName}>
                        <span 
                          onClick={() => handleOpenModal(row, "detail")}
                          className="hover:underline cursor-pointer"
                        >
                          {row.productName}
                        </span>
                      </td>

                      {/* 6. 품 번 */}
                      <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-right pr-3 font-mono text-zinc-600 dark:text-zinc-400">
                        {row.partNo || "-"}
                      </td>

                      {/* 7. 금형번호 */}
                      <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono text-zinc-700 dark:text-zinc-300">
                        {row.moldNo || "-"}
                      </td>

                      {/* 7-1. 금형차수 (M1, M2) */}
                      <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono">
                        {row.moldDegree ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">
                            {row.moldDegree}
                          </span>
                        ) : (
                          <span className="text-zinc-400 font-mono text-[10px]">-</span>
                        )}
                      </td>

                      {/* 8. 캐비티사양 */}
                      <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono text-zinc-700 dark:text-zinc-300">
                        {row.cavity || "-"}
                      </td>

                      {/* 9. 금형 제작처 (스크린샷 사각 테두리 뱃지 스타일) */}
                      <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center">
                        {row.moldVendor && row.moldVendor !== "N/A" ? (
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border border-purple-200 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                            {row.moldVendor}
                          </span>
                        ) : (
                          <span className="text-zinc-400 font-mono text-[10px]">-</span>
                        )}
                      </td>

                      {/* 10. 사출 양산처 (스크린샷 연녹색 사각 테두리 뱃지 스타일) */}
                      <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center">
                        {row.massVendor && row.massVendor !== "N/A" ? (
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold">
                            {row.massVendor}
                          </span>
                        ) : (
                          <span className="text-zinc-400 font-mono text-[10px]">-</span>
                        )}
                      </td>

                      {/* 11. 현재 스텝 (고객 답변 대기 / 수주 미성사 / 공정 진행 - 수정 없는 순수 조회용) */}
                      <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center">
                        <div className="flex items-center justify-center">
                          {stepDisplayName ? (
                            row.currentStep === 0 || row.isQuotePending || row.projectNo.startsWith("Q") ? (
                              <button
                                type="button"
                                onClick={() => router.push(`/portal/quotation?projectNo=${encodeURIComponent(row.projectNo)}`)}
                                className="hover:opacity-85 transition-opacity"
                                title={`클릭 시 [원청사 견적관리] 화면으로 이동`}
                              >
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs ${getStepPillClass()}`}>
                                  {stepDisplayName}
                                </span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleNavigateToStepPage(row.currentStep, row.projectNo)}
                                className="hover:opacity-85 transition-opacity"
                                title={`클릭 시 [Step ${row.currentStep}: ${stepDisplayName}] 실무 화면으로 이동`}
                              >
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStepPillClass()}`}>
                                  {stepDisplayName}
                                </span>
                              </button>
                            )
                          ) : (
                            <span className="text-zinc-400 font-mono text-[10px]">-</span>
                          )}
                        </div>
                      </td>

                      {/* 13. 킥오프 */}
                      <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono text-zinc-600 dark:text-zinc-400">
                        {row.isPromotedFromQuote && !row.isRegistrationCompleted ? "" : (row.kickoffDate || row.orderDate || "")}
                      </td>

                      {/* 14. 목표 T1 */}
                      <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {row.targetT1Date || ""}
                      </td>

                      {/* 금형 출고 납기 */}
                      <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono font-bold text-purple-700 dark:text-purple-400">
                        {row.moldDeliveryDate || ""}
                      </td>

                      {/* 15. 목표 양산승인 */}
                      <td className="p-2 border-r border-slate-200 dark:border-zinc-800 text-center font-mono font-bold text-amber-700 dark:text-amber-400">
                        {row.targetMassDate || ""}
                      </td>

                      {/* 16. 상세 모달 열기 및 수정/삭제 버튼 */}
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* 6. 프로젝트 승격 건에 대한 등록 버튼 (등록 완료 시 비활성화) */}
                          {row.isPromotedFromQuote ? (
                            row.isRegistrationCompleted ? (
                              <Button 
                                size="xs" 
                                disabled
                                className="h-6 px-1.5 text-[10px] rounded-md font-bold gap-1 bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed shadow-2xs"
                                title="생산 및 외주업체 등록 완료"
                              >
                                <Check className="h-3 w-3 text-zinc-400" />
                                등록완료
                              </Button>
                            ) : (
                              <Button 
                                onClick={() => handleOpenPromotedRegisterModal(row)} 
                                size="xs" 
                                className="h-6 px-2 text-[10px] rounded-md font-bold gap-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs animate-pulse"
                                title="승격된 프로젝트의 생산방식 및 외주 협력사 등록"
                              >
                                <Sparkles className="h-3 w-3" />
                                등록
                              </Button>
                            )
                          ) : null}

                          <Button 
                            onClick={() => handleOpenModal(row, "detail")} 
                            size="xs" 
                            variant="outline" 
                            className="h-6 px-1.5 text-[10px] rounded-md font-bold gap-1 bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-2xs"
                            title="상세 공정 모달 열기"
                          >
                            <Eye className="h-3 w-3 text-slate-500" />
                            처리/검수
                          </Button>
                          <Button 
                            onClick={() => handleOpenEditModal(row)} 
                            size="xs" 
                            variant="outline" 
                            className="h-6 px-1.5 text-[10px] rounded-md font-bold gap-1 bg-white hover:bg-amber-50 border-amber-300 text-amber-700 shadow-2xs"
                            title="프로젝트 기본정보 수정"
                          >
                            <Edit3 className="h-3 w-3 text-amber-600" />
                            수정
                          </Button>
                          <Button
                            onClick={() => handleDeleteProject(row)}
                            size="xs"
                            variant="outline"
                            className="h-6 px-1.5 text-[10px] rounded-md font-bold gap-0.5 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 shadow-2xs"
                            title="프로젝트 삭제"
                          >
                            <Trash2 className="h-3 w-3" />
                            삭제
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
      </div>

      {/* 3. [재구성된 핵심 모달] 0~13단계 프로세스 종합 관제 팝업 (동적 담당처 반영) */}
      {isDiagramModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-[95vw] 2xl:max-w-[1580px] rounded-xl shadow-2xl border overflow-hidden flex flex-col max-h-[94vh]">
            
            {/* 모달 상단 헤더 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 bg-[#1e293b] text-white border-b border-slate-700 gap-3">
              <div className="flex items-center gap-2.5">
                <Layers className="h-5 w-5 text-sky-400" />
                <div>
                  <h3 className="font-bold text-sm">
                    금형/사출 0~13단계 공정 총괄 관제 (외주업체 및 자체생산 통합 관제)
                  </h3>
                  <span className="text-[11px] text-slate-300">
                    원청 수주 ➔ 도면 CAE/DR ➔ 금형제작(외주/자체) ➔ 시사출 ➔ 사출양산 및 납품(외주/자체)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                  <button
                    onClick={() => setModalActiveTab("matrix")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      modalActiveTab === "matrix"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>전체 프로젝트 매트릭스</span>
                  </button>
                  <button
                    onClick={() => setModalActiveTab("detail")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                      modalActiveTab === "detail"
                        ? "bg-sky-600 text-white shadow-xs"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    <ListTree className="h-3.5 w-3.5" />
                    <span>프로젝트 상세 공정</span>
                  </button>
                </div>

                <button onClick={() => setIsDiagramModalOpen(false)} className="text-zinc-400 hover:text-white ml-2">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* 모달 본문 */}
            <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs bg-zinc-50/50 dark:bg-zinc-900/40">

              {/* TAB 1: 전체 프로젝트 0~13단계 파이프라인 매트릭스 */}
              {modalActiveTab === "matrix" && (
                <div className="flex flex-col gap-4">
                  {/* 상단 요약 통계 */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <div className="p-3 rounded-lg border bg-blue-50/80 border-blue-200 dark:bg-blue-950/30">
                      <span className="text-[11px] text-blue-800 dark:text-blue-300 font-bold block mb-1">
                        0. 견적/수주 (Step 0)
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-600">견적 검토/제출</span>
                        <b className="text-base font-mono text-blue-700">{summaryByGroup.group0}건</b>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border bg-sky-50/80 border-sky-200 dark:bg-sky-950/30">
                      <span className="text-[11px] text-sky-800 dark:text-sky-300 font-bold block mb-1">
                        1. 도면/수주 (Step 1~4)
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-600">CAE 및 도면검토</span>
                        <b className="text-base font-mono text-sky-700">{summaryByGroup.group1}건</b>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border bg-purple-50/80 border-purple-200 dark:bg-purple-950/30">
                      <span className="text-[11px] text-purple-800 dark:text-purple-300 font-bold block mb-1">
                        2. 금형개발 (Step 5~7)
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-600">외주/자체 가공 진척</span>
                        <b className="text-base font-mono text-purple-700">{summaryByGroup.group2}건</b>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border bg-amber-50/80 border-amber-200 dark:bg-amber-950/30">
                      <span className="text-[11px] text-amber-800 dark:text-amber-300 font-bold block mb-1">
                        3. 시사출/육성 (Step 8~10)
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-600">T1 및 치수검사</span>
                        <div className="flex items-center gap-1.5">
                          <b className="text-base font-mono text-amber-700">{summaryByGroup.group3}건</b>
                          {summaryByGroup.failCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-600 text-white font-bold animate-pulse">
                              Fail {summaryByGroup.failCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg border bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30">
                      <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold block mb-1">
                        4. 사출양산 (Step 11~13)
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-600">외주/자체 양산납품</span>
                        <b className="text-base font-mono text-emerald-700">{summaryByGroup.group4}건</b>
                      </div>
                    </div>
                  </div>

                  {/* 전체 프로젝트 0~13단계 파이프라인 매트릭스 그리드 */}
                  <div className="border rounded-xl bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
                    <div className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 border-b flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-200">
                        <LayoutGrid className="h-4 w-4 text-indigo-600" />
                        <span>전체 프로젝트 0~13단계 진행 매트릭스 (Pipeline Matrix)</span>
                      </div>
                      <span className="text-[11px] text-zinc-500">
                        * 단계 셀을 클릭하면 <b className="text-sky-600">해당 업무의 상세 실무 화면으로 바로 이동</b>합니다.
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left border-spacing-0 whitespace-nowrap text-[11px]">
                        <thead>
                          <tr className="bg-slate-800 text-white text-[10px] text-center font-bold">
                            <th colSpan={4} className="p-1.5 border-r border-slate-700 text-left pl-3">
                              프로젝트 및 협력사(외주/자체) 정보
                            </th>
                            <th colSpan={1} className="p-1.5 border-r border-slate-700 bg-blue-900/90">
                              Phase 0: 견적/수주 (Step 0)
                            </th>
                            <th colSpan={4} className="p-1.5 border-r border-slate-700 bg-sky-900/80">
                              Phase 1: 도면/수주 (Step 1~4)
                            </th>
                            <th colSpan={3} className="p-1.5 border-r border-slate-700 bg-purple-900/80">
                              Phase 2: 금형개발 (Step 5~7)
                            </th>
                            <th colSpan={3} className="p-1.5 border-r border-slate-700 bg-amber-900/80">
                              Phase 3: 시사출/육성 (Step 8~10)
                            </th>
                            <th colSpan={3} className="p-1.5 bg-emerald-900/80">
                              Phase 4: 사출양산 (Step 11~13)
                            </th>
                          </tr>

                          <tr className="bg-slate-700 text-slate-200 text-[10px] text-center border-b border-slate-600">
                            <th className="p-1.5 border-r border-slate-600 w-24 text-left pl-3">관리번호</th>
                            <th className="p-1.5 border-r border-slate-600 w-32 text-left">제품명</th>
                            <th className="p-1.5 border-r border-slate-600 w-24 text-left">금형제작처</th>
                            <th className="p-1.5 border-r border-slate-600 w-24 text-left">사출양산처</th>

                            {PROCESS_13_STEPS.map((s) => (
                              <th 
                                key={s.step} 
                                className="p-1.5 border-r border-slate-600 min-w-[55px] font-mono cursor-pointer hover:bg-slate-600 transition-colors"
                                title={`Step ${s.step}: ${s.name}\n연결화면: ${s.menuTitle}`}
                                onClick={() => handleNavigateToStepPage(s.step)}
                              >
                                <div>S{s.step}</div>
                                <div className="text-[9px] text-slate-300 font-normal truncate max-w-[55px]">
                                  {s.name.slice(0, 4)}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                          {modalProjects.map((p) => {
                            const isSelected = selectedItem?.projectNo === p.projectNo;

                            return (
                              <tr 
                                key={`${p.id}-${p.projectNo}`} 
                                className={`transition-colors ${
                                  isSelected ? "bg-sky-50 dark:bg-sky-950/40" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                }`}
                              >
                                <td className="p-2 border-r font-mono font-bold text-sky-600 pl-3">
                                  <button 
                                    onClick={() => { setSelectedItem(p); setModalActiveTab("detail"); }}
                                    className="hover:underline flex items-center gap-1"
                                    title="상세 보기로 전환"
                                  >
                                    <span>{p.projectNo}</span>
                                  </button>
                                </td>
                                <td className="p-2 border-r font-medium text-zinc-800 dark:text-zinc-200 truncate max-w-[130px]" title={p.productName}>
                                  {p.productName}
                                </td>
                                <td className="p-2 border-r text-purple-700 font-bold truncate max-w-[95px]" title={p.moldVendor}>
                                  {p.moldVendor}
                                </td>
                                <td className="p-2 border-r text-emerald-700 font-bold truncate max-w-[95px]" title={p.massVendor}>
                                  {p.massVendor}
                                </td>

                                {/* 13단계 매트릭스 셀 */}
                                {PROCESS_13_STEPS.map((s) => {
                                  const isCurrent = s.step === p.currentStep;
                                  const isCompleted = s.step < p.currentStep;
                                  const isFail = isCurrent && p.stepStatus === "Fail(수정중)";
                                  const isWarning = isCurrent && p.stepStatus === "지연주의";
                                  const stepActor = getStepActor(s.step, p);

                                  return (
                                    <td 
                                      key={s.step} 
                                      onClick={() => handleNavigateToStepPage(s.step, p.projectNo)}
                                      className={`p-1.5 border-r text-center cursor-pointer transition-all hover:scale-105 select-none ${
                                        isFail 
                                          ? "bg-rose-500 text-white font-bold shadow-xs animate-pulse ring-2 ring-rose-300"
                                          : isWarning
                                          ? "bg-amber-500 text-white font-bold"
                                          : isCurrent
                                          ? "bg-sky-600 text-white font-bold shadow-xs ring-2 ring-sky-300"
                                          : isCompleted
                                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100"
                                          : "bg-zinc-50 text-zinc-300 dark:bg-zinc-800/30 dark:text-zinc-600 hover:bg-zinc-100"
                                      }`}
                                      title={`[${p.projectNo}] Step ${s.step}: ${s.name}\n담당: ${stepActor}\n상태: ${
                                        isFail ? "Fail(수정중)" : isCurrent ? "현재 진행중" : isCompleted ? "완료됨" : "대기"
                                      }\n클릭 시 상세 실무 화면으로 이동합니다.`}
                                    >
                                      {isCompleted ? (
                                        <div className="flex items-center justify-center">
                                          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                      ) : isFail ? (
                                        <div className="text-[10px] font-bold">Fail</div>
                                      ) : isWarning ? (
                                        <div className="text-[10px] font-bold">지연</div>
                                      ) : isCurrent ? (
                                        <div className="text-[10px] font-bold">S{s.step}</div>
                                      ) : (
                                        <div className="text-[10px] opacity-40">·</div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: 개별 프로젝트 상세 13단계 심층 추적 */}
              {modalActiveTab === "detail" && selectedItem && (
                <div className="flex flex-col gap-4">
                  {/* 프로젝트 전환 드롭다운 (2줄 레이아웃으로 UI 깨짐 방지) */}
                  <div className="flex flex-col gap-2.5 bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-lg border">
                    {/* 1줄: 대상 프로젝트 선택 (넓은 너비 확보) */}
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 font-medium shrink-0">대상 프로젝트:</span>
                      <select 
                        value={selectedItem.id}
                        onChange={(e) => {
                          const targetId = Number(e.target.value);
                          const found = projects.find((p) => p.id === targetId);
                          if (found) setSelectedItem(found);
                        }}
                        className="flex-1 min-w-0 h-7 rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-mono font-bold text-sky-600"
                      >
                        {projects.map((p) => (
                          <option key={`${p.id}-${p.projectNo}`} value={p.id}>
                            [{p.projectNo}] {p.projectName} - {p.productName} ({p.customerName}){p.changeType ? ` [${p.changeType}]` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2줄: 현재 상태 및 설계변경 발의 컨트롤 */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-zinc-600 dark:text-zinc-400 text-xs font-bold shrink-0">현재 상태:</span>
                        {selectedItem.currentStep === 0 || selectedItem.isQuotePending || selectedItem.projectNo.startsWith("Q") ? (
                          <div className="flex items-center gap-2">
                            <span className={`h-7 px-3 rounded-full text-xs font-bold border flex items-center shadow-2xs ${
                              selectedItem.quotationStatus === "수주 미성사" || selectedItem.stepNameCustom === "수주 미성사"
                                ? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300"
                                : (selectedItem.changeType?.startsWith("E") || selectedItem.quotationStatus === "수주확정" || selectedItem.estimateNo === "수주확정" || selectedItem.stepNameCustom === "수주확정")
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  : "bg-sky-50 text-sky-800 border-sky-400 dark:bg-sky-950/40 dark:text-sky-300"
                            }`}>
                              {selectedItem.quotationStatus === "수주 미성사" || selectedItem.stepNameCustom === "수주 미성사" 
                                ? "❌ 수주 미성사" 
                                : (selectedItem.changeType?.startsWith("E") || selectedItem.quotationStatus === "수주확정" || selectedItem.estimateNo === "수주확정" || selectedItem.stepNameCustom === "수주확정")
                                  ? "✅ 수주확정"
                                  : "⏳ 고객 답변 대기"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-1 rounded-md text-xs font-bold border bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-200">
                              Step {selectedItem.currentStep} : {PROCESS_13_STEPS.find((s) => s.step === selectedItem.currentStep)?.name || "공정 진행"}
                            </span>
                            {selectedItem.estimateNo && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsDiagramModalOpen(false);
                                  router.push(`/portal/quotation?search=${selectedItem.estimateNo}`);
                                }}
                                className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors flex items-center gap-1 font-mono cursor-pointer shadow-2xs"
                                title="원 견적서 및 제출파일 이력 확인 (원청사 견적 관리 대장으로 이동)"
                              >
                                <FileText className="h-3.5 w-3.5 text-indigo-600" />
                                <span>원 견적번호: {selectedItem.estimateNo}</span>
                                <ExternalLink className="h-3 w-3 ml-0.5 text-indigo-500" />
                              </button>
                            )}
                          </div>
                        )}

                        {/* 신작/설변 뱃지 */}
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-extrabold font-mono border shadow-2xs ${
                            selectedItem.changeType?.startsWith("E")
                              ? "bg-purple-100 text-purple-800 border-purple-300"
                              : "bg-sky-100 text-sky-800 border-sky-300"
                          }`}
                        >
                          {selectedItem.changeType || "N001"}
                        </span>

                        {/* 금형차수 뱃지 */}
                        <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-purple-50 text-purple-700 border border-purple-200">
                          금형차수: {selectedItem.moldDegree || "M1"}
                        </span>
                      </div>

                      {/* [핵심] MPSI 설계변경(E채번) 발의 버튼 및 확인 후 상태값 변조 없이 '설계변경 처리함' 텍스트 표기 */}
                      {(initiatedRevisions.has(selectedItem.projectNo) || 
                        initiatedRevisions.has(`${selectedItem.projectNo}_${selectedItem.changeType || "N001"}`) ||
                        selectedItem.changeType?.startsWith("E")) ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-950 dark:text-purple-300 shadow-2xs">
                            <Check className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                            설계변경 처리함
                          </span>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => {
                            if (confirm(`[설계변경 발의]\n\n프로젝트 [${selectedItem.projectNo}]의 설계변경을 발의하시겠습니까?\n\n※ 확인 시 '설계변경 처리함'으로 표시되며, 신규 설계변경 차수(E001 등)는 신규 프로젝트 등록 메뉴에서 동일 프로젝트 번호로 등록하여 이력을 관리합니다.`)) {
                              const revisionKey = `${selectedItem.projectNo}_${selectedItem.changeType || "N001"}`;
                              markRevisionInitiated(revisionKey);
                              markRevisionInitiated(selectedItem.projectNo);
                              showToast(`[${selectedItem.projectNo}] 설계변경 처리가 완료되었습니다.`, "success");
                            }
                          }}
                          className="h-7 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 shadow-xs shrink-0 cursor-pointer"
                        >
                          <Wrench className="h-3.5 w-3.5" />
                          <span>설계변경(E채번) 발의</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 마스터 요약 정보 */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-white dark:bg-zinc-900 p-3 rounded-lg border text-[11px]">
                    <div><span className="text-zinc-500">원청 고객사:</span> <b className="text-zinc-800 dark:text-zinc-200 ml-1">{selectedItem.customerName}</b></div>
                    <div><span className="text-zinc-500">제품명:</span> <b className="text-zinc-900 dark:text-zinc-100 ml-1 truncate">{selectedItem.productName}</b></div>
                    <div>
                      <span className="text-zinc-500">금형제작처:</span> 
                      <b className="text-purple-700 ml-1 font-bold">
                        {selectedItem.moldProductionType === "IN_HOUSE" ? "[자체] " : selectedItem.moldProductionType === "CUSTOMER_RENTAL" ? "[대여] " : "[외주] "}{selectedItem.moldVendor}
                      </b>
                    </div>
                    <div>
                      <span className="text-zinc-500">사출양산처:</span> 
                      <b className="text-emerald-700 ml-1 font-bold">
                        {selectedItem.massProductionType === "IN_HOUSE" ? "[자체] " : "[외주] "}{selectedItem.massVendor}
                      </b>
                    </div>
                    <div><span className="text-zinc-500">캐비티/재질:</span> <b className="text-zinc-700 dark:text-zinc-300 ml-1">{selectedItem.cavity} / {selectedItem.material}</b></div>
                    <div><span className="text-zinc-500">현재 육성차수:</span> <b className="font-mono text-zinc-800 font-bold ml-1">{selectedItem.trialDegree}</b></div>
                  </div>

                  {/* 8대 핵심 일정 관리 현황 (클라이언트 피드백 반영) */}
                  <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-sky-600" />
                        핵심 일정 관리 현황 (금형 출고 납기 연계)
                      </span>
                      <span className="text-[10px] text-zinc-400">등록 ➔ 견적 ➔ 수주 ➔ 킥오프 ➔ 제작일수 ➔ T1 ➔ 금형출고 ➔ 양산승인 ➔ 양산시작</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-2 text-[11px] bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded border">
                      <div className="flex flex-col">
                        <span className="text-zinc-500 text-[10px]">1. 프로젝트 등록일</span>
                        <b className="font-mono text-zinc-800 dark:text-zinc-200 mt-0.5">{selectedItem.registeredDate || selectedItem.orderDate || "-"}</b>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-zinc-500 text-[10px]">2. 견적제출일</span>
                        <b className="font-mono text-blue-700 dark:text-blue-400 mt-0.5">{selectedItem.quoteSubmitDate || "-"}</b>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-zinc-500 text-[10px]">3. 수주일 (발주확정)</span>
                        <b className="font-mono text-sky-700 dark:text-sky-300 mt-0.5">{selectedItem.orderDate || "-"}</b>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-zinc-500 text-[10px]">4. 킥오프일 (3D확정)</span>
                        <b className="font-mono text-indigo-700 dark:text-indigo-400 mt-0.5">{selectedItem.kickoffDate || "-"}</b>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-zinc-500 text-[10px]">5. 목표 금형제작일수</span>
                        <b className="font-mono text-purple-700 dark:text-purple-400 mt-0.5">{selectedItem.targetMoldDays ? `${selectedItem.targetMoldDays}일` : (selectedItem.kickoffDate && selectedItem.targetT1Date ? `${Math.round((new Date(selectedItem.targetT1Date).getTime() - new Date(selectedItem.kickoffDate).getTime()) / (1000 * 60 * 60 * 24))}일` : "-")}</b>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-zinc-500 text-[10px]">6. 목표 T1 일정</span>
                        <b className="font-mono text-zinc-900 dark:text-zinc-100 font-bold mt-0.5">{selectedItem.targetT1Date || "-"}</b>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-purple-600 text-[10px] font-bold">7. 금형 출고 납기</span>
                        <b className="font-mono text-purple-700 dark:text-purple-400 font-bold mt-0.5">{selectedItem.moldDeliveryDate || "-"}</b>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-zinc-500 text-[10px]">8. 목표 양산 승인일</span>
                        <b className="font-mono text-amber-700 dark:text-amber-400 font-bold mt-0.5">{selectedItem.targetMassDate || "-"}</b>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-zinc-500 text-[10px]">9. 목표 양산 시작일</span>
                        <b className="font-mono text-emerald-700 dark:text-emerald-400 font-bold mt-0.5">{selectedItem.massStartDate || "-"}</b>
                      </div>
                    </div>
                  </div>

                  {/* [신설] 견적/생산 검토용 최소 8대 생산 기술 정보 & 시사출 Plan vs Actual (클라이언트 피드백 1, 8 반영) */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    {/* 8대 생산 기술 사양 */}
                    <div className="md:col-span-8 bg-zinc-50/70 dark:bg-zinc-800/40 p-3 rounded-lg border flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                          <Settings className="h-3.5 w-3.5 text-sky-600" />
                          견적 검토용 최소 8대 생산 기술 정보 (RFQ Spec)
                        </span>
                        <span className="text-[10px] text-zinc-400">금형 제작 및 사출 성형 타당성 검토 기준</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-white dark:bg-zinc-900 p-2.5 rounded border">
                        <div><span className="text-zinc-500">1. 제품 중량:</span> <b className="font-mono text-zinc-800 dark:text-zinc-200 ml-1">{selectedItem.partWeight || "420g"}</b></div>
                        <div><span className="text-zinc-500">2. 캐비티 수:</span> <b className="font-mono text-zinc-800 dark:text-zinc-200 ml-1">{selectedItem.cavity || "1*2"}</b></div>
                        <div><span className="text-zinc-500">3. 연간 볼륨(EAU):</span> <b className="font-mono text-sky-700 ml-1">{selectedItem.annualVolume ? `${Number(selectedItem.annualVolume).toLocaleString()} ea` : "50,000 ea/년"}</b></div>
                        <div><span className="text-zinc-500">4. 사출기 톤수:</span> <b className="font-mono text-zinc-800 dark:text-zinc-200 ml-1">{selectedItem.machineTon || "650T"}</b></div>
                        <div><span className="text-zinc-500">5. HRS 사양:</span> <b className="font-mono text-indigo-700 ml-1">{selectedItem.hrsSpec || "밸브게이트 2-Drop"}</b></div>
                        <div><span className="text-zinc-500">6. 금형 소재:</span> <b className="font-mono text-purple-700 ml-1">{selectedItem.moldMaterial || "NAK80"}</b></div>
                        <div><span className="text-zinc-500">7. 원자재(레진):</span> <b className="font-mono text-zinc-800 dark:text-zinc-200 ml-1">{selectedItem.resinSpec || "PP-EPDM"}</b></div>
                        <div><span className="text-zinc-500">8. 보증 수명:</span> <b className="font-mono text-emerald-700 ml-1">{selectedItem.warrantyShots ? `${Number(selectedItem.warrantyShots).toLocaleString()} Shot` : "500,000 Shot"}</b></div>
                      </div>
                    </div>

                    {/* 시사출 목표 vs 실제 일정 비교 (피드백 8 반영) */}
                    <div className="md:col-span-4 bg-sky-50/50 dark:bg-sky-950/30 p-3 rounded-lg border border-sky-200 dark:border-sky-800 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-sky-600" />
                          시사출 일정 (Plan vs Actual)
                        </span>
                        <span className="text-[10px] font-bold text-sky-600 font-mono">T1 실적 비교</span>
                      </div>
                      <div className="flex flex-col gap-1.5 bg-white dark:bg-zinc-900 p-2.5 rounded border text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500">목표 T1 일정 (Plan):</span>
                          <b className="font-mono text-zinc-700 dark:text-zinc-300">{selectedItem.targetT1Date || "-"}</b>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500">실제 T1 완료 (Actual):</span>
                          <b className={`font-mono font-bold ${selectedItem.actualT1Date ? "text-emerald-600" : "text-amber-600"}`}>
                            {selectedItem.actualT1Date || "미완료 (진행중)"}
                          </b>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t">
                          <span className="text-zinc-500">일정 준수 편차:</span>
                          <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            selectedItem.actualT1Date 
                              ? "bg-emerald-100 text-emerald-800" 
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {selectedItem.actualT1Date ? "정상 완료 (±0일)" : "T1 시사출 대기"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* [신설] 프로젝트 특이사항 및 요구조건 (클라이언트 등록 내용 확인) */}
                  <div className="bg-amber-50/70 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                        프로젝트 특이사항 및 요구조건
                      </span>
                      <span className="text-[10px] text-amber-700 dark:text-amber-300 font-mono">
                        DB 저장 및 협력사 공유 사항
                      </span>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-2.5 rounded border border-amber-200/70 text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap min-h-[44px]">
                      {selectedItem.notes && selectedItem.notes.trim() ? (
                        selectedItem.notes
                      ) : (
                        <span className="text-zinc-400 italic">등록된 특이사항 및 요구조건이 없습니다.</span>
                      )}
                    </div>
                  </div>

                  {/* 13단계 개별 카드 타임라인 그리드 (동적 담당자 표시) */}
                  <div className="flex flex-col gap-3 border rounded-xl p-4 bg-white dark:bg-zinc-900">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                        <Activity className="h-4 w-4 text-sky-600" />
                        0~13단계 세부 공정 타임라인
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
                      {PROCESS_13_STEPS.map((item) => {
                        const isCurrent = item.step === selectedItem.currentStep;
                        const isCompleted = item.step < selectedItem.currentStep;
                        const isFailLoop = item.step === 9 && selectedItem.stepStatus === "Fail(수정중)";
                        const dynamicActor = getStepActor(item.step, selectedItem);
                        const isExpanded = expandedStep === item.step;

                        return (
                          <div 
                            key={item.step}
                            className={`flex flex-col p-2.5 rounded-lg border text-left relative transition-all ${
                              isExpanded
                                ? "bg-indigo-50/90 text-indigo-950 border-indigo-500 ring-2 ring-indigo-400 shadow-md scale-[1.02] z-20 dark:bg-indigo-950/50 dark:text-indigo-200"
                                : isCurrent 
                                ? isFailLoop
                                ? "bg-rose-500 text-white border-rose-600 shadow-lg ring-2 ring-rose-300 scale-105 z-10"
                                : "bg-sky-600 text-white border-sky-600 shadow-lg ring-2 ring-sky-300 scale-105 z-10" 
                                : isCompleted 
                                ? "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" 
                                : "bg-white text-zinc-400 border-zinc-200 dark:bg-zinc-800/40 dark:border-zinc-800"
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                              <span className={isCurrent ? "text-white font-bold" : isExpanded ? "text-indigo-600 font-bold" : "text-zinc-500"}>
                                Step {item.step}
                              </span>
                              <div className="flex items-center gap-1">
                                {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                                {isCurrent && <Clock className="h-3.5 w-3.5 text-white animate-pulse" />}
                              </div>
                            </div>

                            <div className="font-bold text-[11px] leading-tight mb-1">
                              {item.name}
                            </div>

                            <div className={`text-[9px] mb-1.5 font-medium ${isCurrent ? "text-sky-100" : isExpanded ? "text-indigo-800 dark:text-indigo-300" : "text-zinc-600 dark:text-zinc-400"}`}>
                              담당: <span className="font-bold">{dynamicActor}</span>
                            </div>

                            {/* 불릿 세부 업무 요약 */}
                            <ul className={`space-y-0.5 text-[9px] ${isCurrent ? "text-sky-100/90" : isExpanded ? "text-indigo-900/80 dark:text-indigo-300/80" : "text-zinc-500 dark:text-zinc-400"}`}>
                              {getStepBullets(item.step, selectedItem).map((bullet, bIdx) => (
                                <li key={bIdx} className="line-clamp-1 flex items-start gap-1" title={bullet}>
                                  <span className="shrink-0">•</span>
                                  <span className="truncate">{bullet}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>

                    {/* 박스칸 아래에 해당하는 공정 요약 데이터 표기 */}
                    {expandedStep !== null && renderStepSummaryData(expandedStep, selectedItem)}
                  </div>
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-between px-5 py-3 bg-zinc-100 dark:bg-zinc-800 border-t">
              <span className="text-[11px] text-zinc-500">
                MPSI 본사 ↔ 금형제작 협력사(외주/자체) ↔ 사출양산 협력사(외주/자체) 간 SCM 공정 데이터 연동 중
              </span>
              <Button onClick={() => setIsDiagramModalOpen(false)} size="xs" className="h-7 px-4 bg-zinc-800 hover:bg-zinc-700 text-white text-xs">
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. [신규 프로젝트 등록 모달] (외주업체 선택 변수화 + MPSI 자체생산 라디오 지원) */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-lg shadow-xl border overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 text-white">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-xs">
                  {projectCreationMode === "PROMOTED" 
                    ? `승격 프로젝트 등록 (생산 및 외주업체 선택) - [${formState.projectNo}]` 
                    : "프로젝트 등록 (생산 및 외주업체 선택)"}
                </h3>
              </div>
              <button onClick={() => setIsNewProjectModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs">
              {/* [핵심] 프로젝트 번호 지정 방식 선택 또는 원청사 승격 안내 배너 */}
              {projectCreationMode === "PROMOTED" ? (
                <div className="bg-indigo-50/80 dark:bg-indigo-950/40 p-3.5 rounded-lg border border-indigo-200 dark:border-indigo-800 flex flex-col gap-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-indigo-600 animate-pulse" />
                      원청사 견적 수주 확정 승격 건
                    </span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 px-2 py-0.5 rounded font-bold font-mono">
                      프로젝트번호: {formState.projectNo} (원 견적번호: {formState.estimateNo})
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
                    원청사 견적 관리에서 수주 승격되어 프로젝트 관리대장에 연동된 건입니다. 
                    견적 정보(고객사, 프로젝트명, 제품명)가 자동 바인딩되었으며, 아래에서 금형/양산 협력업체 및 기술 사양을 확인·등록하면 <strong>1단계(제품 data 접수)</strong>로 즉시 공식 개발 프로세스가 시작됩니다.
                  </p>
                </div>
              ) : (
                <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-lg border border-sky-200 dark:border-zinc-700 flex flex-col gap-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-sky-600" />
                      프로젝트 번호 지정 방식
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      * 프로젝트 번호는 무조건 M으로 시작하며, 같은 번호로 설계변경/추가금형 등록이 가능합니다.
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs flex-wrap">
                    {/* 사용자 요청: 원청사 견적 외 직접 등록 시 '신규 프로젝트 발번' 항목 숨김처리 (무조건 기존 프로젝트 번호 연동만 표시) */}
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="projectCreationMode"
                        value="EXISTING"
                        checked={true}
                        readOnly
                      />
                      <span className="font-bold text-purple-700 dark:text-purple-300">
                        기존 프로젝트 번호 연동 (설계변경 E차수 / 복수·증설 금형 M차수 등록)
                      </span>
                    </label>
                  </div>

                  {projectCreationMode === "EXISTING" && (
                    <div className="pt-2 border-t flex flex-col gap-1.5 bg-purple-50/50 dark:bg-purple-950/20 p-2.5 rounded-md">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-700 dark:text-zinc-300 font-bold shrink-0">
                          <span className="text-red-500 mr-0.5">*</span>연동할 기존 프로젝트:
                        </span>
                        <select
                          value={selectedExistingProjectNo}
                          onChange={(e) => handleSelectExistingProject(e.target.value)}
                          className={`h-8 flex-1 rounded border px-2 text-xs font-mono font-bold bg-white dark:bg-zinc-800 ${
                            !selectedExistingProjectNo
                              ? "border-amber-400 text-amber-700 dark:text-amber-300 ring-1 ring-amber-400"
                              : "border-purple-300 text-purple-800 dark:text-purple-200"
                          }`}
                        >
                          <option value="">-- [필수 선택] 연동할 기존 프로젝트를 선택하세요 --</option>
                          {Array.from(new Set(projects.map((p) => p.projectNo))).map((pNo) => {
                            const p = projects.find((item) => item.projectNo === pNo);
                            return (
                              <option key={pNo} value={pNo}>
                                [{pNo}] {p?.projectName} - {p?.productName} ({p?.customerName})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-purple-700 dark:text-purple-300">
                          * 동일한 프로젝트 번호로 차수(설변 E001 또는 추가금형 M2)를 등록하여, 관리대장에서 같은 프로젝트로 식별되어 프로세스를 재진행합니다.
                        </span>
                        {!selectedExistingProjectNo && (
                          <span className="text-red-600 dark:text-red-400 font-bold shrink-0 ml-2">
                            * 기존 프로젝트 선택 필수
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* [기초정보 품목 선택] */}
              <div className="bg-sky-50/70 dark:bg-sky-950/30 p-3.5 rounded-lg border border-sky-200 dark:border-sky-800 flex flex-col gap-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-sky-600" />
                    기초정보 품목 선택 (품번·제품명·사양 자동 연동)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedItemCode}
                    onChange={(e) => handleSelectRegisteredItem(e.target.value)}
                    className="h-8 flex-1 rounded border border-sky-300 bg-white dark:bg-zinc-800 px-2.5 text-xs font-bold text-zinc-800 dark:text-zinc-200 shadow-2xs focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="">-- [선택] 기초정보 등록 품목에서 선택하세요 --</option>
                    {registeredItems.map((it) => (
                      <option key={it.itemCode} value={it.itemCode}>
                        [{it.itemCode}] {it.itemName} ({it.category || "판매반제품"} / {it.unit || "EA"})
                      </option>
                    ))}
                  </select>
                  {selectedItemCode && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedItemCode("");
                        setFormState((prev) => ({ ...prev, partNo: "", productName: "" }));
                      }}
                      className="h-8 px-2 text-[11px] text-zinc-500 hover:text-zinc-700"
                    >
                      초기화
                    </Button>
                  )}
                </div>

                {selectedItemCode && (
                  <div className="flex items-center gap-2 text-[11px] text-sky-800 dark:text-sky-300 bg-white/80 dark:bg-zinc-900/80 px-2.5 py-1.5 rounded border border-sky-200">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>
                      기초정보 품목 <b>[{formState.partNo}]</b> ({formState.productName}) 정보가 연동되었습니다.
                    </span>
                  </div>
                )}
              </div>

              {/* 기본 정보 등록 그리드 */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-lg border flex flex-col gap-3 text-[11px]">
                <div className="flex items-center justify-between pb-1.5 border-b">
                  <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-sky-600" />
                    기본 프로젝트 정보 등록
                  </span>
                  <span className="text-[10px] text-zinc-500 font-medium">
                    * 프로젝트 번호는 M으로 시작하며, 견적번호(Q)는 별도 컬럼으로 관리됩니다.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* 1. 프로젝트 번호 (무조건 M으로 시작) */}
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-bold">
                      <span className="inline-flex items-center gap-1">
                        <span>프로젝트 번호 (M)</span>
                        <span className="text-red-500">*</span>
                      </span>
                    </label>
                    <Input 
                      value={formState.projectNo || ""} 
                      onChange={(e) => setFormState({ ...formState, projectNo: e.target.value })}
                      placeholder="예: MI26001P0"
                      className="h-7 text-xs bg-sky-50/50 dark:bg-zinc-800 font-mono font-bold text-sky-900 dark:text-sky-200 border-sky-300"
                    />
                    <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0 text-rose-500" />
                      ※ 프로젝트 번호는 한번 저장하면 그후에 변경할 수 없습니다.
                    </p>
                  </div>

                  {/* 1-1. 견적 번호 (Q 채번 분리) */}
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-bold">
                      <span className="inline-flex items-center gap-1">
                        <span>견적 단계 번호 (Q)</span>
                        <span className="text-[9px] px-1 py-0.2 bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold rounded">견적 관리번호</span>
                      </span>
                    </label>
                    <Input 
                      value={formState.estimateNo || ""} 
                      onChange={(e) => setFormState({ ...formState, estimateNo: e.target.value })}
                      placeholder="예: Q26001-01 또는 수주확정"
                      className={`h-7 text-xs font-mono font-bold border-indigo-300 ${
                        formState.estimateNo === "수주확정"
                          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-400"
                          : "bg-indigo-50/50 dark:bg-zinc-800 text-indigo-900 dark:text-indigo-200"
                      }`}
                    />
                  </div>

                  {/* 1-2. 신작 / 설변 구분 */}
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-bold flex items-center justify-between">
                      <span>신작/설변 구분 필터</span>
                      <span className="text-[10px] text-amber-700 font-mono font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                        {formState.changeType || "N001"}
                      </span>
                    </label>
                    <select
                      value={formState.changeType || "N001"}
                      onChange={(e) => {
                        const val = e.target.value;
                        const isEChange = val.startsWith("E");
                        setFormState((prev) => ({
                          ...prev,
                          changeType: val,
                          estimateNo: isEChange
                            ? "수주확정"
                            : (prev.estimateNo === "수주확정" ? generateNextQuoteNo(projects) : prev.estimateNo),
                        }));
                      }}
                      className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-mono font-bold text-amber-800"
                    >
                      <option value="N001">N001 (초도 신작)</option>
                      <option value="E001">E001 (1차 설계변경)</option>
                      <option value="E002">E002 (2차 설계변경)</option>
                      <option value="E003">E003 (3차 설계변경)</option>
                      <option value="E004">E004 (4차 설계변경)</option>
                    </select>
                  </div>

                  {/* 2. 원청 고객사 */}
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-bold">
                      원청 고객사 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formState.customerName || CUSTOMER_OPTIONS[0]}
                      onChange={(e) => setFormState({ ...formState, customerName: e.target.value })}
                      className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-medium"
                    >
                      {CUSTOMER_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* 3. 프로젝트명 / 차종 */}
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-bold">
                      프로젝트명 / 차종
                    </label>
                    <Input 
                      value={formState.projectName || ""} 
                      onChange={(e) => setFormState({ ...formState, projectName: e.target.value })}
                      placeholder="예: 현대 NT5 도어 트림 모듈"
                      className="h-7 text-xs bg-white"
                    />
                  </div>

                  {/* 3-1. 품목식별자 / 품번 (Part No.) */}
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-bold flex items-center justify-between">
                      <span>품목식별자 / 품번 <span className="text-red-500">*</span></span>
                      {selectedItemCode ? (
                        <span className="text-[9px] px-1 py-0.2 bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-bold rounded">
                          기초정보 연동됨
                        </span>
                      ) : (
                        <span className="text-[9px] text-zinc-400 font-normal">
                          (직접 입력 또는 상단 품목 선택)
                        </span>
                      )}
                    </label>
                    <Input 
                      value={formState.partNo || ""} 
                      readOnly={Boolean(selectedItemCode)}
                      onChange={(e) => setFormState({ ...formState, partNo: e.target.value })}
                      placeholder="예: 8471-NT500-LH"
                      className={`h-7 text-xs font-mono font-bold ${
                        selectedItemCode 
                          ? "bg-zinc-100 dark:bg-zinc-800 text-sky-700 dark:text-sky-300 border-zinc-200 cursor-not-allowed" 
                          : "bg-white text-zinc-900 border-sky-300"
                      }`}
                    />
                  </div>

                  {/* 4. 제품명 (Part Name) */}
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-bold">
                      제품명 (Part Name) <span className="text-red-500">*</span>
                    </label>
                    <Input 
                      value={formState.productName || ""} 
                      onChange={(e) => setFormState({ ...formState, productName: e.target.value })}
                      placeholder="예: Front Door Upper Cover LH/RH"
                      className="h-7 text-xs bg-white font-bold"
                    />
                  </div>

                  {/* 4-1. 금형번호 & 금형차수 */}
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-bold flex items-center justify-between">
                      <span>금형번호 / 금형차수</span>
                      <span className="text-[10px] text-purple-700 font-mono font-bold bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                        {formState.moldDegree || "M1"}
                      </span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <Input 
                        value={formState.moldNo || ""} 
                        onChange={(e) => setFormState({ ...formState, moldNo: e.target.value })}
                        placeholder="예: MI26001M"
                        className="h-7 text-xs bg-white font-mono flex-1 font-bold"
                      />
                      <select
                        value={formState.moldDegree || "M1"}
                        onChange={(e) => setFormState({ ...formState, moldDegree: e.target.value })}
                        className="h-7 w-20 rounded border border-purple-300 bg-purple-50 text-purple-800 font-bold px-1 text-xs"
                      >
                        <option value="M1">M1 (1차)</option>
                        <option value="M2">M2 (2차/증설)</option>
                        <option value="M3">M3 (3차/증설)</option>
                        <option value="M4">M4 (4차/증설)</option>
                      </select>
                    </div>
                  </div>

                  {/* 5. 초기 진행 단계 */}
                  <div>
                    <label className="block text-zinc-500 mb-1 font-bold">초기 진행 단계</label>
                    <select
                      value={formState.currentStep !== undefined ? formState.currentStep : 0}
                      onChange={(e) => setFormState({ ...formState, currentStep: Number(e.target.value) })}
                      className="h-7 w-full rounded border bg-white px-2 text-xs font-bold"
                    >
                      {PROCESS_13_STEPS.map((s) => (
                        <option key={s.step} value={s.step}>Step {s.step}: {s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* [핵심] 금형제작처 및 사출양산처 선택 (외주업체 선택 vs MPSI 자체생산) */}
              <div className="border rounded p-3.5 flex flex-col gap-3.5 bg-zinc-50/50">
                <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-sky-600" />
                  생산 방식 및 협력 외주업체 선택
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 금형 제작 방식 선택 (외주제작 vs MPSI 자체제작 vs 고객사 금형 대여) */}
                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border flex flex-col gap-2">
                    <span className="font-bold text-xs text-purple-800 dark:text-purple-300 flex items-center gap-1">
                      <Wrench className="h-3.5 w-3.5 text-purple-600" />
                      1. 금형 제작 방식
                    </span>
                    <div className="flex items-center gap-2.5 text-[11px] flex-wrap">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="moldProductionType"
                          value="OUTSOURCING"
                          checked={formState.moldProductionType === "OUTSOURCING"}
                          onChange={() => setFormState({
                            ...formState,
                            moldProductionType: "OUTSOURCING",
                            moldVendor: formState.moldVendor && formState.moldVendor !== "MPSI 자체제작팀" && formState.moldVendor !== "금형대여" ? formState.moldVendor : "우성정공(주)"
                          })}
                        />
                        <span className="font-medium">외주 제작 (협력사)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="moldProductionType"
                          value="IN_HOUSE"
                          checked={formState.moldProductionType === "IN_HOUSE"}
                          onChange={() => setFormState({
                            ...formState,
                            moldProductionType: "IN_HOUSE",
                            moldVendor: "MPSI 자체제작팀"
                          })}
                        />
                        <span className="font-bold text-sky-700">MPSI 자체제작</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="moldProductionType"
                          value="CUSTOMER_RENTAL"
                          checked={formState.moldProductionType === "CUSTOMER_RENTAL"}
                          onChange={() => setFormState({
                            ...formState,
                            moldProductionType: "CUSTOMER_RENTAL",
                            moldVendor: "금형대여"
                          })}
                        />
                        <span className="font-bold text-amber-700">고객사 금형 대여</span>
                      </label>
                    </div>

                    {formState.moldProductionType === "OUTSOURCING" ? (
                      <div>
                        <label className="block text-[10px] text-zinc-500 mb-0.5">금형제작 외주업체 선택 (DB 연동)</label>
                        <select
                          value={formState.moldVendor || (moldVendorOptions[0]?.name || "우성정공(주)")}
                          onChange={(e) => setFormState({ ...formState, moldVendor: e.target.value })}
                          className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-bold text-purple-700"
                        >
                          {moldVendorOptions.map(v => (
                            <option key={v.id} value={v.name}>{v.name}</option>
                          ))}
                        </select>
                      </div>
                    ) : formState.moldProductionType === "IN_HOUSE" ? (
                      <div className="h-7 px-2 rounded border bg-sky-50 text-sky-800 font-bold text-xs flex items-center">
                        MPSI 자체제작팀 (사내 금형공장 전담)
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className="h-7 px-2.5 rounded border border-amber-200 bg-amber-50 text-amber-900 font-bold text-xs flex items-center flex-1 truncate">
                          고객사 금형 대여 (원청사 제공/대여 금형)
                        </div>
                        <input
                          type="text"
                          value={formState.moldVendor || "금형대여"}
                          onChange={(e) => setFormState({ ...formState, moldVendor: e.target.value })}
                          placeholder="금형대여"
                          className="h-7 w-24 px-2 rounded border border-amber-300 bg-white dark:bg-zinc-800 text-[11px] font-bold text-amber-800 dark:text-amber-300 text-center"
                          title="금형 제작처 표기명 (기본: 금형대여)"
                        />
                      </div>
                    )}
                  </div>

                  {/* 사출 양산 방식 선택 */}
                  <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg border flex flex-col gap-2">
                    <span className="font-bold text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                      <Factory className="h-3.5 w-3.5 text-emerald-600" />
                      2. 사출 양산 방식
                    </span>
                    <div className="flex items-center gap-3 text-[11px]">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="massProductionType"
                          value="OUTSOURCING"
                          checked={formState.massProductionType === "OUTSOURCING"}
                          onChange={() => setFormState({
                            ...formState,
                            massProductionType: "OUTSOURCING",
                            massVendor: massVendorOptions[0]?.name || "(주)뉴몰드"
                          })}
                        />
                        <span className="font-medium">외주 양산 (협력사)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="massProductionType"
                          value="IN_HOUSE"
                          checked={formState.massProductionType === "IN_HOUSE"}
                          onChange={() => setFormState({
                            ...formState,
                            massProductionType: "IN_HOUSE",
                            massVendor: "MPSI 자체사출라인"
                          })}
                        />
                        <span className="font-bold text-sky-700">MPSI 자체사출</span>
                      </label>
                    </div>

                    {formState.massProductionType === "OUTSOURCING" ? (
                      <div>
                        <label className="block text-[10px] text-zinc-500 mb-0.5">사출양산 외주업체 선택 (DB 연동)</label>
                        <select
                          value={formState.massVendor || (massVendorOptions[0]?.name || "(주)뉴몰드")}
                          onChange={(e) => setFormState({ ...formState, massVendor: e.target.value })}
                          className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-bold text-emerald-700"
                        >
                          {massVendorOptions.map(v => (
                            <option key={v.id} value={v.name}>{v.name}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="h-7 px-2 rounded border bg-sky-50 text-sky-800 font-bold text-xs flex items-center">
                        MPSI 자체사출라인 (사내 사출 1~4호기)
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. 일정 등록 (8대 핵심 일정) */}
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-sky-600" />
                      3. 일정 등록
                    </span>
                    <span className="text-[10px] text-zinc-400">등록 ➔ 견적제출 ➔ 수주 ➔ 킥오프 ➔ 금형제작일수 ➔ T1 ➔ 양산승인 ➔ 양산시작</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-[11px]">
                    <div>
                      <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-semibold">1) 프로젝트 등록일</label>
                      <Input 
                        type="date"
                        value={formState.registeredDate || ""} 
                        onChange={(e) => setFormState({ ...formState, registeredDate: e.target.value })}
                        className="h-7 text-xs bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-blue-700 dark:text-blue-400 mb-1 font-semibold">2) 견적제출일 (MPSI➔고객사)</label>
                      <Input 
                        type="date"
                        value={formState.quoteSubmitDate || ""} 
                        onChange={(e) => setFormState({ ...formState, quoteSubmitDate: e.target.value })}
                        className="h-7 text-xs bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-sky-700 dark:text-sky-400 mb-1 font-semibold">3) 수주일 (발주 확정일)</label>
                      <Input 
                        type="date"
                        value={formState.orderDate || ""} 
                        onChange={(e) => setFormState({ ...formState, orderDate: e.target.value })}
                        className="h-7 text-xs bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-indigo-700 dark:text-indigo-400 mb-1 font-semibold">4) 킥오프일 (3D모델링확정일)</label>
                      <Input 
                        type="date"
                        value={formState.kickoffDate || ""} 
                        onChange={(e) => {
                          const kDate = e.target.value;
                          let newDays = formState.targetMoldDays;
                          if (kDate && formState.targetT1Date) {
                            const diff = Math.round((new Date(formState.targetT1Date).getTime() - new Date(kDate).getTime()) / (1000 * 60 * 60 * 24));
                            if (diff > 0) newDays = diff;
                          }
                          setFormState({ ...formState, kickoffDate: kDate, targetMoldDays: newDays });
                        }}
                        className="h-7 text-xs bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-purple-700 dark:text-purple-400 mb-1 font-semibold">5) 목표 금형 제작 일수</label>
                      <div className="relative">
                        <CurrencyInput 
                          placeholder="예: 45"
                          value={formState.targetMoldDays || ""} 
                          onChange={(val) => {
                            let newT1 = formState.targetT1Date;
                            if (val && formState.kickoffDate) {
                              const d = new Date(formState.kickoffDate);
                              d.setDate(d.getDate() + Number(val));
                              newT1 = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split("T")[0];
                            }
                            setFormState({ ...formState, targetMoldDays: val || "", targetT1Date: newT1 });
                          }}
                          className="h-7 text-xs bg-white font-mono pr-7"
                        />
                        <span className="absolute right-2 top-1.5 text-xs text-zinc-400 font-bold pointer-events-none">일</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-zinc-700 dark:text-zinc-300 mb-1 font-bold">6) 목표 T1 일정</label>
                      <Input 
                        type="date"
                        value={formState.targetT1Date || ""} 
                        onChange={(e) => {
                          const t1Date = e.target.value;
                          let newDays = formState.targetMoldDays;
                          if (formState.kickoffDate && t1Date) {
                            const diff = Math.round((new Date(t1Date).getTime() - new Date(formState.kickoffDate).getTime()) / (1000 * 60 * 60 * 24));
                            if (diff > 0) newDays = diff;
                          }
                          setFormState({ ...formState, targetT1Date: t1Date, targetMoldDays: newDays });
                        }}
                        className="h-7 text-xs bg-white font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-purple-700 dark:text-purple-400 mb-1 font-bold">7) 금형 출고 납기</label>
                      <Input 
                        type="date"
                        value={formState.moldDeliveryDate || ""} 
                        onChange={(e) => setFormState({ ...formState, moldDeliveryDate: e.target.value })}
                        className="h-7 text-xs bg-white font-mono font-bold text-purple-700"
                      />
                    </div>
                    <div>
                      <label className="block text-amber-700 dark:text-amber-400 mb-1 font-bold">8) 목표 양산 승인일</label>
                      <Input 
                        type="date"
                        value={formState.targetMassDate || ""} 
                        onChange={(e) => setFormState({ ...formState, targetMassDate: e.target.value })}
                        className="h-7 text-xs bg-white font-mono font-bold text-amber-700"
                      />
                    </div>
                    <div>
                      <label className="block text-emerald-700 dark:text-emerald-400 mb-1 font-bold">9) 목표 양산 시작일</label>
                      <Input 
                        type="date"
                        value={formState.massStartDate || ""} 
                        onChange={(e) => setFormState({ ...formState, massStartDate: e.target.value })}
                        className="h-7 text-xs bg-white font-mono font-bold text-emerald-700"
                      />
                    </div>
                  </div>
                </div>

                {/* [신설] 견적 검토용 최소 8대 생산 기술 정보 (클라이언트 피드백 1 반영) */}
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                      <Settings className="h-3.5 w-3.5 text-sky-600" />
                      4. 견적 검토용 최소 8대 생산 기술 정보 (RFQ Spec)
                    </span>
                    <span className="text-[10px] text-zinc-400">금형 제작 및 사출 타당성 사전 검토 항목</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                    <div>
                      <label className="block text-zinc-600 dark:text-zinc-400 mb-0.5">1. 제품 중량</label>
                      <Input 
                        value={formState.partWeight || ""} 
                        onChange={(e) => setFormState({ ...formState, partWeight: e.target.value })}
                        placeholder="예: 420g"
                        className="h-7 text-xs bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-600 dark:text-zinc-400 mb-0.5">2. 캐비티 수</label>
                      <Input 
                        value={formState.cavity || ""} 
                        onChange={(e) => setFormState({ ...formState, cavity: e.target.value })}
                        placeholder="예: 1*2 Cavity"
                        className="h-7 text-xs bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-600 dark:text-zinc-400 mb-0.5">3. 연간 볼륨(EAU)</label>
                      <CurrencyInput 
                        value={formState.annualVolume || ""} 
                        onChange={(val) => setFormState({ ...formState, annualVolume: val || "" })}
                        placeholder="예: 50,000"
                        className="h-7 text-xs bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-600 dark:text-zinc-400 mb-0.5">4. 사출기 타입 / 톤수</label>
                      <Input 
                        value={formState.machineTon || ""} 
                        onChange={(e) => setFormState({ ...formState, machineTon: e.target.value })}
                        placeholder="예: 유압식 650T 또는 500"
                        className="h-7 text-xs bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-600 dark:text-zinc-400 mb-0.5">5. HRS (핫러너) 사양</label>
                      <Input 
                        value={formState.hrsSpec || ""} 
                        onChange={(e) => setFormState({ ...formState, hrsSpec: e.target.value })}
                        placeholder="예: 밸브게이트 2-Drop"
                        className="h-7 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-600 dark:text-zinc-400 mb-0.5">6. 금형 소재</label>
                      <Input 
                        value={formState.moldMaterial || ""} 
                        onChange={(e) => setFormState({ ...formState, moldMaterial: e.target.value })}
                        placeholder="예: NAK80, SKD61"
                        className="h-7 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-600 dark:text-zinc-400 mb-0.5">7. 원자재 (레진)</label>
                      <Input 
                        value={formState.resinSpec || ""} 
                        onChange={(e) => setFormState({ ...formState, resinSpec: e.target.value })}
                        placeholder="예: PP-EPDM, ABS"
                        className="h-7 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-600 dark:text-zinc-400 mb-0.5">8. 보증 수명(Shot)</label>
                      <CurrencyInput 
                        value={formState.warrantyShots || ""} 
                        onChange={(val) => setFormState({ ...formState, warrantyShots: val || "" })}
                        placeholder="예: 500,000"
                        className="h-7 text-xs bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 비고 */}
              <div>
                <label className="block text-zinc-500 mb-1">프로젝트 특이사항 및 요구조건</label>
                <textarea 
                  value={formState.notes || ""} 
                  onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                  placeholder="고객 요구 품질수준, 난성형 부위 등을 기재하세요."
                  className="w-full h-14 p-2 rounded border text-xs bg-white dark:bg-zinc-900 resize-none"
                />
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 border-t">
              <Button onClick={() => setIsNewProjectModalOpen(false)} variant="outline" className="h-8 px-3 text-xs">
                취소
              </Button>
              <Button 
                onClick={handleCreateProject}
                disabled={projectCreationMode === "EXISTING" && !selectedExistingProjectNo}
                className={`h-8 px-4 text-xs text-white gap-1.5 font-bold ${
                  projectCreationMode === "PROMOTED"
                    ? "bg-indigo-600 hover:bg-indigo-700 shadow-md"
                    : projectCreationMode === "EXISTING" && !selectedExistingProjectNo
                    ? "bg-slate-400 dark:bg-zinc-600 cursor-not-allowed opacity-60"
                    : "bg-sky-600 hover:bg-sky-700"
                }`}
                title={projectCreationMode === "EXISTING" && !selectedExistingProjectNo ? "연동할 기존 프로젝트를 먼저 선택하세요" : ""}
              >
                <Check className="h-3.5 w-3.5" />
                {projectCreationMode === "PROMOTED" ? "승격 프로젝트 등록 확정" : "프로젝트 등록"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. [프로젝트 기본정보 수정 모달] (Project ID는 고유 식별자로 읽기 전용) */}
      {isEditProjectModalOpen && editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-lg shadow-2xl border overflow-hidden flex flex-col max-h-[92vh]">
            {/* 모달 상단 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800 text-white border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-amber-400" />
                <h3 className="font-bold text-xs">
                  프로젝트 기본정보 수정 [{editingProject.projectNo}]
                </h3>
              </div>
              <button onClick={() => setIsEditProjectModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs">
              {/* 프로젝트 ID 고유 식별자 잠금 안내 배너 */}
              <div className="bg-amber-50/80 dark:bg-amber-950/40 p-3 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold text-amber-900 dark:text-amber-200">
                      프로젝트 고유 식별자 (Project ID) 보호 안내
                    </span>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">
                      협력사(금형/사출) 및 SCM 데이터베이스 연계 무결성을 위해 프로젝트 번호는 변경할 수 없습니다.
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 rounded bg-amber-200/80 text-amber-900 font-mono font-bold text-[11px] shrink-0">
                  {editingProject.projectNo}
                </span>
              </div>

              {/* 기본 프로젝트 정보 수정 그리드 */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-lg border flex flex-col gap-3 text-[11px]">
                <div className="flex items-center justify-between pb-1.5 border-b">
                  <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-sky-600" />
                    기본 프로젝트 정보 수정
                  </span>
                  <span className="text-[10px] text-zinc-500 font-medium">
                    * 프로젝트 번호를 제외한 상세 정보를 수정할 수 있습니다.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* 1. 프로젝트 번호 (변경 불가, 읽기 전용) */}
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-bold flex items-center justify-between">
                      <span>프로젝트 번호 (Project ID)</span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-zinc-200 text-zinc-700 font-bold rounded flex items-center gap-0.5">
                        <Lock className="h-2.5 w-2.5" /> 수정불가
                      </span>
                    </label>
                    <Input 
                      value={editingProject.projectNo || ""} 
                      disabled
                      readOnly
                      className="h-7 text-xs bg-zinc-100 dark:bg-zinc-800 font-mono font-bold text-zinc-500 cursor-not-allowed border-zinc-300"
                    />
                  </div>

                  {/* 1-1. 견적 번호 */}
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-bold">
                      견적 단계 번호 (Q)
                    </label>
                    <Input 
                      value={editFormState.estimateNo || ""} 
                      onChange={(e) => setEditFormState({ ...editFormState, estimateNo: e.target.value })}
                      placeholder="예: Q26001-01 또는 수주확정"
                      className={`h-7 text-xs font-mono font-bold border-indigo-300 ${
                        editFormState.estimateNo === "수주확정"
                          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-400"
                          : "bg-white text-indigo-900"
                      }`}
                    />
                  </div>

                  {/* 1-2. 신작 / 설변 구분 */}
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-bold flex items-center justify-between">
                      <span>신작/설변 구분 필터</span>
                      <span className="text-[10px] text-amber-700 font-mono font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                        {editFormState.changeType || "N001"}
                      </span>
                    </label>
                    <select
                      value={editFormState.changeType || "N001"}
                      onChange={(e) => {
                        const val = e.target.value;
                        const isEChange = val.startsWith("E");
                        setEditFormState((prev) => ({
                          ...prev,
                          changeType: val,
                          estimateNo: isEChange
                            ? "수주확정"
                            : (prev.estimateNo === "수주확정" ? generateNextQuoteNo(projects) : prev.estimateNo),
                        }));
                      }}
                      className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-mono font-bold text-amber-800"
                    >
                      <option value="N001">N001 (초도 신작)</option>
                      <option value="E001">E001 (1차 설계변경)</option>
                      <option value="E002">E002 (2차 설계변경)</option>
                      <option value="E003">E003 (3차 설계변경)</option>
                      <option value="E004">E004 (4차 설계변경)</option>
                    </select>
                  </div>

                  {/* 2. 원청 고객사 */}
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-bold">
                      원청 고객사 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editFormState.customerName || CUSTOMER_OPTIONS[0]}
                      onChange={(e) => setEditFormState({ ...editFormState, customerName: e.target.value })}
                      className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-medium"
                    >
                      {CUSTOMER_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* 3. 프로젝트명 / 차종 */}
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-bold">
                      프로젝트명 / 차종
                    </label>
                    <Input 
                      value={editFormState.projectName || ""} 
                      onChange={(e) => setEditFormState({ ...editFormState, projectName: e.target.value })}
                      placeholder="예: 현대 NT5 도어 트림 모듈"
                      className="h-7 text-xs bg-white"
                    />
                  </div>

                  {/* 3-1. 품번 (Part No.) */}
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-bold">
                      품목식별자 / 품번
                    </label>
                    <Input 
                      value={editFormState.partNo || ""} 
                      onChange={(e) => setEditFormState({ ...editFormState, partNo: e.target.value })}
                      placeholder="예: 84710-NT500-LH"
                      className="h-7 text-xs bg-white font-mono font-bold text-sky-700 dark:text-sky-300"
                    />
                  </div>

                  {/* 4. 제품명 (Part Name) */}
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-bold">
                      제품명 (Part Name) <span className="text-red-500">*</span>
                    </label>
                    <Input 
                      value={editFormState.productName || ""} 
                      onChange={(e) => setEditFormState({ ...editFormState, productName: e.target.value })}
                      placeholder="예: Front Door Upper Cover LH/RH"
                      className="h-7 text-xs bg-white font-bold"
                    />
                  </div>

                  {/* 4-1. 금형번호 & 금형차수 */}
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-bold flex items-center justify-between">
                      <span>금형번호 / 금형차수</span>
                      <span className="text-[10px] text-purple-700 font-mono font-bold bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                        {editFormState.moldDegree || "미지정"}
                      </span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <Input 
                        value={editFormState.moldNo || ""} 
                        onChange={(e) => setEditFormState({ ...editFormState, moldNo: e.target.value })}
                        placeholder="예: MI26001M (미지정 가능)"
                        className="h-7 text-xs bg-white font-mono flex-1 font-bold"
                      />
                      <select
                        value={editFormState.moldDegree || ""}
                        onChange={(e) => setEditFormState({ ...editFormState, moldDegree: e.target.value })}
                        className="h-7 w-24 rounded border border-purple-300 bg-purple-50 text-purple-800 font-bold px-1 text-xs"
                      >
                        <option value="">- 미지정 -</option>
                        <option value="M1">M1 (1차)</option>
                        <option value="M2">M2 (2차/증설)</option>
                        <option value="M3">M3 (3차/증설)</option>
                        <option value="M4">M4 (4차/증설)</option>
                      </select>
                    </div>
                  </div>

                  {/* 진행 공정 단계 */}
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-1 font-bold">
                      진행 공정 단계
                    </label>
                    <select
                      value={editFormState.currentStep !== undefined ? editFormState.currentStep : 1}
                      onChange={(e) => setEditFormState({ ...editFormState, currentStep: Number(e.target.value) })}
                      className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-bold text-sky-800"
                    >
                      {PROCESS_13_STEPS.map((s) => (
                        <option key={s.step} value={s.step}>
                          Step {s.step}: {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 생산 방식 및 외주업체 선택 */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-lg border flex flex-col gap-3 text-[11px]">
                <div className="flex items-center justify-between pb-1.5 border-b">
                  <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Factory className="h-3.5 w-3.5 text-purple-600" />
                    생산 방식 및 협력 외주업체 변경
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* 1. 금형 제작 방식 */}
                  <div className="p-2.5 rounded-lg border border-purple-200 bg-purple-50/30 flex flex-col gap-2">
                    <span className="font-bold text-purple-900 flex items-center gap-1">
                      <Wrench className="h-3.5 w-3.5 text-purple-600" />
                      1. 금형 제작 방식
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input 
                          type="radio" 
                          name="editMoldType" 
                          checked={editFormState.moldProductionType === "OUTSOURCING" || !editFormState.moldProductionType}
                          onChange={() => setEditFormState({ ...editFormState, moldProductionType: "OUTSOURCING" })}
                        />
                        <span>외주 제작 (협력사)</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input 
                          type="radio" 
                          name="editMoldType" 
                          checked={editFormState.moldProductionType === "IN_HOUSE"}
                          onChange={() => setEditFormState({ ...editFormState, moldProductionType: "IN_HOUSE", moldVendor: "MPSI 자체제작팀" })}
                        />
                        <span>MPSI 자체제작</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input 
                          type="radio" 
                          name="editMoldType" 
                          checked={editFormState.moldProductionType === "CUSTOMER_RENTAL"}
                          onChange={() => setEditFormState({ ...editFormState, moldProductionType: "CUSTOMER_RENTAL", moldVendor: "고객사 대여 금형" })}
                        />
                        <span>고객사 금형 대여</span>
                      </label>
                    </div>

                    {editFormState.moldProductionType === "OUTSOURCING" && (
                      <div className="pt-1">
                        <label className="block text-[10px] text-zinc-500 mb-0.5">금형제작 외주업체 선택 (DB 연동)</label>
                        <select 
                          value={editFormState.moldVendor || ""}
                          onChange={(e) => setEditFormState({ ...editFormState, moldVendor: e.target.value })}
                          className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-bold text-purple-800"
                        >
                          <option value="">미지정 (외주업체 선택)</option>
                          {moldVendorOptions.map((v) => (
                            <option key={v.id} value={v.name}>{v.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* 2. 사출 양산 방식 */}
                  <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/30 flex flex-col gap-2">
                    <span className="font-bold text-emerald-900 flex items-center gap-1">
                      <Factory className="h-3.5 w-3.5 text-emerald-600" />
                      2. 사출 양산 방식
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input 
                          type="radio" 
                          name="editMassType" 
                          checked={editFormState.massProductionType === "OUTSOURCING" || !editFormState.massProductionType}
                          onChange={() => setEditFormState({ ...editFormState, massProductionType: "OUTSOURCING" })}
                        />
                        <span>외주 양산 (협력사)</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input 
                          type="radio" 
                          name="editMassType" 
                          checked={editFormState.massProductionType === "IN_HOUSE"}
                          onChange={() => setEditFormState({ ...editFormState, massProductionType: "IN_HOUSE", massVendor: "MPSI 자체사출라인" })}
                        />
                        <span>MPSI 자체사출</span>
                      </label>
                    </div>

                    {editFormState.massProductionType === "OUTSOURCING" && (
                      <div className="pt-1">
                        <label className="block text-[10px] text-zinc-500 mb-0.5">사출양산 외주업체 선택 (DB 연동)</label>
                        <select 
                          value={editFormState.massVendor || ""}
                          onChange={(e) => setEditFormState({ ...editFormState, massVendor: e.target.value })}
                          className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-bold text-emerald-800"
                        >
                          <option value="">미지정 (외주업체 선택)</option>
                          {massVendorOptions.map((v) => (
                            <option key={v.id} value={v.name}>{v.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 8대 핵심 공정 일정 수정 */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-lg border flex flex-col gap-2.5 text-[11px]">
                <div className="flex items-center justify-between pb-1 border-b">
                  <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-sky-600" />
                    3. 핵심 공정 일정 수정
                  </span>
                  <span className="text-[10px] text-zinc-400">등록 ➔ 견적 ➔ 수주 ➔ 킥오프 ➔ 제작일수 ➔ T1 ➔ 양산승인 ➔ 양산시작</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-0.5">1) 프로젝트 등록일</label>
                    <Input 
                      type="date"
                      value={editFormState.registeredDate || ""} 
                      onChange={(e) => setEditFormState({ ...editFormState, registeredDate: e.target.value })}
                      className="h-7 text-xs bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-0.5">2) 견적제출일</label>
                    <Input 
                      type="date"
                      value={editFormState.quoteSubmitDate || ""} 
                      onChange={(e) => setEditFormState({ ...editFormState, quoteSubmitDate: e.target.value })}
                      className="h-7 text-xs bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-0.5">3) 수주일 (발주확정)</label>
                    <Input 
                      type="date"
                      value={editFormState.orderDate || ""} 
                      onChange={(e) => setEditFormState({ ...editFormState, orderDate: e.target.value })}
                      className="h-7 text-xs bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-0.5">4) 킥오프일 (3D확정)</label>
                    <Input 
                      type="date"
                      value={editFormState.kickoffDate || ""} 
                      onChange={(e) => setEditFormState({ ...editFormState, kickoffDate: e.target.value })}
                      className="h-7 text-xs bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-0.5">5) 목표 금형 제작 일수</label>
                    <CurrencyInput 
                      value={editFormState.targetMoldDays || ""} 
                      onChange={(val) => setEditFormState({ ...editFormState, targetMoldDays: val || 0 })}
                      placeholder="예: 45"
                      className="h-7 text-xs bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-0.5 font-bold text-emerald-700">6) 목표 T1 일정</label>
                    <Input 
                      type="date"
                      value={editFormState.targetT1Date || ""} 
                      onChange={(e) => setEditFormState({ ...editFormState, targetT1Date: e.target.value })}
                      className="h-7 text-xs bg-white font-mono font-bold text-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-0.5 font-bold text-purple-700">7) 금형 출고 납기</label>
                    <Input 
                      type="date"
                      value={editFormState.moldDeliveryDate || ""} 
                      onChange={(e) => setEditFormState({ ...editFormState, moldDeliveryDate: e.target.value })}
                      className="h-7 text-xs bg-white font-mono font-bold text-purple-700"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-0.5 font-bold text-amber-700">8) 목표 양산 승인일</label>
                    <Input 
                      type="date"
                      value={editFormState.targetMassDate || ""} 
                      onChange={(e) => setEditFormState({ ...editFormState, targetMassDate: e.target.value })}
                      className="h-7 text-xs bg-white font-mono font-bold text-amber-700"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-0.5">9) 목표 양산 시작일</label>
                    <Input 
                      type="date"
                      value={editFormState.massStartDate || ""} 
                      onChange={(e) => setEditFormState({ ...editFormState, massStartDate: e.target.value })}
                      className="h-7 text-xs bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* 8대 생산 기술 정보 (RFQ Spec) */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-lg border flex flex-col gap-2.5 text-[11px]">
                <div className="flex items-center justify-between pb-1 border-b">
                  <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Settings className="h-3.5 w-3.5 text-sky-600" />
                    4. 견적 검토용 최소 8대 생산 기술 정보 (RFQ Spec)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-0.5">1. 제품 중량</label>
                    <Input 
                      value={editFormState.partWeight || ""} 
                      onChange={(e) => setEditFormState({ ...editFormState, partWeight: e.target.value })}
                      placeholder="예: 420g"
                      className="h-7 text-xs bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-0.5">2. 캐비티 수</label>
                    <Input 
                      value={editFormState.cavity || ""} 
                      onChange={(e) => setEditFormState({ ...editFormState, cavity: e.target.value })}
                      placeholder="예: 1*2 Cavity"
                      className="h-7 text-xs bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-0.5">3. 연간 볼륨(EAU)</label>
                    <CurrencyInput 
                      value={editFormState.annualVolume || ""} 
                      onChange={(val) => setEditFormState({ ...editFormState, annualVolume: val || 0 })}
                      placeholder="예: 50,000"
                      className="h-7 text-xs bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-0.5">4. 사출기 타입 / 톤수</label>
                    <Input 
                      value={editFormState.machineTon || ""} 
                      onChange={(e) => setEditFormState({ ...editFormState, machineTon: e.target.value })}
                      placeholder="예: 유압식 650T 또는 500"
                      className="h-7 text-xs bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-0.5">5. HRS (핫러너) 사양</label>
                    <Input 
                      value={editFormState.hrsSpec || ""} 
                      onChange={(e) => setEditFormState({ ...editFormState, hrsSpec: e.target.value })}
                      placeholder="예: 밸브게이트 2-Drop"
                      className="h-7 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-0.5">6. 금형 소재</label>
                    <Input 
                      value={editFormState.moldMaterial || ""} 
                      onChange={(e) => setEditFormState({ ...editFormState, moldMaterial: e.target.value })}
                      placeholder="예: NAK80, SKD61"
                      className="h-7 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-0.5">7. 원자재 (레진)</label>
                    <Input 
                      value={editFormState.resinSpec || ""} 
                      onChange={(e) => setEditFormState({ ...editFormState, resinSpec: e.target.value })}
                      placeholder="예: PP-EPDM, ABS"
                      className="h-7 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 mb-0.5">8. 보증 수명(Shot)</label>
                    <CurrencyInput 
                      value={editFormState.warrantyShots || ""} 
                      onChange={(val) => setEditFormState({ ...editFormState, warrantyShots: val || 0 })}
                      placeholder="예: 500,000"
                      className="h-7 text-xs bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* 프로젝트 특이사항 및 요구조건 (수정 가능) */}
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 mb-1 font-bold flex items-center justify-between">
                  <span>프로젝트 특이사항 및 요구조건</span>
                  <span className="text-[10px] text-amber-600 font-normal">DB 저장 및 공정 협력사 즉시 반영</span>
                </label>
                <textarea 
                  value={editFormState.notes || ""} 
                  onChange={(e) => setEditFormState({ ...editFormState, notes: e.target.value })}
                  placeholder="고객 요구 품질수준, 난성형 부위, 특이사항 등을 기재하세요."
                  className="w-full h-16 p-2.5 rounded border text-xs bg-white dark:bg-zinc-900 resize-none border-amber-300 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 border-t">
              <Button onClick={() => setIsEditProjectModalOpen(false)} variant="outline" className="h-8 px-3 text-xs">
                취소
              </Button>
              <Button 
                onClick={handleSaveEditProject}
                className="h-8 px-4 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1.5 font-bold shadow-xs"
              >
                <Check className="h-3.5 w-3.5" />
                수정 내용 저장
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* [모달 1] SCM 10대 필수 표준 양식 & IP보호 캡처 가이드 모달 (클라이언트 피드백 9 반영) */}
      {isDocGuideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white border-b">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-200" />
                <div>
                  <h3 className="font-bold text-sm">SCM 10대 표준 공정 양식 & 지적재산권(IP) 보호 캡처 가이드</h3>
                  <span className="text-[11px] text-amber-100">
                    보안 상 원본 CAD/파일 전체 제공이 제한되는 서식의 예시 캡처 및 필수 기재 항목 표준 매뉴얼
                  </span>
                </div>
              </div>
              <button onClick={() => setIsDocGuideModalOpen(false)} className="text-white/80 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 10대 양식 리스트 */}
            <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-3 text-xs">
              <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-lg border border-amber-200 text-amber-900 dark:text-amber-200 text-[11px]">
                💡 <b>지적재산권(IP) 보호 지침:</b> 원청사 2D/3D Data 및 금형 도면은 대외비이므로, 원본 파일의 무분별한 다운로드 대신 시스템 내 보안 워터마크 미리보기 및 체크리스트 예시 화면으로 갈음합니다.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    no: 1,
                    title: "금형 및 사출 견적서",
                    actor: "우성정공 / 뉴몰드 ➔ MPSI",
                    step: "Step 2",
                    required: "캐비티, 금형소재, HRS사양, 사이클타임, 네트단가, 보증쇼트",
                    protection: "금액 및 단가 정보 외주사 간 상호 블라인드 처리",
                  },
                  {
                    no: 2,
                    title: "3D, 2D Data (CAD 보안 도면)",
                    actor: "원청사 ➔ MPSI ➔ 금형사",
                    step: "Step 1",
                    required: "제품 모델링(STP/IGS), 2D 중요치수(CTQ), 공차표",
                    protection: "뷰어 전용 모드 및 회사명 워터마크 오버레이",
                  },
                  {
                    no: 3,
                    title: "CAE 해석 보고서 (성형 유동해석)",
                    actor: "금형 제작사 ➔ MPSI",
                    step: "Step 3, 5",
                    required: "웰드라인, 에어트랩, 변형 예측, 게이트 위치 적합성",
                    protection: "주요 해석 결과 그래프 및 캡처 요약본 등록",
                  },
                  {
                    no: 4,
                    title: "제품 DR(Design Review) 자료",
                    actor: "MPSI ➔ 원청 고객사",
                    step: "Step 3",
                    required: "살두께 편차 보정, 언더컷 해소, 구배각 수정 요청안",
                    protection: "도면 변경 전/후 비교 캡처 및 변경 사유서",
                  },
                  {
                    no: 5,
                    title: "금형제작 발주서 (T1 및 납기 포함)",
                    actor: "MPSI ➔ 금형 제작사",
                    step: "Step 4",
                    required: "T1 목표일, 최종 납기, 결제조건, 지체상금 기준",
                    protection: "MPSI 표준 전자 발주서 양식 사용",
                  },
                  {
                    no: 6,
                    title: "금형 DR(금형구조 리뷰) 자료",
                    actor: "금형 제작사 ➔ MPSI",
                    step: "Step 5",
                    required: "몰드베이스 규격, 슬라이드/경사코어 구조, 냉각라인 배치",
                    protection: "금형 단면 3D 캡처 및 간섭 체크리스트",
                  },
                  {
                    no: 7,
                    title: "금형제작 사양서",
                    actor: "MPSI ➔ 금형 제작사",
                    step: "Step 5",
                    required: "강재 보증서(밀시트), 열처리 경도(HRC), 표면 부식사양",
                    protection: "MPSI 표준 금형제작 기술규격서",
                  },
                  {
                    no: 8,
                    title: "공정 일정표 (WBS 마일스톤)",
                    actor: "금형 제작사 / MPSI",
                    step: "Step 7",
                    required: "건드릴, 밀링, CNC, 방전, 사상, 조립 주간 공정률",
                    protection: "SCM 시스템 내 공정 진척도 바인딩",
                  },
                  {
                    no: 9,
                    title: "시사출 보고서 (T1~Tn)",
                    actor: "사출 협력사 / MPSI",
                    step: "Step 8, 10",
                    required: "성형 조건표(온도/압력/시간), 초품 수량, 불량 유형",
                    protection: "성형 조건표 및 불량 부위 사진 캡처",
                  },
                  {
                    no: 10,
                    title: "금형승인원 & 금형검사 체크리스트",
                    actor: "MPSI / 사출사 / 고객사",
                    step: "Step 9, 12",
                    required: "전항목 치수 성적서, 외관 합격 판정, 작동 점검 30개항",
                    protection: "3사 전자서명 날인 및 PPAP 최종 패키지 연계",
                  },
                ].map((doc) => (
                  <div key={doc.no} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <span className="h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono flex items-center justify-center text-[10px] font-bold">
                          {doc.no}
                        </span>
                        {doc.title}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 text-[10px] font-mono font-bold">
                        {doc.step}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      <b>담당 주체:</b> {doc.actor}
                    </div>
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      <b>필수 항목:</b> {doc.required}
                    </div>
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded border border-emerald-200">
                      🔒 <b>IP 보호/제공 방식:</b> {doc.protection}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 푸터 */}
            <div className="flex items-center justify-end p-3 bg-zinc-50 dark:bg-zinc-800 border-t">
              <Button onClick={() => setIsDocGuideModalOpen(false)} className="h-8 px-4 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold">
                확인 완료
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* [모달 2] 외주 협력사 SMS/알림톡 긴급 통보 모달 (클라이언트 피드백 5 반영) */}
      {isSmsModalOpen && smsTargetProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border rounded-xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-3.5 bg-amber-600 text-white border-b">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-amber-200" />
                <h3 className="font-bold text-sm">협력사 SMS / 카카오 알림톡 긴급 통보</h3>
              </div>
              <button onClick={() => setIsSmsModalOpen(false)} className="text-white/80 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3 text-xs">
              <div className="bg-zinc-50 dark:bg-zinc-800 p-2.5 rounded border text-[11px] flex flex-col gap-1">
                <div><span className="text-zinc-500">대상 프로젝트:</span> <b className="font-mono text-sky-600 ml-1">[{smsTargetProject.projectNo}] {smsTargetProject.projectName}</b></div>
                <div><span className="text-zinc-500">수신 협력사:</span> <b className="text-purple-700 ml-1">{smsTargetProject.moldVendor} (금형) / {smsTargetProject.massVendor} (사출)</b></div>
              </div>

              <div>
                <label className="block text-zinc-600 font-bold mb-1">통보 유형 선택</label>
                <select
                  value={smsMessageType}
                  onChange={(e) => setSmsMessageType(e.target.value as any)}
                  className="h-8 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-bold text-zinc-800"
                >
                  <option value="도면수정요청(DR)">도면수정요청 (DR 긴급 알림)</option>
                  <option value="시사출일정통보">시사출 (T1/T2) 일정 확정 통보</option>
                  <option value="품질개선요청">치수/외관 불량 보정 수정 요청 (Fail 루프)</option>
                  <option value="PPAP심사결과">PPAP 양산승인 판정 통보</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-600 font-bold mb-1">문자 / 알림톡 메시지 내용</label>
                <textarea
                  value={smsMessageContent}
                  onChange={(e) => setSmsMessageContent(e.target.value)}
                  className="w-full h-24 p-2.5 rounded border text-xs bg-white dark:bg-zinc-900 resize-none font-mono"
                  placeholder="협력사 담당자에게 전달할 요청사항을 입력하세요."
                />
              </div>

              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded border border-emerald-200 text-emerald-800 dark:text-emerald-300 text-[11px] flex items-center justify-between">
                <span>📱 협력사 수신 확인 추적 연동됨</span>
                <span className="font-bold">발송 즉시 확인 타임스탬프 기록</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 border-t">
              <Button onClick={() => setIsSmsModalOpen(false)} variant="outline" className="h-8 px-3 text-xs">
                취소
              </Button>
              <Button
                onClick={() => {
                  showToast(`[SMS 발송 완료] ${smsTargetProject.moldVendor} 담당자에게 [${smsMessageType}] 문자가 발송되었습니다.`, "success");
                  setIsSmsModalOpen(false);
                }}
                className="h-8 px-4 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1"
              >
                <Send className="h-3.5 w-3.5" />
                SMS 즉시 전송
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* [모달 3] 견적/고객 답변 대기 ➔ 공식 프로젝트 관리번호 부여 전환 모달 */}
      {isConvertModalOpen && convertTargetProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border rounded-xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-3.5 bg-sky-600 text-white border-b">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-sky-200" />
                <h3 className="font-bold text-sm">고객사 수주 확정 ➔ 정식 프로젝트 번호(MI) 부여</h3>
              </div>
              <button onClick={() => setIsConvertModalOpen(false)} className="text-white/80 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3 text-xs">
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded border border-amber-200 text-amber-900 dark:text-amber-200 text-[11px]">
                견적 단계(`{convertTargetProject.projectNo}`)의 프로젝트가 고객사 수주 성공되었습니다.
                정식 프로젝트 번호(MI)와 금형번호를 부여하여 1단계(도면접수) 공식 프로젝트로 전환합니다.
              </div>

              <div>
                <label className="block text-zinc-600 font-bold mb-1">기존 견적 번호</label>
                <Input value={convertTargetProject.projectNo} disabled className="h-7 text-xs bg-zinc-100 font-mono" />
              </div>

              <div>
                <label className="block text-zinc-600 font-bold mb-1 text-sky-700">부여할 정식 프로젝트 번호 (MI, PK)</label>
                <Input 
                  value={inputOfficialProjectNo} 
                  onChange={(e) => setInputOfficialProjectNo(e.target.value)} 
                  placeholder="예: MI26001P0"
                  className="h-8 text-xs font-mono font-bold border-sky-400 bg-white"
                />
              </div>

              <div>
                <label className="block text-zinc-600 font-bold mb-1">부여할 금형 번호 (패밀리 금형 지원)</label>
                <Input 
                  value={inputOfficialMoldNo} 
                  onChange={(e) => setInputOfficialMoldNo(e.target.value)} 
                  placeholder="예: MI25004M"
                  className="h-8 text-xs font-mono bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 border-t">
              <Button onClick={() => setIsConvertModalOpen(false)} variant="outline" className="h-8 px-3 text-xs">
                취소
              </Button>
              <Button
                onClick={() => {
                  if (!inputOfficialProjectNo.trim()) {
                    alert("정식 관리번호를 입력해주세요.");
                    return;
                  }
                  convertQuoteToOfficial(convertTargetProject.projectNo, inputOfficialProjectNo.trim(), inputOfficialMoldNo.trim());
                  showToast(`[수주 확정 완료] ${convertTargetProject.projectNo} ➔ ${inputOfficialProjectNo.trim()} 정식 프로젝트로 전환되었습니다.`, "success");
                  setIsConvertModalOpen(false);
                  setIncludeDev(true);
                  setIncludeQuote(false);
                }}
                className="h-8 px-4 text-xs bg-sky-600 hover:bg-sky-700 text-white font-bold gap-1"
              >
                <Check className="h-3.5 w-3.5" />
                수주 확정 전환
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* [모달 4] MPSI 설계변경(E채번) 발의 및 상태 전환 모달 */}
      {isRevisionModalOpen && revisionTargetProject && (() => {
        const curCode = revisionTargetProject.changeType || "N001";
        const nextCode = curCode.startsWith("E")
          ? `E${String((parseInt(curCode.replace("E", ""), 10) || 1) + 1).padStart(3, "0")}`
          : "E001";
        const isSelfMold = revisionTargetProject.moldProductionType === "IN_HOUSE";
        const isSelfMass = revisionTargetProject.massProductionType === "IN_HOUSE";

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 border rounded-xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden max-h-[92vh]">
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between p-4 bg-amber-600 text-white border-b">
                <div className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-amber-200" />
                  <div>
                    <h3 className="font-bold text-sm">
                      MPSI 설계변경(E채번) 발의 및 프로세스 재개
                    </h3>
                    <span className="text-[11px] text-amber-100">
                      신작({curCode}) ➔ 설계변경({nextCode}) 상태 전환 관제
                    </span>
                  </div>
                </div>
                <button onClick={() => setIsRevisionModalOpen(false)} className="text-white/80 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* 본문 */}
              <div className="p-4 flex flex-col gap-3.5 text-xs overflow-y-auto">
                {/* 1. 핵심 규칙 가이드 알림창 */}
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300">
                    <Info className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>설계변경 운영 규칙 (외주사 견적배포 생략 및 직통 견적접수)</span>
                  </div>
                  <div>• <b>외주 배포 생략:</b> 금형처와 양산처가 이미 확정되어 있으므로, <b>타 외주처 RFP 견적 배포 단계는 건너뜁니다.</b></div>
                  <div>• <b>프로세스 재개:</b> 지정된 협력사로부터 <b>설변 견적(금형수정비 + 사출단가 변동)을 접수받는 Step 0부터 즉시 재개</b>됩니다.</div>
                  <div>• <b>양산처 권한 통제:</b> 외주 양산처 포털(<code>/vendor-portal/mass/revision</code>)에는 '설변 중' 상태가 반영되며, <b>양산처는 상태를 임의 변경할 수 없고 확인/조회만 가능</b>합니다.</div>
                  {(isSelfMold || isSelfMass) && (
                    <div className="text-indigo-800 dark:text-indigo-300 font-medium">
                      • <b>자체 생산 연동:</b> {isSelfMold ? "[금형: MPSI 자체제작팀] " : ""}{isSelfMass ? "[사출: MPSI 자체사출라인] " : ""}사내 원가 및 기술 검토로 직행합니다.
                    </div>
                  )}
                </div>

                {/* 2. 프로젝트 기본 정보 및 차수 전환 */}
                <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-lg border grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">프로젝트 관리번호</span>
                    <b className="font-mono text-zinc-800 dark:text-zinc-200">{revisionTargetProject.projectNo}</b>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">고객사 / 프로젝트</span>
                    <b className="text-zinc-800 dark:text-zinc-200 truncate block">{revisionTargetProject.customerName} ({revisionTargetProject.projectName})</b>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">금형번호 / 금형차수</span>
                    <b className="font-mono text-purple-700 dark:text-purple-300 block">{revisionTargetProject.moldNo} [{revisionTargetProject.moldDegree || "M1"}]</b>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">차수 채번 전환</span>
                    <div className="flex items-center gap-1 font-mono font-bold mt-0.5">
                      <span className="px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 text-[10px]">{curCode}</span>
                      <ArrowRight className="h-3 w-3 text-zinc-400" />
                      <span className="px-1.5 py-0.2 rounded bg-purple-600 text-white text-[10px] font-extrabold">{nextCode}</span>
                    </div>
                  </div>
                </div>

                {/* 3. 지정 금형처 및 양산처 안내 (타사 비딩 없음) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-lg border bg-purple-50/60 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
                    <span className="text-[10px] text-purple-700 dark:text-purple-300 font-bold block">1. 지정 금형처 (설변 금형견적 접수)</span>
                    <b className="text-zinc-800 dark:text-zinc-200 mt-0.5 block">{revisionTargetProject.moldVendor} {isSelfMold ? "(MPSI 사내팀)" : "(외주 지정처)"}</b>
                  </div>
                  <div className="p-2.5 rounded-lg border bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold block">2. 지정 사출양산처 (설변 단가견적 접수)</span>
                    <b className="text-zinc-800 dark:text-zinc-200 mt-0.5 block">{revisionTargetProject.massVendor} {isSelfMass ? "(MPSI 사내팀)" : "(외주 지정처)"}</b>
                  </div>
                </div>

                {/* 4. 설계변경 사유 입력 */}
                <div>
                  <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">
                    설계변경 발의 사유 및 변경 내역 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={revisionReason}
                    onChange={(e) => setRevisionReason(e.target.value)}
                    rows={3}
                    className="w-full p-2.5 rounded-lg border text-xs bg-white dark:bg-zinc-800 font-medium resize-none leading-relaxed"
                    placeholder="예: 고객사 제품도면 Rev2.0 접수 (조립 리브 보강, 중량 +3.2g, CT +1.5초 변동)에 따른 금형 수정비 및 사출 단가 재산정"
                  />
                </div>
              </div>

              {/* 모달 푸터 */}
              <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800 border-t">
                <Button onClick={() => setIsRevisionModalOpen(false)} variant="outline" className="h-8 px-3 text-xs">
                  취소
                </Button>
                <Button
                  onClick={() => {
                    const finalReason = revisionReason.trim() || `도면 변경 및 단가 변동에 따른 ${nextCode} 설계변경 착수`;
                    const generated = triggerProjectRevision(revisionTargetProject.projectNo, finalReason, "MPSI 기술본부");
                    showToast(`[설계변경 발의 완료] ${revisionTargetProject.projectNo} 프로젝트가 [${generated}] 설계변경 상태로 전환되었습니다.`, "success");
                    setIsRevisionModalOpen(false);
                    // 13단계 모달 내 대상 프로젝트도 갱신
                    if (selectedItem?.projectNo === revisionTargetProject.projectNo) {
                      setSelectedItem((prev) => prev ? {
                        ...prev,
                        changeType: generated,
                        currentStep: 0,
                        stepStatus: "진행중",
                        stepNameCustom: `설변 견적 접수 (${generated})`,
                        facilityEvent: "설계변경중 (A/S)",
                      } : null);
                    }
                  }}
                  className="h-8 px-4 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5 shadow-sm"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  <span>설계변경({nextCode}) 공식 발의 확정</span>
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* [모달 5] 신작/설변 차수별 이력 조회 모달 (N001, E001, E002...) */}
      {isHistoryModalOpen && historyTargetProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border rounded-xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden max-h-[90vh]">
            <div className="flex items-center justify-between p-4 bg-[#1e293b] text-white border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-sky-400" />
                <div>
                  <h3 className="font-bold text-sm">
                    신작 / 설계변경(E) 차수별 통합 이력 대장
                  </h3>
                  <span className="text-[11px] text-slate-300">
                    [{historyTargetProject.projectNo}] {historyTargetProject.projectName} - {historyTargetProject.productName}
                  </span>
                </div>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-white/80 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-4 overflow-y-auto text-xs bg-zinc-50/50 dark:bg-zinc-900/50">
              {/* 프로젝트 상단 메타 */}
              <div className="p-3 bg-white dark:bg-zinc-800 rounded-lg border shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div><span className="text-zinc-500">원청 고객사:</span> <b className="text-zinc-800 dark:text-zinc-200 ml-1">{historyTargetProject.customerName}</b></div>
                <div><span className="text-zinc-500">제품 품번:</span> <b className="font-mono text-zinc-800 dark:text-zinc-200 ml-1">{historyTargetProject.partNo || "-"}</b></div>
                <div><span className="text-zinc-500">금형번호:</span> <b className="font-mono text-purple-700 dark:text-purple-300 ml-1">{historyTargetProject.moldNo} [{historyTargetProject.moldDegree || "M1"}]</b></div>
                <div><span className="text-zinc-500">현재 차수:</span> <b className="font-mono text-amber-600 font-extrabold ml-1">{historyTargetProject.changeType || "N001"}</b></div>
              </div>

              {/* 차수별 이력 리스트 (N001 ➔ E001 ➔ E002) */}
              <div className="space-y-3.5">
                {/* 1. N001 초도 신작 이력 */}
                <div className="p-3.5 bg-white dark:bg-zinc-800 rounded-xl border border-sky-200 dark:border-sky-900 shadow-xs flex flex-col gap-2">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-sky-100 text-sky-800 border border-sky-300">
                        N001
                      </span>
                      <span className="font-bold text-xs text-zinc-800 dark:text-zinc-100">초도 신작 승인 및 양산 진입</span>
                    </div>
                    <span className="text-[11px] text-zinc-500 font-mono">2026-03-15</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px] pt-1">
                    <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900/60 border">
                      <span className="font-bold text-sky-700 dark:text-sky-300 block mb-0.5">• 3D 제품 모델 검토 승인</span>
                      <p className="text-zinc-600 dark:text-zinc-400">3D CAD CATIA V5 모델링 v1.0 최종 검토 승인 (원판/코어 수축률 0.5% 반영)</p>
                    </div>
                    <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900/60 border">
                      <span className="font-bold text-purple-700 dark:text-purple-300 block mb-0.5">• 금형비 견적 검토 확정</span>
                      <p className="text-zinc-600 dark:text-zinc-400">신작 금형제작비 125,000,000원 / 개당 사출 단가 2,450원 원청사 최종 확정</p>
                    </div>
                    <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900/60 border">
                      <span className="font-bold text-indigo-700 dark:text-indigo-300 block mb-0.5">• 금형처 시사출 보고서</span>
                      <p className="text-zinc-600 dark:text-zinc-400">{historyTargetProject.moldVendor} T1~T3 시사출 성적서 CMM 공차 100% 만족 합격</p>
                    </div>
                    <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900/60 border">
                      <span className="font-bold text-emerald-700 dark:text-emerald-300 block mb-0.5">• 양산처 시양산 보고서</span>
                      <p className="text-zinc-600 dark:text-zinc-400">{historyTargetProject.massVendor} 12H 연속사출 Cpk 1.42 달성 및 PPAP 패키지 최종 승인</p>
                    </div>
                  </div>
                </div>

                {/* 2. E001 설계변경 이력 (현재 상태가 E001 이상인 경우 표시) */}
                {(historyTargetProject.changeType?.startsWith("E")) && (
                  <div className="p-3.5 bg-white dark:bg-zinc-800 rounded-xl border border-purple-200 dark:border-purple-900 shadow-xs flex flex-col gap-2">
                    <div className="flex items-center justify-between pb-2 border-b">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-purple-100 text-purple-800 border border-purple-300">
                          {historyTargetProject.changeType || "E001"}
                        </span>
                        <span className="font-bold text-xs text-zinc-800 dark:text-zinc-100">1차 설계변경 (리브 보강 및 단가 변동 조정)</span>
                      </div>
                      <span className="text-[11px] text-zinc-500 font-mono">2026-10-10</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px] pt-1">
                      <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900/60 border">
                        <span className="font-bold text-sky-700 dark:text-sky-300 block mb-0.5">• 3D 제품 모델 검토 승인</span>
                        <p className="text-zinc-600 dark:text-zinc-400">원청사 2D/3D 도면 v2.0 변경 접수 및 B면 조립 리브 두께 1.2mm 보강 승인 (중량 +3.2g)</p>
                      </div>
                      <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900/60 border">
                        <span className="font-bold text-purple-700 dark:text-purple-300 block mb-0.5">• 금형비 견적 검토 확정 (금형견적, 사출견적)</span>
                        <p className="text-zinc-600 dark:text-zinc-400">지정 금형처 금형 수정비 9,800,000원 / 사출 단가 +35원 변동 조정 확정 (타사 배포 생략)</p>
                      </div>
                      <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900/60 border">
                        <span className="font-bold text-indigo-700 dark:text-indigo-300 block mb-0.5">• 금형처 시사출 보고서</span>
                        <p className="text-zinc-600 dark:text-zinc-400">{historyTargetProject.moldVendor} 방전 및 와이어 가공 보정 및 수정 T1 샘플 검사 적합</p>
                      </div>
                      <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900/60 border">
                        <span className="font-bold text-emerald-700 dark:text-emerald-300 block mb-0.5">• 양산처 시양산 보고서</span>
                        <p className="text-zinc-600 dark:text-zinc-400">{historyTargetProject.massVendor} 금형 이관 후 시양산 및 재양산 승인 진행 중</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800 border-t">
              <span className="text-[11px] text-zinc-500">
                SCM 신작(N) 및 설계변경(E) 이력이 통합 관리됩니다.
              </span>
              <Button onClick={() => setIsHistoryModalOpen(false)} className="h-8 px-4 text-xs bg-zinc-800 hover:bg-zinc-700 text-white font-bold">
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* [공통 모달] 공정 단계별 첨부파일 등록 모달 (FileUploader 연동) */}
      {stepAttachModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border rounded-xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-3.5 bg-sky-600 text-white">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-sky-200" />
                <h3 className="font-bold text-xs">
                  공정 첨부파일 등록 ({stepAttachModal.stepTitle})
                </h3>
              </div>
              <button onClick={() => setStepAttachModal(null)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <FileUploader
                label="첨부파일 선택 또는 드래그"
                required
                accept=".dwg,.dxf,.stp,.step,.x_t,.catpart,.pdf,.xlsx,.xls,.zip"
                maxSizeMB={100}
                value={stepAttachModal.uploadedFile || undefined}
                onSingleChange={(file) => {
                  setStepAttachModal(prev => prev ? { ...prev, uploadedFile: file } : null);
                }}
                description="CAD도면(STP,DWG), 성적서(PDF), 공정표(XLSX), 압축파일(ZIP)"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStepAttachModal(null)}
                className="h-8 text-xs"
              >
                취소
              </Button>
              <Button
                size="sm"
                disabled={!stepAttachModal.uploadedFile || isUploadingAttach}
                onClick={async () => {
                  if (!stepAttachModal.uploadedFile) return;
                  const f = stepAttachModal.uploadedFile;
                  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];

                  setIsUploadingAttach(true);
                  try {
                    let fileUrl = "";
                    let downloadUrl = "";
                    if (f.file) {
                      const formData = new FormData();
                      formData.append("file", f.file);
                      const res = await fetch("/api/v1/files/upload", {
                        method: "POST",
                        body: formData,
                      });
                      const json = await res.json();
                      if (res.ok && json.success) {
                        fileUrl = json.fileUrl;
                        downloadUrl = json.downloadUrl;
                      }
                    }

                    await addStepAttachment(stepAttachModal.projectId, stepAttachModal.step, {
                      name: f.name,
                      size: f.size || "1.0 MB",
                      date: today,
                      ext: f.extension,
                      url: fileUrl || downloadUrl || `/uploads/${encodeURIComponent(f.name)}`,
                    });
                    showToast(`'${f.name}' 파일이 성공적으로 등록되었습니다. (DB 동기화 완료)`, "success");
                    setStepAttachModal(null);
                  } catch (err: any) {
                    console.error("Step attachment upload error:", err);
                    showToast(`파일 업로드 실패: ${err.message}`, "warning");
                  } finally {
                    setIsUploadingAttach(false);
                  }
                }}
                className="h-8 text-xs bg-sky-600 hover:bg-sky-700 text-white font-bold gap-1 cursor-pointer disabled:opacity-50"
              >
                {isUploadingAttach ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    업로드 중...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    첨부 등록 완료
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* [공통 모달] 공정 단계별 실무 메모 수정 모달 */}
      {stepMemoModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border rounded-xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-3.5 bg-amber-600 text-white">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-200" />
                <h3 className="font-bold text-xs">
                  공정 실무 메모 수정 ({stepMemoModal.stepTitle})
                </h3>
              </div>
              <button onClick={() => setStepMemoModal(null)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-2">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                실무 특이사항 및 업무 진행 메모
              </label>
              <textarea
                value={stepMemoModal.memo}
                onChange={(e) => setStepMemoModal(prev => prev ? { ...prev, memo: e.target.value } : null)}
                placeholder="공정 진행 세부 협의 내용이나 현장 특이사항을 입력하세요..."
                className="w-full h-32 p-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStepMemoModal(null)}
                className="h-8 text-xs"
              >
                취소
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  updateStepMemo(stepMemoModal.projectId, stepMemoModal.step, stepMemoModal.memo.trim());
                  showToast("공정 실무 메모가 성공적으로 저장되었습니다.", "success");
                  setStepMemoModal(null);
                }}
                className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                메모 저장
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
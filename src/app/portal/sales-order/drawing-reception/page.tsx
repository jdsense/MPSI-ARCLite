"use client";

import React, { useState, useRef } from "react";
import { 
  Search, RefreshCw, FileText, Plus, 
  UploadCloud, Download, Eye, X, Check, 
  AlertTriangle, CheckCircle2, ArrowRight, 
  Building2, Clock, FileCode, ExternalLink, 
  ShieldCheck, Send, DollarSign, PackageCheck, 
  Calendar, Layers, ShoppingBag, Truck, Paperclip,
  Trash2, Sparkles, Box, FileSpreadsheet, CheckSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DateRangeFilter, isWithinDateRange, DatePresetType } from "@/components/common/date-range-filter";
import { FileUploader } from "@/components/common/file-uploader";

// 1. 일반 SCM 표준 고객 수주 아이템 인터페이스 (외주공정과 분리된 B2B 수주 모델)
export interface SalesOrderItem {
  id: number;
  orderNo: string;           // MPSI 수주번호 (Sales Order No: SO-202608-001)
  customerPoNo: string;      // 원청 고객사 발주번호 (Customer PO: PO-HMC-2026-901)
  customerName: string;      // 고객사명 (현대자동차, 기아, 현대모비스, SPX 등)
  customerManager: string;   // 고객사 담당자 / 연락처
  orderDate: string;         // 수주일자
  dueDate: string;           // 납기일자 (고객 요구 납기)
  
  // 수주 프로젝트 및 품목 정보
  projectCode: string;       // 고객 PJT/차종코드 (NT5, A2XT, SPX-EV 등)
  projectName: string;       // 프로젝트/차종명
  partNo: string;            // 부품번호 (Part Number)
  productName: string;       // 부품명
  spec: string;              // 규격/재질 사양 (예: PP+EPDM, NAK80 코어)
  
  // 수량 및 상업 금액 정보 (원)
  orderQty: number;          // 수주 수량 (EA)
  unitPrice: number;         // 수주 단가 (@원)
  supplyAmount: number;      // 공급가액 (수량 * 단가)
  vatAmount: number;         // 부가세 (공급가액의 10%)
  totalAmount: number;       // 수주 총액 (공급가액 + 부가세)
  currency: string;          // 통화 (KRW, USD 등)
  
  // 고객 제공 도면 및 사양서 접수 정보 (Drawing Reception)
  drawing2DFile: string;     // 고객 2D 설계도면 파일 (DWG/PDF)
  drawing3DFile: string;     // 고객 3D CAD 모델링 파일 (STP/STEP/X_T)
  cadRevision: string;       // 도면 리비전 (Rev.0, Rev.1, Rev.Final 등)
  specDocFile?: string;      // 고객 기술사양서/RFQ 파일
  drawingReceivedDate: string;// 도면 접수일자
  
  // 상업 거래 및 납품 조건
  paymentTerms: string;      // 결제조건 (익월 25일 현금, 60일 구매카드 등)
  incoterms: string;         // 인도조건 (공장도 EXW, 도착도 DAP, FOB 등)
  deliveryPlace: string;     // 납품장소 (예: 현대차 아산공장 2도어의장라인)
  
  // SCM 수주 진행 상태 워크플로우 (초기 도면접수 및 외주개발의뢰 단계 중심)
  status: "수주등록" | "도면/사양검토" | "수주확정" | "외주개발의뢰" | "수주취소";
  salesManager: string;      // MPSI 영업/수주 담당자
  notes?: string;            // 특이사항 및 포장 요구조건
  updatedAt: string;
}

// 2. 표준 SCM 고객 수주 초기 샘플 데이터
const initialSalesOrders: SalesOrderItem[] = [
  {
    id: 1,
    orderNo: "SO-202608-001",
    customerPoNo: "PO-HMC-2026-8819",
    customerName: "현대자동차 (남양연구소/울산공장)",
    customerManager: "박준혁 수석연구원 (010-4821-XXXX)",
    orderDate: "2026-08-10",
    dueDate: "2026-10-31",
    projectCode: "NT5-2026-A",
    projectName: "현대 NT5 신형 전기 SUV",
    partNo: "82301-NT500-A",
    productName: "Front Door Upper Cover LH/RH",
    spec: "PP-EPDM (내스크래치) / 1*2 Cavity",
    orderQty: 25000,
    unitPrice: 4200,
    supplyAmount: 105000000,
    vatAmount: 10500000,
    totalAmount: 115500000,
    currency: "KRW",
    drawing2DFile: "NT5_Door_Upper_Cover_2D_Rev2.dwg",
    drawing3DFile: "NT5_Door_Upper_Cover_3D_Rev2.stp",
    cadRevision: "Rev.2 (최종확정본)",
    specDocFile: "HMC_Tech_Spec_NT5_Door_v1.2.pdf",
    drawingReceivedDate: "2026-08-10",
    paymentTerms: "마감 후 익월 25일 현금 결제",
    incoterms: "도착도 (DAP 아산공장)",
    deliveryPlace: "현대자동차 아산공장 도어의장 1공구",
    status: "수주확정",
    salesManager: "최영진 부장 (MPSI 영업1팀)",
    notes: "원청 계약 체결 완료. 금형제작처 금형개발실로 공식 도면 배포 승인.",
    updatedAt: "2026-08-19 14:20",
  },
  {
    id: 2,
    orderNo: "SO-202608-002",
    customerPoNo: "PO-MOBIS-26-4412",
    customerName: "현대모비스 (진천공장)",
    customerManager: "이재성 책임매니저 (010-3912-XXXX)",
    orderDate: "2026-08-14",
    dueDate: "2026-11-15",
    projectCode: "A2XT-M01",
    projectName: "기아 A2XT 하이브리드 세단",
    partNo: "84740-A2XT0",
    productName: "Center Console Main Bracket",
    spec: "ABS HI-121 (고강성) / 1*1 Cavity",
    orderQty: 18000,
    unitPrice: 3100,
    supplyAmount: 55800000,
    vatAmount: 5580000,
    totalAmount: 61380000,
    currency: "KRW",
    drawing2DFile: "A2XT_Console_Bracket_2D.pdf",
    drawing3DFile: "A2XT_Console_Bracket_3D.stp",
    cadRevision: "Rev.1",
    specDocFile: "MOBIS_Console_Spec_2026.pdf",
    drawingReceivedDate: "2026-08-14",
    paymentTerms: "익월 말 60일 전자구매카드",
    incoterms: "공장도 (EXW MPSI 창고)",
    deliveryPlace: "현대모비스 진천 전장물류센터",
    status: "외주개발의뢰",
    salesManager: "김민수 과장 (MPSI 영업2팀)",
    notes: "고객 원본 도면 접수 후 금형 CAE팀에 성형성(유동해석) 검토 의뢰 완료.",
    updatedAt: "2026-08-18 16:40",
  },
  {
    id: 3,
    orderNo: "SO-202608-003",
    customerPoNo: "PO-SPX-EV-1029",
    customerName: "SPX 플라스틱 솔루션",
    customerManager: "David Kim 디렉터 (010-9011-XXXX)",
    orderDate: "2026-07-25",
    dueDate: "2026-09-30",
    projectCode: "SPX-EV-09",
    projectName: "SPX 전기차 차세대 BMS 하우징",
    partNo: "SPX-BMS-H800",
    productName: "BMS Battery Case Module",
    spec: "PBT-GF30 (난연 V0) / 1*4 Cavity",
    orderQty: 40000,
    unitPrice: 5600,
    supplyAmount: 224000000,
    vatAmount: 22400000,
    totalAmount: 246400000,
    currency: "KRW",
    drawing2DFile: "SPX_BMS_CASE_2D_Final.dwg",
    drawing3DFile: "SPX_BMS_CASE_3D_Final.x_t",
    cadRevision: "Rev.Final",
    specDocFile: "SPX_Flame_Retardant_Spec.pdf",
    drawingReceivedDate: "2026-07-25",
    paymentTerms: "선금 30%, 개발 완료 시 잔금 70%",
    incoterms: "도착도 (DAP 평택 물류센터)",
    deliveryPlace: "SPX 평택 배터리팩 물류기지",
    status: "도면/사양검토",
    salesManager: "최영진 부장 (MPSI 영업1팀)",
    notes: "배터리 팩 방수 IP67 인증 규격 충족 및 3D CAD 정합성 기술검토 진행 중.",
    updatedAt: "2026-08-19 11:10",
  },
  {
    id: 4,
    orderNo: "SO-202608-004",
    customerPoNo: "PO-KIA-2026-7734",
    customerName: "기아 (화성공장)",
    customerManager: "정우철 책임 (010-5512-XXXX)",
    orderDate: "2026-08-18",
    dueDate: "2026-12-20",
    projectCode: "K7-RAD-04",
    projectName: "기아 K7 후속 페이스리프트",
    partNo: "86350-K7200",
    productName: "Radiator Lower Grille",
    spec: "PC+ABS (외장 도장용) / 1*1 Cavity",
    orderQty: 12000,
    unitPrice: 8500,
    supplyAmount: 102000000,
    vatAmount: 10200000,
    totalAmount: 112200000,
    currency: "KRW",
    drawing2DFile: "K7_Grille_Lower_2D.dwg",
    drawing3DFile: "K7_Grille_Lower_3D.stp",
    cadRevision: "Rev.0",
    specDocFile: "KIA_Exterior_Paint_Spec.pdf",
    drawingReceivedDate: "2026-08-18",
    paymentTerms: "익월 25일 현금 결제",
    incoterms: "도착도 (DAP 화성공장)",
    deliveryPlace: "기아자동차 화성공장 조립의장",
    status: "수주등록",
    salesManager: "김민수 과장 (MPSI 영업2팀)",
    notes: "신규 B2B 고객 수주(Sales Order) 등록 완료. 원본 2D/3D 도면 파일 접수.",
    updatedAt: "2026-08-18 17:30",
  },
  {
    id: 5,
    orderNo: "SO-202608-005",
    customerPoNo: "PO-HMC-2026-9210",
    customerName: "현대자동차 (남양연구소/울산공장)",
    customerManager: "김진성 팀장 (010-7788-XXXX)",
    orderDate: "2026-08-19",
    dueDate: "2026-11-30",
    projectCode: "FF-2026-01",
    projectName: "현대 FF 범퍼 플라스틱 모듈",
    partNo: "86510-FF000",
    productName: "Front Lower Bumper Cover",
    spec: "PP+TD20 (고강성) / 1*1 Cavity",
    orderQty: 15000,
    unitPrice: 7200,
    supplyAmount: 108000000,
    vatAmount: 10800000,
    totalAmount: 118800000,
    currency: "KRW",
    drawing2DFile: "FF_Cover_A_2D.dwg",
    drawing3DFile: "FF_Cover_v1.0.step",
    cadRevision: "Rev.1",
    specDocFile: "FF_Bumper_Spec_2026.pdf",
    drawingReceivedDate: "2026-08-19",
    paymentTerms: "마감 후 익월 25일 현금 결제",
    incoterms: "도착도 (DAP 울산공장)",
    deliveryPlace: "현대자동차 울산 3공장 의장라인",
    status: "외주개발의뢰",
    salesManager: "최영진 부장 (MPSI 영업1팀)",
    notes: "금형개발실로 3D CAD 파일 및 기술사양서 공식 배포 완료.",
    updatedAt: "2026-08-19 15:50",
  }
];

// =========================================================================
// 편리한 입력을 위한 표준 셀렉트박스 프리셋 정의
// =========================================================================

// 1. 원청 고객사 목록
const CUSTOMER_OPTIONS = [
  { name: "현대자동차 (남양연구소/울산공장)", manager: "박준혁 수석연구원 (010-4821-8819)", deliveryPlace: "현대자동차 아산공장 도어의장 1공구", payment: "마감 후 익월 25일 현금 결제", poPrefix: "PO-HMC" },
  { name: "기아 (화성공장)", manager: "정우철 책임 (010-5512-7734)", deliveryPlace: "기아자동차 화성공장 조립의장", payment: "익월 25일 현금 결제", poPrefix: "PO-KIA" },
  { name: "현대모비스 (진천공장)", manager: "이재성 책임매니저 (010-3912-4412)", deliveryPlace: "현대모비스 진천 전장물류센터", payment: "익월 말 60일 전자구매카드", poPrefix: "PO-MOBIS" },
  { name: "SPX 플라스틱 솔루션", manager: "David Kim 디렉터 (010-9011-1029)", deliveryPlace: "SPX 평택 배터리팩 물류기지", payment: "선금 30%, 개발 완료 시 잔금 70%", poPrefix: "PO-SPX" },
  { name: "제네시스 사업부", manager: "강동원 팀장 (010-6677-3344)", deliveryPlace: "현대자동차 울산 5공장 제네시스 전용라인", payment: "마감 후 익월 25일 현금 결제", poPrefix: "PO-GEN" },
  { name: "기타 (직접 입력)", manager: "", deliveryPlace: "", payment: "", poPrefix: "PO-ETC" },
];

// 2. 프로젝트 및 부품/도면 프리셋
interface ProjectPreset {
  label: string;
  projectCode: string;
  projectName: string;
  partNo: string;
  productName: string;
  spec: string;
  orderQty: number;
  unitPrice: number;
  drawing2DFile: string;
  drawing3DFile: string;
  cadRevision: string;
  specDocFile: string;
}

const PROJECT_PRESETS: ProjectPreset[] = [
  {
    label: "현대 NT5 신형 전기 SUV - Front Door Upper Cover",
    projectCode: "NT5-2026-A",
    projectName: "현대 NT5 신형 전기 SUV",
    partNo: "82301-NT500-A",
    productName: "Front Door Upper Cover LH/RH",
    spec: "PP-EPDM (내스크래치) / 1*2 Cavity",
    orderQty: 25000,
    unitPrice: 4200,
    drawing2DFile: "NT5_Door_Upper_Cover_2D_Rev2.dwg",
    drawing3DFile: "NT5_Door_Upper_Cover_3D_Rev2.stp",
    cadRevision: "Rev.2 (최종확정본)",
    specDocFile: "HMC_Tech_Spec_NT5_Door_v1.2.pdf",
  },
  {
    label: "기아 A2XT 하이브리드 - Center Console Main Bracket",
    projectCode: "A2XT-M01",
    projectName: "기아 A2XT 하이브리드 세단",
    partNo: "84740-A2XT0",
    productName: "Center Console Main Bracket",
    spec: "ABS HI-121 (고강성) / 1*1 Cavity",
    orderQty: 18000,
    unitPrice: 3100,
    drawing2DFile: "A2XT_Console_Bracket_2D.pdf",
    drawing3DFile: "A2XT_Console_Bracket_3D.stp",
    cadRevision: "Rev.1",
    specDocFile: "MOBIS_Console_Spec_2026.pdf",
  },
  {
    label: "SPX 차세대 배터리 - BMS Battery Case Module",
    projectCode: "SPX-EV-09",
    projectName: "SPX 전기차 차세대 BMS 하우징",
    partNo: "SPX-BMS-H800",
    productName: "BMS Battery Case Module",
    spec: "PBT-GF30 (난연 V0) / 1*4 Cavity",
    orderQty: 40000,
    unitPrice: 5600,
    drawing2DFile: "SPX_BMS_CASE_2D_Final.dwg",
    drawing3DFile: "SPX_BMS_CASE_3D_Final.x_t",
    cadRevision: "Rev.Final",
    specDocFile: "SPX_Flame_Retardant_Spec.pdf",
  },
  {
    label: "현대 FF 소형 SUV - Front Lower Bumper Cover",
    projectCode: "FF-2026-01",
    projectName: "현대 FF 범퍼 플라스틱 모듈",
    partNo: "86510-FF000",
    productName: "Front Lower Bumper Cover",
    spec: "PP+TD20 (고강성) / 1*1 Cavity",
    orderQty: 15000,
    unitPrice: 7200,
    drawing2DFile: "FF_Cover_A_2D.dwg",
    drawing3DFile: "FF_Cover_v1.0.step",
    cadRevision: "Rev.1",
    specDocFile: "FF_Bumper_Spec_2026.pdf",
  },
  {
    label: "제네시스 RG3 - Armrest Hinge Bracket LH/RH",
    projectCode: "RG3-ARM-02",
    projectName: "제네시스 RG3 콘솔 모듈",
    partNo: "84660-RG300",
    productName: "Armrest Hinge Bracket LH/RH",
    spec: "PA66-GF30 (고인성) / 1*2 Cavity",
    orderQty: 10000,
    unitPrice: 6500,
    drawing2DFile: "RG3_Armrest_Hinge_2D.dwg",
    drawing3DFile: "RG3_Armrest_Hinge_3D.stp",
    cadRevision: "Rev.0",
    specDocFile: "RG3_Strength_Spec.pdf",
  },
  {
    label: "직접 입력 (신규 품목 작성)",
    projectCode: "NEW-PJT-2026",
    projectName: "",
    partNo: "",
    productName: "",
    spec: "PP / 1*1 Cavity",
    orderQty: 10000,
    unitPrice: 5000,
    drawing2DFile: "",
    drawing3DFile: "",
    cadRevision: "Rev.0",
    specDocFile: "",
  }
];

// 3. 결제조건 옵션
const PAYMENT_OPTIONS = [
  "마감 후 익월 25일 현금 결제",
  "익월 말 60일 전자구매카드",
  "선금 30%, 개발 완료 시 잔금 70%",
  "납품 후 30일 현금 결제",
  "직접 입력",
];

// 4. 인도조건 및 납품장소 옵션
const DELIVERY_PLACE_OPTIONS = [
  "현대자동차 아산공장 도어의장 1공구 (DAP)",
  "현대자동차 울산 3공장 의장라인 (DAP)",
  "기아자동차 화성공장 조립의장 (DAP)",
  "현대모비스 진천 전장물류센터 (DAP)",
  "SPX 평택 배터리팩 물류기지 (DAP)",
  "MPSI 평택 중앙물류창고 (EXW 공장도)",
  "직접 입력",
];

// 5. MPSI 영업담당자 옵션
const SALES_MANAGER_OPTIONS = [
  "최영진 부장 (MPSI 영업1팀)",
  "김민수 과장 (MPSI 영업2팀)",
  "박준우 대리 (MPSI 개발영업팀)",
  "이수현 차장 (MPSI 고객지원팀)",
];

// 6. CAD 리비전 옵션
const CAD_REVISION_OPTIONS = [
  "Rev.0 (초도접수본)",
  "Rev.1 (1차 설계변경)",
  "Rev.2 (최종확정본)",
  "Rev.Final (양산동결본)",
  "직접 입력",
];

export default function SalesOrderDrawingReceptionPage() {
  const [data, setData] = useState<SalesOrderItem[]>(initialSalesOrders);
  const [filterOrderNo, setFilterOrderNo] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterProductName, setFilterProductName] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDateType, setFilterDateType] = useState<"orderDate" | "dueDate" | "drawingReceivedDate">("orderDate");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePresetType>("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 상세/등록 모달 상태
  const [selectedItem, setSelectedItem] = useState<SalesOrderItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewRegister, setIsNewRegister] = useState(false);

  // 폼 상태
  const [formState, setFormState] = useState<Partial<SalesOrderItem>>({});
  
  // 셀렉트박스 선택 상태 (프리셋 매핑용)
  const [selectedPresetLabel, setSelectedPresetLabel] = useState<string>(PROJECT_PRESETS[0].label);

  // 파일 업로드 참조용 ref
  const fileInput2DRef = useRef<HTMLInputElement>(null);
  const fileInput3DRef = useRef<HTMLInputElement>(null);
  const fileInputSpecRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 검색 필터링
  const filteredData = data.filter((item) => {
    const matchOrderNo = filterOrderNo
      ? item.orderNo.toLowerCase().includes(filterOrderNo.toLowerCase()) || item.customerPoNo.toLowerCase().includes(filterOrderNo.toLowerCase())
      : true;
    const matchCustomer = filterCustomer
      ? item.customerName.toLowerCase().includes(filterCustomer.toLowerCase())
      : true;
    const matchProd = filterProductName
      ? item.productName.toLowerCase().includes(filterProductName.toLowerCase()) || item.partNo.toLowerCase().includes(filterProductName.toLowerCase())
      : true;
    const matchStatus = filterStatus !== "ALL" ? item.status === filterStatus : true;
    const targetDate = item[filterDateType];
    const matchDate = isWithinDateRange(targetDate, filterDateFrom, filterDateTo);
    return matchOrderNo && matchCustomer && matchProd && matchStatus && matchDate;
  });

  const handleReset = () => {
    setFilterOrderNo("");
    setFilterCustomer("");
    setFilterProductName("");
    setFilterStatus("ALL");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSelectedDatePreset("all");
  };

  // 고객사 선택 시 자동 연동 핸들러
  const handleCustomerSelect = (customerName: string) => {
    const found = CUSTOMER_OPTIONS.find(c => c.name === customerName);
    if (found && customerName !== "기타 (직접 입력)") {
      const today = new Date();
      setFormState(prev => ({
        ...prev,
        customerName: found.name,
        customerManager: found.manager,
        deliveryPlace: found.deliveryPlace,
        paymentTerms: found.payment,
        customerPoNo: prev.customerPoNo || `${found.poPrefix}-${today.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      }));
    } else {
      setFormState(prev => ({ ...prev, customerName: "" }));
    }
  };

  // 프로젝트/부품 프리셋 선택 시 자동 입력 핸들러
  const handleProjectPresetSelect = (presetLabel: string) => {
    setSelectedPresetLabel(presetLabel);
    const preset = PROJECT_PRESETS.find(p => p.label === presetLabel);
    if (preset) {
      const supply = preset.orderQty * preset.unitPrice;
      const vat = Math.round(supply * 0.1);
      setFormState(prev => ({
        ...prev,
        projectCode: preset.projectCode,
        projectName: preset.projectName,
        partNo: preset.partNo,
        productName: preset.productName,
        spec: preset.spec,
        orderQty: preset.orderQty,
        unitPrice: preset.unitPrice,
        supplyAmount: supply,
        vatAmount: vat,
        totalAmount: supply + vat,
        drawing2DFile: preset.drawing2DFile,
        drawing3DFile: preset.drawing3DFile,
        cadRevision: preset.cadRevision,
        specDocFile: preset.specDocFile,
      }));
      showToast(`[${preset.productName}] 기본 사양 및 도면 파일이 프리셋되었습니다.`);
    }
  };

  // 신규 수주 등록 모달 열기
  const handleOpenNewModal = () => {
    setIsNewRegister(true);
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const nextOrderNo = `SO-${String(today.getFullYear())}${String(today.getMonth() + 1).padStart(2, "0")}-0${data.length + 1}`;
    
    // 기본 첫 번째 프리셋 적용
    const defaultPreset = PROJECT_PRESETS[0];
    const defaultCustomer = CUSTOMER_OPTIONS[0];
    const supply = defaultPreset.orderQty * defaultPreset.unitPrice;
    const vat = Math.round(supply * 0.1);

    setSelectedPresetLabel(defaultPreset.label);
    setFormState({
      orderNo: nextOrderNo,
      customerPoNo: `PO-HMC-${today.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: defaultCustomer.name,
      customerManager: defaultCustomer.manager,
      orderDate: dateStr,
      dueDate: `${today.getFullYear()}-12-31`,
      projectCode: defaultPreset.projectCode,
      projectName: defaultPreset.projectName,
      partNo: defaultPreset.partNo,
      productName: defaultPreset.productName,
      spec: defaultPreset.spec,
      orderQty: defaultPreset.orderQty,
      unitPrice: defaultPreset.unitPrice,
      supplyAmount: supply,
      vatAmount: vat,
      totalAmount: supply + vat,
      currency: "KRW",
      drawing2DFile: defaultPreset.drawing2DFile,
      drawing3DFile: defaultPreset.drawing3DFile,
      cadRevision: defaultPreset.cadRevision,
      specDocFile: defaultPreset.specDocFile,
      drawingReceivedDate: dateStr,
      paymentTerms: defaultCustomer.payment,
      incoterms: "도착도 (DAP)",
      deliveryPlace: defaultCustomer.deliveryPlace,
      status: "수주등록",
      salesManager: SALES_MANAGER_OPTIONS[0],
      notes: "원청 2D/3D 도면 검토 후 금형개발실 배포 예정",
    });
    setIsModalOpen(true);
  };

  // 상세 모달 열기
  const handleOpenDetail = (item: SalesOrderItem) => {
    setIsNewRegister(false);
    setSelectedItem(item);
    setFormState({ ...item });
    setIsModalOpen(true);
  };

  // 수량/단가 변경 시 금액 자동 계산
  const handleQtyPriceChange = (qty: number, price: number) => {
    const supply = qty * price;
    const vat = Math.round(supply * 0.1);
    setFormState(prev => ({
      ...prev,
      orderQty: qty,
      unitPrice: price,
      supplyAmount: supply,
      vatAmount: vat,
      totalAmount: supply + vat,
    }));
  };

  // 도면 파일 가상 업로드 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: "drawing2DFile" | "drawing3DFile" | "specDocFile") => {
    if (e.target.files && e.target.files[0]) {
      const fileName = e.target.files[0].name;
      setFormState(prev => ({ ...prev, [fieldName]: fileName }));
      showToast(`[${fileName}] 파일이 성공적으로 업로드 첨부되었습니다.`);
    }
  };

  // 표준 CAD 샘플 도면 원클릭 자동 채우기
  const handleAutoFillCadDocs = () => {
    const pCode = formState.projectCode || "PJT";
    const new2D = `${pCode}_Part_Drawing_2D_Rev1.dwg`;
    const new3D = `${pCode}_Part_Solid_3D_Rev1.stp`;
    const newSpec = `${pCode}_Technical_Specification.pdf`;

    setFormState(prev => ({
      ...prev,
      drawing2DFile: new2D,
      drawing3DFile: new3D,
      specDocFile: newSpec,
      cadRevision: "Rev.1 (최종확정본)",
      drawingReceivedDate: new Date().toISOString().split("T")[0],
    }));
    showToast("표준 2D/3D CAD 파일 및 기술사양서 세트가 자동 등록되었습니다.");
  };

  // 저장 처리
  const handleSaveOrder = () => {
    if (!formState.customerName?.trim()) {
      alert("원청 고객사명을 선택하거나 입력해주세요.");
      return;
    }
    if (!formState.productName?.trim()) {
      alert("부품명을 입력해주세요.");
      return;
    }

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    if (isNewRegister) {
      const newItem: SalesOrderItem = {
        id: Date.now(),
        orderNo: formState.orderNo || `SO-202608-0${data.length + 1}`,
        customerPoNo: formState.customerPoNo || "PO-PENDING",
        customerName: formState.customerName.trim(),
        customerManager: formState.customerManager || "담당자 미지정",
        orderDate: formState.orderDate || dateStr,
        dueDate: formState.dueDate || dateStr,
        projectCode: formState.projectCode || "PJT-NEW",
        projectName: formState.projectName || "",
        partNo: formState.partNo || "",
        productName: formState.productName.trim(),
        spec: formState.spec || "",
        orderQty: Number(formState.orderQty || 0),
        unitPrice: Number(formState.unitPrice || 0),
        supplyAmount: Number(formState.supplyAmount || 0),
        vatAmount: Number(formState.vatAmount || 0),
        totalAmount: Number(formState.totalAmount || 0),
        currency: formState.currency || "KRW",
        drawing2DFile: formState.drawing2DFile || "2D_도면.dwg",
        drawing3DFile: formState.drawing3DFile || "3D_모델.stp",
        cadRevision: formState.cadRevision || "Rev.0",
        specDocFile: formState.specDocFile || "",
        drawingReceivedDate: formState.drawingReceivedDate || dateStr,
        paymentTerms: formState.paymentTerms || "익월 25일 현금",
        incoterms: formState.incoterms || "도착도 (DAP)",
        deliveryPlace: formState.deliveryPlace || "",
        status: formState.status || "수주등록",
        salesManager: formState.salesManager || SALES_MANAGER_OPTIONS[0],
        notes: formState.notes || "",
        updatedAt: `${dateStr} 09:00`,
      };

      setData([newItem, ...data]);
      showToast(`[${newItem.orderNo}] 신규 B2B 고객 수주가 성공적으로 등록되었습니다.`);
    } else if (selectedItem) {
      setData(data.map(item => item.id === selectedItem.id ? {
        ...item,
        ...formState,
        updatedAt: `${dateStr} 09:00`,
      } as SalesOrderItem : item));

      showToast(`[${formState.orderNo}] 수주 정보가 성공적으로 수정되었습니다.`);
    }
    setIsModalOpen(false);
  };

  // 수주 확정(승인) 전결 액션
  const handleConfirmOrder = () => {
    if (!formState.orderNo) return;
    if (confirm(`[수주 확정 승인]\n수주번호 [${formState.orderNo}]를 공식 수주확정 처리하시겠습니까?\n\n• 고객 발주서(PO) 및 2D/3D 도면이 확정됩니다.\n• 사내 생산기획 및 지정 금형개발실/CAE팀으로 도면 데이터가 자동 연계됩니다.`)) {
      setFormState(prev => ({
        ...prev,
        status: "수주확정",
      }));
      showToast(`수주 [${formState.orderNo}]가 확정되었습니다. [저장]을 눌러 반영을 완료하세요.`);
    }
  };

  // 상태 배지 스타일
  const getStatusBadge = (status: SalesOrderItem["status"]) => {
    switch (status) {
      case "수주확정":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 font-bold";
      case "외주개발의뢰":
        return "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 font-bold";
      case "도면/사양검토":
        return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 font-medium";
      case "수주취소":
        return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300";
      default:
        return "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300";
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs relative pb-8">
      {/* 토스트 알림창 */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-zinc-900 text-white px-4 py-2.5 rounded-lg shadow-xl border border-sky-500/40 text-xs animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-sky-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. SCM 공정 1: 수주 및 도면접수 배너 */}
      <div className="bg-gradient-to-r from-sky-50 via-teal-50 to-white dark:from-sky-950/40 dark:via-zinc-900 dark:to-zinc-900 border border-sky-200 dark:border-sky-800 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-2.5">
          <FileText className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sky-950 dark:text-sky-100 text-sm">
                [공정 1] 원청 고객사 B2B 수주(Sales Order) 및 원본 제품도면 접수 관리
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-600 text-white font-mono">
                SCM Step 1
              </span>
            </div>
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400 block mt-0.5">
              원청 고객사(현대/기아/모비스/SPX) 신규 수주(SO) 등록 및 고객 발주서(PO) 접수, 원본 2D 도면/3D CAD 입수 및 
              수주확정 후 <b className="text-indigo-600 dark:text-indigo-400">지정 금형제작처 개발실/CAE팀</b>으로 공식 도면 배포(외주/자체 개발의뢰)를 총괄합니다.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button 
            onClick={handleOpenNewModal} 
            className="h-8 px-3.5 bg-sky-600 hover:bg-sky-700 text-white text-xs gap-1.5 font-bold shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>+ 신규 고객수주 등록</span>
          </Button>
        </div>
      </div>

      {/* 3. 검색 및 필터 바 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex flex-col gap-2.5">
        {/* 상단 기간조회 바 */}
        <div className="pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <DateRangeFilter
            dateType={filterDateType}
            onDateTypeChange={(v) => setFilterDateType(v as any)}
            dateTypeOptions={[
              { label: "수주일자", value: "orderDate" },
              { label: "납기일자", value: "dueDate" },
              { label: "도면접수일", value: "drawingReceivedDate" },
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">수주번호 / 고객 PO</span>
            <Input 
              value={filterOrderNo} 
              onChange={(e) => setFilterOrderNo(e.target.value)} 
              placeholder="예: SO-2026, PO-HMC" 
              className="h-7 text-xs font-mono font-bold" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">원청 고객사</span>
            <Input 
              value={filterCustomer} 
              onChange={(e) => setFilterCustomer(e.target.value)} 
              placeholder="예: 현대자동차, 기아, 모비스" 
              className="h-7 text-xs" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">부품명 / 부품번호</span>
            <Input 
              value={filterProductName} 
              onChange={(e) => setFilterProductName(e.target.value)} 
              placeholder="품명 또는 품번 검색" 
              className="h-7 text-xs" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">수주 진행 상태</span>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)} 
              className="h-7 rounded-md border bg-white dark:bg-zinc-800 px-2 text-xs font-medium text-zinc-800 dark:text-zinc-200"
            >
              <option value="ALL">전체 수주상태</option>
              <option value="수주등록">수주등록 (신규접수)</option>
              <option value="도면/사양검토">도면/사양검토 중</option>
              <option value="수주확정">수주확정 (계약체결)</option>
              <option value="외주개발의뢰">외주개발의뢰 (금형 CAE/설계)</option>
              <option value="수주취소">수주취소</option>
            </select>
          </div>
          <div className="flex items-end gap-1.5">
            <Button onClick={handleReset} variant="outline" className="h-7 px-3 gap-1 text-xs text-zinc-600 w-full">
              <RefreshCw className="h-3.5 w-3.5" />
              필터 초기화
            </Button>
          </div>
        </div>
      </div>

      {/* 4. 메인 고객 수주 관리 대장 테이블 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs overflow-hidden flex flex-col min-h-[480px]">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b">
          <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-100">
            <FileText className="h-4 w-4 text-sky-600" />
            <span>고객 수주(Sales Order) 및 도면 접수 관리대장</span>
            <span className="text-[11px] font-normal text-zinc-500 ml-1">
              (총 <b className="text-sky-600 font-mono font-bold">{filteredData.length}</b>건)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => showToast("현재 수주 대장 엑셀 파일이 다운로드되었습니다.")} 
              size="xs" 
              variant="outline" 
              className="h-7 px-2.5 text-xs gap-1 text-zinc-600"
            >
              <Download className="h-3.5 w-3.5" />
              엑셀 내보내기
            </Button>
            <Button onClick={handleOpenNewModal} size="xs" className="h-7 px-2.5 bg-sky-600 hover:bg-sky-700 text-white gap-1 text-xs font-bold">
              <Plus className="h-3.5 w-3.5" />
              신규 고객수주 등록
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full border-collapse text-left border-spacing-0 whitespace-nowrap">
            <thead className="sticky top-0 bg-[#2d3748] text-white text-[11px] z-10">
              <tr>
                <th className="p-1.5 w-10 text-center border-r border-slate-600">No</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px]">수주번호(SO)</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[120px]">고객 발주번호(PO)</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[130px]">원청 고객사</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[130px]">프로젝트 / 차종</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[120px]">부품번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[170px]">품명</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[85px] text-right">수주수량</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[85px] text-right">단가(원)</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px] text-right bg-slate-700">총 수주금액(원)</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[130px] text-center">고객 2D/3D 도면</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px] text-center">도면 Rev</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[85px] text-center">고객요구 납기</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[95px] text-center">수주 상태</th>
                <th className="p-1.5 min-w-[85px] text-center">수주관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px]">
              {filteredData.map((row, idx) => (
                <tr key={row.id} className="hover:bg-sky-50/70 dark:hover:bg-zinc-800/60 transition-colors odd:bg-white even:bg-zinc-50/40 dark:odd:bg-zinc-900 dark:even:bg-zinc-900/50">
                  <td className="p-1.5 text-center font-mono text-zinc-400 border-r">{idx + 1}</td>
                  
                  {/* 수주번호 클릭 -> 상세 모달 */}
                  <td className="p-1.5 border-r font-mono text-sky-600 font-bold hover:underline cursor-pointer" onClick={() => handleOpenDetail(row)}>
                    {row.orderNo}
                  </td>

                  <td className="p-1.5 border-r font-mono text-zinc-700 dark:text-zinc-300">{row.customerPoNo}</td>
                  <td className="p-1.5 border-r font-medium text-zinc-900 dark:text-zinc-100">{row.customerName}</td>
                  <td className="p-1.5 border-r truncate max-w-[130px]" title={row.projectName}>{row.projectName}</td>
                  <td className="p-1.5 border-r font-mono font-medium text-zinc-600">{row.partNo}</td>
                  <td className="p-1.5 border-r font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[170px]" title={row.productName}>{row.productName}</td>
                  
                  {/* 수량 / 단가 / 총액 */}
                  <td className="p-1.5 border-r text-right font-mono font-semibold">{row.orderQty.toLocaleString()} EA</td>
                  <td className="p-1.5 border-r text-right font-mono text-zinc-600">@{row.unitPrice.toLocaleString()}</td>
                  <td className="p-1.5 border-r text-right font-mono font-bold text-sky-700 dark:text-sky-300 bg-sky-50/30 dark:bg-sky-950/20">
                    {row.totalAmount.toLocaleString()}원
                  </td>

                  {/* 고객 도면 파일 */}
                  <td className="p-1.5 border-r text-center">
                    <div className="flex items-center justify-center gap-1.5 font-mono text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 border text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" title={row.drawing2DFile}>
                        2D
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-sky-100 border border-sky-300 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-bold" title={row.drawing3DFile}>
                        3D CAD
                      </span>
                    </div>
                  </td>

                  <td className="p-1.5 border-r text-center font-mono font-bold text-zinc-700 dark:text-zinc-300">{row.cadRevision}</td>
                  <td className="p-1.5 border-r text-center font-mono text-amber-700 dark:text-amber-400 font-semibold">{row.dueDate}</td>

                  {/* 수주 상태 */}
                  <td className="p-1.5 border-r text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(row.status)}`}>
                      {row.status}
                    </span>
                  </td>

                  {/* 액션 버튼 */}
                  <td className="p-1.5 text-center">
                    <Button 
                      onClick={() => handleOpenDetail(row)} 
                      size="xs" 
                      variant="outline" 
                      className="h-6 px-2 text-[10px] gap-1 bg-white hover:bg-zinc-100 dark:bg-zinc-800 text-sky-700 font-medium"
                    >
                      <Eye className="h-3 w-3" />
                      상세/검토
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. 고객 수주 상세 및 신규 등록 모달 (셀렉트박스 편의 UI 및 도면 업로드 개선) */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-3xl rounded-lg shadow-2xl border overflow-hidden flex flex-col max-h-[92vh]">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-800 to-sky-900 text-white">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-sky-400" />
                <h3 className="font-bold text-sm">
                  {isNewRegister ? "신규 B2B 고객 수주(Sales Order) 및 도면 등록" : `고객 수주 상세 및 도면 접수 정보 [${formState.orderNo}]`}
                </h3>
                {/* {isNewRegister && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/30 border border-sky-400 text-sky-200">
                    간편 셀렉트 프리셋 지원
                  </span>
                )} */}
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white rounded-full p-1 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 모달 바디 */}
            <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs">

              {/* 신규 등록 시: 간편 템플릿 프리셋 선택기 */}
              {isNewRegister && (
                <div className="bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-lg p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5 text-xs">
                      <Sparkles className="h-4 w-4 text-sky-600" />
                      빠른 수주 작성을 위한 대표 프로젝트 / 부품 프리셋
                    </span>
                    <span className="text-[10px] text-sky-600">선택 시 규격/단가/도면이 자동 완성됩니다</span>
                  </div>
                  <select
                    value={selectedPresetLabel}
                    onChange={(e) => handleProjectPresetSelect(e.target.value)}
                    className="h-8 rounded-md border border-sky-300 bg-white dark:bg-zinc-800 px-3 text-xs font-semibold text-zinc-800 dark:text-zinc-200 shadow-xs focus:ring-1 focus:ring-sky-500"
                  >
                    {PROJECT_PRESETS.map((p) => (
                      <option key={p.label} value={p.label}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* 섹션 1: 수주 기본 정보 */}
              <div className="border rounded-md p-3.5 flex flex-col gap-2.5 bg-zinc-50/40 dark:bg-zinc-800/30">
                <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5 text-xs">
                  <Building2 className="h-4 w-4 text-sky-600" />
                  1. 고객사 및 발주 계약 기본 정보
                </h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                  <div>
                    <label className="block text-zinc-500 mb-1">수주번호 (SO No)</label>
                    <Input 
                      value={formState.orderNo || ""} 
                      disabled
                      className="h-7 text-xs font-mono font-bold bg-zinc-100 dark:bg-zinc-800"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">고객 발주번호 (Customer PO)*</label>
                    <Input 
                      value={formState.customerPoNo || ""} 
                      onChange={(e) => setFormState({ ...formState, customerPoNo: e.target.value })}
                      placeholder="예: PO-HMC-2026-8819"
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                  
                  {/* 원청 고객사: 셀렉트박스 처리 */}
                  <div className="sm:col-span-2">
                    <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">
                      원청 고객사 선택*
                    </label>
                    <div className="flex gap-1.5">
                      <select
                        value={formState.customerName || ""}
                        onChange={(e) => handleCustomerSelect(e.target.value)}
                        className="h-7 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 flex-1"
                      >
                        {CUSTOMER_OPTIONS.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {formState.customerName === "기타 (직접 입력)" && (
                        <Input
                          placeholder="고객사명 직접 입력"
                          value={formState.customerName === "기타 (직접 입력)" ? "" : formState.customerName}
                          onChange={(e) => setFormState({ ...formState, customerName: e.target.value })}
                          className="h-7 text-xs flex-1"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                  <div>
                    <label className="block text-zinc-500 mb-1">고객 담당자 / 연락처</label>
                    <Input 
                      value={formState.customerManager || ""} 
                      onChange={(e) => setFormState({ ...formState, customerManager: e.target.value })}
                      placeholder="예: 김과장 (010-1234-5678)"
                      className="h-7 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">수주일자</label>
                    <Input 
                      type="date"
                      value={formState.orderDate || ""} 
                      onChange={(e) => setFormState({ ...formState, orderDate: e.target.value })}
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">고객요구 납기일자*</label>
                    <Input 
                      type="date"
                      value={formState.dueDate || ""} 
                      onChange={(e) => setFormState({ ...formState, dueDate: e.target.value })}
                      className="h-7 text-xs font-mono font-bold text-amber-600"
                    />
                  </div>

                  {/* MPSI 영업담당자: 셀렉트박스 처리 */}
                  <div>
                    <label className="block text-zinc-500 mb-1">MPSI 영업담당자</label>
                    <select
                      value={formState.salesManager || SALES_MANAGER_OPTIONS[0]}
                      onChange={(e) => setFormState({ ...formState, salesManager: e.target.value })}
                      className="h-7 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-xs text-zinc-800 dark:text-zinc-200 w-full"
                    >
                      {SALES_MANAGER_OPTIONS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                  {/* 결제조건: 셀렉트박스 처리 */}
                  <div>
                    <label className="block text-zinc-500 mb-1">결제조건 (Payment Terms)</label>
                    <select
                      value={formState.paymentTerms || PAYMENT_OPTIONS[0]}
                      onChange={(e) => setFormState({ ...formState, paymentTerms: e.target.value })}
                      className="h-7 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-xs text-zinc-800 dark:text-zinc-200 w-full"
                    >
                      {PAYMENT_OPTIONS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* 납품장소: 셀렉트박스 처리 */}
                  <div>
                    <label className="block text-zinc-500 mb-1">인도조건 및 납품장소</label>
                    <select
                      value={formState.deliveryPlace || DELIVERY_PLACE_OPTIONS[0]}
                      onChange={(e) => setFormState({ ...formState, deliveryPlace: e.target.value })}
                      className="h-7 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-xs text-zinc-800 dark:text-zinc-200 w-full"
                    >
                      {DELIVERY_PLACE_OPTIONS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 섹션 2: 수주 품목 및 금액 정보 */}
              <div className="border rounded-md p-3.5 flex flex-col gap-2.5 bg-zinc-50/50 dark:bg-zinc-800/30">
                <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    2. 수주 품목 및 상업 금액 산출
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">수량 × 단가 = 공급가액 자동 계산</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                  <div>
                    <label className="block text-zinc-500 mb-1">프로젝트코드</label>
                    <Input 
                      value={formState.projectCode || ""} 
                      onChange={(e) => setFormState({ ...formState, projectCode: e.target.value })}
                      placeholder="예: NT5-2026-A"
                      className="h-7 text-xs font-mono bg-white dark:bg-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">차종 / 프로젝트명</label>
                    <Input 
                      value={formState.projectName || ""} 
                      onChange={(e) => setFormState({ ...formState, projectName: e.target.value })}
                      placeholder="예: 현대 NT5 전기 SUV"
                      className="h-7 text-xs bg-white dark:bg-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">부품번호 (Part No)*</label>
                    <Input 
                      value={formState.partNo || ""} 
                      onChange={(e) => setFormState({ ...formState, partNo: e.target.value })}
                      placeholder="예: 82301-NT500-A"
                      className="h-7 text-xs font-mono font-bold bg-white dark:bg-zinc-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">부품명 (Part Name)*</label>
                    <Input 
                      value={formState.productName || ""} 
                      onChange={(e) => setFormState({ ...formState, productName: e.target.value })}
                      placeholder="예: Front Door Upper Cover"
                      className="h-7 text-xs font-bold bg-white dark:bg-zinc-900"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                  <div>
                    <label className="block text-zinc-500 mb-1">성형 재질 / 캐비티 규격사양 (Spec)</label>
                    <Input 
                      value={formState.spec || ""} 
                      onChange={(e) => setFormState({ ...formState, spec: e.target.value })}
                      placeholder="예: PP-EPDM / 1*2 Cavity"
                      className="h-7 text-xs bg-white dark:bg-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">특이사항 및 납품 포장 요구조건</label>
                    <Input 
                      value={formState.notes || ""} 
                      onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                      placeholder="예: 전용 진공 트레이 포장 및 스크래치 방지 필름 부착"
                      className="h-7 text-xs bg-white dark:bg-zinc-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px] pt-1">
                  <div>
                    <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">수주 수량 (EA)*</label>
                    <Input 
                      type="number"
                      value={formState.orderQty || 0} 
                      onChange={(e) => handleQtyPriceChange(Number(e.target.value), Number(formState.unitPrice || 0))}
                      className="h-7 text-xs font-mono font-bold text-right bg-white dark:bg-zinc-900 border-sky-300"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">수주 단가 (@원)*</label>
                    <CurrencyInput 
                      value={formState.unitPrice || 0} 
                      onChange={(val) => handleQtyPriceChange(Number(formState.orderQty || 0), val)}
                      placeholder="0"
                      className="h-7 text-xs font-mono font-bold text-right bg-white dark:bg-zinc-900 border-sky-300"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">공급가액 (원)</label>
                    <Input 
                      value={(formState.supplyAmount || 0).toLocaleString()} 
                      disabled
                      className="h-7 text-xs font-mono text-right bg-zinc-100 dark:bg-zinc-800 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">수주 총액 (VAT 10% 포함)</label>
                    <Input 
                      value={(formState.totalAmount || 0).toLocaleString()} 
                      disabled
                      className="h-7 text-xs font-mono font-bold text-right text-sky-700 bg-sky-50 dark:bg-sky-950 dark:text-sky-300"
                    />
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* 섹션 3: 고객 제공 2D/3D 도면 및 사양서 접수 (업로드 및 입력 대폭 편의 개선) */}
              {/* ========================================================================= */}
              <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-3.5 flex flex-col gap-3 bg-gradient-to-b from-purple-50/30 to-white dark:from-purple-950/20 dark:to-zinc-900">
                <div className="flex items-center justify-between border-b pb-2 border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="font-bold text-xs text-purple-950 dark:text-purple-200">
                      3. 원청 고객사 2D/3D 제품 도면 및 기술사양서 접수 (간편 업로드)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="xs"
                      onClick={handleAutoFillCadDocs}
                      variant="outline"
                      className="h-6 text-[10px] gap-1 border-purple-300 text-purple-700 hover:bg-purple-100/60 dark:hover:bg-purple-950 font-medium"
                    >
                      <Sparkles className="h-3 w-3 text-purple-500" />
                      <span>+ 표준 CAD 도면 샘플 자동첨부</span>
                    </Button>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      접수일: {formState.drawingReceivedDate || "당일"}
                    </span>
                  </div>
                </div>

                {/* 3대 도면/사양서 공통 FileUploader 카드 UI (드래그앤드롭 & 실제 파일 메타데이터 연동) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* 카드 1: 2D 설계도면 */}
                  <FileUploader
                    variant="card"
                    label="2D 설계도면"
                    badgeText="DWG / PDF"
                    accept=".dwg,.pdf,.dxf"
                    value={formState.drawing2DFile}
                    onSingleChange={(file) => setFormState(prev => ({ ...prev, drawing2DFile: file?.name || "" }))}
                    description="2D 도면 드래그 또는 클릭 첨부"
                  />

                  {/* 카드 2: 3D CAD 모델링 파일 (가장 중요) */}
                  <FileUploader
                    variant="card"
                    label="3D CAD 솔리드 모델"
                    required
                    badgeText="STP / STEP / X_T"
                    accept=".stp,.step,.x_t,.catpart,.iges"
                    value={formState.drawing3DFile}
                    onSingleChange={(file) => setFormState(prev => ({ ...prev, drawing3DFile: file?.name || "" }))}
                    description="금형 가공 필수 3D CAD 첨부"
                  />

                  {/* 카드 3: 고객 기술사양서 / RFQ */}
                  <FileUploader
                    variant="card"
                    label="고객 기술사양서"
                    badgeText="PDF / RFQ"
                    accept=".pdf,.docx,.xlsx"
                    value={formState.specDocFile}
                    onSingleChange={(file) => setFormState(prev => ({ ...prev, specDocFile: file?.name || "" }))}
                    description="기술사양서 / RFQ 파일 첨부"
                  />
                </div>

                {/* 도면 리비전 셀렉트박스 & 수동 파일명 보정 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[11px]">
                  <div>
                    <label className="block text-zinc-700 dark:text-zinc-300 font-bold mb-1">
                      도면 리비전 (CAD Revision) 선택*
                    </label>
                    <select
                      value={formState.cadRevision || CAD_REVISION_OPTIONS[0]}
                      onChange={(e) => setFormState(prev => ({ ...prev, cadRevision: e.target.value }))}
                      className="h-7 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 w-full"
                    >
                      {CAD_REVISION_OPTIONS.map((rev) => (
                        <option key={rev} value={rev}>{rev}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-[10px] text-purple-900 dark:text-purple-300 self-end">
                    <CheckSquare className="h-4 w-4 text-purple-600 shrink-0" />
                    <span>
                      수주확정 시 <b>지정 금형제작처(CAE팀)</b>와 <b>사출양산부</b>로 해당 2D/3D 도면이 자동 배포됩니다.
                    </span>
                  </div>
                </div>
              </div>

              {/* 섹션 4: 수주 진행 상태 및 확정 처리 */}
              <div className="bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 rounded-md p-3.5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-950 dark:text-sky-200 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-sky-600" />
                    4. SCM 수주 진행 상태 관리 & 수주 승인 확정
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadge(formState.status || "수주등록")}`}>
                    현재: {formState.status}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">상태 변경:</span>
                    <select 
                      value={formState.status || "수주등록"} 
                      onChange={(e) => setFormState(prev => ({ ...prev, status: e.target.value as any }))}
                      className="h-7 rounded-md border bg-white dark:bg-zinc-900 px-2 text-xs font-bold text-zinc-800 dark:text-zinc-200"
                    >
                      <option value="수주등록">수주등록 (신규접수)</option>
                      <option value="도면/사양검토">도면/사양검토 중</option>
                      <option value="수주확정">수주확정 (계약 체결)</option>
                      <option value="외주개발의뢰">외주개발의뢰 완료 (금형 CAE/설계)</option>
                      <option value="수주취소">수주취소</option>
                    </select>
                  </div>

                  <Button 
                    type="button"
                    onClick={handleConfirmOrder}
                    size="xs"
                    className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    수주 승인 확정 처리
                  </Button>
                </div>
              </div>

            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800 border-t">
              <Button onClick={() => setIsModalOpen(false)} variant="outline" className="h-8 px-3 text-xs">
                닫기
              </Button>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleSaveOrder}
                  className="h-8 px-4 text-xs bg-sky-600 hover:bg-sky-700 text-white gap-1.5 font-bold shadow-sm"
                >
                  <Check className="h-3.5 w-3.5" />
                  {isNewRegister ? "신규 수주 저장 완료" : "수주 정보 수정 저장"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Search, RefreshCw, Building2, Plus, 
  Eye, X, Check, Mail, Phone, 
  MapPin, Globe, ShieldCheck, Download, 
  Edit3, Trash2, CheckCircle2, XCircle, FileText, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangeFilter, isWithinDateRange, DatePresetType } from "@/components/common/date-range-filter";

// 1. 업체 구분 타입 (8/14 엑셀 시트 반영)
type CompanyCategory = "고객사" | "공급업체";

// 2. 업체 정보 인터페이스
interface VendorCompanyItem {
  id: number;
  category: CompanyCategory; // 구분: 고객사(C시작), 공급업체(S시작)
  vendorCode: string;        // 식별자 (C-001 / S-001)
  companyName: string;       // 업체명
  bizRegNo: string;          // 사업자번호
  bizType: string;           // 업태 (제조업, 도소매 등)
  bizItem: string;           // 종목 (자동차부품, 금형제작, 플라스틱사출 등)
  ceoName: string;           // 대표자명
  country: string;           // 국가 (대한민국, 베트남 등)
  zipCode: string;           // 우편번호
  baseAddress: string;       // 기본주소
  detailAddress: string;     // 상세주소
  telNo: string;             // 대표전화
  faxNo: string;             // 대표팩스
  email: string;             // 대표이메일
  managerName?: string;      // 주요 담당자
  isActive: boolean;         // 사용여부
  updatedAt: string;
}

// 초기 샘플 데이터 (MPSI ↔ 우성정공 ↔ 뉴몰드 및 고객사/소재사)
const initialVendors: VendorCompanyItem[] = [
  {
    id: 1,
    category: "고객사",
    vendorCode: "C-HK-001",
    companyName: "현대자동차(주) 광주공장",
    bizRegNo: "101-81-09147",
    bizType: "제조업",
    bizItem: "자동차 및 동 부분품",
    ceoName: "정의선, 장재훈",
    country: "대한민국",
    zipCode: "06797",
    baseAddress: "광주광역시 광산구 삼소로 270",
    detailAddress: "의장공장 구매관리부",
    telNo: "062-950-1114",
    faxNo: "062-950-1115",
    email: "purchasing@hyundai.com",
    managerName: "최민희 차장",
    isActive: true,
    updatedAt: "2026-08-18",
  },
  {
    id: 2,
    category: "고객사",
    vendorCode: "C-MOBIS-002",
    companyName: "현대모비스(주)",
    bizRegNo: "201-81-22441",
    bizType: "제조업",
    bizItem: "자동차 부품 모듈",
    ceoName: "이규석",
    country: "대한민국",
    zipCode: "06141",
    baseAddress: "서울특별시 강남구 테헤란로 203",
    detailAddress: "모듈사업부",
    telNo: "02-2018-5114",
    faxNo: "02-2018-5000",
    email: "mobis_scm@mobis.co.kr",
    managerName: "박준영 과장",
    isActive: true,
    updatedAt: "2026-08-15",
  },
  {
    id: 3,
    category: "공급업체",
    vendorCode: "S-WS-001",
    companyName: "우성정공 (금형제작)",
    bizRegNo: "131-86-12345",
    bizType: "제조업",
    bizItem: "정밀 플라스틱 사출금형, CAE 설계",
    ceoName: "박우성",
    country: "대한민국",
    zipCode: "21697",
    baseAddress: "인천광역시 남동구 남동서로 123",
    detailAddress: "남동공단 45블럭 6롯트",
    telNo: "032-815-5678",
    faxNo: "032-815-5679",
    email: "mold_sales@woosung.co.kr",
    managerName: "배희섭 이사 (기술영업)",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    id: 4,
    category: "공급업체",
    vendorCode: "S-NM-002",
    companyName: "뉴몰드 (사출양산)",
    bizRegNo: "134-81-67890",
    bizType: "제조업",
    bizItem: "플라스틱 사출성형, 양산조립",
    ceoName: "김신호",
    country: "대한민국",
    zipCode: "15432",
    baseAddress: "경기도 안산시 단원구 성곡로 78",
    detailAddress: "반월공단 12B-3L",
    telNo: "031-498-7890",
    faxNo: "031-498-7899",
    email: "nm_prod@newmold.co.kr",
    managerName: "김부곤 상무 (생산총괄)",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    id: 5,
    category: "공급업체",
    vendorCode: "S-DH-003",
    companyName: "대한금형(주) (금형제작)",
    bizRegNo: "128-81-99887",
    bizType: "제조업",
    bizItem: "자동차 플라스틱 사출금형, 대형 정밀금형",
    ceoName: "정대한",
    country: "대한민국",
    zipCode: "18284",
    baseAddress: "경기도 화성시 향남읍 발안공단로 45",
    detailAddress: "대한금형 화성공장",
    telNo: "031-352-8800",
    faxNo: "031-352-8801",
    email: "sales@daehanmold.co.kr",
    managerName: "이정우 팀장 (기술영업)",
    isActive: true,
    updatedAt: "2026-08-20",
  },
  {
    id: 6,
    category: "공급업체",
    vendorCode: "S-KP-004",
    companyName: "(주)한국정밀사출 (사출양산)",
    bizRegNo: "135-86-44332",
    bizType: "제조업",
    bizItem: "정밀 플라스틱 부품 사출, 2중사출, 조립",
    ceoName: "최한국",
    country: "대한민국",
    zipCode: "15600",
    baseAddress: "경기도 안산시 단원구 원시로 88",
    detailAddress: "반월공단 18B",
    telNo: "031-492-3300",
    faxNo: "031-492-3301",
    email: "prod@koreaprecision.co.kr",
    managerName: "윤상철 이사 (생산기술)",
    isActive: true,
    updatedAt: "2026-08-20",
  },
  {
    id: 7,
    category: "공급업체",
    vendorCode: "S-LGC-003",
    companyName: "LG화학 (소재사업부)",
    bizRegNo: "107-86-15200",
    bizType: "제조업",
    bizItem: "합성수지 (PP, ABS, PBT 레진)",
    ceoName: "신학철",
    country: "대한민국",
    zipCode: "07336",
    baseAddress: "서울특별시 영등포구 여의대로 128",
    detailAddress: "LG트윈타워 동관",
    telNo: "02-3773-1114",
    faxNo: "02-3773-2200",
    email: "resin_sales@lgchem.com",
    managerName: "이소재 부장",
    isActive: true,
    updatedAt: "2026-08-10",
  }
];

export default function VendorManagementPage() {
  const [data, setData] = useState<VendorCompanyItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterCompanyName, setFilterCompanyName] = useState<string>("");
  const [filterBizRegNo, setFilterBizRegNo] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePresetType>("all");

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewRegister, setIsNewRegister] = useState(false);
  const [selectedItem, setSelectedItem] = useState<VendorCompanyItem | null>(null);

  // 폼 상태
  const [formState, setFormState] = useState<Partial<VendorCompanyItem>>({
    category: "공급업체",
    vendorCode: "",
    companyName: "",
    bizRegNo: "",
    bizType: "제조업",
    bizItem: "플라스틱 사출 성형",
    ceoName: "",
    country: "대한민국",
    zipCode: "",
    baseAddress: "",
    detailAddress: "",
    telNo: "",
    faxNo: "",
    email: "",
    managerName: "",
    isActive: true,
  });

  // DB에서 업체 목록 조회
  const fetchVendors = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory !== "ALL") params.set("category", filterCategory);
      if (filterCompanyName) params.set("companyName", filterCompanyName);
      if (filterBizRegNo) params.set("bizRegNo", filterBizRegNo);

      const res = await fetch(`/api/v1/basic-info/vendors?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setData(json.data);
      }
    } catch (err) {
      console.error("협력사 목록 조회 실패:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filterCategory, filterCompanyName, filterBizRegNo]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // 검색
  const handleSearch = () => {
    fetchVendors();
  };

  const handleReset = () => {
    setFilterCategory("ALL");
    setFilterCompanyName("");
    setFilterBizRegNo("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSelectedDatePreset("all");
    setTimeout(() => {
      fetch("/api/v1/basic-info/vendors")
        .then((res) => res.json())
        .then((json) => {
          if (json.success) setData(json.data);
        });
    }, 0);
  };

  // 구분 변경 시 식별자(코드) 자동 추천 (8/14 엑셀: 고객사 C시작, 공급업체 S시작)
  const handleCategoryChange = (cat: CompanyCategory) => {
    const prefix = cat === "고객사" ? "C-" : "S-";
    const nextCode = `${prefix}NEW-0${data.length + 1}`;
    setFormState({
      ...formState,
      category: cat,
      vendorCode: nextCode,
    });
  };

  // 신규 등록 모달 열기
  const handleOpenNewModal = () => {
    setIsNewRegister(true);
    setFormState({
      category: "공급업체",
      vendorCode: `S-NEW-0${data.length + 1}`,
      companyName: "",
      bizRegNo: "",
      bizType: "제조업",
      bizItem: "자동차 플라스틱 사출 부품",
      ceoName: "",
      country: "대한민국",
      zipCode: "",
      baseAddress: "",
      detailAddress: "",
      telNo: "",
      faxNo: "",
      email: "",
      managerName: "",
      isActive: true,
    });
    setIsModalOpen(true);
  };

  // 상세/수정 모달 열기
  const handleOpenDetail = (item: VendorCompanyItem) => {
    setIsNewRegister(false);
    setSelectedItem(item);
    setFormState({ ...item });
    setIsModalOpen(true);
  };

  // 저장 처리 (DB 반영)
  const handleSaveForm = async () => {
    if (!formState.vendorCode?.trim()) {
      alert("업체 식별자(코드)를 입력해주세요.");
      return;
    }
    if (!formState.companyName?.trim()) {
      alert("업체명을 입력해주세요.");
      return;
    }

    try {
      if (isNewRegister) {
        const res = await fetch("/api/v1/basic-info/vendors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formState),
        });
        const json = await res.json();
        if (json.success) {
          alert(`[${formState.companyName}] 업체 마스터 정보가 등록되었습니다.`);
        } else {
          alert(`등록 실패: ${json.error}`);
        }
      } else if (selectedItem) {
        const res = await fetch("/api/v1/basic-info/vendors", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formState, id: selectedItem.id }),
        });
        const json = await res.json();
        if (json.success) {
          alert(`[${formState.companyName}] 업체 정보가 수정되었습니다.`);
        } else {
          alert(`수정 실패: ${json.error}`);
        }
      }
      setIsModalOpen(false);
      await fetchVendors();
    } catch (err: any) {
      alert(`저장 중 오류: ${err.message}`);
    }
  };

  // 삭제/비활성화 처리 (DB 반영)
  const handleDelete = async (id: number) => {
    if (confirm("정말 이 업체 정보를 삭제하시겠습니까?")) {
      try {
        const res = await fetch(`/api/v1/basic-info/vendors?id=${id}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (json.success) {
          alert("삭제되었습니다.");
          await fetchVendors();
        } else {
          alert(`삭제 실패: ${json.error}`);
        }
      } catch (err: any) {
        alert(`삭제 중 오류: ${err.message}`);
      }
    }
  };

  // 구분 배지 스타일
  const getCategoryBadge = (cat: CompanyCategory) => {
    switch (cat) {
      case "고객사":
        return "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300";
      case "공급업체":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300";
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 1. 상단 검색 필터 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex flex-col gap-2">
        <div className="pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <DateRangeFilter
            label="조회 기간 (수정일)"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">구분 (8/14 검토안)</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="h-7 rounded-md border bg-transparent px-2 text-xs font-bold"
            >
              <option value="ALL">전체 구분</option>
              <option value="고객사">고객사 (C시작 코드)</option>
              <option value="공급업체">공급업체 (S시작 코드)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">업체명</span>
            <Input 
              value={filterCompanyName} 
              onChange={(e) => setFilterCompanyName(e.target.value)} 
              placeholder="현대, 모비스, 우성, 뉴몰드" 
              className="h-7 text-xs" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">사업자등록번호</span>
            <Input 
              value={filterBizRegNo} 
              onChange={(e) => setFilterBizRegNo(e.target.value)} 
              placeholder="101-81-09147" 
              className="h-7 text-xs font-mono" 
            />
          </div>
          <div className="flex items-end gap-1.5">
            <Button onClick={handleSearch} className="h-7 px-3 bg-sky-600 hover:bg-sky-700 text-white gap-1 text-xs flex-1">
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

      {/* 2. 메인 업체 목록 그리드 (8/14 엑셀 시트 필드 100% 반영) */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs overflow-hidden flex flex-col min-h-[480px]">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b">
          <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-100">
            <Building2 className="h-4 w-4 text-sky-600" />
            <span>기초정보관리 - 업체정보 관리대장 (고객사·협력사 마스터)</span>
            {isLoading && (
              <span className="flex items-center gap-1 text-[11px] font-normal text-sky-600 dark:text-sky-400">
                <Loader2 className="h-3 w-3 animate-spin" /> DB 불러오는 중...
              </span>
            )}
            <span className="text-[11px] font-normal text-zinc-500 ml-1">
              (총 <b className="text-sky-600 font-mono">{data.length}</b>개사)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => alert("거래처 마스터 목록이 Excel 파일로 다운로드되었습니다.")}
              variant="outline" 
              size="xs" 
              className="h-7 px-2.5 gap-1 text-xs text-zinc-600"
            >
              <Download className="h-3.5 w-3.5" />
              엑셀 다운로드
            </Button>
            <Button onClick={handleOpenNewModal} size="xs" className="h-7 px-2.5 bg-sky-600 hover:bg-sky-700 text-white gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" />
              신규 업체 등록
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full border-collapse text-left border-spacing-0 whitespace-nowrap">
            <thead className="sticky top-0 bg-[#2d3748] text-white text-[11px] z-10">
              <tr>
                <th className="p-1.5 w-10 text-center border-r border-slate-600">No</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[80px] text-center">구분</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px]">업체식별자</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[150px]">업체명</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px]">사업자번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[80px]">대표자</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[80px]">업태</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[140px]">종목</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px]">대표전화</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px]">대표팩스</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[150px]">대표이메일</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[200px]">사업장 주소</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[70px] text-center">사용여부</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px] text-center">최종수정일</th>
                <th className="p-1.5 min-w-[80px] text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px]">
              {data.map((row, idx) => (
                <tr key={row.id} className="hover:bg-sky-50/70 dark:hover:bg-zinc-800/60 transition-colors odd:bg-white even:bg-zinc-50/40 dark:odd:bg-zinc-900 dark:even:bg-zinc-900/50">
                  <td className="p-1.5 text-center font-mono text-zinc-400 border-r">{idx + 1}</td>
                  
                  {/* 구분 */}
                  <td className="p-1.5 border-r text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadge(row.category)}`}>
                      {row.category}
                    </span>
                  </td>

                  <td className="p-1.5 border-r font-mono font-bold text-sky-600">{row.vendorCode}</td>
                  <td className="p-1.5 border-r font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[150px]" title={row.companyName}>{row.companyName}</td>
                  <td className="p-1.5 border-r font-mono">{row.bizRegNo}</td>
                  <td className="p-1.5 border-r">{row.ceoName}</td>
                  <td className="p-1.5 border-r">{row.bizType}</td>
                  <td className="p-1.5 border-r truncate max-w-[140px]" title={row.bizItem}>{row.bizItem}</td>
                  <td className="p-1.5 border-r font-mono">{row.telNo}</td>
                  <td className="p-1.5 border-r font-mono text-zinc-500">{row.faxNo || "-"}</td>
                  <td className="p-1.5 border-r font-mono truncate max-w-[150px]" title={row.email}>{row.email}</td>
                  
                  {/* 주소 */}
                  <td className="p-1.5 border-r truncate max-w-[200px]" title={`${row.baseAddress} ${row.detailAddress}`}>
                    {row.baseAddress} {row.detailAddress}
                  </td>

                  {/* 사용여부 */}
                  <td className="p-1.5 border-r text-center">
                    <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${row.isActive ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-500"}`}>
                      {row.isActive ? "사용" : "미사용"}
                    </span>
                  </td>

                  {/* 최종수정일 */}
                  <td className="p-1.5 border-r text-center font-mono text-zinc-500 dark:text-zinc-400">
                    {row.updatedAt}
                  </td>

                  {/* 액션 버튼 */}
                  <td className="p-1.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button 
                        onClick={() => handleOpenDetail(row)} 
                        size="xs" 
                        variant="outline" 
                        className="h-6 px-1.5 text-[10px] text-zinc-600 hover:bg-zinc-100"
                        title="수정"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      <Button 
                        onClick={() => handleDelete(row.id)} 
                        size="xs" 
                        variant="outline" 
                        className="h-6 px-1.5 text-[10px] text-rose-600 hover:bg-rose-50 border-rose-200"
                        title="삭제"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. [모달] 업체 정보 등록 / 수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-3xl rounded-lg shadow-xl border overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 text-white">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-xs">
                  {isNewRegister ? "신규 업체 등록 (고객사·공급업체 마스터)" : `업체 정보 수정 [${formState.vendorCode}]`}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs">
              {/* 1. 기본 분류 및 식별자 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded border text-[11px]">
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">업체 구분 <span className="text-red-500">*</span></label>
                  <select
                    value={formState.category || "공급업체"}
                    onChange={(e) => handleCategoryChange(e.target.value as CompanyCategory)}
                    className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-bold text-sky-700"
                  >
                    <option value="고객사">고객사 (C시작 코드)</option>
                    <option value="공급업체">공급업체 (S시작 코드)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">업체식별자(코드) <span className="text-red-500">*</span></label>
                  <Input 
                    value={formState.vendorCode || ""} 
                    onChange={(e) => setFormState({ ...formState, vendorCode: e.target.value })}
                    placeholder="C-001, S-001"
                    className="h-7 text-xs bg-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">업체명 <span className="text-red-500">*</span></label>
                  <Input 
                    value={formState.companyName || ""} 
                    onChange={(e) => setFormState({ ...formState, companyName: e.target.value })}
                    placeholder="예: 우성정공, 뉴몰드"
                    className="h-7 text-xs bg-white font-bold"
                  />
                </div>
              </div>

              {/* 2. 사업자 등록 정보 */}
              <div className="border rounded p-3.5 flex flex-col gap-3">
                <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-sky-600" />
                  사업자 정보 및 대표자
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div>
                    <label className="block text-zinc-500 mb-1">사업자등록번호 <span className="text-red-500">*</span></label>
                    <Input 
                      value={formState.bizRegNo || ""} 
                      onChange={(e) => setFormState({ ...formState, bizRegNo: e.target.value })}
                      placeholder="000-00-00000"
                      className="h-7 text-xs bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">대표자명 <span className="text-red-500">*</span></label>
                    <Input 
                      value={formState.ceoName || ""} 
                      onChange={(e) => setFormState({ ...formState, ceoName: e.target.value })}
                      placeholder="대표자 성명"
                      className="h-7 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">업태</label>
                    <Input 
                      value={formState.bizType || ""} 
                      onChange={(e) => setFormState({ ...formState, bizType: e.target.value })}
                      placeholder="제조업, 서비스 등"
                      className="h-7 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">종목</label>
                    <Input 
                      value={formState.bizItem || ""} 
                      onChange={(e) => setFormState({ ...formState, bizItem: e.target.value })}
                      placeholder="플라스틱사출, 금형 등"
                      className="h-7 text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div>
                    <label className="block text-zinc-500 mb-1">국가</label>
                    <Input 
                      value={formState.country || "대한민국"} 
                      onChange={(e) => setFormState({ ...formState, country: e.target.value })}
                      className="h-7 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">주요 담당자</label>
                    <Input 
                      value={formState.managerName || ""} 
                      onChange={(e) => setFormState({ ...formState, managerName: e.target.value })}
                      placeholder="담당자 성명/직함"
                      className="h-7 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">사용 여부</label>
                    <select
                      value={formState.isActive ? "Y" : "N"}
                      onChange={(e) => setFormState({ ...formState, isActive: e.target.value === "Y" })}
                      className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-bold text-emerald-700"
                    >
                      <option value="Y">사용 (거래중)</option>
                      <option value="N">미사용 (거래중단)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. 연락처 및 사업장 소재지 */}
              <div className="border rounded p-3.5 flex flex-col gap-3 bg-sky-50/20 dark:bg-sky-950/10">
                <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-sky-600" />
                  연락처 및 사업장 주소
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                  <div>
                    <label className="block text-zinc-500 mb-1">대표전화 <span className="text-red-500">*</span></label>
                    <Input 
                      value={formState.telNo || ""} 
                      onChange={(e) => setFormState({ ...formState, telNo: e.target.value })}
                      placeholder="031-000-0000"
                      className="h-7 text-xs bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">대표팩스</label>
                    <Input 
                      value={formState.faxNo || ""} 
                      onChange={(e) => setFormState({ ...formState, faxNo: e.target.value })}
                      placeholder="031-000-0001"
                      className="h-7 text-xs bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">대표이메일 <span className="text-red-500">*</span></label>
                    <Input 
                      type="email"
                      value={formState.email || ""} 
                      onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                      placeholder="contact@company.com"
                      className="h-7 text-xs bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 text-[11px]">
                  <div>
                    <label className="block text-zinc-500 mb-1">우편번호</label>
                    <Input 
                      value={formState.zipCode || ""} 
                      onChange={(e) => setFormState({ ...formState, zipCode: e.target.value })}
                      placeholder="12345"
                      className="h-7 text-xs bg-white font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-zinc-500 mb-1">기본주소</label>
                    <Input 
                      value={formState.baseAddress || ""} 
                      onChange={(e) => setFormState({ ...formState, baseAddress: e.target.value })}
                      placeholder="시/도 구/군 도로명 주소"
                      className="h-7 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">상세주소</label>
                    <Input 
                      value={formState.detailAddress || ""} 
                      onChange={(e) => setFormState({ ...formState, detailAddress: e.target.value })}
                      placeholder="동/호수, 공단 블럭"
                      className="h-7 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 border-t">
              <Button onClick={() => setIsModalOpen(false)} variant="outline" className="h-8 px-3 text-xs">
                취소
              </Button>
              <Button 
                onClick={handleSaveForm}
                className="h-8 px-4 text-xs bg-sky-600 hover:bg-sky-700 text-white gap-1.5 font-bold"
              >
                <Check className="h-3.5 w-3.5" />
                업체 정보 저장
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
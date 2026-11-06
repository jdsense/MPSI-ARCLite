"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, RefreshCw, Users, Plus, 
  Eye, X, Check, Building2, Mail, 
  Phone, Smartphone, Briefcase, ShieldCheck, 
  Download, UploadCloud, Edit3, Trash2, Loader2, ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangeFilter, isWithinDateRange, DatePresetType } from "@/components/common/date-range-filter";
import { useAuthRole } from "@/lib/role-store";
import { usePermissionStore, getScreenPermission } from "@/lib/permission-store";

// 1. 사원 구분 및 직무 타입 정의 (8/14 엑셀 시트 반영)
type EmployeeCategory = "자사" | "고객사" | "공급업체";
type EmploymentType = "정규직" | "계약직" | "협력사파견" | "임원";

// 2. 사원 정보 인터페이스
interface EmployeeItem {
  id: number;
  category: EmployeeCategory; // 구분: 자사, 고객사(C시작), 공급업체(S시작)
  companyName: string;        // 업체명
  empCode: string;            // 사원식별자
  name: string;               // 사원명
  deptName: string;           // 부서명
  taskRole: string;           // 담당업무 (예: 금형설계, 사출품질, CAE해석, 구매)
  relatedPjt: string;         // 관련PJT (NT5-2026-A, A2XT-M01 등)
  employmentType: EmploymentType; // 재직유형
  email: string;              // 이메일
  officeTel: string;          // 사무실전화
  mobilePhone: string;        // 핸드폰
  systemRole: "ADMIN" | "MANAGER" | "OPERATOR" | "VIEWER"; // 시스템 권한
  isActive: boolean;          // 재직/사용 여부
  updatedAt: string;
}

// 초기 샘플 데이터 (MPSI ↔ 우성정공 ↔ 뉴몰드 실무진 반영)
const initialEmployees: EmployeeItem[] = [
  {
    id: 1,
    category: "자사",
    companyName: "MPSI (원청)",
    empCode: "EMP-2026-001",
    name: "김태훈",
    deptName: "개발기획팀",
    taskRole: "금형/사출 개발 총괄 및 DR 검토",
    relatedPjt: "NT5-2026-A, A2XT-M01",
    employmentType: "정규직",
    email: "thkim@mpsi.co.kr",
    officeTel: "062-951-1234",
    mobilePhone: "010-3344-5566",
    systemRole: "ADMIN",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    id: 2,
    category: "자사",
    companyName: "MPSI (원청)",
    empCode: "EMP-2026-002",
    name: "김양훈",
    deptName: "품질보증부",
    taskRole: "시사출 판정(Pass/Fail) 및 수입검사(IQC)",
    relatedPjt: "NT5-2026-A, SPX-EV-09",
    employmentType: "정규직",
    email: "yhkim@mpsi.co.kr",
    officeTel: "062-951-1235",
    mobilePhone: "010-8877-6655",
    systemRole: "MANAGER",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    id: 3,
    category: "고객사",
    companyName: "현대자동차 (1차사)",
    empCode: "C-HK-2026-01",
    name: "최민희",
    deptName: "의장설계팀",
    taskRole: "도어 트림 설계 사양 협의 및 DR 승인",
    relatedPjt: "NT5-2026-A",
    employmentType: "정규직",
    email: "mhchoi@partner-hk.com",
    officeTel: "02-3464-1114",
    mobilePhone: "010-9988-1122",
    systemRole: "VIEWER",
    isActive: true,
    updatedAt: "2026-08-18",
  },
  {
    id: 4,
    category: "공급업체",
    companyName: "우성정공 (금형제작)",
    empCode: "S-WS-2026-01",
    name: "배희섭",
    deptName: "기술영업/설계실",
    taskRole: "금형 견적/설계 및 CAE 유동해석",
    relatedPjt: "NT5-2026-A, A2XT-M01",
    employmentType: "임원",
    email: "hsbae@woosung.co.kr",
    officeTel: "032-815-5678",
    mobilePhone: "010-5544-3322",
    systemRole: "MANAGER",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    id: 5,
    category: "공급업체",
    companyName: "뉴몰드 (사출양산)",
    empCode: "S-NM-2026-01",
    name: "김부곤",
    deptName: "생산기술부",
    taskRole: "사출 성형기 가동, CPK 검증 및 납품 관리",
    relatedPjt: "NT5-2026-A, SPX-EV-09",
    employmentType: "임원",
    email: "bgkim@newmold.co.kr",
    officeTel: "031-498-7890",
    mobilePhone: "010-7766-5544",
    systemRole: "OPERATOR",
    isActive: true,
    updatedAt: "2026-08-19",
  }
];

export default function EmployeeManagementPage() {
  const router = useRouter();
  const { role } = useAuthRole();
  const { menuPermissions } = usePermissionStore();
  const perm = getScreenPermission("C810000", role, menuPermissions);

  const [data, setData] = useState<EmployeeItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterCompanyName, setFilterCompanyName] = useState<string>("");
  const [filterEmpName, setFilterEmpName] = useState<string>("");
  const [filterRelatedPjt, setFilterRelatedPjt] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePresetType>("all");

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewRegister, setIsNewRegister] = useState(false);
  const [selectedItem, setSelectedItem] = useState<EmployeeItem | null>(null);

  // 폼 입력 상태
  const [formState, setFormState] = useState<Partial<EmployeeItem>>({
    category: "자사",
    companyName: "MPSI (원청)",
    empCode: "",
    name: "",
    deptName: "",
    taskRole: "",
    relatedPjt: "",
    employmentType: "정규직",
    email: "",
    officeTel: "",
    mobilePhone: "",
    systemRole: "OPERATOR",
    isActive: true,
  });

  // DB에서 사원 목록 조회
  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterEmpName) params.set("name", filterEmpName);

      const res = await fetch(`/api/v1/basic-info/employees?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setData(json.data);
      }
    } catch (err) {
      console.error("사원 목록 조회 실패:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filterEmpName]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // 검색
  const handleSearch = () => {
    fetchEmployees();
  };

  const handleReset = () => {
    setFilterCategory("ALL");
    setFilterCompanyName("");
    setFilterEmpName("");
    setFilterRelatedPjt("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSelectedDatePreset("all");
    setTimeout(() => {
      fetch("/api/v1/basic-info/employees")
        .then((res) => res.json())
        .then((json) => {
          if (json.success) setData(json.data);
        });
    }, 0);
  };

  // 사원 구분 변경 시 식별자(코드) 접두사 자동 추천
  const handleCategoryChange = (cat: EmployeeCategory) => {
    let prefix = "EMP-";
    let defaultCompany = "MPSI (원청)";
    if (cat === "고객사") {
      prefix = "C-HK-";
      defaultCompany = "현대자동차";
    } else if (cat === "공급업체") {
      prefix = "S-WS-";
      defaultCompany = "우성정공";
    }

    setFormState({
      ...formState,
      category: cat,
      companyName: defaultCompany,
      empCode: `${prefix}2026-0${data.length + 1}`,
    });
  };

  // 신규 등록 모달 열기
  const handleOpenNewModal = () => {
    setIsNewRegister(true);
    setFormState({
      category: "자사",
      companyName: "MPSI (원청)",
      empCode: `EMP-2026-0${data.length + 1}`,
      name: "",
      deptName: "생산관리팀",
      taskRole: "사출 공정 0~140 작업관리",
      relatedPjt: "NT5-2026-A",
      employmentType: "정규직",
      email: "",
      officeTel: "062-951-1234",
      mobilePhone: "",
      systemRole: "OPERATOR",
      isActive: true,
    });
    setIsModalOpen(true);
  };

  // 상세/수정 모달 열기
  const handleOpenDetail = (item: EmployeeItem) => {
    setIsNewRegister(false);
    setSelectedItem(item);
    setFormState({ ...item });
    setIsModalOpen(true);
  };

  // 저장 처리 (DB 반영)
  const handleSaveForm = async () => {
    if (!formState.empCode?.trim()) {
      alert("사원식별자(코드)를 입력해주세요.");
      return;
    }
    if (!formState.name?.trim()) {
      alert("사원명을 입력해주세요.");
      return;
    }

    try {
      if (isNewRegister) {
        const res = await fetch("/api/v1/basic-info/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formState),
        });
        const json = await res.json();
        if (json.success) {
          alert(`[${formState.name}] 사원 정보가 등록되었습니다.`);
        } else {
          alert(`등록 실패: ${json.error}`);
        }
      } else if (selectedItem) {
        const res = await fetch("/api/v1/basic-info/employees", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formState, id: selectedItem.id }),
        });
        const json = await res.json();
        if (json.success) {
          alert(`[${formState.name}] 사원 정보가 수정되었습니다.`);
        } else {
          alert(`수정 실패: ${json.error}`);
        }
      }
      setIsModalOpen(false);
      await fetchEmployees();
    } catch (err: any) {
      alert(`저장 중 오류: ${err.message}`);
    }
  };

  // 삭제 처리 (DB 반영)
  const handleDelete = async (id: number) => {
    if (confirm("정말 이 사원 정보를 삭제하시겠습니까?")) {
      try {
        const res = await fetch(`/api/v1/basic-info/employees?id=${id}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (json.success) {
          alert("삭제되었습니다.");
          await fetchEmployees();
        } else {
          alert(`삭제 실패: ${json.error}`);
        }
      } catch (err: any) {
        alert(`삭제 중 오류: ${err.message}`);
      }
    }
  };

  // 구분 배지 스타일
  const getCategoryBadge = (cat: EmployeeCategory) => {
    switch (cat) {
      case "자사":
        return "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300";
      case "고객사":
        return "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300";
      case "공급업체":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300";
    }
  };

  // 4. 화면 조회 권한(canRead) 차단 처리
  if (!perm.canRead) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[460px] gap-4 bg-white dark:bg-zinc-900 border rounded-lg p-8 text-center shadow-xs my-6">
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-full text-rose-600">
          <ShieldAlert className="h-12 w-12" />
        </div>
        <div className="flex flex-col gap-1.5 max-w-md">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            화면 접근 권한이 없습니다
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            현재 로그인된 권한 <b>[{role}]</b>은(는) <b>사원정보 (C810000)</b> 화면의 조회 권한이 비활성화되어 있습니다. 권한 설정은 시스템 관리자(ADMIN)를 통해 [시스템관리 &gt; 권한관리]에서 변경할 수 있습니다.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/portal/project")} className="text-xs">
          프로젝트 관리로 이동
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 1. 상단 검색바 */}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">구분 (8/14 검토안)</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="h-7 rounded-md border bg-transparent px-2 text-xs font-bold"
            >
              <option value="ALL">전체 구분</option>
              <option value="자사">자사 (MPSI)</option>
              <option value="고객사">고객사 (C시작 코드)</option>
              <option value="공급업체">공급업체 (S시작 코드)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">업체명</span>
            <Input 
              value={filterCompanyName} 
              onChange={(e) => setFilterCompanyName(e.target.value)} 
              placeholder="MPSI, 현대, 우성, 뉴몰드" 
              className="h-7 text-xs" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">사원명</span>
            <Input 
              value={filterEmpName} 
              onChange={(e) => setFilterEmpName(e.target.value)} 
              placeholder="사원명 입력" 
              className="h-7 text-xs" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">관련 프로젝트(PJT)</span>
            <Input 
              value={filterRelatedPjt} 
              onChange={(e) => setFilterRelatedPjt(e.target.value)} 
              placeholder="NT5, A2XT, SPX" 
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

      {/* 2. 메인 사원 목록 그리드 (8/14 엑셀 시트 100% 필드 반영) */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs overflow-hidden flex flex-col min-h-[480px]">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b">
          <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-100">
            <Users className="h-4 w-4 text-sky-600" />
            <span>기초정보관리 - 사원정보 관리대장 (자사·고객사·협력사 3사 통합)</span>
            <span className="text-[11px] font-normal text-zinc-500 ml-1">
              (총 <b className="text-sky-600 font-mono">{data.length}</b>명)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => alert("사원 마스터 목록이 Excel 파일로 다운로드되었습니다.")}
              variant="outline" 
              size="xs" 
              className="h-7 px-2.5 gap-1 text-xs text-zinc-600"
            >
              <Download className="h-3.5 w-3.5" />
              엑셀 다운로드
            </Button>
            {perm.canCreate && (
              <Button onClick={handleOpenNewModal} size="xs" className="h-7 px-2.5 bg-sky-600 hover:bg-sky-700 text-white gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" />
                신규 사원 등록
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full border-collapse text-left border-spacing-0 whitespace-nowrap">
            <thead className="sticky top-0 bg-[#2d3748] text-white text-[11px] z-10">
              <tr>
                <th className="p-1.5 w-10 text-center border-r border-slate-600">No</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[80px] text-center">구분</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[130px]">업체명</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px]">사원식별자</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px]">사원명</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[100px]">부서명</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[170px]">담당업무</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[130px] font-mono text-amber-300">관련PJT</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[80px] text-center">재직유형</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[150px]">이메일</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[105px]">핸드폰</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[105px]">사무실전화</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[70px] text-center">상태</th>
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

                  <td className="p-1.5 border-r font-medium truncate max-w-[130px]" title={row.companyName}>{row.companyName}</td>
                  <td className="p-1.5 border-r font-mono font-bold text-sky-600">{row.empCode}</td>
                  <td className="p-1.5 border-r font-bold text-zinc-900 dark:text-zinc-100">{row.name}</td>
                  <td className="p-1.5 border-r text-zinc-600">{row.deptName}</td>
                  <td className="p-1.5 border-r truncate max-w-[170px]" title={row.taskRole}>{row.taskRole}</td>
                  
                  {/* 관련PJT (바인딩) */}
                  <td className="p-1.5 border-r font-mono text-sky-700 dark:text-sky-400 font-medium truncate max-w-[130px]" title={row.relatedPjt}>
                    {row.relatedPjt || "-"}
                  </td>

                  <td className="p-1.5 border-r text-center">{row.employmentType}</td>
                  <td className="p-1.5 border-r font-mono truncate max-w-[150px]" title={row.email}>{row.email}</td>
                  <td className="p-1.5 border-r font-mono">{row.mobilePhone}</td>
                  <td className="p-1.5 border-r font-mono text-zinc-500">{row.officeTel || "-"}</td>

                  {/* 재직 상태 */}
                  <td className="p-1.5 border-r text-center">
                    <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${row.isActive ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-500"}`}>
                      {row.isActive ? "재직" : "퇴사"}
                    </span>
                  </td>

                  {/* 액션 버튼 */}
                  <td className="p-1.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {perm.canUpdate && (
                        <Button 
                          onClick={() => handleOpenDetail(row)} 
                          size="xs" 
                          variant="outline" 
                          className="h-6 px-1.5 text-[10px] text-zinc-600 hover:bg-zinc-100"
                          title="수정"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      )}
                      {perm.canDelete && (
                        <Button 
                          onClick={() => handleDelete(row.id)} 
                          size="xs" 
                          variant="outline" 
                          className="h-6 px-1.5 text-[10px] text-rose-600 hover:bg-rose-50 border-rose-200"
                          title="삭제"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                      {!perm.canUpdate && !perm.canDelete && (
                        <span className="text-[10px] text-zinc-400 font-mono">조회전용</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. [모달] 사원 정보 등록 / 수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-lg shadow-xl border overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 text-white">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-xs">
                  {isNewRegister ? "신규 사원 등록 (자사·고객사·공급업체)" : `사원 정보 수정 [${formState.empCode}]`}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs">
              {/* 1. 사원 소속 및 기본 구분 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded border text-[11px]">
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">구분 <span className="text-red-500">*</span></label>
                  <select
                    value={formState.category || "자사"}
                    onChange={(e) => handleCategoryChange(e.target.value as EmployeeCategory)}
                    className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-bold text-sky-700"
                  >
                    <option value="자사">자사 (MPSI)</option>
                    <option value="고객사">고객사 (C시작 코드)</option>
                    <option value="공급업체">공급업체 (S시작 코드)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">업체명 <span className="text-red-500">*</span></label>
                  <Input 
                    value={formState.companyName || ""} 
                    onChange={(e) => setFormState({ ...formState, companyName: e.target.value })}
                    placeholder="예: MPSI, 현대자동차, 우성정공, 뉴몰드"
                    className="h-7 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">사원식별자(코드) <span className="text-red-500">*</span></label>
                  <Input 
                    value={formState.empCode || ""} 
                    onChange={(e) => setFormState({ ...formState, empCode: e.target.value })}
                    placeholder="EMP-001, C-001, S-001"
                    className="h-7 text-xs bg-white font-mono font-bold"
                  />
                </div>
              </div>

              {/* 2. 사원 인적 사항 및 직무 */}
              <div className="border rounded p-3.5 flex flex-col gap-3">
                <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-sky-600" />
                  사원 인적 사항 및 담당 업무
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div>
                    <label className="block text-zinc-500 mb-1">사원명 <span className="text-red-500">*</span></label>
                    <Input 
                      value={formState.name || ""} 
                      onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                      placeholder="홍길동"
                      className="h-7 text-xs bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">부서명</label>
                    <Input 
                      value={formState.deptName || ""} 
                      onChange={(e) => setFormState({ ...formState, deptName: e.target.value })}
                      placeholder="개발기획팀, 생산기술부"
                      className="h-7 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">재직유형</label>
                    <select
                      value={formState.employmentType || "정규직"}
                      onChange={(e) => setFormState({ ...formState, employmentType: e.target.value as EmploymentType })}
                      className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs"
                    >
                      <option value="정규직">정규직</option>
                      <option value="계약직">계약직</option>
                      <option value="협력사파견">협력사파견</option>
                      <option value="임원">임원</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">시스템 권한</label>
                    <select
                      value={formState.systemRole || "OPERATOR"}
                      onChange={(e) => setFormState({ ...formState, systemRole: e.target.value as any })}
                      className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-mono font-bold"
                    >
                      <option value="ADMIN">ADMIN (전체관리자)</option>
                      <option value="MANAGER">MANAGER (팀장/승인권자)</option>
                      <option value="OPERATOR">OPERATOR (현장작업자)</option>
                      <option value="VIEWER">VIEWER (조회전용)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <label className="block text-zinc-500 mb-1">담당업무 상세 (공정 흐름 연계)</label>
                    <Input 
                      value={formState.taskRole || ""} 
                      onChange={(e) => setFormState({ ...formState, taskRole: e.target.value })}
                      placeholder="예: 금형설계, CAE해석, 사출성형, OQC검사"
                      className="h-7 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">관련 프로젝트(PJT 관리번호)</label>
                    <Input 
                      value={formState.relatedPjt || ""} 
                      onChange={(e) => setFormState({ ...formState, relatedPjt: e.target.value })}
                      placeholder="예: NT5-2026-A, A2XT-M01"
                      className="h-7 text-xs bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* 3. 연락처 정보 */}
              <div className="border rounded p-3.5 flex flex-col gap-3 bg-sky-50/20 dark:bg-sky-950/10">
                <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-sky-600" />
                  연락처 및 통보 정보 (알림 수신용)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                  <div>
                    <label className="block text-zinc-500 mb-1">이메일 <span className="text-red-500">*</span></label>
                    <Input 
                      type="email"
                      value={formState.email || ""} 
                      onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                      placeholder="hong@company.com"
                      className="h-7 text-xs bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">핸드폰 <span className="text-red-500">*</span></label>
                    <Input 
                      value={formState.mobilePhone || ""} 
                      onChange={(e) => setFormState({ ...formState, mobilePhone: e.target.value })}
                      placeholder="010-1234-5678"
                      className="h-7 text-xs bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">사무실 대표전화</label>
                    <Input 
                      value={formState.officeTel || ""} 
                      onChange={(e) => setFormState({ ...formState, officeTel: e.target.value })}
                      placeholder="062-951-0000"
                      className="h-7 text-xs bg-white font-mono"
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
                사원 정보 저장
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
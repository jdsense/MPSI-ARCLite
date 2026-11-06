"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Search, RefreshCw, Save, Trash2, Plus, 
  ChevronDown, Calendar as CalendarIcon, Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangeFilter, DatePresetType } from "@/components/common/date-range-filter";

// 고객정보 데이터 타입 정의
interface Customer {
  id: number;
  idx: number;
  custCode: string;       // 고객사식별자
  custName: string;       // 고객사명
  bizRegNo: string;       // 사업자등록번호
  ceoName: string;        // 대표자명
  country: string;        // 국가식별자
  zipCode: string;        // 우편번호
  address1: string;       // 기본주소
  address2: string;       // 상세주소
  phone: string;          // 전화번호
  fax: string;            // 팩스번호
  useYn: string;          // 사용여부 (Y/N)
  managerName: string;    // 담당자명
  managerEmail: string;   // 담당자이메일명
  managerPhone: string;   // 담당자전화번호
  regDate: string;        // 등록일자 (조회기간 필터용)
  isNew?: boolean;        // 신규 추가 플래그
}

export default function CustomerPage() {
  // 상단 검색 8개 필터 상태
  const [filterCustCode, setFilterCustCode] = useState("");
  const [filterCustName, setFilterCustName] = useState("");
  const [filterBizRegNo, setFilterBizRegNo] = useState("");
  const [filterCeoName, setFilterCeoName] = useState("");
  const [filterCountry, setFilterCountry] = useState("ALL");
  const [filterUseYn, setFilterUseYn] = useState("ALL");
  const [filterManagerName, setFilterManagerName] = useState("");
  const [filterManagerEmail, setFilterManagerEmail] = useState("");
  const [filterManagerPhone, setFilterManagerPhone] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePresetType>("all");

  // 테이블 데이터 및 선택 상태
  const [data, setData] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);

  // DB에서 고객사 목록 조회
  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCustCode) params.set("custCode", filterCustCode);
      if (filterCustName) params.set("custName", filterCustName);
      if (filterBizRegNo) params.set("bizRegNo", filterBizRegNo);
      if (filterCeoName) params.set("ceoName", filterCeoName);
      if (filterCountry !== "ALL") params.set("country", filterCountry);
      if (filterUseYn !== "ALL") params.set("useYn", filterUseYn);
      if (filterDateFrom) params.set("dateFrom", filterDateFrom);
      if (filterDateTo) params.set("dateTo", filterDateTo);

      const res = await fetch(`/api/v1/basic-info/customers?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setData(json.data);
      }
    } catch (err) {
      console.error("고객사 목록 조회 실패:", err);
    } finally {
      setIsLoading(false);
    }
  }, [
    filterCustCode,
    filterCustName,
    filterBizRegNo,
    filterCeoName,
    filterCountry,
    filterUseYn,
    filterDateFrom,
    filterDateTo,
  ]);

  // 최초 로드
  useEffect(() => {
    fetchCustomers();
  }, []);

  // 검색 처리
  const handleSearch = () => {
    fetchCustomers();
  };

  // 초기화 처리
  const handleReset = () => {
    setFilterCustCode("");
    setFilterCustName("");
    setFilterBizRegNo("");
    setFilterCeoName("");
    setFilterCountry("ALL");
    setFilterUseYn("ALL");
    setFilterManagerName("");
    setFilterManagerEmail("");
    setFilterManagerPhone("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSelectedDatePreset("all");
    setTimeout(() => {
      fetch("/api/v1/basic-info/customers")
        .then((res) => res.json())
        .then((json) => {
          if (json.success) setData(json.data);
        });
    }, 0);
  };

  // 행 추가
  const handleAddRow = () => {
    const newId = Date.now();
    const today = new Date().toISOString().split("T")[0];
    const newRow: Customer = {
      id: newId,
      idx: data.length + 1,
      custCode: `CUST-${String(data.length + 1).padStart(3, "0")}`,
      custName: "",
      bizRegNo: "",
      ceoName: "",
      country: "KR",
      zipCode: "",
      address1: "",
      address2: "",
      phone: "",
      fax: "",
      useYn: "Y",
      managerName: "",
      managerEmail: "",
      managerPhone: "",
      regDate: today,
      isNew: true,
    };
    setData([newRow, ...data]);
  };

  // 선택 행 삭제
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      alert("삭제할 항목을 선택해주세요.");
      return;
    }
    if (!confirm(`선택한 ${selectedIds.length}건의 고객정보를 삭제하시겠습니까?`)) {
      return;
    }

    // 신규 추가되어 아직 DB에 없는 행은 클라이언트에서만 제거
    const serverIds = selectedIds.filter((id) => {
      const item = data.find((d) => d.id === id);
      return item && !item.isNew;
    });

    if (serverIds.length > 0) {
      try {
        const res = await fetch(`/api/v1/basic-info/customers?ids=${serverIds.join(",")}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (!json.success) {
          alert(`삭제 실패: ${json.error}`);
          return;
        }
      } catch (err: any) {
        alert(`삭제 중 오류가 발생했습니다: ${err.message}`);
        return;
      }
    }

    setData((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
    setSelectedIds([]);
    alert("선택한 고객정보가 삭제되었습니다.");
  };

  // 인라인 셀 수정
  const handleCellChange = (id: number, field: keyof Customer, value: string) => {
    setData((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  // 전체 선택 / 해제
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(data.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  // 단일 선택 토글
  const handleSelectRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // 저장 처리 (DB 반영)
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newItems = data.filter((item) => item.isNew);
      const existingItems = data.filter((item) => !item.isNew);

      // 신규 등록
      for (const item of newItems) {
        if (!item.custName) {
          alert("고객사명은 필수 입력 항목입니다.");
          setIsSaving(false);
          return;
        }
        await fetch("/api/v1/basic-info/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
      }

      // 기존 항목 수정
      if (existingItems.length > 0) {
        await fetch("/api/v1/basic-info/customers", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(existingItems),
        });
      }

      alert("고객정보가 성공적으로 PostgreSQL DB에 저장되었습니다.");
      await fetchCustomers();
    } catch (err: any) {
      console.error("저장 오류:", err);
      alert(`저장 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 1. 상단 8개 검색 조건 필터 영역 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex flex-col gap-2">
        <div className="pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <DateRangeFilter
            label="조회 기간 (등록일)"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          {/* 1라인 */}
          <div className="flex items-center gap-1.5">
            <span className="w-24 text-zinc-600 dark:text-zinc-400 font-medium shrink-0">고객사식별자</span>
            <Input 
              value={filterCustCode} 
              onChange={(e) => setFilterCustCode(e.target.value)} 
              placeholder="전체" 
              className="h-7 text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-24 text-zinc-600 dark:text-zinc-400 font-medium shrink-0">고객사명</span>
            <Input 
              value={filterCustName} 
              onChange={(e) => setFilterCustName(e.target.value)} 
              placeholder="전체" 
              className="h-7 text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-24 text-zinc-600 dark:text-zinc-400 font-medium shrink-0">사업자등록번호</span>
            <Input 
              value={filterBizRegNo} 
              onChange={(e) => setFilterBizRegNo(e.target.value)} 
              placeholder="전체" 
              className="h-7 text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-24 text-zinc-600 dark:text-zinc-400 font-medium shrink-0">대표자명</span>
            <Input 
              value={filterCeoName} 
              onChange={(e) => setFilterCeoName(e.target.value)} 
              placeholder="전체" 
              className="h-7 text-xs"
            />
          </div>

          {/* 2라인 */}
          <div className="flex items-center gap-1.5">
            <span className="w-24 text-zinc-600 dark:text-zinc-400 font-medium shrink-0">국가식별자</span>
            <select 
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className="h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs shadow-xs focus-visible:outline-hidden"
            >
              <option value="ALL">전체</option>
              <option value="KR">KR (대한민국)</option>
              <option value="US">US (미국)</option>
              <option value="JP">JP (일본)</option>
              <option value="CN">CN (중국)</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-24 text-zinc-600 dark:text-zinc-400 font-medium shrink-0">사용여부</span>
            <select 
              value={filterUseYn}
              onChange={(e) => setFilterUseYn(e.target.value)}
              className="h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs shadow-xs focus-visible:outline-hidden"
            >
              <option value="ALL">전체</option>
              <option value="Y">Y (사용)</option>
              <option value="N">N (미사용)</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-24 text-zinc-600 dark:text-zinc-400 font-medium shrink-0">담당자명</span>
            <Input 
              value={filterManagerName} 
              onChange={(e) => setFilterManagerName(e.target.value)} 
              placeholder="전체" 
              className="h-7 text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-24 text-zinc-600 dark:text-zinc-400 font-medium shrink-0">담당자이메일명</span>
            <Input 
              value={filterManagerEmail} 
              onChange={(e) => setFilterManagerEmail(e.target.value)} 
              placeholder="전체" 
              className="h-7 text-xs"
            />
          </div>
        </div>

        {/* 검색 / 초기화 버튼 (우측 상단 정렬) */}
        <div className="flex justify-end gap-1.5 pt-1 border-t border-zinc-100 dark:border-zinc-800">
          <Button onClick={handleSearch} className="h-7 px-3 bg-sky-600 hover:bg-sky-700 text-white gap-1 text-xs">
            <Search className="h-3.5 w-3.5" />
            검색
          </Button>
          <Button onClick={handleReset} variant="outline" className="h-7 px-3 gap-1 text-xs text-zinc-600">
            <RefreshCw className="h-3.5 w-3.5" />
            초기화
          </Button>
        </div>
      </div>

      {/* 2. 타이틀 및 데이터 그리드 영역 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs overflow-hidden flex flex-col">
        {/* 그리드 상단 바 */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border-b">
          <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-100">
            <div className="w-1.5 h-3.5 bg-sky-600 rounded-xs" />
            <span>고객정보</span>
            {isLoading && (
              <span className="flex items-center gap-1 text-[11px] font-normal text-sky-600 dark:text-sky-400">
                <Loader2 className="h-3 w-3 animate-spin" /> DB 불러오는 중...
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              variant="outline" 
              className="h-7 px-2.5 text-xs gap-1 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-300 hover:bg-sky-100"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              저장
            </Button>
            <Button onClick={handleDeleteSelected} variant="outline" className="h-7 px-2.5 text-xs gap-1 text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
              삭제
            </Button>
            <Button onClick={handleAddRow} variant="outline" className="h-7 px-2.5 text-xs gap-1">
              <Plus className="h-3.5 w-3.5 text-zinc-500" />
              등록
            </Button>
          </div>
        </div>

        {/* 고객정보 데이터 테이블 (가로 스크롤 대응) */}
        <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto">
          <table className="w-full border-collapse text-left border-spacing-0">
            <thead className="sticky top-0 bg-[#2d3748] text-white text-[11px] z-10">
              {/* 메인 컬럼 타이틀 라인 */}
              <tr>
                <th className="p-1.5 w-8 text-center border-r border-slate-600">Idx</th>
                <th className="p-1.5 w-8 text-center border-r border-slate-600">
                  <input 
                    type="checkbox" 
                    onChange={(e) => handleSelectAll(e.target.checked)} 
                    checked={selectedIds.length === data.length && data.length > 0}
                    className="rounded-xs"
                  />
                </th>
                <th className="p-1.5 border-r border-slate-600 min-w-[100px]">고객사식별자</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[120px]"><span className="text-red-400 mr-0.5">*</span>고객사명</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px]"><span className="text-red-400 mr-0.5">*</span>사업자등록번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px]"><span className="text-red-400 mr-0.5">*</span>대표자명</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[80px]">국가식별자</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[80px]">우편번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[150px]">기본주소</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[130px]">상세주소</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px]">전화번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px]">팩스번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[70px]">사용여부</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px]">담당자명</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[160px]">담당자이메일명</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[120px]">담당자전화번호</th>
                <th className="p-1.5 min-w-[95px] text-center">등록일자</th>
              </tr>
              {/* 컬럼별 개별 필터 라인 */}
              <tr className="bg-[#3a475d] border-t border-slate-600">
                <th className="p-1 border-r border-slate-600"></th>
                <th className="p-1 border-r border-slate-600"></th>
                {[...Array(4)].map((_, i) => (
                  <th key={i} className="p-1 border-r border-slate-600">
                    <div className="flex items-center bg-white text-zinc-800 px-1 rounded-xs h-5">
                      <span className="text-xs text-zinc-400 cursor-pointer">×</span>
                    </div>
                  </th>
                ))}
                {/* 국가식별자 필터 (드롭다운 형태) */}
                <th className="p-1 border-r border-slate-600">
                  <div className="flex items-center justify-between bg-white text-zinc-800 px-1 rounded-xs h-5">
                    <span className="text-xs text-zinc-400 cursor-pointer">×</span>
                    <ChevronDown className="h-3 w-3 text-zinc-500" />
                  </div>
                </th>
                {[...Array(5)].map((_, i) => (
                  <th key={i} className="p-1 border-r border-slate-600">
                    <div className="flex items-center bg-white text-zinc-800 px-1 rounded-xs h-5">
                      <span className="text-xs text-zinc-400 cursor-pointer">×</span>
                    </div>
                  </th>
                ))}
                {/* 사용여부 필터 (드롭다운 형태) */}
                <th className="p-1 border-r border-slate-600">
                  <div className="flex items-center justify-between bg-white text-zinc-800 px-1 rounded-xs h-5">
                    <span className="text-xs text-zinc-400 cursor-pointer">×</span>
                    <ChevronDown className="h-3 w-3 text-zinc-500" />
                  </div>
                </th>
                {[...Array(2)].map((_, i) => (
                  <th key={i} className="p-1 border-r border-slate-600">
                    <div className="flex items-center bg-white text-zinc-800 px-1 rounded-xs h-5">
                      <span className="text-xs text-zinc-400 cursor-pointer">×</span>
                    </div>
                  </th>
                ))}
                <th className="p-1"></th>
              </tr>
            </thead>

            {/* 테이블 본문 */}
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
              {data.map((row) => {
                const isSelected = selectedRowId === row.idx;
                return (
                  <tr 
                    key={row.id}
                    onClick={() => setSelectedRowId(row.idx)}
                    className={`hover:bg-sky-50 dark:hover:bg-zinc-800/60 transition-colors ${
                      isSelected ? "bg-sky-100/70 dark:bg-sky-950/40 text-zinc-900" : "odd:bg-white even:bg-zinc-50/50 dark:odd:bg-zinc-900 dark:even:bg-zinc-900/50"
                    } ${row.isNew ? "bg-amber-50/60 dark:bg-amber-950/30" : ""}`}
                  >
                    {/* Index */}
                    <td className="p-1.5 text-center font-mono text-zinc-500 border-r">{row.idx}</td>
                    {/* Checkbox */}
                    <td className="p-1.5 text-center border-r">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(row.id)}
                        onChange={() => handleSelectRow(row.id)}
                        className="rounded-xs"
                      />
                    </td>
                    {/* 고객사식별자 */}
                    <td className="p-1 border-r font-mono">
                      <input 
                        type="text" 
                        value={row.custCode} 
                        onChange={(e) => handleCellChange(row.id, "custCode", e.target.value)}
                        className="w-full bg-transparent border-none px-1 py-0.5 focus:bg-white focus:ring-1 focus:ring-sky-500 rounded-xs"
                      />
                    </td>
                    {/* 고객사명 */}
                    <td className="p-1 border-r font-medium">
                      <input 
                        type="text" 
                        value={row.custName} 
                        onChange={(e) => handleCellChange(row.id, "custName", e.target.value)}
                        className="w-full bg-transparent border-none px-1 py-0.5 focus:bg-white focus:ring-1 focus:ring-sky-500 rounded-xs font-semibold"
                      />
                    </td>
                    {/* 사업자등록번호 */}
                    <td className="p-1 border-r font-mono">
                      <input 
                        type="text" 
                        value={row.bizRegNo} 
                        onChange={(e) => handleCellChange(row.id, "bizRegNo", e.target.value)}
                        className="w-full bg-transparent border-none px-1 py-0.5 focus:bg-white focus:ring-1 focus:ring-sky-500 rounded-xs"
                      />
                    </td>
                    {/* 대표자명 */}
                    <td className="p-1 border-r">
                      <input 
                        type="text" 
                        value={row.ceoName} 
                        onChange={(e) => handleCellChange(row.id, "ceoName", e.target.value)}
                        className="w-full bg-transparent border-none px-1 py-0.5 focus:bg-white focus:ring-1 focus:ring-sky-500 rounded-xs"
                      />
                    </td>
                    {/* 국가식별자 */}
                    <td className="p-1 border-r">
                      <select 
                        value={row.country} 
                        onChange={(e) => handleCellChange(row.id, "country", e.target.value)}
                        className="w-full bg-transparent border-none px-1 py-0.5 focus:bg-white rounded-xs"
                      >
                        <option value="KR">KR</option>
                        <option value="US">US</option>
                        <option value="JP">JP</option>
                        <option value="CN">CN</option>
                      </select>
                    </td>
                    {/* 우편번호 */}
                    <td className="p-1 border-r font-mono">
                      <input 
                        type="text" 
                        value={row.zipCode} 
                        onChange={(e) => handleCellChange(row.id, "zipCode", e.target.value)}
                        className="w-full bg-transparent border-none px-1 py-0.5 focus:bg-white focus:ring-1 focus:ring-sky-500 rounded-xs"
                      />
                    </td>
                    {/* 기본주소 */}
                    <td className="p-1 border-r">
                      <input 
                        type="text" 
                        value={row.address1} 
                        onChange={(e) => handleCellChange(row.id, "address1", e.target.value)}
                        className="w-full bg-transparent border-none px-1 py-0.5 focus:bg-white focus:ring-1 focus:ring-sky-500 rounded-xs"
                      />
                    </td>
                    {/* 상세주소 */}
                    <td className="p-1 border-r">
                      <input 
                        type="text" 
                        value={row.address2} 
                        onChange={(e) => handleCellChange(row.id, "address2", e.target.value)}
                        className="w-full bg-transparent border-none px-1 py-0.5 focus:bg-white focus:ring-1 focus:ring-sky-500 rounded-xs"
                      />
                    </td>
                    {/* 전화번호 */}
                    <td className="p-1 border-r font-mono">
                      <input 
                        type="text" 
                        value={row.phone} 
                        onChange={(e) => handleCellChange(row.id, "phone", e.target.value)}
                        className="w-full bg-transparent border-none px-1 py-0.5 focus:bg-white focus:ring-1 focus:ring-sky-500 rounded-xs"
                      />
                    </td>
                    {/* 팩스번호 */}
                    <td className="p-1 border-r font-mono">
                      <input 
                        type="text" 
                        value={row.fax} 
                        onChange={(e) => handleCellChange(row.id, "fax", e.target.value)}
                        className="w-full bg-transparent border-none px-1 py-0.5 focus:bg-white focus:ring-1 focus:ring-sky-500 rounded-xs"
                      />
                    </td>
                    {/* 사용여부 */}
                    <td className="p-1 border-r">
                      <select 
                        value={row.useYn} 
                        onChange={(e) => handleCellChange(row.id, "useYn", e.target.value)}
                        className="w-full bg-transparent border-none px-1 py-0.5 focus:bg-white rounded-xs"
                      >
                        <option value="Y">Y</option>
                        <option value="N">N</option>
                      </select>
                    </td>
                    {/* 담당자명 */}
                    <td className="p-1 border-r">
                      <input 
                        type="text" 
                        value={row.managerName} 
                        onChange={(e) => handleCellChange(row.id, "managerName", e.target.value)}
                        className="w-full bg-transparent border-none px-1 py-0.5 focus:bg-white focus:ring-1 focus:ring-sky-500 rounded-xs"
                      />
                    </td>
                    {/* 담당자이메일명 */}
                    <td className="p-1 border-r font-mono">
                      <input 
                        type="email" 
                        value={row.managerEmail} 
                        onChange={(e) => handleCellChange(row.id, "managerEmail", e.target.value)}
                        className="w-full bg-transparent border-none px-1 py-0.5 focus:bg-white focus:ring-1 focus:ring-sky-500 rounded-xs"
                      />
                    </td>
                    {/* 담당자전화번호 */}
                    <td className="p-1 border-r font-mono">
                      <input 
                        type="text" 
                        value={row.managerPhone} 
                        onChange={(e) => handleCellChange(row.id, "managerPhone", e.target.value)}
                        className="w-full bg-transparent border-none px-1 py-0.5 focus:bg-white focus:ring-1 focus:ring-sky-500 rounded-xs"
                      />
                    </td>
                    {/* 등록일자 */}
                    <td className="p-1 text-center font-mono text-zinc-500 dark:text-zinc-400">
                      {row.regDate || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

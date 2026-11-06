"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Search, RefreshCw, Package, Plus, 
  Eye, X, Check, FileText, Download, 
  Boxes, ShieldCheck, Tag, Layers, Edit3, 
  Trash2, ArrowRightLeft, DollarSign, Calendar, Lock, Loader2,
  SlidersHorizontal, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangeFilter, isWithinDateRange, DatePresetType } from "@/components/common/date-range-filter";

// 1. 품목 8대 구분 타입 (8/14 엑셀 시트 반영)
export type ItemCategory = 
  | "판매완제품" 
  | "구매완제품" 
  | "원재료" 
  | "판매반제품" 
  | "구매반제품" 
  | "부품" 
  | "부자재" 
  | "소모품";

// 2. 품목 마스터 데이터 인터페이스
export interface ItemMasterData {
  id: number;
  itemCode: string;          // 식별자 (ITEM-2026-001 등)
  category: ItemCategory;    // 8대 구분
  itemName: string;          // 품목명
  spec: string;              // 규격 / 사양
  unit: string;              // 단위 (EA, kg, Set, Box, Roll)
  unitPrice: number;         // 기준 단가 (원)
  isPriceFixed: boolean;     // 단가 확정 보장 여부 (명세서/견적서 고정용)
  drawingNo: string;         // 도면번호 (DWG/STP)
  inboundWarehouse: string;  // 입고 창고 (A~H 구역)
  outboundWarehouse: string; // 출고 창고 (A~H 구역)
  requireIqc: boolean;       // 수입검사 대상 여부 (공정 20~21)
  requireOqc: boolean;       // 출하검사 대상 여부 (공정 90~91)
  usageDesc: string;         // 용도 설명 (자사/외주생산, 사출용, 유지보수용 등)
  updatedAt: string;         // 업데이트 날짜
}

// 초기 샘플 데이터 (품목 마스터 5대 표준 품목)
const initialItemList: ItemMasterData[] = [
  {
    id: 1,
    itemCode: "37510-SPX00-BM",
    category: "판매반제품",
    itemName: "BMS Battery Case Module",
    spec: "SKD61 / PBT-GF30 난연, 1*4 Cavity",
    unit: "EA",
    unitPrice: 24500,
    isPriceFixed: true,
    drawingNo: "DWG-SPX-BM375-01",
    inboundWarehouse: "D구역 (판매반제품)",
    outboundWarehouse: "D구역 (판매반제품)",
    requireIqc: false,
    requireOqc: true,
    usageDesc: "SPX 전기차 배터리 모듈 하우징 반제품",
    updatedAt: "2026-10-31",
  },
  {
    id: 2,
    itemCode: "82710-AA000",
    category: "판매반제품",
    itemName: "Door Armrest Base",
    spec: "PP 컴파운드 사출물, 1*2 Cavity",
    unit: "EA",
    unitPrice: 11200,
    isPriceFixed: true,
    drawingNo: "DWG-CN7-ARM-8271",
    inboundWarehouse: "D구역 (판매반제품)",
    outboundWarehouse: "D구역 (판매반제품)",
    requireIqc: false,
    requireOqc: true,
    usageDesc: "아반떼 CN7 도어 암레스트 베이스 성형품",
    updatedAt: "2026-10-31",
  },
  {
    id: 3,
    itemCode: "84710-NT500-LH",
    category: "판매반제품",
    itemName: "Front Door Upper Cover LH/RH",
    spec: "NAK80 / PP-EPDM, 1*2 Cavity (LH/RH)",
    unit: "EA",
    unitPrice: 18500,
    isPriceFixed: true,
    drawingNo: "DWG-NT5-FDUC-8471",
    inboundWarehouse: "D구역 (판매반제품)",
    outboundWarehouse: "D구역 (판매반제품)",
    requireIqc: false,
    requireOqc: true,
    usageDesc: "현대 NT5 도어 트림 상단 커버 1차 사출품",
    updatedAt: "2026-10-31",
  },
  {
    id: 4,
    itemCode: "84740-A2XT0-MB",
    category: "판매반제품",
    itemName: "Center Console Main Bracket",
    spec: "SKD61 / ABS HI-121, 1*1 Cavity",
    unit: "EA",
    unitPrice: 15400,
    isPriceFixed: true,
    drawingNo: "DWG-A2XT-MB-8474",
    inboundWarehouse: "D구역 (판매반제품)",
    outboundWarehouse: "D구역 (판매반제품)",
    requireIqc: false,
    requireOqc: true,
    usageDesc: "기아 A2XT 센터 콘솔 메인 브라켓",
    updatedAt: "2026-10-31",
  },
  {
    id: 5,
    itemCode: "86350-K7000",
    category: "판매반제품",
    itemName: "Radiator Lower Grille",
    spec: "KP4M / PC+ABS, 1*1 Cavity",
    unit: "EA",
    unitPrice: 22000,
    isPriceFixed: true,
    drawingNo: "DWG-K7-RLG-8635",
    inboundWarehouse: "D구역 (판매반제품)",
    outboundWarehouse: "D구역 (판매반제품)",
    requireIqc: false,
    requireOqc: true,
    usageDesc: "기아 K7 라디에이터 그릴 로어 사출물",
    updatedAt: "2026-10-31",
  },
];

export default function ItemManagementPage() {
  const [data, setData] = useState<ItemMasterData[]>(initialItemList);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterItemName, setFilterItemName] = useState<string>("");
  const [filterItemCode, setFilterItemCode] = useState<string>("");
  const [filterWarehouse, setFilterWarehouse] = useState<string>("ALL");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePresetType>("all");

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewRegister, setIsNewRegister] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemMasterData | null>(null);

  // 폼 상태
  const [formState, setFormState] = useState<Partial<ItemMasterData>>({
    itemCode: "",
    category: "판매완제품",
    itemName: "",
    spec: "",
    unit: "EA",
    unitPrice: 0,
    isPriceFixed: true,
    drawingNo: "-",
    inboundWarehouse: "A구역 (판매완제품)",
    outboundWarehouse: "A구역 (판매완제품)",
    requireIqc: false,
    requireOqc: true,
    usageDesc: "",
  });

  // DB에서 품목 목록 조회
  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory !== "ALL") params.set("category", filterCategory);
      if (filterItemName) params.set("keyword", filterItemName);
      else if (filterItemCode) params.set("keyword", filterItemCode);

      const res = await fetch(`/api/v1/basic-info/items?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setData(json.data);
      }
    } catch (err) {
      console.error("품목 목록 조회 실패:", err);
    } finally {
      setIsLoading(false);
    }
  }, [filterCategory, filterItemName, filterItemCode]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // 검색
  const handleSearch = () => {
    fetchItems();
  };

  const handleReset = () => {
    setFilterCategory("ALL");
    setFilterItemName("");
    setFilterItemCode("");
    setFilterWarehouse("ALL");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSelectedDatePreset("all");
    setTimeout(() => {
      fetch("/api/v1/basic-info/items")
        .then((res) => res.json())
        .then((json) => {
          if (json.success) setData(json.data);
        });
    }, 0);
  };

  // 품목 구분 변경 시 창고 및 검사 기본값 자동 매핑
  const handleCategoryChange = (cat: ItemCategory) => {
    let inWh = "A구역 (판매완제품)";
    let outWh = "A구역 (판매완제품)";
    let iqc = false;
    let oqc = true;
    let desc = "자사/외주 생산 후 판매 완제품";

    if (cat === "구매완제품") {
      inWh = "B구역 (구매완제품)";
      outWh = "B구역 (구매완제품)";
      iqc = true;
      oqc = true;
      desc = "외주 매입해서 판매";
    } else if (cat === "원재료") {
      inWh = "C구역 (원재료 보관고)";
      outWh = "C구역 (원재료 보관고)";
      iqc = true;
      oqc = false;
      desc = "외주 매입해서 사출 성형 생산에 투입 사용";
    } else if (cat === "판매반제품") {
      inWh = "D구역 (판매반제품)";
      outWh = "D구역 (판매반제품)";
      iqc = false;
      oqc = true;
      desc = "자사/외주 생산 후 반제품 상태로 판매";
    } else if (cat === "구매반제품") {
      inWh = "E구역 (구매반제품)";
      outWh = "E구역 (구매반제품)";
      iqc = true;
      oqc = false;
      desc = "외주 매입해서 조립/인서트 가공 후 판매";
    } else if (cat === "부품") {
      inWh = "F구역 (부품 보관고)";
      outWh = "F구역 (부품 보관고)";
      iqc = true;
      oqc = false;
      desc = "기계 및 금형 유지보수(PM)용 매입 부품";
    } else if (cat === "부자재") {
      inWh = "G구역 (부자재 창고)";
      outWh = "G구역 (부자재 창고)";
      iqc = true;
      oqc = false;
      desc = "생산 및 완제품 포장, 밴딩용 매입 부자재";
    } else if (cat === "소모품") {
      inWh = "G구역 (부자재 창고)";
      outWh = "G구역 (부자재 창고)";
      iqc = false;
      oqc = false;
      desc = "생산/설비 운영에 간접적으로 사용되는 소모품";
    }

    setFormState({
      ...formState,
      category: cat,
      inboundWarehouse: inWh,
      outboundWarehouse: outWh,
      requireIqc: iqc,
      requireOqc: oqc,
      usageDesc: desc,
    });
  };

  // 신규 등록 모달 열기
  const handleOpenNewModal = () => {
    setIsNewRegister(true);
    setFormState({
      itemCode: `ITEM-2026-0${data.length + 1}`,
      category: "판매완제품",
      itemName: "",
      spec: "",
      unit: "EA",
      unitPrice: 0,
      isPriceFixed: true,
      drawingNo: "DWG-NEW-01",
      inboundWarehouse: "A구역 (판매완제품)",
      outboundWarehouse: "A구역 (판매완제품)",
      requireIqc: false,
      requireOqc: true,
      usageDesc: "자사/외주 생산 후 판매 완제품 (MES DB 연동)",
    });
    setIsModalOpen(true);
  };

  // 상세/수정 모달 열기
  const handleOpenDetail = (item: ItemMasterData) => {
    setIsNewRegister(false);
    setSelectedItem(item);
    setFormState({ ...item });
    setIsModalOpen(true);
  };

  // 저장 처리 (DB 반영)
  const handleSaveForm = async () => {
    if (!formState.itemCode?.trim()) {
      alert("품목 식별자(코드)를 입력해주세요.");
      return;
    }
    if (!formState.itemName?.trim()) {
      alert("품목명을 입력해주세요.");
      return;
    }

    try {
      if (isNewRegister) {
        const res = await fetch("/api/v1/basic-info/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formState),
        });
        const json = await res.json();
        if (json.success) {
          alert(`[${formState.itemName}] 품목 마스터가 등록되었습니다.`);
        } else {
          alert(`등록 실패: ${json.error}`);
        }
      } else if (selectedItem) {
        const res = await fetch("/api/v1/basic-info/items", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formState, id: selectedItem.id }),
        });
        const json = await res.json();
        if (json.success) {
          alert(`[${formState.itemName}] 품목 정보가 수정되었습니다.`);
        } else {
          alert(`수정 실패: ${json.error}`);
        }
      }
      setIsModalOpen(false);
      await fetchItems();
    } catch (err: any) {
      alert(`저장 중 오류: ${err.message}`);
    }
  };

  // 삭제 처리 (DB 반영)
  const handleDelete = async (id: number) => {
    if (confirm("정말 이 품목 정보를 삭제하시겠습니까?")) {
      try {
        const res = await fetch(`/api/v1/basic-info/items?id=${id}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (json.success) {
          alert("삭제되었습니다.");
          await fetchItems();
        } else {
          alert(`삭제 실패: ${json.error}`);
        }
      } catch (err: any) {
        alert(`삭제 중 오류: ${err.message}`);
      }
    }
  };

  // 8대 구분별 배지 스타일
  const getCategoryBadge = (cat: ItemCategory) => {
    switch (cat) {
      case "판매완제품":
        return "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300";
      case "구매완제품":
        return "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300";
      case "원재료":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300";
      case "판매반제품":
        return "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300";
      case "구매반제품":
        return "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-300";
      case "부품":
        return "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300";
      case "부자재":
        return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300";
      case "소모품":
        return "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-300";
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 0. 상단 브레드크럼 */}
      <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
        <Layers className="h-3.5 w-3.5 text-zinc-400" />
        <span>기준정보</span>
        <span className="text-zinc-300">›</span>
        <span className="font-bold text-zinc-800 dark:text-zinc-100">품목정보 (C840000)</span>
      </div>

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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-2 flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium text-[11px]">품목 8대 구분</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="h-7 rounded-md border bg-transparent px-2 text-xs font-bold"
            >
              <option value="ALL">전체</option>
              <option value="판매완제품">판매완제품 (MES 연동)</option>
              <option value="구매완제품">구매완제품</option>
              <option value="원재료">원재료 (사출용 레진)</option>
              <option value="판매반제품">판매반제품</option>
              <option value="구매반제품">구매반제품</option>
              <option value="부품">부품 (설비/금형 PM)</option>
              <option value="부자재">부자재 (포장/박스)</option>
              <option value="소모품">소모품</option>
            </select>
          </div>
          <div className="md:col-span-2 flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium text-[11px]">품목명</span>
            <Input 
              value={filterItemName} 
              onChange={(e) => setFilterItemName(e.target.value)} 
              placeholder="" 
              className="h-7 text-xs" 
            />
          </div>
          <div className="md:col-span-2 flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium text-[11px]">식별자 (품목코드)</span>
            <Input 
              value={filterItemCode} 
              onChange={(e) => setFilterItemCode(e.target.value)} 
              placeholder="" 
              className="h-7 text-xs font-mono" 
            />
          </div>
          <div className="md:col-span-2 flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium text-[11px]">입고 창고</span>
            <Input 
              value={filterWarehouse === "ALL" ? "" : filterWarehouse} 
              onChange={(e) => setFilterWarehouse(e.target.value || "ALL")} 
              placeholder="" 
              className="h-7 text-xs" 
            />
          </div>
          <div className="md:col-span-4 flex items-center justify-end gap-1.5">
            <Button 
              onClick={() => alert("검색 조건 설정 창이 열립니다.")} 
              variant="outline" 
              className="h-7 px-2.5 gap-1 text-xs text-zinc-600"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              검색설정
            </Button>
            <Button onClick={handleSearch} className="h-7 px-3 bg-sky-600 hover:bg-sky-700 text-white gap-1 text-xs font-bold">
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

      {/* 2. 메인 품목 그리드 (8/14 엑셀 시트 100% 반영) */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs overflow-hidden flex flex-col min-h-[480px]">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b">
          <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-100">
            <Package className="h-4 w-4 text-sky-600" />
            <span>기초정보관리 - 품목정보 관리대장 (단가 확정 보장 및 실고 매칭)</span>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleOpenNewModal} size="xs" className="h-7 px-2.5 bg-sky-600 hover:bg-sky-700 text-white gap-1 text-xs font-bold">
              <Plus className="h-3.5 w-3.5" />
              신규 품목 등록
            </Button>
            <Button 
              onClick={() => alert("품목 마스터 목록이 Excel로 다운로드되었습니다.")}
              variant="outline" 
              size="xs" 
              className="h-7 px-2.5 gap-1 text-xs text-zinc-600"
            >
              <Download className="h-3.5 w-3.5" />
              엑셀 다운로드
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full border-collapse text-left border-spacing-0 whitespace-nowrap">
            <thead className="sticky top-0 bg-[#1e293b] text-white text-[11px] z-10">
              <tr>
                <th className="p-1.5 w-10 text-center border-r border-slate-700">Idx</th>
                <th className="p-1.5 w-8 text-center border-r border-slate-700">
                  <input type="checkbox" className="rounded" />
                </th>
                <th className="p-1.5 border-r border-slate-700 min-w-[90px] text-center">품목구분 ↑1</th>
                <th className="p-1.5 border-r border-slate-700 min-w-[120px]">품목식별자 ↑2</th>
                <th className="p-1.5 border-r border-slate-700 min-w-[190px]">품목명</th>
                <th className="p-1.5 border-r border-slate-700 min-w-[130px]">규격/사양</th>
                <th className="p-1.5 border-r border-slate-700 min-w-[90px] text-right">기준단가</th>
                <th className="p-1.5 border-r border-slate-700 min-w-[60px] text-center">단위</th>
                <th className="p-1.5 border-r border-slate-700 min-w-[110px]">도면번호</th>
                <th className="p-1.5 border-r border-slate-700 min-w-[100px]">입고 창고</th>
                <th className="p-1.5 border-r border-slate-700 min-w-[100px]">출고 창고</th>
                <th className="p-1.5 border-r border-slate-700 min-w-[70px] text-center">수입검사</th>
                <th className="p-1.5 border-r border-slate-700 min-w-[70px] text-center">출하검사</th>
                <th className="p-1.5 border-r border-slate-700 min-w-[70px] text-center">사용여부</th>
                <th className="p-1.5 border-r border-slate-700 min-w-[90px] text-center">업데이트날짜</th>
                <th className="p-1.5 min-w-[70px] text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px]">
              {data.map((row, idx) => (
                <tr key={row.id} className="hover:bg-sky-50/70 dark:hover:bg-zinc-800/60 transition-colors odd:bg-white even:bg-zinc-50/40 dark:odd:bg-zinc-900 dark:even:bg-zinc-900/50">
                  <td className="p-1.5 text-center font-mono text-zinc-500 border-r">{idx + 1}</td>
                  <td className="p-1.5 text-center border-r">
                    <input type="checkbox" className="rounded" />
                  </td>
                  
                  {/* 품목 8대 구분 */}
                  <td className="p-1.5 border-r text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                      {row.category}
                    </span>
                  </td>

                  <td className="p-1.5 border-r font-mono font-bold text-sky-700 dark:text-sky-400">{row.itemCode}</td>
                  <td className="p-1.5 border-r font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[190px]" title={row.itemName}>{row.itemName}</td>
                  <td className="p-1.5 border-r text-zinc-500 truncate max-w-[130px]" title={row.spec}>{row.spec || "-"}</td>
                  
                  {/* 기준단가 */}
                  <td className="p-1.5 border-r text-right font-mono text-zinc-800 dark:text-zinc-200">
                    {row.unitPrice ? `${row.unitPrice.toLocaleString()}원` : ""}
                  </td>

                  <td className="p-1.5 border-r text-center font-mono">{row.unit || "EA"}</td>
                  <td className="p-1.5 border-r font-mono text-zinc-500 truncate max-w-[110px]" title={row.drawingNo}>{row.drawingNo || ""}</td>
                  <td className="p-1.5 border-r truncate max-w-[100px]" title={row.inboundWarehouse}>{row.inboundWarehouse || ""}</td>
                  <td className="p-1.5 border-r truncate max-w-[100px]" title={row.outboundWarehouse}>{row.outboundWarehouse || ""}</td>

                  {/* 수입검사 / 출하검사 */}
                  <td className="p-1.5 border-r text-center text-zinc-500">
                    {row.requireIqc ? "Y" : ""}
                  </td>
                  <td className="p-1.5 border-r text-center text-zinc-500">
                    {row.requireOqc ? "Y" : ""}
                  </td>

                  {/* 사용여부 */}
                  <td className="p-1.5 border-r text-center font-medium text-zinc-700 dark:text-zinc-300">
                    사용
                  </td>

                  <td className="p-1.5 border-r text-center font-mono text-zinc-500">{row.updatedAt || "2026-10-31"}</td>

                  {/* 액션 버튼 */}
                  <td className="p-1.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => handleOpenDetail(row)} 
                        className="p-1 text-zinc-500 hover:text-sky-600 rounded transition-colors"
                        title="수정"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(row.id)} 
                        className="p-1 text-zinc-500 hover:text-rose-600 rounded transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 하단 총 건수 */}
        <div className="flex items-center justify-end px-4 py-2 bg-zinc-50 dark:bg-zinc-800/40 border-t text-xs text-zinc-600 dark:text-zinc-400">
          <span>총 <b className="font-bold text-zinc-900 dark:text-zinc-100">{data.length}</b> 건</span>
        </div>
      </div>

      {/* 3. [모달] 품목 등록 및 단가/창고 매핑 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-3xl rounded-lg shadow-xl border overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 text-white">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-xs">
                  {isNewRegister ? "신규 품목 마스터 등록 (8대 구분)" : `품목 정보 수정 [${formState.itemCode}]`}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs">
              {/* 1. 기본 품목 분류 및 식별자 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded border text-[11px]">
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">품목 8대 구분 <span className="text-red-500">*</span></label>
                  <select
                    value={formState.category || "판매완제품"}
                    onChange={(e) => handleCategoryChange(e.target.value as ItemCategory)}
                    className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-bold text-sky-700"
                  >
                    <option value="판매완제품">판매완제품 (자사/외주 생산 후 판매)</option>
                    <option value="구매완제품">구매완제품 (외주 매입 후 판매)</option>
                    <option value="원재료">원재료 (사출용 레진 매입)</option>
                    <option value="판매반제품">판매반제품 (자사/외주 생산 후 판매)</option>
                    <option value="구매반제품">구매반제품 (외주 매입 후 생산 투입)</option>
                    <option value="부품">부품 (설비/금형 유지보수)</option>
                    <option value="부자재">부자재 (포장/박스/라벨)</option>
                    <option value="소모품">소모품 (간접 매입품)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">품목식별자(코드) <span className="text-red-500">*</span></label>
                  <Input 
                    value={formState.itemCode || ""} 
                    onChange={(e) => setFormState({ ...formState, itemCode: e.target.value })}
                    placeholder="PRD-001, RAW-PP-01"
                    className="h-7 text-xs bg-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 font-bold mb-1">도면번호 (2D/3D)</label>
                  <Input 
                    value={formState.drawingNo || ""} 
                    onChange={(e) => setFormState({ ...formState, drawingNo: e.target.value })}
                    placeholder="DWG-NT5-01 / STP"
                    className="h-7 text-xs bg-white font-mono"
                  />
                </div>
              </div>

              {/* 2. 품목 상세 및 단가 확정 보장 (8/14 엑셀 요구사항) */}
              <div className="border rounded p-3.5 flex flex-col gap-3">
                <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-amber-600" />
                    품목 상세 사양 및 기준 단가 관리
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200">
                    <input 
                      type="checkbox"
                      checked={formState.isPriceFixed || false}
                      onChange={(e) => setFormState({ ...formState, isPriceFixed: e.target.checked })}
                      className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                    />
                    <span>단가 확정 보장 (사후 단가 변동 시 기존 견적/명세서 고정)</span>
                  </label>
                </h4>

                <div className="grid grid-cols-3 gap-3 text-[11px]">
                  <div className="col-span-2">
                    <label className="block text-zinc-500 mb-1">품목명 <span className="text-red-500">*</span></label>
                    <Input 
                      value={formState.itemName || ""} 
                      onChange={(e) => setFormState({ ...formState, itemName: e.target.value })}
                      placeholder="예: Front Door Upper Cover LH/RH"
                      className="h-7 text-xs bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">규격 / 사양</label>
                    <Input 
                      value={formState.spec || ""} 
                      onChange={(e) => setFormState({ ...formState, spec: e.target.value })}
                      placeholder="사출용 / 비중 0.98"
                      className="h-7 text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded border">
                  <div>
                    <label className="block text-zinc-500 mb-1">기준 단가 (원)</label>
                    <Input 
                      type="number"
                      value={formState.unitPrice || 0} 
                      onChange={(e) => setFormState({ ...formState, unitPrice: Number(e.target.value) })}
                      className="h-7 text-xs bg-white font-mono text-right font-bold text-sky-600"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">단위 (Unit)</label>
                    <select
                      value={formState.unit || "EA"}
                      onChange={(e) => setFormState({ ...formState, unit: e.target.value })}
                      className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-mono"
                    >
                      <option value="EA">EA (개수)</option>
                      <option value="kg">kg (원재료 수지)</option>
                      <option value="Set">Set (세트)</option>
                      <option value="Box">Box (박스)</option>
                      <option value="Roll">Roll (롤)</option>
                      <option value="Drum">Drum (드럼)</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-zinc-500 mb-1">용도 및 비고 설명</label>
                    <Input 
                      value={formState.usageDesc || ""} 
                      onChange={(e) => setFormState({ ...formState, usageDesc: e.target.value })}
                      placeholder="MES DB 연동 및 외주 투입 용도"
                      className="h-7 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* 3. 창고 구역(A~H) 및 수입/출하검사 여부 매핑 */}
              <div className="border rounded p-3.5 flex flex-col gap-3 bg-sky-50/20 dark:bg-sky-950/10">
                <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                  <Boxes className="h-4 w-4 text-emerald-600" />
                  입출고 창고 구역(A~H) 및 품질검사 매핑 (공정 10~140 연동)
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div>
                    <label className="block text-zinc-500 mb-1">입고 창고 구역</label>
                    <select
                      value={formState.inboundWarehouse || "A구역 (판매완제품)"}
                      onChange={(e) => setFormState({ ...formState, inboundWarehouse: e.target.value })}
                      className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-bold"
                    >
                      <option value="A구역 (판매완제품)">A구역 (판매완제품)</option>
                      <option value="B구역 (구매완제품)">B구역 (구매완제품)</option>
                      <option value="C구역 (원재료 보관고)">C구역 (원재료 보관고)</option>
                      <option value="D구역 (판매반제품)">D구역 (판매반제품)</option>
                      <option value="E구역 (구매반제품)">E구역 (구매반제품)</option>
                      <option value="F구역 (부품 보관고)">F구역 (부품 보관고)</option>
                      <option value="G구역 (부자재 창고)">G구역 (부자재 창고)</option>
                      <option value="H구역 (외주양산 전용)">H구역 (외주양산 전용)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-500 mb-1">출고 창고 구역</label>
                    <select
                      value={formState.outboundWarehouse || "A구역 (판매완제품)"}
                      onChange={(e) => setFormState({ ...formState, outboundWarehouse: e.target.value })}
                      className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-bold"
                    >
                      <option value="A구역 (판매완제품)">A구역 (판매완제품)</option>
                      <option value="B구역 (구매완제품)">B구역 (구매완제품)</option>
                      <option value="C구역 (원재료 보관고)">C구역 (원재료 보관고)</option>
                      <option value="D구역 (판매반제품)">D구역 (판매반제품)</option>
                      <option value="E구역 (구매반제품)">E구역 (구매반제품)</option>
                      <option value="F구역 (부품 보관고)">F구역 (부품 보관고)</option>
                      <option value="G구역 (부자재 창고)">G구역 (부자재 창고)</option>
                      <option value="H구역 (외주양산 전용)">H구역 (외주양산 전용)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-500 mb-1">수입검사(IQC) 대상</label>
                    <select
                      value={formState.requireIqc ? "Y" : "N"}
                      onChange={(e) => setFormState({ ...formState, requireIqc: e.target.value === "Y" })}
                      className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-bold text-emerald-700"
                    >
                      <option value="Y">Y (수입검사 필수 - 공정 20)</option>
                      <option value="N">N (무검사 입고)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-500 mb-1">출하검사(OQC) 대상</label>
                    <select
                      value={formState.requireOqc ? "Y" : "N"}
                      onChange={(e) => setFormState({ ...formState, requireOqc: e.target.value === "Y" })}
                      className="h-7 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-bold text-sky-700"
                    >
                      <option value="Y">Y (출하검사 필수 - 공정 90)</option>
                      <option value="N">N (무검사 출하)</option>
                    </select>
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
                품목 정보 저장
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
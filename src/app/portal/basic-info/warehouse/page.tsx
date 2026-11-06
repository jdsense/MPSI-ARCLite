"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Search, RefreshCw, Boxes, Plus, 
  X, Check, Building2, Download, 
  Edit3, Trash2, Tag, MapPin, Warehouse, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangeFilter, isWithinDateRange } from "@/components/common/date-range-filter";

// 1. 창고 마스터 인터페이스
export interface WarehouseMasterItem {
  id: string;
  warehouseName: string;       // 창고명
  location: string;            // 창고 위치
  description?: string;        // 비고/설명
}

// 2. 창고 구역 정보 인터페이스 (캐파, 현재고, 관리사, 적재율 제외)
export interface WarehouseZoneItem {
  id: number;
  warehouseName: string;       // 소속 창고명
  zoneCode: string;            // 구역명 (A구역, B구역, C구역 등)
  zoneName: string;            // 구역 세부 명칭
  assignedUsage: string;       // 용도 (상황에 맞춰 임의 지정: 판매완제품, 구매완제품, 원재료 등)
  targetCategory: string;      // 적재 대상 품목
  locationDesc: string;        // 세부 로케이션 (Rack 번호 등)
  temperatureCondition: string;// 보관/온습도 조건
  isActive: boolean;           // 사용 여부
  updatedAt: string;
}

// 초기 창고 마스터 데이터
const initialWarehouseMaster: WarehouseMasterItem[] = [
  { id: "wh-1", warehouseName: "본사 창고동 (1공장)", location: "광주 본사 1동", description: "MPSI 메인 물류창고" },
  { id: "wh-2", warehouseName: "원재료 보관동 (2공장)", location: "광주 본사 2동", description: "사출 수지 및 레진 전용" },
  { id: "wh-3", warehouseName: "금형/설비 보전실", location: "가공 1공장", description: "금형제작처 금형 및 예비품" },
  { id: "wh-4", warehouseName: "외부 임치 창고 (외주양산)", location: "안산 반월공단", description: "외주사출 양산품 임치" },
];

// 초기 구역 데이터 (8/14 엑셀 시트 8대 기본 구역 반영)
const initialWarehouses: WarehouseZoneItem[] = [
  {
    id: 1,
    warehouseName: "본사 창고동 (1공장)",
    zoneCode: "A구역",
    zoneName: "완제품 주출하 구역",
    assignedUsage: "판매완제품",
    targetCategory: "사출 판매완제품 (자사/외주생산)",
    locationDesc: "창고동 1층 출하도크 전면 (Rack A01~A20)",
    temperatureCondition: "상온 (10~28℃)",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    id: 2,
    warehouseName: "본사 창고동 (1공장)",
    zoneCode: "B구역",
    zoneName: "구매완제품 보관 구역",
    assignedUsage: "구매완제품",
    targetCategory: "구매완제품 (외주매입품)",
    locationDesc: "창고동 1층 B라인 (Rack B01~B10)",
    temperatureCondition: "상온 (10~28℃)",
    isActive: true,
    updatedAt: "2026-08-18",
  },
  {
    id: 3,
    warehouseName: "원재료 보관동 (2공장)",
    zoneCode: "C구역",
    zoneName: "사출 원재료 보관 구역",
    assignedUsage: "원재료",
    targetCategory: "사출용 레진 수지 (PP, ABS, PBT)",
    locationDesc: "원재료동 1층 호퍼실 인접 (Rack C01~C30)",
    temperatureCondition: "제습 밀폐 (습도 40% 이하)",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    id: 4,
    warehouseName: "본사 창고동 (1공장)",
    zoneCode: "D구역",
    zoneName: "판매반제품 적재 구역",
    assignedUsage: "판매반제품",
    targetCategory: "사출 반제품 (도장/조립 대기품)",
    locationDesc: "사출 1공장 검사실 인접 (Rack D01~D08)",
    temperatureCondition: "상온",
    isActive: true,
    updatedAt: "2026-08-17",
  },
  {
    id: 5,
    warehouseName: "본사 창고동 (1공장)",
    zoneCode: "E구역",
    zoneName: "구매반제품 부품 구역",
    assignedUsage: "구매반제품",
    targetCategory: "인서트 너트/금속 가공 부속품",
    locationDesc: "조립실 부품 선반 (Rack E01~E05)",
    temperatureCondition: "상온 방청 보관",
    isActive: true,
    updatedAt: "2026-08-16",
  },
  {
    id: 6,
    warehouseName: "금형/설비 보전실",
    zoneCode: "F구역",
    zoneName: "설비 및 금형 부품 보전 구역",
    assignedUsage: "부품",
    targetCategory: "설비/금형 PM 유지보수 예비부품",
    locationDesc: "금형정비실 공구실 (Rack F01~F12)",
    temperatureCondition: "방청 유지",
    isActive: true,
    updatedAt: "2026-08-19",
  },
  {
    id: 7,
    warehouseName: "본사 창고동 (1공장)",
    zoneCode: "G구역",
    zoneName: "포장 부자재 창고 구역",
    assignedUsage: "부자재",
    targetCategory: "포장 박스, 패드, 밴딩끈, 소모품",
    locationDesc: "창고동 2층 부자재실 (Rack G01~G15)",
    temperatureCondition: "화기엄금, 상온",
    isActive: true,
    updatedAt: "2026-08-15",
  },
  {
    id: 8,
    warehouseName: "외부 임치 창고 (외주양산)",
    zoneCode: "H구역",
    zoneName: "외주사출 임치 구역",
    assignedUsage: "외주양산",
    targetCategory: "외주양산 납품 입고 대기품",
    locationDesc: "외부 입고 대기장 (Rack H01~H10)",
    temperatureCondition: "비가림 상온",
    isActive: true,
    updatedAt: "2026-08-19",
  }
];

export default function WarehouseManagementPage() {
  // 창고 마스터 목록 및 구역 데이터
  const [warehouseList, setWarehouseList] = useState<WarehouseMasterItem[]>(initialWarehouseMaster);
  const [data, setData] = useState<WarehouseZoneItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchWarehouses = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/basic-info/warehouses');
      const json = await res.json();
      if (json.success && json.data) {
        if (Array.isArray(json.data.warehouses) && json.data.warehouses.length > 0) {
          setWarehouseList(json.data.warehouses);
        }
        if (Array.isArray(json.data.zones)) {
          setData(json.data.zones);
        }
      }
    } catch (err) {
      console.error("창고 목록 조회 실패:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  // 검색 필터
  const [filterWarehouse, setFilterWarehouse] = useState<string>("ALL");
  const [filterZone, setFilterZone] = useState<string>("ALL");
  const [filterUsage, setFilterUsage] = useState<string>("ALL");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<string>("all");

  // 모달 제어 상태
  const [isNewWarehouseModalOpen, setIsNewWarehouseModalOpen] = useState(false); // 버튼 1: 신규창고 등록
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);                 // 버튼 2: 구역추가/수정
  const [isEditMode, setIsEditMode] = useState(false);

  // 신규 창고 단독 등록 폼 상태
  const [newWhName, setNewWhName] = useState("");
  const [newWhLocation, setNewWhLocation] = useState("");
  const [newWhDesc, setNewWhDesc] = useState("");

  // 구역 추가/수정 폼 상태
  const [formState, setFormState] = useState<Partial<WarehouseZoneItem>>({
    warehouseName: "",
    zoneCode: "A구역",
    zoneName: "",
    assignedUsage: "판매완제품",
    targetCategory: "",
    locationDesc: "",
    temperatureCondition: "상온",
    isActive: true,
  });

  const [isCustomZoneInput, setIsCustomZoneInput] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  // 검색 필터링
  const filteredData = data.filter((item) => {
    const matchWarehouse = filterWarehouse !== "ALL" ? item.warehouseName === filterWarehouse : true;
    const matchZone = filterZone !== "ALL" ? item.zoneCode === filterZone : true;
    const matchUsage = filterUsage !== "ALL" ? item.assignedUsage === filterUsage : true;
    const matchDate = isWithinDateRange(item.updatedAt, filterDateFrom, filterDateTo);
    return matchWarehouse && matchZone && matchUsage && matchDate;
  });

  const handleReset = () => {
    setFilterWarehouse("ALL");
    setFilterZone("ALL");
    setFilterUsage("ALL");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSelectedDatePreset("all");
  };

  // 1. [버튼 1] 신규 창고 등록 처리
  const handleSaveNewWarehouse = () => {
    if (!newWhName.trim()) {
      alert("창고명을 입력해주세요.");
      return;
    }
    if (warehouseList.some((w) => w.warehouseName === newWhName.trim())) {
      alert("이미 등록된 창고명입니다.");
      return;
    }

    const newWh: WarehouseMasterItem = {
      id: `wh-${Date.now()}`,
      warehouseName: newWhName.trim(),
      location: newWhLocation.trim() || "-",
      description: newWhDesc.trim() || "-",
    };

    setWarehouseList([...warehouseList, newWh]);
    alert(`[${newWh.warehouseName}] 창고가 성공적으로 등록되었습니다. 이제 구역을 추가할 수 있습니다.`);
    setNewWhName("");
    setNewWhLocation("");
    setNewWhDesc("");
    setIsNewWarehouseModalOpen(false);
  };

  // 2. [버튼 2] 구역추가 모달 열기
  const handleOpenAddZoneModal = () => {
    setIsEditMode(false);
    setSelectedItemId(null);
    setIsCustomZoneInput(false);
    setFormState({
      warehouseName: warehouseList[0]?.warehouseName || "본사 창고동 (1공장)",
      zoneCode: "A구역",
      zoneName: "",
      assignedUsage: "판매완제품",
      targetCategory: "사출 판매완제품 (자사/외주생산)",
      locationDesc: "창고동 1층",
      temperatureCondition: "상온",
      isActive: true,
    });
    setIsZoneModalOpen(true);
  };

  // 3. 그리드에서 수정 버튼 클릭 시 모달 열기 (창고선택, 구역선택 가능)
  const handleOpenEditModal = (item: WarehouseZoneItem) => {
    setIsEditMode(true);
    setSelectedItemId(item.id);
    setIsCustomZoneInput(false);
    setFormState({ ...item });
    setIsZoneModalOpen(true);
  };

  // 구역 코드 변경 핸들러
  const handleZoneCodePresetChange = (code: string) => {
    if (code === "DIRECT_INPUT") {
      setIsCustomZoneInput(true);
      setFormState({ ...formState, zoneCode: "", assignedUsage: "" });
      return;
    }

    setIsCustomZoneInput(false);
    const usageDefaults: Record<string, { usage: string; cat: string }> = {
      "A구역": { usage: "판매완제품", cat: "사출 판매완제품 (자사/외주생산)" },
      "B구역": { usage: "구매완제품", cat: "구매완제품 (외주매입품)" },
      "C구역": { usage: "원재료", cat: "사출용 레진 수지 (PP, ABS, PBT)" },
      "D구역": { usage: "판매반제품", cat: "사출 반제품 (도장/조립 대기품)" },
      "E구역": { usage: "구매반제품", cat: "인서트 너트/금속 가공 부속품" },
      "F구역": { usage: "부품", cat: "설비/금형 PM 유지보수 예비부품" },
      "G구역": { usage: "부자재", cat: "포장 박스, 패드, 밴딩끈, 소모품" },
      "H구역": { usage: "외주양산", cat: "외주사출 양산 납품 입고 대기품" },
    };

    const def = usageDefaults[code];
    setFormState({
      ...formState,
      zoneCode: code,
      assignedUsage: def?.usage || formState.assignedUsage || "",
      targetCategory: def?.cat || formState.targetCategory || "",
    });
  };

  // 구역 저장 (추가/수정)
  const handleSaveZone = () => {
    if (!formState.warehouseName?.trim()) {
      alert("대상 창고를 선택해주세요.");
      return;
    }
    if (!formState.zoneCode?.trim()) {
      alert("구역코드(명)를 입력해주세요.");
      return;
    }
    if (!formState.zoneName?.trim()) {
      alert("구역 세부 명칭을 입력해주세요.");
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    if (!isEditMode) {
      // 신규 구역 추가
      const newItem: WarehouseZoneItem = {
        id: Date.now(),
        warehouseName: formState.warehouseName.trim(),
        zoneCode: formState.zoneCode.trim(),
        zoneName: formState.zoneName.trim(),
        assignedUsage: formState.assignedUsage?.trim() || "임의지정",
        targetCategory: formState.targetCategory?.trim() || "-",
        locationDesc: formState.locationDesc?.trim() || "-",
        temperatureCondition: formState.temperatureCondition?.trim() || "상온",
        isActive: formState.isActive !== undefined ? formState.isActive : true,
        updatedAt: today,
      };
      setData([newItem, ...data]);
      alert(`[${newItem.warehouseName} - ${newItem.zoneCode}] 구역이 성공적으로 추가되었습니다.`);
    } else if (selectedItemId) {
      // 구역 정보 수정
      setData(
        data.map((item) =>
          item.id === selectedItemId
            ? ({
                ...item,
                warehouseName: formState.warehouseName?.trim() || item.warehouseName,
                zoneCode: formState.zoneCode?.trim() || item.zoneCode,
                zoneName: formState.zoneName?.trim() || item.zoneName,
                assignedUsage: formState.assignedUsage?.trim() || item.assignedUsage,
                targetCategory: formState.targetCategory?.trim() || item.targetCategory,
                locationDesc: formState.locationDesc?.trim() || item.locationDesc,
                temperatureCondition: formState.temperatureCondition?.trim() || item.temperatureCondition,
                isActive: formState.isActive !== undefined ? formState.isActive : item.isActive,
                updatedAt: today,
              } as WarehouseZoneItem)
            : item
        )
      );
      alert(`[${formState.warehouseName} - ${formState.zoneCode}] 구역 정보가 수정되었습니다.`);
    }
    setIsZoneModalOpen(false);
  };

  // 삭제 처리
  const handleDelete = (id: number) => {
    if (confirm("정말 이 창고 구역 정보를 삭제하시겠습니까?")) {
      setData(data.filter((item) => item.id !== id));
      alert("삭제되었습니다.");
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 1. 상단 검색 필터 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex flex-col gap-2">
        <div className="pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <DateRangeFilter
            startDate={filterDateFrom}
            endDate={filterDateTo}
            onStartDateChange={setFilterDateFrom}
            onEndDateChange={setFilterDateTo}
            selectedPreset={selectedDatePreset}
            onPresetChange={setSelectedDatePreset}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">창고 선택</span>
            <select
              value={filterWarehouse}
              onChange={(e) => setFilterWarehouse(e.target.value)}
              className="h-7 rounded-md border bg-transparent px-2 text-xs font-medium"
            >
              <option value="ALL">전체 창고</option>
              {warehouseList.map((wh) => (
                <option key={wh.id} value={wh.warehouseName}>
                  {wh.warehouseName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">구역 코드</span>
            <select
              value={filterZone}
              onChange={(e) => setFilterZone(e.target.value)}
              className="h-7 rounded-md border bg-transparent px-2 text-xs font-bold"
            >
              <option value="ALL">전체 구역</option>
              <option value="A구역">A구역</option>
              <option value="B구역">B구역</option>
              <option value="C구역">C구역</option>
              <option value="D구역">D구역</option>
              <option value="E구역">E구역</option>
              <option value="F구역">F구역</option>
              <option value="G구역">G구역</option>
              <option value="H구역">H구역</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">지정 용도</span>
            <select
              value={filterUsage}
              onChange={(e) => setFilterUsage(e.target.value)}
              className="h-7 rounded-md border bg-transparent px-2 text-xs font-medium"
            >
              <option value="ALL">전체 용도</option>
              <option value="판매완제품">판매완제품</option>
              <option value="구매완제품">구매완제품</option>
              <option value="원재료">원재료</option>
              <option value="판매반제품">판매반제품</option>
              <option value="구매반제품">구매반제품</option>
              <option value="부품">부품</option>
              <option value="부자재">부자재</option>
              <option value="외주양산">외주양산</option>
            </select>
          </div>

          <div className="flex items-end gap-1.5">
            <Button onClick={() => {}} className="h-7 px-3 bg-sky-600 hover:bg-sky-700 text-white gap-1 text-xs flex-1">
              <Search className="h-3.5 w-3.5" />
              조회
            </Button>
            <Button onClick={handleReset} variant="outline" className="h-7 px-3 gap-1 text-xs text-zinc-600">
              <RefreshCw className="h-3.5 w-3.5" />
              초기화
            </Button>
          </div>
        </div>
      </div>

      {/* 2. 메인 창고 및 구역 목록 그리드 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs overflow-hidden flex flex-col min-h-[480px]">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b">
          <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-100">
            <Boxes className="h-4 w-4 text-sky-600" />
            <span>기초정보관리 - 창고 분할 및 구역 관리 대장</span>
            <span className="text-[11px] font-normal text-zinc-500 ml-1">
              (총 <b className="text-sky-600 font-mono">{filteredData.length}</b>개 구역)
            </span>
          </div>

          {/* 요구사항: 2개의 버튼으로 분리 */}
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => alert("창고 및 구역 마스터 목록이 Excel 파일로 다운로드되었습니다.")}
              variant="outline" 
              size="xs" 
              className="h-7 px-2.5 gap-1 text-xs text-zinc-600"
            >
              <Download className="h-3.5 w-3.5" />
              엑셀 다운로드
            </Button>
            
            {/* 버튼 1: 신규창고 등록 */}
            <Button 
              onClick={() => setIsNewWarehouseModalOpen(true)} 
              size="xs" 
              variant="outline"
              className="h-7 px-2.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-300 gap-1 text-xs font-bold"
            >
              <Building2 className="h-3.5 w-3.5 text-sky-600" />
              신규창고 등록
            </Button>

            {/* 버튼 2: 구역추가 */}
            <Button 
              onClick={handleOpenAddZoneModal} 
              size="xs" 
              className="h-7 px-2.5 bg-sky-600 hover:bg-sky-700 text-white gap-1 text-xs font-bold"
            >
              <Plus className="h-3.5 w-3.5" />
              구역추가
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full border-collapse text-left border-spacing-0 whitespace-nowrap">
            <thead className="sticky top-0 bg-[#2d3748] text-white text-[11px] z-10">
              <tr>
                <th className="p-1.5 w-10 text-center border-r border-slate-600">No</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[140px]">창고명</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[80px] text-center">구역명(코드)</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px] text-center">지정 용도</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[160px]">구역 세부 명칭</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[180px]">적재 대상 품목</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[190px]">세부 로케이션 (Rack)</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[130px]">보관 환경 조건</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[70px] text-center">상태</th>
                <th className="p-1.5 min-w-[80px] text-center">수정/삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px]">
              {filteredData.map((row, idx) => (
                <tr key={row.id} className="hover:bg-sky-50/70 dark:hover:bg-zinc-800/60 transition-colors odd:bg-white even:bg-zinc-50/40 dark:odd:bg-zinc-900 dark:even:bg-zinc-900/50">
                  <td className="p-1.5 text-center font-mono text-zinc-400 border-r">{idx + 1}</td>
                  
                  {/* 창고명 */}
                  <td className="p-1.5 border-r font-bold text-zinc-800 dark:text-zinc-100 truncate max-w-[150px]" title={row.warehouseName}>
                    {row.warehouseName}
                  </td>

                  {/* 구역명 */}
                  <td className="p-1.5 border-r text-center font-bold font-mono text-sky-600 dark:text-sky-400">
                    {row.zoneCode}
                  </td>

                  {/* 임의 지정 용도 */}
                  <td className="p-1.5 border-r text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border">
                      {row.assignedUsage}
                    </span>
                  </td>

                  <td className="p-1.5 border-r font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[160px]" title={row.zoneName}>
                    {row.zoneName}
                  </td>

                  <td className="p-1.5 border-r truncate max-w-[180px]" title={row.targetCategory}>
                    {row.targetCategory}
                  </td>

                  <td className="p-1.5 border-r font-mono text-zinc-600 truncate max-w-[190px]" title={row.locationDesc}>
                    {row.locationDesc}
                  </td>

                  <td className="p-1.5 border-r truncate max-w-[130px]" title={row.temperatureCondition}>
                    {row.temperatureCondition}
                  </td>

                  {/* 사용 상태 */}
                  <td className="p-1.5 border-r text-center">
                    <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${row.isActive ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-500"}`}>
                      {row.isActive ? "사용" : "미사용"}
                    </span>
                  </td>

                  {/* 액션 버튼 (수정모드 시 창고/구역 변경 가능) */}
                  <td className="p-1.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button 
                        onClick={() => handleOpenEditModal(row)} 
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

      {/* 3. [모달 1] 신규창고 등록 단독 모달 */}
      {isNewWarehouseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-lg shadow-xl border overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 text-white">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-xs">신규 창고 등록</h3>
              </div>
              <button onClick={() => setIsNewWarehouseModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3 text-xs">
              <div>
                <label className="block text-zinc-600 font-bold mb-1">
                  창고명 <span className="text-red-500">*</span>
                </label>
                <Input 
                  value={newWhName}
                  onChange={(e) => setNewWhName(e.target.value)}
                  placeholder="예: 제3조립공장 창고동, 외부 물류센터"
                  className="h-8 text-xs font-bold"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-zinc-600 font-medium mb-1">창고 위치 / 동</label>
                <Input 
                  value={newWhLocation}
                  onChange={(e) => setNewWhLocation(e.target.value)}
                  placeholder="예: 광주사업장 C동 1층"
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-zinc-600 font-medium mb-1">비고 및 설명</label>
                <Input 
                  value={newWhDesc}
                  onChange={(e) => setNewWhDesc(e.target.value)}
                  placeholder="예: 완제품 보관 및 출하 전용 창고"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-3 bg-zinc-50 dark:bg-zinc-800 border-t">
              <Button onClick={() => setIsNewWarehouseModalOpen(false)} variant="outline" className="h-8 px-3 text-xs">
                취소
              </Button>
              <Button 
                onClick={handleSaveNewWarehouse}
                className="h-8 px-4 text-xs bg-sky-600 hover:bg-sky-700 text-white gap-1.5 font-bold"
              >
                <Check className="h-3.5 w-3.5" />
                창고 등록
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. [모달 2] 구역추가 및 수정 모달 (창고선택 및 구역선택/입력 지원) */}
      {isZoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-lg shadow-xl border overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 text-white">
              <div className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-xs">
                  {!isEditMode ? "신규 구역 추가" : `창고 구역 정보 수정`}
                </h3>
              </div>
              <button onClick={() => setIsZoneModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs">
              {/* 창고 선택 */}
              <div className="border rounded p-3.5 flex flex-col gap-3 bg-zinc-50 dark:bg-zinc-800/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <label className="block text-zinc-600 font-bold mb-1">
                      소속 창고 선택 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formState.warehouseName}
                      onChange={(e) => setFormState({ ...formState, warehouseName: e.target.value })}
                      className="h-8 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-bold text-zinc-800 dark:text-zinc-200"
                    >
                      {warehouseList.map((wh) => (
                        <option key={wh.id} value={wh.warehouseName}>
                          {wh.warehouseName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-600 font-bold mb-1">
                      보관 온습도/환경 조건
                    </label>
                    <Input 
                      value={formState.temperatureCondition || "상온"} 
                      onChange={(e) => setFormState({ ...formState, temperatureCondition: e.target.value })}
                      placeholder="상온, 제습 밀폐, 방청 보관 등"
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* 구역 선택/입력 및 임의 용도 지정 */}
              <div className="border rounded p-3.5 flex flex-col gap-3">
                <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-sky-600" />
                  구역 코드 및 상황별 임의 용도 설정
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <label className="block text-zinc-600 font-bold mb-1">
                      구역명 (코드) 선택 / 입력 <span className="text-red-500">*</span>
                    </label>
                    {!isCustomZoneInput ? (
                      <div className="flex gap-1.5">
                        <select
                          value={formState.zoneCode}
                          onChange={(e) => handleZoneCodePresetChange(e.target.value)}
                          className="h-8 w-full rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-bold text-sky-700"
                        >
                          <option value="A구역">A구역 (기본: 판매완제품)</option>
                          <option value="B구역">B구역 (기본: 구매완제품)</option>
                          <option value="C구역">C구역 (기본: 원재료/사출레진)</option>
                          <option value="D구역">D구역 (기본: 판매반제품)</option>
                          <option value="E구역">E구역 (기본: 구매반제품)</option>
                          <option value="F구역">F구역 (기본: 부품/PM보전)</option>
                          <option value="G구역">G구역 (기본: 부자재/소모품)</option>
                          <option value="H구역">H구역 (기본: 외주양산 전용)</option>
                          <option value="DIRECT_INPUT">+ 직접 구역명 입력</option>
                        </select>
                      </div>
                    ) : (
                      <div className="flex gap-1.5">
                        <Input
                          value={formState.zoneCode || ""}
                          onChange={(e) => setFormState({ ...formState, zoneCode: e.target.value })}
                          placeholder="예: I구역, 사출시료구역 등"
                          className="h-8 text-xs bg-white font-bold flex-1"
                          autoFocus
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            setIsCustomZoneInput(false);
                            handleZoneCodePresetChange("A구역");
                          }}
                          className="h-8 px-2 text-[10px]"
                        >
                          선택으로
                        </Button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-zinc-600 font-bold mb-1">
                      지정 용도 (상황에 맞춰 임의 지정) <span className="text-red-500">*</span>
                    </label>
                    <Input 
                      value={formState.assignedUsage || ""} 
                      onChange={(e) => setFormState({ ...formState, assignedUsage: e.target.value })}
                      placeholder="예: 판매완제품, 원재료, 사출시료보관 등"
                      className="h-8 text-xs bg-white font-bold text-sky-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <label className="block text-zinc-500 mb-1">
                      구역 세부 명칭 <span className="text-red-500">*</span>
                    </label>
                    <Input 
                      value={formState.zoneName || ""} 
                      onChange={(e) => setFormState({ ...formState, zoneName: e.target.value })}
                      placeholder="예: 완제품 주출하 구역, 원재료 보관고"
                      className="h-8 text-xs bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 mb-1">적재 대상 품목</label>
                    <Input 
                      value={formState.targetCategory || ""} 
                      onChange={(e) => setFormState({ ...formState, targetCategory: e.target.value })}
                      placeholder="예: 현대 NT5 사출 완제품, PP-EPDM 레진"
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-500 mb-1">세부 로케이션 (랙/선반 식별자)</label>
                  <Input 
                    value={formState.locationDesc || ""} 
                    onChange={(e) => setFormState({ ...formState, locationDesc: e.target.value })}
                    placeholder="예: 창고동 1층 Rack A-01 ~ A-20"
                    className="h-8 text-xs bg-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 border-t">
              <Button onClick={() => setIsZoneModalOpen(false)} variant="outline" className="h-8 px-3 text-xs">
                취소
              </Button>
              <Button 
                onClick={handleSaveZone}
                className="h-8 px-4 text-xs bg-sky-600 hover:bg-sky-700 text-white gap-1.5 font-bold"
              >
                <Check className="h-3.5 w-3.5" />
                {!isEditMode ? "구역 추가 완료" : "구역 수정 저장"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
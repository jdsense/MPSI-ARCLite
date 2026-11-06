"use client";

import { useState } from "react";
import { 
  Search, RefreshCw, Plus, ArrowDownRight, 
  CheckCircle2, AlertCircle, X, PackageCheck, 
  Building2, Layers, Barcode, Warehouse
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangeFilter, isWithinDateRange } from "@/components/common/date-range-filter";

// 1. 입고 데이터 인터페이스 정의
interface InboundItem {
  id: number;
  inboundNo: string;        // 입고관리번호 (INB-2026-xxxx)
  inboundDate: string;      // 입고일자
  projectCode: string;      // MPSI 관리번호 (고객사 프로그램 코드 ex: NT5, PRJ-2026-001)
  itemType: "완제품(사출물)" | "원재료(레진)" | "부자재/포장재" | "단품외주가공품";
  itemCode: string;         // 품목코드
  itemName: string;         // 품목명/사양
  vendor: string;           // 공급업체 (뉴몰드, 한국정밀사출, 우성정공, MPSI자체 등)
  lotNo: string;            // LOT 번호
  orderQty: number;         // 발주수량
  inboundQty: number;       // 입고수량
  passQty: number;          // 합격수량
  defectQty: number;        // 불량수량
  unit: string;             // 단위 (EA, KG, BOX)
  targetWarehouse: "완제품 창고" | "원재료 창고" | "자재 창고"; // 적치 창고
  status: "입고대기" | "수입검사중" | "입고완료" | "반품/불량격리";
  inspector: string;        // 검수/담당자
}

// 2. 초기 실증 연동 샘플 데이터
const initialInboundList: InboundItem[] = [
  {
    id: 1,
    inboundNo: "INB-202608-001",
    inboundDate: "2026-08-20",
    projectCode: "NT5-EV-01",
    itemType: "완제품(사출물)",
    itemCode: "PRD-MTR-05H",
    itemName: "전기모터 5HP 하우징 (Black)",
    vendor: "뉴몰드",
    lotNo: "NM-260819-01",
    orderQty: 2000,
    inboundQty: 2000,
    passQty: 1980,
    defectQty: 20,
    unit: "EA",
    targetWarehouse: "완제품 창고",
    status: "입고완료",
    inspector: "김양훈",
  },
  {
    id: 2,
    inboundNo: "INB-202608-002",
    inboundDate: "2026-08-20",
    projectCode: "A2XT-CV-02",
    itemType: "완제품(사출물)",
    itemCode: "PRD-PNL-CVR",
    itemName: "제어 판넬 상부 커버",
    vendor: "뉴몰드",
    lotNo: "NM-260820-03",
    orderQty: 1500,
    inboundQty: 1500,
    passQty: 0,
    defectQty: 0,
    unit: "EA",
    targetWarehouse: "완제품 창고",
    status: "수입검사중",
    inspector: "고병진",
  },
  {
    id: 3,
    inboundNo: "INB-202608-003",
    inboundDate: "2026-08-19",
    projectCode: "COMMON-RAW",
    itemType: "원재료(레진)",
    itemCode: "RAW-ABS-HF380",
    itemName: "ABS 레진 HF-380 (난연 25kg)",
    vendor: "기타 협력사",
    lotNo: "LG-260810-99",
    orderQty: 1000,
    inboundQty: 1000,
    passQty: 1000,
    defectQty: 0,
    unit: "KG",
    targetWarehouse: "원재료 창고",
    status: "입고완료",
    inspector: "이인배",
  },
  {
    id: 4,
    inboundNo: "INB-202608-004",
    inboundDate: "2026-08-18",
    projectCode: "PRJ-2026-003",
    itemType: "단품외주가공품",
    itemCode: "SUB-BRK-CONV",
    itemName: "컨베이어 브라켓 정밀 가공부품",
    vendor: "우성정공",
    lotNo: "WS-260818-B1",
    orderQty: 500,
    inboundQty: 500,
    passQty: 480,
    defectQty: 20,
    unit: "EA",
    targetWarehouse: "자재 창고",
    status: "반품/불량격리",
    inspector: "김태훈",
  },
];

export default function MaterialInboundPage() {
  // 필터 상태
  const [filterProject, setFilterProject] = useState("");
  const [filterVendor, setFilterVendor] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<string>("all");

  // 데이터 리스트
  const [list, setList] = useState<InboundItem[]>(initialInboundList);

  // 모달 제어 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<InboundItem>>({
    inboundDate: "2026-08-20",
    projectCode: "",
    itemType: "완제품(사출물)",
    itemCode: "",
    itemName: "",
    vendor: "뉴몰드",
    lotNo: "",
    orderQty: 0,
    inboundQty: 0,
    passQty: 0,
    defectQty: 0,
    unit: "EA",
    targetWarehouse: "완제품 창고",
    status: "수입검사중",
    inspector: "김양훈",
  });

  // 검색 처리
  const handleSearch = () => {
    const filtered = initialInboundList.filter((item) => {
      const matchProj = filterProject ? (item.projectCode.toLowerCase().includes(filterProject.toLowerCase()) || item.itemName.includes(filterProject)) : true;
      const matchVendor = filterVendor !== "ALL" ? item.vendor === filterVendor : true;
      const matchStatus = filterStatus !== "ALL" ? item.status === filterStatus : true;
      const matchType = filterType !== "ALL" ? item.itemType === filterType : true;
      const matchDate = isWithinDateRange(item.inboundDate, filterDateFrom, filterDateTo);
      return matchProj && matchVendor && matchStatus && matchType && matchDate;
    });
    setList(filtered);
  };

  const handleReset = () => {
    setFilterProject("");
    setFilterVendor("ALL");
    setFilterStatus("ALL");
    setFilterType("ALL");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSelectedDatePreset("all");
    setList(initialInboundList);
  };

  // 신규 입고 등록 저장
  const handleSaveInbound = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectCode || !formData.itemName || !formData.inboundQty) {
      alert("관리번호(프로젝트), 품목명, 입고수량은 필수 입력 항목입니다.");
      return;
    }

    const newEntry: InboundItem = {
      id: Date.now(),
      inboundNo: `INB-202608-${String(list.length + 1).padStart(3, "0")}`,
      inboundDate: formData.inboundDate || "2026-08-20",
      projectCode: formData.projectCode,
      itemType: formData.itemType as InboundItem["itemType"],
      itemCode: formData.itemCode || `ITM-${Math.floor(Math.random() * 9000 + 1000)}`,
      itemName: formData.itemName,
      vendor: formData.vendor as InboundItem["vendor"],
      lotNo: formData.lotNo || `LOT-${Date.now().toString().slice(-6)}`,
      orderQty: Number(formData.orderQty) || Number(formData.inboundQty),
      inboundQty: Number(formData.inboundQty),
      passQty: Number(formData.passQty) || Number(formData.inboundQty),
      defectQty: Number(formData.defectQty) || 0,
      unit: formData.unit || "EA",
      targetWarehouse: formData.targetWarehouse as InboundItem["targetWarehouse"],
      status: formData.status as InboundItem["status"],
      inspector: formData.inspector || "김양훈",
    };

    setList([newEntry, ...list]);
    setIsModalOpen(false);
    alert(`[입고 등록 완료]\n관리번호: ${newEntry.inboundNo}\n창고 적재 및 MES 재고 연동이 완료되었습니다.`);
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 2. 검색 필터 바 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex flex-col gap-2">
        <div className="pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <DateRangeFilter
            startDate={filterDateFrom}
            endDate={filterDateTo}
            onStartDateChange={setFilterDateFrom}
            onEndDateChange={setFilterDateTo}
            selectedPreset={selectedDatePreset}
            onPresetChange={setSelectedDatePreset}
            label="입고일자"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">프로젝트/품명</span>
            <Input 
              value={filterProject} 
              onChange={(e) => setFilterProject(e.target.value)} 
              placeholder="예: NT5, 하우징, 레진" 
              className="h-7 text-xs" 
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">공급업체 구분</span>
            <select 
              value={filterVendor} 
              onChange={(e) => setFilterVendor(e.target.value)} 
              className="h-7 rounded-md border bg-transparent px-2 text-xs"
            >
              <option value="ALL">전체 공급업체</option>
              <option value="뉴몰드">(주)뉴몰드 (사출양산처)</option>
              <option value="한국정밀사출">(주)한국정밀사출 (사출양산처)</option>
              <option value="우성정공">우성정공(주) (금형/단품외주)</option>
              <option value="대한금형">대한금형(주) (금형제작)</option>
              <option value="MPSI 자체">MPSI 자체생산라인</option>
              <option value="기타 협력사">기타 협력사 (원부자재)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">품목 유형</span>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)} 
              className="h-7 rounded-md border bg-transparent px-2 text-xs"
            >
              <option value="ALL">전체 품목</option>
              <option value="완제품(사출물)">완제품(사출물)</option>
              <option value="원재료(레진)">원재료(레진)</option>
              <option value="부자재/포장재">부자재/포장재</option>
              <option value="단품외주가공품">단품외주가공품</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">진행 상태</span>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)} 
              className="h-7 rounded-md border bg-transparent px-2 text-xs"
            >
              <option value="ALL">전체 상태</option>
              <option value="입고대기">입고대기</option>
              <option value="수입검사중">수입검사중</option>
              <option value="입고완료">입고완료</option>
              <option value="반품/불량격리">반품/불량격리</option>
            </select>
          </div>
        </div>

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

      {/* 3. 데이터 그리드 영역 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs overflow-hidden flex flex-col min-h-[460px]">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b">
          <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-100">
            <PackageCheck className="h-4 w-4 text-sky-600" />
            <span>자재 및 제품 입고 처리 내역 (SCM/MES 연계)</span>
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            size="sm" 
            className="h-7 px-2.5 text-xs bg-sky-600 hover:bg-sky-700 text-white gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            신규 입고 처리 등록
          </Button>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full border-collapse text-left border-spacing-0 whitespace-nowrap">
            <thead className="sticky top-0 bg-[#2d3748] text-white text-[11px] z-10">
              <tr>
                <th className="p-1.5 w-10 text-center border-r border-slate-600">No</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px]">입고관리번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px]">입고일자</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[100px]">관리번호(프로젝트)</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px]">품목구분</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[140px]">품목명/규격</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px]">공급업체</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[100px]">LOT 번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[70px] text-right">입고수량</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[70px] text-right">합격수량</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[60px] text-right">불량</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[80px]">적치창고</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[85px] text-center">진행상태</th>
                <th className="p-1.5 min-w-[70px]">검수자</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
              {list.map((row, idx) => (
                <tr key={row.id} className="hover:bg-sky-50 dark:hover:bg-zinc-800/60 transition-colors odd:bg-white even:bg-zinc-50/50 dark:odd:bg-zinc-900 dark:even:bg-zinc-900/50">
                  <td className="p-1.5 text-center font-mono text-zinc-500 border-r">{idx + 1}</td>
                  <td className="p-1.5 border-r font-mono text-sky-600 font-medium">{row.inboundNo}</td>
                  <td className="p-1.5 border-r font-mono">{row.inboundDate}</td>
                  <td className="p-1.5 border-r font-mono font-medium">{row.projectCode}</td>
                  <td className="p-1.5 border-r">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border">
                      {row.itemType}
                    </span>
                  </td>
                  <td className="p-1.5 border-r font-medium text-zinc-900 dark:text-zinc-100">{row.itemName}</td>
                  <td className="p-1.5 border-r font-semibold">{row.vendor}</td>
                  <td className="p-1.5 border-r font-mono text-[11px] text-zinc-500">{row.lotNo}</td>
                  <td className="p-1.5 border-r text-right font-mono font-bold">{row.inboundQty.toLocaleString()} {row.unit}</td>
                  <td className="p-1.5 border-r text-right font-mono text-emerald-600 font-bold">{row.passQty.toLocaleString()}</td>
                  <td className="p-1.5 border-r text-right font-mono text-rose-600 font-bold">{row.defectQty > 0 ? row.defectQty : "-"}</td>
                  <td className="p-1.5 border-r">
                    <span className="flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                      <Warehouse className="h-3 w-3 text-zinc-400" />
                      {row.targetWarehouse}
                    </span>
                  </td>
                  <td className="p-1.5 border-r text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      row.status === "입고완료" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300" :
                      row.status === "수입검사중" ? "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border border-sky-300" :
                      row.status === "반품/불량격리" ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300" :
                      "bg-amber-100 text-amber-700 border border-amber-300"
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="p-1.5">{row.inspector}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. 신규 입고 처리 등록 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-lg shadow-xl border overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 text-white">
              <div className="flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-xs">신규 자재/사출물 입고 및 수입검사 등록</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 모달 폼 */}
            <form onSubmit={handleSaveInbound} className="p-4 flex flex-col gap-3 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">입고일자</label>
                  <Input 
                    type="date"
                    value={formData.inboundDate} 
                    onChange={(e) => setFormData({...formData, inboundDate: e.target.value})} 
                    className="h-7 text-xs" 
                    required 
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                    관리번호 (MPSI 지정 코드) <span className="text-rose-500">*</span>
                  </label>
                  <Input 
                    value={formData.projectCode} 
                    onChange={(e) => setFormData({...formData, projectCode: e.target.value})} 
                    placeholder="예: NT5, A2XT-01" 
                    className="h-7 text-xs" 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">공급업체</label>
                  <select 
                    value={formData.vendor} 
                    onChange={(e) => setFormData({...formData, vendor: e.target.value as InboundItem["vendor"]})}
                    className="h-7 rounded-md border bg-transparent px-2 text-xs"
                  >
                    <option value="(주)뉴몰드">(주)뉴몰드 (사출양산품)</option>
                    <option value="(주)한국정밀사출">(주)한국정밀사출 (사출양산품)</option>
                    <option value="우성정공(주)">우성정공(주) (금형/단품외주)</option>
                    <option value="대한금형(주)">대한금형(주) (금형제작)</option>
                    <option value="MPSI 자체생산">MPSI 자체생산라인</option>
                    <option value="기타 협력사">기타 협력사</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">품목 구분</label>
                  <select 
                    value={formData.itemType} 
                    onChange={(e) => setFormData({...formData, itemType: e.target.value as InboundItem["itemType"]})}
                    className="h-7 rounded-md border bg-transparent px-2 text-xs"
                  >
                    <option value="완제품(사출물)">완제품(사출물)</option>
                    <option value="원재료(레진)">원재료(레진)</option>
                    <option value="부자재/포장재">부자재/포장재</option>
                    <option value="단품외주가공품">단품외주가공품</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                  품목명 및 규격 <span className="text-rose-500">*</span>
                </label>
                <Input 
                  value={formData.itemName} 
                  onChange={(e) => setFormData({...formData, itemName: e.target.value})} 
                  placeholder="예: 전기모터 하우징 5HP (Black)" 
                  className="h-7 text-xs" 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">LOT 관리번호</label>
                  <Input 
                    value={formData.lotNo} 
                    onChange={(e) => setFormData({...formData, lotNo: e.target.value})} 
                    placeholder="예: NM-260820-01" 
                    className="h-7 text-xs" 
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">적치 대상 창고</label>
                  <select 
                    value={formData.targetWarehouse} 
                    onChange={(e) => setFormData({...formData, targetWarehouse: e.target.value as InboundItem["targetWarehouse"]})}
                    className="h-7 rounded-md border bg-transparent px-2 text-xs"
                  >
                    <option value="완제품 창고">완제품 창고</option>
                    <option value="원재료 창고">원재료 창고</option>
                    <option value="자재 창고">자재 창고</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-md border">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">입고수량</label>
                  <Input 
                    type="number"
                    value={formData.inboundQty || ""} 
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFormData({...formData, inboundQty: val, passQty: val, defectQty: 0});
                    }} 
                    className="h-7 text-xs font-mono font-bold" 
                    required 
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-emerald-600">합격수량</label>
                  <Input 
                    type="number"
                    value={formData.passQty || ""} 
                    onChange={(e) => {
                      const pass = Number(e.target.value);
                      const inQty = Number(formData.inboundQty) || 0;
                      setFormData({...formData, passQty: pass, defectQty: Math.max(0, inQty - pass)});
                    }} 
                    className="h-7 text-xs font-mono text-emerald-600 font-bold" 
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-rose-600">불량수량</label>
                  <Input 
                    type="number"
                    value={formData.defectQty || ""} 
                    onChange={(e) => setFormData({...formData, defectQty: Number(e.target.value)})} 
                    className="h-7 text-xs font-mono text-rose-600 font-bold" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">초기 상태</label>
                  <select 
                    value={formData.status} 
                    onChange={(e) => setFormData({...formData, status: e.target.value as InboundItem["status"]})}
                    className="h-7 rounded-md border bg-transparent px-2 text-xs"
                  >
                    <option value="수입검사중">수입검사중</option>
                    <option value="입고완료">입고완료 (즉시 반영)</option>
                    <option value="입고대기">입고대기</option>
                    <option value="반품/불량격리">반품/불량격리</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">검수자</label>
                  <Input 
                    value={formData.inspector} 
                    onChange={(e) => setFormData({...formData, inspector: e.target.value})} 
                    className="h-7 text-xs" 
                  />
                </div>
              </div>

              {/* 푸터 */}
              <div className="flex justify-end gap-2 pt-3 border-t mt-2">
                <Button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  variant="outline" 
                  className="h-7 px-3 text-xs"
                >
                  취소
                </Button>
                <Button 
                  type="submit" 
                  className="h-7 px-4 text-xs bg-sky-600 hover:bg-sky-700 text-white gap-1"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  입고 확정 및 재고 반영
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
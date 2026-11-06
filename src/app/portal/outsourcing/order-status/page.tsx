"use client";

import { useState } from "react";
import { 
  Search, RefreshCw, ShoppingCart, FileText, Building2, Plus, X, Save, CheckCircle2, FolderKanban
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangeFilter, isWithinDateRange } from "@/components/common/date-range-filter";
import { ProjectSelector } from "@/components/project-selector";
import { useProjectMaster } from "@/lib/project-store";

// 외주 및 구매 발주 데이터 타입 (Process 3, 4, 12단계 연동)
interface OrderStatusItem {
  id: number;
  idx: number;
  orderNo: string;         // 발주서 번호 (금형발주서 또는 구매발주서)
  orderType: "금형제작발주" | "양산구매발주"; // 발주 유형
  projectNo: string;       // 소속 프로젝트 번호 (NT5, A2XT 등 프로젝트 마스터 키)
  projectName: string;     // 프로젝트/품명
  targetVendor: string;    // 수신 협력사 (우성정공 또는 뉴몰드)
  orderDate: string;       // 발주일자
  dueDate: string;         // 납기일자 (T1 목표일 또는 양산 납기)
  totalAmount: number;     // 발주금액 (원)
  status: "발주서발송" | "접수완료" | "진행중" | "납품완료"; // 발주 상태
  managerName: string;     // MPSI 담당자
  remark: string;          // 비고
}

// 초기 샘플 데이터 (프로젝트 마스터 연동 실 데이터)
const initialOrders: OrderStatusItem[] = [
  {
    id: 1,
    idx: 1,
    orderNo: "PO-202608-M01",
    orderType: "금형제작발주",
    projectNo: "NT5-2026-A",
    projectName: "[현대 NT5 도어 트림] Front Door Upper Cover LH/RH",
    targetVendor: "우성정공(주)",
    orderDate: "2026-08-12",
    dueDate: "2026-09-30",
    totalAmount: 80000000,
    status: "진행중",
    managerName: "고병진 팀장",
    remark: "도면 정합성 및 DR 검토 완료에 따른 우성정공 금형제작 및 T1 일정 발주",
  },
  {
    id: 2,
    idx: 2,
    orderNo: "PO-202608-M02",
    orderType: "금형제작발주",
    projectNo: "A2XT-M01",
    projectName: "[기아 A2XT 콘솔] Center Console Main Bracket",
    targetVendor: "대한금형(주)",
    orderDate: "2026-08-16",
    dueDate: "2026-10-15",
    totalAmount: 43000000,
    status: "접수완료",
    managerName: "고병진 팀장",
    remark: "수주확정에 따른 대한금형(주) 금형제작 발주서 발송",
  },
  {
    id: 3,
    idx: 3,
    orderNo: "PO-202608-P01",
    orderType: "양산구매발주",
    projectNo: "SPX-EV-09",
    projectName: "[SPX 전기차 배터리] BMS Battery Case Module",
    targetVendor: "(주)한국정밀사출",
    orderDate: "2026-08-18",
    dueDate: "2026-09-15",
    totalAmount: 112000000,
    status: "접수완료",
    managerName: "김양훈 수석",
    remark: "PPAP 양산 승인 완료에 따른 한국정밀사출 초도 양산 20,000 EA 구매발주",
  },
  {
    id: 4,
    idx: 4,
    orderNo: "PO-202608-P02",
    orderType: "양산구매발주",
    projectNo: "NT5-2026-A",
    projectName: "[현대 NT5 도어 트림] Front Door Upper Cover LH/RH",
    targetVendor: "(주)뉴몰드",
    orderDate: "2026-08-19",
    dueDate: "2026-10-10",
    totalAmount: 95000000,
    status: "진행중",
    managerName: "고병진 팀장",
    remark: "PPAP 완료 후 뉴몰드 사출 초도 양산 25,000 EA 구매발주",
  },
];

export default function OrderStatusPage() {
  const { projects, updateStep } = useProjectMaster();

  // 1. 검색 조건 State
  const [filterOrderNo, setFilterOrderNo] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterVendor, setFilterVendor] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDateType, setFilterDateType] = useState("orderDate");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState("all");

  // 2. 테이블 데이터 및 모달 State
  const [data, setData] = useState<OrderStatusItem[]>(initialOrders);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<OrderStatusItem>>({
    orderType: "금형제작발주",
    targetVendor: "우성정공(주)",
    orderDate: new Date().toISOString().split('T')[0],
    status: "발주서발송",
    managerName: "고병진 팀장",
  });

  // 검색
  const handleSearch = () => {
    const filtered = initialOrders.filter((item) => {
      const matchOrder = filterOrderNo ? item.orderNo.toLowerCase().includes(filterOrderNo.toLowerCase()) : true;
      const matchProject = filterProject 
        ? item.projectName.includes(filterProject) || item.projectNo.toLowerCase().includes(filterProject.toLowerCase()) 
        : true;
      const matchVendor = filterVendor !== "ALL" ? item.targetVendor === filterVendor : true;
      const matchType = filterType !== "ALL" ? item.orderType === filterType : true;
      const matchStatus = filterStatus !== "ALL" ? item.status === filterStatus : true;
      const targetDate = filterDateType === "dueDate" ? item.dueDate : item.orderDate;
      const matchDate = isWithinDateRange(targetDate, filterDateFrom, filterDateTo);
      return matchOrder && matchProject && matchVendor && matchType && matchStatus && matchDate;
    });
    setData(filtered);
  };

  const handleReset = () => {
    setFilterOrderNo("");
    setFilterProject("");
    setFilterVendor("ALL");
    setFilterType("ALL");
    setFilterStatus("ALL");
    setFilterDateType("orderDate");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSelectedDatePreset("all");
    setData(initialOrders);
  };

  // 신규 발주서 등록 저장
  const handleSaveOrder = () => {
    if (!formData.projectName || !formData.totalAmount) {
      alert("연계할 프로젝트를 선택하고 발주금액을 입력해주세요.");
      return;
    }

    const newRow: OrderStatusItem = {
      id: Date.now(),
      idx: data.length + 1,
      orderNo: `PO-202608-${formData.orderType === "금형제작발주" ? "M" : "P"}${String(data.length + 1).padStart(2, '0')}`,
      orderType: formData.orderType || "금형제작발주",
      projectNo: formData.projectNo || "NT5-2026-A",
      projectName: formData.projectName || "",
      targetVendor: formData.targetVendor || "우성정공(주)",
      orderDate: formData.orderDate || new Date().toISOString().split('T')[0],
      dueDate: formData.dueDate || "",
      totalAmount: Number(formData.totalAmount) || 0,
      status: "발주서발송",
      managerName: formData.managerName || "고병진 팀장",
      remark: formData.remark || "",
    };

    setData([newRow, ...data]);

    // 프로젝트 마스터 13단계 프로세스 롤업 동기화
    if (newRow.projectNo) {
      if (newRow.orderType === "금형제작발주") {
        updateStep(newRow.projectNo, {
          currentStep: 4, // 4단계: 금형 발주 (PO)
          stepStatus: "진행중",
          notes: `[공정 4] ${newRow.targetVendor} 금형제작 공식 발주서 발행 완료 (${newRow.orderNo})`,
        });
      } else {
        updateStep(newRow.projectNo, {
          currentStep: 12, // 12단계: 완제품 구매 발주 (PO)
          stepStatus: "진행중",
          notes: `[공정 12] ${newRow.targetVendor} 완제품 양산구매 발주서 발행 완료 (${newRow.orderNo})`,
        });
      }
    }

    setIsModalOpen(false);
    alert(`[${newRow.orderNo}] 발주서가 성공적으로 발행되어 [${newRow.targetVendor}] 포털로 전송되었으며, [프로젝트 관리] 13단계 프로세스에 반영되었습니다.`);
  };

  return (
    <div className="flex flex-col gap-3 text-xs relative">
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
            dateType={filterDateType}
            onDateTypeChange={setFilterDateType}
            dateTypeOptions={[
              { value: "orderDate", label: "발주일자" },
              { value: "dueDate", label: "납기일자" },
            ]}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">발주서 번호</span>
            <Input 
              value={filterOrderNo} 
              onChange={(e) => setFilterOrderNo(e.target.value)} 
              placeholder="PO-2026..." 
              className="h-7 text-xs" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">프로젝트/품명</span>
            <Input 
              value={filterProject} 
              onChange={(e) => setFilterProject(e.target.value)} 
              placeholder="검색어 입력" 
              className="h-7 text-xs" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">발주 유형</span>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)} 
              className="h-7 rounded-md border bg-transparent px-2 text-xs"
            >
              <option value="ALL">전체 유형</option>
              <option value="금형제작발주">금형제작발주 (공정 4)</option>
              <option value="양산구매발주">양산구매발주 (공정 12)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">수신 협력사</span>
            <select 
              value={filterVendor} 
              onChange={(e) => setFilterVendor(e.target.value)} 
              className="h-7 rounded-md border bg-transparent px-2 text-xs"
            >
              <option value="ALL">전체 협력사/자체</option>
              <option value="우성정공(주)">우성정공(주)</option>
              <option value="대한금형(주)">대한금형(주)</option>
              <option value="MPSI 자체제작팀">MPSI 자체제작팀</option>
              <option value="(주)뉴몰드">(주)뉴몰드</option>
              <option value="(주)한국정밀사출">(주)한국정밀사출</option>
              <option value="MPSI 자체생산라인">MPSI 자체생산라인</option>
            </select>
          </div>
          <div className="flex items-end gap-1.5">
            <Button onClick={handleSearch} className="h-7 px-3 bg-sky-600 hover:bg-sky-700 text-white gap-1 text-xs flex-1">
              <Search className="h-3.5 w-3.5 mr-1" /> 검색
            </Button>
            <Button onClick={handleReset} variant="outline" className="h-7 px-3 text-xs text-zinc-600">
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> 초기화
            </Button>
          </div>
        </div>
      </div>

      {/* 2. 데이터 그리드 영역 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs overflow-hidden flex flex-col min-h-[480px]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border-b">
          <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-100">
            <ShoppingCart className="h-4 w-4 text-sky-600" />
            <span>외주 및 구매 발주 현황 (금형외주 · 양산외주 · 자체생산)</span>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="h-7 px-2.5 text-xs gap-1 bg-sky-600 hover:bg-sky-700 text-white">
            <Plus className="h-3.5 w-3.5" /> 신규 발주서 작성
          </Button>
        </div>

        {/* 데이터 테이블 */}
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full border-collapse text-left whitespace-nowrap">
            <thead className="sticky top-0 bg-[#2d3748] text-white text-[11px] z-10">
              <tr>
                <th className="p-1.5 w-10 text-center border-r border-slate-600">Idx</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[130px]">발주서 번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px] text-center">발주 유형</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[170px]">프로젝트/품명</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[100px] text-center">수신 협력사</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[120px] text-right pr-3">발주금액 (원)</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px]">발주일자</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px]">납기일자</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px] text-center">발주 상태</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[80px]">담당자</th>
                <th className="p-1.5 min-w-[200px]">비고</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {data.map((row) => (
                <tr key={row.id} className="hover:bg-sky-50 dark:hover:bg-zinc-800/60 transition-colors odd:bg-white even:bg-zinc-50/50">
                  <td className="p-1.5 text-center font-mono text-zinc-500 border-r">{row.idx}</td>
                  <td className="p-1.5 border-r font-mono text-sky-600 font-bold">{row.orderNo}</td>
                  <td className="p-1.5 border-r text-center font-semibold">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${row.orderType === "금형제작발주" ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {row.orderType}
                    </span>
                  </td>
                  <td className="p-1.5 border-r font-medium">
                    <div className="flex flex-col">
                      <span className="font-mono text-[10px] text-sky-600 font-bold">{row.projectNo}</span>
                      <span className="truncate max-w-[220px]" title={row.projectName}>{row.projectName}</span>
                    </div>
                  </td>
                  <td className="p-1.5 border-r text-center font-bold">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                      {row.targetVendor}
                    </span>
                  </td>
                  <td className="p-1.5 border-r font-mono text-right pr-3 font-bold text-sky-700">{row.totalAmount.toLocaleString()}</td>
                  <td className="p-1.5 border-r font-mono">{row.orderDate}</td>
                  <td className="p-1.5 border-r font-mono text-sky-600 font-bold">{row.dueDate}</td>
                  
                  {/* 발주 상태 태그 */}
                  <td className="p-1.5 border-r text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      row.status === "진행중" ? "bg-sky-100 text-sky-700 border border-sky-300" :
                      row.status === "접수완료" ? "bg-emerald-100 text-emerald-700 border border-emerald-300" :
                      "bg-zinc-100 text-zinc-600"
                    }`}>
                      {row.status}
                    </span>
                  </td>

                  <td className="p-1.5 border-r">{row.managerName}</td>
                  <td className="p-1.5 text-zinc-500 truncate max-w-[200px]">{row.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. 신규 발주서 작성 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-lg shadow-xl border overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-800 text-white">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-xs">MPSI 외주 및 구매 발주서 신규 작성</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-2 gap-4 max-h-[75vh] overflow-y-auto">
              {/* 프로젝트 마스터 선택기 */}
              <div className="col-span-2 bg-sky-50/70 dark:bg-sky-950/30 p-3 rounded-lg border border-sky-200 dark:border-sky-800 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5 text-xs">
                    <FolderKanban className="h-4 w-4 text-sky-600" />
                    프로젝트 마스터 연계 선택 <span className="text-red-500">*</span>
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    * 프로젝트를 선택하면 품명, 수신 협력사, 목표 일정이 자동 연동됩니다.
                  </span>
                </div>
                <ProjectSelector
                  value={formData.projectNo}
                  onChange={(selectedNo, project) => {
                    if (project) {
                      const isMold = (formData.orderType || "금형제작발주") === "금형제작발주";
                      setFormData(prev => ({
                        ...prev,
                        projectNo: project.projectNo,
                        projectName: `[${project.projectName}] ${project.productName}`,
                        targetVendor: isMold ? (project.moldVendor || "우성정공(주)") : (project.massVendor || "(주)뉴몰드"),
                        dueDate: isMold ? (project.targetT1Date || "2026-09-30") : (project.targetMassDate || "2026-11-30"),
                      }));
                    }
                  }}
                  placeholder="연계할 프로젝트를 선택하세요 (마스터 프로젝트 목록)"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1">발주 유형 <span className="text-red-500">*</span></label>
                <select 
                  value={formData.orderType} 
                  onChange={(e) => {
                    const newType = e.target.value as any;
                    const found = projects.find(p => p.projectNo === formData.projectNo);
                    setFormData(prev => ({
                      ...prev,
                      orderType: newType,
                      targetVendor: newType === "금형제작발주" ? (found?.moldVendor || "우성정공(주)") : (found?.massVendor || "(주)뉴몰드"),
                      dueDate: found ? (newType === "금형제작발주" ? found.targetT1Date : found.targetMassDate) : prev.dueDate,
                    }));
                  }}
                  className="h-8 w-full rounded-md border bg-transparent px-2 text-xs font-bold"
                >
                  <option value="금형제작발주">금형제작발주 (공정 4: 금형 PO)</option>
                  <option value="양산구매발주">양산구매발주 (공정 12: 양산 PO)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1">수신 협력사 <span className="text-red-500">*</span></label>
                <select 
                  value={formData.targetVendor} 
                  onChange={(e) => setFormData({...formData, targetVendor: e.target.value})}
                  className="h-8 w-full rounded-md border bg-transparent px-2 text-xs font-bold"
                >
                  <optgroup label="금형제작처">
                    <option value="우성정공(주)">우성정공(주) (외주)</option>
                    <option value="대한금형(주)">대한금형(주) (외주)</option>
                    <option value="MPSI 자체제작팀">MPSI 자체제작팀 (자체)</option>
                  </optgroup>
                  <optgroup label="사출양산처">
                    <option value="(주)뉴몰드">(주)뉴몰드 (외주)</option>
                    <option value="(주)한국정밀사출">(주)한국정밀사출 (외주)</option>
                    <option value="MPSI 자체생산라인">MPSI 자체생산라인 (자체)</option>
                  </optgroup>
                </select>
              </div>

              <div className="col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-medium text-zinc-500">프로젝트 / 품명 <span className="text-red-500">*</span></label>
                  {formData.projectNo && (
                    <span className="text-[10px] text-sky-600 font-mono font-bold">
                      관리번호: {formData.projectNo}
                    </span>
                  )}
                </div>
                <Input 
                  value={formData.projectName || ""} 
                  onChange={(e) => setFormData({...formData, projectName: e.target.value})} 
                  placeholder="프로젝트를 선택하면 자동으로 채워집니다 (직접 수정 가능)" 
                  className="h-8 text-xs font-medium" 
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1">발주 금액 (원) <span className="text-red-500">*</span></label>
                <Input 
                  type="number"
                  value={formData.totalAmount || ""} 
                  onChange={(e) => setFormData({...formData, totalAmount: Number(e.target.value)})} 
                  placeholder="숫자만 입력" 
                  className="h-8 text-xs font-mono" 
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1">MPSI 담당자</label>
                <Input 
                  value={formData.managerName || "고병진"} 
                  onChange={(e) => setFormData({...formData, managerName: e.target.value})} 
                  className="h-8 text-xs" 
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1">발주일자</label>
                <Input 
                  type="date" 
                  value={formData.orderDate || ""} 
                  onChange={(e) => setFormData({...formData, orderDate: e.target.value})} 
                  className="h-8 text-xs" 
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1">납기일자 (목표일)</label>
                <Input 
                  type="date" 
                  value={formData.dueDate || ""} 
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})} 
                  className="h-8 text-xs" 
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-medium text-zinc-500 mb-1">비고 및 특이사항</label>
                <Input 
                  value={formData.remark || ""} 
                  onChange={(e) => setFormData({...formData, remark: e.target.value})} 
                  placeholder="T1 시사출 일정 및 납품 조건 입력" 
                  className="h-8 text-xs" 
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-t">
              <span className="text-[10px] text-zinc-400">발행 시 협력사 포털 발주 현황에 연동됩니다.</span>
              <div className="flex gap-2">
                <Button onClick={() => setIsModalOpen(false)} variant="outline" className="h-8 px-3 text-xs">취소</Button>
                <Button onClick={handleSaveOrder} className="h-8 px-4 text-xs bg-sky-600 hover:bg-sky-700 text-white gap-1.5">
                  <Save className="h-3.5 w-3.5" /> 발주서 발행 및 전송
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
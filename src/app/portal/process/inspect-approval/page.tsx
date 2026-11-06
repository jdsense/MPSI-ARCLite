"use client";

import { useState } from "react";
import { 
  Search, RefreshCw, CheckCircle2, XCircle, 
  FileCheck, Eye, X, Building2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// 시사출 검사 및 승인 데이터 타입 (Process 8 ~ 10단계 연동)
interface InspectionItem {
  id: number;
  idx: number;
  inspectNo: string;        // 검사식별자
  projectNo: string;        // 프로젝트번호
  projectName: string;      // 프로젝트명
  productName: string;      // 제품명
  trialDegree: string;      // 시사출 차수 (1차, 2차 등)
  moldVendor: string;       // 금형제작사 (우성정공)
  injectionVendor: string;  // 사출양산사 (뉴몰드)
  sampleRcvDate: string;    // 샘플 수신일자
  dimensionResult: "OK" | "NG" | "대기"; // 치수검사결과
  appearanceResult: "OK" | "NG" | "대기"; // 외관검사결과
  status: "검사대기" | "Pass (양산지시)" | "Fail (수정요청)"; // 최종 판정
  inspector: string;        // 검사자
  updatedAt: string;
  failReason?: string;      // Fail 사유
}

// 초기 샘플 데이터 (시사출 검수 및 Pass/Fail 분기 반영)
const initialInspections: InspectionItem[] = [
  {
    id: 1,
    idx: 1,
    inspectNo: "INS-202608-001",
    projectNo: "PRJ-202608-001",
    projectName: "FF 플라스틱 사출 커버 A형",
    productName: "FF 사출 커버 A형",
    trialDegree: "1차 시사출",
    moldVendor: "우성정공(주)",
    injectionVendor: "(주)뉴몰드",
    sampleRcvDate: "2026-08-10",
    dimensionResult: "OK",
    appearanceResult: "OK",
    status: "검사대기",
    inspector: "고병진",
    updatedAt: "2026-08-11 09:30",
  },
  {
    id: 2,
    idx: 2,
    inspectNo: "INS-202608-002",
    projectNo: "PRJ-202608-002",
    projectName: "배터리 케이스 하부 하우징",
    productName: "배터리 하부 하우징",
    trialDegree: "1차 시사출",
    moldVendor: "대한금형(주)",
    injectionVendor: "(주)한국정밀사출",
    sampleRcvDate: "2026-08-08",
    dimensionResult: "NG",
    appearanceResult: "OK",
    status: "Fail (수정요청)",
    inspector: "김양훈",
    updatedAt: "2026-08-09 14:00",
    failReason: "우측 볼트 체결부 수축 치수 오차 (+0.05mm 초과)",
  },
  {
    id: 3,
    idx: 3,
    inspectNo: "INS-202608-003",
    projectNo: "PRJ-202608-003",
    projectName: "전장용 제어 브라켓",
    productName: "완성형 브라켓",
    trialDegree: "2차 시사출",
    moldVendor: "MPSI 자체제작팀",
    injectionVendor: "MPSI 자체생산라인",
    sampleRcvDate: "2026-08-02",
    dimensionResult: "OK",
    appearanceResult: "OK",
    status: "Pass (양산지시)",
    inspector: "고병진",
    updatedAt: "2026-08-03 16:45",
  },
];

export default function InspectApprovalPage() {
  // 1. 검색 조건 State
  const [filterProjectNo, setFilterProjectNo] = useState("");
  const [filterProductName, setFilterProductName] = useState("");
  const [filterMoldVendor, setFilterMoldVendor] = useState("ALL");
  const [filterInjectionVendor, setFilterInjectionVendor] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // 2. 테이블 데이터 및 선택 모달 State
  const [data, setData] = useState<InspectionItem[]>(initialInspections);
  const [selectedItem, setSelectedItem] = useState<InspectionItem | null>(null);
  
  // 판정 입력 폼 상태
  const [dimRes, setDimRes] = useState<"OK" | "NG">("OK");
  const [appRes, setAppRes] = useState<"OK" | "NG">("OK");
  const [failReasonText, setFailReasonText] = useState("");

  // 검색
  const handleSearch = () => {
    const filtered = initialInspections.filter((item) => {
      const matchNo = filterProjectNo ? item.projectNo.toLowerCase().includes(filterProjectNo.toLowerCase()) : true;
      const matchProd = filterProductName ? item.productName.includes(filterProductName) : true;
      const matchMold = filterMoldVendor !== "ALL" ? item.moldVendor === filterMoldVendor : true;
      const matchInj = filterInjectionVendor !== "ALL" ? item.injectionVendor === filterInjectionVendor : true;
      const matchStatus = filterStatus !== "ALL" ? item.status === filterStatus : true;
      return matchNo && matchProd && matchMold && matchInj && matchStatus;
    });
    setData(filtered);
  };

  const handleReset = () => {
    setFilterProjectNo("");
    setFilterProductName("");
    setFilterMoldVendor("ALL");
    setFilterInjectionVendor("ALL");
    setFilterStatus("ALL");
    setData(initialInspections);
  };

  // 모달 열기
  const handleOpenDetail = (item: InspectionItem) => {
    setSelectedItem(item);
    setDimRes(item.dimensionResult === "NG" ? "NG" : "OK");
    setAppRes(item.appearanceResult === "NG" ? "NG" : "OK");
    setFailReasonText(item.failReason || "");
  };

  // 📌 Pass (양산 지시) 처리 - 사출양산처 자동 이관 (Process 10단계 연동)
  const handleApprovePass = () => {
    if (!selectedItem) return;

    if (confirm(`[Pass 승인]\n'${selectedItem.productName}'의 시사출 검수가 합격되었습니다.\n[${selectedItem.injectionVendor}]로 양산 시작 지시를 자동 이관하시겠습니까?`)) {
      const now = new Date();
      const updatedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      setData(prev => prev.map(row => 
        row.id === selectedItem.id 
          ? {
              ...row,
              dimensionResult: "OK",
              appearanceResult: "OK",
              status: "Pass (양산지시)",
              updatedAt: updatedDate,
              failReason: ""
            }
          : row
      ));

      alert(`[${selectedItem.injectionVendor}] 포털/시스템으로 [양산 시작 지시] 데이터가 성공적으로 이관되었습니다.`);
      setSelectedItem(null);
    }
  };

  // 📌 Fail (금형 수정 요청) 처리 - 금형제작처 금형 수정 연동 (Process 10-1단계 연동)
  const handleApproveFail = () => {
    if (!selectedItem) return;
    if (!failReasonText.trim()) {
      alert(`Fail 판정 시 [${selectedItem.moldVendor}]으로 전달할 금형 수정 요청 사유를 반드시 입력해야 합니다.`);
      return;
    }

    if (confirm(`[Fail 수정요청]\n금형 수정 요청서를 [${selectedItem.moldVendor}]으로 즉시 전달하시겠습니까?`)) {
      const now = new Date();
      const updatedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      setData(prev => prev.map(row => 
        row.id === selectedItem.id 
          ? {
              ...row,
              dimensionResult: dimRes,
              appearanceResult: appRes,
              status: "Fail (수정요청)",
              updatedAt: updatedDate,
              failReason: failReasonText.trim()
            }
          : row
      ));

      alert(`[${selectedItem.moldVendor}] 포털/시스템으로 [금형 수정 요청서]가 즉시 전달되었습니다.`);
      setSelectedItem(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs relative">
      {/* 1. 상단 검색 필터 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex flex-col gap-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">프로젝트 번호</span>
            <Input 
              value={filterProjectNo} 
              onChange={(e) => setFilterProjectNo(e.target.value)} 
              placeholder="예: PRJ-2026..." 
              className="h-7 text-xs" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">제품명</span>
            <Input 
              value={filterProductName} 
              onChange={(e) => setFilterProductName(e.target.value)} 
              placeholder="검색어 입력" 
              className="h-7 text-xs" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">금형 제작처</span>
            <select 
              value={filterMoldVendor} 
              onChange={(e) => setFilterMoldVendor(e.target.value)} 
              className="h-7 rounded-md border bg-transparent px-2 text-xs"
            >
              <option value="ALL">전체 금형제작처</option>
              <option value="우성정공(주)">우성정공(주)</option>
              <option value="대한금형(주)">대한금형(주)</option>
              <option value="MPSI 자체제작팀">MPSI 자체제작팀</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">사출 양산처</span>
            <select 
              value={filterInjectionVendor} 
              onChange={(e) => setFilterInjectionVendor(e.target.value)} 
              className="h-7 rounded-md border bg-transparent px-2 text-xs"
            >
              <option value="ALL">전체 사출양산처</option>
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
            <FileCheck className="h-4 w-4 text-sky-600" />
            <span>시사출 제품 치수 및 외관 검사 승인 현황 (금형외주 · 양산외주 · 자체생산)</span>
          </div>
        </div>

        {/* 데이터 테이블 */}
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full border-collapse text-left whitespace-nowrap">
            <thead className="sticky top-0 bg-[#2d3748] text-white text-[11px] z-10">
              <tr>
                <th className="p-1.5 w-10 text-center border-r border-slate-600">Idx</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[120px]">검사식별자</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[120px]">프로젝트번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[160px]">제품명</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px] text-center">시사출 차수</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px] text-center">금형제작처</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px] text-center">사출양산처</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px] text-center">치수 검사</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px] text-center">외관 검사</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[120px] text-center">최종 판정</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[80px]">검사자</th>
                <th className="p-1.5 min-w-[100px] text-center">검사 및 판정</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {data.map((row) => (
                <tr key={row.id} className="hover:bg-sky-50 dark:hover:bg-zinc-800/60 transition-colors odd:bg-white even:bg-zinc-50/50">
                  <td className="p-1.5 text-center font-mono text-zinc-500 border-r">{row.idx}</td>
                  <td className="p-1.5 border-r font-mono text-sky-600 font-medium">{row.inspectNo}</td>
                  <td className="p-1.5 border-r font-mono">{row.projectNo}</td>
                  <td className="p-1.5 border-r font-medium">{row.productName}</td>
                  <td className="p-1.5 border-r text-center font-semibold">{row.trialDegree}</td>
                  <td className="p-1.5 border-r text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300">
                      {row.moldVendor}
                    </span>
                  </td>
                  <td className="p-1.5 border-r text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                      {row.injectionVendor}
                    </span>
                  </td>

                  {/* 치수 검사 상태 */}
                  <td className="p-1.5 border-r text-center font-bold">
                    <span className={row.dimensionResult === "OK" ? "text-emerald-600" : row.dimensionResult === "NG" ? "text-rose-600" : "text-zinc-400"}>
                      {row.dimensionResult}
                    </span>
                  </td>

                  {/* 외관 검사 상태 */}
                  <td className="p-1.5 border-r text-center font-bold">
                    <span className={row.appearanceResult === "OK" ? "text-emerald-600" : row.appearanceResult === "NG" ? "text-rose-600" : "text-zinc-400"}>
                      {row.appearanceResult}
                    </span>
                  </td>

                  {/* 최종 판정 태그 */}
                  <td className="p-1.5 border-r text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      row.status.includes("Pass") ? "bg-emerald-100 text-emerald-700 border border-emerald-300" :
                      row.status.includes("Fail") ? "bg-rose-100 text-rose-700 border border-rose-300" :
                      "bg-amber-100 text-amber-700 border border-amber-300 animate-pulse"
                    }`}>
                      {row.status}
                    </span>
                  </td>

                  <td className="p-1.5 border-r">{row.inspector}</td>

                  {/* 판정 수행 버튼 */}
                  <td className="p-1.5 text-center">
                    <Button 
                      onClick={() => handleOpenDetail(row)} 
                      size="xs" 
                      variant="outline" 
                      className="h-6 px-2 text-[11px] gap-1 bg-white hover:bg-zinc-100 dark:bg-zinc-800"
                    >
                      <Eye className="h-3 w-3 text-zinc-500" />
                      검사/판정
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. 검사 상세 및 Pass/Fail 판정 모달 */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-lg shadow-xl border overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 text-white">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-xs">MPSI 제품 치수 및 외관 검사 판정 (Process 8~10)</h3>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-md border text-[11px]">
                <div><span className="text-zinc-500">프로젝트:</span> <b>{selectedItem.projectName}</b></div>
                <div><span className="text-zinc-500">제품명:</span> <b>{selectedItem.productName}</b></div>
                <div><span className="text-zinc-500">금형제작사:</span> <b>{selectedItem.moldVendor}</b></div>
                <div><span className="text-zinc-500">사출양산사:</span> <b>{selectedItem.injectionVendor}</b></div>
              </div>

              {/* 검사 항목 입력 */}
              <div className="border rounded-md p-3 flex flex-col gap-3">
                <h4 className="font-bold text-zinc-800 dark:text-zinc-100">1. 치수 및 외관 측정 결과 입력</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 mb-1">치수 검사 (Dimension)</label>
                    <div className="flex items-center gap-2">
                      <Button 
                        onClick={() => setDimRes("OK")} 
                        size="xs" 
                        variant={dimRes === "OK" ? "default" : "outline"}
                        className={`flex-1 h-8 ${dimRes === "OK" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                      >
                        OK (적합)
                      </Button>
                      <Button 
                        onClick={() => setDimRes("NG")} 
                        size="xs" 
                        variant={dimRes === "NG" ? "default" : "outline"}
                        className={`flex-1 h-8 ${dimRes === "NG" ? "bg-rose-600 hover:bg-rose-700" : ""}`}
                      >
                        NG (부적합)
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 mb-1">외관 검사 (Appearance)</label>
                    <div className="flex items-center gap-2">
                      <Button 
                        onClick={() => setAppRes("OK")} 
                        size="xs" 
                        variant={appRes === "OK" ? "default" : "outline"}
                        className={`flex-1 h-8 ${appRes === "OK" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                      >
                        OK (적합)
                      </Button>
                      <Button 
                        onClick={() => setAppRes("NG")} 
                        size="xs" 
                        variant={appRes === "NG" ? "default" : "outline"}
                        className={`flex-1 h-8 ${appRes === "NG" ? "bg-rose-600 hover:bg-rose-700" : ""}`}
                      >
                        NG (부적합)
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fail 시 금형수정요청 사유 입력 */}
              {(dimRes === "NG" || appRes === "NG") && (
                <div className="border border-rose-200 bg-rose-50/50 dark:bg-rose-950/30 rounded-md p-3 flex flex-col gap-1.5">
                  <label className="block text-[11px] font-bold text-rose-700 dark:text-rose-300">
                    2. 금형 수정 요청 사유 ({selectedItem.moldVendor} 전달) <span className="text-red-500">*</span>
                  </label>
                  <Input 
                    value={failReasonText} 
                    onChange={(e) => setFailReasonText(e.target.value)} 
                    placeholder="수정이 필요한 위치 및 오차 치수를 상세히 작성하세요." 
                    className="h-8 text-xs bg-white dark:bg-zinc-900 border-rose-300"
                  />
                </div>
              )}
            </div>

            {/* 모달 푸터 액션 (Pass / Fail 분기 버튼) */}
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 border-t">
              <Button onClick={() => setSelectedItem(null)} variant="outline" className="h-8 px-3 text-xs">
                취소
              </Button>
              
              <div className="flex items-center gap-2">
                {/* Fail 선택 시: 금형제작처 금형 수정 연동 (Process 10-1) */}
                <Button 
                  onClick={handleApproveFail} 
                  className="h-8 px-3.5 text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  [Fail] 금형 수정 요청 ({selectedItem.moldVendor} 연동)
                </Button>

                {/* Pass 선택 시: 사출양산처 양산 지시 연동 (Process 10) */}
                <Button 
                  onClick={handleApprovePass} 
                  className="h-8 px-3.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  [Pass] 양산 지시 ({selectedItem.injectionVendor} 연동)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
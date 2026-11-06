"use client";

import { useState } from "react";
import { 
  Search, RefreshCw, Workflow, Factory, CheckCircle2, Clock, Building2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// 공정 0~140 파이프라인 진척도 데이터 타입
interface ProcessPipelineItem {
  id: number;
  idx: number;
  projectNo: string;       // 소속 프로젝트 번호
  projectName: string;     // 프로젝트/품명
  currentSection: string;  // 주요 공정 구간 (예: 공정 50~62 사출성형)
  manager: string;         // 담당 부서/담당자
  materialStatus: string;  // 원재료 건조 및 수분측정 상태 (공정 40~50)
  productionStatus: string;// 사출성형 및 일일 생산실적 상태 (공정 60~61)
  inspectionStatus: string;// 자주검사 및 OQC 출하검사 상태 (공정 70~90)
  overallProgress: number; // 전체 진척도 (%)
  status: "정상진행" | "지연경보" | "공정완료";
  updatedAt: string;
}

// 초기 샘플 데이터 (공정 0~140 파이프라인 반영)
const initialPipelines: ProcessPipelineItem[] = [
  {
    id: 1,
    idx: 1,
    projectNo: "PRJ-202608-001",
    projectName: "FF 플라스틱 사출 커버 A형",
    currentSection: "공정 60~62 (사출성형 및 자주검사)",
    manager: "생산팀 / 품질팀",
    materialStatus: "원재료 건조 및 수분측정 완료",
    productionStatus: "사출 250톤 2호기 양산 중 (12,400 EA)",
    inspectionStatus: "자주검사 및 순회검사 합격",
    overallProgress: 65,
    status: "정상진행",
    updatedAt: "2026-08-12 14:00",
  },
  {
    id: 2,
    idx: 2,
    projectNo: "PRJ-202608-002",
    projectName: "배터리 케이스 하부 하우징",
    currentSection: "공정 90~102 (OQC 출하검사 및 적재)",
    manager: "품질관리실",
    materialStatus: "원재료 입고 및 수분측정 완료",
    productionStatus: "사출 성형 완료 (8,000 EA)",
    inspectionStatus: "OQC 출하검사 합격 날인 완료",
    overallProgress: 90,
    status: "정상진행",
    updatedAt: "2026-08-11 17:30",
  },
  {
    id: 3,
    idx: 3,
    projectNo: "PRJ-202608-003",
    projectName: "전장용 제어 브라켓",
    currentSection: "공정 10~21 (자재 입고 및 수입검사)",
    manager: "자재관리팀",
    materialStatus: "원재료 입고 대기중",
    productionStatus: "사출 대기",
    inspectionStatus: "수입검사 대기중",
    overallProgress: 15,
    status: "지연경보",
    updatedAt: "2026-08-10 10:15",
  },
];

export default function ProcessStatusPage() {
  // 1. 검색 조건 State
  const [filterProjectNo, setFilterProjectNo] = useState("");
  const [filterProjectName, setFilterProjectName] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // 2. 테이블 데이터 State
  const [data, setData] = useState<ProcessPipelineItem[]>(initialPipelines);

  // 검색
  const handleSearch = () => {
    const filtered = initialPipelines.filter((item) => {
      const matchNo = filterProjectNo ? item.projectNo.toLowerCase().includes(filterProjectNo.toLowerCase()) : true;
      const matchName = filterProjectName ? item.projectName.includes(filterProjectName) : true;
      const matchStatus = filterStatus !== "ALL" ? item.status === filterStatus : true;
      return matchNo && matchName && matchStatus;
    });
    setData(filtered);
  };

  const handleReset = () => {
    setFilterProjectNo("");
    setFilterProjectName("");
    setFilterStatus("ALL");
    setData(initialPipelines);
  };

  return (
    <div className="flex flex-col gap-3 text-xs relative">
      {/* 1. 상단 검색 필터 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex flex-col gap-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">프로젝트 번호</span>
            <Input 
              value={filterProjectNo} 
              onChange={(e) => setFilterProjectNo(e.target.value)} 
              placeholder="PRJ-2026..." 
              className="h-7 text-xs" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">프로젝트/품명</span>
            <Input 
              value={filterProjectName} 
              onChange={(e) => setFilterProjectName(e.target.value)} 
              placeholder="검색어 입력" 
              className="h-7 text-xs" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">공정 진행 상태</span>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)} 
              className="h-7 rounded-md border bg-transparent px-2 text-xs"
            >
              <option value="ALL">전체 상태</option>
              <option value="정상진행">정상진행</option>
              <option value="지연경보">지연경보</option>
              <option value="공정완료">공정완료</option>
            </select>
          </div>
          <div className="flex items-end gap-1.5">
            <Button onClick={handleSearch} className="h-7 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs flex-1">
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
            <Workflow className="h-4 w-4 text-purple-600" />
            <span>공정 0~140 전체 파이프라인 진척도 모니터링</span>
          </div>
        </div>

        {/* 데이터 테이블 */}
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full border-collapse text-left whitespace-nowrap">
            <thead className="sticky top-0 bg-[#2d3748] text-white text-[11px] z-10">
              <tr>
                <th className="p-1.5 w-10 text-center border-r border-slate-600">Idx</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[120px]">프로젝트 번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[170px]">프로젝트/품명</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[180px]">현재 공정 구간 (0~140)</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[170px]">원재료 건조 및 수분측정 (40~50)</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[190px]">사출성형 및 생산일보 (60~61)</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[180px]">자주/OQC 출하검사 (70~90)</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[140px] text-center">전체 진척도</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[100px] text-center">상태</th>
                <th className="p-1.5 min-w-[120px]">최종 갱신일시</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {data.map((row) => (
                <tr key={row.id} className="hover:bg-purple-50/50 dark:hover:bg-zinc-800/60 transition-colors odd:bg-white even:bg-zinc-50/50">
                  <td className="p-1.5 text-center font-mono text-zinc-500 border-r">{row.idx}</td>
                  <td className="p-1.5 border-r font-mono text-purple-600 font-bold">{row.projectNo}</td>
                  <td className="p-1.5 border-r font-medium">{row.projectName}</td>
                  <td className="p-1.5 border-r font-semibold text-zinc-800 dark:text-zinc-200">{row.currentSection}</td>
                  <td className="p-1.5 border-r text-zinc-600 dark:text-zinc-400">{row.materialStatus}</td>
                  <td className="p-1.5 border-r text-zinc-600 dark:text-zinc-400">{row.productionStatus}</td>
                  <td className="p-1.5 border-r text-zinc-600 dark:text-zinc-400">{row.inspectionStatus}</td>

                  {/* 진척도 게이지 바 */}
                  <td className="p-1.5 border-r">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="font-bold text-purple-600">{row.overallProgress}%</span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${row.overallProgress}%` }} />
                      </div>
                    </div>
                  </td>

                  {/* 상태 태그 */}
                  <td className="p-1.5 border-r text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      row.status === "정상진행" ? "bg-emerald-100 text-emerald-700 border border-emerald-300" :
                      row.status === "지연경보" ? "bg-rose-100 text-rose-700 border border-rose-300 animate-pulse" :
                      "bg-purple-100 text-purple-700 border border-purple-300"
                    }`}>
                      {row.status}
                    </span>
                  </td>

                  <td className="p-1.5 font-mono text-zinc-500">{row.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
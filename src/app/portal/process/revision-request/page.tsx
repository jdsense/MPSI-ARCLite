"use client";

import { useState } from "react";
import { 
  Search, RefreshCw, Wrench, FileText, CheckCircle2, XCircle, Eye, X 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// MPSI 금형 수정 및 재시출 관리 데이터 타입 (SCM Process 8-1, 10-1단계 연동)
interface RevisionItem {
  id: number;
  idx: number;
  revisionNo: string;      // 제품수정요청서 관리번호
  projectNo: string;       // 프로젝트 번호
  projectName: string;     // 프로젝트/품명
  moldNo: string;          // 금형 관리번호
  moldVendor: string;      // 금형제작처 (우성정공, 대한금형, MPSI 자체 등)
  massVendor: string;      // 사출양산처 (뉴몰드, 한국정밀사출, 자체 등)
  requestCompany: string;  // 수정요청 발송 주체 (MPSI, 뉴몰드 등)
  reason: string;          // 제품수정요청 상세 사유
  trialDegree: string;     // 재시출 차수 (T2, T3)
  status: "금형수정가공중" | "재시출완료(검수대기)" | "수정승인완료";
  managerName: string;     // 금형 제작처 가공 담당자
  updatedAt: string;
}

const initialRevisions: RevisionItem[] = [
  {
    id: 1,
    idx: 1,
    revisionNo: "REV-202608-001",
    projectNo: "PRJ-202608-001",
    projectName: "FF 플라스틱 사출 커버 A형",
    moldNo: "MOLD-202608-001",
    moldVendor: "우성정공(주)",
    massVendor: "(주)뉴몰드",
    requestCompany: "MPSI 품질관리팀",
    reason: "T1 시사품 검수 결과 우측 볼트 체결부 수축 오차 (+0.05mm)",
    trialDegree: "2차 시사출 (T2)",
    status: "금형수정가공중",
    managerName: "배희섭 수석",
    updatedAt: "2026-08-12 11:30",
  },
  {
    id: 2,
    idx: 2,
    revisionNo: "REV-202608-002",
    projectNo: "PRJ-202608-003",
    projectName: "전장용 제어 브라켓",
    moldNo: "MOLD-202608-003",
    moldVendor: "대한금형(주)",
    massVendor: "(주)한국정밀사출",
    requestCompany: "(주)한국정밀사출",
    reason: "양산 사출 테스트 중 측면 두께 불균일로 인한 변형(Warping) 발생",
    trialDegree: "3차 시사출 (T3)",
    status: "재시출완료(검수대기)",
    managerName: "이정우 팀장",
    updatedAt: "2026-08-10 16:00",
  },
  {
    id: 3,
    idx: 3,
    revisionNo: "REV-202608-003",
    projectNo: "A2XT-M01",
    projectName: "Center Console Main Bracket",
    moldNo: "MOLD-A2XT-01",
    moldVendor: "MPSI 자체제작팀",
    massVendor: "MPSI 자체생산라인",
    requestCompany: "MPSI 생산기술팀",
    reason: "결합 리브 단차 0.08mm 보정 가공 및 텍스처 에칭 추가",
    trialDegree: "2차 시사출 (T2)",
    status: "수정승인완료",
    managerName: "박동원 파트장",
    updatedAt: "2026-08-15 14:20",
  },
];

export default function RevisionRequestPage() {
  // 1. 검색 필터 State
  const [filterRevisionNo, setFilterRevisionNo] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterMoldVendor, setFilterMoldVendor] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // 2. 테이블 데이터 및 모달 State
  const [data, setData] = useState<RevisionItem[]>(initialRevisions);
  const [selectedItem, setSelectedItem] = useState<RevisionItem | null>(null);

  // 검색
  const handleSearch = () => {
    const filtered = initialRevisions.filter((item) => {
      const matchNo = filterRevisionNo ? item.revisionNo.toLowerCase().includes(filterRevisionNo.toLowerCase()) : true;
      const matchProject = filterProject ? item.projectName.includes(filterProject) || item.projectNo.toLowerCase().includes(filterProject.toLowerCase()) : true;
      const matchMold = filterMoldVendor !== "ALL" ? item.moldVendor === filterMoldVendor : true;
      const matchStatus = filterStatus !== "ALL" ? item.status === filterStatus : true;
      return matchNo && matchProject && matchMold && matchStatus;
    });
    setData(filtered);
  };

  const handleReset = () => {
    setFilterRevisionNo("");
    setFilterProject("");
    setFilterMoldVendor("ALL");
    setFilterStatus("ALL");
    setData(initialRevisions);
  };

  // 📌 MPSI에서 재시출 샘플 최종 검수 승인 (Pass 처리 -> 사출양산처 이관)
  const handleApproveReTrialPass = () => {
    if (!selectedItem) return;

    if (confirm(`[재시출 검수 합격 (Pass)]\n'${selectedItem.projectName}' 건의 금형 수축 보정이 확인되었습니다.\n[${selectedItem.massVendor}]로 양산 지시를 최종 이관하시겠습니까?`)) {
      setData(prev => prev.map(item => 
        item.id === selectedItem.id 
          ? { ...item, status: "수정승인완료", updatedAt: new Date().toLocaleString() } 
          : item
      ));
      alert(`[${selectedItem.massVendor}] 포털/시스템으로 [양산 시작 지시]가 성공적으로 이관되었습니다.`);
      setSelectedItem(null);
    }
  };

  // 📌 MPSI에서 재시출 샘플 불합격 처리 (Fail -> 금형제작처 재수정 요청)
  const handleApproveReTrialFail = () => {
    if (!selectedItem) return;

    const reReason = prompt(`[${selectedItem.moldVendor}]으로 전달할 추가 수정 사유를 입력하세요:`, "재시출 샘플 치수 오차 재발생");
    if (reReason) {
      setData(prev => prev.map(item => 
        item.id === selectedItem.id 
          ? { ...item, status: "금형수정가공중", reason: reReason, updatedAt: new Date().toLocaleString() } 
          : item
      ));
      alert(`[${selectedItem.moldVendor}] 포털/시스템으로 [재수정 요청서]가 다시 전달되었습니다.`);
      setSelectedItem(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs relative">
      {/* 1. 상단 검색 필터 (MPSI 블루톤 적용) */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex flex-col gap-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">수정요청 관리번호</span>
            <Input 
              value={filterRevisionNo} 
              onChange={(e) => setFilterRevisionNo(e.target.value)} 
              placeholder="REV-2026..." 
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
            <Wrench className="h-4 w-4 text-sky-600" />
            <span>수정요청서 및 금형 재가공(Retry) 트래킹 (금형외주 · 양산외주 · 자체생산)</span>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full border-collapse text-left whitespace-nowrap">
            <thead className="sticky top-0 bg-[#2d3748] text-white text-[11px] z-10">
              <tr>
                <th className="p-1.5 w-10 text-center border-r border-slate-600">Idx</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[130px]">수정요청 번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[120px]">금형 관리번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[160px]">프로젝트/품명</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[100px] text-center">금형제작처</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px] text-center">요청 주체</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[240px]">제품수정요청 사유</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[100px] text-center">재시출 차수</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[130px] text-center">수정 진행 상태</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px] text-center">재검수 수행</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[80px]">가공 담당</th>
                <th className="p-1.5 min-w-[130px]">최종 갱신일시</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {data.map((row) => (
                <tr key={row.id} className="hover:bg-sky-50 dark:hover:bg-zinc-800/60 transition-colors odd:bg-white even:bg-zinc-50/50">
                  <td className="p-1.5 text-center font-mono text-zinc-500 border-r">{row.idx}</td>
                  <td className="p-1.5 border-r font-mono text-sky-600 font-bold">{row.revisionNo}</td>
                  <td className="p-1.5 border-r font-mono font-medium">{row.moldNo}</td>
                  <td className="p-1.5 border-r font-medium">{row.projectName}</td>
                  <td className="p-1.5 border-r text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300">
                      {row.moldVendor}
                    </span>
                  </td>
                  <td className="p-1.5 border-r text-center font-bold">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                      {row.requestCompany}
                    </span>
                  </td>
                  <td className="p-1.5 border-r text-zinc-700 dark:text-zinc-300">{row.reason}</td>
                  <td className="p-1.5 border-r text-center font-bold text-sky-600">{row.trialDegree}</td>
                  
                  {/* 수정 진행 상태 태그 */}
                  <td className="p-1.5 border-r text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      row.status === "수정승인완료" ? "bg-emerald-100 text-emerald-700 border border-emerald-300" :
                      row.status === "재시출완료(검수대기)" ? "bg-amber-100 text-amber-700 border border-amber-300 animate-pulse" :
                      "bg-rose-100 text-rose-700 border border-rose-300"
                    }`}>
                      {row.status}
                    </span>
                  </td>

                  {/* 📌 [수정] MPSI 담당자의 재검수/승인 버튼 */}
                  <td className="p-1.5 border-r text-center">
                    <Button 
                      onClick={() => setSelectedItem(row)} 
                      size="xs" 
                      variant="outline"
                      className="h-5 px-2 text-[10px] gap-1 bg-white hover:bg-zinc-100 dark:bg-zinc-800"
                    >
                      <Eye className="h-3 w-3 text-zinc-500" />
                      재검수/승인
                    </Button>
                  </td>

                  <td className="p-1.5 border-r">{row.managerName}</td>
                  <td className="p-1.5 font-mono text-zinc-500">{row.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📌 3. 재시출 샘플 재검수 및 승인 팝업 모달 */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-lg shadow-xl border overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 text-white">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-xs">제품수정요청서 및 재시출 샘플 검수</h3>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-2 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-md border text-[11px]">
                <div><span className="text-zinc-500">수정요청 번호:</span> <b className="font-mono text-sky-600">{selectedItem.revisionNo}</b></div>
                <div><span className="text-zinc-500">금형 번호:</span> <b>{selectedItem.moldNo}</b></div>
                <div><span className="text-zinc-500">금형 제작처:</span> <b className="text-blue-600">{selectedItem.moldVendor}</b></div>
                <div><span className="text-zinc-500">사출 양산처:</span> <b className="text-emerald-600">{selectedItem.massVendor}</b></div>
                <div><span className="text-zinc-500">프로젝트:</span> <b>{selectedItem.projectName}</b></div>
                <div><span className="text-zinc-500">재시출 차수:</span> <b className="text-sky-600">{selectedItem.trialDegree}</b></div>
              </div>

              <div className="border border-rose-200 bg-rose-50/40 dark:bg-rose-950/30 p-3 rounded-md flex flex-col gap-1 text-[11px]">
                <span className="font-bold text-rose-700 dark:text-rose-300">수정요청 사유 ({selectedItem.requestCompany})</span>
                <p className="text-zinc-700 dark:text-zinc-300">{selectedItem.reason}</p>
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-t">
              <Button onClick={() => setSelectedItem(null)} variant="outline" className="h-8 px-3 text-xs">
                취소
              </Button>
              <div className="flex items-center gap-2">
                <Button onClick={handleApproveReTrialFail} className="h-8 px-3 text-xs bg-rose-600 hover:bg-rose-700 text-white gap-1">
                  <XCircle className="h-3.5 w-3.5" /> 불합격 (재수정)
                </Button>
                <Button onClick={handleApproveReTrialPass} className="h-8 px-4 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> 최종 승인 (양산이관)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
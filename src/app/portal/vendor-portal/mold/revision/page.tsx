"use client";

import React, { useState, useRef } from "react";
import { 
  Wrench, Hammer, RotateCcw, AlertTriangle, CheckCircle2, 
  Clock, Search, RefreshCw, Eye, Plus, Upload, Download, 
  FileText, Check, X, Camera, Paperclip, MessageSquare, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthRole } from "@/lib/role-store";

// 금형 수정 요청 및 이력 인터페이스
export interface MoldRevisionItem {
  id: number;
  revisionNo: string;       // 수정관리번호 (예: REV-2026-001)
  projectNo: string;        // PJT 관리번호 (예: MI26001P0)
  moldNo?: string;          // 금형관리번호 (예: MI26001M)
  moldDegree?: string;      // 금형차수 (예: M1, M2)
  changeType?: string;      // 신작/설변 (예: E001, N001)
  projectName?: string;     // 차종/프로젝트명
  productName: string;      // 제품명
  trialDegree: string;      // 시사출 차수 (T1 후, T2 후)
  issueCategory: "치수불량" | "외관불량(버/단차)" | "성형불량(수축/웰드)" | "설계변경(DR)";
  issueDescription: string; // 문제 현상 (예: 우측 리브 살두께 미달, 게이트 주변 가스버닝)
  requiredAction: string;   // 수정 요구사항 (예: 방전 전극 가공 후 리브 +0.3mm 살빼기, 에어벤트 0.02mm 추가)
  targetDate: string;       // 수정 완료 목표일
  actualCompletedDate?: string; // 실제 수정 완료일
  status: "수정요청접수" | "금형수정중" | "치수검증" | "수정완료(재시험대기)";
  attachedPhotoUrl?: string; // 현물 불량 사진
  reportFileName?: string;   // 금형 수정 결과 보고서 파일명
  processorName: string;    // 수정 담당 작업자
  notes?: string;
}

const sampleRevisions: MoldRevisionItem[] = [
  {
    id: 1,
    revisionNo: "REV-2026-001",
    projectNo: "MI26001P0",
    moldNo: "MI26001M",
    moldDegree: "M1",
    changeType: "E001",
    productName: "Front Door Upper Cover LH/RH",
    trialDegree: "T1 시사출 후 1차 수정",
    issueCategory: "외관불량(버/단차)",
    issueDescription: "LH 하단 파팅라인 부위 0.05mm 플래시(버) 발생 및 슬라이드 코어 유격 과다",
    requiredAction: "파팅면 정밀 래핑 재가공 및 슬라이드 가이드 플레이트 심(Shim) 0.03mm 조정",
    targetDate: "2026-03-28",
    actualCompletedDate: "2026-03-27",
    status: "수정완료(재시험대기)",
    reportFileName: "NT5_T1수정완료보고서_우성.pdf",
    processorName: "김가공 반장 (방전/사상팀)",
    notes: "파팅면 청정화 후 광학 3차원 측정 완료. T2 시사출 대기",
  },
  {
    id: 2,
    revisionNo: "REV-2026-002",
    projectNo: "MI26002P0",
    moldNo: "MI26002M",
    moldDegree: "M1",
    changeType: "E001",
    projectName: "기아 A2XT 센터콘솔",
    productName: "Console Upper Bezel Assembly",
    trialDegree: "T1 시사출 후 1차 수정",
    issueCategory: "치수불량",
    issueDescription: "CTQ 중요치수 #4 결합 보스 내경 -0.15mm 미달로 조립 스크류 체결 불량",
    requiredAction: "코어핀 직경 0.15mm 선삭/연마 신품 교체 및 냉각 채널 에어퍼지 작업",
    targetDate: "2026-04-05",
    status: "금형수정중",
    processorName: "박정밀 기사 (NC/연마)",
    notes: "SKD61 열처리 코어핀 신규 가공 진행 중 (진척률 70%)",
  },
  {
    id: 3,
    revisionNo: "REV-2026-003",
    projectNo: "MI25001P0",
    moldNo: "MI25001M",
    moldDegree: "M2",
    changeType: "E002",
    productName: "Glove Box Housing Sub",
    trialDegree: "T2 시사출 후 2차 수정",
    issueCategory: "성형불량(수축/웰드)",
    issueDescription: "중앙 힌지 체결부 반대편 미세 수축(Sink Mark) 관찰됨",
    requiredAction: "코어 리브 살두께 0.2mm 감육 방전가공 및 에어벤트 2개소 추가 설치",
    targetDate: "2026-04-12",
    status: "수정요청접수",
    processorName: "배희섭 이사 (금형기술총괄)",
    notes: "MPSI 및 고객사 품질팀 협의 후 수정 착수 예정",
  }
];

export default function VendorMoldRevisionPage() {
  const { vendorName } = useAuthRole();
  const currentVendor = vendorName || "우성정공(주)";

  const [data, setData] = useState<MoldRevisionItem[]>(sampleRevisions);
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const [selectedItem, setSelectedItem] = useState<MoldRevisionItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  // 수정 실적 입력 폼
  const [updateForm, setUpdateForm] = useState({
    status: "금형수정중" as MoldRevisionItem["status"],
    reportFileName: "",
    processorName: "",
    notes: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenUpdate = (item: MoldRevisionItem) => {
    setSelectedItem(item);
    setUpdateForm({
      status: item.status,
      reportFileName: item.reportFileName || "",
      processorName: item.processorName || "",
      notes: item.notes || "",
    });
    setIsUpdateModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUpdateForm((prev) => ({
        ...prev,
        reportFileName: file.name,
      }));
    }
  };

  const handleSaveUpdate = () => {
    if (!selectedItem) return;
    const today = new Date().toISOString().split("T")[0];
    const updated: MoldRevisionItem = {
      ...selectedItem,
      status: updateForm.status,
      reportFileName: updateForm.reportFileName,
      processorName: updateForm.processorName,
      notes: updateForm.notes,
      actualCompletedDate: updateForm.status === "수정완료(재시험대기)" ? today : selectedItem.actualCompletedDate,
    };
    setData((prev) => prev.map((item) => (item.id === selectedItem.id ? updated : item)));
    setIsUpdateModalOpen(false);
    alert(`[${selectedItem.revisionNo}] 금형 수정 실적 및 상태가 갱신되었습니다.`);
  };

  const filtered = data.filter((item) => {
    const matchKey = filterKeyword
      ? item.projectNo.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        (item.moldNo && item.moldNo.toLowerCase().includes(filterKeyword.toLowerCase())) ||
        item.productName.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        item.revisionNo.toLowerCase().includes(filterKeyword.toLowerCase())
      : true;
    const matchStatus = filterStatus !== "ALL" ? item.status === filterStatus : true;
    return matchKey && matchStatus;
  });

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 상단 안내 배너 */}
      <div className="bg-amber-50 dark:bg-zinc-800/60 border border-amber-200 dark:border-zinc-700 rounded-md p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-amber-600" />
          <div>
            <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>{currentVendor} - 금형 수정 관리 (시사출 육성 보정 & MCR 이력)</span>
            </div>
            <div className="text-[11px] text-zinc-500">
              시사출(T1~T3) 결과에 따른 치수 미달, 외관 결함, 단차 등의 금형 수정 지시를 확인하고 수정 가공 및 완료 보고서를 등록합니다.
            </div>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Input 
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.target.value)}
            placeholder="수정번호, PJT번호, 제품명 검색"
            className="h-7 text-xs max-w-xs"
          />
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-7 rounded-md border bg-transparent px-2 text-xs font-medium"
          >
            <option value="ALL">전체 상태</option>
            <option value="수정요청접수">수정요청접수</option>
            <option value="금형수정중">금형수정중</option>
            <option value="치수검증">치수검증</option>
            <option value="수정완료(재시험대기)">수정완료(재시험대기)</option>
          </select>
        </div>
        <div className="text-zinc-500 text-[11px]">
          총 <b className="text-amber-600 font-mono">{filtered.length}</b>건
        </div>
      </div>

      {/* 목록 테이블 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
          <table className="w-full border-collapse text-left border-spacing-0 whitespace-nowrap">
            <thead className="sticky top-0 bg-[#2d3748] text-white text-[11px] z-10">
              <tr>
                <th className="p-1.5 w-10 text-center border-r border-slate-600">No</th>
                <th className="p-1.5 border-r border-slate-600 text-center min-w-[70px] text-amber-300">신작/설변</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px]">수정관리번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[100px]">PJT 관리번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px]">금형번호</th>
                <th className="p-1.5 border-r border-slate-600 text-center min-w-[65px] text-purple-300">금형차수</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[150px]">제품명</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px]">시사출 차수</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[100px]">불량 유형</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[180px]">문제 현상 및 수정 요구사항</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px] text-center">완료 목표일</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[120px]">수정 결과 보고서</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[95px] text-center">수정 진행상태</th>
                <th className="p-1.5 min-w-[90px] text-center">수정실적 등록</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px]">
              {filtered.map((row, idx) => {
                const moldNo = row.moldNo || (row.projectNo ? `${row.projectNo.split("-")[0].replace(/P0$/, "")}M` : "-");
                const moldDegree = row.moldDegree || "M1";
                const changeType = row.changeType || "E001";

                return (
                  <tr key={row.id} className="hover:bg-amber-50/50 dark:hover:bg-zinc-800/60 transition-colors odd:bg-white even:bg-zinc-50/40">
                    <td className="p-1.5 text-center font-mono text-zinc-400 border-r">{idx + 1}</td>
                    <td className="p-1.5 border-r text-center">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        changeType.startsWith("E")
                          ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700"
                          : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700"
                      }`}>
                        {changeType}
                      </span>
                    </td>
                    <td className="p-1.5 border-r font-mono font-bold text-sky-700">{row.revisionNo}</td>
                    <td className="p-1.5 border-r font-mono">{row.projectNo}</td>
                    <td className="p-1.5 border-r font-mono font-bold text-zinc-800 dark:text-zinc-200">{moldNo}</td>
                    <td className="p-1.5 border-r text-center">
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-700 font-mono">
                        {moldDegree}
                      </span>
                    </td>
                    <td className="p-1.5 border-r font-bold truncate max-w-[150px]" title={row.productName}>{row.productName}</td>
                    <td className="p-1.5 border-r font-medium text-purple-700">{row.trialDegree}</td>
                    <td className="p-1.5 border-r">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        {row.issueCategory}
                      </span>
                    </td>
                    <td className="p-1.5 border-r truncate max-w-[180px]" title={`${row.issueDescription} -> ${row.requiredAction}`}>
                      <span className="text-zinc-900 dark:text-zinc-100 font-medium">{row.issueDescription}</span>
                    </td>
                    <td className="p-1.5 border-r text-center font-mono text-amber-600 font-bold">{row.targetDate}</td>
                    <td className="p-1.5 border-r font-mono text-[10px]">
                      {row.reportFileName ? (
                        <div className="flex items-center gap-1 text-sky-600 hover:underline cursor-pointer" onClick={() => alert(`[${row.reportFileName}] 수정 결과 보고서를 다운로드합니다.`)}>
                          <Paperclip className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[110px]" title={row.reportFileName}>{row.reportFileName}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-400">보고서 미등록</span>
                      )}
                    </td>
                    <td className="p-1.5 border-r text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        row.status === "수정완료(재시험대기)"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : row.status === "금형수정중"
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : row.status === "치수검증"
                          ? "bg-purple-100 text-purple-800 border-purple-300"
                          : "bg-zinc-100 text-zinc-700 border-zinc-300"
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="p-1.5 text-center">
                      <Button 
                        onClick={() => handleOpenUpdate(row)}
                        size="xs" 
                        className="h-6 px-2 text-[10px] bg-amber-600 hover:bg-amber-700 text-white gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        실적/보고
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 수정 실적 및 보고서 업로드 모달 */}
      {isUpdateModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
          <div className="bg-white dark:bg-zinc-900 border rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-b">
              <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-amber-600" />
                <span>금형 수정 실적 및 보고서 등록 [{selectedItem.revisionNo}]</span>
              </div>
              <button onClick={() => setIsUpdateModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-3 text-xs">
              <div className="bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-md border flex flex-col gap-1.5">
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                      (selectedItem.changeType || "E001").startsWith("E")
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : "bg-emerald-100 text-emerald-800 border-emerald-300"
                    }`}>
                      {selectedItem.changeType || "E001"}
                    </span>
                    <span>{selectedItem.productName}</span>
                  </div>
                  <span className="text-purple-600">{selectedItem.trialDegree}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                  <span>PJT: <b className="text-zinc-800 dark:text-zinc-200">{selectedItem.projectNo}</b></span>
                  <span>|</span>
                  <span>금형번호: <b className="text-zinc-800 dark:text-zinc-200">{selectedItem.moldNo || (selectedItem.projectNo ? `${selectedItem.projectNo.split("-")[0].replace(/P0$/, "")}M` : "-")}</b></span>
                  <span>|</span>
                  <span>금형차수: <span className="px-1.5 py-0.5 rounded font-bold bg-purple-100 text-purple-700 border border-purple-200">{selectedItem.moldDegree || "M1"}</span></span>
                </div>
                <div className="text-zinc-600 dark:text-zinc-300 text-[11px]">
                  <b>요구사항:</b> {selectedItem.requiredAction}
                </div>
              </div>

              <div>
                <label className="text-zinc-700 font-medium block mb-1">수정 진행 상태</label>
                <select 
                  value={updateForm.status}
                  onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value as any })}
                  className="h-8 w-full rounded-md border bg-transparent px-2 text-xs font-bold"
                >
                  <option value="수정요청접수">수정요청접수</option>
                  <option value="금형수정중">금형수정중 (가공/방전/사상)</option>
                  <option value="치수검증">치수검증 (3차원 측정)</option>
                  <option value="수정완료(재시험대기)">수정완료 (차기 시사출 대기)</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-700 font-medium block mb-1">수정 담당자 / 작업 부서</label>
                <Input 
                  value={updateForm.processorName}
                  onChange={(e) => setUpdateForm({ ...updateForm, processorName: e.target.value })}
                  placeholder="예: 김가공 반장 (방전가공팀)"
                  className="h-8 text-xs"
                />
              </div>

              {/* 결과 보고서 파일 첨부 */}
              <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-md p-3 flex flex-col items-center justify-center text-center gap-1.5 bg-zinc-50/50">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept=".pdf,.xlsx,.png,.jpg"
                />
                <FileText className="h-6 w-6 text-amber-600" />
                {updateForm.reportFileName ? (
                  <div className="flex items-center gap-2 font-mono font-bold text-sky-600 bg-white px-3 py-1 rounded-md border text-xs">
                    <span>{updateForm.reportFileName}</span>
                    <button onClick={() => setUpdateForm(prev => ({ ...prev, reportFileName: "" }))} className="text-rose-500 ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="font-bold text-zinc-700">수정 전/후 사진 및 결과 보고서 첨부 (PDF, 이미지)</div>
                    <Button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()} 
                      variant="outline" 
                      size="xs" 
                      className="h-6 text-xs gap-1 border-amber-500 text-amber-700"
                    >
                      <Upload className="h-3 w-3" />
                      파일 선택
                    </Button>
                  </>
                )}
              </div>

              <div>
                <label className="text-zinc-700 font-medium block mb-1">수정 작업 상세 내용 및 측정 소견</label>
                <textarea 
                  value={updateForm.notes}
                  onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                  placeholder="예: 파팅면 0.03mm 방전 재가공 후 사상 완료, 3차원 측정 결과 단차 0.01mm 이내 안정권 확인"
                  className="w-full h-16 p-2 rounded-md border text-xs bg-transparent"
                />
              </div>
            </div>

            <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-t flex justify-end gap-2">
              <Button onClick={() => setIsUpdateModalOpen(false)} variant="outline" className="h-7 text-xs">
                취소
              </Button>
              <Button onClick={handleSaveUpdate} className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1">
                <Check className="h-3.5 w-3.5" />
                수정 실적 저장
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

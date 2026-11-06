"use client";

import React, { useState, useRef } from "react";
import { 
  Hammer, Wrench, CheckCircle2, Clock, 
  AlertTriangle, Search, RefreshCw, Save, 
  Sparkles, X, ChevronRight, Layers, FileText,
  Building2, ExternalLink, Download, UploadCloud,
  Check, Activity, ListTree, Settings, Info,
  MessageSquare, Send, Calendar, Sliders
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangeFilter, isWithinDateRange, DatePresetType } from "@/components/common/date-range-filter";
import { 
  useProjectMaster, 
  PROCESS_13_STEPS, 
  getStepActor, 
  getStepBullets, 
  ProjectItem 
} from "@/lib/project-store";
import { useAuthRole } from "@/lib/role-store";
import { 
  useMoldManufactureStore, 
  MoldManufactureItem, 
  MoldManufactureStatus,
  ManufactureScheduleFile,
  ProcessStep,
  getManufactureStatusBadge
} from "@/lib/mold-manufacture-store";

export default function VendorMoldManufacturePage() {
  const { 
    manufactures, 
    updateManufacture, 
    uploadScheduleFile, 
    addMemoLog, 
    updateManufactureStatus, 
    refreshFromDb, 
    isLoading 
  } = useMoldManufactureStore();
  const { projects, updateStep } = useProjectMaster();
  const { vendorName } = useAuthRole();
  const currentVendor = vendorName || "우성정공(주)";

  // 검색 및 필터 상태
  const [filterProjectNo, setFilterProjectNo] = useState("");
  const [filterProductName, setFilterProductName] = useState("");
  const [filterManufactureStatus, setFilterManufactureStatus] = useState<string>("ALL");
  const [filterDateType, setFilterDateType] = useState<"orderDate" | "targetT1Date" | "updatedAt">("orderDate");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePresetType>("all");

  // 토스트 메시지
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 외주 실적 입력 모달 상태 (통합 모달 2-1)
  const [selectedItem, setSelectedItem] = useState<MoldManufactureItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [formStatus, setFormStatus] = useState<MoldManufactureStatus>("미입력");
  const [showProcessEdit, setShowProcessEdit] = useState(false);
  const [formProcesses, setFormProcesses] = useState<ProcessStep[]>([]);

  // 2-7 업무 이력 메모 입력 상태
  const [memoAuthorName, setMemoAuthorName] = useState(`${currentVendor} 한승호부장`);
  const [memoAuthorId, setMemoAuthorId] = useState("ws-hsh");
  const [memoTag, setMemoTag] = useState("261010.제작일정표");
  const [memoContent, setMemoContent] = useState("");
  const [selectedUploadFileName, setSelectedUploadFileName] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const memoFileInputRef = useRef<HTMLInputElement | null>(null);

  // 외주사 전용 프로젝트 필터링 (Q 가견적 제외, 해당 외주사 배정 프로젝트만 노출)
  const vendorManufactures = manufactures.filter((item) => {
    if (item.projectNo.startsWith("Q")) return false;
    const isMatched = item.moldVendor.includes(currentVendor) || 
                      currentVendor.includes(item.moldVendor) ||
                      item.moldVendor.includes("우성정공");
    return isMatched;
  });

  // 검색 필터 적용
  const filteredData = vendorManufactures.filter((item) => {
    const matchProject = filterProjectNo
      ? item.projectNo.toLowerCase().includes(filterProjectNo.toLowerCase())
      : true;
    const matchProd = filterProductName
      ? item.productName.toLowerCase().includes(filterProductName.toLowerCase()) ||
        item.projectName.toLowerCase().includes(filterProductName.toLowerCase())
      : true;
    const matchStatus = filterManufactureStatus !== "ALL"
      ? item.manufactureStatus === filterManufactureStatus
      : true;
    const targetDate = item[filterDateType];
    const matchDate = isWithinDateRange(targetDate, filterDateFrom, filterDateTo);
    return matchProject && matchProd && matchStatus && matchDate;
  });

  const handleReset = () => {
    setFilterProjectNo("");
    setFilterProductName("");
    setFilterManufactureStatus("ALL");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSelectedDatePreset("all");
  };

  // 외주 실적/현황 관리 모달 열기
  const handleOpenDetail = (item: MoldManufactureItem) => {
    setSelectedItem(item);
    setFormStatus(item.manufactureStatus || "미입력");
    setFormProcesses(item.processes.map(p => ({ ...p })));
    setShowProcessEdit(false);
    setMemoContent("");
    setSelectedUploadFileName("");
    setIsDetailModalOpen(true);
  };

  // 파일 다운로드 핸들러
  const handleDownloadSchedule = async (file?: ManufactureScheduleFile, projectNo?: string) => {
    const targetFile = file?.fileUrl || file?.fileName;
    if (!targetFile) {
      showToast("다운로드할 일정표 파일이 등록되지 않았습니다.");
      return;
    }
    const fileName = file?.fileName || `${projectNo || "MOLD"}_제작일정표.xlsx`;

    try {
      const downloadUrl = `/api/v1/files/download?file=${encodeURIComponent(targetFile)}&name=${encodeURIComponent(fileName)}`;
      const res = await fetch(downloadUrl);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      } else {
        const errJson = await res.json().catch(() => ({}));
        showToast(errJson.error || "서버에 해당 일정표 파일이 존재하지 않습니다.");
      }
    } catch (e) {
      console.error("Direct download failed", e);
      if (file?.fileUrl) {
        window.open(file.fileUrl, "_blank");
      } else {
        showToast("파일 다운로드 중 오류가 발생했습니다.");
      }
    }
  };

  // 2-4) 일정표 엑셀 업로드 핸들러
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedItem) return;

    let uploadedUrl = "";
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/v1/files/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && (data.fileUrl || data.url)) {
        uploadedUrl = data.fileUrl || data.url;
      }
    } catch (err) {
      console.warn("File upload to server failed", err);
    }

    const newFile: ManufactureScheduleFile = {
      fileName: file.name,
      fileSize: `${(file.size / 1024).toFixed(1)}KB`,
      uploadedAt: new Date().toLocaleString("ko-KR", { hour12: false }).replace(/\./g, "-").slice(0, 16),
      uploadedBy: memoAuthorName || `${currentVendor} 담당자`,
      fileUrl: uploadedUrl || `/uploads/${encodeURIComponent(file.name)}`,
    };

    uploadScheduleFile(
      selectedItem.id,
      newFile,
      `[일정표 엑셀 업로드] ${file.name} 신규 등록 완료`,
      memoAuthorName,
      memoAuthorId
    );

    // 자동 상태 전이 (미입력 -> 금형 설계 중)
    const nextStatus = selectedItem.manufactureStatus === "미입력" ? "금형 설계 중" : selectedItem.manufactureStatus;
    setFormStatus(nextStatus);

    // 로컬 선택 아이템 업데이트
    setSelectedItem({
      ...selectedItem,
      scheduleFile: newFile,
      manufactureStatus: nextStatus,
      memoLogs: [
        {
          id: `memo-${Date.now()}`,
          authorId: memoAuthorId,
          authorName: memoAuthorName,
          company: currentVendor,
          tag: `${file.name.slice(0, 6)}.제작일정표`,
          content: `금형 제작 일정표 엑셀 파일(${file.name})이 신규 업로드되었습니다.`,
          createdAt: newFile.uploadedAt,
          attachedFileName: file.name,
          attachedFileUrl: uploadedUrl || `/uploads/${encodeURIComponent(file.name)}`,
        },
        ...(selectedItem.memoLogs || [])
      ]
    });

    showToast(`[${selectedItem.projectNo}] 금형 제작 일정표(${file.name})가 서버에 업로드 및 DB 저장되었습니다.`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 2-7) 업무 이력 메모 등록 핸들러
  const handleAddMemo = async () => {
    if (!selectedItem || !memoContent.trim()) {
      showToast("메모 내용을 입력해 주세요.");
      return;
    }

    let attachedFileUrl: string | undefined = undefined;
    const memoFile = memoFileInputRef.current?.files?.[0];
    if (memoFile) {
      try {
        const formData = new FormData();
        formData.append("file", memoFile);
        const res = await fetch("/api/v1/files/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.url) {
          attachedFileUrl = data.url;
        }
      } catch (err) {
        console.warn("Memo file upload failed", err);
      }
    }

    const nowStr = new Date().toLocaleString("ko-KR", { hour12: false }).replace(/\./g, "-").slice(0, 16);
    const newMemo = {
      authorId: memoAuthorId,
      authorName: memoAuthorName,
      company: currentVendor,
      tag: memoTag || "특이사항",
      content: memoContent.trim(),
      createdAt: nowStr,
      attachedFileName: selectedUploadFileName || undefined,
      attachedFileUrl: attachedFileUrl,
    };

    addMemoLog(selectedItem.id, newMemo);

    setSelectedItem({
      ...selectedItem,
      memoLogs: [{ id: `memo-${Date.now()}`, ...newMemo }, ...(selectedItem.memoLogs || [])]
    });

    showToast(`[${selectedItem.projectNo}] 업무 이력 메모가 성공적으로 등록되어 MPSI 본사 화면에 공유되었습니다.`);
    setMemoContent("");
    setSelectedUploadFileName("");
    if (memoFileInputRef.current) memoFileInputRef.current.value = "";
  };

  // 2-2) 금형제작 현황 상태 저장 핸들러
  const handleSaveStatusAndProcesses = () => {
    if (!selectedItem) return;

    // 세부 공정 진행률 기반 전체 공정률 계산
    const sum = formProcesses.reduce((acc, cur) => acc + cur.progress, 0);
    const avgProg = Math.round(sum / (formProcesses.length || 1));

    updateManufacture(selectedItem.id, {
      manufactureStatus: formStatus,
      processes: formProcesses,
      overallProgress: avgProg,
    });

    try {
      updateStep(selectedItem.projectNo, {
        stepStatus: formStatus === "금형 육성 중" ? "완료" : "진행중",
        trialCompletionRate: avgProg,
        notes: `[${currentVendor}] 금형제작 현황: ${formStatus} (종합 진척: ${avgProg}%)`,
      });
    } catch (e) {
      console.error(e);
    }

    showToast(`[${selectedItem.projectNo}] 금형제작 현황(${formStatus}) 및 세부공정 실적이 저장되었습니다.`);
    setIsDetailModalOpen(false);
  };

  // 세부 공정 진행률 변경 핸들러
  const handleProcessProgressChange = (code: string, newProg: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newProg)));
    setFormProcesses(prev => prev.map(proc => {
      if (proc.code !== code) return proc;
      return {
        ...proc,
        progress: clamped,
        status: (clamped >= 100 ? "완료" : clamped > 0 ? "진행중" : "대기") as any,
        actualDate: clamped >= 100 && !proc.actualDate ? new Date().toISOString().slice(5, 10) : proc.actualDate,
      };
    }));
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 토스트 알림창 */}
      {toastMessage && (
        <div className="fixed top-4 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-xl bg-purple-700 text-white text-xs font-medium animate-in fade-in">
          <Sparkles className="h-4 w-4" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-80 cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 상단 배너 */}
      <div className="bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
        <div className="flex items-start gap-2.5">
          <Hammer className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-purple-900 dark:text-purple-200 text-xs">
                [{currentVendor}] 개발 6단계 금형 제작 일정 관리 및 실적 등록 · MPSI 본사 연동
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-200 text-purple-800">
                금형제작 외주사 전용
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
              금형 제작 일정표(엑셀)를 직접 업로드하고, 현장 진행 상태(설계중/가공중/습합중/육성중) 및 특이사항 업무 이력 메모를 등록하세요.
            </p>
          </div>
        </div>
      </div>

      {/* 1. 검색 및 필터 바 */}
      <div className="bg-zinc-50 dark:bg-zinc-900/60 border rounded-lg p-2.5 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* 프로젝트 번호 검색 */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-zinc-500 shrink-0">프로젝트 번호:</span>
            <Input
              value={filterProjectNo}
              onChange={(e) => setFilterProjectNo(e.target.value)}
              placeholder="예: MI26001"
              className="h-7 w-28 text-xs bg-white dark:bg-zinc-900"
            />
          </div>

          {/* 제품명 / 차종 검색 */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-zinc-500 shrink-0">제품명/차종:</span>
            <Input
              value={filterProductName}
              onChange={(e) => setFilterProductName(e.target.value)}
              placeholder="예: Door Cover"
              className="h-7 w-32 text-xs bg-white dark:bg-zinc-900"
            />
          </div>

          {/* 금형제작 현황 필터 */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-zinc-500 shrink-0 font-medium text-purple-800 dark:text-purple-300">금형제작 현황:</span>
            <select
              value={filterManufactureStatus}
              onChange={(e) => setFilterManufactureStatus(e.target.value)}
              className="h-7 rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-bold text-purple-700 dark:text-purple-300"
            >
              <option value="ALL">전체 상태</option>
              <option value="미입력">미입력</option>
              <option value="금형 설계 중">금형 설계 중</option>
              <option value="가공 중">가공 중</option>
              <option value="습합 중">습합 중</option>
              <option value="금형 육성 중">금형 육성 중</option>
            </select>
          </div>

          {/* 일자 기준 셀렉터 */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-zinc-500 shrink-0">일자 기준:</span>
            <select
              value={filterDateType}
              onChange={(e) => setFilterDateType(e.target.value as any)}
              className="h-7 rounded border bg-white dark:bg-zinc-900 px-2 text-xs"
            >
              <option value="orderDate">금형발주일</option>
              <option value="targetT1Date">목표 T1 일정</option>
              <option value="updatedAt">최종 변경일</option>
            </select>
          </div>

          {/* 일자 범위 및 프리셋 필터 */}
          <div className="flex items-center">
            <DateRangeFilter
              compact
              startDate={filterDateFrom}
              endDate={filterDateTo}
              selectedPreset={selectedDatePreset}
              onStartDateChange={setFilterDateFrom}
              onEndDateChange={setFilterDateTo}
              onPresetChange={setSelectedDatePreset}
            />
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <Button onClick={() => refreshFromDb()} variant="outline" size="xs" className="h-7 text-xs gap-1 text-purple-700 border-purple-300 dark:text-purple-300">
              <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
              DB 동기화
            </Button>
            <Button onClick={handleReset} variant="outline" size="xs" className="h-7 text-xs gap-1">
              초기화
            </Button>
          </div>
        </div>
      </div>

      {/* 3. 외주업체 전용 데이터 그리드 (클라이언트 요청 사선 메뉴 삭제 & 금형제작 현황 적용) */}
      <div className="border rounded-lg bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[580px]">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead className="sticky top-0 z-10 bg-[#1e293b] text-white font-medium text-[11px]">
              <tr className="border-b border-slate-700">
                <th className="p-2 w-10 text-center border-r border-slate-600">No</th>
                <th className="p-2 border-r border-slate-600 min-w-[120px]">프로젝트 번호</th>
                <th className="p-2 border-r border-slate-600 min-w-[75px] text-center text-amber-300">신작/설변</th>
                <th className="p-2 border-r border-slate-600 min-w-[150px]">프로젝트 / 차종</th>
                <th className="p-2 border-r border-slate-600 min-w-[170px]">제품명</th>
                <th className="p-2 border-r border-slate-600 min-w-[105px] text-center">금형번호</th>
                <th className="p-2 border-r border-slate-600 min-w-[75px] text-center text-purple-300">금형차수</th>
                <th className="p-2 border-r border-slate-600 min-w-[120px] text-center">Cavity / 재질</th>
                <th className="p-2 border-r border-slate-600 min-w-[110px] text-center bg-slate-800">금형제작 현황</th>
                <th className="p-2 border-r border-slate-600 min-w-[130px] text-center">제작 일정표</th>
                <th className="p-2 border-r border-slate-600 min-w-[95px] text-center">목표 T1</th>
                <th className="p-2 border-r border-slate-600 min-w-[100px] text-center text-purple-300">금형 출고 납기</th>
                <th className="p-2 min-w-[100px] text-center">진척 관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px]">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-zinc-400">
                    현재 외주업체({currentVendor})에 배정된 금형 제작 프로젝트가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredData.map((row, idx) => {
                  const moldNoDisplay = row.moldNo || (row.projectNo ? `${row.projectNo.split("-")[0].replace(/P0$/, "")}M` : "-");

                  return (
                    <tr key={row.id} className="hover:bg-purple-50/50 dark:hover:bg-zinc-800/60 transition-colors odd:bg-white even:bg-zinc-50/40 dark:odd:bg-zinc-900 dark:even:bg-zinc-900/50">
                      <td className="p-2 text-center font-mono text-zinc-400 border-r">{idx + 1}</td>
                      
                      {/* 관리번호 (단순 텍스트) */}
                      <td className="p-2 border-r font-mono font-bold text-purple-700 dark:text-purple-400">
                        <span>{row.projectNo}</span>
                      </td>

                      {/* 신작/설변 (N001, E001) */}
                      <td className="p-2 border-r text-center font-mono">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold border shadow-2xs ${
                          row.changeType?.startsWith("E")
                            ? "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300"
                            : "bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300"
                        }`}>
                          {row.changeType || "N001"}
                        </span>
                      </td>

                      <td className="p-2 border-r font-medium truncate max-w-[150px]" title={row.projectName}>{row.projectName}</td>
                      <td className="p-2 border-r font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[170px]" title={row.productName}>{row.productName}</td>

                      {/* 금형번호 */}
                      <td className="p-2 border-r text-center font-mono font-bold text-zinc-800 dark:text-zinc-200">
                        {moldNoDisplay}
                      </td>

                      {/* 금형차수 (M1, M2) */}
                      <td className="p-2 border-r text-center font-mono">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">
                          {row.moldDegree || "M1"}
                        </span>
                      </td>

                      {/* Cavity / 재질 */}
                      <td className="p-2 border-r text-center font-mono text-[10px]">
                        {row.cavity} / {row.material}
                      </td>

                      {/* 금형제작 현황 */}
                      <td className="p-2 border-r text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] border shadow-2xs ${getManufactureStatusBadge(row.manufactureStatus)}`}>
                          {row.manufactureStatus}
                        </span>
                      </td>

                      {/* 제작 일정표 상태 */}
                      <td className="p-2 border-r text-center">
                        {row.scheduleFile ? (
                          <button
                            onClick={() => handleDownloadSchedule(row.scheduleFile, row.projectNo)}
                            title={`${row.scheduleFile.fileName} (${row.scheduleFile.fileSize || ""}) - ${row.scheduleFile.uploadedAt}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-50 text-purple-700 border border-purple-300 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 text-[10px] font-bold transition-colors cursor-pointer"
                          >
                            <FileText className="h-3 w-3 text-purple-600" />
                            <span className="truncate max-w-[90px]">{row.scheduleFile.fileName.replace(/\.xlsx$/i, "")}</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-zinc-400 font-mono">미등록</span>
                        )}
                      </td>

                      <td className="p-2 border-r text-center font-mono text-zinc-600 dark:text-zinc-300">{row.targetT1Date}</td>
                      <td className="p-2 border-r text-center font-mono font-bold text-purple-700 dark:text-purple-400">{row.moldDeliveryDate || "-"}</td>

                      {/* 외주 진척 관리 액션 버튼 */}
                      <td className="p-2 text-center">
                        <Button 
                          onClick={() => handleOpenDetail(row)} 
                          size="xs" 
                          className="h-6 px-2.5 text-[10px] gap-1 bg-purple-700 hover:bg-purple-800 text-white font-bold shadow-xs cursor-pointer"
                        >
                          <Wrench className="h-3 w-3" />
                          현황 관리
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. [모달 1] 2-1) 금형 제작 진행 현황(MPSI/금형처 동일 화면) - 금형처 입력 & 관리 모드 */}
      {isDetailModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-xl shadow-2xl border overflow-hidden flex flex-col max-h-[92vh]">
            {/* 모달 헤더 (2-1 금형 제작 진행 현황) */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#1e293b] text-white">
              <div className="flex items-center gap-2.5 flex-wrap">
                <Hammer className="h-4 w-4 text-purple-400" />
                <h3 className="font-bold text-sm">
                  [{currentVendor}] 금형 제작 진행 현황 [{selectedItem.projectNo}] [{selectedItem.moldNo || (selectedItem.projectNo ? `${selectedItem.projectNo.split("-")[0].replace(/P0$/, "")}M` : "-")}]
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900/80 border border-purple-400 text-purple-200 font-bold">
                  차수: {selectedItem.moldDegree || "M1"}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-sky-900/80 border border-sky-400 text-sky-200 font-bold">
                  구분: {selectedItem.changeType || "N001"}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-600 text-slate-300 font-bold">
                  금형처 실적 및 일정표 입력 모드
                </span>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 모달 바디 (Input form + 일정표 업로드 + 업무 이력 메모 등록) */}
            <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs">
              {/* 프로젝트 요약 카드 */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border text-[11px]">
                <div><span className="text-zinc-500">프로젝트 번호:</span> <b className="font-mono text-purple-700 dark:text-purple-400">{selectedItem.projectNo}</b></div>
                <div><span className="text-zinc-500">금형번호:</span> <b className="font-mono font-bold text-purple-800 dark:text-purple-300">{selectedItem.moldNo || (selectedItem.projectNo ? `${selectedItem.projectNo.split("-")[0].replace(/P0$/, "")}M` : "-")}</b></div>
                <div>
                  <span className="text-zinc-500">금형차수 / 구분:</span> 
                  <span className="ml-1 inline-flex items-center gap-1">
                    <b className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-300">{selectedItem.moldDegree || "M1"}</b>
                    <b className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-sky-100 text-sky-800 border border-sky-300">{selectedItem.changeType || "N001"}</b>
                  </span>
                </div>
                <div><span className="text-zinc-500">제품명:</span> <b className="text-zinc-900 dark:text-zinc-100">{selectedItem.productName}</b></div>
                <div><span className="text-zinc-500">금형제작사:</span> <b className="text-purple-700 font-bold">{selectedItem.moldVendor}</b></div>
                <div><span className="text-zinc-500">MPSI 발주번호:</span> <b className="font-mono text-purple-700 dark:text-purple-300">{selectedItem.moldPoNo}</b></div>
                <div><span className="text-zinc-500">금형재질:</span> <b className="font-mono">{selectedItem.material}</b></div>
                <div><span className="text-zinc-500">Cavity:</span> <b className="font-mono">{selectedItem.cavity}</b></div>
                <div><span className="text-zinc-500">목표 T1:</span> <b className="font-mono text-zinc-800 dark:text-zinc-200">{selectedItem.targetT1Date}</b></div>
                <div><span className="text-purple-600 font-medium">금형 출고 납기:</span> <b className="font-mono text-purple-700 dark:text-purple-400 font-bold">{selectedItem.moldDeliveryDate || "-"}</b></div>
              </div>

              {/* 노티스 배너 */}
              <div className="p-2.5 rounded bg-purple-50/80 border border-purple-200 text-purple-900 text-[11px] flex items-center gap-2">
                <Info className="h-4 w-4 text-purple-600 shrink-0" />
                <span>
                  <b>외주업체({currentVendor}) 현장 입력 정보:</b> 제작 진행현황, 세부 공정 일정, 일정표 엑셀 파일 및 업무 이력 메모를 등록하면 MPSI 본사로 전송됩니다.
                </span>
              </div>

              {/* 1. 금형 제작 현황 및 일정표 업로드 (2-2, 2-3, 2-4) */}
              <div className="border border-purple-200 dark:border-purple-900/60 rounded-xl p-4 bg-purple-50/20 dark:bg-purple-950/10 flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-700 text-white flex items-center justify-center font-bold text-[10px]">1</span>
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                      금형 제작 현황 및 공정 일정 관리
                    </h4>
                  </div>
                  {/* 2-2) 상태 배지 */}
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${getManufactureStatusBadge(formStatus)}`}>
                    {formStatus}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
                  {/* 2-2) 상태 선택 카드 */}
                  <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-lg border flex flex-col justify-between gap-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                          금형제작 현황 변경:
                        </label>
                        <span className="text-[10px] text-zinc-400">클라이언트 정의 5단계</span>
                      </div>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as MoldManufactureStatus)}
                        className="w-full h-8 rounded-md border bg-white dark:bg-zinc-900 px-2.5 text-xs font-bold text-purple-700 dark:text-purple-300 focus:ring-1 focus:ring-purple-500"
                      >
                        <option value="미입력">미입력 (일정표 미입력 상태)</option>
                        <option value="금형 설계 중">금형 설계 중 (PO 발행일 기준 제작일수 1 적용)</option>
                        <option value="가공 중">가공 중 (설계 진행 및 가공 착수)</option>
                        <option value="습합 중">습합 중 (가공 완료 후 조립/습합 착수)</option>
                        <option value="금형 육성 중">금형 육성 중 (시사출 시작 시점)</option>
                      </select>
                    </div>

                    <div className="text-[11px] text-zinc-500 bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded border">
                      {formStatus === "미입력" && "일정표가 아직 입력되지 않은 상태입니다."}
                      {formStatus === "금형 설계 중" && "금형 제작 PO 발행일이 제작일수의 1로 적용되어 금형 설계가 시작됩니다."}
                      {formStatus === "가공 중" && "현 시점의 진척도가 설계가 진행되면서 가공 시작 상태입니다."}
                      {formStatus === "습합 중" && "현 시점의 진척도가 가공이 진행되면서 습합 시작 상태입니다."}
                      {formStatus === "금형 육성 중" && "시사출이 시작되었을 때 금형육성 중으로 표기됩니다."}
                    </div>

                    {/* 2-3) 공정 일정 입력 토글 버튼 */}
                    <div className="pt-2 border-t flex items-center justify-between">
                      <Button
                        type="button"
                        onClick={() => setShowProcessEdit(!showProcessEdit)}
                        size="xs"
                        variant="outline"
                        className="h-7 text-[11px] gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50 font-bold cursor-pointer"
                      >
                        <Sliders className="h-3.5 w-3.5" />
                        {showProcessEdit ? "7대 세부공정 닫기" : "공정 일정 세부 입력 (7대 공정)"}
                      </Button>
                      <span className="text-[10px] text-zinc-400">금형처 직접 입력</span>
                    </div>
                  </div>

                  {/* 2-4) 일정표 업로드 카드 (금형처 화면은 첨부) */}
                  <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-lg border flex flex-col justify-between gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <UploadCloud className="h-3.5 w-3.5 text-purple-600" />
                        금형 제작 일정표 엑셀 업로드
                      </span>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        accept=".xlsx,.xls,.pdf" 
                        className="hidden" 
                      />
                      <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        size="xs"
                        className="h-7 bg-purple-700 hover:bg-purple-800 text-white text-[11px] gap-1 font-bold cursor-pointer shadow-xs"
                      >
                        <UploadCloud className="h-3 w-3" />
                        일정표 업로드(엑셀)
                      </Button>
                    </div>

                    {selectedItem.scheduleFile ? (
                      <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-md border gap-2">
                        <div className="flex flex-col min-w-0">
                          <span className="font-mono font-bold text-purple-700 dark:text-purple-300 text-[11px] truncate">
                            {selectedItem.scheduleFile.fileName}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {selectedItem.scheduleFile.uploadedAt} 등록 · {selectedItem.scheduleFile.uploadedBy} ({selectedItem.scheduleFile.fileSize || "1.2MB"})
                          </span>
                        </div>
                        <Button
                          type="button"
                          onClick={() => handleDownloadSchedule(selectedItem.scheduleFile, selectedItem.projectNo)}
                          size="xs"
                          variant="outline"
                          className="h-6 text-[10px] gap-1 cursor-pointer shrink-0"
                        >
                          <Download className="h-3 w-3 text-zinc-500" />
                          다운로드
                        </Button>
                      </div>
                    ) : (
                      <div className="p-3 text-center text-zinc-400 border border-dashed rounded-md bg-zinc-50 text-[11px]">
                        등록된 일정표가 없습니다. 엑셀 일정표를 업로드하세요.
                      </div>
                    )}

                    <span className="text-[10px] text-zinc-400">
                      * 엑셀 일정표를 업로드하면 MPSI 본사에서 다운로드 가능합니다.
                    </span>
                  </div>
                </div>

                {/* 2-3) 세부 공정 일정 입력 영역 (토글형) */}
                {showProcessEdit && (
                  <div className="bg-white dark:bg-zinc-900 rounded-lg border p-3.5 flex flex-col gap-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 text-[11px] flex items-center gap-1.5">
                        <Sliders className="h-3.5 w-3.5 text-purple-600" />
                        7대 세부 가공 공정 실적 직접 입력:
                      </span>
                      <span className="text-[10px] text-zinc-400">공정별 슬라이더 또는 수치 조정</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px]">
                      {formProcesses.map((proc) => (
                        <div key={proc.code} className="p-2.5 rounded-lg border bg-zinc-50 dark:bg-zinc-800/40 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">{proc.name}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              proc.status === "완료" ? "bg-emerald-100 text-emerald-800" : proc.status === "진행중" ? "bg-blue-100 text-blue-800" : "bg-zinc-200 text-zinc-600"
                            }`}>
                              {proc.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <input 
                              type="range" 
                              min="0" 
                              max="100" 
                              step="5"
                              value={proc.progress} 
                              onChange={(e) => handleProcessProgressChange(proc.code, Number(e.target.value))}
                              className="flex-1 accent-purple-600 h-1.5 bg-zinc-200 rounded cursor-pointer"
                            />
                            <span className="font-mono font-bold w-10 text-right text-[10px] text-purple-700">
                              {proc.progress}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. 2-7) 업무 이력 메모 카드 */}
              <div className="border border-indigo-200 dark:border-indigo-900/60 rounded-xl p-4 bg-indigo-50/20 dark:bg-indigo-950/10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">2</span>
                    <div>
                      <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
                        업무 이력 메모 등록 및 확인
                      </h4>
                      <p className="text-[10px] text-zinc-500">
                        제작 진행현황에 특이사항(지연, 일정변경 등)이 있는 경우 작성자 ID, 이름, 시간과 함께 등록합니다.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                    총 {selectedItem.memoLogs?.length || 0}건
                  </span>
                </div>

                {/* 메모 작성 폼 */}
                <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-lg border flex flex-col gap-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-500 font-medium block mb-0.5">작성자 명 (ID)</label>
                      <Input
                        value={memoAuthorName}
                        onChange={(e) => setMemoAuthorName(e.target.value)}
                        placeholder="예: 우성정공 한승호부장"
                        className="h-7 text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 font-medium block mb-0.5">사번 / ID</label>
                      <Input
                        value={memoAuthorId}
                        onChange={(e) => setMemoAuthorId(e.target.value)}
                        placeholder="예: ws-hsh"
                        className="h-7 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 font-medium block mb-0.5">메모 구분 (태그)</label>
                      <Input
                        value={memoTag}
                        onChange={(e) => setMemoTag(e.target.value)}
                        placeholder="예: 261010.제작일정표"
                        className="h-7 text-xs font-bold text-purple-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-500 font-medium block mb-0.5">특이사항 내용</label>
                    <textarea
                      rows={2}
                      value={memoContent}
                      onChange={(e) => setMemoContent(e.target.value)}
                      placeholder="예: 상측 방전가공 지연, 상/하측 코어 CNC 2차 정밀가공 75% 진행 중 (MPSI 본사에 공유됩니다)"
                      className="w-full p-2 rounded-md border text-xs bg-white dark:bg-zinc-900 resize-none focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t">
                    <div className="flex items-center gap-2">
                      <input 
                        type="file" 
                        ref={memoFileInputRef} 
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setSelectedUploadFileName(f.name);
                        }} 
                        accept=".xlsx,.xls,.pdf" 
                        className="hidden" 
                      />
                      <Button
                        type="button"
                        onClick={() => memoFileInputRef.current?.click()}
                        size="xs"
                        variant="outline"
                        className="h-7 text-[10px] gap-1 cursor-pointer"
                      >
                        <FileText className="h-3 w-3 text-zinc-500" />
                        일정표 파일 첨부
                      </Button>
                      {selectedUploadFileName && (
                        <span className="text-[10px] text-purple-600 font-mono font-bold">
                          {selectedUploadFileName}
                        </span>
                      )}
                    </div>

                    <Button
                      type="button"
                      onClick={handleAddMemo}
                      size="xs"
                      className="h-7 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1 cursor-pointer shadow-xs"
                    >
                      <Send className="h-3 w-3" />
                      메모 등록
                    </Button>
                  </div>
                </div>

                {/* 등록된 이력 메모 목록 */}
                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {(!selectedItem.memoLogs || selectedItem.memoLogs.length === 0) ? (
                    <div className="p-4 text-center text-zinc-400 bg-white dark:bg-zinc-900 rounded-lg border text-xs">
                      등록된 업무 이력 메모가 없습니다.
                    </div>
                  ) : (
                    selectedItem.memoLogs.map((log) => (
                      <div 
                        key={log.id} 
                        className={`p-3 rounded-lg border text-xs flex flex-col gap-1.5 transition-all ${
                          log.company.includes("MPSI") 
                            ? "bg-sky-50/70 border-sky-200 dark:bg-sky-950/30 dark:border-sky-800" 
                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-2xs"
                        }`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              log.company.includes("MPSI")
                                ? "bg-sky-200 text-sky-800"
                                : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                            }`}>
                              {log.tag || "업무메모"}
                            </span>
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">
                              {log.authorName}
                            </span>
                            {log.authorId && (
                              <span className="text-[10px] text-zinc-400 font-mono">
                                ({log.authorId})
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {log.createdAt} 입력
                          </span>
                        </div>

                        <p className="text-zinc-700 dark:text-zinc-300 text-[11px] leading-relaxed whitespace-pre-line pl-1">
                          {log.content}
                        </p>

                        {log.attachedFileName && (
                          <div className="flex items-center gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                            <FileText className="h-3 w-3 text-emerald-600" />
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono">
                              첨부 일정표: {log.attachedFileName}
                            </span>
                            <button
                              onClick={() => handleDownloadSchedule({ fileName: log.attachedFileName!, uploadedAt: log.createdAt, uploadedBy: log.authorName, fileUrl: log.attachedFileUrl }, selectedItem.projectNo)}
                              className="text-[10px] text-purple-600 hover:underline flex items-center gap-0.5 ml-auto cursor-pointer"
                            >
                              <Download className="h-3 w-3" /> 다운로드
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800 border-t">
              <Button onClick={() => setIsDetailModalOpen(false)} variant="outline" className="h-8 px-4 text-xs cursor-pointer">
                닫기
              </Button>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleSaveStatusAndProcesses}
                  className="h-8 px-4 text-xs bg-purple-700 hover:bg-purple-800 text-white gap-1.5 font-bold shadow-xs cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  제작 현황 및 실적 저장
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

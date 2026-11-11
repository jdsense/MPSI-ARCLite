"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, RefreshCw, Layers, Wrench, Hammer, 
  CheckCircle2, Clock, AlertTriangle, Eye, 
  ExternalLink, UploadCloud, Download, X, Check, FileText, Building2,
  Activity, ListTree, Settings, Info, Lock, MessageSquare, Send, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangeFilter, isWithinDateRange, DatePresetType } from "@/components/common/date-range-filter";
import { 
  useProjectMaster, 
  PROCESS_13_STEPS, 
  getStepActor, 
  getStepBullets, 
  getStepUrl,
  ProjectItem 
} from "@/lib/project-store";
import { MOLD_VENDOR_LIST } from "@/lib/role-store";
import { 
  useMoldManufactureStore, 
  MoldManufactureItem, 
  MoldManufactureStatus,
  ManufactureScheduleFile,
  getManufactureStatusBadge,
  getManufactureStatusText
} from "@/lib/mold-manufacture-store";
import { cleanCompanyAuthor } from "@/lib/notification-store";

export default function MoldManufacturePage() {
  const router = useRouter();
  const { manufactures, addMemoLog, refreshFromDb, isLoading } = useMoldManufactureStore();
  const { projects } = useProjectMaster();

  const [filterProjectNo, setFilterProjectNo] = useState("");
  const [filterProductName, setFilterProductName] = useState("");
  const [filterVendorName, setFilterVendorName] = useState("ALL");
  const [filterManufactureStatus, setFilterManufactureStatus] = useState<string>("ALL");
  const [filterDateType, setFilterDateType] = useState<"orderDate" | "targetT1Date" | "updatedAt">("orderDate");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePresetType>("all");

  // 상세/조회 모달 (MPSI 뷰 모드 전용)
  const [selectedItem, setSelectedItem] = useState<MoldManufactureItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // MPSI 피드백 메모 입력 상태
  const [mpsiMemoInput, setMpsiMemoInput] = useState("");
  const [mpsiMemoTag, setMpsiMemoTag] = useState("본사 피드백");

  // 13단계 프로세스 상세 공정 모달 (/portal/project 상세공정 연동)
  const [diagramItem, setDiagramItem] = useState<MoldManufactureItem | null>(null);
  const [isDiagramModalOpen, setIsDiagramModalOpen] = useState(false);
  const [modalSelectedItem, setModalSelectedItem] = useState<ProjectItem | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  // 검색 필터링된 데이터
  const filteredData = manufactures.filter((item) => {
    const matchProject = filterProjectNo
      ? item.projectNo.toLowerCase().includes(filterProjectNo.toLowerCase())
      : true;
    const matchProd = filterProductName
      ? item.productName.toLowerCase().includes(filterProductName.toLowerCase()) ||
        item.projectName.toLowerCase().includes(filterProductName.toLowerCase())
      : true;
    const matchVendor = filterVendorName !== "ALL"
      ? item.moldVendor.includes(filterVendorName)
      : true;
    const matchStatus = filterManufactureStatus !== "ALL"
      ? item.manufactureStatus === filterManufactureStatus
      : true;
    const targetDate = item[filterDateType];
    const matchDate = isWithinDateRange(targetDate, filterDateFrom, filterDateTo);
    return matchProject && matchProd && matchVendor && matchStatus && matchDate;
  });

  const handleReset = () => {
    setFilterProjectNo("");
    setFilterProductName("");
    setFilterVendorName("ALL");
    setFilterManufactureStatus("ALL");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSelectedDatePreset("all");
  };

  // 상세 뷰 모달 열기 (MPSI 조회 전용)
  const handleOpenDetail = (item: MoldManufactureItem) => {
    setSelectedItem(item);
    setMpsiMemoInput("");
    setIsDetailModalOpen(true);
  };

  // 일정표 엑셀 파일 다운로드 핸들러
  const handleDownloadSchedule = async (file?: ManufactureScheduleFile, projectNo?: string) => {
    const targetFile = file?.fileUrl || file?.fileName;
    if (!targetFile) {
      alert("다운로드할 일정표 파일이 등록되지 않았습니다.");
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
        alert(errJson.error || "서버에 해당 일정표 파일이 존재하지 않습니다.");
      }
    } catch (e: any) {
      console.error("Download failed:", e);
      if (file?.fileUrl) {
        window.open(file.fileUrl, "_blank");
      } else {
        alert("일정표 파일 다운로드 중 오류가 발생했습니다.");
      }
    }
  };

  // MPSI 피드백 메모 등록
  const handleAddMpsiMemo = () => {
    if (!selectedItem || !mpsiMemoInput.trim()) return;

    const nowStr = new Date().toLocaleString("ko-KR", { hour12: false }).replace(/\./g, "-").slice(0, 16);
    addMemoLog(selectedItem.id, {
      authorId: "mpsi-dev",
      authorName: "MPSI",
      company: "MPSI",
      tag: mpsiMemoTag,
      content: mpsiMemoInput.trim(),
      createdAt: nowStr,
    });

    // 로컬 selectedItem 동기화
    const updatedLogs = [
      {
        id: `memo-${Date.now()}`,
        authorId: "mpsi-dev",
        authorName: "MPSI",
        company: "MPSI",
        tag: mpsiMemoTag,
        content: mpsiMemoInput.trim(),
        createdAt: nowStr,
      },
      ...(selectedItem.memoLogs || [])
    ];
    setSelectedItem({
      ...selectedItem,
      memoLogs: updatedLogs
    });

    setMpsiMemoInput("");
  };

  // 13단계 상세 공정 모달 열기
  const handleOpenDiagram = (item: MoldManufactureItem) => {
    setDiagramItem(item);
    const matched = projects.find((p) => p.projectNo === item.projectNo);
    if (matched) {
      setModalSelectedItem(matched);
    } else {
      setModalSelectedItem({
        id: item.id,
        projectNo: item.projectNo,
        customerName: item.customerName,
        projectName: item.projectName,
        productName: item.productName,
        partNo: "4890",
        moldNo: `${item.projectNo.split("-")[0]}M`,
        cavity: item.cavity,
        material: item.material,
        moldProductionType: item.moldVendor.includes("자체") ? "IN_HOUSE" : "OUTSOURCING",
        moldVendor: item.moldVendor,
        massProductionType: "OUTSOURCING",
        massVendor: "(주)뉴몰드",
        currentStep: item.currentStep,
        stepStatus: "진행중",
        trialDegree: "T1 대기",
        trialCompletionRate: item.overallProgress,
        facilityEvent: "가동대기",
        orderQty: 10000,
        deliveredQty: 0,
        targetT1Date: item.targetT1Date,
        targetMassDate: "2026-11-30",
        updatedAt: item.updatedAt,
      });
    }
    setExpandedStep(null);
    setIsDiagramModalOpen(true);
  };

  // 13단계 프로세스 스텝 이동
  const handleNavigateToStepPage = (step: number, projectNo?: string) => {
    const targetUrl = getStepUrl(step, projectNo);
    setIsDiagramModalOpen(false);
    router.push(targetUrl);
  };

  // Step 상태 배지 클래스
  const getStepStatusBadge = (status: string) => {
    switch (status) {
      case "완료":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300";
      case "Fail(수정중)":
        return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 animate-pulse font-bold";
      case "지연주의":
        return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300";
      default:
        return "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300";
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 상단 SCM 프로세스 공정 6번 배너 */}
      <div className="bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
        <div className="flex items-start gap-2.5">
          <Wrench className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sky-900 dark:text-sky-200 text-xs">
                [개발 13단계 중 6번] 금형 제작 일정 관리 및 진척 관제 대장 (MPSI 본사 관제)
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                <Lock className="h-3 w-3" /> 일정표 다운로드 및 관제
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
              금형처에서 직접 입력한 일정표(엑셀)와 금형제작 현황(설계중/가공중/습합중/육성중) 및 업무 이력 메모를 확인하고 다운로드합니다.
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

          {/* 금형제작처 필터 */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-zinc-500 shrink-0">금형제작처:</span>
            <select
              value={filterVendorName}
              onChange={(e) => setFilterVendorName(e.target.value)}
              className="h-7 rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-medium"
            >
              <option value="ALL">전체 제작처</option>
              {MOLD_VENDOR_LIST.map((v) => (
                <option key={v.id} value={v.name}>
                  {v.name} ({v.type === "IN_HOUSE" ? "자체" : "외주"})
                </option>
              ))}
            </select>
          </div>

          {/* 금형제작 현황 필터 (클라이언트 수정 요청 반영: 코어가공 -> 금형제작 현황) */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-zinc-500 shrink-0 font-medium text-sky-800 dark:text-sky-300">금형제작 현황:</span>
            <select
              value={filterManufactureStatus}
              onChange={(e) => setFilterManufactureStatus(e.target.value)}
              className="h-7 rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-bold text-sky-700 dark:text-sky-300"
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
            <Button onClick={() => refreshFromDb()} variant="outline" size="xs" className="h-7 text-xs gap-1 text-sky-700 border-sky-300 dark:text-sky-300">
              <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
              DB 동기화
            </Button>
            <Button onClick={handleReset} variant="outline" size="xs" className="h-7 text-xs gap-1">
              초기화
            </Button>
          </div>
        </div>
      </div>

      {/* 3. 메인 데이터 그리드 (클라이언트 요청 컬럼 반영: 불필요 6개 컬럼 삭제 + '금형제작 현황' 적용) */}
      <div className="border rounded-lg bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[580px]">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead className="sticky top-0 z-10 bg-[#1e293b] text-white font-medium text-[11px]">
              <tr className="border-b border-slate-700">
                <th className="p-2 w-10 text-center border-r border-slate-600">No</th>
                <th className="p-2 border-r border-slate-600 min-w-[130px]">프로젝트 번호</th>
                <th className="p-2 border-r border-slate-600 min-w-[120px] text-center">금형제작처</th>
                <th className="p-2 border-r border-slate-600 min-w-[160px]">프로젝트 / 차종</th>
                <th className="p-2 border-r border-slate-600 min-w-[180px]">제품명</th>
                <th className="p-2 border-r border-slate-600 min-w-[105px] text-center">금형번호</th>
                <th className="p-2 border-r border-slate-600 min-w-[100px] text-right">발주금액</th>
                <th className="p-2 border-r border-slate-600 min-w-[110px] text-center bg-slate-800">금형제작 현황</th>
                <th className="p-2 border-r border-slate-600 min-w-[130px] text-center">제작 일정표</th>
                <th className="p-2 border-r border-slate-600 min-w-[95px] text-center">목표 T1</th>
                <th className="p-2 border-r border-slate-600 min-w-[100px] text-center text-purple-300">금형 출고 납기</th>
                <th className="p-2 min-w-[85px] text-center">조회</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px]">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-zinc-400">
                    조회 조건에 부합하는 금형 제작 프로젝트가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredData.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-sky-50/70 dark:hover:bg-zinc-800/60 transition-colors odd:bg-white even:bg-zinc-50/40 dark:odd:bg-zinc-900 dark:even:bg-zinc-900/50">
                    <td className="p-2 text-center font-mono text-zinc-400 border-r">{idx + 1}</td>
                    
                    {/* 프로젝트 번호 */}
                    <td className="p-2 border-r font-mono font-bold text-sky-600 dark:text-sky-400">
                      <span>{row.projectNo}</span>
                    </td>

                    {/* 금형제작처 */}
                    <td className="p-2 border-r text-center">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        row.moldVendor.includes("자체")
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-blue-50 text-blue-700 border border-blue-300 dark:bg-blue-950/40 dark:text-blue-300"
                      }`}>
                        <Building2 className="h-3 w-3" />
                        {row.moldVendor}
                      </span>
                    </td>

                    <td className="p-2 border-r font-medium truncate max-w-[160px]" title={row.projectName}>{row.projectName}</td>
                    <td className="p-2 border-r font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[180px]" title={row.productName}>{row.productName}</td>

                    {/* 금형번호 */}
                    <td className="p-2 border-r text-center font-mono font-bold text-zinc-800 dark:text-zinc-200">
                      {row.moldNo || (row.projectNo ? `${row.projectNo.split("-")[0].replace(/P0$/, "")}M` : "-")}
                    </td>

                    {/* 발주금액 */}
                    <td className="p-2 border-r text-right font-mono text-zinc-800 dark:text-zinc-200">
                      {row.orderAmount ? `${(row.orderAmount / 10000).toLocaleString()}만원` : "-"}
                    </td>

                    {/* 금형제작 현황 (클라이언트 요구: 미입력 / 금형 설계 중 / 가공 중 / 습합 중 / 금형 육성 중) */}
                    <td className="p-2 border-r text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] border shadow-2xs ${getManufactureStatusBadge(row.manufactureStatus)}`}>
                        {getManufactureStatusText(row.manufactureStatus)}
                      </span>
                    </td>

                    {/* 제작 일정표 (엑셀 파일 다운로드 연동) */}
                    <td className="p-2 border-r text-center">
                      {row.scheduleFile ? (
                        <button
                          onClick={() => handleDownloadSchedule(row.scheduleFile, row.projectNo)}
                          title={`${row.scheduleFile.fileName} (${row.scheduleFile.fileSize || ""}) - ${row.scheduleFile.uploadedAt}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          <Download className="h-3 w-3 text-emerald-600" />
                          <span className="truncate max-w-[90px]">{row.scheduleFile.fileName.replace(/\.xlsx$/i, "")}</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-zinc-400 font-mono">미등록</span>
                      )}
                    </td>

                    <td className="p-2 border-r text-center font-mono text-zinc-600 dark:text-zinc-300">{row.targetT1Date}</td>
                    <td className="p-2 border-r text-center font-mono font-bold text-purple-700 dark:text-purple-400">{row.moldDeliveryDate || "-"}</td>

                    {/* 액션 버튼 (MPSI는 조회/뷰 모드) */}
                    <td className="p-2 text-center">
                      <Button 
                        onClick={() => handleOpenDetail(row)} 
                        size="xs" 
                        variant="outline" 
                        className="h-6 px-2.5 text-[10px] gap-1 bg-white hover:bg-zinc-100 dark:bg-zinc-800 font-bold border-sky-300 text-sky-700"
                      >
                        <Eye className="h-3 w-3 text-sky-600" />
                        상세조회
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. [모달 1] 2-1) 금형 제작 진행 현황(MPSI/금형처 동일 화면) - MPSI 뷰 & 관제 모드 */}
      {isDetailModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-xl shadow-2xl border overflow-hidden flex flex-col max-h-[92vh]">
            {/* 모달 헤더 (주황색 바 표시 2-1 금형 제작 진행 현황) */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#1e293b] text-white">
              <div className="flex items-center gap-2.5">
                <Wrench className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-sm">
                  [{selectedItem.moldVendor}] 금형 제작 진행 현황 [{selectedItem.projectNo}]
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-sky-900/60 border border-sky-400 text-sky-200 font-bold flex items-center gap-1">
                  <Lock className="h-3 w-3" /> MPSI 관제 및 일정표 다운로드
                </span>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 모달 바디 (Read-Only + 일정표 다운로드 + 업무 이력 메모 확인) */}
            <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs">
              {/* 프로젝트 요약 스펙 카드 */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border text-[11px]">
                <div><span className="text-zinc-500">프로젝트 번호:</span> <b className="font-mono text-sky-600">{selectedItem.projectNo}</b></div>
                <div><span className="text-zinc-500">금형번호:</span> <b className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{selectedItem.moldNo || (selectedItem.projectNo ? `${selectedItem.projectNo.split("-")[0].replace(/P0$/, "")}M` : "-")}</b></div>
                <div><span className="text-zinc-500">제품명:</span> <b className="text-zinc-900 dark:text-zinc-100">{selectedItem.productName}</b></div>
                <div><span className="text-zinc-500">금형제작사:</span> <b className="text-blue-600">{selectedItem.moldVendor}</b></div>
                <div><span className="text-zinc-500">MPSI 발주번호:</span> <b className="font-mono text-sky-700 dark:text-sky-300">{selectedItem.moldPoNo}</b></div>
                <div><span className="text-zinc-500">금형재질:</span> <b className="font-mono">{selectedItem.material}</b></div>
                <div><span className="text-zinc-500">Cavity:</span> <b className="font-mono">{selectedItem.cavity}</b></div>
                <div><span className="text-zinc-500">목표 T1:</span> <b className="font-mono text-zinc-800 dark:text-zinc-200">{selectedItem.targetT1Date}</b></div>
                <div className="sm:col-span-2"><span className="text-purple-600 font-medium">금형 출고 납기:</span> <b className="font-mono text-purple-700 dark:text-purple-400 font-bold">{selectedItem.moldDeliveryDate || "-"}</b></div>
              </div>

              {/* 노티스 안내 문구 */}
              <div className="p-2.5 rounded bg-amber-50/80 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
                <Info className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  <b>외주업체({selectedItem.moldVendor}) 현장 입력 정보:</b> 가공 공정 실적, 일정표 엑셀 파일 및 업무 이력 메모는 외주사 포털에서 등록되며, MPSI 본사는 읽기 전용으로 관제 및 다운로드합니다.
                </span>
              </div>

              {/* 1. 금형 제작 현황 및 일정표 다운로드 (2-2, 2-3, 2-4) */}
              <div className="border border-sky-200 dark:border-sky-900/60 rounded-xl p-4 bg-sky-50/20 dark:bg-sky-950/10 flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[10px]">1</span>
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                      금형 제작 현황 및 공정 관리
                    </h4>
                  </div>
                  {/* 2-2) 상태 표시 (설계 중 / 가공 중 / 습합 중 / 금형 육성 중 / 미입력) */}
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${getManufactureStatusBadge(selectedItem.manufactureStatus)}`}>
                    {getManufactureStatusText(selectedItem.manufactureStatus)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
                  {/* 2-2 상태 카드 설명 */}
                  <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-lg border flex flex-col justify-between gap-2">
                    <div>
                      <span className="text-[11px] text-zinc-500 font-medium block mb-1">금형 제작 현황 단계:</span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${getManufactureStatusBadge(selectedItem.manufactureStatus)}`}>
                          {getManufactureStatusText(selectedItem.manufactureStatus)}
                        </span>
                        <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
                          {selectedItem.manufactureStatus === "미입력" && "일정표가 아직 등록되지 않은 초기 단계입니다."}
                          {selectedItem.manufactureStatus === "금형 설계 중" && "PO 발행 완료되어 금형 3D 설계 진행 중입니다."}
                          {selectedItem.manufactureStatus === "가공 중" && "소재 입고 후 코어 가공(CNC/밀링/방전)이 진행 중입니다."}
                          {selectedItem.manufactureStatus === "습합 중" && "가공 완료 후 상하 코어 조립 및 습합이 진행 중입니다."}
                          {selectedItem.manufactureStatus === "금형 육성 중" && "금형 제작이 완료되어 T1 시사출 및 육성이 시작되었습니다."}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-zinc-500 pt-2 border-t flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-sky-600" />
                        <span>목표 T1 일정: <b className="font-mono text-zinc-800 dark:text-zinc-200">{selectedItem.targetT1Date}</b></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-purple-600" />
                        <span>금형 출고 납기: <b className="font-mono text-purple-700 dark:text-purple-400 font-bold">{selectedItem.moldDeliveryDate || "-"}</b></span>
                      </div>
                    </div>
                  </div>

                  {/* 2-4) 일정표 다운로드 카드 (MPSI 화면은 다운) */}
                  <div className="bg-white dark:bg-zinc-900 p-3.5 rounded-lg border flex flex-col justify-between gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-emerald-600" />
                        금형 제작 일정표 (Excel 첨부)
                      </span>
                      {selectedItem.scheduleFile && (
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          최신본
                        </span>
                      )}
                    </div>

                    {selectedItem.scheduleFile ? (
                      <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-md border gap-2">
                        <div className="flex flex-col min-w-0">
                          <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200 text-[11px] truncate">
                            {selectedItem.scheduleFile.fileName}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {selectedItem.scheduleFile.uploadedAt} · {selectedItem.scheduleFile.uploadedBy} ({selectedItem.scheduleFile.fileSize || "1.2MB"})
                          </span>
                        </div>

                        <Button
                          onClick={() => handleDownloadSchedule(selectedItem.scheduleFile, selectedItem.projectNo)}
                          size="xs"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] gap-1 h-7 font-bold shrink-0 cursor-pointer shadow-xs"
                        >
                          <Download className="h-3.5 w-3.5" />
                          일정표 다운로드
                        </Button>
                      </div>
                    ) : (
                      <div className="p-3 text-center text-zinc-400 border border-dashed rounded-md bg-zinc-50 text-[11px]">
                        금형처에서 아직 일정표 엑셀 파일을 업로드하지 않았습니다.
                      </div>
                    )}

                    <span className="text-[10px] text-zinc-400">
                      * 금형처에서 엑셀 일정표를 신규 업로드하면 본사 화면에 갱신됩니다.
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. 2-7) 업무 이력 메모 카드 */}
              <div className="border border-indigo-200 dark:border-indigo-900/60 rounded-xl p-4 bg-indigo-50/20 dark:bg-indigo-950/10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">2</span>
                    <div>
                      <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-xs flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
                        업무 이력 메모 (제작 진행현황 특이사항 및 일정표 이력)
                      </h4>
                      <p className="text-[10px] text-zinc-500">
                        제작 진행현황에 특이사항이 있는 경우 작성자 ID, 이름, 등록 시간을 표기하여 누적 관리합니다.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                    총 {selectedItem.memoLogs?.length || 0}건
                  </span>
                </div>

                {/* 메모 히스토리 타임라인 목록 */}
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
                              {cleanCompanyAuthor(log.authorName, log.company)}
                            </span>
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
                              className="text-[10px] text-sky-600 hover:underline flex items-center gap-0.5 ml-auto cursor-pointer"
                            >
                              <Download className="h-3 w-3" /> 다운로드
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* MPSI 본사 회신/피드백 메모 등록 */}
                <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-700 dark:text-zinc-300 text-[11px]">
                      MPSI 본사 피드백 및 관리 메모 작성:
                    </span>
                    <select
                      value={mpsiMemoTag}
                      onChange={(e) => setMpsiMemoTag(e.target.value)}
                      className="h-6 rounded border bg-zinc-50 dark:bg-zinc-800 text-[10px] px-1.5"
                    >
                      <option value="본사 피드백">본사 피드백</option>
                      <option value="일정 확인">일정 확인</option>
                      <option value="T1 일정 요청">T1 일정 요청</option>
                      <option value="설계 보완 요청">설계 보완 요청</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={mpsiMemoInput}
                      onChange={(e) => setMpsiMemoInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddMpsiMemo(); }}
                      placeholder="외주사에 전달할 피드백 또는 메모를 입력하세요 (Enter 입력 시 등록)"
                      className="h-8 text-xs flex-1"
                    />
                    <Button
                      onClick={handleAddMpsiMemo}
                      size="xs"
                      className="h-8 px-3 bg-sky-600 hover:bg-sky-700 text-white font-bold gap-1 cursor-pointer"
                    >
                      <Send className="h-3 w-3" />
                      등록
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800 border-t">
              <Button onClick={() => setIsDetailModalOpen(false)} variant="outline" className="h-8 px-4 text-xs cursor-pointer">
                닫기
              </Button>
              <div className="flex items-center gap-2">
                {selectedItem.scheduleFile && (
                  <Button 
                    onClick={() => handleDownloadSchedule(selectedItem.scheduleFile, selectedItem.projectNo)}
                    className="h-8 px-4 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shadow-xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    제작 일정표(Excel) 다운로드
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. [모달 2] 0~13단계 프로젝트 상세 공정 모달 (/portal/project 상세공정 연동) */}
      {isDiagramModalOpen && diagramItem && (() => {
        const curProject: ProjectItem = modalSelectedItem || projects.find(p => p.projectNo === diagramItem.projectNo) || {
          id: diagramItem.id,
          projectNo: diagramItem.projectNo,
          customerName: diagramItem.customerName,
          projectName: diagramItem.projectName,
          productName: diagramItem.productName,
          partNo: "4890",
          moldNo: `${diagramItem.projectNo.split("-")[0]}M`,
          cavity: diagramItem.cavity,
          material: diagramItem.material,
          moldProductionType: diagramItem.moldVendor.includes("자체") ? "IN_HOUSE" : "OUTSOURCING",
          moldVendor: diagramItem.moldVendor,
          massProductionType: "OUTSOURCING",
          massVendor: "(주)뉴몰드",
          currentStep: diagramItem.currentStep,
          stepStatus: "진행중",
          trialDegree: "T1 대기",
          trialCompletionRate: diagramItem.overallProgress,
          facilityEvent: "가동대기",
          orderQty: 10000,
          deliveredQty: 0,
          targetT1Date: diagramItem.targetT1Date,
          targetMassDate: "2026-11-30",
          updatedAt: diagramItem.updatedAt,
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-[95vw] 2xl:max-w-[1580px] rounded-xl shadow-2xl border overflow-hidden flex flex-col max-h-[94vh]">
              {/* 모달 상단 헤더 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 bg-[#1e293b] text-white border-b border-slate-700 gap-3">
                <div className="flex items-center gap-2.5">
                  <ListTree className="h-5 w-5 text-sky-400" />
                  <div>
                    <h3 className="font-bold text-sm">
                      프로젝트 0~13단계 상세 공정 관제
                    </h3>
                    <span className="text-[11px] text-slate-300">
                      [{curProject.projectNo}] {curProject.projectName} - {curProject.productName} ({curProject.customerName})
                    </span>
                  </div>
                </div>

                <button onClick={() => setIsDiagramModalOpen(false)} className="text-zinc-400 hover:text-white ml-2 cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* 모달 본문: 프로젝트 상세 공정 */}
              <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs bg-zinc-50/50 dark:bg-zinc-900/40">
                {/* 프로젝트 전환 드롭다운 */}
                <div className="flex flex-col gap-2.5 bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 font-medium shrink-0">대상 프로젝트:</span>
                    <select 
                      value={curProject.projectNo}
                      onChange={(e) => {
                        const found = projects.find((p) => p.projectNo === e.target.value);
                        if (found) setModalSelectedItem(found);
                      }}
                      className="flex-1 min-w-0 h-7 rounded border bg-white dark:bg-zinc-900 px-2 text-xs font-mono font-bold text-sky-600"
                    >
                      {manufactures.map((p) => (
                        <option key={`${p.id}-${p.projectNo}`} value={p.projectNo}>
                          [{p.projectNo}] {p.projectName} - {p.productName} ({p.customerName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-[11px] shrink-0">현재 상태:</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStepStatusBadge(curProject.stepStatus)}`}>
                        Step {curProject.currentStep} : {PROCESS_13_STEPS.find((s) => s.step === curProject.currentStep)?.name || "금형개발"} ({curProject.stepStatus})
                      </span>
                    </div>
                  </div>
                </div>

                {/* 마스터 요약 정보 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 bg-white dark:bg-zinc-900 p-3 rounded-lg border text-[11px]">
                  <div><span className="text-zinc-500">원청 고객사:</span> <b className="text-zinc-800 dark:text-zinc-200 ml-1">{curProject.customerName}</b></div>
                  <div><span className="text-zinc-500">제품명:</span> <b className="text-zinc-900 dark:text-zinc-100 ml-1 truncate">{curProject.productName}</b></div>
                  <div>
                    <span className="text-zinc-500">금형제작처:</span> 
                    <b className="text-purple-700 ml-1 font-bold">
                      {curProject.moldProductionType === "IN_HOUSE" ? "[자체] " : "[외주] "}{curProject.moldVendor}
                    </b>
                  </div>
                  <div>
                    <span className="text-zinc-500">사출양산처:</span> 
                    <b className="text-emerald-700 ml-1 font-bold">
                      {curProject.massProductionType === "IN_HOUSE" ? "[자체] " : "[외주] "}{curProject.massVendor}
                    </b>
                  </div>
                  <div><span className="text-zinc-500">캐비티/재질:</span> <b className="text-zinc-700 dark:text-zinc-300 ml-1">{curProject.cavity} / {curProject.material}</b></div>
                  <div><span className="text-zinc-500">현재 육성차수:</span> <b className="font-mono text-zinc-800 font-bold ml-1">{curProject.trialDegree}</b></div>
                  <div><span className="text-zinc-500">목표 T1 일정:</span> <b className="font-mono text-zinc-700 ml-1">{curProject.targetT1Date}</b></div>
                  <div><span className="text-zinc-500">목표 양산납품:</span> <b className="font-mono text-amber-600 ml-1">{curProject.targetMassDate}</b></div>
                </div>

                {/* 13단계 개별 카드 타임라인 그리드 */}
                <div className="flex flex-col gap-3 border rounded-xl p-4 bg-white dark:bg-zinc-900">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-sky-600" />
                      0~13단계 세부 공정 타임라인 (클릭 시 해당 화면으로 이동)
                    </h4>
                    <span className="text-[11px] text-zinc-500">
                      각 카드의 <b className="text-sky-600">[화면이동]</b>을 클릭하면 해당 실무 화면으로 직행합니다.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
                    {PROCESS_13_STEPS.map((item) => {
                      const isCurrent = item.step === curProject.currentStep;
                      const isCompleted = item.step < curProject.currentStep;
                      const dynamicActor = getStepActor(item.step, curProject);
                      const isExpanded = expandedStep === item.step;

                      return (
                        <div 
                          key={item.step}
                          className={`p-2.5 rounded-lg border flex flex-col justify-between transition-all ${
                            isCurrent
                              ? "bg-sky-50/80 border-sky-400 dark:bg-sky-950/40 shadow-xs ring-1 ring-sky-400"
                              : isCompleted
                              ? "bg-emerald-50/40 border-emerald-300 dark:bg-emerald-950/20"
                              : "bg-zinc-50/50 border-zinc-200 dark:bg-zinc-800/30 opacity-70"
                          }`}
                        >
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                                isCurrent
                                  ? "bg-sky-600 text-white"
                                  : isCompleted
                                  ? "bg-emerald-600 text-white"
                                  : "bg-zinc-300 text-zinc-700"
                              }`}>
                                Step {item.step}
                              </span>
                              <span className="text-[10px] text-zinc-400 truncate max-w-[70px]">
                                {dynamicActor}
                              </span>
                            </div>

                            <b className="text-zinc-900 dark:text-zinc-100 text-xs truncate" title={item.name}>
                              {item.name}
                            </b>

                            <p className="text-[10px] text-zinc-500 line-clamp-2">
                              {item.desc}
                            </p>
                          </div>

                          <div className="mt-2 pt-2 border-t flex items-center justify-between">
                            <span className={`text-[9px] font-bold ${
                              isCurrent ? "text-sky-600" : isCompleted ? "text-emerald-600" : "text-zinc-400"
                            }`}>
                              {isCurrent ? "진행 중" : isCompleted ? "완료" : "대기"}
                            </span>

                            <button
                              onClick={() => handleNavigateToStepPage(item.step, curProject.projectNo)}
                              className="text-[10px] text-sky-600 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                            >
                              화면이동
                              <ExternalLink className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 모달 하단 푸터 */}
              <div className="flex items-center justify-between px-5 py-3 bg-zinc-50 dark:bg-zinc-800 border-t">
                <span className="text-zinc-500 text-[11px]">
                  * MPSI 본사 SCM 종합 프로세스 관제 시스템
                </span>
                <Button onClick={() => setIsDiagramModalOpen(false)} variant="outline" className="h-8 px-4 text-xs cursor-pointer">
                  닫기
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
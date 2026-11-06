"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  FileCheck2, CheckCircle2, Clock, AlertTriangle, 
  Sparkles, X, Send, Eye, RefreshCw, Search,
  Upload, FileText, Check, ShieldAlert, Award,
  ArrowRight, FileSpreadsheet, Paperclip, CheckSquare,
  Download, FileArchive, Info, PlusCircle, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangeFilter, isWithinDateRange, DatePresetType } from "@/components/common/date-range-filter";
import { useAuthRole } from "@/lib/role-store";
import { sendAppNotification } from "@/lib/notification-store";
import { 
  useMassPpapStore, 
  PPAPApprovalItem, 
  PPAPPackageSubmissionHistoryItem,
  getMassPpapStatus 
} from "@/lib/mass-ppap-store";

export default function VendorMassPpapPage() {
  const { 
    items, 
    isLoading,
    refreshFromDb,
    submitPackageSubmission 
  } = useMassPpapStore();

  const { vendorName } = useAuthRole();
  const currentVendor = vendorName || "(주)뉴몰드";

  // 검색 및 필터 상태
  const [filterProjectNo, setFilterProjectNo] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePresetType>("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 실적 입력/서류 등록 모달 상태
  const [selectedItem, setSelectedItem] = useState<PPAPApprovalItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 신규 회차 등록 폼 상태
  const [newFileName, setNewFileName] = useState("");
  const [newFileSize, setNewFileSize] = useState("3.5 MB");
  const [newFileUrl, setNewFileUrl] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const [authorName, setAuthorName] = useState(currentVendor);
  const [vendorOpinion, setVendorOpinion] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // items 변경 시 열려 있는 모달의 selectedItem 동기화
  useEffect(() => {
    if (selectedItem) {
      const refreshed = items.find(i => i.id === selectedItem.id || i.projectNo === selectedItem.projectNo);
      if (refreshed) {
        setSelectedItem(refreshed);
      }
    }
  }, [items]);

  // 실제 스트리밍 파일 다운로드 함수
  const handleDownloadFile = async (fileName?: string, fileUrl?: string) => {
    if (!fileName) {
      alert("다운로드할 첨부파일이 없습니다.");
      return;
    }
    try {
      const url = fileUrl || `/api/v1/files/download?fileName=${encodeURIComponent(fileName)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.warn("Download fallback:", err);
      window.open(fileUrl || `/uploads/${encodeURIComponent(fileName)}`, "_blank");
    }
  };

  // 실제 물리 파일 업로드 핸들러
  const handleRealFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
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
        console.warn("File upload failed:", err);
      } finally {
        setIsUploading(false);
      }

      const sizeStr = file.size < 1024 * 1024
        ? `${Math.round(file.size / 1024)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

      setNewFileName(file.name);
      setNewFileSize(sizeStr);
      setNewFileUrl(uploadedUrl || `/api/v1/files/download?fileName=${encodeURIComponent(file.name)}`);
      showToast(`[${file.name}] 파일이 첨부되었습니다.`);
    }
  };

  // 외주처에 배정된 실제 프로젝트 목록 필터링 (더미 배제)
  const isMatchingVendor = (itemVendor: string, targetVendor: string) => {
    if (!itemVendor || !targetVendor) return false;
    const cleanItem = itemVendor.replace(/[\(\)\s]/g, "");
    const cleanTarget = targetVendor.replace(/[\(\)\s]/g, "");
    return cleanItem.includes(cleanTarget) || cleanTarget.includes(cleanItem);
  };

  const vendorItems = items.filter((item) => {
    if (
      item.projectName?.includes("현대 NT5") ||
      item.projectNo.includes("MI26001") ||
      item.projectNo.includes("MI26002") ||
      item.projectNo.includes("MI26003")
    ) {
      return false;
    }
    return isMatchingVendor(item.massVendor, currentVendor);
  });

  const filteredItems = vendorItems.filter((item) => {
    const status = getMassPpapStatus(item);
    const matchNo = filterProjectNo 
      ? (item.projectNo.toLowerCase().includes(filterProjectNo.toLowerCase()) || 
         item.partNo.toLowerCase().includes(filterProjectNo.toLowerCase()) ||
         item.productName.toLowerCase().includes(filterProjectNo.toLowerCase()) ||
         item.moldNo.toLowerCase().includes(filterProjectNo.toLowerCase()))
      : true;
    const matchStatus = filterStatus !== "ALL" ? status === filterStatus : true;
    const matchDate = isWithinDateRange(item.updatedAt, filterDateFrom, filterDateTo);
    return matchNo && matchStatus && matchDate;
  });

  // 실적/서류 등록 모달 열기
  const handleOpenEdit = (item: PPAPApprovalItem) => {
    setSelectedItem(item);
    const nextRound = (item.packageSubmissions?.length || 0) + 1;
    const now = new Date();
    const dateSimple = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    setNewFileName(`${dateSimple}.양산승인서류_${item.productName.replace(/[\/\\]/g, "_")}.pdf`);
    setNewFileSize("3.5 MB");
    setNewFileUrl("");
    setNewMemo(`${dateSimple.slice(2)}_양산승인서류 ${nextRound}차 등록`);
    setAuthorName(currentVendor);
    setVendorOpinion(item.vendorOpinion || "");
    setIsModalOpen(true);
  };

  // 신규 회차 서류 패키지 및 메모 제출
  const handleSubmitNewRound = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedItem) return;

    if (!newMemo.trim()) {
      alert("업무 이력 메모를 반드시 입력해 주세요.\n(예: 261010_양산승인서류 등록, 치수 및 Cpk 성적서 보완)");
      return;
    }

    const nextRound = (selectedItem.packageSubmissions?.length || 0) + 1;
    if (confirm(`[양산승인 패키지 서류 제출]\n\n프로젝트 [${selectedItem.projectNo}]의 ${nextRound}회차 양산 승인 통합 패키지를 MPSI 본사로 제출하시겠습니까?\n\n• 파일명: ${newFileName}\n• 업무 이력 메모: ${newMemo}\n• 작성 회사: ${authorName}\n\n* 제출된 파일과 메모는 시스템 DB에 저장됩니다.`)) {
      await submitPackageSubmission(selectedItem.id, {
        fileName: newFileName,
        fileSize: newFileSize,
        fileUrl: newFileUrl,
        authorName: authorName.trim() || currentVendor,
        memo: newMemo.trim(),
        vendorOpinion: vendorOpinion.trim(),
      });

      // MPSI 본사로 알림 발송
      sendAppNotification({
        menuName: "양산 승인 (PPAP)",
        menuPath: "/portal/mass-prod/ppap",
        senderCompany: currentVendor,
        content: `[${selectedItem.projectNo}] ${nextRound}회차 양산 승인 패키지 서류 제출: ${newMemo.trim()}`,
        projectNo: selectedItem.projectNo,
        targetRole: "MPSI",
      });

      setIsModalOpen(false);
      showToast(`[${selectedItem.projectNo}] ${nextRound}회차 양산 승인 서류 패키지가 MPSI 본사로 제출되었습니다.`);
    }
  };

  // 상태 뱃지 스타일
  const renderStatusBadge = (status: "검토 대기" | "검토 진행 중" | "승인완료") => {
    switch (status) {
      case "승인완료":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            승인완료
          </span>
        );
      case "검토 대기":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300">
            <Clock className="h-3 w-3 text-rose-600" />
            검토 대기
          </span>
        );
      case "검토 진행 중":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300">
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            검토 진행 중
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 숨겨진 실제 파일 업로드 input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleRealFileUpload}
        className="hidden"
        accept=".pdf,.xlsx,.xls,.dwg,.zip"
      />

      {/* 토스트 알림창 */}
      {toastMessage && (
        <div className="fixed top-4 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-xl bg-emerald-700 text-white text-xs font-medium animate-in fade-in">
          <Sparkles className="h-4 w-4" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-80 cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 1. 상단 안내 배너 */}
      <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2.5">
          <FileCheck2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <h3 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
              [{currentVendor}] 양산승인(PPAP) 서류 패키지 제출 및 승인 현황
            </h3>
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
              양산 승인 서류는 패키지(통합 파일)로 매 제출 시마다 첨부 저장되며, 수정본 첨부 시 기존 회차 이력도 함께 보존됩니다.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => refreshFromDb()}
            variant="outline"
            disabled={isLoading}
            size="sm"
            className="h-7 px-2.5 text-xs gap-1 border-emerald-400 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-zinc-800 font-semibold cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
            DB 동기화
          </Button>
          <span className="px-2.5 py-1 rounded bg-emerald-600/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
            사출양산 협력사 전용 창구
          </span>
        </div>
      </div>

      {/* 2. 검색 및 필터 바 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[220px] max-w-xs">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" />
            <Input 
              value={filterProjectNo} 
              onChange={(e) => setFilterProjectNo(e.target.value)} 
              placeholder="프로젝트 번호, 제품 품번, 제품명 검색..." 
              className="h-7 pl-8 text-xs font-mono" 
            />
          </div>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)} 
            className="h-7 rounded-md border bg-transparent px-2 text-xs font-medium"
          >
            <option value="ALL">전체 상태</option>
            <option value="검토 대기">검토 대기</option>
            <option value="검토 진행 중">검토 진행 중</option>
            <option value="승인완료">승인완료</option>
          </select>

          {/* 조회 기간 필터 */}
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

        <Button 
          onClick={() => { 
            setFilterProjectNo(""); 
            setFilterStatus("ALL"); 
            setFilterDateFrom("");
            setFilterDateTo("");
            setSelectedDatePreset("all");
          }} 
          variant="outline" 
          className="h-7 px-3 gap-1 text-xs text-zinc-600 cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          초기화
        </Button>
      </div>

      {/* 3. 메인 데이터 그리드 (실제 DB 데이터 바인딩) */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs overflow-hidden flex flex-col min-h-[440px]">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b">
          <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-100">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>[{currentVendor}] 양산승인(PPAP) 서류 패키지 관리 대상</span>
            <span className="text-[11px] font-normal text-zinc-500 ml-1">
              (총 <b className="text-emerald-600 font-mono">{filteredItems.length}</b>건)
            </span>
          </div>
          <span className="text-[11px] text-zinc-500">
            * 서류 제출 전 = <span className="text-rose-600 font-bold">검토 대기</span> | 승인 시 = <span className="text-emerald-600 font-bold">승인완료</span> | 나머지 = <span className="text-amber-600 font-bold">검토 진행 중</span>
          </span>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full border-collapse text-left border-spacing-0 whitespace-nowrap">
            <thead className="sticky top-0 bg-[#1e293b] text-white text-[11px] z-10">
              <tr>
                <th className="p-2.5 w-12 text-center border-r border-slate-700">No</th>
                <th className="p-2.5 border-r border-slate-700 min-w-[120px]">프로젝트 관리번호</th>
                <th className="p-2.5 border-r border-slate-700 min-w-[130px]">제품 품번</th>
                <th className="p-2.5 border-r border-slate-700 min-w-[180px]">제품명</th>
                <th className="p-2.5 border-r border-slate-700 min-w-[110px] text-center">금형번호</th>
                <th className="p-2.5 border-r border-slate-700 min-w-[110px] text-center">금형 제작처</th>
                <th className="p-2.5 border-r border-slate-700 min-w-[130px]">사출 호기</th>
                <th className="p-2.5 border-r border-slate-700 min-w-[110px] text-center">양산승인 상태</th>
                <th className="p-2.5 min-w-[130px] text-center">실적입력 / 서류등록</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px]">
              {filteredItems.map((row, idx) => {
                const status = getMassPpapStatus(row);
                return (
                  <tr key={row.id || row.projectNo} className="hover:bg-emerald-50/50 dark:hover:bg-zinc-800/60 transition-colors odd:bg-white even:bg-zinc-50/40 dark:odd:bg-zinc-900 dark:even:bg-zinc-900/50">
                    <td className="p-2.5 text-center font-mono text-zinc-400 border-r">{idx + 1}</td>
                    <td className="p-2.5 border-r font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {row.projectNo}
                    </td>
                    <td className="p-2.5 border-r font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                      {row.partNo}
                    </td>
                    <td className="p-2.5 border-r font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[200px]" title={row.productName}>
                      {row.productName}
                    </td>
                    <td className="p-2.5 border-r text-center font-mono font-bold text-blue-600 dark:text-blue-400">
                      {row.moldNo}
                    </td>
                    <td className="p-2.5 border-r text-center">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-medium dark:bg-blue-950/60 dark:text-blue-300">
                        {row.moldVendor}
                      </span>
                    </td>
                    <td className="p-2.5 border-r font-mono text-zinc-600 dark:text-zinc-400 truncate max-w-[130px]">
                      {row.machineNo}
                    </td>
                    <td className="p-2.5 border-r text-center">
                      {renderStatusBadge(status)}
                    </td>
                    <td className="p-2.5 text-center">
                      <Button 
                        onClick={() => handleOpenEdit(row)} 
                        size="xs" 
                        className={`h-6 px-3 text-[10px] gap-1 font-bold cursor-pointer ${
                          status === "승인완료"
                            ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border dark:bg-zinc-800 dark:text-zinc-200"
                            : status === "검토 대기"
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                      >
                        {status === "승인완료" ? (
                          <>
                            <Eye className="h-3 w-3 text-emerald-600" />
                            승인서 조회
                          </>
                        ) : status === "검토 대기" ? (
                          <>
                            <Upload className="h-3 w-3" />
                            서류등록
                          </>
                        ) : (
                          <>
                            <Upload className="h-3 w-3" />
                            실적/서류 등록
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-zinc-500">
                    현재 [{currentVendor}]에 배정된 PPAP 양산 승인 대상 프로젝트가 없습니다.
                    <br />
                    <span className="text-[11px] text-zinc-400 mt-1 block">
                      (MPSI 본사에서 시양산 승인이 완료되면 본 목록에 자동 등재됩니다.)
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. 실적 입력 및 양산 승인 서류 패키지 제출 모달 */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-xl shadow-2xl border overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#1e293b] text-white">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-sm">
                  [{currentVendor}] 양산승인(PPAP) 서류 패키지 제출 및 승인 현황 [{selectedItem.projectNo}]
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 overflow-y-auto text-xs">
              
              {/* 프로젝트 요약 정보 바 */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-zinc-50 dark:bg-zinc-800/60 p-3.5 rounded-lg border text-[11px]">
                <div>
                  <span className="text-zinc-500 block text-[10px]">프로젝트 관리번호</span>
                  <b className="font-mono text-emerald-700 dark:text-emerald-400 text-xs">{selectedItem.projectNo}</b>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">제품 품번</span>
                  <b className="font-mono text-zinc-900 dark:text-zinc-100 text-xs">{selectedItem.partNo}</b>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">제품명</span>
                  <b className="text-zinc-900 dark:text-zinc-100 truncate block text-xs" title={selectedItem.productName}>{selectedItem.productName}</b>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">금형번호 / 제작처</span>
                  <b className="font-mono text-blue-600 dark:text-blue-400 text-xs">{selectedItem.moldNo}</b>
                  <span className="text-zinc-500 ml-1">({selectedItem.moldVendor})</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">양산승인 상태</span>
                  <div className="mt-0.5">
                    {renderStatusBadge(getMassPpapStatus(selectedItem))}
                  </div>
                </div>
              </div>

              {/* 승인 완료 안내 */}
              {getMassPpapStatus(selectedItem) === "승인완료" && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg flex items-start gap-2.5 text-emerald-900 dark:text-emerald-200">
                  <Award className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold block text-xs">MPSI 공식 양산 승인(PPAP Pass) 완료</span>
                    <span className="text-[11px] leading-relaxed mt-0.5 block">
                      본 프로젝트는 12H 연속사출 및 양산 승인 서류 패키지 전 항목 적합 판정으로 최종 승인되었습니다.
                      완제품 구매 발주서 <b>[{selectedItem.partPoNo || "PO-2026-1015-01"}]</b>가 발급되어 정식 양산 납품이 승인되었습니다.
                    </span>
                  </div>
                </div>
              )}

              {/* 1. 양산 승인 서류 제출 및 승인 메뉴 */}
              <div className="border rounded-lg p-4 flex flex-col gap-3.5 bg-white dark:bg-zinc-900 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b">
                  <div className="flex items-center gap-2">
                    <FileArchive className="h-4 w-4 text-emerald-600" />
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      1. 양산 승인 서류 제출 및 승인
                    </h4>
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    * 양산 승인 서류는 <b>패키지(통합 파일)</b>로 관리되며, 매 제출 시마다 첨부 저장되고 기존 회차 이력도 함께 보존됩니다.
                  </span>
                </div>

                {/* 신규 회차 서류 패키지 업로드 및 업무 이력 메모 입력 폼 */}
                {getMassPpapStatus(selectedItem) !== "승인완료" ? (
                  <div className="p-3.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-1.5">
                        <PlusCircle className="h-3.5 w-3.5 text-emerald-600" />
                        [{(selectedItem.packageSubmissions?.length || 0) + 1}회차] 서류 패키지 신규 파일 첨부 및 업무 이력 메모 등록 (DB 연동)
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        작성 회사: {authorName} | 등록시간: 자동 기록
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                          <Paperclip className="h-3.5 w-3.5 text-emerald-600" />
                          양산 승인 통합 패키지 파일 첨부
                        </label>
                        <div className="flex items-center gap-2">
                          <Input 
                            value={newFileName} 
                            onChange={(e) => setNewFileName(e.target.value)} 
                            placeholder="파일을 선택하거나 파일명을 입력하세요" 
                            className="h-8 text-xs font-mono" 
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            disabled={isUploading}
                            className="h-8 px-2.5 text-xs shrink-0 gap-1 border-emerald-400 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="h-3.5 w-3.5" />
                            {isUploading ? "업로드중..." : "파일 선택"}
                          </Button>
                        </div>
                        <span className="text-[10px] text-zinc-500">
                          * 부품제출보증서(PSW), 치수검사 성적서, CPK 보고서, OQC 성적서, 마스터샘플 등록서 등 통합본
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                          2-5) 파일 업로드 시 업무 이력 메모 입력
                        </label>
                        <Input 
                          value={newMemo} 
                          onChange={(e) => setNewMemo(e.target.value)} 
                          placeholder="예: 261010_양산승인서류 등록, 치수검토보고서 및 Cpk 성적서 보완" 
                          className="h-8 text-xs" 
                        />
                        <span className="text-[10px] text-zinc-500">
                          작성 회사: <b className="text-zinc-700 dark:text-zinc-300">{authorName}</b> (DB에 시간과 함께 자동 보존)
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        onClick={() => handleSubmitNewRound()}
                        className="h-7 px-4 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" />
                        [{(selectedItem.packageSubmissions?.length || 0) + 1}회차] 서류 패키지 저장 및 MPSI 제출
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-300 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      양산 승인(Pass)이 최종 완료된 건으로, 모든 승인 패키지 서류와 이력이 기록되어 있습니다.
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      최종 승인 상태
                    </span>
                  </div>
                )}

                {/* 회차별 통합 패키지 서류 첨부 및 승인 이력 관리 */}
                <div className="flex flex-col gap-2.5 pt-1">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">
                    회차별 양산승인 서류 패키지 제출 및 심사 결과 이력 (누적 관리)
                  </span>

                  {(!selectedItem.packageSubmissions || selectedItem.packageSubmissions.length === 0) ? (
                    <div className="border border-dashed rounded-lg p-6 text-center text-zinc-400 bg-zinc-50/50 dark:bg-zinc-800/20">
                      <Clock className="h-6 w-6 mx-auto mb-1.5 text-zinc-300" />
                      <p className="font-medium text-xs text-zinc-600 dark:text-zinc-400">아직 제출된 양산 승인 서류 패키지가 없습니다.</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">상단의 신규 회차 등록 양식에서 서류를 첨부하여 제출해 주세요. (현재 상태: 검토 대기)</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {selectedItem.packageSubmissions.map((sub) => (
                        <div 
                          key={sub.round} 
                          className="border rounded-lg p-3 bg-zinc-50/70 dark:bg-zinc-800/40 hover:border-emerald-400/60 transition-all flex flex-col gap-2"
                        >
                          {/* 1행: 회차 및 파일 첨부 현황 */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-700/60 pb-2">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-slate-800 text-white dark:bg-slate-700">
                                {sub.round}회차
                              </span>
                              <span className="text-zinc-600 dark:text-zinc-300 text-xs">파일 첨부:</span>
                              <span 
                                className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-xs truncate max-w-md cursor-pointer hover:underline"
                                title={sub.fileName}
                                onClick={() => handleDownloadFile(sub.fileName, sub.fileUrl)}
                              >
                                {sub.fileName}
                              </span>
                              {sub.fileSize && (
                                <span className="text-[10px] text-zinc-500 font-mono">({sub.fileSize})</span>
                              )}
                              <Button 
                                variant="ghost" 
                                size="xs" 
                                className="h-6 px-1.5 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1 cursor-pointer font-semibold"
                                onClick={() => handleDownloadFile(sub.fileName, sub.fileUrl)}
                              >
                                <Download className="h-3 w-3" />
                                다운로드
                              </Button>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="px-2.5 py-1 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-200">
                                저장 / 제출
                              </span>

                              {sub.reviewStatus === "승인" ? (
                                <span className="px-3 py-1 rounded text-[11px] font-bold bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                                  <Check className="h-3.5 w-3.5" />
                                  결과 / 승인
                                </span>
                              ) : sub.reviewStatus === "반려" ? (
                                <span className="px-3 py-1 rounded text-[11px] font-bold bg-rose-600 text-white shadow-xs flex items-center gap-1">
                                  <X className="h-3.5 w-3.5" />
                                  결과 / 반려
                                </span>
                              ) : (
                                <span className="px-3 py-1 rounded text-[11px] font-bold bg-amber-500 text-white shadow-xs flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  결과 / 심사진행중
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 2행: 업무 이력 메모 */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] bg-white dark:bg-zinc-900/60 p-2 rounded border border-zinc-200 dark:border-zinc-800">
                            <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                              <span className="font-bold text-zinc-500 shrink-0">[업무 이력 메모]:</span>
                              <span className="font-semibold text-emerald-800 dark:text-emerald-300">{sub.authorName}:</span>
                              <span>{sub.memo}</span>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                              {sub.submittedAt}
                            </span>
                          </div>

                          {/* 3행: MPSI 심사 소견 및 반려 사유 */}
                          {sub.reviewComment && (
                            <div className={`text-[11px] px-2.5 py-1.5 rounded border flex items-start gap-1.5 ${
                              sub.reviewStatus === "승인"
                                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-800 dark:text-emerald-200"
                                : sub.reviewStatus === "반려"
                                ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 text-rose-800 dark:text-rose-200"
                                : "bg-sky-50 dark:bg-sky-950/30 border-sky-200 text-sky-800 dark:text-sky-200"
                            }`}>
                              <span className="font-bold shrink-0">
                                {sub.reviewStatus === "승인" ? "MPSI 승인 소견:" : sub.reviewStatus === "반려" ? "MPSI 보완/반려 사유:" : "MPSI 심사 현황:"}
                              </span>
                              <span className="flex-1">{sub.reviewComment}</span>
                              {sub.reviewedAt && (
                                <span className="text-[10px] opacity-75 font-mono shrink-0">({sub.reviewedAt})</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. 외주업체 종합 소견 및 전달사항 */}
              <div className="border rounded-lg p-3.5 bg-zinc-50 dark:bg-zinc-800/30 flex flex-col gap-1.5">
                <label className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">
                  2. [{currentVendor}] 담당자 종합 의견 및 MPSI 제출 소견
                </label>
                <textarea
                  value={vendorOpinion}
                  onChange={(e) => setVendorOpinion(e.target.value)}
                  disabled={getMassPpapStatus(selectedItem) === "승인완료"}
                  placeholder="양산성 검증 결과, 치수/외관 특이사항 및 MPSI로 전달할 종합 의견을 작성해 주세요."
                  className="w-full h-16 p-2 rounded-md border text-xs bg-white dark:bg-zinc-900 resize-none"
                />
              </div>

            </div>

            {/* 모달 푸터 버튼 */}
            <div className="flex items-center justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800 border-t">
              <Button onClick={() => setIsModalOpen(false)} variant="outline" className="h-8 px-4 text-xs cursor-pointer">
                닫기
              </Button>
              {getMassPpapStatus(selectedItem) !== "승인완료" ? (
                <Button
                  onClick={() => handleSubmitNewRound()}
                  className="h-8 px-5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-bold shadow-sm cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  MPSI 본사로 양산 승인 서류 제출
                </Button>
              ) : (
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  양산 승인(Pass) 확정 건
                </span>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

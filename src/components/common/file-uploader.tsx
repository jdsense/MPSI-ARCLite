"use client";

import React, { useRef, useState, useCallback, useId } from "react";
import { 
  UploadCloud, FileText, FileCode, FileSpreadsheet, 
  Box, Paperclip, Trash2, Download, ExternalLink, 
  CheckCircle2, AlertCircle, RefreshCw, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ----------------------------------------------------------------------
// 1. 공통 업로드 파일 메타데이터 인터페이스
// ----------------------------------------------------------------------
export interface UploadedFileInfo {
  id?: string;
  name: string;
  size?: string;              // 포맷된 용량 (예: "14.2 MB")
  sizeBytes?: number;         // 순수 바이트 수
  extension: string;          // 소문자 확장자 (dwg, stp, pdf, xlsx 등)
  url?: string;               // Blob URL 또는 스토리지 URL
  file?: File;                // 브라우저 File 인스턴스 (업로드 시)
  uploadedAt?: string;        // 업로드 일시 (YYYY-MM-DD HH:mm)
  uploader?: string;          // 업로더 성명/부서
  category?: string;          // 파일 카테고리 (예: "2D도면", "3D CAD", "성적서")
}

// ----------------------------------------------------------------------
// 2. 컴포넌트 Props
// ----------------------------------------------------------------------
export interface FileUploaderProps {
  /** 라벨 제목 */
  label?: string;
  /** 필수 여부 표시 (*) */
  required?: boolean;
  /** 허용 파일 확장자 (콤마 구분, 예: ".dwg,.pdf,.stp,.step,.x_t") */
  accept?: string;
  /** 최대 허용 파일 크기 (단위: MB, 기본값 50MB) */
  maxSizeMB?: number;
  /** 다중 파일 업로드 허용 여부 (기본 false) */
  multiple?: boolean;
  /** UI 렌더링 스타일: "dropzone" (기본 박스) | "card" (제조 도면 전용 카드) | "compact" (인라인 버튼) */
  variant?: "dropzone" | "card" | "compact";
  /** 전용 배지 문구 (예: "DWG / PDF", "STP / STEP") */
  badgeText?: string;
  /** 설명 또는 안내 문구 */
  description?: string;
  /** 현재 등록된 값 (문자열 파일명/URL 또는 UploadedFileInfo 객체/배열) */
  value?: string | UploadedFileInfo | (string | UploadedFileInfo)[];
  /** 단일 파일 변경 콜백 */
  onSingleChange?: (file: UploadedFileInfo | null) => void;
  /** 다중 파일 목록 변경 콜백 */
  onChange?: (files: UploadedFileInfo[]) => void;
  /** 파일 삭제 시 콜백 */
  onRemove?: (file: UploadedFileInfo, index: number) => void;
  /** 기본 업로더 성명 */
  uploaderName?: string;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 추가 클래스명 */
  className?: string;
}

// ----------------------------------------------------------------------
// 3. 파일 크기 및 확장자 유틸 함수
// ----------------------------------------------------------------------
export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "0 KB";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function extractExtension(filename: string): string {
  if (!filename) return "file";
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "file";
}

export function getFileTheme(ext: string) {
  const e = ext.toLowerCase();
  switch (e) {
    case "dwg":
    case "dxf":
      return {
        badgeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300",
        borderClass: "border-amber-400/60 bg-amber-50/20 dark:bg-amber-950/20",
        icon: FileCode,
        iconColor: "text-amber-600",
        label: "2D CAD 도면",
      };
    case "stp":
    case "step":
    case "x_t":
    case "catpart":
    case "iges":
      return {
        badgeClass: "bg-purple-600 text-white dark:bg-purple-700",
        borderClass: "border-purple-400/60 bg-purple-50/20 dark:bg-purple-950/20",
        icon: Box,
        iconColor: "text-purple-600",
        label: "3D CAD 솔리드 모델",
      };
    case "pdf":
      return {
        badgeClass: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300",
        borderClass: "border-rose-300/60 bg-rose-50/20 dark:bg-rose-950/20",
        icon: FileText,
        iconColor: "text-rose-600",
        label: "PDF 문서/성적서",
      };
    case "xlsx":
    case "xls":
    case "csv":
      return {
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300",
        borderClass: "border-emerald-300/60 bg-emerald-50/20 dark:bg-emerald-950/20",
        icon: FileSpreadsheet,
        iconColor: "text-emerald-600",
        label: "엑셀 시트",
      };
    default:
      return {
        badgeClass: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-zinc-800 dark:text-zinc-200",
        borderClass: "border-zinc-300 dark:border-zinc-700 bg-zinc-50/40 dark:bg-zinc-900/40",
        icon: Paperclip,
        iconColor: "text-sky-600",
        label: "첨부 파일",
      };
  }
}

// ----------------------------------------------------------------------
// 4. FileUploader 본체 컴포넌트
// ----------------------------------------------------------------------
export function FileUploader({
  label,
  required = false,
  accept,
  maxSizeMB = 50,
  multiple = false,
  variant = "dropzone",
  badgeText,
  description,
  value,
  onSingleChange,
  onChange,
  onRemove,
  uploaderName = "MPSI 담당자",
  disabled = false,
  className = "",
}: FileUploaderProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // value 정규화 -> UploadedFileInfo[]
  const parseValueToList = useCallback((): UploadedFileInfo[] => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.map((v, i) => {
        if (typeof v === "string") {
          return {
            id: `file-${i}`,
            name: v,
            extension: extractExtension(v),
            url: v.startsWith("http") || v.startsWith("blob:") ? v : undefined,
          };
        }
        return v;
      });
    }
    if (typeof value === "string") {
      return [{
        id: "file-single",
        name: value,
        extension: extractExtension(value),
        url: value.startsWith("http") || value.startsWith("blob:") ? value : undefined,
      }];
    }
    return [value];
  }, [value]);

  const fileList = parseValueToList();
  const currentSingle = fileList.length > 0 ? fileList[0] : null;

  // 허용 확장자 체크
  const isExtensionAllowed = (fileName: string): boolean => {
    if (!accept) return true;
    const allowed = accept
      .split(",")
      .map((item) => item.trim().toLowerCase().replace(/^\./, ""));
    const ext = extractExtension(fileName);
    return allowed.includes(ext);
  };

  // 파일 처리 및 상태 발행
  const handleFiles = (incomingFiles: FileList | null) => {
    if (!incomingFiles || incomingFiles.length === 0 || disabled) return;
    setErrorMessage(null);

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const now = new Date();
    const dateFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const newUploadedItems: UploadedFileInfo[] = [];

    for (let i = 0; i < incomingFiles.length; i++) {
      const f = incomingFiles[i];

      // 1. 크기 검증
      if (f.size > maxSizeBytes) {
        setErrorMessage(`파일 '${f.name}'의 크기(${formatBytes(f.size)})가 최대 허용치(${maxSizeMB} MB)를 초과했습니다.`);
        return;
      }

      // 2. 확장자 검증
      if (!isExtensionAllowed(f.name)) {
        setErrorMessage(`'${f.name}'은(는) 허용되지 않는 파일 형식입니다. (허용: ${accept})`);
        return;
      }

      const ext = extractExtension(f.name);
      const blobUrl = URL.createObjectURL(f);

      newUploadedItems.push({
        id: `${Date.now()}-${i}`,
        name: f.name,
        size: formatBytes(f.size),
        sizeBytes: f.size,
        extension: ext,
        url: blobUrl,
        file: f,
        uploadedAt: dateFormatted,
        uploader: uploaderName,
      });

      if (!multiple) break;
    }

    if (newUploadedItems.length === 0) return;

    if (multiple) {
      const merged = [...fileList, ...newUploadedItems];
      onChange?.(merged);
    } else {
      const single = newUploadedItems[0];
      onSingleChange?.(single);
      onChange?.([single]);
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // 동일 파일 재선택 가능하게 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveItem = (index: number) => {
    if (disabled) return;
    const target = fileList[index];
    const updated = fileList.filter((_, i) => i !== index);
    onRemove?.(target, index);
    onChange?.(updated);
    if (!multiple) {
      onSingleChange?.(null);
    }
  };

  // 다운로드/미리보기 처리
  const handleDownload = (item: UploadedFileInfo) => {
    if (item.url) {
      const link = document.createElement("a");
      link.href = item.url;
      link.download = item.name;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert(`[파일 다운로드 안내]\n파일명: ${item.name}\n실제 백엔드 스토리지 연동 시 다운로드가 시작됩니다.`);
    }
  };

  // ------------------------------------------------------------------
  // RENDER: 1) Card 모드 (도면/사양서 전용 카드)
  // ------------------------------------------------------------------
  if (variant === "card") {
    const ext = currentSingle ? currentSingle.extension : (accept?.split(",")[0]?.replace(".", "") || "file");
    const theme = getFileTheme(ext);
    const CardIcon = theme.icon;

    return (
      <div 
        className={`border rounded-lg p-3 transition-all flex flex-col justify-between gap-2.5 ${theme.borderClass} ${className}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          id={inputId}
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="hidden"
          onChange={handleFileInputChange}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200 text-xs">
            <CardIcon className={`h-4 w-4 ${theme.iconColor}`} />
            <span>{label || theme.label}</span>
            {required && <span className="text-rose-500 font-bold">*</span>}
          </div>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${theme.badgeClass}`}>
            {badgeText || accept?.replace(/\./g, "").toUpperCase() || "FILE"}
          </span>
        </div>

        {/* 파일 상태 영역 */}
        <div className="flex flex-col gap-1">
          {currentSingle ? (
            <div className="p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-1.5 truncate pr-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="font-mono text-[11px] font-bold text-zinc-900 dark:text-zinc-100 truncate" title={currentSingle.name}>
                  {currentSingle.name}
                </span>
                {currentSingle.size && (
                  <span className="text-[10px] text-zinc-500 shrink-0 font-mono">({currentSingle.size})</span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(currentSingle)}
                  className="text-zinc-400 hover:text-sky-600 p-1 cursor-pointer transition-colors"
                  title="다운로드 / 미리보기"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(0)}
                  disabled={disabled}
                  className="text-zinc-400 hover:text-rose-500 p-1 cursor-pointer transition-colors"
                  title="파일 제거"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div 
              onClick={() => !disabled && fileInputRef.current?.click()}
              className={`p-2.5 rounded border border-dashed text-center text-[10px] cursor-pointer transition-colors ${
                isDragging 
                  ? "border-sky-500 bg-sky-100/60 dark:bg-sky-950/60 text-sky-700" 
                  : "border-zinc-300 dark:border-zinc-700 bg-white/70 dark:bg-zinc-900/60 text-zinc-400 hover:border-sky-400 hover:text-sky-600"
              }`}
            >
              {isDragging ? "여기에 파일을 놓으세요" : description || "파일을 드래그하거나 클릭하여 업로드"}
            </div>
          )}
        </div>

        {/* 에러 메시지 */}
        {errorMessage && (
          <div className="flex items-center gap-1 text-[10.5px] text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 하단 액션 버튼 */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="h-6 flex-1 text-[10.5px] gap-1 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 shadow-2xs font-semibold"
          >
            <UploadCloud className="h-3 w-3" />
            <span>{currentSingle ? "파일 변경" : "파일 선택"}</span>
          </Button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // RENDER: 2) Compact 모드 (인라인 버튼 & 요약 알약)
  // ------------------------------------------------------------------
  if (variant === "compact") {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <input
          id={inputId}
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="hidden"
          onChange={handleFileInputChange}
        />

        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className="h-7 text-xs gap-1.5 bg-white dark:bg-zinc-800 hover:bg-sky-50 dark:hover:bg-zinc-700 border-zinc-300 dark:border-zinc-700 font-medium"
        >
          <UploadCloud className="h-3.5 w-3.5 text-sky-600" />
          <span>{label || "파일 첨부"}</span>
        </Button>

        {currentSingle && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-[11px] text-sky-800 dark:text-sky-300">
            <span className="font-mono font-bold">{currentSingle.name}</span>
            {currentSingle.size && <span className="text-[10px] text-zinc-500">({currentSingle.size})</span>}
            <button
              type="button"
              onClick={() => handleRemoveItem(0)}
              className="text-zinc-400 hover:text-rose-500 ml-0.5"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // ------------------------------------------------------------------
  // RENDER: 3) Dropzone 기본 모드 (풍부한 드래그앤드롭 박스)
  // ------------------------------------------------------------------
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <input
        id={inputId}
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="hidden"
        onChange={handleFileInputChange}
      />

      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={inputId} className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">
            {label}
            {required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
          {badgeText && (
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
              {badgeText}
            </span>
          )}
        </div>
      )}

      {/* 드롭 영역 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
          disabled 
            ? "bg-zinc-100 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 cursor-not-allowed opacity-60" 
            : isDragging
              ? "border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700"
              : "border-zinc-300 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-900/40 hover:border-sky-400 hover:bg-sky-50/20"
        }`}
      >
        <div className="p-2 rounded-full bg-white dark:bg-zinc-800 border shadow-2xs">
          <UploadCloud className="h-5 w-5 text-sky-600" />
        </div>
        <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          {isDragging ? "파일을 여기에 놓아주세요" : "클릭하여 파일을 선택하거나 여기로 드래그하세요"}
        </div>
        <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
          {description || `지원 형식: ${accept || "모든 파일"} (최대 ${maxSizeMB}MB)`}
        </div>
      </div>

      {/* 에러 메시지 */}
      {errorMessage && (
        <div className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 p-1.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 첨부된 파일 리스트 */}
      {fileList.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1">
          {fileList.map((item, idx) => {
            const theme = getFileTheme(item.extension);
            const ItemIcon = theme.icon;

            return (
              <div
                key={item.id || idx}
                className="flex items-center justify-between p-2 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:border-sky-300 transition-all text-xs shadow-2xs"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 ${theme.badgeClass}`}>
                    {item.extension.toUpperCase()}
                  </span>
                  <ItemIcon className={`h-4 w-4 shrink-0 ${theme.iconColor}`} />
                  <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate" title={item.name}>
                    {item.name}
                  </span>
                  {item.size && (
                    <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                      {item.size}
                    </span>
                  )}
                  {item.uploadedAt && (
                    <span className="text-[10px] font-mono text-zinc-400 hidden sm:inline shrink-0">
                      • {item.uploadedAt}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(item);
                    }}
                    className="p-1 text-zinc-400 hover:text-sky-600 rounded transition-colors cursor-pointer"
                    title="다운로드 / 열기"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveItem(idx);
                    }}
                    disabled={disabled}
                    className="p-1 text-zinc-400 hover:text-rose-500 rounded transition-colors cursor-pointer"
                    title="삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


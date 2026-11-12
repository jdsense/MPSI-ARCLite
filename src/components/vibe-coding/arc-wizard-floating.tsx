"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Sparkles, Bot, X, RotateCcw, Send, Check, MousePointerClick,
  Minimize2, Maximize2, Undo2, History, EyeOff, HelpCircle, FileCode2, AlertTriangle, Loader2,
  Settings, Key, Image as ImageIcon,
} from "lucide-react";
import { useAuthRole } from "@/lib/role-store";
import { parseCommand } from "@/lib/vibe-coding/command-parser";

/**
 * ARC-WIZARD (시스템 관리자 전용 화면 편집 어시스턴트)
 *
 * LLM 없이 동작하는 결정적 엔진:
 *  1) [요소 선택] → 화면에서 문구 클릭 → 새 문구 입력 → 소스 위치 확인(diff) → 적용
 *  2) 채팅 명령: "A"를 "B"로 바꿔줘 / A → B / "A" 컬럼 숨겨줘 / 되돌려줘 / 변경 이력
 *  3) 실제 src/ 소스 파일을 수정하고(next dev HMR로 화면 자동 갱신), 백업을 남겨 되돌리기 지원
 */

// ───────── 타입 ─────────
interface CandidateItem {
  file: string;
  line: number;
  col: number;
  text: string;
  lineText?: string;
  score?: number;
  to?: string; // LLM 제안 등 개별 치환값
}

type EditStatus = "pending" | "applying" | "applied" | "cancelled" | "error";

type BusyKind = "freeform" | "image" | "search" | "createPage" | "column" | "undo" | "config";

function getBusySteps(kind: BusyKind, targetLabel: string): { title: string; steps: string[] } {
  switch (kind) {
    case "image":
      return {
        title: "멀티모달 이미지·소스 분석 진행 중",
        steps: [
          "1. 보안 정책 및 아크위저드 수정 제한 규칙 검증",
          `2. 첨부 이미지 인코딩 및 현재 화면(${targetLabel}) DOM 스캔`,
          "3. AI 멀티모달 엔진 시각 요소·문구 대조 분석",
          "4. 변경 대상 소스 라인 매칭 및 Diff 제안 카드 생성",
        ],
      };
    case "search":
      return {
        title: "화면 문구 소스 위치 탐색 중",
        steps: [
          "1. 선택 문구 정규화 및 보안 가이드라인 확인",
          `2. 타겟 화면 소스(${targetLabel}) 및 공통 컴포넌트 스캔`,
          "3. 일치 후보 라인·컬럼 좌표 계산 및 우선순위 정렬",
        ],
      };
    case "createPage":
      return {
        title: "신규 메뉴 및 페이지 소스 생성 중",
        steps: [
          "1. 상위 메뉴 구조 분석 및 신규 라우트 경로 설계",
          "2. 페이지 컴포넌트(page.tsx) 표준 템플릿 소스 생성",
          "3. 사이드바 메뉴(app-sidebar.tsx) 및 레이아웃 등록",
        ],
      };
    case "column":
      return {
        title: "테이블 컬럼 표시/숨김 설정 반영 중",
        steps: [
          "1. 현재 화면 테이블 헤더(th) 컬럼 매칭 확인",
          "2. 전역 화면 오버라이드 설정(arc-wizard-overrides.json) 저장",
        ],
      };
    case "undo":
      return {
        title: "이전 소스 상태로 복원(Undo) 중",
        steps: [
          "1. 스냅샷 백업 이력(.arc-wizard/history) 조회",
          "2. 원본 소스 파일 복원 및 화면 상태 동기화",
        ],
      };
    case "config":
      return {
        title: "AI 엔진 설정 및 연결 상태 확인 중",
        steps: [
          "1. API 공급자 및 모델 설정값 검증",
          "2. AI 엔드포인트 응답 테스트 및 저장",
        ],
      };
    case "freeform":
    default:
      return {
        title: "프롬프트 분석 및 소스 코드 처리 중",
        steps: [
          "1. 보안 정책 및 아크위저드 보호 영역 검증",
          `2. 현재 화면 DOM 컨텍스트 및 타겟 소스(${targetLabel}) 스캔`,
          "3. AI 엔진 프롬프트 의도 분석 및 코드 탐색",
          "4. 소스 파일 라인·컬럼 매칭 및 수정안(Diff) 검증",
        ],
      };
  }
}

type Message =
  | { id: string; kind: "text"; sender: "ai" | "user"; text: string; tone?: "ok" | "warn" | "error" }
  | {
      id: string;
      kind: "edit";
      from: string;
      to: string;
      items: CandidateItem[];
      selected: string[]; // item key 목록
      status: EditStatus;
      historyId?: string;
      error?: string;
    };

// ───────── 유틸 ─────────
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const itemKey = (c: CandidateItem) => `${c.file}:${c.line}:${c.col}`;
const normalizeSpace = (s: string) => s.replace(/\s+/g, " ").trim();

/** 클릭한 요소에서 소스 검색용 문구 후보 추출 */
function extractTexts(el: Element): string[] {
  const out: string[] = [];
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.placeholder) out.push(el.placeholder);
    if (el instanceof HTMLInputElement && ["button", "submit"].includes(el.type) && el.value) out.push(el.value);
  }
  const direct = Array.from(el.childNodes)
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => (n.nodeValue || "").trim())
    .filter(Boolean);
  if (direct.length) {
    out.push(direct.join(""), direct.join(" "), ...direct);
  }
  const full = normalizeSpace(el.textContent || "");
  if (full && full.length <= 60) out.push(full);
  if (el.getAttribute("title")) out.push(el.getAttribute("title")!);

  const withVariants: string[] = [];
  for (const t of out) {
    withVariants.push(t);
    if (/[:：]$/.test(t)) withVariants.push(t.replace(/[:：]$/, "").trim());
  }
  return Array.from(new Set(withVariants)).filter((t) => t && !/^[\d\s.,:%/()\-+~]+$/.test(t));
}

function diffLines(c: CandidateItem, to: string) {
  const lineText = c.lineText ?? c.text;
  const col = c.lineText ? c.col : 0;
  const after = lineText.slice(0, col) + to + lineText.slice(col + c.text.length);
  const clip = (s: string) => {
    const t = s.trim();
    if (t.length <= 150) return t;
    const lead = s.length - s.trimStart().length;
    const start = Math.max(0, col - lead - 60);
    return (start > 0 ? "…" : "") + t.slice(start, start + 150) + "…";
  };
  return { before: clip(lineText), after: clip(after) };
}

/** 현재 브라우저 화면에 렌더링된 실시간 DOM 요소 스냅샷 추출 */
function captureScreenContext() {
  if (typeof document === "undefined") return undefined;
  const pickTexts = (selector: string, max = 15): string[] => {
    const out: string[] = [];
    document.querySelectorAll(selector).forEach((el) => {
      if (el.closest(".arc-wizard-root")) return;
      const t = normalizeSpace(el.textContent || "");
      if (t && t.length >= 1 && t.length <= 50 && !out.includes(t)) out.push(t);
    });
    return out.slice(0, max);
  };
  const inputs: string[] = [];
  document.querySelectorAll("input, select, textarea").forEach((el) => {
    if (el.closest(".arc-wizard-root")) return;
    if (el instanceof HTMLInputElement && el.placeholder && !inputs.includes(el.placeholder)) {
      inputs.push(el.placeholder);
    }
  });
  let tableRowCount = 0;
  document.querySelectorAll("table tbody tr").forEach((tr) => {
    if (!tr.closest(".arc-wizard-root")) tableRowCount++;
  });
  return {
    headings: pickTexts("h1, h2, h3, h4, [class*='font-bold']", 8),
    labels: pickTexts("label, span.font-bold, span.font-semibold", 14),
    buttons: pickTexts("button", 14),
    inputs: inputs.slice(0, 10),
    tableColumns: pickTexts("table th", 20),
    tableRowCount,
  };
}

const HELP_TEXT = `사용 방법

1) 🎯 [요소 선택] 버튼 → 화면에서 바꿀 글자를 클릭 → 새 문구 입력 → 위치 확인 후 [적용]
2) 채팅으로 지시:
  • "구분" 을 "구분 필터" 로 바꿔줘
  • 조회 기간 → 기간
  • "고객사" 컬럼 숨겨줘  /  "고객사" 컬럼 다시 보여줘
  • 숨김 컬럼 목록 · 변경 이력 · 되돌려줘
  • 자유 지시 및 이미지(Ctrl+V 붙여넣기/첨부) 기반 소스 수정 제안

🔒 [보안 및 제약 사항]
  1. 아크위저드를 이용하여 아크위저드 관련 소스 코드는 수정할 수 없습니다.
  2. 보안사항을 위배하는 코드(권한/인증 우회, 키/환경변수 노출, 악성 스크립트 실행 등)는 실행할 수 없습니다.`;

/** 클라이언트 측 프롬프트 보안 정책 사전 검증 */
function checkClientSecurityPolicy(text: string): string | null {
  const t = (text || "").trim();
  if (!t) return null;

  // 1. 아크위저드 관련 소스코드 수정 시도 차단
  const mentionsArcWizard = /(아크\s*위저드|아크\s*워저드|arc[-_\s]*wizard|vibe[-_\s]*coding|source[-_\s]*editor|command[-_\s]*parser|ArcWizardFloating)/i.test(t);
  const hasModifyIntent = /(수정|변경|바꿔|고쳐|삭제|지워|추가|제거|무력화|우회|주석|편집|해제|열어|노출|보여)/i.test(t);
  if (mentionsArcWizard && hasModifyIntent) {
    return "🚫 [보안 정책 차단] 아크위저드를 이용하여 아크위저드 관련 소스 코드는 수정할 수 없습니다.";
  }

  // 2. 보안사항 위배 프롬프트/코드 차단
  if (/(권한\s*우회|로그인\s*우회|인증\s*우회|인증\s*무시|권한\s*체크\s*제거|권한\s*검증\s*삭제|403\s*해제|모든\s*권한\s*허용)/i.test(t)) {
    return "🚫 [보안 정책 차단] 보안사항을 위배하는 코드(권한 및 인증 검증 우회)는 실행할 수 없습니다.";
  }
  if (/(비밀번호\s*노출|패스워드\s*노출|비밀번호\s*탈취|api\s*키\s*노출|api\s*key.*노출|환경\s*변수.*출력|process\.env|\.env\s*파일)/i.test(t)) {
    return "🚫 [보안 정책 차단] 보안사항을 위배하는 코드(API 키·비밀번호·환경변수 노출)는 실행할 수 없습니다.";
  }
  if (/(\beval\s*\(|new\s+Function|dangerouslySetInnerHTML|\binnerHTML\s*=|document\.cookie|child_process|execSync|spawnSync|DROP\s+TABLE|TRUNCATE\s+TABLE|<\s*script\b|javascript\s*:)/i.test(t)) {
    return "🚫 [보안 정책 차단] 보안사항을 위배하는 코드(동적 스크립트 실행, 시스템 명령, XSS, DB 파괴 등)는 실행할 수 없습니다.";
  }

  return null;
}

// ───────── 컴포넌트 ─────────
export function ArcWizardFloating() {
  const pathname = usePathname();
  const { role } = useAuthRole();
  const isAdmin = role === "ADMIN";

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyKind, setBusyKind] = useState<BusyKind>("freeform");
  const [busyStepIdx, setBusyStepIdx] = useState(0);
  const [busyElapsedMs, setBusyElapsedMs] = useState(0);
  const [picking, setPicking] = useState(false);
  const [hoverBox, setHoverBox] = useState<{ top: number; left: number; width: number; height: number; label: string } | null>(null);
  const [pageFile, setPageFile] = useState<string | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [llmEnabled, setLlmEnabled] = useState(true);
  const [aiModel, setAiModel] = useState("gemini-3.8-flash");
  const [aiProvider, setAiProvider] = useState<"auto" | "gemini" | "vertex" | "openai-compatible" | "anthropic">("gemini");
  const [maskedKey, setMaskedKey] = useState("");
  const [aiBaseUrl, setAiBaseUrl] = useState("");
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [formProvider, setFormProvider] = useState<"auto" | "gemini" | "vertex" | "openai-compatible" | "anthropic">("gemini");
  const [formModel, setFormModel] = useState("gemini-3.8-flash");
  const [formApiKey, setFormApiKey] = useState("");
  const [formBaseUrl, setFormBaseUrl] = useState("");
  const [aiTestMsg, setAiTestMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [attachedImage, setAttachedImage] = useState<{ name: string; dataUrl: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { id: "init", kind: "text", sender: "ai", text: `안녕하세요, ARC-WIZARD 입니다.\n\n${HELP_TEXT}` },
  ]);
  const endRef = useRef<HTMLDivElement | null>(null);

  const push = useCallback((m: Message) => setMessages((prev) => [...prev, m]), []);
  const say = useCallback(
    (text: string, tone?: "ok" | "warn" | "error") => push({ id: uid(), kind: "text", sender: "ai", text, tone }),
    [push]
  );
  const updateEdit = useCallback(
    (id: string, patch: Partial<Extract<Message, { kind: "edit" }>>) =>
      setMessages((prev) => prev.map((m) => (m.id === id && m.kind === "edit" ? { ...m, ...patch } : m))),
    []
  );

  const api = useCallback(
    async (action: string, payload: Record<string, unknown> = {}) => {
      const res = await fetch("/api/v1/vibe-coding/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-arc-wizard-role": "ADMIN" },
        body: JSON.stringify({ action, pathname, ...payload }),
      });
      const data = await res.json().catch(() => ({ ok: false, error: `서버 응답 오류 (${res.status})` }));
      if (!res.ok && data.ok !== false) data.ok = false;
      if (data?.usage && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("arc-wizard-usage-updated", { detail: data.usage }));
      }
      return data;
    },
    [pathname]
  );

  // 화면 정보 및 AI 설정 로드
  useEffect(() => {
    if (!isAdmin || !isOpen) return;
    api("info").then((d) => {
      if (d.ok) {
        setPageFile(d.pageFile);
        setHiddenColumns(d.hiddenColumns || []);
        setLlmEnabled(Boolean(d.llmEnabled));
        if (d.aiConfig) {
          setAiProvider(d.aiConfig.provider || "auto");
          setAiModel(d.aiConfig.model || "gemini-3.8-flash");
          setMaskedKey(d.aiConfig.maskedKey || "");
          setAiBaseUrl(d.aiConfig.baseUrl || "");
          setFormProvider(d.aiConfig.provider || "gemini");
          setFormModel(d.aiConfig.model || "gemini-3.8-flash");
          setFormBaseUrl(d.aiConfig.baseUrl || "");
        }
      } else if (d.error) {
        say(`⚠️ ${d.error}`, "warn");
      }
    });
  }, [isAdmin, isOpen, pathname, api, say]);

  useEffect(() => {
    if (isOpen) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, busy, busyStepIdx]);

  // 처리 단계 진행 타이머 (사용자에게 현재 어떤 과정이 진행 중인지 단계별로 표시)
  useEffect(() => {
    if (!busy) {
      setBusyStepIdx(0);
      setBusyElapsedMs(0);
      return;
    }
    const startedAt = Date.now();
    const { steps } = getBusySteps(busyKind, pageFile || pathname || "현재 화면");
    const maxIdx = Math.max(0, steps.length - 1);

    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setBusyElapsedMs(elapsed);
      // 경과 시간에 따라 단계 자동 전환 (0s -> 0, 0.6s -> 1, 1.5s -> 2, 3.0s -> 3)
      const nextIdx =
        elapsed < 600 ? 0 : elapsed < 1500 ? Math.min(1, maxIdx) : elapsed < 3000 ? Math.min(2, maxIdx) : maxIdx;
      setBusyStepIdx(nextIdx);
    }, 200);

    return () => window.clearInterval(timer);
  }, [busy, busyKind, pageFile, pathname, llmEnabled, aiModel]);

  // ───── 문구 변경 흐름 ─────
  const startRename = useCallback(
    async (texts: string[], to: string) => {
      setBusyKind("search");
      setBusy(true);
      try {
        const d = await api("search", { texts });
        if (!d.ok) return say(`❌ 검색 실패: ${d.error}`, "error");
        if (!d.candidates?.length) {
          return say(
            `소스 코드에서 [${texts[0]}] 문구를 찾지 못했습니다.\n\n가능한 원인:\n• DB에서 불러온 데이터 값(소스 코드가 아님)\n• 여러 조각으로 나뉘어 조합된 문구 (예: {변수}건)\n• 이미 다른 문구로 변경됨\n\n화면의 문구를 정확히 입력하거나 🎯 요소 선택을 이용해 보세요.`,
            "warn"
          );
        }
        const items: CandidateItem[] = d.candidates;
        const minScore = Math.min(...items.map((c) => c.score ?? 3));
        const preferred = items.filter((c) => (c.score ?? 3) === minScore);
        push({
          id: uid(),
          kind: "edit",
          from: d.matchedText,
          to,
          items,
          selected: (preferred.length <= 5 ? preferred : preferred.slice(0, 1)).map(itemKey),
          status: "pending",
        });
      } finally {
        setBusy(false);
      }
    },
    [api, push, say]
  );

  const applyEdit = useCallback(
    async (msg: Extract<Message, { kind: "edit" }>) => {
      const chosen = msg.items.filter((c) => msg.selected.includes(itemKey(c)));
      if (!chosen.length) return updateEdit(msg.id, { error: "적용할 위치를 1개 이상 선택하세요." });
      const missingTo = chosen.some((c) => !(c.to ?? msg.to).trim());
      if (missingTo) return updateEdit(msg.id, { error: "새 문구를 입력하세요." });

      updateEdit(msg.id, { status: "applying", error: undefined });
      const d = await api("apply", {
        summary: `[${msg.from}] → [${msg.to || "(제안값)"}]`,
        edits: chosen.map((c) => ({ file: c.file, line: c.line, col: c.col, from: c.text, to: c.to ?? msg.to })),
      });
      if (!d.ok) return updateEdit(msg.id, { status: "error", error: d.error });
      updateEdit(msg.id, { status: "applied", historyId: d.historyId });
      say(`✅ 소스 ${chosen.length}곳 수정 완료\n${(d.files as string[]).map((f) => `• ${f}`).join("\n")}\n\n개발 서버가 변경을 감지해 화면이 자동으로 갱신됩니다.`, "ok");
    },
    [api, say, updateEdit]
  );

  const undo = useCallback(
    async (id?: string) => {
      setBusyKind("undo");
      setBusy(true);
      try {
        const d = await api("undo", id ? { id } : {});
        if (!d.ok) return say(`❌ 되돌리기 실패: ${d.error}`, "error");
        say(`↩️ 되돌리기 완료: ${d.summary}\n${(d.files as string[]).map((f) => `• ${f}`).join("\n")}`, "ok");
        setMessages((prev) => prev.map((m) => (m.kind === "edit" && m.historyId === d.id ? { ...m, status: "cancelled" } : m)));
        const info = await api("info");
        if (info.ok) setHiddenColumns(info.hiddenColumns || []);
      } finally {
        setBusy(false);
      }
    },
    [api, say]
  );

  const toggleColumn = useCallback(
    async (column: string, hidden: boolean) => {
      if (hidden) {
        const exists = Array.from(document.querySelectorAll("th")).some((th) => {
          if (th.closest(".arc-wizard-root")) return false;
          const t = normalizeSpace(th.textContent || "");
          return t === column || (column.length >= 2 && t.startsWith(column));
        });
        if (!exists) return say(`현재 화면의 테이블에서 [${column}] 컬럼 헤더를 찾지 못했습니다. 헤더 문구를 정확히 입력해 주세요.`, "warn");
      }
      setBusyKind("column");
      setBusy(true);
      try {
        const d = await api("hideColumn", { column, hidden });
        if (!d.ok) return say(`❌ 실패: ${d.error}`, "error");
        setHiddenColumns(d.hiddenColumns || []);
        if (!d.changed) return say(`[${column}] 컬럼은 이미 ${hidden ? "숨김" : "표시"} 상태입니다.`);
        say(`✅ [${column}] 컬럼 ${hidden ? "숨김" : "표시"} 설정 저장 완료\n• src/config/arc-wizard-overrides.json\n\n모든 사용자 화면에 동일하게 적용됩니다. ("되돌려줘"로 취소 가능)`, "ok");
      } finally {
        setBusy(false);
      }
    },
    [api, say]
  );

  const loadImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) return say("이미지 파일만 첨부할 수 있습니다.", "warn");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = String(ev.target?.result || "");
      if (dataUrl) setAttachedImage({ name: file.name || "clipboard-image.png", dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const f = items[i].getAsFile();
        if (f) {
          loadImageFile(f);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleSaveAiConfig = async () => {
    setBusyKind("config");
    setBusy(true);
    setAiTestMsg(null);
    try {
      const payload: Record<string, unknown> = {
        provider: formProvider,
        model: formModel.trim() || "gemini-2.5-flash",
        baseUrl: formBaseUrl.trim(),
      };
      if (formApiKey.trim()) payload.apiKey = formApiKey.trim();
      const d = await api("saveAiConfig", payload);
      if (!d.ok) {
        setAiTestMsg({ ok: false, text: `저장 실패: ${d.error}` });
        return;
      }
      setLlmEnabled(Boolean(d.llmEnabled));
      if (d.aiConfig) {
        setAiProvider(d.aiConfig.provider);
        setAiModel(d.aiConfig.model);
        setMaskedKey(d.aiConfig.maskedKey);
        setAiBaseUrl(d.aiConfig.baseUrl || "");
      }
      setFormApiKey("");
      setIsAiModalOpen(false);
      say(`✅ AI 엔진 설정 저장 완료\n• 모델: ${d.aiConfig?.model}\n• 공급자: ${d.aiConfig?.provider}\n• API 키: ${d.llmEnabled ? "보안 키 적용됨 (비공개)" : "(미설정)"}`, "ok");
    } finally {
      setBusy(false);
    }
  };

  const handleTestAi = async () => {
    setBusyKind("config");
    setBusy(true);
    setAiTestMsg({ text: "AI 모델 연결 테스트 중..." });
    try {
      // 입력 중인 폼 값이 있으면 먼저 저장 후 테스트
      const payload: Record<string, unknown> = {
        provider: formProvider,
        model: formModel.trim() || "gemini-2.5-flash",
        baseUrl: formBaseUrl.trim(),
      };
      if (formApiKey.trim()) payload.apiKey = formApiKey.trim();
      await api("saveAiConfig", payload);
      const d = await api("testAi");
      if (!d.ok) {
        setAiTestMsg({ ok: false, text: `❌ 연결 실패:\n${d.error}` });
      } else {
        setAiTestMsg({ ok: true, text: `✅ 연결 성공! [${d.endpoint}]\n응답: ${d.reply}` });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCommand = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      const img = attachedImage;
      if (!text && !img) return;
      push({
        id: uid(),
        kind: "text",
        sender: "user",
        text: img ? `${text || "(이미지 분석 요청)"}\n📎 [이미지: ${img.name}]` : text,
      });
      setInput("");
      setAttachedImage(null);

      // 프롬프트 보안 정책 사전 검증 (아크위저드 자기 수정 금지 & 보안 위배 코드 실행 금지)
      const secBlock = checkClientSecurityPolicy(text);
      if (secBlock) {
        return say(secBlock, "error");
      }

      // 이미지가 첨부된 경우 AI 멀티모달 분석 우선 실행
      if (img) {
        if (!llmEnabled) return say("⚠️ 이미지를 분석하려면 ⚙️ AI 설정에서 API 키를 설정해 주세요.", "warn");
        setBusyKind("image");
        setBusy(true);
        try {
          const d = await api("freeform", {
            instruction: text,
            imageDataUrl: img.dataUrl,
            screenContext: captureScreenContext(),
          });
          if (d.ok && d.edits?.length) {
            if (d.reply) say(`🤖 ${d.reply}`);
            const items: CandidateItem[] = d.edits.map((e: { file: string; line: number; col: number; from: string; to: string }) => ({ ...e, text: e.from }));
            return push({ id: uid(), kind: "edit", from: "AI 제안", to: "", items, selected: items.map(itemKey), status: "pending" });
          }
          if (d.ok && d.reply) return say(d.reply);
          return say(`이미지에서 적용 가능한 문구 변경안을 찾지 못했습니다.${d.error ? `\n(${d.error})` : ""}`, "warn");
        } finally {
          setBusy(false);
        }
      }

      const cmd = parseCommand(text);

      switch (cmd.type) {
        case "createPage": {
          setBusyKind("createPage");
          setBusy(true);
          try {
            const d = await api("createPage", {
              parentMenu: cmd.parentMenu,
              pageTitle: cmd.pageTitle,
            });
            if (!d.ok) return say(`❌ 페이지 생성 실패: ${d.error}`, "error");
            return say(
              `✅ **좌측 메뉴 [${d.parentMenu}] 하위에 [${d.pageTitle}] 페이지를 생성했습니다!**\n\n• **접속 경로**: \`${d.routeUrl}\`\n• **생성된 페이지 파일**: \`${d.pageFile}\`\n• **수정된 메뉴/레이아웃**:\n  - \`src/components/app-sidebar.tsx\`\n  - \`src/app/portal/layout.tsx\`\n\n좌측 메뉴의 **[${d.parentMenu}]**를 펼쳐 **[${d.pageTitle}]**을 클릭해 이동하실 수 있습니다. ("되돌려줘"를 입력하면 생성된 페이지와 메뉴가 원복됩니다)`,
              "ok"
            );
          } finally {
            setBusy(false);
          }
        }
        case "rename":
          return startRename([cmd.from, ...(/[:：]$/.test(cmd.from) ? [] : [`${cmd.from}:`])], cmd.to);
        case "hide":
          return toggleColumn(cmd.column, true);
        case "show":
          return toggleColumn(cmd.column, false);
        case "undo":
          return undo();
        case "listHidden":
          return say(hiddenColumns.length ? `현재 화면 숨김 컬럼:\n${hiddenColumns.map((c) => `• ${c}`).join("\n")}` : "현재 화면에 숨김 처리된 컬럼이 없습니다.");
        case "history": {
          const d = await api("history");
          if (!d.ok) return say(`❌ ${d.error}`, "error");
          const list = d.history as { id: string; createdAt: string; summary: string; files: string[] }[];
          return say(
            list.length
              ? `최근 변경 이력 (최신순):\n${list.map((h, i) => `${i + 1}. ${new Date(h.createdAt).toLocaleString("ko-KR")}  ${h.summary}\n   ${h.files.join(", ")}`).join("\n")}`
              : "변경 이력이 없습니다."
          );
        }
        case "help":
          return say(HELP_TEXT);
        default: {
          setBusyKind("freeform");
          setBusy(true);
          try {
            const d = await api("freeform", {
              instruction: text,
              screenContext: captureScreenContext(),
            });
            if (d.ok && d.edits?.length) {
              if (d.reply) say(`🤖 ${d.reply}`);
              const items: CandidateItem[] = d.edits.map((e: { file: string; line: number; col: number; from: string; to: string }) => ({ ...e, text: e.from }));
              return push({ id: uid(), kind: "edit", from: "AI 제안", to: "", items, selected: items.map(itemKey), status: "pending" });
            }
            if (d.ok && d.reply) {
              return say(d.reply);
            }
            return say(
              `요청하신 내용에서 변경할 소스 위치를 특정하지 못했습니다.${d.error ? `\n(${d.error})` : ""}\n\n💡 팁:\n• 🎯 [요소 선택해서 문구 바꾸기] 버튼으로 화면의 글자를 직접 클릭하거나,\n• '"구분:"을 "구분 필터:"로 바꿔줘' 처럼 화면에 보이는 문구를 지정해 보세요.`,
              "warn"
            );
          } finally {
            setBusy(false);
          }
        }
      }
    },
    [aiModel, api, attachedImage, hiddenColumns, llmEnabled, push, say, startRename, toggleColumn, undo]
  );

  // ───── 화면 요소 선택 모드 ─────
  useEffect(() => {
    if (!picking) return;
    const isOwn = (el: Element | null) => !!el?.closest(".arc-wizard-root");

    const onMove = (e: MouseEvent) => {
      const el = e.target as Element | null;
      if (!el || isOwn(el)) return setHoverBox(null);
      const r = el.getBoundingClientRect();
      const label = extractTexts(el)[0] || "(문구 없음)";
      setHoverBox({ top: r.top, left: r.left, width: r.width, height: r.height, label });
    };
    const block = (e: Event) => {
      const el = e.target as Element | null;
      if (isOwn(el)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    const onClick = (e: MouseEvent) => {
      const el = e.target as Element | null;
      if (!el || isOwn(el)) return;
      e.preventDefault();
      e.stopPropagation();
      setPicking(false);
      setHoverBox(null);
      const texts = extractTexts(el);
      if (!texts.length) return say("선택한 요소에서 문구를 찾지 못했습니다. 글자 위를 정확히 클릭해 주세요.", "warn");
      push({ id: uid(), kind: "text", sender: "user", text: `🎯 선택한 문구: "${texts[0]}"` });
      startRename(texts, "");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPicking(false);
        setHoverBox(null);
      }
    };

    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("pointerdown", block, true);
    document.addEventListener("mousedown", block, true);
    document.addEventListener("mouseup", block, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKey, true);
    document.body.style.cursor = "crosshair";
    return () => {
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("pointerdown", block, true);
      document.removeEventListener("mousedown", block, true);
      document.removeEventListener("mouseup", block, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKey, true);
      document.body.style.cursor = "";
    };
  }, [picking, push, say, startRename]);

  const resetChat = () => setMessages([{ id: uid(), kind: "text", sender: "ai", text: "대화를 초기화했습니다. 🎯 요소 선택 또는 명령을 입력하세요." }]);

  // 시스템 관리자만 노출 (훅 호출 이후에 판단해야 React 훅 규칙 위반이 없음)
  if (!isAdmin) return null;

  return (
    <>
      {/* 요소 선택 하이라이트 */}
      {picking && hoverBox && (
        <div
          className="pointer-events-none fixed z-[9998] rounded border-2 border-sky-400 bg-sky-400/10"
          style={{ top: hoverBox.top - 2, left: hoverBox.left - 2, width: hoverBox.width + 4, height: hoverBox.height + 4 }}
        >
          <span className="absolute -top-6 left-0 max-w-[320px] truncate rounded bg-sky-600 px-1.5 py-0.5 text-[11px] font-semibold text-white shadow">
            {hoverBox.label}
          </span>
        </div>
      )}
      {picking && (
        <div className="arc-wizard-root fixed top-4 left-1/2 z-[9999] -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs text-white shadow-xl border border-sky-500/50 flex items-center gap-3">
          <MousePointerClick className="h-4 w-4 text-sky-400" />
          바꿀 글자를 클릭하세요 (ESC 취소)
          <button onClick={() => { setPicking(false); setHoverBox(null); }} className="rounded bg-slate-700 px-2 py-0.5 hover:bg-slate-600">취소</button>
        </div>
      )}

      <div className="arc-wizard-root fixed bottom-6 right-6 z-50 flex flex-col items-end">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) loadImageFile(f);
            e.target.value = "";
          }}
        />

        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group flex items-center gap-2.5 px-4 py-3 rounded-full bg-slate-950 text-white shadow-2xl border border-sky-500/40 hover:border-sky-400 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title="ARC-WIZARD 화면 편집 어시스턴트"
          >
            <Sparkles className="h-5 w-5 text-sky-400" />
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-wider text-sky-300">ARC-WIZARD</span>
              </div>
              <span className="text-[10px] text-zinc-400 -mt-0.5">화면 편집 (관리자)</span>
            </div>
          </button>
        )}

        {isOpen && (
          <div
            className={`flex flex-col rounded-2xl bg-[#091122] text-zinc-100 shadow-2xl border border-blue-500/30 overflow-hidden transition-all ${
              isMinimized ? "w-[360px] h-[52px]" : "w-[440px] sm:w-[520px] h-[640px] max-h-[88vh]"
            }`}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#0c1836] border-b border-blue-900/60 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="h-4 w-4 text-sky-400 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-black text-xs text-white tracking-wide">ARC-WIZARD</span>
                    <span className="text-[9px] px-1 rounded bg-blue-950 text-blue-300 border border-blue-800 font-mono">ADMIN</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAiTestMsg(null);
                        setIsAiModalOpen(true);
                      }}
                      className={`text-[9px] px-1.5 py-0.2 rounded border font-mono cursor-pointer transition-colors ${
                        llmEnabled
                          ? "bg-emerald-950 text-emerald-300 border-emerald-700 hover:bg-emerald-900"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700"
                      }`}
                      title="클릭하여 AI 모델/API 키 설정 변경"
                    >
                      {llmEnabled ? "⚡ AI 엔진" : "규칙 엔진"}
                    </button>
                  </div>
                  <span className="text-[10px] text-blue-200/80 truncate flex items-center gap-1">
                    <FileCode2 className="h-3 w-3 shrink-0" />
                    {pageFile || pathname}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  onClick={() => {
                    setAiTestMsg(null);
                    setIsAiModalOpen(true);
                  }}
                  className="p-1 rounded text-emerald-400 hover:text-white hover:bg-blue-900/40"
                  title="AI 모델 및 API 설정 (모델/키 교체)"
                >
                  <Settings className="h-3.5 w-3.5" />
                </button>
                <button onClick={resetChat} className="p-1 rounded text-zinc-400 hover:text-white hover:bg-blue-900/40" title="대화 초기화">
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 rounded text-zinc-400 hover:text-white hover:bg-blue-900/40" title={isMinimized ? "펼치기" : "최소화"}>
                  {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40" title="닫기">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <div className="flex-1 flex flex-col min-h-0 bg-[#070e1c]">
                {/* 메시지 */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                  {messages.map((m) =>
                    m.kind === "text" ? (
                      <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                        <div className="flex items-start gap-2 max-w-[92%]">
                          {m.sender === "ai" && (
                            <div className="mt-0.5 p-1 rounded-full bg-blue-900/50 border border-blue-600/40 shrink-0">
                              <Bot className="h-3.5 w-3.5 text-sky-300" />
                            </div>
                          )}
                          <div
                            className={`p-3 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                              m.sender === "user"
                                ? "bg-blue-600 text-white rounded-tr-none"
                                : m.tone === "ok"
                                ? "bg-emerald-950/60 text-emerald-50 border border-emerald-800/70 rounded-tl-none"
                                : m.tone === "warn"
                                ? "bg-amber-950/40 text-amber-50 border border-amber-800/60 rounded-tl-none"
                                : m.tone === "error"
                                ? "bg-rose-950/50 text-rose-50 border border-rose-800/70 rounded-tl-none"
                                : "bg-[#0e1b38] text-blue-50 border border-blue-900/70 rounded-tl-none"
                            }`}
                          >
                            {m.text}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <EditCard
                        key={m.id}
                        msg={m}
                        onChange={(patch) => updateEdit(m.id, patch)}
                        onApply={() => applyEdit(m)}
                        onUndo={() => undo(m.historyId)}
                      />
                    )
                  )}
                  {busy && (() => {
                    const targetLabel = pageFile || pathname || "현재 화면";
                    const { title, steps } = getBusySteps(busyKind, targetLabel);
                    const totalSteps = steps.length;
                    const activeIdx = Math.min(busyStepIdx, totalSteps - 1);
                    const progressPct = Math.round(((activeIdx + 1) / totalSteps) * 100);
                    const elapsedSec = (busyElapsedMs / 1000).toFixed(1);

                    return (
                      <div className="rounded-xl border border-sky-500/40 bg-[#0b1834] p-3 text-xs space-y-2 shadow-lg">
                        {/* 상단 타이틀 및 경과 시간 */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-sky-300 font-bold">
                            <Loader2 className="h-4 w-4 animate-spin text-sky-400 shrink-0" />
                            <span>{title}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                            <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-700/60">
                              단계 {activeIdx + 1}/{totalSteps}
                            </span>
                            <span className="text-zinc-400">{elapsedSec}s</span>
                          </div>
                        </div>

                        {/* 진행률 바 */}
                        <div className="h-1.5 w-full rounded-full bg-slate-900 overflow-hidden border border-blue-900/50">
                          <div
                            className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>

                        {/* 단계별 진행 상태 체크리스트 */}
                        <div className="space-y-1 pt-0.5">
                          {steps.map((stepText, idx) => {
                            const isDone = idx < activeIdx;
                            const isCurrent = idx === activeIdx;
                            return (
                              <div
                                key={idx}
                                className={`flex items-center gap-2 text-[11px] px-2 py-1 rounded ${
                                  isCurrent
                                    ? "bg-sky-500/15 text-sky-100 font-semibold border border-sky-500/30"
                                    : isDone
                                    ? "text-emerald-300/80"
                                    : "text-zinc-500"
                                }`}
                              >
                                {isDone ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                ) : isCurrent ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400 shrink-0" />
                                ) : (
                                  <span className="h-3.5 w-3.5 flex items-center justify-center text-[10px] text-zinc-600 shrink-0">
                                    ○
                                  </span>
                                )}
                                <span className="flex-1 truncate">{stepText}</span>
                                {isDone && (
                                  <span className="text-[9.5px] font-mono text-emerald-400 shrink-0">완료</span>
                                )}
                                {isCurrent && (
                                  <span className="text-[9.5px] font-mono text-sky-300 shrink-0 animate-pulse">
                                    진행 중
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                  <div ref={endRef} />
                </div>

                {/* 빠른 실행 */}
                <div className="px-3 pt-2 pb-1.5 border-t border-blue-950 bg-[#081224] shrink-0 flex flex-wrap gap-1.5">
                  <QuickButton icon={<MousePointerClick className="h-3 w-3" />} label="요소 선택해서 문구 바꾸기" highlight onClick={() => setPicking(true)} disabled={busy} />
                  <QuickButton icon={<FileCode2 className="h-3 w-3" />} label="현재 화면 인식 확인" onClick={() => handleCommand("현재 화면을 인식할 수 있냐")} disabled={busy} />
                  <QuickButton icon={<EyeOff className="h-3 w-3" />} label={`숨김 컬럼 (${hiddenColumns.length})`} onClick={() => handleCommand("숨김 컬럼 목록")} disabled={busy} />
                  <QuickButton icon={<History className="h-3 w-3" />} label="변경 이력" onClick={() => handleCommand("변경 이력")} disabled={busy} />
                  <QuickButton icon={<Undo2 className="h-3 w-3" />} label="최근 변경 되돌리기" onClick={() => handleCommand("되돌려줘")} disabled={busy} />
                  <QuickButton icon={<HelpCircle className="h-3 w-3" />} label="사용법" onClick={() => handleCommand("도움말")} disabled={busy} />
                </div>

                {/* 입력 (이미지 첨부 / Ctrl+V 지원) */}
                {attachedImage && (
                  <div className="mx-3 mt-2 flex items-center justify-between rounded-lg border border-sky-500/40 bg-[#0e1f44] px-2.5 py-1.5 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={attachedImage.dataUrl} alt={attachedImage.name} className="h-7 w-7 rounded object-cover border border-blue-400/30" />
                      <span className="truncate text-sky-200 text-[11px]">{attachedImage.name}</span>
                    </div>
                    <button type="button" onClick={() => setAttachedImage(null)} className="text-zinc-400 hover:text-rose-400">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!busy) handleCommand(input);
                  }}
                  onPaste={handlePaste}
                  className="m-3 flex items-center gap-2 bg-[#050b17] border border-blue-800/80 rounded-xl px-2.5 py-1.5 focus-within:border-sky-400"
                >
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                    className="p-1 text-zinc-400 hover:text-sky-300 rounded transition-colors cursor-pointer"
                    title="화면 캡처 이미지 첨부 (Ctrl+V 가능)"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={'예) "조회 기간" 을 "기간" 으로 바꿔줘  /  "고객사" 컬럼 숨겨줘'}
                    disabled={busy}
                    className="flex-1 bg-transparent text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                  />
                  <button type="submit" disabled={(!input.trim() && !attachedImage) || busy} className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white" title="전송">
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* AI 엔진 & 모델 설정 모달 (추후 API 키/모델/공급자 교체용) */}
        {isAiModalOpen && (
          <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-[#091122] border border-blue-500/40 shadow-2xl p-5 text-xs text-zinc-100 space-y-3.5">
              <div className="flex items-center justify-between pb-2.5 border-b border-blue-900/60">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-sky-400" />
                  <div>
                    <h3 className="font-bold text-sm text-white">ARC-WIZARD AI 엔진 & 모델 설정</h3>
                    <p className="text-[11px] text-blue-200/70">언제든 API 공급자·모델·키를 교체할 수 있습니다</p>
                  </div>
                </div>
                <button onClick={() => setIsAiModalOpen(false)} className="p-1 rounded text-zinc-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">AI 공급자 (Provider)</label>
                  <select
                    value={formProvider}
                    onChange={(e) => setFormProvider(e.target.value as "auto" | "gemini" | "vertex" | "openai-compatible" | "anthropic")}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#050b17] border border-blue-800 text-xs text-white focus:outline-none focus:border-sky-400"
                  >
                    <option value="anthropic">Anthropic Claude API (api.anthropic.com)</option>
                    <option value="auto">Auto (Gemini API / Vertex AI 자동 감지)</option>
                    <option value="gemini">Google Gemini API (generativelanguage)</option>
                    <option value="vertex">Google Vertex AI Express (aiplatform)</option>
                    <option value="openai-compatible">OpenAI 호환 API (OpenAI / Claude Proxy / vLLM 등)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">AI 모델 (Model ID)</label>
                  <div className="flex gap-1.5 mb-1.5 flex-wrap">
                    {["claude-opus-5-5", "claude-3-5-sonnet-latest", "gemini-3.8-flash", "gemini-3.5-flash-lite", "gpt-4o"].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setFormModel(preset);
                          if (preset.startsWith("claude")) setFormProvider("anthropic");
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                          formModel === preset ? "bg-sky-600 text-white border-sky-400" : "bg-[#102246] text-blue-200 border-blue-800 hover:bg-blue-800"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <input
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    placeholder="예: claude-opus-5-5, gemini-3.8-flash, gpt-4o..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#050b17] border border-blue-800 text-xs text-white font-mono focus:outline-none focus:border-sky-400"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-zinc-300">API Key</label>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {llmEnabled || maskedKey ? "● 보안 키 적용중 (비공개)" : "미설정"}
                    </span>
                  </div>
                  <input
                    type="password"
                    value={formApiKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormApiKey(val);
                      if (val.trim().startsWith("sk-ant-")) {
                        setFormProvider("anthropic");
                        if (!formModel || formModel.includes("gemini")) {
                          setFormModel("claude-opus-5-5");
                        }
                      }
                    }}
                    placeholder="변경할 때만 새 API 키 입력 (비워두면 현재 키 유지)"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#050b17] border border-blue-800 text-xs text-white font-mono focus:outline-none focus:border-sky-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-300 mb-1">커스텀 Base URL (선택)</label>
                  <input
                    value={formBaseUrl}
                    onChange={(e) => setFormBaseUrl(e.target.value)}
                    placeholder="비워두면 공급자 기본 엔드포인트 사용"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#050b17] border border-blue-800 text-xs text-white font-mono focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              {aiTestMsg && (
                <div
                  className={`p-2.5 rounded-lg border text-[11px] whitespace-pre-wrap font-mono ${
                    aiTestMsg.ok === true
                      ? "bg-emerald-950/60 border-emerald-700 text-emerald-200"
                      : aiTestMsg.ok === false
                      ? "bg-rose-950/60 border-rose-700 text-rose-200"
                      : "bg-blue-950/60 border-blue-800 text-blue-200"
                  }`}
                >
                  {aiTestMsg.text}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-blue-900/60">
                <button
                  type="button"
                  onClick={handleTestAi}
                  disabled={busy}
                  className="px-3 py-1.5 rounded-lg bg-[#102246] hover:bg-blue-800 text-sky-200 border border-blue-700 cursor-pointer disabled:opacity-50"
                >
                  연결 테스트
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAiModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                  >
                    닫기
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAiConfig}
                    disabled={busy}
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer disabled:opacity-50"
                  >
                    저장 및 적용
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ───────── 하위 컴포넌트 ─────────
function QuickButton({ icon, label, onClick, disabled, highlight }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; highlight?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] border transition-all disabled:opacity-50 cursor-pointer ${
        highlight ? "bg-sky-600 text-white border-sky-400 hover:bg-sky-500" : "bg-[#102246] text-blue-200 border-blue-800/60 hover:bg-blue-600 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function EditCard({
  msg,
  onChange,
  onApply,
  onUndo,
}: {
  msg: Extract<Message, { kind: "edit" }>;
  onChange: (patch: Partial<Extract<Message, { kind: "edit" }>>) => void;
  onApply: () => void;
  onUndo: () => void;
}) {
  const locked = msg.status !== "pending" && msg.status !== "error";
  const toggle = (key: string) =>
    onChange({ selected: msg.selected.includes(key) ? msg.selected.filter((k) => k !== key) : [...msg.selected, key] });

  return (
    <div className="rounded-xl border border-sky-800/60 bg-[#0b1630] p-3 text-xs space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sky-300 flex items-center gap-1">
          <FileCode2 className="h-3.5 w-3.5" /> 소스 수정 확인
        </span>
        <span className="text-[10px] text-zinc-400">{msg.items.length}곳 발견 · {msg.selected.length}곳 선택</span>
      </div>

      {msg.from !== "AI 제안" && (
        <div className="grid grid-cols-[48px_1fr] items-center gap-x-2 gap-y-1.5">
          <span className="text-zinc-400">기존</span>
          <span className="font-mono text-rose-300 break-all">{msg.from}</span>
          <span className="text-zinc-400">새 문구</span>
          <input
            autoFocus={!msg.to}
            value={msg.to}
            disabled={locked}
            onChange={(e) => onChange({ to: e.target.value, error: undefined })}
            onKeyDown={(e) => e.key === "Enter" && !locked && onApply()}
            placeholder="바꿀 문구 입력"
            className="px-2 py-1 rounded bg-[#050b17] border border-blue-700 text-emerald-300 font-mono focus:outline-none focus:border-sky-400 disabled:opacity-60"
          />
        </div>
      )}

      <div className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5">
        {msg.items.map((c) => {
          const key = itemKey(c);
          const checked = msg.selected.includes(key);
          const to = c.to ?? msg.to;
          const d = diffLines(c, to || c.text);
          return (
            <label key={key} className={`block rounded-lg border p-2 cursor-pointer ${checked ? "border-sky-600 bg-sky-950/40" : "border-blue-900/60 bg-[#081224]"}`}>
              <div className="flex items-center gap-2 mb-1">
                <input type="checkbox" checked={checked} disabled={locked} onChange={() => toggle(key)} className="accent-sky-500" />
                <span className="font-mono text-[10.5px] text-sky-200 truncate">{c.file}:{c.line}</span>
                {c.score === 0 && <span className="text-[9px] px-1 rounded bg-sky-800 text-white shrink-0">현재 화면</span>}
              </div>
              <pre className="font-mono text-[10.5px] whitespace-pre-wrap break-all leading-snug">
                <span className="block text-rose-300">- {d.before}</span>
                {to && <span className="block text-emerald-300">+ {d.after}</span>}
              </pre>
            </label>
          );
        })}
      </div>

      {msg.error && (
        <div className="flex items-start gap-1.5 text-rose-300 text-[11px]">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {msg.error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        {(msg.status === "pending" || msg.status === "error") && (
          <>
            <button onClick={() => onChange({ status: "cancelled" })} className="px-3 py-1 rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700">취소</button>
            <button onClick={onApply} className="px-3 py-1 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-500 flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> 소스에 적용
            </button>
          </>
        )}
        {msg.status === "applying" && (
          <span className="flex items-center gap-1.5 text-sky-300 text-[11px]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            원본 백업 스냅샷 저장 → 소스 파일 라인 치환 → 화면 갱신 중...
          </span>
        )}
        {msg.status === "applied" && (
          <>
            <span className="flex items-center gap-1 text-emerald-400 font-semibold"><Check className="h-3.5 w-3.5" /> 적용됨</span>
            <button onClick={onUndo} className="px-3 py-1 rounded-md bg-zinc-800 text-zinc-200 hover:bg-zinc-700 flex items-center gap-1">
              <Undo2 className="h-3.5 w-3.5" /> 되돌리기
            </button>
          </>
        )}
        {msg.status === "cancelled" && <span className="text-zinc-500">취소됨</span>}
      </div>
    </div>
  );
}

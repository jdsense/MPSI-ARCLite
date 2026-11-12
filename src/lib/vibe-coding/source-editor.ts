/**
 * ARC-WIZARD 소스 편집 엔진 (서버 전용, LLM 미사용 결정적 엔진)
 *
 * - 화면 문구로 src/ 전체를 검색하여 소스 위치 후보를 찾는다.
 * - 선택된 위치만 정확히 치환한다 (라인/컬럼 검증).
 * - 적용 전 백업을 남기고, 되돌리기(Undo)를 지원한다.
 * - 숨김 컬럼 설정은 src/config/arc-wizard-overrides.json 에 저장한다.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");
const HISTORY_DIR = path.join(ROOT, ".arc-wizard", "history");
export const OVERRIDES_FILE = path.join(SRC_DIR, "config", "arc-wizard-overrides.json");

// 편집 대상에서 제외할 경로 (자기 자신/API 라우트 등)
const EXCLUDED_DIRS = [
  path.join(SRC_DIR, "app", "api"),
  path.join(SRC_DIR, "app", "truck-twin"),
  path.join(SRC_DIR, "components", "vibe-coding"),
  path.join(SRC_DIR, "lib", "vibe-coding"),
];
const ALLOWED_EXT = new Set([".tsx", ".ts", ".jsx", ".js"]);

// 치환 문구에 허용하지 않는 문자 (JSX/문자열 문법을 깨뜨릴 수 있는 문자)
const FORBIDDEN_CHARS = /[{}<>"'`\\\r\n]/;

export interface Candidate {
  file: string; // src/... 상대경로 (슬래시)
  line: number; // 1-based
  col: number; // 0-based
  text: string; // 매칭된 원본 문구
  lineText: string; // 해당 라인 전체
  score: number; // 낮을수록 현재 화면과 관련성 높음
}

export interface EditRequest {
  file: string;
  line: number;
  col: number;
  from: string;
  to: string;
}

interface HistoryEntry {
  id: string;
  createdAt: string;
  summary: string;
  files: { file: string; before: string; afterHash: string }[];
  createdFiles?: string[];
}

const toRel = (abs: string) => path.relative(ROOT, abs).split(path.sep).join("/");
const sha = (s: string) => crypto.createHash("sha1").update(s).digest("hex");

// 인증·권한·DB·동기화·전역 레이아웃·아크위저드 등 AI 편집 금지 파일 (src/ 기준 상대경로, 소문자)
const DENIED_FILES = new Set([
  "lib/auth-crypto.ts",
  "lib/db.ts",
  "lib/logistics-gateway.ts",
  "lib/role-store.ts",
  "lib/permission-store.ts",
  "lib/user-store.ts",
  "lib/user-constants.ts",
  "lib/menu-store.ts",
  "lib/notification-store.ts",
  "services/sync-service.ts",
  "config/node-config.ts",
  "config/arc-wizard-overrides.json",
  "config/menu-config.json",
  "types/sync.ts",
  "app/layout.tsx",
  "app/portal/layout.tsx",
  "middleware.ts",
  "proxy.ts",
]);
const DENIED_PREFIXES = ["app/auth/", "app/api/", "app/truck-twin/", "components/vibe-coding/", "lib/vibe-coding/"];

/** 비교용 정규화: 심볼릭 링크 해소 + 슬래시 + 소문자 (Windows 대소문자 우회 방지) */
function normForCompare(abs: string): string {
  let real = abs;
  try {
    real = fs.realpathSync.native(abs);
  } catch {
    // 존재하지 않는 경로는 원본 유지
  }
  return real.split(path.sep).join("/").toLowerCase();
}

/** src/ 기준 상대경로가 금지 대상인지 (정규화된 소문자 경로 입력) */
function isDeniedRel(relFromSrc: string): boolean {
  if (relFromSrc.includes("vibe-coding") || relFromSrc.includes("arc-wizard")) return true;
  return DENIED_FILES.has(relFromSrc) || DENIED_PREFIXES.some((p) => relFromSrc.startsWith(p));
}

/** src/ 하위의 허용된 파일인지 검증하고 절대경로를 반환 */
export function resolveSafePath(relFile: string): string {
  const abs = path.resolve(ROOT, relFile);
  if (!abs.toLowerCase().startsWith((SRC_DIR + path.sep).toLowerCase())) throw new Error(`허용되지 않은 경로입니다: ${relFile}`);
  if (!fs.existsSync(abs)) throw new Error(`파일이 존재하지 않습니다: ${relFile}`);
  const srcNorm = normForCompare(SRC_DIR) + "/";
  const absNorm = normForCompare(abs);
  if (!absNorm.startsWith(srcNorm)) throw new Error(`허용되지 않은 경로입니다: ${relFile}`);
  const relFromSrc = absNorm.slice(srcNorm.length);
  if (isDeniedRel(relFromSrc)) throw new Error(`편집이 금지된 경로입니다: ${relFile}`);
  if (!ALLOWED_EXT.has(path.extname(abs).toLowerCase())) throw new Error(`편집할 수 없는 파일 형식입니다: ${relFile}`);
  return abs;
}

// 아크위저드 자체 소스 수정 차단 패턴
const SELF_MODIFICATION_CODE_PATTERNS: RegExp[] = [
  /vibe-coding/i,
  /arc-wizard-floating/i,
  /ArcWizardFloating/,
  /source-editor/i,
  /command-parser/i,
  /\/api\/v1\/vibe-coding/i,
];

// 보안 위배 코드 실행 차단 패턴 (동적 코드 실행, 시스템/파일 제어, XSS, 인증/세션 우회, 환경변수/키 탈취, 외부 네트워크 유출, DB 파괴 등)
const SECURITY_VIOLATION_CODE_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /\beval\s*\(/, reason: "동적 코드 실행(eval)은 허용되지 않습니다." },
  { pattern: /\bnew\s+Function\b|\bFunction\s*\(/, reason: "동적 함수 생성(Function)은 허용되지 않습니다." },
  { pattern: /\bset(?:Timeout|Interval)\s*\(\s*["'`]/, reason: "문자열 기반 타이머 코드 실행은 허용되지 않습니다." },
  {
    pattern: /dangerouslySetInnerHTML|\binnerHTML\s*=|\bouterHTML\s*=|\bdocument\.write(?:ln)?\s*\(|\binsertAdjacentHTML\s*\(/,
    reason: "XSS 위험이 있는 직접 DOM HTML 주입 코드는 허용되지 않습니다.",
  },
  {
    pattern: /<\s*script\b|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html/i,
    reason: "스크립트 태그 또는 실행형 URI 삽입은 허용되지 않습니다.",
  },
  {
    pattern: /\bchild_process\b|\b(?:exec|execSync|spawn|spawnSync|fork)\s*\(/,
    reason: "시스템 쉘/프로세스 명령 실행 코드는 허용되지 않습니다.",
  },
  {
    pattern: /\bprocess\.(?:env|exit|kill|binding|dlopen|mainModule)\b/,
    reason: "서버 프로세스 또는 환경변수(process.env) 접근 코드는 허용되지 않습니다.",
  },
  {
    pattern: /\brequire\s*\(\s*["'`](?:fs|path|os|net|http|https|child_process|crypto|vm|cluster|dgram|dns|tls|node:)/,
    reason: "서버 내부 모듈(fs, child_process 등) 호출은 허용되지 않습니다.",
  },
  {
    pattern: /\bfs\.(?:read|write|append|unlink|rm|rmdir|mkdir|readdir|chmod|chown|copyFile|rename)/,
    reason: "파일 시스템 직접 조작 코드는 허용되지 않습니다.",
  },
  {
    pattern: /\bdocument\.cookie\b/,
    reason: "쿠키(document.cookie) 직접 접근 및 탈취 코드는 허용되지 않습니다.",
  },
  {
    pattern: /\blocalStorage\.(?:clear|removeItem)\s*\(|\blocalStorage\.(?:setItem|getItem)\s*\(\s*["'`](?:mpsi_role|mpsi_user_accounts)/,
    reason: "인증 세션 및 계정 스토리지 직접 조작은 허용되지 않습니다.",
  },
  {
    pattern: /\b(?:saveRoleSession|verifyPassword|hashPassword|DEFAULT_INITIAL_PASSWORD)\b/,
    reason: "인증·권한 검증 로직 조작은 허용되지 않습니다.",
  },
  {
    pattern: /\b(?:GEMINI_API_KEY|ARC_WIZARD_API_KEY|ARC_WIZARD_ADMIN_TOKEN|DATABASE_URL|NODE_API_KEY|NODE_HMAC_SECRET)\b/,
    reason: "보안 API 키 및 데이터베이스 연결 정보 참조는 허용되지 않습니다.",
  },
  {
    pattern: /\bfetch\s*\(\s*["'`]https?:\/\/|\bnew\s+XMLHttpRequest\b|\bnavigator\.sendBeacon\b|\bnew\s+WebSocket\s*\(/i,
    reason: "외부 도메인으로의 네트워크 전송 코드는 허용되지 않습니다.",
  },
  {
    pattern: /\b(?:DROP\s+TABLE|TRUNCATE\s+TABLE|DELETE\s+FROM\s+\w+\s*;?\s*$|ALTER\s+TABLE|GRANT\s+ALL)\b/i,
    reason: "데이터베이스 스키마/데이터 파괴 쿼리는 허용되지 않습니다.",
  },
];

/** 사용자 프롬프트(지시문) 단계에서의 보안 정책 및 자기 수정 금지 검증 */
export function validateInstructionSecurity(instruction: string): string | null {
  const text = (instruction || "").trim();
  if (!text) return null;

  // 1. 아크위저드 관련 소스코드 수정 시도 차단
  const mentionsArcWizard = /(아크\s*위저드|아크\s*워저드|arc[-_\s]*wizard|vibe[-_\s]*coding|source[-_\s]*editor|command[-_\s]*parser|ArcWizardFloating)/i.test(text);
  const hasModifyIntent = /(수정|변경|바꿔|고쳐|삭제|지워|추가|제거|무력화|우회|주석|편집|해제|열어|노출|보여)/i.test(text);
  if (mentionsArcWizard && hasModifyIntent) {
    return "🚫 **[보안 정책 차단]** 아크위저드(ARC-WIZARD)를 이용하여 아크위저드 관련 소스 코드나 내부 엔진 설정 코드는 수정할 수 없습니다.";
  }

  // 2. 보안사항 위배 프롬프트/명령 차단
  const securityPromptPatterns: { pattern: RegExp; reason: string }[] = [
    {
      pattern: /(권한\s*우회|로그인\s*우회|인증\s*우회|인증\s*무시|권한\s*체크\s*제거|권한\s*검증\s*삭제|403\s*해제|모든\s*권한\s*허용)/i,
      reason: "인증 및 권한 검증을 우회하거나 무력화하는 작업은 수행할 수 없습니다.",
    },
    {
      pattern: /(비밀번호\s*노출|패스워드\s*노출|비밀번호\s*탈취|api\s*키\s*노출|api\s*key.*노출|환경\s*변수.*출력|process\.env|\.env\s*파일)/i,
      reason: "API 키, 비밀번호, 환경변수(.env) 등 민감 보안 정보를 노출하는 코드는 작성할 수 없습니다.",
    },
    {
      pattern: /(\beval\s*\(|new\s+Function|dangerouslySetInnerHTML|document\.cookie|child_process|execSync|spawnSync|DROP\s+TABLE|TRUNCATE\s+TABLE|<script)/i,
      reason: "시스템 명령 실행, 동적 코드 실행(eval), XSS 스크립트 삽입, DB 파괴 등 보안을 위배하는 코드는 실행할 수 없습니다.",
    },
  ];

  for (const rule of securityPromptPatterns) {
    if (rule.pattern.test(text)) {
      return `🚫 **[보안 정책 차단]** 보안사항을 위배하는 코드는 실행하거나 반영할 수 없습니다.\n• 사유: ${rule.reason}`;
    }
  }

  return null;
}

export function validateReplacement(to: string, allowCode = true): string | null {
  if (to === undefined || to === null) return "새 문구가 비어 있습니다.";
  if (!allowCode && !to.trim()) return "새 문구가 비어 있습니다.";
  if (to.includes("\0")) return "허용되지 않는 제어 문자가 포함되어 있습니다.";
  if (!allowCode && FORBIDDEN_CHARS.test(to)) {
    return "새 문구에 사용할 수 없는 문자가 있습니다: { } < > \" ' ` \\ 줄바꿈";
  }

  // 1) 아크위저드 자체 소스/API 참조 및 수정 차단
  for (const pat of SELF_MODIFICATION_CODE_PATTERNS) {
    if (pat.test(to)) {
      return "보안 정책 차단: 아크위저드(ARC-WIZARD) 관련 소스 코드나 내부 API는 수정할 수 없습니다.";
    }
  }

  // 2) 보안 위배 코드 패턴 정적 검사
  for (const rule of SECURITY_VIOLATION_CODE_PATTERNS) {
    if (rule.pattern.test(to)) {
      return `보안 정책 차단: ${rule.reason}`;
    }
  }

  return null;
}

function walk(dir: string, out: string[]) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.includes(abs)) continue;
      walk(abs, out);
    } else if (ALLOWED_EXT.has(path.extname(entry.name))) {
      const relFromSrc = path.relative(SRC_DIR, abs).split(path.sep).join("/").toLowerCase();
      if (isDeniedRel(relFromSrc)) continue; // 금지 파일은 검색 후보에서도 제외
      out.push(abs);
    }
  }
}

/** 현재 화면 경로에 해당하는 page.tsx 상대경로 */
export function routePageFile(pathname: string): string | null {
  const clean = (pathname || "").split("?")[0].replace(/\/+$/, "");
  for (const ext of [".tsx", ".jsx", ".ts", ".js"]) {
    const abs = path.join(SRC_DIR, "app", clean, `page${ext}`);
    if (fs.existsSync(abs)) return toRel(abs);
  }
  return null;
}

function isCommentLine(line: string) {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("/*") || t.startsWith("*") || t.startsWith("{/*");
}

/** 매칭 위치가 화면 문구(JSX 텍스트 또는 문자열 리터럴)로 볼 수 있는지 판단 */
function looksLikeUiText(line: string, col: number, text: string): boolean {
  // 한글 등 비ASCII 문구는 코드 식별자일 가능성이 거의 없음
  if (/[^\x00-\x7F]/.test(text)) return true;
  const before = line[col - 1] ?? "";
  const after = line[col + text.length] ?? "";
  if (/[A-Za-z0-9_$]/.test(before) || /[A-Za-z0-9_$]/.test(after)) return false;
  for (let i = col - 1; i >= 0; i--) {
    const ch = line[i];
    if (ch === ">" || ch === "}" || ch === '"' || ch === "'" || ch === "`") return true;
    if (ch === "{" || ch === "(" || ch === "=" || ch === "<" || ch === ";") return false;
  }
  return false;
}

/** 화면 문구로 소스 위치 후보 검색 (여러 대체 문구를 순서대로 시도) */
export function searchCandidates(texts: string[], pathname: string): { matchedText: string | null; candidates: Candidate[] } {
  const files: string[] = [];
  walk(SRC_DIR, files);
  const pageFile = routePageFile(pathname);
  const pageDir = pageFile ? path.posix.dirname(pageFile) : null;

  for (const raw of texts) {
    const text = (raw || "").trim();
    if (!text || text.length > 200) continue;
    const results: Candidate[] = [];

    for (const abs of files) {
      const rel = toRel(abs);
      const content = fs.readFileSync(abs, "utf-8");
      if (!content.includes(text)) continue;
      const lines = content.split("\n");
      lines.forEach((lineText, idx) => {
        if (isCommentLine(lineText)) return;
        let from = 0;
        while (true) {
          const col = lineText.indexOf(text, from);
          if (col < 0) break;
          from = col + text.length;
          if (!looksLikeUiText(lineText, col, text)) continue;
          let score = 3;
          if (rel === pageFile) score = 0;
          else if (pageDir && rel.startsWith(pageDir + "/")) score = 1;
          else if (rel.startsWith("src/components/")) score = 2;
          results.push({ file: rel, line: idx + 1, col, text, lineText: lineText.replace(/\r$/, ""), score });
        }
      });
    }

    if (results.length > 0) {
      results.sort((a, b) => a.score - b.score || a.file.localeCompare(b.file) || a.line - b.line);
      return { matchedText: text, candidates: results.slice(0, 40) };
    }
  }
  return { matchedText: null, candidates: [] };
}

function ensureHistoryDir() {
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
}

/** 선택된 위치들(단일 라인 문구 또는 멀티라인 소스 블록)을 치환하고 백업(히스토리)을 남김 */
export function applyEdits(edits: EditRequest[], summary: string) {
  if (!edits.length) throw new Error("적용할 변경이 없습니다.");
  if (edits.length > 100) throw new Error("한 번에 적용할 수 있는 변경은 100건까지입니다.");
  if (new Set(edits.map((e) => e.file)).size > 10) throw new Error("한 번에 변경할 수 있는 파일은 10개까지입니다.");
  for (const e of edits) {
    const err = validateReplacement(e.to, true);
    if (err) throw new Error(err);
  }

  // 파일별로 그룹화 후, 같은 라인 내에서는 뒤쪽 컬럼부터 치환해 위치가 어긋나지 않게 함
  const byFile = new Map<string, EditRequest[]>();
  for (const e of edits) {
    const list = byFile.get(e.file) || [];
    list.push(e);
    byFile.set(e.file, list);
  }

  const pending: { abs: string; rel: string; before: string; after: string }[] = [];
  for (const [rel, list] of byFile) {
    const abs = resolveSafePath(rel);
    const before = fs.readFileSync(abs, "utf-8");
    let lines = before.split("\n");
    const sorted = [...list].sort((a, b) => b.line - a.line || b.col - a.col);
    for (const e of sorted) {
      const lineText = lines[e.line - 1];
      if (!e.from.includes("\n") && lineText !== undefined && lineText.substr(e.col, e.from.length) === e.from) {
        lines[e.line - 1] = lineText.slice(0, e.col) + e.to + lineText.slice(e.col + e.from.length);
      } else {
        // 멀티라인 코드 블록이거나 라인/컬럼 오프셋이 약간 이동한 경우 전체 텍스트에서 정확히 1회 치환
        const joined = lines.join("\n");
        const normJoined = joined.replace(/\r\n/g, "\n");
        const normFrom = e.from.replace(/\r\n/g, "\n");
        if (!normJoined.includes(normFrom)) {
          throw new Error(`${rel}:${e.line} 위치의 코드가 변경되었거나 일치하지 않습니다. 다시 검색해 주세요.`);
        }
        const replaced = normJoined.replace(normFrom, e.to.replace(/\r\n/g, "\n"));
        lines = replaced.split("\n");
      }
    }
    pending.push({ abs, rel, before, after: lines.join("\n") });
  }

  ensureHistoryDir();
  const id = `${Date.now()}`;
  const entry: HistoryEntry = {
    id,
    createdAt: new Date().toISOString(),
    summary,
    files: pending.map((p) => ({ file: p.rel, before: p.before, afterHash: sha(p.after) })),
  };
  fs.writeFileSync(path.join(HISTORY_DIR, `${id}.json`), JSON.stringify(entry), "utf-8");
  for (const p of pending) fs.writeFileSync(p.abs, p.after, "utf-8");

  return { historyId: id, files: pending.map((p) => p.rel) };
}

export function listHistory(limit = 10) {
  if (!fs.existsSync(HISTORY_DIR)) return [];
  return fs
    .readdirSync(HISTORY_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse()
    .slice(0, limit)
    .map((f) => {
      const entry = JSON.parse(fs.readFileSync(path.join(HISTORY_DIR, f), "utf-8")) as HistoryEntry;
      return { id: entry.id, createdAt: entry.createdAt, summary: entry.summary, files: entry.files.map((x) => x.file) };
    });
}

/** 히스토리 기반 되돌리기 (적용 이후 파일이 다시 수정되었다면 거부) */
export function undoHistory(id?: string) {
  const list = listHistory(1);
  const targetId = id || list[0]?.id;
  if (!targetId) throw new Error("되돌릴 변경 이력이 없습니다.");
  const file = path.join(HISTORY_DIR, `${targetId}.json`);
  if (!fs.existsSync(file)) throw new Error("해당 변경 이력을 찾을 수 없습니다.");
  const entry = JSON.parse(fs.readFileSync(file, "utf-8")) as HistoryEntry;

  // 되돌리기 허용 대상: 일반 편집 가능 파일 + createPage 가 관리하는 고정 파일 + 숨김컬럼 설정
  const MANAGED_RESTORE = new Set([
    toRel(OVERRIDES_FILE),
    toRel(path.join(SRC_DIR, "config", "menu-config.json")),
    toRel(path.join(SRC_DIR, "app", "portal", "layout.tsx")),
  ]);
  const restorePath = (rel: string) =>
    MANAGED_RESTORE.has(rel) ? path.join(ROOT, rel) : resolveSafePath(rel);
  for (const f of entry.files) {
    const abs = restorePath(f.file);
    const current = fs.readFileSync(abs, "utf-8");
    if (sha(current) !== f.afterHash) {
      throw new Error(`${f.file} 파일이 이후에 다시 수정되어 자동으로 되돌릴 수 없습니다. (최신 변경부터 되돌려 주세요)`);
    }
  }
  for (const f of entry.files) {
    const abs = restorePath(f.file);
    fs.writeFileSync(abs, f.before, "utf-8");
  }
  for (const createdRel of entry.createdFiles || []) {
    const abs = path.resolve(ROOT, createdRel);
    if (abs.startsWith(SRC_DIR + path.sep) && fs.existsSync(abs)) {
      fs.unlinkSync(abs);
      const dir = path.dirname(abs);
      if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
        fs.rmdirSync(dir);
      }
    }
  }
  fs.unlinkSync(file);
  return {
    id: entry.id,
    summary: entry.summary,
    files: [...entry.files.map((x) => x.file), ...(entry.createdFiles || [])],
  };
}

// ───────── 신규 페이지 생성 및 좌측 사이드바 메뉴 자동 등록 ─────────
const PARENT_MENU_BASE: Record<string, { titleMatch: string; basePath: string }> = {
  시스템관리: { titleMatch: 'title: "시스템관리"', basePath: "/portal/admin" },
  기초정보: { titleMatch: 'title: "기초정보"', basePath: "/portal/basic-info" },
  "프로젝트 관리": { titleMatch: 'title: "프로젝트 관리"', basePath: "/portal/project" },
  "금형-견적관리": { titleMatch: 'title: "금형-견적관리"', basePath: "/portal/quotation" },
  "금형-개발 관리(자체/외주)": { titleMatch: 'title: "금형-개발 관리(자체/외주)"', basePath: "/portal/mold-dev" },
  "금형-양산 관리(자체/외주)": { titleMatch: 'title: "금형-양산 관리(자체/외주)"', basePath: "/portal/mass-prod" },
};

export function createMenuAndPage(parentMenuRaw: string, pageTitleRaw: string, customSlug?: string) {
  const parentMenu = PARENT_MENU_BASE[parentMenuRaw] ? parentMenuRaw : "시스템관리";
  const info = PARENT_MENU_BASE[parentMenu];
  const pageTitle = (pageTitleRaw || "빈 페이지").trim().replace(/["'`\\]/g, "");

  // 슬러그 생성
  let slug = (customSlug || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!slug) {
    slug = pageTitle === "빈 페이지" ? "blank" : `page-${Date.now().toString(36).slice(-4)}`;
  }
  let routeUrl = `${info.basePath}/${slug}`;
  let pageAbs = path.join(SRC_DIR, "app", ...routeUrl.split("/").filter(Boolean), "page.tsx");
  let suffix = 2;
  while (fs.existsSync(pageAbs)) {
    routeUrl = `${info.basePath}/${slug}-${suffix}`;
    pageAbs = path.join(SRC_DIR, "app", ...routeUrl.split("/").filter(Boolean), "page.tsx");
    suffix++;
  }
  const pageRel = toRel(pageAbs);

  const menuConfigAbs = path.join(SRC_DIR, "config", "menu-config.json");
  const layoutAbs = path.join(SRC_DIR, "app", "portal", "layout.tsx");
  const menuConfigBefore = fs.readFileSync(menuConfigAbs, "utf-8");
  const layoutBefore = fs.readFileSync(layoutAbs, "utf-8");

  // 1) menu-config.json 의 해당 대메뉴 submenus 배열 끝에 항목 추가
  const parsedMenus = JSON.parse(menuConfigBefore) as {
    id: string;
    title: string;
    roles?: string[];
    submenus?: { id: string; title: string; url: string; roles?: string[] }[];
  }[];

  const targetParent =
    parsedMenus.find((m) => m.title === parentMenu || m.title.includes(parentMenu)) ||
    parsedMenus[parsedMenus.length - 1];
  if (!targetParent) throw new Error(`메뉴 설정에서 [${parentMenu}] 항목을 찾지 못했습니다.`);
  if (!Array.isArray(targetParent.submenus)) targetParent.submenus = [];

  let finalTitle = pageTitle;
  let titleSuffix = 2;
  while (targetParent.submenus.some((s) => s.title === finalTitle)) {
    finalTitle = `${pageTitle} ${titleSuffix}`;
    titleSuffix++;
  }

  targetParent.submenus.push({
    id: `sub-${Date.now().toString(36)}`,
    title: finalTitle,
    url: routeUrl,
    roles: targetParent.roles || ["ADMIN", "MPSI"],
  });

  const menuConfigAfter = JSON.stringify(parsedMenus, null, 2) + "\n";

  // 2) layout.tsx 의 PAGE_TITLES 에 타이틀 매핑 추가
  const titleMapAnchor = '"/portal/admin/permissions": "권한관리 (C992000)",';
  const layoutAfter = layoutBefore.includes(titleMapAnchor)
    ? layoutBefore.replace(titleMapAnchor, `${titleMapAnchor}\n  "${routeUrl}": "${finalTitle}",`)
    : layoutBefore;

  // 3) 새 페이지 컴포넌트 파일 생성
  const pageContent = `"use client";

import React from "react";

export default function CustomPortalPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs">
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">${finalTitle}</h1>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          경로: ${routeUrl} · 좌측 메뉴 [${parentMenu} &gt; ${finalTitle}]에 연결된 페이지입니다.
        </p>
        <div className="mt-6 flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-950/40 p-8 text-center">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">현재 빈 페이지 상태입니다.</p>
          <p className="mt-1 text-xs text-zinc-400">
            우측 하단 ARC-WIZARD에서 이 화면의 타이틀이나 문구를 자유롭게 수정하거나 되돌릴 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
`;

  ensureHistoryDir();
  const id = `${Date.now()}`;
  const entry: HistoryEntry = {
    id,
    createdAt: new Date().toISOString(),
    summary: `[${parentMenu}] 하위에 [${finalTitle}] (${routeUrl}) 페이지 및 메뉴 생성`,
    files: [
      { file: toRel(menuConfigAbs), before: menuConfigBefore, afterHash: sha(menuConfigAfter) },
      { file: toRel(layoutAbs), before: layoutBefore, afterHash: sha(layoutAfter) },
    ],
    createdFiles: [pageRel],
  };

  fs.mkdirSync(path.dirname(pageAbs), { recursive: true });
  fs.writeFileSync(pageAbs, pageContent, "utf-8");
  fs.writeFileSync(menuConfigAbs, menuConfigAfter, "utf-8");
  fs.writeFileSync(layoutAbs, layoutAfter, "utf-8");
  fs.writeFileSync(path.join(HISTORY_DIR, `${id}.json`), JSON.stringify(entry), "utf-8");

  return {
    historyId: id,
    parentMenu,
    pageTitle: finalTitle,
    routeUrl,
    pageFile: pageRel,
    modifiedFiles: [pageRel, toRel(menuConfigAbs), toRel(layoutAbs)],
  };
}

// ───────── 숨김 컬럼 설정 (overrides JSON) ─────────
interface Overrides {
  hiddenColumns: Record<string, string[]>;
}

export function readOverrides(): Overrides {
  try {
    const json = JSON.parse(fs.readFileSync(OVERRIDES_FILE, "utf-8"));
    return { hiddenColumns: json.hiddenColumns || {} };
  } catch {
    return { hiddenColumns: {} };
  }
}

export function setColumnHidden(pathname: string, column: string, hidden: boolean) {
  const col = column.trim();
  if (!col || col.length > 50 || FORBIDDEN_CHARS.test(col)) throw new Error("컬럼명이 올바르지 않습니다.");
  const before = fs.existsSync(OVERRIDES_FILE) ? fs.readFileSync(OVERRIDES_FILE, "utf-8") : "";
  const data = readOverrides();
  const list = new Set(data.hiddenColumns[pathname] || []);
  if (hidden) list.add(col);
  else list.delete(col);
  if (list.size) data.hiddenColumns[pathname] = Array.from(list);
  else delete data.hiddenColumns[pathname];
  const after = JSON.stringify(data, null, 2) + "\n";
  if (after === before) return { changed: false, hiddenColumns: data.hiddenColumns[pathname] || [] };

  ensureHistoryDir();
  const id = `${Date.now()}`;
  const entry: HistoryEntry = {
    id,
    createdAt: new Date().toISOString(),
    summary: `${pathname} 컬럼 [${col}] ${hidden ? "숨김" : "표시"}`,
    files: [{ file: toRel(OVERRIDES_FILE), before, afterHash: sha(after) }],
  };
  fs.writeFileSync(path.join(HISTORY_DIR, `${id}.json`), JSON.stringify(entry), "utf-8");
  fs.mkdirSync(path.dirname(OVERRIDES_FILE), { recursive: true });
  fs.writeFileSync(OVERRIDES_FILE, after, "utf-8");
  return { changed: true, historyId: id, hiddenColumns: data.hiddenColumns[pathname] || [] };
}

// ───────── AI 엔진 설정 및 멀티 공급자(Gemini / Vertex / OpenAI 호환 / Anthropic Claude) 호출 ─────────
export type AiProvider = "auto" | "gemini" | "vertex" | "openai-compatible" | "anthropic";

export interface AiConfig {
  provider: AiProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
}

const AI_CONFIG_FILE = path.join(ROOT, ".arc-wizard", "ai-config.json");
const AI_USAGE_FILE = path.join(ROOT, ".arc-wizard", "ai-usage.json");
// API 키는 소스에 두지 않는다. ARC_WIZARD_API_KEY / GEMINI_API_KEY 환경변수 또는 AI 설정 UI 로만 지정.
const DEFAULT_API_KEY = "";
const DEFAULT_MODEL = "gemini-3.8-flash";
const DEFAULT_DAILY_TOKEN_LIMIT = 1_000_000; // Gemini Flash 일일 기본 토큰 한도 (1M)
const DEFAULT_DAILY_REQUEST_LIMIT = 1_500;   // Gemini Flash 일일 요청 한도 (1,500 RPD)

export interface AiUsageStats {
  date: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestCount: number;
  dailyTokenLimit: number;
  dailyRequestLimit: number;
  remainingTokens: number;
  remainingRequests: number;
  remainingPercent: number;
  lastCallTokens: number;
  lastModel: string;
  lastUpdatedAt: string;
}

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function getAiUsage(): AiUsageStats {
  const today = todayKey();
  const cfg = getAiConfig();
  let raw: Partial<AiUsageStats> = {};
  try {
    if (fs.existsSync(AI_USAGE_FILE)) {
      raw = JSON.parse(fs.readFileSync(AI_USAGE_FILE, "utf-8"));
    }
  } catch {
    // ignore
  }
  const isSameDay = raw.date === today;
  const promptTokens = isSameDay ? Number(raw.promptTokens || 0) : 0;
  const completionTokens = isSameDay ? Number(raw.completionTokens || 0) : 0;
  const totalTokens = isSameDay ? Number(raw.totalTokens || 0) : 0;
  const requestCount = isSameDay ? Number(raw.requestCount || 0) : 0;
  const dailyTokenLimit = Number(raw.dailyTokenLimit || DEFAULT_DAILY_TOKEN_LIMIT);
  const dailyRequestLimit = Number(raw.dailyRequestLimit || DEFAULT_DAILY_REQUEST_LIMIT);
  const remainingTokens = Math.max(0, dailyTokenLimit - totalTokens);
  const remainingRequests = Math.max(0, dailyRequestLimit - requestCount);
  const remainingPercent = Math.max(
    0,
    Math.min(100, Number((((dailyTokenLimit - totalTokens) / dailyTokenLimit) * 100).toFixed(1)))
  );

  return {
    date: today,
    promptTokens,
    completionTokens,
    totalTokens,
    requestCount,
    dailyTokenLimit,
    dailyRequestLimit,
    remainingTokens,
    remainingRequests,
    remainingPercent,
    lastCallTokens: isSameDay ? Number(raw.lastCallTokens || 0) : 0,
    lastModel: raw.lastModel || cfg.model,
    lastUpdatedAt: raw.lastUpdatedAt || new Date().toISOString(),
  };
}

export function recordAiUsage(promptTok: number, completionTok: number, modelName?: string): AiUsageStats {
  const cur = getAiUsage();
  const p = Math.max(1, Math.round(promptTok));
  const c = Math.max(1, Math.round(completionTok));
  const callTotal = p + c;
  const nextTotal = cur.totalTokens + callTotal;
  const nextReq = cur.requestCount + 1;
  const remainingTokens = Math.max(0, cur.dailyTokenLimit - nextTotal);
  const remainingRequests = Math.max(0, cur.dailyRequestLimit - nextReq);
  const remainingPercent = Math.max(
    0,
    Math.min(100, Number((((cur.dailyTokenLimit - nextTotal) / cur.dailyTokenLimit) * 100).toFixed(1)))
  );
  const updated: AiUsageStats = {
    ...cur,
    promptTokens: cur.promptTokens + p,
    completionTokens: cur.completionTokens + c,
    totalTokens: nextTotal,
    requestCount: nextReq,
    remainingTokens,
    remainingRequests,
    remainingPercent,
    lastCallTokens: callTotal,
    lastModel: modelName || cur.lastModel,
    lastUpdatedAt: new Date().toISOString(),
  };
  try {
    fs.mkdirSync(path.dirname(AI_USAGE_FILE), { recursive: true });
    fs.writeFileSync(AI_USAGE_FILE, JSON.stringify(updated, null, 2) + "\n", "utf-8");
  } catch {
    // ignore write error
  }
  return updated;
}

/** 사용자가 구버전 모델명("Gemini 2.5" 등)을 입력해도 신규 계정 호환 표준 모델 ID로 정규화 */
export function normalizeModelName(raw: string): string {
  const m = (raw || "").trim();
  if (!m) return DEFAULT_MODEL;
  if (m.toLowerCase().startsWith("claude")) return m;
  const lower = m.toLowerCase().replace(/\s+/g, "-");
  // Google API 신규 프로젝트에서 gemini-2.5 계열이 지원 종료되어 gemini-3.8-flash / gemini-3.5-flash-lite로 자동 매핑
  if (lower === "gemini-2.5" || lower === "gemini2.5" || lower === "gemini-2.5-flash") return "gemini-3.8-flash";
  if (lower === "gemini-2.5-flash-lite") return "gemini-3.5-flash-lite";
  if (lower === "gemini-2.5-pro") return "gemini-3.8-flash";
  if (lower === "gemini-2.0" || lower === "gemini2.0" || lower === "gemini-2.0-flash") return "gemini-3.8-flash";
  return m;
}

export function maskApiKey(key: string): string {
  if (!key) return "";
  return "••••••••••••";
}

export function getAiConfig(): AiConfig {
  let saved: Partial<AiConfig> = {};
  try {
    if (fs.existsSync(AI_CONFIG_FILE)) {
      saved = JSON.parse(fs.readFileSync(AI_CONFIG_FILE, "utf-8"));
    }
  } catch {
    // ignore corrupt config
  }
  const apiKey = (saved.apiKey || process.env.ARC_WIZARD_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY || DEFAULT_API_KEY).trim();
  const isAnthropic = apiKey.startsWith("sk-ant-") || (saved.model && saved.model.toLowerCase().startsWith("claude"));
  const defaultProvider = isAnthropic ? "anthropic" : "auto";
  const defaultModel = isAnthropic ? "claude-opus-5-5" : DEFAULT_MODEL;

  const provider = (saved.provider || process.env.ARC_WIZARD_PROVIDER || defaultProvider) as AiProvider;
  const model = normalizeModelName(saved.model || process.env.ARC_WIZARD_MODEL || defaultModel);
  const baseUrl = (saved.baseUrl ?? process.env.ARC_WIZARD_BASE_URL ?? "").trim();
  return { provider, model, apiKey, baseUrl };
}

export function saveAiConfig(patch: Partial<AiConfig>): AiConfig {
  const current = getAiConfig();
  const next: AiConfig = {
    provider: (patch.provider || current.provider || "auto") as AiProvider,
    model: normalizeModelName(patch.model !== undefined ? patch.model : current.model),
    apiKey: patch.apiKey !== undefined ? patch.apiKey.trim() : current.apiKey,
    baseUrl: patch.baseUrl !== undefined ? patch.baseUrl.trim() : current.baseUrl,
  };
  fs.mkdirSync(path.dirname(AI_CONFIG_FILE), { recursive: true });
  fs.writeFileSync(AI_CONFIG_FILE, JSON.stringify(next, null, 2) + "\n", "utf-8");
  return next;
}

function parseDataUrl(dataUrl?: string): { mimeType: string; data: string } | null {
  if (!dataUrl) return null;
  const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) return null;
  return { mimeType: m[1], data: m[2] };
}

async function callGoogleEndpoint(
  url: string,
  prompt: string,
  image?: { mimeType: string; data: string } | null,
  jsonMode = true
): Promise<string> {
  const parts: Record<string, unknown>[] = [{ text: prompt }];
  if (image) {
    parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
  }
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
  };
  if (jsonMode) {
    body.generationConfig = { responseMimeType: "application/json", temperature: 0.1 };
  }
  // API 키는 URL 쿼리가 아니라 헤더로 전송 (프록시·서버 로그 노출 방지)
  const parsedUrl = new URL(url);
  const apiKeyParam = parsedUrl.searchParams.get("key");
  parsedUrl.searchParams.delete("key");
  const res = await fetch(parsedUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKeyParam ? { "x-goog-api-key": apiKeyParam } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    let cleanMsg = errText.replace(/\s+/g, " ").slice(0, 240);
    try {
      const parsedErr = JSON.parse(errText);
      if (parsedErr?.error?.message) cleanMsg = String(parsedErr.error.message);
    } catch {
      // keep cleanMsg
    }
    throw new Error(`HTTP ${res.status}: ${cleanMsg}`);
  }
  const json = await res.json();
  const replyText = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const meta = json.usageMetadata || {};
  const promptTok = Number(meta.promptTokenCount || Math.ceil(prompt.length / 3));
  const candTok = Number(meta.candidatesTokenCount || Math.ceil(replyText.length / 3));
  const mMatch = url.match(/models\/([^:?]+)/);
  recordAiUsage(promptTok, candTok, mMatch ? decodeURIComponent(mMatch[1]) : undefined);
  return replyText;
}

async function callOpenAiCompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  imageDataUrl?: string
): Promise<string> {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const endpoint = cleanBase.endsWith("/chat/completions") ? cleanBase : `${cleanBase}/chat/completions`;
  const content: unknown = imageDataUrl
    ? [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ]
    : prompt;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content }],
      temperature: 0.1,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    let cleanMsg = errText.replace(/\s+/g, " ").slice(0, 240);
    try {
      const parsedErr = JSON.parse(errText);
      if (parsedErr?.error?.message) cleanMsg = String(parsedErr.error.message);
    } catch {
      // keep cleanMsg
    }
    throw new Error(`HTTP ${res.status}: ${cleanMsg}`);
  }
  const json = await res.json();
  const replyText = json.choices?.[0]?.message?.content || "";
  const usage = json.usage || {};
  recordAiUsage(
    Number(usage.prompt_tokens || Math.ceil(prompt.length / 3)),
    Number(usage.completion_tokens || Math.ceil(replyText.length / 3)),
    model
  );
  return replyText;
}

async function callAnthropicEndpoint(
  apiKey: string,
  model: string,
  prompt: string,
  imageDataUrl?: string,
  baseUrl?: string
): Promise<string> {
  const image = parseDataUrl(imageDataUrl);
  const content: unknown[] = [];
  if (image) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: image.mimeType,
        data: image.data,
      },
    });
  }
  content.push({ type: "text", text: prompt });

  const cleanBase = (baseUrl || "").trim().replace(/\/+$/, "");
  const endpoint = cleanBase
    ? (cleanBase.endsWith("/messages") ? cleanBase : `${cleanBase}/messages`)
    : "https://api.anthropic.com/v1/messages";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2026-10-21",
    },
    body: JSON.stringify({
      model: model || "claude-opus-5-5",
      max_tokens: 4096,
      messages: [{ role: "user", content }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    let cleanMsg = errText.replace(/\s+/g, " ").slice(0, 240);
    try {
      const parsedErr = JSON.parse(errText);
      if (parsedErr?.error?.message) cleanMsg = String(parsedErr.error.message);
    } catch {
      // keep cleanMsg
    }
    throw new Error(`Anthropic HTTP ${res.status}: ${cleanMsg}`);
  }

  const json = await res.json();
  const replyText =
    json.content
      ?.filter((part: any) => part.type === "text")
      ?.map((part: any) => part.text)
      ?.join("\n") || "";

  const usage = json.usage || {};
  recordAiUsage(
    Number(usage.input_tokens || Math.ceil(prompt.length / 3)),
    Number(usage.output_tokens || Math.ceil(replyText.length / 3)),
    model
  );
  return replyText;
}

export interface ScreenSnapshot {
  headings?: string[];
  labels?: string[];
  buttons?: string[];
  inputs?: string[];
  tableColumns?: string[];
  tableRowCount?: number;
}

export async function callAiModel(prompt: string, imageDataUrl?: string, jsonMode = true): Promise<{ text: string; usedEndpoint: string }> {
  const cfg = getAiConfig();
  if (!cfg.apiKey) throw new Error("API 키가 설정되어 있지 않습니다. ⚙️ AI 설정에서 키를 입력해 주세요.");
  const primaryModel = normalizeModelName(cfg.model);
  const image = parseDataUrl(imageDataUrl);

  // 1) Anthropic Claude (provider가 anthropic이거나 키가 sk-ant-로 시작하거나 모델이 claude인 경우 직결)
  if (cfg.provider === "anthropic" || cfg.apiKey.startsWith("sk-ant-") || primaryModel.toLowerCase().startsWith("claude")) {
    const targetModel = primaryModel.toLowerCase().startsWith("claude") ? primaryModel : "claude-opus-5-5";
    const text = await callAnthropicEndpoint(cfg.apiKey, targetModel, prompt, imageDataUrl, cfg.baseUrl);
    return { text, usedEndpoint: `Anthropic Claude (${targetModel})` };
  }

  // 2) OpenAI 호환 커스텀 엔드포인트
  if (cfg.provider === "openai-compatible" || (cfg.baseUrl && cfg.provider === "auto" && !cfg.baseUrl.includes("googleapis.com"))) {
    const base = cfg.baseUrl || "https://api.openai.com/v1";
    const text = await callOpenAiCompatible(base, cfg.apiKey, primaryModel, prompt, imageDataUrl);
    return { text, usedEndpoint: `${base} (${primaryModel})` };
  }

  // 3) Google Gemini API / Vertex AI (무료 티어에서 할당량이 있는 Flash 모델 우선 폴백)
  const fallbackModels = Array.from(
    new Set([primaryModel, "gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3-flash-preview", "gemini-3.1-pro-preview"])
  );

  const endpoints: { name: string; url: string }[] = [];
  if (cfg.baseUrl) {
    for (const m of fallbackModels) {
      endpoints.push({
        name: `Custom (${m})`,
        url: `${cfg.baseUrl.replace(/\/+$/, "")}/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`,
      });
    }
  } else if (cfg.provider === "vertex") {
    for (const m of fallbackModels) {
      endpoints.push({
        name: `Vertex AI (${m})`,
        url: `https://aiplatform.googleapis.com/v1/publishers/google/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`,
      });
    }
  } else {
    // Gemini API (generativelanguage.googleapis.com) 우선 시도 (모델별 자동 폴백 포함)
    for (const m of fallbackModels) {
      endpoints.push({
        name: `Gemini API (${m})`,
        url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`,
      });
    }
    if (cfg.provider === "auto") {
      endpoints.push({
        name: `Vertex AI (${primaryModel})`,
        url: `https://aiplatform.googleapis.com/v1/publishers/google/models/${encodeURIComponent(primaryModel)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`,
      });
    }
  }

  const errors: string[] = [];
  for (const ep of endpoints) {
    try {
      const text = await callGoogleEndpoint(ep.url, prompt, image, jsonMode);
      return { text, usedEndpoint: ep.name };
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      errors.push(`[${ep.name}] ${errMsg}`);
      // Google API가 "Please update your code to use models/xxx"로 대체 모델을 알려준 경우 즉시 해당 모델로 재시도
      const suggested = errMsg.match(/models\/(gemini-[a-z0-9.-]+)/i);
      if (suggested && !fallbackModels.includes(suggested[1])) {
        try {
          const suggestedModel = suggested[1];
          const retryUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(suggestedModel)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;
          const text = await callGoogleEndpoint(retryUrl, prompt, image, jsonMode);
          return { text, usedEndpoint: `Gemini API (${suggestedModel})` };
        } catch {
          // continue fallback loop
        }
      }
    }
  }

  // 모든 기본 모델이 404 등으로 실패한 경우, 해당 API 키에서 실제 허용된 모델 목록을 조회해 Flash 모델 우선 재시도
  try {
    const listRes = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      headers: { "x-goog-api-key": cfg.apiKey },
    });
    if (listRes.ok) {
      const listJson = await listRes.json();
      const models: { name?: string; supportedGenerationMethods?: string[] }[] = listJson.models || [];
      const available = models
        .filter((m) => m.name && m.supportedGenerationMethods?.includes("generateContent") && m.name.includes("gemini"))
        .map((m) => m.name!.replace(/^models\//, ""))
        .sort((a, b) => (a.includes("flash") === b.includes("flash") ? 0 : a.includes("flash") ? -1 : 1));
      for (const m of available.slice(0, 4)) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;
          const text = await callGoogleEndpoint(url, prompt, image, jsonMode);
          return { text, usedEndpoint: `Gemini API (${m})` };
        } catch (e: unknown) {
          errors.push(`[Discovered (${m})] ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
  } catch {
    // ignore model list discovery failure
  }

  throw new Error(errors.slice(0, 3).join("\n"));
}

export async function testAiConnection(): Promise<{ ok: boolean; endpoint: string; model: string; reply: string }> {
  const cfg = getAiConfig();
  const { text, usedEndpoint } = await callAiModel(
    'Return JSON: {"status":"ok","message":"ARC-WIZARD AI 연결 정상"}',
    undefined,
    true
  );
  return { ok: true, endpoint: usedEndpoint, model: cfg.model, reply: text.slice(0, 200) };
}

function extractJsonObject(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first >= 0 && last > first) {
    return JSON.parse(candidate.slice(first, last + 1));
  }
  return JSON.parse(candidate);
}

/** 대용량 페이지 소스에서 사용자 지시어 및 JSX 렌더링 영역만 핵심 추출 */
function extractRelevantSource(source: string, instruction: string): string {
  const lines = source.split("\n");
  if (lines.length <= 750) return source;

  const picked = new Set<number>();
  // 1) 지시어에 포함된 주요 단어(2글자 이상 한글/영문)와 매칭되는 라인 주변 ±12줄 추출
  const keywords = Array.from(
    new Set(
      (instruction.match(/[가-힣A-Za-z0-9_]{2,}/g) || []).filter(
        (w) => !["현재", "화면", "페이지", "소스를", "소스코드", "수정", "바꿔줘", "바꿔", "변경", "해줘", "있냐", "알려줘"].includes(w)
      )
    )
  ).slice(0, 8);

  if (keywords.length > 0) {
    lines.forEach((line, idx) => {
      if (keywords.some((kw) => line.includes(kw))) {
        for (let i = Math.max(0, idx - 10); i <= Math.min(lines.length - 1, idx + 10); i++) {
          picked.add(i);
        }
      }
    });
  }

  // 2) 메인 JSX 렌더링 구간(상단 타이틀/필터/버튼/테이블 헤더 구간) 추가
  let returnIdx = lines.findIndex((l) => /^\s*return\s*\(\s*$/.test(l) && lines.indexOf(l) > lines.length * 0.2);
  if (returnIdx < 0) returnIdx = Math.max(0, Math.floor(lines.length * 0.3));
  for (let i = returnIdx; i < Math.min(lines.length, returnIdx + 380); i++) {
    picked.add(i);
  }

  const sorted = Array.from(picked).sort((a, b) => a - b);
  const chunks: string[] = [];
  let prev = -2;
  for (const idx of sorted) {
    if (idx > prev + 1) chunks.push(`// ... (L.${idx + 1} 구간) ...`);
    chunks.push(lines[idx]);
    prev = idx;
  }
  return chunks.join("\n");
}

/** 현재 화면의 실시간 DOM 스냅샷 + 소스 파일 분석 요약 생성 */
export function buildScreenRecognitionReply(
  pathname: string,
  relFile: string,
  totalLines: number,
  screenContext?: ScreenSnapshot
): string {
  const headings = screenContext?.headings?.length ? screenContext.headings.slice(0, 6).join(" / ") : "(감지된 헤더 없음)";
  const labels = screenContext?.labels?.length ? screenContext.labels.slice(0, 12).join(", ") : "(감지된 라벨 없음)";
  const buttons = screenContext?.buttons?.length ? screenContext.buttons.slice(0, 12).join(", ") : "(감지된 버튼 없음)";
  const cols = screenContext?.tableColumns?.length ? screenContext.tableColumns.join(", ") : "(테이블 컬럼 없음)";
  const rows = screenContext?.tableRowCount ?? 0;

  return `✅ **네, 현재 화면과 연결된 소스 코드를 실시간으로 인식하고 있습니다.**

• **현재 경로**: \`${pathname}\`
• **연결된 소스 파일**: \`${relFile}\` (총 ${totalLines.toLocaleString()}라인)
• **화면 상단 타이틀/배너**: ${headings}
• **인식된 필터/라벨**: ${labels}
• **인식된 버튼**: ${buttons}
• **인식된 테이블 컬럼 (${screenContext?.tableColumns?.length || 0}개)**: ${cols} (현재 ${rows}행 표시 중)

💡 **바로 이렇게 소스 수정을 지시해 보세요:**
1. **문구/라벨/버튼 수정**: \`"구분:"을 "구분 필터:"로 바꿔줘\` 또는 \`"조회 기간"을 "기간"으로 바꿔줘\`
2. **스타일/코드 수정**: \`"전체 0~13단계 파이프라인 매트릭스" 버튼 색상을 보라색에서 파란색으로 바꿔줘\`
3. **클릭으로 직접 선택**: 하단 **[🎯 요소 선택해서 문구 바꾸기]** 버튼을 누르고 화면의 원하는 글자를 클릭하세요.`;
}

/** 설정된 AI 모델(Gemini 2.5 등)로 화면 인식 질문 답변 및 소스 코드 편집안 생성 */
export async function proposeEditsWithLLM(
  instruction: string,
  pathname: string,
  imageDataUrl?: string,
  screenContext?: ScreenSnapshot
): Promise<{ edits: EditRequest[]; reply?: string; endpoint?: string } | null> {
  // 0. 프롬프트 보안 정책 및 아크위저드 자기 수정 금지 사전 검증
  const securityBlock = validateInstructionSecurity(instruction);
  if (securityBlock) {
    return { edits: [], reply: securityBlock };
  }

  const cfg = getAiConfig();
  const rel = routePageFile(pathname);
  if (!rel) return { edits: [], reply: `현재 경로(${pathname})에 매핑된 page.tsx 파일을 찾을 수 없습니다.` };
  const abs = resolveSafePath(rel);
  const source = fs.readFileSync(abs, "utf-8");
  const lines = source.split("\n");

  // 화면 인식 여부나 화면 구성을 묻는 질문이고 구체적인 변경 지시가 없는 경우 즉시 정확한 화면 인식 정보 제공 + AI 보충
  const isRecognitionQuestion =
    /(화면.*인식|인식.*할\s*수|인식.*되|무슨\s*화면|어떤\s*화면|화면\s*구성|현재\s*화면.*뭐|소스를?\s*수정.*할\s*수)/i.test(instruction) &&
    !/(바꿔|변경|수정해|고쳐|숨겨|지워|추가해)/.test(instruction);

  if (isRecognitionQuestion) {
    return {
      edits: [],
      reply: buildScreenRecognitionReply(pathname, rel, lines.length, screenContext),
    };
  }

  if (!cfg.apiKey) return null;

  const excerpt = extractRelevantSource(source, instruction);
  const domSummary = screenContext
    ? [
        `[현재 브라우저 화면 실시간 DOM 인식 정보]`,
        `- 경로: ${pathname} (소스: ${rel}, 총 ${lines.length}줄)`,
        `- 제목/헤더: ${(screenContext.headings || []).join(" | ")}`,
        `- 필터/라벨: ${(screenContext.labels || []).join(", ")}`,
        `- 버튼: ${(screenContext.buttons || []).join(", ")}`,
        `- 입력창 placeholder: ${(screenContext.inputs || []).join(", ")}`,
        `- 테이블 컬럼: ${(screenContext.tableColumns || []).join(", ")} (${screenContext.tableRowCount ?? 0}행)`,
      ].join("\n")
    : `경로: ${pathname} (소스: ${rel})`;

  const sidebarRel = "src/components/app-sidebar.tsx";
  const sidebarAbs = path.join(ROOT, sidebarRel);
  const sidebarExcerpt = fs.existsSync(sidebarAbs)
    ? fs.readFileSync(sidebarAbs, "utf-8").split("\n").slice(60, 210).join("\n")
    : "";

  // 현재 페이지에서 import한 공통/도메인 컴포넌트 파일(예: DateRangeFilter 등)도 함께 전달하여 내부 버튼/필터 수정까지 지원 (vibe-coding 제외)
  const importedComponentBlocks: string[] = [];
  const importRegex = /from\s+["']@\/components\/(?!ui\/|vibe-coding\/)([^"']+)["']/g;
  for (const m of source.matchAll(importRegex)) {
    const compRel = `src/components/${m[1].replace(/\.(tsx|ts)$/, "")}.tsx`;
    if (compRel.includes("vibe-coding") || compRel.includes("arc-wizard")) continue;
    const compAbs = path.join(ROOT, compRel);
    if (fs.existsSync(compAbs) && importedComponentBlocks.length < 2) {
      const compContent = fs.readFileSync(compAbs, "utf-8");
      importedComponentBlocks.push(
        `\n[IMPORTED COMPONENT (${compRel})]:\n${extractRelevantSource(compContent, instruction)}`
      );
    }
  }

  const prompt = `당신은 MPSI SCM 포털의 실시간 화면 인식 및 Next.js(React/TSX) 풀스택 소스 코드 수정 에이전트(ARC-WIZARD)입니다.

${domSummary}

[사용자 요청]:
"${instruction || "첨부한 이미지를 참고해 화면 소스를 수정해줘"}"

[절대 보안 및 제약 규칙 - 최우선 준수]:
1. 아크위저드(ARC-WIZARD, vibe-coding, arc-wizard-floating, source-editor, command-parser) 관련 소스 코드는 어떠한 경우에도 수정할 수 없습니다. 요청 시 "edits": [] 로 반환하고 "reply"에 "보안 정책상 아크위저드 자체 소스 코드는 수정할 수 없습니다."라고 안내하세요.
2. 보안사항을 위배하는 코드(권한/인증 우회, 비밀번호·API 키·환경변수 노출, eval/Function 동적 실행, dangerouslySetInnerHTML/innerHTML 등 XSS 유발 코드, child_process/fs 등 시스템 제어, 외부 도메인 데이터 전송, DB 파괴 쿼리 등)는 절대 생성하거나 실행할 수 없습니다. 요청 시 즉시 거절 사유를 "reply"에 반환하고 "edits": [] 로 반환하세요.

[작성 규칙]:
1. 사용자가 현재 화면이나 메뉴에 대해 질문한 경우: "reply"에 한국어로 정확히 답변하고 "edits"는 []로 반환하세요.
2. 사용자가 **명확히 좌측 메뉴(사이드바) 아래에 새로운 페이지/메뉴 신설**을 요청한 경우에만:
   "createPage": { "parentMenu": "시스템관리 | 기초정보 | 프로젝트 관리 | 금형-견적관리 | 금형-개발 관리(자체/외주) | 금형-양산 관리(자체/외주)", "pageTitle": "메뉴명" } 을 포함하세요.
   (주의: 화면 내 버튼 추가, 필터 추가, 컬럼 추가, 문구 변경 요청에는 절대 "createPage"를 넣지 마세요!)
3. 사용자가 현재 화면(${rel}), 하위 컴포넌트(예: DateRangeFilter 등), 또는 사이드바(${sidebarRel})의 문구, 라벨, 버튼 추가/수정, 스타일(className), JSX 구조 등 소스 코드 수정을 요청한 경우:
   - "edits" 배열에 { "file": "${rel}" (또는 실제 해당 코드가 위치한 "src/components/..." 경로), "search": "파일에 실제 존재하는 정확한 원본 코드/문구", "replace": "수정할 새 코드/문구" } 를 넣으세요.
4. 반드시 아래 JSON 스키마로만 응답하세요:
{
  "reply": "사용자에게 보여줄 설명 또는 수정 내역 요약 (한국어)",
  "createPage": null,
  "edits": [
    { "file": "${rel}", "search": "원본 코드/문구", "replace": "새 코드/문구" }
  ]
}

[SIDEBAR (${sidebarRel} 메뉴 정의 발췌)]:
${sidebarExcerpt}
${importedComponentBlocks.join("\n")}

[SOURCE (${rel} 발췌)]:
${excerpt}`;

  try {
    const { text, usedEndpoint } = await callAiModel(prompt, imageDataUrl, true);
    const parsed = extractJsonObject(text);

    // AI가 신규 페이지 생성을 결정한 경우 즉시 실행
    const cp = parsed.createPage as { parentMenu?: string; pageTitle?: string; slug?: string } | undefined;
    if (cp && cp.pageTitle) {
      const created = createMenuAndPage(cp.parentMenu || "시스템관리", cp.pageTitle, cp.slug);
      return {
        edits: [],
        reply: `✅ **[${ usedEndpoint }] 좌측 메뉴 [${created.parentMenu}] 하위에 [${created.pageTitle}] 페이지를 생성했습니다!**\n\n• **접속 경로**: \`${created.routeUrl}\`\n• **생성된 파일**: \`${created.pageFile}\`\n${typeof parsed.reply === "string" ? `\n${parsed.reply}` : ""}`,
        endpoint: usedEndpoint,
      };
    }

    const out: EditRequest[] = [];
    const rawEdits = Array.isArray(parsed.edits) ? parsed.edits : [];
    let blockedReason: string | null = null;

    for (const e of rawEdits as { file?: string; search?: string; replace?: string }[]) {
      if (!e?.search || typeof e.replace !== "string" || e.search === e.replace) continue;
      const targetRel: string = e.file && e.file.startsWith("src/") ? e.file : rel;
      if (targetRel.includes("vibe-coding") || targetRel.includes("arc-wizard")) {
        blockedReason = "🚫 **[보안 정책 차단]** 아크위저드(ARC-WIZARD) 관련 소스 코드는 수정할 수 없습니다.";
        continue;
      }
      const repErr = validateReplacement(e.replace, true);
      if (repErr) {
        blockedReason = `🚫 **[${repErr}]**`;
        continue;
      }
      // AI 제안 범위: 현재 화면 page + 공통/도메인 컴포넌트 + 사이드바만 (그 외 파일 제안은 폐기)
      const inScope =
        targetRel === rel ||
        targetRel === sidebarRel ||
        (targetRel.startsWith("src/components/") &&
          !targetRel.startsWith("src/components/ui/") &&
          !targetRel.startsWith("src/components/vibe-coding/"));
      if (!inScope) continue;
      let targetSource = source;
      let targetLines = lines;
      if (targetRel !== rel) {
        try {
          const targetAbs = resolveSafePath(targetRel);
          targetSource = fs.readFileSync(targetAbs, "utf-8");
          targetLines = targetSource.split("\n");
        } catch {
          continue;
        }
      }
      const idx = targetLines.findIndex((l) => l.includes(e.search!));
      if (idx >= 0) {
        out.push({ file: targetRel, line: idx + 1, col: targetLines[idx].indexOf(e.search), from: e.search, to: e.replace });
      } else {
        const normSource = targetSource.replace(/\r\n/g, "\n");
        const normSearch = e.search.replace(/\r\n/g, "\n");
        const pos = normSource.indexOf(normSearch);
        if (pos >= 0) {
          const lineNo = normSource.slice(0, pos).split("\n").length;
          out.push({ file: targetRel, line: lineNo, col: 0, from: normSearch, to: e.replace.replace(/\r\n/g, "\n") });
        }
      }
    }
    return {
      edits: out,
      reply:
        out.length === 0 && blockedReason
          ? blockedReason
          : typeof parsed.reply === "string"
          ? parsed.reply
          : undefined,
      endpoint: usedEndpoint,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      edits: [],
      reply: `⚠️ 외부 AI 모델 호출 중 오류가 발생했습니다:\n${msg}\n\n💡 다음 기능은 외부 AI 연결 없이도 즉시 실행됩니다:\n• **페이지/메뉴 추가**: \`왼쪽메뉴에서 시스템관리 아래에 빈 페이지를 만들어 줄수 있어?\`\n• **화면 문구 수정**: 🎯 **[요소 선택해서 문구 바꾸기]** 또는 \`"기존문구"를 "새문구"로 바꿔줘\`\n• **컬럼 숨김/복원**: \`"컬럼명" 컬럼 숨겨줘\` / \`되돌려줘\``,
    };
  }
}



import { NextRequest, NextResponse } from "next/server";
import {
  searchCandidates,
  applyEdits,
  listHistory,
  undoHistory,
  readOverrides,
  setColumnHidden,
  routePageFile,
  proposeEditsWithLLM,
  validateReplacement,
  getAiConfig,
  saveAiConfig,
  getAiUsage,
  maskApiKey,
  testAiConnection,
  createMenuAndPage,
  type AiProvider,
  type EditRequest,
} from "@/lib/vibe-coding/source-editor";

/**
 * ARC-WIZARD 바이브 코딩 API (결정적 엔진, LLM 불필요)
 *
 * POST body: { action, ... }
 *  - info      : { pathname }                      → 현재 화면 소스 파일/숨김 컬럼 정보
 *  - search    : { pathname, texts: string[] }     → 화면 문구의 소스 위치 후보
 *  - apply     : { edits: EditRequest[], summary } → 선택한 위치 치환 + 백업
 *  - hideColumn: { pathname, column, hidden }      → 숨김 컬럼 설정 저장
 *  - history   : {}                                → 최근 변경 이력
 *  - undo      : { id? }                           → 변경 되돌리기
 *  - freeform  : { pathname, instruction }         → (GEMINI_API_KEY 있을 때만) 편집안 제안
 *
 * 보안: 개발 서버(next dev)에서만 동작, 동일 출처 요청 + ADMIN 헤더 필요.
 * ※ 현재 프로젝트의 로그인 권한은 클라이언트(localStorage)에만 있어 서버측 세션 검증은 불가하므로
 *    개발 환경 한정으로 운영하는 것을 전제로 한다.
 */

function guard(req: NextRequest): NextResponse | null {
  if (process.env.ARC_WIZARD_ENABLED === "false") {
    return NextResponse.json({ ok: false, error: "ARC-WIZARD 기능이 비활성화되어 있습니다." }, { status: 403 });
  }
  const host = req.headers.get("host") || "";
  // Origin 헤더가 존재하는 경우 동일 출처 검증 (GET 요청은 브라우저가 Origin을 생략할 수 있음)
  const origin = req.headers.get("origin");
  if (origin) {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = "";
    }
    if (host && originHost && originHost !== host) {
      return NextResponse.json({ ok: false, error: "허용되지 않은 출처의 요청입니다." }, { status: 403 });
    }
  }
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return NextResponse.json({ ok: false, error: "허용되지 않은 출처의 요청입니다." }, { status: 403 });
  }
  // 선택: ARC_WIZARD_ADMIN_TOKEN 이 설정되면 토큰 일치 필수 (서버 세션 도입 전 임시 보강)
  const adminToken = process.env.ARC_WIZARD_ADMIN_TOKEN;
  if (adminToken && req.headers.get("x-arc-wizard-token") !== adminToken) {
    return NextResponse.json({ ok: false, error: "인증 토큰이 필요합니다." }, { status: 403 });
  }
  if (req.headers.get("x-arc-wizard-role") !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "시스템 관리자만 사용할 수 있습니다." }, { status: 403 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const blocked = guard(req);
  if (blocked) return blocked;
  return NextResponse.json({
    ok: true,
    usage: getAiUsage(),
  });
}

export async function POST(req: NextRequest) {
  const blocked = guard(req);
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const action = String(body.action || "");
    const pathname = String(body.pathname || "");

    switch (action) {
      case "usage": {
        return NextResponse.json({
          ok: true,
          usage: getAiUsage(),
        });
      }

      case "info": {
        const ai = getAiConfig();
        return NextResponse.json({
          ok: true,
          pageFile: routePageFile(pathname),
          hiddenColumns: readOverrides().hiddenColumns[pathname] || [],
          llmEnabled: Boolean(ai.apiKey),
          usage: getAiUsage(),
          aiConfig: {
            provider: ai.provider,
            model: ai.model,
            maskedKey: maskApiKey(ai.apiKey),
            hasKey: Boolean(ai.apiKey),
            baseUrl: ai.baseUrl || "",
          },
        });
      }

      case "saveAiConfig": {
        const next = saveAiConfig({
          provider: body.provider as AiProvider | undefined,
          model: typeof body.model === "string" ? body.model : undefined,
          apiKey: typeof body.apiKey === "string" ? body.apiKey : undefined,
          baseUrl: typeof body.baseUrl === "string" ? body.baseUrl : undefined,
        });
        return NextResponse.json({
          ok: true,
          llmEnabled: Boolean(next.apiKey),
          usage: getAiUsage(),
          aiConfig: {
            provider: next.provider,
            model: next.model,
            maskedKey: maskApiKey(next.apiKey),
            hasKey: Boolean(next.apiKey),
            baseUrl: next.baseUrl || "",
          },
        });
      }

      case "testAi": {
        const result = await testAiConnection();
        return NextResponse.json({ ...result, usage: getAiUsage() });
      }

      case "search": {
        const texts: string[] = Array.isArray(body.texts) ? body.texts.map(String) : [];
        const result = searchCandidates(texts, pathname);
        return NextResponse.json({ ok: true, ...result, pageFile: routePageFile(pathname) });
      }

      case "apply": {
        const edits: EditRequest[] = Array.isArray(body.edits) ? body.edits : [];
        for (const e of edits) {
          const err = validateReplacement(String(e.to ?? ""));
          if (err) return NextResponse.json({ ok: false, error: err }, { status: 400 });
        }
        const result = applyEdits(
          edits.map((e) => ({ file: String(e.file), line: Number(e.line), col: Number(e.col), from: String(e.from), to: String(e.to) })),
          String(body.summary || "문구 변경")
        );
        return NextResponse.json({ ok: true, ...result });
      }

      case "hideColumn": {
        const result = setColumnHidden(pathname, String(body.column || ""), body.hidden !== false);
        return NextResponse.json({ ok: true, ...result });
      }

      case "createPage": {
        const result = createMenuAndPage(
          String(body.parentMenu || "시스템관리"),
          String(body.pageTitle || "빈 페이지"),
          typeof body.slug === "string" ? body.slug : undefined
        );
        return NextResponse.json({ ok: true, ...result });
      }

      case "history":
        return NextResponse.json({ ok: true, history: listHistory(10) });

      case "undo": {
        const result = undoHistory(body.id ? String(body.id) : undefined);
        return NextResponse.json({ ok: true, ...result });
      }

      case "freeform": {
        const res = await proposeEditsWithLLM(
          String(body.instruction || ""),
          pathname,
          typeof body.imageDataUrl === "string" ? body.imageDataUrl : undefined,
          body.screenContext && typeof body.screenContext === "object" ? body.screenContext : undefined
        );
        if (res === null) return NextResponse.json({ ok: false, reason: "NO_LLM" });
        return NextResponse.json({ ok: true, ...res, usage: getAiUsage() });
      }

      default:
        return NextResponse.json({ ok: false, error: `알 수 없는 action: ${action}` }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * 소프트러시(SoftRush) 협업 과제용 정적 라이브러리 호스팅 라우트
 *
 * 제공 경로 (v1.0.0):
 *  - GET /truck-twin/1.0.0/truck-twin.min.js       (본체 스크립트, ~600KB)
 *  - GET /truck-twin/1.0.0/truck-twin.min.js.sri   (무결성 해시 sha384-...)
 *  - GET /truck-twin/1.0.0/demo/index.html         (호스팅 확인용 3D 트럭 데모 페이지)
 *  - GET /truck-twin/1.0.0/demo/demo-key.js        (데모용 테스트 키, ~2026-12-02)
 *  - GET /truck-twin/1.0.0/README.md               (호스팅 안내 문서)
 *
 * ※ 과제 종료 후 본 폴더(src/app/truck-twin)와 ACRFORGE/truck-twin-1.0.0 폴더만 제거하면 완전히 정리됩니다.
 */

const MIME_MAP: Record<string, string> = {
  ".js": "application/javascript; charset=utf-8",
  ".sri": "text/plain; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function resolveVersionDir(version: string): string | null {
  // 버전 문자열 검증 (예: 1.0.0)
  if (!/^[0-9a-zA-Z._-]+$/.test(version) || version.includes("..")) {
    return null;
  }
  const root = process.cwd();
  const candidates = [
    path.join(root, "ACRFORGE", `truck-twin-${version}`),
    path.join(root, "public", "truck-twin", version),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      return dir;
    }
  }
  return null;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ version: string; slug: string[] }> }
) {
  const { version, slug } = await context.params;
  const baseDir = resolveVersionDir(version);
  if (!baseDir) {
    return new NextResponse("Not Found (unknown truck-twin version)", { status: 404 });
  }

  // /truck-twin/1.0.0/demo 로 접속 시 상대경로(../truck-twin.min.js, demo-key.js)가 깨지지 않도록 /demo/index.html 로 리다이렉트
  if (slug.length === 1 && slug[0] === "demo") {
    const url = req.nextUrl.clone();
    url.pathname = `/truck-twin/${version}/demo/index.html`;
    return NextResponse.redirect(url, 307);
  }

  // 경로 탈출(Path Traversal) 방지
  for (const part of slug) {
    if (!part || part === "." || part === ".." || part.includes("/") || part.includes("\\")) {
      return new NextResponse("Bad Request", { status: 400 });
    }
  }

  const targetPath = path.resolve(baseDir, ...slug);
  const normBase = path.resolve(baseDir) + path.sep;
  if (!targetPath.startsWith(normBase)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // 원본 바이트 그대로 읽기 (SRI sha384 무결성 100% 보존)
  const fileBuffer = fs.readFileSync(targetPath);
  const ext = path.extname(targetPath).toLowerCase();
  const contentType = MIME_MAP[ext] || "application/octet-stream";

  // 소프트러시 요청 헤더 규격 준수:
  // - Content-Type: application/javascript; charset=utf-8
  // - Cache-Control: public, max-age=31536000, immutable (버전 경로일 때)
  // - Access-Control-Allow-Origin: * (SRI integrity 검증 대응)
  // - X-Content-Type-Options: nosniff
  const isImmutableAsset = ext === ".js" || ext === ".sri";
  const cacheControl = isImmutableAsset
    ? "public, max-age=31536000, immutable"
    : "public, max-age=600";

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(fileBuffer.byteLength),
      "Cache-Control": cacheControl,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function HEAD(
  req: NextRequest,
  context: { params: Promise<{ version: string; slug: string[] }> }
) {
  const res = await GET(req, context);
  return new NextResponse(null, {
    status: res.status,
    headers: res.headers,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getGatewayConfig, saveGatewayConfig } from "@/lib/logistics-gateway";

/**
 * 게이트웨이 연동 설정 조회 및 런타임 저장 (MPSI_GW_BASE_URL / MPSI_API_KEY)
 */
export async function GET() {
  const cfg = getGatewayConfig();
  return NextResponse.json({
    ok: true,
    baseUrl: cfg.baseUrl,
    hasApiKey: Boolean(cfg.apiKey),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const patch: { baseUrl?: string; apiKey?: string } = {};
  if (typeof body.baseUrl === "string") patch.baseUrl = body.baseUrl;
  if (typeof body.apiKey === "string" && body.apiKey.trim()) patch.apiKey = body.apiKey;
  const saved = saveGatewayConfig(patch);
  return NextResponse.json({
    ok: true,
    baseUrl: saved.baseUrl,
    hasApiKey: Boolean(saved.apiKey),
  });
}

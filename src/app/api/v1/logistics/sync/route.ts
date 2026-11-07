import { NextRequest, NextResponse } from "next/server";
import { callLogisticsGateway } from "@/lib/logistics-gateway";

/**
 * ④ 동기화 (POST /api/v1/logistics/sync)
 *    - [소프트러쉬 API 동기화 (Pull)] 버튼 호출용
 *    - 게이트웨이가 GetDelivery -> ShowDelivery를 수행하고 최신 현황을 반영해 반환
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const payload: Record<string, unknown> = {};
  if (typeof body?.projectNo === "string" && body.projectNo.trim()) {
    payload.projectNo = body.projectNo.trim();
  }

  const result = await callLogisticsGateway("/api/v1/logistics/sync", {
    method: "POST",
    body: payload,
  });

  return NextResponse.json(
    {
      ...result,
      requestPayload: payload,
    },
    { status: 200 }
  );
}

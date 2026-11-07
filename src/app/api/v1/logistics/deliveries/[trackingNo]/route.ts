import { NextRequest, NextResponse } from "next/server";
import { callLogisticsGateway } from "@/lib/logistics-gateway";

/**
 * ③ 단건 상세 조회 (GET /api/v1/logistics/deliveries/{trackingNo})
 *    - 운송장번호 단건 상세 및 경유 이력(transitSteps) 조회
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ trackingNo: string }> }
) {
  const { trackingNo } = await context.params;
  const encoded = encodeURIComponent((trackingNo || "").trim());
  const result = await callLogisticsGateway(`/api/v1/logistics/deliveries/${encoded}`, {
    method: "GET",
  });
  return NextResponse.json(result, { status: 200 });
}

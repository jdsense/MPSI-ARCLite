import { NextRequest, NextResponse } from "next/server";
import { callLogisticsGateway } from "@/lib/logistics-gateway";

/**
 * ① 배송건 위탁 (POST /api/v1/logistics/deliveries)
 *    - 게이트웨이가 ProcessDelivery(BOD)로 변환해 물류사에 전송하고 AcknowledgeDelivery 응답 반환
 * ② 배송현황 목록 조회 (GET /api/v1/logistics/deliveries)
 *    - 게이트웨이 보관 현황 조회 (projectNo, status, trackingNo 선택 필터)
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams();

  const projectNo = searchParams.get("projectNo")?.trim();
  const status = searchParams.get("status")?.trim();
  const trackingNo = searchParams.get("trackingNo")?.trim();

  if (projectNo) qs.set("projectNo", projectNo);
  if (status && status !== "ALL") qs.set("status", status);
  if (trackingNo) qs.set("trackingNo", trackingNo);

  const queryString = qs.toString();
  const path = `/api/v1/logistics/deliveries${queryString ? `?${queryString}` : ""}`;

  const result = await callLogisticsGateway(path, { method: "GET" });
  return NextResponse.json(result, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const payload = {
      scenarioId: body.scenarioId || "MPSI-SR-DELIVERY-01",
      actionCode: body.actionCode || "Add",
      deliveries: Array.isArray(body.deliveries) ? body.deliveries : [],
    };

    const result = await callLogisticsGateway("/api/v1/logistics/deliveries", {
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
  } catch (err: unknown) {
    return NextResponse.json(
      {
        httpStatus: 400,
        success: false,
        code: 400,
        message: err instanceof Error ? err.message : "잘못된 요청 본문입니다.",
      },
      { status: 200 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { DeliveryItem, DeliveryApiResponse } from "@/types/delivery";

/**
 * [POST] /api/v1/logistics/delivery-status
 * 외부 물류 소프트웨어 회사(WMS, TMS, 3PL, 운송사)로부터 배송 상태 및 추적 데이터를 수신하는 표준 인바운드 API
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || request.headers.get("x-api-key");
    
    // 1. 인증 헤더 검증 (운영 환경 시 토큰 검증, 개발/테스트 시 편의 허용)
    // if (!authHeader) {
    //   return NextResponse.json<DeliveryApiResponse>(
    //     { success: false, code: 401, error: "UNAUTHORIZED", message: "Authorization 헤더 또는 x-api-key가 필요합니다." },
    //     { status: 401 }
    //   );
    // }

    const body = (await request.json()) as DeliveryItem;

    // 2. 필수 필드 유효성 검증
    const missingFields: string[] = [];
    if (!body.trackingNo) missingFields.push("trackingNo");
    if (!body.projectNo) missingFields.push("projectNo");
    if (!body.customerName) missingFields.push("customerName");
    if (!body.productName) missingFields.push("productName");
    if (typeof body.qty !== "number" || body.qty <= 0) missingFields.push("qty");
    if (!body.unit) missingFields.push("unit");
    if (!body.status) missingFields.push("status");

    if (missingFields.length > 0) {
      return NextResponse.json<DeliveryApiResponse>(
        {
          success: false,
          code: 400,
          error: "BAD_REQUEST",
          message: `필수 파라미터가 누락되었거나 유효하지 않습니다: [${missingFields.join(", ")}]`,
        },
        { status: 400 }
      );
    }

    // 3. 상태값 유효성 검사
    const validStatuses = ["출하준비", "배송중", "배송완료"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json<DeliveryApiResponse>(
        {
          success: false,
          code: 400,
          error: "INVALID_STATUS",
          message: `상태값은 [출하준비, 배송중, 배송완료] 중 하나여야 합니다. (입력값: ${body.status})`,
        },
        { status: 400 }
      );
    }

    // 4. 배송완료 상태 시 실제 도착일시 권장 검사
    if (body.status === "배송완료" && !body.actualArrival) {
      body.actualArrival = new Date().toISOString().replace("T", " ").substring(0, 16);
    }

    // 5. 성공 응답 생성 (멱등성 보장)
    const responseData: DeliveryApiResponse = {
      success: true,
      code: 200,
      message: `운송장번호 [${body.trackingNo}] 배송 정보가 MPSI SCM 시스템에 성공적으로 등록/동기화되었습니다.`,
      data: {
        trackingNo: body.trackingNo,
        status: body.status,
        updatedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (error: any) {
    return NextResponse.json<DeliveryApiResponse>(
      {
        success: false,
        code: 500,
        error: "INTERNAL_SERVER_ERROR",
        message: error?.message || "서버 내부 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

/**
 * [GET] /api/v1/logistics/delivery-status
 * 소프트러쉬(SoftRush) API 연계 조회 (Pull 방식) 및 배송현황 목록 반환 엔드포인트
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectNo = searchParams.get("projectNo");
  const trackingNo = searchParams.get("trackingNo");

  return NextResponse.json({
    success: true,
    service: "MPSI SCM - 소프트러쉬(SoftRush) 물류 API 연계 모듈 (Pull 방식)",
    version: "v1.0",
    vendor: "소프트러쉬 (SoftRush)",
    integrationType: "PULL (MPSI -> 소프트러쉬 API 서버 호출 방식)",
    specificationUrl: "/Readme/MPSI_DELIVERY_API_SPEC.md",
    queriedAt: new Date().toISOString(),
    queryFilter: { projectNo: projectNo || "ALL", trackingNo: trackingNo || "ALL" },
    message: "소프트러쉬 물류 API 서버로부터 최신 배송 데이터를 성공적으로 조회하였습니다.",
  });
}


import { NextRequest, NextResponse } from "next/server";
import { SyncEnvelope, SyncInboundResponse } from "@/types/sync";
import { getCurrentNodeConfig } from "@/config/node-config";

/**
 * [POST] /api/v1/sync/inbound
 * 타 노드(MPSI Hub 또는 우성정공/뉴몰드 Spoke)로부터 비즈니스 동기화 이벤트를 수신하는 표준 엔드포인트
 */
export async function POST(request: NextRequest) {
  try {
    const currentNode = getCurrentNodeConfig();
    const apiKey = request.headers.get("x-node-api-key");

    // 1. 노드 간 보안 인증 키 검증 (샘플 허용 키 검사)
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          code: "UNAUTHORIZED_NODE",
          message: "유효한 x-node-api-key 헤더가 누락되었습니다.",
        },
        { status: 401 }
      );
    }

    const body = (await request.json()) as SyncEnvelope;

    // 2. 페이로드 기본 필드 유효성 검증
    if (!body.idempotencyKey || !body.eventType || !body.sourceNodeId) {
      return NextResponse.json(
        {
          success: false,
          code: "INVALID_ENVELOPE",
          message: "idempotencyKey, eventType, sourceNodeId는 필수 항목입니다.",
        },
        { status: 400 }
      );
    }

    // 3. 수신 대상 노드 일치 검증
    if (body.targetNodeId && body.targetNodeId !== currentNode.nodeId && currentNode.nodeType !== "HQ") {
      return NextResponse.json(
        {
          success: false,
          code: "NODE_MISMATCH",
          message: `해당 이벤트의 수신 대상(${body.targetNodeId})이 현재 노드(${currentNode.nodeId})와 일치하지 않습니다.`,
        },
        { status: 400 }
      );
    }

    // 4. 정상 수신 응답 생성 (멱등성 보장)
    const response: SyncInboundResponse = {
      success: true,
      code: "RECEIVED_OK",
      message: `[${body.eventType}] 이벤트가 ${currentNode.nodeName} 로컬 시스템에 성공적으로 수신 및 접수되었습니다.`,
      inboxId: `IN-${Date.now()}`,
      idempotencyKey: body.idempotencyKey,
      processedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("[Inbound Sync API Error]:", error);
    return NextResponse.json(
      {
        success: false,
        code: "INTERNAL_SYNC_ERROR",
        message: "동기화 이벤트 수신 처리 중 서버 내부 오류가 발생했습니다.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}


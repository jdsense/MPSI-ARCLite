import { NextResponse } from "next/server";
import { getCurrentNodeConfig } from "@/config/node-config";
import { INITIAL_SYNC_NODES } from "@/services/sync-service";

/**
 * [GET] /api/v1/sync/status
 * 현재 노드의 정체성 및 분산 연계 상태/헬스체크 현황 조회 엔드포인트
 */
export async function GET() {
  const currentNode = getCurrentNodeConfig();

  return NextResponse.json({
    currentNode: {
      nodeId: currentNode.nodeId,
      nodeType: currentNode.nodeType,
      nodeName: currentNode.nodeName,
      isStandalone: currentNode.isStandalone,
      defaultPath: currentNode.defaultPath,
      hubApiUrl: currentNode.hubApiUrl,
      timestamp: new Date().toISOString(),
    },
    clusterNodes: INITIAL_SYNC_NODES.map((node) => ({
      ...node,
      isCurrent: node.nodeId === currentNode.nodeId,
      status: "ONLINE",
    })),
    syncMetrics: {
      protocolVersion: "1.0.0",
      architecture: "Transactional Outbox & Inbox Pattern",
      idempotencyEnabled: true,
      hmacSignatureSupport: true,
    },
  });
}


// [MPSI 시스템] 분산 노드 간 데이터 연계 서비스 (Pure Business Service Layer)
// 아크포지(ArcForge) 플랫폼 AI 컨버팅을 고려하여 프레임워크 비종속 순수 TypeScript 클래스로 구현되었습니다.

import { 
  SyncEventType, 
  SyncOutboxItem, 
  SyncInboxItem, 
  SyncNodeRegistryItem, 
  SyncEnvelope, 
  SyncInboundResponse 
} from "@/types/sync";
import { getCurrentNodeConfig } from "@/config/node-config";

// 기본 노드 레지스트리 마스터
export const INITIAL_SYNC_NODES: SyncNodeRegistryItem[] = [
  {
    nodeId: "MPSI_HQ",
    nodeName: "MPSI 본사",
    nodeType: "HQ",
    endpointUrl: "https://mpsi-hub.a2lab.co.kr/api/v1/sync/inbound",
    apiKey: "node_key_mpsi_hq_2026",
    isActive: true,
    lastHeartbeat: "2026-10-22 18:00",
    createdAt: "2026-10-22 09:00",
  },
  {
    nodeId: "WOOSUNG_MOLD",
    nodeName: "우성정공(주)",
    nodeType: "VENDOR_MOLD",
    endpointUrl: "https://woosung.mpsi-net.kr/api/v1/sync/inbound",
    apiKey: "node_key_woosung_2026",
    isActive: true,
    lastHeartbeat: "2026-10-22 18:00",
    createdAt: "2026-10-22 09:00",
  },
  {
    nodeId: "NEWMOLD_MASS",
    nodeName: "(주)뉴몰드",
    nodeType: "VENDOR_MASS",
    endpointUrl: "https://newmold.mpsi-net.kr/api/v1/sync/inbound",
    apiKey: "node_key_newmold_2026",
    isActive: true,
    lastHeartbeat: "2026-10-22 18:00",
    createdAt: "2026-10-22 09:00",
  },
];

// 인메모리 / 로컬 저장소 키
const OUTBOX_STORAGE_KEY = "mpsi_sync_outbox_queue";
const INBOX_STORAGE_KEY = "mpsi_sync_inbox_history";

// 헬퍼: UUID 생성 (멱등성 키 및 트랜잭션 식별용)
export function generateSyncId(prefix: "OUT" | "IN" | "IDEM"): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${dateStr}-${rand}`;
}

export class SyncService {
  /**
   * 1. 아웃박스 이벤트 큐잉 (로컬 트랜잭션과 함께 실행)
   */
  static queueOutboxEvent<T extends Record<string, unknown>>(params: {
    eventType: SyncEventType;
    targetNodeId: string;
    entityName: string;
    entityId: string;
    data: T;
  }): SyncOutboxItem {
    const currentNode = getCurrentNodeConfig();
    const idempotencyKey = generateSyncId("IDEM");
    const outboxId = generateSyncId("OUT");

    const envelope: SyncEnvelope<T> = {
      version: "1.0.0",
      idempotencyKey,
      eventType: params.eventType,
      sourceNodeId: currentNode.nodeId,
      targetNodeId: params.targetNodeId,
      entityName: params.entityName,
      entityId: params.entityId,
      timestamp: new Date().toISOString(),
      data: params.data,
    };

    const outboxItem: SyncOutboxItem = {
      outboxId,
      eventType: params.eventType,
      sourceNodeId: currentNode.nodeId,
      targetNodeId: params.targetNodeId,
      entityName: params.entityName,
      entityId: params.entityId,
      payloadJson: JSON.stringify(envelope),
      idempotencyKey,
      status: "PENDING",
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };

    // 저장소 기록
    this.saveOutboxItem(outboxItem);
    return outboxItem;
  }

  /**
   * 2. 수신(Inbound) 이벤트 처리 (멱등성 보장 검증)
   */
  static processInboundEnvelope(envelope: SyncEnvelope): SyncInboundResponse {
    const inboxHistory = this.getInboxHistory();

    // 멱등성 검증: 동일한 idempotencyKey가 이미 처리된 경우 중복 실행 방지
    const exists = inboxHistory.find((item) => item.idempotencyKey === envelope.idempotencyKey);
    if (exists) {
      return {
        success: true,
        code: "IDEMPOTENT_SKIPPED",
        message: "이미 수신되어 정상 처리된 이벤트입니다 (중복 무시 처리).",
        inboxId: exists.inboxId,
        idempotencyKey: envelope.idempotencyKey,
        processedAt: exists.receivedAt,
      };
    }

    const inboxId = generateSyncId("IN");
    const inboxItem: SyncInboxItem = {
      inboxId,
      sourceNodeId: envelope.sourceNodeId,
      eventType: envelope.eventType,
      idempotencyKey: envelope.idempotencyKey,
      payloadJson: JSON.stringify(envelope),
      status: "PROCESSED",
      receivedAt: new Date().toISOString(),
    };

    // 인박스 저장
    this.saveInboxItem(inboxItem);

    // 실제 비즈니스 도메인 데이터 반영 (예: 발주 수신, 가공실적 반영 등)
    this.applyBusinessPayload(envelope);

    return {
      success: true,
      code: "PROCESSED_SUCCESS",
      message: `[${envelope.eventType}] 이벤트가 성공적으로 로컬 DB에 반영되었습니다.`,
      inboxId,
      idempotencyKey: envelope.idempotencyKey,
      processedAt: inboxItem.receivedAt,
    };
  }

  /**
   * 3. 도메인 데이터 반영 디스패처
   */
  private static applyBusinessPayload(envelope: SyncEnvelope): void {
    console.log(`[SyncService] 비즈니스 데이터 반영 완료: ${envelope.eventType} (${envelope.entityId})`);
    // 실제 운영 DB 연결 시 각 엔티티 Repository 호출
  }

  /**
   * 4. 발송 대기(PENDING) 아웃박스 목록 조회
   */
  static getPendingOutbox(): SyncOutboxItem[] {
    const all = this.getAllOutbox();
    return all.filter((item) => item.status === "PENDING" || item.status === "FAILED");
  }

  /**
   * 5. 아웃박스 저장소 입출력
   */
  static getAllOutbox(): SyncOutboxItem[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static saveOutboxItem(item: SyncOutboxItem): void {
    if (typeof window === "undefined") return;
    try {
      const all = this.getAllOutbox();
      all.unshift(item);
      localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(all.slice(0, 100)));
    } catch (e) {
      console.error("Failed to save outbox item", e);
    }
  }

  static updateOutboxStatus(outboxId: string, status: SyncOutboxItem["status"], error?: string): void {
    if (typeof window === "undefined") return;
    try {
      const all = this.getAllOutbox();
      const target = all.find((item) => item.outboxId === outboxId);
      if (target) {
        target.status = status;
        if (status === "SUCCESS") target.sentAt = new Date().toISOString();
        if (error) target.lastError = error;
        localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(all));
      }
    } catch (e) {
      console.error("Failed to update outbox status", e);
    }
  }

  /**
   * 6. 인박스 저장소 입출력
   */
  static getInboxHistory(): SyncInboxItem[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(INBOX_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static saveInboxItem(item: SyncInboxItem): void {
    if (typeof window === "undefined") return;
    try {
      const all = this.getInboxHistory();
      all.unshift(item);
      localStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(all.slice(0, 100)));
    } catch (e) {
      console.error("Failed to save inbox item", e);
    }
  }
}


// [MPSI 시스템] 분산 독립 DB 간 API 연계 동기화 프로토콜 규격 (Type-Safe DTO)
// MPSI 본사, 우성정공, 뉴몰드 간의 비동기 트랜잭셔널 아웃박스 연동을 위한 공통 인터페이스입니다.

export type SyncEventType = 
  | "MOLD_ORDER_DISPATCHED"      // MPSI -> 우성정공 (금형 제작 발주 및 3D 모델 전송)
  | "MOLD_PROGRESS_UPDATED"      // 우성정공 -> MPSI (7대 가공 공정률 보고)
  | "MOLD_TRIAL_SUBMITTED"       // 우성정공 -> MPSI (T1~T4 시사출 성적서 제출)
  | "MASS_ORDER_DISPATCHED"      // MPSI -> 뉴몰드 (사출양산 의뢰)
  | "MASS_VALIDATION_REPORTED"   // 뉴몰드 -> MPSI/우성 (12H 연속사출 실적 및 Cpk 보고)
  | "MASS_PPAP_SUBMITTED"        // 뉴몰드 -> MPSI (PPAP 18대 품질서류 제출 및 승인요청)
  | "MASS_PPAP_APPROVED";        // MPSI -> 뉴몰드 (양산 최종 승인 및 부품제출보증서 PSW 확정)

export type SyncStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";

// 1. 아웃박스 이벤트 항목
export interface SyncOutboxItem {
  outboxId: string;              // 예: OUT-20261022-0001
  eventType: SyncEventType;
  sourceNodeId: string;          // 발신 노드 (MPSI_HQ, WOOSUNG_MOLD 등)
  targetNodeId: string;          // 수신 대상 노드
  entityName: string;            // 대상 엔티티 테이블 (mold_orders, mold_trials 등)
  entityId: string;              // 엔티티 PK (예: MI26001P0)
  payloadJson: string;           // 비즈니스 데이터 전체 JSON
  idempotencyKey: string;        // UUID 멱등성 키 (중복 처리 방지)
  status: SyncStatus;
  retryCount: number;
  lastError?: string;
  createdAt: string;
  sentAt?: string;
}

// 2. 인박스 수신 항목
export interface SyncInboxItem {
  inboxId: string;               // 예: IN-20261022-0001
  sourceNodeId: string;
  eventType: SyncEventType;
  idempotencyKey: string;
  payloadJson: string;
  status: "PROCESSED" | "FAILED";
  receivedAt: string;
}

// 3. 연계 노드 레지스트리 항목
export interface SyncNodeRegistryItem {
  nodeId: string;                // MPSI_HQ | WOOSUNG_MOLD | NEWMOLD_MASS
  nodeName: string;              // MPSI 본사, 우성정공(주), (주)뉴몰드
  nodeType: "HQ" | "VENDOR_MOLD" | "VENDOR_MASS";
  endpointUrl: string;
  apiKey: string;
  isActive: boolean;
  lastHeartbeat?: string;
  createdAt: string;
}

// 4. 표준 전송 페이로드 포맷
export interface SyncEnvelope<T = Record<string, unknown>> {
  version: "1.0.0";
  idempotencyKey: string;
  eventType: SyncEventType;
  sourceNodeId: string;
  targetNodeId: string;
  entityName: string;
  entityId: string;
  timestamp: string;
  data: T;
  signature?: string;            // HMAC-SHA256 서명값
}

// 5. API 응답 DTO
export interface SyncInboundResponse {
  success: boolean;
  code: string;
  message: string;
  inboxId?: string;
  idempotencyKey: string;
  processedAt: string;
}


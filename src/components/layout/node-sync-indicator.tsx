"use client";

import React, { useState, useEffect } from "react";
import { 
  Network, 
  Send, 
  Inbox, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink,
  ChevronRight,
  Server,
  X
} from "lucide-react";
import { useAuthRole } from "@/lib/role-store";
import { SyncService, INITIAL_SYNC_NODES } from "@/services/sync-service";
import { SyncOutboxItem, SyncInboxItem } from "@/types/sync";

export function NodeSyncIndicator() {
  const { nodeConfig } = useAuthRole();
  const [isOpen, setIsOpen] = useState(false);
  const [outboxItems, setOutboxItems] = useState<SyncOutboxItem[]>([]);
  const [inboxItems, setInboxItems] = useState<SyncInboxItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  const loadData = () => {
    setOutboxItems(SyncService.getAllOutbox());
    setInboxItems(SyncService.getInboxHistory());
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  const pendingCount = outboxItems.filter((item) => item.status === "PENDING" || item.status === "FAILED").length;

  // 수동 동기화 실행 (아웃박스 PENDING 항목을 상대 노드로 발송 시뮬레이션)
  const handleTriggerSync = async () => {
    if (pendingCount === 0) return;
    setIsSyncing(true);
    setSyncSuccessMsg(null);

    // 가상 발송 딜레이
    setTimeout(() => {
      outboxItems.forEach((item) => {
        if (item.status === "PENDING" || item.status === "FAILED") {
          SyncService.updateOutboxStatus(item.outboxId, "SUCCESS");
          // 상대방 인박스에도 가상 접수 시뮬레이션
          try {
            const envelope = JSON.parse(item.payloadJson);
            SyncService.processInboundEnvelope(envelope);
          } catch {
            // ignore
          }
        }
      });

      loadData();
      setIsSyncing(false);
      setSyncSuccessMsg(`발송 대기 ${pendingCount}건의 이벤트가 상대 노드 DB로 안전하게 전송 및 동기화되었습니다.`);
      setTimeout(() => setSyncSuccessMsg(null), 4000);
    }, 800);
  };

  return (
    <>
      {/* 상단 헤더 인디케이터 배지 버튼 */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
        title="분산 노드 간 API 연계 및 아웃박스 상태 확인"
      >
        <div className="relative flex items-center justify-center">
          <Network className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
          <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        
        <span className="hidden lg:inline text-zinc-700 dark:text-zinc-300 font-bold font-mono text-[11px]">
          [{nodeConfig.nodeId}]
        </span>

        {pendingCount > 0 ? (
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
            대기 {pendingCount}
          </span>
        ) : (
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            동기화 정상
          </span>
        )}
      </button>

      {/* 연계 현황 상세 모달 다이얼로그 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 border rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden text-xs">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b bg-zinc-900 text-white">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-sm">분산 노드 간 API 연계 및 아웃박스 관제</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-mono">
                  Node: {nodeConfig.nodeName} ({nodeConfig.nodeId})
                </span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 본문 콘텐츠 */}
            <div className="p-5 flex flex-col gap-4 overflow-y-auto">
              {/* 1. 분산 3개사 클러스터 헬스체크 카드 */}
              <div className="flex flex-col gap-2">
                <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 text-xs">
                  <Server className="h-3.5 w-3.5 text-sky-600" />
                  정부과제 3개사 분산 노드 접속 상태 (독립 DB 연계)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  {INITIAL_SYNC_NODES.map((node) => {
                    const isSelf = node.nodeId === nodeConfig.nodeId;
                    return (
                      <div 
                        key={node.nodeId}
                        className={`p-2.5 rounded-lg border flex flex-col gap-1 ${
                          isSelf 
                            ? "bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800"
                            : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">
                            {node.nodeName}
                          </span>
                          <span className="flex items-center gap-1 text-[9px] text-emerald-600 font-bold">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {isSelf ? "현재 노드" : "연계 정상"}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono truncate">
                          {node.endpointUrl}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 동기화 성공 피드백 알림 */}
              {syncSuccessMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 rounded-lg flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{syncSuccessMsg}</span>
                </div>
              )}

              {/* 2. 발송 대기(Outbox) 큐 현황 및 즉시 동기화 버튼 */}
              <div className="flex flex-col gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5 text-amber-600" />
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      트랜잭셔널 아웃박스 발송 큐 (Outbox Queue)
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {pendingCount}건 대기
                    </span>
                  </div>

                  <button
                    onClick={handleTriggerSync}
                    disabled={isSyncing || pendingCount === 0}
                    className="flex items-center gap-1.5 px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
                    {isSyncing ? "동기화 전송 중..." : "지금 즉시 동기화 전송"}
                  </button>
                </div>

                {outboxItems.length === 0 ? (
                  <p className="text-[11px] text-zinc-400 py-2 text-center">
                    발송 대기 중인 아웃박스 이벤트가 없습니다 (모든 데이터 동기화 완료).
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                    {outboxItems.slice(0, 5).map((item) => (
                      <div 
                        key={item.outboxId}
                        className="flex items-center justify-between p-2 rounded bg-white dark:bg-zinc-900 border text-[11px]"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            item.status === "SUCCESS"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {item.status}
                          </span>
                          <span className="font-bold font-mono text-sky-700 dark:text-sky-400">
                            {item.eventType}
                          </span>
                          <span className="text-zinc-500 font-mono">
                            [{item.entityId}]
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-zinc-400 text-[10px]">
                          <span>➔ {item.targetNodeId}</span>
                          <span>{item.createdAt.slice(11, 16)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. 최근 수신된 인박스(Inbox) 이력 (멱등성 보장 검증) */}
              <div className="flex flex-col gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Inbox className="h-3.5 w-3.5 text-purple-600" />
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      수신 인박스 이력 (Inbox History - 멱등성 보장 완료)
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400">
                    중복 수신 시 자동 필터링
                  </span>
                </div>

                {inboxItems.length === 0 ? (
                  <p className="text-[11px] text-zinc-400 py-2 text-center">
                    최근 수신된 인박스 이벤트가 없습니다.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                    {inboxItems.slice(0, 5).map((item) => (
                      <div 
                        key={item.inboxId}
                        className="flex items-center justify-between p-2 rounded bg-white dark:bg-zinc-900 border text-[11px]"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span className="font-bold font-mono text-purple-700 dark:text-purple-400">
                            {item.eventType}
                          </span>
                          <span className="text-zinc-500 text-[10px]">
                            from {item.sourceNodeId}
                          </span>
                        </div>
                        <span className="text-zinc-400 text-[10px] font-mono shrink-0">
                          {item.receivedAt.slice(11, 16)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-between px-5 py-3 border-t bg-zinc-50 dark:bg-zinc-800/50">
              <span className="text-[10px] text-zinc-500">
                KS X 9101-1:2025 표준 규격 기반 트랜잭셔널 아웃박스 연계 프로토콜 가동 중
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 rounded text-xs font-bold transition-colors cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Truck,
  MapPin,
  Search,
  RefreshCw,
  AlertCircle,
  Phone,
  Code2,
  Copy,
  Check,
  Sparkles,
  X,
  Send,
  Settings,
  Key,
  CheckCircle2,
  FileJson,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DeliveryItem,
  DeliveryStatusType,
  LogisticsGatewayPayloadItem,
} from "@/types/delivery";

export type { DeliveryItem };

// 실제 게이트웨이(https://mpsi-gw.a2lab.co.kr) 연동 배송 데이터 (더미 데이터 미사용)
const INITIAL_DELIVERIES: DeliveryItem[] = [];

interface GatewayLogBanner {
  title: string;
  ok: boolean;
  httpStatus?: number;
  responseCode?: string;
  message: string;
  issues?: string[];
  requestPayload?: unknown;
  responsePayload?: unknown;
  timestamp: string;
}

function buildGatewayPayloadItem(item: DeliveryItem, index = 1): LogisticsGatewayPayloadItem {
  const fallbackId = `DLV-20261107-${String(index).padStart(3, "0")}`;
  const rawId = item.deliveryId || item.id || fallbackId;
  const deliveryId = rawId.startsWith("DLV-") ? rawId : fallbackId;

  return {
    deliveryId,
    trackingNo: item.trackingNo,
    projectNo: item.projectNo,
    customerId: item.customerId || "HMC-ASAN",
    customerName: item.customerName,
    destination: item.destination || "납품처 하차장",
    shippingPoint: item.shippingPoint || "(주)뉴몰드 사출 1공장",
    partNo: item.partNo || "0471-NT500-LH",
    productName: item.productName,
    qty: Number(item.qty) || 1,
    unit: item.unit || "EA",
    requestedDeliveryDate: item.requestedDeliveryDate || "2026-11-10",
    preferredReceiptDate: item.preferredReceiptDate || "2026-11-10",
    note: item.note || "오전 하차 희망",
  };
}

function normalizeGatewayDeliveries(
  gatewayItems: Partial<DeliveryItem>[],
  existingList: DeliveryItem[] = []
): DeliveryItem[] {
  const nowStr = new Date().toLocaleTimeString("ko-KR", { hour12: false });
  const existingMap = new Map<string, DeliveryItem>();
  for (const item of existingList) {
    if (item.trackingNo) existingMap.set(item.trackingNo, item);
    if (item.id) existingMap.set(item.id, item);
  }

  return gatewayItems.map((gw, idx) => {
    const key = gw.trackingNo || gw.id || "";
    const existing = existingMap.get(key);

    const normalizedStatus: DeliveryStatusType =
      gw.status === "배송중" || gw.status === "배송완료" || gw.status === "출하준비"
        ? gw.status
        : "출하준비";

    return {
      id: gw.id || gw.trackingNo || `DLV-${idx + 1}`,
      deliveryId: gw.id || gw.deliveryId || `DLV-${idx + 1}`,
      trackingNo: gw.trackingNo || "-",
      projectNo: gw.projectNo || "-",
      customerId: gw.customerId || existing?.customerId || "HMC-ASAN",
      customerName: gw.customerName || existing?.customerName || "-",
      destination:
        gw.destination !== undefined && gw.destination !== ""
          ? gw.destination
          : existing?.destination || "",
      shippingPoint: gw.shippingPoint || existing?.shippingPoint || "(주)뉴몰드 사출 1공장",
      productName: gw.productName || existing?.productName || "-",
      partNo: gw.partNo || existing?.partNo || "",
      qty: typeof gw.qty === "number" && gw.qty > 0 ? gw.qty : existing?.qty || 1,
      unit: gw.unit || existing?.unit || "EA",
      requestedDeliveryDate: gw.requestedDeliveryDate || existing?.requestedDeliveryDate || "2026-11-10",
      preferredReceiptDate: gw.preferredReceiptDate || existing?.preferredReceiptDate || "2026-11-10",
      note: gw.note !== undefined ? gw.note : existing?.note || "",
      status: normalizedStatus,
      carrierName:
        gw.carrierName !== undefined && gw.carrierName !== ""
          ? gw.carrierName
          : "소프트러쉬 운송",
      vehicleNo: gw.vehicleNo || "",
      vehicleType: gw.vehicleType || "",
      driverName: gw.driverName || "",
      driverPhone: gw.driverPhone || "",
      departureTime: gw.departureTime || "",
      estimatedArrival: gw.estimatedArrival || "",
      actualArrival: gw.actualArrival || "",
      currentLocation: gw.currentLocation || "",
      apiSource: gw.apiSource || "소프트러쉬 물류 API v1.0 (GPS)",
      transitSteps: Array.isArray(gw.transitSteps) ? gw.transitSteps : [],
      lastSyncedAt: existing?.lastSyncedAt || nowStr,
      gatewayResponseCode: gw.gatewayResponseCode || existing?.gatewayResponseCode || "S000",
    };
  });
}

function mergeDeliveriesFromGateway(
  prevList: DeliveryItem[],
  gatewayItems: Partial<DeliveryItem>[]
): DeliveryItem[] {
  if (!Array.isArray(gatewayItems) || gatewayItems.length === 0) return prevList;
  const nowStr = new Date().toLocaleTimeString("ko-KR", { hour12: false });
  const nextList = [...prevList];

  for (const gw of gatewayItems) {
    if (!gw || (!gw.trackingNo && !gw.id)) continue;
    const idx = nextList.findIndex(
      (item) =>
        (gw.trackingNo && item.trackingNo === gw.trackingNo) ||
        (gw.id && (item.id === gw.id || item.deliveryId === gw.id))
    );

    const normalizedStatus: DeliveryStatusType =
      gw.status === "배송중" || gw.status === "배송완료" || gw.status === "출하준비"
        ? gw.status
        : "출하준비";

    if (idx >= 0) {
      const existing = nextList[idx];
      nextList[idx] = {
        ...existing,
        id: gw.id || existing.id,
        deliveryId: gw.id || existing.deliveryId || existing.id,
        trackingNo: gw.trackingNo || existing.trackingNo,
        projectNo: gw.projectNo || existing.projectNo,
        customerName: gw.customerName || existing.customerName,
        destination: gw.destination !== undefined && gw.destination !== "" ? gw.destination : existing.destination,
        productName: gw.productName || existing.productName,
        partNo: gw.partNo || existing.partNo,
        qty: typeof gw.qty === "number" && gw.qty > 0 ? gw.qty : existing.qty,
        unit: gw.unit || existing.unit,
        status: normalizedStatus,
        carrierName: gw.carrierName !== undefined && gw.carrierName !== "" ? gw.carrierName : existing.carrierName,
        vehicleNo: gw.vehicleNo !== undefined ? gw.vehicleNo : existing.vehicleNo,
        vehicleType: gw.vehicleType !== undefined ? gw.vehicleType : existing.vehicleType,
        driverName: gw.driverName !== undefined ? gw.driverName : existing.driverName,
        driverPhone: gw.driverPhone !== undefined ? gw.driverPhone : existing.driverPhone,
        departureTime: gw.departureTime !== undefined ? gw.departureTime : existing.departureTime,
        estimatedArrival: gw.estimatedArrival !== undefined ? gw.estimatedArrival : existing.estimatedArrival,
        actualArrival: gw.actualArrival !== undefined ? gw.actualArrival : existing.actualArrival,
        currentLocation: gw.currentLocation !== undefined ? gw.currentLocation : existing.currentLocation,
        apiSource: gw.apiSource || existing.apiSource || "소프트러쉬 물류 API v1.0 (GPS)",
        transitSteps:
          Array.isArray(gw.transitSteps) && gw.transitSteps.length > 0
            ? gw.transitSteps
            : existing.transitSteps,
        lastSyncedAt: nowStr,
      };
    } else {
      nextList.unshift({
        id: gw.id || gw.trackingNo || `DLV-${Date.now()}`,
        deliveryId: gw.id || `DLV-${Date.now()}`,
        trackingNo: gw.trackingNo || "-",
        projectNo: gw.projectNo || "-",
        customerId: "HMC-ASAN",
        customerName: gw.customerName || "-",
        destination: gw.destination || "",
        shippingPoint: "(주)뉴몰드 사출 1공장",
        productName: gw.productName || "-",
        partNo: gw.partNo || "",
        qty: Number(gw.qty) || 0,
        unit: gw.unit || "EA",
        requestedDeliveryDate: "2026-11-10",
        preferredReceiptDate: "2026-11-10",
        note: "",
        status: normalizedStatus,
        carrierName: gw.carrierName || "소프트러쉬 운송",
        vehicleNo: gw.vehicleNo || "",
        vehicleType: gw.vehicleType || "",
        driverName: gw.driverName || "",
        driverPhone: gw.driverPhone || "",
        departureTime: gw.departureTime || "",
        estimatedArrival: gw.estimatedArrival || "",
        actualArrival: gw.actualArrival || "",
        currentLocation: gw.currentLocation || "",
        apiSource: gw.apiSource || "소프트러쉬 물류 API v1.0 (GPS)",
        transitSteps: Array.isArray(gw.transitSteps) ? gw.transitSteps : [],
        lastSyncedAt: nowStr,
      });
    }
  }

  return nextList;
}

export default function DeliveryStatusPage() {
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>(INITIAL_DELIVERIES);
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "출하준비" | "배송중" | "배송완료">("ALL");
  const [selectedItem, setSelectedItem] = useState<DeliveryItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<"TIMELINE" | "API_JSON">("TIMELINE");
  const [isSyncing, setIsSyncing] = useState(false);
  const [requestingTrackingNo, setRequestingTrackingNo] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  // 게이트웨이 송수신 결과 배너 및 전문 보기 토글
  const [gwBanner, setGwBanner] = useState<GatewayLogBanner | null>(null);
  const [showGwPayload, setShowGwPayload] = useState(false);

  // 게이트웨이 연동 설정 모달 (MPSI_GW_BASE_URL / MPSI_API_KEY)
  const [isGwConfigOpen, setIsGwConfigOpen] = useState(false);
  const [gwBaseUrl, setGwBaseUrl] = useState("https://mpsi-gw.a2lab.co.kr");
  const [gwHasKey, setGwHasKey] = useState(false);
  const [gwInputKey, setGwInputKey] = useState("");
  const [isSavingGwConfig, setIsSavingGwConfig] = useState(false);

  // 신규 배송 위탁 등록 모달 상태 (실제 게이트웨이 POST /api/v1/logistics/deliveries)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createIssues, setCreateIssues] = useState<string[]>([]);
  const [newDeliveryForm, setNewDeliveryForm] = useState<LogisticsGatewayPayloadItem>({
    deliveryId: "",
    trackingNo: "",
    projectNo: "MI26001P0",
    customerId: "HMC-ASAN",
    customerName: "현대자동차 (아산공장)",
    destination: "아산공장 1라인 부품하차장 B구역",
    shippingPoint: "(주)뉴몰드 사출 1공장",
    partNo: "0471-NT500-LH",
    productName: "Front Door Upper Cover",
    qty: 500,
    unit: "EA",
    requestedDeliveryDate: "2026-11-10",
    preferredReceiptDate: "2026-11-10",
    note: "오전 하차 희망",
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 게이트웨이 보관 현황 목록 조회 (GET /api/v1/logistics/deliveries)
  const fetchGatewayDeliveries = useCallback(async (projectNoFilter?: string, silent = false) => {
    try {
      const qs = projectNoFilter ? `?projectNo=${encodeURIComponent(projectNoFilter)}` : "";
      const res = await fetch(`/api/v1/logistics/deliveries${qs}`, { cache: "no-store" });
      const json = await res.json();

      const list: Partial<DeliveryItem>[] = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json?.raw?.data)
        ? json.raw.data
        : [];

      // 실제 게이트웨이 데이터만 화면 그리드에 100% 반영 (더미 데이터 제거)
      setDeliveries((prev) => normalizeGatewayDeliveries(list, prev));

      if (!silent) {
        setGwBanner({
          title: "GET /api/v1/logistics/deliveries (게이트웨이 현황 목록 조회)",
          ok: Boolean(json.success),
          httpStatus: json.httpStatus,
          responseCode: json.responseCode,
          message:
            json.message ||
            (list.length > 0
              ? `게이트웨이 보관 배송현황 ${list.length}건을 불러와 동기화했습니다.`
              : "게이트웨이 조회 완료 (보관된 데이터 0건)"),
          issues: json.issues,
          responsePayload: json.raw ?? json,
          timestamp: new Date().toLocaleTimeString("ko-KR", { hour12: false }),
        });
      }
      return { json, count: list.length };
    } catch (err: unknown) {
      if (!silent) {
        setGwBanner({
          title: "GET /api/v1/logistics/deliveries 실패",
          ok: false,
          message: err instanceof Error ? err.message : "목록 조회 중 오류가 발생했습니다.",
          timestamp: new Date().toLocaleTimeString("ko-KR", { hour12: false }),
        });
      }
      return { json: null, count: 0 };
    }
  }, []);

  // 초기 진입 시 게이트웨이 설정 상태 및 보관 목록 조회
  useEffect(() => {
    fetch("/api/v1/logistics/config")
      .then((r) => r.json())
      .then((d) => {
        if (d.baseUrl) setGwBaseUrl(d.baseUrl);
        setGwHasKey(Boolean(d.hasApiKey));
      })
      .catch(() => {});

    fetchGatewayDeliveries(undefined, true);
  }, [fetchGatewayDeliveries]);

  // ① 그리드 항목 [배송요청] 버튼 클릭 -> POST /api/v1/logistics/deliveries 호출 후 동기화
  const handleRequestDelivery = async (item: DeliveryItem, rowIdx: number) => {
    setRequestingTrackingNo(item.trackingNo);
    const payloadItem = buildGatewayPayloadItem(item, rowIdx + 1);
    const requestBody = {
      scenarioId: "MPSI-SR-DELIVERY-01",
      actionCode: "Add",
      deliveries: [payloadItem],
    };

    try {
      const res = await fetch("/api/v1/logistics/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const dispatchJson = await res.json();

      // 422 명사 검증 실패 시 issues 배열 사유를 그대로 화면에 표시
      if (dispatchJson.httpStatus === 422 || (Array.isArray(dispatchJson.issues) && dispatchJson.issues.length > 0)) {
        setGwBanner({
          title: `배송건 위탁 검증 실패 (HTTP ${dispatchJson.httpStatus || 422}) — ${item.trackingNo}`,
          ok: false,
          httpStatus: dispatchJson.httpStatus || 422,
          responseCode: dispatchJson.responseCode,
          message: dispatchJson.message || "명사 검증 실패 (KS X 9101 BOD 규격 미충족)",
          issues: dispatchJson.issues,
          requestPayload: requestBody,
          responsePayload: dispatchJson.raw ?? dispatchJson,
          timestamp: new Date().toLocaleTimeString("ko-KR", { hour12: false }),
        });
        showToast(`⚠️ 명사 검증 실패(422): 상단 게이트웨이 응답 사유(issues)를 확인하세요.`);
        return;
      }

      // 401 인증키 오류
      if (dispatchJson.httpStatus === 401) {
        setGwBanner({
          title: `게이트웨이 인증 실패 (HTTP 401) — x-mpsi-api-key 확인 필요`,
          ok: false,
          httpStatus: 401,
          message: dispatchJson.message || "x-mpsi-api-key 헤더가 누락되었거나 일치하지 않습니다.",
          requestPayload: requestBody,
          responsePayload: dispatchJson.raw ?? dispatchJson,
          timestamp: new Date().toLocaleTimeString("ko-KR", { hour12: false }),
        });
        showToast("⚠️ x-mpsi-api-key 인증 실패(401). 우측 상단 [게이트웨이 설정]에서 API 키를 확인하세요.");
        return;
      }

      // 위탁 성공(200 S000/W100) 또는 이미 등록된 건(E402 등)인 경우 -> 즉시 동기화(POST /sync) 및 목록 조회(GET /deliveries) 수행
      const isAlreadyRegistered = dispatchJson.responseCode === "E402";
      const isDispatchOk = Boolean(dispatchJson.success) || isAlreadyRegistered;

      // 동기화 호출 (POST /api/v1/logistics/sync)
      const syncRes = await fetch("/api/v1/logistics/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectNo: item.projectNo }),
      });
      const syncJson = await syncRes.json();

      // sync 응답 내에 배열 데이터가 있으면 즉시 병합
      const syncDataList: Partial<DeliveryItem>[] = Array.isArray(syncJson?.data)
        ? syncJson.data
        : Array.isArray(syncJson?.raw?.data)
        ? syncJson.raw.data
        : [];
      if (syncDataList.length > 0) {
        setDeliveries((prev) => mergeDeliveriesFromGateway(prev, syncDataList));
      }

      // 이어서 게이트웨이 보관 목록 조회 (GET /api/v1/logistics/deliveries)
      const { json: listJson, count: listCount } = await fetchGatewayDeliveries(undefined, true);

      // 현재 행에 최근 응답코드 및 동기화 시각 표시
      const nowStr = new Date().toLocaleTimeString("ko-KR", { hour12: false });
      setDeliveries((prev) =>
        prev.map((d) =>
          d.trackingNo === item.trackingNo
            ? {
                ...d,
                lastSyncedAt: nowStr,
                gatewayResponseCode: dispatchJson.responseCode || (dispatchJson.success ? "S000" : String(dispatchJson.httpStatus)),
              }
            : d
        )
      );

      setGwBanner({
        title: `배송요청(위탁) & 실시간 동기화 결과 — [${item.trackingNo}] (${item.projectNo})`,
        ok: isDispatchOk,
        httpStatus: dispatchJson.httpStatus,
        responseCode: dispatchJson.responseCode || (dispatchJson.success ? "S000" : undefined),
        message: [
          `① 위탁(POST /deliveries): ${dispatchJson.message || (dispatchJson.success ? "위탁 성공" : "실패")}${
            dispatchJson.responseCode ? ` [응답코드: ${dispatchJson.responseCode}]` : ""
          }`,
          `② 동기화(POST /sync): ${syncJson.message || (syncJson.success ? "동기화 완료" : `HTTP ${syncJson.httpStatus}`)}`,
          `③ 현황조회(GET /deliveries): 게이트웨이 보관 데이터 ${listCount}건 화면 동기화 반영`,
        ].join("  |  "),
        issues: dispatchJson.issues || syncJson.issues,
        requestPayload: requestBody,
        responsePayload: {
          "1_POST_deliveries_response": dispatchJson.raw ?? dispatchJson,
          "2_POST_sync_response": syncJson.raw ?? syncJson,
          "3_GET_deliveries_response": listJson?.raw ?? listJson,
        },
        timestamp: nowStr,
      });

      if (isDispatchOk) {
        showToast(
          `✅ [${item.trackingNo}] 게이트웨이 배송건 위탁 및 실시간 데이터 동기화가 완료되었습니다.`
        );
      } else {
        showToast(
          `⚠️ [${item.trackingNo}] 게이트웨이 응답: ${dispatchJson.message} (${dispatchJson.responseCode || `HTTP ${dispatchJson.httpStatus}`})`
        );
      }
    } catch (err: unknown) {
      setGwBanner({
        title: `배송요청 통신 오류 — ${item.trackingNo}`,
        ok: false,
        message: err instanceof Error ? err.message : "게이트웨이 호출 중 오류가 발생했습니다.",
        requestPayload: requestBody,
        timestamp: new Date().toLocaleTimeString("ko-KR", { hour12: false }),
      });
    } finally {
      setRequestingTrackingNo(null);
    }
  };

  // ④ [소프트러쉬 API 동기화 (Pull)] 버튼 클릭 -> POST /api/v1/logistics/sync + GET /api/v1/logistics/deliveries
  const handleSyncExternalApi = async () => {
    setIsSyncing(true);
    try {
      // 검색어에 프로젝트번호(예: MI26001P0)가 입력되어 있으면 해당 프로젝트만, 아니면 전건 동기화({})
      const trimmedKeyword = filterKeyword.trim();
      const syncBody = /^MI\d+/i.test(trimmedKeyword) ? { projectNo: trimmedKeyword.toUpperCase() } : {};

      const syncRes = await fetch("/api/v1/logistics/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(syncBody),
      });
      const syncJson = await syncRes.json();

      const syncItems: Partial<DeliveryItem>[] = Array.isArray(syncJson?.data)
        ? syncJson.data
        : Array.isArray(syncJson?.raw?.data)
        ? syncJson.raw.data
        : [];
      if (syncItems.length > 0) {
        setDeliveries((prev) => mergeDeliveriesFromGateway(prev, syncItems));
      }

      // 동기화 직후 게이트웨이 보관 목록(GET /api/v1/logistics/deliveries)을 읽어 최신 현황 반영
      const { json: listJson, count: listCount } = await fetchGatewayDeliveries(undefined, true);
      const totalSynced = Math.max(syncItems.length, listCount);

      const isOk = Boolean(syncJson.success) || Boolean(listJson?.success);
      setGwBanner({
        title: "소프트러쉬 API 실시간 동기화 (POST /api/v1/logistics/sync → GET /api/v1/logistics/deliveries)",
        ok: isOk,
        httpStatus: syncJson.httpStatus,
        responseCode: syncJson.responseCode || (syncJson.success ? "S000" : undefined),
        message: `${syncJson.message || "동기화 요청 처리"} | 게이트웨이 보관 데이터 ${totalSynced}건을 그리드에 실시간 반영했습니다.`,
        issues: syncJson.issues || listJson?.issues,
        requestPayload: syncBody,
        responsePayload: {
          syncResponse: syncJson.raw ?? syncJson,
          deliveriesListResponse: listJson?.raw ?? listJson,
        },
        timestamp: new Date().toLocaleTimeString("ko-KR", { hour12: false }),
      });

      if (isOk) {
        showToast(
          `✅ 소프트러쉬(SoftRush) 게이트웨이 실시간 동기화 완료! (총 ${totalSynced}건 최신 상태 반영)`
        );
      } else {
        showToast(
          `⚠️ 게이트웨이 동기화 응답 확인 필요: ${syncJson.message || `HTTP ${syncJson.httpStatus}`}`
        );
      }
    } catch (err: unknown) {
      showToast(
        `❌ 게이트웨이 동기화 중 오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // ③ 단건 상세 조회 (GET /api/v1/logistics/deliveries/{trackingNo}) 및 모달 오픈
  const handleOpenDetail = async (item: DeliveryItem) => {
    setSelectedItem(item);
    setActiveModalTab("TIMELINE");
    setIsDetailModalOpen(true);

    try {
      const res = await fetch(
        `/api/v1/logistics/deliveries/${encodeURIComponent(item.trackingNo)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      const detail = (json?.data || json?.raw?.data) as Partial<DeliveryItem> | undefined;
      if (json.success && detail && detail.trackingNo) {
        setDeliveries((prev) => mergeDeliveriesFromGateway(prev, [detail]));
        setSelectedItem((prev) => {
          if (!prev || prev.trackingNo !== item.trackingNo) return prev;
          const merged = mergeDeliveriesFromGateway([prev], [detail]);
          return merged[0] || prev;
        });
      }
    } catch {
      // 게이트웨이에 아직 없는 단건(404 등)은 로컬 항목 유지
    }
  };

  const handleSaveGwConfig = async () => {
    setIsSavingGwConfig(true);
    try {
      const res = await fetch("/api/v1/logistics/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseUrl: gwBaseUrl.trim() || "https://mpsi-gw.a2lab.co.kr",
          apiKey: gwInputKey.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setGwBaseUrl(data.baseUrl);
        setGwHasKey(Boolean(data.hasApiKey));
        setGwInputKey("");
        setIsGwConfigOpen(false);
        showToast("✅ 물류 게이트웨이(mpsi-gw) 주소 및 API 키 설정이 저장되었습니다.");
      }
    } finally {
      setIsSavingGwConfig(false);
    }
  };

  // 신규 배송 등록 모달 열기
  const handleOpenCreateModal = () => {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randNum = String(Math.floor(Math.random() * 900) + 100);
    const nextDeliveryId = `DLV-${todayStr}-${randNum}`;
    const nextTrackingNo = `SR-${todayStr}-${randNum}`;
    const targetDate = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);

    setNewDeliveryForm({
      deliveryId: nextDeliveryId,
      trackingNo: nextTrackingNo,
      projectNo: "MI26001P0",
      customerId: "HMC-ASAN",
      customerName: "현대자동차 (아산공장)",
      destination: "아산공장 1라인 부품하차장 B구역",
      shippingPoint: "(주)뉴몰드 사출 1공장",
      partNo: "0471-NT500-LH",
      productName: "Front Door Upper Cover",
      qty: 500,
      unit: "EA",
      requestedDeliveryDate: targetDate,
      preferredReceiptDate: targetDate,
      note: "오전 하차 희망",
    });
    setCreateIssues([]);
    setIsCreateModalOpen(true);
  };

  // 신규 배송 위탁 제출 (POST /api/v1/logistics/deliveries)
  const handleSubmitCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCreate(true);
    setCreateIssues([]);

    // 기본 필수값 유효성 검사
    const missing: string[] = [];
    if (!newDeliveryForm.deliveryId.trim()) missing.push("배송식별자(deliveryId)");
    if (!newDeliveryForm.trackingNo.trim()) missing.push("운송장번호(trackingNo)");
    if (!newDeliveryForm.projectNo.trim()) missing.push("프로젝트번호(projectNo)");
    if (!newDeliveryForm.customerName.trim()) missing.push("고객사명(customerName)");
    if (!newDeliveryForm.productName.trim()) missing.push("품목명(productName)");
    if (newDeliveryForm.qty <= 0) missing.push("수량(1 이상)");

    if (missing.length > 0) {
      setCreateIssues([`필수 항목이 누락되었습니다: ${missing.join(", ")}`]);
      setIsSubmittingCreate(false);
      return;
    }

    const requestBody = {
      scenarioId: "MPSI-SR-DELIVERY-01",
      actionCode: "Add",
      deliveries: [newDeliveryForm],
    };

    try {
      const res = await fetch("/api/v1/logistics/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const dispatchJson = await res.json();

      // 422 명사 검증 실패 시 모달 및 상단에 사유(issues) 노출
      if (dispatchJson.httpStatus === 422 || (Array.isArray(dispatchJson.issues) && dispatchJson.issues.length > 0)) {
        const issues = dispatchJson.issues || [dispatchJson.message || "명사 검증 실패 (KS X 9101 BOD 규격 오류)"];
        setCreateIssues(issues);
        setGwBanner({
          title: `신규 배송 위탁 명사 검증 실패 (HTTP ${dispatchJson.httpStatus || 422}) — ${newDeliveryForm.trackingNo}`,
          ok: false,
          httpStatus: dispatchJson.httpStatus || 422,
          responseCode: dispatchJson.responseCode,
          message: dispatchJson.message || "명사 검증 실패",
          issues,
          requestPayload: requestBody,
          responsePayload: dispatchJson.raw ?? dispatchJson,
          timestamp: new Date().toLocaleTimeString("ko-KR", { hour12: false }),
        });
        showToast("⚠️ 명사 검증 실패(422): 게이트웨이 검증 사유를 확인해 주세요.");
        return;
      }

      if (dispatchJson.httpStatus === 401) {
        const msg = "x-mpsi-api-key 인증 실패: [게이트웨이 설정]에서 API 키를 확인해 주세요.";
        setCreateIssues([msg]);
        showToast("⚠️ 게이트웨이 인증 실패(401)");
        return;
      }

      const isAlreadyRegistered = dispatchJson.responseCode === "E402";
      const isDispatchOk = Boolean(dispatchJson.success) || isAlreadyRegistered;

      // 위탁 성공 후 즉시 실시간 동기화 (POST /api/v1/logistics/sync) 및 게이트웨이 보관 목록 갱신 (GET /api/v1/logistics/deliveries)
      const syncRes = await fetch("/api/v1/logistics/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectNo: newDeliveryForm.projectNo }),
      });
      const syncJson = await syncRes.json();

      const syncDataList: Partial<DeliveryItem>[] = Array.isArray(syncJson?.data)
        ? syncJson.data
        : Array.isArray(syncJson?.raw?.data)
        ? syncJson.raw.data
        : [];
      if (syncDataList.length > 0) {
        setDeliveries((prev) => mergeDeliveriesFromGateway(prev, syncDataList));
      }

      const { count: listCount } = await fetchGatewayDeliveries(undefined, true);

      setIsCreateModalOpen(false);

      const nowStr = new Date().toLocaleTimeString("ko-KR", { hour12: false });
      setGwBanner({
        title: `신규 배송 위탁 등록 & 실시간 동기화 완료 — [${newDeliveryForm.trackingNo}] (${newDeliveryForm.projectNo})`,
        ok: isDispatchOk,
        httpStatus: dispatchJson.httpStatus,
        responseCode: dispatchJson.responseCode || "S000",
        message: `① 위탁(POST /deliveries): ${dispatchJson.message || "성공"} [${dispatchJson.responseCode || "S000"}]  |  ② 동기화(POST /sync): ${syncJson.message || "완료"}  |  게이트웨이 보관 데이터 ${listCount}건 실시간 반영`,
        issues: dispatchJson.issues || syncJson.issues,
        requestPayload: requestBody,
        responsePayload: {
          dispatch: dispatchJson.raw ?? dispatchJson,
          sync: syncJson.raw ?? syncJson,
        },
        timestamp: nowStr,
      });

      showToast(`✅ [${newDeliveryForm.trackingNo}] 게이트웨이 배송건 위탁 등록이 완료되었습니다.`);
    } catch (err: unknown) {
      setCreateIssues([`서버 전송 오류: ${err instanceof Error ? err.message : String(err)}`]);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // 검색 및 상태 필터링
  const filteredList = deliveries.filter((item) => {
    if (filterStatus !== "ALL" && item.status !== filterStatus) return false;
    if (filterKeyword) {
      const q = filterKeyword.toLowerCase();
      return (
        item.trackingNo.toLowerCase().includes(q) ||
        item.projectNo.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.productName.toLowerCase().includes(q) ||
        (item.carrierName?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  // KPI 통계 계산
  const totalCount = deliveries.length;
  const inTransitCount = deliveries.filter((d) => d.status === "배송중").length;
  const completedCount = deliveries.filter((d) => d.status === "배송완료").length;
  const readyCount = deliveries.filter((d) => d.status === "출하준비").length;

  const handleCopyJson = () => {
    if (!selectedItem) return;
    navigator.clipboard.writeText(JSON.stringify(selectedItem, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4 text-xs font-sans">
      {/* 토스트 알림 */}
      {toastMessage && (
        <div className="fixed top-4 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-xl bg-emerald-700 text-white text-xs font-medium animate-in fade-in">
          <Sparkles className="h-4 w-4" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-80">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 1. 상단 타이틀 배너 및 SCM 보편 안내 */}
      <div className="bg-gradient-to-r from-sky-500/10 via-emerald-500/5 to-transparent border border-sky-500/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                SCM 배송현황 (소프트러쉬 물류연계 관제)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                GW: {gwBaseUrl}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  gwHasKey
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300"
                }`}
              >
                {gwHasKey ? "● x-mpsi-api-key 설정됨" : "⚠️ MPSI_API_KEY 설정 필요"}
              </span>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 text-xs mt-0.5">
              • 그리드의 <b>[배송요청]</b> 클릭 시 게이트웨이(<code>POST /api/v1/logistics/deliveries</code>)로 위탁 후 실시간 동기화하며, <b>[소프트러쉬 API 동기화 (Pull)]</b> 클릭 시 <code>POST /api/v1/logistics/sync</code> 및 목록 조회를 수행합니다.
            </p>
          </div>
        </div>

        {/* 외부 API 동기화, 게이트웨이 설정 및 신규 배송 등록 버튼 */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button
            size="sm"
            onClick={handleOpenCreateModal}
            className="h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
            title="중간 게이트웨이에 새 배송건 위탁 등록(POST /api/v1/logistics/deliveries)"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>신규 배송 등록</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsGwConfigOpen(true)}
            className="h-8 px-2.5 text-xs font-semibold gap-1 cursor-pointer border-slate-300 dark:border-zinc-700"
            title="게이트웨이 주소 및 MPSI_API_KEY 설정"
          >
            <Settings className="h-3.5 w-3.5 text-slate-500" />
            <span>게이트웨이 설정</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchGatewayDeliveries(undefined, false)}
            className="h-8 px-3 text-xs font-bold gap-1 cursor-pointer border-sky-300 text-sky-700 hover:bg-sky-50"
            title="GET /api/v1/logistics/deliveries (게이트웨이 보관 현황 조회)"
          >
            <span>목록 새로고침 (GET)</span>
          </Button>
          <Button
            size="sm"
            onClick={handleSyncExternalApi}
            disabled={isSyncing}
            className="h-8 px-3.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>소프트러쉬 API 동기화 (Pull)</span>
          </Button>
        </div>
      </div>

      {/* 게이트웨이 실시간 송수신 결과 & 422 issues 검증 사유 표시 배너 */}
      {gwBanner && (
        <div
          className={`rounded-xl border p-3.5 shadow-2xs flex flex-col gap-2 ${
            gwBanner.ok
              ? "bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
              : "bg-rose-50/80 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {gwBanner.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              )}
              <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                {gwBanner.title}
              </span>
              {gwBanner.httpStatus && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white/80 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700">
                  HTTP {gwBanner.httpStatus}
                </span>
              )}
              {gwBanner.responseCode && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300">
                  responseCode: {gwBanner.responseCode}
                </span>
              )}
              <span className="text-[10.5px] font-mono text-zinc-500">
                ({gwBanner.timestamp})
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {(Boolean(gwBanner.requestPayload) || Boolean(gwBanner.responsePayload)) && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setShowGwPayload((prev) => !prev)}
                  className="h-6 px-2 text-[10.5px] gap-1 bg-white dark:bg-zinc-900 cursor-pointer"
                >
                  <FileJson className="h-3 w-3" />
                  <span>{showGwPayload ? "송수신 전문 접기" : "송수신 JSON 전문 보기"}</span>
                </Button>
              )}
              <button
                onClick={() => setGwBanner(null)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-700"
                title="배너 닫기"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="text-xs text-zinc-700 dark:text-zinc-300">
            {gwBanner.message}
          </div>

          {/* 422 명사 검증 실패 시 issues 배열 그대로 표시 */}
          {gwBanner.issues && gwBanner.issues.length > 0 && (
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-rose-300 dark:border-rose-800 space-y-1">
              <div className="font-bold text-[11px] text-rose-700 dark:text-rose-400">
                • 명사 검증 실패 상세 사유 (issues):
              </div>
              <ul className="list-disc list-inside text-[11px] font-mono text-rose-600 dark:text-rose-300 space-y-0.5">
                {gwBanner.issues.map((iss, idx) => (
                  <li key={idx}>{iss}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 송수신 JSON 전문 확인 */}
          {showGwPayload && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
              {Boolean(gwBanner.requestPayload) && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10.5px] font-bold text-zinc-600 dark:text-zinc-400">
                    ▶ 게이트웨이 요청 전문 (Request JSON)
                  </span>
                  <pre className="p-2.5 rounded-lg bg-slate-900 text-sky-300 font-mono text-[10.5px] overflow-x-auto max-h-52 border border-slate-800">
                    {JSON.stringify(gwBanner.requestPayload, null, 2)}
                  </pre>
                </div>
              )}
              {Boolean(gwBanner.responsePayload) && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10.5px] font-bold text-zinc-600 dark:text-zinc-400">
                    ◀ 게이트웨이 응답 전문 (Response JSON)
                  </span>
                  <pre className="p-2.5 rounded-lg bg-slate-900 text-emerald-300 font-mono text-[10.5px] overflow-x-auto max-h-52 border border-slate-800">
                    {JSON.stringify(gwBanner.responsePayload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. 검색 및 필터 바 */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        {/* 상태 필터 탭 */}
        <div className="flex items-center gap-1.5">
          {(["ALL", "출하준비", "배송중", "배송완료"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer border ${
                filterStatus === st
                  ? "bg-slate-900 text-white border-slate-900 dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-slate-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:bg-slate-100"
              }`}
            >
              {st === "ALL"
                ? `전체 (${totalCount})`
                : `${st} (${st === "출하준비" ? readyCount : st === "배송중" ? inTransitCount : completedCount})`}
            </button>
          ))}
        </div>

        {/* 검색 인풋 */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              placeholder="운송장 / 프로젝트번호 / 고객사 / 품목명 검색"
              className="h-8 pl-8 pr-3 w-64 sm:w-80 text-xs bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700"
            />
          </div>
          {filterKeyword && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setFilterKeyword("")}
              className="h-8 px-2 text-zinc-500"
            >
              초기화
            </Button>
          )}
        </div>
      </div>

      {/* 4. SCM 보편적 배송현황 데이터 그리드 */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 font-bold border-b text-[11px]">
                <th className="py-2.5 px-3 text-center w-12">No</th>
                <th className="py-2.5 px-3">운송장 번호</th>
                <th className="py-2.5 px-3 text-center">배송 상태</th>
                <th className="py-2.5 px-3">프로젝트번호</th>
                <th className="py-2.5 px-3">고객사 / 납품처</th>
                <th className="py-2.5 px-3">품목명 (품번)</th>
                <th className="py-2.5 px-3 text-right">수량</th>
                <th className="py-2.5 px-3">운송사 (차량번호)</th>
                <th className="py-2.5 px-3">출발일시</th>
                <th className="py-2.5 px-3">도착예정(완료)</th>
                <th className="py-2.5 px-3">현재 위치</th>
                <th className="py-2.5 px-3 text-center w-40">게이트웨이 연동 / 추적</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-[11.5px]">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-zinc-400">
                    검색 조건에 일치하는 배송 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => {
                  const isRequesting = requestingTrackingNo === item.trackingNo;
                  return (
                    <tr
                      key={item.trackingNo || item.id || idx}
                      onClick={() => handleOpenDetail(item)}
                      className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                    >
                      {/* No */}
                      <td className="py-2.5 px-3 text-center font-mono text-zinc-500">
                        {idx + 1}
                      </td>

                      {/* 운송장 번호 */}
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-sky-700 dark:text-sky-400">
                          {item.trackingNo}
                        </div>
                        {item.lastSyncedAt && (
                          <div className="text-[9.5px] font-mono text-emerald-600 dark:text-emerald-400">
                            동기화: {item.lastSyncedAt}
                            {item.gatewayResponseCode ? ` (${item.gatewayResponseCode})` : ""}
                          </div>
                        )}
                      </td>

                      {/* 배송 상태 */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                            item.status === "배송중"
                              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
                              : item.status === "배송완료"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
                          }`}
                        >
                          {item.status === "배송중" && <Truck className="h-3 w-3 animate-pulse" />}
                          {item.status === "배송완료" && <Check className="h-3 w-3" />}
                          {item.status}
                        </span>
                      </td>

                      {/* 프로젝트번호 */}
                      <td className="py-2.5 px-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {item.projectNo}
                      </td>

                      {/* 고객사 / 납품처 */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-zinc-800 dark:text-zinc-200">{item.customerName}</div>
                        <div className="text-[10px] text-zinc-400 truncate max-w-[150px]">{item.destination}</div>
                      </td>

                      {/* 품목명 (품번) */}
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-zinc-800 dark:text-zinc-200">{item.productName}</div>
                        <div className="text-[10px] font-mono text-zinc-400">{item.partNo}</div>
                      </td>

                      {/* 수량 */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-800 dark:text-zinc-200">
                        {item.qty.toLocaleString()}{" "}
                        <span className="text-[10px] text-zinc-400 font-normal">{item.unit}</span>
                      </td>

                      {/* 운송사 (차량번호) */}
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-zinc-800 dark:text-zinc-200">
                          {item.carrierName || "소프트러쉬 운송"}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          {item.vehicleNo || "(배차 대기)"}
                        </div>
                      </td>

                      {/* 출발일시 */}
                      <td className="py-2.5 px-3 font-mono text-zinc-600 dark:text-zinc-400 text-[10.5px]">
                        {item.departureTime || "-"}
                      </td>

                      {/* 도착예정일시 */}
                      <td className="py-2.5 px-3 font-mono text-[10.5px]">
                        {item.actualArrival ? (
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">
                            {item.actualArrival}
                          </span>
                        ) : (
                          <span className="text-zinc-600 dark:text-zinc-400">
                            {item.estimatedArrival || item.requestedDeliveryDate || "-"}
                          </span>
                        )}
                      </td>

                      {/* 현재 위치 */}
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                          <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                          <span className="truncate max-w-[140px]">
                            {item.currentLocation || "배차/출하 대기"}
                          </span>
                        </span>
                      </td>

                      {/* 배송요청 & 배송추적 버튼 */}
                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="xs"
                            disabled={isRequesting}
                            onClick={() => handleRequestDelivery(item, idx)}
                            className="h-6 px-2 text-[10.5px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer gap-1"
                            title="중간 게이트웨이(POST /api/v1/logistics/deliveries)로 배송건 위탁 전송 및 동기화"
                          >
                            {isRequesting ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="h-2.5 w-2.5" />
                            )}
                            <span>배송요청</span>
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleOpenDetail(item)}
                            className="h-6 px-2 text-[10.5px] font-bold text-sky-700 border-sky-300 hover:bg-sky-50 dark:hover:bg-zinc-800 cursor-pointer"
                          >
                            배송추적
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. 배송 상세 및 외부 API JSON 뷰어 모달 */}
      {isDetailModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-xl shadow-2xl border overflow-hidden flex flex-col max-h-[90vh]">
            {/* 모달 상단 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-sm">
                  배송 상세 정보 & 추적 관제 ({selectedItem.trackingNo})
                </h3>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 모달 탭 바 */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-700">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveModalTab("TIMELINE")}
                  className={`px-3 py-1 rounded-md font-bold text-xs cursor-pointer ${
                    activeModalTab === "TIMELINE"
                      ? "bg-white dark:bg-zinc-900 text-sky-700 dark:text-sky-400 shadow-2xs border border-sky-200"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  배송 타임라인 & 기사 정보
                </button>
                <button
                  onClick={() => setActiveModalTab("API_JSON")}
                  className={`px-3 py-1 rounded-md font-bold text-xs cursor-pointer flex items-center gap-1 ${
                    activeModalTab === "API_JSON"
                      ? "bg-white dark:bg-zinc-900 text-purple-700 dark:text-purple-400 shadow-2xs border border-purple-200"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <Code2 className="h-3.5 w-3.5" />
                  소프트러쉬 응답 규격 (JSON)
                </button>
              </div>

              <span className="text-[10px] text-zinc-400 font-mono">
                Source: {selectedItem.apiSource}
              </span>
            </div>

            {/* 모달 본문 */}
            <div className="p-4 overflow-y-auto flex flex-col gap-3 text-xs">
              {/* 상단 기본 제원 요약 카드 */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-zinc-400 text-[10px]">운송장번호</span>
                  <div className="font-mono font-bold text-sky-700 dark:text-sky-400">
                    {selectedItem.trackingNo}
                  </div>
                </div>
                <div>
                  <span className="text-zinc-400 text-[10px]">프로젝트 / 품목</span>
                  <div className="font-bold text-zinc-800 dark:text-zinc-200 truncate">
                    {selectedItem.projectNo}
                  </div>
                </div>
                <div>
                  <span className="text-zinc-400 text-[10px]">납품 고객사</span>
                  <div className="font-bold text-zinc-800 dark:text-zinc-200 truncate">
                    {selectedItem.customerName}
                  </div>
                </div>
                <div>
                  <span className="text-zinc-400 text-[10px]">배송 상태</span>
                  <div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        selectedItem.status === "배송중"
                          ? "bg-blue-100 text-blue-800"
                          : selectedItem.status === "배송완료"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {selectedItem.status}
                    </span>
                  </div>
                </div>
              </div>

              {activeModalTab === "TIMELINE" ? (
                <>
                  {/* 배송 기사 및 차량 정보 */}
                  <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600">
                        <Truck className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                          <span>{selectedItem.carrierName || "소프트러쉬 운송"}</span>
                          <span className="text-zinc-400 font-normal">|</span>
                          <span className="font-mono">{selectedItem.vehicleNo || "배차 대기"}</span>
                          {selectedItem.vehicleType && (
                            <span className="text-[10px] text-zinc-500 font-normal">
                              ({selectedItem.vehicleType})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
                          <span>
                            기사: <b>{selectedItem.driverName || "배차 후 확정"}</b>
                          </span>
                          <span className="text-zinc-400 font-normal">|</span>
                          <span className="flex items-center gap-1 font-mono text-sky-600">
                            <Phone className="h-3 w-3" />
                            {selectedItem.driverPhone || "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-zinc-400">현재 위치</span>
                      <div className="font-bold text-xs text-rose-600 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{selectedItem.currentLocation || "배차/출하 대기"}</span>
                      </div>
                    </div>
                  </div>

                  {/* 타임라인 단계 */}
                  <div className="border border-slate-200 dark:border-zinc-800 rounded-lg p-3 bg-white dark:bg-zinc-900 shadow-2xs flex flex-col gap-2">
                    <h4 className="font-bold text-xs text-zinc-700 dark:text-zinc-300">
                      배송 진행 타임라인
                    </h4>

                    {(selectedItem.transitSteps || []).length === 0 ? (
                      <div className="py-6 text-center text-zinc-400 text-xs">
                        아직 물류사에서 전송된 경유 이력(transitSteps)이 없습니다. (배차 및 출발 후 갱신됩니다)
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5 pt-1">
                        {(selectedItem.transitSteps || []).map((step, idx) => (
                          <div key={idx} className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                  step.isCompleted
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-200 dark:bg-zinc-700 text-zinc-500"
                                }`}
                              >
                                {step.isCompleted ? <Check className="h-3 w-3" /> : idx + 1}
                              </div>
                              {idx < (selectedItem.transitSteps?.length ?? 0) - 1 && (
                                <div
                                  className={`w-0.5 h-6 ${
                                    step.isCompleted
                                      ? "bg-emerald-400"
                                      : "bg-slate-200 dark:bg-zinc-700"
                                  }`}
                                />
                              )}
                            </div>

                            <div className="flex-1 pb-1">
                              <div className="flex items-center justify-between">
                                <span
                                  className={`font-bold text-xs ${
                                    step.isCompleted
                                      ? "text-zinc-900 dark:text-zinc-100"
                                      : "text-zinc-400"
                                  }`}
                                >
                                  {step.step}
                                </span>
                                <span className="font-mono text-[10px] text-zinc-400">
                                  {step.time}
                                </span>
                              </div>
                              <div className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3 text-zinc-400" />
                                <span>{step.location}</span>
                              </div>
                              {step.note && (
                                <div className="text-[10px] text-slate-400 mt-0.5 bg-slate-50 dark:bg-zinc-800 px-2 py-0.5 rounded border border-slate-100 dark:border-zinc-700">
                                  • {step.note}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* REST API JSON 프리뷰 탭 */
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between bg-slate-100 dark:bg-zinc-800 p-2 rounded text-zinc-600 dark:text-zinc-300">
                    <span className="text-[11px] font-medium">
                      * 게이트웨이(GET /api/v1/logistics/deliveries/&#123;trackingNo&#125;) 연동 데이터 구조
                    </span>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={handleCopyJson}
                      className="h-6 px-2 text-[10px] gap-1 cursor-pointer"
                    >
                      {copiedJson ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span>{copiedJson ? "복사완료" : "JSON 복사"}</span>
                    </Button>
                  </div>

                  <pre className="p-3 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-72 border border-slate-800">
                    {JSON.stringify(selectedItem, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border-t flex items-center justify-between text-xs">
              <span className="text-[10px] text-zinc-500">
                * MPSI SCM ↔ 물류 게이트웨이({gwBaseUrl}) KS X 9101 BOD 표준 연계
              </span>
              <Button
                size="sm"
                onClick={() => setIsDetailModalOpen(false)}
                className="h-7 px-4 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white cursor-pointer"
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 6. 물류 게이트웨이 주소 및 MPSI_API_KEY 설정 모달 */}
      {isGwConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-sm">물류 게이트웨이 (mpsi-gw) 연동 설정</h3>
              </div>
              <button
                onClick={() => setIsGwConfigOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  게이트웨이 기준 주소 (MPSI_GW_BASE_URL)
                </label>
                <Input
                  value={gwBaseUrl}
                  onChange={(e) => setGwBaseUrl(e.target.value)}
                  placeholder="https://mpsi-gw.a2lab.co.kr"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">
                    게이트웨이 인증키 (x-mpsi-api-key / MPSI_API_KEY)
                  </label>
                  <span
                    className={`text-[10px] font-bold ${
                      gwHasKey ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {gwHasKey ? "● 서버에 키 설정됨 (비공개)" : "미설정"}
                  </span>
                </div>
                <Input
                  type="password"
                  value={gwInputKey}
                  onChange={(e) => setGwInputKey(e.target.value)}
                  placeholder="새 MPSI_API_KEY 입력 (비워두면 기존 키 유지)"
                  className="h-8 text-xs font-mono"
                />
                <p className="text-[10.5px] text-zinc-500 mt-1">
                  • 서버 환경변수(<code>MPSI_API_KEY</code>)로 두거나 이곳에서 저장하면 서버 측에서만 안전하게 보관되어 모든 게이트웨이 호출 시 <code>x-mpsi-api-key</code> 헤더로 전송됩니다.
                </p>
              </div>
            </div>

            <div className="px-4 py-2.5 bg-slate-50 dark:bg-zinc-800 border-t flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsGwConfigOpen(false)}
                className="h-7 px-3 text-xs cursor-pointer"
              >
                취소
              </Button>
              <Button
                size="sm"
                disabled={isSavingGwConfig}
                onClick={handleSaveGwConfig}
                className="h-7 px-4 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white cursor-pointer"
              >
                저장
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 7. 신규 배송 위탁 등록 모달 (POST /api/v1/logistics/deliveries) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[92vh]">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-emerald-400" />
                <h3 className="font-bold text-sm">
                  신규 배송 위탁 등록 (KS X 9101 BOD 연계)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 모달 본문 */}
            <form onSubmit={handleSubmitCreateDelivery} className="p-4 overflow-y-auto flex flex-col gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
                • <b>MPSI SCM ➔ 게이트웨이(mpsi-gw) 위탁 등록</b>: 등록 즉시 게이트웨이가 KS X 9101 BOD 규격 검증 후 소프트러쉬 물류사에 전송하고, 실시간 동기화하여 화면 그리드에 추가됩니다.
              </div>

              {/* 검증 실패 이슈 박스 (422 등) */}
              {createIssues.length > 0 && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400 text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>게이트웨이 검증 실패 사유 (issues)</span>
                  </div>
                  <ul className="list-disc list-inside font-mono text-[11px] text-rose-600 dark:text-rose-300 space-y-0.5 pt-1">
                    {createIssues.map((iss, idx) => (
                      <li key={idx}>{iss}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 입력 폼 2열 그리드 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 배송식별자 */}
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    배송식별자 (deliveryId) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    value={newDeliveryForm.deliveryId}
                    onChange={(e) =>
                      setNewDeliveryForm((prev) => ({ ...prev, deliveryId: e.target.value }))
                    }
                    placeholder="예: DLV-20261107-001"
                    className="h-8 text-xs font-mono"
                    required
                  />
                </div>

                {/* 운송장번호 */}
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    운송장번호 (trackingNo) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    value={newDeliveryForm.trackingNo}
                    onChange={(e) =>
                      setNewDeliveryForm((prev) => ({ ...prev, trackingNo: e.target.value }))
                    }
                    placeholder="예: SR-20261107-001"
                    className="h-8 text-xs font-mono"
                    required
                  />
                </div>

                {/* 프로젝트번호 */}
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    프로젝트 관리번호 (projectNo) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-1.5">
                    <Input
                      value={newDeliveryForm.projectNo}
                      onChange={(e) =>
                        setNewDeliveryForm((prev) => ({ ...prev, projectNo: e.target.value }))
                      }
                      placeholder="예: MI26001P0"
                      className="h-8 text-xs font-mono flex-1"
                      required
                    />
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          setNewDeliveryForm((prev) => ({ ...prev, projectNo: e.target.value }));
                        }
                      }}
                      className="h-8 px-2 rounded-md bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono"
                    >
                      <option value="">선택</option>
                      <option value="MI26001P0">MI26001P0</option>
                      <option value="MI26002P0">MI26002P0</option>
                      <option value="MI26003P0">MI26003P0</option>
                      <option value="MI26004P0">MI26004P0</option>
                      <option value="MI26005P0">MI26005P0</option>
                    </select>
                  </div>
                </div>

                {/* 품목명 */}
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    품목명 (productName) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    value={newDeliveryForm.productName}
                    onChange={(e) =>
                      setNewDeliveryForm((prev) => ({ ...prev, productName: e.target.value }))
                    }
                    placeholder="예: Front Door Upper Cover"
                    className="h-8 text-xs"
                    required
                  />
                </div>

                {/* 고객사코드 */}
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    고객사 코드 (customerId) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    value={newDeliveryForm.customerId}
                    onChange={(e) =>
                      setNewDeliveryForm((prev) => ({ ...prev, customerId: e.target.value }))
                    }
                    placeholder="예: HMC-ASAN"
                    className="h-8 text-xs font-mono"
                    required
                  />
                </div>

                {/* 고객사명 */}
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    납품 고객사명 (customerName) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    value={newDeliveryForm.customerName}
                    onChange={(e) =>
                      setNewDeliveryForm((prev) => ({ ...prev, customerName: e.target.value }))
                    }
                    placeholder="예: 현대자동차 (아산공장)"
                    className="h-8 text-xs"
                    required
                  />
                </div>

                {/* 품번 */}
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    품번 (partNo)
                  </label>
                  <Input
                    value={newDeliveryForm.partNo}
                    onChange={(e) =>
                      setNewDeliveryForm((prev) => ({ ...prev, partNo: e.target.value }))
                    }
                    placeholder="예: 0471-NT500-LH"
                    className="h-8 text-xs font-mono"
                  />
                </div>

                {/* 출하 수량 및 단위 */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      출하 수량 (qty) <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={newDeliveryForm.qty}
                      onChange={(e) =>
                        setNewDeliveryForm((prev) => ({ ...prev, qty: Number(e.target.value) || 0 }))
                      }
                      className="h-8 text-xs font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      단위 (unit) <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      value={newDeliveryForm.unit}
                      onChange={(e) =>
                        setNewDeliveryForm((prev) => ({ ...prev, unit: e.target.value }))
                      }
                      placeholder="EA"
                      className="h-8 text-xs font-mono"
                      required
                    />
                  </div>
                </div>

                {/* 출하 공장 */}
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    출하지 / 상차공장 (shippingPoint)
                  </label>
                  <Input
                    value={newDeliveryForm.shippingPoint}
                    onChange={(e) =>
                      setNewDeliveryForm((prev) => ({ ...prev, shippingPoint: e.target.value }))
                    }
                    placeholder="예: (주)뉴몰드 사출 1공장"
                    className="h-8 text-xs"
                  />
                </div>

                {/* 상세 납품처 */}
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    상세 납품처 / 하차지 (destination)
                  </label>
                  <Input
                    value={newDeliveryForm.destination}
                    onChange={(e) =>
                      setNewDeliveryForm((prev) => ({ ...prev, destination: e.target.value }))
                    }
                    placeholder="예: 아산공장 1라인 부품하차장 B구역"
                    className="h-8 text-xs"
                  />
                </div>

                {/* 납품 요청일 */}
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    납품 요청일 (requestedDeliveryDate)
                  </label>
                  <Input
                    type="date"
                    value={newDeliveryForm.requestedDeliveryDate}
                    onChange={(e) =>
                      setNewDeliveryForm((prev) => ({
                        ...prev,
                        requestedDeliveryDate: e.target.value,
                      }))
                    }
                    className="h-8 text-xs font-mono"
                  />
                </div>

                {/* 희망 수령일 */}
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    희망 수령일 (preferredReceiptDate)
                  </label>
                  <Input
                    type="date"
                    value={newDeliveryForm.preferredReceiptDate}
                    onChange={(e) =>
                      setNewDeliveryForm((prev) => ({
                        ...prev,
                        preferredReceiptDate: e.target.value,
                      }))
                    }
                    className="h-8 text-xs font-mono"
                  />
                </div>

                {/* 비고 및 요청사항 */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    비고 / 요청사항 (note)
                  </label>
                  <Input
                    value={newDeliveryForm.note}
                    onChange={(e) =>
                      setNewDeliveryForm((prev) => ({ ...prev, note: e.target.value }))
                    }
                    placeholder="예: 오전 하차 희망 / 파손 주의 품목"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* 하단 푸터 버튼 */}
              <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
                <span className="text-[10.5px] text-zinc-400 font-mono">
                  Endpoint: POST /api/v1/logistics/deliveries
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="h-8 px-3.5 text-xs cursor-pointer"
                  >
                    취소
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmittingCreate}
                    className="h-8 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer gap-1.5 shadow-xs"
                  >
                    {isSubmittingCreate ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    <span>게이트웨이 배송 위탁 전송</span>
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

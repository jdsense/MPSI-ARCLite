"use client";

import React, { useState } from "react";
import { 
  Truck, PackageCheck, Clock, MapPin, Search, 
  RefreshCw, CheckCircle2, AlertCircle, Phone, 
  Calendar, Building2, ExternalLink, Code2, Copy, 
  Check, ArrowRight, Layers, Sparkles, Filter, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeliveryItem, DeliveryStatusType } from "@/types/delivery";
import { TruckTwinViewer } from "@/components/delivery/truck-twin-viewer";

export type { DeliveryItem };

// SCM 표준 샘플 배송 데이터
const INITIAL_DELIVERIES: DeliveryItem[] = [
  {
    id: "deliv-1",
    trackingNo: "CJ-20261018-001",
    projectNo: "MI26001P0",
    customerName: "현대자동차 (아산공장)",
    destination: "아산공장 1라인 부품하차장 B구역",
    productName: "Front Door Upper Cover",
    partNo: "84710-NT500-LH",
    qty: 500,
    unit: "EA",
    status: "배송중",
    carrierName: "CJ대한통운",
    vehicleNo: "경기 88바 1234",
    vehicleType: "11톤 윙바디",
    driverName: "김철수 기사",
    driverPhone: "010-3849-2910",
    departureTime: "2026-10-18 09:30",
    estimatedArrival: "2026-10-18 15:30",
    currentLocation: "서해안고속도로 평택분기점 통과",
    apiSource: "소프트러쉬 물류 API v1.0 (GPS)",
    transitSteps: [
      { step: "출하 등록 & 상차 완료", location: "(주)뉴몰드 사출 1공장", time: "2026-10-18 09:30", isCompleted: true, note: "출하 검수 및 윙바디 상차 완료" },
      { step: "물류 터미널 통과", location: "평택 스마트 물류허브", time: "2026-10-18 11:20", isCompleted: true, note: "자동 바코드 스캔 통과" },
      { step: "간선 수송 및 배송 중", location: "서해안고속도로 평택JCT", time: "2026-10-18 13:40", isCompleted: true, note: "정상 운행 중 (시속 82km)" },
      { step: "납품처 도착 & 하차/입고", location: "현대차 아산공장 하차장", time: "2026-10-18 15:30 (예정)", isCompleted: false, note: "하차 대기 예정" },
    ]
  },
  {
    id: "deliv-2",
    trackingNo: "LOG-20261018-002",
    projectNo: "MI26002P0",
    customerName: "현대자동차 (울산공장)",
    destination: "울산 2공장 차체조립동 하차데크",
    productName: "Rear door",
    partNo: "4850",
    qty: 800,
    unit: "EA",
    status: "배송중",
    carrierName: "롯데글로벌로지스",
    vehicleNo: "울산 91바 5678",
    vehicleType: "14톤 특장 트럭",
    driverName: "이성호 기사",
    driverPhone: "010-4829-1029",
    departureTime: "2026-10-18 08:00",
    estimatedArrival: "2026-10-18 17:00",
    currentLocation: "경부고속도로 김천휴게소 부근",
    apiSource: "소프트러쉬 물류 API v1.0 (GPS)",
    transitSteps: [
      { step: "출하 등록 & 상차 완료", location: "(주)뉴몰드 안산공장", time: "2026-10-18 08:00", isCompleted: true, note: "완제품 OQC 합격 후 상차" },
      { step: "중부 물류허브 집하", location: "대전 물류 복합센터", time: "2026-10-18 11:50", isCompleted: true, note: "화물 적재 상태 점검" },
      { step: "간선 배송 중", location: "경부고속도로 김천구간", time: "2026-10-18 14:10", isCompleted: true, note: "정체 없이 정상 주행 중" },
      { step: "납품처 도착 & 인수", location: "현대차 울산 2공장", time: "2026-10-18 17:00 (예정)", isCompleted: false, note: "입고 검수 대기" },
    ]
  },
  {
    id: "deliv-3",
    trackingNo: "TRK-20261018-003",
    projectNo: "MI26003P0",
    customerName: "현대모비스 (화성공장)",
    destination: "화성 모듈조립 3공장",
    productName: "Door Trim",
    partNo: "84710-NT700",
    qty: 400,
    unit: "EA",
    status: "배송완료",
    carrierName: "CJ대한통운",
    vehicleNo: "서울 82바 9988",
    vehicleType: "5톤 윙바디",
    driverName: "박동진 기사",
    driverPhone: "010-9182-3847",
    departureTime: "2026-10-18 09:00",
    estimatedArrival: "2026-10-18 14:00",
    actualArrival: "2026-10-18 13:50",
    currentLocation: "현대모비스 화성공장 (인수완료)",
    apiSource: "소프트러쉬 물류 API v1.0 (GPS)",
    transitSteps: [
      { step: "출하 등록 & 상차 완료", location: "(주)뉴몰드 사출공장", time: "2026-10-18 09:00", isCompleted: true, note: "출하 바코드 발행" },
      { step: "수도권 남부 터미널 통과", location: "군포 복합물류터미널", time: "2026-10-18 10:45", isCompleted: true, note: "경유 터미널 통과" },
      { step: "간선 운송", location: "수원-화성 고속화도로", time: "2026-10-18 12:20", isCompleted: true, note: "목적지 근접" },
      { step: "납품처 도착 & 인수 완료", location: "현대모비스 화성공장", time: "2026-10-18 13:50", isCompleted: true, note: "입고 담당자 전자서명 완료" },
    ]
  },
  {
    id: "deliv-4",
    trackingNo: "CJ-20261018-004",
    projectNo: "MI26004P0",
    customerName: "기아자동차 (화성공장)",
    destination: "화성 완성차 조립 1라인",
    productName: "Radiator Lower Grille",
    partNo: "86350-K7000",
    qty: 600,
    unit: "EA",
    status: "배송완료",
    carrierName: "CJ대한통운",
    vehicleNo: "경기 85바 4421",
    vehicleType: "11톤 윙바디",
    driverName: "정재민 기사",
    driverPhone: "010-5544-7788",
    departureTime: "2026-10-18 07:30",
    estimatedArrival: "2026-10-18 11:30",
    actualArrival: "2026-10-18 11:20",
    currentLocation: "기아 화성공장 하차데크 (입고 완료)",
    apiSource: "소프트러쉬 물류 API v1.0 (GPS)",
    transitSteps: [
      { step: "상차 완료", location: "MPSI 자체사출라인", time: "2026-10-18 07:30", isCompleted: true },
      { step: "물류 허브 통과", location: "안산 터미널", time: "2026-10-18 08:50", isCompleted: true },
      { step: "배송 운행", location: "화성 남양로", time: "2026-10-18 10:10", isCompleted: true },
      { step: "배송 및 인수 완료", location: "기아 화성공장", time: "2026-10-18 11:20", isCompleted: true, note: "정시 도착 완료" },
    ]
  },
  {
    id: "deliv-5",
    trackingNo: "LOG-20261018-005",
    projectNo: "MI26005P0",
    customerName: "HKMC 남양연구소",
    destination: "연구개발 2동 프로토 시험실",
    productName: "Door Armrest Base",
    partNo: "82710-AA000",
    qty: 150,
    unit: "EA",
    status: "출하준비",
    carrierName: "직배송/자체배송",
    vehicleNo: "서울 80가 1122",
    vehicleType: "1톤 탑차",
    driverName: "한승우 기사",
    driverPhone: "010-2233-4455",
    departureTime: "2026-10-18 16:30 (예정)",
    estimatedArrival: "2026-10-18 18:00 (예정)",
    currentLocation: "사출 출하장 상차 대기 중",
    apiSource: "소프트러쉬 물류 API v1.0 (GPS)",
    transitSteps: [
      { step: "출하 포장 및 라벨링", location: "출하 검사실", time: "2026-10-18 14:00", isCompleted: true },
      { step: "차량 배차 및 상차 대기", location: "사출공장 출하장", time: "2026-10-18 16:00", isCompleted: false },
      { step: "배송 출발", location: "남양연구소 이동구간", time: "2026-10-18 16:30 (예정)", isCompleted: false },
      { step: "현장 납품 완료", location: "남양연구소 2동", time: "2026-10-18 18:00 (예정)", isCompleted: false },
    ]
  }
];

export default function DeliveryStatusPage() {
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>(INITIAL_DELIVERIES);
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "출하준비" | "배송중" | "배송완료">("ALL");
  const [selectedItem, setSelectedItem] = useState<DeliveryItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<"TIMELINE" | "TRUCK_TWIN" | "API_JSON">("TIMELINE");
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 소프트러쉬(외부 업체) 물류 API 연동 Pull 동기화
  const handleSyncExternalApi = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      showToast("소프트러쉬(SoftRush) 물류 API 서버로부터 최신 배송 및 차량 위치 데이터를 성공적으로 가져왔습니다(Pull).");
    }, 800);
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
  const otdRate = "98.5%"; // 정시 배송률 (On-Time Delivery)

  const handleOpenDetail = (item: DeliveryItem) => {
    setSelectedItem(item);
    setActiveModalTab("TIMELINE");
    setIsDetailModalOpen(true);
  };

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
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                SCM 배송현황 (소프트러쉬 물류연계 관제)
              </h2>
              
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 text-xs mt-0.5">
              • 외부 연계사 &apos;소프트러쉬&apos; 물류 API 서버에 접속하여 최신 배송 및 차량 위치 데이터를 조회(Pull 방식)합니다.
            </p>
          </div>
        </div>

        {/* 외부 API 동기화 버튼 및 소프트러시 3D 트럭 디지털 트윈 바로가기 */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const target = deliveries[0] || INITIAL_DELIVERIES[0];
              setSelectedItem(target);
              setActiveModalTab("TRUCK_TWIN");
              setIsDetailModalOpen(true);
            }}
            className="h-8 px-3 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold gap-1.5 cursor-pointer"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>3D 트럭 적재 트윈 (공유 모듈)</span>
          </Button>
          <a
            href="/truck-twin/1.0.0/demo/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-slate-50 text-zinc-700 dark:text-zinc-300 text-xs font-bold"
          >
            <span>호스팅 데모</span>
            <ExternalLink className="h-3 w-3" />
          </a>
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

      {/* 2. SCM 핵심 KPI 요약 카드 4종 */}
      

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
              {st === "ALL" ? `전체 (${totalCount})` : `${st} (${st === "출하준비" ? readyCount : st === "배송중" ? inTransitCount : completedCount})`}
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
                <th className="py-2.5 px-3 text-center w-24">상세 추적</th>
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
                filteredList.map((item, idx) => (
                  <tr 
                    key={item.id}
                    onClick={() => handleOpenDetail(item)}
                    className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                  >
                    {/* No */}
                    <td className="py-2.5 px-3 text-center font-mono text-zinc-500">
                      {idx + 1}
                    </td>

                    {/* 운송장 번호 */}
                    <td className="py-2.5 px-3 font-mono font-bold text-sky-700 dark:text-sky-400">
                      {item.trackingNo}
                    </td>

                    {/* 배송 상태 */}
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                        item.status === "배송중"
                          ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
                          : item.status === "배송완료"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                          : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
                      }`}>
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
                      {item.qty.toLocaleString()} <span className="text-[10px] text-zinc-400 font-normal">{item.unit}</span>
                    </td>

                    {/* 운송사 (차량번호) */}
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-zinc-800 dark:text-zinc-200">{item.carrierName}</div>
                      <div className="text-[10px] text-zinc-400 font-mono">{item.vehicleNo}</div>
                    </td>

                    {/* 출발일시 */}
                    <td className="py-2.5 px-3 font-mono text-zinc-600 dark:text-zinc-400 text-[10.5px]">
                      {item.departureTime}
                    </td>

                    {/* 도착예정일시 */}
                    <td className="py-2.5 px-3 font-mono text-[10.5px]">
                      {item.actualArrival ? (
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                          {item.actualArrival}
                        </span>
                      ) : (
                        <span className="text-zinc-600 dark:text-zinc-400">
                          {item.estimatedArrival}
                        </span>
                      )}
                    </td>

                    {/* 현재 위치 */}
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                        <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                        <span className="truncate max-w-[140px]">{item.currentLocation}</span>
                      </span>
                    </td>

                    {/* 상세 추적 버튼 */}
                    <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleOpenDetail(item)}
                        className="h-6 px-2 text-[10.5px] font-bold text-sky-700 border-sky-300 hover:bg-sky-50 dark:hover:bg-zinc-800 cursor-pointer"
                      >
                        배송추적
                      </Button>
                    </td>
                  </tr>
                ))
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
                  onClick={() => setActiveModalTab("TRUCK_TWIN")}
                  className={`px-3 py-1 rounded-md font-bold text-xs cursor-pointer flex items-center gap-1 ${
                    activeModalTab === "TRUCK_TWIN"
                      ? "bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-2xs border border-emerald-200"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  3D 적재 디지털 트윈
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
                  <div className="font-mono font-bold text-sky-700 dark:text-sky-400">{selectedItem.trackingNo}</div>
                </div>
                <div>
                  <span className="text-zinc-400 text-[10px]">프로젝트 / 품목</span>
                  <div className="font-bold text-zinc-800 dark:text-zinc-200 truncate">{selectedItem.projectNo}</div>
                </div>
                <div>
                  <span className="text-zinc-400 text-[10px]">납품 고객사</span>
                  <div className="font-bold text-zinc-800 dark:text-zinc-200 truncate">{selectedItem.customerName}</div>
                </div>
                <div>
                  <span className="text-zinc-400 text-[10px]">배송 상태</span>
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedItem.status === "배송중" ? "bg-blue-100 text-blue-800" :
                      selectedItem.status === "배송완료" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}>
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
                          <span>{selectedItem.carrierName}</span>
                          <span className="text-zinc-400 font-normal">|</span>
                          <span className="font-mono">{selectedItem.vehicleNo}</span>
                          <span className="text-[10px] text-zinc-500 font-normal">({selectedItem.vehicleType})</span>
                        </div>
                        <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
                          <span>기사: <b>{selectedItem.driverName}</b></span>
                          <span className="text-zinc-400 font-normal">|</span>
                          <span className="flex items-center gap-1 font-mono text-sky-600">
                            <Phone className="h-3 w-3" />
                            {selectedItem.driverPhone}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-zinc-400">현재 위치</span>
                      <div className="font-bold text-xs text-rose-600 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{selectedItem.currentLocation}</span>
                      </div>
                    </div>
                  </div>

                  {/* 타임라인 단계 */}
                  <div className="border border-slate-200 dark:border-zinc-800 rounded-lg p-3 bg-white dark:bg-zinc-900 shadow-2xs flex flex-col gap-2">
                    <h4 className="font-bold text-xs text-zinc-700 dark:text-zinc-300">
                      배송 진행 타임라인
                    </h4>
                    
                    <div className="flex flex-col gap-2.5 pt-1">
                      {(selectedItem.transitSteps || []).map((step, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              step.isCompleted 
                                ? "bg-emerald-600 text-white" 
                                : "bg-slate-200 dark:bg-zinc-700 text-zinc-500"
                            }`}>
                              {step.isCompleted ? <Check className="h-3 w-3" /> : idx + 1}
                            </div>
                            {idx < (selectedItem.transitSteps?.length ?? 0) - 1 && (
                              <div className={`w-0.5 h-6 ${step.isCompleted ? "bg-emerald-400" : "bg-slate-200 dark:bg-zinc-700"}`} />
                            )}
                          </div>

                          <div className="flex-1 pb-1">
                            <div className="flex items-center justify-between">
                              <span className={`font-bold text-xs ${step.isCompleted ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400"}`}>
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
                  </div>
                </>
              ) : activeModalTab === "TRUCK_TWIN" ? (
                <TruckTwinViewer delivery={selectedItem} />
              ) : (
                /* REST API JSON 프리뷰 탭 */
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between bg-slate-100 dark:bg-zinc-800 p-2 rounded text-zinc-600 dark:text-zinc-300">
                    <span className="text-[11px] font-medium">
                      * 외부 물류사 API 연동 규격 샘플 Payload (REST Response 구조)
                    </span>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={handleCopyJson}
                      className="h-6 px-2 text-[10px] gap-1 cursor-pointer"
                    >
                      {copiedJson ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
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
                * MPSI 시스템에서 소프트러쉬(SoftRush) API 서버로 요청하여 데이터를 조회하는 Pull 방식으로 연동됩니다.
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

    </div>
  );
}


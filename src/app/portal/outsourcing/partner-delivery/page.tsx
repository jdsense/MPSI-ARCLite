"use client";

import { useState } from "react";
import { 
  Search, RefreshCw, Truck, Building2, 
  CheckCircle2, Clock, Eye, X, Send, FileText, AlertCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// 거래처 납품/입고 관리 데이터 타입
interface PartnerDeliveryItem {
  id: number;
  idx: number;
  poNo: string;           // MPSI 발주번호
  orderType: "단품외주" | "일반구매";
  vendorName: string;     // 자사(거래처)명
  itemName: string;       // 품목/가공명
  itemCode: string;       // 품목코드
  orderQty: number;       // 발주 수량
  deliveredQty: number;   // 납품 등록 수량
  dueDate: string;        // MPSI 요구 납기일
  shipmentDate?: string;  // 출하/납품 완료일
  trackingNo?: string;    // 송장/운송장 번호
  status: "발주확인대기" | "가공/생산중" | "납품완료(검수대기)" | "검수Pass"; // 진행 상태
  mpsiManager: string;    // MPSI 담당자
  mpsiRemark: string;     // MPSI 작업 지시사항
  partnerNote?: string;   // 거래처 공유 메모
}

// 샘플 데이터 (현재 접속 거래처: "(주)원팩" 기준)
const initialPartnerData: PartnerDeliveryItem[] = [
  {
    id: 1,
    idx: 1,
    poNo: "OUT-202607-001",
    orderType: "단품외주",
    vendorName: "(주)원팩",
    itemName: "모터 하우징 정밀 CNC 가공",
    itemCode: "ITM-M020",
    orderQty: 100,
    deliveredQty: 0,
    dueDate: "2026-08-05",
    status: "가공/생산중",
    mpsiManager: "김태훈",
    mpsiRemark: "도면 Rev.2 기준 단면 연마 추가 작업 요청",
    partnerNote: "1차 CNC 가공 진행 중 (8/3 완료 예정)",
  },
  {
    id: 2,
    idx: 2,
    poNo: "PUR-202607-005",
    orderType: "일반구매",
    vendorName: "(주)원팩",
    itemName: "소형 감속기 Gear ASSY",
    itemCode: "ITM-G005",
    orderQty: 50,
    deliveredQty: 50,
    dueDate: "2026-07-29",
    shipmentDate: "2026-07-28",
    trackingNo: "경동화물 827-1092-33",
    status: "납품완료(검수대기)",
    mpsiManager: "이인배",
    mpsiRemark: "긴급 수령 건, 검사성적서 동봉 필수",
    partnerNote: "금일 오후 경동화물 출하 완료했습니다.",
  },
];

export default function PartnerDeliveryPage() {
  // 현재 접속한 거래처 정보 (실제 구현 시 로그인 세션 연동)
  const currentPartner = "(주)원팩";

  // 1. 검색 필터
  const [filterPoNo, setFilterPoNo] = useState("");
  const [filterItemName, setFilterItemName] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // 2. 테이블 데이터 및 납품 처리 모달
  const [data, setData] = useState<PartnerDeliveryItem[]>(initialPartnerData);
  const [selectedItem, setSelectedItem] = useState<PartnerDeliveryItem | null>(null);

  // 납품 입력 폼 상태
  const [inputStatus, setInputStatus] = useState<PartnerDeliveryItem["status"]>("가공/생산중");
  const [inputDeliveredQty, setInputDeliveredQty] = useState<number>(0);
  const [inputTrackingNo, setInputTrackingNo] = useState("");
  const [inputPartnerNote, setInputPartnerNote] = useState("");

  // 검색
  const handleSearch = () => {
    const filtered = initialPartnerData.filter((item) => {
      const matchPo = filterPoNo ? item.poNo.toLowerCase().includes(filterPoNo.toLowerCase()) : true;
      const matchItem = filterItemName ? item.itemName.includes(filterItemName) : true;
      const matchStatus = filterStatus !== "ALL" ? item.status === filterStatus : true;
      return matchPo && matchItem && matchStatus;
    });
    setData(filtered);
  };

  const handleReset = () => {
    setFilterPoNo("");
    setFilterItemName("");
    setFilterStatus("ALL");
    setData(initialPartnerData);
  };

  // 모달 열기
  const handleOpenModal = (item: PartnerDeliveryItem) => {
    setSelectedItem(item);
    setInputStatus(item.status);
    setInputDeliveredQty(item.deliveredQty || item.orderQty);
    setInputTrackingNo(item.trackingNo || "");
    setInputPartnerNote(item.partnerNote || "");
  };

  // 거래처 상태 및 납품 정보 업데이트 저장
  const handleSavePartnerUpdate = () => {
    if (!selectedItem) return;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    setData((prev) =>
      prev.map((row) =>
        row.id === selectedItem.id
          ? {
              ...row,
              status: inputStatus,
              deliveredQty: Number(inputDeliveredQty) || 0,
              trackingNo: inputTrackingNo,
              partnerNote: inputPartnerNote,
              shipmentDate: inputStatus === "납품완료(검수대기)" ? todayStr : row.shipmentDate,
            }
          : row
      )
    );

    alert("MPSI 시스템으로 납품 및 작업 진행 상태가 성공적으로 공유되었습니다.");
    setSelectedItem(null);
  };

  return (
    <div className="flex flex-col gap-3 text-xs relative">
      {/* 거래처 안내 바 */}
      <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 rounded-md p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300">
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="font-bold text-xs">
            현재 로그인 거래처: <span className="underline decoration-2 underline-offset-4">{currentPartner}</span>
          </span>
          <span className="text-[11px] text-sky-600 dark:text-sky-400 font-normal ml-2">
            * MPSI에서 발주한 자사 내역만 조회 및 상태 업데이트가 가능합니다.
          </span>
        </div>
      </div>

      {/* 1. 상단 검색 조건 필터 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex flex-col gap-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">MPSI 발주번호</span>
            <Input 
              value={filterPoNo} 
              onChange={(e) => setFilterPoNo(e.target.value)} 
              placeholder="예: OUT-202607-001" 
              className="h-7 text-xs" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">품목/가공명</span>
            <Input 
              value={filterItemName} 
              onChange={(e) => setFilterItemName(e.target.value)} 
              placeholder="검색어 입력" 
              className="h-7 text-xs" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">진행 상태</span>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)} 
              className="h-7 rounded-md border bg-transparent px-2 text-xs"
            >
              <option value="ALL">전체</option>
              <option value="발주확인대기">발주확인대기</option>
              <option value="가공/생산중">가공/생산중</option>
              <option value="납품완료(검수대기)">납품완료(검수대기)</option>
              <option value="검수Pass">검수Pass</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-1.5 pt-1 border-t border-zinc-100 dark:border-zinc-800">
          <Button onClick={handleSearch} className="h-7 px-3 bg-sky-600 hover:bg-sky-700 text-white gap-1 text-xs">
            <Search className="h-3.5 w-3.5" />
            검색
          </Button>
          <Button onClick={handleReset} variant="outline" className="h-7 px-3 gap-1 text-xs text-zinc-600">
            <RefreshCw className="h-3.5 w-3.5" />
            초기화
          </Button>
        </div>
      </div>

      {/* 2. 데이터 그리드 영역 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs overflow-hidden flex flex-col min-h-[480px]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border-b">
          <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-100">
            <Truck className="h-4 w-4 text-sky-600" />
            <span>수신 발주 및 납품/출하 등록</span>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full border-collapse text-left border-spacing-0 whitespace-nowrap">
            <thead className="sticky top-0 bg-[#2d3748] text-white text-[11px] z-10">
              <tr>
                <th className="p-1.5 w-10 text-center border-r border-slate-600">Idx</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[120px]">MPSI 발주번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[80px] text-center">구분</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[180px]">품목/가공명</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[80px] text-right pr-3">발주 수량</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[80px] text-right pr-3">납품 수량</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[100px]">MPSI 요구납기</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[100px]">출하/납품일</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[140px]">송장/운송장 번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[120px] text-center">진행 상태</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px]">MPSI 담당자</th>
                <th className="p-1.5 min-w-[100px] text-center">상태등록 및 공유</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
              {data.map((row) => (
                <tr key={row.id} className="hover:bg-sky-50 dark:hover:bg-zinc-800/60 transition-colors odd:bg-white even:bg-zinc-50/50 dark:odd:bg-zinc-900 dark:even:bg-zinc-900/50">
                  <td className="p-1.5 text-center font-mono text-zinc-500 border-r">{row.idx}</td>
                  <td className="p-1.5 border-r font-mono text-sky-600 font-medium">{row.poNo}</td>
                  
                  <td className="p-1.5 border-r text-center">
                    <span className={`inline-block px-1.5 py-0.2 rounded-xs text-[10px] font-bold ${
                      row.orderType === "단품외주" ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    }`}>
                      {row.orderType}
                    </span>
                  </td>

                  <td className="p-1.5 border-r font-medium">{row.itemName}</td>
                  <td className="p-1.5 border-r font-mono text-right pr-3 font-semibold">{row.orderQty.toLocaleString()} EA</td>
                  <td className="p-1.5 border-r font-mono text-right pr-3 font-bold text-sky-600">{row.deliveredQty.toLocaleString()} EA</td>
                  <td className="p-1.5 border-r font-mono text-rose-600 font-medium">{row.dueDate}</td>
                  <td className="p-1.5 border-r font-mono">{row.shipmentDate || "-"}</td>
                  <td className="p-1.5 border-r font-mono text-zinc-600">{row.trackingNo || "-"}</td>

                  {/* 상태 태그 */}
                  <td className="p-1.5 border-r text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      row.status === "검수Pass" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300" :
                      row.status === "가공/생산중" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 animate-pulse" :
                      row.status === "납품완료(검수대기)" ? "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border border-sky-300" :
                      "bg-zinc-100 text-zinc-600 dark:bg-zinc-800"
                    }`}>
                      {row.status}
                    </span>
                  </td>

                  <td className="p-1.5 border-r">{row.mpsiManager}</td>

                  {/* 납품 등록 버튼 */}
                  <td className="p-1.5 text-center">
                    <Button 
                      onClick={() => handleOpenModal(row)} 
                      size="xs" 
                      variant="outline" 
                      className="h-6 px-2 text-[11px] gap-1 bg-white hover:bg-zinc-100 dark:bg-zinc-800"
                    >
                      <Truck className="h-3 w-3 text-sky-600" />
                      납품/상태 등록
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. 거래처 납품 및 상태 등록 모달 */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-lg shadow-xl border overflow-hidden flex flex-col">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 text-white">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-xs">MPSI 발주 진행 상태 및 납품 등록 ({currentPartner})</h3>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 본문 */}
            <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
              {/* MPSI 지시 사항 안내 */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md p-3 flex flex-col gap-1 text-[11px]">
                <div className="flex items-center justify-between font-bold text-amber-800 dark:text-amber-300">
                  <span>MPSI 요구사항 (발주번호: {selectedItem.poNo})</span>
                  <span>담당자: {selectedItem.mpsiManager}</span>
                </div>
                <p className="text-zinc-700 dark:text-zinc-300 font-medium">
                  품목: <b>{selectedItem.itemName}</b> ({selectedItem.orderQty.toLocaleString()} EA)
                </p>
                <p className="text-amber-700 dark:text-amber-400 font-medium">
                  지시사항: {selectedItem.mpsiRemark || "특이사항 없음"}
                </p>
              </div>

              {/* 거래처 정보 입력 폼 */}
              <div className="grid grid-cols-2 gap-3 border rounded-md p-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    현재 작업 진행 상태 <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={inputStatus} 
                    onChange={(e) => setInputStatus(e.target.value as PartnerDeliveryItem["status"])} 
                    className="h-8 w-full rounded-md border bg-transparent px-2 text-xs font-bold text-sky-600"
                  >
                    <option value="가공/생산중">가공/생산중</option>
                    <option value="납품완료(검수대기)">납품완료 (출하 전달)</option>
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">납품 출하 수량 (EA)</label>
                  <Input 
                    type="number" 
                    value={inputDeliveredQty} 
                    onChange={(e) => setInputDeliveredQty(Number(e.target.value))} 
                    className="h-8 text-xs font-mono text-right" 
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">송장/운송장 번호 (택배/화물 수송 시)</label>
                  <Input 
                    value={inputTrackingNo} 
                    onChange={(e) => setInputTrackingNo(e.target.value)} 
                    placeholder="예: 경동화물 827-1092-33 / 자사 직배송" 
                    className="h-8 text-xs font-mono" 
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">거래처 진행 메모 (MPSI 공유용)</label>
                  <Input 
                    value={inputPartnerNote} 
                    onChange={(e) => setInputPartnerNote(e.target.value)} 
                    placeholder="현재 생산 상태나 출하 관련 안내사항 입력" 
                    className="h-8 text-xs" 
                  />
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 border-t">
              <span className="text-[10px] text-zinc-400">저장 시 MPSI 담당자 화면에 상태가 갱신됩니다.</span>
              <div className="flex gap-2">
                <Button onClick={() => setSelectedItem(null)} variant="outline" className="h-8 px-3 text-xs">취소</Button>
                <Button onClick={handleSavePartnerUpdate} className="h-8 px-4 text-xs bg-sky-600 hover:bg-sky-700 text-white gap-1.5">
                  <Send className="h-3.5 w-3.5" />
                  MPSI에 상태 전송
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
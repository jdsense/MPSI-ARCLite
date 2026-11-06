"use client";

import { useState, useMemo } from "react";
import {
  Search,
  RefreshCw,
  Warehouse,
  Package,
  AlertTriangle,
  ArrowRightLeft,
  Download,
  Filter,
  Layers,
  History,
  CheckCircle2,
  XCircle,
  Building2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// 재고 품목 인터페이스
interface InventoryItem {
  id: number;
  itemCode: string;         // 품목코드
  itemName: string;         // 품목명/규격
  itemType: "원재료(레진)" | "부자재" | "반제품(재공)" | "완제품";
  warehouseCode: string;    // 창고코드
  warehouseName: string;    // 창고명
  location: string;         // 세부 로케이션
  lotNo: string;            // LOT 번호 (바코드 식별자)
  currentStock: number;     // 현재고
  availableStock: number;   // 가용재고
  allocatedStock: number;   // 할당(예약)재고
  safetyStock: number;      // 안전재고
  unit: string;             // 단위 (kg, EA, BOX)
  status: "정상" | "부족" | "과다" | "품절";
  projectNo: string;        // 프로젝트 관리번호 (고객사 지정코드 연계)
  vendorName: string;       // 공급처/위탁처
  lastUpdated: string;      // 최종 수불일시
}

// 초기 실증 데이터
const initialInventoryData: InventoryItem[] = [
  {
    id: 1,
    itemCode: "MAT-RSN-001",
    itemName: "PA66 GF30% (난연 블랙 레진)",
    itemType: "원재료(레진)",
    warehouseCode: "WH-MPSI-01",
    warehouseName: "MPSI 원재료 창고동",
    location: "A-01-02",
    lotNo: "LOT20260810-01",
    currentStock: 2500,
    availableStock: 2100,
    allocatedStock: 400,
    safetyStock: 1000,
    unit: "kg",
    status: "정상",
    projectNo: "PRJ-NT5-01",
    vendorName: "LG화학",
    lastUpdated: "2026-08-19 14:20",
  },
  {
    id: 2,
    itemCode: "MAT-RSN-002",
    itemName: "ABS HF-380 사출용 수지",
    itemType: "원재료(레진)",
    warehouseCode: "WH-NM-01",
    warehouseName: "뉴몰드 현장 사출창고",
    location: "N-SILO-01",
    lotNo: "LOT20260812-04",
    currentStock: 450,
    availableStock: 250,
    allocatedStock: 200,
    safetyStock: 800,
    unit: "kg",
    status: "부족",
    projectNo: "PRJ-A2XT-02",
    vendorName: "롯데케미칼",
    lastUpdated: "2026-08-20 09:15",
  },
  {
    id: 3,
    itemCode: "PRD-MTR-001",
    itemName: "전기모터 5HP 하우징 커버",
    itemType: "완제품",
    warehouseCode: "WH-NM-02",
    warehouseName: "뉴몰드 완제품 출하창고",
    location: "PALLET-B-03",
    lotNo: "LOT20260818-M01",
    currentStock: 1200,
    availableStock: 1200,
    allocatedStock: 0,
    safetyStock: 500,
    unit: "EA",
    status: "정상",
    projectNo: "PRJ-NT5-01",
    vendorName: "(주)뉴몰드",
    lastUpdated: "2026-08-19 17:30",
  },
  {
    id: 4,
    itemCode: "SUB-BOX-003",
    itemName: "수출용 표준 개별 카톤박스 400x300",
    itemType: "부자재",
    warehouseCode: "WH-MPSI-02",
    warehouseName: "MPSI 포장/출하창고",
    location: "PKG-02",
    lotNo: "LOT20260801-BX",
    currentStock: 3200,
    availableStock: 3200,
    allocatedStock: 0,
    safetyStock: 1500,
    unit: "EA",
    status: "정상",
    projectNo: "공통",
    vendorName: "한솔포장",
    lastUpdated: "2026-08-14 11:00",
  },
  {
    id: 5,
    itemCode: "WIP-BRK-002",
    itemName: "사출 브라켓 프레임 (시사출 샘플 T2)",
    itemType: "반제품(재공)",
    warehouseCode: "WH-WS-01",
    warehouseName: "우성정공 금형/시사출센터",
    location: "TRIAL-AREA-1",
    lotNo: "LOT20260817-T2",
    currentStock: 25,
    availableStock: 0,
    allocatedStock: 25,
    safetyStock: 50,
    unit: "EA",
    status: "정상",
    projectNo: "PRJ-A2XT-02",
    vendorName: "우성정공(주)",
    lastUpdated: "2026-08-18 16:40",
  },
  {
    id: 6,
    itemCode: "PRD-PNL-002",
    itemName: "스마트 제어 판넬 전면 커버",
    itemType: "완제품",
    warehouseCode: "WH-MPSI-03",
    warehouseName: "MPSI 완제품/선적대기 창고",
    location: "EXP-PALLET-01",
    lotNo: "LOT20260816-P01",
    currentStock: 0,
    availableStock: 0,
    allocatedStock: 0,
    safetyStock: 300,
    unit: "EA",
    status: "품절",
    projectNo: "PRJ-A2XT-02",
    vendorName: "(주)한국정밀사출",
    lastUpdated: "2026-08-19 18:00",
  },
];

export default function MaterialInventoryPage() {
  // 필터 상태
  const [filterWarehouse, setFilterWarehouse] = useState("ALL");
  const [filterItemType, setFilterItemType] = useState("ALL");
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterProjectNo, setFilterProjectNo] = useState("");

  // 데이터 & 모달 상태
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>(initialInventoryData);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // 재고 이동 폼 상태
  const [targetWarehouse, setTargetWarehouse] = useState("WH-NM-01");
  const [transferQty, setTransferQty] = useState<number>(0);
  const [transferReason, setTransferReason] = useState("");

  // 필터링 처리
  const filteredData = useMemo(() => {
    return inventoryList.filter((item) => {
      const matchWH = filterWarehouse === "ALL" || item.warehouseCode === filterWarehouse;
      const matchType = filterItemType === "ALL" || item.itemType === filterItemType;
      const matchKeyword =
        !filterKeyword ||
        item.itemCode.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        item.itemName.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        item.lotNo.toLowerCase().includes(filterKeyword.toLowerCase());
      const matchProject =
        !filterProjectNo || item.projectNo.toLowerCase().includes(filterProjectNo.toLowerCase());

      return matchWH && matchType && matchKeyword && matchProject;
    });
  }, [inventoryList, filterWarehouse, filterItemType, filterKeyword, filterProjectNo]);

  // 재고 요약 집계
  const stats = useMemo(() => {
    const totalCurrent = filteredData.reduce((acc, curr) => acc + curr.currentStock, 0);
    const shortCount = filteredData.filter((i) => i.status === "부족" || i.status === "품절").length;
    const resinStock = filteredData
      .filter((i) => i.itemType === "원재료(레진)")
      .reduce((acc, curr) => acc + curr.currentStock, 0);
    const prdStock = filteredData
      .filter((i) => i.itemType === "완제품")
      .reduce((acc, curr) => acc + curr.currentStock, 0);

    return {
      totalItems: filteredData.length,
      totalCurrent,
      shortCount,
      resinStock,
      prdStock,
    };
  }, [filteredData]);

  const handleResetFilters = () => {
    setFilterWarehouse("ALL");
    setFilterItemType("ALL");
    setFilterKeyword("");
    setFilterProjectNo("");
  };

  // 재고 이동 모달 오픈
  const handleOpenTransfer = (item: InventoryItem) => {
    setSelectedItem(item);
    setTransferQty(1);
    setTransferReason("양산 공정 투입을 위한 위탁 이동");
    setIsTransferModalOpen(true);
  };

  // 재고 이동 실행
  const handleExecuteTransfer = () => {
    if (!selectedItem) return;

    if (transferQty <= 0 || transferQty > selectedItem.availableStock) {
      alert(`이동 가능 수량(최대 ${selectedItem.availableStock} ${selectedItem.unit})을 올바르게 입력해주세요.`);
      return;
    }

    if (selectedItem.warehouseCode === targetWarehouse) {
      alert("출고 창고와 입고 창고가 동일합니다.");
      return;
    }

    const warehouseNames: Record<string, string> = {
      "WH-MPSI-01": "MPSI 원재료 창고동",
      "WH-MPSI-02": "MPSI 포장/출하창고",
      "WH-MPSI-03": "MPSI 완제품/선적대기 창고",
      "WH-NM-01": "뉴몰드 현장 사출창고",
      "WH-NM-02": "뉴몰드 완제품 출하창고",
      "WH-WS-01": "우성정공 금형/시사출센터",
    };

    if (
      confirm(
        `[창고 간 재고 이동 승인]\n` +
          `품목: ${selectedItem.itemName}\n` +
          `수량: ${transferQty} ${selectedItem.unit}\n` +
          `출고: ${selectedItem.warehouseName} ➔ 입고: ${warehouseNames[targetWarehouse]}\n` +
          `진행하시겠습니까?`
      )
    ) {
      const now = new Date();
      const updatedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
        now.getDate()
      ).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      setInventoryList((prev) =>
        prev.map((row) => {
          if (row.id === selectedItem.id) {
            const nextStock = row.currentStock - transferQty;
            const nextAvail = row.availableStock - transferQty;
            return {
              ...row,
              currentStock: nextStock,
              availableStock: nextAvail,
              status: nextStock === 0 ? "품절" : nextStock < row.safetyStock ? "부족" : "정상",
              lastUpdated: updatedDate,
            };
          }
          return row;
        })
      );

      alert("창고 간 재고 이동 및 수불 이력이 성공적으로 등록되었습니다.");
      setIsTransferModalOpen(false);
      setSelectedItem(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 1. 요약 KPI 위젯 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">관리 품목 수</span>
            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{stats.totalItems} 품목</span>
          </div>
          <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600">
            <Package className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">원재료(레진) 총 재고</span>
            <span className="text-lg font-bold text-sky-600">{stats.resinStock.toLocaleString()} kg</span>
          </div>
          <div className="p-2 bg-sky-50 dark:bg-sky-950/40 rounded-lg text-sky-600">
            <Layers className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">완제품 보관 재고</span>
            <span className="text-lg font-bold text-emerald-600">{stats.prdStock.toLocaleString()} EA</span>
          </div>
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600">
            <Warehouse className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">안전재고 미달/품절</span>
            <span className={`text-lg font-bold ${stats.shortCount > 0 ? "text-rose-600 animate-pulse" : "text-zinc-900 dark:text-zinc-100"}`}>
              {stats.shortCount} 건
            </span>
          </div>
          <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded-lg text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 2. 상단 필터 바 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex flex-col gap-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-zinc-600 dark:text-zinc-400 font-medium">보관 거점 창고</label>
            <select
              value={filterWarehouse}
              onChange={(e) => setFilterWarehouse(e.target.value)}
              className="h-7 rounded-md border bg-transparent px-2 text-xs"
            >
              <option value="ALL">전체 거점 창고</option>
              <option value="WH-MPSI-01">MPSI 원재료 창고동</option>
              <option value="WH-MPSI-02">MPSI 포장/출하창고</option>
              <option value="WH-MPSI-03">MPSI 완제품/선적대기 창고</option>
              <option value="WH-NM-01">뉴몰드 현장 사출창고 (위탁)</option>
              <option value="WH-NM-02">뉴몰드 완제품 출하창고</option>
              <option value="WH-WS-01">우성정공 금형/시사출센터</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-zinc-600 dark:text-zinc-400 font-medium">품목 구분</label>
            <select
              value={filterItemType}
              onChange={(e) => setFilterItemType(e.target.value)}
              className="h-7 rounded-md border bg-transparent px-2 text-xs"
            >
              <option value="ALL">전체 구분</option>
              <option value="원재료(레진)">원재료(레진)</option>
              <option value="부자재">부자재 (박스/부품)</option>
              <option value="반제품(재공)">반제품(재공/시사출)</option>
              <option value="완제품">완제품</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-zinc-600 dark:text-zinc-400 font-medium">프로젝트 관리번호</label>
            <Input
              value={filterProjectNo}
              onChange={(e) => setFilterProjectNo(e.target.value)}
              placeholder="예: PRJ-NT5-01"
              className="h-7 text-xs"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-zinc-600 dark:text-zinc-400 font-medium">검색어 (품목명/LOT/코드)</label>
            <Input
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              placeholder="품목명, 코드, LOT 번호"
              className="h-7 text-xs"
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-1.5 border-t border-zinc-100 dark:border-zinc-800">
          <div className="text-zinc-500 text-[11px]">
            검색 결과: <b className="text-zinc-800 dark:text-zinc-200">{filteredData.length}</b>개 항목
          </div>
          <div className="flex gap-1.5">
            <Button
              onClick={handleResetFilters}
              variant="outline"
              className="h-7 px-3 gap-1 text-xs text-zinc-600 hover:text-zinc-900"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              초기화
            </Button>
            <Button
              onClick={() => alert("현재 재고 리스트 엑셀 다운로드를 시작합니다.")}
              variant="outline"
              className="h-7 px-3 gap-1 text-xs text-zinc-600 hover:text-zinc-900"
            >
              <Download className="h-3.5 w-3.5" />
              Excel 출력
            </Button>
          </div>
        </div>
      </div>

      {/* 3. 재고 그리드 테이블 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs overflow-hidden flex flex-col min-h-[460px]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border-b">
          <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-100">
            <Warehouse className="h-4 w-4 text-sky-600" />
            <span>거점 창고별 재고 대장</span>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full border-collapse text-left whitespace-nowrap text-xs">
            <thead className="sticky top-0 bg-[#2d3748] text-white text-[11px] z-10">
              <tr>
                <th className="p-1.5 w-8 text-center border-r border-slate-600">No</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[130px]">창고명 / 로케이션</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px]">품목구분</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px]">품목코드</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[180px]">품명 및 규격</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[110px]">프로젝트번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[120px]">LOT 번호</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[80px] text-right">현재고</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[80px] text-right">가용재고</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[70px] text-right">할당량</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[70px] text-right">안전재고</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[50px] text-center">단위</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[70px] text-center">상태</th>
                <th className="p-1.5 border-r border-slate-600 min-w-[90px]">공급/위탁처</th>
                <th className="p-1.5 min-w-[100px] text-center">재고작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={15} className="text-center py-10 text-zinc-400">
                    일치하는 재고 내역이 존재하지 않습니다.
                  </td>
                </tr>
              ) : (
                filteredData.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="hover:bg-sky-50/70 dark:hover:bg-zinc-800/60 transition-colors odd:bg-white even:bg-zinc-50/50 dark:odd:bg-zinc-900 dark:even:bg-zinc-900/50"
                  >
                    <td className="p-1.5 text-center font-mono text-zinc-500 border-r">{idx + 1}</td>
                    <td className="p-1.5 border-r">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">{row.warehouseName}</div>
                      <div className="text-[10px] text-zinc-400 font-mono">Loc: {row.location}</div>
                    </td>
                    <td className="p-1.5 border-r">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          row.itemType === "원재료(레진)"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                            : row.itemType === "완제품"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : row.itemType === "반제품(재공)"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {row.itemType}
                      </span>
                    </td>
                    <td className="p-1.5 border-r font-mono font-medium text-sky-600">{row.itemCode}</td>
                    <td className="p-1.5 border-r font-medium text-zinc-800 dark:text-zinc-200">{row.itemName}</td>
                    <td className="p-1.5 border-r font-mono text-[11px]">{row.projectNo}</td>
                    <td className="p-1.5 border-r font-mono text-[11px] text-zinc-500">{row.lotNo}</td>
                    
                    {/* 수량 정보 */}
                    <td className="p-1.5 border-r text-right font-bold text-zinc-900 dark:text-zinc-100">
                      {row.currentStock.toLocaleString()}
                    </td>
                    <td className="p-1.5 border-r text-right font-semibold text-emerald-600">
                      {row.availableStock.toLocaleString()}
                    </td>
                    <td className="p-1.5 border-r text-right font-mono text-zinc-400">
                      {row.allocatedStock.toLocaleString()}
                    </td>
                    <td className="p-1.5 border-r text-right font-mono text-zinc-500">
                      {row.safetyStock.toLocaleString()}
                    </td>
                    <td className="p-1.5 border-r text-center font-mono text-zinc-500">{row.unit}</td>

                    {/* 상태 판정 태그 */}
                    <td className="p-1.5 border-r text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.status === "정상"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                            : row.status === "부족"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 animate-pulse"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>

                    <td className="p-1.5 border-r text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border">
                        {row.vendorName}
                      </span>
                    </td>

                    {/* 액션 버튼 */}
                    <td className="p-1.5 text-center">
                      <Button
                        onClick={() => handleOpenTransfer(row)}
                        disabled={row.availableStock <= 0}
                        variant="outline"
                        size="xs"
                        className="h-6 px-2 text-[11px] gap-1 bg-white hover:bg-zinc-100 dark:bg-zinc-800"
                      >
                        <ArrowRightLeft className="h-3 w-3 text-sky-600" />
                        이동/불출
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. 창고 간 재고 이동 모달 */}
      {isTransferModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-lg shadow-xl border overflow-hidden flex flex-col">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 text-white">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-sky-400" />
                <h3 className="font-bold text-xs">창고 간 재고 이동 및 위탁 불출</h3>
              </div>
              <button onClick={() => setIsTransferModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 품목 요약 */}
            <div className="p-4 flex flex-col gap-3">
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded border text-[11px] flex flex-col gap-1">
                <div>
                  <span className="text-zinc-500">대상 품목:</span> <b>{selectedItem.itemName}</b> ({selectedItem.itemCode})
                </div>
                <div>
                  <span className="text-zinc-500">현재 창고:</span> <b>{selectedItem.warehouseName}</b> ({selectedItem.location})
                </div>
                <div>
                  <span className="text-zinc-500">가용 재고:</span>{" "}
                  <b className="text-emerald-600">
                    {selectedItem.availableStock.toLocaleString()} {selectedItem.unit}
                  </b>
                </div>
              </div>

              {/* 이동 대상 창고 선택 */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">입고(목적지) 창고</label>
                <select
                  value={targetWarehouse}
                  onChange={(e) => setTargetWarehouse(e.target.value)}
                  className="h-8 rounded-md border bg-transparent px-2 text-xs"
                >
                  <option value="WH-NM-01">뉴몰드 현장 사출창고 (사출양산 투입)</option>
                  <option value="WH-MPSI-01">MPSI 원재료 창고동</option>
                  <option value="WH-MPSI-02">MPSI 포장/출하창고</option>
                  <option value="WH-MPSI-03">MPSI 완제품/선적대기 창고</option>
                  <option value="WH-WS-01">우성정공 시사출센터 (시사출 레진지원)</option>
                </select>
              </div>

              {/* 이동 수량 입력 */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                  이동 수량 ({selectedItem.unit}) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  max={selectedItem.availableStock}
                  value={transferQty}
                  onChange={(e) => setTransferQty(Number(e.target.value))}
                  className="h-8 text-xs font-mono"
                />
              </div>

              {/* 이동 사유 입력 */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">이동 사유 / 작업 지시</label>
                <Input
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="예: 뉴몰드 양산 PO-2026-08호 생산 투입용"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* 모달 푸터 액션 */}
            <div className="flex items-center justify-end gap-2 p-3 bg-zinc-50 dark:bg-zinc-800 border-t">
              <Button onClick={() => setIsTransferModalOpen(false)} variant="outline" className="h-8 px-3 text-xs">
                취소
              </Button>
              <Button
                onClick={handleExecuteTransfer}
                className="h-8 px-3.5 text-xs bg-sky-600 hover:bg-sky-700 text-white gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                이동 승인 및 처리
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
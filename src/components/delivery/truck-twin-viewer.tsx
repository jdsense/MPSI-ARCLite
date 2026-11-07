"use client";

import React, { useEffect, useRef, useState } from "react";
import { ExternalLink, RotateCcw, Box, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DeliveryItem } from "@/types/delivery";

/**
 * 소프트러시(SoftRush) 노코드 공유 모듈 연동 컴포넌트 (truck-twin v1.0.0)
 * - 호스팅 경로: /truck-twin/1.0.0/truck-twin.min.js
 * - 데모 확인 경로: /truck-twin/1.0.0/demo/index.html
 * ※ 과제 종료 시 본 파일 및 src/app/truck-twin 폴더를 삭제하면 됩니다.
 */

const SOFTRUSH_DEMO_KEY =
  "tt1.eyJ2IjoxLCJuYW1lIjoi7Zi47Iqk7YyFIO2ZleyduOyaqSDthYzsiqTtirgg7YKkICh0cnVjay10d2luIDEuMC4wKSIsIm9yaWdpbnMiOlsiKiJdLCJpYXQiOjE3OTM1OTk0NDksImV4cCI6MTc5NjE5MTQ0OX0.9IBwZgElt_iaVYd3PeqwZvfJ9HUYUS3J_2k4by86k_x_0I4YBDR0iKIUsCF3Pv5MxGvELBgBNKTURNPwr5RYAA";

const TRUCK_TWIN_SCRIPT_URL = `/truck-twin/1.0.0/truck-twin.min.js?key=${encodeURIComponent(SOFTRUSH_DEMO_KEY)}`;

interface CargoItem {
  id: string;
  code: string;
  name: string;
  spec: string;
  qty: number;
  zone: "front" | "rear";
}

interface TruckTwinInstance {
  destroy?: () => void;
  resetCamera?: () => void;
  setTheme?: (theme: "dark" | "light") => void;
  setCargo?: (cargo: CargoItem[]) => void;
  selectById?: (id: string | null) => void;
}

declare global {
  interface Window {
    TruckTwin?: {
      version?: string;
      create: (
        container: HTMLElement,
        options: {
          truck: {
            code: string;
            type: string;
            maxWeight: number;
            maxVolume: number;
            innerWidth: number;
            innerLength: number;
            innerHeight: number;
          };
          cargo: CargoItem[];
          theme?: "dark" | "light";
          onSelect?: (item: CargoItem | null) => void;
          onHover?: (item: CargoItem | null) => void;
          onFail?: (reason: string) => void;
        }
      ) => TruckTwinInstance | null;
    };
  }
}

function buildCargoForDelivery(delivery?: DeliveryItem | null): CargoItem[] {
  if (!delivery) {
    return [
      { id: "c1", code: "84710-NT500-LH", name: "Front Door Upper Cover (1차 팔레트)", spec: "1100*1100*950", qty: 250, zone: "front" },
      { id: "c2", code: "84710-NT500-RH", name: "Front Door Upper Cover (2차 팔레트)", spec: "1100*1100*950", qty: 250, zone: "front" },
      { id: "c3", code: "82710-AA000", name: "Door Armrest Base (완충 박스)", spec: "1100*900*750", qty: 180, zone: "rear" },
      { id: "c4", code: "86350-K7000", name: "Radiator Lower Grille", spec: "1200*1000*850", qty: 120, zone: "rear" },
    ];
  }

  const frontQty = Math.ceil(delivery.qty * 0.6);
  const rearQty = Math.max(delivery.qty - frontQty, 50);

  return [
    {
      id: `${delivery.id}-f1`,
      code: `${delivery.partNo}-A`,
      name: `${delivery.productName} (앞칸 주적재 팔레트 #1)`,
      spec: "1100*1100*950",
      qty: Math.ceil(frontQty / 2),
      zone: "front",
    },
    {
      id: `${delivery.id}-f2`,
      code: `${delivery.partNo}-B`,
      name: `${delivery.productName} (앞칸 주적재 팔레트 #2)`,
      spec: "1100*1100*950",
      qty: Math.floor(frontQty / 2) || 50,
      zone: "front",
    },
    {
      id: `${delivery.id}-r1`,
      code: `${delivery.partNo}-C`,
      name: `${delivery.productName} (뒤칸 하차대기 박스)`,
      spec: "1100*900*800",
      qty: rearQty,
      zone: "rear",
    },
  ];
}

export function TruckTwinViewer({ delivery }: { delivery?: DeliveryItem | null }) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<TruckTwinInstance | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedCargo, setSelectedCargo] = useState<CargoItem | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    let cancelled = false;

    const initViewer = () => {
      if (cancelled || !stageRef.current || !window.TruckTwin) return;
      try {
        instanceRef.current?.destroy?.();
      } catch {
        // ignore cleanup error
      }
      stageRef.current.innerHTML = "";

      const cargoList = buildCargoForDelivery(delivery);
      const is5Ton = delivery?.vehicleType?.includes("5톤");
      const is1Ton = delivery?.vehicleType?.includes("1톤");

      const inst = window.TruckTwin.create(stageRef.current, {
        truck: {
          code: delivery?.vehicleNo || "88바1234",
          type: delivery?.vehicleType || "11톤 윙바디",
          maxWeight: is1Ton ? 1000 : is5Ton ? 5000 : 11000,
          maxVolume: is1Ton ? 8 : is5Ton ? 30 : 55,
          innerWidth: is1Ton ? 160 : is5Ton ? 230 : 240,
          innerLength: is1Ton ? 280 : is5Ton ? 620 : 960,
          innerHeight: is1Ton ? 170 : is5Ton ? 230 : 250,
        },
        cargo: cargoList,
        theme,
        onSelect: (item) => setSelectedCargo(item),
        onFail: (reason) => {
          setStatus("error");
          setErrorMsg(`라이선스/초기화 실패: ${reason}`);
        },
      });

      if (inst) {
        instanceRef.current = inst;
        setStatus("ready");
      }
    };

    if (window.TruckTwin) {
      initViewer();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-softrush-truck-twin="1.0.0"]'
      );
      if (existing) {
        existing.addEventListener("load", initViewer);
      } else {
        const script = document.createElement("script");
        script.src = TRUCK_TWIN_SCRIPT_URL;
        script.async = true;
        script.dataset.softrushTruckTwin = "1.0.0";
        script.onload = initViewer;
        script.onerror = () => {
          if (!cancelled) {
            setStatus("error");
            setErrorMsg("/truck-twin/1.0.0/truck-twin.min.js 스크립트 로드에 실패했습니다.");
          }
        };
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      try {
        instanceRef.current?.destroy?.();
        instanceRef.current = null;
      } catch {
        // ignore
      }
    };
  }, [delivery, theme]);

  return (
    <div className="flex flex-col gap-2.5">
      {/* 상단 컨트롤 바 */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 text-slate-100 px-3 py-2 rounded-lg border border-slate-700">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
            <Truck className="h-3 w-3" />
            SoftRush TruckTwin v1.0.0
          </span>
          <span className="text-[11px] text-slate-300">
            드래그: 3D 회전 · 휠: 확대/축소 · 적재 상자 클릭: 패킹 제원 확인
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => instanceRef.current?.resetCamera?.()}
            className="h-6 px-2 text-[10px] bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 cursor-pointer gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            시점 초기화
          </Button>
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            className="h-6 px-2 text-[10px] bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 cursor-pointer"
          >
            {theme === "dark" ? "라이트 배경" : "다크 배경"}
          </Button>
          <a
            href="/truck-twin/1.0.0/demo/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 h-6 px-2 rounded border border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 text-[10px] font-bold"
          >
            <span>호스팅 원본 데모 열기</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      </div>

      {/* 3D 스테이지 */}
      <div className="relative w-full h-[340px] rounded-lg overflow-hidden border border-slate-700 bg-slate-950">
        <div ref={stageRef} className="w-full h-full" />
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 text-slate-300 text-xs">
            3D 트럭 디지털 트윈 라이브러리(/truck-twin/1.0.0/truck-twin.min.js) 로딩 중...
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-rose-950/80 text-rose-200 text-xs p-4 text-center">
            {errorMsg}
          </div>
        )}
      </div>

      {/* 선택된 적재 상자 정보 표시 */}
      <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2">
          <Box className="h-4 w-4 text-sky-600 shrink-0" />
          {selectedCargo ? (
            <div>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                [{selectedCargo.zone === "front" ? "앞칸 적재" : "뒤칸 적재"}] {selectedCargo.name}
              </span>
              <span className="ml-2 font-mono text-zinc-500">
                품번: {selectedCargo.code} | 규격: {selectedCargo.spec}mm | 수량: {selectedCargo.qty.toLocaleString()} EA
              </span>
            </div>
          ) : (
            <span className="text-zinc-500">
              3D 트럭 적재함 내부의 팔레트/박스를 클릭하면 해당 패킹의 상세 품번·규격·수량이 표시됩니다.
            </span>
          )}
        </div>
        <span className="font-mono text-[10px] text-zinc-400 shrink-0">
          /truck-twin/1.0.0/truck-twin.min.js
        </span>
      </div>
    </div>
  );
}

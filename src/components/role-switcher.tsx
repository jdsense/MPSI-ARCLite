"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuthRole } from "@/lib/role-store";
import { Building2, Wrench, Factory, Shield, ChevronDown, CheckCircle2 } from "lucide-react";

export function RoleSwitcher() {
  const router = useRouter();
  const { role, vendorName, nodeConfig, switchRole } = useAuthRole();

  // 1. 독립 외주 설치 인스턴스 (우성정공/뉴몰드)로 배포된 경우 -> 역할 전환 차단 및 전용 배지 노출
  if (nodeConfig.isStandalone) {
    const isMold = nodeConfig.nodeType === "VENDOR_MOLD";
    return (
      <div className="w-full flex flex-col gap-1 p-2 bg-zinc-100/90 dark:bg-zinc-800/80 rounded-md border text-[11px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 truncate">
            {isMold ? (
              <Wrench className="h-3.5 w-3.5 text-purple-600 shrink-0" />
            ) : (
              <Factory className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            )}
            <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {nodeConfig.nodeName}
            </span>
          </div>
          <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
            isMold 
              ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
          } shrink-0`}>
            {isMold ? "금형 독립노드" : "양산 독립노드"}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          <span>로컬 독립 DB 연동 완료 (MPSI 연계 대기)</span>
        </div>
      </div>
    );
  }

  // 2. MPSI 본사 Hub 인스턴스로 배포된 경우 -> 본사 관제 및 외부 협력사 포털 접속 시연 가능
  const currentKey = 
    role === "MPSI" 
      ? "MPSI"
      : role === "ADMIN"
      ? "ADMIN"
      : `${role}:${vendorName}`;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "ADMIN") {
      switchRole("ADMIN");
      router.push("/portal/project");
    } else if (val === "MPSI") {
      switchRole("MPSI");
      router.push("/portal/project");
    } else if (val.startsWith("VENDOR_MOLD:")) {
      const vName = val.split(":")[1];
      switchRole("VENDOR_MOLD", vName);
      router.push("/portal/vendor-portal/mold/projects");
    } else if (val.startsWith("VENDOR_MASS:")) {
      const vName = val.split(":")[1];
      switchRole("VENDOR_MASS", vName);
      router.push("/portal/vendor-portal/mass/projects");
    }
  };

  return (
    <div className="relative w-full flex flex-col gap-1.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-bold text-sky-700 dark:text-sky-400">
          🏢 MPSI 통합 관제 허브
        </span>
        <span className="text-[9px] text-zinc-500">
          (4대 권한 전환)
        </span>
      </div>

      <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md border text-[11px]">
        {role === "ADMIN" && <Shield className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
        {role === "MPSI" && <Building2 className="h-3.5 w-3.5 text-sky-600 shrink-0" />}
        {role === "VENDOR_MOLD" && <Wrench className="h-3.5 w-3.5 text-purple-600 shrink-0" />}
        {role === "VENDOR_MASS" && <Factory className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
        
        <select
          value={currentKey}
          onChange={handleChange}
          className="w-full bg-transparent font-bold text-zinc-800 dark:text-zinc-100 cursor-pointer focus:outline-hidden appearance-none pr-4 truncate text-[11px]"
          title="작업 권한 및 소속 유형 전환"
        >
          <option value="ADMIN">🛡️ 시스템 관리자 (통합 제어 & 전 권한)</option>
          <option value="MPSI">🏢 MPSI 본사 (총괄 관제)</option>
          <option value="VENDOR_MOLD:우성정공(주)">⚙️ 금형 협력사 (우성정공)</option>
          <option value="VENDOR_MASS:(주)뉴몰드">🏭 양산 협력사 (뉴몰드)</option>
        </select>
        <ChevronDown className="h-3 w-3 text-zinc-400 absolute right-2 pointer-events-none" />
      </div>
    </div>
  );
}

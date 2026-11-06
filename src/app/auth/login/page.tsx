// src/app/auth/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  Building2, 
  ShieldCheck, 
  Wrench, 
  Factory, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle2, 
  Layers,
  Sparkles
} from "lucide-react";
import { saveRoleSession, RoleType } from "@/lib/role-store";
import { findUserByLoginId, useUserAccountStore } from "@/lib/user-store";
import { verifyPassword, DEFAULT_INITIAL_PASSWORD } from "@/lib/auth-crypto";

type TabRole = "mpsi" | "admin" | "mold" | "mass";

interface RoleCardMeta {
  key: TabRole;
  label: string;
  sub: string;
  icon: typeof Building2;
  role: RoleType;
  defaultId: string;
  defaultVendor: string;
  badge: string;
  description: string;
}

const ROLE_METAS: RoleCardMeta[] = [
  {
    key: "mpsi",
    label: "MPSI 본사",
    sub: "HQ Platform",
    icon: Building2,
    role: "MPSI",
    defaultId: "mpsi",
    defaultVendor: "MPSI 본사",
    badge: "총괄 관제",
    description: "프로젝트 마스터, 원청 견적 및 외주 공급망 통합 모니터링",
  },
  {
    key: "admin",
    label: "시스템 관리국",
    sub: "Super Admin",
    icon: ShieldCheck,
    role: "ADMIN",
    defaultId: "admin",
    defaultVendor: "시스템관리국",
    badge: "최고 관리자",
    description: "계정·권한 매트릭스 제어 및 전체 외주 포털 통합 관제",
  },
  {
    key: "mold",
    label: "금형 협력사",
    sub: "Mold Vendor",
    icon: Wrench,
    role: "VENDOR_MOLD",
    defaultId: "woosung",
    defaultVendor: "우성정공(주)",
    badge: "금형 제작처",
    description: "견적 제출, 3D설계/검토, 금형 제작 및 시사출 T1 일정 관리",
  },
  {
    key: "mass",
    label: "양산 협력사",
    sub: "Mass Vendor",
    icon: Factory,
    role: "VENDOR_MASS",
    defaultId: "newmold",
    defaultVendor: "(주)뉴몰드",
    badge: "사출 양산처",
    description: "사출 양산성 검증, 시양산 생산, 설계변경 PM 및 PPAP 승인",
  },
];

export default function LoginPage() {
  const router = useRouter();
  useUserAccountStore(); // 로그인 페이지 진입 시 DB 계정 동기화
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabRole>("mpsi");

  // 각 탭별 로그인 ID / 비밀번호 상태
  const [credentials, setCredentials] = useState<Record<TabRole, { id: string; pass: string }>>({
    mpsi: { id: "mpsi", pass: DEFAULT_INITIAL_PASSWORD },
    admin: { id: "admin", pass: DEFAULT_INITIAL_PASSWORD },
    mold: { id: "woosung", pass: DEFAULT_INITIAL_PASSWORD },
    mass: { id: "newmold", pass: DEFAULT_INITIAL_PASSWORD },
  });

  const [showPass, setShowPass] = useState(false);

  const currentMeta = ROLE_METAS.find((m) => m.key === activeTab) || ROLE_METAS[0];
  const currentCred = credentials[activeTab];

  const updateCred = (field: "id" | "pass", val: string) => {
    setCredentials((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [field]: val,
      },
    }));
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    const trimmedId = currentCred.id.trim();
    const account = findUserByLoginId(trimmedId);

    // 계정이 존재하는 경우 단방향 암호화 해시 검증
    if (account && account.passwordHash) {
      const isMatch = await verifyPassword(currentCred.pass, account.passwordHash);
      if (!isMatch) {
        alert("비밀번호가 일치하지 않습니다. 다시 확인해주세요.\n(초기 표준 비밀번호: Mpsi2026!@)");
        setLoading(false);
        return;
      }
    }

    const role: RoleType = account ? account.roleId : currentMeta.role;
    const vendorName =
      account?.vendorName ||
      currentMeta.defaultVendor ||
      (role === "MPSI" ? "MPSI 본사" : role === "ADMIN" ? "시스템관리국" : "협력사");
    const userName =
      account?.userName ||
      (role === "MPSI"
        ? "관리자"
        : role === "ADMIN"
        ? "시스템 최고관리자"
        : role === "VENDOR_MOLD"
        ? "배희섭 금형팀장"
        : "뉴몰드");
    const userTitle =
      account?.department ||
      (role === "MPSI"
        ? "MPSI 총괄 관제"
        : role === "ADMIN"
        ? "SCM / 통합제어"
        : role === "VENDOR_MOLD"
        ? "우성정공(주) 기술개발팀"
        : "(주)뉴몰드 사출품질팀");

    const session = {
      role,
      vendorName,
      userName,
      userTitle,
    };
    saveRoleSession(session);

    setTimeout(() => {
      if (role === "VENDOR_MOLD") {
        router.push("/portal/vendor-portal/mold/projects");
      } else if (role === "VENDOR_MASS") {
        router.push("/portal/vendor-portal/mass/projects");
      } else {
        router.push("/portal/project");
      }
      setLoading(false);
    }, 300);
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#070e1e] p-4 sm:p-6 lg:p-10 text-white selection:bg-blue-500 selection:text-white">
      {/* 배경 장식 그라디언트 & 네온 원형 블러 */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-blue-600/20 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[540px] w-[540px] rounded-full bg-indigo-600/25 blur-[140px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[680px] w-[680px] rounded-full bg-sky-500/10 blur-[160px]" />

      {/* 메인 2단 스플릿 컨테이너 (스크린샷 비주얼 구조 차용 + 푸른 톤 모던 테크 디자인) */}
      <div className="relative z-10 flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-blue-500/25 bg-[#0a152e]/80 shadow-[0_25px_70px_rgba(3,10,28,0.85)] backdrop-blur-xl md:flex-row min-h-[620px]">
        
        {/* [좌측 브랜딩 패널: 푸른 톤 그라디언트 + 기하학 요소 + 로고 & 타이틀] */}
        <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#12285a] via-[#0d1d42] to-[#081228] p-8 sm:p-10 md:w-5/12 border-b md:border-b-0 md:border-r border-blue-500/20">
          {/* 장식용 추상 그래픽 원 & 대각선 라인 (전달해주신 스크린샷 모티브) */}
          <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full border border-sky-400/25 bg-sky-400/10" />
          <div className="pointer-events-none absolute top-20 right-10 h-6 w-6 rounded-full border border-blue-300/30" />
          <div className="pointer-events-none absolute bottom-16 left-6 h-12 w-12 rounded-full border border-indigo-400/20 bg-indigo-500/10" />
          <div className="pointer-events-none absolute -bottom-10 right-20 h-36 w-36 rounded-full bg-blue-500/15 blur-2xl" />
          {/* 대각선 라인 */}
          <div className="pointer-events-none absolute top-1/3 -left-10 h-0.5 w-48 -rotate-45 bg-gradient-to-r from-transparent via-sky-400/30 to-transparent" />
          <div className="pointer-events-none absolute top-1/2 -left-6 h-0.5 w-64 -rotate-45 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent" />

          {/* 상단: 로고 영역 */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-11 items-center justify-center rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-md border border-white/15 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/api/v1/assets/logo"
                alt="ARCFORGE LOGO"
                className="h-7 w-auto object-contain filter drop-shadow"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black tracking-widest text-sky-400 uppercase">
                Enterprise SCM
              </span>
              <span className="text-[10px] text-blue-200/70 font-mono">
                v2.6 Cloud Connected
              </span>
            </div>
          </div>

          {/* 중앙: 메인 웰컴 카피 & 타이틀 */}
          <div className="relative z-10 my-8 space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/15 px-3 py-1 text-[11px] font-bold text-sky-300">
              <Sparkles className="h-3 w-3 text-sky-300" />
              <span>통합 금형·양산 관제 솔루션</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl leading-tight">
              ARCFORGE
              <br />
              <span className="bg-gradient-to-r from-sky-400 via-blue-300 to-indigo-300 bg-clip-text text-transparent">
                Platform
              </span>
            </h1>
            <p className="text-xs text-blue-200/80 leading-relaxed max-w-sm pt-1">
              MPSI 본사와 외주 협력사 간의 견적·설계·금형제작·사출양산 전 공정을
              실시간 데이터로 연결하는 단일 통합 포털에 오신 것을 환영합니다.
            </p>
          </div>

          {/* 하단: 보안 인증 상태 배지 */}
          <div className="relative z-10 pt-4 border-t border-blue-400/15 flex items-center justify-between text-[11px] text-blue-300/70 font-mono">
            <span className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-emerald-400" />
              SHA-256 Auth Shield
            </span>
            <span className="text-[10px] text-sky-400/90 font-bold">
              Active Security
            </span>
          </div>
        </div>

        {/* [우측 로그인 인터랙션 패널: 푸른 테크 카드 + 4대 역할 탭 + 폼] */}
        <div className="flex flex-1 flex-col justify-between p-8 sm:p-10 md:p-12 bg-[#0c1836]/90">
          
          <div>
            {/* 상단 서브 헤더 */}
            <div className="flex items-center justify-between pb-6 border-b border-blue-900/60">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-sky-400">
                  Account Sign In
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-white mt-0.5">
                  시스템 로그인
                </h2>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800 text-[11px] font-mono text-sky-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                LOGIN
              </div>
            </div>

            {/* 4대 권한 역할 선택 탭 (MPSI / 관리자 / 금형협력사 / 양산협력사) */}
            <div className="mt-6">
              <label className="text-[11px] font-bold text-blue-200/80 mb-2 block">
                접속 소속 및 작업 권한 선택
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ROLE_METAS.map((m) => {
                  const Icon = m.icon;
                  const isSelected = activeTab === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setActiveTab(m.key)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? "bg-gradient-to-b from-blue-600 to-sky-600 border-sky-400 text-white shadow-lg shadow-blue-500/25 scale-[1.02]"
                          : "bg-[#09132a] border-blue-900/60 text-blue-200/70 hover:bg-[#11234a] hover:text-white hover:border-blue-700"
                      }`}
                    >
                      <Icon className={`h-4 w-4 mb-1 ${isSelected ? "text-white" : "text-sky-400"}`} />
                      <span className="text-xs font-bold leading-tight truncate w-full">
                        {m.label}
                      </span>
                      <span className={`text-[10px] mt-0.5 font-mono ${isSelected ? "text-blue-100" : "text-zinc-400"}`}>
                        {m.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 활성 권한 안내 박스 */}
            <div className="mt-4 p-3 rounded-xl bg-blue-950/60 border border-blue-800/60 text-xs flex items-start gap-2.5">
              <currentMeta.icon className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-xs">
                    {currentMeta.label} ({currentMeta.sub})
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-400/40">
                    {currentMeta.defaultVendor}
                  </span>
                </div>
                <p className="text-[11px] text-blue-200/70 mt-0.5 leading-snug">
                  {currentMeta.description}
                </p>
              </div>
            </div>

            {/* 로그인 폼 */}
            <form onSubmit={handleLogin} className="mt-5 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-blue-200/90 mb-1">
                  계정 ID (로그인ID)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={currentCred.id}
                    onChange={(e) => updateCred("id", e.target.value)}
                    placeholder="로그인 ID 입력"
                    required
                    className="w-full rounded-xl bg-[#060c1d] border border-blue-800/80 px-3.5 py-2.5 text-xs text-white font-mono placeholder:text-zinc-600 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 transition-all"
                  />
                  {/* <span className="absolute right-3 top-2.5 text-[10px] text-zinc-500 font-mono">
                    기본: {currentMeta.defaultId}
                  </span> */}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-blue-200/90">
                    비밀번호 (암호화 검증)
                  </label>
                  {/* <span className="text-[10px] font-mono text-zinc-400">
                    기본: {DEFAULT_INITIAL_PASSWORD}
                  </span> */}
                </div>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={currentCred.pass}
                    onChange={(e) => updateCred("pass", e.target.value)}
                    placeholder="비밀번호 입력"
                    required
                    className="w-full rounded-xl bg-[#060c1d] border border-blue-800/80 px-3.5 py-2.5 text-xs text-white font-mono pr-10 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-sky-300 transition-colors cursor-pointer"
                    title={showPass ? "비밀번호 숨김" : "비밀번호 표시"}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-blue-500/30 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? (
                  <span>로그인 인증 중...</span>
                ) : (
                  <>
                    <span>{currentMeta.label} 계정으로 접속하기</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* 하단 푸터 안내문 */}
          <div className="pt-6 border-t border-blue-900/60 mt-6 text-center">
            <p className="text-[11px] text-blue-300/60 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>ARCFORGE 엔터프라이즈 보안 인증 기준을 준수합니다.</span>
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}

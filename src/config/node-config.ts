// [MPSI 시스템] 분산 독립 인스턴스 노드 설정 모듈 (Node Identity & Deployment Config)
// MPSI 본사, 우성정공, 뉴몰드에 단일 소스코드를 각각 배포할 때, 환경 변수에 따라 노드의 정체성과 기본 동작 모드를 결정합니다.

export type NodeType = "HQ" | "VENDOR_MOLD" | "VENDOR_MASS";

export interface NodeConfig {
  nodeId: string;              // 고유 노드 ID (예: MPSI_HQ, WOOSUNG_MOLD, NEWMOLD_MASS)
  nodeType: NodeType;          // 노드 유형 (HQ: MPSI본사, VENDOR_MOLD: 금형외주사, VENDOR_MASS: 양산외주사)
  nodeName: string;            // 노드 기관/업체명 (예: MPSI 본사, 우성정공(주), (주)뉴몰드)
  isStandalone: boolean;       // 독립 외주업체 인스턴스로 설치되었는지 여부 (true면 타 역할 전환 불가)
  hubApiUrl: string;           // MPSI Hub 연계 API 주소 (Spoke 노드에서 MPSI로 데이터 전송 시 사용)
  defaultPath: string;         // 해당 노드 접속 시 기본 시작 라우트 경로
  themeColor: string;          // 테마 색상 클래스
  badgeText: string;           // 헤더 표시 배지 텍스트
}

// 1. 기본 노드 프리셋 정의
export const NODE_PRESETS: Record<NodeType, Omit<NodeConfig, "hubApiUrl">> = {
  HQ: {
    nodeId: "MPSI_HQ",
    nodeType: "HQ",
    nodeName: "MPSI 본사",
    isStandalone: false,
    defaultPath: "/portal/project",
    themeColor: "text-sky-600",
    badgeText: "🏢 본사 통합 허브",
  },
  VENDOR_MOLD: {
    nodeId: "WOOSUNG_MOLD",
    nodeType: "VENDOR_MOLD",
    nodeName: "우성정공(주)",
    isStandalone: true,
    defaultPath: "/portal/vendor-portal/mold/projects",
    themeColor: "text-purple-600",
    badgeText: "⚙️ 금형제작 독립 시스템",
  },
  VENDOR_MASS: {
    nodeId: "NEWMOLD_MASS",
    nodeType: "VENDOR_MASS",
    nodeName: "(주)뉴몰드",
    isStandalone: true,
    defaultPath: "/portal/vendor-portal/mass/projects",
    themeColor: "text-emerald-600",
    badgeText: "🏭 사출양산 독립 시스템",
  },
};

// 2. 현재 배포 환경의 노드 설정 판별
export function getCurrentNodeConfig(): NodeConfig {
  // 환경 변수 우선 적용 (빌드 시점 또는 런타임 환경변수)
  const envNodeType = (process.env.NEXT_PUBLIC_NODE_TYPE || "HQ").toUpperCase() as NodeType;
  const envNodeId = process.env.NEXT_PUBLIC_NODE_ID;
  const envNodeName = process.env.NEXT_PUBLIC_NODE_NAME;
  const envHubUrl = process.env.NEXT_PUBLIC_HUB_API_URL || "https://mpsi-hub.a2lab.co.kr/api/v1/sync";

  const preset = NODE_PRESETS[envNodeType] || NODE_PRESETS.HQ;

  return {
    ...preset,
    nodeId: envNodeId || preset.nodeId,
    nodeName: envNodeName || preset.nodeName,
    hubApiUrl: envHubUrl,
  };
}

// 3. 편의 판별 함수
export const isHQNode = () => getCurrentNodeConfig().nodeType === "HQ";
export const isVendorMoldNode = () => getCurrentNodeConfig().nodeType === "VENDOR_MOLD";
export const isVendorMassNode = () => getCurrentNodeConfig().nodeType === "VENDOR_MASS";


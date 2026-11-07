import fs from "fs";
import path from "path";

/**
 * MPSI SCM ↔ 물류 게이트웨이(https://mpsi-gw.a2lab.co.kr) 서버 통신 모듈
 *
 * 지원 엔드포인트:
 * 1) POST /api/v1/logistics/deliveries              (배송건 위탁: ProcessDelivery -> AcknowledgeDelivery)
 * 2) GET  /api/v1/logistics/deliveries              (배송현황 목록 조회)
 * 3) GET  /api/v1/logistics/deliveries/{trackingNo} (단건 상세 및 transitSteps 조회)
 * 4) POST /api/v1/logistics/sync                    (실시간 동기화: GetDelivery -> ShowDelivery)
 *
 * 모든 호출에는 x-mpsi-api-key 헤더가 포함됩니다 (서버 환경변수 MPSI_API_KEY 우선 사용).
 */

const CONFIG_FILE = path.join(process.cwd(), ".arc-wizard", "logistics-gw-config.json");
const DEFAULT_GW_BASE_URL = "https://mpsi-gw.a2lab.co.kr";
const DEFAULT_MPSI_API_KEY = "4ac4b5afad3d6ce016bb1cca7fc565a48c2646449f7400c3197856c5ccf81879";
const DEFAULT_SIM_API_KEY = "adaa94c2dd8fc6302ad09f3aa6fb6ac343e3a769f5b079ace4e5f2cfe33a963b";

export interface GatewayRuntimeConfig {
  baseUrl: string;
  apiKey: string;
  simApiKey?: string;
}

export function getGatewayConfig(): GatewayRuntimeConfig {
  let saved: Partial<GatewayRuntimeConfig> = {};
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      saved = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    }
  } catch {
    // ignore invalid file
  }

  const baseUrl = (
    saved.baseUrl ||
    process.env.MPSI_GW_BASE_URL ||
    process.env.SOFTRUSH_API_BASE_URL ||
    DEFAULT_GW_BASE_URL
  )
    .trim()
    .replace(/\/+$/, "");

  const apiKey = (
    saved.apiKey ||
    process.env.MPSI_API_KEY ||
    process.env.SOFTRUSH_API_KEY ||
    DEFAULT_MPSI_API_KEY
  ).trim();

  const simApiKey = (
    saved.simApiKey ||
    process.env.SIM_API_KEY ||
    DEFAULT_SIM_API_KEY
  ).trim();

  return { baseUrl, apiKey, simApiKey };
}

export function saveGatewayConfig(patch: Partial<GatewayRuntimeConfig>): GatewayRuntimeConfig {
  const current = getGatewayConfig();
  const next: GatewayRuntimeConfig = {
    baseUrl: (patch.baseUrl !== undefined ? patch.baseUrl : current.baseUrl)
      .trim()
      .replace(/\/+$/, "") || DEFAULT_GW_BASE_URL,
    apiKey: patch.apiKey !== undefined ? patch.apiKey.trim() : current.apiKey,
  };
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2) + "\n", "utf-8");
  return next;
}

export interface GatewayCallResult {
  httpStatus: number;
  success: boolean;
  code: number;
  responseCode?: string;
  message: string;
  issues?: string[];
  data?: unknown;
  raw?: unknown;
  gatewayUrl: string;
}

export async function callLogisticsGateway(
  endpointPath: string,
  options: {
    method: "GET" | "POST";
    body?: unknown;
  }
): Promise<GatewayCallResult> {
  const { baseUrl, apiKey } = getGatewayConfig();
  const gatewayUrl = `${baseUrl}${endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (apiKey) {
    headers["x-mpsi-api-key"] = apiKey;
  }
  if (options.method === "POST") {
    headers["Content-Type"] = "application/json";
  }

  try {
    const res = await fetch(gatewayUrl, {
      method: options.method,
      headers,
      body:
        options.method === "POST"
          ? JSON.stringify(options.body ?? {})
          : undefined,
      cache: "no-store",
    });

    const httpStatus = res.status;
    const text = await res.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { message: text || `HTTP ${httpStatus}` };
    }

    const responseCode =
      typeof parsed.responseCode === "string"
        ? parsed.responseCode
        : typeof (parsed.data as Record<string, unknown> | undefined)?.responseCode === "string"
        ? String((parsed.data as Record<string, unknown>).responseCode)
        : undefined;

    const issues = Array.isArray(parsed.issues)
      ? parsed.issues.map((x) => String(x))
      : undefined;

    // 업무 성패 판정: HTTP 상태뿐 아니라 본문의 success 와 responseCode 확인
    const bodySuccess =
      typeof parsed.success === "boolean"
        ? parsed.success
        : httpStatus >= 200 && httpStatus < 300;

    const isSuccessCode =
      !responseCode || responseCode === "S000" || responseCode === "W100";

    const success = httpStatus >= 200 && httpStatus < 300 && bodySuccess && isSuccessCode;

    let defaultMsg = typeof parsed.message === "string" ? parsed.message : "";
    if (!defaultMsg) {
      if (httpStatus === 401) {
        defaultMsg = "x-mpsi-api-key 헤더가 누락되었거나 일치하지 않습니다. 환경변수 MPSI_API_KEY 또는 게이트웨이 키 설정을 확인하세요.";
      } else if (httpStatus === 422) {
        defaultMsg = "명사 검증 실패 (KS X 9101 BOD 규격 오류)";
      } else if (httpStatus === 404) {
        defaultMsg = "게이트웨이에서 해당 운송장번호 데이터를 찾을 수 없습니다.";
      } else if (httpStatus === 502) {
        defaultMsg = `상대 물류사 거절 또는 응답 오류${responseCode ? ` (응답코드: ${responseCode})` : ""}`;
      } else {
        defaultMsg = success ? "정상 처리되었습니다." : `게이트웨이 요청 실패 (HTTP ${httpStatus})`;
      }
    }

    return {
      httpStatus,
      success,
      code: typeof parsed.code === "number" ? parsed.code : httpStatus,
      responseCode,
      message: defaultMsg,
      issues,
      data: parsed.data !== undefined ? parsed.data : parsed,
      raw: parsed,
      gatewayUrl,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      httpStatus: 502,
      success: false,
      code: 502,
      message: `게이트웨이 서버(${gatewayUrl}) 연결 실패: ${errMsg}`,
      gatewayUrl,
    };
  }
}

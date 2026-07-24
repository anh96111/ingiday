import { HttpError } from "./http";
import type { AdsFunctionEnv } from "./supabase-server";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const ANALYTICS_SCOPE =
  "https://www.googleapis.com/auth/analytics.readonly";
const ANALYTICS_DATA_BASE_URL =
  "https://analyticsdata.googleapis.com/v1beta";
const DASHBOARD_CACHE_MS = 60_000;
const TOKEN_EXPIRY_SKEW_MS = 90_000;

const TRACKED_EVENTS = [
  "page_view",
  "view_item",
  "search",
  "add_to_cart",
  "begin_checkout",
  "purchase",
] as const;

export type AnalyticsFunctionEnv = AdsFunctionEnv & {
  GA4_PROPERTY_ID?: string;
  GA4_SERVICE_ACCOUNT_EMAIL?: string;
  GA4_SERVICE_ACCOUNT_PRIVATE_KEY?: string;
};

type RealtimeReportRequest = {
  dimensions?: Array<{ name: string }>;
  metrics: Array<{ name: string }>;
  dimensionFilter?: {
    filter: {
      fieldName: string;
      inListFilter: {
        values: string[];
        caseSensitive: boolean;
      };
    };
  };
  orderBys?: Array<{
    metric?: { metricName: string };
    dimension?: {
      dimensionName: string;
      orderType?: "ALPHANUMERIC" | "CASE_INSENSITIVE_ALPHANUMERIC" | "NUMERIC";
    };
    desc?: boolean;
  }>;
  limit?: string;
  returnPropertyQuota?: boolean;
};

type RealtimeReportResponse = {
  rows?: Array<{
    dimensionValues?: Array<{ value?: string }>;
    metricValues?: Array<{ value?: string }>;
  }>;
  rowCount?: number;
};

type RealtimeSummary = {
  activeUsers: number;
  screenPageViews: number;
  eventCount: number;
  keyEvents: number;
};

export type Ga4RealtimeDashboard = {
  generatedAt: string;
  rangeMinutes: 30;
  summary: RealtimeSummary;
  activity: Array<{
    minutesAgo: number;
    activeUsers: number;
  }>;
  events: Array<{
    name: string;
    count: number;
  }>;
  pages: Array<{
    name: string;
    activeUsers: number;
    views: number;
  }>;
  devices: Array<{
    category: string;
    activeUsers: number;
  }>;
  cities: Array<{
    city: string;
    country: string;
    activeUsers: number;
  }>;
};

type TokenCache = {
  email: string;
  accessToken: string;
  expiresAt: number;
};

type DashboardCache = {
  propertyId: string;
  expiresAt: number;
  data: Ga4RealtimeDashboard;
};

let tokenCache: TokenCache | null = null;
let tokenPromise: Promise<string> | null = null;
let dashboardCache: DashboardCache | null = null;
let dashboardPromise: {
  propertyId: string;
  promise: Promise<Ga4RealtimeDashboard>;
} | null = null;

function requiredBinding(
  value: string | undefined,
  name: string,
) {
  const normalized = value?.trim();

  if (!normalized) {
    throw new HttpError(
      500,
      `Thiếu cấu hình máy chủ ${name}.`,
    );
  }

  return normalized;
}

function analyticsConfig(env: AnalyticsFunctionEnv) {
  const propertyId = requiredBinding(
    env.GA4_PROPERTY_ID,
    "GA4_PROPERTY_ID",
  );
  const email = requiredBinding(
    env.GA4_SERVICE_ACCOUNT_EMAIL,
    "GA4_SERVICE_ACCOUNT_EMAIL",
  );
  let privateKey = requiredBinding(
    env.GA4_SERVICE_ACCOUNT_PRIVATE_KEY,
    "GA4_SERVICE_ACCOUNT_PRIVATE_KEY",
  );

  if (!/^\d+$/.test(propertyId)) {
    throw new HttpError(
      500,
      "GA4_PROPERTY_ID phải là mã Property dạng số.",
    );
  }

  if (!email.includes("@")) {
    throw new HttpError(
      500,
      "GA4_SERVICE_ACCOUNT_EMAIL không hợp lệ.",
    );
  }

  if (
    (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
    (privateKey.startsWith("'") && privateKey.endsWith("'"))
  ) {
    privateKey = privateKey.slice(1, -1);
  }

  privateKey = privateKey
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();

  if (
    !privateKey.includes("-----BEGIN PRIVATE KEY-----") ||
    !privateKey.includes("-----END PRIVATE KEY-----")
  ) {
    throw new HttpError(
      500,
      "GA4_SERVICE_ACCOUNT_PRIVATE_KEY không đúng định dạng PKCS#8.",
    );
  }

  return {
    propertyId,
    email,
    privateKey,
  };
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(index, index + chunkSize),
    );
  }

  return btoa(binary);
}

function base64Url(bytes: Uint8Array) {
  return bytesToBase64(bytes)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlJson(value: unknown) {
  return base64Url(
    new TextEncoder().encode(JSON.stringify(value)),
  );
}

function privateKeyBytes(pem: string) {
  const base64 = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function signedJwt(
  email: string,
  privateKey: string,
) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64UrlJson({
    alg: "RS256",
    typ: "JWT",
  });
  const claims = base64UrlJson({
    iss: email,
    scope: ANALYTICS_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: issuedAt,
    exp: issuedAt + 3600,
  });
  const unsignedJwt = `${header}.${claims}`;
  let key: CryptoKey;

  try {
    key = await crypto.subtle.importKey(
      "pkcs8",
      privateKeyBytes(privateKey),
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["sign"],
    );
  } catch (error) {
    console.error(
      "ga4-private-key-import-failed",
      error instanceof Error ? error.message : "unknown",
    );

    throw new HttpError(
      500,
      "Không thể đọc khóa Service Account của GA4.",
    );
  }

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedJwt),
  );

  return `${unsignedJwt}.${base64Url(new Uint8Array(signature))}`;
}

async function requestGoogleAccessToken(
  env: AnalyticsFunctionEnv,
) {
  const config = analyticsConfig(env);
  const now = Date.now();
  const assertion = await signedJwt(
    config.email,
    config.privateKey,
  );
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type:
        "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });
  const payload = (await response.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  } | null;

  if (!response.ok || !payload?.access_token) {
    console.error(
      "ga4-oauth-token-failed",
      response.status,
      payload?.error ?? "unknown",
    );

    throw new HttpError(
      502,
      "Không thể xác thực với Google Analytics.",
    );
  }

  tokenCache = {
    email: config.email,
    accessToken: payload.access_token,
    expiresAt:
      now + Math.max(60, payload.expires_in ?? 3600) * 1000,
  };

  return tokenCache.accessToken;
}

async function googleAccessToken(
  env: AnalyticsFunctionEnv,
  forceRefresh = false,
) {
  const config = analyticsConfig(env);
  const now = Date.now();

  if (
    !forceRefresh &&
    tokenCache?.email === config.email &&
    tokenCache.expiresAt - TOKEN_EXPIRY_SKEW_MS > now
  ) {
    return tokenCache.accessToken;
  }

  if (forceRefresh) {
    tokenCache = null;
    tokenPromise = null;
  }

  tokenPromise ??= requestGoogleAccessToken(env);

  try {
    return await tokenPromise;
  } finally {
    tokenPromise = null;
  }
}

async function analyticsRequest(
  env: AnalyticsFunctionEnv,
  body: RealtimeReportRequest,
  retryAfterUnauthorized = true,
): Promise<RealtimeReportResponse> {
  const config = analyticsConfig(env);
  const accessToken = await googleAccessToken(env);
  const response = await fetch(
    `${ANALYTICS_DATA_BASE_URL}/properties/${encodeURIComponent(config.propertyId)}:runRealtimeReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...body,
        returnPropertyQuota: true,
      }),
    },
  );

  if (response.status === 401 && retryAfterUnauthorized) {
    tokenCache = null;
    await googleAccessToken(env, true);

    return analyticsRequest(env, body, false);
  }

  const payload = (await response.json().catch(() => null)) as (
    RealtimeReportResponse & {
      error?: {
        status?: string;
        message?: string;
      };
    }
  ) | null;

  if (!response.ok) {
    console.error(
      "ga4-realtime-report-failed",
      response.status,
      payload?.error?.status ?? "unknown",
      payload?.error?.message ?? "unknown",
    );

    if (response.status === 403) {
      throw new HttpError(
        502,
        "Service Account chưa có quyền xem GA4 hoặc Data API chưa được bật.",
      );
    }

    throw new HttpError(
      502,
      "Không thể tải dữ liệu thời gian thực từ Google Analytics.",
    );
  }

  return payload ?? {};
}

function dimensionValue(
  response: RealtimeReportResponse,
  rowIndex: number,
  dimensionIndex: number,
) {
  return response.rows?.[rowIndex]?.dimensionValues?.[
    dimensionIndex
  ]?.value?.trim() ?? "";
}

function metricValue(
  response: RealtimeReportResponse,
  rowIndex: number,
  metricIndex: number,
) {
  const value = Number(
    response.rows?.[rowIndex]?.metricValues?.[
      metricIndex
    ]?.value ?? 0,
  );

  return Number.isFinite(value) ? value : 0;
}

function summaryFromReport(
  response: RealtimeReportResponse,
): RealtimeSummary {
  return {
    activeUsers: metricValue(response, 0, 0),
    screenPageViews: metricValue(response, 0, 1),
    eventCount: metricValue(response, 0, 2),
    keyEvents: metricValue(response, 0, 3),
  };
}

function activityFromReport(response: RealtimeReportResponse) {
  const values = new Map<number, number>();

  for (let index = 0; index < (response.rows?.length ?? 0); index += 1) {
    const minutesAgo = Number(dimensionValue(response, index, 0));

    if (Number.isInteger(minutesAgo) && minutesAgo >= 0 && minutesAgo <= 29) {
      values.set(minutesAgo, metricValue(response, index, 0));
    }
  }

  return Array.from({ length: 30 }, (_, offset) => {
    const minutesAgo = 29 - offset;

    return {
      minutesAgo,
      activeUsers: values.get(minutesAgo) ?? 0,
    };
  });
}

function eventsFromReport(response: RealtimeReportResponse) {
  const counts = new Map<string, number>();

  for (let index = 0; index < (response.rows?.length ?? 0); index += 1) {
    counts.set(
      dimensionValue(response, index, 0),
      metricValue(response, index, 0),
    );
  }

  return TRACKED_EVENTS.map((name) => ({
    name,
    count: counts.get(name) ?? 0,
  }));
}

function pagesFromReport(response: RealtimeReportResponse) {
  return (response.rows ?? []).map((_, index) => ({
    name:
      dimensionValue(response, index, 0) ||
      "Trang không có tiêu đề",
    activeUsers: metricValue(response, index, 0),
    views: metricValue(response, index, 1),
  }));
}

function devicesFromReport(response: RealtimeReportResponse) {
  return (response.rows ?? []).map((_, index) => ({
    category:
      dimensionValue(response, index, 0) || "unknown",
    activeUsers: metricValue(response, index, 0),
  }));
}

function citiesFromReport(response: RealtimeReportResponse) {
  return (response.rows ?? []).map((_, index) => ({
    city: dimensionValue(response, index, 0) || "Không xác định",
    country:
      dimensionValue(response, index, 1) || "Không xác định",
    activeUsers: metricValue(response, index, 0),
  }));
}

export async function loadGa4RealtimeDashboard(
  env: AnalyticsFunctionEnv,
): Promise<Ga4RealtimeDashboard> {
  const config = analyticsConfig(env);
  const now = Date.now();

  if (
    dashboardCache?.propertyId === config.propertyId &&
    dashboardCache.expiresAt > now
  ) {
    return dashboardCache.data;
  }

  if (dashboardPromise?.propertyId === config.propertyId) {
    return dashboardPromise.promise;
  }

  const promise = (async () => {
    const [
      summaryReport,
      activityReport,
      eventsReport,
      pagesReport,
      devicesReport,
      citiesReport,
    ] = await Promise.all([
      analyticsRequest(env, {
        metrics: [
          { name: "activeUsers" },
          { name: "screenPageViews" },
          { name: "eventCount" },
          { name: "keyEvents" },
        ],
        limit: "1",
      }),
      analyticsRequest(env, {
        dimensions: [{ name: "minutesAgo" }],
        metrics: [{ name: "activeUsers" }],
        limit: "30",
      }),
      analyticsRequest(env, {
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: {
          filter: {
            fieldName: "eventName",
            inListFilter: {
              values: [...TRACKED_EVENTS],
              caseSensitive: true,
            },
          },
        },
        limit: String(TRACKED_EVENTS.length),
      }),
      analyticsRequest(env, {
        dimensions: [{ name: "unifiedScreenName" }],
        metrics: [
          { name: "activeUsers" },
          { name: "screenPageViews" },
        ],
        orderBys: [
          {
            metric: { metricName: "screenPageViews" },
            desc: true,
          },
        ],
        limit: "8",
      }),
      analyticsRequest(env, {
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [
          {
            metric: { metricName: "activeUsers" },
            desc: true,
          },
        ],
        limit: "10",
      }),
      analyticsRequest(env, {
        dimensions: [{ name: "city" }, { name: "country" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [
          {
            metric: { metricName: "activeUsers" },
            desc: true,
          },
        ],
        limit: "8",
      }),
    ]);

    const data: Ga4RealtimeDashboard = {
      generatedAt: new Date().toISOString(),
      rangeMinutes: 30,
      summary: summaryFromReport(summaryReport),
      activity: activityFromReport(activityReport),
      events: eventsFromReport(eventsReport),
      pages: pagesFromReport(pagesReport),
      devices: devicesFromReport(devicesReport),
      cities: citiesFromReport(citiesReport),
    };

    dashboardCache = {
      propertyId: config.propertyId,
      expiresAt: Date.now() + DASHBOARD_CACHE_MS,
      data,
    };

    return data;
  })();

  dashboardPromise = {
    propertyId: config.propertyId,
    promise,
  };

  try {
    return await promise;
  } finally {
    if (dashboardPromise?.promise === promise) {
      dashboardPromise = null;
    }
  }
}

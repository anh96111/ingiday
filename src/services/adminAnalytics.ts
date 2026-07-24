import { supabase } from "../lib/supabase";

export type AdminRealtimeAnalytics = {
  generatedAt: string;
  rangeMinutes: 30;
  summary: {
    activeUsers: number;
    screenPageViews: number;
    eventCount: number;
    keyEvents: number;
  };
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

type RealtimeAnalyticsApiResponse = {
  success?: boolean;
  data?: AdminRealtimeAnalytics;
  error?: string;
  message?: string;
};

async function adminAccessToken() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error(
      "Phiên đăng nhập quản trị đã hết hạn. Vui lòng đăng nhập lại.",
    );
  }

  return session.access_token;
}

export async function loadAdminRealtimeAnalytics(
  signal?: AbortSignal,
) {
  const token = await adminAccessToken();
  const response = await fetch(
    "/api/admin/analytics/realtime",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal,
    },
  );

  let payload: RealtimeAnalyticsApiResponse;

  try {
    payload =
      (await response.json()) as RealtimeAnalyticsApiResponse;
  } catch {
    payload = {};
  }

  if (!response.ok || !payload.data) {
    throw new Error(
      payload.error ||
        payload.message ||
        `Không thể tải GA4 Realtime (${response.status}).`,
    );
  }

  return payload.data;
}

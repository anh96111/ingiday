import { supabase } from "../lib/supabase";
import type {
  MetaAdsConnectionStatus,
  MetaAdsCostReport,
  MetaAdsReportAccount,
} from "../types/metaAdsReport";

type ApiPayload = {
  success?: boolean;
  error?: string;
  message?: string;
};

type ConnectionPayload = ApiPayload & {
  connection?: MetaAdsConnectionStatus;
};

type AccountsPayload = ApiPayload & {
  accounts?: MetaAdsReportAccount[];
  account?: MetaAdsReportAccount;
};

type ReportPayload = ApiPayload & {
  report?: MetaAdsCostReport;
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

async function requestJson<T extends ApiPayload>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await adminAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");

  if (init.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    headers,
    cache: "no-store",
  });
  let payload: T;

  try {
    payload = (await response.json()) as T;
  } catch {
    payload = {} as T;
  }

  if (!response.ok) {
    throw new Error(
      payload.error ||
        payload.message ||
        `Máy chủ trả về lỗi HTTP ${response.status}.`,
    );
  }

  return payload;
}

export async function loadMetaAdsConnection() {
  const payload = await requestJson<ConnectionPayload>(
    "/api/admin/meta-ads/connection",
  );

  if (!payload.connection) {
    throw new Error("Phản hồi kết nối Meta không hợp lệ.");
  }

  return payload.connection;
}

export async function saveMetaAdsConnection(accessToken: string) {
  const normalized = accessToken.trim();

  if (!normalized) {
    throw new Error("Vui lòng nhập Meta Access Token.");
  }

  const payload = await requestJson<ConnectionPayload>(
    "/api/admin/meta-ads/connection",
    {
      method: "PUT",
      body: JSON.stringify({ accessToken: normalized }),
    },
  );

  if (!payload.connection) {
    throw new Error("Phản hồi lưu kết nối Meta không hợp lệ.");
  }

  return {
    connection: payload.connection,
    message: payload.message || "Đã lưu kết nối Meta.",
  };
}

export async function testMetaAdsConnection() {
  const payload = await requestJson<ConnectionPayload>(
    "/api/admin/meta-ads/connection",
    {
      method: "POST",
    },
  );

  if (!payload.connection) {
    throw new Error("Phản hồi kiểm tra kết nối Meta không hợp lệ.");
  }

  return {
    connection: payload.connection,
    message: payload.message || "Kết nối Meta đang hoạt động.",
  };
}

export async function deleteMetaAdsConnection() {
  const payload = await requestJson<ConnectionPayload>(
    "/api/admin/meta-ads/connection",
    {
      method: "DELETE",
    },
  );

  return payload.message || "Đã xóa kết nối Meta.";
}

export async function listMetaAdsReportAccounts() {
  const payload = await requestJson<AccountsPayload>(
    "/api/admin/meta-ads/accounts",
  );

  return payload.accounts ?? [];
}

export async function addMetaAdsReportAccount(adAccountId: string) {
  const normalized = adAccountId.trim();

  if (!normalized) {
    throw new Error("Vui lòng nhập ID tài khoản quảng cáo.");
  }

  const payload = await requestJson<AccountsPayload>(
    "/api/admin/meta-ads/accounts",
    {
      method: "POST",
      body: JSON.stringify({ adAccountId: normalized }),
    },
  );

  if (!payload.account) {
    throw new Error("Phản hồi thêm tài khoản không hợp lệ.");
  }

  return {
    account: payload.account,
    message: payload.message || "Đã thêm tài khoản quảng cáo.",
  };
}

export async function setMetaAdsReportAccountEnabled(
  id: string,
  isEnabled: boolean,
) {
  const payload = await requestJson<AccountsPayload>(
    `/api/admin/meta-ads/accounts/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ isEnabled }),
    },
  );

  if (!payload.account) {
    throw new Error("Phản hồi cập nhật tài khoản không hợp lệ.");
  }

  return {
    account: payload.account,
    message: payload.message || "Đã cập nhật tài khoản.",
  };
}

export async function verifyMetaAdsReportAccount(id: string) {
  const payload = await requestJson<AccountsPayload>(
    `/api/admin/meta-ads/accounts/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ action: "verify" }),
    },
  );

  if (!payload.account) {
    throw new Error("Phản hồi kiểm tra tài khoản không hợp lệ.");
  }

  return {
    account: payload.account,
    message: payload.message || "Tài khoản đang hoạt động.",
  };
}

export async function deleteMetaAdsReportAccount(id: string) {
  const payload = await requestJson<AccountsPayload>(
    `/api/admin/meta-ads/accounts/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
  );

  return payload.message || "Đã xóa tài khoản quảng cáo.";
}

export async function loadMetaAdsCostReport(input: {
  since: string;
  until: string;
  accountId?: string;
}) {
  const params = new URLSearchParams({
    since: input.since,
    until: input.until,
  });

  if (input.accountId && input.accountId !== "all") {
    params.set("accountId", input.accountId);
  }

  const payload = await requestJson<ReportPayload>(
    `/api/admin/meta-ads/report?${params.toString()}`,
  );

  if (!payload.report) {
    throw new Error("Phản hồi báo cáo chi phí Ads không hợp lệ.");
  }

  return payload.report;
}

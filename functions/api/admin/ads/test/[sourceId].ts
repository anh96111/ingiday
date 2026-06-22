import {
  requireAdmin,
} from "../../../../_lib/ads-auth";
import {
  parseEventEnvelope,
  processAdEvent,
} from "../../../../_lib/ad-events";
import {
  errorResponse,
  HttpError,
  jsonResponse,
} from "../../../../_lib/http";
import {
  supabaseServerFetch,
} from "../../../../_lib/supabase-server";
import type {
  AdsFunctionEnv,
} from "../../../../_lib/supabase-server";

type RouteContext = {
  request: Request;
  env: AdsFunctionEnv;
  params: {
    sourceId?: string | string[];
  };
};

type SourceRow = {
  id: string;
  platform: "meta" | "tiktok";
};

function sourceIdFromContext(
  context: RouteContext,
) {
  const raw = context.params.sourceId;
  const value = Array.isArray(raw)
    ? raw[0]
    : raw;

  if (
    !value ||
    !/^[0-9a-f-]{36}$/i.test(value)
  ) {
    throw new HttpError(
      400,
      "Mã cấu hình Pixel không hợp lệ.",
    );
  }

  return value;
}

async function loadSource(
  env: AdsFunctionEnv,
  sourceId: string,
) {
  const response = await supabaseServerFetch(
    env,
    "/rest/v1/ad_data_sources" +
      `?id=eq.${encodeURIComponent(sourceId)}` +
      "&select=id,platform" +
      "&limit=1",
  );

  if (!response.ok) {
    throw new HttpError(
      500,
      "Không thể đọc cấu hình Pixel.",
    );
  }

  const payload =
    (await response.json()) as unknown;
  const source = Array.isArray(payload)
    ? payload[0] as SourceRow | undefined
    : undefined;

  if (!source) {
    throw new HttpError(
      404,
      "Không tìm thấy cấu hình Pixel.",
    );
  }

  return source;
}

async function updateTestStatus(
  env: AdsFunctionEnv,
  sourceId: string,
  status: "success" | "failed",
  message: string,
) {
  const response = await supabaseServerFetch(
    env,
    "/rest/v1/ad_data_sources" +
      `?id=eq.${encodeURIComponent(sourceId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        last_tested_at:
          new Date().toISOString(),
        last_test_status: status,
        last_test_message:
          message.slice(0, 500),
      }),
    },
  );

  if (!response.ok) {
    console.error(
      "ad-source-test-status-failed",
      response.status,
    );
  }
}

export async function onRequestPost(
  context: RouteContext,
) {
  const sourceId =
    sourceIdFromContext(context);

  try {
    await requireAdmin(
      context.request,
      context.env,
    );
    const source = await loadSource(
      context.env,
      sourceId,
    );
    const origin = new URL(
      context.request.url,
    ).origin;
    const envelope = parseEventEnvelope({
      sourceId,
      platform: source.platform,
      eventName: "PageView",
      eventId:
        `test:${crypto.randomUUID()}:${source.platform}:${sourceId}`,
      productIds: [],
      orderCode: null,
      pageUrl: origin,
      referrer: null,
      anonymousId:
        `admin-test-${crypto.randomUUID()}`,
      payload: {
        page_path: "/admin/pixel-quang-cao",
        currency: "VND",
        value: 0,
      },
    });
    const result = await processAdEvent(
      context.env,
      envelope,
      context.request,
      {
        force: true,
        skipSourceResolution: true,
      },
    );

    await updateTestStatus(
      context.env,
      sourceId,
      result.accepted
        ? "success"
        : "failed",
      result.accepted
        ? "Kết nối Server đã hoạt động."
        : "Nền tảng không chấp nhận sự kiện kiểm tra.",
    );

    return jsonResponse({
      success: result.accepted,
      result,
    });
  } catch (error) {
    await updateTestStatus(
      context.env,
      sourceId,
      "failed",
      error instanceof Error
        ? error.message
        : "Kiểm tra kết nối thất bại.",
    );

    return errorResponse(error);
  }
}

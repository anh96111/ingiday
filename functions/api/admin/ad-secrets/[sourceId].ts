import {
  requireAdmin,
} from "../../../_lib/ads-auth";
import {
  encryptAccessToken,
} from "../../../_lib/ads-crypto";
import {
  errorResponse,
  HttpError,
  jsonResponse,
  readJsonObject,
} from "../../../_lib/http";
import {
  requireEncryptionKey,
  supabaseServerFetch,
} from "../../../_lib/supabase-server";
import type {
  AdsFunctionEnv,
} from "../../../_lib/supabase-server";

type RouteContext = {
  request: Request;
  env: AdsFunctionEnv;
  params: {
    sourceId?: string | string[];
  };
};

type AdDataSourceRow = {
  id: string;
};

function sourceIdFromContext(
  context: RouteContext,
) {
  const rawSourceId =
    context.params.sourceId;
  const sourceId = Array.isArray(rawSourceId)
    ? rawSourceId[0]
    : rawSourceId;

  if (
    !sourceId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      sourceId,
    )
  ) {
    throw new HttpError(
      400,
      "Mã cấu hình Pixel không hợp lệ.",
    );
  }

  return sourceId;
}

async function ensureSourceExists(
  env: AdsFunctionEnv,
  sourceId: string,
) {
  const query =
    "/rest/v1/ad_data_sources" +
    `?id=eq.${encodeURIComponent(sourceId)}` +
    "&select=id" +
    "&limit=1";
  const response =
    await supabaseServerFetch(
      env,
      query,
    );

  if (!response.ok) {
    console.error(
      "ad-source-check-failed",
      response.status,
    );

    throw new HttpError(
      500,
      "Không thể kiểm tra cấu hình Pixel.",
    );
  }

  const payload =
    (await response.json()) as unknown;

  if (!Array.isArray(payload)) {
    throw new HttpError(
      500,
      "Phản hồi cấu hình Pixel không hợp lệ.",
    );
  }

  if (!(payload[0] as AdDataSourceRow | undefined)) {
    throw new HttpError(
      404,
      "Không tìm thấy cấu hình Pixel.",
    );
  }
}

async function saveEncryptedSecret(
  env: AdsFunctionEnv,
  sourceId: string,
  ciphertext: string,
  initializationVector: string,
  algorithm: string,
  updatedAt: string,
) {
  const response =
    await supabaseServerFetch(
      env,
      "/rest/v1/ad_data_source_secrets" +
        "?on_conflict=ad_data_source_id",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Prefer:
            "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          ad_data_source_id: sourceId,
          ciphertext,
          initialization_vector:
            initializationVector,
          algorithm,
          updated_at: updatedAt,
        }),
      },
    );

  if (!response.ok) {
    console.error(
      "ad-secret-save-failed",
      response.status,
    );

    throw new HttpError(
      500,
      "Không thể lưu Access Token.",
    );
  }
}

async function removeEncryptedSecret(
  env: AdsFunctionEnv,
  sourceId: string,
) {
  const query =
    "/rest/v1/ad_data_source_secrets" +
    "?ad_data_source_id=eq." +
    encodeURIComponent(sourceId);
  const response =
    await supabaseServerFetch(
      env,
      query,
      {
        method: "DELETE",
        headers: {
          Prefer: "return=minimal",
        },
      },
    );

  if (!response.ok) {
    console.error(
      "ad-secret-delete-failed",
      response.status,
    );

    throw new HttpError(
      500,
      "Không thể xóa Access Token.",
    );
  }
}

export async function onRequestPut(
  context: RouteContext,
) {
  try {
    const sourceId =
      sourceIdFromContext(context);

    await requireAdmin(
      context.request,
      context.env,
    );

    const body =
      await readJsonObject(context.request);
    const accessToken =
      typeof body.accessToken === "string"
        ? body.accessToken.trim()
        : "";

    if (accessToken.length < 8) {
      throw new HttpError(
        400,
        "Access Token không hợp lệ.",
      );
    }

    if (accessToken.length > 12000) {
      throw new HttpError(
        400,
        "Access Token vượt quá giới hạn cho phép.",
      );
    }

    await ensureSourceExists(
      context.env,
      sourceId,
    );

    const encrypted =
      await encryptAccessToken(
        accessToken,
        requireEncryptionKey(context.env),
      );
    const updatedAt =
      new Date().toISOString();

    await saveEncryptedSecret(
      context.env,
      sourceId,
      encrypted.ciphertext,
      encrypted.initializationVector,
      encrypted.algorithm,
      updatedAt,
    );

    return jsonResponse({
      success: true,
      tokenConfigured: true,
      tokenUpdatedAt: updatedAt,
      message:
        "Access Token đã được mã hóa và lưu an toàn.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestDelete(
  context: RouteContext,
) {
  try {
    const sourceId =
      sourceIdFromContext(context);

    await requireAdmin(
      context.request,
      context.env,
    );
    await ensureSourceExists(
      context.env,
      sourceId,
    );
    await removeEncryptedSecret(
      context.env,
      sourceId,
    );

    return jsonResponse({
      success: true,
      tokenConfigured: false,
      message: "Đã xóa Access Token.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

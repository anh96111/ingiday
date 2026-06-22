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
  supabase: Awaited<
    ReturnType<typeof requireAdmin>
  >["supabase"],
  sourceId: string,
) {
  const {
    data,
    error,
  } = await supabase
    .from("ad_data_sources")
    .select("id")
    .eq("id", sourceId)
    .maybeSingle();

  if (error) {
    throw new HttpError(
      500,
      "Không thể kiểm tra cấu hình Pixel.",
    );
  }

  if (!(data as AdDataSourceRow | null)) {
    throw new HttpError(
      404,
      "Không tìm thấy cấu hình Pixel.",
    );
  }
}

export async function onRequestPut(
  context: RouteContext,
) {
  try {
    const sourceId =
      sourceIdFromContext(context);
    const {
      supabase,
    } = await requireAdmin(
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
      supabase,
      sourceId,
    );

    const encrypted =
      await encryptAccessToken(
        accessToken,
        requireEncryptionKey(context.env),
      );
    const updatedAt =
      new Date().toISOString();
    const {
      error,
    } = await supabase
      .from("ad_data_source_secrets")
      .upsert(
        {
          ad_data_source_id: sourceId,
          ciphertext:
            encrypted.ciphertext,
          initialization_vector:
            encrypted.initializationVector,
          algorithm: encrypted.algorithm,
          updated_at: updatedAt,
        },
        {
          onConflict: "ad_data_source_id",
        },
      );

    if (error) {
      throw new HttpError(
        500,
        "Không thể lưu Access Token.",
      );
    }

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
    const {
      supabase,
    } = await requireAdmin(
      context.request,
      context.env,
    );

    await ensureSourceExists(
      supabase,
      sourceId,
    );

    const {
      error,
    } = await supabase
      .from("ad_data_source_secrets")
      .delete()
      .eq("ad_data_source_id", sourceId);

    if (error) {
      throw new HttpError(
        500,
        "Không thể xóa Access Token.",
      );
    }

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

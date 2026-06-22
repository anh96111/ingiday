import { supabase } from "../lib/supabase";
import {
  AD_EVENT_NAMES,
} from "../types/ads";
import type {
  AdDataSource,
  AdDataSourceInput,
  AdEventName,
  AdEventSetting,
  AdPlatform,
  ProductAdAssignments,
  PurchaseTrigger,
} from "../types/ads";

type AdDataSourceRow = {
  id: string;
  platform: AdPlatform;
  name: string;
  pixel_id: string;
  is_default: boolean;
  is_active: boolean;
  browser_enabled: boolean;
  server_enabled: boolean;
  test_mode: boolean;
  test_event_code: string;
  api_version: string;
  purchase_trigger: PurchaseTrigger;
  last_tested_at: string | null;
  last_test_status: "success" | "failed" | null;
  last_test_message: string;
  created_at: string;
  updated_at: string;
};

type AdEventSettingRow = {
  ad_data_source_id: string;
  event_name: AdEventName;
  browser_enabled: boolean;
  server_enabled: boolean;
};

type SecretStatusRow = {
  ad_data_source_id: string;
  token_configured: boolean;
  token_updated_at: string | null;
};

type AssignmentRow = {
  platform: AdPlatform;
  ad_data_source_id: string;
};

const DEFAULT_EVENT_SETTINGS: Record<
  AdEventName,
  AdEventSetting
> = {
  PageView: {
    eventName: "PageView",
    browserEnabled: true,
    serverEnabled: false,
  },
  ViewContent: {
    eventName: "ViewContent",
    browserEnabled: true,
    serverEnabled: true,
  },
  Search: {
    eventName: "Search",
    browserEnabled: true,
    serverEnabled: false,
  },
  AddToCart: {
    eventName: "AddToCart",
    browserEnabled: true,
    serverEnabled: true,
  },
  InitiateCheckout: {
    eventName: "InitiateCheckout",
    browserEnabled: true,
    serverEnabled: true,
  },
  Purchase: {
    eventName: "Purchase",
    browserEnabled: true,
    serverEnabled: true,
  },
};

function messageFromError(
  error: unknown,
  fallback: string,
) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    if (
      error.message.includes(
        "ad_data_sources_platform_pixel_id_unique_idx",
      )
    ) {
      return "Pixel ID này đã tồn tại trong cùng nền tảng.";
    }

    return error.message;
  }

  return fallback;
}

function normalizedEventSettings(
  rows: AdEventSettingRow[],
  sourceId: string,
): AdEventSetting[] {
  const sourceRows = rows.filter(
    (row) => row.ad_data_source_id === sourceId,
  );

  return AD_EVENT_NAMES.map((eventName) => {
    const row = sourceRows.find(
      (item) => item.event_name === eventName,
    );

    return row
      ? {
          eventName,
          browserEnabled: row.browser_enabled,
          serverEnabled: row.server_enabled,
        }
      : { ...DEFAULT_EVENT_SETTINGS[eventName] };
  });
}

function sourcePayload(input: AdDataSourceInput) {
  return {
    platform: input.platform,
    name: input.name.trim(),
    pixel_id: input.pixelId.trim(),
    is_default: input.isDefault,
    is_active: input.isActive,
    browser_enabled: input.browserEnabled,
    server_enabled: input.serverEnabled,
    test_mode: input.testMode,
    test_event_code: input.testEventCode.trim(),
    api_version: input.apiVersion.trim(),
    purchase_trigger: input.purchaseTrigger,
  };
}

async function saveEventSettings(
  sourceId: string,
  settings: AdEventSetting[],
) {
  const byName = new Map(
    settings.map((setting) => [
      setting.eventName,
      setting,
    ]),
  );

  const payload = AD_EVENT_NAMES.map((eventName) => {
    const setting =
      byName.get(eventName) ??
      DEFAULT_EVENT_SETTINGS[eventName];

    return {
      ad_data_source_id: sourceId,
      event_name: eventName,
      browser_enabled: setting.browserEnabled,
      server_enabled: setting.serverEnabled,
    };
  });

  const { error } = await supabase
    .from("ad_event_settings")
    .upsert(payload, {
      onConflict: "ad_data_source_id,event_name",
    });

  if (error) {
    throw new Error(
      messageFromError(
        error,
        "Không thể lưu cấu hình sự kiện.",
      ),
    );
  }
}

export async function listAdDataSources(): Promise<
  AdDataSource[]
> {
  const [sourcesResult, eventsResult, secretsResult] =
    await Promise.all([
      supabase
        .from("ad_data_sources")
        .select(
          "id,platform,name,pixel_id,is_default,is_active,browser_enabled,server_enabled,test_mode,test_event_code,api_version,purchase_trigger,last_tested_at,last_test_status,last_test_message,created_at,updated_at",
        )
        .order("platform")
        .order("created_at"),
      supabase
        .from("ad_event_settings")
        .select(
          "ad_data_source_id,event_name,browser_enabled,server_enabled",
        ),
      supabase.rpc("admin_get_ad_secret_status"),
    ]);

  if (sourcesResult.error) {
    throw new Error(
      messageFromError(
        sourcesResult.error,
        "Không thể tải danh sách Pixel.",
      ),
    );
  }

  if (eventsResult.error) {
    throw new Error(
      messageFromError(
        eventsResult.error,
        "Không thể tải cấu hình sự kiện.",
      ),
    );
  }

  if (secretsResult.error) {
    throw new Error(
      messageFromError(
        secretsResult.error,
        "Không thể tải trạng thái Access Token.",
      ),
    );
  }

  const sourceRows =
    (sourcesResult.data ?? []) as AdDataSourceRow[];
  const eventRows =
    (eventsResult.data ?? []) as AdEventSettingRow[];
  const secretRows =
    (secretsResult.data ?? []) as SecretStatusRow[];
  const secretBySource = new Map(
    secretRows.map((row) => [
      row.ad_data_source_id,
      row,
    ]),
  );

  return sourceRows.map((row) => {
    const secret = secretBySource.get(row.id);

    return {
      id: row.id,
      platform: row.platform,
      name: row.name,
      pixelId: row.pixel_id,
      isDefault: row.is_default,
      isActive: row.is_active,
      browserEnabled: row.browser_enabled,
      serverEnabled: row.server_enabled,
      testMode: row.test_mode,
      testEventCode: row.test_event_code,
      apiVersion: row.api_version,
      purchaseTrigger: row.purchase_trigger,
      lastTestedAt: row.last_tested_at ?? undefined,
      lastTestStatus:
        row.last_test_status ?? undefined,
      lastTestMessage: row.last_test_message,
      tokenConfigured:
        secret?.token_configured ?? false,
      tokenUpdatedAt:
        secret?.token_updated_at ?? undefined,
      eventSettings: normalizedEventSettings(
        eventRows,
        row.id,
      ),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

export async function createAdDataSource(
  input: AdDataSourceInput,
) {
  const { data, error } = await supabase
    .from("ad_data_sources")
    .insert(sourcePayload(input))
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      messageFromError(
        error,
        "Không thể tạo Pixel quảng cáo.",
      ),
    );
  }

  try {
    await saveEventSettings(
      data.id as string,
      input.eventSettings,
    );
  } catch (saveError) {
    await supabase
      .from("ad_data_sources")
      .delete()
      .eq("id", data.id);
    throw saveError;
  }

  return data.id as string;
}

export async function updateAdDataSource(
  id: string,
  input: AdDataSourceInput,
) {
  const { error } = await supabase
    .from("ad_data_sources")
    .update(sourcePayload(input))
    .eq("id", id);

  if (error) {
    throw new Error(
      messageFromError(
        error,
        "Không thể cập nhật Pixel quảng cáo.",
      ),
    );
  }

  await saveEventSettings(id, input.eventSettings);
}

export async function deleteAdDataSource(
  id: string,
) {
  const { error } = await supabase
    .from("ad_data_sources")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(
      messageFromError(
        error,
        "Không thể xóa Pixel quảng cáo.",
      ),
    );
  }
}

export async function countProductAdAssignments(
  sourceId: string,
) {
  const { count, error } = await supabase
    .from("product_ad_assignments")
    .select("product_id", {
      count: "exact",
      head: true,
    })
    .eq("ad_data_source_id", sourceId);

  if (error) {
    throw new Error(
      messageFromError(
        error,
        "Không thể kiểm tra sản phẩm đang dùng Pixel.",
      ),
    );
  }

  return count ?? 0;
}

export async function getProductAdAssignments(
  productId: string,
): Promise<ProductAdAssignments> {
  const { data, error } = await supabase
    .from("product_ad_assignments")
    .select("platform,ad_data_source_id")
    .eq("product_id", productId);

  if (error) {
    throw new Error(
      messageFromError(
        error,
        "Không thể tải Pixel của sản phẩm.",
      ),
    );
  }

  const assignments: ProductAdAssignments = {
    meta: null,
    tiktok: null,
  };

  for (const row of (data ?? []) as AssignmentRow[]) {
    assignments[row.platform] = row.ad_data_source_id;
  }

  return assignments;
}

export async function saveProductAdAssignments(
  productId: string,
  assignments: ProductAdAssignments,
) {
  const { error } = await supabase.rpc(
    "admin_set_product_ad_assignments",
    {
      p_product_id: productId,
      p_meta_source_id: assignments.meta,
      p_tiktok_source_id: assignments.tiktok,
    },
  );

  if (error) {
    throw new Error(
      messageFromError(
        error,
        "Không thể lưu Pixel cho sản phẩm.",
      ),
    );
  }
}

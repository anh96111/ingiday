import { supabase } from "../lib/supabase";
import type {
  ProductProductionCostProfile,
  ProductionCostSettings,
} from "../types/productCost";

type ProductionCostSettingsRow = {
  id: number;
  filament_price_per_kg: number | string;
  average_printer_power_watts: number | string | null;
  electricity_price_per_kwh: number | string | null;
  packaging_cost_per_order: number | string;
  shipping_cost_per_order: number | string;
};

type ProductProductionCostProfileRow = {
  id: string;
  product_id: string;
  selections: Record<string, unknown>;
  filament_grams: number | string;
  print_minutes: number;
};

export type StoredProductProductionCostProfile = ProductProductionCostProfile & {
  id: string;
  productId: string;
};

const SETTINGS_FIELDS =
  "id,filament_price_per_kg,average_printer_power_watts,electricity_price_per_kwh,packaging_cost_per_order,shipping_cost_per_order";
const PROFILE_FIELDS =
  "id,product_id,selections,filament_grams,print_minutes";

function nonNegativeNumber(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} phải là số không âm hợp lệ.`);
  }
  return value;
}

function nonNegativeMinutes(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError("Thời gian in phải là số phút nguyên không âm.");
  }
  return value;
}

function positiveId(value: string, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} không hợp lệ.`);
  }
  return value.trim();
}

function selectionsForStorage(
  selections: Record<string, string>,
): Record<string, string> {
  if (!selections || typeof selections !== "object" || Array.isArray(selections)) {
    throw new Error("Tổ hợp biến thể không hợp lệ.");
  }
  const normalized: Record<string, string> = {};
  for (const [groupId, optionId] of Object.entries(selections).sort(([a], [b]) => a.localeCompare(b))) {
    const group = positiveId(groupId, "Mã nhóm biến thể");
    const option = positiveId(optionId, "Mã lựa chọn biến thể");
    if (["__proto__", "constructor", "prototype"].includes(group) ||
        Object.hasOwn(normalized, group)) {
      throw new Error("Trùng mã nhóm biến thể.");
    }
    normalized[group] = option;
  }
  return normalized;
}

function settingsFromRow(row: ProductionCostSettingsRow): ProductionCostSettings {
  return {
    filamentPricePerKg: Number(row.filament_price_per_kg),
    averagePrinterPowerWatts:
      row.average_printer_power_watts === null
        ? null
        : Number(row.average_printer_power_watts),
    electricityPricePerKwh:
      row.electricity_price_per_kwh === null
        ? null
        : Number(row.electricity_price_per_kwh),
    packagingCostPerOrder: Number(row.packaging_cost_per_order),
    shippingCostPerOrder: Number(row.shipping_cost_per_order),
  };
}

function profileFromRow(
  row: ProductProductionCostProfileRow,
): StoredProductProductionCostProfile {
  const raw = row.selections;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Dữ liệu tổ hợp biến thể đã lưu không hợp lệ.");
  }
  const selections: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== "string" || !key || !value) {
      throw new Error("Dữ liệu tổ hợp biến thể đã lưu không hợp lệ.");
    }
    selections[key] = value;
  }
  return {
    id: row.id,
    productId: row.product_id,
    selections,
    filamentGrams: Number(row.filament_grams),
    printMinutes: Number(row.print_minutes),
  };
}

// This table is admin-only through Supabase RLS; never expose through storefront APIs.
export async function loadProductionCostSettings(): Promise<ProductionCostSettings> {
  const { data, error } = await supabase
    .from("production_cost_settings")
    .select(SETTINGS_FIELDS)
    .eq("id", 1)
    .single();
  if (error) throw error;
  return settingsFromRow(data as unknown as ProductionCostSettingsRow);
}

export async function saveProductionCostSettings(
  settings: ProductionCostSettings,
): Promise<ProductionCostSettings> {
  const payload = {
    filament_price_per_kg: nonNegativeNumber(settings.filamentPricePerKg, "Giá nhựa"),
    average_printer_power_watts:
      settings.averagePrinterPowerWatts === null
        ? null
        : nonNegativeNumber(settings.averagePrinterPowerWatts, "Công suất máy"),
    electricity_price_per_kwh:
      settings.electricityPricePerKwh === null
        ? null
        : nonNegativeNumber(settings.electricityPricePerKwh, "Đơn giá điện"),
    packaging_cost_per_order: nonNegativeNumber(settings.packagingCostPerOrder, "Phí đóng gói"),
    shipping_cost_per_order: nonNegativeNumber(settings.shippingCostPerOrder, "Chi phí vận chuyển"),
  };
  const { data, error } = await supabase
    .from("production_cost_settings")
    .update(payload)
    .eq("id", 1)
    .select(SETTINGS_FIELDS)
    .single();
  if (error) throw error;
  return settingsFromRow(data as unknown as ProductionCostSettingsRow);
}

export async function listProductProductionCostProfiles(
  productId: string,
): Promise<StoredProductProductionCostProfile[]> {
  const { data, error } = await supabase
    .from("product_production_cost_profiles")
    .select(PROFILE_FIELDS)
    .eq("product_id", positiveId(productId, "Mã sản phẩm"))
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as ProductProductionCostProfileRow[]).map(profileFromRow);
}

// Upserts ONE exact combination. Does not erase other combinations or product data.
export async function saveProductProductionCostProfile(
  productId: string,
  profile: ProductProductionCostProfile,
): Promise<StoredProductProductionCostProfile> {
  const payload = {
    product_id: positiveId(productId, "Mã sản phẩm"),
    selections: selectionsForStorage(profile.selections),
    filament_grams: nonNegativeNumber(profile.filamentGrams, "Trọng lượng nhựa"),
    print_minutes: nonNegativeMinutes(profile.printMinutes),
  };
  const { data, error } = await supabase
    .from("product_production_cost_profiles")
    .upsert(payload, { onConflict: "product_id,selections" })
    .select(PROFILE_FIELDS)
    .single();
  if (error) throw error;
  return profileFromRow(data as unknown as ProductProductionCostProfileRow);
}

// Upsert all filled selections in one PostgreSQL statement; no partial successes.
// Unlisted selections stay untouched, so previously saved cost data is preserved.
export async function saveProductProductionCostProfiles(
  productId: string,
  profiles: ProductProductionCostProfile[],
): Promise<StoredProductProductionCostProfile[]> {
  if (profiles.length === 0) return [];
  const validatedProductId = positiveId(productId, "Mã sản phẩm");
  const seen = new Set<string>();
  const payload = profiles.map((profile) => {
    const selections = selectionsForStorage(profile.selections);
    const key = JSON.stringify(
      Object.keys(selections).sort().map((groupId) => [groupId, selections[groupId]]),
    );
    if (seen.has(key)) throw new Error("Có tổ hợp Cost bị trùng lặp.");
    seen.add(key);
    return {
      product_id: validatedProductId,
      selections,
      filament_grams: nonNegativeNumber(profile.filamentGrams, "Trọng lượng nhựa"),
      print_minutes: nonNegativeMinutes(profile.printMinutes),
    };
  });
  const { data, error } = await supabase
    .from("product_production_cost_profiles")
    .upsert(payload, { onConflict: "product_id,selections" })
    .select(PROFILE_FIELDS);
  if (error) throw error;
  const saved = ((data ?? []) as unknown as ProductProductionCostProfileRow[]).map(profileFromRow);
  if (saved.length !== profiles.length) {
    throw new Error("Số dòng Cost trả về không khớp. Hãy tải lại để kiểm tra.");
  }
  return saved;
}
// Delete by the record's primary key plus its parent product; never use a JSONB subset filter.
export async function deleteProductProductionCostProfile(
  productId: string,
  profileId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("product_production_cost_profiles")
    .delete()
    .eq("product_id", positiveId(productId, "Mã sản phẩm"))
    .eq("id", positiveId(profileId, "Mã cấu hình giá vốn"))
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Không tìm thấy cấu hình giá vốn cần xóa.");
}

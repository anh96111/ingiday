/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import {
  loadProductionCostSettings,
  saveProductionCostSettings,
} from "../../services/productCosts";
import type { ProductionCostSettings } from "../../types/productCost";
import { DEFAULT_PRODUCTION_COST_SETTINGS } from "../../utils/productionCost";

type CostSettingsDraft = {
  filamentPricePerKg: string;
  averagePrinterPowerWatts: string;
  electricityPricePerKwh: string;
  packagingCostPerOrder: string;
  shippingCostPerOrder: string;
};

type Field = keyof CostSettingsDraft;

function toDraft(settings: ProductionCostSettings): CostSettingsDraft {
  return {
    filamentPricePerKg: String(settings.filamentPricePerKg),
    averagePrinterPowerWatts:
      settings.averagePrinterPowerWatts === null ? "" : String(settings.averagePrinterPowerWatts),
    electricityPricePerKwh:
      settings.electricityPricePerKwh === null ? "" : String(settings.electricityPricePerKwh),
    packagingCostPerOrder: String(settings.packagingCostPerOrder),
    shippingCostPerOrder: String(settings.shippingCostPerOrder),
  };
}

function money(value: string, label: string): number {
  if (!value.trim()) throw new Error(`${label} không được để trống.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 9_999_999_999) {
    throw new Error(`${label} phải là số tiền VND nguyên không âm.`);
  }
  return parsed;
}

function optionalPositive(value: string, label: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 999_999_999) {
    throw new Error(`${label} phải là số dương hợp lệ; hoặc để trống nếu chưa biết.`);
  }
  return parsed;
}

function electricityPrice(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = money(value, "Giá điện/kWh");
  if (parsed === 0) throw new Error("Giá điện/kWh phải lớn hơn 0.");
  return parsed;
}

function validateDraft(draft: CostSettingsDraft): ProductionCostSettings {
  return {
    filamentPricePerKg: money(draft.filamentPricePerKg, "Giá nhựa/kg"),
    averagePrinterPowerWatts: optionalPositive(draft.averagePrinterPowerWatts, "Công suất máy"),
    electricityPricePerKwh: electricityPrice(draft.electricityPricePerKwh),
    packagingCostPerOrder: money(draft.packagingCostPerOrder, "Chi phí đóng gói/đơn"),
    shippingCostPerOrder: money(draft.shippingCostPerOrder, "Chi phí vận chuyển thực tế/đơn"),
  };
}

const inputClass =
  "mt-2 h-11 w-full rounded-xl border border-[#cfd6dd] bg-[#f7f9ff] px-3 font-normal outline-none focus:border-[#006397] disabled:opacity-60";

export default function ProductionCostSettingsEditor() {
  const [draft, setDraft] = useState<CostSettingsDraft>(() => toDraft(DEFAULT_PRODUCTION_COST_SETTINGS));
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoaded(false);
    setError("");
    setSuccess("");
    void loadProductionCostSettings()
      .then((settings) => {
        if (!active) return;
        setDraft(toDraft(settings));
        setLoaded(true);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(
          "Không tải được chi phí sản xuất. Kiểm tra migration Supabase và quyền admin: " +
          (cause instanceof Error ? cause.message : "Lỗi không xác định"),
        );
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  function change(field: Field, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setError("");
    setSuccess("");
  }

  async function save() {
    if (!loaded || loading || saving) return;
    setError("");
    setSuccess("");
    try {
      const validated = validateDraft(draft);
      setSaving(true);
      const saved = await saveProductionCostSettings(validated);
      setDraft(toDraft(saved));
      setSuccess("Đã lưu cấu hình chi phí sản xuất.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể lưu cấu hình chi phí.");
    } finally {
      setSaving(false);
    }
  }

  const electricityMissing =
    draft.averagePrinterPowerWatts.trim() === "" ||
    draft.electricityPricePerKwh.trim() === "";

  return (
    <article className="mt-7 rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">Cấu hình chi phí sản xuất (Cost)</h2>
      <p className="mt-2 text-sm leading-6 text-[#707881]">
        Dữ liệu riêng của quản trị viên. Giá nhựa và điện dùng để tính Cost theo
        số gram và thời gian in của mỗi sản phẩm. Phí đóng gói và chi phí vận chuyển
        thực tế là chi phí cho mỗi đơn hàng, tách biệt với phí ship thu của khách.
      </p>
      {loading ? (
        <p className="mt-4 text-sm text-[#707881]">Đang tải chi phí...</p>
      ) : !loaded ? (
        <button type="button" onClick={() => setRetry((count) => count + 1)}
          className="mt-4 rounded-xl bg-[#edf4ff] px-4 py-2 text-sm font-bold text-[#006397]">
          Tải lại cấu hình Cost
        </button>
      ) : null}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-bold">
          Giá nhựa (VND/kg)
          <input type="number" min="0" step="1" value={draft.filamentPricePerKg}
            disabled={!loaded || saving} onChange={(e) => change("filamentPricePerKg", e.target.value)}
            className={inputClass} />
        </label>
        <label className="text-sm font-bold">
          Công suất trung bình máy in (W)
          <input type="number" min="0.01" step="any" placeholder="VD: 120" value={draft.averagePrinterPowerWatts}
            disabled={!loaded || saving} onChange={(e) => change("averagePrinterPowerWatts", e.target.value)}
            className={inputClass} />
        </label>
        <label className="text-sm font-bold">
          Giá điện (VND/kWh)
          <input type="number" min="1" step="1" placeholder="VD: 2500" value={draft.electricityPricePerKwh}
            disabled={!loaded || saving} onChange={(e) => change("electricityPricePerKwh", e.target.value)}
            className={inputClass} />
        </label>
        <label className="text-sm font-bold">
          Chi phí đóng gói (VND/đơn)
          <input type="number" min="0" step="1" value={draft.packagingCostPerOrder}
            disabled={!loaded || saving} onChange={(e) => change("packagingCostPerOrder", e.target.value)}
            className={inputClass} />
        </label>
        <label className="text-sm font-bold">
          Chi phí vận chuyển thực tế (VND/đơn)
          <input type="number" min="0" step="1" value={draft.shippingCostPerOrder}
            disabled={!loaded || saving} onChange={(e) => change("shippingCostPerOrder", e.target.value)}
            className={inputClass} />
        </label>
      </div>
      {loaded && electricityMissing && (
        <p className="mt-4 text-sm font-semibold text-[#a43c12]">
          Chưa đủ công suất máy hoặc giá điện; tổng Cost sản xuất sẽ hiển thị chưa đủ dữ liệu,
          không tự tính tiền điện bằng 0.
        </p>
      )}
      <p className="mt-3 text-xs leading-5 text-[#707881]">
        Khi tính lợi nhuận, phí đóng gói và vận chuyển sẽ tính trên tất cả đơn hàng
        trong khoảng thời gian được chọn, không chỉ đơn hoàn tất.
      </p>
      {error && <p role="alert" className="mt-4 rounded-xl bg-[#fff0eb] p-3 text-sm text-[#a43c12]">{error}</p>}
      {success && <p role="status" className="mt-4 rounded-xl bg-[#eaf8f1] p-3 text-sm text-[#147a4f]">{success}</p>}
      <button type="button" disabled={!loaded || loading || saving} onClick={() => { void save(); }}
        className="mt-5 min-h-11 rounded-xl bg-[#006397] px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
        {saving ? "Đang lưu Cost..." : "Lưu cấu hình Cost"}
      </button>
      <p className="mt-2 text-xs text-[#707881]">
        Nút này lưu riêng chi phí sản xuất; không thay đổi các cài đặt cửa hàng khác.
      </p>
    </article>
  );
}

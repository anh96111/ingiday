/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from "react";
import {
  listProductProductionCostProfiles,
  loadProductionCostSettings,
  saveProductProductionCostProfiles,
} from "../../services/productCosts";
import type { StoredProductProductionCostProfile } from "../../services/productCosts";
import type { ProductVariantGroup } from "../../types/product";
import type { ProductionCostSettings } from "../../types/productCost";
import { formatCurrency } from "../../utils/currency";
import { calculateUnitProductionCost } from "../../utils/productionCost";
import { buildVariantImageCombinations } from "../../utils/variantImageMapping";

type CostDraft = { grams: string; hours: string; minutes: string };
type CostChoice = { label: string; selections: Record<string, string> };

function selectionKey(selections: Record<string, string>): string {
  return JSON.stringify(
    Object.keys(selections).sort().map((groupId) => [groupId, selections[groupId]]),
  );
}

function savedDraft(profile: StoredProductProductionCostProfile): CostDraft {
  return {
    grams: String(profile.filamentGrams),
    hours: String(Math.floor(profile.printMinutes / 60)),
    minutes: String(profile.printMinutes % 60),
  };
}

function toCostProfile(draft: CostDraft, selections: Record<string, string>) {
  const grams = Number(draft.grams);
  const hours = Number(draft.hours);
  const minutes = Number(draft.minutes);
  if (
    !draft.grams.trim() || !draft.hours.trim() || !draft.minutes.trim() ||
    !Number.isFinite(grams) || grams < 0 ||
    !Number.isSafeInteger(hours) || hours < 0 ||
    !Number.isSafeInteger(minutes) || minutes < 0 || minutes >= 60 ||
    !Number.isSafeInteger(hours * 60 + minutes)
  ) {
    throw new Error("Nhập trọng lượng nhựa, giờ và phút hợp lệ (phút từ 0 đến 59).");
  }
  return {
    selections,
    filamentGrams: grams,
    printMinutes: hours * 60 + minutes,
  };
}

function costChoices(groups: ProductVariantGroup[]): {
  choices: CostChoice[];
  exceeded: boolean;
} {
  const valid = groups.filter(
    (group) => group.name.trim() && group.options.some((option) => option.label.trim()),
  );
  if (valid.length === 0) {
    return { choices: [{ label: "Sản phẩm mặc định", selections: {} }], exceeded: false };
  }
  if (valid.length === 1) {
    const group = valid[0];
    return {
      choices: group.options.filter((option) => option.label.trim()).map((option) => ({
        label: `${group.name}: ${option.label}`,
        selections: { [group.id]: option.id },
      })),
      exceeded: false,
    };
  }
  const { combinations, exceeded } = buildVariantImageCombinations(valid, 120);
  return { choices: combinations, exceeded };
}

export default function ProductProductionCostEditor({
  productId,
  variantGroups,
  disabled = false,
}: {
  productId: string | null;
  variantGroups: ProductVariantGroup[];
  disabled?: boolean;
}) {
  const [settings, setSettings] = useState<ProductionCostSettings | null>(null);
  const [profiles, setProfiles] = useState<StoredProductProductionCostProfile[]>([]);
  const [drafts, setDrafts] = useState<Record<string, CostDraft>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const { choices, exceeded } = useMemo(
    () => costChoices(variantGroups),
    [variantGroups],
  );

  useEffect(() => {
    let active = true;
    setError("");
    setNotice("");
    setSettings(null);
    setProfiles([]);
    setDrafts({});
    if (!productId) {
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    void Promise.all([
      loadProductionCostSettings(),
      listProductProductionCostProfiles(productId),
    ])
      .then(([nextSettings, nextProfiles]) => {
        if (!active) return;
        const nextDrafts: Record<string, CostDraft> = {};
        for (const profile of nextProfiles) {
          nextDrafts[selectionKey(profile.selections)] = savedDraft(profile);
        }
        setSettings(nextSettings);
        setProfiles(nextProfiles);
        setDrafts(nextDrafts);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            "Không tải được cấu hình Cost. Kiểm tra migration Supabase và quyền admin: " +
            (cause instanceof Error ? cause.message : "Lỗi không xác định"),
          );
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [productId]);

  function changeDraft(key: string, part: keyof CostDraft, value: string) {
    setNotice("");
    setError("");
    setDrafts((previous) => ({
      ...previous,
      [key]: {
        ...(previous[key] ?? { grams: "", hours: "", minutes: "" }),
        [part]: value,
      },
    }));
  }

  async function saveAll() {
    if (!productId || !settings || saving || disabled || loading || exceeded) return;
    setError("");
    setNotice("");
    try {
      // Validate every filled row before sending a SINGLE atomic upsert request.
      // Completely empty rows are skipped; old saved rows are not deleted.
      const toSave = choices.flatMap((choice) => {
        const draft = drafts[selectionKey(choice.selections)] ?? {
          grams: "", hours: "", minutes: "",
        };
        if (!draft.grams.trim() && !draft.hours.trim() && !draft.minutes.trim()) {
          return [];
        }
        try {
          return [toCostProfile(draft, choice.selections)];
        } catch (cause) {
          throw new Error(`${choice.label}: ${cause instanceof Error ? cause.message : "Cost không hợp lệ"}`, { cause });
        }
      });
      if (toSave.length === 0) {
        throw new Error("Chưa nhập Cost cho lựa chọn nào.");
      }
      setSaving(true);
      const saved = await saveProductProductionCostProfiles(productId, toSave);
      const savedKeys = new Set(saved.map((item) => selectionKey(item.selections)));
      setProfiles((previous) => [
        ...previous.filter((item) => !savedKeys.has(selectionKey(item.selections))),
        ...saved,
      ]);
      setDrafts((previous) => {
        const next = { ...previous };
        for (const item of saved) next[selectionKey(item.selections)] = savedDraft(item);
        return next;
      });
      setNotice(`Đã lưu Cost cho ${saved.length} lựa chọn.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể lưu Cost sản phẩm.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">Chi phí sản xuất (Cost)</h2>
      <p className="mt-2 text-sm leading-6 text-[#707881]">
        Dùng riêng trong quản trị. Nhập lượng nhựa và thời gian in cho mỗi lựa chọn
        đã lưu. Nhập nhiều lựa chọn và bấm "Lưu toàn bộ Cost" một lần.
      </p>
      {!productId ? (
        <p className="mt-4 rounded-xl bg-[#edf4ff] p-4 text-sm text-[#006397]">
          Hãy tạo sản phẩm trước, sau đó mở lại trang sửa sản phẩm để nhập Cost.
        </p>
      ) : (
        <>
          <p className="mt-3 text-xs leading-5 text-[#707881]">
            Nếu vừa sửa nhóm hoặc lựa chọn biến thể ở phía trên, hãy lưu sản phẩm trước,
            rồi mở lại trang này để gắn Cost theo đúng tổ hợp mới.
          </p>
          {loading && <p className="mt-4 text-sm text-[#707881]">Đang tải Cost...</p>}
          {error && <p role="alert" className="mt-4 rounded-xl bg-[#fff0eb] p-3 text-sm text-[#a43c12]">{error}</p>}
          {notice && <p role="status" className="mt-4 rounded-xl bg-[#eaf8f1] p-3 text-sm text-[#147a4f]">{notice}</p>}
          {exceeded && (
            <p className="mt-4 rounded-xl bg-[#fff0eb] p-3 text-sm text-[#a43c12]">
              Sản phẩm có hơn 120 tổ hợp biến thể. Chưa thể nhập Cost ở đây.
            </p>
          )}
          {settings && !loading && !exceeded && (
            <>
              <p className="mt-4 text-xs text-[#596175]">
                Giá nhựa: <strong>{formatCurrency(settings.filamentPricePerKg)}/kg</strong>.
                {settings.averagePrinterPowerWatts === null || settings.electricityPricePerKwh === null
                  ? " Chưa cấu hình đủ công suất máy hoặc giá điện; tổng Cost chưa thể tính đầy đủ."
                  : ` Điện: ${settings.averagePrinterPowerWatts}W × ${formatCurrency(settings.electricityPricePerKwh)}/kWh.`}
              </p>
              <div className="mt-4 space-y-4">
                {choices.map((choice) => {
                  const key = selectionKey(choice.selections);
                  const saved = profiles.find(
                    (item) => selectionKey(item.selections) === key,
                  );
                  const draft = drafts[key] ?? { grams: "", hours: "", minutes: "" };
                  let preview: ReturnType<typeof calculateUnitProductionCost> | null = null;
                  try {
                    preview = calculateUnitProductionCost(
                      toCostProfile(draft, choice.selections),
                      settings,
                    );
                  } catch { /* Empty and incomplete fields do not show a preview. */ }
                  return (
                    <div key={key} className="rounded-2xl border border-[#dce3ea] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-black text-[#172033]">{choice.label}</h3>
                        <span className="text-xs font-semibold text-[#667085]">
                          {saved ? "Đã có Cost" : "Chưa nhập Cost"}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <label className="text-xs font-bold text-[#596175]">
                          Nhựa (g)
                          <input type="number" min="0" step="0.01" value={draft.grams}
                            onChange={(event) => changeDraft(key, "grams", event.target.value)}
                            className="mt-1 h-11 w-full rounded-xl border border-[#cfd6dd] px-3 text-sm font-normal" />
                        </label>
                        <label className="text-xs font-bold text-[#596175]">
                          Giờ in
                          <input type="number" min="0" step="1" value={draft.hours}
                            onChange={(event) => changeDraft(key, "hours", event.target.value)}
                            className="mt-1 h-11 w-full rounded-xl border border-[#cfd6dd] px-3 text-sm font-normal" />
                        </label>
                        <label className="text-xs font-bold text-[#596175]">
                          Phút in
                          <input type="number" min="0" max="59" step="1" value={draft.minutes}
                            onChange={(event) => changeDraft(key, "minutes", event.target.value)}
                            className="mt-1 h-11 w-full rounded-xl border border-[#cfd6dd] px-3 text-sm font-normal" />
                        </label>
                      </div>
                      <div className="mt-3">
                        <p className="text-xs leading-5 text-[#596175]">
                          {preview
                            ? `Nhựa ${formatCurrency(preview.filamentCost)} · Điện ${preview.electricityCost === null ? "chưa cấu hình" : formatCurrency(preview.electricityCost)} · Tổng ${preview.totalCost === null ? "chưa đủ dữ liệu" : formatCurrency(preview.totalCost)}`
                            : "Nhập đủ số gram, giờ và phút để xem chi phí dự kiến."}
                        </p>

                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs leading-5 text-[#707881]">
                  Dòng để trống được bỏ qua; Cost đã lưu trước đó không bị xóa.
                  Dòng nhập thiếu thông tin sẽ được báo lỗi và không lưu dòng nào.
                </p>
                <button type="button" disabled={disabled || saving || loading}
                  onClick={() => { void saveAll(); }}
                  className="rounded-xl bg-[#006397] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
                  {saving ? "Đang lưu toàn bộ Cost..." : "Lưu toàn bộ Cost"}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </article>
  );
}

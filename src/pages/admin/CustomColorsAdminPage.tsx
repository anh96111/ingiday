import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import {
  createCustomOptionColor,
  disableCustomOptionColor,
  listCustomOptionColors,
  updateCustomOptionColor,
} from "../../services/customProductOptions";
import type {
  CustomOptionColor,
  CustomOptionColorInput,
} from "../../types/customProductOptions";

type ColorFormState = {
  id: string;
  name: string;
  imageUrl: string;
  colorHex: string;
  isActive: boolean;
  sortOrder: string;
};

const emptyForm: ColorFormState = {
  id: "",
  name: "",
  imageUrl: "",
  colorHex: "#ffffff",
  isActive: true,
  sortOrder: "0",
};

function formFromColor(color: CustomOptionColor): ColorFormState {
  return {
    id: color.id,
    name: color.name,
    imageUrl: color.imageUrl,
    colorHex: color.colorHex ?? "#ffffff",
    isActive: color.isActive,
    sortOrder: String(color.sortOrder),
  };
}

function inputFromForm(form: ColorFormState): CustomOptionColorInput {
  return {
    name: form.name.trim(),
    imageUrl: form.imageUrl.trim(),
    colorHex: form.colorHex.trim() || undefined,
    isActive: form.isActive,
    sortOrder: Math.max(0, Math.trunc(Number(form.sortOrder) || 0)),
  };
}

export default function CustomColorsAdminPage() {
  const [colors, setColors] = useState<CustomOptionColor[]>([]);
  const [form, setForm] = useState<ColorFormState>(emptyForm);
  const [includeInactive, setIncludeInactive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let ignore = false;

    listCustomOptionColors(includeInactive)
      .then((data) => {
        if (!ignore) {
          setColors(data);
        }
      })
      .catch((loadError: unknown) => {
        if (!ignore) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Không thể tải bảng màu custom.",
          );
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [includeInactive]);

  function resetForm() {
    setForm(emptyForm);
    setNotice("");
    setError("");
  }

  async function refreshColors() {
    const data = await listCustomOptionColors(includeInactive);
    setColors(data);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const input = inputFromForm(form);
    if (!input.name) {
      setError("Vui lòng nhập tên màu.");
      return;
    }

    if (!input.imageUrl) {
      setError("Vui lòng nhập URL ảnh màu.");
      return;
    }

    if (input.colorHex && !/^#[0-9A-Fa-f]{6}$/.test(input.colorHex)) {
      setError("Mã màu HEX phải có dạng #RRGGBB.");
      return;
    }

    setSaving(true);
    try {
      if (form.id) {
        await updateCustomOptionColor(form.id, input);
        setNotice("Đã cập nhật màu custom.");
      } else {
        await createCustomOptionColor(input);
        setNotice("Đã thêm màu custom.");
      }

      setForm(emptyForm);
      await refreshColors();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Không thể lưu màu custom.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDisable(colorId: string) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await disableCustomOptionColor(colorId);
      setNotice("Đã tắt màu custom.");
      await refreshColors();
      if (form.id === colorId) {
        setForm(emptyForm);
      }
    } catch (disableError) {
      setError(
        disableError instanceof Error
          ? disableError.message
          : "Không thể tắt màu custom.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#006397]">
            Custom Product Options
          </p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Bảng màu custom
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#707881]">
            Quản lý bảng màu có ảnh minh họa để gán riêng cho từng sản phẩm.
            Màu custom là miễn phí; chỉ custom text mới có phụ phí khi khách
            nhập nội dung.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[420px_1fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl bg-white p-6 shadow-sm"
        >
          <h2 className="text-xl font-black">
            {form.id ? "Sửa màu custom" : "Thêm màu custom"}
          </h2>

          <div className="mt-5 space-y-5">
            <label className="block text-sm font-bold">
              Tên màu <span className="text-[#a43c12]">*</span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="mt-2 h-12 w-full rounded-2xl border border-[#cfd6dd] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]"
                placeholder="Ví dụ: Hồng pastel"
              />
            </label>

            <label className="block text-sm font-bold">
              URL ảnh màu <span className="text-[#a43c12]">*</span>
              <input
                value={form.imageUrl}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    imageUrl: event.target.value,
                  }))
                }
                className="mt-2 h-12 w-full rounded-2xl border border-[#cfd6dd] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]"
                placeholder="https://..."
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
              <label className="block text-sm font-bold">
                Mã màu HEX
                <input
                  type="color"
                  value={form.colorHex}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      colorHex: event.target.value,
                    }))
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-[#cfd6dd] bg-[#f7f9ff] p-1"
                />
              </label>

              <label className="block text-sm font-bold">
                Thứ tự
                <input
                  type="number"
                  min="0"
                  value={form.sortOrder}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      sortOrder: event.target.value,
                    }))
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-[#cfd6dd] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]"
                />
              </label>
            </div>

            <label className="flex items-center gap-3 rounded-2xl bg-[#f7f9ff] p-4 text-sm font-bold">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
                className="h-5 w-5 accent-[#006397]"
              />
              Đang bật màu này
            </label>
          </div>

          {form.imageUrl && (
            <div className="mt-5 overflow-hidden rounded-3xl border border-[#dce3ea] bg-[#f7f9ff]">
              <img
                src={form.imageUrl}
                alt="Xem trước màu custom"
                className="aspect-video w-full object-cover"
              />
            </div>
          )}

          {error && (
            <p className="mt-5 rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm font-semibold text-[#a43c12]">
              {error}
            </p>
          )}

          {notice && (
            <p className="mt-5 rounded-2xl bg-[#edf8f1] px-4 py-3 text-sm font-semibold text-[#217a3d]">
              {notice}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="min-h-12 rounded-2xl bg-[#fe7e4f] px-6 font-bold text-white shadow-lg shadow-[#fe7e4f]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : form.id ? "Lưu thay đổi" : "Thêm màu"}
            </button>

            {form.id && (
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="min-h-12 rounded-2xl bg-[#edf4ff] px-6 font-bold text-[#006397] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Hủy sửa
              </button>
            )}
          </div>
        </form>

        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">Danh sách màu</h2>
              <p className="mt-1 text-sm text-[#707881]">
                Các màu này sẽ được chọn theo từng sản phẩm ở bước cấu hình sản
                phẩm.
              </p>
            </div>

            <label className="flex items-center gap-3 rounded-2xl bg-[#f7f9ff] px-4 py-3 text-sm font-bold">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(event) => {
                  setLoading(true);
                  setError("");
                  setIncludeInactive(event.target.checked);
                }}
                className="h-5 w-5 accent-[#006397]"
              />
              Hiện màu đã tắt
            </label>
          </div>

          {loading ? (
            <p className="mt-6 rounded-2xl bg-[#f7f9ff] p-6 text-sm text-[#707881]">
              Đang tải bảng màu...
            </p>
          ) : colors.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-[#bfc7d2] p-8 text-center text-sm text-[#707881]">
              Chưa có màu custom nào.
            </p>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {colors.map((color) => (
                <div
                  key={color.id}
                  className="overflow-hidden rounded-3xl border border-[#dce3ea] bg-[#f7f9ff]"
                >
                  <div className="relative">
                    <img
                      src={color.imageUrl}
                      alt={color.name}
                      className="aspect-video w-full object-cover"
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-black text-[#3f4850] shadow-sm">
                      Miễn phí
                    </span>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black">{color.name}</h3>
                        <p className="mt-1 text-xs font-semibold text-[#707881]">
                          Thứ tự: {color.sortOrder}
                        </p>
                      </div>

                      <span
                        className="h-9 w-9 rounded-full border border-[#dce3ea]"
                        style={{
                          backgroundColor: color.colorHex ?? "#ffffff",
                        }}
                        aria-hidden="true"
                      />
                    </div>

                    <p className="mt-3 text-xs font-semibold text-[#707881]">
                      {color.isActive ? "Đang bật" : "Đã tắt"}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setForm(formFromColor(color))}
                        disabled={saving}
                        className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#006397] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Sửa
                      </button>

                      {color.isActive && (
                        <button
                          type="button"
                          onClick={() => void handleDisable(color.id)}
                          disabled={saving}
                          className="rounded-xl bg-[#fff0eb] px-4 py-2 text-sm font-bold text-[#a43c12] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Tắt màu
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

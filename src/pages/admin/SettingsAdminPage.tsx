import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useSettings } from "../../features/settings/SettingsContext";
import type { StoreSettings } from "../../types/store";

type MessageType = "success" | "error";

export default function SettingsAdminPage() {
  const {
    settings,
    loading,
    error,
    refresh,
    updateSettings,
  } = useSettings();

  const [form, setForm] = useState<StoreSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<MessageType>("success");

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  function showMessage(text: string, type: MessageType) {
    setMessage(text);
    setMessageType(type);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!form.storeName.trim()) {
      showMessage("Vui lòng nhập tên cửa hàng.", "error");
      return;
    }

    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      showMessage("Email liên hệ không đúng định dạng.", "error");
      return;
    }

    if (
      form.messengerUrl.trim() &&
      !/^https?:\/\//i.test(form.messengerUrl.trim())
    ) {
      showMessage(
        "Link Messenger phải bắt đầu bằng http:// hoặc https://.",
        "error",
      );
      return;
    }

    if (
      !Number.isFinite(form.shippingFee) ||
      form.shippingFee < 0
    ) {
      showMessage("Phí vận chuyển không hợp lệ.", "error");
      return;
    }

    if (
      !Number.isFinite(form.freeShippingThreshold) ||
      form.freeShippingThreshold < 0
    ) {
      showMessage(
        "Mốc miễn phí vận chuyển không hợp lệ.",
        "error",
      );
      return;
    }

    if (
      !form.customPrintTitle.trim() ||
      !form.customPrintDescription.trim() ||
      !form.customPrintButtonText.trim()
    ) {
      showMessage(
        "Vui lòng nhập đủ nội dung chính của trang in riêng.",
        "error",
      );
      return;
    }

    setSaving(true);
    const result = await updateSettings(form);
    setSaving(false);

    showMessage(
      result.message,
      result.success ? "success" : "error",
    );
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#006397]">
            Cấu hình
          </p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Cài đặt cửa hàng
          </h1>
        </div>

        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-xl bg-[#edf4ff] px-4 py-3 text-sm font-bold text-[#006397]"
        >
          Làm mới
        </button>
      </div>

      {loading && (
        <p className="mt-5 rounded-2xl bg-[#edf4ff] px-4 py-3 text-sm font-semibold text-[#006397]">
          Đang tải cài đặt...
        </p>
      )}

      {error && (
        <p className="mt-5 rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm font-semibold text-[#a43c12]">
          {error}
        </p>
      )}

      <form onSubmit={submit} className="mt-7 space-y-6">
        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Thông tin chung</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-bold">
              Tên cửa hàng
              <input
                value={form.storeName}
                onChange={(event) =>
                  setForm({
                    ...form,
                    storeName: event.target.value,
                  })
                }
                className="mt-2 h-11 w-full rounded-xl border border-[#d7dee6] px-3 font-normal outline-none focus:border-[#006397]"
              />
            </label>

            <label className="text-sm font-bold">
              Số điện thoại
              <input
                value={form.phone}
                onChange={(event) =>
                  setForm({
                    ...form,
                    phone: event.target.value,
                  })
                }
                className="mt-2 h-11 w-full rounded-xl border border-[#d7dee6] px-3 font-normal outline-none focus:border-[#006397]"
                placeholder="0912345678"
              />
            </label>

            <label className="text-sm font-bold">
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({
                    ...form,
                    email: event.target.value,
                  })
                }
                className="mt-2 h-11 w-full rounded-xl border border-[#d7dee6] px-3 font-normal outline-none focus:border-[#006397]"
              />
            </label>

            <label className="text-sm font-bold">
              Link Messenger
              <input
                value={form.messengerUrl}
                onChange={(event) =>
                  setForm({
                    ...form,
                    messengerUrl: event.target.value,
                  })
                }
                className="mt-2 h-11 w-full rounded-xl border border-[#d7dee6] px-3 font-normal outline-none focus:border-[#006397]"
                placeholder="https://m.me/..."
              />
            </label>

            <label className="text-sm font-bold md:col-span-2">
              Địa chỉ
              <input
                value={form.address}
                onChange={(event) =>
                  setForm({
                    ...form,
                    address: event.target.value,
                  })
                }
                className="mt-2 h-11 w-full rounded-xl border border-[#d7dee6] px-3 font-normal outline-none focus:border-[#006397]"
              />
            </label>

            <label className="text-sm font-bold md:col-span-2">
              Mô tả chân trang
              <textarea
                value={form.footerDescription}
                onChange={(event) =>
                  setForm({
                    ...form,
                    footerDescription: event.target.value,
                  })
                }
                className="mt-2 min-h-24 w-full rounded-xl border border-[#d7dee6] p-3 font-normal outline-none focus:border-[#006397]"
              />
            </label>
          </div>
        </article>

        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">
            Bán hàng và vận chuyển
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-bold">
              Phí vận chuyển mặc định
              <input
                type="number"
                min="0"
                step="1000"
                value={form.shippingFee}
                onChange={(event) =>
                  setForm({
                    ...form,
                    shippingFee: Number(event.target.value),
                  })
                }
                className="mt-2 h-11 w-full rounded-xl border border-[#d7dee6] px-3 font-normal outline-none focus:border-[#006397]"
              />
            </label>

            <label className="text-sm font-bold">
              Miễn phí vận chuyển từ
              <input
                type="number"
                min="0"
                step="1000"
                value={form.freeShippingThreshold}
                onChange={(event) =>
                  setForm({
                    ...form,
                    freeShippingThreshold: Number(
                      event.target.value,
                    ),
                  })
                }
                className="mt-2 h-11 w-full rounded-xl border border-[#d7dee6] px-3 font-normal outline-none focus:border-[#006397]"
              />
            </label>
          </div>

          <div className="mt-5 grid gap-3">
            <label className="flex items-center gap-3 text-sm font-bold">
              <input
                type="checkbox"
                checked={form.couponEnabled}
                onChange={(event) =>
                  setForm({
                    ...form,
                    couponEnabled: event.target.checked,
                  })
                }
                className="h-5 w-5"
              />
              Cho phép sử dụng mã giảm giá
            </label>

            <label className="flex items-center gap-3 text-sm font-bold">
              <input
                type="checkbox"
                checked={form.stockEnabled}
                onChange={(event) =>
                  setForm({
                    ...form,
                    stockEnabled: event.target.checked,
                  })
                }
                className="h-5 w-5"
              />
              Bật quản lý và tự động trừ tồn kho
            </label>
          </div>
        </article>

        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">
            Nội dung trang in riêng
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-bold md:col-span-2">
              Tiêu đề chính
              <input
                value={form.customPrintTitle}
                onChange={(event) =>
                  setForm({
                    ...form,
                    customPrintTitle: event.target.value,
                  })
                }
                className="mt-2 h-11 w-full rounded-xl border border-[#d7dee6] px-3 font-normal outline-none focus:border-[#006397]"
              />
            </label>

            <label className="text-sm font-bold md:col-span-2">
              Mô tả chính
              <textarea
                value={form.customPrintDescription}
                onChange={(event) =>
                  setForm({
                    ...form,
                    customPrintDescription: event.target.value,
                  })
                }
                className="mt-2 min-h-24 w-full rounded-xl border border-[#d7dee6] p-3 font-normal outline-none focus:border-[#006397]"
              />
            </label>

            <label className="text-sm font-bold md:col-span-2">
              Chữ trên nút Messenger
              <input
                value={form.customPrintButtonText}
                onChange={(event) =>
                  setForm({
                    ...form,
                    customPrintButtonText: event.target.value,
                  })
                }
                className="mt-2 h-11 w-full rounded-xl border border-[#d7dee6] px-3 font-normal outline-none focus:border-[#006397]"
              />
            </label>

            <label className="text-sm font-bold">
              Bước 1 — Tiêu đề
              <input
                value={form.customPrintStep1Title}
                onChange={(event) =>
                  setForm({
                    ...form,
                    customPrintStep1Title: event.target.value,
                  })
                }
                className="mt-2 h-11 w-full rounded-xl border border-[#d7dee6] px-3 font-normal outline-none"
              />
            </label>

            <label className="text-sm font-bold">
              Bước 1 — Mô tả
              <textarea
                value={form.customPrintStep1Description}
                onChange={(event) =>
                  setForm({
                    ...form,
                    customPrintStep1Description:
                      event.target.value,
                  })
                }
                className="mt-2 min-h-24 w-full rounded-xl border border-[#d7dee6] p-3 font-normal outline-none"
              />
            </label>

            <label className="text-sm font-bold">
              Bước 2 — Tiêu đề
              <input
                value={form.customPrintStep2Title}
                onChange={(event) =>
                  setForm({
                    ...form,
                    customPrintStep2Title: event.target.value,
                  })
                }
                className="mt-2 h-11 w-full rounded-xl border border-[#d7dee6] px-3 font-normal outline-none"
              />
            </label>

            <label className="text-sm font-bold">
              Bước 2 — Mô tả
              <textarea
                value={form.customPrintStep2Description}
                onChange={(event) =>
                  setForm({
                    ...form,
                    customPrintStep2Description:
                      event.target.value,
                  })
                }
                className="mt-2 min-h-24 w-full rounded-xl border border-[#d7dee6] p-3 font-normal outline-none"
              />
            </label>

            <label className="text-sm font-bold">
              Bước 3 — Tiêu đề
              <input
                value={form.customPrintStep3Title}
                onChange={(event) =>
                  setForm({
                    ...form,
                    customPrintStep3Title: event.target.value,
                  })
                }
                className="mt-2 h-11 w-full rounded-xl border border-[#d7dee6] px-3 font-normal outline-none"
              />
            </label>

            <label className="text-sm font-bold">
              Bước 3 — Mô tả
              <textarea
                value={form.customPrintStep3Description}
                onChange={(event) =>
                  setForm({
                    ...form,
                    customPrintStep3Description:
                      event.target.value,
                  })
                }
                className="mt-2 min-h-24 w-full rounded-xl border border-[#d7dee6] p-3 font-normal outline-none"
              />
            </label>
          </div>
        </article>

        {message && (
          <p
            className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
              messageType === "success"
                ? "bg-[#dcf8eb] text-[#14633d]"
                : "bg-[#fff0eb] text-[#a43c12]"
            }`}
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || loading}
          className="min-h-12 rounded-2xl bg-[#006397] px-7 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Đang lưu..." : "Lưu cài đặt"}
        </button>
      </form>
    </section>
  );
}
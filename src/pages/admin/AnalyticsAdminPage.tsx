/* eslint-disable react-hooks/set-state-in-effect */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  loadAdminRealtimeAnalytics,
} from "../../services/adminAnalytics";
import type {
  AdminRealtimeAnalytics,
} from "../../services/adminAnalytics";

const REFRESH_INTERVAL_MS = 60_000;

const eventLabels: Record<string, string> = {
  page_view: "Lượt xem trang",
  view_item: "Xem chi tiết sản phẩm",
  search: "Tìm kiếm trên website",
  add_to_cart: "Thêm vào giỏ hàng",
  begin_checkout: "Bắt đầu thanh toán",
  purchase: "Đặt hàng thành công",
};

const eventIcons: Record<string, string> = {
  page_view: "◫",
  view_item: "◎",
  search: "⌕",
  add_to_cart: "+",
  begin_checkout: "⇥",
  purchase: "✓",
};

const deviceLabels: Record<string, string> = {
  mobile: "Điện thoại",
  desktop: "Máy tính",
  tablet: "Máy tính bảng",
};

const numberFormatter = new Intl.NumberFormat("vi-VN");

function formatNumber(value: number) {
  return numberFormatter.format(
    Number.isFinite(value) ? value : 0,
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function linePath(values: number[]) {
  if (values.length === 0) {
    return "";
  }

  const width = 700;
  const height = 210;
  const max = Math.max(1, ...values);

  return values
    .map((value, index) => {
      const x =
        values.length === 1
          ? width / 2
          : (index / (values.length - 1)) * width;
      const y = height - (value / max) * (height - 18);

      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function StatCard({
  label,
  value,
  detail,
  icon,
  iconClass,
}: {
  label: string;
  value: number;
  detail: string;
  icon: string;
  iconClass: string;
}) {
  return (
    <article className="rounded-[22px] border border-[#e6ebf0] bg-white p-5 shadow-[0_12px_32px_rgba(9,29,46,0.07)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-extrabold text-[#64778a]">
          {label}
        </p>
        <span
          className={`grid h-10 w-10 place-items-center rounded-[14px] text-lg ${iconClass}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 text-3xl font-black tracking-tight text-[#091d2e]">
        {formatNumber(value)}
      </p>
      <p className="mt-1 text-xs text-[#64778a]">
        {detail}
      </p>
    </article>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-[22px] border border-[#e6ebf0] bg-white"
          />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-[22px] border border-[#e6ebf0] bg-white" />
    </div>
  );
}

export default function AnalyticsAdminPage() {
  const [data, setData] =
    useState<AdminRealtimeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadRealtime = useCallback(
    async (silent = false, signal?: AbortSignal) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const result = await loadAdminRealtimeAnalytics(
          signal,
        );
        setData(result);
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        ) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Không thể tải dữ liệu GA4 Realtime.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();

    void loadRealtime(false, controller.signal);

    const intervalId = window.setInterval(() => {
      void loadRealtime(true);
    }, REFRESH_INTERVAL_MS);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [loadRealtime]);

  const chartValues = useMemo(
    () => data?.activity.map((item) => item.activeUsers) ?? [],
    [data],
  );
  const chartPath = useMemo(
    () => linePath(chartValues),
    [chartValues],
  );
  const chartMax = Math.max(1, ...chartValues);
  const deviceTotal =
    data?.devices.reduce(
      (sum, item) => sum + item.activeUsers,
      0,
    ) ?? 0;
  const devicePercentages = (data?.devices ?? []).map(
    (item) => ({
      ...item,
      percentage:
        deviceTotal > 0
          ? Math.round((item.activeUsers / deviceTotal) * 100)
          : 0,
    }),
  );
  const mobilePercent =
    devicePercentages.find(
      (item) => item.category.toLowerCase() === "mobile",
    )?.percentage ?? 0;
  const desktopPercent =
    devicePercentages.find(
      (item) => item.category.toLowerCase() === "desktop",
    )?.percentage ?? 0;
  const maxPageViews = Math.max(
    1,
    ...(data?.pages.map((page) => page.views) ?? []),
  );
  const maxCityUsers = Math.max(
    1,
    ...(data?.cities.map((city) => city.activeUsers) ?? []),
  );

  return (
    <section className="space-y-5 text-[#091d2e]">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#006397]">
            Google Analytics 4
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">
            Phân tích thời gian thực
          </h1>
          <p className="mt-2 text-sm text-[#64778a]">
            Hoạt động trên website trong 30 phút gần nhất.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#c8ecde] bg-[#e9f8f2] px-4 py-2 text-xs font-black text-[#157552]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#1d9f6e]" />
            Đang trực tiếp
          </span>
          <button
            type="button"
            disabled={refreshing}
            onClick={() => void loadRealtime(true)}
            className="min-h-10 rounded-xl bg-[#091d2e] px-4 text-sm font-bold text-white transition hover:bg-[#163247] disabled:cursor-wait disabled:opacity-60"
          >
            {refreshing ? "Đang làm mới..." : "↻ Làm mới"}
          </button>
        </div>
      </header>

      {error && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#f3c5bb] bg-[#fff3ef] p-4 text-sm text-[#9a341f] sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadRealtime(false)}
            className="rounded-xl bg-white px-4 py-2 font-bold shadow-sm"
          >
            Thử lại
          </button>
        </div>
      )}

      {loading && !data ? (
        <LoadingState />
      ) : data ? (
        <>
          <div className="flex flex-col gap-2 rounded-2xl border border-[#dce3ea] bg-white px-4 py-3 text-xs text-[#64778a] sm:flex-row sm:items-center sm:justify-between">
            <span>
              Dữ liệu được bảo vệ trong khu vực Admin và tự làm mới mỗi 60 giây.
            </span>
            <span>
              Cập nhật lúc <strong>{formatTime(data.generatedAt)}</strong>
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Người dùng đang hoạt động"
              value={data.summary.activeUsers}
              detail="Người dùng riêng biệt trong 30 phút"
              icon="●"
              iconClass="bg-[#e9f8f2] text-[#1d9f6e]"
            />
            <StatCard
              label="Lượt xem trang"
              value={data.summary.screenPageViews}
              detail="Bao gồm các lượt xem lặp lại"
              icon="◫"
              iconClass="bg-[#e8f4fb] text-[#006397]"
            />
            <StatCard
              label="Tổng số sự kiện"
              value={data.summary.eventCount}
              detail="Tất cả sự kiện GA4 trong thời gian thực"
              icon="⌁"
              iconClass="bg-[#fff0ea] text-[#fe7e4f]"
            />
            <StatCard
              label="Sự kiện chính"
              value={data.summary.keyEvents}
              detail="Các sự kiện được đánh dấu quan trọng trong GA4"
              icon="◆"
              iconClass="bg-[#f0ecff] text-[#7257d6]"
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
            <article className="rounded-[22px] border border-[#e6ebf0] bg-white p-5 shadow-[0_12px_32px_rgba(9,29,46,0.07)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-black">
                    Người dùng hoạt động theo phút
                  </h2>
                  <p className="mt-1 text-xs text-[#64778a]">
                    Từ 29 phút trước đến phút hiện tại
                  </p>
                </div>
                <span className="text-xs font-bold text-[#64778a]">
                  Cao nhất: {formatNumber(chartMax)}
                </span>
              </div>
              <div className="mt-5 overflow-hidden rounded-2xl bg-[#fbfcfe] p-3">
                <svg
                  viewBox="0 0 700 240"
                  className="h-[260px] w-full"
                  role="img"
                  aria-label="Biểu đồ người dùng hoạt động theo phút"
                >
                  {[30, 75, 120, 165, 210].map((y) => (
                    <line
                      key={y}
                      x1="0"
                      x2="700"
                      y1={y}
                      y2={y}
                      stroke="#e7edf3"
                      strokeWidth="1"
                    />
                  ))}
                  {chartPath && (
                    <>
                      <path
                        d={`${chartPath} L700,220 L0,220 Z`}
                        fill="rgba(254,126,79,0.12)"
                      />
                      <path
                        d={chartPath}
                        fill="none"
                        stroke="#fe7e4f"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  )}
                  <text x="0" y="238" fontSize="11" fill="#8292a1">
                    29 phút trước
                  </text>
                  <text x="318" y="238" fontSize="11" fill="#8292a1">
                    15 phút trước
                  </text>
                  <text x="650" y="238" fontSize="11" fill="#8292a1">
                    Hiện tại
                  </text>
                </svg>
              </div>
            </article>

            <article className="rounded-[22px] border border-[#e6ebf0] bg-white p-5 shadow-[0_12px_32px_rgba(9,29,46,0.07)]">
              <h2 className="font-black">
                Sự kiện đang diễn ra
              </h2>
              <p className="mt-1 text-xs text-[#64778a]">
                Các hành động chính của cửa hàng
              </p>
              <div className="mt-4 divide-y divide-[#edf1f5]">
                {data.events.map((event) => (
                  <div
                    key={event.name}
                    className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 py-3"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf4ff] font-black text-[#006397]">
                      {eventIcons[event.name] ?? "•"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">
                        {event.name}
                      </p>
                      <p className="truncate text-xs text-[#64778a]">
                        {eventLabels[event.name] ?? "Sự kiện GA4"}
                      </p>
                    </div>
                    <strong>{formatNumber(event.count)}</strong>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <article className="overflow-hidden rounded-[22px] border border-[#e6ebf0] bg-white shadow-[0_12px_32px_rgba(9,29,46,0.07)]">
              <div className="p-5">
                <h2 className="font-black">
                  Trang đang được xem nhiều
                </h2>
                <p className="mt-1 text-xs text-[#64778a]">
                  GA4 Realtime cung cấp tên trang, người dùng và lượt xem
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] border-collapse">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.08em] text-[#778999]">
                      <th className="px-5 pb-3">Trang</th>
                      <th className="px-4 pb-3">Người dùng</th>
                      <th className="px-4 pb-3">Lượt xem</th>
                      <th className="px-5 pb-3">Tỷ trọng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pages.length > 0 ? (
                      data.pages.map((page) => (
                        <tr
                          key={`${page.name}-${page.views}`}
                          className="border-t border-[#edf1f5] text-sm"
                        >
                          <td className="max-w-[340px] px-5 py-4 font-bold">
                            <span className="block truncate">
                              {page.name}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            {formatNumber(page.activeUsers)}
                          </td>
                          <td className="px-4 py-4 font-black">
                            {formatNumber(page.views)}
                          </td>
                          <td className="px-5 py-4">
                            <div className="h-2 w-28 overflow-hidden rounded-full bg-[#edf2f6]">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#fe7e4f] to-[#ffad86]"
                                style={{
                                  width: `${Math.max(4, (page.views / maxPageViews) * 100)}%`,
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-5 py-8 text-center text-sm text-[#64778a]"
                        >
                          Chưa có lượt xem trang trong 30 phút gần nhất.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="rounded-[22px] border border-[#e6ebf0] bg-white p-5 shadow-[0_12px_32px_rgba(9,29,46,0.07)]">
              <h2 className="font-black">
                Thiết bị và vị trí
              </h2>
              <p className="mt-1 text-xs text-[#64778a]">
                Phân bổ người dùng đang hoạt động
              </p>

              <div className="mt-5 grid items-center gap-5 sm:grid-cols-[150px_1fr] xl:grid-cols-1 2xl:grid-cols-[150px_1fr]">
                <div
                  className="relative mx-auto h-36 w-36 rounded-full"
                  style={{
                    background: `conic-gradient(#fe7e4f 0 ${mobilePercent}%, #006397 ${mobilePercent}% ${mobilePercent + desktopPercent}%, #cad5df ${mobilePercent + desktopPercent}% 100%)`,
                  }}
                >
                  <div className="absolute inset-6 grid place-content-center rounded-full bg-white text-center">
                    <strong className="text-2xl font-black">
                      {formatNumber(deviceTotal)}
                    </strong>
                    <span className="text-[10px] text-[#64778a]">
                      người dùng
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {devicePercentages.map((device, index) => (
                    <div
                      key={device.category}
                      className="grid grid-cols-[10px_1fr_auto] items-center gap-2 text-xs"
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded ${index === 0 ? "bg-[#fe7e4f]" : index === 1 ? "bg-[#006397]" : "bg-[#cad5df]"}`}
                      />
                      <span>
                        {deviceLabels[device.category.toLowerCase()] ?? device.category}
                      </span>
                      <strong>{device.percentage}%</strong>
                    </div>
                  ))}
                  {devicePercentages.length === 0 && (
                    <p className="text-xs text-[#64778a]">
                      Chưa có dữ liệu thiết bị.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 border-t border-[#edf1f5] pt-5">
                <p className="text-xs font-black uppercase tracking-[0.08em] text-[#64778a]">
                  Thành phố
                </p>
                <div className="mt-3 space-y-4">
                  {data.cities.slice(0, 5).map((city) => (
                    <div key={`${city.city}-${city.country}`}>
                      <div className="flex items-center justify-between gap-4 text-xs">
                        <span className="truncate font-bold">
                          {city.city}
                          <span className="font-normal text-[#8292a1]">
                            {` · ${city.country}`}
                          </span>
                        </span>
                        <strong>{formatNumber(city.activeUsers)}</strong>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#edf2f6]">
                        <div
                          className="h-full rounded-full bg-[#006397]"
                          style={{
                            width: `${Math.max(4, (city.activeUsers / maxCityUsers) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {data.cities.length === 0 && (
                    <p className="text-xs text-[#64778a]">
                      Chưa có dữ liệu vị trí.
                    </p>
                  )}
                </div>
              </div>
            </article>
          </div>
        </>
      ) : null}
    </section>
  );
}

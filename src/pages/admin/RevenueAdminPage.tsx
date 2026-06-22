/* eslint-disable react-hooks/set-state-in-effect */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { formatCurrency } from "../../utils/currency";

const PAGE_SIZE = 50;

type DatePreset =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "custom";

type DateRange = {
  start: string;
  end: string;
};

type RevenueSummaryRow = {
  completed_orders: number | string;
  total_revenue: number | string;
};

type RevenueOrderRow = {
  id: string;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  subtotal: number | string;
  discount_amount: number | string;
  shipping_fee: number | string;
  total_amount: number | string;
  created_at: string;
  order_items:
    | Array<{
        quantity: number;
      }>
    | null;
};

type RevenueOrder = {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  itemQuantity: number;
  createdAt: string;
};

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function getPresetRange(
  preset: Exclude<DatePreset, "custom">,
): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (preset === "yesterday") {
    const yesterday = addDays(today, -1);

    return {
      start: toDateInput(yesterday),
      end: toDateInput(yesterday),
    };
  }

  if (preset === "last7") {
    return {
      start: toDateInput(addDays(today, -6)),
      end: toDateInput(today),
    };
  }

  if (preset === "last30") {
    return {
      start: toDateInput(addDays(today, -29)),
      end: toDateInput(today),
    };
  }

  if (preset === "thisMonth") {
    return {
      start: toDateInput(
        new Date(today.getFullYear(), today.getMonth(), 1),
      ),
      end: toDateInput(today),
    };
  }

  return {
    start: toDateInput(today),
    end: toDateInput(today),
  };
}

function dateRangeToIso(range: DateRange) {
  const startDate = new Date(`${range.start}T00:00:00`);
  const endExclusive = new Date(`${range.end}T00:00:00`);
  endExclusive.setDate(endExclusive.getDate() + 1);

  return {
    startIso: startDate.toISOString(),
    endExclusiveIso: endExclusive.toISOString(),
  };
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
  }).format(new Date(`${value}T00:00:00`));
}

function orderFromRow(row: RevenueOrderRow): RevenueOrder {
  return {
    id: row.id,
    code: row.order_code,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount_amount),
    shipping: Number(row.shipping_fee),
    total: Number(row.total_amount),
    itemQuantity: (row.order_items ?? []).reduce(
      (sum, item) => sum + Number(item.quantity),
      0,
    ),
    createdAt: row.created_at,
  };
}

export default function RevenueAdminPage() {
  const initialRange = useMemo(
    () => getPresetRange("today"),
    [],
  );

  const [preset, setPreset] = useState<DatePreset>("today");
  const [dateRange, setDateRange] =
    useState<DateRange>(initialRange);
  const [draftStart, setDraftStart] = useState(
    initialRange.start,
  );
  const [draftEnd, setDraftEnd] = useState(initialRange.end);

  const [completedOrders, setCompletedOrders] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [orders, setOrders] = useState<RevenueOrder[]>([]);

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const totalPages = Math.max(
    1,
    Math.ceil(completedOrders / PAGE_SIZE),
  );

  const loadRevenue = useCallback(async () => {
    if (!dateRange.start || !dateRange.end) {
      setError(
        "Vui lòng chọn đủ ngày bắt đầu và ngày kết thúc.",
      );
      return;
    }

    if (dateRange.start > dateRange.end) {
      setError(
        "Ngày bắt đầu không được lớn hơn ngày kết thúc.",
      );
      return;
    }

    setLoading(true);
    setError("");

    const { startIso, endExclusiveIso } =
      dateRangeToIso(dateRange);

    const firstRow = (page - 1) * PAGE_SIZE;
    const lastRow = firstRow + PAGE_SIZE - 1;

    const [summaryResult, listResult] = await Promise.all([
      supabase.rpc("get_revenue_summary", {
        p_start_at: startIso,
        p_end_at: endExclusiveIso,
      }),

      supabase
        .from("orders")
        .select(`
          id,
          order_code,
          customer_name,
          customer_phone,
          subtotal,
          discount_amount,
          shipping_fee,
          total_amount,
          created_at,
          order_items (
            quantity
          )
        `)
        .eq("status", "completed")
        .gte("created_at", startIso)
        .lt("created_at", endExclusiveIso)
        .order("created_at", { ascending: false })
        .range(firstRow, lastRow),
    ]);

    const queryError =
      summaryResult.error ?? listResult.error;

    if (queryError) {
      setCompletedOrders(0);
      setTotalRevenue(0);
      setOrders([]);
      setError(queryError.message);
      setLoading(false);
      return;
    }

    const summaryRows =
      (summaryResult.data ?? []) as RevenueSummaryRow[];
    const summary = summaryRows[0];

    setCompletedOrders(
      Number(summary?.completed_orders ?? 0),
    );
    setTotalRevenue(Number(summary?.total_revenue ?? 0));
    setOrders(
      (
        (listResult.data ?? []) as unknown as RevenueOrderRow[]
      ).map(orderFromRow),
    );

    setLoading(false);
  }, [dateRange, page]);

  useEffect(() => {
    void loadRevenue();
  }, [loadRevenue]);

  function applyPreset(
    nextPreset: Exclude<DatePreset, "custom">,
  ) {
    const nextRange = getPresetRange(nextPreset);

    setPreset(nextPreset);
    setDateRange(nextRange);
    setDraftStart(nextRange.start);
    setDraftEnd(nextRange.end);
    setPage(1);
  }

  function applyCustomRange() {
    if (!draftStart || !draftEnd) {
      setError(
        "Vui lòng chọn đủ ngày bắt đầu và ngày kết thúc.",
      );
      return;
    }

    if (draftStart > draftEnd) {
      setError(
        "Ngày bắt đầu không được lớn hơn ngày kết thúc.",
      );
      return;
    }

    setPreset("custom");
    setDateRange({
      start: draftStart,
      end: draftEnd,
    });
    setPage(1);
  }

  const presetButtons: Array<{
    id: Exclude<DatePreset, "custom">;
    label: string;
  }> = [
    { id: "today", label: "Hôm nay" },
    { id: "yesterday", label: "Hôm qua" },
    { id: "last7", label: "7 ngày" },
    { id: "last30", label: "30 ngày" },
    { id: "thisMonth", label: "Tháng này" },
  ];

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#006397]">
            Tài chính
          </p>

          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Doanh thu
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#707881]">
            Chỉ tính các đơn đang có trạng thái Thành công,
            lọc theo ngày tạo đơn.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadRevenue()}
          disabled={loading}
          className="rounded-xl bg-[#edf4ff] px-4 py-3 text-sm font-bold text-[#006397] disabled:opacity-60"
        >
          {loading ? "Đang tải..." : "Làm mới"}
        </button>
      </div>

      <div className="mt-7 rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {presetButtons.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => applyPreset(item.id)}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                preset === item.id
                  ? "bg-[#006397] text-white"
                  : "bg-[#edf4ff] text-[#006397]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <label className="text-sm font-bold">
            Từ ngày
            <input
              type="date"
              value={draftStart}
              onChange={(event) =>
                setDraftStart(event.target.value)
              }
              className="mt-2 h-11 w-full rounded-xl border border-[#d7dee6] px-3 font-normal outline-none focus:border-[#006397]"
            />
          </label>

          <label className="text-sm font-bold">
            Đến ngày
            <input
              type="date"
              value={draftEnd}
              onChange={(event) =>
                setDraftEnd(event.target.value)
              }
              className="mt-2 h-11 w-full rounded-xl border border-[#d7dee6] px-3 font-normal outline-none focus:border-[#006397]"
            />
          </label>

          <button
            type="button"
            onClick={applyCustomRange}
            className="min-h-11 self-end rounded-xl bg-[#203243] px-5 font-bold text-white"
          >
            Áp dụng
          </button>
        </div>

        <p className="mt-4 text-sm font-semibold text-[#3f4850]">
          Đang xem: {formatDateOnly(dateRange.start)} –{" "}
          {formatDateOnly(dateRange.end)}
        </p>
      </div>

      {error && (
        <p className="mt-5 rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm font-semibold text-[#a43c12]">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-[#707881]">
            Tổng doanh thu
          </p>
          <p className="mt-3 text-3xl font-black text-[#14633d] sm:text-4xl">
            {loading ? "…" : formatCurrency(totalRevenue)}
          </p>
        </article>

        <article className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-[#707881]">
            Đơn hoàn thành
          </p>
          <p className="mt-3 text-3xl font-black text-[#006397] sm:text-4xl">
            {loading ? "…" : completedOrders}
          </p>
        </article>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0f3] p-5">
          <div>
            <h2 className="text-xl font-black">
              Các đơn tạo ra doanh thu
            </h2>
            <p className="mt-1 text-sm text-[#707881]">
              Chỉ hiển thị đơn Thành công · Tối đa{" "}
              {PAGE_SIZE} đơn mỗi trang.
            </p>
          </div>

          <p className="text-sm font-bold text-[#3f4850]">
            Trang {page}/{totalPages}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#edf4ff] text-[#3f4850]">
              <tr>
                <th className="px-5 py-4">Mã đơn</th>
                <th className="px-5 py-4">Khách hàng</th>
                <th className="px-5 py-4">Số lượng</th>
                <th className="px-5 py-4">Tiền hàng</th>
                <th className="px-5 py-4">Giảm giá</th>
                <th className="px-5 py-4">Phí ship</th>
                <th className="px-5 py-4">Doanh thu</th>
                <th className="px-5 py-4">Ngày tạo</th>
                <th className="px-5 py-4 text-right">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#edf0f3]">
              {loading && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-12 text-center text-[#707881]"
                  >
                    Đang tải dữ liệu...
                  </td>
                </tr>
              )}

              {!loading &&
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-[#fafcff]"
                  >
                    <td className="px-5 py-4 font-black text-[#006397]">
                      {order.code}
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-bold text-[#091d2e]">
                        {order.customerName}
                      </p>
                      <p className="mt-1 text-xs text-[#707881]">
                        {order.customerPhone}
                      </p>
                    </td>

                    <td className="px-5 py-4 font-bold">
                      {order.itemQuantity}
                    </td>

                    <td className="px-5 py-4">
                      {formatCurrency(order.subtotal)}
                    </td>

                    <td className="px-5 py-4 text-[#a43c12]">
                      {order.discount > 0
                        ? `−${formatCurrency(order.discount)}`
                        : "0 ₫"}
                    </td>

                    <td className="px-5 py-4">
                      {order.shipping > 0
                        ? formatCurrency(order.shipping)
                        : "Miễn phí"}
                    </td>

                    <td className="px-5 py-4 font-black text-[#14633d]">
                      {formatCurrency(order.total)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-[#3f4850]">
                      {formatDateTime(order.createdAt)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        to={`/admin/don-hang/${order.code}`}
                        className="font-bold text-[#006397]"
                      >
                        Mở đơn
                      </Link>
                    </td>
                  </tr>
                ))}

              {!loading && orders.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-12 text-center text-[#707881]"
                  >
                    Không có đơn Thành công trong khoảng thời
                    gian này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && completedOrders > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-4 border-t border-[#edf0f3] p-5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() =>
                setPage((current) => Math.max(1, current - 1))
              }
              className="rounded-xl bg-[#edf4ff] px-4 py-2.5 text-sm font-bold text-[#006397] disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Trang trước
            </button>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) =>
                  Math.min(totalPages, current + 1),
                )
              }
              className="rounded-xl bg-[#006397] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trang sau →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
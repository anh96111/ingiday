/* eslint-disable react-hooks/set-state-in-effect */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import type { OrderStatus } from "../../types/store";
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

type DashboardOrderRow = {
  id: string;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number | string;
  status: OrderStatus;
  created_at: string;
  order_items:
    | Array<{
        quantity: number;
      }>
    | null;
};

type DashboardOrder = {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  total: number;
  status: OrderStatus;
  itemQuantity: number;
  createdAt: string;
};

const statusLabels: Record<OrderStatus, string> = {
  new: "Đơn mới",
  confirmed: "Đã xác nhận",
  preparing: "Đang chuẩn bị",
  shipping: "Đang giao",
  completed: "Thành công",
  cancelled: "Đã hủy",
};

const statusClasses: Record<OrderStatus, string> = {
  new: "bg-[#edf4ff] text-[#006397]",
  confirmed: "bg-[#fff1b8] text-[#7a5200]",
  preparing: "bg-[#ffe8dc] text-[#a43c12]",
  shipping: "bg-[#e7e4ff] text-[#493b9f]",
  completed: "bg-[#dcf8eb] text-[#14633d]",
  cancelled: "bg-[#fff0eb] text-[#a43c12]",
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

function getPresetRange(preset: Exclude<DatePreset, "custom">) {
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

function orderFromRow(row: DashboardOrderRow): DashboardOrder {
  return {
    id: row.id,
    code: row.order_code,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    total: Number(row.total_amount),
    status: row.status,
    itemQuantity: (row.order_items ?? []).reduce(
      (sum, item) => sum + Number(item.quantity),
      0,
    ),
    createdAt: row.created_at,
  };
}

export default function DashboardPage() {
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

  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [newOrders, setNewOrders] = useState(0);
  const [cancelledOrders, setCancelledOrders] = useState(0);

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const totalPages = Math.max(
    1,
    Math.ceil(totalOrders / PAGE_SIZE),
  );

  const loadDashboard = useCallback(async () => {
    if (!dateRange.start || !dateRange.end) {
      setError("Vui lòng chọn đủ ngày bắt đầu và ngày kết thúc.");
      return;
    }

    if (dateRange.start > dateRange.end) {
      setError("Ngày bắt đầu không được lớn hơn ngày kết thúc.");
      return;
    }

    setLoading(true);
    setError("");

    const { startIso, endExclusiveIso } =
      dateRangeToIso(dateRange);

    const firstRow = (page - 1) * PAGE_SIZE;
    const lastRow = firstRow + PAGE_SIZE - 1;

    const [
      totalResult,
      newResult,
      cancelledResult,
      listResult,
    ] = await Promise.all([
      supabase
        .from("orders")
        .select("id", {
          count: "exact",
          head: true,
        })
        .gte("created_at", startIso)
        .lt("created_at", endExclusiveIso),

      supabase
        .from("orders")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("status", "new")
        .gte("created_at", startIso)
        .lt("created_at", endExclusiveIso),

      supabase
        .from("orders")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("status", "cancelled")
        .gte("created_at", startIso)
        .lt("created_at", endExclusiveIso),

      supabase
        .from("orders")
        .select(`
          id,
          order_code,
          customer_name,
          customer_phone,
          total_amount,
          status,
          created_at,
          order_items (
            quantity
          )
        `)
        .gte("created_at", startIso)
        .lt("created_at", endExclusiveIso)
        .order("created_at", { ascending: false })
        .range(firstRow, lastRow),
    ]);

    const queryError =
      totalResult.error ??
      newResult.error ??
      cancelledResult.error ??
      listResult.error;

    if (queryError) {
      setOrders([]);
      setTotalOrders(0);
      setNewOrders(0);
      setCancelledOrders(0);
      setError(queryError.message);
      setLoading(false);
      return;
    }

    setTotalOrders(totalResult.count ?? 0);
    setNewOrders(newResult.count ?? 0);
    setCancelledOrders(cancelledResult.count ?? 0);
    setOrders(
      (
        (listResult.data ?? []) as unknown as DashboardOrderRow[]
      ).map(orderFromRow),
    );

    setLoading(false);
  }, [dateRange, page]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

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
      setError("Vui lòng chọn đủ ngày bắt đầu và ngày kết thúc.");
      return;
    }

    if (draftStart > draftEnd) {
      setError("Ngày bắt đầu không được lớn hơn ngày kết thúc.");
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
            Tổng quan
          </p>

          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Dashboard doanh số
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#707881]">
            Đơn đã hủy được thống kê theo ngày tạo đơn, không
            phải ngày chuyển sang trạng thái hủy.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadDashboard()}
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

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <article className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-[#707881]">
            Tổng đơn phát sinh
          </p>
          <p className="mt-3 text-3xl font-black text-[#091d2e]">
            {loading ? "…" : totalOrders}
          </p>
        </article>

        <article className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-[#707881]">
            Đơn mới chưa xử lý
          </p>
          <p className="mt-3 text-3xl font-black text-[#006397]">
            {loading ? "…" : newOrders}
          </p>
        </article>

        <article className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-[#707881]">
            Đơn đã hủy
          </p>
          <p className="mt-3 text-3xl font-black text-[#a43c12]">
            {loading ? "…" : cancelledOrders}
          </p>
        </article>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0f3] p-5">
          <div>
            <h2 className="text-xl font-black">
              Danh sách đơn trong khoảng đã chọn
            </h2>
            <p className="mt-1 text-sm text-[#707881]">
              Tối đa {PAGE_SIZE} đơn mỗi trang.
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
                <th className="px-5 py-4">Giá trị đơn</th>
                <th className="px-5 py-4">Trạng thái</th>
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
                    colSpan={7}
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

                    <td className="px-5 py-4 font-bold">
                      {formatCurrency(order.total)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          statusClasses[order.status]
                        }`}
                      >
                        {statusLabels[order.status]}
                      </span>
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
                    colSpan={7}
                    className="px-5 py-12 text-center text-[#707881]"
                  >
                    Không có đơn hàng trong khoảng thời gian này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalOrders > PAGE_SIZE && (
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
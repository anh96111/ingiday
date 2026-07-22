/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useOrders } from "../../features/orders/OrdersContext";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import type { OrderStatus, StoreOrder } from "../../types/store";
import { formatCurrency } from "../../utils/currency";
import {
  getUtmAttributionTitle,
  getUtmSecondaryLabel,
  getUtmSourceLabel,
} from "../../utils/utmAttribution";

const PAGE_SIZE = 50;

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

function shortOrderCode(code: string) {
  return code.length > 6 ? `${code.slice(0, 6)}…` : code;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function OrdersAdminPage() {
  const {
    orders,
    error,
    loadOrderPage,
    bulkUpdateOrderStatus,
    bulkDeleteOrders,
  } = useOrders();

  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageLoading, setPageLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<OrderStatus | "">("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageSuccess, setMessageSuccess] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const debouncedKeyword = useDebouncedValue(keyword, 350);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const loadOrderPageRef = useRef(loadOrderPage);

  useEffect(() => {
    loadOrderPageRef.current = loadOrderPage;
  }, [loadOrderPage]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, debouncedKeyword, status]);

  useEffect(() => {
    setSelectedIds([]);
  }, [dateFrom, dateTo, debouncedKeyword, page, status]);

  useEffect(() => {
    let active = true;
    setPageLoading(true);

    void loadOrderPageRef.current({
      page,
      pageSize: PAGE_SIZE,
      keyword: debouncedKeyword,
      status,
      dateFrom,
      dateTo,
    }).then((result) => {
      if (!active) return;

      if (!result.success || !result.data) {
        setMessageSuccess(false);
        setMessage(result.message);
        setPageLoading(false);
        return;
      }

      const nextTotalPages = Math.max(1, result.data.totalPages);
      if (page > nextTotalPages) {
        setPage(nextTotalPages);
        return;
      }

      setTotal(result.data.total);
      setPageLoading(false);
    });

    return () => {
      active = false;
    };
  }, [dateFrom, dateTo, debouncedKeyword, page, reloadToken, status]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const pageIds = useMemo(
    () =>
      orders
        .map((order) => order.id)
        .filter((id): id is string => Boolean(id)),
    [orders],
  );
  const allSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedSet.has(id));
  const someSelected =
    pageIds.some((id) => selectedSet.has(id)) && !allSelected;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, total);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  function toggleSelection(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function toggleSelectAll() {
    setSelectedIds((current) => {
      if (allSelected) {
        return current.filter((id) => !pageIds.includes(id));
      }

      return [...new Set([...current, ...pageIds])];
    });
  }

  async function handleBulkStatus() {
    if (!bulkStatus) {
      setMessageSuccess(false);
      setMessage("Vui lòng chọn trạng thái cần áp dụng.");
      return;
    }

    if (selectedIds.length === 0 || busy) return;

    setBusy(true);
    setMessage("");
    const result = await bulkUpdateOrderStatus(selectedIds, bulkStatus);
    setBusy(false);
    setMessageSuccess(result.success);
    setMessage(result.message);

    if (result.success) {
      setSelectedIds([]);
      setBulkStatus("");
      setReloadToken((current) => current + 1);
    }
  }

  async function handleDeleteSelected() {
    if (selectedIds.length === 0 || busy) return;

    const selectedOrders = orders.filter(
      (order) => order.id && selectedSet.has(order.id),
    );
    const includesActiveOrder = selectedOrders.some(
      (order) => order.status !== "completed" && order.status !== "cancelled",
    );
    const warning = includesActiveOrder
      ? "Các đơn chưa hoàn thành sẽ được hoàn tồn kho trước khi xóa."
      : "Thao tác này không thể hoàn tác.";

    if (
      !window.confirm(
        `Xóa ${selectedIds.length} đơn hàng đã chọn?\n\n${warning}`,
      )
    ) {
      return;
    }

    setBusy(true);
    setMessage("");
    const result = await bulkDeleteOrders(selectedIds);
    setBusy(false);
    setMessageSuccess(result.success);
    setMessage(result.message);

    if (result.success) {
      setSelectedIds([]);
      setReloadToken((current) => current + 1);
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#006397]">
            Đơn hàng
          </p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Quản lý đơn hàng
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setReloadToken((current) => current + 1)}
          disabled={pageLoading || busy}
          className="rounded-xl bg-[#edf4ff] px-4 py-3 text-sm font-bold text-[#006397] disabled:opacity-60"
        >
          Làm mới
        </button>
      </div>

      {error && (
        <p className="mt-5 rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm font-semibold text-[#a43c12]">
          {error}
        </p>
      )}

      {message && (
        <p
          className={`mt-5 rounded-2xl px-4 py-3 text-sm font-semibold ${
            messageSuccess
              ? "bg-[#dcf8eb] text-[#14633d]"
              : "bg-[#fff0eb] text-[#a43c12]"
          }`}
        >
          {message}
        </p>
      )}

      <div className="mt-7 grid gap-4 rounded-3xl bg-white p-4 shadow-sm lg:grid-cols-[1fr_220px_180px_180px]">
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          className="h-12 rounded-2xl border border-[#d7dee6] px-4 outline-none focus:border-[#006397]"
          placeholder="Mã đơn, tên hoặc SĐT"
        />

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as OrderStatus | "")}
          className="h-12 rounded-2xl border border-[#d7dee6] bg-white px-4 outline-none focus:border-[#006397]"
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <label className="text-xs font-bold text-[#3f4850]">
          Từ ngày
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="mt-1 h-9 w-full rounded-xl border border-[#d7dee6] px-3 font-normal outline-none"
          />
        </label>

        <label className="text-xs font-bold text-[#3f4850]">
          Đến ngày
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="mt-1 h-9 w-full rounded-xl border border-[#d7dee6] px-3 font-normal outline-none"
          />
        </label>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3e8ee] px-5 py-4">
          <p className="text-sm text-[#3f4850]">
            Hiển thị <strong>{firstItem}–{lastItem}</strong> trong{" "}
            <strong>{total}</strong> đơn hàng
          </p>

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="text-sm font-bold text-[#006397]">
                Đã chọn {selectedIds.length}/{orders.length}
              </span>
              <select
                value={bulkStatus}
                onChange={(event) =>
                  setBulkStatus(event.target.value as OrderStatus | "")
                }
                disabled={busy}
                className="h-10 rounded-xl border border-[#cfd6dd] bg-white px-3 text-sm outline-none disabled:opacity-60"
              >
                <option value="">Chọn trạng thái</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleBulkStatus()}
                disabled={busy}
                className="h-10 rounded-xl bg-[#006397] px-4 text-sm font-bold text-white disabled:opacity-60"
              >
                Áp dụng
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteSelected()}
                disabled={busy}
                className="h-10 rounded-xl bg-[#fff0eb] px-4 text-sm font-bold text-[#a43c12] disabled:opacity-60"
              >
                Xóa đã chọn
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1260px] w-full text-left text-sm">
            <thead className="bg-[#edf4ff] text-[#3f4850]">
              <tr>
                <th className="w-12 px-5 py-4">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    disabled={orders.length === 0 || pageLoading || busy}
                    aria-label="Chọn tất cả đơn hàng trên trang"
                    className="h-4 w-4 accent-[#006397]"
                  />
                </th>
                <th className="w-28 px-4 py-4">Mã đơn</th>
                <th className="w-48 px-4 py-4">UTM</th>
                <th className="px-5 py-4">Khách hàng</th>
                <th className="px-5 py-4">Sản phẩm</th>
                <th className="px-5 py-4">Tổng tiền</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4">Ngày tạo</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#edf0f3]">
              {pageLoading && (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-[#707881]">
                    Đang tải đơn hàng...
                  </td>
                </tr>
              )}

              {!pageLoading &&
                orders.map((order: StoreOrder) => {
                  const orderId = order.id;

                  return (
                    <tr key={order.code} className="hover:bg-[#fafcff]">
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          checked={Boolean(orderId && selectedSet.has(orderId))}
                          onChange={() => {
                            if (orderId) toggleSelection(orderId);
                          }}
                          disabled={!orderId || busy}
                          aria-label={`Chọn đơn hàng ${order.code}`}
                          className="h-4 w-4 accent-[#006397]"
                        />
                      </td>
                      <td className="px-4 py-4 font-black text-[#006397]">
                        <span
                          title={order.code}
                          aria-label={`Mã đơn đầy đủ: ${order.code}`}
                        >
                          {shortOrderCode(order.code)}
                        </span>
                      </td>
                      <td
                        className="max-w-48 px-4 py-4"
                        title={getUtmAttributionTitle(order.utmAttribution)}
                      >
                        <p className="truncate font-bold text-[#3f4850]">
                          {getUtmSourceLabel(order.utmAttribution)}
                        </p>
                        <p className="mt-1 truncate text-xs text-[#707881]">
                          {getUtmSecondaryLabel(order.utmAttribution)}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold">{order.customer.fullName}</p>
                        <p className="mt-1 text-xs text-[#707881]">
                          {order.customer.phone}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        {order.items.reduce(
                          (sum, item) => sum + item.quantity,
                          0,
                        )}
                      </td>
                      <td className="px-5 py-4 font-bold">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClasses[order.status]}`}
                        >
                          {statusLabels[order.status]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-[#3f4850]">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          to={`/admin/don-hang/${order.code}`}
                          className="inline-flex rounded-xl bg-[#edf4ff] px-4 py-2 font-bold text-[#006397]"
                        >
                          Chi tiết
                        </Link>
                      </td>
                    </tr>
                  );
                })}

              {!pageLoading && orders.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-[#707881]">
                    Không tìm thấy đơn hàng phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e3e8ee] px-5 py-4">
          <p className="text-sm text-[#707881]">
            Trang <strong>{page}</strong>/{totalPages} · 50 đơn hàng/trang
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || pageLoading || busy}
              className="rounded-xl bg-[#edf4ff] px-4 py-2 text-sm font-bold text-[#006397] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trang trước
            </button>
            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={page >= totalPages || pageLoading || busy}
              className="rounded-xl bg-[#edf4ff] px-4 py-2 text-sm font-bold text-[#006397] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trang sau
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

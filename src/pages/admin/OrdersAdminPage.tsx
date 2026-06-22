import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useOrders } from "../../features/orders/OrdersContext";
import type { OrderStatus } from "../../types/store";
import { formatCurrency } from "../../utils/currency";

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function OrdersAdminPage() {
  const { orders, loading, error, refresh } = useOrders();
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredOrders = useMemo(() => {
    const normalized = keyword.trim().toLocaleLowerCase("vi");

    return orders.filter((order) => {
      const matchesKeyword =
        !normalized ||
        order.code.toLocaleLowerCase("vi").includes(normalized) ||
        order.customer.fullName.toLocaleLowerCase("vi").includes(normalized) ||
        order.customer.phone.includes(normalized);
      const matchesStatus = !status || order.status === status;
      const createdAt = new Date(order.createdAt);
      const matchesFrom = !dateFrom || createdAt >= new Date(`${dateFrom}T00:00:00`);
      const matchesTo = !dateTo || createdAt <= new Date(`${dateTo}T23:59:59.999`);

      return matchesKeyword && matchesStatus && matchesFrom && matchesTo;
    });
  }, [dateFrom, dateTo, keyword, orders, status]);

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
          onClick={() => void refresh()}
          className="rounded-xl bg-[#edf4ff] px-4 py-3 text-sm font-bold text-[#006397]"
        >
          Làm mới
        </button>
      </div>

      {error && (
        <p className="mt-5 rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm font-semibold text-[#a43c12]">
          {error}
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
          onChange={(event) => setStatus(event.target.value)}
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
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#edf4ff] text-[#3f4850]">
              <tr>
                <th className="px-5 py-4">Mã đơn</th>
                <th className="px-5 py-4">Khách hàng</th>
                <th className="px-5 py-4">Sản phẩm</th>
                <th className="px-5 py-4">Tổng tiền</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4">Ngày tạo</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#edf0f3]">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-[#707881]">
                    Đang tải đơn hàng...
                  </td>
                </tr>
              )}

              {!loading &&
                filteredOrders.map((order) => (
                  <tr key={order.code} className="hover:bg-[#fafcff]">
                    <td className="px-5 py-4 font-black text-[#006397]">
                      {order.code}
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold">{order.customer.fullName}</p>
                      <p className="mt-1 text-xs text-[#707881]">
                        {order.customer.phone}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)}
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
                ))}

              {!loading && filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-[#707881]">
                    Không tìm thấy đơn hàng phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

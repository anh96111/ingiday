import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function OrderDetailPage() {
  const { code = "" } = useParams();
  const { getOrder, updateOrderStatus, loading } = useOrders();
  const order = getOrder(code);
  const [message, setMessage] = useState("");
  const [updating, setUpdating] = useState(false);

  if (loading) {
    return (
      <section className="rounded-3xl bg-white p-8 text-center shadow-sm">
        Đang tải đơn hàng...
      </section>
    );
  }

  if (!order) {
    return <Navigate to="/admin/don-hang" replace />;
  }

  async function handleStatus(nextStatus: OrderStatus) {
    if (!order || nextStatus === order.status || updating) return;

    setMessage("");
    setUpdating(true);
    const result = await updateOrderStatus(order.code, nextStatus);
    setUpdating(false);
    setMessage(result.message);
  }

  const address = [
    order.customer.addressDetail,
    order.customer.ward,
    order.customer.district,
    order.customer.province,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <section>
      <Link to="/admin/don-hang" className="text-sm font-bold text-[#006397]">
        ← Quay lại danh sách
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#006397]">
            Chi tiết đơn hàng
          </p>
          <h1 className="mt-2 text-3xl font-black">{order.code}</h1>
          <p className="mt-2 text-sm text-[#707881]">
            Tạo lúc {formatDate(order.createdAt)}
          </p>
        </div>

        <label className="text-sm font-bold">
          Trạng thái
          <select
            value={order.status}
            onChange={(event) =>
              void handleStatus(event.target.value as OrderStatus)
            }
            disabled={updating}
            className="ml-3 h-12 rounded-2xl border border-[#d7dee6] bg-white px-4 outline-none disabled:opacity-60"
          >
            <option value="new">Đơn mới</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="preparing">Đang chuẩn bị</option>
            <option value="shipping">Đang giao</option>
            <option value="completed">Thành công</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </label>
      </div>

      {message && (
        <p
          className={`mt-5 rounded-2xl px-4 py-3 text-sm font-semibold ${
            message.startsWith("Đã")
              ? "bg-[#dcf8eb] text-[#14633d]"
              : "bg-[#fff0eb] text-[#a43c12]"
          }`}
        >
          {message}
        </p>
      )}

      <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Sản phẩm</h2>

            <div className="mt-5 space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.key}
                  className="flex gap-4 rounded-2xl border border-[#edf0f3] p-4"
                >
                  <div
                    className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl text-3xl"
                    style={{ backgroundColor: item.background }}
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      item.emoji
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{item.name}</p>
                    {item.selectedVariants.length > 0 && (
                      <p className="mt-1 text-xs text-[#707881]">
                        {item.selectedVariants
                          .map(
                            (variant) =>
                              `${variant.groupName}: ${variant.optionLabel}`,
                          )
                          .join(" · ")}
                      </p>
                    )}
                    <p className="mt-2 text-sm">
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                    </p>
                  </div>

                  <strong>
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </strong>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Lịch sử trạng thái</h2>
            <div className="mt-5 space-y-3">
              {[...order.statusHistory].reverse().map((entry, index) => (
                <div
                  key={`${entry.changedAt}-${index}`}
                  className="flex items-center justify-between gap-4 rounded-2xl bg-[#f7f9ff] px-4 py-3"
                >
                  <span className="font-bold">{statusLabels[entry.status]}</span>
                  <span className="text-xs text-[#707881]">
                    {formatDate(entry.changedAt)}
                  </span>
                </div>
              ))}
            </div>
          </article>
        </div>

        <aside className="space-y-6">
          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Khách hàng</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-[#707881]">Họ tên</dt>
                <dd className="mt-1 font-bold">{order.customer.fullName}</dd>
              </div>
              <div>
                <dt className="text-[#707881]">Số điện thoại</dt>
                <dd className="mt-1 font-bold">{order.customer.phone}</dd>
              </div>
              <div>
                <dt className="text-[#707881]">Địa chỉ</dt>
                <dd className="mt-1 leading-6">{address}</dd>
              </div>
              {order.customer.note && (
                <div>
                  <dt className="text-[#707881]">Ghi chú</dt>
                  <dd className="mt-1 leading-6">{order.customer.note}</dd>
                </div>
              )}
            </dl>
          </article>

          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Thanh toán</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div className="flex justify-between">
                <dt>Tiền sản phẩm</dt>
                <dd className="font-bold">{formatCurrency(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-[#14633d]">
                  <dt>
                    Giảm giá {order.couponCode && `(${order.couponCode})`}
                  </dt>
                  <dd className="font-bold">
                    −{formatCurrency(order.discount)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt>Phí vận chuyển</dt>
                <dd className="font-bold">
                  {order.shipping === 0
                    ? "Miễn phí"
                    : formatCurrency(order.shipping)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-[#d7dee6] pt-4 text-base">
                <dt className="font-black">Tổng COD</dt>
                <dd className="font-black text-[#a43c12]">
                  {formatCurrency(order.total)}
                </dd>
              </div>
            </dl>
          </article>
        </aside>
      </div>
    </section>
  );
}

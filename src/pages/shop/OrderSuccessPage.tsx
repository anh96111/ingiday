import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { LocalOrder } from "../../types/cart";
import { formatCurrency } from "../../utils/currency";

function readLastOrder(): LocalOrder | null {
  try {
    const raw = sessionStorage.getItem("ingiday-last-order");
    return raw ? (JSON.parse(raw) as LocalOrder) : null;
  } catch {
    return null;
  }
}

export default function OrderSuccessPage() {
  const [searchParams] = useSearchParams();
  const [order] = useState<LocalOrder | null>(readLastOrder);
  const code = searchParams.get("ma") ?? order?.code ?? "";

  return (
    <section className="mx-auto max-w-4xl px-5 py-14">
      <div className="rounded-[32px] bg-white p-7 text-center shadow-[0_20px_55px_-30px_rgba(0,99,151,0.45)] sm:p-10">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[#dcf8eb] text-5xl">
          ✓
        </div>
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-[#14633d]">
          Đặt hàng thành công
        </p>
        <h1 className="mt-3 text-3xl font-black sm:text-4xl">
          Shop đã nhận được đơn hàng
        </h1>
        <p className="mx-auto mt-4 max-w-2xl leading-7 text-[#3f4850]">
          InGiDay sẽ kiểm tra và liên hệ xác nhận trước khi gửi hàng.
        </p>

        {code && (
          <div className="mx-auto mt-6 max-w-md rounded-2xl bg-[#edf4ff] p-5">
            <p className="text-sm text-[#3f4850]">Mã đơn hàng</p>
            <strong className="mt-2 block text-2xl tracking-wider text-[#006397]">
              {code}
            </strong>
          </div>
        )}

        {order && order.code === code && (
          <div className="mx-auto mt-7 max-w-xl rounded-3xl border border-[#bfc7d2]/60 p-5 text-left">
            <h2 className="font-black">Thông tin đơn hàng</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[#3f4850]">Người nhận</dt>
                <dd className="text-right font-semibold">
                  {order.customer.fullName}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#3f4850]">Số điện thoại</dt>
                <dd className="text-right font-semibold">
                  {order.customer.phone}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#3f4850]">Thanh toán</dt>
                <dd className="text-right font-semibold">COD</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-[#bfc7d2]/60 pt-3 text-base">
                <dt className="font-black">Tổng tiền</dt>
                <dd className="font-black text-[#a43c12]">
                  {formatCurrency(order.total)}
                </dd>
              </div>
            </dl>
          </div>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/san-pham"
            className="inline-flex min-h-12 items-center rounded-2xl bg-[#006397] px-7 font-bold text-white"
          >
            Tiếp tục mua sắm
          </Link>
          <Link
            to="/"
            className="inline-flex min-h-12 items-center rounded-2xl bg-[#edf4ff] px-7 font-bold text-[#006397]"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </section>
  );
}

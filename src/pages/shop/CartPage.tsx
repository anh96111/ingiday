import { Link } from "react-router-dom";
import { useCart } from "../../features/cart/CartContext";
import { useSettings } from "../../features/settings/SettingsContext";
import { formatCurrency } from "../../utils/currency";
import { calculateShipping } from "../../utils/shipping";

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const { settings } = useSettings();
  const shipping = calculateShipping(subtotal, settings.shippingFee, settings.freeShippingThreshold);
  const total = subtotal + shipping;
  const remainingForFreeShipping = Math.max(settings.freeShippingThreshold - subtotal, 0);
  const shippingProgress = settings.freeShippingThreshold > 0 ? Math.min((subtotal / settings.freeShippingThreshold) * 100, 100) : 100;

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-5xl px-5 py-20 text-center">
        <div className="text-7xl">🛒</div>
        <h1 className="mt-5 text-3xl font-black">Giỏ hàng đang trống</h1>
        <p className="mt-3 text-[#3f4850]">Hãy chọn một sản phẩm bạn thích.</p>
        <Link to="/san-pham" className="mt-6 inline-flex rounded-2xl bg-[#006397] px-6 py-3 font-bold text-white">Tiếp tục mua sắm</Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-16">
      <div><p className="text-sm font-bold uppercase tracking-[0.2em] text-[#006397]">Giỏ hàng</p><h1 className="mt-3 text-3xl font-black sm:text-4xl">Sản phẩm bạn đã chọn</h1></div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {items.map((item) => (
            <article key={item.key} className="grid gap-4 rounded-3xl bg-white p-4 shadow-sm sm:grid-cols-[120px_1fr_auto] sm:items-center sm:p-5">
              <Link to={`/san-pham/${item.slug}`} className="grid aspect-square place-items-center rounded-2xl text-5xl" style={{ backgroundColor: item.background }}>{item.emoji}</Link>
              <div>
                <Link to={`/san-pham/${item.slug}`} className="text-lg font-black text-[#091d2e] hover:text-[#006397]">{item.name}</Link>
                {item.selectedVariants.length > 0 && <p className="mt-2 text-sm text-[#707881]">{item.selectedVariants.map((variant) => `${variant.groupName}: ${variant.optionLabel}`).join(" · ")}</p>}
                <strong className="mt-3 block text-[#a43c12]">
                {item.selectedCustomOptions?.text && (
                  <div
                    data-custom-options-display="cart"
                    className="mt-2 space-y-1 rounded-2xl bg-[#f7f9ff] px-3 py-2 text-xs leading-5 text-[#3f4850]"
                  >
                    <p>
                      <span className="font-bold text-[#091d2e]">
                        {item.selectedCustomOptions.text.label}:
                      </span>{" "}
                      {item.selectedCustomOptions.text.value}
                    </p>
                    {item.selectedCustomOptions.color && (
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-[#091d2e]">
                          Màu chữ:
                        </span>
                        {item.selectedCustomOptions.color.imageUrl && (
                          <img
                            src={item.selectedCustomOptions.color.imageUrl}
                            alt=""
                            className="h-5 w-5 rounded-full object-cover"
                          />
                        )}
                        <span>{item.selectedCustomOptions.color.name}</span>
                        <span className="font-semibold text-[#14633d]">
                          miễn phí
                        </span>
                      </p>
                    )}
                    {item.selectedCustomOptions.text.priceDelta > 0 && (
                      <p className="font-semibold text-[#a43c12]">
                        Phụ phí text: +{formatCurrency(item.selectedCustomOptions.text.priceDelta)}
                      </p>
                    )}
                  </div>
                )}
                {formatCurrency(item.unitPrice)}</strong>
              </div>
              <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                <div className="flex h-11 items-center overflow-hidden rounded-xl border border-[#bfc7d2]">
                  <button type="button" onClick={() => updateQuantity(item.key, item.quantity - 1)} className="grid h-full w-10 place-items-center hover:bg-[#edf4ff]" aria-label="Giảm số lượng">−</button>
                  <span className="grid h-full min-w-10 place-items-center border-x border-[#bfc7d2] text-sm font-bold">{item.quantity}</span>
                  <button type="button" onClick={() => updateQuantity(item.key, item.quantity + 1)} className="grid h-full w-10 place-items-center hover:bg-[#edf4ff]" aria-label="Tăng số lượng">+</button>
                </div>
                <button type="button" onClick={() => removeItem(item.key)} className="text-sm font-semibold text-[#a43c12] hover:underline">Xóa</button>
              </div>
            </article>
          ))}
        </div>

        <aside className="h-fit rounded-3xl bg-white p-6 shadow-[0_15px_40px_-25px_rgba(0,99,151,0.45)] lg:sticky lg:top-28">
          <h2 className="text-xl font-black">Tóm tắt đơn hàng</h2>
          <div className="mt-5 rounded-2xl bg-[#edf4ff] p-4">
            {remainingForFreeShipping > 0 ? <p className="text-sm text-[#3f4850]">Mua thêm <strong className="text-[#006397]">{formatCurrency(remainingForFreeShipping)}</strong> để được miễn phí ship.</p> : <p className="text-sm font-bold text-[#14633d]">Bạn đã được miễn phí vận chuyển.</p>}
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[#006397] transition-all" style={{ width: `${shippingProgress}%` }} /></div>
          </div>
          <dl className="mt-6 space-y-4 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-[#3f4850]">Tiền sản phẩm</dt><dd className="font-bold">{formatCurrency(subtotal)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-[#3f4850]">Phí vận chuyển</dt><dd className="font-bold">{shipping === 0 ? "Miễn phí" : formatCurrency(shipping)}</dd></div>
            <div className="flex justify-between gap-4 border-t border-[#bfc7d2]/60 pt-4 text-base"><dt className="font-black">Tổng thanh toán</dt><dd className="font-black text-[#a43c12]">{formatCurrency(total)}</dd></div>
          </dl>
          <Link to="/thanh-toan" className="mt-6 inline-flex min-h-13 w-full items-center justify-center rounded-2xl bg-[#fe7e4f] px-6 font-bold text-white shadow-lg shadow-[#fe7e4f]/20">Tiến hành đặt hàng</Link>
          <Link to="/san-pham" className="mt-3 inline-flex min-h-11 w-full items-center justify-center text-sm font-bold text-[#006397]">Tiếp tục mua sắm</Link>
        </aside>
      </div>
    </section>
  );
}

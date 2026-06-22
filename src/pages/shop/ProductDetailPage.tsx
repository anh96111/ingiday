import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStoreData } from "../../features/admin/StoreDataContext";
import { useCart } from "../../features/cart/CartContext";
import type { SelectedVariant } from "../../types/cart";
import { formatCurrency } from "../../utils/currency";
import { optimizeCloudinaryUrl } from "../../lib/cloudinary";

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { products, loading, error } = useStoreData();
  const { addItem } = useCart();
  const product = products.find((item) => item.slug === slug && item.status !== "hidden");
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [selectedImageId, setSelectedImageId] = useState("");

  useEffect(() => {
    setQuantity(1);
    setSelections({});
    setMessage("");
    setSelectedImageId("");
  }, [slug]);

  const selectedVariants = useMemo<SelectedVariant[]>(() => {
    if (!product?.variantGroups) return [];
    return product.variantGroups.flatMap((group) => {
      const selectedOptionId = selections[group.id] ?? group.options[0]?.id;
      const option = group.options.find((item) => item.id === selectedOptionId);
      if (!option) return [];
      return [{
        groupId: group.id,
        groupName: group.name,
        optionId: option.id,
        optionLabel: option.label,
        priceDelta: option.priceDelta ?? 0,
        stock: option.stock,
      }];
    });
  }, [product, selections]);

  if (loading) {
    return <section className="mx-auto max-w-4xl px-5 py-20 text-center">Đang tải sản phẩm...</section>;
  }

  if (error) {
    return <section className="mx-auto max-w-4xl px-5 py-20 text-center font-semibold text-[#a43c12]">{error}</section>;
  }

  if (!product) {
    return (
      <section className="mx-auto max-w-4xl px-5 py-20 text-center">
        <div className="text-7xl">🔎</div>
        <h1 className="mt-5 text-3xl font-black">Không tìm thấy sản phẩm</h1>
        <Link to="/san-pham" className="mt-6 inline-flex rounded-2xl bg-[#006397] px-6 py-3 font-bold text-white">Quay lại cửa hàng</Link>
      </section>
    );
  }

  const currentProduct = product;
  const productImages = currentProduct.images ?? [];
  const primaryImage = productImages.find((image) => image.isPrimary) ?? productImages[0];
  const selectedImage = productImages.find((image) => image.id === selectedImageId) ?? primaryImage;
  const variantStocks = selectedVariants.map((variant) => variant.stock).filter((stock): stock is number => typeof stock === "number");
  const availableStock = currentProduct.status === "out_of_stock" ? 0 : (variantStocks.length > 0 ? Math.min(currentProduct.stock, ...variantStocks) : currentProduct.stock);
  const unitPrice = currentProduct.price + selectedVariants.reduce((sum, variant) => sum + variant.priceDelta, 0);

  function addToCart(goToCheckout: boolean) {
    if (availableStock <= 0) return;
    addItem(currentProduct, Math.min(quantity, availableStock), selectedVariants);
    if (goToCheckout) {
      navigate("/thanh-toan");
      return;
    }
    setMessage("Đã thêm sản phẩm vào giỏ hàng.");
    window.setTimeout(() => setMessage(""), 2200);
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 lg:px-16 lg:py-12">
      <div className="mb-6 text-sm text-[#707881]"><Link to="/san-pham" className="hover:text-[#006397]">Sản phẩm</Link><span className="px-2">/</span><span>{currentProduct.name}</span></div>
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          <div className="grid aspect-square place-items-center overflow-hidden rounded-[32px] text-[130px] shadow-[0_20px_55px_-30px_rgba(0,99,151,0.45)] sm:text-[180px]" style={{ backgroundColor: currentProduct.background }}>
            {selectedImage ? <img src={optimizeCloudinaryUrl(selectedImage.url, 1100)} alt={selectedImage.altText || currentProduct.name} className="h-full w-full object-cover" /> : currentProduct.emoji}
          </div>
          {productImages.length > 1 && (
            <div className="mt-4 grid grid-cols-5 gap-3">
              {productImages.map((image) => <button key={image.id} type="button" onClick={() => setSelectedImageId(image.id)} className={`aspect-square overflow-hidden rounded-2xl border-2 ${selectedImage?.id === image.id ? "border-[#006397]" : "border-transparent"}`}><img src={optimizeCloudinaryUrl(image.url, 220)} alt={image.altText || currentProduct.name} className="h-full w-full object-cover" loading="lazy" /></button>)}
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#006397]">{currentProduct.categoryName}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{currentProduct.name}</h1>
          <div className="mt-5 flex flex-wrap items-end gap-3"><strong className="text-3xl text-[#a43c12]">{formatCurrency(unitPrice)}</strong>{currentProduct.compareAtPrice && <span className="pb-1 text-[#707881] line-through">{formatCurrency(currentProduct.compareAtPrice)}</span>}</div>
          <p className="mt-6 leading-8 text-[#3f4850]">{currentProduct.description}</p>

          {currentProduct.variantGroups?.map((group) => {
            const selectedOptionId = selections[group.id] ?? group.options[0]?.id;
            return (
              <fieldset key={group.id} className="mt-7">
                <legend className="font-bold text-[#091d2e]">{group.name}</legend>
                <div className="mt-3 flex flex-wrap gap-3">
                  {group.options.map((option) => (
                    <label key={option.id} className="cursor-pointer">
                      <input type="radio" name={group.id} value={option.id} checked={selectedOptionId === option.id} onChange={() => { setSelections((current) => ({ ...current, [group.id]: option.id })); setQuantity(1); }} className="peer sr-only" />
                      <span className="inline-flex min-h-11 items-center rounded-2xl border border-[#bfc7d2] bg-white px-5 text-sm font-semibold transition peer-checked:border-[#006397] peer-checked:bg-[#d1e4fb] peer-checked:text-[#006397]">{option.label}{option.priceDelta ? ` (+${formatCurrency(option.priceDelta)})` : ""}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <div className="flex h-12 items-center overflow-hidden rounded-2xl border border-[#bfc7d2] bg-white">
              <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))} className="grid h-full w-12 place-items-center text-xl font-bold hover:bg-[#edf4ff]" aria-label="Giảm số lượng">−</button>
              <span className="grid h-full min-w-12 place-items-center border-x border-[#bfc7d2] font-bold">{quantity}</span>
              <button type="button" onClick={() => setQuantity((current) => Math.min(Math.max(availableStock, 1), current + 1))} className="grid h-full w-12 place-items-center text-xl font-bold hover:bg-[#edf4ff]" aria-label="Tăng số lượng">+</button>
            </div>
            <span className="text-sm text-[#3f4850]">{availableStock > 0 ? `Còn ${availableStock} sản phẩm` : "Tạm hết hàng"}</span>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => addToCart(false)} disabled={availableStock <= 0} className="min-h-13 rounded-2xl bg-[#fe7e4f] px-7 font-bold text-white shadow-lg shadow-[#fe7e4f]/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50">Thêm vào giỏ</button>
            <button type="button" onClick={() => addToCart(true)} disabled={availableStock <= 0} className="min-h-13 rounded-2xl bg-[#006397] px-7 font-bold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50">Mua ngay</button>
          </div>

          {message && <p className="mt-4 rounded-2xl bg-[#dcf8eb] px-4 py-3 text-sm font-semibold text-[#14633d]" role="status">{message}</p>}
          <div className="mt-7 grid gap-3 text-sm text-[#3f4850] sm:grid-cols-3"><div className="rounded-2xl bg-white p-4">📦 Đóng gói cẩn thận</div><div className="rounded-2xl bg-white p-4">💵 Thanh toán COD</div><div className="rounded-2xl bg-white p-4">🚚 Freeship từ 200k</div></div>
        </div>
      </div>
    </section>
  );
}

import { Link } from "react-router-dom";
import type { Product } from "../../types/product";
import { optimizeCloudinaryUrl } from "../../lib/cloudinary";
import { formatCurrency } from "../../utils/currency";

export default function ProductCard({ product }: { product: Product }) {
  const primaryImage = (product.images ?? []).find((image) => image.isPrimary) ?? (product.images ?? [])[0];

  return (
    <article className="group overflow-hidden rounded-3xl bg-white shadow-[0_15px_40px_-22px_rgba(0,99,151,0.45)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_-24px_rgba(0,99,151,0.55)]">
      <Link to={`/san-pham/${product.slug}`} className="block">
        <div className="relative grid aspect-square place-items-center overflow-hidden text-7xl sm:text-8xl" style={{ backgroundColor: product.background }}>
          {primaryImage ? (
            <img src={optimizeCloudinaryUrl(primaryImage.url, 700)} alt={primaryImage.altText || product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
          ) : (
            <span className="transition duration-500 group-hover:scale-110 group-hover:rotate-3" aria-hidden="true">{product.emoji}</span>
          )}
          {product.badge && <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[#a43c12] shadow-sm">{product.badge}</span>}
        </div>
        <div className="p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-[#707881]">{product.categoryName}</p>
          <h3 className="mt-2 min-h-12 text-base font-bold leading-6 text-[#091d2e] group-hover:text-[#006397]">{product.name}</h3>
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <strong className="text-lg text-[#a43c12]">{formatCurrency(product.price)}</strong>
            {product.compareAtPrice && <span className="text-sm text-[#707881] line-through">{formatCurrency(product.compareAtPrice)}</span>}
          </div>
        </div>
      </Link>
    </article>
  );
}

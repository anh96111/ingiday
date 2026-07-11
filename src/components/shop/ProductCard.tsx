import { Link } from "react-router-dom";
import {
  getCloudinarySrcSet,
  optimizeCloudinaryUrl,
} from "../../lib/cloudinary";
import type { Product } from "../../types/product";
import { formatCurrency } from "../../utils/currency";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export default function ProductCard({
  product,
}: {
  product: Product;
}) {
  const primaryImage =
    (product.images ?? []).find((image) => image.isPrimary) ??
    (product.images ?? [])[0];

  const isOutOfStock =
    product.status === "out_of_stock" || product.stock <= 0;

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[28px] border border-[rgba(88,63,80,0.07)] bg-white shadow-[0_14px_36px_rgba(86,53,74,0.07)] transition duration-300 ease-out hover:-translate-y-1.5 hover:border-[rgba(255,95,143,0.16)] hover:shadow-[0_24px_52px_rgba(86,53,74,0.12)]">
      <Link
        to={`/san-pham/${product.slug}`}
        className="flex h-full min-w-0 flex-col text-inherit no-underline focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-[rgba(255,95,143,0.28)]"
      >
        <div
          className="relative grid aspect-square place-items-center overflow-hidden"
          style={{
            backgroundColor: product.background || "var(--sf-cream)",
          }}
        >
          <span className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full border-2 border-white/50" />
          <span className="pointer-events-none absolute bottom-6 left-7 text-lg text-white/80">
            ✦
          </span>

          {primaryImage ? (
            <img
              src={optimizeCloudinaryUrl(primaryImage.url, 640)}
              srcSet={getCloudinarySrcSet(
                primaryImage.url,
                [320, 480, 640, 800],
              )}
              sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw"
              alt={primaryImage.altText || product.name}
              width="640"
              height="640"
              className="relative z-10 h-full w-full object-contain p-5 transition duration-500 ease-out group-hover:-translate-y-1 group-hover:scale-[1.025] sm:p-6"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span
              className="relative z-10 text-7xl drop-shadow-[0_14px_16px_rgba(77,53,67,0.12)] sm:text-8xl"
              aria-hidden="true"
            >
              {product.emoji}
            </span>
          )}

          {product.badge && (
            <span className="absolute left-3 top-3 z-20 rounded-full border border-white/80 bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-[var(--sf-pink-strong)] shadow-sm backdrop-blur">
              {product.badge}
            </span>
          )}

          {isOutOfStock && (
            <span className="absolute right-3 top-3 z-20 rounded-full bg-[var(--sf-ink)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-sm">
              Tạm hết hàng
            </span>
          )}

          {typeof product.soldQuantity === "number" &&
            product.soldQuantity > 0 && (
              <span className="absolute bottom-3 right-3 z-20 rounded-full border border-white/80 bg-white/88 px-3 py-1.5 text-[10px] font-bold text-[var(--sf-ink-soft)] shadow-sm backdrop-blur">
                Đã bán {product.soldQuantity}
              </span>
            )}
        </div>

        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--sf-pink-strong)]">
            {product.categoryName}
          </p>

          <h3 className="mt-2 line-clamp-2 min-h-12 text-[15px] font-black leading-6 tracking-[-0.02em] text-[var(--sf-ink)] sm:text-base">
            {product.name}
          </h3>

          <div className="mt-auto flex items-end justify-between gap-3 pt-4">
            <div className="min-w-0">
              <strong className="block text-lg font-black tracking-[-0.03em] text-[var(--sf-pink-strong)]">
                {formatCurrency(product.price)}
              </strong>

              {product.compareAtPrice && (
                <span className="mt-0.5 block text-xs text-[#9a909b] line-through">
                  {formatCurrency(product.compareAtPrice)}
                </span>
              )}
            </div>

            <span
              className="grid h-10 w-10 flex-none place-items-center rounded-full border border-[var(--sf-border)] bg-[var(--sf-paper)] text-[var(--sf-ink)] shadow-[0_6px_16px_rgba(86,53,74,0.06)] transition duration-300 ease-out group-hover:translate-x-1 group-hover:border-[var(--sf-pink)] group-hover:bg-[var(--sf-pink)] group-hover:text-white"
              aria-hidden="true"
            >
              <ArrowIcon />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

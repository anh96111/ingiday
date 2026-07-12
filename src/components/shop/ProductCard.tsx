import { Link } from "react-router-dom";

import {
  getCloudinarySrcSet,
  optimizeCloudinaryUrl,
} from "../../lib/cloudinary";
import type { Product } from "../../types/product";
import { formatCurrency } from "../../utils/currency";

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

type ProductCardVariant = "default" | "featured";

export default function ProductCard({
  product,
  variant = "default",
}: {
  product: Product;
  variant?: ProductCardVariant;
}) {
  const primaryImage =
    (product.images ?? []).find((image) => image.isPrimary) ??
    (product.images ?? [])[0];
  const isOutOfStock =
    product.status === "out_of_stock" || product.stock <= 0;
  const isFeatured = variant === "featured";
  const discountPercent =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(
          ((product.compareAtPrice - product.price) /
            product.compareAtPrice) *
            100,
        )
      : 0;

  return (
    <article
      className={
        isFeatured
          ? "group aspect-[7/10] min-w-0 overflow-hidden rounded-[24px] border border-[rgba(88,63,80,0.08)] bg-white shadow-[0_14px_34px_rgba(64,45,58,0.065)] transition duration-300 ease-out hover:-translate-y-1 hover:border-[rgba(255,95,143,0.16)] hover:shadow-[0_24px_54px_rgba(64,45,58,0.12)]"
          : "group flex h-full min-w-0 flex-col overflow-hidden rounded-[26px] border border-[rgba(88,63,80,0.08)] bg-white shadow-[0_14px_34px_rgba(64,45,58,0.065)] transition duration-300 ease-out hover:-translate-y-1 hover:border-[rgba(255,95,143,0.16)] hover:shadow-[0_24px_54px_rgba(64,45,58,0.12)]"
      }
    >
      <Link
        to={`/san-pham/${product.slug}`}
        className={
          isFeatured
            ? "grid h-full min-w-0 grid-rows-[7fr_3fr] text-inherit no-underline focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-[rgba(255,95,143,0.28)]"
            : "flex h-full min-w-0 flex-col text-inherit no-underline focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-[rgba(255,95,143,0.28)]"
        }
      >
        <div
          className={
            isFeatured
              ? "relative aspect-square min-h-0 overflow-hidden bg-[#f6f2f3]"
              : "relative aspect-[4/3] overflow-hidden bg-[#f6f2f3]"
          }
        >
          {primaryImage ? (
            <img
              src={optimizeCloudinaryUrl(primaryImage.url, 800)}
              srcSet={getCloudinarySrcSet(
                primaryImage.url,
                [320, 480, 640, 800, 960],
              )}
              sizes="(max-width: 639px) 100vw, (max-width: 899px) 50vw, (max-width: 1179px) 33vw, 20vw"
              alt={primaryImage.altText || product.name}
              width="800"
              height="600"
              className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.035]"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span
              className="grid h-full w-full place-items-center text-7xl drop-shadow-[0_14px_16px_rgba(77,53,67,0.12)] sm:text-8xl"
              aria-hidden="true"
            >
              {product.emoji}
            </span>
          )}

          <span className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-[linear-gradient(to_top,rgba(31,22,28,0.16),transparent)]" />

          {(product.badge || discountPercent > 0) && (
            <span className="absolute left-3 top-3 z-20 rounded-full border border-white/80 bg-white/92 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-[var(--sf-pink-strong)] shadow-[0_7px_18px_rgba(49,35,44,0.12)] backdrop-blur">
              {product.badge || `-${discountPercent}%`}
            </span>
          )}

          {isOutOfStock && (
            <span className="absolute right-3 top-3 z-20 rounded-full bg-[var(--sf-ink)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-sm">
              Tạm hết hàng
            </span>
          )}

          {typeof product.soldQuantity === "number" &&
            product.soldQuantity > 0 && (
              <span className="absolute bottom-3 right-3 z-20 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-[10px] font-bold text-[var(--sf-ink-soft)] shadow-sm backdrop-blur">
                Đã bán {product.soldQuantity}
              </span>
            )}
        </div>

        <div
          className={
            isFeatured
              ? "flex min-h-0 flex-col px-3 pb-3 pt-2.5"
              : "flex flex-1 flex-col px-4 pb-4 pt-4 sm:px-5 sm:pb-5"
          }
        >
          <p
            className={
              isFeatured
                ? "text-[8px] font-black uppercase tracking-[0.14em] text-[var(--sf-pink-strong)]"
                : "text-[10px] font-black uppercase tracking-[0.16em] text-[var(--sf-pink-strong)]"
            }
          >
            {product.categoryName}
          </p>

          <h3
            className={
              isFeatured
                ? "mt-1 line-clamp-2 text-[12px] font-extrabold leading-[1.32] tracking-[-0.02em] text-[var(--sf-ink)]"
                : "mt-2 line-clamp-2 min-h-12 text-[15px] font-black leading-6 tracking-[-0.025em] text-[var(--sf-ink)] sm:text-base"
            }
          >
            {product.name}
          </h3>

          <div
            className={
              isFeatured
                ? "mt-auto flex items-end justify-between gap-2 pt-1.5"
                : "mt-auto flex items-end justify-between gap-3 pt-4"
            }
          >
            <div className="min-w-0">
              <strong
                className={
                  isFeatured
                    ? "block text-[15px] font-black leading-none tracking-[-0.035em] text-[var(--sf-pink-strong)]"
                    : "block text-lg font-black tracking-[-0.035em] text-[var(--sf-pink-strong)]"
                }
              >
                {formatCurrency(product.price)}
              </strong>

              {product.compareAtPrice && (
                <span
                  className={
                    isFeatured
                      ? "mt-1 block text-[9px] leading-none text-[#9a909b] line-through"
                      : "mt-0.5 block text-xs text-[#9a909b] line-through"
                  }
                >
                  {formatCurrency(product.compareAtPrice)}
                </span>
              )}
            </div>

            <span
              className={
                isFeatured
                  ? "grid h-8 w-8 flex-none place-items-center rounded-full border border-[rgba(255,95,143,0.22)] bg-[#fff8fa] text-[var(--sf-pink-strong)] shadow-[0_7px_18px_rgba(86,53,74,0.06)] transition duration-300 ease-out group-hover:translate-x-1 group-hover:border-[var(--sf-pink)] group-hover:bg-[var(--sf-pink)] group-hover:text-white"
                  : "grid h-10 w-10 flex-none place-items-center rounded-full border border-[rgba(255,95,143,0.22)] bg-[#fff8fa] text-[var(--sf-pink-strong)] shadow-[0_7px_18px_rgba(86,53,74,0.06)] transition duration-300 ease-out group-hover:translate-x-1 group-hover:border-[var(--sf-pink)] group-hover:bg-[var(--sf-pink)] group-hover:text-white"
              }
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
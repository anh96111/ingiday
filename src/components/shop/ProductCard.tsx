import { Link } from "react-router-dom";

import {
  getCloudinarySrcSet,
  optimizeCloudinaryUrl,
} from "../../lib/cloudinary";
import type { Product } from "../../types/product";
import { formatCurrency } from "../../utils/currency";

export default function ProductCard({
  product,
}: {
  product: Product;
}) {
  const primaryImage =
    (product.images ?? []).find(
      (image) => image.isPrimary,
    ) ?? (product.images ?? [])[0];

  return (
    <article className="group overflow-hidden rounded-3xl bg-white shadow-[0_15px_40px_-22px_rgba(0,99,151,0.45)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_-24px_rgba(0,99,151,0.55)]">
      <Link
        to={`/san-pham/${product.slug}`}
        className="block"
      >
        <div
          className="relative grid aspect-square place-items-center overflow-hidden text-7xl sm:text-8xl"
          style={{
            backgroundColor: product.background,
          }}
        >
          {primaryImage ? (
            <img
              src={optimizeCloudinaryUrl(
                primaryImage.url,
                640,
              )}
              srcSet={getCloudinarySrcSet(
                primaryImage.url,
                [320, 480, 640, 800],
              )}
              sizes="(max-width: 639px) 50vw, (max-width: 1023px) 50vw, 25vw"
              alt={
                primaryImage.altText ||
                product.name
              }
              width="640"
              height="640"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span aria-hidden="true">
              {product.emoji}
            </span>
          )}

          {product.badge && (
            <span className="absolute left-3 top-3 rounded-full bg-[#fe7e4f] px-3 py-1 text-xs font-black text-white shadow-sm">
              {product.badge}
            </span>
          )}

          {typeof product.soldQuantity ===
            "number" &&
            product.soldQuantity > 0 && (
              <span className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[#3f4850] backdrop-blur">
                Đã bán {product.soldQuantity}
              </span>
            )}
        </div>

        <div className="p-5">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#006397]">
            {product.categoryName}
          </p>

          <h3 className="mt-2 line-clamp-2 min-h-12 text-base font-black leading-6 text-[#091d2e]">
            {product.name}
          </h3>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <strong className="text-lg text-[#a43c12]">
              {formatCurrency(product.price)}
            </strong>

            {product.compareAtPrice && (
              <span className="text-sm text-[#8b949d] line-through">
                {formatCurrency(
                  product.compareAtPrice,
                )}
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
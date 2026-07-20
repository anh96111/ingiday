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
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
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
      className={`sf-product-card${
        variant === "featured" ? " sf-product-card--featured" : ""
      }`}
    >
      <Link
        to={`/san-pham/${product.slug}`}
        className="sf-product-card__link"
      >
        <div className="sf-product-card__media">
          {primaryImage ? (
            <img
              src={optimizeCloudinaryUrl(primaryImage.url, 800)}
              srcSet={getCloudinarySrcSet(
                primaryImage.url,
                [320, 480, 640, 800, 960],
              )}
              sizes="(max-width: 639px) 50vw, (max-width: 1020px) 33vw, 25vw"
              alt={primaryImage.altText || product.name}
              width="800"
              height="848"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="sf-product-card__fallback" aria-hidden="true">
              {product.emoji}
            </span>
          )}

          {(product.badge || discountPercent > 0) && (
            <span className="sf-product-card__badge">
              {product.badge || `-${discountPercent}%`}
            </span>
          )}

          {isOutOfStock && (
            <span className="sf-product-card__stock">Tạm hết hàng</span>
          )}

          {typeof product.soldQuantity === "number" &&
            product.soldQuantity > 0 && (
              <span className="sf-product-card__sold">
                Đã bán {product.soldQuantity}
              </span>
            )}
        </div>

        <div className="sf-product-card__body">
          <p className="sf-product-card__category">{product.categoryName}</p>
          <h3 className="sf-product-card__title">{product.name}</h3>

          <div className="sf-product-card__footer">
            <div>
              <strong className="sf-product-card__price">
                {formatCurrency(product.price)}
              </strong>
              {product.compareAtPrice && (
                <span className="sf-product-card__compare">
                  {formatCurrency(product.compareAtPrice)}
                </span>
              )}
            </div>

            <span className="sf-product-card__arrow" aria-hidden="true">
              Xem
              <ArrowIcon />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

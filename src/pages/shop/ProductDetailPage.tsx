/* eslint-disable react-hooks/set-state-in-effect */
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import ProductDetailSkeleton from "../../components/shop/ProductDetailSkeleton";
import ProductRecommendations from "../../components/shop/ProductRecommendations";
import { useAdTracking } from "../../features/ads/AdTrackingContext";
import { useCart } from "../../features/cart/CartContext";
import { usePageMeta } from "../../hooks/usePageMeta";
import {
  getCloudinarySrcSet,
  optimizeCloudinaryUrl,
} from "../../lib/cloudinary";
import { resolveProductSlugRedirect } from "../../services/productRedirects";
import { fetchProductBySlug } from "../../services/products";
import type { SelectedVariant } from "../../types/cart";
import type { Product } from "../../types/product";
import { formatCurrency } from "../../utils/currency";
import "./ProductDetailPage.css";

export default function ProductDetailPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const {
    trackAddToCart,
    trackPageView,
    trackViewContent,
  } = useAdTracking();

  const [product, setProduct] =
    useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryVersion, setRetryVersion] =
    useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<
    Record<string, string>
  >({});
  const [message, setMessage] = useState("");
  const [selectedImageId, setSelectedImageId] =
    useState("");
  const trackedProductIdRef = useRef("");

  usePageMeta({
    title: product
      ? `${product.name} | InGiDay`
      : "Sản phẩm | InGiDay",
    description: product?.description
      ? product.description.slice(0, 160)
      : "Chi tiết sản phẩm InGiDay.",
    canonicalPath: product
      ? `/san-pham/${product.slug}`
      : `/san-pham/${slug}`,
  });

  useEffect(() => {
    setProduct(null);
    setQuantity(1);
    setSelections({});
    setMessage("");
    setSelectedImageId("");
    trackedProductIdRef.current = "";
  }, [slug]);

  useEffect(() => {
    let active = true;
    let redirecting = false;

    setLoading(true);
    setError("");

    void (async () => {
      try {
        const nextProduct =
          await fetchProductBySlug(slug, {
            force: retryVersion > 0,
          });

        if (!active) {
          return;
        }

        if (nextProduct) {
          setProduct(nextProduct);
          return;
        }

        const redirectSlug =
          await resolveProductSlugRedirect(slug);

        if (!active) {
          return;
        }

        if (
          redirectSlug &&
          redirectSlug !== slug
        ) {
          redirecting = true;
          navigate(
            `/san-pham/${redirectSlug}`,
            { replace: true },
          );
          return;
        }

        setProduct(null);
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Không thể tải sản phẩm.",
          );
        }
      } finally {
        if (active && !redirecting) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [navigate, retryVersion, slug]);

  const selectedVariants =
    useMemo<SelectedVariant[]>(() => {
      if (!product?.variantGroups) {
        return [];
      }

      return product.variantGroups.flatMap(
        (group) => {
          const selectedOptionId =
            selections[group.id] ??
            group.options[0]?.id;

          const option = group.options.find(
            (item) =>
              item.id === selectedOptionId,
          );

          if (!option) {
            return [];
          }

          return [
            {
              groupId: group.id,
              groupName: group.name,
              optionId: option.id,
              optionLabel: option.label,
              priceDelta:
                option.priceDelta ?? 0,
              stock: option.stock,
            },
          ];
        },
      );
    }, [product, selections]);

  useEffect(() => {
    if (
      !product ||
      trackedProductIdRef.current === product.id
    ) {
      return;
    }

    trackedProductIdRef.current = product.id;

    const initialUnitPrice =
      product.price +
      selectedVariants.reduce(
        (sum, variant) =>
          sum + variant.priceDelta,
        0,
      );

    const path =
      `${window.location.pathname}${window.location.search}`;

    void trackPageView({
      path,
      productId: product.id,
    });

    void trackViewContent({
      product,
      quantity: 1,
      unitPrice: initialUnitPrice,
      selectedVariants,
    });
  }, [
    product,
    selectedVariants,
    trackPageView,
    trackViewContent,
  ]);

  if (loading && !product) {
    return <ProductDetailSkeleton />;
  }

  if (error && !product) {
    return (
      <section className="product-detail-state">
        <h1>Không thể tải sản phẩm</h1>
        <p>{error}</p>
        <button
          type="button"
          onClick={() =>
            setRetryVersion(
              (current) => current + 1,
            )
          }
        >
          Thử lại
        </button>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="product-detail-state">
        <div className="product-detail-state__icon">
          🧩
        </div>
        <h1>Không tìm thấy sản phẩm</h1>
        <p>
          Sản phẩm có thể đã bị ẩn hoặc đường dẫn
          không còn tồn tại.
        </p>
        <Link to="/san-pham">
          Quay lại cửa hàng
        </Link>
      </section>
    );
  }

  const productImages = product.images ?? [];
  const primaryImage =
    productImages.find(
      (image) => image.isPrimary,
    ) ?? productImages[0];
  const selectedImage =
    productImages.find(
      (image) => image.id === selectedImageId,
    ) ?? primaryImage;

  const variantStocks = selectedVariants
    .map((variant) => variant.stock)
    .filter(
      (stock): stock is number =>
        typeof stock === "number",
    );

  const availableStock =
    product.status === "out_of_stock"
      ? 0
      : variantStocks.length > 0
        ? Math.min(
            product.stock,
            ...variantStocks,
          )
        : product.stock;

  const unitPrice =
    product.price +
    selectedVariants.reduce(
      (sum, variant) =>
        sum + variant.priceDelta,
      0,
    );

  const discountPercent =
    product.compareAtPrice &&
    product.compareAtPrice > unitPrice
      ? Math.round(
          ((product.compareAtPrice - unitPrice) /
            product.compareAtPrice) *
            100,
        )
      : 0;

  function addToCart(goToCheckout: boolean) {
    if (!product || availableStock <= 0) {
      return;
    }

    const cartQuantity = Math.min(
      quantity,
      availableStock,
    );

    addItem(
      product,
      cartQuantity,
      selectedVariants,
    );

    void trackAddToCart({
      product,
      quantity: cartQuantity,
      unitPrice,
      selectedVariants,
    });

    if (goToCheckout) {
      navigate("/thanh-toan");
      return;
    }

    setMessage(
      "Đã thêm sản phẩm vào giỏ hàng.",
    );

    window.setTimeout(() => {
      setMessage("");
    }, 2200);
  }

  return (
    <main className="product-detail">
      <div className="product-detail__container">
        <nav
          className="product-detail__breadcrumb"
          aria-label="Đường dẫn"
        >
          <Link to="/">Trang chủ</Link>
          <span>/</span>
          <Link to="/san-pham">Sản phẩm</Link>
          <span>/</span>
          <strong>{product.name}</strong>
        </nav>

        {error && (
          <div className="product-detail__error">
            <span>{error}</span>
            <button
              type="button"
              onClick={() =>
                setRetryVersion(
                  (current) => current + 1,
                )
              }
            >
              Thử lại
            </button>
          </div>
        )}

        <section className="product-detail__main">
          <div className="product-detail__gallery">
            <div
              className="product-detail__image-stage"
              style={{
                backgroundColor:
                  product.background,
              }}
            >
              <span className="product-detail__image-grid" />

              {product.badge && (
                <span className="product-detail__badge">
                  {product.badge}
                </span>
              )}

              {selectedImage ? (
                <img
                  src={optimizeCloudinaryUrl(
                    selectedImage.url,
                    1080,
                  )}
                  srcSet={getCloudinarySrcSet(
                    selectedImage.url,
                    [
                      480,
                      640,
                      800,
                      1080,
                      1400,
                    ],
                  )}
                  sizes="(max-width: 1023px) 100vw, 50vw"
                  alt={
                    selectedImage.altText ||
                    product.name
                  }
                  width="1080"
                  height="1080"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
              ) : (
                <span className="product-detail__emoji">
                  {product.emoji}
                </span>
              )}

              <span className="product-detail__image-note">
                in 3D · làm kỹ từng chi tiết
              </span>
            </div>

            {productImages.length > 1 && (
              <div className="product-detail__thumbnails">
                {productImages.map(
                  (image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() =>
                        setSelectedImageId(
                          image.id,
                        )
                      }
                      className={
                        selectedImage?.id ===
                        image.id
                          ? "is-active"
                          : ""
                      }
                      aria-label={`Xem ảnh ${
                        index + 1
                      } của ${product.name}`}
                    >
                      <img
                        src={optimizeCloudinaryUrl(
                          image.url,
                          220,
                        )}
                        srcSet={getCloudinarySrcSet(
                          image.url,
                          [120, 180, 220],
                        )}
                        sizes="20vw"
                        alt={
                          image.altText ||
                          product.name
                        }
                        width="220"
                        height="220"
                        loading="lazy"
                        decoding="async"
                      />
                    </button>
                  ),
                )}
              </div>
            )}
          </div>

          <div className="product-detail__purchase">
            <div className="product-detail__category">
              {product.categoryName}
            </div>

            <h1>{product.name}</h1>

            <div className="product-detail__price-row">
              <strong>
                {formatCurrency(unitPrice)}
              </strong>

              {product.compareAtPrice && (
                <span className="product-detail__compare-price">
                  {formatCurrency(
                    product.compareAtPrice,
                  )}
                </span>
              )}

              {discountPercent > 0 && (
                <span className="product-detail__discount">
                  Tiết kiệm {discountPercent}%
                </span>
              )}
            </div>

            <div
              className={`product-detail__stock ${
                availableStock > 0
                  ? "is-available"
                  : "is-out"
              }`}
            >
              <span />
              {availableStock > 0
                ? `Còn ${availableStock} sản phẩm`
                : "Tạm hết hàng"}
            </div>

            {product.variantGroups?.map(
              (group) => {
                const selectedOptionId =
                  selections[group.id] ??
                  group.options[0]?.id;

                return (
                  <fieldset
                    key={group.id}
                    className="product-detail__variants"
                  >
                    <legend>{group.name}</legend>

                    <div>
                      {group.options.map(
                        (option) => (
                          <label
                            key={option.id}
                          >
                            <input
                              type="radio"
                              name={group.id}
                              value={option.id}
                              checked={
                                selectedOptionId ===
                                option.id
                              }
                              onChange={() => {
                                setSelections(
                                  (current) => ({
                                    ...current,
                                    [group.id]:
                                      option.id,
                                  }),
                                );
                                setQuantity(1);
                              }}
                            />

                            <span>
                              {option.label}
                              {option.priceDelta
                                ? ` (+${formatCurrency(
                                    option.priceDelta,
                                  )})`
                                : ""}
                            </span>
                          </label>
                        ),
                      )}
                    </div>
                  </fieldset>
                );
              },
            )}

            <div className="product-detail__quantity-row">
              <div>
                <span className="product-detail__field-label">
                  Số lượng
                </span>

                <div className="product-detail__quantity">
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity(
                        (current) =>
                          Math.max(
                            1,
                            current - 1,
                          ),
                      )
                    }
                    aria-label="Giảm số lượng"
                  >
                    −
                  </button>

                  <strong>{quantity}</strong>

                  <button
                    type="button"
                    onClick={() =>
                      setQuantity(
                        (current) =>
                          Math.min(
                            Math.max(
                              availableStock,
                              1,
                            ),
                            current + 1,
                          ),
                      )
                    }
                    aria-label="Tăng số lượng"
                  >
                    +
                  </button>
                </div>
              </div>

              <p>
                Tổng tạm tính
                <strong>
                  {formatCurrency(
                    unitPrice * quantity,
                  )}
                </strong>
              </p>
            </div>

            <div className="product-detail__actions">
              <button
                type="button"
                onClick={() =>
                  addToCart(true)
                }
                disabled={availableStock <= 0}
                className="product-detail__buy-now"
              >
                Mua ngay
              </button>

              <button
                type="button"
                onClick={() =>
                  addToCart(false)
                }
                disabled={availableStock <= 0}
                className="product-detail__add-cart"
              >
                Thêm vào giỏ
              </button>
            </div>

            {message && (
              <p className="product-detail__message">
                {message}
              </p>
            )}

            <div className="product-detail__trust">
              <article>
                <span className="product-detail__trust-icon product-detail__trust-icon--blue">
                  ✦
                </span>
                <div>
                  <h2>In 3D sắc nét</h2>
                  <p>
                    Kiểm tra bề mặt và chi tiết
                    trước khi đóng gói.
                  </p>
                </div>
              </article>

              <article>
                <span className="product-detail__trust-icon product-detail__trust-icon--pink">
                  ◈
                </span>
                <div>
                  <h2>Đóng gói chống va đập</h2>
                  <p>
                    Bảo vệ sản phẩm trong quá
                    trình vận chuyển.
                  </p>
                </div>
              </article>

              <article>
                <span className="product-detail__trust-icon product-detail__trust-icon--mint">
                  ✓
                </span>
                <div>
                  <h2>Thanh toán khi nhận hàng</h2>
                  <p>
                    Hỗ trợ COD trên toàn quốc.
                  </p>
                </div>
              </article>

              <article>
                <span className="product-detail__trust-icon product-detail__trust-icon--yellow">
                  ⚡
                </span>
                <div>
                  <h2>Freeship từ 200.000đ</h2>
                  <p>
                    Áp dụng theo chính sách hiện
                    tại của shop.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="product-detail__information">
          <div>
            <span className="product-detail__section-kicker">
              Chi tiết
            </span>
            <h2>Thông tin sản phẩm</h2>
          </div>

          <div className="product-detail__description">
            <p>
              {product.description ||
                "Thông tin sản phẩm đang được cập nhật."}
            </p>

            <aside>
              <strong>Lưu ý nhỏ</strong>
              <ul>
                <li>
                  Sản phẩm in 3D có thể có vân lớp
                  nhẹ đặc trưng.
                </li>
                <li>
                  Màu thực tế có thể chênh nhẹ do
                  màn hình và ánh sáng.
                </li>
              </ul>
            </aside>
          </div>
        </section>

        <ProductRecommendations
          product={product}
        />
      </div>
    </main>
  );
}

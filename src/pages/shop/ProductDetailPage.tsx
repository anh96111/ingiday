/* eslint-disable react-hooks/set-state-in-effect */
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import ProductDetailSkeleton from "../../components/shop/ProductDetailSkeleton";
import { useCart } from "../../features/cart/CartContext";
import {
  getCloudinarySrcSet,
  optimizeCloudinaryUrl,
} from "../../lib/cloudinary";
import { fetchProductBySlug } from "../../services/products";
import type { SelectedVariant } from "../../types/cart";
import type { Product } from "../../types/product";
import { formatCurrency } from "../../utils/currency";

export default function ProductDetailPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

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

  useEffect(() => {
    setQuantity(1);
    setSelections({});
    setMessage("");
    setSelectedImageId("");
  }, [slug]);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    void fetchProductBySlug(slug, {
      force: retryVersion > 0,
    })
      .then((nextProduct) => {
        if (active) {
          setProduct(nextProduct);
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Không thể tải sản phẩm.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [retryVersion, slug]);

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

  if (loading && !product) {
    return <ProductDetailSkeleton />;
  }

  if (error && !product) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-20 text-center">
        <h1 className="text-3xl font-black">
          Không thể tải sản phẩm
        </h1>
        <p className="mt-4 text-[#a43c12]">
          {error}
        </p>
        <button
          type="button"
          onClick={() =>
            setRetryVersion(
              (current) => current + 1,
            )
          }
          className="mt-6 rounded-2xl bg-[#006397] px-6 py-3 font-bold text-white"
        >
          Thử lại
        </button>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-20 text-center">
        <h1 className="text-3xl font-black">
          Không tìm thấy sản phẩm
        </h1>
        <Link
          to="/san-pham"
          className="mt-6 inline-flex rounded-2xl bg-[#006397] px-6 py-3 font-bold text-white"
        >
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

  function addToCart(goToCheckout: boolean) {
    if (!product || availableStock <= 0) {
      return;
    }

    addItem(
      product,
      Math.min(quantity, availableStock),
      selectedVariants,
    );

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
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-16">
      <div className="mb-6 text-sm text-[#707881]">
        <Link
          to="/san-pham"
          className="font-bold text-[#006397]"
        >
          Sản phẩm
        </Link>
        <span> / {product.name}</span>
      </div>

      {error && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#fff0eb] px-5 py-3 text-sm font-semibold text-[#a43c12]">
          <span>{error}</span>
          <button
            type="button"
            onClick={() =>
              setRetryVersion(
                (current) => current + 1,
              )
            }
            className="rounded-xl bg-white px-4 py-2 font-bold"
          >
            Thử lại
          </button>
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div
            className="grid aspect-square place-items-center overflow-hidden rounded-[32px] text-[130px]"
            style={{
              backgroundColor:
                product.background,
            }}
          >
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
                className="h-full w-full object-cover"
                loading="eager"
                decoding="async"
                fetchPriority="high"
              />
            ) : (
              product.emoji
            )}
          </div>

          {productImages.length > 1 && (
            <div className="mt-4 grid grid-cols-5 gap-3">
              {productImages.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() =>
                    setSelectedImageId(
                      image.id,
                    )
                  }
                  className={`aspect-square overflow-hidden rounded-2xl border-2 ${
                    selectedImage?.id ===
                    image.id
                      ? "border-[#006397]"
                      : "border-transparent"
                  }`}
                  aria-label={`Xem ảnh ${
                    image.altText ||
                    product.name
                  }`}
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
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#006397]">
            {product.categoryName}
          </p>

          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
            {product.name}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <strong className="text-3xl text-[#a43c12]">
              {formatCurrency(unitPrice)}
            </strong>

            {product.compareAtPrice && (
              <span className="text-lg text-[#8b949d] line-through">
                {formatCurrency(
                  product.compareAtPrice,
                )}
              </span>
            )}
          </div>

          <p className="mt-6 whitespace-pre-line leading-8 text-[#3f4850]">
            {product.description}
          </p>

          {product.variantGroups?.map(
            (group) => {
              const selectedOptionId =
                selections[group.id] ??
                group.options[0]?.id;

              return (
                <fieldset
                  key={group.id}
                  className="mt-6"
                >
                  <legend className="font-black">
                    {group.name}
                  </legend>

                  <div className="mt-3 flex flex-wrap gap-3">
                    {group.options.map(
                      (option) => (
                        <label
                          key={option.id}
                          className="cursor-pointer"
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
                            className="peer sr-only"
                          />

                          <span className="inline-flex min-h-11 items-center rounded-xl border border-[#c7d0da] px-4 text-sm font-bold transition peer-checked:border-[#006397] peer-checked:bg-[#edf4ff] peer-checked:text-[#006397]">
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

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <div className="flex h-12 overflow-hidden rounded-xl border border-[#c7d0da] bg-white">
              <button
                type="button"
                onClick={() =>
                  setQuantity((current) =>
                    Math.max(
                      1,
                      current - 1,
                    ),
                  )
                }
                className="grid h-full w-12 place-items-center text-xl font-bold hover:bg-[#edf4ff]"
                aria-label="Giảm số lượng"
              >
                −
              </button>

              <span className="grid min-w-12 place-items-center font-black">
                {quantity}
              </span>

              <button
                type="button"
                onClick={() =>
                  setQuantity((current) =>
                    Math.min(
                      Math.max(
                        availableStock,
                        1,
                      ),
                      current + 1,
                    ),
                  )
                }
                className="grid h-full w-12 place-items-center text-xl font-bold hover:bg-[#edf4ff]"
                aria-label="Tăng số lượng"
              >
                +
              </button>
            </div>

            <p
              className={`text-sm font-bold ${
                availableStock > 0
                  ? "text-[#14633d]"
                  : "text-[#a43c12]"
              }`}
            >
              {availableStock > 0
                ? `Còn ${availableStock} sản phẩm`
                : "Tạm hết hàng"}
            </p>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                addToCart(false)
              }
              disabled={availableStock <= 0}
              className="min-h-13 rounded-2xl bg-[#fe7e4f] px-7 font-bold text-white shadow-lg shadow-[#fe7e4f]/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Thêm vào giỏ
            </button>

            <button
              type="button"
              onClick={() =>
                addToCart(true)
              }
              disabled={availableStock <= 0}
              className="min-h-13 rounded-2xl bg-[#006397] px-7 font-bold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mua ngay
            </button>
          </div>

          {message && (
            <p className="mt-4 rounded-2xl bg-[#dcf8eb] px-4 py-3 text-sm font-bold text-[#14633d]">
              {message}
            </p>
          )}

          <div className="mt-8 grid grid-cols-3 gap-3 text-center text-xs font-bold text-[#3f4850]">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              Đóng gói cẩn thận
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              Thanh toán COD
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              Freeship từ 200k
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
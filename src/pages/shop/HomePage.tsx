/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../../components/shop/ProductCard";
import ProductGridSkeleton from "../../components/shop/ProductGridSkeleton";
import { useBanners } from "../../features/banners/BannersContext";
import { useSettings } from "../../features/settings/SettingsContext";
import {
  fetchActiveCategories,
  fetchFeaturedProducts,
  searchProducts,
} from "../../services/products";
import type { Category, Product } from "../../types/product";
import "./HomePage.css";

function isBannerAvailable(startsAt?: string, endsAt?: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (startsAt) {
    const start = new Date(`${startsAt}T00:00:00`);

    if (start > today) {
      return false;
    }
  }

  if (endsAt) {
    const end = new Date(`${endsAt}T23:59:59`);

    if (end < today) {
      return false;
    }
  }

  return true;
}

function primaryImage(product?: Product) {
  if (!product) {
    return undefined;
  }

  return (
    (product.images ?? []).find((image) => image.isPrimary) ??
    (product.images ?? [])[0]
  );
}

function CollectionProduct({
  product,
  fallback,
  className,
}: {
  product?: Product;
  fallback: string;
  className: string;
}) {
  const image = primaryImage(product);

  return (
    <span
      className={`home-rebel__stack-item ${className}`}
      style={{
        background: product?.background || undefined,
      }}
      aria-hidden="true"
    >
      {image ? (
        <img
          src={image.url}
          alt=""
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span>{product?.emoji || fallback}</span>
      )}
    </span>
  );
}

export default function HomePage() {
  const {
    banners,
    loading: bannersLoading,
    error: bannersError,
  } = useBanners();
  const { settings } = useSettings();

  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [heroProducts, setHeroProducts] = useState<{
    bestselling?: Product;
    featured?: Product;
    newest?: Product;
  }>({});
  const [collectionProducts, setCollectionProducts] = useState<
    Record<string, Product[]>
  >({});
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const collectionTrackRef = useRef<HTMLDivElement>(null);

  const loadCatalog = useCallback(async (force = false) => {
    setCatalogLoading(true);
    setCatalogError("");

    try {
      const [
        nextCategories,
        nextFeaturedProducts,
        bestsellingResult,
        heroFeaturedResult,
        newestResult,
      ] = await Promise.all([
        fetchActiveCategories({ force }),
        fetchFeaturedProducts(4, { force }),
        searchProducts(
          {
            sort: "bestselling",
            page: 1,
            pageSize: 6,
          },
          { force },
        ),
        searchProducts(
          {
            featured: true,
            sort: "bestselling",
            page: 1,
            pageSize: 6,
          },
          { force },
        ),
        searchProducts(
          {
            sort: "newest",
            page: 1,
            pageSize: 6,
          },
          { force },
        ),
      ]);

      setCategories(nextCategories);
      setFeaturedProducts(nextFeaturedProducts);

      const usedHeroProductIds = new Set<string>();
      const pickUniqueProduct = (products: Product[]) => {
        const product = products.find(
          (item) => !usedHeroProductIds.has(item.id),
        );

        if (product) {
          usedHeroProductIds.add(product.id);
        }

        return product;
      };

      const bestselling = pickUniqueProduct(
        bestsellingResult.products,
      );
      const featured = pickUniqueProduct([
        ...heroFeaturedResult.products,
        ...nextFeaturedProducts,
        ...bestsellingResult.products,
      ]);
      const newest = pickUniqueProduct([
        ...newestResult.products,
        ...nextFeaturedProducts,
        ...bestsellingResult.products,
      ]);

      setHeroProducts({
        bestselling,
        featured,
        newest,
      });

      const previewEntries = await Promise.all(
        nextCategories.slice(0, 4).map(async (category) => {
          try {
            const result = await searchProducts(
              {
                categoryId: category.id,
                sort: "bestselling",
                page: 1,
                pageSize: 3,
              },
              { force },
            );

            return [category.id, result.products] as const;
          } catch {
            return [category.id, []] as const;
          }
        }),
      );

      setCollectionProducts(Object.fromEntries(previewEntries));
    } catch (error) {
      setCatalogError(
        error instanceof Error
          ? error.message
          : "Không thể tải sản phẩm.",
      );
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const banner = [...banners]
    .filter(
      (item) =>
        item.active &&
        isBannerAvailable(item.startsAt, item.endsAt),
    )
    .sort((left, right) => left.sortOrder - right.sortOrder)[0];

  const visibleCollections = categories;
  const customShowcase = featuredProducts.slice(0, 3);
  const messengerUrl = settings.messengerUrl.trim();

  const scrollCollections = (direction: "left" | "right") => {
    const track = collectionTrackRef.current;

    if (!track) {
      return;
    }

    const firstCard = track.querySelector<HTMLElement>(
      ".home-rebel__collection-card",
    );
    const cardWidth = firstCard?.offsetWidth ?? 280;
    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap) || 16;
    const distance = (cardWidth + gap) * 2;

    track.scrollBy({
      left: direction === "right" ? distance : -distance,
      behavior: "smooth",
    });
  };

  return (
    <main className="home-rebel">
      <section className="home-rebel__hero">
        <div className="home-rebel__container home-rebel__hero-grid">
          <div className="home-rebel__hero-copy">
            <span className="home-rebel__eyebrow">
              ✦ {banner?.badge || "Đồ nhỏ xinh, mood không nhỏ"}
            </span>

            <h1>
              {banner?.title ? (
                banner.title
              ) : (
                <>
                  Dễ thương,{" "}
                  <span className="home-rebel__title-accent">
                    nhưng không ngoan.
                  </span>{" "}
                  <span className="home-rebel__title-blue">
                    Đúng chất bạn.
                  </span>
                </>
              )}
            </h1>

            <p>
              {banner?.description ||
                "Móc khóa, mô hình mini và những món decor in 3D dành cho người thích đẹp, thích vui và không muốn góc sống của mình trông giống tất cả mọi người."}
            </p>

            <div className="home-rebel__hero-actions">
              <Link
                className="home-rebel__button home-rebel__button--dark"
                to={banner?.primaryLink || "/san-pham"}
              >
                {banner?.primaryLabel || "Xem sản phẩm nổi bật →"}
              </Link>

              <Link
                className="home-rebel__button home-rebel__button--light"
                to={banner?.secondaryLink || "/in-rieng"}
              >
                {banner?.secondaryLabel ||
                  "Tạo một món của riêng bạn"}
              </Link>
            </div>

            <div className="home-rebel__benefits">
              <span>✓ In sắc nét</span>
              <span>✓ Đóng gói cẩn thận</span>
              <span>✓ Có gu, có mood</span>
            </div>
          </div>

          <div
            className="home-rebel__hero-art"
            style={{
              background:
                banner?.background ||
                "linear-gradient(145deg, #dff4ff, #fff0f5)",
            }}
          >
            <div className="home-rebel__hero-grid-lines" />
            <div className="home-rebel__hero-orb home-rebel__hero-orb--yellow" />
            <div className="home-rebel__hero-orb home-rebel__hero-orb--mint" />

            {heroProducts.bestselling ? (
              <Link
                className="home-rebel__hero-image-card"
                to={`/san-pham/${heroProducts.bestselling.slug}`}
                aria-label={`Xem sản phẩm bán chạy ${heroProducts.bestselling.name}`}
              >
                {primaryImage(heroProducts.bestselling) ? (
                  <img
                    src={primaryImage(heroProducts.bestselling)?.url}
                    alt={
                      primaryImage(heroProducts.bestselling)?.altText ||
                      heroProducts.bestselling.name
                    }
                    fetchPriority="high"
                  />
                ) : (
                  <span>
                    {heroProducts.bestselling.emoji ||
                      banner?.emoji ||
                      "🦖"}
                  </span>
                )}

                <strong className="home-rebel__hero-product-label">
                  Bán chạy
                </strong>
              </Link>
            ) : (
              <div className="home-rebel__hero-main-card">
                {banner?.emoji || "🦖"}
                <strong className="home-rebel__hero-product-label">
                  Bán chạy
                </strong>
              </div>
            )}

            {heroProducts.featured ? (
              <Link
                className="home-rebel__hero-mini-card home-rebel__hero-mini-card--one"
                to={`/san-pham/${heroProducts.featured.slug}`}
                aria-label={`Xem sản phẩm nổi bật ${heroProducts.featured.name}`}
              >
                {primaryImage(heroProducts.featured) ? (
                  <img
                    src={primaryImage(heroProducts.featured)?.url}
                    alt={
                      primaryImage(heroProducts.featured)?.altText ||
                      heroProducts.featured.name
                    }
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span>{heroProducts.featured.emoji || "🐱"}</span>
                )}

                <strong className="home-rebel__hero-product-label">
                  Nổi bật
                </strong>
              </Link>
            ) : (
              <div className="home-rebel__hero-mini-card home-rebel__hero-mini-card--one">
                🐱
              </div>
            )}

            {heroProducts.newest ? (
              <Link
                className="home-rebel__hero-mini-card home-rebel__hero-mini-card--two"
                to={`/san-pham/${heroProducts.newest.slug}`}
                aria-label={`Xem sản phẩm mới ${heroProducts.newest.name}`}
              >
                {primaryImage(heroProducts.newest) ? (
                  <img
                    src={primaryImage(heroProducts.newest)?.url}
                    alt={
                      primaryImage(heroProducts.newest)?.altText ||
                      heroProducts.newest.name
                    }
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span>{heroProducts.newest.emoji || "🐰"}</span>
                )}

                <strong className="home-rebel__hero-product-label">
                  Mới
                </strong>
              </Link>
            ) : (
              <div className="home-rebel__hero-mini-card home-rebel__hero-mini-card--two">
                🐰
              </div>
            )}

            <div className="home-rebel__hero-sticker">
              New mood
              <br />
              drop
            </div>

            <div className="home-rebel__scribble">
              đừng sống nhạt.
            </div>
          </div>
        </div>
      </section>

      {(bannersError || catalogError) && (
        <div className="home-rebel__container">
          <div className="home-rebel__error">
            <span>
              {catalogError ||
                bannersError ||
                "Không thể tải đủ dữ liệu."}
            </span>

            {catalogError && (
              <button type="button" onClick={() => void loadCatalog(true)}>
                Thử lại
              </button>
            )}
          </div>
        </div>
      )}

      {bannersLoading && (
        <div className="home-rebel__container">
          <p className="home-rebel__loading">
            Đang cập nhật banner...
          </p>
        </div>
      )}

      <section
        id="collections"
        className="home-rebel__section home-rebel__collections-section"
      >
        <div className="home-rebel__container">
          <div className="home-rebel__section-head">
            <div>
              <span className="home-rebel__section-kicker">
                Bộ sưu tập
              </span>
              <h2>Chọn theo mood hôm nay</h2>
              <p>
                Không cần lý do quá nghiêm túc. Thấy hợp gu là đủ.
              </p>
            </div>

            <div className="home-rebel__collection-actions">
              <button
                type="button"
                className="home-rebel__collection-arrow"
                onClick={() => scrollCollections("left")}
                aria-label="Xem bộ sưu tập phía trước"
              >
                ←
              </button>

              <button
                type="button"
                className="home-rebel__collection-arrow"
                onClick={() => scrollCollections("right")}
                aria-label="Xem bộ sưu tập tiếp theo"
              >
                →
              </button>

              <Link className="home-rebel__section-link" to="/san-pham">
                Xem tất cả →
              </Link>
            </div>
          </div>

          {catalogLoading && visibleCollections.length === 0 ? (
            <div className="home-rebel__collection-grid">
              {Array.from({ length: 4 }).map((_item, index) => (
                <div
                  className="home-rebel__collection-skeleton"
                  key={index}
                />
              ))}
            </div>
          ) : (
            <div
              className="home-rebel__collection-grid"
              ref={collectionTrackRef}
            >
              {visibleCollections.map((category, index) => {
                const previews =
                  collectionProducts[category.id] ?? [];

                return (
                  <Link
                    className={`home-rebel__collection-card home-rebel__collection-card--${
                      index + 1
                    }`}
                    to={`/san-pham?danh-muc=${encodeURIComponent(
                      category.slug,
                    )}`}
                    key={category.id}
                  >
                    <span className="home-rebel__collection-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    <div className="home-rebel__collection-art">
                      <span className="home-rebel__stack-shadow" />

                      <CollectionProduct
                        product={previews[1]}
                        fallback={index === 0 ? "🐰" : "⚡"}
                        className="home-rebel__stack-item--left"
                      />

                      <CollectionProduct
                        product={previews[2]}
                        fallback={index === 0 ? "👻" : "🌸"}
                        className="home-rebel__stack-item--right"
                      />

                      <CollectionProduct
                        product={previews[0]}
                        fallback={category.emoji || "🦖"}
                        className="home-rebel__stack-item--main"
                      />

                      <span className="home-rebel__stack-badge">
                        {index === 1 ? "IGD" : index === 3 ? "1/1" : "✦"}
                      </span>
                    </div>

                    <h3>{category.name}</h3>
                    <small>
                      {previews.length > 0
                        ? `${previews.length} món đang nổi bật`
                        : "Khám phá những món hợp mood"}
                    </small>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section
        id="featured"
        className="home-rebel__section home-rebel__featured-section"
      >
        <div className="home-rebel__container">
          <div className="home-rebel__section-head">
            <div>
              <span className="home-rebel__section-kicker">
                Nổi bật
              </span>
              <h2>Đang được mê nhất</h2>
              <p>
                Những món đang khiến người ta phải hỏi:
                “Ủa, mua ở đâu vậy?”
              </p>
            </div>

            <Link className="home-rebel__section-link" to="/san-pham">
              Xem tất cả →
            </Link>
          </div>

          {catalogLoading && featuredProducts.length === 0 ? (
            <ProductGridSkeleton count={4} />
          ) : featuredProducts.length > 0 ? (
            <div className="home-rebel__product-grid">
              {featuredProducts.map((product) => (
                <ProductCard product={product} key={product.id} />
              ))}
            </div>
          ) : (
            <div className="home-rebel__empty">
              Chưa có sản phẩm nổi bật.
            </div>
          )}
        </div>
      </section>

      <section
        id="custom"
        className="home-rebel__section home-rebel__custom-section"
      >
        <div className="home-rebel__container home-rebel__custom-grid">
          <div className="home-rebel__custom-copy">
            <span className="home-rebel__section-kicker home-rebel__section-kicker--light">
              Ý tưởng của riêng bạn
            </span>

            <h2>
              Nghĩ ra thứ gì hay ho?
              <br />
              Cứ ném sang đây.
            </h2>

            <p>
              {settings.customPrintDescription ||
                "Không cần biết thiết kế 3D. Chỉ cần gửi hình, phác thảo hoặc kể ý tưởng. InGiDay sẽ cùng bạn chốt kiểu dáng, màu sắc và kích thước phù hợp."}
            </p>

            <div className="home-rebel__steps">
              <div>
                <span>01</span>
                <strong>
                  {settings.customPrintStep1Title || "Gửi ý tưởng"}
                </strong>
              </div>

              <div>
                <span>02</span>
                <strong>
                  {settings.customPrintStep2Title ||
                    "Duyệt mẫu và báo giá"}
                </strong>
              </div>

              <div>
                <span>03</span>
                <strong>
                  {settings.customPrintStep3Title ||
                    "In và hoàn thiện"}
                </strong>
              </div>
            </div>

            {messengerUrl ? (
              <a
                className="home-rebel__message-button"
                href={messengerUrl}
                target="_blank"
                rel="noreferrer"
              >
                Nhắn InGiDay ngay
              </a>
            ) : (
              <Link
                className="home-rebel__message-button"
                to="/in-rieng"
              >
                Nhắn InGiDay ngay
              </Link>
            )}
          </div>

          <div className="home-rebel__custom-art">
            <span className="home-rebel__idea-sticker">
              Your idea
            </span>
            <span className="home-rebel__one-sticker">
              One of one
            </span>
            <span className="home-rebel__custom-spark home-rebel__custom-spark--one">
              ✦
            </span>
            <span className="home-rebel__custom-spark home-rebel__custom-spark--two">
              ✺
            </span>
            <span className="home-rebel__display-stage" />

            <CollectionProduct
              product={customShowcase[1]}
              fallback="🐰"
              className="home-rebel__custom-model home-rebel__custom-model--left"
            />

            <CollectionProduct
              product={customShowcase[0]}
              fallback="🦖"
              className="home-rebel__custom-model home-rebel__custom-model--main"
            />

            <CollectionProduct
              product={customShowcase[2]}
              fallback="👻"
              className="home-rebel__custom-model home-rebel__custom-model--right"
            />

            <span className="home-rebel__keychain">IGD</span>

            <span className="home-rebel__custom-note">
              ý tưởng hơi điên càng vui.
            </span>
          </div>
        </div>
      </section>

      <section className="home-rebel__quote-section">
        <div className="home-rebel__container">
          <div className="home-rebel__quote">
            <blockquote>
              “Không phải ai lớn lên cũng phải thôi thích những thứ
              dễ thương.”
            </blockquote>
            <p>InGiDay Manifesto</p>
          </div>
        </div>
      </section>
    </main>
  );
}

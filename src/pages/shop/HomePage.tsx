/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../../components/shop/ProductCard";
import ProductGridSkeleton from "../../components/shop/ProductGridSkeleton";
import { useBanners } from "../../features/banners/BannersContext";
import { useSettings } from "../../features/settings/SettingsContext";
import {
  fetchActiveCategories,
  fetchCollectionProductPreviews,
  fetchFeaturedProducts,
} from "../../services/products";
import type { Category, Product } from "../../types/product";
import "./HomePage.css";

const COLLECTION_TONES = ["pink", "yellow", "lavender", "mint"] as const;

const COLLECTION_COPY: Array<{
  matches: string[];
  description: string;
}> = [
  {
    matches: ["móc khóa", "moc khoa"],
    description: "Nhỏ xinh, mang theo mọi khoảnh khắc",
  },
  {
    matches: ["decor", "trang trí", "trang tri"],
    description: "Trang trí góc nhỏ thêm xinh",
  },
  {
    matches: ["mô hình", "mo hinh", "mini"],
    description: "Sưu tầm niềm vui mỗi ngày",
  },
  {
    matches: ["god"],
    description: "Đồ decor truyền cảm hứng tích cực",
  },
];

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

function collectionDescription(category: Category) {
  const normalizedName = category.name.trim().toLowerCase();

  return (
    COLLECTION_COPY.find((item) =>
      item.matches.some((keyword) => normalizedName.includes(keyword)),
    )?.description ?? "Khám phá những món hợp mood của bạn"
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" />
      <path d="m13.5 7.5 3 3" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z" />
      <path d="m18.5 15 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
    </svg>
  );
}

function HeadsetIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
      <path d="M4 13h3v6H5a1 1 0 0 1-1-1v-5Z" />
      <path d="M20 13h-3v6h2a1 1 0 0 0 1-1v-5Z" />
      <path d="M17 19c-.7 1.3-2.2 2-4 2" />
    </svg>
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
  const [collectionProducts, setCollectionProducts] = useState<
    Record<string, Product[]>
  >({});
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const collectionTrackRef = useRef<HTMLDivElement | null>(null);

  const loadCatalog = useCallback(async (force = false) => {
    setCatalogLoading(true);
    setCatalogError("");

    try {
      const [nextCategories, nextFeaturedProducts] = await Promise.all([
        fetchActiveCategories({ force }),
        fetchFeaturedProducts(4, { force }),
      ]);

      setCategories(nextCategories);
      setFeaturedProducts(nextFeaturedProducts);

      const nextCollectionProducts = await fetchCollectionProductPreviews(
        nextCategories,
        3,
        { force },
      );

      setCollectionProducts(nextCollectionProducts);
    } catch (error) {
      setCatalogError(
        error instanceof Error ? error.message : "Không thể tải sản phẩm.",
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
        item.active && isBannerAvailable(item.startsAt, item.endsAt),
    )
    .sort((left, right) => left.sortOrder - right.sortOrder)[0];

  const messengerUrl = settings.messengerUrl.trim();
  const heroImageUrl =
    banner?.imageUrl?.trim() || "/images/ingiday-hero-default.webp";
  const heroImageAlt =
    banner?.imageAlt?.trim() ||
    "Móc khóa thỏ, đèn decor và mô hình robot 3D phong cách InGiDay";

  const scrollCollections = (direction: "left" | "right") => {
    const track = collectionTrackRef.current;
    if (!track) {
      return;
    }

    const firstCard = track.querySelector<HTMLElement>(
      ".home-cute__collection-card",
    );
    const cardWidth = firstCard?.offsetWidth ?? 280;
    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap) || 16;
    const distance = cardWidth + gap;

    track.scrollBy({
      left: direction === "right" ? distance : -distance,
      behavior: "smooth",
    });
  };

  return (
    <main className="home-cute">
      <section
        className="home-cute__hero"
        style={{
          background:
            banner?.background ||
            "linear-gradient(135deg, #fffaf5 0%, #fff6ee 52%, #fffaf8 100%)",
        }}
      >
        <div className="sf-container home-cute__hero-grid">
          <div className="home-cute__hero-copy">
            <span className="home-cute__eyebrow">
              {banner?.badge || "In 3D theo cách dễ thương hơn"}
            </span>

            <h1>
              {banner?.title ? (
                banner.title
              ) : (
                <>
                  In 3D tạo nên
                  <span>điều đáng yêu ♡</span>
                </>
              )}
            </h1>

            <p>
              {banner?.description ||
                "Móc khóa, mô hình mini và sản phẩm in riêng được tạo ra dành riêng cho bạn."}
            </p>

            <div className="home-cute__hero-actions">
              <Link
                className="sf-button sf-button--primary"
                to={banner?.primaryLink || "/san-pham"}
              >
                {banner?.primaryLabel || "Khám phá ngay"}
                <ArrowIcon />
              </Link>

              <Link
                className="sf-button home-cute__button-secondary"
                to={banner?.secondaryLink || "/in-rieng"}
              >
                {banner?.secondaryLabel || "Yêu cầu thiết kế"}
                <PencilIcon />
              </Link>
            </div>

            <div className="home-cute__hero-points" aria-label="Điểm nổi bật">
              <div>
                <SparkIcon />
                <span>
                  <strong>Thiết kế tỉ mỉ</strong>
                  <small>Đáng yêu từng chi tiết</small>
                </span>
              </div>
              <div>
                <SparkIcon />
                <span>
                  <strong>Chất liệu phù hợp</strong>
                  <small>Chọn theo từng sản phẩm</small>
                </span>
              </div>
              <div>
                <SparkIcon />
                <span>
                  <strong>Đóng gói cẩn thận</strong>
                  <small>Sẵn sàng gửi đến bạn</small>
                </span>
              </div>
            </div>
          </div>

          <div className="home-cute__hero-visual">
            <span className="home-cute__hero-spark home-cute__hero-spark--one">
              ✦
            </span>
            <span className="home-cute__hero-spark home-cute__hero-spark--two">
              ♡
            </span>
            <span className="home-cute__hero-spark home-cute__hero-spark--three">
              ✧
            </span>

            <img
              src={heroImageUrl}
              alt={heroImageAlt}
              width="770"
              height="455"
              fetchPriority="high"
            />

            {banner?.emoji && (
              <span className="home-cute__hero-emoji" aria-hidden="true">
                {banner.emoji}
              </span>
            )}
          </div>
        </div>
      </section>

      {(bannersError || catalogError) && (
        <div className="sf-container home-cute__notice" role="alert">
          <span>
            {catalogError ||
              bannersError ||
              "Không thể tải đầy đủ dữ liệu trang chủ."}
          </span>
          {catalogError && (
            <button type="button" onClick={() => void loadCatalog(true)}>
              Thử lại
            </button>
          )}
        </div>
      )}

      {bannersLoading && (
        <p className="sf-container home-cute__loading-note">
          Đang cập nhật banner...
        </p>
      )}

      <section className="home-cute__content">
        <div className="sf-container home-cute__panel">
          <div className="home-cute__section-heading">
            <div>
              <span className="home-cute__section-kicker">Bộ sưu tập</span>
              <h2>
                Khám phá theo mood <span aria-hidden="true">🌸</span>
              </h2>
            </div>

            <div className="home-cute__section-actions">
              <div
                className="home-cute__collection-nav"
                aria-label="Điều hướng bộ sưu tập"
              >
                <button
                  type="button"
                  onClick={() => scrollCollections("left")}
                  aria-label="Xem bộ sưu tập phía trước"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => scrollCollections("right")}
                  aria-label="Xem bộ sưu tập tiếp theo"
                >
                  →
                </button>
              </div>

              <Link to="/san-pham" className="home-cute__text-link">
                Xem tất cả
                <ArrowIcon />
              </Link>
            </div>
          </div>

          <div
            ref={collectionTrackRef}
            className="home-cute__collection-track"
          >
            {catalogLoading && categories.length === 0
              ? Array.from({ length: 4 }).map((_item, index) => (
                  <div
                    className="home-cute__collection-skeleton"
                    key={index}
                    aria-hidden="true"
                  />
                ))
              : categories.map((category, index) => {
                  const previews = collectionProducts[category.id] ?? [];
                  const product = previews[0];
                  const image = primaryImage(product);
                  const tone =
                    COLLECTION_TONES[index % COLLECTION_TONES.length];

                  return (
                    <Link
                      key={category.id}
                      className={`home-cute__collection-card home-cute__collection-card--${tone}`}
                      to={`/san-pham?danh-muc=${encodeURIComponent(category.slug)}`}
                    >
                      <div className="home-cute__collection-copy">
                        <span
                          className="home-cute__collection-emoji"
                          aria-hidden="true"
                        >
                          {category.emoji || "✦"}
                        </span>
                        <div>
                          <h3>{category.name}</h3>
                          <p>{collectionDescription(category)}</p>
                        </div>
                      </div>

                      <div className="home-cute__collection-visual">
                        {image ? (
                          <img
                            src={image.url}
                            alt={
                              image.altText ||
                              product?.name ||
                              category.name
                            }
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <span aria-hidden="true">
                            {category.emoji || "♡"}
                          </span>
                        )}
                      </div>

                      <div className="home-cute__collection-bottom">
                        <span>
                          {previews.length > 0
                            ? `${previews.length} món nổi bật`
                            : "Khám phá danh mục"}
                        </span>
                        <span
                          className="home-cute__round-arrow"
                          aria-hidden="true"
                        >
                          <ArrowIcon />
                        </span>
                      </div>
                    </Link>
                  );
                })}
          </div>

          <div className="home-cute__benefit-strip">
            <article>
              <span className="home-cute__benefit-icon home-cute__benefit-icon--lavender">
                <PencilIcon />
              </span>
              <div>
                <h3>Thiết kế riêng</h3>
                <p>In theo ý tưởng của bạn</p>
              </div>
            </article>

            <article>
              <span className="home-cute__benefit-icon home-cute__benefit-icon--blue">
                <SparkIcon />
              </span>
              <div>
                <h3>Chất lượng cao</h3>
                <p>Sản phẩm sắc nét, chỉn chu</p>
              </div>
            </article>

            <article>
              <span className="home-cute__benefit-icon home-cute__benefit-icon--coral">
                <CardIcon />
              </span>
              <div>
                <h3>Thanh toán dễ dàng</h3>
                <p>Thông tin rõ ràng, thao tác gọn</p>
              </div>
            </article>

            <article>
              <span className="home-cute__benefit-icon home-cute__benefit-icon--mint">
                <HeadsetIcon />
              </span>
              <div>
                <h3>Hỗ trợ tận tâm</h3>
                <p>Tư vấn theo nhu cầu thực tế</p>
              </div>
            </article>
          </div>

          <div className="home-cute__featured">
            <div className="home-cute__section-heading home-cute__section-heading--compact">
              <div>
                <span className="home-cute__section-kicker">Nổi bật</span>
                <h2>
                  Sản phẩm nổi bật <span aria-hidden="true">✦</span>
                </h2>
              </div>

              <Link to="/san-pham" className="home-cute__text-link">
                Xem tất cả
                <ArrowIcon />
              </Link>
            </div>

            {catalogLoading && featuredProducts.length === 0 ? (
              <ProductGridSkeleton count={4} />
            ) : featuredProducts.length > 0 ? (
              <div className="home-cute__product-grid">
                {featuredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="home-cute__empty-state">
                <span aria-hidden="true">♡</span>
                <p>Chưa có sản phẩm nổi bật.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="sf-container home-cute__custom">
        <div className="home-cute__custom-copy">
          <span className="home-cute__section-kicker">
            Ý tưởng của riêng bạn
          </span>
          <h2>
            {settings.customPrintTitle ||
              "Biến ý tưởng thành món đồ của riêng bạn"}
          </h2>
          <p>
            {settings.customPrintDescription ||
              "Không cần biết thiết kế 3D. Chỉ cần gửi hình, phác thảo hoặc kể ý tưởng. InGiDay sẽ cùng bạn chốt kiểu dáng, màu sắc và kích thước phù hợp."}
          </p>

          <div className="home-cute__custom-steps">
            <article>
              <span>01</span>
              <div>
                <h3>{settings.customPrintStep1Title || "Gửi ý tưởng"}</h3>
                <p>
                  {settings.customPrintStep1Description ||
                    "Gửi hình tham khảo hoặc mô tả món đồ bạn muốn."}
                </p>
              </div>
            </article>

            <article>
              <span>02</span>
              <div>
                <h3>
                  {settings.customPrintStep2Title ||
                    "Duyệt mẫu và báo giá"}
                </h3>
                <p>
                  {settings.customPrintStep2Description ||
                    "Cùng chốt phương án phù hợp trước khi sản xuất."}
                </p>
              </div>
            </article>

            <article>
              <span>03</span>
              <div>
                <h3>
                  {settings.customPrintStep3Title || "In và hoàn thiện"}
                </h3>
                <p>
                  {settings.customPrintStep3Description ||
                    "In 3D, kiểm tra và hoàn thiện sản phẩm trước khi gửi."}
                </p>
              </div>
            </article>
          </div>

          <div className="home-cute__custom-actions">
            <Link className="sf-button sf-button--primary" to="/in-rieng">
              {settings.customPrintButtonText || "Gửi yêu cầu thiết kế"}
              <ArrowIcon />
            </Link>

            {messengerUrl && (
              <a
                className="home-cute__messenger-link"
                href={messengerUrl}
                target="_blank"
                rel="noreferrer"
              >
                Nhắn InGiDay
              </a>
            )}
          </div>
        </div>

        <div className="home-cute__custom-art" aria-hidden="true">
          <div className="home-cute__custom-bubble home-cute__custom-bubble--one">
            your idea
          </div>
          <div className="home-cute__custom-bubble home-cute__custom-bubble--two">
            one of one
          </div>
          <span className="home-cute__custom-star">✦</span>
          <span className="home-cute__custom-heart">♡</span>
          <div className="home-cute__custom-object">
            <span>3D</span>
            <strong>+</strong>
            <span>YOU</span>
          </div>
        </div>
      </section>
    </main>
  );
}

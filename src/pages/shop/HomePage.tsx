/* eslint-disable react-hooks/set-state-in-effect */
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";

import ProductGridSkeleton from "../../components/shop/ProductGridSkeleton";
import ProductCard from "../../components/shop/ProductCard";
import { useBanners } from "../../features/banners/BannersContext";
import {
  fetchActiveCategories,
  fetchFeaturedProducts,
} from "../../services/products";
import type {
  Category,
  Product,
} from "../../types/product";

function isBannerAvailable(
  startsAt?: string,
  endsAt?: string,
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (startsAt) {
    const start = new Date(
      `${startsAt}T00:00:00`,
    );

    if (start > today) {
      return false;
    }
  }

  if (endsAt) {
    const end = new Date(
      `${endsAt}T23:59:59`,
    );

    if (end < today) {
      return false;
    }
  }

  return true;
}

export default function HomePage() {
  const {
    banners,
    loading: bannersLoading,
    error: bannersError,
  } = useBanners();

  const [categories, setCategories] = useState<
    Category[]
  >([]);
  const [featuredProducts, setFeaturedProducts] =
    useState<Product[]>([]);
  const [catalogLoading, setCatalogLoading] =
    useState(true);
  const [catalogError, setCatalogError] =
    useState("");

  const loadCatalog = useCallback(
    async (force = false) => {
      setCatalogLoading(true);
      setCatalogError("");

      try {
        const [
          nextCategories,
          nextFeaturedProducts,
        ] = await Promise.all([
          fetchActiveCategories({ force }),
          fetchFeaturedProducts(4, { force }),
        ]);

        setCategories(nextCategories);
        setFeaturedProducts(
          nextFeaturedProducts,
        );
      } catch (error) {
        setCatalogError(
          error instanceof Error
            ? error.message
            : "Không thể tải sản phẩm.",
        );
      } finally {
        setCatalogLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const banner = [...banners]
    .filter(
      (item) =>
        item.active &&
        isBannerAvailable(
          item.startsAt,
          item.endsAt,
        ),
    )
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder,
    )[0];

  return (
    <>
      <section className="mx-auto max-w-7xl px-5 pt-6 lg:px-16">
        <div
          className="relative isolate min-h-[500px] overflow-hidden rounded-[32px] px-7 py-12 shadow-[0_20px_60px_-30px_rgba(0,99,151,0.45)] sm:px-12 lg:flex lg:items-center lg:px-16"
          style={{
            background:
              banner?.background ??
              "linear-gradient(135deg, #d9eaff 0%, #edf4ff 55%, #ffe1ef 100%)",
          }}
        >
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex rounded-full border border-[#fe7e4f]/30 bg-white/70 px-4 py-2 text-xs font-bold text-[#a43c12] backdrop-blur">
              {banner?.badge ||
                "Sáng tạo không giới hạn"}
            </span>

            <h1 className="mt-6 text-4xl font-black leading-tight tracking-[-0.03em] text-[#091d2e] sm:text-5xl lg:text-6xl">
              {banner?.title ||
                "Những món đồ nhỏ xíu nhưng vui cả ngày"}
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-[#3f4850] sm:text-lg">
              {banner?.description ||
                "Khám phá thế giới sản phẩm in 3D đầy màu sắc, độc đáo và mang dấu ấn riêng của bạn."}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={
                  banner?.primaryLink ||
                  "/san-pham"
                }
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#fe7e4f] px-7 font-bold text-white shadow-lg shadow-[#fe7e4f]/25 transition hover:-translate-y-0.5"
              >
                {banner?.primaryLabel ||
                  "Khám phá ngay →"}
              </Link>

              <Link
                to={
                  banner?.secondaryLink ||
                  "/in-rieng"
                }
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white/80 px-7 font-bold text-[#006397] transition hover:bg-white"
              >
                {banner?.secondaryLabel ||
                  "Yêu cầu in riêng"}
              </Link>
            </div>
          </div>

          <div className="pointer-events-none mt-10 grid place-items-center lg:absolute lg:inset-y-0 lg:right-8 lg:mt-0 lg:w-[42%]">
            {banner?.imageUrl ? (
              <div className="relative aspect-square w-full max-w-[360px] overflow-hidden rounded-[34%] bg-white/55 shadow-[0_25px_60px_-25px_rgba(0,99,151,0.45)]">
                <img
                  src={banner.imageUrl}
                  alt={
                    banner.imageAlt ||
                    banner.title
                  }
                  width="720"
                  height="720"
                  className="h-full w-full object-cover"
                  decoding="async"
                />
              </div>
            ) : (
              <div className="relative grid h-72 w-72 place-items-center rounded-[40%] bg-white/55 text-[120px] shadow-[0_25px_60px_-25px_rgba(0,99,151,0.45)] backdrop-blur sm:h-80 sm:w-80 sm:text-[150px]">
                {banner?.emoji || "🐲"}
                <span className="absolute -left-4 top-6 text-5xl">
                  ✨
                </span>
                <span className="absolute -bottom-3 right-4 text-6xl">
                  🤖
                </span>
              </div>
            )}
          </div>
        </div>

        {(bannersError || catalogError) && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm font-semibold text-[#a43c12]">
            <span>
              {catalogError ||
                bannersError ||
                "Không thể tải đủ dữ liệu."}
            </span>

            {catalogError && (
              <button
                type="button"
                onClick={() =>
                  void loadCatalog(true)
                }
                className="rounded-xl bg-white px-4 py-2 font-bold"
              >
                Thử lại
              </button>
            )}
          </div>
        )}

        {bannersLoading && (
          <p className="mt-3 text-center text-xs text-[#707881]">
            Đang cập nhật banner...
          </p>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-5 pt-16 lg:px-16">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#006397]">
            Danh mục
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Khám phá theo sở thích
          </h2>
        </div>

        {catalogLoading &&
        categories.length === 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map(
              (_item, index) => (
                <div
                  key={index}
                  className="h-36 animate-pulse rounded-3xl bg-[#eaf0f6]"
                />
              ),
            )}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/san-pham?danh-muc=${category.id}`}
                className="group rounded-3xl p-5 text-center transition hover:-translate-y-1"
                style={{
                  backgroundColor:
                    category.background,
                }}
              >
                <div className="text-5xl transition duration-300 group-hover:scale-110">
                  {category.emoji}
                </div>
                <h3 className="mt-4 text-sm font-bold text-[#091d2e]">
                  {category.name}
                </h3>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-5 pt-16 lg:px-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#006397]">
              Nổi bật
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Được yêu thích nhất
            </h2>
          </div>

          <Link
            to="/san-pham"
            className="font-bold text-[#006397] hover:text-[#a43c12]"
          >
            Xem tất cả →
          </Link>
        </div>

        <div className="mt-8">
          {catalogLoading &&
          featuredProducts.length === 0 ? (
            <ProductGridSkeleton count={4} />
          ) : featuredProducts.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.map(
                (product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                  />
                ),
              )}
            </div>
          ) : (
            <div className="rounded-3xl bg-white p-10 text-center text-[#707881]">
              Chưa có sản phẩm nổi bật.
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pt-16 lg:px-16">
        <div className="overflow-hidden rounded-[32px] bg-[#006397] px-7 py-10 text-white sm:px-12 lg:flex lg:items-center lg:justify-between lg:px-16">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#cce5ff]">
              Ý tưởng của riêng bạn
            </p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Có mẫu muốn in? Va ngay với chủ
              shop
            </h2>
            <p className="mt-4 leading-7 text-[#e8f2ff]">
              Gửi ý tưởng qua Messenger, shop sẽ
              trao đổi nhanh về mẫu, kích thước và
              chi phí.
            </p>
          </div>

          <Link
            to="/in-rieng"
            className="mt-7 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#fe7e4f] px-7 font-bold text-white lg:mt-0"
          >
            Xem quy trình
          </Link>
        </div>
      </section>
    </>
  );
}
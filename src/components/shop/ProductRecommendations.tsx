/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { fetchProductRecommendations } from "../../services/productRecommendations";
import type { Product } from "../../types/product";
import ProductCard from "./ProductCard";

type ProductRecommendationsProps = {
  product: Pick<Product, "id" | "categoryId">;
};

type RecommendationState = {
  similar: Product[];
  bestselling: Product[];
};

const emptyState: RecommendationState = {
  similar: [],
  bestselling: [],
};

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_item, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-[26px] border border-[rgba(88,63,80,0.06)] bg-white shadow-[0_12px_30px_rgba(86,53,74,0.06)]"
          aria-hidden="true"
        >
          <div className="aspect-square animate-pulse bg-[#f5eff2]" />
          <div className="space-y-3 p-4">
            <div className="h-3 w-2/3 animate-pulse rounded-full bg-[var(--sf-pink-soft)]" />
            <div className="h-5 animate-pulse rounded-full bg-[#f0e9ed]" />
            <div className="h-5 w-1/2 animate-pulse rounded-full bg-[#eee5ff]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function RecommendationGroup({
  eyebrow,
  title,
  description,
  products,
}: {
  eyebrow: string;
  title: string;
  description: string;
  products: Product[];
}) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--sf-pink-strong)]">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--sf-ink)] sm:text-3xl">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--sf-ink-soft)]">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {products.map((item) => (
          <ProductCard key={item.id} product={item} />
        ))}
      </div>
    </section>
  );
}

export default function ProductRecommendations({
  product,
}: ProductRecommendationsProps) {
  const [data, setData] = useState(emptyState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    void fetchProductRecommendations(
      product.id,
      product.categoryId,
      6,
      retryVersion > 0,
    )
      .then((result) => {
        if (active) {
          setData(result);
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Không thể tải gợi ý sản phẩm.",
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
  }, [product.categoryId, product.id, retryVersion]);

  if (loading) {
    return (
      <div className="mt-16 border-t border-[var(--sf-border)] pt-12">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--sf-pink-strong)]">
          Có thể bạn sẽ thích
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--sf-ink)] sm:text-3xl">
          Đang tải sản phẩm gợi ý
        </h2>
        <div className="mt-6">
          <CardsSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-16 rounded-[28px] border border-[rgba(214,117,80,0.18)] bg-[#fff5ed] p-6 text-center">
        <p className="font-bold text-[#884426]">{error}</p>
        <button
          type="button"
          onClick={() => setRetryVersion((current) => current + 1)}
          className="mt-4 rounded-full border border-[rgba(255,95,143,0.18)] bg-white px-5 py-3 text-sm font-black text-[var(--sf-pink-strong)] shadow-sm transition hover:-translate-y-0.5"
        >
          Tải lại gợi ý
        </button>
      </div>
    );
  }

  if (
    data.similar.length === 0 &&
    data.bestselling.length === 0
  ) {
    return null;
  }

  return (
    <div className="mt-16 space-y-14 border-t border-[var(--sf-border)] pt-12">
      <RecommendationGroup
        eyebrow="Cùng mood"
        title="Có thể bạn sẽ thích"
        description="Những món cùng nhóm sản phẩm để bạn khám phá thêm."
        products={data.similar}
      />

      <RecommendationGroup
        eyebrow="Được quan tâm"
        title="Những món đang được chọn nhiều"
        description="Gợi ý thêm từ các sản phẩm bán chạy trong cửa hàng."
        products={data.bestselling}
      />
    </div>
  );
}

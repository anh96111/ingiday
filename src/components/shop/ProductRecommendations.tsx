/* eslint-disable react-hooks/set-state-in-effect */
import {
  useEffect,
  useState,
} from "react";

import {
  fetchProductRecommendations,
} from "../../services/productRecommendations";
import type {
  Product,
} from "../../types/product";
import ProductCard from "./ProductCard";

type ProductRecommendationsProps = {
  product: Pick<
    Product,
    "id" | "categoryId"
  >;
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
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map(
        (_item, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-3xl bg-white shadow-sm"
          >
            <div className="aspect-square animate-pulse bg-[#e8eef4]" />
            <div className="space-y-3 p-4">
              <div className="h-3 w-2/3 animate-pulse rounded bg-[#dce6ef]" />
              <div className="h-5 animate-pulse rounded bg-[#e8eef4]" />
              <div className="h-5 w-1/2 animate-pulse rounded bg-[#dce6ef]" />
            </div>
          </div>
        ),
      )}
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
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#006397]">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#091d2e] sm:text-3xl">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#707881]">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {products.map((item) => (
          <ProductCard
            key={item.id}
            product={item}
          />
        ))}
      </div>
    </section>
  );
}

export default function ProductRecommendations({
  product,
}: ProductRecommendationsProps) {
  const [data, setData] =
    useState<RecommendationState>(
      emptyState,
    );
  const [loading, setLoading] =
    useState(true);
  const [error, setError] = useState("");
  const [retryVersion, setRetryVersion] =
    useState(0);

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
  }, [
    product.categoryId,
    product.id,
    retryVersion,
  ]);

  if (loading) {
    return (
      <div className="mt-16 border-t border-[#dce3ea] pt-12">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[#006397]">
          Có thể bạn sẽ thích
        </p>
        <h2 className="mt-2 text-2xl font-black sm:text-3xl">
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
      <div className="mt-16 rounded-3xl border border-[#f0c6b5] bg-[#fff5f1] p-6 text-center">
        <p className="font-bold text-[#a43c12]">
          {error}
        </p>
        <button
          type="button"
          onClick={() =>
            setRetryVersion(
              (current) => current + 1,
            )
          }
          className="mt-4 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#006397] shadow-sm"
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
    <div className="mt-16 space-y-14 border-t border-[#dce3ea] pt-12">
      <RecommendationGroup
        eyebrow="Khám phá thêm"
        title="Sản phẩm tương tự"
        description="Ưu tiên sản phẩm cùng danh mục, còn hàng và đang được quan tâm."
        products={data.similar}
      />

      <RecommendationGroup
        eyebrow="Được chọn nhiều"
        title="Sản phẩm bán chạy"
        description="Xếp theo tổng số lượng từ các đơn đã tạo thành công và chưa bị hủy."
        products={data.bestselling}
      />
    </div>
  );
}

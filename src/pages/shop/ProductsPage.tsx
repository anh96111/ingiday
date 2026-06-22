import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";

import ProductGridSkeleton from "../../components/shop/ProductGridSkeleton";
import ProductCard from "../../components/shop/ProductCard";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useProductSearch } from "../../hooks/useProductSearch";
import { fetchActiveCategories } from "../../services/products";
import type {
  CatalogSort,
  Category,
  ProductSearchFilters,
} from "../../types/product";

const PAGE_SIZE = 12;

function numberParam(
  value: string | null,
  fallback: number,
) {
  if (value === null || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : fallback;
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] =
    useSearchParams();

  const keyword = searchParams.get("q") ?? "";
  const categoryId =
    searchParams.get("danh-muc") ?? "";
  const minPrice = numberParam(
    searchParams.get("gia-tu"),
    0,
  );
  const maxPrice = numberParam(
    searchParams.get("gia-den"),
    500000,
  );
  const inStock =
    searchParams.get("con-hang") === "1";
  const sort =
    (searchParams.get("sap-xep") as
      | CatalogSort
      | null) ?? "relevance";
  const page = Math.max(
    1,
    numberParam(searchParams.get("trang"), 1),
  );

  const debouncedKeyword = useDebouncedValue(
    keyword,
    400,
  );

  const [categories, setCategories] = useState<
    Category[]
  >([]);
  const [categoriesError, setCategoriesError] =
    useState("");

  useEffect(() => {
    let active = true;

    void fetchActiveCategories()
      .then((data) => {
        if (active) {
          setCategories(data);
          setCategoriesError("");
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setCategoriesError(
            error instanceof Error
              ? error.message
              : "Không thể tải danh mục.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const filters = useMemo<ProductSearchFilters>(
    () => ({
      query: debouncedKeyword,
      categoryId,
      minPrice,
      maxPrice,
      inStock,
      sort,
      page,
      pageSize: PAGE_SIZE,
    }),
    [
      categoryId,
      debouncedKeyword,
      inStock,
      maxPrice,
      minPrice,
      page,
      sort,
    ],
  );

  const {
    data,
    loading,
    error,
    retry,
  } = useProductSearch(filters);

  function updateParam(
    name: string,
    value?: string,
    resetPage = true,
  ) {
    const next = new URLSearchParams(searchParams);

    if (value) {
      next.set(name, value);
    } else {
      next.delete(name);
    }

    if (resetPage) {
      next.delete("trang");
    }

    setSearchParams(next, {
      replace: true,
    });
  }

  function goToPage(nextPage: number) {
    updateParam(
      "trang",
      String(nextPage),
      false,
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  const hasPreviousData =
    data.products.length > 0;

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-16">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#006397]">
          Cửa hàng
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          Tất cả sản phẩm
        </h1>
        <p className="mt-3 text-[#707881]">
          Tìm có dấu hoặc không dấu, lọc trực tiếp
          từ kho sản phẩm.
        </p>
      </div>

      <div className="mt-7 grid gap-4 rounded-3xl bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-6">
        <label className="text-sm font-bold xl:col-span-2">
          Tìm kiếm
          <input
            value={keyword}
            onChange={(event) =>
              updateParam(
                "q",
                event.target.value,
              )
            }
            className="mt-2 h-12 w-full rounded-2xl border border-[#bfc7d2] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]"
            placeholder="Tên, mô tả hoặc danh mục..."
          />
        </label>

        <label className="text-sm font-bold">
          Danh mục
          <select
            value={categoryId}
            onChange={(event) =>
              updateParam(
                "danh-muc",
                event.target.value,
              )
            }
            className="mt-2 h-12 w-full rounded-2xl border border-[#bfc7d2] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]"
          >
            <option value="">
              Tất cả danh mục
            </option>
            {categories.map((category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-bold">
          Giá từ
          <input
            type="number"
            min="0"
            step="10000"
            value={minPrice}
            onChange={(event) =>
              updateParam(
                "gia-tu",
                event.target.value,
              )
            }
            className="mt-2 h-12 w-full rounded-2xl border border-[#bfc7d2] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]"
          />
        </label>

        <label className="text-sm font-bold">
          Giá đến
          <input
            type="number"
            min="0"
            step="10000"
            value={maxPrice}
            onChange={(event) =>
              updateParam(
                "gia-den",
                event.target.value,
              )
            }
            className="mt-2 h-12 w-full rounded-2xl border border-[#bfc7d2] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]"
          />
        </label>

        <label className="text-sm font-bold">
          Sắp xếp
          <select
            value={sort}
            onChange={(event) =>
              updateParam(
                "sap-xep",
                event.target.value,
              )
            }
            className="mt-2 h-12 w-full rounded-2xl border border-[#bfc7d2] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]"
          >
            <option value="relevance">
              Liên quan nhất
            </option>
            <option value="newest">
              Mới nhất
            </option>
            <option value="bestselling">
              Bán chạy
            </option>
            <option value="price_asc">
              Giá tăng dần
            </option>
            <option value="price_desc">
              Giá giảm dần
            </option>
          </select>
        </label>

        <label className="flex items-center gap-3 text-sm font-bold md:col-span-2 xl:col-span-6">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(event) =>
              updateParam(
                "con-hang",
                event.target.checked
                  ? "1"
                  : undefined,
              )
            }
            className="h-5 w-5 accent-[#006397]"
          />
          Chỉ hiển thị sản phẩm còn hàng
        </label>
      </div>

      {(error || categoriesError) && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#fff0eb] px-5 py-4 text-sm font-semibold text-[#a43c12]">
          <span>
            {error || categoriesError}
          </span>

          <button
            type="button"
            onClick={retry}
            className="rounded-xl bg-white px-4 py-2 font-bold"
          >
            Thử lại
          </button>
        </div>
      )}

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <p className="font-bold text-[#3f4850]">
          Tìm thấy {data.total} sản phẩm
        </p>

        {loading && hasPreviousData && (
          <p className="text-sm font-semibold text-[#006397]">
            Đang cập nhật kết quả...
          </p>
        )}
      </div>

      <div
        className={`relative mt-6 transition-opacity ${
          loading && hasPreviousData
            ? "opacity-60"
            : "opacity-100"
        }`}
      >
        {loading && !hasPreviousData ? (
          <ProductGridSkeleton count={PAGE_SIZE} />
        ) : data.products.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {data.products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
            <h2 className="text-2xl font-black">
              Chưa tìm thấy sản phẩm
            </h2>
            <p className="mt-3 text-[#707881]">
              Hãy đổi từ khóa hoặc bộ lọc.
            </p>
          </div>
        )}
      </div>

      {data.totalPages > 1 && (
        <nav
          className="mt-8 flex items-center justify-center gap-3"
          aria-label="Phân trang sản phẩm"
        >
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => goToPage(page - 1)}
            className="rounded-xl bg-[#edf4ff] px-5 py-3 font-bold text-[#006397] disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Trang trước
          </button>

          <span className="min-w-28 text-center text-sm font-bold text-[#3f4850]">
            Trang {page}/{data.totalPages}
          </span>

          <button
            type="button"
            disabled={
              page >= data.totalPages || loading
            }
            onClick={() => goToPage(page + 1)}
            className="rounded-xl bg-[#006397] px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Trang sau →
          </button>
        </nav>
      )}
    </section>
  );
}
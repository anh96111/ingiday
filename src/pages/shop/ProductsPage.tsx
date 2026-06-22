import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../../components/shop/ProductCard";
import { useStoreData } from "../../features/admin/StoreDataContext";

export default function ProductsPage() {
  const { categories, products, loading, error } = useStoreData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [maxPrice, setMaxPrice] = useState(500000);
  const keyword = searchParams.get("q") ?? "";
  const category = searchParams.get("danh-muc") ?? "";
  const visibleCategories = categories.filter((item) => item.status === "active");

  const filteredProducts = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase("vi");
    return products.filter((product) => {
      const matchesVisibility = product.status !== "hidden";
      const matchesKeyword = !normalizedKeyword || product.name.toLocaleLowerCase("vi").includes(normalizedKeyword);
      const matchesCategory = !category || product.categoryId === category;
      const matchesPrice = product.price <= maxPrice;
      return matchesVisibility && matchesKeyword && matchesCategory && matchesPrice;
    });
  }, [category, keyword, maxPrice, products]);

  function updateCategory(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("danh-muc", value);
    else next.delete("danh-muc");
    setSearchParams(next);
  }

  if (loading) {
    return <section className="mx-auto max-w-7xl px-5 py-20 text-center lg:px-16">Đang tải sản phẩm...</section>;
  }

  if (error) {
    return <section className="mx-auto max-w-7xl px-5 py-20 text-center font-semibold text-[#a43c12] lg:px-16">{error}</section>;
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 lg:px-16">
      <div><p className="text-sm font-bold uppercase tracking-[0.2em] text-[#006397]">Cửa hàng</p><h1 className="mt-3 text-3xl font-black sm:text-4xl">Tất cả sản phẩm</h1><p className="mt-3 text-[#3f4850]">Tìm theo tên, danh mục hoặc khoảng giá.</p></div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-3xl bg-white p-5 shadow-[0_15px_40px_-25px_rgba(0,99,151,0.45)]">
          <label className="block text-sm font-bold text-[#091d2e]">Tìm kiếm<input value={keyword} onChange={(event) => { const next = new URLSearchParams(searchParams); const value = event.target.value; if (value) next.set("q", value); else next.delete("q"); setSearchParams(next, { replace: true }); }} className="mt-2 h-12 w-full rounded-2xl border border-[#bfc7d2] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]" placeholder="Tên sản phẩm..." /></label>
          <label className="mt-5 block text-sm font-bold text-[#091d2e]">Danh mục<select value={category} onChange={(event) => updateCategory(event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-[#bfc7d2] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]"><option value="">Tất cả danh mục</option>{visibleCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="mt-5 block text-sm font-bold text-[#091d2e]">Giá tối đa: {new Intl.NumberFormat("vi-VN").format(maxPrice)} VNĐ<input type="range" min="50000" max="500000" step="10000" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} className="mt-4 w-full accent-[#006397]" /></label>
        </aside>
        <div>
          <div className="mb-5 flex items-center justify-between gap-3"><p className="text-sm text-[#3f4850]">Tìm thấy <strong>{filteredProducts.length}</strong> sản phẩm</p></div>
          {filteredProducts.length > 0 ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="grid min-h-80 place-items-center rounded-3xl bg-white p-8 text-center"><div><div className="text-6xl">😴</div><h2 className="mt-4 text-xl font-black">Chưa tìm thấy sản phẩm</h2><p className="mt-2 text-[#3f4850]">Hãy đổi từ khóa hoặc bộ lọc.</p></div></div>}
        </div>
      </div>
    </section>
  );
}

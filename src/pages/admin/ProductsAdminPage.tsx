import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStoreData } from "../../features/admin/StoreDataContext";
import type { ProductStatus } from "../../types/product";
import { formatCurrency } from "../../utils/currency";
import { optimizeCloudinaryUrl } from "../../lib/cloudinary";

const statusLabels: Record<ProductStatus, string> = {
  active: "Đang bán",
  hidden: "Đang ẩn",
  out_of_stock: "Hết hàng",
};

const statusClasses: Record<ProductStatus, string> = {
  active: "bg-[#dcf8eb] text-[#14633d]",
  hidden: "bg-[#edf0f3] text-[#4f5963]",
  out_of_stock: "bg-[#fff0eb] text-[#a43c12]",
};

export default function ProductsAdminPage() {
  const { products, categories, loading, error: loadError, deleteProduct, duplicateProduct, toggleProductVisibility } = useStoreData();
  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");

  const filteredProducts = useMemo(() => {
    const normalized = keyword.trim().toLocaleLowerCase("vi");
    return products.filter((product) => {
      const matchesKeyword = !normalized || product.name.toLocaleLowerCase("vi").includes(normalized) || product.id.toLocaleLowerCase("vi").includes(normalized);
      const matchesCategory = !categoryId || product.categoryId === categoryId;
      const matchesStatus = !status || product.status === status;
      return matchesKeyword && matchesCategory && matchesStatus;
    });
  }, [categoryId, keyword, products, status]);

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`Xóa sản phẩm "${name}"?`)) return;
    void deleteProduct(id);
  }

  if (loading) {
    return <section className="rounded-3xl bg-white p-8 text-center shadow-sm">Đang tải sản phẩm...</section>;
  }

  if (loadError) {
    return <section className="rounded-3xl bg-[#fff0eb] p-8 text-center font-semibold text-[#a43c12] shadow-sm">{loadError}</section>;
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#006397]">Sản phẩm</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Quản lý sản phẩm</h1>
          <p className="mt-3 text-[#3f4850]">Thêm, sửa, nhân bản, ẩn hoặc xóa sản phẩm.</p>
        </div>
        <Link to="/admin/san-pham/them" className="inline-flex min-h-12 items-center rounded-2xl bg-[#fe7e4f] px-6 font-bold text-white">
          + Thêm sản phẩm
        </Link>
      </div>

      <div className="mt-8 grid gap-4 rounded-3xl bg-white p-5 shadow-sm md:grid-cols-3">
        <label className="text-sm font-bold">
          Tìm kiếm
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#cfd6dd] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]" placeholder="Tên hoặc mã sản phẩm" />
        </label>
        <label className="text-sm font-bold">
          Danh mục
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#cfd6dd] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]">
            <option value="">Tất cả danh mục</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">
          Trạng thái
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#cfd6dd] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]">
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang bán</option>
            <option value="hidden">Đang ẩn</option>
            <option value="out_of_stock">Hết hàng</option>
          </select>
        </label>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#e3e8ee] px-5 py-4">
          <p className="text-sm text-[#3f4850]">Hiển thị <strong>{filteredProducts.length}</strong> sản phẩm</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse text-left text-sm">
            <thead className="bg-[#f7f9ff] text-xs uppercase tracking-wide text-[#5f6872]">
              <tr>
                <th className="px-5 py-4">Sản phẩm</th>
                <th className="px-4 py-4">Danh mục</th>
                <th className="px-4 py-4">Giá</th>
                <th className="px-4 py-4">Tồn kho</th>
                <th className="px-4 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf0f3]">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-[#fbfcfe]">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl text-3xl" style={{ backgroundColor: product.background }}>
                        {((product.images ?? []).find((image) => image.isPrimary) ?? (product.images ?? [])[0]) ? (
                          <img src={optimizeCloudinaryUrl(((product.images ?? []).find((image) => image.isPrimary) ?? (product.images ?? [])[0]).url, 180)} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
                        ) : product.emoji}
                      </div>
                      <div className="min-w-0">
                        <p className="max-w-xs truncate font-bold text-[#091d2e]">{product.name}</p>
                        <p className="mt-1 text-xs text-[#707881]">{product.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-[#3f4850]">{product.categoryName}</td>
                  <td className="px-4 py-4 font-bold text-[#a43c12]">{formatCurrency(product.price)}</td>
                  <td className="px-4 py-4 font-semibold">{product.stock}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClasses[product.status]}`}>{statusLabels[product.status]}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Link to={`/admin/san-pham/${product.id}/sua`} className="rounded-xl bg-[#edf4ff] px-3 py-2 text-xs font-bold text-[#006397]">Sửa</Link>
                      <button type="button" onClick={() => void duplicateProduct(product.id)} className="rounded-xl bg-[#f2ecff] px-3 py-2 text-xs font-bold text-[#6543a8]">Nhân bản</button>
                      <button type="button" onClick={() => void toggleProductVisibility(product.id)} className="rounded-xl bg-[#fff7e0] px-3 py-2 text-xs font-bold text-[#795b00]">{product.status === "hidden" ? "Hiện" : "Ẩn"}</button>
                      <button type="button" onClick={() => handleDelete(product.id, product.name)} className="rounded-xl bg-[#fff0eb] px-3 py-2 text-xs font-bold text-[#a43c12]">Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="px-5 py-14 text-center text-[#707881]">Không có sản phẩm phù hợp.</div>
        )}
      </div>
    </section>
  );
}

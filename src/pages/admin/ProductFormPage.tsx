/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStoreData } from "../../features/admin/StoreDataContext";
import ProductImageManager from "../../components/admin/ProductImageManager";
import type { Product, ProductImage, ProductInput, ProductStatus, ProductVariantGroup } from "../../types/product";
import { slugify } from "../../utils/slug";

type ProductFormState = {
  name: string;
  slug: string;
  categoryId: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  emoji: string;
  background: string;
  badge: string;
  description: string;
  images: ProductImage[];
  featured: boolean;
  status: ProductStatus;
  variantGroups: ProductVariantGroup[];
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createInitialState(product?: Product): ProductFormState {
  return {
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    categoryId: product?.categoryId ?? "",
    price: product ? String(product.price) : "",
    compareAtPrice: product?.compareAtPrice ? String(product.compareAtPrice) : "",
    stock: product ? String(product.stock) : "0",
    emoji: product?.emoji ?? "📦",
    background: product?.background ?? "#dff4ff",
    badge: product?.badge ?? "",
    description: product?.description ?? "",
    images: product?.images?.map((image) => ({ ...image })) ?? [],
    featured: product?.featured ?? false,
    status: product?.status ?? "active",
    variantGroups: product?.variantGroups?.map((group) => ({
      ...group,
      options: group.options.map((option) => ({ ...option })),
    })) ?? [],
  };
}

export default function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, categories, loading, error: loadError, createProduct, updateProduct } = useStoreData();
  const existingProduct = id ? products.find((product) => product.id === id) : undefined;
  const [form, setForm] = useState<ProductFormState>(() => createInitialState(existingProduct));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    if (existingProduct) setForm(createInitialState(existingProduct));
  }, [existingProduct?.id]);

  if (loading) {
    return <section className="rounded-3xl bg-white p-8 text-center shadow-sm">Đang tải dữ liệu sản phẩm...</section>;
  }

  if (loadError) {
    return <section className="rounded-3xl bg-[#fff0eb] p-8 text-center font-semibold text-[#a43c12] shadow-sm">{loadError}</section>;
  }

  if (id && !existingProduct) {
    return (
      <section className="rounded-3xl bg-white p-8 text-center shadow-sm">
        <div className="text-6xl">🔎</div>
        <h1 className="mt-4 text-2xl font-black">Không tìm thấy sản phẩm</h1>
        <Link to="/admin/san-pham" className="mt-6 inline-flex rounded-2xl bg-[#006397] px-6 py-3 font-bold text-white">Quay lại</Link>
      </section>
    );
  }

  function updateGroup(groupIndex: number, changes: Partial<ProductVariantGroup>) {
    setForm((current) => ({
      ...current,
      variantGroups: current.variantGroups.map((group, index) => index === groupIndex ? { ...group, ...changes } : group),
    }));
  }

  function addVariantGroup() {
    setForm((current) => ({
      ...current,
      variantGroups: [
        ...current.variantGroups,
        {
          id: makeId("nhom"),
          name: "",
          options: [{ id: makeId("lua-chon"), label: "", priceDelta: 0, stock: 0 }],
        },
      ],
    }));
  }

  function removeVariantGroup(groupIndex: number) {
    setForm((current) => ({
      ...current,
      variantGroups: current.variantGroups.filter((_, index) => index !== groupIndex),
    }));
  }

  function addVariantOption(groupIndex: number) {
    setForm((current) => ({
      ...current,
      variantGroups: current.variantGroups.map((group, index) => index === groupIndex ? {
        ...group,
        options: [...group.options, { id: makeId("lua-chon"), label: "", priceDelta: 0, stock: 0 }],
      } : group),
    }));
  }

  function updateVariantOption(groupIndex: number, optionIndex: number, field: "label" | "priceDelta" | "stock", value: string) {
    setForm((current) => ({
      ...current,
      variantGroups: current.variantGroups.map((group, index) => index === groupIndex ? {
        ...group,
        options: group.options.map((option, currentOptionIndex) => currentOptionIndex === optionIndex ? {
          ...option,
          [field]: field === "label" ? value : Math.max(0, Number(value) || 0),
        } : option),
      } : group),
    }));
  }

  function removeVariantOption(groupIndex: number, optionIndex: number) {
    setForm((current) => ({
      ...current,
      variantGroups: current.variantGroups.map((group, index) => index === groupIndex ? {
        ...group,
        options: group.options.filter((_, currentOptionIndex) => currentOptionIndex !== optionIndex),
      } : group),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (uploadingImages) {
      setError("Vui lòng chờ tải ảnh hoàn tất.");
      return;
    }

    const category = categories.find((item) => item.id === form.categoryId);
    const price = Number(form.price);
    const stock = Number(form.stock);

    if (!form.name.trim()) {
      setError("Vui lòng nhập tên sản phẩm.");
      return;
    }
    if (!category) {
      setError("Vui lòng chọn danh mục.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setError("Giá bán không hợp lệ.");
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      setError("Tồn kho không hợp lệ.");
      return;
    }

    const variantGroups = form.variantGroups
      .map((group) => ({
        ...group,
        name: group.name.trim(),
        options: group.options
          .filter((option) => option.label.trim())
          .map((option) => ({ ...option, label: option.label.trim() })),
      }))
      .filter((group) => group.name && group.options.length > 0);

    const status: ProductStatus = stock === 0 && form.status === "active" ? "out_of_stock" : form.status;
    const input: ProductInput = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      categoryId: category.id,
      categoryName: category.name,
      price,
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
      emoji: form.emoji.trim() || "📦",
      background: form.background,
      badge: form.badge.trim() || undefined,
      featured: form.featured,
      stock,
      description: form.description.trim(),
      images: form.images.map((image, index) => ({ ...image, sortOrder: index })),
      variantGroups: variantGroups.length > 0 ? variantGroups : undefined,
      status,
    };

    setSaving(true);
    const result = existingProduct
      ? await updateProduct(existingProduct.id, input)
      : await createProduct(input);
    setSaving(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    navigate("/admin/san-pham");
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#006397]">Sản phẩm</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">{existingProduct ? "Sửa sản phẩm" : "Thêm sản phẩm"}</h1>
        </div>
        <Link to="/admin/san-pham" className="inline-flex min-h-11 items-center rounded-2xl bg-white px-5 font-bold text-[#3f4850] shadow-sm">← Quay lại</Link>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Thông tin cơ bản</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <label className="md:col-span-2 text-sm font-bold">
                Tên sản phẩm <span className="text-[#a43c12]">*</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value, slug: existingProduct ? current.slug : slugify(event.target.value) }))}
                  className="mt-2 h-12 w-full rounded-2xl border border-[#cfd6dd] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]"
                  placeholder="Ví dụ: Móc khóa mèo ngái ngủ"
                />
              </label>

              <label className="text-sm font-bold">
                Đường dẫn
                <input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))} className="mt-2 h-12 w-full rounded-2xl border border-[#cfd6dd] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]" />
              </label>

              <label className="text-sm font-bold">
                Danh mục <span className="text-[#a43c12]">*</span>
                <select value={form.categoryId} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))} className="mt-2 h-12 w-full rounded-2xl border border-[#cfd6dd] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]">
                  <option value="">Chọn danh mục</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}{category.status === "hidden" ? " (đang ẩn)" : ""}</option>)}
                </select>
              </label>

              <label className="md:col-span-2 text-sm font-bold">
                Mô tả
                <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="mt-2 min-h-36 w-full resize-y rounded-2xl border border-[#cfd6dd] bg-[#f7f9ff] p-4 font-normal outline-none focus:border-[#006397]" placeholder="Mô tả đặc điểm và công dụng sản phẩm" />
              </label>
            </div>
          </article>

          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Giá và tồn kho</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-3">
              <label className="text-sm font-bold">
                Giá bán <span className="text-[#a43c12]">*</span>
                <input type="number" min="0" step="1000" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} className="mt-2 h-12 w-full rounded-2xl border border-[#cfd6dd] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]" placeholder="89000" />
              </label>
              <label className="text-sm font-bold">
                Giá gốc
                <input type="number" min="0" step="1000" value={form.compareAtPrice} onChange={(event) => setForm((current) => ({ ...current, compareAtPrice: event.target.value }))} className="mt-2 h-12 w-full rounded-2xl border border-[#cfd6dd] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]" placeholder="119000" />
              </label>
              <label className="text-sm font-bold">
                Tồn kho
                <input type="number" min="0" value={form.stock} onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))} className="mt-2 h-12 w-full rounded-2xl border border-[#cfd6dd] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]" />
              </label>
            </div>
          </article>


          <ProductImageManager
            images={form.images}
            productName={form.name}
            disabled={saving}
            onUploadingChange={setUploadingImages}
            onChange={(images) => setForm((current) => ({ ...current, images }))}
          />

          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">Biến thể</h2>
                <p className="mt-1 text-sm text-[#707881]">Dùng cho màu sắc, kích thước hoặc lựa chọn riêng.</p>
              </div>
              <button type="button" onClick={addVariantGroup} className="rounded-2xl bg-[#edf4ff] px-5 py-3 text-sm font-bold text-[#006397]">+ Thêm nhóm</button>
            </div>

            <div className="mt-5 space-y-5">
              {form.variantGroups.map((group, groupIndex) => (
                <div key={group.id} className="rounded-3xl border border-[#dce3ea] p-5">
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="min-w-60 flex-1 text-sm font-bold">
                      Tên nhóm
                      <input value={group.name} onChange={(event) => updateGroup(groupIndex, { name: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-[#cfd6dd] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]" placeholder="Màu sắc" />
                    </label>
                    <button type="button" onClick={() => removeVariantGroup(groupIndex)} className="h-11 rounded-xl bg-[#fff0eb] px-4 text-sm font-bold text-[#a43c12]">Xóa nhóm</button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {group.options.map((option, optionIndex) => (
                      <div key={option.id} className="grid gap-3 rounded-2xl bg-[#f7f9ff] p-3 md:grid-cols-[1fr_150px_130px_auto]">
                        <input value={option.label} onChange={(event) => updateVariantOption(groupIndex, optionIndex, "label", event.target.value)} className="h-10 rounded-xl border border-[#cfd6dd] bg-white px-3 outline-none focus:border-[#006397]" placeholder="Tên lựa chọn" />
                        <input type="number" min="0" step="1000" value={option.priceDelta ?? 0} onChange={(event) => updateVariantOption(groupIndex, optionIndex, "priceDelta", event.target.value)} className="h-10 rounded-xl border border-[#cfd6dd] bg-white px-3 outline-none focus:border-[#006397]" placeholder="Giá cộng" />
                        <input type="number" min="0" value={option.stock ?? 0} onChange={(event) => updateVariantOption(groupIndex, optionIndex, "stock", event.target.value)} className="h-10 rounded-xl border border-[#cfd6dd] bg-white px-3 outline-none focus:border-[#006397]" placeholder="Tồn kho" />
                        <button type="button" onClick={() => removeVariantOption(groupIndex, optionIndex)} className="h-10 rounded-xl bg-[#fff0eb] px-3 text-sm font-bold text-[#a43c12]">Xóa</button>
                      </div>
                    ))}
                  </div>

                  <button type="button" onClick={() => addVariantOption(groupIndex)} className="mt-4 rounded-xl bg-[#edf4ff] px-4 py-2 text-sm font-bold text-[#006397]">+ Thêm lựa chọn</button>
                </div>
              ))}

              {form.variantGroups.length === 0 && <div className="rounded-2xl border border-dashed border-[#bfc7d2] p-6 text-center text-sm text-[#707881]">Sản phẩm chưa có biến thể.</div>}
            </div>
          </article>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-26 xl:h-fit">
          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Hiển thị</h2>
            <label className="mt-5 block text-sm font-bold">
              Trạng thái
              <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ProductStatus }))} className="mt-2 h-12 w-full rounded-2xl border border-[#cfd6dd] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]">
                <option value="active">Đang bán</option>
                <option value="hidden">Ẩn sản phẩm</option>
                <option value="out_of_stock">Hết hàng</option>
              </select>
            </label>
            <label className="mt-5 flex items-center gap-3 rounded-2xl bg-[#f7f9ff] p-4 text-sm font-bold">
              <input type="checkbox" checked={form.featured} onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))} className="h-5 w-5 accent-[#006397]" />
              Sản phẩm nổi bật
            </label>
          </article>

          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Hiển thị dự phòng</h2>
            <p className="mt-2 text-sm leading-6 text-[#707881]">Chỉ dùng khi sản phẩm chưa có ảnh.</p>
            <div className="mt-5 grid aspect-square place-items-center rounded-3xl text-8xl" style={{ backgroundColor: form.background }}>{form.emoji || "📦"}</div>
            <div className="mt-5 grid grid-cols-[1fr_90px] gap-3">
              <label className="text-sm font-bold">Biểu tượng<input value={form.emoji} onChange={(event) => setForm((current) => ({ ...current, emoji: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-[#cfd6dd] bg-[#f7f9ff] px-3 font-normal outline-none focus:border-[#006397]" /></label>
              <label className="text-sm font-bold">Màu nền<input type="color" value={form.background} onChange={(event) => setForm((current) => ({ ...current, background: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-[#cfd6dd] bg-[#f7f9ff] p-1" /></label>
            </div>
            <label className="mt-5 block text-sm font-bold">Nhãn sản phẩm<input value={form.badge} onChange={(event) => setForm((current) => ({ ...current, badge: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-[#cfd6dd] bg-[#f7f9ff] px-3 font-normal outline-none focus:border-[#006397]" placeholder="Mới, Bán chạy..." /></label>
          </article>

          {error && <p className="rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm font-semibold text-[#a43c12]">{error}</p>}

          <button type="submit" disabled={saving || uploadingImages} className="min-h-13 w-full rounded-2xl bg-[#fe7e4f] px-6 font-bold text-white shadow-lg shadow-[#fe7e4f]/20 disabled:cursor-not-allowed disabled:opacity-60">
            {uploadingImages ? "Đang tải ảnh..." : saving ? "Đang lưu..." : existingProduct ? "Lưu thay đổi" : "Lưu và hiển thị"}
          </button>
        </aside>
      </form>
    </section>
  );
}

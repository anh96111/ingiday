/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ProductImageManager from "../../components/admin/ProductImageManager";
import { useStoreData } from "../../features/admin/StoreDataContext";
import {
  getProductAdAssignments,
  listAdDataSources,
  saveProductAdAssignments,
} from "../../services/ads";
import {
  createDefaultProductCustomOptions,
  createCustomOptionColor,
  fetchProductCustomOptions,
  listCustomOptionColors,
  saveProductCustomOptions,
} from "../../services/customProductOptions";
import type {
  AdDataSource,
  AdPlatform,
  ProductAdAssignments,
} from "../../types/ads";
import type {
  CustomOptionColor,
  ProductCustomOptionsInput,
} from "../../types/customProductOptions";
import type { Product, ProductImage, ProductInput, ProductStatus, ProductVariantGroup } from "../../types/product";
import { formatCurrency } from "../../utils/currency";
import { slugify } from "../../utils/slug";

type ProductFormState = {
  name: string;
  slug: string;
  categoryIds: string[];
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
type ProductCustomOptionsFormState = {
  enabled: boolean;
  textEnabled: boolean;
  textLabel: string;
  textPlaceholder: string;
  textMaxLength: string;
  textPriceDelta: string;
  colorIds: string[];
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createInitialState(product?: Product): ProductFormState {
  return {
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    categoryIds: product?.categoryIds?.length
      ? [...product.categoryIds]
      : product?.categoryId
        ? [product.categoryId]
        : [],
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

function createInitialCustomOptionsForm(): ProductCustomOptionsFormState {
  return {
    enabled: false,
    textEnabled: false,
    textLabel: "Custom text",
    textPlaceholder: "Ví dụ: Tên của bạn",
    textMaxLength: "30",
    textPriceDelta: "0",
    colorIds: [],
  };
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }

  return "Lỗi không xác định.";
}

function clampTextMaxLength(value: string) {
  return Math.min(120, Math.max(1, Math.trunc(Number(value) || 30)));
}

function normalizePriceDelta(value: string) {
  return Math.max(0, Math.round(Number(value) || 0));
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
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);
  const [adSources, setAdSources] = useState<AdDataSource[]>([]);
  const [adAssignments, setAdAssignments] = useState<ProductAdAssignments>({
    meta: null,
    tiktok: null,
  });
  const [adsLoading, setAdsLoading] = useState(true);
  const [adsError, setAdsError] = useState("");
  const [customColors, setCustomColors] = useState<CustomOptionColor[]>([]);
  const [customOptions, setCustomOptions] = useState<ProductCustomOptionsFormState>(() => createInitialCustomOptionsForm());
  const [customOptionsLoading, setCustomOptionsLoading] = useState(true);
  const [customOptionsError, setCustomOptionsError] = useState("");
  const [newCustomTextColorName, setNewCustomTextColorName] = useState("");
  const [newCustomTextColorHex, setNewCustomTextColorHex] = useState("#111827");
  const [savingCustomTextColor, setSavingCustomTextColor] = useState(false);
  const [newCustomTextColorError, setNewCustomTextColorError] = useState<string | null>(null);
  const isEditing = Boolean(existingProduct || createdProductId);

  useEffect(() => {
    if (existingProduct) setForm(createInitialState(existingProduct));
  }, [existingProduct?.id]);

  useEffect(() => {
    let active = true;

    if (id && !existingProduct) {
      return () => {
        active = false;
      };
    }

    setAdsLoading(true);
    setAdsError("");

    void Promise.all([
      listAdDataSources(),
      existingProduct
        ? getProductAdAssignments(existingProduct.id)
        : Promise.resolve({
            meta: null,
            tiktok: null,
          } satisfies ProductAdAssignments),
    ])
      .then(([sources, assignments]) => {
        if (!active) return;
        setAdSources(sources);
        setAdAssignments(assignments);
      })
      .catch((loadAdsError: unknown) => {
        if (!active) return;
        setAdsError(
          loadAdsError instanceof Error
            ? loadAdsError.message
            : "Không thể tải cấu hình Pixel quảng cáo.",
        );
      })
      .finally(() => {
        if (active) setAdsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, existingProduct?.id]);

  useEffect(() => {
    let active = true;
    const productId = existingProduct?.id ?? createdProductId ?? "";

    setCustomOptionsLoading(true);
    setCustomOptionsError("");

    void Promise.all([
      listCustomOptionColors(true),
      productId
        ? fetchProductCustomOptions(productId)
        : Promise.resolve(createDefaultProductCustomOptions("")),
    ])
      .then(([colors, options]) => {
        if (!active) return;

        setCustomColors(colors);
        setCustomOptions({
          enabled: options.enabled,
          textEnabled: options.text.enabled,
          textLabel: options.text.label,
          textPlaceholder: options.text.placeholder,
          textMaxLength: String(options.text.maxLength),
          textPriceDelta: String(options.text.priceDelta),
          colorIds: options.colors.map((color) => color.id),
        });
      })
      .catch((loadCustomOptionsError: unknown) => {
        if (!active) return;

        setCustomOptionsError(
          "Không thể tải Custom Product Options: " + errorMessage(loadCustomOptionsError),
        );
      })
      .finally(() => {
        if (active) setCustomOptionsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [existingProduct?.id, createdProductId]);

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

  function updateCustomOptions(changes: Partial<ProductCustomOptionsFormState>) {
    setCustomOptions((current) => ({ ...current, ...changes }));
  }

  function toggleCustomColor(colorId: string) {
    setCustomOptions((current) => {
      const hasColor = current.colorIds.includes(colorId);

      return {
        ...current,
        colorIds: hasColor
          ? current.colorIds.filter((item) => item !== colorId)
          : [...current.colorIds, colorId],
      };
    });
  }

  function colorIsSelected(colorId: string) {
    return customOptions.colorIds.includes(colorId);
  }

  async function handleAddCustomTextColor() {
    const name = newCustomTextColorName.trim();
    const colorHex = newCustomTextColorHex.trim();

    if (!name) {
      setNewCustomTextColorError("Nhập tên màu trước khi thêm.");
      return;
    }

    if (!/^#[0-9a-f]{6}$/i.test(colorHex)) {
      setNewCustomTextColorError("Mã màu phải có dạng #RRGGBB.");
      return;
    }

    setSavingCustomTextColor(true);
    setNewCustomTextColorError(null);

    try {
      const createdColor = await createCustomOptionColor({
        name,
        imageUrl: "",
        colorHex,
        isActive: true,
        sortOrder: customColors.length,
      });

      setCustomColors((colors) => [
        createdColor,
        ...colors.filter((color) => color.id !== createdColor.id),
      ]);

      if (!colorIsSelected(createdColor.id)) {
        toggleCustomColor(createdColor.id);
      }

      setNewCustomTextColorName("");
      setNewCustomTextColorHex("#111827");
    } catch (error) {
      setNewCustomTextColorError(
        error instanceof Error ? error.message : "Không thể thêm màu custom.",
      );
    } finally {
      setSavingCustomTextColor(false);
    }
  }




  function buildCustomOptionsInput(): ProductCustomOptionsInput {
    return {
      enabled: customOptions.enabled,
      text: {
        enabled: customOptions.enabled && customOptions.textEnabled,
        label: customOptions.textLabel.trim() || "Custom text",
        placeholder: customOptions.textPlaceholder.trim(),
        maxLength: clampTextMaxLength(customOptions.textMaxLength),
        priceDelta: normalizePriceDelta(customOptions.textPriceDelta),
      },
      colorIds: customOptions.enabled ? customOptions.colorIds : [],
    };
  }



  function sourcesFor(platform: AdPlatform) {
    return adSources.filter(
      (source) => source.platform === platform,
    );
  }

  function defaultSourceName(platform: AdPlatform) {
    return adSources.find(
      (source) =>
        source.platform === platform &&
        source.isDefault &&
        source.isActive,
    )?.name;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (uploadingImages) {
      setError("Vui lòng chờ tải ảnh hoàn tất.");
      return;
    }

    if (adsLoading) {
      setError("Vui lòng chờ tải cấu hình Pixel hoàn tất.");
      return;
    }

    if (adsError) {
      setError(`Không thể lưu sản phẩm: ${adsError}`);
      return;
    }

    if (customOptionsLoading) {
      setError("Vui lòng chờ tải Custom Product Options hoàn tất.");
      return;
    }

    if (customOptionsError) {
      setError(customOptionsError);
      return;
    }

    const selectedCategories = form.categoryIds
      .map((categoryId) =>
        categories.find((item) => item.id === categoryId),
      )
      .filter(
        (category): category is (typeof categories)[number] =>
          Boolean(category),
      );
    const category = selectedCategories[0];
    const price = Number(form.price);
    const stock = Number(form.stock);

    if (!form.name.trim()) {
      setError("Vui lòng nhập tên sản phẩm.");
      return;
    }
    if (
      !category ||
      selectedCategories.length !== form.categoryIds.length
    ) {
      setError("Vui lòng chọn ít nhất một bộ sưu tập.");
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

    if (customOptions.enabled && customOptions.textEnabled) {
      if (!customOptions.textLabel.trim()) {
        setError("Vui lòng nhập Label cho custom text.");
        return;
      }

      const maxLength = Number(customOptions.textMaxLength);
      if (!Number.isFinite(maxLength) || maxLength < 1 || maxLength > 120) {
        setError("Giới hạn ký tự custom text phải từ 1 đến 120.");
        return;
      }

      const priceDelta = Number(customOptions.textPriceDelta);
      if (!Number.isFinite(priceDelta) || priceDelta < 0) {
        setError("Phụ phí custom text không hợp lệ.");
        return;
      }
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
    const customOptionsInput = buildCustomOptionsInput();

    const status: ProductStatus = stock === 0 && form.status === "active" ? "out_of_stock" : form.status;
    const input: ProductInput = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      categoryId: category.id,
      categoryIds: selectedCategories.map((item) => item.id),
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
    const targetProductId =
      existingProduct?.id ?? createdProductId;
    const result = targetProductId
      ? await updateProduct(targetProductId, input)
      : await createProduct(input);

    if (!result.success) {
      setSaving(false);
      setError(result.message);
      return;
    }

    const savedProductId =
      result.data?.id ?? targetProductId;

    if (!savedProductId) {
      setSaving(false);
      setError("Sản phẩm đã lưu nhưng không xác định được mã sản phẩm.");
      return;
    }

    if (!targetProductId) {
      setCreatedProductId(savedProductId);
    }

    try {
      await saveProductCustomOptions(savedProductId, customOptionsInput);
    } catch (customSaveError) {
      setSaving(false);
      setError(
        "Sản phẩm đã lưu nhưng chưa lưu được Custom Product Options: " +
          errorMessage(customSaveError) +
          ". Bấm lưu lại để thử lại.",
      );
      return;
    }

    try {
      await saveProductAdAssignments(
        savedProductId,
        adAssignments,
      );
    } catch (assignmentError) {
      setSaving(false);
      setError(
        `Sản phẩm đã lưu nhưng chưa lưu được Pixel quảng cáo: ${assignmentError instanceof Error ? assignmentError.message : "Lỗi không xác định."} Bấm lưu lại để thử lại, hệ thống sẽ không tạo trùng sản phẩm.`,
      );
      return;
    }

    setSaving(false);
    navigate("/admin/san-pham");
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#006397]">Sản phẩm</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">{isEditing ? "Sửa sản phẩm" : "Thêm sản phẩm"}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/admin/san-pham" className="inline-flex min-h-11 items-center rounded-2xl bg-white px-5 font-bold text-[#3f4850] shadow-sm">← Quay lại</Link>
          <button
            type="submit"
            form="product-form"
            disabled={saving || uploadingImages}
            className="inline-flex min-h-11 items-center rounded-2xl bg-[#006397] px-5 font-bold text-white shadow-sm transition hover:bg-[#004c73] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? "Đang lưu..."
              : isEditing
                ? "Lưu thay đổi"
                : "Thêm sản phẩm"}
          </button>
        </div>
      </div>

      <form id="product-form" onSubmit={handleSubmit} className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Thông tin cơ bản</h2>
      <div className="mt-5 rounded-2xl border border-[#cfd6dd] bg-[#f7f9ff] px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-[#707881]">Mã sản phẩm</p>
        <p className="mt-1 font-black text-[#006397]">{existingProduct?.sku ?? "Tự sinh sau khi lưu"}</p>
      </div>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <label className="md:col-span-2 text-sm font-bold">
                Tên sản phẩm <span className="text-[#a43c12]">*</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value, slug: isEditing ? current.slug : slugify(event.target.value) }))}
                  className="mt-2 h-12 w-full rounded-2xl border border-[#cfd6dd] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]"
                  placeholder="Ví dụ: Móc khóa mèo ngái ngủ"
                />
              </label>

              <label className="text-sm font-bold">
                Đường dẫn
                <input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))} className="mt-2 h-12 w-full rounded-2xl border border-[#cfd6dd] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]" />
              </label>

              <div className="text-sm font-bold md:col-span-2">
                Bộ sưu tập <span className="text-[#a43c12]">*</span>
                <details className="group mt-2">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl border border-[#cfd6dd] bg-[#f7f9ff] px-4 py-3 outline-none focus:border-[#006397]">
                    <span className="min-w-0 flex-1 truncate font-normal">
                      {form.categoryIds.length > 0
                        ? categories
                            .filter((category) =>
                              form.categoryIds.includes(category.id),
                            )
                            .map((category) => category.name)
                            .join(", ")
                        : "Chọn bộ sưu tập"}
                    </span>
                    <span
                      aria-hidden="true"
                      className="text-[#006397] transition group-open:rotate-180"
                    >
                      ⌄
                    </span>
                  </summary>
                  <div className="mt-2 max-h-72 space-y-1 overflow-y-auto rounded-2xl border border-[#cfd6dd] bg-white p-3 shadow-sm">
                    {categories.map((category) => {
                      const checked = form.categoryIds.includes(
                        category.id,
                      );

                      return (
                        <label
                          key={category.id}
                          className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 hover:bg-[#f7f9ff]"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setForm((current) => ({
                                ...current,
                                categoryIds: checked
                                  ? current.categoryIds.filter(
                                      (categoryId) =>
                                        categoryId !== category.id,
                                    )
                                  : [
                                      ...current.categoryIds,
                                      category.id,
                                    ],
                              }))
                            }
                            className="h-4 w-4 accent-[#006397]"
                          />
                          <span className="font-normal">
                            {category.name}
                            {category.status === "hidden"
                              ? " (đang ẩn)"
                              : ""}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </details>
                <span className="mt-2 block text-xs font-normal text-[#707881]">
                  Có thể chọn nhiều bộ sưu tập. Bộ sưu tập chọn
                  đầu tiên là danh mục chính.
                </span>
              </div>

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
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">Custom Product Options</h2>
              <p className="mt-1 text-sm leading-6 text-[#707881]">
                Cấu hình riêng theo từng sản phẩm. Chỉ bật phần màu khi có custom text, vì màu này áp dụng cho chữ khách nhập.
              </p>
            </div>
            <label className="flex items-center gap-3 rounded-2xl bg-[#f7f9ff] px-4 py-3 text-sm font-bold">
              <input
                type="checkbox"
                checked={customOptions.enabled}
                onChange={(event) => updateCustomOptions({ enabled: event.target.checked })}
                className="h-5 w-5 accent-[#006397]"
              />
              Bật custom
            </label>
          </div>

          {customOptions.enabled && (
            <div className="mt-5 space-y-5">
              <label className="flex items-start gap-3 rounded-2xl border border-[#dce3ea] bg-[#f7f9ff] p-4 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={customOptions.textEnabled}
                  onChange={(event) => updateCustomOptions({ textEnabled: event.target.checked })}
                  className="mt-1 h-5 w-5 accent-[#006397]"
                />
                <span>
                  Bật custom text
                  <span className="mt-1 block font-normal leading-6 text-[#707881]">
                    Khách có thể bỏ trống. Phụ phí chỉ được cộng khi khách nhập text.
                  </span>
                </span>
              </label>

              {customOptions.textEnabled && (
                <div className="space-y-5 rounded-3xl border border-[#dce3ea] p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm font-bold">
                      Label
                      <input
                        value={customOptions.textLabel}
                        onChange={(event) => updateCustomOptions({ textLabel: event.target.value })}
                        className="mt-2 h-11 w-full rounded-xl border border-[#cfd6dd] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]"
                        placeholder="Tên in lên sản phẩm"
                      />
                    </label>

                    <label className="text-sm font-bold">
                      Placeholder
                      <input
                        value={customOptions.textPlaceholder}
                        onChange={(event) => updateCustomOptions({ textPlaceholder: event.target.value })}
                        className="mt-2 h-11 w-full rounded-xl border border-[#cfd6dd] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]"
                        placeholder="Ví dụ: Bảo An"
                      />
                    </label>

                    <label className="text-sm font-bold">
                      Giới hạn ký tự
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={customOptions.textMaxLength}
                        onChange={(event) => updateCustomOptions({ textMaxLength: event.target.value })}
                        className="mt-2 h-11 w-full rounded-xl border border-[#cfd6dd] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]"
                      />
                    </label>

                    <label className="text-sm font-bold">
                      Phụ phí custom text
                      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={customOptions.textPriceDelta}
                          onChange={(event) => updateCustomOptions({ textPriceDelta: event.target.value })}
                          className="h-11 rounded-xl border border-[#cfd6dd] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]"
                          placeholder="0"
                        />
                        <span className="inline-flex min-h-11 items-center rounded-xl bg-[#fff4ec] px-4 text-sm font-black text-[#a43c12]">
                          +{formatCurrency(normalizePriceDelta(customOptions.textPriceDelta))}
                        </span>
                      </div>
                    </label>
                  </div>

                  <div className="rounded-3xl border border-[#dce3ea] bg-white p-5">
                    <div>
                      <h3 className="font-black">Màu chữ cho custom text</h3>
                      <p className="mt-1 text-sm leading-6 text-[#707881]">
                        Thêm và chọn các màu miễn phí cho chữ khách nhập. Phần này chỉ nằm trong custom text.
                      </p>
                    </div>

                    <div className="mt-4 rounded-2xl border border-[#dce3ea] bg-[#f7f9ff] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-black">Thêm màu chữ ngay tại sản phẩm</h4>
                          <p className="mt-1 text-sm leading-6 text-[#707881]">
                            Không cần trang màu riêng. Thêm màu ở đây rồi chọn luôn cho custom text của sản phẩm này.
                          </p>
                        </div>
                        <span
                          className="h-10 w-10 rounded-full border border-[#cfd6dd] shadow-sm"
                          style={{ backgroundColor: newCustomTextColorHex }}
                          aria-hidden="true"
                        />
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_150px_auto]">
                        <label className="text-sm font-bold">
                          Tên màu
                          <input
                            value={newCustomTextColorName}
                            onChange={(event) => setNewCustomTextColorName(event.target.value)}
                            className="mt-2 h-11 w-full rounded-xl border border-[#cfd6dd] bg-white px-4 font-normal outline-none focus:border-[#006397]"
                            placeholder="Ví dụ: Đen, Trắng, Đỏ"
                          />
                        </label>

                        <label className="text-sm font-bold">
                          Màu
                          <input
                            type="color"
                            value={newCustomTextColorHex}
                            onChange={(event) => setNewCustomTextColorHex(event.target.value)}
                            className="mt-2 h-11 w-full rounded-xl border border-[#cfd6dd] bg-white px-2"
                            aria-label="Chọn màu chữ"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={handleAddCustomTextColor}
                          disabled={savingCustomTextColor}
                          className="mt-7 rounded-xl bg-[#006397] px-4 py-3 text-sm font-black text-white transition hover:bg-[#004c73] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingCustomTextColor ? "Đang thêm..." : "+ Thêm màu"}
                        </button>
                      </div>

                      {newCustomTextColorError && (
                        <p className="mt-3 rounded-xl bg-[#fff0eb] px-4 py-3 text-sm font-bold text-[#a43c12]">
                          {newCustomTextColorError}
                        </p>
                      )}
                    </div>

                    {customOptionsLoading && (
                      <p className="mt-4 rounded-2xl bg-[#f7f9ff] p-4 text-sm text-[#707881]">
                        Đang tải bảng màu custom...
                      </p>
                    )}

                    {customOptionsError && (
                      <p className="mt-4 rounded-2xl bg-[#fff0eb] p-4 text-sm font-semibold text-[#a43c12]">
                        {customOptionsError}
                      </p>
                    )}

                    {!customOptionsLoading && !customOptionsError && customColors.length === 0 && (
                      <p className="mt-4 rounded-2xl border border-dashed border-[#bfc7d2] p-5 text-center text-sm text-[#707881]">
                        Chưa có màu custom nào. Thêm màu ở trên để chọn cho text khách nhập.
                      </p>
                    )}

                    {!customOptionsLoading && !customOptionsError && customColors.length > 0 && (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {customColors.map((color) => (
                          <label
                            key={color.id}
                            className={
                              "flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-sm transition " +
                              (colorIsSelected(color.id)
                                ? "border-[#006397] bg-[#edf4ff]"
                                : "border-[#dce3ea] bg-white") +
                              (!color.isActive ? " opacity-60" : "")
                            }
                          >
                            <input
                              type="checkbox"
                              checked={colorIsSelected(color.id)}
                              onChange={() => toggleCustomColor(color.id)}
                              className="h-5 w-5 accent-[#006397]"
                            />
                            <span
                              className="h-8 w-8 rounded-full border border-[#cfd6dd] shadow-sm"
                              style={{ backgroundColor: color.colorHex || "#d1d5db" }}
                              aria-hidden="true"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block font-bold text-[#252525]">{color.name}</span>
                              <span className="mt-1 block text-xs font-semibold text-[#707881]">
                                {color.isActive ? "Đang bật" : "Đang tắt"}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </article>

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
            <h2 className="text-xl font-black">Theo dõi quảng cáo</h2>
            <p className="mt-2 text-sm leading-6 text-[#707881]">
              Để trống để dùng Pixel mặc định của từng nền tảng.
            </p>

            {adsLoading && (
              <p className="mt-4 rounded-2xl bg-[#f7f9ff] p-4 text-sm text-[#707881]">
                Đang tải danh sách Pixel...
              </p>
            )}

            {adsError && (
              <p className="mt-4 rounded-2xl bg-[#fff0eb] p-4 text-sm font-semibold text-[#a43c12]">
                {adsError}
              </p>
            )}

            {!adsLoading && !adsError && (
              <div className="mt-5 space-y-5">
                {(["meta", "tiktok"] as const).map((platform) => {
                  const currentValue = adAssignments[platform] ?? "";
                  const defaultName = defaultSourceName(platform);


                  return (
                    <label
                      key={platform}
                      className="block text-sm font-bold"
                    >
                      {platform === "meta"
                        ? "Meta Pixel"
                        : "TikTok Pixel"}
                      <select
                        value={currentValue}
                        onChange={(event) =>
                          setAdAssignments((current) => ({
                            ...current,
                            [platform]: event.target.value || null,
                          }))
                        }
                        className="mt-2 h-12 w-full rounded-2xl border border-[#cfd6dd] bg-[#f7f9ff] px-4 font-normal outline-none focus:border-[#006397]"
                      >
                        <option value="">
                          Dùng Pixel mặc định{defaultName ? ` (${defaultName})` : " (chưa cấu hình)"}
                        </option>
                        {sourcesFor(platform).map((source) => (
                          <option
                            key={source.id}
                            value={source.id}
                            disabled={
                              !source.isActive &&
                              currentValue !== source.id
                            }
                          >
                            {source.name}
                            {source.isDefault ? " — Mặc định" : ""}
                            {!source.isActive ? " — Đang tắt" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                })}
              </div>
            )}
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


        </aside>
      </form>
    </section>
  );
}

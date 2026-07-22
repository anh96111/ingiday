export type ProductStatus =
  | "active"
  | "hidden"
  | "out_of_stock";

export type CategoryStatus = "active" | "hidden";

export type ProductImage = {
  id: string;
  url: string;
  publicId?: string;
  altText?: string;
  isPrimary: boolean;
  sortOrder: number;
};

export type ProductVariantOption = {
  id: string;
  label: string;
  priceDelta?: number;
  stock?: number;
  imageId?: string;
  showPriceDelta?: boolean;
};

export type ProductVariantGroup = {
  id: string;
  name: string;
  options: ProductVariantOption[];
};

export type Product = {
  id: string;
  sku?: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryIds?: string[];
  categoryName: string;
  price: number;
  compareAtPrice?: number;
  emoji: string;
  background: string;
  badge?: string;
  stockNoteEnabled?: boolean;
  stockNote?: string;
  featured?: boolean;
  stock: number;
  description: string;
  images?: ProductImage[];
  variantGroups?: ProductVariantGroup[];
  status: ProductStatus;
  soldQuantity?: number;
  createdAt: string;
  updatedAt: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  background: string;
  status: CategoryStatus;
  createdAt: string;
  updatedAt: string;
};

export type CatalogSort =
  | "relevance"
  | "newest"
  | "bestselling"
  | "price_asc"
  | "price_desc";

export type ProductSearchFilters = {
  query?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  featured?: boolean;
  sort?: CatalogSort;
  page?: number;
  pageSize?: number;
};

export type ProductSearchResult = {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ProductInput = Omit<
  Product,
  "id" | "sku" | "createdAt" | "updatedAt" | "soldQuantity"
>;

export type CategoryInput = Omit<
  Category,
  "id" | "createdAt" | "updatedAt"
>;
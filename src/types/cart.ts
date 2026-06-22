export type SelectedVariant = {
  groupId: string;
  groupName: string;
  optionId: string;
  optionLabel: string;
  priceDelta: number;
  stock?: number;
};

export type CartItem = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl?: string;
  emoji: string;
  background: string;
  unitPrice: number;
  quantity: number;
  stock: number;
  selectedVariants: SelectedVariant[];
};

export type CheckoutCustomer = {
  fullName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  addressDetail: string;
  note: string;
};

export type LocalOrder = {
  id?: string;
  code: string;
  createdAt: string;
  clientRequestId?: string;
  paymentMethod: "COD";
  customer: CheckoutCustomer;
  items: CartItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  shipping: number;
  total: number;
};
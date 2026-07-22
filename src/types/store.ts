import type { StoreSocialLinks } from "../utils/externalUrl";
import type { LocalOrder } from "./cart";

export type OrderStatus = "new" | "confirmed" | "preparing" | "shipping" | "completed" | "cancelled";

export type OrderStatusHistory = {
  status: OrderStatus;
  changedAt: string;
};

export type StoreOrder = LocalOrder & {
  status: OrderStatus;
  updatedAt: string;
  statusHistory: OrderStatusHistory[];
  inventoryReserved: boolean;
};

export type CouponType = "fixed" | "percentage";

export type Coupon = {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  minOrder: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  startsAt?: string;
  endsAt?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CouponInput = Omit<Coupon, "id" | "usedCount" | "createdAt" | "updatedAt">;

export type Banner = {
  id: string;
  internalName: string;
  badge: string;
  title: string;
  description: string;
  primaryLabel: string;
  primaryLink: string;
  secondaryLabel: string;
  secondaryLink: string;
  emoji: string;
  background: string;
  imageUrl?: string;
  imagePublicId?: string;
  imageAlt?: string;
  startsAt?: string;
  endsAt?: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type BannerInput = Omit<Banner, "id" | "createdAt" | "updatedAt">;

export type StoreSettings = {
  storeName: string;
  phone: string;
  email: string;
  address: string;
  messengerUrl: string;
  socialLinks: StoreSocialLinks;
  footerDescription: string;
  shippingFee: number;
  freeShippingThreshold: number;
  couponEnabled: boolean;
  stockEnabled: boolean;
  customPrintTitle: string;
  customPrintDescription: string;
  customPrintButtonText: string;
  customPrintStep1Title: string;
  customPrintStep1Description: string;
  customPrintStep2Title: string;
  customPrintStep2Description: string;
  customPrintStep3Title: string;
  customPrintStep3Description: string;
  logoUrl: string;
  logoPublicId: string;
  faviconUrl: string;
  faviconPublicId: string;
  socialShareImageUrl: string;
  socialShareImagePublicId: string;
  socialShareTitle: string;
  socialShareDescription: string;
  currency: "VND";
};


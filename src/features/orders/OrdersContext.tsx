/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { submitStoreOrder } from "../../services/orders";
import type { CartItem, CheckoutCustomer, LocalOrder, SelectedVariant } from "../../types/cart";
import type { SelectedCustomOptions } from "../../types/customProductOptions";
import type { OrderStatus, StoreOrder } from "../../types/store";

type OrdersActionResult<T = undefined> = {
  success: boolean;
  message: string;
  data?: T;
};

type OrderPageFilters = {
  page: number;
  pageSize: number;
  keyword: string;
  status: OrderStatus | "";
  dateFrom: string;
  dateTo: string;
};

type OrderPageResult = {
  orders: StoreOrder[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type OrderItemRow = {
  id: string;
  product_id: string | null;
  product_slug: string | null;
  product_name: string;
  product_image_url: string | null;
  product_background: string | null;
  product_emoji: string | null;
  unit_price: number | string;
  quantity: number;
  selected_variants: unknown;
  custom_options: unknown;
};

type StatusHistoryRow = {
  to_status: OrderStatus;
  created_at: string;
};

type OrderRow = {
  id: string;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  province: string;
  district: string;
  ward: string;
  address_line: string;
  note: string | null;
  subtotal: number | string;
  discount_amount: number | string;
  shipping_fee: number | string;
  total_amount: number | string;
  coupon_code: string | null;
  payment_method: string;
  status: OrderStatus;
  inventory_reserved: boolean;
  created_at: string;
  updated_at: string;
  order_items: OrderItemRow[] | null;
  order_status_history: StatusHistoryRow[] | null;
};

type CreateOrderRpcResult = {
  id: string;
  order_code: string;
  created_at: string;
  subtotal: number | string;
  discount_amount: number | string;
  shipping_fee: number | string;
  total_amount: number | string;
  inventory_reserved: boolean;
};

type AdminPageIdsResult = {
  ids: string[];
  total: number;
  page: number;
  pageSize: number;
};

type OrdersContextValue = {
  orders: StoreOrder[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  loadOrderPage: (filters: OrderPageFilters) => Promise<OrdersActionResult<OrderPageResult>>;
  bulkUpdateOrderStatus: (ids: string[], status: OrderStatus) => Promise<OrdersActionResult>;
  bulkDeleteOrders: (ids: string[]) => Promise<OrdersActionResult>;
  createOrder: (order: LocalOrder) => Promise<OrdersActionResult<StoreOrder>>;
  updateOrderStatus: (code: string, status: OrderStatus) => Promise<OrdersActionResult<StoreOrder>>;
  getOrder: (code: string) => StoreOrder | undefined;
};

const OrdersContext = createContext<OrdersContextValue | null>(null);

const ORDER_SELECT = `
  id,
  order_code,
  customer_name,
  customer_phone,
  customer_email,
  province,
  district,
  ward,
  address_line,
  note,
  subtotal,
  discount_amount,
  shipping_fee,
  total_amount,
  coupon_code,
  payment_method,
  status,
  inventory_reserved,
  created_at,
  updated_at,
  order_items (
    id,
    product_id,
    product_slug,
    product_name,
    product_image_url,
    product_background,
    product_emoji,
    unit_price,
    quantity,
    selected_variants,
          custom_options
        ),
  order_status_history (
    to_status,
    created_at
  )
`;

function parseSelectedVariants(value: unknown): SelectedVariant[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is SelectedVariant => {
    if (!item || typeof item !== "object") return false;
    const variant = item as Partial<SelectedVariant>;

    return Boolean(
      variant.groupId &&
        variant.groupName &&
        variant.optionId &&
        variant.optionLabel &&
        typeof variant.priceDelta === "number",
    );
  });
}


function parseSelectedCustomOptions(value: unknown): SelectedCustomOptions | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const source = value as {
    text?: { label?: unknown; value?: unknown; priceDelta?: unknown };
    color?: { id?: unknown; name?: unknown; imageUrl?: unknown; colorHex?: unknown };
  };
  const textValue =
    typeof source.text?.value === "string" ? source.text.value.trim() : "";

  if (!textValue) {
    return undefined;
  }

  const text = {
    label:
      typeof source.text?.label === "string" && source.text.label.trim()
        ? source.text.label
        : "Custom text",
    value: textValue,
    priceDelta:
      typeof source.text?.priceDelta === "number"
        ? source.text.priceDelta
        : Number(source.text?.priceDelta ?? 0),
  };

  const colorId =
    typeof source.color?.id === "string" ? source.color.id.trim() : "";
  const colorName =
    typeof source.color?.name === "string" ? source.color.name.trim() : "";

  return {
    text,
    color:
      colorId && colorName
        ? {
            id: colorId,
            name: colorName,
            imageUrl:
              typeof source.color?.imageUrl === "string"
                ? source.color.imageUrl
                : "",
            colorHex:
              typeof source.color?.colorHex === "string"
                ? source.color.colorHex
                : undefined,
          }
        : undefined,
  };
}

function itemFromRow(row: OrderItemRow): CartItem {
  return {
    key: row.id,
    productId: row.product_id ?? `deleted-${row.id}`,
    slug: row.product_slug ?? "",
    name: row.product_name,
    imageUrl: row.product_image_url ?? undefined,
    emoji: row.product_emoji ?? "📦",
    background: row.product_background ?? "#dff4ff",
    unitPrice: Number(row.unit_price),
    quantity: row.quantity,
    stock: Number.MAX_SAFE_INTEGER,
    selectedVariants: parseSelectedVariants(row.selected_variants),
    selectedCustomOptions: parseSelectedCustomOptions(row.custom_options),
  };
}

function orderFromRow(row: OrderRow): StoreOrder {
  const history = [...(row.order_status_history ?? [])]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((entry) => ({
      status: entry.to_status,
      changedAt: entry.created_at,
    }));

  const customer: CheckoutCustomer = {
    fullName: row.customer_name,
    phone: row.customer_phone,
    province: row.province,
    district: row.district,
    ward: row.ward,
    addressDetail: row.address_line,
    note: row.note ?? "",
  };

  return {
    id: row.id,
    code: row.order_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    paymentMethod: "COD",
    customer,
    items: (row.order_items ?? []).map(itemFromRow),
    subtotal: Number(row.subtotal),
    discount: Number(row.discount_amount),
    couponCode: row.coupon_code ?? undefined,
    shipping: Number(row.shipping_fee),
    total: Number(row.total_amount),
    status: row.status,
    statusHistory:
      history.length > 0
        ? history
        : [{ status: row.status, changedAt: row.created_at }],
    inventoryReserved: row.inventory_reserved,
  };
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

function parseAdminPageIds(value: unknown, fallbackPage: number, fallbackPageSize: number): AdminPageIdsResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ids: [], total: 0, page: fallbackPage, pageSize: fallbackPageSize };
  }

  const object = value as Record<string, unknown>;
  const ids = Array.isArray(object.ids)
    ? object.ids.filter((id): id is string => typeof id === "string")
    : [];
  const total = Number(object.total ?? 0);
  const page = Number(object.page ?? fallbackPage);
  const pageSize = Number(object.page_size ?? fallbackPageSize);

  return {
    ids,
    total: Number.isFinite(total) ? Math.max(0, total) : 0,
    page: Number.isFinite(page) ? Math.max(1, page) : fallbackPage,
    pageSize: Number.isFinite(pageSize) ? Math.max(1, pageSize) : fallbackPageSize,
  };
}

function currentOrderCodeFromPath() {
  const match = window.location.pathname.match(/^\/admin\/don-hang\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : "";
}

function dateBoundary(value: string, endOfDay: boolean) {
  if (!value) return null;
  const time = endOfDay ? "23:59:59.999" : "00:00:00.000";
  return new Date(`${value}T${time}`).toISOString();
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async (session?: Session | null) => {
    const activeSession =
      session === undefined
        ? (await supabase.auth.getSession()).data.session
        : session;

    if (!activeSession) {
      setOrders([]);
      setError("");
      setLoading(false);
      return;
    }

    const orderCode = currentOrderCodeFromPath();

    if (!orderCode) {
      setOrders([]);
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error: queryError } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("order_code", orderCode)
      .maybeSingle();

    if (queryError) {
      setOrders([]);
      setError(queryError.message);
      setLoading(false);
      return;
    }

    setOrders(data ? [orderFromRow(data as unknown as OrderRow)] : []);
    setError("");
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    localStorage.removeItem("ingiday-orders");
    localStorage.removeItem("ingiday-last-order");

    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) void loadOrders(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        if (mounted) void loadOrders(session);
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadOrders]);

  const value = useMemo<OrdersContextValue>(
    () => ({
      orders,
      loading,
      error,
      refresh: () => loadOrders(),

      async loadOrderPage(filters) {
        const page = Math.max(1, filters.page);
        const pageSize = Math.min(50, Math.max(1, filters.pageSize));

        setLoading(true);
        setError("");

        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session) {
            throw new Error("Phiên đăng nhập quản trị đã hết hạn.");
          }

          const { data: pageData, error: pageError } = await supabase.rpc(
            "admin_search_order_ids",
            {
              p_query: filters.keyword.trim(),
              p_status: filters.status || null,
              p_date_from: dateBoundary(filters.dateFrom, false),
              p_date_to: dateBoundary(filters.dateTo, true),
              p_page: page,
              p_page_size: pageSize,
            },
          );

          if (pageError) throw pageError;

          const parsed = parseAdminPageIds(pageData, page, pageSize);
          let pageOrders: StoreOrder[] = [];

          if (parsed.ids.length > 0) {
            const { data, error: queryError } = await supabase
              .from("orders")
              .select(ORDER_SELECT)
              .in("id", parsed.ids);

            if (queryError) throw queryError;

            const orderById = new Map(
              ((data ?? []) as unknown as OrderRow[]).map((row) => [row.id, orderFromRow(row)]),
            );

            pageOrders = parsed.ids
              .map((id) => orderById.get(id))
              .filter((order): order is StoreOrder => Boolean(order));
          }

          setOrders(pageOrders);
          setError("");

          return {
            success: true,
            message: "Đã tải danh sách đơn hàng.",
            data: {
              orders: pageOrders,
              total: parsed.total,
              page: parsed.page,
              pageSize: parsed.pageSize,
              totalPages: Math.max(1, Math.ceil(parsed.total / parsed.pageSize)),
            },
          };
        } catch (loadError) {
          const message = errorMessage(loadError, "Không thể tải danh sách đơn hàng.");
          setOrders([]);
          setError(message);
          return { success: false, message };
        } finally {
          setLoading(false);
        }
      },

      async bulkUpdateOrderStatus(ids, status) {
        try {
          const uniqueIds = [...new Set(ids)].slice(0, 50);
          if (uniqueIds.length === 0) {
            return { success: false, message: "Chưa chọn đơn hàng." };
          }

          const { error: rpcError } = await supabase.rpc(
            "admin_bulk_update_order_status",
            {
              p_order_ids: uniqueIds,
              p_status: status,
            },
          );

          if (rpcError) throw rpcError;
          return { success: true, message: `Đã cập nhật ${uniqueIds.length} đơn hàng.` };
        } catch (actionError) {
          return {
            success: false,
            message: errorMessage(actionError, "Không thể cập nhật các đơn hàng đã chọn."),
          };
        }
      },

      async bulkDeleteOrders(ids) {
        try {
          const uniqueIds = [...new Set(ids)].slice(0, 50);
          if (uniqueIds.length === 0) {
            return { success: false, message: "Chưa chọn đơn hàng." };
          }

          const { error: rpcError } = await supabase.rpc(
            "admin_bulk_delete_orders",
            {
              p_order_ids: uniqueIds,
            },
          );

          if (rpcError) throw rpcError;
          return { success: true, message: `Đã xóa ${uniqueIds.length} đơn hàng.` };
        } catch (actionError) {
          return {
            success: false,
            message: errorMessage(actionError, "Không thể xóa các đơn hàng đã chọn."),
          };
        }
      },

      async createOrder(order) {
        const submission = await submitStoreOrder(order);

        if (!submission.success || !submission.data) {
          return {
            success: false,
            message: submission.message,
          };
        }

        const result: CreateOrderRpcResult = submission.data;
        if (!result?.id || !result.order_code) {
          return {
            success: false,
            message: "Hệ thống không trả về mã đơn hàng.",
          };
        }

        const created: StoreOrder = {
          ...order,
          id: result.id,
          code: result.order_code,
          createdAt: result.created_at,
          updatedAt: result.created_at,
          subtotal: Number(result.subtotal),
          discount: Number(result.discount_amount),
          shipping: Number(result.shipping_fee),
          total: Number(result.total_amount),
          status: "new",
          statusHistory: [{ status: "new", changedAt: result.created_at }],
          inventoryReserved: result.inventory_reserved,
        };

        sessionStorage.setItem("ingiday-last-order", JSON.stringify(created));

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session && currentOrderCodeFromPath()) {
          await loadOrders(session);
        }

        return {
          success: true,
          message: "Đã tạo đơn hàng.",
          data: created,
        };
      },

      async updateOrderStatus(code, status) {
        const currentOrder = orders.find((order) => order.code === code);

        if (!currentOrder?.id) {
          return {
            success: false,
            message: "Không tìm thấy đơn hàng.",
          };
        }

        const { error: rpcError } = await supabase.rpc("update_store_order_status", {
          p_order_id: currentOrder.id,
          p_status: status,
          p_note: null,
        });

        if (rpcError) {
          return {
            success: false,
            message: rpcError.message || "Không thể cập nhật trạng thái.",
          };
        }

        if (currentOrderCodeFromPath()) {
          await loadOrders();
        }

        return {
          success: true,
          message: "Đã cập nhật trạng thái đơn hàng.",
        };
      },

      getOrder(code) {
        return orders.find((order) => order.code === code);
      },
    }),
    [error, loadOrders, loading, orders],
  );

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  const context = useContext(OrdersContext);

  if (!context) {
    throw new Error("useOrders phải được dùng trong OrdersProvider.");
  }

  return context;
}

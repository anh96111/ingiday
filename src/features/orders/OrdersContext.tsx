import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { CartItem, CheckoutCustomer, LocalOrder, SelectedVariant } from "../../types/cart";
import type { OrderStatus, StoreOrder } from "../../types/store";

type OrdersActionResult<T = undefined> = {
  success: boolean;
  message: string;
  data?: T;
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

type OrdersContextValue = {
  orders: StoreOrder[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  createOrder: (order: LocalOrder) => Promise<OrdersActionResult<StoreOrder>>;
  updateOrderStatus: (code: string, status: OrderStatus) => Promise<OrdersActionResult<StoreOrder>>;
  getOrder: (code: string) => StoreOrder | undefined;
};

const OrdersContext = createContext<OrdersContextValue | null>(null);

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

    setLoading(true);

    const { data, error: queryError } = await supabase
      .from("orders")
      .select(`
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
          selected_variants
        ),
        order_status_history (
          to_status,
          created_at
        )
      `)
      .order("created_at", { ascending: false });

    if (queryError) {
      setOrders([]);
      setError(queryError.message);
      setLoading(false);
      return;
    }

    setOrders(((data ?? []) as unknown as OrderRow[]).map(orderFromRow));
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
      async createOrder(order) {
        const payloadItems = order.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          selectedVariants: item.selectedVariants,
        }));

        const { data, error: rpcError } = await supabase.rpc("create_store_order", {
          p_customer: {
            fullName: order.customer.fullName,
            phone: order.customer.phone,
            province: order.customer.province,
            district: order.customer.district,
            ward: order.customer.ward,
            addressDetail: order.customer.addressDetail,
            note: order.customer.note,
          },
          p_items: payloadItems,
          p_coupon_code: order.couponCode ?? null,
        });

        if (rpcError) {
          return {
            success: false,
            message: rpcError.message || "Không thể tạo đơn hàng.",
          };
        }

        const result = data as CreateOrderRpcResult | null;

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

        if (session) {
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

        await loadOrders();
        const updated = orders.find((order) => order.code === code);

        return {
          success: true,
          message: "Đã cập nhật trạng thái đơn hàng.",
          data: updated,
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

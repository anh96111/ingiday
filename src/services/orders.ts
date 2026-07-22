import { supabase } from "../lib/supabase";
import type { LocalOrder } from "../types/cart";

const PENDING_ORDER_STORAGE_KEY =
  "ingiday-pending-order-request-v1";
const PENDING_ORDER_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_ATTEMPTS = 3;

export type IdempotentOrderRpcResult = {
  id: string;
  order_code: string;
  created_at: string;
  subtotal: number | string;
  discount_amount: number | string;
  shipping_fee: number | string;
  total_amount: number | string;
  inventory_reserved: boolean;
  client_request_id?: string;
  replayed?: boolean;
};

export type SubmitStoreOrderResult =
  | {
      success: true;
      message: string;
      data: IdempotentOrderRpcResult;
      requestId: string;
    }
  | {
      success: false;
      message: string;
      requestId: string;
    };

type PendingOrderRequest = {
  requestId: string;
  fingerprint: string;
  createdAt: string;
  orderSnapshot: {
    customer: LocalOrder["customer"];
    items: Array<{
      productId: string;
      quantity: number;
      selectedVariants: LocalOrder["items"][number]["selectedVariants"];
        selectedCustomOptions?: LocalOrder["items"][number]["selectedCustomOptions"];
    }>;
    couponCode?: string;
    utmAttribution?: LocalOrder["utmAttribution"];
  };
};

type RpcError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

function createRequestId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

function buildOrderSnapshot(
  order: LocalOrder,
): PendingOrderRequest["orderSnapshot"] {
  return {
    customer: {
      fullName: order.customer.fullName.trim(),
      phone: order.customer.phone.trim(),
      province: order.customer.province.trim(),
      district: order.customer.district.trim(),
      ward: order.customer.ward.trim(),
      addressDetail: order.customer.addressDetail.trim(),
      note: order.customer.note.trim(),
    },
    items: order.items.map((item) => {
      const selectedText = item.selectedCustomOptions?.text;
      const selectedColor = item.selectedCustomOptions?.color;

      return {
        productId: item.productId,
        quantity: item.quantity,
        selectedVariants: item.selectedVariants
          .map((variant) => ({
            groupId: variant.groupId,
            groupName: variant.groupName,
            optionId: variant.optionId,
            optionLabel: variant.optionLabel,
            priceDelta: variant.priceDelta,
            stock: variant.stock,
          }))
          .sort((left, right) =>
            (left.groupId + ":" + left.optionId).localeCompare(
              right.groupId + ":" + right.optionId,
            ),
          ),
        selectedCustomOptions: selectedText
          ? {
              text: {
                label: selectedText.label,
                value: selectedText.value.trim(),
                priceDelta: selectedText.priceDelta,
              },
              color: selectedColor
                ? {
                    id: selectedColor.id,
                    name: selectedColor.name,
                    imageUrl: selectedColor.imageUrl,
                    colorHex: selectedColor.colorHex,
                  }
                : undefined,
            }
          : undefined,
      };
    }),
    couponCode: order.couponCode?.trim().toUpperCase(),
    utmAttribution: order.utmAttribution,
  };
}

function buildFingerprint(order: LocalOrder) {
  return JSON.stringify(buildOrderSnapshot(order));
}

function readPendingOrderRequest() {
  try {
    const raw = localStorage.getItem(
      PENDING_ORDER_STORAGE_KEY,
    );

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(
      raw,
    ) as Partial<PendingOrderRequest>;

    if (
      typeof parsed.requestId !== "string" ||
      typeof parsed.fingerprint !== "string" ||
      typeof parsed.createdAt !== "string" ||
      !parsed.orderSnapshot
    ) {
      localStorage.removeItem(
        PENDING_ORDER_STORAGE_KEY,
      );
      return null;
    }

    const createdAt = new Date(
      parsed.createdAt,
    ).getTime();

    if (
      !Number.isFinite(createdAt) ||
      Date.now() - createdAt >
        PENDING_ORDER_MAX_AGE_MS
    ) {
      localStorage.removeItem(
        PENDING_ORDER_STORAGE_KEY,
      );
      return null;
    }

    return parsed as PendingOrderRequest;
  } catch {
    localStorage.removeItem(
      PENDING_ORDER_STORAGE_KEY,
    );
    return null;
  }
}

function savePendingOrderRequest(
  pending: PendingOrderRequest,
) {
  localStorage.setItem(
    PENDING_ORDER_STORAGE_KEY,
    JSON.stringify(pending),
  );
}

function getOrCreatePendingOrderRequest(
  order: LocalOrder,
) {
  const fingerprint = buildFingerprint(order);
  const existing = readPendingOrderRequest();

  if (
    existing &&
    existing.fingerprint === fingerprint
  ) {
    return existing;
  }

  const pending: PendingOrderRequest = {
    requestId:
      order.clientRequestId ?? createRequestId(),
    fingerprint,
    createdAt: new Date().toISOString(),
    orderSnapshot: buildOrderSnapshot(order),
  };

  savePendingOrderRequest(pending);
  return pending;
}

function clearPendingOrderRequest(
  requestId: string,
) {
  const existing = readPendingOrderRequest();

  if (existing?.requestId === requestId) {
    localStorage.removeItem(
      PENDING_ORDER_STORAGE_KEY,
    );
  }
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function withTimeout<T>(
  task: PromiseLike<T>,
): Promise<T> {
  let timer = 0;

  const timeout = new Promise<never>(
    (_resolve, reject) => {
      timer = window.setTimeout(() => {
        reject(
          new Error(
            "YÃªu cáº§u táº¡o Ä‘Æ¡n Ä‘Ã£ quÃ¡ thá»i gian chá».",
          ),
        );
      }, REQUEST_TIMEOUT_MS);
    },
  );

  try {
    return await Promise.race([
      Promise.resolve(task),
      timeout,
    ]);
  } finally {
    window.clearTimeout(timer);
  }
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as RpcError).message ===
      "string"
  ) {
    return (error as RpcError).message as string;
  }

  return "KhÃ´ng thá»ƒ táº¡o Ä‘Æ¡n hÃ ng.";
}

function isTransientError(error: unknown) {
  const message = errorMessage(error).toLowerCase();
  const code =
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as RpcError).code === "string"
      ? ((error as RpcError).code as string)
      : "";

  return (
    message.includes("network") ||
    message.includes("failed to fetch") ||
    message.includes("fetch failed") ||
    message.includes("load failed") ||
    message.includes("káº¿t ná»‘i") ||
    message.includes("connection") ||
    message.includes("timeout") ||
    message.includes("quÃ¡ thá»i gian") ||
    message.includes("timed out") ||
    message.includes("gateway") ||
    code === "502" ||
    code === "503" ||
    code === "504"
  );
}

export async function submitStoreOrder(
  order: LocalOrder,
): Promise<SubmitStoreOrderResult> {
  const pending =
    getOrCreatePendingOrderRequest(order);

  if (!navigator.onLine) {
    return {
      success: false,
      requestId: pending.requestId,
      message:
        "Thiáº¿t bá»‹ Ä‘ang máº¥t máº¡ng. ThÃ´ng tin Ä‘Æ¡n Ä‘Ã£ Ä‘Æ°á»£c giá»¯ láº¡i; hÃ£y káº¿t ná»‘i máº¡ng rá»“i báº¥m Äáº·t hÃ ng COD láº¡i.",
    };
  }

  const payloadItems = order.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    selectedVariants: item.selectedVariants,
    selectedCustomOptions: item.selectedCustomOptions,
  }));

  for (
    let attempt = 1;
    attempt <= MAX_ATTEMPTS;
    attempt += 1
  ) {
    try {
      const response = await withTimeout(
        supabase.rpc(
          "create_store_order_idempotent",
          {
            p_client_request_id:
              pending.requestId,
            p_customer: {
              fullName:
                order.customer.fullName,
              phone: order.customer.phone,
              province:
                order.customer.province,
              district:
                order.customer.district,
              ward: order.customer.ward,
              addressDetail:
                order.customer.addressDetail,
              note: order.customer.note,
            },
            p_items: payloadItems,
            p_coupon_code:
              order.couponCode ?? null,
            p_attribution:
              pending.orderSnapshot.utmAttribution ?? null,
          },
        ),
      );

      if (response.error) {
        if (
          isTransientError(response.error) &&
          attempt < MAX_ATTEMPTS
        ) {
          await wait(500 * attempt);
          continue;
        }

        return {
          success: false,
          requestId: pending.requestId,
          message:
            response.error.message ||
            "KhÃ´ng thá»ƒ táº¡o Ä‘Æ¡n hÃ ng.",
        };
      }

      const result =
        response.data as
          | IdempotentOrderRpcResult
          | null;

      if (!result?.id || !result.order_code) {
        if (attempt < MAX_ATTEMPTS) {
          await wait(500 * attempt);
          continue;
        }

        return {
          success: false,
          requestId: pending.requestId,
          message:
            "ChÆ°a xÃ¡c nháº­n Ä‘Æ°á»£c mÃ£ Ä‘Æ¡n. HÃ£y báº¥m Äáº·t hÃ ng COD láº¡i; há»‡ thá»‘ng sáº½ khÃ´ng táº¡o Ä‘Æ¡n trÃ¹ng.",
        };
      }

      clearPendingOrderRequest(
        pending.requestId,
      );

      return {
        success: true,
        requestId: pending.requestId,
        message: result.replayed
          ? "ÄÃ£ tÃ¬m tháº¥y Ä‘Æ¡n hÃ ng vá»«a táº¡o."
          : "ÄÃ£ táº¡o Ä‘Æ¡n hÃ ng.",
        data: result,
      };
    } catch (error) {
      if (
        isTransientError(error) &&
        attempt < MAX_ATTEMPTS
      ) {
        await wait(500 * attempt);
        continue;
      }

      return {
        success: false,
        requestId: pending.requestId,
        message: isTransientError(error)
          ? "Káº¿t ná»‘i khÃ´ng á»•n Ä‘á»‹nh. HÃ£y báº¥m Äáº·t hÃ ng COD láº¡i; há»‡ thá»‘ng sáº½ dÃ¹ng cÃ¹ng mÃ£ yÃªu cáº§u vÃ  khÃ´ng táº¡o Ä‘Æ¡n trÃ¹ng."
          : errorMessage(error),
      };
    }
  }

  return {
    success: false,
    requestId: pending.requestId,
    message:
      "ChÆ°a xÃ¡c nháº­n Ä‘Æ°á»£c Ä‘Æ¡n hÃ ng. HÃ£y báº¥m Äáº·t hÃ ng COD láº¡i; há»‡ thá»‘ng sáº½ khÃ´ng táº¡o Ä‘Æ¡n trÃ¹ng.",
  };
}
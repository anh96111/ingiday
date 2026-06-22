import type {
  RuntimeAdSource,
} from "../types/adTracking";
import type {
  AdEventName,
} from "../types/ads";
import {
  isAdsDebugEnabled,
  sourceSupportsEvent,
} from "./adRuntime";

const ANONYMOUS_ID_STORAGE_KEY =
  "ingiday-ads-anonymous-id-v1";

type SendServerAdEventInput = {
  source: RuntimeAdSource;
  eventName: AdEventName;
  eventId: string;
  payload: Record<string, unknown>;
  productIds?: string[];
  orderCode?: string;
};

function createAnonymousId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function anonymousId() {
  try {
    const existing = localStorage.getItem(
      ANONYMOUS_ID_STORAGE_KEY,
    );

    if (existing) {
      return existing;
    }

    const created = createAnonymousId();
    localStorage.setItem(
      ANONYMOUS_ID_STORAGE_KEY,
      created,
    );
    return created;
  } catch {
    return createAnonymousId();
  }
}

function readCookie(name: string) {
  const prefix = `${name}=`;
  const cookie = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix));

  if (!cookie) {
    return "";
  }

  try {
    return decodeURIComponent(
      cookie.slice(prefix.length),
    );
  } catch {
    return cookie.slice(prefix.length);
  }
}

function queryValue(name: string) {
  try {
    return new URL(window.location.href)
      .searchParams.get(name) ?? "";
  } catch {
    return "";
  }
}

function uniqueProductIds(productIds: string[]) {
  return Array.from(
    new Set(
      productIds
        .map((productId) => productId.trim())
        .filter(Boolean),
    ),
  );
}

export async function sendServerAdEvent(
  input: SendServerAdEventInput,
) {
  if (
    !sourceSupportsEvent(
      input.source,
      input.eventName,
      "server",
    )
  ) {
    return;
  }

  const requestBody = {
    sourceId: input.source.id,
    platform: input.source.platform,
    eventName: input.eventName,
    eventId: input.eventId,
    productIds: uniqueProductIds(
      input.productIds ?? [],
    ),
    orderCode: input.orderCode?.trim() || null,
    pageUrl: window.location.href,
    referrer: document.referrer || null,
    anonymousId: anonymousId(),
    fbp: readCookie("_fbp") || null,
    fbc: readCookie("_fbc") || null,
    fbclid: queryValue("fbclid") || null,
    ttp: readCookie("_ttp") || null,
    ttclid: queryValue("ttclid") || null,
    payload: input.payload,
  };

  try {
    const response = await fetch(
      "/api/ads/events",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        keepalive: true,
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      if (isAdsDebugEnabled()) {
        console.warn(
          "[InGiDay Ads Server] Không thể nhận sự kiện",
          response.status,
        );
      }
      return;
    }

    if (isAdsDebugEnabled()) {
      console.info(
        "[InGiDay Ads Server] Đã tiếp nhận",
        {
          platform: input.source.platform,
          sourceId: input.source.id,
          eventName: input.eventName,
          eventId: input.eventId,
        },
      );
    }
  } catch (error) {
    if (isAdsDebugEnabled()) {
      console.warn(
        "[InGiDay Ads Server] Lỗi mạng",
        error,
      );
    }
  }
}

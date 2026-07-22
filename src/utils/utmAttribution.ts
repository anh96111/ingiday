import type { UtmAttribution } from "../types/cart";

const STORAGE_KEY = "ingiday-utm-attribution-v1";
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_VALUE_LENGTH = 200;

const UTM_FIELDS = [
  ["utm_source", "source"],
  ["utm_medium", "medium"],
  ["utm_campaign", "campaign"],
  ["utm_content", "content"],
  ["utm_term", "term"],
] as const;

function cleanValue(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().slice(0, MAX_VALUE_LENGTH);
  return normalized || undefined;
}

export function normalizeUtmAttribution(
  value: unknown,
): UtmAttribution | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const source = value as Record<string, unknown>;
  const normalized: UtmAttribution = {
    source: cleanValue(source.source),
    medium: cleanValue(source.medium),
    campaign: cleanValue(source.campaign),
    content: cleanValue(source.content),
    term: cleanValue(source.term),
    capturedAt: cleanValue(source.capturedAt),
  };

  if (
    !normalized.source &&
    !normalized.medium &&
    !normalized.campaign &&
    !normalized.content &&
    !normalized.term
  ) {
    return undefined;
  }

  return normalized;
}

function readStoredUtmAttribution() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return undefined;
    }

    const parsed = normalizeUtmAttribution(JSON.parse(raw));

    if (!parsed) {
      localStorage.removeItem(STORAGE_KEY);
      return undefined;
    }

    if (parsed.capturedAt) {
      const capturedAt = new Date(parsed.capturedAt).getTime();

      if (
        !Number.isFinite(capturedAt) ||
        Date.now() - capturedAt > MAX_AGE_MS
      ) {
        localStorage.removeItem(STORAGE_KEY);
        return undefined;
      }
    }

    return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return undefined;
  }
}

export function captureUtmAttribution(search: string) {
  const params = new URLSearchParams(search);
  const captured: UtmAttribution = {};

  for (const [queryName, fieldName] of UTM_FIELDS) {
    const value = cleanValue(params.get(queryName));

    if (value) {
      captured[fieldName] = value;
    }
  }

  if (
    !captured.source &&
    !captured.medium &&
    !captured.campaign &&
    !captured.content &&
    !captured.term
  ) {
    return readStoredUtmAttribution();
  }

  captured.capturedAt = new Date().toISOString();

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(captured));
  } catch (storageError) {
    console.warn("Không thể lưu UTM attribution:", storageError);
  }

  return captured;
}

export function getCurrentUtmAttribution(): UtmAttribution {
  return readStoredUtmAttribution() ?? { source: "direct" };
}

export function getUtmSourceLabel(
  attribution?: UtmAttribution,
) {
  const source = attribution?.source?.trim();

  if (!source) {
    return attribution &&
      (attribution.medium ||
        attribution.campaign ||
        attribution.content ||
        attribution.term)
      ? "Không xác định"
      : "Trực tiếp";
  }

  if (source.toLowerCase() === "direct") {
    return "Trực tiếp";
  }

  const normalized = source.toLowerCase();

  if (["facebook", "fb", "meta"].includes(normalized)) {
    return "Meta / Facebook";
  }

  if (["instagram", "ig"].includes(normalized)) {
    return "Instagram";
  }

  if (normalized === "tiktok") {
    return "TikTok";
  }

  if (normalized === "google") {
    return "Google";
  }

  if (normalized === "zalo") {
    return "Zalo";
  }

  return source;
}

export function getUtmSecondaryLabel(
  attribution?: UtmAttribution,
) {
  if (
    !attribution ||
    attribution.source?.toLowerCase() === "direct" ||
    (!attribution.source &&
      !attribution.medium &&
      !attribution.campaign &&
      !attribution.content &&
      !attribution.term)
  ) {
    return "Không có UTM";
  }

  return (
    attribution.campaign ||
    attribution.content ||
    attribution.medium ||
    attribution.term ||
    "Không có chiến dịch"
  );
}

export function getUtmAttributionTitle(
  attribution?: UtmAttribution,
) {
  if (!attribution) {
    return "Nguồn: Trực tiếp";
  }

  const parts = [
    ["Nguồn", attribution.source],
    ["Medium", attribution.medium],
    ["Campaign", attribution.campaign],
    ["Content", attribution.content],
    ["Term", attribution.term],
  ]
    .filter((item): item is [string, string] => Boolean(item[1]))
    .map(([label, value]) => `${label}: ${value}`);

  return parts.length > 0 ? parts.join(" · ") : "Nguồn: Trực tiếp";
}

import type { UtmAttribution } from "../types/cart";

const STORAGE_KEY = "ingiday-utm-attribution-v1";
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_VALUE_LENGTH = 200;
const MAX_CLICK_ID_LENGTH = 500;

type AttributionField = Exclude<keyof UtmAttribution, "capturedAt">;

const URL_PARAMETER_FIELDS: ReadonlyArray<
  readonly [queryName: string, fieldName: AttributionField, maxLength?: number]
> = [
  ["utm_source", "source"],
  ["utm_medium", "medium"],
  ["utm_campaign", "campaign"],
  ["utm_content", "content"],
  ["utm_term", "term"],
  ["utm_id", "utmId"],
  ["campaign_id", "campaignId"],
  ["adset_id", "adsetId"],
  ["ad_id", "adId"],
  ["campaign_name", "campaignName"],
  ["adset_name", "adsetName"],
  ["ad_name", "adName"],
  ["placement", "placement"],
  ["site_source_name", "siteSourceName"],
  ["fbclid", "fbclid", MAX_CLICK_ID_LENGTH],
];

const ATTRIBUTION_FIELDS: AttributionField[] = [
  "source",
  "medium",
  "campaign",
  "content",
  "term",
  "utmId",
  "campaignId",
  "adsetId",
  "adId",
  "campaignName",
  "adsetName",
  "adName",
  "placement",
  "siteSourceName",
  "fbclid",
];

function cleanValue(
  value: unknown,
  maxLength = MAX_VALUE_LENGTH,
) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().slice(0, maxLength);
  return normalized || undefined;
}

function hasAttribution(attribution: UtmAttribution) {
  return ATTRIBUTION_FIELDS.some((field) => Boolean(attribution[field]));
}

function inferredMetaSource(attribution: UtmAttribution) {
  const explicitSiteSource = attribution.siteSourceName?.trim();

  if (explicitSiteSource) {
    return explicitSiteSource;
  }

  return attribution.campaignId ||
    attribution.adsetId ||
    attribution.adId ||
    attribution.campaignName ||
    attribution.adsetName ||
    attribution.adName ||
    attribution.placement ||
    attribution.fbclid
    ? "meta"
    : undefined;
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
    utmId: cleanValue(source.utmId),
    campaignId: cleanValue(source.campaignId),
    adsetId: cleanValue(source.adsetId),
    adId: cleanValue(source.adId),
    campaignName: cleanValue(source.campaignName),
    adsetName: cleanValue(source.adsetName),
    adName: cleanValue(source.adName),
    placement: cleanValue(source.placement),
    siteSourceName: cleanValue(source.siteSourceName),
    fbclid: cleanValue(source.fbclid, MAX_CLICK_ID_LENGTH),
    capturedAt: cleanValue(source.capturedAt),
  };

  if (!normalized.source) {
    normalized.source = inferredMetaSource(normalized);
  }

  return hasAttribution(normalized) ? normalized : undefined;
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

  for (const [queryName, fieldName, maxLength] of URL_PARAMETER_FIELDS) {
    const value = cleanValue(params.get(queryName), maxLength);

    if (value) {
      captured[fieldName] = value;
    }
  }

  if (!hasAttribution(captured)) {
    return readStoredUtmAttribution();
  }

  if (!captured.source) {
    captured.source = inferredMetaSource(captured);
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
  const source =
    attribution?.source?.trim() ||
    attribution?.siteSourceName?.trim();

  if (!source) {
    return attribution && hasAttribution(attribution)
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
    !hasAttribution(attribution)
  ) {
    return "Không có UTM";
  }

  return (
    attribution.campaignName ||
    attribution.campaign ||
    attribution.adName ||
    attribution.content ||
    attribution.adsetName ||
    attribution.medium ||
    attribution.placement ||
    attribution.term ||
    attribution.campaignId ||
    attribution.adId ||
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
    ["Campaign name", attribution.campaignName],
    ["Campaign ID", attribution.campaignId],
    ["Ad set name", attribution.adsetName],
    ["Ad set ID", attribution.adsetId],
    ["Ad name", attribution.adName],
    ["Ad ID", attribution.adId],
    ["Content", attribution.content],
    ["Term", attribution.term],
    ["UTM ID", attribution.utmId],
    ["Placement", attribution.placement],
    ["Site source", attribution.siteSourceName],
    ["Meta click ID", attribution.fbclid],
  ]
    .filter((item): item is [string, string] => Boolean(item[1]))
    .map(([label, value]) => `${label}: ${value}`);

  return parts.length > 0 ? parts.join(" · ") : "Nguồn: Trực tiếp";
}
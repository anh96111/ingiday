import { requireAdmin } from "../../../_lib/ads-auth";
import {
  errorResponse,
  HttpError,
  jsonResponse,
} from "../../../_lib/http";
import {
  fetchMetaAdsInsights,
  listMetaAdsAccounts,
  loadStoredMetaAccessToken,
  publicAccountRow,
} from "../../../_lib/meta-ads-report";
import type {
  MetaAdsAccountRow,
  MetaAdsFunctionEnv,
} from "../../../_lib/meta-ads-report";

type RouteContext = {
  request: Request;
  env: MetaAdsFunctionEnv;
};

type AccountReportResult = {
  account: MetaAdsAccountRow;
  ads: Awaited<ReturnType<typeof fetchMetaAdsInsights>>;
};

function parseDate(value: string | null, label: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, `Ngày ${label} không hợp lệ.`);
  }

  const date = new Date(`${value}T00:00:00Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new HttpError(400, `Ngày ${label} không tồn tại.`);
  }

  return date;
}

function validateRange(since: string | null, until: string | null) {
  const start = parseDate(since, "bắt đầu");
  const end = parseDate(until, "kết thúc");

  if (start.getTime() > end.getTime()) {
    throw new HttpError(
      400,
      "Ngày bắt đầu không được lớn hơn ngày kết thúc.",
    );
  }

  const days = Math.floor(
    (end.getTime() - start.getTime()) / 86_400_000,
  ) + 1;

  if (days > 90) {
    throw new HttpError(
      400,
      "Mỗi lần báo cáo tối đa 90 ngày để tránh Meta API quá tải.",
    );
  }

  return {
    since: since as string,
    until: until as string,
    days,
  };
}

function accountIdFilter(value: string | null) {
  if (!value || value === "all") {
    return null;
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new HttpError(400, "Bộ lọc tài khoản không hợp lệ.");
  }

  return value;
}

async function loadInBatches(
  env: MetaAdsFunctionEnv,
  accessToken: string,
  accounts: MetaAdsAccountRow[],
  since: string,
  until: string,
) {
  const successes: AccountReportResult[] = [];
  const errors: Array<{
    accountId: string;
    accountName: string;
    message: string;
  }> = [];

  for (let index = 0; index < accounts.length; index += 3) {
    const batch = accounts.slice(index, index + 3);
    const results = await Promise.allSettled(
      batch.map(async (account) => ({
        account,
        ads: await fetchMetaAdsInsights(
          env,
          accessToken,
          account,
          since,
          until,
        ),
      })),
    );

    results.forEach((result, resultIndex) => {
      const account = batch.at(resultIndex);

      if (!account) {
        throw new HttpError(
          500,
          "Không thể ghép kết quả Meta với tài khoản quảng cáo.",
        );
      }

      if (result.status === "fulfilled") {
        successes.push(result.value);
        return;
      }

      errors.push({
        accountId: account.id,
        accountName: account.account_name,
        message:
          result.reason instanceof Error
            ? result.reason.message
            : "Không thể đọc dữ liệu tài khoản.",
      });
    });
  }

  return { successes, errors };
}

export async function onRequestGet(context: RouteContext) {
  try {
    await requireAdmin(context.request, context.env);
    const url = new URL(context.request.url);
    const range = validateRange(
      url.searchParams.get("since"),
      url.searchParams.get("until"),
    );
    const selectedAccountId = accountIdFilter(
      url.searchParams.get("accountId"),
    );
    let accounts = await listMetaAdsAccounts(context.env, {
      enabledOnly: true,
    });

    if (selectedAccountId) {
      accounts = accounts.filter(
        (account) => account.id === selectedAccountId,
      );
    }

    if (accounts.length === 0) {
      return jsonResponse({
        success: true,
        report: {
          since: range.since,
          until: range.until,
          dayCount: range.days,
          generatedAt: new Date().toISOString(),
          totalAccounts: 0,
          totalAds: 0,
          totalsByCurrency: [],
          accounts: [],
          errors: [],
        },
      });
    }

    const stored = await loadStoredMetaAccessToken(context.env);
    const result = await loadInBatches(
      context.env,
      stored.accessToken,
      accounts,
      range.since,
      range.until,
    );
    const totalsByCurrency = new Map<string, number>();
    const accountReports = result.successes
      .map(({ account, ads }) => {
        const totalSpend = ads.reduce(
          (total, ad) => total + ad.spend,
          0,
        );

        if (totalSpend > 0) {
          totalsByCurrency.set(
            account.currency,
            (totalsByCurrency.get(account.currency) ?? 0) + totalSpend,
          );
        }

        return {
          ...publicAccountRow(account),
          totalSpend,
          adCount: ads.length,
          ads,
        };
      })
      .filter((account) => account.totalSpend > 0)
      .sort((left, right) => right.totalSpend - left.totalSpend);
    const totalAds = accountReports.reduce(
      (total, account) => total + account.adCount,
      0,
    );

    return jsonResponse({
      success: true,
      report: {
        since: range.since,
        until: range.until,
        dayCount: range.days,
        generatedAt: new Date().toISOString(),
        totalAccounts: accountReports.length,
        totalAds,
        totalsByCurrency: [...totalsByCurrency.entries()]
          .map(([currency, spend]) => ({ currency, spend }))
          .sort((left, right) => left.currency.localeCompare(right.currency)),
        accounts: accountReports,
        errors: result.errors,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

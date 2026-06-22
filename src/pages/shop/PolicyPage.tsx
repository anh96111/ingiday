/* eslint-disable react-hooks/set-state-in-effect */
import {
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";

import PolicyArticle from "../../components/policies/PolicyArticle";
import {
  POLICY_LINKS,
  getPolicyVisual,
} from "../../components/policies/policyPresentation";
import { usePageMeta } from "../../hooks/usePageMeta";
import { fetchPublicPolicy } from "../../services/policies";
import type { SitePolicy } from "../../types/policy";

type PolicyPageProps = {
  policySlug: string;
};

export default function PolicyPage({
  policySlug,
}: PolicyPageProps) {
  const [policy, setPolicy] =
    useState<SitePolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryVersion, setRetryVersion] =
    useState(0);

  usePageMeta({
    title:
      policy?.seoTitle ||
      "Chính sách | InGiDay",
    description:
      policy?.seoDescription ||
      "Thông tin chính sách của InGiDay.",
    canonicalPath: `/${policySlug}`,
  });

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setPolicy(null);

    void fetchPublicPolicy(
      policySlug,
      retryVersion > 0,
    )
      .then((result) => {
        if (active) {
          setPolicy(result);
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Không thể tải chính sách.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [policySlug, retryVersion]);

  if (loading) {
    return (
      <section className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        <div className="h-64 animate-pulse rounded-[34px] bg-[#eaf0f6]" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="hidden h-72 animate-pulse rounded-3xl bg-[#eaf0f6] lg:block" />
          <div className="space-y-5">
            {Array.from({ length: 4 }).map(
              (_item, index) => (
                <div
                  key={index}
                  className="h-52 animate-pulse rounded-[28px] bg-[#eaf0f6]"
                />
              ),
            )}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-20 text-center">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-[34%] bg-[#fff0e8] text-5xl">
          😵‍💫
        </div>
        <h1 className="mt-6 text-3xl font-black">
          Không thể tải chính sách
        </h1>
        <p className="mt-4 text-[#a43c12]">
          {error}
        </p>
        <button
          type="button"
          onClick={() =>
            setRetryVersion(
              (current) => current + 1,
            )
          }
          className="mt-6 rounded-2xl bg-[#006397] px-6 py-3 font-bold text-white"
        >
          Thử lại
        </button>
      </section>
    );
  }

  if (!policy) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-20 text-center">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-[34%] bg-[#dff4ff] text-5xl">
          📭
        </div>
        <h1 className="mt-6 text-3xl font-black">
          Chính sách chưa được công bố
        </h1>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-2xl bg-[#006397] px-6 py-3 font-bold text-white"
        >
          Về trang chủ
        </Link>
      </section>
    );
  }

  const relatedPolicies =
    POLICY_LINKS.filter(
      (item) => item.slug !== policy.slug,
    );

  return (
    <section className="mx-auto max-w-6xl px-5 py-8 sm:py-10 lg:px-8">
      <nav className="mb-5 text-sm text-[#707881]">
        <Link
          to="/"
          className="font-bold text-[#006397]"
        >
          Trang chủ
        </Link>
        <span> / {policy.title}</span>
      </nav>

      <PolicyArticle policy={policy} />

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#006397]">
              Đọc thêm
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#091d2e] sm:text-3xl">
              Các chính sách khác
            </h2>
          </div>

          <Link
            to="/san-pham"
            className="text-sm font-bold text-[#006397]"
          >
            Tiếp tục mua sắm →
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {relatedPolicies.map((item) => {
            const visual = getPolicyVisual(
              item.slug,
            );

            return (
              <Link
                key={item.slug}
                to={`/${item.slug}`}
                className="group rounded-[24px] border border-[#e3eaf0] bg-white p-5 shadow-[0_14px_36px_-30px_rgba(0,99,151,0.5)] transition hover:-translate-y-1"
              >
                <div
                  className="grid h-12 w-12 place-items-center rounded-2xl text-2xl"
                  style={{
                    backgroundColor:
                      visual.accentSoft,
                  }}
                >
                  {visual.icon}
                </div>
                <h3 className="mt-4 font-black text-[#091d2e]">
                  {item.label}
                </h3>
                <p className="mt-2 text-sm text-[#707881]">
                  Xem thông tin chi tiết
                </p>
                <span
                  className="mt-4 inline-block text-sm font-bold transition group-hover:translate-x-1"
                  style={{
                    color: visual.accent,
                  }}
                >
                  Mở chính sách →
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </section>
  );
}
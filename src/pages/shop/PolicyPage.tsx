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
      <section className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
        <div className="h-56 animate-pulse rounded-[30px] bg-[#eaf0f6]" />
        <div className="mt-7 grid gap-7 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="hidden h-64 animate-pulse rounded-3xl bg-[#eaf0f6] lg:block" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map(
              (_item, index) => (
                <div
                  key={index}
                  className="h-44 animate-pulse rounded-[24px] bg-[#eaf0f6]"
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
        <h1 className="text-3xl font-black">
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
        <h1 className="text-3xl font-black">
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
    <section className="mx-auto max-w-6xl px-5 py-7 sm:py-9 lg:px-8">
      <nav className="mb-5 flex items-center gap-2 text-sm text-[#74808a]">
        <Link
          to="/"
          className="font-bold text-[#006397]"
        >
          Trang chủ
        </Link>
        <span>/</span>
        <span>{policy.title}</span>
      </nav>

      <PolicyArticle policy={policy} />

      <section className="mt-12 border-t border-[#dfe6ec] pt-9">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#006397]">
              Tham khảo thêm
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#10283a]">
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

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {relatedPolicies.map((item) => {
            const visual = getPolicyVisual(
              item.slug,
            );

            return (
              <Link
                key={item.slug}
                to={`/${item.slug}`}
                className="group rounded-2xl border border-[#e1e8ee] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#c8d8e4]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl"
                    style={{
                      backgroundColor:
                        visual.accentSoft,
                    }}
                  >
                    {visual.icon}
                  </div>
                  <h3 className="font-black leading-5 text-[#10283a]">
                    {item.shortLabel}
                  </h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#74808a]">
                  Xem thông tin chi tiết
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </section>
  );
}
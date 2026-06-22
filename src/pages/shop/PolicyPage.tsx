/* eslint-disable react-hooks/set-state-in-effect */
import {
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";

import { usePageMeta } from "../../hooks/usePageMeta";
import { fetchPublicPolicy } from "../../services/policies";
import type { SitePolicy } from "../../types/policy";

type PolicyPageProps = {
  policySlug: string;
};

function PolicyContent({
  content,
}: {
  content: string;
}) {
  const blocks = content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="space-y-6">
      {blocks.map((block, index) => {
        if (block.startsWith("## ")) {
          return (
            <h2
              key={`${block}-${index}`}
              className="pt-3 text-2xl font-black text-[#091d2e]"
            >
              {block.slice(3)}
            </h2>
          );
        }

        const lines = block.split("\n");

        return (
          <p
            key={`${block}-${index}`}
            className="leading-8 text-[#3f4850]"
          >
            {lines.map((line, lineIndex) => (
              <span
                key={`${line}-${lineIndex}`}
              >
                {line}
                {lineIndex <
                  lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

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
      <section className="mx-auto max-w-4xl px-5 py-12 lg:px-8">
        <div className="h-5 w-36 animate-pulse rounded bg-[#dbe8f5]" />
        <div className="mt-5 h-12 w-3/4 animate-pulse rounded bg-[#eaf0f6]" />
        <div className="mt-8 space-y-4">
          {Array.from({ length: 7 }).map(
            (_item, index) => (
              <div
                key={index}
                className="h-5 animate-pulse rounded bg-[#eaf0f6]"
              />
            ),
          )}
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

  const updatedAt = new Intl.DateTimeFormat(
    "vi-VN",
    {
      dateStyle: "long",
    },
  ).format(new Date(policy.updatedAt));

  return (
    <section className="mx-auto max-w-4xl px-5 py-12 lg:px-8">
      <nav className="text-sm text-[#707881]">
        <Link
          to="/"
          className="font-bold text-[#006397]"
        >
          Trang chủ
        </Link>
        <span> / {policy.title}</span>
      </nav>

      <article className="mt-6 rounded-[32px] bg-white px-6 py-9 shadow-[0_18px_55px_-34px_rgba(0,99,151,0.48)] sm:px-10 sm:py-12">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#006397]">
          Thông tin InGiDay
        </p>
        <h1 className="mt-3 text-3xl font-black leading-tight text-[#091d2e] sm:text-4xl">
          {policy.title}
        </h1>
        <p className="mt-3 text-sm text-[#707881]">
          Cập nhật lần cuối: {updatedAt}
        </p>

        <div className="mt-9 border-t border-[#dce3ea] pt-8">
          <PolicyContent
            content={policy.content}
          />
        </div>
      </article>
    </section>
  );
}
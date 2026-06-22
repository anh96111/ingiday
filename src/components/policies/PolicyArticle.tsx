import { useMemo } from "react";

import type { SitePolicy } from "../../types/policy";
import {
  getPolicyVisual,
} from "./policyPresentation";

type PolicySection = {
  id: string;
  title: string;
  blocks: string[];
};

type PolicyArticleProps = {
  policy: SitePolicy;
  preview?: boolean;
};

function createAnchor(
  value: string,
  index: number,
) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || `muc-${index + 1}`;
}

function parseSections(
  content: string,
): PolicySection[] {
  const blocks = content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const sections: PolicySection[] = [];
  let current: PolicySection | null = null;

  blocks.forEach((block) => {
    if (block.startsWith("## ")) {
      const title = block.slice(3).trim();
      current = {
        id: createAnchor(
          title,
          sections.length,
        ),
        title,
        blocks: [],
      };
      sections.push(current);
      return;
    }

    if (!current) {
      current = {
        id: "thong-tin-chung",
        title: "Thông tin chung",
        blocks: [],
      };
      sections.push(current);
    }

    current.blocks.push(block);
  });

  return sections;
}

function ContentBlock({
  block,
}: {
  block: string;
}) {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const bulletLines = lines.filter((line) =>
    /^[-•]\s+/.test(line),
  );

  if (
    bulletLines.length > 0 &&
    bulletLines.length === lines.length
  ) {
    return (
      <ul className="space-y-3">
        {lines.map((line, index) => (
          <li
            key={`${line}-${index}`}
            className="flex gap-3 leading-7 text-[#42505c]"
          >
            <span
              aria-hidden="true"
              className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-current opacity-55"
            />
            <span>
              {line.replace(/^[-•]\s+/, "")}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p className="leading-8 text-[#42505c]">
      {lines.map((line, index) => (
        <span key={`${line}-${index}`}>
          {line}
          {index < lines.length - 1 && <br />}
        </span>
      ))}
    </p>
  );
}

export default function PolicyArticle({
  policy,
  preview = false,
}: PolicyArticleProps) {
  const sections = useMemo(
    () => parseSections(policy.content),
    [policy.content],
  );
  const visual = getPolicyVisual(policy.slug);
  const updatedAt = new Intl.DateTimeFormat(
    "vi-VN",
    {
      dateStyle: "long",
    },
  ).format(new Date(policy.updatedAt));

  return (
    <div
      className={
        preview
          ? "space-y-5"
          : "space-y-8"
      }
    >
      <header
        className={`relative isolate overflow-hidden ${
          preview
            ? "rounded-[26px] p-5"
            : "rounded-[34px] px-6 py-8 sm:px-10 sm:py-10"
        }`}
        style={{
          background: visual.gradient,
        }}
      >
        <div
          className={`absolute -right-10 -top-14 rounded-full bg-white/35 blur-sm ${
            preview
              ? "h-36 w-36"
              : "h-56 w-56"
          }`}
        />
        <div
          className={`absolute -bottom-16 left-[38%] rounded-full bg-white/25 ${
            preview
              ? "h-28 w-28"
              : "h-44 w-44"
          }`}
        />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`grid place-items-center rounded-[30%] bg-white/80 shadow-sm ${
                preview
                  ? "h-14 w-14 text-3xl"
                  : "h-20 w-20 text-4xl"
              }`}
            >
              {visual.icon}
            </div>

            <div>
              <p
                className="text-xs font-black uppercase tracking-[0.2em]"
                style={{
                  color: visual.accent,
                }}
              >
                {visual.eyebrow}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#65717b]">
                Thông tin chính thức từ InGiDay
              </p>
            </div>
          </div>

          <h1
            className={`font-black leading-tight tracking-[-0.03em] text-[#091d2e] ${
              preview
                ? "mt-5 text-2xl"
                : "mt-7 text-3xl sm:text-5xl"
            }`}
          >
            {policy.title}
          </h1>

          {policy.seoDescription && (
            <p
              className={`max-w-3xl leading-7 text-[#42505c] ${
                preview
                  ? "mt-3 text-sm"
                  : "mt-4 text-base sm:text-lg"
              }`}
            >
              {policy.seoDescription}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[#65717b]">
            <span className="rounded-full bg-white/75 px-4 py-2 font-semibold">
              Cập nhật: {updatedAt}
            </span>
            <span className="rounded-full bg-white/55 px-4 py-2 font-semibold">
              {sections.length} mục thông tin
            </span>
          </div>
        </div>
      </header>

      {sections.length > 0 && (
        <div
          className={
            preview
              ? "space-y-4"
              : "lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8"
          }
        >
          {!preview && (
            <>
              <aside className="hidden lg:block">
                <div className="sticky top-24 rounded-3xl bg-white p-4 shadow-[0_16px_42px_-30px_rgba(0,99,151,0.5)]">
                  <p className="px-3 pb-3 text-xs font-black uppercase tracking-[0.18em] text-[#65717b]">
                    Nội dung chính
                  </p>
                  <nav className="space-y-1">
                    {sections.map(
                      (section, index) => (
                        <a
                          key={section.id}
                          href={`#${section.id}`}
                          className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-[#42505c] transition hover:bg-[#edf6ff] hover:text-[#006397]"
                        >
                          <span
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs"
                            style={{
                              backgroundColor:
                                visual.accentSoft,
                              color: visual.accent,
                            }}
                          >
                            {index + 1}
                          </span>
                          <span>
                            {section.title}
                          </span>
                        </a>
                      ),
                    )}
                  </nav>
                </div>
              </aside>

              <nav className="mb-5 flex gap-2 overflow-x-auto pb-2 lg:hidden">
                {sections.map(
                  (section, index) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="shrink-0 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-[#42505c] shadow-sm"
                    >
                      {index + 1}.{" "}
                      {section.title}
                    </a>
                  ),
                )}
              </nav>
            </>
          )}

          <div
            className={
              preview
                ? "space-y-4"
                : "space-y-5"
            }
          >
            {sections.map((section, index) => (
              <section
                key={section.id}
                id={
                  preview
                    ? undefined
                    : section.id
                }
                className={`scroll-mt-24 border border-[#e4ebf1] bg-white ${
                  preview
                    ? "rounded-2xl p-4"
                    : "rounded-[28px] p-6 shadow-[0_16px_44px_-34px_rgba(0,99,151,0.48)] sm:p-8"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`grid shrink-0 place-items-center rounded-2xl font-black ${
                      preview
                        ? "h-10 w-10 text-sm"
                        : "h-12 w-12"
                    }`}
                    style={{
                      backgroundColor:
                        visual.accentSoft,
                      color: visual.accent,
                    }}
                  >
                    {String(index + 1).padStart(
                      2,
                      "0",
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2
                      className={`font-black leading-tight text-[#091d2e] ${
                        preview
                          ? "text-lg"
                          : "text-2xl"
                      }`}
                    >
                      {section.title}
                    </h2>

                    <div
                      className={`space-y-5 ${
                        preview
                          ? "mt-3 text-sm"
                          : "mt-5"
                      }`}
                    >
                      {section.blocks.length > 0 ? (
                        section.blocks.map(
                          (block, blockIndex) => (
                            <ContentBlock
                              key={`${block}-${blockIndex}`}
                              block={block}
                            />
                          ),
                        )
                      ) : (
                        <p className="italic text-[#7c8790]">
                          Chưa có nội dung cho mục
                          này.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
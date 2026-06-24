import {
  buildMetaDomainVerificationTag,
  loadMetaDomainVerificationCode,
  META_DOMAIN_VERIFICATION_NAME,
} from "./_lib/meta-domain-verification";
import type { AdsFunctionEnv } from "./_lib/supabase-server";

type HtmlContentOptions = {
  html?: boolean;
};

type HtmlRewriterElement = {
  append(
    content: string,
    options?: HtmlContentOptions,
  ): void;
  remove(): void;
};

type HtmlRewriterHandler = {
  element(element: HtmlRewriterElement): void;
};

type HtmlRewriterInstance = {
  on(
    selector: string,
    handler: HtmlRewriterHandler,
  ): HtmlRewriterInstance;
  transform(response: Response): Response;
};

declare const HTMLRewriter: {
  new (): HtmlRewriterInstance;
};

type MiddlewareContext = {
  request: Request;
  env: AdsFunctionEnv;
  next(): Promise<Response>;
};

function isHomepageRequest(request: Request) {
  if (request.method !== "GET") {
    return false;
  }

  const pathname = new URL(request.url).pathname;

  return pathname === "/" || pathname === "/index.html";
}

function isHtmlResponse(response: Response) {
  if (!response.ok || response.body === null) {
    return false;
  }

  return (
    response.headers
      .get("Content-Type")
      ?.toLowerCase()
      .includes("text/html") ?? false
  );
}

async function safelyLoadVerificationCode(
  env: AdsFunctionEnv,
) {
  try {
    return await loadMetaDomainVerificationCode(env);
  } catch (error) {
    console.error(
      "meta-domain-verification-middleware-failed",
      error,
    );

    return null;
  }
}

export async function onRequest(
  context: MiddlewareContext,
) {
  const response = await context.next();

  if (
    !isHomepageRequest(context.request) ||
    !isHtmlResponse(response)
  ) {
    return response;
  }

  const code = await safelyLoadVerificationCode(
    context.env,
  );

  if (!code) {
    return response;
  }

  const tag = buildMetaDomainVerificationTag(code);

  return new HTMLRewriter()
    .on(
      `meta[name="${META_DOMAIN_VERIFICATION_NAME}"]`,
      {
        element(element) {
          element.remove();
        },
      },
    )
    .on("head", {
      element(element) {
        element.append(`\n    ${tag}`, {
          html: true,
        });
      },
    })
    .transform(response);
}

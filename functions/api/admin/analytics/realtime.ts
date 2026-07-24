import { requireAdmin } from "../../../_lib/ads-auth";
import {
  loadGa4RealtimeDashboard,
} from "../../../_lib/google-analytics";
import type {
  AnalyticsFunctionEnv,
} from "../../../_lib/google-analytics";
import {
  errorResponse,
  jsonResponse,
} from "../../../_lib/http";

type RouteContext = {
  request: Request;
  env: AnalyticsFunctionEnv;
};

export async function onRequestGet(
  context: RouteContext,
) {
  try {
    await requireAdmin(
      context.request,
      context.env,
    );

    const data = await loadGa4RealtimeDashboard(
      context.env,
    );

    return jsonResponse({
      success: true,
      data,
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

import type { User } from "@supabase/supabase-js";

import { HttpError } from "./http";
import {
  createSupabaseServerClient,
} from "./supabase-server";
import type {
  AdsFunctionEnv,
} from "./supabase-server";

type AdminProfileRow = {
  id: string;
  role: "admin" | "super_admin";
  active: boolean;
};

export async function requireAdmin(
  request: Request,
  env: AdsFunctionEnv,
): Promise<{
  user: User;
  supabase: ReturnType<
    typeof createSupabaseServerClient
  >;
}> {
  const authorization =
    request.headers.get("Authorization") ?? "";
  const match = authorization.match(
    /^Bearer\s+(.+)$/i,
  );
  const accessToken = match?.[1]?.trim();

  if (!accessToken) {
    throw new HttpError(
      401,
      "Phiên đăng nhập quản trị không hợp lệ.",
    );
  }

  const supabase =
    createSupabaseServerClient(env);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    throw new HttpError(
      401,
      "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("admin_profiles")
    .select("id,role,active")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new HttpError(
      500,
      "Không thể kiểm tra quyền quản trị.",
    );
  }

  const adminProfile =
    profile as AdminProfileRow | null;

  if (
    !adminProfile ||
    !adminProfile.active ||
    (
      adminProfile.role !== "admin" &&
      adminProfile.role !== "super_admin"
    )
  ) {
    throw new HttpError(
      403,
      "Tài khoản không có quyền quản trị.",
    );
  }

  return {
    user,
    supabase,
  };
}

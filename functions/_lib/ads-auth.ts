import {
  HttpError,
} from "./http";
import {
  supabaseServerFetch,
} from "./supabase-server";
import type {
  AdsFunctionEnv,
} from "./supabase-server";

type VerifiedUser = {
  id: string;
  email?: string;
};

type AdminProfileRow = {
  id: string;
  role: "admin" | "super_admin";
  active: boolean;
};

async function verifyUser(
  accessToken: string,
  env: AdsFunctionEnv,
): Promise<VerifiedUser> {
  const response =
    await supabaseServerFetch(
      env,
      "/auth/v1/user",
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
      },
    );

  if (!response.ok) {
    throw new HttpError(
      401,
      "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    );
  }

  const payload =
    (await response.json()) as unknown;

  if (
    !payload ||
    typeof payload !== "object" ||
    !("id" in payload) ||
    typeof payload.id !== "string"
  ) {
    throw new HttpError(
      401,
      "Phiên đăng nhập quản trị không hợp lệ.",
    );
  }

  return payload as VerifiedUser;
}

async function readAdminProfile(
  userId: string,
  env: AdsFunctionEnv,
): Promise<AdminProfileRow | null> {
  const query =
    "/rest/v1/admin_profiles" +
    `?id=eq.${encodeURIComponent(userId)}` +
    "&select=id,role,active" +
    "&limit=1";

  const response =
    await supabaseServerFetch(
      env,
      query,
    );

  if (!response.ok) {
    console.error(
      "admin-profile-check-failed",
      response.status,
    );

    throw new HttpError(
      500,
      "Không thể kiểm tra quyền quản trị.",
    );
  }

  const payload =
    (await response.json()) as unknown;

  if (!Array.isArray(payload)) {
    throw new HttpError(
      500,
      "Phản hồi quyền quản trị không hợp lệ.",
    );
  }

  const profile =
    payload[0] as
      | AdminProfileRow
      | undefined;

  return profile ?? null;
}

export async function requireAdmin(
  request: Request,
  env: AdsFunctionEnv,
): Promise<{
  user: VerifiedUser;
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

  const user =
    await verifyUser(
      accessToken,
      env,
    );
  const adminProfile =
    await readAdminProfile(
      user.id,
      env,
    );

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
  };
}

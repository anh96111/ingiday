import { createClient } from "@supabase/supabase-js";

import { HttpError } from "./http";

export type AdsFunctionEnv = {
  SUPABASE_URL?: string;
  SUPABASE_SERVER_KEY?: string;
  ADS_TOKEN_ENCRYPTION_KEY?: string;
};

function requiredBinding(
  value: string | undefined,
  name: string,
) {
  const normalized = value?.trim();

  if (!normalized) {
    throw new HttpError(
      500,
      `Thiếu cấu hình máy chủ ${name}.`,
    );
  }

  return normalized;
}

export function requireEncryptionKey(
  env: AdsFunctionEnv,
) {
  return requiredBinding(
    env.ADS_TOKEN_ENCRYPTION_KEY,
    "ADS_TOKEN_ENCRYPTION_KEY",
  );
}

export function createSupabaseServerClient(
  env: AdsFunctionEnv,
) {
  const supabaseUrl = requiredBinding(
    env.SUPABASE_URL,
    "SUPABASE_URL",
  );
  const serverKey = requiredBinding(
    env.SUPABASE_SERVER_KEY,
    "SUPABASE_SERVER_KEY",
  );

  return createClient(supabaseUrl, serverKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

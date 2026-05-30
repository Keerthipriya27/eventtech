import { createServerFn } from "@tanstack/react-start";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { getSupabaseAdminClient } from "./client.server";

export const generate2fa = createServerFn({ method: "POST" }).handler(async ({ data }: any) => {
  const { userId, label } = data as { userId: string; label?: string };
  if (!userId) throw new Error("userId required");

  const secret = speakeasy.generateSecret({ name: label || `EventTech (${userId})` });
  const otpauth = secret.otpauth_url!;
  const qr = await qrcode.toDataURL(otpauth);
  // Return the base32 secret and QR to the client for verification (do NOT store until confirmed)
  return { base32: secret.base32, otpauth, qr };
});

export const confirm2fa = createServerFn({ method: "POST" }).handler(async ({ data }: any) => {
  const supabaseAdmin = getSupabaseAdminClient();

  const { userId, secret, token } = data as { userId: string; secret: string; token: string };
  if (!userId || !secret || !token) throw new Error("userId, secret and token are required");

  const ok = speakeasy.totp.verify({ secret, encoding: "base32", token, window: 1 });
  if (!ok) throw new Error("Invalid token");

  // Load current user to preserve metadata
  const { data: existing, error: getErr } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (getErr) throw getErr;
  const currentMeta = (existing?.user?.user_metadata as any) || {};
  const { data: updated, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: { ...currentMeta, totp_enabled: true, totp_secret: secret },
  } as any);

  if (error) throw error;
  return { ok: true };
});

export const verify2fa = createServerFn({ method: "POST" }).handler(async ({ data }: any) => {
  const supabaseAdmin = getSupabaseAdminClient();

  const { userId, token } = data as { userId: string; token: string };
  if (!userId || !token) throw new Error("userId and token required");

  const { data: user, error: uErr } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (uErr) throw uErr;
  const secret = (user?.user?.user_metadata as any)?.totp_secret;
  if (!secret) throw new Error("2FA not enabled");
  const ok = speakeasy.totp.verify({ secret, encoding: "base32", token, window: 1 });
  if (!ok) throw new Error("Invalid token");
  return { ok: true };
});

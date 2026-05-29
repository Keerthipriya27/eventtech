import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── TOTP helpers (no external library needed – pure Web Crypto) ──────────────

async function generateTOTPSecret(): Promise<string> {
  const array = new Uint8Array(20);
  crypto.getRandomValues(array);
  return base32Encode(array);
}

function base32Encode(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(input: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = input.toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of clean) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}

async function computeHOTP(secret: string, counter: number): Promise<string> {
  const key = base32Decode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const msg = new ArrayBuffer(8);
  const view = new DataView(msg);
  view.setUint32(0, Math.floor(counter / 2 ** 32), false);
  view.setUint32(4, counter >>> 0, false);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, msg);
  const hmac = new Uint8Array(sig);
  const offset = hmac[19] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

export async function verifyTOTP(secret: string, token: string): Promise<boolean> {
  const counter = Math.floor(Date.now() / 1000 / 30);
  // Allow ±1 window for clock skew
  for (const delta of [-1, 0, 1]) {
    const expected = await computeHOTP(secret, counter + delta);
    if (expected === token.replace(/\s/g, "")) return true;
  }
  return false;
}

export async function generateQRUri(
  secret: string,
  email: string,
  issuer = "EventTech"
): Promise<string> {
  const label = encodeURIComponent(`${issuer}:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

// ── React hook ───────────────────────────────────────────────────────────────

export interface TOTPState {
  step: "idle" | "setup" | "verify" | "enabled";
  secret: string | null;
  qrUri: string | null;
  error: string | null;
  loading: boolean;
}

export function useTOTP(userEmail: string) {
  const [state, setState] = useState<TOTPState>({
    step: "idle",
    secret: null,
    qrUri: null,
    error: null,
    loading: false,
  });

  const beginSetup = async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const secret = await generateTOTPSecret();
    const qrUri = await generateQRUri(secret, userEmail);
    setState({ step: "setup", secret, qrUri, error: null, loading: false });
  };

  const confirmSetup = async (token: string): Promise<boolean> => {
    if (!state.secret) return false;
    setState((s) => ({ ...s, loading: true, error: null }));
    const valid = await verifyTOTP(state.secret, token);
    if (!valid) {
      setState((s) => ({ ...s, loading: false, error: "Invalid code. Try again." }));
      return false;
    }
    // Persist secret in Supabase user metadata
    const { error } = await supabase.auth.updateUser({
      data: { totp_secret: state.secret, totp_enabled: true },
    });
    if (error) {
      setState((s) => ({ ...s, loading: false, error: error.message }));
      return false;
    }
    setState((s) => ({ ...s, step: "enabled", loading: false }));
    return true;
  };

  const verifyLogin = async (token: string, secret: string): Promise<boolean> => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const valid = await verifyTOTP(secret, token);
    if (!valid) {
      setState((s) => ({ ...s, loading: false, error: "Invalid code. Please try again." }));
    } else {
      setState((s) => ({ ...s, loading: false, error: null }));
    }
    return valid;
  };

  const disableTOTP = async () => {
    setState((s) => ({ ...s, loading: true }));
    await supabase.auth.updateUser({
      data: { totp_secret: null, totp_enabled: false },
    });
    setState({ step: "idle", secret: null, qrUri: null, error: null, loading: false });
  };

  return { state, beginSetup, confirmSetup, verifyLogin, disableTOTP };
}
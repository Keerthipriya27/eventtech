// ============================================================
// FILE: src/components/TOTPSetup.tsx
// CREATE this new file at: src/components/TOTPSetup.tsx
// ============================================================

import { useState, useEffect } from "react";
import QRCode from "qrcode";  // install: npm install qrcode @types/qrcode
import { ShieldCheck, ShieldOff, Copy, Check, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTOTP } from "@/hooks/useTOTP";
import { useSupabaseAuth } from "@/integrations/supabase/auth"; // adjust path if needed

export default function TOTPSetup() {
  const { session } = useSupabaseAuth();
  const email = session?.user?.email ?? "";
  const metaEnabled = session?.user?.user_metadata?.totp_enabled === true;

  const { state, beginSetup, confirmSetup, disableTOTP } = useTOTP(email);
  const [token, setToken] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state.qrUri) {
      QRCode.toDataURL(state.qrUri, { width: 200, margin: 2 }).then(setQrDataUrl);
    }
  }, [state.qrUri]);

  const copySecret = () => {
    if (state.secret) {
      navigator.clipboard.writeText(state.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (metaEnabled || state.step === "enabled") {
    return (
      <div className="rounded-2xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-5 flex items-start gap-4">
        <ShieldCheck className="w-6 h-6 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-green-800 dark:text-green-300">2FA is active</p>
          <p className="text-sm text-green-700 dark:text-green-400 mt-0.5">
            Your account is protected with an authenticator app.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 text-red-600 hover:text-red-700 hover:bg-red-50 gap-2"
            onClick={disableTOTP}
            disabled={state.loading}
          >
            <ShieldOff className="w-4 h-4" />
            Disable 2FA
          </Button>
        </div>
      </div>
    );
  }

  if (state.step === "idle") {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex items-start gap-4">
        <ShieldOff className="w-6 h-6 text-gray-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-gray-800 dark:text-gray-200">Two-factor authentication</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Add an extra layer of security using an authenticator app (Google Authenticator, Authy, etc.).
          </p>
          <Button
            size="sm"
            className="mt-3 bg-violet-600 hover:bg-violet-700 text-white gap-2"
            onClick={beginSetup}
            disabled={state.loading}
          >
            {state.loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Enable 2FA
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col gap-5">
      <div>
        <p className="font-semibold text-gray-800 dark:text-gray-200">Set up authenticator</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Scan the QR code with your authenticator app, then enter the 6-digit code to confirm.
        </p>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center gap-3">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="TOTP QR Code" className="w-44 h-44 rounded-xl border border-gray-200" />
        ) : (
          <div className="w-44 h-44 bg-gray-100 rounded-xl animate-pulse" />
        )}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-1.5 text-xs font-mono text-gray-600 dark:text-gray-300">
          <span className="select-all">{state.secret}</span>
          <button onClick={copySecret} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Token input */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Verification code
        </label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={token}
          onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="w-full h-11 px-4 text-xl tracking-widest font-mono text-center border-2 rounded-xl
                     border-gray-200 dark:border-gray-700
                     bg-white dark:bg-gray-900
                     text-gray-900 dark:text-white
                     focus:border-violet-500 focus:outline-none transition-colors"
        />
        {state.error && (
          <div className="flex items-center gap-1.5 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            {state.error}
          </div>
        )}
      </div>

      <Button
        onClick={async () => {
          await confirmSetup(token);
          setToken("");
        }}
        disabled={token.length < 6 || state.loading}
        className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium"
      >
        {state.loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
        Activate 2FA
      </Button>
    </div>
  );
}
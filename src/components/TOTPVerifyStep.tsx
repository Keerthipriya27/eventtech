// ============================================================
// FILE: src/components/TOTPVerifyStep.tsx
// CREATE this new file at: src/components/TOTPVerifyStep.tsx
// ============================================================

import { useState, useRef, useEffect } from "react";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TOTPVerifyStepProps {
  onVerify: (token: string) => Promise<boolean>;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}

export default function TOTPVerifyStep({
  onVerify,
  onCancel,
  loading = false,
  error = null,
}: TOTPVerifyStepProps) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const handleChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = digit;
    setDigits(next);
    if (digit && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
    if (e.key === "Enter") handleSubmit();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...digits];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    const focusIdx = Math.min(pasted.length, 5);
    inputs.current[focusIdx]?.focus();
  };

  const handleSubmit = () => {
    const token = digits.join("");
    if (token.length === 6) onVerify(token);
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto py-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
          <ShieldCheck className="w-7 h-7 text-violet-600 dark:text-violet-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Two-factor authentication
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Enter the 6-digit code from your authenticator app
        </p>
      </div>

      <div className="flex gap-2" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-11 h-14 text-center text-2xl font-bold border-2 rounded-xl
                       border-gray-200 dark:border-gray-700
                       bg-white dark:bg-gray-900
                       text-gray-900 dark:text-white
                       focus:border-violet-500 focus:outline-none
                       transition-colors"
          />
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg w-full">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2 w-full">
        <Button
          onClick={handleSubmit}
          disabled={digits.join("").length < 6 || loading}
          className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          Verify
        </Button>
        <Button
          variant="ghost"
          onClick={onCancel}
          className="w-full text-gray-500 hover:text-gray-700"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
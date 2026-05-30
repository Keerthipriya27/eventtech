import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import TOTPSetup from "@/components/TOTPSetup";
import TOTPVerifyStep from "@/components/TOTPVerifyStep";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { verify2fa } from "@/integrations/supabase/twofactor.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/setup-2fa")({ component: Setup2FAPage });

export default function Setup2FAPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verify2faFn = useServerFn(verify2fa);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (!u) return navigate({ to: "/auth", replace: true });
      setUser(u);
      const key = `eventtech_2fa_verified_${u.id}`;
      if (u.user_metadata?.totp_enabled) {
        // If server says TOTP is enabled, mark local verification and redirect.
        // This handles cases where metadata is set but the localStorage flag is missing.
        localStorage.setItem(key, "true");
        navigate({ to: "/dashboard", replace: true });
        return;
      }
    });
  }, [navigate]);

  const onVerified = (userId: string) => {
    localStorage.setItem(`eventtech_2fa_verified_${userId}`, "true");
    toast.success("2FA verified — welcome!");
    navigate({ to: "/dashboard", replace: true });
  };

  const handleVerify = async (token: string) => {
    if (!user) return false;
    setVerifying(true);
    setError(null);
    try {
      await verify2faFn({ data: { userId: user.id, token } });
      onVerified(user.id);
      return true;
    } catch (e: any) {
      setError(e?.message || "Invalid code");
      return false;
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen setup-2fa-bg et-frame flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-6 bg-card border-border">
        <h2 className="text-lg font-semibold mb-4">
          Secure your account — Two-Factor Authentication
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          We require all users to enable 2FA. Follow the steps below.
        </p>

        {needsVerify ? (
          <>
            <TOTPVerifyStep
              onVerify={async (t) => handleVerify(t)}
              onCancel={() => {
                supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
              loading={verifying}
              error={error}
            />
          </>
        ) : (
          <>
            <TOTPSetup />
            <div className="mt-4 text-sm text-muted-foreground">
              After activation you'll be redirected to the dashboard.
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate({ to: "/auth" });
                }}
              >
                Sign out
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

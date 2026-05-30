import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { serverSignUp } from "@/integrations/supabase/auth.functions";
import { generate2fa, verify2fa } from "@/integrations/supabase/twofactor.functions";
// Password reset flow removed per request

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const navigate = useNavigate();
  const serverSignUpFn = useServerFn(serverSignUp);
  // password reset UI removed
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"organizer" | "volunteer" | "sponsor" | "participant">(
    "participant",
  );
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [pwScore, setPwScore] = useState(0);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFaCode, setTwoFaCode] = useState("");
  const [pending2FaUserId, setPending2FaUserId] = useState<string | null>(null);
  const verify2faFn = useServerFn(verify2fa);

  const twoFaStorageKey = (userId: string) => `eventtech_2fa_verified_${userId}`;
  const is2faSatisfied = (user: any) => {
    if (!user?.user_metadata?.totp_enabled) return true;
    return localStorage.getItem(twoFaStorageKey(user.id)) === "true";
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (!user) return;
      if (is2faSatisfied(user)) {
        navigate({ to: "/dashboard", replace: true });
      } else {
        // Enforce mandatory TOTP setup/verification
        navigate({ to: "/setup-2fa", replace: true });
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (!user) return;
      if (is2faSatisfied(user)) {
        navigate({ to: "/dashboard", replace: true });
      } else {
        // Enforce mandatory TOTP setup/verification
        navigate({ to: "/setup-2fa", replace: true });
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const signUp = async () => {
    setLoading(true);
    setAuthError("");
    try {
      // client-side validation
      const emailOk = email.trim().toLowerCase().endsWith("@gmail.com");
      if (!emailOk) throw new Error("Email must be a @gmail.com address");
      const pwOk = validatePassword(password);
      if (!pwOk.ok) throw new Error(pwOk.message);

      let createdViaServer = false;
      try {
        await serverSignUpFn({ data: { email, password, fullName, role } });
        createdViaServer = true;
      } catch (serverErr: any) {
        const serverMsg = formatError(serverErr).toLowerCase();
        console.warn("Server signup failed", serverErr);

        // If account already exists or server path is unavailable, try signing in directly.
        const { error: existingLoginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (!existingLoginError) {
          toast.success("Account already exists. Signed you in.");
          return;
        }

        // Avoid client signUp fallback here to prevent triggering email signup rate limits.
        if (
          serverMsg.includes("missing supabase environment") ||
          serverMsg.includes("service role") ||
          serverMsg.includes("rate limit")
        ) {
          throw new Error(
            "Signup is temporarily unavailable. Please use Sign in if this account already exists, or try again in a minute.",
          );
        }

        throw serverErr;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message?.toLowerCase().includes("email not confirmed")) {
          toast.success(
            createdViaServer
              ? "Account created. Please sign in now."
              : "Account created. Please confirm your email, then sign in.",
          );
          return;
        }
        throw error;
      }
      // After successful sign in, enforce TOTP setup/verification
      toast.success("Account created!");
      navigate({ to: "/setup-2fa" });
    } catch (e: any) {
      const msg = formatError(e);
      if (msg.toLowerCase().includes("rate limit")) {
        // If user already exists, this succeeds and clears the blocker for the user.
        const { error: existingLoginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (!existingLoginError) {
          toast.success("Account already exists. Signed you in.");
          return;
        }
        setAuthError(
          "Too many signup attempts right now. Wait a minute, then try again, or use Sign in if the account already exists.",
        );
        toast.error("Too many signup attempts. Wait a minute, or use Sign in.");
        return;
      }
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    setLoading(true);
    setAuthError("");
    try {
      if (!email.trim().toLowerCase().endsWith("@gmail.com"))
        throw new Error("Email must be a @gmail.com address");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Enforce mandatory TOTP: redirect to setup/verify flow
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      navigate({ to: "/setup-2fa" });
    } catch (e: any) {
      const msg = formatError(e);
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const submit2fa = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No active session");
      await verify2faFn({ data: { userId: user.id, token: twoFaCode } });
      localStorage.setItem(twoFaStorageKey(user.id), "true");
      setShow2FAModal(false);
      setPending2FaUserId(null);
      setTwoFaCode("");
      toast.success("2FA verified — welcome!");
      // navigate to dashboard
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e.message || "Invalid 2FA code");
      await supabase.auth.signOut();
      setShow2FAModal(false);
    }
  };

  function validatePassword(pw: string) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/;
    if (!pw) return { ok: false, message: "Password is required" };
    if (pw.length < 10) return { ok: false, message: "Password must be at least 10 characters" };
    if (!regex.test(pw))
      return {
        ok: false,
        message: "Password must include upper, lower, number, and special character",
      };
    return { ok: true };
  }

  function onPasswordChange(v: string) {
    setPassword(v);
    // simple scoring
    let score = 0;
    if (v.length >= 10) score += 2;
    if (/[A-Z]/.test(v)) score += 1;
    if (/[a-z]/.test(v)) score += 1;
    if (/\d/.test(v)) score += 1;
    if (/[^A-Za-z0-9]/.test(v)) score += 1;
    setPwScore(score);
  }

  function formatError(e: any) {
    try {
      // Supabase/TanStack server errors sometimes serialize Zod issues as JSON
      if (e?.message) {
        // If message is JSON array
        const parsed = JSON.parse(e.message);
        if (Array.isArray(parsed))
          return parsed.map((p: any) => p.message || JSON.stringify(p)).join("; ");
      }
    } catch (_) {
      /* ignore parse errors */
    }

    // Supabase error object shape
    if (e?.error_description) return e.error_description;

    // If the message looks like an HTML error page, avoid showing raw HTML in the UI.
    const msg = e?.message || String(e);
    if (typeof msg === "string") {
      const lower = msg.toLowerCase();
      if (
        lower.includes("<!doctype") ||
        lower.includes("<html") ||
        lower.includes("<body") ||
        lower.includes("<title>")
      ) {
        console.error("Received HTML error from server:", msg);
        return "Something went wrong on our server — try again or contact support.";
      }
      // Truncate very long messages for UX
      if (msg.length > 1000) return msg.slice(0, 1000) + "...";
      return msg;
    }
    return String(msg);
  }

  const openResetModal = () => {
    // intentionally left blank - reset removed
  };

  // password reset handlers removed

  return (
    <div className="min-h-screen bg-event-vibrant bg-mesh auth-bg et-frame flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8 bg-card border-border">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <div className="w-9 h-9 rounded-lg bg-primary glow-mint flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-xl">EventTech</span>
        </div>

        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <TabsList className="grid grid-cols-2 w-full mb-6">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {authError && <p className="text-sm text-red-400">{authError}</p>}
            <div className="flex flex-col gap-2">
              <Button onClick={signIn} disabled={loading} className="w-full glow-mint">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in"}
              </Button>
              <Button variant="ghost" onClick={() => setActiveTab("signup")} className="w-full">
                Don't have an account? Sign up
              </Button>
              {/* Forgot password removed */}
            </div>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <div>
              <Label>Full name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              <div>Password strength: {pwScore}/6</div>
              <ul className="list-disc ml-4">
                <li>{password.length >= 10 ? "✓" : "✗"} At least 10 characters</li>
                <li>{/[A-Z]/.test(password) ? "✓" : "✗"} One uppercase letter</li>
                <li>{/[a-z]/.test(password) ? "✓" : "✗"} One lowercase letter</li>
                <li>{/\d/.test(password) ? "✓" : "✗"} One number</li>
                <li>{/[^A-Za-z0-9]/.test(password) ? "✓" : "✗"} One special character</li>
              </ul>
            </div>
            {authError && <p className="text-sm text-red-400">{authError}</p>}
            <div>
              <Label>I am a...</Label>
              <Select value={role} onValueChange={(v: any) => setRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="participant">Participant</SelectItem>
                  <SelectItem value="organizer">Event Organizer</SelectItem>
                  <SelectItem value="volunteer">Volunteer</SelectItem>
                  <SelectItem value="sponsor">Sponsor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={signUp} disabled={loading} className="w-full glow-mint">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create account"}
              </Button>
              <Button variant="ghost" onClick={() => setActiveTab("signin")} className="w-full">
                Already have an account? Sign in
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
      {/* Reset modal removed */}
      <Dialog open={show2FAModal} onOpenChange={setShow2FAModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Two-Factor Authentication</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">
              Enter the code from your authenticator app to finish signing in.
            </p>
            <Input
              value={twoFaCode}
              onChange={(e) => setTwoFaCode(e.target.value)}
              placeholder="123456"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={async () => {
                  if (pending2FaUserId) localStorage.removeItem(twoFaStorageKey(pending2FaUserId));
                  await supabase.auth.signOut();
                  setShow2FAModal(false);
                  setPending2FaUserId(null);
                  setTwoFaCode("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={submit2fa} disabled={twoFaCode.length < 6}>
                Verify
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

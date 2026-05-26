import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { serverSignUp } from "@/integrations/supabase/auth.functions";
import { generate2fa, verify2fa } from "@/integrations/supabase/twofactor.functions";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const navigate = useNavigate();
  const serverSignUpFn = useServerFn(serverSignUp);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"organizer" | "volunteer" | "sponsor" | "participant">("participant");
  const [authError, setAuthError] = useState("");
  const [pwScore, setPwScore] = useState(0);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFaCode, setTwoFaCode] = useState("");
  const verify2faFn = useServerFn(verify2fa);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });

    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const signUp = async () => {
    setLoading(true);
    setAuthError("");
    try {
      // client-side validation
      const emailOk = email.trim().toLowerCase().endsWith('@gmail.com');
      if (!emailOk) throw new Error('Email must be a @gmail.com address');
      const pwOk = validatePassword(password);
      if (!pwOk.ok) throw new Error(pwOk.message);

      await serverSignUpFn({ data: { email, password, fullName, role } });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Account created!");
    } catch (e: any) {
      const msg = formatError(e);
      setAuthError(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const signIn = async () => {
    setLoading(true);
    setAuthError("");
    try {
      if (!email.trim().toLowerCase().endsWith('@gmail.com')) throw new Error('Email must be a @gmail.com address');
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // if user has 2FA enabled, prompt for code
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.totp_enabled) {
        setShow2FAModal(true);
        // keep user signed in temporarily; verification required to proceed
      } else {
        toast.success("Welcome back!");
      }
    } catch (e: any) {
      const msg = formatError(e);
      setAuthError(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const submit2fa = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No active session');
      await verify2faFn({ data: { userId: user.id, token: twoFaCode } });
      setShow2FAModal(false);
      toast.success('2FA verified — welcome!');
      // navigate to dashboard
      navigate({ to: '/dashboard' });
    } catch (e: any) {
      toast.error(e.message || 'Invalid 2FA code');
      await supabase.auth.signOut();
      setShow2FAModal(false);
    }
  }

  function validatePassword(pw: string) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/;
    if (!pw) return { ok: false, message: 'Password is required' };
    if (pw.length < 10) return { ok: false, message: 'Password must be at least 10 characters' };
    if (!regex.test(pw)) return { ok: false, message: 'Password must include upper, lower, number, and special character' };
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
        if (Array.isArray(parsed)) return parsed.map((p: any) => p.message || JSON.stringify(p)).join("; ");
      }
    } catch (_) { /* ignore parse errors */ }

    // Supabase error object shape
    if (e?.error_description) return e.error_description;

    // If the message looks like an HTML error page, avoid showing raw HTML in the UI.
    const msg = e?.message || String(e);
    if (typeof msg === 'string') {
      const lower = msg.toLowerCase();
      if (lower.includes('<!doctype') || lower.includes('<html') || lower.includes('<body') || lower.includes('<title>')) {
        console.error('Received HTML error from server:', msg);
        return 'Something went wrong on our server — try again or contact support.';
      }
      // Truncate very long messages for UX
      if (msg.length > 1000) return msg.slice(0, 1000) + '...';
      return msg;
    }
    return String(msg);
  }

  return (
    <div className="min-h-screen bg-background bg-mesh flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8 bg-card border-border">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <div className="w-9 h-9 rounded-lg bg-primary glow-mint flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-xl">EventTech</span>
        </div>

        <Tabs defaultValue="signin">
          <TabsList className="grid grid-cols-2 w-full mb-6">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4">
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
            <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            {authError && <p className="text-sm text-red-400">{authError}</p>}
            <Button onClick={signIn} disabled={loading} className="w-full glow-mint">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in"}</Button>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <div><Label>Full name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" /></div>
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
            <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => onPasswordChange(e.target.value)} /></div>
            <div className="text-xs text-muted-foreground">
              <div>Password strength: {pwScore}/6</div>
              <ul className="list-disc ml-4">
                <li>{password.length >= 10 ? '✓' : '✗'} At least 10 characters</li>
                <li>{/[A-Z]/.test(password) ? '✓' : '✗'} One uppercase letter</li>
                <li>{/[a-z]/.test(password) ? '✓' : '✗'} One lowercase letter</li>
                <li>{/\d/.test(password) ? '✓' : '✗'} One number</li>
                <li>{/[^A-Za-z0-9]/.test(password) ? '✓' : '✗'} One special character</li>
              </ul>
            </div>
            {authError && <p className="text-sm text-red-400">{authError}</p>}
            <div>
              <Label>I am a...</Label>
              <Select value={role} onValueChange={(v: any) => setRole(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="participant">Participant</SelectItem>
                  <SelectItem value="organizer">Event Organizer</SelectItem>
                  <SelectItem value="volunteer">Volunteer</SelectItem>
                  <SelectItem value="sponsor">Sponsor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={signUp} disabled={loading} className="w-full glow-mint">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create account"}</Button>
          </TabsContent>
        </Tabs>
      </Card>
      <Dialog open={show2FAModal} onOpenChange={setShow2FAModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Two-Factor Authentication</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">Enter the code from your authenticator app to finish signing in.</p>
            <Input value={twoFaCode} onChange={(e) => setTwoFaCode(e.target.value)} placeholder="123456" />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); setShow2FAModal(false); }}>Cancel</Button>
              <Button onClick={submit2fa}>Verify</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

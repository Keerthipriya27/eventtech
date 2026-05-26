import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { serverSignUp } from "@/integrations/supabase/auth.functions";

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
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back!");
    } catch (e: any) {
      const msg = formatError(e);
      setAuthError(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

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
    if (e?.message) return String(e.message);
    return String(e);
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
            <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
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
    </div>
  );
}

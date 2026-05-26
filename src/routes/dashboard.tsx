import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CopilotWidget } from "@/components/CopilotWidget";
import { toast } from "sonner";
import { Sparkles, LogOut, Calendar, Trophy, Target, Users, Plus, Wand2, Loader2, Award, TrendingUp, Zap, BarChart3, QrCode } from "lucide-react";
import { useServerFn } from '@tanstack/react-start'
import { generate2fa, confirm2fa } from '@/integrations/supabase/twofactor.functions'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [regs, setRegs] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/auth" });
    });
    void load();
    return () => sub.subscription.unsubscribe();
  }, []);

  async function load() {
    setLoading(true);
      try {
        const { data: { user: u } } = await supabase.auth.getUser();
        if (!u) {
          navigate({ to: "/auth" });
          return;
        }

        setUser(u);
        const [{ data: prof }, { data: ev }, { data: me }, { data: rg }, { data: tk }, { data: lb }] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", u.id).maybeSingle(),
          supabase.from("events").select("*").order("created_at", { ascending: false }).limit(20),
          supabase.from("events").select("*").eq("organizer_id", u.id).order("created_at", { ascending: false }),
          supabase.from("registrations").select("*, events(*)").eq("user_id", u.id),
          supabase.from("volunteer_tasks").select("*, events(title)").or(`assigned_to.eq.${u.id},assigned_to.is.null`).limit(20),
          supabase.from("profiles").select("full_name, xp, level, badges").order("xp", { ascending: false }).limit(10),
        ]);

        setProfile(prof);
        setRoles([u.user_metadata?.role].filter(Boolean));
        setEvents(ev || []);
        setMyEvents(me || []);
        setRegs(rg || []);
        setTasks(tk || []);
        setLeaderboard(lb || []);
      } catch (error: any) {
        toast.error(error?.message || "Failed to load dashboard");
        console.error(error);
      } finally {
        setLoading(false);
      }
  }

  const logout = async () => { await supabase.auth.signOut(); navigate({ to: "/" }); };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const isOrganizer = roles.includes("organizer");
  const isSponsor = roles.includes("sponsor");
  const isVolunteer = roles.includes("volunteer");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-bold">
            <div className="w-8 h-8 rounded-lg bg-primary glow-mint flex items-center justify-center"><Sparkles className="w-4 h-4 text-primary-foreground" /></div>
            EventTech
          </Link>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-primary/30 text-primary">Lvl {profile?.level ?? 1} · {profile?.xp ?? 0} XP</Badge>
            <span className="text-sm text-muted-foreground hidden sm:inline">{profile?.full_name || user?.email}</span>
            <Button size="icon" variant="ghost" onClick={logout}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Welcome back, {profile?.full_name?.split(" ")[0] || "there"} 👋</h1>
          <p className="text-muted-foreground">Your event command center.</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Calendar} label="Active events" value={events.length} />
          <StatCard icon={Trophy} label="Your XP" value={profile?.xp ?? 0} />
          <StatCard icon={Target} label="Registrations" value={regs.length} />
          <StatCard icon={Award} label="Badges" value={profile?.badges?.length ?? 0} />
        </div>

        <Tabs defaultValue="discover">
          <TabsList className="mb-6 flex-wrap h-auto">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            {isOrganizer && <TabsTrigger value="organize">Organize</TabsTrigger>}
            {isVolunteer && <TabsTrigger value="volunteer">Volunteer</TabsTrigger>}
            {isSponsor && <TabsTrigger value="sponsor">Sponsor Lab</TabsTrigger>}
            <TabsTrigger value="passport">Skill Passport</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="discover"><DiscoverTab events={events} regs={regs} userId={user.id} onRefresh={load} /></TabsContent>
          {isOrganizer && <TabsContent value="organize"><OrganizeTab myEvents={myEvents} userId={user.id} onRefresh={load} /></TabsContent>}
          {isVolunteer && <TabsContent value="volunteer"><VolunteerTab tasks={tasks} userId={user.id} onRefresh={load} /></TabsContent>}
          {isSponsor && <TabsContent value="sponsor"><SponsorTab events={events} profile={profile} /></TabsContent>}
          <TabsContent value="passport"><PassportTab profile={profile} regs={regs} onSaved={load} /></TabsContent>
          <TabsContent value="leaderboard"><LeaderboardTab lb={leaderboard} /></TabsContent>
        </Tabs>
      </div>

      <CopilotWidget />
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: any) {
  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </Card>
  );
}

function DiscoverTab({ events, regs, userId, onRefresh }: any) {
  const registered = new Set(regs.map((r: any) => r.event_id));
  const register = async (eventId: string) => {
    const { error } = await supabase.from("registrations").insert({ event_id: eventId, user_id: userId });
    if (error) toast.error(error.message); else { toast.success("Registered! QR ticket issued."); onRefresh(); }
  };
  if (!events.length) return <EmptyState label="No events yet. Be the first to create one!" />;
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {events.map((e: any) => (
        <Card key={e.id} className="p-5 bg-card border-border hover:border-primary/50 transition">
          <div className="flex items-start justify-between mb-2">
            <Badge variant="outline" className="text-xs">{e.category || "General"}</Badge>
            {e.intelligence_score > 0 && (
              <div className="flex items-center gap-1 text-xs text-primary"><Zap className="w-3 h-3" /> {e.intelligence_score}</div>
            )}
          </div>
          <h3 className="font-semibold text-lg mb-1">{e.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{e.description}</p>
          <div className="text-xs text-muted-foreground mb-4 space-y-1">
            {e.start_date && <div>📅 {new Date(e.start_date).toLocaleDateString()}</div>}
            {e.location && <div>📍 {e.location}</div>}
          </div>
          {registered.has(e.id) ? (
            <Button variant="outline" size="sm" className="w-full" disabled><QrCode className="w-3 h-3" /> Registered</Button>
          ) : (
            <Button size="sm" className="w-full" onClick={() => register(e.id)}>Register</Button>
          )}
        </Card>
      ))}
    </div>
  );
}

function OrganizeTab({ myEvents, userId, onRefresh }: any) {
  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "Tech", location: "", start_date: "", capacity: 100, budget: 5000 });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  const create = async () => {
    const payload = {
      ...form,
      // convert empty date string to null and normalize to ISO if present
      start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
      organizer_id: userId,
      status: "published",
      intelligence_score: aiResult?.intelligence_score || Math.floor(Math.random() * 30) + 60,
      ai_metadata: aiResult || {},
    };

    const { error } = await supabase.from("events").insert(payload);
    if (error) toast.error(error.message); else { toast.success("Event launched!"); setOpen(false); setAiResult(null); onRefresh(); }
  };

  const runAI = async () => {
    if (!form.title) { toast.error("Add a title first"); return; }
    setAiLoading(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-event-builder`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ title: form.title, category: form.category, audience: "general", budget: form.budget }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setAiResult(data);
      if (data.description) setForm(f => ({ ...f, description: data.description }));
      toast.success("AI plan generated!");
      setAiOpen(true);
    } catch (e: any) { toast.error(e.message); } finally { setAiLoading(false); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Your events</h2>
          <p className="text-sm text-muted-foreground">{myEvents.length} active</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="glow-mint"><Plus className="w-4 h-4" /> New event</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create event</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Tech","Music","Sports","Business","Arts","Education"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={runAI} disabled={aiLoading} className="w-full">
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wand2 className="w-4 h-4" /> Generate with AI</>}
              </Button>
              <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date</Label><Input type="datetime-local" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><Label>Location</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: +e.target.value })} /></div>
                <div><Label>Budget $</Label><Input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: +e.target.value })} /></div>
              </div>
              {aiResult && (
                <Card className="p-3 bg-primary/5 border-primary/30">
                  <div className="flex items-center gap-2 mb-2 text-xs text-primary"><Zap className="w-3 h-3" /> Intelligence Score: {aiResult.intelligence_score}/100</div>
                  {aiResult.tagline && <p className="text-sm italic mb-2">"{aiResult.tagline}"</p>}
                  {aiResult.risks?.length > 0 && <div className="text-xs"><strong>Risks:</strong> {aiResult.risks.join(", ")}</div>}
                </Card>
              )}
              <Button onClick={create} className="w-full glow-mint">Launch event</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!myEvents.length ? <EmptyState label="No events yet. Create your first one!" /> : (
        <div className="grid md:grid-cols-2 gap-4">
          {myEvents.map((e: any) => (
            <Card key={e.id} className="p-5 bg-card border-border">
              <div className="flex justify-between mb-2">
                <Badge variant="outline">{e.category}</Badge>
                <div className="flex items-center gap-1 text-xs text-primary"><Zap className="w-3 h-3" /> Score {e.intelligence_score}</div>
              </div>
              <h3 className="font-semibold mb-1">{e.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{e.description}</p>
              <Progress value={(e.intelligence_score / 100) * 100} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-2">Event health · {e.intelligence_score}%</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function VolunteerTab({ tasks, userId, onRefresh }: any) {
  const claim = async (id: string) => {
    const { error } = await supabase.from("volunteer_tasks").update({ assigned_to: userId, status: "in_progress" }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Task claimed! +XP on completion."); onRefresh(); }
  };
  const complete = async (id: string, xp: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase.from("profiles").select("xp, level, badges").eq("id", user.id).single();
    const newXp = (prof?.xp || 0) + xp;
    const newLevel = Math.floor(newXp / 200) + 1;
    const newBadges = [...(prof?.badges || [])];
    if (newLevel > (prof?.level || 1) && !newBadges.includes(`Level ${newLevel}`)) newBadges.push(`Level ${newLevel}`);
    await supabase.from("volunteer_tasks").update({ status: "done" }).eq("id", id);
    await supabase.from("profiles").update({ xp: newXp, level: newLevel, badges: newBadges }).eq("id", user.id);
    toast.success(`+${xp} XP! Level ${newLevel}`);
    onRefresh();
  };

  const cols = { open: tasks.filter((t: any) => t.status === "open"), in_progress: tasks.filter((t: any) => t.status === "in_progress"), done: tasks.filter((t: any) => t.status === "done") };
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {(["open","in_progress","done"] as const).map((col) => (
        <div key={col}>
          <h3 className="font-semibold mb-3 capitalize flex items-center gap-2">{col.replace("_"," ")} <Badge variant="secondary">{cols[col].length}</Badge></h3>
          <div className="space-y-2">
            {cols[col].map((t: any) => (
              <Card key={t.id} className="p-3 bg-card border-border">
                <p className="text-sm font-medium mb-1">{t.title}</p>
                <p className="text-xs text-muted-foreground mb-2">{t.events?.title}</p>
                <div className="flex flex-wrap gap-1 mb-2">{t.required_skills?.map((s: string) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-primary">+{t.xp_reward} XP</span>
                  {col === "open" && <Button size="sm" variant="outline" onClick={() => claim(t.id)}>Claim</Button>}
                  {col === "in_progress" && t.assigned_to === userId && <Button size="sm" onClick={() => complete(t.id, t.xp_reward)}>Complete</Button>}
                </div>
              </Card>
            ))}
            {!cols[col].length && <p className="text-xs text-muted-foreground">Nothing here yet.</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function SponsorTab({ events, profile }: any) {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const runMatch = async () => {
    setLoading(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sponsor-match`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({
          sponsor_industry: profile?.industry || "Technology",
          sponsor_budget: 10000,
          events: events.slice(0, 6).map((e: any) => ({ id: e.id, title: e.title, category: e.category, description: e.description })),
        }),
      });
      const data = await resp.json();
      setMatches(data.matches || []);
      toast.success("AI matches ready!");
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };
  return (
    <div>
      <Card className="p-6 bg-card border-border mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold mb-1 flex items-center gap-2"><Target className="w-5 h-5 text-primary" /> Sponsor Intelligence</h2>
            <p className="text-sm text-muted-foreground">AI matches your brand with high-ROI events.</p>
          </div>
          <Button onClick={runMatch} disabled={loading} className="glow-mint">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wand2 className="w-4 h-4" /> Run AI Match</>}</Button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-muted"><div className="text-xs text-muted-foreground">Industry</div><div className="font-semibold">{profile?.industry || "Set in Passport"}</div></div>
          <div className="p-3 rounded-lg bg-muted"><div className="text-xs text-muted-foreground">Budget</div><div className="font-semibold">$10,000</div></div>
          <div className="p-3 rounded-lg bg-muted"><div className="text-xs text-muted-foreground">Matches</div><div className="font-semibold">{matches.length}</div></div>
        </div>
      </Card>

      {matches.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {matches.map((m: any) => {
            const ev = events.find((e: any) => e.id === m.event_id);
            if (!ev) return null;
            return (
              <Card key={m.event_id} className="p-5 bg-card border-border">
                <div className="flex justify-between mb-3">
                  <h3 className="font-semibold">{ev.title}</h3>
                  <Badge className="bg-primary/20 text-primary border-primary/40">{m.match_score}% match</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                  <div className="p-2 rounded bg-muted"><div className="text-muted-foreground">ROI score</div><div className="font-semibold text-primary flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {m.roi_score}/100</div></div>
                  <div className="p-2 rounded bg-muted"><div className="text-muted-foreground">Impressions</div><div className="font-semibold flex items-center gap-1"><BarChart3 className="w-3 h-3" /> {m.predicted_impressions?.toLocaleString()}</div></div>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{m.reasoning}</p>
                <Badge variant="outline" className="text-xs">{m.recommended_package}</Badge>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PassportTab({ profile, regs, onSaved }: any) {
  const [form, setForm] = useState({ bio: profile?.bio || "", skills: profile?.skills?.join(", ") || "", company: profile?.company || "", industry: profile?.industry || "" });
  const generate2faFn = useServerFn(generate2fa)
  const confirm2faFn = useServerFn(confirm2fa)
  const [show2faSetup, setShow2faSetup] = useState(false)
  const [qrData, setQrData] = useState<string | null>(null)
  const [pendingSecret, setPendingSecret] = useState<string | null>(null)
  const [twoFaInput, setTwoFaInput] = useState("")

  const start2fa = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error('Sign in first');
    const res = await generate2faFn({ data: { userId: user.id, label: user.email } });
    setQrData(res.qr);
    setPendingSecret(res.base32);
    setShow2faSetup(true);
  }

  const confirm2fa = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !pendingSecret) return toast.error('Missing session');
      await confirm2faFn({ data: { userId: user.id, secret: pendingSecret, token: twoFaInput } });
      toast.success('2FA enabled');
      setShow2faSetup(false);
      setQrData(null);
      setPendingSecret(null);
      setTwoFaInput('')
      onSaved();
    } catch (e: any) { toast.error(e.message || 'Invalid code'); }
  }

  const save = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").update({
      bio: form.bio, company: form.company, industry: form.industry,
      skills: form.skills.split(",").map((s: string) => s.trim()).filter(Boolean),
    }).eq("id", user.id);
    if (error) toast.error(error.message); else { toast.success("Passport updated"); onSaved(); }
  };
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-6 bg-card border-border">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-primary" /> Skill Passport</h3>
        <div className="space-y-3">
          <div><Label>Bio</Label><Textarea rows={3} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} /></div>
          <div><Label>Skills (comma-separated)</Label><Input value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} placeholder="React, Marketing, Public Speaking" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Company</Label><Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></div>
            <div><Label>Industry</Label><Input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} /></div>
          </div>
          <Button onClick={save} className="w-full">Save Passport</Button>
          <div className="mt-3">
            <Button variant="ghost" onClick={start2fa} className="w-full">Enable Two-Factor Authentication (TOTP)</Button>
          </div>
        </div>
      </Card>
      <Card className="p-6 bg-card border-border">
        <h3 className="font-semibold mb-4">Achievements</h3>
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1"><span>Level {profile?.level ?? 1}</span><span className="text-muted-foreground">{profile?.xp ?? 0} / {((profile?.level ?? 1) * 200)} XP</span></div>
          <Progress value={((profile?.xp ?? 0) % 200) / 2} />
        </div>
        <h4 className="text-xs uppercase text-muted-foreground mb-2">Badges</h4>
        <div className="flex flex-wrap gap-2 mb-4">
          {(profile?.badges || []).length === 0 ? <p className="text-xs text-muted-foreground">Complete tasks to earn badges.</p> :
            profile.badges.map((b: string) => <Badge key={b} className="bg-primary/20 text-primary border-primary/40">{b}</Badge>)}
        </div>
        <h4 className="text-xs uppercase text-muted-foreground mb-2">Certificates ({regs.length})</h4>
        <div className="space-y-1">
          {regs.slice(0, 5).map((r: any) => <div key={r.id} className="text-xs text-muted-foreground">📜 {r.events?.title}</div>)}
        </div>
      </Card>
      <Dialog open={show2faSetup} onOpenChange={setShow2faSetup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {qrData ? <img src={qrData} alt="QR code" className="mx-auto" /> : <p>Generating QR...</p>}
            <p className="text-sm">Scan the QR code with your authenticator app, then enter the 6-digit code below to confirm.</p>
            <Input value={twoFaInput} onChange={(e) => setTwoFaInput(e.target.value)} placeholder="123456" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShow2faSetup(false); setQrData(null); setPendingSecret(null); }}>Cancel</Button>
              <Button onClick={confirm2fa}>Confirm</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LeaderboardTab({ lb }: any) {
  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="font-semibold mb-4 flex items-center gap-2"><Trophy className="w-4 h-4 text-primary" /> Top Volunteers</h3>
      <div className="space-y-2">
        {lb.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted">
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-500/20 text-yellow-500" : i === 1 ? "bg-gray-400/20 text-gray-300" : i === 2 ? "bg-amber-700/20 text-amber-500" : "bg-card text-muted-foreground"}`}>{i + 1}</div>
              <span className="font-medium text-sm">{p.full_name || "Anonymous"}</span>
            </div>
            <div className="flex items-center gap-3 text-xs"><Badge variant="outline">Lvl {p.level}</Badge><span className="text-primary font-semibold">{p.xp} XP</span></div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function EmptyState({ label }: { label: string }) {
  return <Card className="p-12 text-center bg-card border-border border-dashed"><p className="text-muted-foreground">{label}</p></Card>;
}

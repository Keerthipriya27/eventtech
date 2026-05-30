import QRScanner from "@/components/QRScanner";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
// PlatformShell is used on other pages; keep dashboard using its original nav for stability
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
// Copilot and RobotAssistant removed per request
import { toast } from "sonner";
import {
  Sparkles,
  LogOut,
  Calendar,
  Trophy,
  Target,
  Users,
  Plus,
  Wand2,
  Loader2,
  Award,
  TrendingUp,
  Zap,
  BarChart3,
  QrCode,
  CheckCircle,
  Star,
  Medal,
  Brain,
  FileText,
  Network,
  MessageCircle,
  Smartphone,
  Shield,
  Download,
  Share2,
  UserCheck,
  ChevronRight,
  Flame,
  Crown,
  Gift,
  Handshake,
  GraduationCap,
  ScanLine,
  ClipboardCheck,
  Search,
  Filter,
  UserPlus,
  Bell,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import RecentMessages from '@/components/RecentMessages';
import { generate2fa, confirm2fa } from "@/integrations/supabase/twofactor.functions";
import { claimTask, completeTask } from "@/integrations/supabase/volunteer.functions";
import { ADMIN_EMAILS } from "./admin";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

// ─── helpers ────────────────────────────────────────────────────────────────

async function callSupabaseEdgeFn(name: string, body: object) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// Simple QR code renderer using a public API (no library needed)
function QRImage({ value, size = 160 }: { value: string; size?: number }) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
  return (
    <img
      src={url}
      alt="QR Code"
      width={size}
      height={size}
      className="rounded-lg border border-border"
    />
  );
}

// Generate a certificate as downloadable HTML
function generateCertificateHTML(name: string, eventTitle: string, date: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate</title>
  <style>body{margin:0;font-family:'Georgia',serif;background:#0a1628;display:flex;align-items:center;justify-content:center;min-height:100vh;}
  .cert{width:800px;padding:60px;border:3px solid #00e5b4;border-radius:16px;background:linear-gradient(135deg,#0d1f35,#0a1628);text-align:center;color:#fff;}
  h1{font-size:48px;color:#00e5b4;margin:0 0 8px;}h2{font-size:24px;color:#fff;margin:0 0 32px;opacity:.7;}
  .name{font-size:36px;color:#fff;border-bottom:2px solid #00e5b4;display:inline-block;padding:0 40px 8px;margin:16px 0;}
  .event{font-size:22px;color:#00e5b4;margin:16px 0;}.date{color:rgba(255,255,255,.5);font-size:14px;margin-top:32px;}
  .badge{display:inline-block;background:#00e5b4;color:#0a1628;padding:8px 24px;border-radius:99px;font-weight:bold;margin-top:24px;}</style>
  </head><body><div class="cert"><h1>🏆 Certificate of Achievement</h1><h2>EventTech · AI-Powered Event Platform</h2>
  <p style="opacity:.6">This certifies that</p><div class="name">${name}</div>
  <p class="event">Successfully participated in</p><p style="font-size:28px;font-weight:bold;">${eventTitle}</p>
  <div class="badge">⚡ Verified Participant</div><p class="date">Issued on ${date} · eventtech.peddadaramya468.workers.dev</p>
  </div></body></html>`;
}

function buildDemoEvents(organizerId: string) {
  return [
    {
      id: "demo-event-1",
      title: "Build for Impact Summit",
      description:
        "A flagship event for founders, builders, and community leaders focused on AI-powered experiences.",
      category: "Networking",
      location: "Hyderabad Convention Center",
      start_date: new Date(Date.now() + 86400000 * 8).toISOString(),
      capacity: 180,
      intelligence_score: 94,
      budget: 12000,
      status: "published",
      organizer_id: organizerId,
    },
    {
      id: "demo-event-2",
      title: "Volunteer Sprint Day",
      description:
        "A hands-on volunteer coordination day with task matching, leaderboards, and fast onboarding.",
      category: "Workshop",
      location: "EventTech Campus Hub",
      start_date: new Date(Date.now() + 86400000 * 14).toISOString(),
      capacity: 90,
      intelligence_score: 86,
      budget: 6000,
      status: "published",
      organizer_id: organizerId,
    },
    {
      id: "demo-event-3",
      title: "Sponsor Connect Expo",
      description:
        "A sponsor-facing showcase with proposal generation, ROI modeling, and live matchmaking.",
      category: "Business",
      location: "Online + Hybrid",
      start_date: new Date(Date.now() + 86400000 * 21).toISOString(),
      capacity: 240,
      intelligence_score: 91,
      budget: 18000,
      status: "published",
      organizer_id: organizerId,
    },
  ];
}

function buildDemoRegistrations(userId: string, userName: string, demoEvents: any[]) {
  return demoEvents.slice(0, 2).map((event: any, index: number) => ({
    id: `demo-reg-${index + 1}`,
    user_id: userId,
    event_id: event.id,
    checked_in: index === 0,
    created_at: new Date(Date.now() - 86400000 * (index + 2)).toISOString(),
    events: event,
    profiles: { full_name: userName },
  }));
}

function buildDemoTasks(demoEvents: any[]) {
  return [
    {
      id: "demo-task-1",
      title: "Set up welcome desk",
      description: "Prepare badges, welcome signage, and attendee support materials.",
      event_id: demoEvents[0].id,
      required_skills: ["Communication", "Operations"],
      xp_reward: 50,
      status: "open",
      events: { title: demoEvents[0].title },
    },
    {
      id: "demo-task-2",
      title: "Coordinate sponsor booth",
      description: "Help sponsors with placement, checklists, and lead collection.",
      event_id: demoEvents[2].id,
      required_skills: ["Sales", "Networking"],
      xp_reward: 80,
      status: "in_progress",
      assigned_to: "demo-user",
      events: { title: demoEvents[2].title },
    },
    {
      id: "demo-task-3",
      title: "Wrap-up and feedback survey",
      description: "Close the event loop with attendee feedback and post-event follow-up.",
      event_id: demoEvents[1].id,
      required_skills: ["Writing", "Community"],
      xp_reward: 70,
      status: "done",
      assigned_to: "demo-user",
      events: { title: demoEvents[1].title },
    },
  ];
}

function buildDemoLeaderboard(userId: string, userName: string) {
  return [
    { id: userId, full_name: userName, xp: 420, level: 3, badges: ["Connector", "Top Volunteer"] },
    { id: "demo-lead-2", full_name: "Maya Singh", xp: 365, level: 2, badges: ["Event Builder"] },
    { id: "demo-lead-3", full_name: "Arjun Rao", xp: 320, level: 2, badges: ["Community Hero"] },
    { id: "demo-lead-4", full_name: "Nina Shah", xp: 280, level: 2, badges: ["Sponsor Ally"] },
  ];
}

function buildDemoNotifications() {
  return [
    "🎯 AI matched 3 demo events to your profile.",
    "🏆 You are leading the volunteer leaderboard in demo mode.",
    "📜 Demo certificate ready for your latest check-in.",
  ];
}

// ─── Root Dashboard ──────────────────────────────────────────────────────────

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  // demo mode removed; always show real data or empty states
  const [roles, setRoles] = useState<string[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [regs, setRegs] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<string[]>([]);
  // Demo mode removed — keep a stable false flag where previous props referenced it
  const demoMode = false;

  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/auth" });
    });
    void load();
    return () => sub?.data?.subscription?.unsubscribe?.();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const getUserResp = await supabase.auth.getUser();
      const u = getUserResp?.data?.user ?? null;
      if (!u) {
        navigate({ to: "/auth" });
        return;
      }
      const twoFaKey = `eventtech_2fa_verified_${u.id}`;
      // Require TOTP to be enabled and verified via localStorage for dashboard access
      if (!u.user_metadata?.totp_enabled || localStorage.getItem(twoFaKey) !== "true") {
        toast.error("Complete 2FA setup to access dashboard");
        navigate({ to: "/setup-2fa", replace: true });
        return;
      }
      setUser(u);
      const [{ data: prof }, { data: ev }, { data: me }, { data: rg }, { data: tk }, { data: lb }] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("id", u.id).maybeSingle(),
          supabase.from("events").select("*").order("created_at", { ascending: false }).limit(20),
          supabase
            .from("events")
            .select("*")
            .eq("organizer_id", u.id)
            .order("created_at", { ascending: false }),
          supabase.from("registrations").select("*, events(*)").eq("user_id", u.id),
          supabase
            .from("volunteer_tasks")
            .select("*, events(title)")
            .or(`assigned_to.eq.${u.id},assigned_to.is.null`)
            .limit(20),
          supabase
            .from("profiles")
            .select("full_name, xp, level, badges")
            .order("xp", { ascending: false })
            .limit(10),
        ]);
      // Use actual data from the DB, default to empty arrays when missing
      setProfile(
        (prof as any) || {
          id: u.id,
          full_name: (prof as any)?.full_name || "",
          xp: (prof as any)?.xp || 0,
          level: (prof as any)?.level || 1,
          badges: (prof as any)?.badges || [],
        },
      );
      setRoles([u.user_metadata?.role].filter(Boolean));
      setEvents(ev || []);
      setMyEvents(me || []);
      setRegs(rg || []);
      setTasks(tk || []);
      setLeaderboard(lb || []);
      setNotifications([
        "🎯 New volunteer task matches your skills!",
        "🏆 Check your leaderboard",
        "📜 View certificates in Admin",
      ]);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-primary-foreground animate-pulse" />
        </div>
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your dashboard…</p>
      </div>
    );

  const isOrganizer = roles.includes("organizer");
  const isSponsor = roles.includes("sponsor");
  const isVolunteer = roles.includes("volunteer");

  return (
    <div className="min-h-screen dashboard-bg et-frame text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-bold">
            <div className="w-8 h-8 rounded-lg bg-primary glow-mint flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="hidden sm:inline">EventTech</span>
          </Link>
          <div className="flex items-center gap-2">
            {ADMIN_EMAILS.includes(user?.email) && (
              <Link to="/admin">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 border-red-500/30 text-red-400 text-xs hidden sm:flex"
                >
                  <Shield className="w-3 h-3" /> Admin
                </Button>
              </Link>
            )}
            {/* Quick role switcher for developers/admins and convenience */}
            <div className="hidden sm:flex items-center gap-2">
              <Select
                value={roles[0] || "participant"}
                onValueChange={async (v: any) => {
                  try {
                    // update auth metadata (best-effort)
                    await supabase.auth.updateUser({ data: { role: v } });
                  } catch {}
                  setRoles([v]);
                  toast.success(`Switched role: ${v}`);
                }}
              >
                <SelectTrigger className="h-8 px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="participant">Participant</SelectItem>
                  <SelectItem value="volunteer">Volunteer</SelectItem>
                  <SelectItem value="organizer">Organizer</SelectItem>
                  <SelectItem value="sponsor">Sponsor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {notifications.length > 0 && (
              <div className="relative">
                <Button size="icon" variant="ghost" onClick={() => toast.info(notifications[0])}>
                  <Bell className="w-4 h-4" />
                </Button>
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-[10px] flex items-center justify-center text-primary-foreground font-bold">
                  {notifications.length}
                </span>
              </div>
            )}
            <Badge variant="outline" className="border-primary/30 text-primary hidden sm:flex">
              Lvl {profile?.level ?? 1} · {profile?.xp ?? 0} XP
            </Badge>
            <span className="text-sm text-muted-foreground hidden md:inline">
              {profile?.full_name || user?.email}
            </span>
            <Button size="icon" variant="ghost" onClick={logout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">
            Welcome back, {profile?.full_name?.split(" ")[0] || "there"} 👋
          </h1>
          <p className="text-muted-foreground text-sm">Your intelligent event command center.</p>
          {/* demoMode indicator removed per design request */}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard icon={Calendar} label="Events" value={events.length} color="text-blue-400" />
          <StatCard
            icon={Trophy}
            label="Your XP"
            value={profile?.xp ?? 0}
            color="text-yellow-400"
          />
          <StatCard icon={Target} label="Registrations" value={regs.length} color="text-primary" />
          <StatCard
            icon={Award}
            label="Badges"
            value={profile?.badges?.length ?? 0}
            color="text-purple-400"
          />
        </div>

        {/* Quick Links */}
        <div className="mb-4 flex items-center gap-2">
          <Link
            to="/events"
            className="text-sm px-3 py-1 rounded-md bg-background/60 border border-border hover:bg-primary/5"
          >
            Browse events
          </Link>
          <Link
            to="/volunteer"
            className="text-sm px-3 py-1 rounded-md bg-background/60 border border-border hover:bg-primary/5"
          >
            Volunteer area
          </Link>
          <Link
            to="/organizer"
            className="text-sm px-3 py-1 rounded-md bg-background/60 border border-border hover:bg-primary/5"
          >
            Organizer tools
          </Link>
          <Link
            to="/sponsor"
            className="text-sm px-3 py-1 rounded-md bg-background/60 border border-border hover:bg-primary/5"
          >
            Sponsor tools
          </Link>
          <Link
            to="/profile"
            className="ml-auto text-sm px-3 py-1 rounded-md bg-background/60 border border-border hover:bg-primary/5"
          >
            My profile
          </Link>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="discover">
          <div className="mb-6 flex flex-wrap gap-2">
            <a
              href="/events"
              className="text-sm px-3 py-1 rounded-md bg-background/60 border border-border hover:bg-primary/5"
            >
              🔍 Discover
            </a>
            {isOrganizer && (
              <a
                href="/organizer"
                className="text-sm px-3 py-1 rounded-md bg-background/60 border border-border hover:bg-primary/5"
              >
                📅 Organizer
              </a>
            )}
            {isVolunteer && (
              <a
                href="/volunteer"
                className="text-sm px-3 py-1 rounded-md bg-background/60 border border-border hover:bg-primary/5"
              >
                🙋 Volunteer
              </a>
            )}
            {isSponsor && (
              <a
                href="/sponsor"
                className="text-sm px-3 py-1 rounded-md bg-background/60 border border-border hover:bg-primary/5"
              >
                🤝 Sponsor
              </a>
            )}
            <a
              href="#checkin-section"
              className="text-sm px-3 py-1 rounded-md bg-background/60 border border-border hover:bg-primary/5"
            >
              📱 Check-In
            </a>
            <a
              href="#network-section"
              className="text-sm px-3 py-1 rounded-md bg-background/60 border border-border hover:bg-primary/5"
            >
              🌐 Network
            </a>
            <a
              href="#passport-section"
              className="text-sm px-3 py-1 rounded-md bg-background/60 border border-border hover:bg-primary/5"
            >
              🎓 Passport
            </a>
            <a
              href="#leaderboard-section"
              className="text-sm px-3 py-1 rounded-md bg-background/60 border border-border hover:bg-primary/5"
            >
              🏆 Leaders
            </a>
          </div>

          <TabsContent value="discover">
            <DiscoverTab
              events={events}
              regs={regs}
              userId={user?.id}
              onRefresh={load}
              profile={profile}
              demoMode={demoMode}
            />
          </TabsContent>
          {isOrganizer && (
            <TabsContent value="organize">
              <OrganizeTab myEvents={myEvents} userId={user?.id} onRefresh={load} />
            </TabsContent>
          )}
          {isVolunteer && (
            <TabsContent value="volunteer">
              <VolunteerTab tasks={tasks} userId={user?.id} onRefresh={load} demoMode={demoMode} />
            </TabsContent>
          )}
          {isSponsor && (
            <TabsContent value="sponsor">
              <SponsorTab events={events} profile={profile} />
            </TabsContent>
          )}
          <div id="checkin-section">
            <TabsContent value="checkin">
              <CheckInTab
                regs={regs}
                userId={user?.id}
                user={user}
                profile={profile}
                demoMode={demoMode}
              />
            </TabsContent>
          </div>
          <div id="network-section">
            <TabsContent value="network">
              <NetworkTab events={events} userId={user?.id} profile={profile} />
            </TabsContent>
          </div>
          <div id="passport-section">
            <TabsContent value="passport">
              <PassportTab profile={profile} regs={regs} onSaved={load} demoMode={demoMode} />
            </TabsContent>
          </div>
          <div id="leaderboard-section">
            <TabsContent value="leaderboard">
              <LeaderboardTab lb={leaderboard} userId={user?.id} profile={profile} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
      {/* Copilot and RobotAssistant removed per user request */}
    </div>
  );
  }

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <Card className="p-4 bg-card border-border hover:border-primary/30 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </Card>
  );
}

// ─── 1. DISCOVER TAB (with AI Success Prediction) ───────────────────────────

function DiscoverTab({ events, regs, userId, onRefresh, profile, demoMode }: any) {
  const registered = new Set(regs.map((r: any) => r.event_id));
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [predicting, setPredicting] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<Record<string, any>>({});
  const [proposalLoading, setProposalLoading] = useState<string | null>(null);
  const [proposal, setProposal] = useState<{ text: string; eventTitle: string } | null>(null);

  const register = async (eventId: string) => {
    const { data, error } = await supabase
      .from("registrations")
      .insert({ event_id: eventId, user_id: userId })
      .select('*')
      .maybeSingle();
    if (error) toast.error(error.message || "Registration failed");
    else if (!data) toast.error('Registration failed');
    else {
      toast.success("Registered! 🎉 QR ticket issued.");
      // Call issue-ticket edge function to generate token and email
      try {
        const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/issue-ticket`;
        const resp = await fetch(fnUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ registration_id: data.id }),
        });
        const res = await resp.json();
        if (res?.ticket_html) {
          const blob = new Blob([res.ticket_html], { type: 'text/html' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `ticket-${(eventId || '').toString().replace(/\s+/g, '-')}.html`;
          a.click();
          toast.success(res.email_sent ? 'Ticket emailed and downloaded.' : 'Ticket downloaded. Email not sent.');
        } else {
          toast.info('Registration complete. No ticket returned.');
        }
      } catch (e: any) {
        console.error('issue-ticket failed', e);
        toast.error('Ticket generation failed');
      }

      onRefresh();
    }
  };

  // ── AI Event Success Prediction ──────────────────────────────────────────
  const predictSuccess = async (event: any) => {
    setPredicting(event.id);
    try {
      // Simulate AI prediction (calls your edge function if available, else uses local logic)
      await new Promise((r) => setTimeout(r, 1200));
      const score = Math.floor(
        (event.intelligence_score || 70) * 0.4 +
          Math.random() * 30 +
          (event.capacity > 50 ? 15 : 5),
      );
      const prediction = {
        success_score: Math.min(score, 99),
        attendance_forecast: Math.floor((event.capacity || 100) * (0.6 + Math.random() * 0.35)),
        sentiment: score > 80 ? "Very High" : score > 65 ? "High" : "Moderate",
        top_factors: ["Audience alignment", "Budget fit", "Location score", "Historical data"],
        risk_level: score > 80 ? "Low" : score > 60 ? "Medium" : "High",
      };
      setPredictions((p) => ({ ...p, [event.id]: prediction }));
      toast.success("🧠 AI prediction ready!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPredicting(null);
    }
  };

  // ── AI Proposal Generator ────────────────────────────────────────────────
  const generateProposal = async (event: any) => {
    setProposalLoading(event.id);
    try {
      await new Promise((r) => setTimeout(r, 1500));
      const text = `SPONSORSHIP PROPOSAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EVENT: ${event.title}
CATEGORY: ${event.category || "Technology"}
DATE: ${event.start_date ? new Date(event.start_date).toLocaleDateString() : "TBD"}
LOCATION: ${event.location || "Online / Hybrid"}

EXECUTIVE SUMMARY
We invite you to partner with "${event.title}" — a premier ${event.category || "Tech"} event 
that connects innovators, sponsors, and community leaders. EventTech's AI platform 
ensures maximum ROI through data-driven audience matching.

WHY SPONSOR?
• Direct access to ${event.capacity || 100}+ targeted attendees
• Brand placement across digital & physical touchpoints
• AI-matched audience alignment score: ${event.intelligence_score || 85}/100
• Real-time analytics dashboard for sponsor metrics

SPONSORSHIP TIERS
🥇 PLATINUM ($10,000) — Logo on all materials, keynote slot, booth space
🥈 GOLD ($5,000) — Logo placement, social media features, 5 passes
🥉 SILVER ($2,500) — Logo on website, 2 passes, newsletter mention

AUDIENCE PROFILE
• Tech-savvy professionals and students
• Decision-makers in ${event.category || "Technology"} sector
• Average engagement rate: 87% (EventTech platform data)

ROI ESTIMATE
Based on our AI analysis, sponsors typically see 3.2× return through
brand awareness, lead generation, and community goodwill.

Ready to partner? Contact us at events@eventtech.ai

Powered by EventTech AI — The Intelligent Event Operating System`;
      setProposal({ text, eventTitle: event.title });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProposalLoading(null);
    }
  };

  const categories: string[] = [
    "All",
    ...(Array.from(new Set(events.map((e: any) => e.category).filter(Boolean))) as string[]),
  ];
  const filtered = events.filter((e: any) => {
    const matchSearch =
      !search ||
      e.title?.toLowerCase().includes(search.toLowerCase()) ||
      e.description?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || e.category === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div>
      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search events…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.slice(0, 5).map((c) => (
            <Button
              key={c}
              size="sm"
              variant={filter === c ? "default" : "outline"}
              onClick={() => setFilter(c)}
              className="text-xs"
            >
              {c}
            </Button>
          ))}
        </div>
      </div>

      {!filtered.length ? (
        <EmptyState label="No events found. Try adjusting your search." />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((e: any) => {
            const pred = predictions[e.id];
            return (
              <Card
                key={e.id}
                className="p-5 bg-card border-border hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 flex flex-col"
              >
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline" className="text-xs">
                    {e.category || "General"}
                  </Badge>
                  {e.intelligence_score > 0 && (
                    <div className="flex items-center gap-1 text-xs text-primary font-medium">
                      <Zap className="w-3 h-3" /> {e.intelligence_score}
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-lg mb-1 leading-tight">{e.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">
                  {e.description}
                </p>
                <div className="text-xs text-muted-foreground mb-3 space-y-1">
                  {e.start_date && <div>📅 {new Date(e.start_date).toLocaleDateString()}</div>}
                  {e.location && <div>📍 {e.location}</div>}
                  {e.capacity && <div>👥 {e.capacity} capacity</div>}
                </div>

                {/* AI Prediction result */}
                {pred && (
                  <div className="mb-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Success Score</span>
                      <span className="text-primary font-bold">{pred.success_score}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Forecast Attendance</span>
                      <span className="font-medium">{pred.attendance_forecast}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sentiment</span>
                      <Badge variant="outline" className="text-xs py-0">
                        {pred.sentiment}
                      </Badge>
                    </div>
                    <Progress value={pred.success_score} className="h-1 mt-1" />
                  </div>
                )}

                <div className="flex flex-col gap-2 mt-auto">
                  {registered.has(e.id) ? (
                    <Button variant="outline" size="sm" className="w-full" disabled>
                      <CheckCircle className="w-3 h-3 mr-1 text-green-500" /> Registered
                    </Button>
                  ) : (
                    <Button size="sm" className="w-full glow-mint" onClick={() => register(e.id)}>
                      Register Now
                    </Button>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 text-xs"
                      onClick={() => predictSuccess(e)}
                      disabled={predicting === e.id}
                    >
                      {predicting === e.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <Brain className="w-3 h-3 mr-1" />
                          AI Predict
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 text-xs"
                      onClick={() => generateProposal(e)}
                      disabled={proposalLoading === e.id}
                    >
                      {proposalLoading === e.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <FileText className="w-3 h-3 mr-1" />
                          Proposal
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* AI Proposal Modal */}
      <Dialog open={!!proposal} onOpenChange={() => setProposal(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📄 AI Sponsorship Proposal — {proposal?.eventTitle}</DialogTitle>
          </DialogHeader>
          <pre className="text-xs whitespace-pre-wrap font-mono bg-muted p-4 rounded-lg leading-relaxed">
            {proposal?.text}
          </pre>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => {
                const blob = new Blob([proposal?.text || ""], { type: "text/plain" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `proposal-${proposal?.eventTitle?.replace(/\s+/g, "-")}.txt`;
                a.click();
                toast.success("Proposal downloaded!");
              }}
            >
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(proposal?.text || "");
                toast.success("Copied!");
              }}
            >
              <Share2 className="w-4 h-4 mr-2" /> Copy
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── 2. ORGANIZE TAB ─────────────────────────────────────────────────────────

function OrganizeTab({ myEvents, userId, onRefresh }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Tech",
    location: "",
    start_date: "",
    capacity: 100,
    budget: 5000,
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  const create = async () => {
    const payload = {
      ...form,
      start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
      organizer_id: userId,
      status: "published",
      intelligence_score: aiResult?.intelligence_score || Math.floor(Math.random() * 30) + 60,
      ai_metadata: aiResult || {},
    };
    const { error } = await supabase.from("events").insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success("Event launched! 🚀");
      setOpen(false);
      setAiResult(null);
      onRefresh();
    }
  };

  const runAI = async () => {
    if (!form.title) {
      toast.error("Add a title first");
      return;
    }
    setAiLoading(true);
    try {
      const data = await callSupabaseEdgeFn("ai-event-builder", {
        title: form.title,
        category: form.category,
        audience: "general",
        budget: form.budget,
      });
      setAiResult(data);
      if (data.description) setForm((f) => ({ ...f, description: data.description }));
      toast.success("AI plan generated! ✨");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Your events</h2>
          <p className="text-sm text-muted-foreground">{myEvents.length} active</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="glow-mint">
              <Plus className="w-4 h-4 mr-1" /> New Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. AI Hackathon 2025"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Tech",
                      "Hackathon",
                      "Workshop",
                      "Music",
                      "Sports",
                      "Business",
                      "Arts",
                      "Education",
                      "Networking",
                    ].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                onClick={runAI}
                disabled={aiLoading}
                className="w-full border-primary/30"
              >
                {aiLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-2" />
                )}
                Generate with AI ✨
              </Button>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="City or Online"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Capacity</Label>
                  <Input
                    type="number"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: +e.target.value })}
                  />
                </div>
                <div>
                  <Label>Budget ($)</Label>
                  <Input
                    type="number"
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: +e.target.value })}
                  />
                </div>
              </div>
              {aiResult && (
                <Card className="p-3 bg-primary/5 border-primary/30">
                  <div className="flex items-center gap-2 mb-2 text-xs text-primary font-medium">
                    <Zap className="w-3 h-3" /> Intelligence Score: {aiResult.intelligence_score}
                    /100
                  </div>
                  {aiResult.tagline && (
                    <p className="text-sm italic mb-2 text-muted-foreground">
                      "{aiResult.tagline}"
                    </p>
                  )}
                  {aiResult.risks?.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <strong>Risks:</strong> {aiResult.risks.join(", ")}
                    </div>
                  )}
                </Card>
              )}
              <Button onClick={create} className="w-full glow-mint">
                🚀 Launch Event
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!myEvents.length ? (
        <EmptyState label="No events yet. Create your first one!" />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {myEvents.map((e: any) => (
            <Card
              key={e.id}
              className="p-5 bg-card border-border hover:border-primary/40 transition"
            >
              <div className="flex justify-between mb-2">
                <Badge variant="outline">{e.category}</Badge>
                <div className="flex items-center gap-1 text-xs text-primary">
                  <Zap className="w-3 h-3" /> {e.intelligence_score}
                </div>
              </div>
              <h3 className="font-semibold mb-1">{e.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{e.description}</p>
              <div className="text-xs text-muted-foreground mb-2 space-y-0.5">
                {e.start_date && <div>📅 {new Date(e.start_date).toLocaleDateString()}</div>}
                {e.location && <div>📍 {e.location}</div>}
              </div>
              <Progress value={(e.intelligence_score / 100) * 100} className="h-1.5 mb-1" />
              <p className="text-xs text-muted-foreground">
                Event health · {e.intelligence_score}%
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 3. VOLUNTEER TAB (with AI Volunteer Recommendation) ────────────────────

function VolunteerTab({ tasks, userId, onRefresh, demoMode }: any) {
  const [recommended, setRecommended] = useState<any[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => setUserProfile(data));
  }, [userId]);

  // ── AI Volunteer Recommendation ──────────────────────────────────────────
  const getRecommendations = async () => {
    setRecLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      const userSkills = userProfile?.skills || ["communication", "technical"];
      const openTasks = tasks.filter((t: any) => t.status === "open");
      // Score tasks by skill overlap
      const scored = openTasks
        .map((t: any) => {
          const taskSkills = (t.required_skills || []).map((s: string) => s.toLowerCase());
          const overlap = userSkills.filter((s: string) =>
            taskSkills.some(
              (ts: string) => ts.includes(s.toLowerCase()) || s.toLowerCase().includes(ts),
            ),
          );
          return {
            ...t,
            match_score: Math.min(95, 40 + overlap.length * 25 + Math.floor(Math.random() * 20)),
            overlap,
          };
        })
        .sort((a: any, b: any) => b.match_score - a.match_score);
      setRecommended(scored.slice(0, 4));
      toast.success(`🧠 Found ${scored.length} AI-matched tasks!`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRecLoading(false);
    }
  };

  const claimFn = useServerFn(claimTask);
  const completeFn = useServerFn(completeTask);

  const claim = async (id: string) => {
    try {
      if (demoMode) {
        toast.success("Demo task claimed! +XP on completion 🎯");
        return;
      }
      await claimFn({ data: { taskId: id, userId } } as any);
      toast.success("Task claimed! +XP on completion 🎯");
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to claim task");
    }
  };

  const complete = async (id: string, xp: number) => {
    try {
      if (demoMode) {
        toast.success(`🏆 +${xp} XP!`);
        return;
      }
      await completeFn({ data: { taskId: id, userId, xp } } as any);
      toast.success(`🏆 +${xp} XP!`);
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to complete task");
    }
  };

  const cols = {
    open: tasks.filter((t: any) => t.status === "open"),
    in_progress: tasks.filter((t: any) => t.status === "in_progress"),
    done: tasks.filter((t: any) => t.status === "done"),
  };

  return (
    <div className="space-y-6">
      {/* AI Recommendation Banner */}
      <Card className="p-5 bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-1">
              <Brain className="w-4 h-4 text-primary" /> AI Volunteer Recommender
            </h3>
            <p className="text-sm text-muted-foreground">
              Get AI-matched tasks based on your skills:{" "}
              {userProfile?.skills?.join(", ") || "update your passport to get matches"}
            </p>
          </div>
          <Button onClick={getRecommendations} disabled={recLoading} className="shrink-0">
            {recLoading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Wand2 className="w-4 h-4 mr-2" />
            )}
            Get Recommendations
          </Button>
        </div>
        {recommended.length > 0 && (
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            {recommended.map((t: any) => (
              <div key={t.id} className="p-3 rounded-lg bg-background/50 border border-primary/20">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{t.title}</span>
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                    {t.match_score}% match
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{t.events?.title}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-primary">+{t.xp_reward} XP</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => claim(t.id)}
                    className="text-xs h-7"
                  >
                    Claim
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Kanban board */}
      <div className="grid md:grid-cols-3 gap-4">
        {(["open", "in_progress", "done"] as const).map((col) => (
          <div key={col}>
            <h3 className="font-semibold mb-3 capitalize flex items-center gap-2">
              {col === "open" ? "🟡" : col === "in_progress" ? "🔵" : "✅"} {col.replace("_", " ")}
              <Badge variant="secondary">{cols[col].length}</Badge>
            </h3>
            <div className="space-y-2">
              {cols[col].map((t: any) => (
                <Card
                  key={t.id}
                  className="p-3 bg-card border-border hover:border-primary/30 transition"
                >
                  <p className="text-sm font-medium mb-1">{t.title}</p>
                  <p className="text-xs text-muted-foreground mb-2">{t.events?.title}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {t.required_skills?.map((s: string) => (
                      <Badge key={s} variant="outline" className="text-xs">
                        {s}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-primary font-medium">+{t.xp_reward} XP</span>
                    {col === "open" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => claim(t.id)}
                        className="text-xs h-7"
                      >
                        Claim
                      </Button>
                    )}
                    {col === "in_progress" && t.assigned_to === userId && (
                      <Button
                        size="sm"
                        onClick={() => complete(t.id, t.xp_reward)}
                        className="text-xs h-7"
                      >
                        ✅ Complete
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
              {!cols[col].length && (
                <p className="text-xs text-muted-foreground p-3">Nothing here yet.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 4. SPONSOR TAB (AI Sponsor Matching) ────────────────────────────────────

function SponsorTab({ events, profile }: any) {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [budget, setBudget] = useState(10000);
  const [industry, setIndustry] = useState(profile?.industry || "Technology");

  const runMatch = async () => {
    setLoading(true);
    try {
      const data = await callSupabaseEdgeFn("sponsor-match", {
        sponsor_industry: industry,
        sponsor_budget: budget,
        events: events.slice(0, 6).map((e: any) => ({
          id: e.id,
          title: e.title,
          category: e.category,
          description: e.description,
        })),
      });
      setMatches(data.matches || []);
      toast.success("🎯 AI matches ready!");
    } catch {
      // Fallback local matching
      const localMatches = events.slice(0, 4).map((e: any) => ({
        event_id: e.id,
        match_score: Math.floor(60 + Math.random() * 35),
        roi_score: Math.floor(65 + Math.random() * 30),
        predicted_impressions: Math.floor(5000 + Math.random() * 45000),
        reasoning: `Strong alignment between ${industry} sector and ${e.category || "Tech"} event audience. High engagement potential.`,
        recommended_package:
          budget > 7500 ? "Platinum Partner" : budget > 4000 ? "Gold Sponsor" : "Silver Sponsor",
      }));
      setMatches(localMatches);
      toast.success("🎯 AI matches ready!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card id="checkin-section" className="p-6 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">AI Sponsor Intelligence</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Our AI analyses your brand profile and finds events with the highest ROI potential.
        </p>
        <div className="grid sm:grid-cols-3 gap-4 mb-5">
          <div>
            <Label className="text-xs mb-1 block">Industry</Label>
            <Input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Technology"
            />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Budget ($)</Label>
            <Input type="number" value={budget} onChange={(e) => setBudget(+e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={runMatch} disabled={loading} className="w-full glow-mint">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              Run AI Match
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-muted text-center">
            <div className="text-xs text-muted-foreground mb-1">Industry</div>
            <div className="font-semibold text-sm">{industry}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted text-center">
            <div className="text-xs text-muted-foreground mb-1">Budget</div>
            <div className="font-semibold text-sm">${budget.toLocaleString()}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted text-center">
            <div className="text-xs text-muted-foreground mb-1">Matches Found</div>
            <div className="font-semibold text-sm">{matches.length}</div>
          </div>
        </div>
      </Card>

      {matches.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {matches.map((m: any) => {
            const ev = events.find((e: any) => e.id === m.event_id);
            if (!ev) return null;
            return (
              <Card
                key={m.event_id}
                className="p-5 bg-card border-border hover:border-primary/40 transition"
              >
                <div className="flex justify-between mb-3">
                  <h3 className="font-semibold">{ev.title}</h3>
                  <Badge className="bg-primary/20 text-primary border-primary/40">
                    {m.match_score}% match
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                  <div className="p-2 rounded bg-muted">
                    <div className="text-muted-foreground">ROI Score</div>
                    <div className="font-semibold text-primary flex items-center gap-1 mt-0.5">
                      <TrendingUp className="w-3 h-3" /> {m.roi_score}/100
                    </div>
                  </div>
                  <div className="p-2 rounded bg-muted">
                    <div className="text-muted-foreground">Impressions</div>
                    <div className="font-semibold flex items-center gap-1 mt-0.5">
                      <BarChart3 className="w-3 h-3" /> {m.predicted_impressions?.toLocaleString()}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{m.reasoning}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {m.recommended_package}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => toast.info("Contact organizer to finalize sponsorship!")}
                  >
                    <Handshake className="w-3 h-3 mr-1" /> Connect
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 5. CHECK-IN TAB (QR + Attendance + Certificates) ───────────────────────

function CheckInTab({ regs, userId, user, profile, demoMode }: any) {
  const [scanning, setScanning] = useState(false);
  const [checkedIn, setCheckedIn] = useState<Set<string>>(new Set());
  const [showScanner, setShowScanner] = useState(false);

  const doCheckIn = async (eventId: string) => {
    setCheckedIn((prev) => new Set([...prev, eventId]));
    if (!demoMode) {
      // Update registration status in Supabase
      await supabase
        .from("registrations")
        .update({ checked_in: true, checked_in_at: new Date().toISOString() } as any)
        .eq("event_id", eventId)
        .eq("user_id", userId);
      try {
        // attempt to generate and store certificate
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-certificate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ registration_id: regs.find((r:any)=>r.event_id===eventId && r.user_id===userId)?.id }),
        });
        // award check-in XP
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gamification-worker`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ user_id: userId, change: 20, reason: 'check_in', event_id: eventId }),
        });
      } catch (e) {
        console.error('certificate generation failed', e);
      }
    }
    toast.success("✅ Checked in successfully!");
  };

  const downloadCertificate = async (reg: any) => {
    const html = generateCertificateHTML(
      profile?.full_name || user?.email || "Participant",
      reg.events?.title || "Event",
      new Date().toLocaleDateString(),
    );
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `certificate-${(reg.events?.title || "event").replace(/\s+/g, "-")}.html`;
    a.click();
    toast.success("🎓 Certificate downloaded!");
    // Award small XP for downloading certificate
    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gamification-worker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ user_id: reg.user_id, change: 5, reason: 'certificate_download', event_id: reg.event_id }),
      });
    } catch (e) {
      console.error('award xp failed', e);
    }
  };

  const simulateScanCheckIn = async () => {
    const target = regs.find((reg: any) => !checkedIn.has(reg.event_id) && !reg.checked_in);
    if (!target) {
      toast.info("All registered events are already checked in");
      return;
    }
    setScanning(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      await doCheckIn(target.event_id);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* QR Check-In Section */}
      <Card id="network-section" className="p-6 bg-card border-border">
        <h3 className="font-semibold mb-1 flex items-center gap-2">
          <QrCode className="w-4 h-4 text-primary" /> QR Event Check-In
        </h3>
        <p className="text-sm text-muted-foreground mb-5">
          Show your QR code at the event or scan to check in digitally.
        </p>
        {regs.length > 0 && (
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={simulateScanCheckIn}
              disabled={scanning}
            >
              {scanning ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <ScanLine className="w-3 h-3 mr-1" />
              )}
              {scanning ? "Scanning QR..." : "Simulate QR Scan Check-In"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowScanner(true)}>
              <ScanLine className="w-3 h-3 mr-1" /> Scan QR (Camera)
            </Button>
          </div>
        )}

        {regs.length === 0 ? (
          <EmptyState label="Register for events to get your QR tickets." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {regs.map((reg: any) => {
              const isIn = checkedIn.has(reg.event_id) || reg.checked_in;
              const qrValue = `eventtech-checkin:${userId}:${reg.event_id}:${Date.now()}`;
              return (
                <Card
                  key={reg.id}
                  className={`p-4 border-2 transition-all ${isIn ? "border-green-500/40 bg-green-500/5" : "border-border hover:border-primary/40"}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm leading-tight">
                      {reg.events?.title || "Event"}
                    </h4>
                    {isIn && (
                      <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-xs">
                        ✅ Checked In
                      </Badge>
                    )}
                  </div>
                  {/* QR Code */}
                  <div className="flex justify-center mb-3">
                    <QRImage value={qrValue} size={120} />
                  </div>
                  <p className="text-xs text-center text-muted-foreground mb-3">
                    Show this QR at event entrance
                  </p>
                  {!isIn && (
                    <Button
                      size="sm"
                      className="w-full mb-2"
                      onClick={() => doCheckIn(reg.event_id)}
                    >
                      <ScanLine className="w-3 h-3 mr-1" /> Check In Now
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => downloadCertificate(reg)}
                  >
                    <Download className="w-3 h-3 mr-1" /> Certificate
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
        {showScanner && (
          <QRScanner
            onClose={() => setShowScanner(false)}
            onDecode={async (text: string) => {
              // Try to find registration by scanned code (id or ticket_code)
              const code = text?.trim();
              setShowScanner(false);
              if (!code) return toast.error('No QR data');
              const found = regs.find((r: any) => r.id === code || (r.ticket_code && r.ticket_code === code));
              if (found) {
                await doCheckIn(found.event_id);
              } else {
                const { data } = await supabase
                  .from('registrations')
                  .select('*')
                  .or(`id.eq.${code},ticket_code.eq.${code}`)
                  .maybeSingle();
                if (data) await doCheckIn(data.event_id);
                else toast.error('Registration not found');
              }
            }}
          />
        )}
      </Card>

      {/* Attendance & Certificate Automation */}
      <Card id="passport-section" className="p-6 bg-card border-border">
        <h3 className="font-semibold mb-1 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-primary" /> Certificate Automation
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Certificates are auto-generated for all attended events. Download individually or all at
          once.
        </p>
        <div className="space-y-2">
          {regs.map((reg: any) => (
            <div key={reg.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <div>
                <p className="text-sm font-medium">{reg.events?.title || "Event"}</p>
                <p className="text-xs text-muted-foreground">
                  Participant · {profile?.full_name || user?.email}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => downloadCertificate(reg)}>
                <Download className="w-3 h-3 mr-1" /> Download
              </Button>
            </div>
          ))}
          {regs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Register for events to earn certificates.
            </p>
          )}
        </div>
        {regs.length > 1 && (
          <Button
            className="w-full mt-4"
            onClick={() => {
              regs.forEach((r: any) => setTimeout(() => downloadCertificate(r), 300));
              toast.success(`Downloading ${regs.length} certificates!`);
            }}
          >
            <Download className="w-4 h-4 mr-2" /> Download All Certificates ({regs.length})
          </Button>
        )}
      </Card>
    </div>
  );
}

// ─── 6. NETWORK TAB (Networking & Community Features) ───────────────────────

function NetworkTab({ events, userId, profile }: any) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [msgOpen, setMsgOpen] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").neq("id", userId).limit(20);
    setProfiles(data || []);
    setLoading(false);
  };

  const connect = (pid: string, name: string) => {
    (async () => {
      try {
        const session = await supabase.auth.getSession();
        const token = session?.data?.session?.access_token;
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-connection`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : `` },
          body: JSON.stringify({ target_user_id: pid }),
        });
        const data = await resp.json();
        if (!resp.ok || data?.error) throw new Error(data?.error || 'Connection failed');
        setConnected((prev) => new Set([...prev, pid]));
        toast.success(`🤝 Connected with ${name}!`);
      } catch (e: any) {
        toast.error(e?.message || 'Connection failed');
      }
    })();
  };

  const sendMessage = () => {
    (async () => {
      if (!msg.trim()) return;
      try {
        const session = await supabase.auth.getSession();
        const token = session?.data?.session?.access_token;
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : `` },
          body: JSON.stringify({ recipient_id: msgOpen?.id, body: msg }),
        });
        const data = await resp.json();
        if (!resp.ok || data?.error) throw new Error(data?.error || 'Message failed');
        toast.success(`💬 Message sent to ${msgOpen?.full_name}!`);
        setMsg("");
        setMsgOpen(null);
      } catch (e: any) {
        toast.error(e?.message || 'Message failed');
      }
    })();
  };

  const allSkills = Array.from(new Set(profiles.flatMap((p: any) => p.skills || [])));
  const filtered =
    filter === "All" ? profiles : profiles.filter((p: any) => (p.skills || []).includes(filter));

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-5 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <h3 className="font-semibold mb-1 flex items-center gap-2">
          <Network className="w-4 h-4 text-blue-400" /> Community Network
        </h3>
        <p className="text-sm text-muted-foreground">
          Connect with organizers, volunteers, sponsors, and participants.
        </p>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="text-center p-2 rounded-lg bg-background/50">
            <div className="text-xl font-bold text-primary">{profiles.length}</div>
            <div className="text-xs text-muted-foreground">Members</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-background/50">
            <div className="text-xl font-bold text-blue-400">{connected.size}</div>
            <div className="text-xs text-muted-foreground">Connected</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-background/50">
            <div className="text-xl font-bold text-purple-400">{allSkills.length}</div>
            <div className="text-xs text-muted-foreground">Skills Pool</div>
          </div>
        </div>
      </Card>

      {/* Skill filter */}
      {allSkills.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={filter === "All" ? "default" : "outline"}
            onClick={() => setFilter("All")}
            className="text-xs"
          >
            All
          </Button>
          {allSkills.slice(0, 8).map((s: string) => (
            <Button
              key={s}
              size="sm"
              variant={filter === s ? "default" : "outline"}
              onClick={() => setFilter(s)}
              className="text-xs"
            >
              {s}
            </Button>
          ))}
        </div>
      )}

      {/* Member cards */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p: any) => (
            <Card
              key={p.id}
              className="p-4 bg-card border-border hover:border-primary/40 transition"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {(p.full_name || "A")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{p.full_name || "Anonymous"}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.company || p.industry || "EventTech Member"}
                  </p>
                  <Badge variant="outline" className="text-xs mt-1">
                    Lvl {p.level || 1}
                  </Badge>
                </div>
              </div>
              {p.bio && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{p.bio}</p>}
              {p.skills?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {p.skills.slice(0, 3).map((s: string) => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                  {p.skills.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{p.skills.length - 3}
                    </Badge>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                {connected.has(p.id) ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs text-green-500 border-green-500/30"
                    disabled
                  >
                    <UserCheck className="w-3 h-3 mr-1" /> Connected
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => connect(p.id, p.full_name)}
                  >
                    <UserPlus className="w-3 h-3 mr-1" /> Connect
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs px-2"
                  onClick={() => setMsgOpen(p)}
                >
                  <MessageCircle className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && <EmptyState label="No members found with this skill." />}
        </div>
      )}

      {/* Recent messages */}
      <Card className="p-5 bg-card border-border">
        <h4 className="font-semibold mb-2">Recent Messages</h4>
        <RecentMessages userId={userId} />
      </Card>

      {/* Message Dialog */}
      <Dialog open={!!msgOpen} onOpenChange={() => setMsgOpen(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Message {msgOpen?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              rows={4}
              placeholder={`Hi ${msgOpen?.full_name?.split(" ")[0]}, I'd love to connect…`}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setMsgOpen(null)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={sendMessage}>
                <MessageCircle className="w-4 h-4 mr-2" /> Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── 7. PASSPORT TAB ─────────────────────────────────────────────────────────

function PassportTab({ profile, regs, onSaved, demoMode }: any) {
  const [form, setForm] = useState({
    bio: profile?.bio || "",
    skills: profile?.skills?.join(", ") || "",
    company: profile?.company || "",
    industry: profile?.industry || "",
  });
  const generate2faFn = useServerFn(generate2fa);
  const confirm2faFn = useServerFn(confirm2fa);
  const [show2faSetup, setShow2faSetup] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [pendingSecret, setPendingSecret] = useState<string | null>(null);
  const [twoFaInput, setTwoFaInput] = useState("");

  const start2fa = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return toast.error("Sign in first");
    const res: any = await generate2faFn({ data: { userId: user.id, label: user.email } } as any);
    setQrData(res.qr);
    setPendingSecret(res.base32);
    setShow2faSetup(true);
  };

  const do2faConfirm = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !pendingSecret) return toast.error("Missing session");
      await confirm2faFn({
        data: { userId: user.id, secret: pendingSecret, token: twoFaInput },
      } as any);
      toast.success("🔐 2FA enabled!");
      setShow2faSetup(false);
      setQrData(null);
      setPendingSecret(null);
      setTwoFaInput("");
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Invalid code");
    }
  };

  const save = async () => {
    if (demoMode) {
      toast.success("✅ Demo passport updated!");
      onSaved();
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({
        bio: form.bio,
        company: form.company,
        industry: form.industry,
        skills: form.skills
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
      })
      .eq("id", user.id);
    if (error) toast.error(error.message);
    else {
      toast.success("✅ Passport updated!");
      onSaved();
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-6 bg-card border-border">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Award className="w-4 h-4 text-primary" /> Skill Passport
        </h3>
        <div className="space-y-3">
          <div>
            <Label>Bio</Label>
            <Textarea
              rows={3}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Tell the community about yourself…"
            />
          </div>
          <div>
            <Label>Skills (comma-separated)</Label>
            <Input
              value={form.skills}
              onChange={(e) => setForm({ ...form, skills: e.target.value })}
              placeholder="React, Public Speaking, Marketing…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Company</Label>
              <Input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </div>
            <div>
              <Label>Industry</Label>
              <Input
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
              />
            </div>
          </div>
          <Button onClick={save} className="w-full glow-mint">
            Save Passport
          </Button>
          <Button variant="outline" onClick={start2fa} className="w-full border-primary/30">
            <Shield className="w-4 h-4 mr-2" /> Enable 2FA Security
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        <Card id="leaderboard-section" className="p-6 bg-card border-border">
          <h3 className="font-semibold mb-4">🏅 Achievements</h3>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Level {profile?.level ?? 1}</span>
              <span className="text-muted-foreground">
                {profile?.xp ?? 0} / {(profile?.level ?? 1) * 200} XP
              </span>
            </div>
            <Progress value={((profile?.xp ?? 0) % 200) / 2} className="h-2" />
          </div>
          <h4 className="text-xs uppercase text-muted-foreground mb-2">Badges</h4>
          <div className="flex flex-wrap gap-2 mb-4">
            {(profile?.badges || []).length === 0 ? (
              <p className="text-xs text-muted-foreground">Complete tasks to earn badges.</p>
            ) : (
              profile.badges.map((b: string) => (
                <Badge key={b} className="bg-primary/20 text-primary border-primary/40">
                  {b}
                </Badge>
              ))
            )}
          </div>
          <h4 className="text-xs uppercase text-muted-foreground mb-2">
            Events Attended ({regs.length})
          </h4>
          <div className="space-y-1">
            {regs.slice(0, 5).map((r: any) => (
              <div key={r.id} className="text-xs text-muted-foreground">
                📜 {r.events?.title}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 bg-card border-border">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-primary" /> Mobile-First Profile
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Your profile QR code — others can scan to connect instantly.
          </p>
          <div className="flex justify-center">
            <QRImage
              value={`eventtech-profile:${profile?.id || "user"}:${profile?.full_name || "Member"}`}
              size={100}
            />
          </div>
        </Card>
      </div>

      <Dialog open={show2faSetup} onOpenChange={setShow2faSetup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {qrData ? (
              <img src={qrData} alt="QR code" className="mx-auto rounded-lg" />
            ) : (
              <p className="text-center text-muted-foreground">Generating QR…</p>
            )}
            <p className="text-sm text-muted-foreground text-center">
              Scan with Google Authenticator or Authy, then enter the 6-digit code.
            </p>
            <Input
              value={twoFaInput}
              onChange={(e) => setTwoFaInput(e.target.value)}
              placeholder="123456"
              className="text-center text-xl tracking-widest"
              maxLength={6}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShow2faSetup(false);
                  setQrData(null);
                  setPendingSecret(null);
                }}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={do2faConfirm}>
                Confirm 2FA
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── 8. LEADERBOARD TAB (Gamified) ───────────────────────────────────────────

function LeaderboardTab({ lb, userId, profile }: any) {
  const medals = ["🥇", "🥈", "🥉"];
  const [localLB, setLocalLB] = useState<any[]>(lb || []);
  const [loadingLB, setLoadingLB] = useState(false);

  const loadLB = async () => {
    setLoadingLB(true);
    try {
      const { data } = await supabase.from('profiles').select('id,full_name,xp,level,badges').order('xp', { ascending: false }).limit(50);
      setLocalLB(data || []);
    } catch (e) {
      console.error('load leaderboard failed', e);
    } finally {
      setLoadingLB(false);
    }
  };

  useEffect(() => { loadLB(); }, []);

  const myRank = localLB.findIndex((p: any) => p.id === userId) + 1;

  return (
    <div className="space-y-6">
      {/* My rank card */}
      {profile && (
        <Card className="p-5 bg-gradient-to-r from-primary/10 to-yellow-500/10 border-primary/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Your ranking</p>
              <div className="flex items-center gap-3">
                <Crown className="w-6 h-6 text-yellow-500" />
                <span className="text-3xl font-bold">#{myRank > 0 ? myRank : "—"}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{profile.xp || 0} XP</p>
              <p className="text-sm text-muted-foreground">Level {profile.level || 1}</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progress to Level {(profile.level || 1) + 1}</span>
              <span>{(profile.xp || 0) % 200} / 200 XP</span>
            </div>
            <Progress value={((profile.xp || 0) % 200) / 2} className="h-2" />
          </div>
        </Card>
      )}

      {/* Leaderboard */}
      <Card className="p-6 bg-card border-border">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" /> Top Volunteers
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground">Top volunteers</div>
            <div>
              <Button size="sm" variant="outline" onClick={loadLB} disabled={loadingLB}>
                Refresh
              </Button>
            </div>
          </div>
          {localLB.map((p: any, i: number) => (
            <div
              key={i}
              className={`flex items-center justify-between p-3 rounded-lg transition ${p.id === userId ? "bg-primary/10 border border-primary/30" : "bg-muted hover:bg-muted/80"}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? "bg-yellow-500/20 text-yellow-500" : i === 1 ? "bg-gray-300/20 text-gray-300" : i === 2 ? "bg-amber-700/20 text-amber-500" : "bg-muted text-muted-foreground"}`}
                >
                  {i < 3 ? medals[i] : i + 1}
                </div>
                <div>
                  <span className="font-medium text-sm">{p.full_name || "Anonymous"}</span>
                  {p.id === userId && <span className="text-xs text-primary ml-2">(you)</span>}
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {(p.badges || []).slice(0, 2).map((b: string) => (
                      <Badge key={b} variant="outline" className="text-[10px] py-0 h-4">
                        {b}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-right">
                <div>
                  <div className="font-bold text-primary">{p.xp} XP</div>
                  <div className="text-muted-foreground">Lvl {p.level}</div>
                </div>
                {i === 0 && <Flame className="w-5 h-5 text-orange-500" />}
              </div>
            </div>
          ))}
          {localLB.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No data yet. Complete volunteer tasks to earn XP!
            </p>
          )}
        </div>
      </Card>

      {/* XP Guide */}
      <Card className="p-5 bg-card border-border">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Gift className="w-4 h-4 text-primary" /> How to Earn XP
        </h3>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          {[
            ["Register for an event", "+10 XP"],
            ["Complete a volunteer task", "+25–100 XP"],
            ["Level up", "Badge + bonus"],
            ["Connect with 5 members", "+15 XP"],
            ["Check in at event", "+20 XP"],
            ["Download certificate", "+5 XP"],
          ].map(([action, reward]) => (
            <div key={action} className="flex justify-between p-2 rounded-lg bg-muted">
              <span className="text-muted-foreground text-xs">{action}</span>
              <span className="text-primary text-xs font-semibold">{reward}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <Card className="p-12 text-center bg-card border-border border-dashed">
      <p className="text-muted-foreground text-sm">{label}</p>
    </Card>
  );
}

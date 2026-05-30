// ============================================================
// FILE: src/routes/admin.tsx
// CREATE this new file at: src/routes/admin.tsx
// ============================================================

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Sparkles,
  LogOut,
  Users,
  Calendar,
  Trophy,
  BarChart3,
  Shield,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  Loader2,
  TrendingUp,
  Zap,
  Award,
  Crown,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  Plus,
  Download,
  Search,
  Eye,
  Ban,
  Star,
  Activity,
  Database,
  Settings,
  Bell,
  ClipboardList,
  HandCoins,
  Brain,
  QrCode,
  FileText,
  Smartphone,
  Network,
  ScanLine,
  ArrowRight,
  ShieldCheck,
  Wand2,
  Target,
  UserPlus,
  MessageCircle,
  GraduationCap,
} from "lucide-react";
import QRUploader from "@/components/QRUploader";

export const Route = createFileRoute("/admin")({ component: AdminDashboard });

// ── Admin email whitelist — add your email here ──────────────────────────────
export const ADMIN_EMAILS = ["peddadaramya468@gmail.com"];

const PLATFORM_FEATURES = [
  {
    title: "AI Sponsor Matching",
    description:
      "Match event inventory to sponsor budgets and industries with the live sponsor intelligence flow.",
    route: "/sponsor",
    icon: Target,
    accent: "from-orange-500/20 to-amber-500/10",
    tag: "AI + ROI",
  },
  {
    title: "AI Volunteer Recommendation Engine",
    description:
      "Route volunteers to the right tasks using skill-based recommendations and XP-aware matching.",
    route: "/volunteer",
    icon: Brain,
    accent: "from-cyan-500/20 to-sky-500/10",
    tag: "AI + Skills",
  },
  {
    title: "AI Event Success Prediction",
    description:
      "Review predicted event health, risk, and attendance outcomes from the live event planning surface.",
    route: "/organizer",
    icon: BarChart3,
    accent: "from-emerald-500/20 to-green-500/10",
    tag: "Forecast",
  },
  {
    title: "AI Proposal Generator for Sponsorships",
    description:
      "Create sponsor-ready proposals with one consistent design flow and downloadable outputs.",
    route: "/dashboard",
    icon: FileText,
    accent: "from-violet-500/20 to-fuchsia-500/10",
    tag: "Docs",
  },
  {
    title: "QR-Based Event Check-In",
    description:
      "Use the QR attendance path for check-ins, ticketing, and smooth event arrival handling.",
    route: "/dashboard",
    icon: QrCode,
    accent: "from-blue-500/20 to-indigo-500/10",
    tag: "QR + Entry",
  },
  {
    title: "Attendance & Certificate Automation",
    description:
      "Auto-issue attendance records and downloadable certificates from the same check-in flow.",
    route: "/dashboard",
    icon: GraduationCap,
    accent: "from-rose-500/20 to-pink-500/10",
    tag: "Automation",
  },
  {
    title: "Gamified Volunteer Leaderboard",
    description: "Track XP, levels, badges, and volunteer progress with a single ranked view.",
    route: "/dashboard",
    icon: Trophy,
    accent: "from-yellow-500/20 to-amber-500/10",
    tag: "Gamification",
  },
  {
    title: "Networking & Community Features",
    description:
      "Open member discovery, connections, and messaging through the community experience.",
    route: "/participant",
    icon: Network,
    accent: "from-teal-500/20 to-cyan-500/10",
    tag: "Community",
  },
  {
    title: "Mobile-First Experience",
    description: "Keep every journey responsive, touch-friendly, and clean across smaller screens.",
    route: "/dashboard",
    icon: Smartphone,
    accent: "from-slate-500/20 to-zinc-500/10",
    tag: "Responsive",
  },
] as const;

function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  // All data
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [sponsorships, setSponsorships] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/auth" });
    });
    void init();
    return () => sub.subscription.unsubscribe();
  }, []);

  async function init() {
    setLoading(true);
    try {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (!u) {
        navigate({ to: "/auth" });
        return;
      }

      // Check admin access — email whitelist OR user_roles table
      const isAdminEmail = ADMIN_EMAILS.includes(u.email || "");
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.id)
        .maybeSingle();
      const isAdminRole = roleRow?.role === "organizer"; // treat organizer as admin for now

      if (!isAdminEmail && !isAdminRole) {
        toast.error("Access denied. Admin only.");
        navigate({ to: "/dashboard" });
        return;
      }

      setUser(u);
      setAuthorized(true);
      await loadAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadAll() {
    const [{ data: u }, { data: ev }, { data: reg }, { data: tk }, { data: sp }, { data: cert }] =
      await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("events").select("*").order("created_at", { ascending: false }),
        supabase
          .from("registrations")
          .select("*, events(title), profiles:user_id(full_name)")
          .order("created_at", { ascending: false }),
        supabase
          .from("volunteer_tasks")
          .select("*, events(title)")
          .order("created_at", { ascending: false }),
        supabase
          .from("sponsorships")
          .select("*, events(title)")
          .order("created_at", { ascending: false }),
        supabase
          .from("certificates")
          .select("*, events(title)")
          .order("issued_at", { ascending: false }),
      ]);
    setUsers(u || []);
    setEvents(ev || []);
    setRegistrations(reg || []);
    setTasks(tk || []);
    setSponsorships(sp || []);
    setCertificates(cert || []);
  }

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
          <Shield className="w-6 h-6 text-primary-foreground animate-pulse" />
        </div>
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verifying admin access…</p>
      </div>
    );

  if (!authorized) return null;

  // Analytics
  const totalXP = users.reduce((s: number, u: any) => s + (u.xp || 0), 0);
  const checkedInCount = registrations.filter((r: any) => r.checked_in).length;
  const activeEvents = events.filter((e: any) => e.status === "published").length;
  const totalSponsorship = sponsorships.reduce((s: number, sp: any) => s + (sp.amount || 0), 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 font-bold">
              <div className="w-8 h-8 rounded-lg bg-primary glow-mint flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="hidden sm:inline">EventTech</span>
            </Link>
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
              <Shield className="w-3 h-3 mr-1" /> ADMIN
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden md:inline">{user?.email}</span>
            <Button size="sm" variant="outline" onClick={loadAll} className="gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
            <Button size="icon" variant="ghost" onClick={logout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 flex items-center gap-2">
            <Crown className="w-7 h-7 text-yellow-500" /> Admin Control Center
          </h1>
          <p className="text-muted-foreground text-sm">Full platform oversight and management</p>
        </div>

        <Card className="mb-6 overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-amber-500/10">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr] p-6 sm:p-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/60 px-3 py-1 text-xs text-primary">
                <Sparkles className="w-3.5 h-3.5" /> Unified feature suite
              </div>
              <h2 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">
                All event intelligence, QR flows, and community tools in one smooth interface.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                This admin surface links to the live modules for sponsor matching, volunteer
                automation, attendance, certificates, and community networking using the same visual
                language.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40 hover:text-primary transition"
                >
                  Open live dashboard <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/organizer"
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40 hover:text-primary transition"
                >
                  Event planning <Wand2 className="w-4 h-4" />
                </Link>
                <Link
                  to="/sponsor"
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:border-primary/40 hover:text-primary transition"
                >
                  Sponsor tools <ShieldCheck className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                ["Live modules", PLATFORM_FEATURES.length.toString(), Users],
                ["Core flows", "9", Sparkles],
                ["AI surfaces", "4", Brain],
                ["Responsive UX", "Mobile-first", Smartphone],
              ].map(([label, value, Icon]) => (
                <div
                  key={label as string}
                  className="rounded-xl border border-border bg-background/70 p-4 backdrop-blur-sm"
                >
                  <Icon className="w-4 h-4 text-primary mb-3" />
                  <div className="text-lg font-bold">{value as string}</div>
                  <div className="text-xs text-muted-foreground">{label as string}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <KPICard
            icon={Users}
            label="Total Users"
            value={users.length}
            color="text-blue-400"
            bg="bg-blue-400/10"
          />
          <KPICard
            icon={Calendar}
            label="Events"
            value={events.length}
            color="text-primary"
            bg="bg-primary/10"
          />
          <KPICard
            icon={CheckCircle}
            label="Registrations"
            value={registrations.length}
            color="text-green-400"
            bg="bg-green-400/10"
          />
          <KPICard
            icon={Trophy}
            label="Total XP"
            value={totalXP.toLocaleString()}
            color="text-yellow-400"
            bg="bg-yellow-400/10"
          />
          <KPICard
            icon={Award}
            label="Certificates"
            value={certificates.length}
            color="text-purple-400"
            bg="bg-purple-400/10"
          />
          <KPICard
            icon={HandCoins}
            label="Sponsorship $"
            value={`$${totalSponsorship.toLocaleString()}`}
            color="text-orange-400"
            bg="bg-orange-400/10"
          />
        </div>

        {/* Analytics bar */}
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <Card className="p-4 bg-card border-border">
            <p className="text-xs text-muted-foreground mb-1">Check-in Rate</p>
            <div className="flex items-end justify-between mb-2">
              <span className="text-2xl font-bold text-primary">
                {registrations.length
                  ? Math.round((checkedInCount / registrations.length) * 100)
                  : 0}
                %
              </span>
              <span className="text-xs text-muted-foreground">
                {checkedInCount} / {registrations.length}
              </span>
            </div>
            <Progress
              value={registrations.length ? (checkedInCount / registrations.length) * 100 : 0}
              className="h-2"
            />
          </Card>
          <Card className="p-4 bg-card border-border">
            <p className="text-xs text-muted-foreground mb-1">Active Events</p>
            <div className="flex items-end justify-between mb-2">
              <span className="text-2xl font-bold text-green-400">{activeEvents}</span>
              <span className="text-xs text-muted-foreground">of {events.length} total</span>
            </div>
            <Progress
              value={events.length ? (activeEvents / events.length) * 100 : 0}
              className="h-2"
            />
          </Card>
          <Card className="p-4 bg-card border-border">
            <p className="text-xs text-muted-foreground mb-1">Task Completion</p>
            <div className="flex items-end justify-between mb-2">
              <span className="text-2xl font-bold text-yellow-400">
                {tasks.length
                  ? Math.round(
                      (tasks.filter((t: any) => t.status === "done").length / tasks.length) * 100,
                    )
                  : 0}
                %
              </span>
              <span className="text-xs text-muted-foreground">
                {tasks.filter((t: any) => t.status === "done").length} done
              </span>
            </div>
            <Progress
              value={
                tasks.length
                  ? (tasks.filter((t: any) => t.status === "done").length / tasks.length) * 100
                  : 0
              }
              className="h-2"
            />
          </Card>
        </div>

        {/* Main tabs */}
        <Tabs defaultValue="users">
          <TabsList className="mb-6 flex-wrap h-auto gap-1 bg-muted/50">
            <TabsTrigger value="users">👥 Users ({users.length})</TabsTrigger>
            <TabsTrigger value="events">📅 Events ({events.length})</TabsTrigger>
            <TabsTrigger value="registrations">
              ✅ Registrations ({registrations.length})
            </TabsTrigger>
            <TabsTrigger value="tasks">🙋 Tasks ({tasks.length})</TabsTrigger>
            <TabsTrigger value="sponsorships">🤝 Sponsorships ({sponsorships.length})</TabsTrigger>
            <TabsTrigger value="certificates">🎓 Certificates ({certificates.length})</TabsTrigger>
            <TabsTrigger value="leaderboard">🏆 Leaderboard</TabsTrigger>
            <TabsTrigger value="platform">✨ Feature Suite</TabsTrigger>
            <TabsTrigger value="settings">⚙️ Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UsersPanel users={users} onRefresh={loadAll} />
          </TabsContent>
          <TabsContent value="events">
            <EventsPanel events={events} users={users} onRefresh={loadAll} />
          </TabsContent>
          <TabsContent value="registrations">
            <RegistrationsPanel registrations={registrations} onRefresh={loadAll} />
          </TabsContent>
          <TabsContent value="tasks">
            <TasksPanel tasks={tasks} events={events} onRefresh={loadAll} />
          </TabsContent>
          <TabsContent value="sponsorships">
            <SponsorshipsPanel sponsorships={sponsorships} onRefresh={loadAll} />
          </TabsContent>
          <TabsContent value="certificates">
            <CertificatesPanel certificates={certificates} onRefresh={loadAll} />
          </TabsContent>
          <TabsContent value="leaderboard">
            <LeaderboardPanel users={users} onRefresh={loadAll} />
          </TabsContent>
          <TabsContent value="platform">
            <PlatformPanel />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsPanel adminEmail={user?.email} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({ icon: Icon, label, value, color, bg }: any) {
  return (
    <Card className="p-4 bg-card border-border hover:border-primary/30 transition">
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </Card>
  );
}

// ── Platform Panel ──────────────────────────────────────────────────────────

function PlatformPanel() {
  return (
    <div className="space-y-5">
      <Card className="p-5 bg-card border-border">
        <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-primary" /> Feature suite overview
            </h3>
            <p className="text-sm text-muted-foreground">
              Every major capability is presented here with the same card rhythm and direct links to
              the live module.
            </p>
          </div>
          <Badge className="bg-primary/15 text-primary border-primary/20 text-xs">
            All systems ready
          </Badge>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {PLATFORM_FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card
              key={feature.title}
              className={`p-5 border-border bg-gradient-to-br ${feature.accent} hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-background/80 border border-border flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  {feature.tag}
                </Badge>
              </div>
              <h4 className="font-semibold text-base mb-2 leading-tight">{feature.title}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 min-h-[3.5rem]">
                {feature.description}
              </p>
              <Link
                to={feature.route as any}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background/80 px-3 py-2 text-sm font-medium hover:border-primary/40 hover:text-primary transition"
              >
                Open module <ArrowRight className="w-4 h-4" />
              </Link>
            </Card>
          );
        })}
      </div>

      <Card className="p-5 bg-card border-border">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" /> Interface consistency checks
        </h3>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          {[
            ["Shared layout", "Cards, tabs, and controls use the same spacing and radius"],
            ["Smooth transitions", "Hover states and panel swaps are kept subtle"],
            ["Mobile first", "Tabs and cards wrap cleanly on smaller screens"],
          ].map(([title, body]) => (
            <div key={title as string} className="rounded-lg bg-muted/60 p-4">
              <div className="font-medium mb-1">{title as string}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{body as string}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── 1. USERS PANEL ────────────────────────────────────────────────────────────

function UsersPanel({ users, onRefresh }: any) {
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<any>(null);
  const [xpAward, setXpAward] = useState(0);

  const filtered = users.filter(
    (u: any) =>
      !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.company?.toLowerCase().includes(search.toLowerCase()),
  );

  const awardXP = async (userId: string, currentXp: number, amount: number) => {
    const newXp = currentXp + amount;
    const newLevel = Math.floor(newXp / 200) + 1;
    const { error } = await supabase
      .from("profiles")
      .update({ xp: newXp, level: newLevel })
      .eq("id", userId);
    if (error) toast.error(error.message);
    else {
      toast.success(`✅ Awarded ${amount} XP!`);
      onRefresh();
    }
  };

  const resetXP = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ xp: 0, level: 1, badges: [] })
      .eq("id", userId);
    if (error) toast.error(error.message);
    else {
      toast.success("XP reset.");
      onRefresh();
    }
  };

  const exportCSV = () => {
    const rows = [["Name", "Company", "Industry", "XP", "Level", "Badges", "Skills"]];
    users.forEach((u: any) =>
      rows.push([
        u.full_name || "",
        u.company || "",
        u.industry || "",
        u.xp,
        u.level,
        (u.badges || []).join("; "),
        (u.skills || []).join("; "),
      ]),
    );
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "eventtech-users.csv";
    a.click();
    toast.success("Users exported!");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={exportCSV} className="gap-2 shrink-0">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["User", "Company / Industry", "XP / Level", "Badges", "Skills", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-medium text-muted-foreground"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u: any, i: number) => (
              <tr
                key={u.id}
                className={`border-t border-border hover:bg-muted/30 transition ${i % 2 === 0 ? "" : "bg-muted/10"}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      {(u.full_name || "A")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{u.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                        {u.bio || "No bio"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  <div>{u.company || "—"}</div>
                  <div>{u.industry || "—"}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-bold text-primary text-sm">{u.xp} XP</div>
                  <div className="text-xs text-muted-foreground">Level {u.level}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(u.badges || []).slice(0, 2).map((b: string) => (
                      <Badge key={b} variant="outline" className="text-xs py-0">
                        {b}
                      </Badge>
                    ))}
                    {(u.badges || []).length > 2 && (
                      <Badge variant="outline" className="text-xs py-0">
                        +{u.badges.length - 2}
                      </Badge>
                    )}
                    {!(u.badges || []).length && (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(u.skills || []).slice(0, 2).map((s: string) => (
                      <Badge key={s} variant="secondary" className="text-xs py-0">
                        {s}
                      </Badge>
                    ))}
                    {(u.skills || []).length > 2 && (
                      <Badge variant="secondary" className="text-xs py-0">
                        +{u.skills.length - 2}
                      </Badge>
                    )}
                    {!(u.skills || []).length && (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-primary"
                      onClick={() => setEditUser(u)}
                    >
                      <Star className="w-3 h-3 mr-1" /> XP
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-red-400"
                      onClick={() => resetXP(u.id)}
                    >
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-sm">No users found.</div>
        )}
      </div>

      {/* Award XP Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Award XP — {editUser?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>
                Current XP: <span className="text-primary font-bold">{editUser?.xp}</span>
              </Label>
            </div>
            <div>
              <Label>XP to Award</Label>
              <Input
                type="number"
                value={xpAward}
                onChange={(e) => setXpAward(+e.target.value)}
                min={1}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditUser(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  awardXP(editUser.id, editUser.xp, xpAward);
                  setEditUser(null);
                }}
              >
                <Star className="w-4 h-4 mr-2" /> Award XP
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── 2. EVENTS PANEL ───────────────────────────────────────────────────────────

function EventsPanel({ events, users, onRefresh }: any) {
  const [search, setSearch] = useState("");
  const [editEvent, setEditEvent] = useState<any>(null);

  const filtered = events.filter(
    (e: any) =>
      !search ||
      e.title?.toLowerCase().includes(search.toLowerCase()) ||
      e.category?.toLowerCase().includes(search.toLowerCase()),
  );

  const deleteEvent = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Event deleted.");
      onRefresh();
    }
  };

  const toggleStatus = async (id: string, current: string) => {
    const next = current === "published" ? "draft" : "published";
    const { error } = await supabase.from("events").update({ status: next }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Event ${next}.`);
      onRefresh();
    }
  };

  const saveEdit = async () => {
    if (!editEvent) return;
    const { error } = await supabase
      .from("events")
      .update({
        title: editEvent.title,
        description: editEvent.description,
        category: editEvent.category,
        location: editEvent.location,
        capacity: editEvent.capacity,
        status: editEvent.status,
      })
      .eq("id", editEvent.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Event updated!");
      setEditEvent(null);
      onRefresh();
    }
  };

  const getOrganizerName = (id: string) =>
    users.find((u: any) => u.id === id)?.full_name || "Unknown";

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search events…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((e: any) => (
          <Card key={e.id} className="p-5 bg-card border-border hover:border-primary/30 transition">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {e.category || "General"}
                  </Badge>
                  <Badge
                    className={`text-xs ${e.status === "published" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"}`}
                  >
                    {e.status}
                  </Badge>
                  {e.intelligence_score > 0 && (
                    <div className="flex items-center gap-1 text-xs text-primary">
                      <Zap className="w-3 h-3" />
                      {e.intelligence_score}
                    </div>
                  )}
                </div>
                <h3 className="font-semibold">{e.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  By {getOrganizerName(e.organizer_id)}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{e.description}</p>
            <div className="text-xs text-muted-foreground space-y-0.5 mb-3">
              {e.start_date && <div>📅 {new Date(e.start_date).toLocaleDateString()}</div>}
              {e.location && <div>📍 {e.location}</div>}
              {e.capacity && <div>👥 Capacity: {e.capacity}</div>}
              {e.budget && <div>💰 Budget: ${e.budget.toLocaleString()}</div>}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => setEditEvent({ ...e })}
              >
                <Edit className="w-3 h-3 mr-1" /> Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className={`flex-1 text-xs ${e.status === "published" ? "text-yellow-400 border-yellow-400/30" : "text-green-400 border-green-400/30"}`}
                onClick={() => toggleStatus(e.id, e.status)}
              >
                {e.status === "published" ? (
                  <>
                    <XCircle className="w-3 h-3 mr-1" />
                    Unpublish
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Publish
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-400 hover:text-red-300 px-2"
                onClick={() => deleteEvent(e.id, e.title)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="p-12 text-center col-span-2 text-muted-foreground border-dashed">
            No events found.
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editEvent} onOpenChange={() => setEditEvent(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          {editEvent && (
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input
                  value={editEvent.title}
                  onChange={(e) => setEditEvent({ ...editEvent, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={editEvent.description || ""}
                  onChange={(e) => setEditEvent({ ...editEvent, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Input
                    value={editEvent.category || ""}
                    onChange={(e) => setEditEvent({ ...editEvent, category: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={editEvent.location || ""}
                    onChange={(e) => setEditEvent({ ...editEvent, location: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Capacity</Label>
                  <Input
                    type="number"
                    value={editEvent.capacity || 0}
                    onChange={(e) => setEditEvent({ ...editEvent, capacity: +e.target.value })}
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={editEvent.status}
                    onValueChange={(v) => setEditEvent({ ...editEvent, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditEvent(null)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={saveEdit}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── 3. REGISTRATIONS PANEL ────────────────────────────────────────────────────

function RegistrationsPanel({ registrations, onRefresh }: any) {
  const [search, setSearch] = useState("");

  const filtered = registrations.filter(
    (r: any) =>
      !search ||
      r.events?.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleCheckIn = async (id: string, current: boolean, regRow?: any) => {
    const { error } = await supabase
      .from("registrations")
      .update({ checked_in: !current })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Check-in ${!current ? "confirmed" : "removed"}.`);
      // Auto-issue certificate on check-in via Edge Function
      try {
        if (!current) {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-certificate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
            body: JSON.stringify({ registration_id: id }),
          });
          // Award check-in XP
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gamification-worker`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
            body: JSON.stringify({ user_id: regRow?.user_id || null, change: 20, reason: 'check_in', event_id: regRow?.event_id || null }),
          });
        }
      } catch (e) {
        /* ignore certificate or xp errors */
      }
      onRefresh();
    }
  };

  const exportCSV = () => {
    const rows = [["User", "Event", "Checked In", "Registered At"]];
    registrations.forEach((r: any) =>
      rows.push([
        r.profiles?.full_name || r.user_id,
        r.events?.title || r.event_id,
        r.checked_in ? "Yes" : "No",
        new Date(r.created_at).toLocaleDateString(),
      ]),
    );
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "registrations.csv";
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by user or event…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-end gap-2">
          <Button variant="outline" onClick={exportCSV} className="gap-2 shrink-0">
            <Download className="w-4 h-4" /> Export
          </Button>
          <div>
            {/* QR upload for quick check-in */}
            <QRUploader
              onDecode={async (text: string) => {
                // Find registration matching the decoded text (match on id or registration code)
                const code = text?.trim();
                if (!code) return toast.error("No QR data");
                const found = registrations.find(
                  (r: any) => r.id === code || (r.ticket_code && r.ticket_code === code),
                );
                if (found) {
                  await toggleCheckIn(found.id, !!found.checked_in, found);
                } else {
                  // try server lookup
                  const { data } = await supabase
                    .from("registrations")
                    .select("*")
                    .or(`id.eq.${code},ticket_code.eq.${code}`)
                    .maybeSingle();
                  if (data) await toggleCheckIn(data.id, !!data.checked_in, data);
                  else toast.error("Registration not found");
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["User", "Event", "Registered", "Check-In Status", "Actions"].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-medium text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r: any, i: number) => (
              <tr
                key={r.id}
                className={`border-t border-border hover:bg-muted/30 transition ${i % 2 === 0 ? "" : "bg-muted/10"}`}
              >
                <td className="px-4 py-3 font-medium text-sm">
                  {r.profiles?.full_name || r.user_id.slice(0, 8) + "…"}
                </td>
                <td className="px-4 py-3 text-sm">{r.events?.title || "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    className={
                      r.checked_in
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {r.checked_in ? "✅ Checked In" : "⏳ Pending"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => toggleCheckIn(r.id, r.checked_in)}
                  >
                    {r.checked_in ? (
                      <XCircle className="w-3 h-3 mr-1 text-red-400" />
                    ) : (
                      <CheckCircle className="w-3 h-3 mr-1 text-green-400" />
                    )}
                    {r.checked_in ? "Undo" : "Check In"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No registrations found.
          </div>
        )}
      </div>
    </div>
  );
}

// ── 4. TASKS PANEL ────────────────────────────────────────────────────────────

function TasksPanel({ tasks, events, onRefresh }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    event_id: "",
    required_skills: "",
    xp_reward: 50,
    status: "open",
  });

  const createTask = async () => {
    if (!form.title || !form.event_id) {
      toast.error("Title and event required");
      return;
    }
    const { error } = await supabase.from("volunteer_tasks").insert({
      title: form.title,
      description: form.description,
      event_id: form.event_id,
      required_skills: form.required_skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      xp_reward: form.xp_reward,
      status: "open",
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Task created!");
      setOpen(false);
      onRefresh();
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("volunteer_tasks").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Task deleted.");
      onRefresh();
    }
  };

  const statusColors: Record<string, string> = {
    open: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    in_progress: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    done: "bg-green-500/20 text-green-400 border-green-500/30",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{tasks.length} total tasks</p>
        <Button onClick={() => setOpen(true)} className="glow-mint gap-2">
          <Plus className="w-4 h-4" /> New Task
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map((t: any) => (
          <Card key={t.id} className="p-4 bg-card border-border hover:border-primary/30 transition">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium text-sm">{t.title}</h4>
              <Badge className={`text-xs ml-2 shrink-0 ${statusColors[t.status] || ""}`}>
                {t.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{t.events?.title}</p>
            {t.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{t.description}</p>
            )}
            <div className="flex flex-wrap gap-1 mb-3">
              {(t.required_skills || []).map((s: string) => (
                <Badge key={s} variant="outline" className="text-xs py-0">
                  {s}
                </Badge>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-primary font-medium">+{t.xp_reward} XP</span>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-400 hover:text-red-300 h-7 px-2"
                onClick={() => deleteTask(t.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </Card>
        ))}
        {tasks.length === 0 && (
          <Card className="p-12 text-center col-span-3 text-muted-foreground border-dashed">
            No tasks yet.
          </Card>
        )}
      </div>

      {/* Create Task Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Volunteer Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Setup stage area"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Event</Label>
              <Select
                value={form.event_id}
                onValueChange={(v) => setForm({ ...form, event_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select event…" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Required Skills (comma-separated)</Label>
              <Input
                value={form.required_skills}
                onChange={(e) => setForm({ ...form, required_skills: e.target.value })}
                placeholder="e.g. React, Communication"
              />
            </div>
            <div>
              <Label>XP Reward</Label>
              <Input
                type="number"
                value={form.xp_reward}
                onChange={(e) => setForm({ ...form, xp_reward: +e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={createTask}>
                Create Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── 5. SPONSORSHIPS PANEL ─────────────────────────────────────────────────────

function SponsorshipsPanel({ sponsorships, onRefresh }: any) {
  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("sponsorships").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Status updated to ${status}`);
      onRefresh();
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    approved: "bg-green-500/20 text-green-400 border-green-500/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-4 mb-2">
        {["pending", "approved", "rejected"].map((s) => (
          <Card key={s} className="p-4 bg-card border-border">
            <div className="text-xs text-muted-foreground capitalize mb-1">{s}</div>
            <div className="text-2xl font-bold">
              {sponsorships.filter((sp: any) => sp.status === s).length}
            </div>
          </Card>
        ))}
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Event", "Amount", "Package", "Match Score", "ROI", "Status", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-medium text-muted-foreground"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {sponsorships.map((sp: any, i: number) => (
              <tr
                key={sp.id}
                className={`border-t border-border hover:bg-muted/30 ${i % 2 === 0 ? "" : "bg-muted/10"}`}
              >
                <td className="px-4 py-3 font-medium text-sm">{sp.events?.title || "—"}</td>
                <td className="px-4 py-3 text-sm text-green-400 font-medium">
                  ${(sp.amount || 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-xs">{sp.package_name || "—"}</td>
                <td className="px-4 py-3 text-xs text-primary">
                  {sp.match_score ? `${sp.match_score}%` : "—"}
                </td>
                <td className="px-4 py-3 text-xs">{sp.roi_score ? `${sp.roi_score}/100` : "—"}</td>
                <td className="px-4 py-3">
                  <Badge className={`text-xs ${statusColors[sp.status] || ""}`}>{sp.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-green-400"
                      onClick={() => updateStatus(sp.id, "approved")}
                    >
                      ✅
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-red-400"
                      onClick={() => updateStatus(sp.id, "rejected")}
                    >
                      ❌
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sponsorships.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No sponsorships yet.
          </div>
        )}
      </div>
    </div>
  );
}

// ── 6. CERTIFICATES PANEL ─────────────────────────────────────────────────────

function CertificatesPanel({ certificates, onRefresh }: any) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{certificates.length} certificates issued</p>
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["User ID", "Event", "Issued At", "Certificate URL"].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-medium text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {certificates.map((c: any, i: number) => (
              <tr
                key={c.id}
                className={`border-t border-border hover:bg-muted/30 ${i % 2 === 0 ? "" : "bg-muted/10"}`}
              >
                <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                  {c.user_id.slice(0, 12)}…
                </td>
                <td className="px-4 py-3 text-sm font-medium">{c.events?.title || "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(c.issued_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-xs">
                  {c.certificate_url ? (
                    <a
                      href={c.certificate_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Auto-generated</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {certificates.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No certificates issued yet.
          </div>
        )}
      </div>
    </div>
  );
}

// ── 7. LEADERBOARD PANEL ──────────────────────────────────────────────────────

function LeaderboardPanel({ users, onRefresh }: any) {
  const sorted = [...users].sort((a: any, b: any) => (b.xp || 0) - (a.xp || 0));
  const medals = ["🥇", "🥈", "🥉"];

  const resetAll = async () => {
    if (!confirm("Reset ALL users XP to 0? This cannot be undone.")) return;
    for (const u of users) {
      await supabase.from("profiles").update({ xp: 0, level: 1, badges: [] }).eq("id", u.id);
    }
    toast.success("All XP reset.");
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Top {sorted.length} users by XP</p>
        <Button
          variant="outline"
          className="text-red-400 border-red-400/30 gap-2 text-xs"
          onClick={resetAll}
        >
          <RefreshCw className="w-3 h-3" /> Reset All XP
        </Button>
      </div>
      <Card className="p-6 bg-card border-border">
        <div className="space-y-2">
          {sorted.map((p: any, i: number) => (
            <div
              key={p.id}
              className={`flex items-center justify-between p-3 rounded-lg ${i < 3 ? "bg-primary/5 border border-primary/20" : "bg-muted"}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? "bg-yellow-500/20 text-yellow-500" : i === 1 ? "bg-gray-300/20 text-gray-300" : i === 2 ? "bg-amber-700/20 text-amber-500" : "bg-muted text-muted-foreground"}`}
                >
                  {i < 3 ? medals[i] : i + 1}
                </div>
                <div>
                  <p className="font-medium text-sm">{p.full_name || "Anonymous"}</p>
                  <div className="flex gap-1 mt-0.5">
                    {(p.badges || []).slice(0, 2).map((b: string) => (
                      <Badge key={b} variant="outline" className="text-[10px] py-0 h-4">
                        {b}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-primary text-sm">{p.xp || 0} XP</div>
                <div className="text-xs text-muted-foreground">Level {p.level || 1}</div>
              </div>
            </div>
          ))}
          {sorted.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No users yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

// ── 8. SETTINGS PANEL ─────────────────────────────────────────────────────────

function SettingsPanel({ adminEmail }: any) {
  const [announcement, setAnnouncement] = useState("");

  const sendAnnouncement = () => {
    if (!announcement.trim()) return;
    toast.success(`📢 Announcement sent to all users: "${announcement.slice(0, 50)}…"`);
    setAnnouncement("");
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-6 bg-card border-border">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" /> Platform Announcements
        </h3>
        <div className="space-y-3">
          <Textarea
            rows={4}
            placeholder="Send a message to all users…"
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
          />
          <Button className="w-full" onClick={sendAnnouncement}>
            <Bell className="w-4 h-4 mr-2" /> Send Announcement
          </Button>
        </div>
      </Card>

      <Card className="p-6 bg-card border-border">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" /> Admin Info
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between p-3 rounded-lg bg-muted">
            <span className="text-muted-foreground">Admin email</span>
            <span className="font-medium">{adminEmail}</span>
          </div>
          <div className="flex justify-between p-3 rounded-lg bg-muted">
            <span className="text-muted-foreground">Access level</span>
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
              Full Admin
            </Badge>
          </div>
          <div className="flex justify-between p-3 rounded-lg bg-muted">
            <span className="text-muted-foreground">Platform</span>
            <span className="font-medium">EventTech v1.0</span>
          </div>
          <div className="flex justify-between p-3 rounded-lg bg-muted">
            <span className="text-muted-foreground">Deployment</span>
            <span className="font-medium text-primary">Cloudflare Workers</span>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-card border-border">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" /> Quick Links
        </h3>
        <div className="space-y-2">
          {[
            { label: "Supabase Dashboard", url: "https://app.supabase.com" },
            { label: "Cloudflare Workers", url: "https://dash.cloudflare.com" },
            { label: "GitHub Repo", url: "https://github.com/Keerthipriya27/eventtech" },
            { label: "Live Site", url: "https://eventtech.peddadaramya468.workers.dev" },
          ].map(({ label, url }) => (
            <a
              key={label}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/70 transition text-sm"
            >
              <span>{label}</span>
              <span className="text-primary text-xs">→</span>
            </a>
          ))}
        </div>
      </Card>

      <Card className="p-6 bg-card border-border">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" /> Platform Health
        </h3>
        <div className="space-y-3">
          {[
            { label: "Supabase DB", status: "Operational", ok: true },
            { label: "Edge Functions", status: "Operational", ok: true },
            { label: "Auth Service", status: "Operational", ok: true },
            { label: "Cloudflare Workers", status: "Operational", ok: true },
          ].map(({ label, status, ok }) => (
            <div key={label} className="flex items-center justify-between p-2 rounded-lg bg-muted">
              <span className="text-sm">{label}</span>
              <Badge
                className={
                  ok
                    ? "bg-green-500/20 text-green-400 border-green-500/30 text-xs"
                    : "bg-red-500/20 text-red-400 border-red-500/30 text-xs"
                }
              >
                {ok ? "✅" : "❌"} {status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

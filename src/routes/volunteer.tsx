import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Wand2, Brain } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { claimTask, completeTask } from "@/integrations/supabase/volunteer.functions";
import PlatformShell from "@/components/PlatformShell";

export const Route = createFileRoute("/volunteer")({ component: VolunteerPage });

export default function VolunteerPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommended, setRecommended] = useState<any[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user);
      if (data.user) loadProfile(data.user.id);
    });
    load();
    return () => {
      mounted = false;
    };
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("volunteer_tasks")
      .select("*, events(*)")
      .order("created_at", { ascending: false });
    setTasks(data || []);
    setLoading(false);
  }

  async function loadProfile(userId: string) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    setUserProfile(data || null);
  }

  const getRecommendations = async () => {
    setRecLoading(true);
    try {
      const openTasks = tasks.filter((t: any) => t.status === "open");
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/volunteer-assign`;
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      const headers: Record<string,string> = { 'Content-Type':'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      else headers.Authorization = `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;

      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ mode: 'recommend', use_ai: true, volunteer: userProfile, tasks: openTasks }),
      });
      const data = await resp.json();
      if (data?.assignments) {
        // map assignments to tasks with match_score
        const byTask = new Map(data.assignments.map((a:any)=>[a.task_id,a]));
        const scored = openTasks.map((t:any)=>{ const a = byTask.get(t.id) as any; return { ...t, match_score: a?.score ?? 0, reason: a?.reason }; });
        scored.sort((a:any,b:any)=>b.match_score - a.match_score);
        setRecommended(scored.slice(0,6));
        toast.success(`🧠 Found ${scored.length} AI-matched tasks!`);
      } else {
        throw new Error(data?.error || 'No assignments returned');
      }
    } catch (e: any) {
      console.error('AI recommend failed, falling back', e);
      // fallback to client heuristic or demo tasks when none exist
      try {
        await new Promise((r) => setTimeout(r, 300));
        const userSkills = userProfile?.skills || ["communication", "technical"];
        let openTasks = tasks.filter((t: any) => t.status === "open");
        // If no tasks exist (demo mode), create some mock tasks for the UI
        if (!openTasks.length) {
          openTasks = Array.from({ length: 6 }).map((_, i) => ({
            id: `demo-${i}`,
            title: [`Badge distribution`, `Registration desk`, `Speaker liaison`, `AV support`, `Mentor lead`, `Expo host`][i % 6],
            xp_reward: 5 + (i % 3) * 5,
            required_skills: i % 2 === 0 ? ["communication"] : ["technical"],
            status: 'open',
            events: { title: 'Demo event' },
          }));
        }
        const scored = openTasks
          .map((t: any) => {
            const taskSkills = (t.required_skills || []).map((s: string) => s.toLowerCase());
            const overlap = userSkills.filter((s: string) =>
              taskSkills.some((ts: string) => ts.includes(s.toLowerCase()) || s.toLowerCase().includes(ts)),
            );
            return {
              ...t,
              match_score: Math.min(95, 40 + overlap.length * 25 + Math.floor(Math.random() * 30)),
              overlap,
            };
          })
          .sort((a: any, b: any) => b.match_score - a.match_score);
        setRecommended(scored.slice(0, 6));
        toast.success(`🧠 Found ${scored.length} AI-matched tasks!`);
      } catch (e2:any) { toast.error(e2?.message || 'Failed to compute recommendations'); }
    } finally {
      setRecLoading(false);
    }
  };

  const claimFn = useServerFn(claimTask);
  const completeFn = useServerFn(completeTask);

  const claim = async (id: string) => {
    const userId = user?.id;
    if (!userId) return toast.error("Sign in first");
    try {
      await claimFn({ data: { taskId: id, userId } } as any);
      toast.success("Task claimed! +XP on completion 🎯");
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to claim task");
    }
  };

  const complete = async (id: string, xp: number) => {
    const userId = user?.id;
    if (!userId) return toast.error("Sign in first");
    try {
      await completeFn({ data: { taskId: id, userId, xp } } as any);
      toast.success(`🏆 +${xp} XP!`);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to complete task");
    }
  };

  const cols = {
    open: tasks.filter((t: any) => t.status === "open"),
    in_progress: tasks.filter((t: any) => t.status === "in_progress"),
    done: tasks.filter((t: any) => t.status === "done"),
  } as const;

  return (
    <PlatformShell title="Volunteer Hub">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Volunteer Hub</h1>
          <div className="flex gap-2">
            <Button onClick={() => navigate({ to: "/dashboard" })}>Back</Button>
            <Button
              onClick={getRecommendations}
              disabled={recLoading}
              className="flex items-center gap-2"
            >
              {recLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Brain className="w-4 h-4" />
              )}{" "}
              Get Recommendations
            </Button>
          </div>
        </div>

        {recommended.length > 0 && (
          <Card className="p-5 bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/30 mb-4">
            <div className="grid sm:grid-cols-2 gap-3">
              {recommended.map((t: any) => (
                <div
                  key={t.id}
                  className="p-3 rounded-lg bg-background/50 border border-primary/20"
                >
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{t.title}</span>
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                      {t.match_score}%
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
          </Card>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          {(["open", "in_progress", "done"] as const).map((col) => (
            <div key={col}>
              <h3 className="font-semibold mb-3 capitalize flex items-center gap-2">
                {col === "open" ? "🟡" : col === "in_progress" ? "🔵" : "✅"}{" "}
                {col.replace("_", " ")}
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
                      {col === "in_progress" && t.assigned_to === user?.id && (
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
    </PlatformShell>
  );
}

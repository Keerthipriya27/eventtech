import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trackEvent } from "@/lib/telemetry";
import PlatformShell from "@/components/PlatformShell";

type Match = {
  event_id: string;
  match_score: number;
  roi_score: number;
  predicted_impressions?: number;
  recommended_package?: string;
  reasoning?: string;
};

export const Route = createFileRoute("/sponsor")({ component: SponsorPage });

export default function SponsorPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [industry, setIndustry] = useState("Technology");
  const [budget, setBudget] = useState(10000);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [matching, setMatching] = useState(false);
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [proposals, setProposals] = useState<Record<string,string>>({});
  const [proposalLoading, setProposalLoading] = useState<Record<string,boolean>>({});

  useEffect(() => {
    load();
  }, []);
  async function load() {
    setLoadingEvents(true);
    try {
      const { data } = await supabase.from("events").select("*").limit(20);
      setEvents(data || []);
    } catch (e) {
      console.error("Failed to load events", e);
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }

  return (
    <PlatformShell title="Sponsor Center">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Sponsor Center</h2>
          <div className="flex gap-2">
            <Button onClick={() => navigate({ to: "/dashboard" })}>Back</Button>
          </div>
        </div>
        <Card className="p-4 mb-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>Industry</Label>
              <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
            </div>
            <div>
              <Label>Budget</Label>
              <Input type="number" value={budget} onChange={(e) => setBudget(+e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={runMatch} disabled={matching}>
                {matching ? "Matching…" : "Run Match"}
              </Button>
            </div>
          </div>
        </Card>

        {matches && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Matches</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {matches.length === 0 && <div className="text-sm text-muted-foreground">No matches found.</div>}
              {matches.map((m) => {
                const ev = events.find((e) => e.id === m.event_id);
                return (
                  <Card key={m.event_id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold">{ev?.title || m.event_id}</h4>
                        <p className="text-xs text-muted-foreground">{ev?.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary">{m.match_score}%</div>
                        <div className="text-xs text-muted-foreground">ROI {m.roi_score}%</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">{m.reasoning}</div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs">Package: {m.recommended_package}</span>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => generateProposal(m.event_id, ev, m.recommended_package)} disabled={proposalLoading[m.event_id]}>
                          {proposalLoading[m.event_id] ? 'Generating…' : 'Generate Proposal'}
                        </Button>
                        {connected.has(m.event_id) ? (
                          <Button size="sm" disabled>
                            Requested
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => connectEvent(m.event_id, ev?.title)}>
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                    {proposals[m.event_id] && (
                      <div className="mt-3 p-3 bg-muted/10 border border-muted rounded text-sm">
                        <div className="whitespace-pre-wrap">{proposals[m.event_id]}</div>
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(proposals[m.event_id])}>
                            Copy
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {loadingEvents ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="h-4 w-3/4 bg-muted rounded skeleton mb-2" />
                <div className="h-3 w-full bg-muted rounded skeleton mb-4" />
                <div className="flex justify-between items-center">
                  <span className="h-3 w-24 bg-muted rounded skeleton" />
                  <div className="h-8 w-20 bg-muted rounded skeleton" />
                </div>
              </Card>
            ))
          ) : events.length === 0 ? (
            <div className="text-sm text-muted-foreground">No events available.</div>
          ) : (
            events.map((ev) => (
              <Card key={ev.id} className="p-4">
                <h4 className="font-semibold">{ev.title}</h4>
                <p className="text-xs text-muted-foreground mb-2">{ev.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs">{ev.category}</span>
                  {connected.has(ev.id) ? (
                    <Button size="sm" disabled>
                      Requested
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => connectEvent(ev.id, ev.title)}>
                      Connect
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </PlatformShell>
  );

  async function runMatch() {
    setMatching(true);
    try {
      const sessionResp = await supabase.auth.getSession();
      const sponsor_id = sessionResp?.data?.session?.user?.id ?? null;
      if (!sponsor_id) {
        toast.error("Please sign in to run sponsor matching.");
        navigate({ to: "/auth" });
        setMatching(false);
        return;
      }
      // Call sponsor-ranking function for each event in parallel and aggregate scores
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const candidates = events.slice(0, 50);
      const calls = candidates.map((ev) =>
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sponsor-ranking`, {
          method: "POST",
          headers,
          body: JSON.stringify({ event_id: ev.id, sponsor_profile: { industry, budget } }),
        })
          .then((r) => r.json())
          .then((res) => ({ event_id: ev.id, score: res?.score ?? 0, confidence: res?.confidence ?? 0, explanation: res?.explanation ?? [], event: ev }))
          .catch((e) => {
            console.error("sponsor-ranking call failed", e);
            return { event_id: ev.id, score: 0, confidence: 0, explanation: [], event: ev };
          })
      );

      const results = await Promise.all(calls);
      // Map into match format expected by UI
      const mapped: Match[] = results
        .map((r) => ({ event_id: r.event_id, match_score: Math.round((r.score || 0) * 1), roi_score: Math.round((r.score || 0) * 0.9), predicted_impressions: undefined, recommended_package: undefined, reasoning: r.explanation?.map((x:any)=>`${x.feature}:${x.impact}`).join(", ") }))
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 20);

      setMatches(mapped);
    } catch (e: any) {
      toast.error(e.message || "Match failed");
    } finally {
      setMatching(false);
    }
  }

  async function connectEvent(eventId: string, title?: string) {
    try {
      const sessionResp = await supabase.auth.getSession();
      const userId = sessionResp?.data?.session?.user?.id;
      if (!userId) {
        toast.error("Please sign in to request a connection.");
        navigate({ to: "/auth" });
        return;
      }
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sponsor-request`;
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ sponsor_id: userId, event_id: eventId, event_title: title }),
      });
      const data = await resp.json();
      if (!resp.ok || data?.error) throw new Error(data?.error || "Request failed");

      setConnected((prev) => new Set([...prev, eventId]));
      toast.success(`🤝 Connection request sent for "${title || eventId}"`);
      trackEvent("sponsor_request.submitted", { actor_id: userId, event_id: eventId });
    } catch (e: any) {
      console.error("Sponsor request failed", e);
      toast.error(e?.message || "Failed to send connection request");
    }
  }

  async function generateProposal(eventId: string, event: any, recommended_package?: string) {
    try {
      setProposalLoading((p) => ({ ...p, [eventId]: true }));
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sponsor-proposal`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ sponsor: { id: session?.data?.session?.user?.id, name: session?.data?.session?.user?.user_metadata?.full_name }, event, recommended_package }),
      });
      const data = await resp.json();
      if (!resp.ok || data?.error) throw new Error(data?.error || 'Failed to generate proposal');
      setProposals((p) => ({ ...p, [eventId]: data.proposal }));
      toast.success('Proposal generated');
      trackEvent('sponsor.proposal.generated', { event_id: eventId });
    } catch (e: any) {
      console.error('proposal failed', e);
      toast.error(e?.message || 'Failed to generate proposal');
    } finally {
      setProposalLoading((p) => ({ ...p, [eventId]: false }));
    }
  }
}

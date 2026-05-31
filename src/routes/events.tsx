import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, ArrowRight, Clock, MapPin, QrCode, ShieldCheck, Sparkles, Ticket, Trophy, Zap } from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/telemetry";

export const Route = createFileRoute("/events")({ component: EventsList });

function QRImage({ value, size = 180 }: { value: string; size?: number }) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
  return <img src={url} alt="QR code" width={size} height={size} className="rounded-xl border border-border bg-white" />;
}

function EventsList() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<Record<string, any>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [user, setUser] = useState<any>(null);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [ticketModal, setTicketModal] = useState<{ title: string; html: string; qrValue: string } | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const [{ data: eventData }, { data: sessionData }] = await Promise.all([
      supabase.from("events").select("*").order("created_at", { ascending: false }),
      supabase.auth.getSession(),
    ]);
    setEvents(eventData || []);
    setUser(sessionData?.session?.user || null);
    if (sessionData?.session?.user) {
      const { data: regs } = await supabase.from("registrations").select("event_id").eq("user_id", sessionData.session.user.id);
      setRegisteredIds(new Set((regs || []).map((r: any) => r.event_id)));
    }
  }

  const categories = useMemo(() => {
    const values = Array.from(new Set(events.map((e) => e.category).filter(Boolean)));
    return ["All", ...values];
  }, [events]);

  const featuredHackathons = useMemo(() => {
    const hackathons = events.filter((e) => /hackathon/i.test(`${e.title} ${e.category} ${e.description}`));
    const source = hackathons.length ? hackathons : events;
    return source.slice(0, 3).map((e, index) => ({
      ...e,
      prize: ["₹2L Prize Pool", "Build with AI", "Internship Fast-Track"][index % 3],
      format: ["24h online", "36h hybrid", "48h in-person"][index % 3],
      badge: ["Featured Hackathon", "Open Challenge", "Campus Hackathon"][index % 3],
    }));
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => selectedCategory === "All" || e.category === selectedCategory);
  }, [events, selectedCategory]);

  async function registerForEvent(event: any) {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData?.session?.user;
    if (!currentUser) {
      navigate({ to: "/auth" });
      toast.info("Sign in to register for hackathons.");
      return;
    }

    setRegisteringId(event.id);
    try {
      const { data, error } = await supabase
        .from("registrations")
        .insert({ event_id: event.id, user_id: currentUser.id })
        .select("*")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Registration failed");

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/issue-ticket`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ registration_id: data.id }),
      });
      const ticket = await resp.json();
      const html = ticket?.ticket_html || `<html><body><h1>${event.title}</h1><p>Ticket generated.</p></body></html>`;
      const qrValue = data.qr_code || data.id;

      const blob = new Blob([html], { type: "text/html" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `ticket-${(event.title || event.id).replace(/\s+/g, "-")}.html`;
      a.click();

      setRegisteredIds((prev) => new Set([...prev, event.id]));
      setTicketModal({ title: event.title, html, qrValue });
      toast.success("Registered! QR ticket downloaded.");
      trackEvent("event.registered", { event_id: event.id, event_title: event.title });
    } catch (err: any) {
      console.error("registration failed", err);
      toast.error(err?.message || "Registration failed");
    } finally {
      setRegisteringId(null);
    }
  }

  return (
    <div className="min-h-screen events-bg et-frame text-foreground">
      <nav className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-bold">
            <div className="w-8 h-8 rounded-lg bg-primary glow-mint flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            EventTech
          </Link>
          <Link to="/auth">
            <Button size="sm">Sign in to register</Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-3 h-3" /> Back
        </Link>

        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6 items-center mb-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs">
              <QrCode className="w-3 h-3" /> Unstop-style hackathon discovery
            </div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Discover hackathons, workshops, and contests built for fast registration.
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Browse featured hackathons, predict success, and register with QR tickets in one flow.
            </p>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant={selectedCategory === cat ? "default" : "outline"}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          <Card className="p-5 bg-card border-border shadow-xl">
            <div className="flex items-center gap-2 text-xs text-primary mb-3">
              <Ticket className="w-4 h-4" /> Quick QR registration
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-muted/40 border border-border">
                <div className="font-medium mb-1">1. Open hackathon</div>
                <div className="text-muted-foreground">Find a challenge and tap register.</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border">
                <div className="font-medium mb-1">2. QR ticket</div>
                <div className="text-muted-foreground">Get a downloadable QR ticket instantly.</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 mb-10">
          {featuredHackathons.map((event) => (
            <Card key={event.id} className="p-5 bg-gradient-to-br from-card to-primary/5 border-primary/20 hover:border-primary/40 transition">
              <div className="flex items-center justify-between mb-3 gap-2">
                <Badge className="bg-primary/15 text-primary border-primary/20">{event.badge}</Badge>
                <Badge variant="outline">{event.format}</Badge>
              </div>
              <h3 className="text-xl font-semibold mb-1">{event.title}</h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{event.description}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 flex-wrap">
                <span className="inline-flex items-center gap-1"><Trophy className="w-3 h-3" /> {event.prize}</span>
                {event.start_date && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(event.start_date).toLocaleDateString()}</span>}
                {event.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.location}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="glow-mint" onClick={() => registerForEvent(event)} disabled={registeringId === event.id}>
                  {registeringId === event.id ? "Registering…" : registeredIds.has(event.id) ? "Registered" : "Register with QR"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedCategory(event.category || "All")}>Explore similar</Button>
              </div>
            </Card>
          ))}
        </div>

        <h2 className="text-2xl font-bold mb-4">All events</h2>
        {!events.length ? (
          <Card className="p-12 text-center text-muted-foreground">No events yet.</Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvents.map((e) => (
              <Card key={e.id} className="p-5 bg-card hover:border-primary/50 transition">
                <div className="flex justify-between mb-2 gap-2">
                  <Badge variant="outline">{e.category}</Badge>
                  {e.intelligence_score > 0 && (
                    <div className="flex items-center gap-1 text-xs text-primary">
                      <Zap className="w-3 h-3" /> {e.intelligence_score}
                    </div>
                  )}
                </div>
                <h3 className="font-semibold mb-1">{e.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{e.description}</p>
                {e.start_date && <p className="text-xs text-muted-foreground">📅 {new Date(e.start_date).toLocaleDateString()}</p>}
                {e.location && <p className="text-xs text-muted-foreground">📍 {e.location}</p>}
                {predictions[e.id] ? (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <div>
                      Success: <strong className="text-primary">{Math.round(predictions[e.id].success_probability * 100)}%</strong>
                    </div>
                    {predictions[e.id].recommended_actions?.length > 0 && (
                      <div className="text-xs mt-1">Actions: {predictions[e.id].recommended_actions.join(", ")}</div>
                    )}
                  </div>
                ) : null}
                <div className="mt-3 flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/event-predictor`;
                        const session = await supabase.auth.getSession();
                        const token = session?.data?.session?.access_token;
                        const resp = await fetch(url, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: token ? `Bearer ${token}` : `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                          },
                          body: JSON.stringify({ event: e }),
                        });
                        const data = await resp.json();
                        if (data?.error) throw new Error(data.error);
                        setPredictions((prev) => ({ ...prev, [e.id]: data }));
                        trackEvent("event.predict", { event_id: e.id, probability: data.success_probability });
                      } catch (err: any) {
                        const demo = {
                          success_probability: 0.6,
                          risk_factors: ["low_registration_velocity", "late_marketing"],
                          recommended_actions: ["Run targeted social ads", "Offer student discount"],
                        };
                        setPredictions((prev) => ({ ...prev, [e.id]: demo }));
                        toast(`Demo prediction: ${(demo.success_probability * 100).toFixed(0)}%`, { icon: "🔮" });
                        console.error("prediction failed", err);
                      }
                    }}
                  >
                    Predict Success
                  </Button>
                  <Button
                    size="sm"
                    variant={registeredIds.has(e.id) ? "outline" : "default"}
                    onClick={() => registerForEvent(e)}
                    disabled={registeringId === e.id}
                  >
                    <QrCode className="w-3 h-3 mr-1" />
                    {registeredIds.has(e.id) ? "Registered" : "QR Register"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!ticketModal} onOpenChange={(open) => !open && setTicketModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>QR Ticket for {ticketModal?.title}</DialogTitle>
          </DialogHeader>
          {ticketModal && (
            <div className="grid md:grid-cols-[220px_1fr] gap-4 items-start">
              <div className="p-4 rounded-xl border border-border bg-white flex justify-center">
                <QRImage value={ticketModal.qrValue} size={190} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Scan this QR at check-in or present the downloaded ticket HTML.
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border border-border text-sm whitespace-pre-wrap max-h-64 overflow-auto">
                  {ticketModal.html}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => {
                      const blob = new Blob([ticketModal.html], { type: "text/html" });
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = `ticket-${ticketModal.title.replace(/\s+/g, "-")}.html`;
                      a.click();
                    }}
                  >
                    <ArrowRight className="w-4 h-4 mr-2" /> Download again
                  </Button>
                  <Button variant="outline" onClick={() => setTicketModal(null)}>Close</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

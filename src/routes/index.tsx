import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SplashScreen from "@/components/SplashScreen";
import {
  Sparkles,
  Trophy,
  Target,
  Users,
  Brain,
  Zap,
  BarChart3,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("eventtech_splash_seen");
    if (!seen) setShowSplash(true);
  }, []);

  const finishSplash = () => {
    sessionStorage.setItem("eventtech_splash_seen", "true");
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onFinish={finishSplash} duration={5000} />;
  }

  return (
    <div className="min-h-screen bg-event-vibrant text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg">
            <div className="w-8 h-8 rounded-lg bg-primary glow-mint flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            EventTech
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="glow-mint">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-mesh">
        <div className="max-w-7xl mx-auto px-6 pt-24 pb-32 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs text-primary mb-6">
            <Zap className="w-3 h-3" /> AI-powered Event Operating System
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            The intelligent <span className="text-gradient">event ecosystem</span>
            <br />
            for the next decade.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            EventTech connects organizers, volunteers, sponsors, and participants in one AI-powered
            platform. Build, match, gamify, and measure — all in real time.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="glow-mint">
                Launch your event <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/events">
              <Button size="lg" variant="outline">
                Browse events
              </Button>
            </Link>
          </div>

          {/* Stat strip */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { v: "94%", l: "AI prediction accuracy" },
              { v: "3.2×", l: "Sponsor ROI lift" },
              { v: "50K+", l: "Volunteers gamified" },
              { v: "<2s", l: "Event launch time" },
            ].map((s) => (
              <div key={s.l} className="p-5 rounded-xl bg-card/40 border border-border">
                <div className="text-3xl font-bold text-primary">{s.v}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-bold mb-3">Built for everyone in the room</h2>
          <p className="text-muted-foreground">One platform. Four superpowers.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              icon: Brain,
              title: "Organizers",
              desc: "AI Event Builder generates timelines, budgets, and marketing copy in seconds.",
              color: "from-emerald-400 to-teal-500",
            },
            {
              icon: Trophy,
              title: "Volunteers",
              desc: "XP, badges, leaderboards, and a portable Skill Passport for every event.",
              color: "from-amber-400 to-orange-500",
            },
            {
              icon: Target,
              title: "Sponsors",
              desc: "Smart matching with ROI prediction and engagement intelligence.",
              color: "from-violet-400 to-fuchsia-500",
            },
            {
              icon: Users,
              title: "Participants",
              desc: "Discover events, QR tickets, certificates, and live networking.",
              color: "from-sky-400 to-blue-500",
            },
          ].map((r) => (
            <Card
              key={r.title}
              className="p-6 bg-card border-border hover:border-primary/50 transition-all hover:-translate-y-1"
            >
              <div
                className={`w-10 h-10 rounded-lg bg-gradient-to-br ${r.color} flex items-center justify-center mb-4`}
              >
                <r.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{r.title}</h3>
              <p className="text-sm text-muted-foreground">{r.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Feature deep */}
      <section className="bg-card/30 border-y border-border py-24">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-xs text-primary mb-3">
              <Brain className="w-3 h-3" /> CORE INNOVATION
            </div>
            <h2 className="text-4xl font-bold mb-4">
              An AI Copilot that
              <br />
              actually runs your event.
            </h2>
            <p className="text-muted-foreground mb-6">
              Ask anything. Predict risks. Optimize budgets. Auto-generate reports. Your event ops,
              on autopilot.
            </p>
            <ul className="space-y-3">
              {[
                "Event Intelligence Score for every launch",
                "Real-time risk detection & sponsor gap alerts",
                "Smart budget planner with cost optimization",
                "Skill-based volunteer auto-assignment",
              ].map((f) => (
                <li key={f} className="flex gap-2 items-start text-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {f}
                </li>
              ))}
            </ul>
          </div>
          <Card className="p-6 bg-background border-border glow-mint">
            <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Copilot · live
            </div>
            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-lg bg-muted">
                How can I boost registrations for my AI workshop next week?
              </div>
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                <p className="mb-2">Based on similar events, here's your action plan:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Post LinkedIn teaser by Tue 10am (peak window)</li>
                  <li>Email past attendees of "ML Bootcamp" — 38% conversion</li>
                  <li>Offer 2-for-1 student tickets (predicted +45 signups)</li>
                </ul>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <BarChart3 className="w-3 h-3 text-primary" /> Forecasted attendance: 142 (+27%)
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-4">Ready to run smarter events?</h2>
        <p className="text-muted-foreground mb-8">Free to start. Built to scale.</p>
        <Link to="/auth">
          <Button size="lg" className="glow-mint">
            Create your account <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © 2026 EventTech · Intelligent Event Ecosystem
      </footer>
    </div>
  );
}

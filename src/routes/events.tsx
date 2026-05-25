import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/events")({ component: EventsList });

function EventsList() {
  const [events, setEvents] = useState<any[]>([]);
  useEffect(() => { supabase.from("events").select("*").order("created_at", { ascending: false }).then(({ data }) => setEvents(data || [])); }, []);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-bold">
            <div className="w-8 h-8 rounded-lg bg-primary glow-mint flex items-center justify-center"><Sparkles className="w-4 h-4 text-primary-foreground" /></div>
            EventTech
          </Link>
          <Link to="/auth"><Button size="sm">Sign in to register</Button></Link>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="w-3 h-3" /> Back</Link>
        <h1 className="text-4xl font-bold mb-2">Discover events</h1>
        <p className="text-muted-foreground mb-8">{events.length} events on EventTech</p>
        {!events.length ? <Card className="p-12 text-center text-muted-foreground">No events yet.</Card> : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map(e => (
              <Card key={e.id} className="p-5 bg-card hover:border-primary/50 transition">
                <div className="flex justify-between mb-2">
                  <Badge variant="outline">{e.category}</Badge>
                  {e.intelligence_score > 0 && <div className="flex items-center gap-1 text-xs text-primary"><Zap className="w-3 h-3" /> {e.intelligence_score}</div>}
                </div>
                <h3 className="font-semibold mb-1">{e.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{e.description}</p>
                {e.start_date && <p className="text-xs text-muted-foreground">📅 {new Date(e.start_date).toLocaleDateString()}</p>}
                {e.location && <p className="text-xs text-muted-foreground">📍 {e.location}</p>}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

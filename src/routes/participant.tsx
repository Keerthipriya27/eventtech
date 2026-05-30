import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/participant")({ component: ParticipantPage });

export default function ParticipantPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);
  async function load() {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setEvents(data || []);
  }

  return (
    <div className="min-h-screen bg-event-vibrant text-foreground p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Participant</h1>
          <div className="flex gap-2">
            <Button onClick={() => navigate({ to: "/dashboard" })}>Back</Button>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {events.map((ev) => (
            <Card key={ev.id} className="p-4">
              <h4 className="font-semibold">{ev.title}</h4>
              <p className="text-xs text-muted-foreground mb-2">{ev.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs">{ev.category}</span>
                <Button size="sm" onClick={() => toast("Registering...")}>
                  Register
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

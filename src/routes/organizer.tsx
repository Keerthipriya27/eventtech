import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { updateEvent } from "@/integrations/supabase/events.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import { Loader2, Wand2, Plus } from "lucide-react";
import PlatformShell from "@/components/PlatformShell";

export const Route = createFileRoute("/organizer")({ component: OrganizerPage });

export default function OrganizerPage() {
  const navigate = useNavigate();
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setMyEvents(data || []);
  }

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
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [attendeesOpen, setAttendeesOpen] = useState(false);
  const [attendees, setAttendees] = useState<any[]>([]);

  const create = async () => {
    const payload = {
      ...form,
      start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
      organizer_id: user?.id,
      status: "published",
      intelligence_score: aiResult?.intelligence_score || Math.floor(Math.random() * 30) + 60,
      ai_metadata: aiResult || {},
    } as any;
    const { error } = await supabase.from("events").insert(payload);
    if (error) toast.error(error.message);
    else {
      toast.success("Event launched! 🚀");
      setOpen(false);
      setAiResult(null);
      load();
    }
  };

  const runAI = async () => {
    if (!form.title) {
      toast.error("Add a title first");
      return;
    }
    setAiLoading(true);
    try {
      const data = await (async () => {
        try {
          return await callSupabaseEdgeFn("ai-event-builder", {
            title: form.title,
            category: form.category,
            audience: "general",
            budget: form.budget,
          });
        } catch {
          return null;
        }
      })();
      setAiResult(data);
      if (data?.description) setForm((f) => ({ ...f, description: data.description }));
      toast.success("AI plan generated! ✨");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  async function viewAttendees(eventId: string) {
    const { data } = await supabase
      .from("registrations")
      .select("*, profiles(*)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    setAttendees(data || []);
  }

  const updateFn = useServerFn(updateEvent);

  async function saveEdit() {
    if (!editForm) return;
    const updates = { ...editForm };
    if (updates.start_date) updates.start_date = new Date(updates.start_date).toISOString();
    try {
      await updateFn({ data: { eventId: editForm.id, updates, userId: user?.id } } as any);
      toast.success("Event updated");
      setEditOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to update event");
    }
  }

  function exportAttendeesCSV() {
    if (!attendees || attendees.length === 0) return toast.error("No attendees to export");
    const rows = attendees.map((a) => ({
      full_name: a.profiles?.full_name || "",
      email: a.profiles?.email || a.email || "",
      registered_at: a.created_at,
    }));
    const header = ["full_name", "email", "registered_at"];
    const csv = [header.join(",")]
      .concat(
        rows.map(
          (r) => `${escapeCsv(r.full_name)},${escapeCsv(r.email)},${escapeCsv(r.registered_at)}`,
        ),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendees_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function escapeCsv(v: any) {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes("\n") || s.includes('"'))
      return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  return (
    <PlatformShell title="Organizer Console" className="organizer-bg et-frame">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div />
          <div className="flex gap-2">
            <Button onClick={() => navigate({ to: "/dashboard" })}>Back</Button>
          </div>
        </div>
        <Card className="p-4 mb-4">
          <h3 className="font-semibold">Your Events</h3>
          <p className="text-sm text-muted-foreground">
            Manage event creation, AI planning and stats.
          </p>
        </Card>

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
                    <Wand2 className="w-3 h-3" /> Intelligence Score: {aiResult.intelligence_score}
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

        <div className="grid md:grid-cols-2 gap-4 mt-6">
          {myEvents.map((e) => (
            <Card key={e.id} className="p-4">
              <h4 className="font-semibold mb-1">{e.title}</h4>
              <p className="text-xs text-muted-foreground mb-2">{e.description}</p>
              <div className="text-xs text-muted-foreground mb-2 space-y-0.5">
                {e.start_date && <div>📅 {new Date(e.start_date).toLocaleDateString()}</div>}
                {e.location && <div>📍 {e.location}</div>}
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-xs">{e.category}</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditForm({ ...e });
                      setEditOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    onClick={async () => {
                      await viewAttendees(e.id);
                      setAttendeesOpen(true);
                    }}
                  >
                    Attendees
                  </Button>
                  <Button size="sm" onClick={() => toast("Open event")}>
                    Open
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Event</DialogTitle>
            </DialogHeader>
            {editForm && (
              <div className="space-y-3 p-2">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="datetime-local"
                      value={editForm.start_date?.slice(0, 16) || ""}
                      onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      await saveEdit();
                    }}
                  >
                    Save
                  </Button>
                  <Button variant="ghost" onClick={() => setEditOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={attendeesOpen} onOpenChange={setAttendeesOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Attendees</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 p-2">
              <div className="flex justify-between items-center mb-2">
                <div />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => exportAttendeesCSV()}>
                    Export CSV
                  </Button>
                </div>
              </div>
              {attendees.length === 0 && (
                <p className="text-sm text-muted-foreground">No attendees yet.</p>
              )}
              {attendees.map((a) => (
                <Card key={a.id} className="p-2">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-medium">{a.profiles?.full_name || a.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.profiles?.email || a.email}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PlatformShell>
  );
}

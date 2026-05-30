import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate({ to: "/auth" });
        return;
      }
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(
        prof || {
          id: user.id,
          full_name: user.user_metadata?.full_name || "",
          bio: "",
          company: "",
          skills: [],
          role: user.user_metadata?.role || "participant",
        },
      );
    } catch (e: any) {
      toast.error(e.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  const save = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // Avoid writing unknown columns (like `role`) into the profiles table to prevent schema errors
      const payload: any = { ...profile };
      if (payload.role) delete payload.role;
      const { error } = await supabase.from("profiles").upsert(payload);
      if (error) throw error;
      // Update auth metadata (role/full_name) separately — this is stored in the auth user metadata
      try {
        await supabase.auth.updateUser({
          data: { role: profile.role || "", full_name: profile.full_name || "" },
        });
      } catch {
        // ignore auth metadata update errors
      }
      toast.success("Profile saved");
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">My Profile</h2>
      <Card className="p-6 space-y-4">
        <div>
          <Label>Full name</Label>
          <Input
            value={profile.full_name || ""}
            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
          />
        </div>
        <div>
          <Label>Company</Label>
          <Input
            value={profile.company || ""}
            onChange={(e) => setProfile({ ...profile, company: e.target.value })}
          />
        </div>
        <div>
          <Label>Bio</Label>
          <Textarea
            rows={3}
            value={profile.bio || ""}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
          />
        </div>
        <div>
          <Label>Skills (comma separated)</Label>
          <Input
            value={(profile.skills || []).join(", ")}
            onChange={(e) =>
              setProfile({
                ...profile,
                skills: e.target.value
                  .split(",")
                  .map((s: string) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
        <div>
          <Label>Role</Label>
          <Select
            value={profile.role || "participant"}
            onValueChange={(v) => setProfile({ ...profile, role: v })}
          >
            <SelectTrigger>
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
        <div className="flex gap-2">
          <Button onClick={save} className="flex-1">
            Save profile
          </Button>
          <Button variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
            Back
          </Button>
        </div>
      </Card>
    </div>
  );
}

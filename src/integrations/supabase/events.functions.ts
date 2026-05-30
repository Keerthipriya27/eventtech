import { createServerFn } from "@tanstack/react-start";
import { getSupabaseAdminClient } from "./client.server";

export const updateEvent = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }: any) => {
    const { eventId, updates, userId } = data as { eventId: string; updates: any; userId: string };
    if (!eventId) throw new Error("eventId required");
    const supabaseAdmin = getSupabaseAdminClient();
    // fetch event
    const { data: ev, error: fetchErr } = await supabaseAdmin
      .from("events")
      .select("id, organizer_id")
      .eq("id", eventId)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!ev) throw new Error("Event not found");
    if (ev.organizer_id !== userId) throw new Error("Forbidden: not organizer");
    // perform update
    const { error } = await supabaseAdmin.from("events").update(updates).eq("id", eventId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

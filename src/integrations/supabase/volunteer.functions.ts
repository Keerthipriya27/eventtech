import { createServerFn } from "@tanstack/react-start";
import { getSupabaseAdminClient } from "./client.server";

export const claimTask = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }: any) => {
    const { taskId, userId } = data as { taskId: string; userId: string };
    const supabaseAdmin = getSupabaseAdminClient();
    // Only claim if the task is currently unassigned to avoid race conditions
    const { data: updated, error } = await supabaseAdmin
      .from("volunteer_tasks")
      .update({ assigned_to: userId, status: "in_progress" })
      .eq("id", taskId)
      .is("assigned_to", null)
      .select("id")
      .limit(1);

    if (error) throw new Error(error.message);
    if (!updated || (Array.isArray(updated) && updated.length === 0))
      throw new Error("Task already claimed or does not exist");
    return { ok: true };
  });

export const completeTask = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }: any) => {
    const { taskId, userId, xp } = data as { taskId: string; userId: string; xp: number };
    const supabaseAdmin = getSupabaseAdminClient();
    // Ensure only the assigned user can mark it done
    const { data: task } = await supabaseAdmin
      .from("volunteer_tasks")
      .select("assigned_to")
      .eq("id", taskId)
      .single();
    if (!task) throw new Error("Task not found");
    if (task.assigned_to !== userId) throw new Error("Forbidden: not assigned to this user");

    const { error } = await supabaseAdmin
      .from("volunteer_tasks")
      .update({ status: "done" })
      .eq("id", taskId);
    if (error) throw new Error(error.message);
    // update profile xp/level
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("xp, level, badges")
      .eq("id", userId)
      .single();
    const newXp = (prof?.xp || 0) + (xp || 0);
    const newLevel = Math.floor(newXp / 200) + 1;
    const newBadges = Array.isArray(prof?.badges) ? [...prof!.badges] : [];
    if (newLevel > (prof?.level || 1) && !newBadges.includes(`Level ${newLevel}`))
      newBadges.push(`Level ${newLevel}`);
    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .update({ xp: newXp, level: newLevel, badges: newBadges })
      .eq("id", userId);
    if (upErr) throw new Error(upErr.message);
    return { ok: true };
  });

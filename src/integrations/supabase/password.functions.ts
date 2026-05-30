import { createServerFn } from "@tanstack/react-start";
import { getSupabaseAdminClient } from "./client.server";

export const serverSendReset = createServerFn({ method: "POST" })
  .inputValidator((d: any) => d)
  .handler(async ({ data }: any) => {
    const { email, redirectTo } = data as { email: string; redirectTo?: string };
    if (!email) throw new Error("email required");
    const supabaseAdmin = getSupabaseAdminClient();
    // Use admin client to send reset email (avoids client publishable-key rate limits)
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    return { ok: true };
  });

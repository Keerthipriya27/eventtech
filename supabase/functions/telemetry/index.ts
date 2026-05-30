const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function genInvocationId() {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

function logStructured(invocationId: string, level: string, message: string, extra: any = {}) {
  const out = { ts: new Date().toISOString(), invocationId, level, message, ...extra };
  console.log(JSON.stringify(out));
}

async function insertToSupabase(path: string, body: any) {
  const URL = `${Deno.env.get("SUPABASE_URL")}/rest/v1/${path}`;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY");
  if (!SERVICE_KEY) throw new Error("service role key missing (set SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY)");

  const resp = await fetch(URL, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`supabase insert ${path} failed: ${resp.status} ${text}`);
  }
  return resp.json();
}

Deno.serve(async (req) => {
  const invocationId = genInvocationId();
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { name, payload } = await req.json();
    logStructured(invocationId, "info", "telemetry_received", { name, actor_id: payload?.actor_id ?? null });
    await insertToSupabase("audit_logs", [
      { actor_id: payload?.actor_id ?? null, action: name, resource_type: payload?.resource_type ?? null, resource_id: payload?.resource_id ?? null, metadata: payload },
    ]);
    logStructured(invocationId, "info", "telemetry_inserted", { name });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    logStructured(invocationId, "error", "telemetry_error", { error: String(e) });
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

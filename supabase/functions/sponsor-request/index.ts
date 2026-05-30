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
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SERVICE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");

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
    const payload = await req.json();
    logStructured(invocationId, "info", "received_request", { url: req.url, headers: Object.fromEntries(req.headers) });
    const { sponsor_id, event_id, event_title, package: pkg, message } = payload;

    // Basic input validation
    if (!event_id) {
      logStructured(invocationId, "warn", "validation_failed", { reason: "missing_event_id" });
      return new Response(JSON.stringify({ error: "Missing event_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate the caller using the provided Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    // Verify token by calling Supabase auth user endpoint. Include service role apikey to ensure validation works from edge runtime.
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY");
    const userResp = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/user`, { headers: { Authorization: authHeader, apikey: SERVICE_KEY || "" } });
    if (!userResp.ok) {
      const txt = await userResp.text().catch(() => "");
      logStructured(invocationId, "error", "auth_user_check_failed", { status: userResp.status, body: txt });
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userJson = await userResp.json();
    const callerId = userJson?.id;
    if (!callerId) return new Response(JSON.stringify({ error: "Invalid token payload" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (sponsor_id && sponsor_id !== callerId) return new Response(JSON.stringify({ error: "sponsor_id mismatch" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Use the authenticated caller id as sponsor_id
    const effectiveSponsor = callerId;

    // Idempotency: check for an existing similar sponsor_request to avoid duplicates
    try {
      const checkUrl = `${Deno.env.get("SUPABASE_URL")}/rest/v1/sponsor_requests?select=*&sponsor_id=eq.${effectiveSponsor}&event_id=eq.${event_id}&package=eq.${encodeURIComponent(pkg || "")}&limit=1`;
      const checkResp = await fetch(checkUrl, { headers: { apikey: SERVICE_KEY!, Authorization: `Bearer ${SERVICE_KEY!}` } });
      if (checkResp.ok) {
        const existing = await checkResp.json();
        if (Array.isArray(existing) && existing.length > 0) {
          logStructured(invocationId, "info", "idempotent_return", { sponsor_request_id: existing[0].id });
          return new Response(JSON.stringify({ ok: true, sponsor_request: existing[0], idempotent: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    } catch (e) {
      logStructured(invocationId, "warn", "idempotency_check_failed", { error: String(e) });
    }

    // Insert sponsor_request
    const [sr] = await insertToSupabase("sponsor_requests", [
      { sponsor_id: effectiveSponsor, event_id, event_title, package: pkg, message, status: "pending" },
    ]);

    // Resolve event owners and create notifications for each owner
    try {
      const evUrl = `${Deno.env.get("SUPABASE_URL")}/rest/v1/events?id=eq.${event_id}&select=*,owner:owner_id(*)`;
      const evResp = await fetch(evUrl, { headers: { apikey: SERVICE_KEY!, Authorization: `Bearer ${SERVICE_KEY!}` } });
      if (evResp.ok) {
        const evData = await evResp.json();
        const owners = new Set();
        evData.forEach((e: any) => {
          if (e.owner_id) owners.add(e.owner_id);
        });
        // If no owners found, fallback to notify the sponsor (as before)
        if (owners.size === 0) owners.add(effectiveSponsor);

        const notifInserts = Array.from(owners).map((uid) => ({
          user_id: uid,
          type: "sponsor_request_received",
          payload: { sponsor_request_id: sr.id, event_id, sponsor_id: effectiveSponsor, message },
          channel: "in_app",
          status: "pending",
        }));
        await insertToSupabase("notifications", notifInserts);
      } else {
        // fallback: create generic notification for sponsor
        await insertToSupabase("notifications", [
          { user_id: effectiveSponsor, type: "sponsor_request_submitted", payload: { sponsor_request_id: sr.id, event_id }, channel: "in_app", status: "sent" },
        ]);
      }
    } catch (e) {
      console.error("Owner resolution failed", e);
      // fallback notification for sponsor
      await insertToSupabase("notifications", [
        { user_id: effectiveSponsor, type: "sponsor_request_submitted", payload: { sponsor_request_id: sr.id, event_id }, channel: "in_app", status: "sent" },
      ]);
    }

    // Audit log
    await insertToSupabase("audit_logs", [
      { actor_id: effectiveSponsor, action: "sponsor_request.create", resource_type: "sponsor_request", resource_id: sr.id, metadata: { event_id, event_title, package: pkg } },
    ]);

    return new Response(JSON.stringify({ ok: true, sponsor_request: sr }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

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

async function fetchFromSupabase(path: string) {
  const URL = `${Deno.env.get("SUPABASE_URL")}/rest/v1/${path}`;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY");
  if (!SERVICE_KEY) throw new Error("service role key missing (set SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY)");

  const resp = await fetch(URL, {
    method: "GET",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`supabase fetch ${path} failed: ${resp.status} ${text}`);
  }
  return resp.json();
}

Deno.serve(async (req) => {
  const invocationId = genInvocationId();
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    logStructured(invocationId, "info", "sponsor_matches_api_request", { url: req.url });
    const sponsor_id = url.searchParams.get("sponsor_id");
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = Math.min(parseInt(url.searchParams.get("page_size") || "20", 10), 100);
    const ttlHours = parseInt(url.searchParams.get("ttl_hours") || "168", 10); // 7 days

    if (!sponsor_id) return new Response(JSON.stringify({ error: "sponsor_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const since = new Date(Date.now() - ttlHours * 3600 * 1000).toISOString();
    // PostgREST filter: sponsor_id=eq.{id}&created_at=gt.{since}
    const offset = (page - 1) * pageSize;
    const path = `sponsor_matches_cache?select=*&sponsor_id=eq.${sponsor_id}&created_at=gt.${since}&order=score.desc&limit=${pageSize}&offset=${offset}`;
    const rows = await fetchFromSupabase(path);
    logStructured(invocationId, "info", "sponsor_matches_return", { sponsor_id, count: Array.isArray(rows) ? rows.length : 0 });
    return new Response(JSON.stringify({ ok: true, matches: rows }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    logStructured(invocationId, "error", "sponsor_matches_api_error", { error: String(e) });
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

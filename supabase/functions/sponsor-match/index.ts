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
    const { sponsor_industry, sponsor_budget, events, sponsor_id } = await req.json();
    logStructured(invocationId, "info", "sponsor_match_request", { sponsor_id, sponsor_industry });
    const KEY = Deno.env.get("OPENAI_API_KEY");
    if (!KEY) throw new Error("OPENAI_API_KEY missing");

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are a sponsorship intelligence analyst. Return STRICT JSON only.",
          },
          {
            role: "user",
            content: `Sponsor industry: ${sponsor_industry}. Budget: $${sponsor_budget}. Events: ${JSON.stringify(events)}.
For each event return JSON: {"matches":[{"event_id":"string","match_score":0-100,"roi_score":0-100,"predicted_impressions":number,"recommended_package":"string","reasoning":"1 sentence"}]}`,
          },
        ],
      }),
    });

    if (!resp.ok) throw new Error(`openai ${resp.status}`);
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    // cache matches if present
    try {
      if (Array.isArray(parsed.matches)) {
        const toInsert = parsed.matches.map((m: any) => ({
          sponsor_id: sponsor_id || null,
          event_id: m.event_id,
          score: m.match_score,
          roi_estimate: m.roi_score,
          confidence: m.confidence ?? null,
          payload: m,
          scored_at: new Date().toISOString(),
        }));
        // insert in bulk
        await insertToSupabase("sponsor_matches_cache", toInsert);
        logStructured(invocationId, "info", "cached_matches", { count: toInsert.length });
      }
    } catch (e) {
      logStructured(invocationId, "error", "cache_error", { error: String(e) });
    }

    logStructured(invocationId, "info", "sponsor_match_complete", { sponsor_id });

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e), matches: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

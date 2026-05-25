const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { sponsor_industry, sponsor_budget, events } = await req.json();
    const KEY = Deno.env.get("OPENAI_API_KEY");
    if (!KEY) throw new Error("OPENAI_API_KEY missing");

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a sponsorship intelligence analyst. Return STRICT JSON only." },
          { role: "user", content: `Sponsor industry: ${sponsor_industry}. Budget: $${sponsor_budget}. Events: ${JSON.stringify(events)}.
For each event return JSON: {"matches":[{"event_id":"string","match_score":0-100,"roi_score":0-100,"predicted_impressions":number,"recommended_package":"string","reasoning":"1 sentence"}]}` },
        ],
      }),
    });

    if (!resp.ok) throw new Error(`openai ${resp.status}`);
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e), matches: [] }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

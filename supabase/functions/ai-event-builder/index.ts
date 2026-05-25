const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { title, category, audience, budget } = await req.json();
    const KEY = Deno.env.get("OPENAI_API_KEY");
    if (!KEY) throw new Error("OPENAI_API_KEY missing");

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are an elite event strategist. Always return STRICT JSON only, no prose." },
          { role: "user", content: `Design an event plan. Title: ${title}. Category: ${category}. Audience: ${audience}. Budget: $${budget}.
Return JSON with this exact shape:
{
  "tagline": "string",
  "description": "2 sentence description",
  "timeline": [{"phase":"string","duration":"string","tasks":["string"]}],
  "budget_breakdown": [{"category":"string","amount":number,"percent":number}],
  "marketing_copy": {"twitter":"string","linkedin":"string","email_subject":"string"},
  "sponsor_pitch": "string",
  "volunteer_needs": [{"role":"string","count":number,"skills":["string"]}],
  "intelligence_score": number (0-100, based on plan strength),
  "risks": ["string"]
}` },
        ],
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit. Try again." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok) throw new Error(`openai ${resp.status}`);

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

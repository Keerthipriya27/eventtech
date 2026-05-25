const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { messages } = await req.json();
    const KEY = Deno.env.get("OPENAI_API_KEY");
    if (!KEY) throw new Error("OPENAI_API_KEY missing");

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        stream: true,
        messages: [
          { role: "system", content: "You are EventTech Copilot — an expert AI assistant for event organizers, sponsors, volunteers, and participants. Be concise, actionable, and use markdown. Help with scheduling, budgeting, risk analysis, sponsor matching, volunteer coordination, and growth strategies." },
          ...messages,
        ],
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!resp.ok || !resp.body) throw new Error(`openai ${resp.status}`);

    return new Response(resp.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

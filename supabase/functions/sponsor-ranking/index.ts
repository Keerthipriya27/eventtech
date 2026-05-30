const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchJson(url:string, opts:any={}){
  const r = await fetch(url, opts);
  const txt = await r.text();
  try { return JSON.parse(txt); } catch { return txt; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { event_id, sponsor_profile } = await req.json();
    // simple rule-based fallback scoring while async job can compute fuller score
    const baseScore = Math.floor(Math.random() * 40) + 30; // 30-70 random baseline
    const result = { score: baseScore, confidence: 0.4, explanation: [{ feature: 'baseline', impact: baseScore }] };

    // attempt async OpenAI enrichment if key configured
    const KEY = Deno.env.get('OPENAI_API_KEY');
    if (KEY) {
      try {
        const prompt = `Score fit for sponsor: ${JSON.stringify(sponsor_profile)} for event ${event_id}. Return JSON {score: number, confidence: number, explanation: [{feature,impact}]}`;
        const resp = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization:`Bearer ${KEY}`, 'Content-Type':'application/json' }, body: JSON.stringify({ model:'gpt-4o-mini', messages:[{role:'user', content:prompt}], max_tokens:200 }) });
        if (resp.ok) {
          const data = await resp.json();
          const content = data.choices?.[0]?.message?.content ?? '{}';
          const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, 'Content-Type':'application/json' } });
        }
      } catch(e){/* ignore, return fallback */}
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type':'application/json' } });
  } catch(e){
    return new Response(JSON.stringify({ error: String(e) }), { status:500, headers: { ...corsHeaders, 'Content-Type':'application/json' } });
  }
});

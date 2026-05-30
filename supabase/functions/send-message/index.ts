const corsHeaders = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,authorization,apikey"};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
    if (!SUPABASE_URL) throw new Error('SUPABASE_URL missing');

    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return new Response(JSON.stringify({ error: 'missing auth token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: SERVICE_KEY } });
    const userJson = await userResp.json();
    const sender_id = userJson?.id;
    if (!sender_id) return new Response(JSON.stringify({ error: 'invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { recipient_id, body } = await req.json();
    if (!recipient_id || !body) return new Response(JSON.stringify({ error: 'missing fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const url = `${SUPABASE_URL}/rest/v1/messages`;
    const payload = [{ sender_id, recipient_id, body }];
    const resp = await fetch(url, { method: 'POST', headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(JSON.stringify({ error: txt }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

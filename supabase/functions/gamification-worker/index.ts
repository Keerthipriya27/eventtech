const corsHeaders = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,authorization"};

// Gamification worker: apply XP and unlocks
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { user_id, change, reason, event_id } = await req.json();
    const SERVICE_URL = Deno.env.get('SUPABASE_URL');
    const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
    if (!KEY || !SERVICE_URL) throw new Error('service config missing');

    // 1) Insert ledger entry
    const ledgerUrl = `${SERVICE_URL}/rest/v1/xp_ledger`;
    await fetch(ledgerUrl, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([{ user_id, event_id: event_id || null, change, reason }]),
    });

    // 2) Update profiles xp and level, compute new badges
    // Fetch current profile
    const profUrl = `${SERVICE_URL}/rest/v1/profiles?id=eq.${user_id}&select=xp,level,badges`;
    const profResp = await fetch(profUrl, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    const profData = await profResp.json();
    const prof = profData?.[0] || { xp: 0, level: 1, badges: [] };
    const newXp = (prof.xp || 0) + (change || 0);
    const newLevel = Math.floor(newXp / 200) + 1;
    const newBadges = Array.isArray(prof.badges) ? [...prof.badges] : [];
    if (newLevel > (prof.level || 1) && !newBadges.includes(`Level ${newLevel}`)) newBadges.push(`Level ${newLevel}`);

    // persist profile update
    const updateUrl = `${SERVICE_URL}/rest/v1/profiles?id=eq.${user_id}`;
    await fetch(updateUrl, {
      method: 'PATCH',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ xp: newXp, level: newLevel, badges: newBadges }),
    });

    return new Response(JSON.stringify({ ok: true, newXp, newLevel }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

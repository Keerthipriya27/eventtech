const corsHeaders = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,authorization,apikey"};

// Notification engine: evaluate rules and create logs (delivery handled elsewhere)
Deno.serve(async (req)=>{
  if (req.method==='OPTIONS') return new Response(null,{headers:corsHeaders});
  try{
    const { rule_id, user_id, payload } = await req.json();
    // naive: insert into notification_logs via PostgREST
    const URL = `${Deno.env.get('SUPABASE_URL')}/rest/v1/notification_logs`;
    const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
    if (!KEY) throw new Error('service key missing');
    await fetch(URL, { method:'POST', headers: { apikey: KEY, Authorization:`Bearer ${KEY}`, 'Content-Type':'application/json' }, body: JSON.stringify([{ rule_id, user_id, payload, status:'pending' }]) });
    return new Response(JSON.stringify({ ok:true }), { headers:{ ...corsHeaders, 'Content-Type':'application/json' } });
  }catch(e){ return new Response(JSON.stringify({ error:String(e) }), { status:500, headers:{ ...corsHeaders, 'Content-Type':'application/json' } }); }
});

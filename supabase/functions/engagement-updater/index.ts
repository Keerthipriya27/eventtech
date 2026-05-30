const corsHeaders = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,authorization"};

// Update participant engagement score (scheduled or event-driven)
Deno.serve(async (req)=>{
  if (req.method==='OPTIONS') return new Response(null,{headers:corsHeaders});
  try{
    const { user_id, event_id, metrics } = await req.json();
    // simple scoring: combine metrics
    const score = (metrics.activity_count||0) * 1 + (metrics.session_duration_minutes||0)*0.1 + (metrics.chat_messages||0)*0.5;
    return new Response(JSON.stringify({ ok:true, user_id, event_id, score }), { headers:{ ...corsHeaders, 'Content-Type':'application/json' } });
  }catch(e){ return new Response(JSON.stringify({ error:String(e) }), { status:500, headers:{ ...corsHeaders, 'Content-Type':'application/json' } }); }
});

const corsHeaders = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,authorization"};

// lightweight report generator stub: gather metrics and produce JSON summary
Deno.serve(async (req)=>{
  if (req.method==='OPTIONS') return new Response(null,{headers:corsHeaders});
  try{
    const { event_id } = await req.json();
    // placeholder: return minimal report structure
    const summary = { event_id, attendance: Math.floor(Math.random()*200), sponsors: [], highlights: [] };
    return new Response(JSON.stringify({ ok:true, summary }), { headers:{ ...corsHeaders, 'Content-Type':'application/json' } });
  }catch(e){ return new Response(JSON.stringify({ error:String(e) }), { status:500, headers:{ ...corsHeaders, 'Content-Type':'application/json' } }); }
});

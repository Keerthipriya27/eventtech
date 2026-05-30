const corsHeaders = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,authorization"};

// Basic fraud detection heuristics
Deno.serve(async (req)=>{
  if (req.method==='OPTIONS') return new Response(null,{headers:corsHeaders});
  try{
    const { entity_type, entity } = await req.json();
    let score = 0; const reasons:any[]=[];
    if (entity.email && /mailinator|tempmail|disposable/.test(entity.email)) { score += 0.6; reasons.push('disposable_email'); }
    if (entity.ip && entity.ip.startsWith('192.168.')) { score += 0.2; reasons.push('local_ip'); }
    score = Math.min(1, score);
    return new Response(JSON.stringify({ ok:true, risk_score: score, reasons }), { headers:{ ...corsHeaders, 'Content-Type':'application/json' } });
  }catch(e){ return new Response(JSON.stringify({ error:String(e) }), { status:500, headers:{ ...corsHeaders, 'Content-Type':'application/json' } }); }
});

const corsHeaders = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,authorization,apikey"};

Deno.serve(async (req) => {
  if (req.method==='OPTIONS') return new Response(null,{headers:corsHeaders});
  try{
    const { event } = await req.json();
    // simple heuristic: look at registration_velocity and capacity
    const regVel = event.registration_velocity || 0;
    const capacity = event.capacity || 100;
    let probability = Math.min(0.95, 0.2 + Math.tanh(regVel/10)/1.2 + Math.min(0.5, Math.log10(Math.max(1, regVel+1))/5));
    probability = Math.round(probability*100)/100;
    const risk = [];
    if (regVel<5) risk.push({reason:'low_registration_velocity', impact:0.4});
    return new Response(JSON.stringify({ success_probability: probability, risk_factors: risk, recommended_actions:['Increase marketing to target audience'] }), { headers: { ...corsHeaders, 'Content-Type':'application/json' } });
  }catch(e){ return new Response(JSON.stringify({ error: String(e) }), { status:500, headers:{ ...corsHeaders, 'Content-Type':'application/json' } }); }
});

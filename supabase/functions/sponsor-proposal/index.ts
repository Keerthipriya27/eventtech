const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type,authorization,apikey" };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { sponsor, event, recommended_package } = await req.json();
    const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY');
    const now = new Date().toISOString();

    const summary = [];
    if (sponsor?.name) summary.push(`Sponsor: ${sponsor.name}`);
    if (sponsor?.industry) summary.push(`Industry: ${sponsor.industry}`);
    if (sponsor?.budget) summary.push(`Budget: $${sponsor.budget}`);
    if (event?.title) summary.push(`Event: ${event.title}`);
    if (event?.start_date) summary.push(`Date: ${event.start_date}`);
    if (event?.location) summary.push(`Location: ${event.location}`);

    let proposal = `Dear ${sponsor?.contact_name || sponsor?.name || 'Sponsor'},\n\n`;
    proposal += `Thank you for your interest in partnering with ${event?.title || 'our event'}. Below is a tailored proposal based on the information you provided (${summary.join(' | ')}).\n\n`;

    if (OPENAI_KEY) {
      // Use OpenAI to generate a polished proposal
      const prompt = `Write a concise sponsorship proposal (300-500 words) for the following sponsor and event. Include: a compelling opener, tailored sponsorship package recommendation, expected ROI/metrics (impressions, leads), clear call-to-action, and optional upsell. Be persuasive but factual.\n\nSponsor: ${JSON.stringify(sponsor)}\nEvent: ${JSON.stringify(event)}\nRecommended package: ${recommended_package || 'TBD'}`;

      try {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
          body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.2, max_tokens: 800 }),
        });
        const json = await resp.json();
        const content = json?.choices?.[0]?.message?.content;
        if (content) {
          proposal = content;
        }
      } catch (e) {
        console.error('openai error', e);
      }
    } else {
      // Fallback simple template
      proposal += `Recommended package: ${recommended_package || 'Title Sponsor'}\n\n`;
      proposal += `We expect strong visibility through on-site branding, targeted email promotion to our attendee list, and social amplification. Based on similar events, projected impressions: 10k-25k, qualified leads: 50-200.\n\n`;
      proposal += `Next steps: reply to this message to schedule a 20-minute call to finalize details and secure the package.\n\nSincerely,\nEventTech Team\n${now}`;
    }

    return new Response(JSON.stringify({ proposal, subject: `Sponsorship proposal for ${event?.title || 'your event'}` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

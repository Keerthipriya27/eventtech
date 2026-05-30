const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type,authorization,apikey" };

async function fetchRegistration(serviceUrl: string, key: string, regId: string) {
  const url = `${serviceUrl}/rest/v1/registrations?id=eq.${regId}&select=*,events(*),profiles:profiles!registrations_user_id_fkey(*)`; // try to fetch event and profile
  const resp = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  const data = await resp.json();
  return data?.[0] || null;
}

function makeTicketHTML(reg: any) {
  const qrValue = reg.qr_code || reg.id;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrValue)}`;
  const name = reg.profiles?.full_name || reg.user_id;
  const eventTitle = reg.events?.title || reg.event_id;
  const date = reg.events?.start_date ? new Date(reg.events.start_date).toLocaleString() : '';
  return `<!doctype html><html><head><meta charset="utf-8"><title>Ticket for ${eventTitle}</title>
  <style>body{font-family:Inter,system-ui,Arial;background:#0b1220;color:#fff;padding:24px} .ticket{max-width:600px;margin:0 auto;background:#091023;padding:24px;border-radius:12px;border:1px solid rgba(255,255,255,0.04)} h1{margin:0 0 8px} .meta{opacity:.85;font-size:14px}</style>
  </head><body><div class="ticket"><h1>${eventTitle}</h1><p class="meta">${date}</p><div style="display:flex;gap:16px;align-items:center;margin-top:16px"><img src="${qrUrl}" alt="QR" width="200" height="200"/><div><p><strong>${name}</strong></p><p class="meta">Ticket ID: ${reg.id}</p><p class="meta">Present this QR at check-in to attend.</p></div></div></div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { registration_id } = await req.json();
    if (!registration_id) return new Response(JSON.stringify({ error: 'missing registration_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const SERVICE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
    if (!SERVICE_URL || !SERVICE_KEY) return new Response(JSON.stringify({ error: 'service config missing' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const reg = await fetchRegistration(SERVICE_URL, SERVICE_KEY, registration_id);
    if (!reg) return new Response(JSON.stringify({ error: 'registration not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const ticketHtml = makeTicketHTML(reg);

    // Try to send email via SendGrid if available
    const SENDGRID_KEY = Deno.env.get('SENDGRID_API_KEY');
    let emailSent = false;
    try {
      if (SENDGRID_KEY) {
        const recipient = reg.profiles?.email || reg.user_email || null;
        if (recipient) {
          const sg = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: { Authorization: `Bearer ${SENDGRID_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              personalizations: [{ to: [{ email: recipient }] }],
              from: { email: 'no-reply@eventtech.ai', name: 'EventTech' },
              subject: `Your ticket for ${reg.events?.title || 'Event'}`,
              content: [{ type: 'text/html', value: ticketHtml }],
            }),
          });
          emailSent = sg.ok;
        }
      }
    } catch (e) {
      console.error('sendgrid error', e);
      emailSent = false;
    }

    // Insert a notification log so admins can track delivery
    try {
      const notifUrl = `${SERVICE_URL}/rest/v1/notification_logs`;
      await fetch(notifUrl, { method: 'POST', headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify([{ rule_id: null, user_id: reg.user_id, payload: { type: 'ticket_issued', registration_id, email_sent: emailSent } }]) });
    } catch (e) {
      console.error('notification log failed', e);
    }

    return new Response(JSON.stringify({ ok: true, ticket_html: ticketHtml, email_sent: emailSent }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

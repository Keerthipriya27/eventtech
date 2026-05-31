const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type,authorization,apikey" };

async function fetchRegistration(serviceUrl: string, key: string, regId: string) {
  const url = `${serviceUrl}/rest/v1/registrations?id=eq.${regId}&select=*,events(*)`;
  const resp = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  const data = await resp.json();
  return data?.[0] || null;
}

function makeCertificateHTML(name: string, eventTitle: string, date: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificate</title>
  <style>body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#fff;color:#111;padding:40px} .cert{max-width:800px;margin:0 auto;border:6px solid #0ea5a4;padding:48px;border-radius:12px;text-align:center} h1{font-size:40px;margin:0 0 8px} .name{font-size:32px;margin:18px 0;font-weight:700} .event{font-size:20px;color:#0ea5a4;margin-top:6px} .date{margin-top:28px;color:#666;font-size:14px}</style>
  </head><body><div class="cert"><h1>Certificate of Attendance</h1><div class="name">${name}</div><div class="event">Attended: ${eventTitle}</div><div class="date">Issued on ${date}</div></div></body></html>`;
}

async function ensureBucket(serviceUrl: string, serviceKey: string, bucket: string) {
  await fetch(`${serviceUrl}/storage/v1/bucket`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: bucket, name: bucket, public: true }),
  });
}

// Upload to Supabase Storage bucket and insert certificate record
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { registration_id } = await req.json();
    if (!registration_id) return new Response(JSON.stringify({ error: 'missing registration_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const SERVICE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
    const STORAGE_BUCKET = Deno.env.get('CERT_BUCKET') || 'certificates';
    if (!SERVICE_URL || !SERVICE_KEY) return new Response(JSON.stringify({ error: 'service config missing' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const reg = await fetchRegistration(SERVICE_URL, SERVICE_KEY, registration_id);
    if (!reg) return new Response(JSON.stringify({ error: 'registration not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const name = reg.profiles?.full_name || reg.user_id || 'Participant';
    const eventTitle = reg.events?.title || reg.event_id;
    const date = new Date().toLocaleDateString();
    const html = makeCertificateHTML(name, eventTitle, date);

    const path = `certificates/${reg.event_id}/${reg.user_id}-${Date.now()}.html`;
    const uploadUrl = `${SERVICE_URL}/storage/v1/object/${STORAGE_BUCKET}/${encodeURIComponent(path)}`;

    // Upload HTML as file
    let up = await fetch(uploadUrl, {
      method: 'POST',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'text/html' },
      body: html,
    });
    if (!up.ok) {
      const txt = await up.text();
      console.error('upload failed', up.status, txt);
      // Try to create the bucket on the fly, then retry once.
      await ensureBucket(SERVICE_URL, SERVICE_KEY, STORAGE_BUCKET);
      up = await fetch(uploadUrl, {
        method: 'POST',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'text/html' },
        body: html,
      });
      if (!up.ok) {
        const retryTxt = await up.text();
        console.error('retry upload failed', up.status, retryTxt);
        return new Response(JSON.stringify({ ok: true, certificate_html: html, certificate_url: null, upload_error: retryTxt || txt }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    const publicUrl = `${SERVICE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;

    // Insert certificate record
    try {
      const insertUrl = `${SERVICE_URL}/rest/v1/certificates`;
      await fetch(insertUrl, {
        method: 'POST',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([{ event_id: reg.event_id, user_id: reg.user_id, certificate_url: publicUrl, issued_at: new Date().toISOString() }]),
      });
    } catch (e) {
      console.error('insert certificate failed', e);
    }

    return new Response(JSON.stringify({ ok: true, certificate_url: publicUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

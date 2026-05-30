export async function trackEvent(name: string, payload: any = {}) {
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telemetry`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      body: JSON.stringify({ name, payload }),
    });
  } catch (e) {
    // swallow telemetry errors
    console.debug("telemetry failed", e);
  }
}

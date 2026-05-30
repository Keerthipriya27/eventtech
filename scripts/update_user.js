(async () => {
  const fetch = global.fetch || (await import("node-fetch")).default;
  const apikey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!apikey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY in environment");
    process.exit(1);
  }
  const userId = "a77cac9f-a18e-4dd8-a995-8a2bb88cdc1f";
  const url = `https://qkofbwzpenqbiizkdkiv.supabase.co/auth/v1/admin/users/${userId}`;
  const body = { password: "TempPass!23", email_confirm: true };
  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: { apikey, Authorization: `Bearer ${apikey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    console.log("STATUS", res.status);
    console.log(text);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();

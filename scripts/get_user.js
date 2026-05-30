(async () => {
  const fetch = global.fetch || (await import("node-fetch")).default;
  const apikey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!apikey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY in environment");
    process.exit(1);
  }
  const email = "peddadaramya468@gmail.com";
  const url = `https://qkofbwzpenqbiizkdkiv.supabase.co/auth/v1/admin/users?email=${encodeURIComponent(email)}`;
  try {
    const res = await fetch(url, { headers: { apikey, Authorization: `Bearer ${apikey}` } });
    const json = await res.json();
    console.log("STATUS", res.status);
    console.log(JSON.stringify(json, null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();

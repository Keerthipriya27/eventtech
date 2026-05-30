(async () => {
  const fetch = global.fetch || (await import("node-fetch")).default;
  const url = "https://qkofbwzpenqbiizkdkiv.supabase.co/auth/v1/admin/users";
  const apikey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!apikey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY in environment");
    process.exit(1);
  }
  const email = "peddadaramya468@gmail.com";
  const password = "TempPass!23";
  const body = {
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "peddadaramya468", role: "participant" },
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        apikey,
        Authorization: `Bearer ${apikey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    console.log("STATUS", res.status);
    console.log(text);
  } catch (e) {
    console.error("ERROR", e);
    process.exit(1);
  }
})();

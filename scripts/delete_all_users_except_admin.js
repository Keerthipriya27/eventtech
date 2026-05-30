const fs = require("fs");

function loadEnv(path = ".env") {
  const text = fs.readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnv();
  const fetchFn = global.fetch || (await import("node-fetch")).default;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRole =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  const adminEmail = "peddadaramya468@gmail.com";

  if (!supabaseUrl || !serviceRole) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  }

  const listUrl = `${supabaseUrl}/auth/v1/admin/users?per_page=200`;
  const listRes = await fetchFn(listUrl, {
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
    },
  });
  const listJson = await listRes.json();
  const users = listJson.users || [];
  console.log(`Found ${users.length} auth users`);

  const keep = users.filter(
    (u) => String(u.email || "").toLowerCase() === adminEmail.toLowerCase(),
  );
  const remove = users.filter(
    (u) => String(u.email || "").toLowerCase() !== adminEmail.toLowerCase(),
  );

  console.log(`Keeping ${keep.length} user(s):`, keep.map((u) => u.email).join(", ") || "(none)");
  console.log(`Deleting ${remove.length} user(s)`);

  for (const user of remove) {
    const delRes = await fetchFn(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
      method: "DELETE",
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
      },
    });
    const text = await delRes.text();
    console.log(`${user.email} -> ${delRes.status} ${text}`);
  }

  const verifyRes = await fetchFn(listUrl, {
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
    },
  });
  const verifyJson = await verifyRes.json();
  const remaining = verifyJson.users || [];
  console.log(`Remaining auth users: ${remaining.length}`);
  for (const user of remaining) {
    console.log(`- ${user.email}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

const groups = [
  {
    name: "Supabase",
    keys: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
  },
  { name: "WhatsApp OTP", keys: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_OTP_TEMPLATE"] },
  { name: "Admin AI content engine (optional)", keys: ["OPENAI_API_KEY"] },
];

const missing = groups
  .map((group) => ({ ...group, missing: group.keys.filter((key) => !process.env[key]) }))
  .filter((group) => group.missing.length);

if (!missing.length) {
  console.log("Environment validation passed: all production integrations are configured.");
  process.exit(0);
}

for (const group of missing) {
  console.warn(`[env] ${group.name} is in demo mode; missing: ${group.missing.join(", ")}`);
}

if (process.env.STRICT_ENV === "1") {
  console.error("Strict environment validation failed.");
  process.exit(1);
}

console.log("Environment validation passed in demo-safe mode. Use STRICT_ENV=1 for a production release gate.");

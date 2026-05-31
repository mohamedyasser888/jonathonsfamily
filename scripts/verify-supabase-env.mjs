/**
 * Verifies .env.local exists in the Next.js project root and required keys are set.
 * Run: node scripts/verify-supabase-env.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

if (!existsSync(envPath)) {
  console.error("FAIL: .env.local not found at:", envPath);
  console.error("Create it in jonathons/ (project root), not inside /app.");
  process.exit(1);
}

const raw = readFileSync(envPath, "utf8");
const vars = {};

for (const line of raw.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const value = trimmed.slice(eq + 1).trim();
  vars[key] = value;
}

let ok = true;
for (const key of required) {
  if (!vars[key]) {
    console.error(`FAIL: Missing or empty ${key} in .env.local`);
    ok = false;
  } else {
    const preview =
      key === "NEXT_PUBLIC_SUPABASE_URL"
        ? vars[key]
        : `${vars[key].slice(0, 12)}… (${vars[key].length} chars)`;
    console.log(`OK: ${key}=${preview}`);
  }
}

if (!ok) {
  process.exit(1);
}

console.log("\nAll Supabase env variables are present in .env.local.");
console.log("Restart Next.js after any .env change: stop dev server, then npm run dev");

/**
 * Empty jonathon-images and profile-photos buckets (uses Storage API).
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Run: npm run clear:storage
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error("Missing .env.local at", envPath);
    process.exit(1);
  }
  const vars = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return vars;
}

async function collectFilePaths(supabase, bucket, folder = "") {
  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit: 1000,
  });
  if (error) throw error;

  const paths = [];
  for (const entry of data || []) {
    const path = folder ? `${folder}/${entry.name}` : entry.name;
    if (entry.id) {
      paths.push(path);
    } else {
      paths.push(...(await collectFilePaths(supabase, bucket, path)));
    }
  }
  return paths;
}

async function emptyBucket(supabase, bucket) {
  const paths = await collectFilePaths(supabase, bucket);
  if (paths.length === 0) {
    console.log(`  ${bucket}: already empty`);
    return;
  }

  const batchSize = 100;
  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);
    const { error } = await supabase.storage.from(bucket).remove(batch);
    if (error) throw error;
  }
  console.log(`  ${bucket}: deleted ${paths.length} file(s)`);
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey);
const buckets = ["jonathon-images", "profile-photos"];

console.log("Clearing storage buckets…");
for (const bucket of buckets) {
  try {
    await emptyBucket(supabase, bucket);
  } catch (err) {
    console.error(`  ${bucket}: failed —`, err.message || err);
    process.exit(1);
  }
}
console.log("Done.");

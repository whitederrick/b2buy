// scripts/push-migrations.mjs
// 사용법: node scripts/push-migrations.mjs
// 호스팅 Supabase DB에 4개 마이그레이션을 순서대로 적용
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const REF = process.env.SUPABASE_PROJECT_REF;
const PAT = process.env.SUPABASE_ACCESS_TOKEN;

if (!REF || !PAT) {
  console.error("Missing SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN.");
  process.exit(1);
}

const MIGRATIONS = [
  "supabase/migrations/20260101_init_b2buy_schema.sql",
  "supabase/migrations/20260102_auth_link_and_signup.sql",
  "supabase/migrations/20260103_storage_buckets.sql",
  "supabase/migrations/20260104_participate_rpc.sql"
];

async function runOne(file) {
  const sql = readFileSync(resolve(file), "utf8");
  const url = `https://api.supabase.com/v1/projects/${REF}/database/query`;
  console.log(`\n=== Pushing ${file} (${sql.length} chars) ===`);
  const t0 = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${PAT}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query: sql })
  });
  const text = await res.text();
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`HTTP ${res.status}  (${dt}s)`);
  if (!res.ok) {
    console.error("ERROR:", text);
    throw new Error(`Failed: ${file}`);
  }
  if (text) console.log(text.slice(0, 500));
  console.log(`✓ ${file}`);
}

for (const f of MIGRATIONS) {
  if (!existsSync(resolve(f))) {
    console.error(`Missing: ${f}`);
    process.exit(1);
  }
  await runOne(f);
}

// seed.sql 은 선택 — 존재하면 적용
const seed = "supabase/seed.sql";
if (existsSync(resolve(seed))) {
  console.log("\n=== seed.sql (선택) ===");
  await runOne(seed);
}

console.log("\n✅ 모든 마이그레이션 적용 완료");

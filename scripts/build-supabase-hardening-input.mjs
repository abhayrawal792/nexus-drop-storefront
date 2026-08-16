import { readFile, writeFile } from "node:fs/promises";

const query = await readFile("supabase/migrations/0002_security_hardening.sql", "utf8");
await writeFile("/tmp/nexus-drop-supabase-hardening.json", JSON.stringify({
  project_id: "bcbqxojafuxeprhgnbxs",
  name: "nexus_drop_security_hardening",
  query,
}));

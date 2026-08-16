import { readFile, writeFile } from "node:fs/promises";

const query = await readFile("supabase/migrations/0001_nexus_drop.sql", "utf8");
await writeFile("/tmp/nexus-drop-supabase-migration.json", JSON.stringify({
  project_id: "bcbqxojafuxeprhgnbxs",
  name: "nexus_drop_commerce_setup",
  query,
}));

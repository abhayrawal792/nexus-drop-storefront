import { readFile, writeFile } from "node:fs/promises";

const query = await readFile("supabase/migrations/0003_bank_transfer.sql", "utf8");
await writeFile("/tmp/nexus-drop-supabase-bank-transfer.json", JSON.stringify({
  project_id: "bcbqxojafuxeprhgnbxs",
  name: "nexus_drop_bank_transfer",
  query,
}));

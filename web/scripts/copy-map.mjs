import { cp, rm, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script_dir = path.dirname(fileURLToPath(import.meta.url));
const web_root = path.resolve(script_dir, "..");
const source_dir = path.join(web_root, "map");
const target_dir = path.join(web_root, "public", "map");

async function main() {
  try {
    await access(source_dir, constants.F_OK);
  } catch {
    process.exit(0);
  }

  await rm(target_dir, { recursive: true, force: true });
  await cp(source_dir, target_dir, { recursive: true });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
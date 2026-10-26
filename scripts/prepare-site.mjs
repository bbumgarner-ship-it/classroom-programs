import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "dist");
const catalog = JSON.parse(await readFile(join(root, "catalog.json"), "utf8"));
if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.games)) throw new Error("Invalid catalog schema");
const latest = new Map();
const gamePath = /^(?:(?:games|p)\/[a-z0-9-]+\/v[1-9][0-9]*\/(?:index\.html)?|game-[a-z0-9-]+\.html)$/;
for (const game of catalog.games) {
  if (typeof game.id !== "string" || !game.id.trim()) throw new Error("Every game needs a stable id");
  if (typeof game.title !== "string" || !game.title.trim() ||
      typeof game.description !== "string" || !Array.isArray(game.tags) ||
      !game.tags.every(tag => typeof tag === "string")) throw new Error(`Invalid display fields: ${game.id}`);
  if (!Number.isSafeInteger(game.week) || game.week < 0) throw new Error(`Assign a nonnegative integer week to ${game.id}`);
  if (!Number.isSafeInteger(game.version) || game.version < 1) throw new Error(`Assign a positive integer version to ${game.id}`);
  if (typeof game.path !== "string" || !gamePath.test(game.path)) throw new Error(`Invalid local game path: ${game.id}`);
  const previous = latest.get(game.id);
  if (!previous || game.version >= previous.version) latest.set(game.id, { ...game });
}
for (const game of latest.values()) {
  const file = game.path.endsWith("/") ? game.path + "index.html" : game.path;
  const contents = await readFile(join(root, file));
  game.sha256 = createHash("sha256").update(contents).digest("hex");
}

// Publish a complete snapshot so changed files replace their previous deployment.
// Never include repository metadata, automation, or local build output in the site.
if (dirname(output) !== root) throw new Error("Unexpected build output directory");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const excluded = new Set(["dist", "scripts", "tests", "node_modules", "package.json", "package-lock.json"]);
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.name.startsWith(".") || entry.name.endsWith(".md") || excluded.has(entry.name)) continue;
  await cp(join(root, entry.name), join(output, entry.name), { recursive: true });
}
await writeFile(join(output, "catalog.json"), JSON.stringify({ ...catalog, games: [...latest.values()] }, null, 2) + "\n");
console.log(`Prepared ${latest.size} games across ${new Set([...latest.values()].filter(g => g.week > 0).map(g => g.week)).size} published weeks.`);

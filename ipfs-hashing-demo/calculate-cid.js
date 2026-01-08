#!/usr/bin/env node
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { importer } from "ipfs-unixfs-importer";

const dirArg = process.argv[2] ?? "./dist";
const ROOT = path.resolve(dirArg);
const toPosix = (p) => p.split(path.sep).join(path.posix.sep);

async function listFiles(rootDir) {
  const out = [];
  async function walk(absDir, relPosix) {
    const entries = await fsp.readdir(absDir, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.name.startsWith(".")) continue; // optional: match your pipeline
      const abs = path.join(absDir, ent.name);
      const rel = relPosix ? `${relPosix}/${ent.name}` : ent.name;
      if (ent.isDirectory()) await walk(abs, rel);
      else if (ent.isFile()) out.push({ rel: toPosix(rel), abs });
    }
  }
  await walk(rootDir, "");
  out.sort((a, b) => a.rel.localeCompare(b.rel));
  return out;
}

class MemBS {
  #m = new Map();
  async put(cid, bytes) { this.#m.set(cid.toString(), bytes); }
  async get(cid) {
    const b = this.#m.get(cid.toString());
    if (!b) throw new Error(`Missing block ${cid}`);
    return b;
  }
  async has(cid) { return this.#m.has(cid.toString()); }
}

async function main() {
  const files = await listFiles(ROOT);
  const candidates = files.map(({ rel, abs }) => ({
    path: rel,                    // <-- NO PREFIX
    content: fs.createReadStream(abs),
  }));

  const bs = new MemBS();
  let rootCID = null;

  for await (const entry of importer(candidates, bs, { wrapWithDirectory: true })) {
    rootCID = entry.cid;
  }

  console.log(rootCID.toString());
}

main().catch((e) => {
  console.error(e?.stack || e);
  process.exit(1);
});

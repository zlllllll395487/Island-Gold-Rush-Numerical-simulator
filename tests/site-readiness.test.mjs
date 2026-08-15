import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("public metadata uses a local-safe default origin", async () => {
  const source = await readFile(new URL("../app/site-metadata.ts", import.meta.url), "utf8");

  assert.match(source, /http:\/\/localhost:3000/);
  assert.match(source, /NEXT_PUBLIC_SITE_URL/);
  assert.match(source, /og-v3\.png/);
});

test("public repository has no private hosting configuration", async () => {
  const source = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /hosting\.json|sites-vite-plugin|d1_databases|r2_buckets/i);
});

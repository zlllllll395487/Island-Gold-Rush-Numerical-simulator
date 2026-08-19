import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const output = resolve(root, "dist-pages");
const htmlPath = resolve(output, "index.html");
const assetsPath = resolve(output, "assets");
const requiredFiles = ["favicon.svg", "og-v3.png"];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(existsSync(htmlPath), "Missing dist-pages/index.html");
assert(existsSync(assetsPath), "Missing dist-pages/assets");

const html = readFileSync(htmlPath, "utf8");
const assets = readdirSync(assetsPath);
assert(
  html.includes("/Island-Gold-Rush-Numerical-simulator/assets/"),
  "index.html does not use the GitHub Pages repository base path",
);
assert(assets.some((file) => file.endsWith(".js")), "No JavaScript bundle found");
assert(assets.some((file) => file.endsWith(".css")), "No CSS bundle found");

for (const file of requiredFiles) {
  assert(existsSync(resolve(output, file)), `Missing required public asset: ${file}`);
}

console.log(`Pages build verified: ${assets.length} bundled assets and ${requiredFiles.length} public assets`);
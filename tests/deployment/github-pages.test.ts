import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const outputDir = resolve(projectRoot, "dist-pages");

describe("GitHub Pages static deployment", () => {
  test("builds a complete browser app under the repository base path", () => {
    rmSync(outputDir, { recursive: true, force: true });
    const command = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "npm";
    const args = process.platform === "win32"
      ? ["/d", "/s", "/c", "npm run build:pages"]
      : ["run", "build:pages"];
    const build = spawnSync(command, args, {
      cwd: projectRoot,
      encoding: "utf8",
    });

    expect(build.status, build.stdout + build.stderr).toBe(0);

    const htmlPath = resolve(outputDir, "index.html");
    expect(existsSync(htmlPath)).toBe(true);
    const html = readFileSync(htmlPath, "utf8");
    expect(html).toContain("/Island-Gold-Rush-Numerical-simulator/assets/");

    const assets = readdirSync(resolve(outputDir, "assets"));
    expect(assets.some((file) => file.endsWith(".js"))).toBe(true);
    expect(assets.some((file) => file.endsWith(".css"))).toBe(true);
    expect(existsSync(resolve(outputDir, "favicon.svg"))).toBe(true);
    expect(existsSync(resolve(outputDir, "og-v3.png"))).toBe(true);
  }, 30_000);
});

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

  test("validates the generated Pages artifact with the repository verifier", () => {
    const command = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "npm";
    const args = process.platform === "win32"
      ? ["/d", "/s", "/c", "npm run verify:pages"]
      : ["run", "verify:pages"];
    const verify = spawnSync(command, args, {
      cwd: projectRoot,
      encoding: "utf8",
    });

    expect(verify.status, verify.stdout + verify.stderr).toBe(0);
    expect(verify.stdout).toContain("Pages build verified");
  });

  test("uses the official GitHub Pages actions on pushes to main", () => {
    const workflowPath = resolve(projectRoot, ".github", "workflows", "deploy-pages.yml");
    expect(existsSync(workflowPath)).toBe(true);

    const workflow = readFileSync(workflowPath, "utf8");
    expect(workflow).toContain("branches: [main]");
    expect(workflow).toContain("actions/configure-pages@v5");
    expect(workflow).toContain("enablement: true");
    expect(workflow).toContain("actions/upload-pages-artifact@v3");
    expect(workflow).toContain("path: dist-pages");
    expect(workflow).toContain("actions/deploy-pages@v4");
    expect(workflow).toContain("npm run verify:pages");
  });
  test("keeps generated Pages assets outside source linting", () => {
    const command = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "npm";
    const args = process.platform === "win32"
      ? ["/d", "/s", "/c", "npm run lint"]
      : ["run", "lint"];
    const lint = spawnSync(command, args, {
      cwd: projectRoot,
      encoding: "utf8",
    });

    expect(lint.status, lint.stdout + lint.stderr).toBe(0);
  }, 30_000);
});

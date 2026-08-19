# GitHub Pages Static Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为模拟器增加独立的纯静态 Vite 构建和 GitHub Pages 自动发布，使公开链接无需登录并保留完整交互功能。

**Architecture:** 保留现有 Vinext/Worker 构建不变，在 `pages/` 增加浏览器端挂载入口，通过独立 `vite.pages.config.ts` 输出 `dist-pages/`。GitHub Actions 在 `main` 推送后构建并用官方 Pages Actions 发布。

**Tech Stack:** React 19、Vite 8、TypeScript 5、Vitest 4、GitHub Actions、GitHub Pages

## Global Constraints

- 公开 URL 固定为 `https://zlllllll395487.github.io/Island-Gold-Rush-Numerical-simulator/`。
- Pages 基础路径固定为 `/Island-Gold-Rush-Numerical-simulator/`。
- 现有 Vinext 开发、测试和生产构建不得被替换。
- 所有仿真继续在浏览器本地运行，不新增 API 或服务端存储。
- 发布流程只使用 GitHub 官方 Actions，不提交任何凭据。
- 公开内容不得包含飞书链接、本机绝对路径、内部目录、真实数据或 token。

---

### Task 1: 静态构建契约

**Files:**
- Create: `tests/deployment/github-pages.test.ts`
- Create: `pages/index.html`
- Create: `pages/main.tsx`
- Create: `vite.pages.config.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `SimulationDashboardV2(): JSX.Element`
- Produces: `npm run build:pages`，输出目录 `dist-pages/`

- [ ] **Step 1: 写失败测试**

创建 `tests/deployment/github-pages.test.ts`，读取待创建文件并断言：

```ts
expect(readFileSync("vite.pages.config.ts", "utf8")).toContain(
  'base: "/Island-Gold-Rush-Numerical-simulator/"',
);
expect(readFileSync("pages/main.tsx", "utf8")).toContain("SimulationDashboardV2");
expect(JSON.parse(readFileSync("package.json", "utf8")).scripts["build:pages"]).toBe(
  "vite build --config vite.pages.config.ts",
);
```

- [ ] **Step 2: 验证 RED**

运行：

```bash
npm test -- tests/deployment/github-pages.test.ts --maxWorkers=1 --testTimeout=15000
```

预期：因静态入口和配置不存在而失败。

- [ ] **Step 3: 实现最小静态入口**

`pages/main.tsx`：

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SimulationDashboardV2 } from "../src/components/SimulationDashboardV2";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root mount point");

createRoot(root).render(
  <StrictMode>
    <SimulationDashboardV2 />
  </StrictMode>,
);
```

`vite.pages.config.ts`：

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "pages",
  base: "/Island-Gold-Rush-Numerical-simulator/",
  publicDir: "../public",
  plugins: [react()],
  build: {
    outDir: "../dist-pages",
    emptyOutDir: true,
  },
});
```

`pages/index.html` 提供 `#root`、站点标题、description、favicon 和 `/main.tsx` 模块入口。向 `package.json` 添加：

```json
"build:pages": "vite build --config vite.pages.config.ts"
```

- [ ] **Step 4: 验证 GREEN**

运行：

```bash
npm test -- tests/deployment/github-pages.test.ts --maxWorkers=1 --testTimeout=15000
npm run build:pages
```

预期：测试通过；`dist-pages/index.html` 存在。

- [ ] **Step 5: 提交**

```bash
git add tests/deployment/github-pages.test.ts pages/index.html pages/main.tsx vite.pages.config.ts package.json
git commit -m "feat: add static pages build"
```

---

### Task 2: 构建产物验证

**Files:**
- Create: `scripts/verify-pages-build.mjs`
- Modify: `package.json`
- Modify: `tests/deployment/github-pages.test.ts`

**Interfaces:**
- Consumes: `dist-pages/index.html` 和 `dist-pages/assets/*`
- Produces: `npm run verify:pages`

- [ ] **Step 1: 写失败测试**

增加断言，要求 `package.json` 包含：

```ts
expect(scripts["verify:pages"]).toBe("node scripts/verify-pages-build.mjs");
```

- [ ] **Step 2: 验证 RED**

运行同一部署测试，预期因脚本不存在而失败。

- [ ] **Step 3: 实现产物验证脚本**

脚本必须：

- 检查 `dist-pages/index.html`；
- 检查至少一个 JS 和一个 CSS 资产；
- 检查 HTML 中资源 URL 含仓库基础路径；
- 检查 `og-v3.png` 和 `favicon.svg` 被复制；
- 失败时以非零退出码结束。

向 `package.json` 添加：

```json
"verify:pages": "node scripts/verify-pages-build.mjs"
```

- [ ] **Step 4: 验证 GREEN**

```bash
npm run build:pages
npm run verify:pages
```

预期：命令退出码 0，并输出验证过的文件数量。

- [ ] **Step 5: 提交**

```bash
git add scripts/verify-pages-build.mjs package.json tests/deployment/github-pages.test.ts
git commit -m "test: verify pages build artifacts"
```

---

### Task 3: GitHub Pages 自动发布

**Files:**
- Create: `.github/workflows/deploy-pages.yml`
- Modify: `tests/deployment/github-pages.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: `npm run build:pages`、`npm run verify:pages`
- Produces: GitHub Pages deployment artifact and public URL

- [ ] **Step 1: 写失败测试**

测试读取工作流并断言：

```ts
expect(workflow).toContain("actions/configure-pages@v5");
expect(workflow).toContain("enablement: true");
expect(workflow).toContain("actions/upload-pages-artifact@v3");
expect(workflow).toContain("actions/deploy-pages@v4");
expect(workflow).toContain("npm run verify:pages");
```

- [ ] **Step 2: 验证 RED**

运行部署测试，预期因工作流不存在而失败。

- [ ] **Step 3: 实现工作流与 README**

工作流要求：

- 仅 `main` push 和手动触发；
- `permissions.contents: read`、`pages: write`、`id-token: write`；
- Node.js 22 + `npm ci`；
- 先测试部署契约，再构建和验证；
- `configure-pages@v5` 使用 `enablement: true`；
- 上传 `dist-pages`；
- deploy job 使用 `github-pages` environment。

README 顶部增加公开体验链接和 GitHub Pages 自动部署说明。

- [ ] **Step 4: 验证 GREEN**

```bash
npm test -- tests/deployment/github-pages.test.ts --maxWorkers=1 --testTimeout=15000
npm run build:pages
npm run verify:pages
```

预期全部通过。

- [ ] **Step 5: 提交**

```bash
git add .github/workflows/deploy-pages.yml README.md tests/deployment/github-pages.test.ts
git commit -m "ci: deploy simulator to github pages"
```

---

### Task 4: 全量验证与发布

**Files:**
- Modify only if verification reveals a deployment-specific defect.

**Interfaces:**
- Consumes: Tasks 1–3
- Produces: public GitHub Pages URL

- [ ] **Step 1: 完整本地验证**

```bash
npm test -- --maxWorkers=1 --testTimeout=15000
npm run lint
npm run build
npm run build:pages
npm run verify:pages
git diff --check
```

预期：全部退出码 0。

- [ ] **Step 2: 公开内容扫描**

```bash
rg -n -i "feishu|lark|TileRushBot|ballclient|client_secret|app_secret|access_token|api[_-]?key|BEGIN .* PRIVATE KEY|C:\\Users|D:\\" --glob "!node_modules/**" --glob "!dist*/**" .
```

只允许测试扫描表达式或通用部署说明中出现关键词，不允许实际路径、链接或凭据。

- [ ] **Step 3: 推送功能分支和 main**

```bash
git push origin codex/editorial-research-ui
git fetch origin main
git merge-base --is-ancestor origin/main HEAD
git push origin HEAD:main
```

必须是快进更新。

- [ ] **Step 4: 检查 GitHub Actions 和公开 URL**

确认 Pages workflow 成功，随后请求：

```text
https://zlllllll395487.github.io/Island-Gold-Rush-Numerical-simulator/
```

预期：HTTP 200，页面标题为“海岛夺金 数值模拟”，静态 JS/CSS 均成功加载。

- [ ] **Step 5: 记录发布结果**

报告提交哈希、工作流状态、公开 URL、测试总数，以及任何仅存在于 jsdom 的已知 Canvas 提示。

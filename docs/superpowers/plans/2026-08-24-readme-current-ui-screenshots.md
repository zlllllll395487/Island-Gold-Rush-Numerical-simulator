# README Current UI Screenshots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the obsolete concept artwork with two real screenshots of the current simulator and publish them on GitHub.

**Architecture:** Keep `public/og-v3.png` as the canonical overview and social-sharing image so existing metadata remains valid. Add one focused ranking/score-ledger image and reference both assets from the README without changing application code.

**Tech Stack:** PNG assets, Markdown, Git, GitHub Pages.

## Global Constraints

- Use the supplied real simulator screenshots without redrawing the interface.
- The overview image must exclude browser chrome and show the finished simulation state.
- The ranking image must demonstrate player ranking and individual score-event history.
- Do not expose local paths, accounts, internal documents, credentials, or real player data.
- Do not change simulation logic, parameters, UI layout, or deployment configuration.

---

### Task 1: Replace Public Showcase Assets

**Files:**
- Replace: `public/og-v3.png`
- Create: `public/player-ranking-score-history.png`

**Interfaces:**
- Consumes: supplied PNG screenshots with SHA-256 `F79F514D76DEA400CB7F587665C688926AB3A1B5D8B203E9AC28A2D5E10C134E` and `5B35F8897662A1D7869574C77D5B3478D4457FB971B2D550BE176528829D3895`
- Produces: stable public image paths used by README and metadata

- [ ] **Step 1: Record the current asset state**

Run:

```powershell
Get-FileHash public/og-v3.png -Algorithm SHA256
Test-Path public/player-ranking-score-history.png
```

Expected: the overview hash is not the supplied overview hash and the ranking image is absent.

- [ ] **Step 2: Copy the approved screenshots**

Copy the first supplied PNG byte-for-byte to `public/og-v3.png` and the second to `public/player-ranking-score-history.png`.

- [ ] **Step 3: Verify exact asset identity and dimensions**

Run a PNG inspection that asserts:

```text
public/og-v3.png = 1911x941, SHA-256 F79F514D76DEA400CB7F587665C688926AB3A1B5D8B203E9AC28A2D5E10C134E
public/player-ranking-score-history.png = 1880x935, SHA-256 5B35F8897662A1D7869574C77D5B3478D4457FB971B2D550BE176528829D3895
```

- [ ] **Step 4: Commit the asset update with the README change in Task 2**

Do not create a partial asset-only commit; the two images and their README references are one deliverable.

### Task 2: Present Both Screenshots in README

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: `public/og-v3.png` and `public/player-ranking-score-history.png`
- Produces: a GitHub landing page showing both current simulator views

- [ ] **Step 1: Verify the second screenshot is not referenced yet**

Run:

```powershell
rg -n "player-ranking-score-history|玩家排名与积分流水" README.md
```

Expected: no match.

- [ ] **Step 2: Add concise screenshot labels and references**

Keep the live link first, then render:

```markdown
### 仿真总览

![海岛夺金数值模拟器仿真总览](public/og-v3.png)

### 玩家排名与积分流水

![海岛夺金数值模拟器玩家排名与积分流水](public/player-ranking-score-history.png)
```

- [ ] **Step 3: Verify README and privacy scope**

Run:

```powershell
rg -n "og-v3.png|player-ranking-score-history.png" README.md
rg -n "credential|authorization|bearer|private[_-]?key|access[_-]?token|client[_-]?secret" README.md public -i -g "*.md" -g "*.txt"
```

Expected: both image references are present and the sensitive-pattern scan has no new match.

- [ ] **Step 4: Run repository verification**

Run:

```powershell
npm test -- --maxWorkers=1 --testTimeout=15000
npm run lint
npm run build:pages
npm run verify:pages
```

Expected: all commands pass and the built site contains the updated `og-v3.png`.

- [ ] **Step 5: Commit and push the exact allowlist**

Stage only:

```text
README.md
public/og-v3.png
public/player-ranking-score-history.png
docs/superpowers/specs/2026-08-24-readme-current-ui-screenshot-design.md
docs/superpowers/plans/2026-08-24-readme-current-ui-screenshots.md
```

Commit message:

```text
docs: refresh simulator showcase images
```

Push the current branch to its configured GitHub remote, then verify both images render from the public repository and the GitHub Pages URL remains accessible.

# 每小时场均战功 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将战斗节奏图的累计场均战功折线改为每小时独立场均战功，同时保留顶部整局累计场均指标。

**Architecture:** `overviewReplaySeries` 按小时聚合战斗次数与战斗积分，输出 `hourlyAverageBattlePoints`。`BattleRhythmChart` 使用该字段绘线，并以非零小时数据的局部范围进行纵轴缩放。

**Tech Stack:** TypeScript、React、Vitest、SVG。

## Global Constraints

- 不修改战斗公式和战功结算规则。
- 顶部“每场战斗平均战功”继续表示截至回放时刻的累计平均。
- 折线文案明确写作“每小时场均战功”。

---

### Task 1: 小时场均战功聚合与绘制

**Files:**
- Modify: `src/analytics/overview-analytics.ts`
- Modify: `src/components/OverviewAnalyticsCharts.tsx`
- Test: `tests/analytics/overview-analytics.test.ts`
- Test: `tests/components/overview-analytics-charts.test.tsx`

**Interfaces:**
- Consumes: `SimulationResult.timeline` 中的 battle 事件与 `SimulationResult.scoreEvents` 中的 battle 积分事件。
- Produces: `OverviewReplayPoint.hourlyAverageBattlePoints: number`。

- [ ] **Step 1: 写失败测试**

验证每个小时分别使用该小时战功总和除以该小时战斗次数，并验证图例使用“每小时场均战功”。

- [ ] **Step 2: 运行测试确认 RED**

Run: `npm test -- tests/analytics/overview-analytics.test.ts tests/components/overview-analytics-charts.test.tsx --maxWorkers=1 --testTimeout=30000`

- [ ] **Step 3: 最小实现**

增加每小时战功聚合；折线读取小时平均值，并按非零小时最小值与最大值缩放，常数数据使用安全回退范围。

- [ ] **Step 4: 运行测试确认 GREEN**

Run: `npm test -- tests/analytics/overview-analytics.test.ts tests/components/overview-analytics-charts.test.tsx --maxWorkers=1 --testTimeout=30000`

- [ ] **Step 5: 回归验证**

Run: `npm test -- tests/components/dashboard.test.tsx tests/components/overview-dashboard-integration.test.tsx --maxWorkers=1 --testTimeout=30000`

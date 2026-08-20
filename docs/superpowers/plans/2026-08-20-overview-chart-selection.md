# 总览图表定稿 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将已确认的联盟差值图、分层贡献热力图和贡献集中度曲线接入总览，并保留战斗节奏图。

**Architecture:** 扩展回放时点玩家贡献数据的分层字段；图表组件只消费当前回放数据并自行完成展示聚合。仪表盘负责四图布局和时间同步。

**Tech Stack:** TypeScript、React、SVG、Vitest。

## Global Constraints

- 不修改仿真与战斗公式。
- 地图保持主视觉。
- 下方三张图宽屏同排，窄屏换行。
- 所有图跟随回放时间。

---

### Task 1: 图表语义与布局

**Files:**
- Modify: `src/analytics/overview-analytics.ts`
- Modify: `src/components/OverviewAnalyticsCharts.tsx`
- Modify: `src/components/SimulationDashboardV2.tsx`
- Modify: `src/components/overview-single-screen.css`
- Test: `tests/analytics/overview-analytics.test.ts`
- Test: `tests/components/overview-analytics-charts.test.tsx`
- Test: `tests/components/overview-dashboard-integration.test.tsx`
- Test: `tests/components/editorial-layout.test.tsx`

- [ ] 写失败测试：联盟差值、玩家分层、集中度和三列布局。
- [ ] 运行专项测试确认 RED。
- [ ] 实现三张新图并移除旧散点图。
- [ ] 运行专项与仪表盘回归确认 GREEN。
- [ ] 运行 lint、静态构建与本地验收同步。

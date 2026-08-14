import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import { ParameterPanel } from "../../src/components/ParameterPanel";
import { PARAMETER_CATALOG, PARAMETER_GROUPS } from "../../src/components/parameter-catalog";
import { DEFAULT_CONFIG } from "../../src/domain/defaults";
import type { SimulationConfig } from "../../src/domain/types";

const GROUP_NAMES = [
  "基础参数",
  "人口与战力",
  "活跃度",
  "行为策略",
  "行动力",
  "占领节奏",
  "战斗",
  "士气",
  "计分",
  "任务与奖励",
  "批量实验",
] as const;

function meaningfulLeafPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => meaningfulLeafPaths(entry, `${prefix}.${index}`));
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, entry]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return path.endsWith(".id") ? [] : meaningfulLeafPaths(entry, path);
    });
  }
  return [prefix];
}

function renderPanel(draft: SimulationConfig = structuredClone(DEFAULT_CONFIG)) {
  const onChange = vi.fn();
  const onReset = vi.fn();
  const result = render(
    <ParameterPanel draft={draft} validation={[]} onChange={onChange} onReset={onReset} />,
  );
  return { ...result, onChange, onReset };
}

describe("parameter catalog", () => {
  test("covers each meaningful SimulationConfig leaf exactly once with practical unique labels", () => {
    const paths = PARAMETER_CATALOG.map((entry) => entry.path);
    const labels = PARAMETER_CATALOG.map((entry) => entry.label);
    const expectedPaths = meaningfulLeafPaths(DEFAULT_CONFIG).sort();

    expect(PARAMETER_GROUPS.map((group) => group.label)).toEqual(GROUP_NAMES);
    expect(paths).toHaveLength(120);
    expect(new Set(paths).size).toBe(paths.length);
    expect(new Set(labels).size).toBe(labels.length);
    expect([...paths].sort()).toEqual(expectedPaths);
    expect(labels.every((label) => label.trim().length > 0 && !label.includes("."))).toBe(true);
  });

  test("exposes every population control independently for all four power tiers", () => {
    const paths = new Set(PARAMETER_CATALOG.map((entry) => entry.path));
    const tierFields = [
      "powerShares",
      "basePower",
      "powerSigma",
      "mainFormationCounts",
      "weakFormationScale",
    ];

    for (const field of tierFields) {
      for (const tier of ["low", "mid", "high", "super"]) {
        expect(paths.has(`population.${field}.${tier}`)).toBe(true);
      }
    }
  });

  test("includes indexed activity, task, coverage, reward, and alliance controls", () => {
    const paths = new Set(PARAMETER_CATALOG.map((entry) => entry.path));

    for (let index = 0; index < 5; index += 1) {
      expect(paths.has(`activity.bands.${index}.share`)).toBe(true);
      expect(paths.has(`activity.bands.${index}.usage`)).toBe(true);
    }
    for (let index = 0; index < 3; index += 1) {
      expect(paths.has(`activity.allianceMultipliers.${index}`)).toBe(true);
    }
    for (let index = 0; index < 10; index += 1) {
      expect(paths.has(`tasks.thresholds.${index}`)).toBe(true);
      expect(paths.has(`tasks.targetCoverage.${index}`)).toBe(true);
      expect(paths.has(`rewards.taskValues.${index}`)).toBe(true);
    }
    for (let index = 0; index < 4; index += 1) {
      expect(paths.has(`rewards.tierShares.${index}`)).toBe(true);
    }
  });
});

describe("parameter panel", () => {
  test("renders all eleven groups in one vertical column with native controls and compact task rows", () => {
    const { container } = renderPanel();
    const panel = screen.getByTestId("parameter-panel");

    expect(panel).toHaveAttribute("data-layout", "vertical");
    for (const name of GROUP_NAMES) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(container.querySelector('input[type="range"]')).not.toBeNull();
    expect(container.querySelector('input[type="number"]')).not.toBeNull();
    expect(container.querySelector("select")).not.toBeNull();
    expect(screen.getAllByTestId(/^task-row-/)).toHaveLength(10);
  });

  test("shows the approved 45/25/30 strategy mix", () => {
    renderPanel();

    expect(screen.getByLabelText("中心争夺策略占比")).toHaveValue("45");
    expect(screen.getByLabelText("支援扩张策略占比")).toHaveValue("25");
    expect(screen.getByLabelText("多线推进策略占比")).toHaveValue("30");
  });

  test("filters controls by parameter name without changing the vertical layout", () => {
    renderPanel();

    fireEvent.change(screen.getByRole("searchbox", { name: "搜索参数" }), {
      target: { value: "超高战力普通编队强度" },
    });

    expect(screen.getByLabelText("超高战力普通编队强度")).toBeInTheDocument();
    expect(screen.queryByLabelText("随机种子")).not.toBeInTheDocument();
    expect(screen.getByTestId("parameter-panel")).toHaveAttribute("data-layout", "vertical");
  });

  test("emits an immutable updated draft when a value is edited", () => {
    const draft = structuredClone(DEFAULT_CONFIG);
    const { onChange } = renderPanel(draft);

    fireEvent.change(screen.getByLabelText("战斗时长（小时）"), { target: { value: "72" } });

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as SimulationConfig;
    expect(next).not.toBe(draft);
    expect(next.battleHours).toBe(72);
    expect(draft.battleHours).toBe(48);
  });

  test("delegates restoring defaults to the reset callback", () => {
    const { onReset } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "恢复默认" }));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  test("keeps draft validation visible and reports invalid dependent totals", () => {
    const draft = structuredClone(DEFAULT_CONFIG);
    draft.strategy.shares.centerRush = 0.5;
    render(
      <ParameterPanel
        draft={draft}
        validation={["行动力初始值不能超过上限"]}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    const alerts = screen.getAllByRole("alert");
    expect(alerts.some((alert) => within(alert).queryByText("行动力初始值不能超过上限"))).toBe(true);
    expect(alerts.some((alert) => /策略占比合计必须为 100%/.test(alert.textContent ?? ""))).toBe(true);
    expect(screen.getByText("策略占比合计 105%")) .toBeInTheDocument();
  });
});

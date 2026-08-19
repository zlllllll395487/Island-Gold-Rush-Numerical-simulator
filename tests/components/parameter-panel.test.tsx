import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import {
  getParameterValue,
  normalizeParameterInput,
  ParameterPanel,
} from "../../src/components/ParameterPanel";
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

function selectGroup(groupId: (typeof PARAMETER_GROUPS)[number]["id"]) {
  const group = PARAMETER_GROUPS.find((entry) => entry.id === groupId)!;
  const navigation = screen.getByRole("navigation", { name: /\u53c2\u6570\u5206\u7c7b/ });
  fireEvent.click(within(navigation).getByRole("button", { name: new RegExp(group.label) }));
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
  test("renders an eleven-chapter vertical inspector with native controls and compact task rows", () => {
    const { container } = renderPanel();
    const panel = screen.getByTestId("parameter-panel");
    const navigation = screen.getByRole("navigation", { name: /\u53c2\u6570\u5206\u7c7b/ });

    expect(panel).toHaveAttribute("data-layout", "vertical");
    expect(within(navigation).getAllByRole("button")).toHaveLength(11);
    for (const name of GROUP_NAMES) {
      expect(within(navigation).getByRole("button", { name: new RegExp(name) })).toBeInTheDocument();
    }
    expect(container.querySelector('input[type="number"]')).not.toBeNull();

    selectGroup("strategy");
    expect(container.querySelector('input[type="range"]')).not.toBeNull();
    selectGroup("morale");
    expect(container.querySelector("select")).not.toBeNull();

    selectGroup("tasksRewards");
    const taskRows = screen.getAllByTestId(/^task-row-/);
    expect(taskRows).toHaveLength(10);
    expect(taskRows[0]).toHaveClass("parameter-task-row");
    for (const row of taskRows) {
      expect(row.querySelectorAll(".parameter-control")).toHaveLength(3);
    }
    expect(container.querySelector("details, summary")).toBeNull();
  });

  test("shows the approved 45/25/30 strategy mix", () => {
    renderPanel();
    selectGroup("strategy");

    expect(screen.getByLabelText("中心争夺策略占比")).toHaveValue("45");
    expect(screen.getByLabelText("支援扩张策略占比")).toHaveValue("25");
    expect(screen.getByLabelText("多线推进策略占比")).toHaveValue("30");
  });

  test("keeps every chapter default within native min, max, and step constraints", () => {
    renderPanel();
    const invalidDefaults: string[] = [];

    for (const group of PARAMETER_GROUPS) {
      selectGroup(group.id);
      for (const entry of PARAMETER_CATALOG.filter((candidate) => candidate.group === group.id)) {
        const control = screen.getByLabelText(entry.label);
        if (!(control instanceof HTMLInputElement)) continue;
        if (!control.validity.valid) {
          invalidDefaults.push(entry.path + ": value=" + control.value + ", min=" + control.min + ", max=" + control.max + ", step=" + control.step);
        }
      }
    }

    expect(invalidDefaults).toEqual([]);
  });

  test("re-entering every chapter default preserves the exact config leaf", () => {
    renderPanel();
    const driftedPaths: string[] = [];

    for (const group of PARAMETER_GROUPS) {
      selectGroup(group.id);
      for (const entry of PARAMETER_CATALOG.filter((candidate) => candidate.group === group.id)) {
        const control = screen.getByLabelText(entry.label) as HTMLInputElement | HTMLSelectElement;
        const current = getParameterValue(DEFAULT_CONFIG, entry.path);
        const normalized = normalizeParameterInput(entry, current, control.value);
        if (normalized === null || !Object.is(normalized, current)) {
          driftedPaths.push(entry.path);
        }
      }
    }

    expect(driftedPaths).toEqual([]);
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

  test("ignores a blank numeric draft instead of coercing it to zero", () => {
    const { onChange } = renderPanel();

    fireEvent.change(screen.getByLabelText("战斗时长（小时）"), { target: { value: "" } });

    expect(onChange).not.toHaveBeenCalled();
  });

  test("ignores numeric overflow instead of emitting Infinity", () => {
    const { onChange } = renderPanel();

    fireEvent.change(screen.getByLabelText("战斗时长（小时）"), { target: { value: "1e309" } });

    expect(onChange).not.toHaveBeenCalled();
  });

  test("clamps displayed values to catalog bounds and snaps them to the configured step", () => {
    const draft = structuredClone(DEFAULT_CONFIG);
    const { onChange } = renderPanel(draft);
    const input = screen.getByLabelText("战斗时长（小时）");

    fireEvent.change(input, { target: { value: "0" } });
    expect((onChange.mock.lastCall?.[0] as SimulationConfig).battleHours).toBe(1);

    fireEvent.change(input, { target: { value: "200" } });
    expect((onChange.mock.lastCall?.[0] as SimulationConfig).battleHours).toBe(168);

    fireEvent.change(input, { target: { value: "72.6" } });
    expect((onChange.mock.lastCall?.[0] as SimulationConfig).battleHours).toBe(73);
    expect(draft.battleHours).toBe(48);
  });

  test("clamps a scaled percentage in displayed units before applying its scale", () => {
    const { onChange } = renderPanel();
    selectGroup("tasksRewards");

    fireEvent.change(screen.getByLabelText("任务 1 目标覆盖率"), { target: { value: "250" } });

    const next = onChange.mock.lastCall?.[0] as SimulationConfig;
    expect(next.tasks.targetCoverage[0]).toBe(1);
  });

  test("delegates restoring defaults to the reset callback", () => {
    const { onReset } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "恢复默认" }));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  test("preserves validation issue identity when issues are reordered", () => {
    const onChange = vi.fn();
    const onReset = vi.fn();
    const { rerender } = render(
      <ParameterPanel
        draft={DEFAULT_CONFIG}
        validation={[
          { id: "ap.initial.too_big", message: "初始 AP 超过上限" },
          { id: "tasks.thresholds.order", message: "任务阈值必须递增" },
        ]}
        onChange={onChange}
        onReset={onReset}
      />,
    );
    const initialApIssue = screen.getByText("初始 AP 超过上限");

    rerender(
      <ParameterPanel
        draft={DEFAULT_CONFIG}
        validation={[
          { id: "tasks.thresholds.order", message: "任务阈值必须递增" },
          { id: "ap.initial.too_big", message: "初始 AP 超过上限" },
        ]}
        onChange={onChange}
        onReset={onReset}
      />,
    );

    expect(screen.getByText("初始 AP 超过上限")).toBe(initialApIssue);
  });

  test("keeps draft validation visible and reports invalid dependent totals", () => {
    const draft = structuredClone(DEFAULT_CONFIG);
    draft.strategy.shares.centerRush = 0.5;
    render(
      <ParameterPanel
        draft={draft}
        validation={[{ id: "ap.initial.too_big", message: "行动力初始值不能超过上限" }]}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    selectGroup("strategy");

    const alerts = screen.getAllByRole("alert");
    expect(alerts.some((alert) => within(alert).queryByText("行动力初始值不能超过上限"))).toBe(true);
    expect(alerts.some((alert) => /策略占比合计必须为 100%/.test(alert.textContent ?? ""))).toBe(true);
    expect(screen.getByText("策略占比合计 105%")) .toBeInTheDocument();
  });
});

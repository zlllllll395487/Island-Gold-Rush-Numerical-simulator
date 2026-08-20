"use client";

import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { SimulationConfig } from "../domain/types";
import "./parameter-panel.css";
import {
  PARAMETER_CATALOG,
  PARAMETER_GROUPS,
  type ParameterCatalogEntry,
  type ParameterGroupId,
} from "./parameter-catalog";

export interface ParameterValidationIssue {
  id: string;
  message: string;
}

export interface ParameterPanelProps {
  activeGroup?: ParameterGroupId;
  draft: SimulationConfig;
  validation: readonly ParameterValidationIssue[];
  onChange: (next: SimulationConfig) => void;
  onReset: () => void;
}

interface TotalStatus {
  group: ParameterGroupId;
  label: string;
  value: number;
  expected: number;
  storedAsPercent?: boolean;
}

function pathSegments(path: string): (string | number)[] {
  return path.split(".").map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));
}

export function getParameterValue(config: SimulationConfig, path: string): string | number {
  let current: unknown = config;
  for (const segment of pathSegments(path)) {
    current = (current as Record<string | number, unknown>)[segment];
  }
  return current as string | number;
}

export function updateParameterValue(
  config: SimulationConfig,
  path: string,
  value: string | number,
): SimulationConfig {
  const next = structuredClone(config);
  const segments = pathSegments(path);
  let current: Record<string | number, unknown> = next as unknown as Record<string | number, unknown>;
  for (const segment of segments.slice(0, -1)) {
    current = current[segment] as Record<string | number, unknown>;
  }
  current[segments.at(-1)!] = value;
  return next;
}

function displayValue(entry: ParameterCatalogEntry, value: string | number): string | number {
  if (typeof value !== "number") return value;
  const displayed = value * (entry.scale ?? 1);
  return entry.scale === undefined ? displayed : Number(displayed.toPrecision(12));
}

function decimalPlaces(value: number): number {
  const [, fraction = ""] = String(value).toLowerCase().split(".");
  if (!fraction.includes("e-")) return fraction.length;
  const [digits, exponent] = fraction.split("e-");
  return digits.length + Number(exponent);
}

export function normalizeParameterInput(
  entry: ParameterCatalogEntry,
  current: string | number,
  raw: string,
): string | number | null {
  if (entry.control === "select" && typeof current === "string") return raw;
  if (raw.trim() === "") return null;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;

  let displayed = parsed;
  if (entry.min !== undefined) displayed = Math.max(entry.min, displayed);
  if (entry.max !== undefined) displayed = Math.min(entry.max, displayed);
  if (typeof entry.step === "number" && entry.step > 0) {
    const origin = entry.min ?? 0;
    displayed = origin + Math.round((displayed - origin) / entry.step) * entry.step;
    displayed = Number(displayed.toFixed(decimalPlaces(entry.step)));
    if (entry.min !== undefined) displayed = Math.max(entry.min, displayed);
    if (entry.max !== undefined) displayed = Math.min(entry.max, displayed);
  }

  return displayed / (entry.scale ?? 1);
}

function totalPercent(status: TotalStatus): number {
  return status.storedAsPercent ? status.value : status.value * 100;
}

function totalIsValid(status: TotalStatus): boolean {
  return Math.abs(status.value - status.expected) < 1e-6;
}

function formatPercent(value: number): string {
  return `${Number(value.toFixed(2))}%`;
}

function ParameterControl({
  draft,
  entry,
  onChange,
}: {
  activeGroup?: ParameterGroupId;
  draft: SimulationConfig;
  entry: ParameterCatalogEntry;
  onChange: (next: SimulationConfig) => void;
}) {
  const value = getParameterValue(draft, entry.path);
  const shownValue = displayValue(entry, value);
  const id = `parameter-${entry.path.replaceAll(".", "-")}`;
  const change = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const nextValue = normalizeParameterInput(entry, value, event.target.value);
    if (nextValue === null) return;
    onChange(updateParameterValue(draft, entry.path, nextValue));
  };

  return (
    <div className="parameter-control">
      <label htmlFor={id}>{entry.label}</label>

      {entry.control === "select" ? (
        <select id={id} value={shownValue} onChange={change}>
          {entry.options?.map((option) => (
            <option key={String(option.value)} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <>
          {entry.control === "range" ? (
            <output>{`${shownValue}${entry.suffix ?? ""}`}</output>
          ) : null}
          <input
            id={id}
            type={entry.control}
            min={entry.min}
            max={entry.max}
            step={entry.step}
            value={shownValue}
            onChange={change}
          />
        </>
      )}
    </div>
  );
}

const POWER_TIER_ROWS = [
  { id: "low", label: "低战力" },
  { id: "mid", label: "中战力" },
  { id: "high", label: "高战力" },
  { id: "super", label: "超高战力" },
] as const;

const POWER_MATRIX_FIELDS = [
  { id: "powerShares", label: "玩家占比" },
  { id: "basePower", label: "基础战力" },
  { id: "powerSigma", label: "战力波动" },
  { id: "mainFormationCounts", label: "主力编队" },
  { id: "weakFormationScale", label: "普通编队强度" },
] as const;
function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function buildTotals(draft: SimulationConfig): TotalStatus[] {
  return [
    {
      group: "population",
      label: "人口占比合计",
      value: sum(Object.values(draft.population.powerShares)),
      expected: 1,
    },
    {
      group: "activity",
      label: "活跃玩家占比合计",
      value: sum(draft.activity.bands.map((band) => band.share)),
      expected: 1,
    },
    {
      group: "strategy",
      label: "策略占比合计",
      value: sum(Object.values(draft.strategy.shares)),
      expected: 1,
    },
    {
      group: "strategy",
      label: "策略分配权重合计",
      value: draft.strategy.activityWeight + draft.strategy.powerWeight + draft.strategy.randomWeight,
      expected: 1,
    },
    {
      group: "strategy",
      label: "战线目标权重合计",
      value: draft.fronts.allianceObjectiveWeight + draft.fronts.personalStrategyWeight,
      expected: 1,
    },
    {
      group: "tasksRewards",
      label: "奖励占比合计",
      value: sum(draft.rewards.tierShares),
      expected: 100,
      storedAsPercent: true,
    },
  ];
}

export function ParameterPanel({ activeGroup = "basic", draft, validation, onChange, onReset }: ParameterPanelProps) {
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
  const totals = buildTotals(draft);
  const visibleByGroup = useMemo(() => {
    const result = new Map<ParameterGroupId, ParameterCatalogEntry[]>();
    for (const group of PARAMETER_GROUPS.filter((candidate) => candidate.id === activeGroup)) {
      const matchesGroup = group.label.toLocaleLowerCase("zh-CN").includes(normalizedQuery);
      const entries = PARAMETER_CATALOG.filter(
        (entry) =>
          entry.group === group.id &&
          (matchesGroup ||
            !normalizedQuery ||
            entry.label.toLocaleLowerCase("zh-CN").includes(normalizedQuery) ||
            entry.path.toLocaleLowerCase("en-US").includes(normalizedQuery)),
      );
      if (entries.length > 0) result.set(group.id, entries);
    }
    return result;
  }, [activeGroup, normalizedQuery]);

  return (
    <section className="parameter-panel" data-layout="vertical" data-variant="editorial" data-testid="parameter-panel">
      <header className="parameter-panel__header">
        <h2>参数调整</h2>
        <button type="button" onClick={onReset}>
          恢复默认
        </button>
      </header>
      <label className="parameter-search">
        <span>搜索参数</span>
        <input
          type="search"
          aria-label="搜索参数"
          placeholder="输入参数名称"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>


      {normalizedQuery ? (
        <p className="parameter-search-results" data-testid="parameter-search-results">
          {Array.from(visibleByGroup.keys())
            .map((id) => PARAMETER_GROUPS.find((group) => group.id === id)?.label)
            .filter(Boolean)
            .join(" / ")}
        </p>
      ) : null}
      {validation.map((issue) => (
        <p className="parameter-validation" role="alert" data-validation-id={issue.id} key={issue.id}>
          {issue.message}
        </p>
      ))}

      <div className="parameter-panel__groups" data-testid="parameter-category-editor">
        {PARAMETER_GROUPS.map((group) => {
          const entries = visibleByGroup.get(group.id);
          if (!entries) return null;
          const taskEntries = entries.filter((entry) => entry.taskIndex !== undefined);
          const regularEntries = entries.filter((entry) => entry.taskIndex === undefined);
          const groupTotals = totals.filter((status) => status.group === group.id);

          return (
            <section id={`parameter-section-${group.id}`} className="parameter-group" data-testid={`parameter-section-${group.id}`} key={group.id}>
              <header className="parameter-group__header"><p>{group.description}</p><h3>{group.label}</h3><span>{entries.length} 项参数</span></header>
              <div className="parameter-group__controls">
                {group.id === "population" ? (
                  <>
                    <div className="parameter-table-wrap">
                      <table className="parameter-matrix" aria-label="人口与战力参数">
                        <thead><tr><th>档位</th>{POWER_MATRIX_FIELDS.map((field) => <th key={field.id}>{field.label}</th>)}</tr></thead>
                        <tbody>
                          {POWER_TIER_ROWS.map((tier) => (
                            <tr key={tier.id}>
                              <th scope="row">{tier.label}</th>
                              {POWER_MATRIX_FIELDS.map((field) => {
                                const entry = entries.find((candidate) => candidate.path === `population.${field.id}.${tier.id}`);
                                return <td data-label={field.label} key={field.id}>{entry ? <ParameterControl draft={draft} entry={entry} onChange={onChange} /> : null}</td>;
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {regularEntries
                      .filter((entry) => !POWER_MATRIX_FIELDS.some((field) => entry.path.startsWith(`population.${field.id}.`)))
                      .map((entry) => <ParameterControl key={entry.path} draft={draft} entry={entry} onChange={onChange} />)}
                  </>
                ) : (
                  regularEntries.map((entry) => (
                    <ParameterControl key={entry.path} draft={draft} entry={entry} onChange={onChange} />
                  ))
                )}
                {group.id === "tasksRewards" && taskEntries.length > 0 ? (
                  <div className="parameter-table-wrap">
                    <table className="parameter-task-table" aria-label="任务参数">
                      <thead><tr><th>任务</th><th>积分阈值</th><th>目标覆盖率</th><th>奖励价值</th></tr></thead>
                      <tbody>
                        {Array.from({ length: 10 }, (_, taskIndex) => {
                          const rowEntries = taskEntries.filter((entry) => entry.taskIndex === taskIndex);
                          return (
                            <tr className="parameter-task-row" data-testid={`task-row-${taskIndex + 1}`} key={taskIndex}>
                              <th scope="row">任务 {taskIndex + 1}</th>
                              {rowEntries.map((entry) => <td data-label={entry.label.replace(/^任务 \d+ /, "")} key={entry.path}><ParameterControl draft={draft} entry={entry} onChange={onChange} /></td>)}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                {groupTotals.map((status) => {
                  const valid = totalIsValid(status);
                  return (
                    <div className="parameter-total" data-valid={valid} key={status.label}>
                      <span>{`${status.label} ${formatPercent(totalPercent(status))}`}</span>
                      {!valid ? <p role="alert">{`${status.label}必须为 100%`}</p> : null}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {visibleByGroup.size === 0 ? <p className="parameter-empty">没有匹配的参数</p> : null}
    </section>
  );
}

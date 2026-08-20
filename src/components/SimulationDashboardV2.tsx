"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import rawMap from "../data/tilerush-map.json";
import { calculateMatchMetrics, summarizeBatch } from "../analytics/metrics";
import { overviewAt, overviewReplaySeries, playerContributionAt, tileBattleHeatAt } from "../analytics/overview-analytics";
import { DEFAULT_CONFIG } from "../domain/defaults";
import { parseSimulationConfig } from "../domain/schemas";
import type { ActivityTier, BehaviorStrategy, PowerTier, SimulationConfig } from "../domain/types";
import { loadCanonicalMap } from "../map/map-loader";
import { buildMatchedPopulation } from "../population/match-alliances";
import { moraleMultiplier } from "../simulation/morale";
import { runSimulation } from "../simulation/engine";
import { nextSimulationSeed, summarizeSimulationWorkload, type SimulationWorkload } from "../simulation/run-session";
import { HexMapCanvasV2, type MapViewMode } from "./HexMapCanvasV2";
import { AllianceGapChart, BattleRhythmChart, PlayerContributionPareto, PlayerSegmentHeatmap } from "./OverviewAnalyticsCharts";
import { DecisionSummary } from "./DecisionSummary";
import { ParameterCategoryRail } from "./ParameterCategoryRail";
import { PARAMETER_GROUPS, type ParameterGroupId } from "./parameter-catalog";
import { ParameterPanel, type ParameterValidationIssue } from "./ParameterPanel";
import { PlayerDetailDrawer } from "./PlayerDetailDrawer";
import { SimulatorBrandMark } from "./SimulatorBrandMark";

const MAP = loadCanonicalMap(rawMap);
const TABS = ["仿真总览", "行动力与占领", "战斗与士气", "任务与奖励", "玩家与联盟排名", "批量实验"] as const;
const ALLIANCE_COLORS = ["#dc4c4c", "#2f72d5", "#c89022"];
const TIERS: readonly PowerTier[] = ["low", "mid", "high", "super"];
const TIER_NAMES: Record<PowerTier, string> = { low: "低战力", mid: "中战力", high: "高战力", super: "超高战力" };
const STRATEGY_NAMES: Record<BehaviorStrategy, string> = { centerRush: "中心争夺", supportExpand: "支援扩张", multiFront: "多线推进" };
const ACTIVITY_NAMES: Record<ActivityTier, string> = { minimal: "极低", casual: "休闲", normal: "普通", active: "活跃", core: "核心" };
const FIRST_PVP_STATUS_NAMES = { early: "早于目标", target: "命中目标", late: "晚于目标", none: "未发生" } as const;

const simulate = (config: SimulationConfig) => runSimulation({
  map: MAP,
  config,
  population: buildMatchedPopulation(config, config.seed),
  seed: config.seed,
});

const fmtTime = (value: number | null) => value === null
  ? "未发生"
  : `${Math.floor(value)}小时${Math.round((value - Math.floor(value)) * 60)}分`;
const compact = (value: number) => new Intl.NumberFormat("zh-CN", {
  notation: value > 999_999 ? "compact" : "standard",
  maximumFractionDigits: 1,
}).format(value);
const hourlyAverage = (value: number) => new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const percent = (value: number) => `${Math.round(value * 100)}%`;

const VALIDATION_MESSAGES: Record<string, string> = {
  "ap.custom": "初始 AP 不能超过 AP 上限",
  "population.custom": "人口占比合计必须为 100%",
  "activity.custom": "活跃玩家占比合计必须为 100%",
  "strategy.shares.custom": "策略占比合计必须为 100%",
  "strategy.custom": "策略分配权重合计必须为 100%",
  "fronts.custom": "战线目标权重合计必须为 100%",
  "morale.custom": "士气必须满足下限 ≤ 基础值 ≤ 上限",
  "combat.custom": "最低存活比例不能高于最高存活比例",
  "tasks.custom": "任务积分阈值必须严格递增",
  "rewards.custom": "奖励占比合计必须为 100%",
  "targets.custom": "首次 PvP 目标下限必须低于上限",
};

export function validateSimulationDraft(config: SimulationConfig): ParameterValidationIssue[] {
  try {
    parseSimulationConfig(config);
    return [];
  } catch (error) {
    const issues = (error as { issues?: Array<{ code?: string; path?: PropertyKey[]; message?: string }> }).issues ?? [];
    return issues.map((issue, index) => {
      const path = issue.path?.map(String).join(".") || "config";
      const id = `${path}.${issue.code ?? "invalid"}`;
      return { id, message: VALIDATION_MESSAGES[id] ?? issue.message ?? `参数校验失败 ${index + 1}` };
    });
  }
}

function sameConfig(left: SimulationConfig, right: SimulationConfig) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function SimulationDashboardV2() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("仿真总览");
  const [draft, setDraft] = useState<SimulationConfig>(() => structuredClone(DEFAULT_CONFIG));
  const [applied, setApplied] = useState<SimulationConfig>(() => structuredClone(DEFAULT_CONFIG));
  const [result, setResult] = useState(() => simulate(DEFAULT_CONFIG));
  const [hour, setHour] = useState(DEFAULT_CONFIG.battleHours);
  const [mapViewMode, setMapViewMode] = useState<MapViewMode>("ownership");
  const [dirty, setDirty] = useState(false);
  const [running, setRunning] = useState(false);
  const [workload, setWorkload] = useState<SimulationWorkload | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeParameterGroup, setActiveParameterGroup] = useState<ParameterGroupId>("basic");
  const [compactLayout, setCompactLayout] = useState(false);
  const parameterTriggerRef = useRef<HTMLButtonElement | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batch, setBatch] = useState<ReturnType<typeof summarizeBatch> | null>(null);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(max-width: 900px)");
    const syncCompact = (event?: MediaQueryListEvent) => {
      const nextCompact = event?.matches ?? query.matches;
      setCompactLayout(nextCompact);
      if (!nextCompact) setDrawerOpen(false);
    };
    syncCompact();
    query.addEventListener?.("change", syncCompact);
    return () => query.removeEventListener?.("change", syncCompact);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const frame = window.requestAnimationFrame(() => {
      sidebarRef.current?.querySelector<HTMLElement>('input[type="search"]')?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [drawerOpen]);

  const focusNextFrame = (target: React.RefObject<HTMLElement | null>) => {
    window.requestAnimationFrame(() => target.current?.focus());
  };
  const closeParameterDrawer = () => {
    setDrawerOpen(false);
    window.requestAnimationFrame(() => parameterTriggerRef.current?.focus());
  };

  useEffect(() => {
    if (!drawerOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeParameterDrawer();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [drawerOpen]);
  const activeParameterMeta = PARAMETER_GROUPS.find((group) => group.id === activeParameterGroup)!;
  const validation = useMemo(() => validateSimulationDraft(draft), [draft]);
  const metrics = useMemo(() => calculateMatchMetrics(result, applied), [result, applied]);
  const snapshot = result.snapshots[Math.min(result.snapshots.length - 1, Math.max(0, Math.round(hour)))];
  const overviewSeries = useMemo(() => overviewReplaySeries(result), [result]);
  const visibleOverviewSeries = useMemo(() => overviewSeries.filter((point) => point.second <= snapshot.second), [overviewSeries, snapshot.second]);
  const overviewCurrent = useMemo(() => overviewAt(result, snapshot.second), [result, snapshot.second]);
  const currentHourlyAverageBattlePoints = visibleOverviewSeries.findLast((point) => point.hourlyBattles > 0)?.hourlyAverageBattlePoints ?? 0;
  const currentBattleHeat = useMemo(() => tileBattleHeatAt(result, snapshot.second), [result, snapshot.second]);
  const currentPlayerContribution = useMemo(() => playerContributionAt(result, snapshot.second), [result, snapshot.second]);
  const sortedAlliances = [...result.alliances].sort((left, right) => left.rank - right.rank);
  const selectedPlayer = selectedPlayerId ? result.players.find((player) => player.id === selectedPlayerId) ?? null : null;
  const totalPowerByAlliance = result.alliances.map((alliance) =>
    result.players.filter((player) => player.allianceId === alliance.id).reduce((sum, player) => sum + player.power, 0),
  );
  const alliancePowerRatio = Math.max(...totalPowerByAlliance) / Math.max(1, Math.min(...totalPowerByAlliance));
  const mainFormationHeadline = `${TIERS.map((tier) => applied.population.mainFormationCounts[tier]).join(" / ")} 主力编队`;

  const updateDraft = (next: SimulationConfig) => {
    setDraft(next);
    setDirty(!sameConfig(next, applied));
  };
  const resetDraft = () => {
    const next = structuredClone(DEFAULT_CONFIG);
    setDraft(next);
    setDirty(!sameConfig(next, applied));
  };
  const runSingle = (mode: "random" | "reproduce") => {
    if (running || validation.length > 0) return;
    const next = structuredClone(draft);
    if (mode === "random") next.seed = nextSimulationSeed(applied.seed);
    setRunning(true);
    setTimeout(() => {
      const startedAt = performance.now();
      const nextResult = simulate(next);
      const elapsedMs = performance.now() - startedAt;
      setResult(nextResult);
      setApplied(next);
      setDraft(structuredClone(next));
      setWorkload(summarizeSimulationWorkload(nextResult, next.battleHours, elapsedMs));
      setHour(next.battleHours);
      setDirty(false);
      setBatch(null);
      setRunning(false);
    }, 0);
  };
  const runBatch = () => {
    if (batchRunning) return;
    const batchConfig = structuredClone(applied);
    setBatchRunning(true);
    setTimeout(() => {
      const rows = Array.from({ length: batchConfig.batchRuns }, (_, index) => {
        const config = { ...batchConfig, seed: batchConfig.seed + index + 1 };
        const match = simulate(config);
        const matchMetrics = calculateMatchMetrics(match, config);
        return { firstPvpHour: matchMetrics.firstPvpHour, dominance: matchMetrics.dominance };
      });
      setBatch(summarizeBatch(rows, batchConfig.targets.firstPvpHours));
      setBatchRunning(false);
    }, 0);
  };
  const chance = (attacker: PowerTier, defender: PowerTier) => {
    const attack = applied.population.basePower[attacker] * moraleMultiplier(100, applied.morale);
    const defense = applied.population.basePower[defender] * moraleMultiplier(150, applied.morale);
    return 1 / (1 + Math.exp(-applied.combat.winProbabilitySlope * Math.log(attack / defense)));
  };

  return (
    <main className="simulation-app editorial-workspace" data-parameter-drawer-open={drawerOpen ? "true" : "false"}>
      <header className="simulation-topbar" aria-label="模拟器导航">
        <div className="simulation-topbar__brand">
          <SimulatorBrandMark />
          <div><strong>海岛夺金 · 数值模拟</strong><p>数值分析工作区</p></div>
        </div>
        <div className="simulation-topbar__tabs" role="tablist" aria-label="分析页面">
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={tab === name}
              aria-controls="analysis-workspace"
              onClick={() => {
                setTab(name);
                setSelectedPlayerId(null);
                if (compactLayout && drawerOpen) setDrawerOpen(false);
                focusNextFrame(workspaceRef);
              }}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="simulation-topbar__actions">
          <div className="simulation-topbar__status">
            <span>种子 <b data-testid="applied-seed">{applied.seed}</b></span>
            <strong className={dirty ? "draft-status is-dirty" : "draft-status"}>{dirty ? "草稿待运行" : "结果已应用"}</strong>
          </div>
          <button className="secondary-button" type="button" onClick={() => runSingle("reproduce")} disabled={running || validation.length > 0}>按当前种子复现</button>
          <button className="run-button" type="button" onClick={() => runSingle("random")} disabled={running || validation.length > 0}>
            {running ? "仿真运行中…" : "运行仿真"}
          </button>
        </div>
      </header>

      <ParameterCategoryRail
        activeGroup={activeParameterGroup}
        expanded={drawerOpen}
        onSelect={(group, trigger) => {
          parameterTriggerRef.current = trigger;
          if (drawerOpen && group === activeParameterGroup) {
            closeParameterDrawer();
            return;
          }
          setActiveParameterGroup(group);
          setDrawerOpen(true);
        }}
      />

      {drawerOpen ? (
        <>
          <button className="parameter-drawer-backdrop" type="button" aria-label="关闭参数配置" onClick={closeParameterDrawer} />
          <aside
            ref={sidebarRef}
            id="parameter-sidebar"
            className="parameter-editor-drawer"
            data-open="true"
            data-testid="parameter-sidebar"
            role="dialog"
            aria-modal="true"
            aria-label={activeParameterMeta.label + "配置"}
          >
            <ParameterPanel
              activeGroup={activeParameterGroup}
              draft={draft}
              validation={validation}
              onChange={updateDraft}
              onReset={resetDraft}
            />
          </aside>
        </>
      ) : null}

      <section className="analysis-shell">        <DecisionSummary metrics={metrics} targetRange={applied.targets.firstPvpHours} />

        <section ref={workspaceRef} id="analysis-workspace" className="analysis-workspace" data-testid="analysis-workspace" tabIndex={-1}>

          {tab === "仿真总览" && (
            <div className="overview-report" data-testid="overview-report">
              <div className="overview-analytics-grid" data-testid="overview-analytics-grid">
                <div className="overview-primary-grid">
                  <div className="overview-map-row" data-testid="overview-map-row">
                    <section className="overview-map-figure map-panel map-plate-primary">
                      <header className="figure-heading">
                        <div><p>地图回放</p><h2>T+{snapshot.hour.toFixed(0)}h · 战局地图</h2></div>
                        <fieldset className="map-view-switch" aria-label="地图视图">
                          {(["ownership", "heat", "value"] as const).map((mode) => (
                            <label key={mode}>
                              <input type="radio" name="map-view" checked={mapViewMode === mode} onChange={() => setMapViewMode(mode)} />
                              <span>{mode === "ownership" ? "联盟归属" : mode === "heat" ? "战斗热区" : "地格价值"}</span>
                            </label>
                          ))}
                        </fieldset>
                      </header>
                      <div className="map-stage">
                        <HexMapCanvasV2 map={MAP} snapshot={snapshot} mode={mapViewMode} battleHeat={currentBattleHeat} />
                        <label className="timeline"><span>回放时间</span><output>T+{hour}h</output><input aria-label="回放时间" type="range" min="0" max={applied.battleHours} value={hour} onChange={(event) => setHour(Number(event.target.value))} /></label>
                        <div className="map-legend"><strong>地格图例</strong>{["普通", "资源晶体", "核心", "山地", "水域", "交战/队列"].map((name, index) => <span key={name}><i className={"legend l" + index} />{name}</span>)}</div>
                        {workload ? <p className="simulation-workload" data-testid="simulation-workload">{compact(workload.tenSecondTicks)} 个时间步 · {compact(workload.timelineEvents)} 条事件 · 出征 {compact(workload.dispatches)} · 战斗 {compact(workload.battles)} · 占领 {compact(workload.captures)} · 积分流水 {compact(workload.scoreEvents)} · {workload.elapsedMs.toFixed(1)}ms</p> : null}
                      </div>
                    </section>
                    <aside className="overview-current-state" aria-label="当前战况">
                      <h2>当前战况</h2>
                      <p><span>总战斗次数</span><strong>{compact(overviewCurrent.totalBattles)}</strong></p>
                      <p><span>每小时场均战功</span><strong>{hourlyAverage(currentHourlyAverageBattlePoints)}</strong></p>
                      <p><span>领先联盟易手</span><strong>{overviewCurrent.rankChangeCount}</strong></p>
                    </aside>
                  </div>
                  <AllianceGapChart points={overviewSeries} currentSecond={snapshot.second} />
                </div>
                <div className="overview-secondary-grid">
                  <BattleRhythmChart points={visibleOverviewSeries} metrics={overviewCurrent} />
                  <PlayerSegmentHeatmap points={currentPlayerContribution} />
                  <PlayerContributionPareto points={currentPlayerContribution} />
                </div>
                <footer className="overview-model-note"><span data-testid="main-formation-summary">{mainFormationHeadline}</span><span>{Number((applied.population.basePower.super / applied.population.basePower.low).toFixed(1))}× 超高/低档基础战力 · 联盟战力比 {alliancePowerRatio.toFixed(2)}</span></footer>
              </div>
            </div>          )}          {tab === "行动力与占领" && (
            <div className="content-grid">
              <article className="result-card"><span>总体 AP 使用率</span><strong>{percent(metrics.apUtilization)}</strong><small>恢复溢出 {percent(metrics.apOverflowRate)}</small></article>
              <article className="result-card"><span>首次 PvP</span><strong>{fmtTime(metrics.firstPvpHour)}</strong><small>状态：{FIRST_PVP_STATUS_NAMES[metrics.firstPvpStatus]}</small></article>
              <article className="result-card"><span>已应用占领倍率</span><strong data-testid="applied-pace-multiplier">{applied.occupation.paceMultiplier}×</strong><small>仅运行仿真后更新</small></article>
              <article className="result-card"><span>争夺集中度</span><strong>{metrics.contestConcentration.toFixed(3)}</strong><small>{metrics.uniqueContestedTiles} 个争夺地格</small></article>
              <section className="analysis-card wide-card"><header className="card-heading"><div><p>玩家行为结果</p><h2>各活跃度行动力利用率</h2></div></header><div className="activity-bars">{metrics.activityUtilization.map((row) => <div key={row.tier}><span>{ACTIVITY_NAMES[row.tier]}<small>{row.players} 人</small></span><i><b style={{ width: percent(row.utilization) }} /></i><strong>{percent(row.utilization)}</strong></div>)}</div></section>
              <section className="analysis-card wide-card formula-card"><h2>占领时间公式</h2><code>(基础时长 + max(0, 基地距离 − {applied.occupation.safeDistance}) × {applied.occupation.secondsPerExcessHex}s) × {applied.occupation.paceMultiplier}</code></section>
            </div>
          )}

          {tab === "战斗与士气" && (
            <div className="content-grid">
              <section className="analysis-card formula-card"><p>当前公式</p><h2>士气伤害系数</h2><code>{applied.morale.formulaMode === "linear" ? "士气 / 100" : `${applied.morale.coefficientIntercept.toFixed(4)} + ${applied.morale.coefficientSlope.toFixed(4)} × 士气/100`}</code><div className="anchor-grid">{[20, 100, 150].map((value) => <span key={value}>士气 {value}<b>{percent(moraleMultiplier(value, applied.morale))}</b></span>)}</div></section>
              <section className="analysis-card matrix-card"><header className="card-heading"><div><p>进攻士气 100 / 防守士气 150</p><h2>战力档对战胜率</h2></div></header><div className="table-scroll"><table><thead><tr><th>进 / 防</th>{TIERS.map((tier) => <th key={tier}>{TIER_NAMES[tier]}</th>)}</tr></thead><tbody>{TIERS.map((attacker) => <tr key={attacker}><th>{TIER_NAMES[attacker]}</th>{TIERS.map((defender) => <td key={defender}>{percent(chance(attacker, defender))}</td>)}</tr>)}</tbody></table></div></section>
              <section className="analysis-card wide-card fact-row"><span>单编队兵力 <b>{compact(applied.combat.troopSize)}</b></span><span>结算间隔 <b>{applied.combat.battleIntervalSeconds} 秒</b></span><span>每点战功击杀 <b>{compact(applied.scoring.killsPerPoint)}</b></span><span>本局 PvP <b>{metrics.pvpEvents} 场</b></span></section>
            </div>
          )}

          {tab === "任务与奖励" && (
            <section className="analysis-card task-results"><header className="card-heading"><div><p>使用已应用参数计算</p><h2>任务达成与奖励结果</h2></div><span>奖励倍率 {applied.rewards.multiplier}×</span></header><div className="table-scroll"><table><thead><tr><th>任务</th><th>积分阈值</th><th>奖励价值</th><th>实际达成率</th><th>目标覆盖率</th><th>边际价值/分</th></tr></thead><tbody>{applied.tasks.thresholds.map((threshold, index) => <tr key={index}><th>任务 {index + 1}</th><td>{threshold}</td><td>{metrics.taskRewardValues[index]}</td><td><span className="coverage-bar"><i style={{ width: percent(metrics.taskCoverage[index]) }} /></span>{percent(metrics.taskCoverage[index])}</td><td>{percent(applied.tasks.targetCoverage[index])}</td><td>{metrics.rewardMarginalValue[index].toFixed(3)}</td></tr>)}</tbody></table></div><div className="reward-distribution">{["前段", "中段", "高段", "顶段"].map((label, index) => <span key={label} style={{ flex: applied.rewards.tierShares[index] }}>{label} {applied.rewards.tierShares[index]}%</span>)}</div></section>
          )}

          {tab === "玩家与联盟排名" && (
            <>
              <div className="ranking-layout">
                <section className="alliance-ranking">
                  {sortedAlliances.map((alliance) => (
                    <article key={alliance.id} style={{ borderTopColor: ALLIANCE_COLORS[alliance.id - 1] }}>
                      <span>第 {alliance.rank} 名</span>
                      <h2>{alliance.name}</h2>
                      <strong>{alliance.snapshotScore}</strong>
                      <small>地图分 · {alliance.tileCount} 格 · 累计贡献 {alliance.contributionScore}</small>
                    </article>
                  ))}
                </section>
                <section className="analysis-card player-ranking">
                  <header className="card-heading"><div><p>当前单局</p><h2>玩家结果排名</h2></div></header>
                  <div className="table-scroll">
                    <table>
                      <thead><tr><th>#</th><th>玩家</th><th>联盟</th><th>战力</th><th>策略</th><th>AP 使用</th><th>击杀</th><th>占领</th><th>总分</th></tr></thead>
                      <tbody>
                        {[...result.players].sort((left, right) => right.personalScore - left.personalScore).map((player, index) => (
                          <tr key={player.id}>
                            <td>{index + 1}</td>
                            <th>
                              <button
                                className="player-ledger-trigger"
                                type="button"
                                aria-label={`查看${player.name}积分流水`}
                                aria-controls="player-detail-drawer"
                                aria-expanded={selectedPlayerId === player.id}
                                onClick={() => setSelectedPlayerId((current) => current === player.id ? null : player.id)}
                              >
                                {player.name}
                              </button>
                              <small>{player.id} · {TIER_NAMES[player.powerTier]}</small>
                            </th>
                            <td><i className="alliance-dot" style={{ background: ALLIANCE_COLORS[player.allianceId - 1] }} />{player.allianceId}</td>
                            <td>{compact(player.power)}</td>
                            <td>{STRATEGY_NAMES[player.behaviorStrategy]}</td>
                            <td>{percent(player.apSpent / Math.max(1, player.apSupply))}</td>
                            <td>{compact(player.kills)}</td>
                            <td>{player.occupations}</td>
                            <td><b>{player.personalScore}</b></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
              {selectedPlayer ? (
                <div id="player-detail-drawer">
                  <PlayerDetailDrawer
                    result={result}
                    player={selectedPlayer}
                    allianceName={result.alliances.find((alliance) => alliance.id === selectedPlayer.allianceId)?.name ?? `联盟 ${selectedPlayer.allianceId}`}
                    hour={hour}
                    maxHour={applied.battleHours}
                    onHourChange={setHour}
                    onClose={() => setSelectedPlayerId(null)}
                  />
                </div>
              ) : null}
            </>
          )}
          {tab === "批量实验" && (
            <section className="analysis-card batch-results-panel"><header className="card-heading"><div><p>基于当前已应用参数 · {applied.batchRuns} 局</p><h2>批量实验结果</h2></div><button type="button" className="secondary-button" disabled={batchRunning} onClick={runBatch}>{batchRunning ? "批量实验运行中…" : `运行 ${applied.batchRuns} 局实验`}</button></header>{batch ? <div className="batch-summary"><article><span>PvP 中位数</span><strong>{fmtTime(batch.firstPvpMedian)}</strong></article><article><span>目标命中率</span><strong>{percent(batch.firstPvpTargetRate)}</strong></article><article><span>统治风险</span><strong>{percent(batch.dominanceRisk)}</strong></article></div> : <p className="empty-state">尚未运行批量实验。运行后将在此显示跨随机种子的稳定性结果。</p>}</section>
          )}
        </section>
      </section>
    </main>
  );
}

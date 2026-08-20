"use client";

import type {
  OverviewCurrentMetrics,
  OverviewReplayPoint,
  PlayerContributionPoint,
} from "../analytics/overview-analytics";
import type { ActivityTier, PowerTier } from "../domain/types";

const COLORS = ["#a55b56", "#557b8c", "#a88642"] as const;
const ALLIANCE_NAMES = ["赤潮联邦", "蓝湾议会", "金帆同盟"] as const;
const POWER_TIERS: readonly PowerTier[] = ["low", "mid", "high", "super"];
const ACTIVITY_TIERS: readonly ActivityTier[] = ["minimal", "casual", "normal", "active", "core"];
const POWER_NAMES: Record<PowerTier, string> = { low: "低战力", mid: "中战力", high: "高战力", super: "超高战力" };
const ACTIVITY_NAMES: Record<ActivityTier, string> = { minimal: "极低", casual: "休闲", normal: "普通", active: "活跃", core: "核心" };
const compact = (value: number) => new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 1 }).format(value);
const precise = (value: number) => new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

function chartScale(values: readonly number[], bottom = 126, top = 16) {
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  return (value: number) => bottom - ((value - min) / Math.max(1, max - min)) * (bottom - top);
}

const signed = (value: number) => `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}`;

export function AllianceGapChart({ points, currentSecond }: { points: readonly OverviewReplayPoint[]; currentSecond: number }) {
  const visible = points.filter((point) => point.second <= currentSecond);
  const maxSecond = Math.max(1, visible.at(-1)?.second ?? currentSecond);
  const gaps = visible.map((point) => {
    const mean = point.allianceTotals.reduce((sum, value) => sum + value, 0) / 3;
    return point.allianceTotals.map((value) => value - mean) as [number, number, number];
  });
  const allValues = gaps.flat();
  const y = chartScale(allValues);
  const x = (second: number) => 34 + (Math.min(second, maxSecond) / maxSecond) * 350;
  const zeroY = y(0);
  const last = gaps.at(-1) ?? [0, 0, 0];

  return (
    <section className="overview-chart strategic-trend-chart alliance-gap-chart">
      <header className="overview-chart__heading"><div><p>战略走势</p><h2>联盟相对平均分差</h2></div><span>高于 0 代表领先平均</span></header>
      <svg viewBox="0 0 470 150" role="img" aria-label="三联盟相对平均分差" preserveAspectRatio="none">
        {[16, 43, 70, 98, 126].map((gridY) => <line key={gridY} x1="34" y1={gridY} x2="384" y2={gridY} className="analytics-grid" />)}
        <line x1="34" y1={zeroY} x2="384" y2={zeroY} className="analytics-zero-line" />
        {COLORS.map((color, allianceIndex) => (
          <polyline key={color} data-testid={`alliance-gap-line-${allianceIndex + 1}`} points={visible.map((point, index) => `${x(point.second)},${y(gaps[index][allianceIndex])}`).join(" ")} fill="none" stroke={color} strokeWidth="2" />
        ))}
        {COLORS.map((color, index) => (
          <text key={color} x="392" y={y(last[index]) + 3} fill={color} className="analytics-end-label">{signed(last[index])}</text>
        ))}
      </svg>
      <footer className="overview-chart__legend">{ALLIANCE_NAMES.map((name, index) => <span key={name}><i style={{ background: COLORS[index] }} />{name}</span>)}</footer>
    </section>
  );
}

export function BattleRhythmChart({ points, metrics }: { points: readonly OverviewReplayPoint[]; metrics: OverviewCurrentMetrics }) {
  const maxCount = Math.max(1, ...points.flatMap((point) => [point.hourlyBattles, point.hourlyCaptures]));
  const averageSamples = points.map((point, index) => ({ index, value: point.hourlyAverageBattlePoints })).filter((sample) => points[sample.index].hourlyBattles > 0);
  const averageValues = averageSamples.map((sample) => sample.value);
  const currentHourlyAverageBattlePoints = points.findLast((point) => point.hourlyBattles > 0)?.hourlyAverageBattlePoints ?? 0;
  const averageMin = averageValues.length > 0 ? Math.min(...averageValues) : 0;
  const averageMax = averageValues.length > 0 ? Math.max(...averageValues) : 1;
  const rawAverageSpan = averageMax - averageMin;
  const averagePadding = rawAverageSpan > 0 ? rawAverageSpan * 0.1 : Math.max(0.5, Math.abs(averageMax) * 0.05);
  const averageDomainMin = Math.max(0, averageMin - averagePadding);
  const averageDomainMax = averageMax + averagePadding;
  const width = 374 / Math.max(1, points.length);
  const x = (index: number) => 38 + index * width;
  const countHeight = (value: number) => (value / maxCount) * 92;
  const averageY = (value: number) => 124 - ((value - averageDomainMin) / Math.max(0.001, averageDomainMax - averageDomainMin)) * 98;

  return (
    <section className="overview-chart battle-rhythm-chart">
      <header className="overview-chart__heading"><div><p>交战节奏</p><h2>战斗与占领事件</h2></div></header>
      <div className="battle-metric-strip">
        <span>总战斗次数<strong data-testid="overview-total-battles">{compact(metrics.totalBattles)}</strong></span>
        <span>每小时场均战功<strong data-testid="overview-average-battle-score">{precise(currentHourlyAverageBattlePoints)}</strong></span>
        <span>领先联盟易手<strong data-testid="overview-rank-changes">{compact(metrics.rankChangeCount)}</strong></span>
      </div>
      <svg viewBox="0 0 470 150" role="img" aria-label="每小时战斗与占领节奏" preserveAspectRatio="none">
        {[26, 51, 76, 101, 126].map((gridY) => <line key={gridY} x1="34" y1={gridY} x2="414" y2={gridY} className="analytics-grid" />)}
        {points.map((point, index) => {
          const battleHeight = countHeight(point.hourlyBattles);
          const captureHeight = countHeight(point.hourlyCaptures);
          return <g key={point.second}><rect data-testid="battle-bar" x={x(index)} y={126 - battleHeight} width={Math.max(2, width * 0.3)} height={battleHeight} className="battle-bar" /><rect data-testid="capture-bar" x={x(index) + width * 0.32} y={126 - captureHeight} width={Math.max(2, width * 0.18)} height={captureHeight} className="capture-bar" /></g>;
        })}
        <polyline data-testid="average-battle-score-line" points={averageSamples.map((sample) => `${x(sample.index) + width * 0.25},${averageY(sample.value)}`).join(" ")} fill="none" className="average-battle-score-line" />
      </svg>
      <footer className="overview-chart__legend"><span><i className="battle-key" />战斗</span><span><i className="capture-key" />占领</span><span><i className="average-key" />每小时场均战功</span></footer>
    </section>
  );
}

export function PlayerSegmentHeatmap({ points }: { points: readonly PlayerContributionPoint[] }) {
  const cells = POWER_TIERS.flatMap((powerTier, row) => ACTIVITY_TIERS.map((activityTier, column) => {
    const players = points.filter((point) => point.powerTier === powerTier && point.activityTier === activityTier);
    const total = players.reduce((sum, point) => sum + point.score, 0);
    return { powerTier, activityTier, row, column, players: players.length, total, average: players.length ? total / players.length : 0 };
  }));
  const maxAverage = Math.max(1, ...cells.map((cell) => cell.average));
  const cellWidth = 68;
  const cellHeight = 25;

  return (
    <section className="overview-chart player-segment-chart">
      <header className="overview-chart__heading"><div><p>玩家贡献</p><h2>战力 × 活跃分层贡献</h2></div><span>颜色代表人均积分</span></header>
      <svg viewBox="0 0 470 150" role="img" aria-label="玩家战力与活跃分层贡献" preserveAspectRatio="xMidYMid meet">
        {ACTIVITY_TIERS.map((tier, index) => <text key={tier} x={104 + index * cellWidth + cellWidth / 2} y="14" textAnchor="middle" className="analytics-axis-label">{ACTIVITY_NAMES[tier]}</text>)}
        {POWER_TIERS.map((tier, index) => <text key={tier} x="93" y={31 + index * cellHeight} textAnchor="end" className="analytics-axis-label">{POWER_NAMES[tier]}</text>)}
        {cells.map((cell) => {
          const opacity = cell.players === 0 ? 0.04 : 0.18 + (cell.average / maxAverage) * 0.72;
          const label = `${POWER_NAMES[cell.powerTier]}·${ACTIVITY_NAMES[cell.activityTier]}：${cell.players}人，总积分${compact(cell.total)}，人均${compact(cell.average)}`;
          return <g key={`${cell.powerTier}-${cell.activityTier}`} aria-label={label}>
            <rect data-testid="player-segment-cell" x={104 + cell.column * cellWidth} y={18 + cell.row * cellHeight} width={cellWidth - 4} height={cellHeight - 4} rx="2" fill="#009c8d" fillOpacity={opacity} />
            <text x={104 + cell.column * cellWidth + cellWidth / 2 - 2} y={31 + cell.row * cellHeight} textAnchor="middle" className="heatmap-value" fill={cell.players ? "#15312d" : "#8b8d86"}>{cell.players ? compact(cell.average) : "0人"}</text>
          </g>;
        })}
      </svg>
      <footer className="overview-chart__legend"><span>格内为人均积分</span><em>颜色越深，人均贡献越高</em></footer>
    </section>
  );
}

export function PlayerContributionPareto({ points }: { points: readonly PlayerContributionPoint[] }) {
  const sorted = [...points].sort((left, right) => right.score - left.score || left.playerId.localeCompare(right.playerId));
  const total = sorted.reduce((sum, point) => sum + point.score, 0);
  const curve = [{ share: 0, contribution: 0 }, ...sorted.map((_, index) => ({
    share: (index + 1) / Math.max(1, sorted.length),
    contribution: total > 0 ? sorted.slice(0, index + 1).reduce((sum, point) => sum + point.score, 0) / total : 0,
  }))];
  const x = (share: number) => 40 + share * 368;
  const y = (share: number) => 126 - share * 106;
  const contributionAt = (share: number) => {
    if (!sorted.length || total <= 0) return 0;
    const count = Math.max(1, Math.ceil(sorted.length * share));
    return sorted.slice(0, count).reduce((sum, point) => sum + point.score, 0) / total;
  };

  return (
    <section className="overview-chart player-pareto-chart">
      <header className="overview-chart__heading"><div><p>贡献结构</p><h2>玩家积分贡献集中度</h2></div><span>越靠左上，头部越集中</span></header>
      <svg viewBox="0 0 470 150" role="img" aria-label="玩家积分贡献集中度" data-total-score={String(total)} preserveAspectRatio="none">
        {[0, .25, .5, .75, 1].map((share) => <line key={share} x1="40" y1={y(share)} x2="408" y2={y(share)} className="analytics-grid" />)}
        <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} className="pareto-equality-line" />
        <polygon data-testid="player-contribution-area" points={`${x(0)},${y(0)} ${curve.map((point) => `${x(point.share)},${y(point.contribution)}`).join(" ")} ${x(1)},${y(0)}`} fill="#009c8d" fillOpacity="0.12" />
        <polyline data-testid="player-contribution-curve" points={curve.map((point) => `${x(point.share)},${y(point.contribution)}`).join(" ")} fill="none" stroke="#009c8d" strokeWidth="2.4" className="pareto-curve" />
        {[.1, .2, .5].map((share, index) => <g key={share}><circle cx={x(share)} cy={y(contributionAt(share))} r="3" className="pareto-marker" /><text x={x(share) + 5} y={y(contributionAt(share)) - 5 - index * 4} className="analytics-axis-label">前 {Math.round(share * 100)}% · {Math.round(contributionAt(share) * 100)}%</text></g>)}
        <text x="40" y="144" className="analytics-axis-label">0% 玩家</text><text x="408" y="144" textAnchor="end" className="analytics-axis-label">100% 玩家</text>
      </svg>
      <footer className="overview-chart__legend"><span><i className="pareto-key" />累计积分贡献</span><em>虚线为均匀贡献</em></footer>
    </section>
  );
}
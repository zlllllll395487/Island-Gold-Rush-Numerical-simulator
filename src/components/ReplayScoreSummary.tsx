import { useMemo, useState } from "react";
import { allianceScoreSeries, playerScoreEventsAt } from "../analytics/replay-analysis";
import type { AllianceScorePoint } from "../analytics/replay-analysis";
import type { Player } from "../population/generate-players";
import type { ReplaySnapshot, SimulationResult } from "../simulation/engine";

const COLORS = ["#a55b56", "#557b8c", "#a88642"] as const;
const ALLIANCE_NAMES = ["赤潮联邦", "蓝湾议会", "金帆同盟"] as const;

export type ScoreViewMode = "relative" | "cumulative" | "gain";

export interface ScoreViewPoint {
  hour: number;
  values: [number, number, number];
}

const SCORE_VIEW_COPY: Record<ScoreViewMode, { label: string; title: string; ariaLabel: string }> = {
  relative: { label: "相对均值差", title: "联盟相对均值差", ariaLabel: "联盟相对均值差走势" },
  cumulative: { label: "累计积分", title: "联盟累计积分", ariaLabel: "联盟累计积分走势" },
  gain: { label: "阶段增量", title: "联盟阶段增量", ariaLabel: "联盟阶段增量走势" },
};

export function buildScoreView(
  series: readonly AllianceScorePoint[],
  mode: ScoreViewMode,
): ScoreViewPoint[] {
  return series.map((point, pointIndex) => {
    const totals = point.alliances.map((row) => row.total) as [number, number, number];
    if (mode === "cumulative") return { hour: point.hour, values: totals };
    if (mode === "relative") {
      const mean = (totals[0] + totals[1] + totals[2]) / 3;
      return {
        hour: point.hour,
        values: totals.map((total) => total - mean) as ScoreViewPoint["values"],
      };
    }

    const previous = pointIndex > 0
      ? series[pointIndex - 1].alliances.map((row) => row.total)
      : totals;
    return {
      hour: point.hour,
      values: totals.map((total, index) => total - previous[index]) as ScoreViewPoint["values"],
    };
  });
}

const compact = (value: number) => new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(value);
const signedCompact = (value: number) => (value > 0 ? "+" : "") + compact(value);
const eventTime = (second: number) => {
  const hour = Math.floor(second / 3600);
  const minute = Math.floor((second % 3600) / 60);
  return "T+" + hour + ":" + String(minute).padStart(2, "0");
};

function spreadLabelYs(rawValues: readonly number[]): number[] {
  const placed = rawValues.map((value, index) => ({ index, value })).sort((left, right) => left.value - right.value);
  for (let index = 1; index < placed.length; index += 1) {
    placed[index].value = Math.max(placed[index].value, placed[index - 1].value + 10);
  }
  const overflow = Math.max(0, placed.at(-1)!.value - 80);
  for (const item of placed) item.value -= overflow;
  const underflow = Math.max(0, 10 - placed[0].value);
  for (const item of placed) item.value += underflow;
  return rawValues.map((_, index) => placed.find((item) => item.index === index)!.value);
}

export function ReplayScoreSummary({ result, snapshot }: { result: SimulationResult; snapshot: ReplaySnapshot }) {
  const [mode, setMode] = useState<ScoreViewMode>("relative");
  const series = useMemo(() => allianceScoreSeries(result), [result]);
  const displaySeries = useMemo(() => buildScoreView(series, mode), [mode, series]);
  const visibleSeries = displaySeries.filter((point) => point.hour <= snapshot.hour);
  const maxHour = Math.max(1, series.at(-1)?.hour ?? 1);
  const allValues = displaySeries.flatMap((point) => point.values);
  const maxAbs = Math.max(1, ...allValues.map((value) => Math.abs(value)));
  const maxValue = Math.max(1, ...allValues);
  const x = (hour: number) => 8 + (hour / maxHour) * 250;
  const y = (score: number) =>
    mode === "relative"
      ? 45 - (score / maxAbs) * 35
      : 80 - (Math.max(0, score) / maxValue) * 70;
  const markerX = x(Math.min(snapshot.hour, maxHour));
  const lastPoint = visibleSeries.at(-1);
  const lastValues = lastPoint?.values ?? [0, 0, 0];
  const lastRawYs = lastValues.map(y);
  const lastLabelYs = spreadLabelYs(lastRawYs);
  const copy = SCORE_VIEW_COPY[mode];

  return (
    <div className="score-replay-summary">
      <div className="score-replay-title">
        <div><p>积分与地图同步</p><h3>{copy.title}</h3></div>
        <span data-testid="score-replay-hour">T+{snapshot.hour.toFixed(0)}h</span>
      </div>
      <fieldset className="score-view-switch" aria-label="积分视图">
        {(["relative", "cumulative", "gain"] as const).map((viewMode) => (
          <label key={viewMode}>
            <input
              type="radio"
              name="score-view"
              value={viewMode}
              checked={mode === viewMode}
              onChange={() => setMode(viewMode)}
            />
            <span>{SCORE_VIEW_COPY[viewMode].label}</span>
          </label>
        ))}
      </fieldset>
      <svg className="score-sparkline" viewBox="0 0 320 90" role="img" aria-label={copy.ariaLabel} preserveAspectRatio="none">
        {[10, 33, 57, 80].map((gridY) => (
          <line key={gridY} x1="8" y1={gridY} x2="258" y2={gridY} className="score-chart-grid" />
        ))}
        {mode === "relative" ? (
          <line
            x1="8"
            y1={y(0)}
            x2="258"
            y2={y(0)}
            className="score-zero-baseline"
            data-testid="score-zero-baseline"
          />
        ) : null}
        <text x="8" y="88" className="score-chart-axis-label">0h</text>
        <text x="133" y="88" textAnchor="middle" className="score-chart-axis-label">{Math.round(maxHour / 2)}h</text>
        <text x="258" y="88" textAnchor="end" className="score-chart-axis-label">{Math.round(maxHour)}h</text>
        <text x="8" y="8" className="score-chart-axis-label">
          {mode === "relative" ? "±" + compact(maxAbs) : compact(maxValue)}
        </text>
        <line x1={markerX} y1="5" x2={markerX} y2="82" className="score-time-marker" />
        {COLORS.map((color, allianceIndex) => (
          <polyline
            key={color}
            fill="none"
            stroke={color}
            strokeWidth="1.8"
            points={visibleSeries
              .map((point) => [x(point.hour), y(point.values[allianceIndex])].join(","))
              .join(" ")}
          />
        ))}
        {lastPoint ? COLORS.map((color, allianceIndex) => (
          <g key={"end-" + color}>
            <line
              className="score-end-connector"
              x1={x(lastPoint.hour)}
              y1={lastRawYs[allianceIndex]}
              x2="267"
              y2={lastLabelYs[allianceIndex]}
              stroke={color}
            />
            <text
              x="270"
              y={lastLabelYs[allianceIndex] + 2}
              fill={color}
              className="score-end-label"
              data-testid={"score-end-label-" + (allianceIndex + 1)}
            >
              {ALLIANCE_NAMES[allianceIndex] + " " + (mode === "cumulative" ? compact(lastValues[allianceIndex]) : signedCompact(lastValues[allianceIndex]))}
            </text>
          </g>
        )) : null}
      </svg>
      <div className="score-current-grid">
        {snapshot.scoreTotals.map((row, index) => (
          <div key={ALLIANCE_NAMES[index]}>
            <i style={{ background: COLORS[index] }} />
            <span>{ALLIANCE_NAMES[index]}</span>
            <b data-testid={"alliance-score-" + (index + 1)}>{compact(row.total)}</b>
            <small>当前占领价值 <strong data-testid={"occupied-value-" + (index + 1)}>{compact(snapshot.scores[index])}</strong></small>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlayerScoreLedger({
  result,
  player,
  second,
}: {
  result: SimulationResult;
  player: Player;
  second: number;
}) {
  const [pagination, setPagination] = useState({ playerId: player.id, limit: 50 });
  const limit = pagination.playerId === player.id ? pagination.limit : 50;
  const allVisible = result.scoreEvents.filter((event) => event.playerId === player.id && event.second <= second);
  const events = playerScoreEventsAt(result, player.id, second, limit);
  const visibleTotals = allVisible.reduce((totals, event) => {
    totals[event.source] += event.delta;
    totals.total += event.delta;
    return totals;
  }, { battle: 0, occupation: 0, total: 0 });
  const remaining = Math.max(0, allVisible.length - events.length);

  return (
    <section className="player-score-ledger" aria-label={`${player.name} 积分流水`}>
      <header>
        <div><p>截至 T+{(second / 3600).toFixed(0)}h</p><h3>{player.name} · 积分流水</h3></div>
        <span>战功 {visibleTotals.battle} · 占领 {visibleTotals.occupation} · 总分 {visibleTotals.total}</span>
      </header>
      {events.length ? (
        <div className="score-event-list">
          {events.map((event, index) => (
            <div data-score-event key={`${event.second}-${event.tileId}-${event.source}-${index}`}>
              <time>{eventTime(event.second)}</time>
              <span>{event.source === "battle" ? "战功" : "占领"}</span>
              <small>地格 {event.tileId}{event.kills ? ` · 击杀 ${compact(event.kills)}` : ""}</small>
              <b>+{event.delta}</b>
              <em>累计 {event.totalAfter}</em>
            </div>
          ))}
        </div>
      ) : <p className="score-event-empty">该时刻之前暂无积分事件</p>}
      {remaining > 0 ? <button type="button" onClick={() => setPagination({ playerId: player.id, limit: limit + 50 })}>再显示 {Math.min(50, remaining)} 条</button> : null}
    </section>
  );
}
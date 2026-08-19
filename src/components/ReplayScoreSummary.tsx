import { useMemo, useState } from "react";
import { allianceScoreSeries, playerScoreEventsAt } from "../analytics/replay-analysis";
import type { Player } from "../population/generate-players";
import type { ReplaySnapshot, SimulationResult } from "../simulation/engine";

const COLORS = ["#a55b56", "#557b8c", "#a88642"] as const;
const ALLIANCE_NAMES = ["赤潮联邦", "蓝湾议会", "金帆同盟"] as const;

const compact = (value: number) => new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(value);
const eventTime = (second: number) => {
  const hour = Math.floor(second / 3600);
  const minute = Math.floor((second % 3600) / 60);
  return `T+${hour}:${String(minute).padStart(2, "0")}`;
};

export function ReplayScoreSummary({ result, snapshot }: { result: SimulationResult; snapshot: ReplaySnapshot }) {
  const series = useMemo(() => allianceScoreSeries(result), [result]);
  const maxHour = Math.max(1, series.at(-1)?.hour ?? 1);
  const maxScore = Math.max(1, ...series.flatMap((point) => point.alliances.map((row) => row.total)));
  const x = (hour: number) => 8 + (hour / maxHour) * 284;
  const y = (score: number) => 82 - (score / maxScore) * 72;
  const markerX = x(snapshot.hour);

  return (
    <div className="score-replay-summary">
      <div className="score-replay-title"><div><p>积分与地图同步</p><h3>联盟累计积分</h3></div><span data-testid="score-replay-hour">T+{snapshot.hour.toFixed(0)}h</span></div>
      <svg className="score-sparkline" viewBox="0 0 300 90" role="img" aria-label="联盟累计积分走势" preserveAspectRatio="none">

        {[10, 34, 58, 82].map((gridY) => (
          <line key={gridY} x1="8" y1={gridY} x2="292" y2={gridY} className="score-chart-grid" />
        ))}
        <text x="8" y="89" className="score-chart-axis-label">0h</text>
        <text x="150" y="89" textAnchor="middle" className="score-chart-axis-label">{Math.round(maxHour / 2)}h</text>
        <text x="292" y="89" textAnchor="end" className="score-chart-axis-label">{Math.round(maxHour)}h</text>
        <text x="8" y="8" className="score-chart-axis-label">{compact(maxScore)}</text>        <line x1={markerX} y1="5" x2={markerX} y2="85" className="score-time-marker" />
        {COLORS.map((color, allianceIndex) => (
          <polyline
            key={color}
            fill="none"
            stroke={color}
            strokeWidth="1.8"
            points={series.map((point) => `${x(point.hour)},${y(point.alliances[allianceIndex].total)}`).join(" ")}
          />
        ))}
      </svg>
      <div className="score-current-grid">
        {snapshot.scoreTotals.map((row, index) => (
          <div key={ALLIANCE_NAMES[index]}>
            <i style={{ background: COLORS[index] }} />
            <span>{ALLIANCE_NAMES[index]}</span>
            <b data-testid={`alliance-score-${index + 1}`}>{compact(row.total)}</b>
            <small>当前占领价值 <strong data-testid={`occupied-value-${index + 1}`}>{compact(snapshot.scores[index])}</strong></small>
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
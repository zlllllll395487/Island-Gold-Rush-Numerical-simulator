import type { Player } from "../population/generate-players";
import type { SimulationResult } from "../simulation/engine";
import { PlayerScoreLedger } from "./ReplayScoreSummary";

type PlayerDetailDrawerProps = {
  result: SimulationResult;
  player: Player;
  allianceName: string;
  hour: number;
  maxHour: number;
  onHourChange: (hour: number) => void;
  onClose: () => void;
};

const compact = (value: number) => Math.round(value).toLocaleString("zh-CN");

export function PlayerDetailDrawer({
  result,
  player,
  allianceName,
  hour,
  maxHour,
  onHourChange,
  onClose,
}: PlayerDetailDrawerProps) {
  const rank = [...result.players]
    .sort((left, right) => right.personalScore - left.personalScore)
    .findIndex((candidate) => candidate.id === player.id) + 1;

  return (
    <aside className="player-detail-drawer" role="dialog" aria-label={`${player.name} 玩家详情`}>
      <header className="player-detail-drawer__header">
        <div>
          <p>玩家详情 · 第 {rank} 名</p>
          <h2>{player.name}</h2>
          <span>{player.id}</span>
        </div>
        <button type="button" aria-label="关闭玩家详情" onClick={onClose}>关闭</button>
      </header>

      <div className="player-detail-drawer__facts" aria-label="玩家概况">
        <article><span>联盟</span><strong>{allianceName}</strong></article>
        <article><span>战力</span><strong>{compact(player.power)}</strong></article>
        <article><span>击杀</span><strong>{compact(player.kills)}</strong></article>
        <article><span>占领</span><strong>{player.occupations}</strong></article>
      </div>

      <label className="player-event-timeline">
        <span>事件截止时间</span>
        <output>T+{hour}h</output>
        <input
          aria-label="玩家事件时间"
          type="range"
          min="0"
          max={maxHour}
          value={hour}
          onChange={(event) => onHourChange(Number(event.target.value))}
        />
      </label>

      <PlayerScoreLedger result={result} player={player} second={hour * 3600} />
    </aside>
  );
}
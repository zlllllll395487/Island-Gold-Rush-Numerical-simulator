import { diagnoseMatch } from "../analytics/diagnosis";
import type { MatchMetrics } from "../analytics/metrics";

const percent = (value: number) => `${Math.round(value * 100)}%`;
const time = (value: number | null) => {
  if (value === null) return "未发生";
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  return `${hours}小时${minutes}分`;
};

export function DecisionSummary({
  metrics,
  targetRange,
}: {
  metrics: MatchMetrics;
  targetRange: readonly [number, number];
}) {
  const diagnosis = diagnoseMatch(metrics, targetRange);
  const items = [
    {
      label: "首次有效 PvP",
      value: time(metrics.firstPvpHour),
      note: `目标 ${targetRange[0]}–${targetRange[1]} 小时`,
    },
    {
      label: "地图价值差",
      value: percent(metrics.mapValueGap),
      note: "最高与最低联盟 / 平均值",
    },
    {
      label: "行动力浪费率",
      value: percent(metrics.apWasteRate),
      note: "未转化为有效行动",
    },
    {
      label: "积分集中度",
      value: percent(metrics.scoreConcentrationTop10),
      note: `\u524d 10% \u73a9\u5bb6 \u00b7 \u6218\u529b\u76f8\u5173 ${metrics.powerScoreCorrelation?.toFixed(2) ?? "\u2014"}`,
    },
  ];

  return (
    <section className="decision-summary" data-testid="decision-summary" aria-label="关键决策指标">
      <header className="decision-summary__heading">
        <div>
          <p>关键指标</p>
          <h1>本局模拟结果</h1>
        </div>
        <span>当前参数已应用</span>
      </header>
      <div className="decision-summary__metrics">
        {items.map((item, index) => (
          <article key={item.label}>
            <span>0{index + 1}</span>
            <p>{item.label}</p>
            <strong>{item.value}</strong>
            <small>{item.note}</small>
          </article>
        ))}
      </div>
      <aside
        className="decision-diagnosis"
        data-severity={diagnosis.primary.severity}
        role="note"
        aria-label="本局诊断"
      >
        <span>诊断</span>
        <div>
          <strong>{diagnosis.primary.title}</strong>
          <p>{diagnosis.primary.detail}</p>
        </div>
        {diagnosis.secondary.length > 0 ? (
          <ul>
            {diagnosis.secondary.map((signal) => <li key={signal.code}>{signal.title}</li>)}
          </ul>
        ) : null}
      </aside>
    </section>
  );
}

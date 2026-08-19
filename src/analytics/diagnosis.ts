import type { MatchMetrics } from "./metrics";

export type DiagnosisCode =
  | "pvp-none"
  | "pvp-early"
  | "pvp-late"
  | "map-imbalance"
  | "ap-waste"
  | "center-overheated"
  | "score-concentration"
  | "balanced";

export interface DiagnosisSignal {
  code: DiagnosisCode;
  severity: "balanced" | "attention" | "risk";
  title: string;
  detail: string;
  priority: number;
}

export interface MatchDiagnosis {
  primary: DiagnosisSignal;
  secondary: DiagnosisSignal[];
}

const percentage = (value: number) => `${(value * 100).toFixed(0)}%`;

export function diagnoseMatch(
  metrics: MatchMetrics,
  targetRange: readonly [number, number],
): MatchDiagnosis {
  const [targetMin, targetMax] = targetRange;
  const signals: DiagnosisSignal[] = [];

  if (metrics.firstPvpStatus === "none") {
    signals.push({
      code: "pvp-none",
      severity: "risk",
      title: "有效 PvP 未发生",
      detail: `仿真周期内没有形成有效 PvP，目标窗口为 ${targetMin}–${targetMax} 小时。`,
      priority: 110,
    });
  } else if (metrics.firstPvpStatus === "early") {
    signals.push({
      code: "pvp-early",
      severity: "attention",
      title: "玩家过早进入 PvP",
      detail: `首次有效 PvP 为 ${metrics.firstPvpHour?.toFixed(2)} 小时，早于 ${targetMin}–${targetMax} 小时目标窗口。`,
      priority: 100,
    });
  } else if (metrics.firstPvpStatus === "late") {
    signals.push({
      code: "pvp-late",
      severity: "attention",
      title: "玩家进入 PvP 偏慢",
      detail: `首次有效 PvP 为 ${metrics.firstPvpHour?.toFixed(2)} 小时，晚于 ${targetMin}–${targetMax} 小时目标窗口。`,
      priority: 100,
    });
  }

  if (metrics.mapValueGap >= 0.5) {
    signals.push({
      code: "map-imbalance",
      severity: metrics.mapValueGap >= 0.8 ? "risk" : "attention",
      title: "联盟占领价值差距偏大",
      detail: `最高与最低联盟的占领价值差达到平均值的 ${percentage(metrics.mapValueGap)}。`,
      priority: 80,
    });
  }

  if (metrics.apWasteRate >= 0.35) {
    signals.push({
      code: "ap-waste",
      severity: metrics.apWasteRate >= 0.5 ? "risk" : "attention",
      title: "行动力转化不足",
      detail: `${percentage(metrics.apWasteRate)} 的可用行动力未转化为有效行动。`,
      priority: 60,
    });
  }

  if (metrics.centerContestIntensity.score >= 0.7) {
    signals.push({
      code: "center-overheated",
      severity: "attention",
      title: "中心争夺强度偏高",
      detail: `中心发生 ${metrics.centerContestIntensity.battles} 场战斗和 ${metrics.centerContestIntensity.captures} 次易手。`,
      priority: 50,
    });
  }

  if (metrics.scoreConcentrationTop10 >= 0.5) {
    signals.push({
      code: "score-concentration",
      severity: metrics.scoreConcentrationTop10 >= 0.65 ? "risk" : "attention",
      title: "积分向头部玩家集中",
      detail: `前 10% 玩家获得了 ${percentage(metrics.scoreConcentrationTop10)} 的总积分。`,
      priority: 40,
    });
  }

  signals.sort((left, right) => right.priority - left.priority);
  if (signals.length > 0) {
    return { primary: signals[0], secondary: signals.slice(1, 3) };
  }

  return {
    primary: {
      code: "balanced",
      severity: "balanced",
      title: "当前节奏与分布未见明显失衡",
      detail: `首次有效 PvP 为 ${metrics.firstPvpHour?.toFixed(2) ?? "未发生"} 小时，地图价值差为 ${percentage(metrics.mapValueGap)}，行动力浪费率为 ${percentage(metrics.apWasteRate)}。`,
      priority: 0,
    },
    secondary: [],
  };
}

export type ParameterGroupId =
  | "basic"
  | "population"
  | "activity"
  | "strategy"
  | "ap"
  | "occupation"
  | "combat"
  | "morale"
  | "scoring"
  | "tasksRewards"
  | "batch";

export interface ParameterGroup {
  id: ParameterGroupId;
  label: string;
  defaultOpen?: boolean;
}

export interface ParameterOption {
  value: string | number;
  label: string;
}

export interface ParameterCatalogEntry {
  group: ParameterGroupId;
  path: string;
  label: string;
  control: "number" | "range" | "select";
  min?: number;
  max?: number;
  step?: number;
  scale?: number;
  suffix?: string;
  options?: readonly ParameterOption[];
  taskIndex?: number;
}

export const PARAMETER_GROUPS: readonly ParameterGroup[] = [
  { id: "basic", label: "基础参数", defaultOpen: true },
  { id: "population", label: "人口与战力", defaultOpen: true },
  { id: "activity", label: "活跃度" },
  { id: "strategy", label: "行为策略", defaultOpen: true },
  { id: "ap", label: "行动力" },
  { id: "occupation", label: "占领节奏" },
  { id: "combat", label: "战斗" },
  { id: "morale", label: "士气" },
  { id: "scoring", label: "计分" },
  { id: "tasksRewards", label: "任务与奖励" },
  { id: "batch", label: "批量实验" },
] as const;

const number = (
  group: ParameterGroupId,
  path: string,
  label: string,
  options: Omit<ParameterCatalogEntry, "group" | "path" | "label" | "control"> = {},
): ParameterCatalogEntry => ({ group, path, label, control: "number", ...options });

const range = (
  group: ParameterGroupId,
  path: string,
  label: string,
  options: Omit<ParameterCatalogEntry, "group" | "path" | "label" | "control"> = {},
): ParameterCatalogEntry => ({ group, path, label, control: "range", ...options });

const percent = (group: ParameterGroupId, path: string, label: string): ParameterCatalogEntry =>
  range(group, path, label, { min: 0, max: 100, step: 1, scale: 100, suffix: "%" });

const TIERS = [
  ["low", "低战力"],
  ["mid", "中战力"],
  ["high", "高战力"],
  ["super", "超高战力"],
] as const;

const ACTIVITY_TIERS = ["极低活跃", "休闲活跃", "普通活跃", "高活跃", "核心活跃"] as const;

const populationEntries: ParameterCatalogEntry[] = TIERS.flatMap(([tier, label]) => [
  percent("population", `population.powerShares.${tier}`, `${label}玩家占比`),
  number("population", `population.basePower.${tier}`, `${label}基础战力`, { min: 1, step: 10_000 }),
  number("population", `population.powerSigma.${tier}`, `${label}战力波动`, { min: 0, max: 1, step: 0.01 }),
  number("population", `population.mainFormationCounts.${tier}`, `${label}主力编队数`, { min: 0, max: 6, step: 1 }),
  range("population", `population.weakFormationScale.${tier}`, `${label}普通编队强度`, {
    min: 1,
    max: 100,
    step: 1,
    scale: 100,
    suffix: "%",
  }),
]);

const activityEntries: ParameterCatalogEntry[] = [
  ...ACTIVITY_TIERS.flatMap((label, index) => [
    percent("activity", `activity.bands.${index}.share`, `${label}玩家占比`),
    percent("activity", `activity.bands.${index}.usage`, `${label}AP使用倾向`),
  ]),
  ...[0, 1, 2].map((index) =>
    number("activity", `activity.allianceMultipliers.${index}`, `联盟 ${index + 1} 活跃倍率`, {
      min: 0.01,
      step: 0.01,
      suffix: "×",
    }),
  ),
];

const taskEntries: ParameterCatalogEntry[] = Array.from({ length: 10 }, (_, index) => [
  number("tasksRewards", `tasks.thresholds.${index}`, `任务 ${index + 1} 积分阈值`, {
    min: 1,
    step: 1,
    taskIndex: index,
  }),
  number("tasksRewards", `tasks.targetCoverage.${index}`, `任务 ${index + 1} 目标覆盖率`, {
    min: 0,
    max: 100,
    step: 1,
    scale: 100,
    suffix: "%",
    taskIndex: index,
  }),
  number("tasksRewards", `rewards.taskValues.${index}`, `任务 ${index + 1} 奖励价值`, {
    min: 0,
    step: 1,
    taskIndex: index,
  }),
]).flat();

export const PARAMETER_CATALOG: readonly ParameterCatalogEntry[] = [
  number("basic", "seed", "随机种子", { step: 1 }),
  number("basic", "battleHours", "战斗时长（小时）", { min: 1, max: 168, step: 1 }),
  number("basic", "playersPerAlliance", "每联盟玩家数", { min: 20, max: 300, step: 1 }),
  number("basic", "targets.firstPvpHours.0", "首次 PvP 目标下限（小时）", { min: 0, step: 0.5 }),
  number("basic", "targets.firstPvpHours.1", "首次 PvP 目标上限（小时）", { min: 0.5, step: 0.5 }),

  ...populationEntries,
  number("population", "matching.maxStrongestToWeakestRatio", "联盟最强最弱战力比上限", {
    min: 1,
    max: 2,
    step: 0.01,
  }),

  ...activityEntries,

  percent("strategy", "strategy.shares.centerRush", "中心争夺策略占比"),
  percent("strategy", "strategy.shares.supportExpand", "支援扩张策略占比"),
  percent("strategy", "strategy.shares.multiFront", "多线推进策略占比"),
  percent("strategy", "strategy.activityWeight", "策略分配活跃度权重"),
  percent("strategy", "strategy.powerWeight", "策略分配战力权重"),
  percent("strategy", "strategy.randomWeight", "策略分配随机权重"),
  number("strategy", "strategy.centerWeight", "中心地格动机权重", { min: 0, step: 0.05 }),
  number("strategy", "strategy.resourceWeight", "资源地格动机权重", { min: 0, step: 0.05 }),
  number("strategy", "strategy.normalWeight", "普通地格动机权重", { min: 0, step: 0.05 }),
  number("strategy", "strategy.congestionAvoidance", "拥堵规避权重", { min: 0, max: 2, step: 0.05 }),
  number("strategy", "fronts.countPerAlliance", "每联盟战线数", { min: 3, max: 6, step: 1 }),
  percent("strategy", "fronts.allianceObjectiveWeight", "联盟目标权重"),
  percent("strategy", "fronts.personalStrategyWeight", "个人策略权重"),
  number("strategy", "fronts.supportQueueGap", "支援队列差上限", { min: 0, max: 20, step: 1 }),

  number("ap", "ap.initial", "初始 AP", { min: 0, step: 1 }),
  number("ap", "ap.cap", "AP 上限", { min: 1, step: 1 }),
  number("ap", "ap.recoveryAmount", "每次恢复 AP", { min: 0, step: 1 }),
  number("ap", "ap.recoveryEveryHours", "AP 恢复间隔（小时）", { min: 0.1, max: 48, step: 0.5 }),
  number("ap", "ap.attackCost", "进攻 AP 消耗", { min: 0.1, step: 1 }),
  number("ap", "ap.garrisonCost", "驻守 AP 消耗", { min: 0.1, step: 1 }),

  number("occupation", "occupation.baseSeconds.normal", "普通地格基础占领秒数", { min: 1, step: 1 }),
  number("occupation", "occupation.baseSeconds.resource", "资源地格基础占领秒数", { min: 1, step: 1 }),
  number("occupation", "occupation.baseSeconds.core", "中心地格基础占领秒数", { min: 1, step: 1 }),
  number("occupation", "occupation.safeDistance", "占领安全距离", { min: 0, max: 30, step: 1 }),
  number("occupation", "occupation.secondsPerExcessHex", "每格超距增加秒数", { min: 0, max: 3600, step: 5 }),
  range("occupation", "occupation.paceMultiplier", "占领节奏倍率", { min: 1, max: 100, step: 1, suffix: "×" }),

  number("combat", "combat.troopSize", "单编队兵力", { min: 1, step: 1_000 }),
  number("combat", "combat.battleIntervalSeconds", "战斗结算间隔（秒）", { min: 0.1, step: 1 }),
  number("combat", "combat.powerExponent", "战力指数", { min: 0.01, step: 0.05 }),
  number("combat", "combat.winProbabilitySlope", "胜率曲线斜率", { min: 0.01, step: 0.05 }),
  percent("combat", "combat.survivorMinRatio", "最低存活比例"),
  percent("combat", "combat.survivorMaxRatio", "最高存活比例"),

  number("morale", "morale.base", "基础士气", { min: 0.1, step: 1 }),
  number("morale", "morale.max", "士气上限", { min: 0.1, step: 1 }),
  number("morale", "morale.min", "士气下限", { min: 0, step: 1 }),
  number("morale", "morale.safeDistance", "士气安全距离", { min: 0, step: 1 }),
  number("morale", "morale.lossPerExcessHex", "每格超距士气损失", { min: 0, step: 0.5 }),
  number("morale", "morale.lossPerWin", "每次胜利士气损失", { min: 0, step: 0.5 }),
  {
    group: "morale",
    path: "morale.formulaMode",
    label: "士气公式模式",
    control: "select",
    options: [
      { value: "gdd", label: "GDD 公式" },
      { value: "linear", label: "线性公式" },
    ],
  },
  number("morale", "morale.coefficientIntercept", "士气公式截距", { min: 0, step: 0.0001 }),
  number("morale", "morale.coefficientSlope", "士气公式斜率", { min: 0, step: 0.0001 }),

  number("scoring", "scoring.occupation.normal", "普通地格占领积分", { min: 0, step: 1 }),
  number("scoring", "scoring.occupation.resource", "资源地格占领积分", { min: 0, step: 1 }),
  number("scoring", "scoring.occupation.core", "中心地格占领积分", { min: 0, step: 1 }),
  number("scoring", "scoring.killsPerPoint", "每点战功所需击杀", { min: 1, step: 100 }),

  ...taskEntries,
  ...["前段", "中段", "高段", "顶段"].map((label, index) =>
    number("tasksRewards", `rewards.tierShares.${index}`, `${label}奖励占比`, {
      min: 0,
      max: 100,
      step: 1,
      suffix: "%",
    }),
  ),
  number("tasksRewards", "rewards.multiplier", "奖励价值倍率", { min: 0, max: 100, step: 0.1, suffix: "×" }),

  {
    group: "batch",
    path: "batchRuns",
    label: "批量运行局数",
    control: "select",
    options: [
      { value: 10, label: "10 局" },
      { value: 50, label: "50 局" },
      { value: 100, label: "100 局" },
    ],
  },
] as const;

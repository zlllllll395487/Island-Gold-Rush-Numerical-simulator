# 海岛夺金数值模拟：编辑型研究界面实施计划

> 依据：`docs/superpowers/specs/2026-08-19-editorial-research-ui-redesign-design.md`

## 实施原则

- 采用测试驱动：每项行为先写失败测试，再做最小实现，随后运行相关回归。
- 不修改已经验证的仿真公式和参数口径；新增指标只能从已有或明确新增的结果事件推导。
- 保留用户当前未提交改动，不覆盖与本计划无关的文件。
- 视觉升级不能牺牲地图主视觉、120 项参数编辑、回放一致性和移动端可访问性。
- 公共仓库不得出现策划案、机器人路径、内部名称、凭据或本机绝对路径。

## Task 1：冻结现有行为与建立视觉契约

**主要文件**

- 修改：`tests/components/dashboard.test.tsx`
- 修改：`tests/components/parameter-panel.test.tsx`
- 新增：`tests/components/editorial-ui-contract.test.tsx`
- 修改：`src/components/SimulationDashboardV2.tsx`
- 修改：`src/components/simulator-v2.css`

**步骤**

1. 为以下已认可结构编写失败测试：编辑型页面标识、六个功能页签、地图优先顺序、唯一“参数调整”入口、无传统 KPI 卡片墙。
2. 添加视觉语义契约：页面包含研究摘要、地图图版、趋势证据和明细证据四层；不依赖具体像素截图。
3. 重构 Dashboard DOM 骨架，但暂不修改仿真数据调用。
4. 建立 CSS 设计变量：暖灰背景、炭黑文本、低饱和联盟色、细分隔线、字体栈、数字特性、间距尺度。
5. 运行组件测试，确认既有草稿/应用隔离、运行、重置、页签切换行为不变。

**验收**

- 页面骨架符合规格，现有功能测试全绿。
- 不存在硬编码终局数字或伪造指标。

## Task 2：目录式参数检视器

**主要文件**

- 修改：`src/components/ParameterPanel.tsx`
- 修改：`src/components/parameter-panel.css`
- 修改：`src/components/parameter-catalog.ts`
- 修改：`tests/components/parameter-panel.test.tsx`

**步骤**

1. 先写失败测试：章节目录、当前章节控件、搜索跨章节定位、120 个参数完整可达、任务紧凑行、校验与恢复默认。
2. 在现有 11 个参数组基础上增加稳定章节 ID、章节摘要和匹配计数，不改变参数 path。
3. 桌面端实现“章节目录 + 当前章节”双层侧栏；搜索时展示匹配结果并可回到章节。
4. 保留原生输入、显示单位换算、min/max/step、不可变草稿更新和稳定校验 ID。
5. 增加未应用修改提示，并确保只有运行仿真后结果才读取新配置。

**验收**

- 参数目录总数、可编辑叶节点总数仍为 120。
- 所有默认值通过原生有效性检查，重新输入不产生语义漂移。

## Task 3：五个决策指标的数据模型

**主要文件**

- 修改：`src/analytics/metrics.ts`
- 修改：`src/domain/types.ts`
- 修改：`src/simulation/engine.ts`（仅在现有事件不足以推导时补充结果字段）
- 修改：`tests/analytics/metrics.test.ts`
- 修改：`tests/simulation/engine.test.ts`

**步骤**

1. 为每个指标建立独立失败测试和边界场景：
   - 首次 PvP：单局时间；批量 P10/P50/P90；未发生状态。
   - 地图价值差：按当前时间截面计算三联盟占领价值相对差。
   - 行动力浪费率：封顶损失、无合法目标等待与有效消耗的明确分母。
   - 中心争夺强度：交战、易手、控制时长的原始分项与归一化结果。
   - 积分集中度：Top 10% 积分占比、战力—积分相关性及空样本处理。
2. 优先从 timeline、scoreEvents、map ownership 和 player 结果推导；只有无法可靠推导时才在 engine 中增加累积计数。
3. 批量仿真输出分布而非只输出均值。
4. 所有比例限定在合理范围，未发生/无样本使用明确状态而非 0 伪装。

**验收**

- 指标对输入变化具备敏感性测试。
- 单局、批量、回放时间截面口径明确且一致。

## Task 4：基于真实结果的诊断生成器

**主要文件**

- 新增：`src/analytics/diagnosis.ts`
- 新增：`tests/analytics/diagnosis.test.ts`
- 修改：`src/components/SimulationDashboardV2.tsx`

**步骤**

1. 为正常、PvP 过早/过晚、地图失衡、AP 浪费、中心过热、积分集中等场景写失败测试。
2. 采用确定性规则生成一条主诊断与最多两条补充证据。
3. 诊断引用具体数值及目标范围，不使用空泛“状态良好”。
4. 多项异常同时出现时按对游戏进度与平衡的影响排序。

**验收**

- 相同结果生成相同诊断。
- 诊断中的所有数字可追溯到指标对象。

## Task 5：顶部研究摘要重构

**主要文件**

- 新增：`src/components/DecisionSummary.tsx`
- 修改：`src/components/SimulationDashboardV2.tsx`
- 修改：`src/components/simulator-v2.css`
- 修改：`tests/components/dashboard.test.tsx`

**步骤**

1. 写失败测试，确认摘要显示五个决策指标及诊断，计算耗时不再进入核心摘要。
2. 使用排版式数字行而非独立浮起大卡片。
3. 指标同时展示结果、参照范围或解释性副标签。
4. 在批量结果中切换为分位区间；无数据时显示明确文本。

**验收**

- 所有摘要值来自当前 applied result。
- 修改草稿但未运行时，摘要保持旧结果并显示未应用提示。

## Task 6：注释地图图版

**主要文件**

- 修改：`src/components/HexMapCanvasV2.tsx`
- 新增或修改：`src/components/MapPlate.tsx`
- 修改：`src/components/simulator-v2.css`
- 修改：`tests/components/dashboard.test.tsx`
- 新增：`tests/components/map-plate.test.tsx`

**步骤**

1. 写失败测试：地图为主视觉、正确联盟身份、当前时间价值、关键事件注释、回放同步、ResizeObserver、键盘/辅助文本。
2. 保留连续尖顶六边形几何和地形纹样；调整联盟覆盖透明度，使地形仍可辨认。
3. 在地图左侧建立关键事件注释轨道，右侧建立当前时间数值轨道；小屏幕转为地图上下方说明。
4. 注释从当前时间之前的 timeline 推导，并进行数量限制与冲突消解。
5. 保留 hover/focus 详情、占领进度、队列、驻防、高价值资源和 DPR 重绘。

**验收**

- T+0 不显示未来占领、积分或战斗事件。
- 联盟 1/2/3 在地图、注释和后续图表中始终对应红/蓝/金及其正式名称。

## Task 7：低饱和图表系统

**主要文件**

- 新增：`src/components/charts/EditorialLineChart.tsx`
- 新增：`src/components/charts/chart-utils.ts`
- 新增：`tests/components/editorial-chart.test.tsx`
- 修改：`src/components/ReplayScoreSummary.tsx`
- 修改：`src/components/SimulationDashboardV2.tsx`
- 修改：`src/components/simulator-v2.css`

**步骤**

1. 为坐标范围、空数据、单点、联盟色映射、当前时间截断和可访问摘要写失败测试。
2. 实现轻量 SVG 折线图：细线、弱网格、直接尾部标签、简洁刻度。
3. 首批接入联盟积分和占领价值两张趋势图；行动力、中心控制和积分分布按对应页签接入。
4. 修复并锁定积分曲线联盟 1=红、2=蓝、3=金。
5. 图表只使用回放时间之前的聚合点，避免终局数据泄露。

**验收**

- 地图在首屏面积和对比度上仍高于任何图表。
- SVG 在容器 resize 后正确重排，不拉伸位图。

## Task 8：积分台账与回放一致性

**主要文件**

- 修改：`src/components/ReplayScoreSummary.tsx`
- 修改：`tests/components/replay-score-summary.test.tsx`
- 修改：`tests/analytics/replay-score.test.ts`

**步骤**

1. 写边界测试：T+0 总计为 0；时间推进后战功/占领/总分分别由可见事件求和；拖回时减少。
2. 台账头部禁止读取玩家终局 score 字段。
3. 添加玩家搜索与代表玩家默认选择，保持事件列表虚拟化或限制渲染窗口。
4. 统一事件时间、来源、对手/地格、得分和累计值格式。

**验收**

- 任意回放时刻，台账头部总计等于可见事件之和。
- 单玩家大量事件不会明显阻塞拖动时间轴。

## Task 9：响应式与可访问性

**主要文件**

- 修改：`src/components/SimulationDashboardV2.tsx`
- 修改：`src/components/ParameterPanel.tsx`
- 修改：`src/components/simulator-v2.css`
- 修改：`src/components/parameter-panel.css`
- 修改：`tests/components/dashboard.test.tsx`

**步骤**

1. 扩展既有 compact matchMedia 测试，覆盖目录式检视器、地图注释和图表布局。
2. 关闭移动抽屉时保持 inert/aria-hidden；打开后聚焦搜索，关闭后返回触发按钮或主内容。
3. 确保图表、指标和地图均有文本摘要，联盟不只依赖颜色识别。
4. 检查 640/900/1280 三个关键宽度下的信息优先级。

**验收**

- 键盘可以运行仿真、切换页签、搜索参数、操作回放和选择玩家。
- 页面不存在关闭抽屉中的离屏焦点。

## Task 10：公开部署与隐私收口

**主要文件**

- 新增：`.github/workflows/deploy.yml`（如采用 GitHub Actions）或完善 Cloudflare Builds 配置
- 修改：`wrangler.jsonc`
- 修改：`README.md`
- 修改：`tests/site-readiness.test.ts`
- 新增：`scripts/check-public-content.mjs`

**步骤**

1. 写站点就绪失败测试，覆盖标题、公开说明、favicon/OG、主要交互和无登录依赖。
2. 增加公开内容扫描：本机路径、内部盘符、飞书链接、机器人目录、token/secret、内部项目关键词。
3. 使用 Vinext 官方 Cloudflare Workers 部署链，生产分支设为 `main`。
4. 配置 GitHub 到 Cloudflare 的自动构建；凭据只使用平台 secret，不写入仓库。
5. README 只介绍模拟器、玩法背景、功能、运行方式与公开网址。
6. 首次部署后用匿名窗口验证公开网址无需登录，完成一次参数修改、运行、回放和玩家积分查看。

**验收**

- 公开网址不依赖本机或 ChatGPT 登录。
- 仓库敏感扫描为零命中。
- 推送主分支后可自动构建发布。

## 最终验证

按顺序执行并记录结果：

1. 新增/修改组件与分析模块的聚焦测试。
2. 全量测试（单 worker、15 秒单测超时；外层命令允许足够总时长）。
3. `npm run lint`。
4. `npm run build`。
5. 生产构建站点就绪测试。
6. 默认参数校准：首次 PvP、45/25/30 策略人数、联盟实力比、争夺地格数、非法派遣、AP 使用/浪费、积分集中度。
7. 敏感信息扫描。
8. 浏览器人工验收：桌面、900px、640px；参数修改、随机运行、种子复现、回放联动、积分台账。
9. 公网匿名访问验收。

## 提交策略

- 每个 Task 形成范围清晰、可独立回滚的提交。
- 不修改或重写已有提交历史。
- 在最终公开提交前再次核对 staged diff 和敏感扫描。
- Git 操作必须遵守当前环境的仓库安全指令；若权威安全文件仍缺失，停止 stage/commit/push 并向用户请求明确授权。

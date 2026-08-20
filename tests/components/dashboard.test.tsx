import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import rawMap from "../../src/data/tilerush-map.json";
import { HexMapCanvasV2 } from "../../src/components/HexMapCanvasV2";
import { loadCanonicalMap } from "../../src/map/map-loader";
import type { ReplaySnapshot } from "../../src/simulation/engine";
import { SimulationDashboardV2 as SimulationDashboard } from "../../src/components/SimulationDashboardV2";
import { PARAMETER_CATALOG, PARAMETER_GROUPS } from "../../src/components/parameter-catalog";

const TABS = [
  "仿真总览",
  "行动力与占领",
  "战斗与士气",
  "任务与奖励",
  "玩家与联盟排名",
  "批量实验",
] as const;

function showParameter(label: string) {
  const entry = PARAMETER_CATALOG.find((candidate) => candidate.label === label);
  if (!entry) throw new Error(`Unknown parameter: ${label}`);
  const group = PARAMETER_GROUPS.find((candidate) => candidate.id === entry.group);
  if (!group) throw new Error(`Unknown parameter group: ${entry.group}`);
  const categories = screen.getByRole("navigation", { name: "参数分类" });
  const trigger = within(categories).getByRole("button", { name: new RegExp(group.label) });
  if (trigger.getAttribute("aria-expanded") !== "true") fireEvent.click(trigger);
  fireEvent.change(screen.getByRole("searchbox", { name: /\u641c\u7d22\u53c2\u6570/ }), {
    target: { value: label },
  });
  return screen.getByLabelText(label);
}
describe("simulation dashboard", () => {
  test("uses the approved product language and one parameter control area", () => {
    const { container } = render(<SimulationDashboard />);

    expect(container.querySelector("main")).toHaveClass("editorial-workspace");
    expect(screen.getByTestId("simulator-brand-mark")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("heading", { level: 1, name: "本局模拟结果" })).toBeInTheDocument();
    expect(screen.getByText("当前参数已应用")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "参数分类" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /基础参数/ }));
    expect(screen.getByTestId("parameter-panel")).toBeInTheDocument();
    expect(screen.getByTestId("analysis-workspace")).toBeInTheDocument();
    expect(container.querySelector(".decision-rail")).toBeNull();
    expect(screen.queryByText(/数值指挥中心|决策信号|参数实验台|战场事件流|本局建议|从地图读懂|从差异判断|Simulation findings/i)).not.toBeInTheDocument();

    const topbar = screen.getByRole("banner", { name: "模拟器导航" });
    expect(within(topbar).getByText("海岛夺金 · 数值模拟")).toBeInTheDocument();
    expect(within(topbar).getByRole("button", { name: "运行仿真" })).toBeInTheDocument();
    expect(within(screen.getByTestId("parameter-sidebar")).queryByRole("tab")).toBeNull();
    expect(within(topbar).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(TABS);
  }, 15000);

  test("keeps every configuration editor in ParameterPanel and results-only task and batch pages", () => {
    render(<SimulationDashboard />);
    const workspace = screen.getByTestId("analysis-workspace");

    expect(showParameter("任务 1 积分阈值")).toBeInTheDocument();
    expect(showParameter("任务 1 奖励价值")).toBeInTheDocument();
    expect(showParameter("批量运行局数")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "任务与奖励" }));
    expect(within(workspace).getByText("任务达成与奖励结果")).toBeInTheDocument();
    expect(within(workspace).queryByRole("spinbutton")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "批量实验" }));
    expect(within(workspace).getByText("批量实验结果")).toBeInTheDocument();
    expect(within(workspace).queryByRole("combobox")).not.toBeInTheDocument();
  }, 15000);

  test("isolates draft edits until an explicit valid simulation run", async () => {
    render(<SimulationDashboard />);
    fireEvent.click(screen.getByRole("tab", { name: "行动力与占领" }));

    expect(screen.getByTestId("applied-pace-multiplier")).toHaveTextContent("30×");
    fireEvent.change(showParameter("占领节奏倍率"), { target: { value: "40" } });

    expect(showParameter("占领节奏倍率")).toHaveValue("40");
    expect(screen.getByTestId("applied-pace-multiplier")).toHaveTextContent("30×");
    expect(screen.getByText("草稿待运行")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "运行仿真" }));
    await waitFor(() => expect(screen.getByTestId("applied-pace-multiplier")).toHaveTextContent("40×"));
    expect(screen.getByText("结果已应用")).toBeInTheDocument();
  }, 15000);

  test("normal Run applies a fresh seed while reproduce keeps the current seed", async () => {
    vi.stubGlobal("crypto", {
      getRandomValues(target: Uint32Array) {
        target[0] = 314_159_265;
        return target;
      },
    });
    try {
      render(<SimulationDashboard />);
      const appliedSeed = screen.getByTestId("applied-seed");
      expect(appliedSeed).toHaveTextContent("20260813");
      fireEvent.change(showParameter("战斗时长（小时）"), { target: { value: "1" } });

      fireEvent.click(screen.getByRole("button", { name: "运行仿真" }));
      await waitFor(() => expect(appliedSeed).toHaveTextContent("314159265"));

      const reproduce = screen.getByRole("button", { name: "按当前种子复现" });
      fireEvent.click(reproduce);
      await waitFor(() => expect(reproduce).toBeEnabled());
      expect(appliedSeed).toHaveTextContent("314159265");
    } finally {
      vi.unstubAllGlobals();
    }
  }, 15000);

  test("shows workload derived from the completed simulation", async () => {
    vi.stubGlobal("crypto", {
      getRandomValues(target: Uint32Array) {
        target[0] = 271_828_182;
        return target;
      },
    });
    try {
      render(<SimulationDashboard />);
      fireEvent.change(showParameter("战斗时长（小时）"), { target: { value: "1" } });
      fireEvent.click(screen.getByRole("button", { name: "运行仿真" }));

      await waitFor(() => expect(screen.getByTestId("simulation-workload")).toHaveTextContent("360 个时间步"));
      expect(screen.getByTestId("simulation-workload")).toHaveTextContent(/出征 [\d,]+ · 战斗 [\d,]+ · 占领 [\d,]+ · 积分流水 [\d,]+ · [\d.]+ms/);
    } finally {
      vi.unstubAllGlobals();
    }
  }, 15000);

  test("keeps the main-formation headline applied until a valid rerun", async () => {
    render(<SimulationDashboard />);
    const summary = screen.getByTestId("main-formation-summary");

    expect(summary).toHaveTextContent("1 / 2 / 3 / 3 主力编队");
    fireEvent.change(showParameter("低战力主力编队数"), { target: { value: "4" } });
    expect(summary).toHaveTextContent("1 / 2 / 3 / 3 主力编队");

    fireEvent.click(screen.getByRole("button", { name: "运行仿真" }));
    await waitFor(() => expect(summary).toHaveTextContent("4 / 2 / 3 / 3 主力编队"));
  }, 15000);

  test("renders an absent first PvP result as not occurred", async () => {
    render(<SimulationDashboard />);
    fireEvent.change(showParameter("战斗时长（小时）"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "运行仿真" }));
    await waitFor(() => expect(screen.getByText("结果已应用")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("tab", { name: "行动力与占领" }));
    expect(screen.getByText("状态：未发生")).toBeInTheDocument();
  }, 15000);
  test("maps schema failures to stable issue ids, disables run, and resets the draft", () => {
    render(<SimulationDashboard />);
    const run = screen.getByRole("button", { name: "运行仿真" });

    fireEvent.change(showParameter("初始 AP"), { target: { value: "150" } });

    expect(run).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveAttribute("data-validation-id", "ap.custom");
    expect(screen.getByRole("alert")).toHaveTextContent("初始 AP 不能超过 AP 上限");

    fireEvent.click(screen.getByRole("button", { name: "恢复默认" }));
    expect(showParameter("初始 AP")).toHaveValue(50);
    expect(run).toBeEnabled();
  }, 15000);

  test("blocks Run with a stable issue when strategy assignment weights do not total 100%", () => {
    render(<SimulationDashboard />);

    fireEvent.change(showParameter("策略分配活跃度权重"), { target: { value: "60" } });

    expect(screen.getByRole("button", { name: "运行仿真" })).toBeDisabled();
    const schemaIssue = screen.getAllByRole("alert").find((alert) =>
      alert.getAttribute("data-validation-id") === "strategy.custom",
    );
    expect(schemaIssue).toHaveTextContent("策略分配权重合计必须为 100%");
  }, 15000);

  test("shows the applied linear morale formula and matching anchors", async () => {
    render(<SimulationDashboard />);
    fireEvent.change(showParameter("战斗时长（小时）"), { target: { value: "1" } });
    fireEvent.change(showParameter("士气公式模式"), { target: { value: "linear" } });
    fireEvent.click(screen.getByRole("button", { name: "运行仿真" }));
    await waitFor(() => expect(screen.getByText("结果已应用")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("tab", { name: "战斗与士气" }));

    expect(screen.getByText("士气 / 100")).toBeInTheDocument();
    expect(screen.getByText("士气 20")).toHaveTextContent("20%");
    expect(screen.getByText("士气 100")).toHaveTextContent("100%");
    expect(screen.getByText("士气 150")).toHaveTextContent("150%");
  }, 15000);

  test("shows reward values and marginal values scaled by the applied multiplier", async () => {
    render(<SimulationDashboard />);
    fireEvent.change(showParameter("战斗时长（小时）"), { target: { value: "1" } });
    fireEvent.change(showParameter("奖励价值倍率"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "运行仿真" }));
    await waitFor(() => expect(screen.getByText("结果已应用")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("tab", { name: "任务与奖励" }));

    const firstTask = screen.getByRole("row", { name: /^任务 1 / });
    expect(within(firstTask).getByText("40")).toBeInTheDocument();
    expect(within(firstTask).getByText("0.200")).toBeInTheDocument();
  }, 15000);

  test("places the synchronized map before the supporting visual analysis", () => {
    const { container } = render(<SimulationDashboard />);
    const overview = screen.getByTestId("overview-report");
    const mapRow = within(overview).getByTestId("overview-map-row");
    const analytics = within(overview).getByTestId("overview-analytics-grid");
    const mapSection = within(mapRow).getByRole("heading", { name: /战局地图/ }).closest("section");

    expect(mapSection).toHaveClass("overview-map-figure");
    expect(analytics).toContainElement(mapRow);
    const strategic = within(analytics).getByRole("img", { name: "三联盟相对平均分差" }).closest("section")!;
    expect(mapRow.compareDocumentPosition(strategic) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector(".overview-map-figure .map-canvas-wrap")).toBeInTheDocument();
    expect(within(mapRow).getByRole("complementary", { name: "当前战况" })).toBeInTheDocument();
    expect(within(analytics).getByRole("img", { name: "三联盟相对平均分差" })).toBeInTheDocument();
    expect(screen.queryByText(/共用同一实验上下文|唯一强视觉|读懂战局/)).not.toBeInTheDocument();
  }, 15000);
  test("keeps the applied formation model beside the player contribution visualization", () => {
    render(<SimulationDashboard />);

    expect(screen.getByRole("img", { name: "玩家战力与活跃分层贡献" })).toBeInTheDocument();
    expect(screen.getByTestId("main-formation-summary")).toHaveTextContent("1 / 2 / 3 / 3 主力编队");
    expect(screen.getByText(/15× 超高\/低档基础战力/)).toHaveTextContent("联盟战力比");
  }, 15000);
  test("remeasures and redraws the map on container resize without leaking observers", () => {
    let width = 640;
    let height = 420;
    let resizeCallback: ResizeObserverCallback | undefined;
    const observe = vi.fn();
    const disconnect = vi.fn();
    class TestResizeObserver {
      constructor(callback: ResizeObserverCallback) { resizeCallback = callback; }
      observe = observe;
      unobserve = vi.fn();
      disconnect = disconnect;
    }
    vi.stubGlobal("ResizeObserver", TestResizeObserver);
    vi.spyOn(HTMLCanvasElement.prototype, "clientWidth", "get").mockImplementation(() => width);
    vi.spyOn(HTMLCanvasElement.prototype, "clientHeight", "get").mockImplementation(() => height);
    Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 2 });
    const setTransform = vi.fn();
    const clearRect = vi.fn();
    const context = new Proxy({ setTransform, clearRect } as unknown as CanvasRenderingContext2D, {
      get(target, property) {
        const value = Reflect.get(target, property);
        return value ?? vi.fn();
      },
      set(target, property, value) { return Reflect.set(target, property, value); },
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context);
    const map = loadCanonicalMap(rawMap);
    const snapshot: ReplaySnapshot = {
      second: 0, hour: 0, owners: {}, scores: [0, 0, 0], territory: [0, 0, 0],
      pvpEvents: 0, activeBattles: 0, activeFronts: 0, contestedTiles: 0, tileStatus: {},
    };

    const { container, unmount } = render(<HexMapCanvasV2 map={map} snapshot={snapshot} />);
    const canvas = container.querySelector("canvas")!;
    expect(observe).toHaveBeenCalledWith(canvas.parentElement);
    expect(canvas.width).toBe(1280);
    expect(canvas.height).toBe(840);

    width = 720;
    height = 500;
    clearRect.mockClear();
    act(() => resizeCallback?.([], {} as ResizeObserver));
    expect(canvas.width).toBe(1440);
    expect(canvas.height).toBe(1000);
    expect(setTransform).toHaveBeenLastCalledWith(2, 0, 0, 2, 0, 0);
    expect(clearRect).toHaveBeenLastCalledWith(0, 0, 720, 500);

    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: 1 });
  });
  test("keeps the compact category rail accessible while the editor opens as an overlay", async () => {
    let mediaListener: ((event: MediaQueryListEvent) => void) | undefined;
    const mediaQuery = {
      matches: true,
      media: "(max-width: 900px)",
      onchange: null,
      addEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => { mediaListener = listener; }),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList;
    vi.stubGlobal("matchMedia", vi.fn(() => mediaQuery));

    render(<SimulationDashboard />);
    const categories = screen.getByRole("navigation", { name: "参数分类" });
    const populationTrigger = within(categories).getByRole("button", { name: /人口与战力/ });
    const workspace = screen.getByTestId("analysis-workspace");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(populationTrigger);
    expect(screen.getByRole("dialog", { name: "人口与战力配置" })).toBeVisible();
    await waitFor(() => expect(screen.getByRole("searchbox", { name: "搜索参数" })).toHaveFocus());

    fireEvent.click(screen.getByRole("tab", { name: "战斗与士气" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(workspace).toHaveFocus());

    fireEvent.click(populationTrigger);
    expect(populationTrigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("button", { name: /^关闭$/ })).not.toBeInTheDocument();
    fireEvent.click(populationTrigger);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(populationTrigger).toHaveFocus());

    act(() => mediaListener?.({ matches: false } as MediaQueryListEvent));
    expect(categories).toBeVisible();
    vi.unstubAllGlobals();
  }, 15000);
  test("exposes the overlay parameter editor and pointy-top map replay", () => {
    const { container } = render(<SimulationDashboard />);
    const categories = screen.getByRole("navigation", { name: "参数分类" });
    expect(screen.queryByTestId("parameter-sidebar")).not.toBeInTheDocument();

    fireEvent.click(within(categories).getByRole("button", { name: /基础参数/ }));
    const drawer = screen.getByTestId("parameter-sidebar");
    expect(drawer).toHaveClass("parameter-editor-drawer");
    expect(drawer).toHaveAttribute("data-open", "true");
    expect(drawer).toHaveAttribute("aria-modal", "true");

    expect(screen.getByRole("img", { name: /海岛地图，T\+48小时，尖顶六边形/ })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "回放时间" })).toBeInTheDocument();
    expect(container.querySelector(".map-canvas-wrap")).toHaveAttribute("data-orientation", "pointy-top");
  }, 15000);
  test("opens a visible player detail drawer with its own historical event time control", () => {
    render(<SimulationDashboard />);

    fireEvent.click(screen.getByRole("tab", { name: "玩家与联盟排名" }));
    const playerButton = screen.getAllByRole("button", { name: /查看.+积分流水/ })[0];
    fireEvent.click(playerButton);

    const playerDrawer = screen.getByRole("dialog", { name: /玩家详情/ });
    expect(playerDrawer).toBeInTheDocument();
    expect(within(playerDrawer).getByRole("region", { name: /积分流水/ })).toBeInTheDocument();
    const eventTime = within(playerDrawer).getByRole("slider", { name: "玩家事件时间" });
    expect(eventTime).toHaveValue("48");
    fireEvent.change(eventTime, { target: { value: "0" } });
    expect(eventTime).toHaveValue("0");
    expect(within(playerDrawer).getByText("该时刻之前暂无积分事件")).toBeInTheDocument();

    fireEvent.click(within(playerDrawer).getByRole("button", { name: "关闭玩家详情" }));
    expect(screen.queryByRole("dialog", { name: /玩家详情/ })).not.toBeInTheDocument();
  }, 15000);  test("keeps the parameter category rail visible and opens only the selected category in a drawer", () => {
    render(<SimulationDashboard />);

    const categories = screen.getByRole("navigation", { name: "参数分类" });
    expect(within(categories).getAllByRole("button")).toHaveLength(11);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const populationTrigger = within(categories).getByRole("button", { name: /人口与战力/ });
    const moraleTrigger = within(categories).getByRole("button", { name: /^士气/ });
    fireEvent.click(populationTrigger);
    expect(screen.getByRole("dialog", { name: "人口与战力配置" })).toBeVisible();
    expect(screen.getByLabelText("低战力基础战力")).toBeVisible();
    expect(screen.queryByLabelText("随机种子")).not.toBeInTheDocument();
    expect(populationTrigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("button", { name: /^关闭$/ })).not.toBeInTheDocument();

    fireEvent.click(moraleTrigger);
    expect(screen.getByRole("dialog", { name: "士气配置" })).toBeVisible();
    expect(screen.getByLabelText("士气上限")).toBeVisible();
    expect(populationTrigger).toHaveAttribute("aria-expanded", "false");
    expect(moraleTrigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(moraleTrigger);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(moraleTrigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("navigation", { name: "参数分类" })).toBeVisible();
  }, 15000);
  test("keeps the map, current battle state, and three analytical charts in one overview", () => {
    render(<SimulationDashboard />);

    const overview = screen.getByTestId("overview-report");
    const mapRow = within(overview).getByTestId("overview-map-row");
    const analytics = within(overview).getByTestId("overview-analytics-grid");
    expect(within(mapRow).getByRole("heading", { name: /战局地图/ })).toBeInTheDocument();
    expect(within(mapRow).getByRole("complementary", { name: "当前战况" })).toBeInTheDocument();
    expect(within(analytics).getByRole("img", { name: "三联盟相对平均分差" })).toBeInTheDocument();
    expect(within(analytics).getByRole("img", { name: "每小时战斗与占领节奏" })).toBeInTheDocument();
    expect(within(analytics).getByRole("img", { name: "玩家战力与活跃分层贡献" })).toBeInTheDocument();
  }, 15000);
});

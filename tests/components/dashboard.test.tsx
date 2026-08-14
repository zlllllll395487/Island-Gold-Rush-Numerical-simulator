import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import rawMap from "../../src/data/tilerush-map.json";
import { HexMapCanvasV2 } from "../../src/components/HexMapCanvasV2";
import { loadCanonicalMap } from "../../src/map/map-loader";
import type { ReplaySnapshot } from "../../src/simulation/engine";
import { SimulationDashboardV2 as SimulationDashboard } from "../../src/components/SimulationDashboardV2";

const dashboardStyles = readFileSync(resolve(process.cwd(), "src/components/simulator-v2.css"), "utf8");

const TABS = [
  "仿真总览",
  "行动力与占领",
  "战斗与士气",
  "任务与奖励",
  "玩家与联盟排名",
  "批量实验",
] as const;

describe("simulation dashboard", () => {
  test("uses the approved product language and one parameter control area", () => {
    const { container } = render(<SimulationDashboard />);

    expect(screen.getByRole("heading", { level: 1, name: "海岛夺金 数值模拟" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2, name: "参数调整" })).toHaveLength(1);
    expect(screen.getByTestId("parameter-panel")).toBeInTheDocument();
    expect(screen.getByTestId("analysis-workspace")).toBeInTheDocument();
    expect(container.querySelector(".decision-rail")).toBeNull();
    expect(screen.queryByText(/数值指挥中心|决策信号|参数实验台|战场事件流|本局建议/)).not.toBeInTheDocument();

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(TABS);
  }, 15000);

  test("keeps every configuration editor in ParameterPanel and results-only task and batch pages", () => {
    render(<SimulationDashboard />);
    const panel = screen.getByTestId("parameter-panel");
    const workspace = screen.getByTestId("analysis-workspace");

    expect(within(panel).getByLabelText("任务 1 积分阈值")).toBeInTheDocument();
    expect(within(panel).getByLabelText("任务 1 奖励价值")).toBeInTheDocument();
    expect(within(panel).getByLabelText("批量运行局数")).toBeInTheDocument();

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
    fireEvent.change(screen.getByLabelText("占领节奏倍率"), { target: { value: "40" } });

    expect(screen.getByLabelText("占领节奏倍率")).toHaveValue("40");
    expect(screen.getByTestId("applied-pace-multiplier")).toHaveTextContent("30×");
    expect(screen.getByText("草稿待运行")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "运行仿真" }));
    await waitFor(() => expect(screen.getByTestId("applied-pace-multiplier")).toHaveTextContent("40×"));
    expect(screen.getByText("结果已应用")).toBeInTheDocument();
  }, 15000);

  test("keeps the main-formation headline applied until a valid rerun", async () => {
    render(<SimulationDashboard />);
    const summary = screen.getByTestId("main-formation-summary");

    expect(summary).toHaveTextContent("1 / 2 / 3 / 3 主力编队");
    fireEvent.change(screen.getByLabelText("低战力主力编队数"), { target: { value: "4" } });
    expect(summary).toHaveTextContent("1 / 2 / 3 / 3 主力编队");

    fireEvent.click(screen.getByRole("button", { name: "运行仿真" }));
    await waitFor(() => expect(summary).toHaveTextContent("4 / 2 / 3 / 3 主力编队"));
  }, 15000);

  test("renders an absent first PvP result as not occurred", async () => {
    render(<SimulationDashboard />);
    fireEvent.change(screen.getByLabelText("战斗时长（小时）"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "运行仿真" }));
    await waitFor(() => expect(screen.getByText("结果已应用")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("tab", { name: "行动力与占领" }));
    expect(screen.getByText("状态：未发生")).toBeInTheDocument();
  }, 15000);
  test("maps schema failures to stable issue ids, disables run, and resets the draft", () => {
    render(<SimulationDashboard />);
    const run = screen.getByRole("button", { name: "运行仿真" });

    fireEvent.change(screen.getByLabelText("初始 AP"), { target: { value: "150" } });

    expect(run).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveAttribute("data-validation-id", "ap.custom");
    expect(screen.getByRole("alert")).toHaveTextContent("初始 AP 不能超过 AP 上限");

    fireEvent.click(screen.getByRole("button", { name: "恢复默认" }));
    expect(screen.getByLabelText("初始 AP")).toHaveValue(50);
    expect(run).toBeEnabled();
  }, 15000);

  test("shows actual strategy analytics and the four-tier long-tail population summary", () => {
    render(<SimulationDashboard />);

    expect(screen.getByRole("heading", { name: "策略分布与实际表现" })).toBeInTheDocument();
    for (const strategy of ["中心争夺", "支援扩张", "多线推进"]) {
      expect(screen.getByRole("row", { name: new RegExp(strategy) })).toBeInTheDocument();
    }
    expect(screen.getByText("中心地格争夺占比")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "四档战力分布" })).toBeInTheDocument();
    for (const rowName of ["低战力 225", "中战力 60", "高战力 12", "超高战力 3"]) {
      expect(screen.getByRole("row", { name: new RegExp(rowName) })).toBeInTheDocument();
    }
    expect(screen.getByText("1 / 2 / 3 / 3 主力编队")).toBeInTheDocument();
    expect(screen.getByText("15× 超高/低档基础战力")).toBeInTheDocument();
    expect(screen.getByText("联盟战力比")).toBeInTheDocument();
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
  test("removes a closed compact drawer from focus and accessibility, then restores focus", async () => {
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
    const drawer = screen.getByTestId("parameter-sidebar");
    const workspace = screen.getByTestId("analysis-workspace");
    const openToggle = screen.getByRole("button", { name: "展开参数调整" });
    await waitFor(() => expect(drawer).toHaveAttribute("aria-hidden", "true"));
    expect(drawer).toHaveAttribute("inert");

    fireEvent.click(openToggle);
    expect(drawer).not.toHaveAttribute("aria-hidden");
    expect(drawer).not.toHaveAttribute("inert");
    await waitFor(() => expect(screen.getByRole("searchbox", { name: "搜索参数" })).toHaveFocus());

    fireEvent.click(screen.getByRole("tab", { name: "战斗与士气" }));
    await waitFor(() => expect(drawer).toHaveAttribute("inert"));
    expect(drawer).toHaveAttribute("aria-hidden", "true");
    expect(workspace).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "展开参数调整" }));
    const closeToggle = screen.getByRole("button", { name: "收起参数调整" });
    fireEvent.click(closeToggle);
    expect(closeToggle).toHaveFocus();

    act(() => mediaListener?.({ matches: false } as MediaQueryListEvent));
    await waitFor(() => expect(drawer).not.toHaveAttribute("aria-hidden"));
    expect(drawer).not.toHaveAttribute("inert");
    vi.unstubAllGlobals();
  }, 15000);
  test("exposes an accessible responsive parameter drawer and map replay", () => {
    const { container } = render(<SimulationDashboard />);
    const drawer = screen.getByTestId("parameter-sidebar");
    const toggle = screen.getByRole("button", { name: "展开参数调整" });

    expect(drawer).toHaveClass("parameter-sidebar");
    expect(drawer).toHaveAttribute("data-open", "false");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(drawer).toHaveAttribute("data-open", "true");
    expect(screen.getByRole("button", { name: "收起参数调整" })).toHaveAttribute("aria-expanded", "true");

    expect(screen.getByRole("img", { name: /海岛地图，T\+48小时，尖顶六边形/ })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "回放时间" })).toBeInTheDocument();
    expect(container.querySelector(".map-canvas-wrap")).toHaveAttribute("data-orientation", "pointy-top");
    expect(dashboardStyles).toMatch(/@media\s*\(max-width:\s*900px\)[\s\S]*\.parameter-sidebar/);
    expect(dashboardStyles).toMatch(/\.parameter-sidebar\[data-open="true"\]/);
  }, 15000);
});
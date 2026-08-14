import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SimulationDashboardV2 as SimulationDashboard } from "../../src/components/SimulationDashboardV2";
import { DEFAULT_CONFIG } from "../../src/domain/defaults";

describe("simulation dashboard", () => {
  test("keeps the default high-tier power inside the legacy slider bounds", () => {
    const { container } = render(<SimulationDashboard />);
    const slider = container.querySelector<HTMLInputElement>('input[type="range"][step="50000"]');

    expect(slider).not.toBeNull();
    expect(Number(slider!.min)).toBeLessThanOrEqual(DEFAULT_CONFIG.population.basePower.high);
    expect(Number(slider!.max)).toBeGreaterThanOrEqual(DEFAULT_CONFIG.population.basePower.high);
    expect(Number(slider!.value)).toBe(DEFAULT_CONFIG.population.basePower.high);
  }, 15000);

  test("renders the six analysis views and can rerun a match", () => {
    render(<SimulationDashboard />);
    expect(screen.getByRole("heading", { name: /海岛夺金/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "仿真总览" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "行动力与节奏" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "\u6218\u6597\u4e0e\u58eb\u6c14" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "任务与奖励" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "玩家与联盟排名" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "批量实验" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /重新运行/ }));
    expect(screen.getByText(/随机种子/)).toBeInTheDocument();
    expect(screen.getByText("\u5730\u683c\u56fe\u4f8b")).toBeInTheDocument();
    expect(screen.getAllByText("\u4e89\u593a\u96c6\u4e2d\u5ea6")).toHaveLength(2);
  }, 15000);
});

import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SimulationDashboard } from "../../src/components/SimulationDashboard";

describe("simulation dashboard", () => {
  test("renders the five analysis views and can rerun a match", () => {
    render(<SimulationDashboard />);
    expect(screen.getByRole("heading", { name: /海岛夺金/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "仿真总览" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "行动力与节奏" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "任务与奖励" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "玩家与联盟排名" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "批量实验" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /重新运行/ }));
    expect(screen.getByText(/随机种子/)).toBeInTheDocument();
  });
});

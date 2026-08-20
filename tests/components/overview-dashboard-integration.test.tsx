import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SimulationDashboardV2 } from "../../src/components/SimulationDashboardV2";

describe("overview visualization integration", () => {
  test("keeps the map primary while exposing four synchronized charts and map modes", () => {
    const { container } = render(<SimulationDashboardV2 />);
    expect(container.querySelector(".overview-map-figure")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "三联盟相对平均分差" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "每小时战斗与占领节奏" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "玩家战力与活跃分层贡献" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "玩家积分贡献集中度" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "玩家战力、行动力利用率与积分贡献" })).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "联盟归属" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "战斗热区" }));
    expect(container.querySelector(".map-canvas-wrap")).toHaveAttribute("data-mode", "heat");
  }, 30000);

  test("updates battle metrics and chart data to the replay cutoff", () => {
    render(<SimulationDashboardV2 />);
    const currentState = screen.getByRole("complementary", { name: "当前战况" });
    expect(within(currentState).getByText("每小时场均战功")).toBeInTheDocument();
    expect(within(currentState).getByText("领先联盟易手")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("slider", { name: /回放时间/ }), { target: { value: "0" } });
    expect(screen.getByTestId("overview-total-battles")).toHaveTextContent("0");
    expect(screen.getByTestId("overview-average-battle-score")).toHaveTextContent("0");
    expect(screen.getByTestId("overview-rank-changes")).toHaveTextContent("0");
    expect(screen.getByRole("img", { name: "玩家积分贡献集中度" })).toHaveAttribute("data-total-score", "0");
  }, 30000);
});

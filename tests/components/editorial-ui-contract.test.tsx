import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SimulationDashboardV2 } from "../../src/components/SimulationDashboardV2";

describe("editorial research workspace contract", () => {
  test("uses the decision summary in place of the generic KPI strip", () => {
    const { container } = render(<SimulationDashboardV2 />);

    const summary = screen.getByTestId("decision-summary");
    expect(within(summary).getByRole("heading", { name: "本局关键结论" })).toBeInTheDocument();
    expect(within(summary).getByText("地图价值差")).toBeInTheDocument();
    expect(within(summary).getByText("行动力浪费率")).toBeInTheDocument();
    expect(within(summary).getByText("积分集中度")).toBeInTheDocument();
    expect(container.querySelector(".summary-strip")).toBeNull();
    expect(container.querySelector(".map-panel")).toHaveClass("map-plate-primary");
  }, 15000);
});

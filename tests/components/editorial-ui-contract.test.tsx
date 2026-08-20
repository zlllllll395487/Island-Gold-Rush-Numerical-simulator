import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SimulationDashboardV2 } from "../../src/components/SimulationDashboardV2";

describe("editorial research workspace contract", () => {
  test("uses the editorial brand with a persistent category rail and overlay editor", () => {
    const { container } = render(<SimulationDashboardV2 />);

    expect(container.querySelector("main")).toHaveClass("editorial-workspace");
    expect(screen.getByTestId("simulator-brand-mark")).toHaveAttribute("aria-hidden", "true");
    const topbar = screen.getByRole("banner", { name: "模拟器导航" });
    expect(within(topbar).getAllByRole("tab")).toHaveLength(6);

    const navigation = screen.getByRole("navigation", { name: "参数分类" });
    expect(within(navigation).getAllByRole("button")).toHaveLength(11);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(within(navigation).getByRole("button", { name: /基础参数/ }));

    const drawer = screen.getByRole("dialog", { name: "基础参数配置" });
    const panel = within(drawer).getByTestId("parameter-panel");
    expect(panel).toHaveAttribute("data-variant", "editorial");
    expect(within(panel).queryByRole("navigation", { name: "参数分类" })).not.toBeInTheDocument();
    expect(within(panel).getAllByTestId(/^parameter-section-/)).toHaveLength(1);
    expect(within(drawer).queryByRole("tab")).toBeNull();
    expect(container.querySelector("details, summary")).toBeNull();
  }, 15000);

  test("uses the factual decision summary and compact map-first report", () => {
    const { container } = render(<SimulationDashboardV2 />);

    const summary = screen.getByTestId("decision-summary");
    expect(within(summary).getByRole("heading", { level: 1, name: "本局模拟结果" })).toBeInTheDocument();
    expect(within(summary).getByText("地图价值差")).toBeInTheDocument();
    expect(within(summary).getByText("行动力浪费率")).toBeInTheDocument();
    expect(within(summary).getByText("积分集中度")).toBeInTheDocument();
    expect(container.querySelector(".summary-strip")).toBeNull();

    const overview = screen.getByTestId("overview-report");
    expect(overview.firstElementChild).toHaveClass("overview-analytics-grid");
    expect(within(overview).getByTestId("overview-map-row")).toContainElement(
      within(overview).getByRole("heading", { name: /战局地图/ }).closest("section"),
    );
    const analytics = within(overview).getByTestId("overview-analytics-grid");
    // One accessible map canvas plus four analytical SVG charts.
    expect(within(analytics).getAllByRole("img")).toHaveLength(5);
  }, 15000);
});
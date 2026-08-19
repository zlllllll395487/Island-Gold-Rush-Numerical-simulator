import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SimulationDashboardV2 } from "../../src/components/SimulationDashboardV2";

describe("editorial research workspace contract", () => {
  test("uses the editorial brand and a persistent category-to-editor parameter relationship", () => {
    const { container } = render(<SimulationDashboardV2 />);

    expect(container.querySelector("main")).toHaveClass("editorial-workspace");
    expect(screen.getByTestId("simulator-brand-mark")).toHaveAttribute("aria-hidden", "true");
    const topbar = screen.getByRole("banner", { name: "模拟器导航" });
    expect(within(topbar).getAllByRole("tab")).toHaveLength(6);

    const panel = screen.getByTestId("parameter-panel");
    const navigation = within(panel).getByRole("navigation", { name: "参数分类" });
    expect(panel).toHaveAttribute("data-variant", "editorial");
    expect(within(navigation).getAllByRole("button")).toHaveLength(11);
    expect(within(navigation).getByRole("button", { name: /基础参数/ })).toHaveAttribute("aria-current", "page");
    expect(within(panel).getByTestId("parameter-category-editor")).toBeInTheDocument();
    expect(within(panel).getAllByTestId(/^parameter-section-/)).toHaveLength(11);
    expect(within(screen.getByTestId("parameter-sidebar")).queryByRole("tab")).toBeNull();
    expect(container.querySelector("details, summary")).toBeNull();
  }, 15000);

  test("uses the factual decision summary and map-first report in place of the generic KPI strip", () => {
    const { container } = render(<SimulationDashboardV2 />);

    const summary = screen.getByTestId("decision-summary");
    expect(within(summary).getByRole("heading", { level: 1, name: "本局模拟结果" })).toBeInTheDocument();
    expect(within(summary).getByText("地图价值差")).toBeInTheDocument();
    expect(within(summary).getByText("行动力浪费率")).toBeInTheDocument();
    expect(within(summary).getByText("积分集中度")).toBeInTheDocument();
    expect(container.querySelector(".summary-strip")).toBeNull();

    const overview = screen.getByTestId("overview-report");
    expect(overview.firstElementChild).toHaveClass("overview-map-figure", "map-plate-primary");
  }, 15000);
});

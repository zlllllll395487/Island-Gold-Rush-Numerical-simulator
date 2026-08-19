import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SimulationDashboardV2 } from "../../src/components/SimulationDashboardV2";

const styles = readFileSync(resolve(process.cwd(), "src/components/simulator-v2.css"), "utf8");
const parameterStyles = readFileSync(resolve(process.cwd(), "src/components/parameter-panel.css"), "utf8");

describe("editorial research workspace contract", () => {
  test("uses readable typography and a fixed category-to-editor parameter relationship", () => {
    expect(styles).toMatch(/--body-size:\s*13px/);
    expect(styles).toMatch(/--body-weight:\s*500/);
    expect(styles).toMatch(/--label-size:\s*12px/);
    expect(styles).toMatch(/--heading-weight:\s*600/);
    expect(styles).toMatch(/grid-template-columns:\s*clamp\(390px,\s*29vw,\s*470px\)\s+minmax\(0,\s*1fr\)/);
    expect(parameterStyles).toMatch(/grid-template-columns:\s*118px\s+minmax\(220px,\s*1fr\)/);
    expect(parameterStyles).toMatch(/@media \(max-width:\s*900px\)[\s\S]*grid-auto-flow:\s*column/);
  });
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

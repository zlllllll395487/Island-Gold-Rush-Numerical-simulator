import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const css = (file: string) => readFileSync(resolve(process.cwd(), "src/components", file), "utf8");
const CURRENT_BUNDLE_ORDER = [
  css("parameter-rail-drawer.css"),
  css("overview-single-screen.css"),
  css("simulator-v2.css"),
  css("editorial-simulator.css"),
].join("\n");

describe("editorial desktop layout cascade", () => {
  test("keeps the approved fixed rail and overlay geometry after legacy styles load", () => {
    const style = document.createElement("style");
    style.textContent = CURRENT_BUNDLE_ORDER;
    document.head.append(style);
    const { container } = render(
      <main className="simulation-app editorial-workspace">
        <nav className="parameter-category-rail" />
        <section className="analysis-shell" />
        <aside className="parameter-editor-drawer" />
      </main>,
    );
    const root = container.querySelector("main")!;
    const drawer = container.querySelector("aside")!;
    expect(getComputedStyle(root).getPropertyValue("--parameter-rail-width").trim()).toBe("164px");
    expect(getComputedStyle(root).gridTemplateColumns).toContain("--parameter-rail-width");
    expect(getComputedStyle(drawer).getPropertyValue("--parameter-drawer-width").trim()).toBe("440px");
    style.remove();
  });

  test("keeps the map and current state in one row with a complete canvas", () => {
    const style = document.createElement("style");
    style.textContent = CURRENT_BUNDLE_ORDER;
    document.head.append(style);
    const { container } = render(
      <main className="simulation-app editorial-workspace">
        <div className="overview-map-row">
          <section className="overview-map-figure"><div className="map-canvas-wrap"><canvas className="map-canvas" /></div></section>
          <aside className="overview-current-state" />
        </div>
      </main>,
    );
    const figure = container.querySelector(".overview-map-figure")!;
    const canvas = container.querySelector(".map-canvas")!;
    expect(getComputedStyle(figure).gridColumn).not.toBe("1 / -1");
    expect(getComputedStyle(canvas).height).toBe("100%");
    expect(getComputedStyle(canvas).minHeight).toBe("0px");
    style.remove();
  });

  test("uses a proportioned map and a two-row analytical layout on desktop", () => {
    const style = document.createElement("style");
    style.textContent = CURRENT_BUNDLE_ORDER;
    document.head.append(style);
    const { container } = render(
      <main className="simulation-app editorial-workspace">
        <section className="analysis-workspace">
          <div className="overview-primary-grid">
            <div className="overview-map-row"><div className="overview-map-figure"><div className="map-canvas-wrap" /></div></div>
            <div className="strategic-trend-chart" />
          </div>
          <div className="overview-secondary-grid"><div /><div /><div /></div>
        </section>
      </main>,
    );
    const workspace = container.querySelector(".analysis-workspace")!;
    const mapWrap = container.querySelector(".map-canvas-wrap")!;
    const primary = container.querySelector(".overview-primary-grid")!;
    const secondary = container.querySelector(".overview-secondary-grid")!;
    expect(getComputedStyle(workspace).maxWidth).toBe("1440px");
    expect(getComputedStyle(primary).gridTemplateColumns).toContain("minmax(0, 1.25fr)");
    expect(getComputedStyle(secondary).gridTemplateColumns).toContain("repeat(3");
    expect(getComputedStyle(mapWrap).maxHeight).toBe("300px");
    expect(getComputedStyle(mapWrap).minHeight).toBe("270px");
    style.remove();
  });

  test("makes room for the desktop parameter drawer instead of covering the report", () => {
    const style = document.createElement("style");
    style.textContent = CURRENT_BUNDLE_ORDER;
    document.head.append(style);
    const { container } = render(
      <main className="simulation-app editorial-workspace" data-parameter-drawer-open="true">
        <section className="analysis-shell" />
      </main>,
    );
    expect(getComputedStyle(container.querySelector(".analysis-shell")!).paddingLeft).toBe("440px");
    style.remove();
  });

  test("gives the six top-level report tabs a larger, evenly distributed desktop rhythm", () => {
    const style = document.createElement("style");
    style.textContent = CURRENT_BUNDLE_ORDER;
    document.head.append(style);
    const { container } = render(
      <main className="simulation-app editorial-workspace">
        <nav className="simulation-topbar__tabs">
          {Array.from({ length: 6 }, (_, index) => <button key={index}>目录 {index + 1}</button>)}
        </nav>
      </main>,
    );
    const tabs = container.querySelector(".simulation-topbar__tabs")!;
    const button = container.querySelector(".simulation-topbar__tabs button")!;
    expect(getComputedStyle(tabs).justifyContent).toBe("space-between");
    expect(getComputedStyle(tabs).columnGap).toBe("20px");
    expect(getComputedStyle(button).fontSize).toBe("14px");
    expect(getComputedStyle(button).fontWeight).toBe("600");
    style.remove();
  });
});
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import { ParameterPanel } from "../../src/components/ParameterPanel";
import { DEFAULT_CONFIG } from "../../src/domain/defaults";

function panel(group: "basic" | "population" | "tasksRewards") {
  return (
    <ParameterPanel
      activeGroup={group}
      draft={structuredClone(DEFAULT_CONFIG)}
      validation={[]}
      onChange={vi.fn()}
      onReset={vi.fn()}
    />
  );
}

describe("parameter category editor", () => {
  test("renders only the requested parameter category without its own directory", () => {
    render(panel("population"));

    const editor = screen.getByTestId("parameter-category-editor");
    expect(screen.queryByTestId("parameter-category-nav")).not.toBeInTheDocument();
    expect(editor).not.toHaveTextContent("基础参数");
    expect(editor).toHaveTextContent("人口与战力");
    expect(screen.queryByLabelText("随机种子")).not.toBeInTheDocument();
    expect(screen.getByLabelText("低战力基础战力")).toBeInTheDocument();
    expect(document.querySelector("details, summary")).toBeNull();
  });

  test("replaces the editor contents when the selected category changes", () => {
    const { rerender } = render(panel("basic"));
    expect(screen.getByLabelText("随机种子")).toBeInTheDocument();
    expect(screen.queryByLabelText("低战力基础战力")).not.toBeInTheDocument();

    rerender(panel("population"));
    expect(screen.queryByLabelText("随机种子")).not.toBeInTheDocument();
    expect(screen.getByLabelText("低战力基础战力")).toBeInTheDocument();

    rerender(panel("tasksRewards"));
    expect(screen.getAllByTestId(/^task-row-/)).toHaveLength(10);
  });

  test("searches only inside the active category", () => {
    render(panel("population"));
    fireEvent.change(screen.getByRole("searchbox", { name: "搜索参数" }), {
      target: { value: "超高战力普通编队强度" },
    });

    expect(screen.getByLabelText("超高战力普通编队强度")).toBeInTheDocument();
    expect(screen.queryByLabelText("低战力基础战力")).not.toBeInTheDocument();
    expect(screen.getByTestId("parameter-search-results")).toHaveTextContent("人口与战力");
  });

  test("provides visible field metadata for drawer-native matrix cards", () => {
    const { rerender } = render(panel("population"));
    const populationCells = Array.from(document.querySelectorAll(".parameter-matrix td"));
    expect(populationCells.length).toBeGreaterThan(0);
    expect(populationCells.every((cell) => Boolean(cell.getAttribute("data-label")))).toBe(true);

    rerender(panel("tasksRewards"));
    const taskCells = Array.from(document.querySelectorAll(".parameter-task-table td"));
    expect(taskCells.length).toBeGreaterThan(0);
    expect(taskCells.every((cell) => Boolean(cell.getAttribute("data-label")))).toBe(true);
  });
  test("keeps the editor visual language restrained and editorial", () => {
    render(panel("basic"));
    expect(screen.getByTestId("parameter-panel")).toHaveAttribute("data-variant", "editorial");
    expect(screen.queryByTestId("parameter-category-nav")).not.toBeInTheDocument();
    expect(document.querySelector("details, summary")).toBeNull();
  });
});
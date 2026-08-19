import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import { ParameterPanel } from "../../src/components/ParameterPanel";
import { DEFAULT_CONFIG } from "../../src/domain/defaults";

const BASIC = "\u57fa\u7840\u53c2\u6570";
const POPULATION = "\u4eba\u53e3\u4e0e\u6218\u529b";
const TASKS = "\u4efb\u52a1\u4e0e\u5956\u52b1";

describe("parameter chapter inspector", () => {
  test("uses a persistent category navigator with a replacing current-category editor", () => {
    render(
      <ParameterPanel
        draft={structuredClone(DEFAULT_CONFIG)}
        validation={[]}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    const index = screen.getByTestId("parameter-category-nav");
    const editor = screen.getByTestId("parameter-category-editor");
    expect(index).toHaveAccessibleName("参数分类");
    expect(editor).toHaveTextContent(BASIC);
    expect(editor).toHaveTextContent("项参数");
    expect(screen.getByLabelText("随机种子")).toBeInTheDocument();
    expect(screen.queryByLabelText("低战力基础战力")).not.toBeInTheDocument();
    expect(document.querySelector("details")).toBeNull();

    fireEvent.click(within(index).getByRole("button", { name: new RegExp(POPULATION) }));

    expect(editor).toHaveTextContent(POPULATION);
    expect(screen.getByLabelText("低战力基础战力")).toBeInTheDocument();
    expect(screen.queryByLabelText("随机种子")).not.toBeInTheDocument();
  });
  test("shows an eleven-chapter index and only the selected chapter controls", () => {
    render(
      <ParameterPanel
        draft={structuredClone(DEFAULT_CONFIG)}
        validation={[]}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    const index = screen.getByRole("navigation", { name: "\u53c2\u6570\u5206\u7c7b" });
    expect(within(index).getAllByRole("button")).toHaveLength(11);
    expect(within(index).getByRole("button", { name: new RegExp(BASIC) })).toHaveAttribute("aria-current", "page");
    expect(screen.getByLabelText("\u968f\u673a\u79cd\u5b50")).toBeInTheDocument();
    expect(screen.queryByLabelText("\u4f4e\u6218\u529b\u57fa\u7840\u6218\u529b")).not.toBeInTheDocument();

    fireEvent.click(within(index).getByRole("button", { name: new RegExp(POPULATION) }));
    expect(screen.getByLabelText("\u4f4e\u6218\u529b\u57fa\u7840\u6218\u529b")).toBeInTheDocument();
    expect(screen.queryByLabelText("\u968f\u673a\u79cd\u5b50")).not.toBeInTheDocument();

    fireEvent.click(within(index).getByRole("button", { name: new RegExp(TASKS) }));
    expect(screen.getAllByTestId(/^task-row-/)).toHaveLength(10);
  });

  test("searches across chapters and reports the matching chapter", () => {
    render(
      <ParameterPanel
        draft={structuredClone(DEFAULT_CONFIG)}
        validation={[]}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole("searchbox", { name: "\u641c\u7d22\u53c2\u6570" }), {
      target: { value: "\u8d85\u9ad8\u6218\u529b\u666e\u901a\u7f16\u961f\u5f3a\u5ea6" },
    });

    expect(screen.getByLabelText("\u8d85\u9ad8\u6218\u529b\u666e\u901a\u7f16\u961f\u5f3a\u5ea6")).toBeInTheDocument();
    expect(screen.getByTestId("parameter-search-results")).toHaveTextContent(POPULATION);
  });

  test("marks the parameter workspace as editorial without adding category chrome", () => {
    render(
      <ParameterPanel
        draft={structuredClone(DEFAULT_CONFIG)}
        validation={[]}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByTestId("parameter-panel")).toHaveAttribute("data-variant", "editorial");
    const nav = screen.getByTestId("parameter-category-nav");
    expect(within(nav).getByRole("button", { name: new RegExp(BASIC) })).toHaveAttribute("aria-current", "page");
    expect(document.querySelector("details, summary")).toBeNull();
  });
});

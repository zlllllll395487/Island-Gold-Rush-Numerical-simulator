"use client";

import { PARAMETER_CATALOG, PARAMETER_GROUPS, type ParameterGroupId } from "./parameter-catalog";

export interface ParameterCategoryRailProps {
  activeGroup: ParameterGroupId;
  expanded: boolean;
  onSelect: (group: ParameterGroupId, trigger: HTMLButtonElement) => void;
}

export function ParameterCategoryRail({ activeGroup, expanded, onSelect }: ParameterCategoryRailProps) {
  return (
    <nav className="parameter-category-rail" data-testid="parameter-category-nav" aria-label="参数分类">
      <h2>参数调整</h2>
      <div className="parameter-category-rail__items">
        {PARAMETER_GROUPS.map((group) => (
          <button
            key={group.id}
            type="button"
            aria-current={activeGroup === group.id ? "page" : undefined}
            aria-expanded={activeGroup === group.id && expanded}
            aria-controls={"parameter-sidebar"}
            onClick={(event) => onSelect(group.id, event.currentTarget)}
          >
            <span>{group.label}</span>
            <small>{PARAMETER_CATALOG.filter((entry) => entry.group === group.id).length}</small>
          </button>
        ))}
      </div>
    </nav>
  );
}

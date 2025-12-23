import React from "react";
import SearchBar from "./search/SearchBar";
import { FilterChip } from "./search/FilterChip";
import { NodeInfoProps } from "../leftsidebar/NodeInfo";
import ResultsList from "./ResultsList";

interface RightSearchPanelProps {
  results: NodeInfoProps[];
  onSearch: (field: string, query: string) => void;
  onSelectNode: (node: NodeInfoProps) => void;
  error?: string | null;
  onOptionsChange?: (opts: { matchCase: boolean; matchWords: boolean }) => void;
  filters?: { id: string; field: string; query: string }[];
  onRemoveFilter?: (id: string) => void;
  onHoverResultCard?: (node?: NodeInfoProps) => void;
}

export const SearchPanel: React.FC<RightSearchPanelProps> = ({
  results,
  onSearch,
  onSelectNode,
  error,
  onOptionsChange,
  filters = [],
  onRemoveFilter,
  onHoverResultCard,
}) => {
  const handleSearch = React.useCallback(
    (field: string, query: string) => {
      onSearch(field, query);
    },
    [onSearch]
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* SEARCH HEADER — NO BACKGROUND, NO SHADOW */}
      <div
        className="
          sticky top-0 z-10 px-4 pb-4
          bg-transparent
        "
      >
        <SearchBar
          onSearch={handleSearch}
          onOptionsChange={onOptionsChange}
          hideButton
        />

        {error && (
          <p className="text-red-600 dark:text-red-500 text-xs mt-1">
            {error}
          </p>
        )}

        {filters.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {filters.map((f) => (
              <FilterChip
                key={f.id}
                label={`${f.field ? f.field : "Any"}: "${f.query}"`}
                onRemove={() => onRemoveFilter?.(f.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* RESULTS */}
      <div className="px-4 py-4">
        <ResultsList
          type="search"
          items={results}
          onSelectNode={onSelectNode}
          onHoverResultCard={onHoverResultCard}
        />
      </div>
    </div>
  );
};

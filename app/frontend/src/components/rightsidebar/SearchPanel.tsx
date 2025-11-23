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
}

export const SearchPanel: React.FC<RightSearchPanelProps> = ({
  results,
  onSearch,
  onSelectNode,
  error,
  onOptionsChange,
  filters = [],
  onRemoveFilter,
}) => {
  const handleSearch = React.useCallback(
    (field: string, query: string) => {
      onSearch(field, query);
    },
    [onSearch]
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="sticky top-0 z-10 bg-black px-4 pb-4 shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]">
        <SearchBar
          onSearch={handleSearch}
          onOptionsChange={onOptionsChange}
          hideButton
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

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

      <div className="px-4 py-4">
        <ResultsList type="search" items={results} onSelectNode={onSelectNode} />
      </div>
    </div>
  );
};

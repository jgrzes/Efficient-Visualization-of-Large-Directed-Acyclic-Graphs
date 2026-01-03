import React from "react";
import type { NodeInfoProps } from "../components/leftsidebar/NodeInfo";
import type { SearchFilter, SearchOptions } from "../graph/api/search";
import { searchNodes } from "../graph/api/search";

export function useSearch(currentGraphUUID: string | null) {
  const [filters, setFilters] = React.useState<SearchFilter[]>([]);
  const [searchOptions, setSearchOptions] = React.useState<SearchOptions>({
    matchCase: false,
    matchWords: false,
  });

  const [results, setResults] = React.useState<NodeInfoProps[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const performSearch = React.useCallback(
    async (filtersToApply: SearchFilter[]) => {
      if (filtersToApply.length === 0) {
        setResults([]);
        setError(null);
        return;
      }

      try {
        setResults([]);

        const data = await searchNodes(
          currentGraphUUID,
          filtersToApply.map(({ field, query }) => ({ field, query })),
          searchOptions
        );

        setError(null);
        setResults(Array.isArray(data) ? data : [data]);
      } catch (e: any) {
        setError(e?.message ?? "Connection error");
      }
    },
    [currentGraphUUID, searchOptions]
  );

  const handleSearch = React.useCallback(
    (field: string, query: string) => {
      const q = query.trim();
      if (!q) return;

      setFilters((prev) => {
        const alreadyExists = prev.some((f) => f.field === field && f.query === q);
        if (alreadyExists) return prev;

        const newFilter: SearchFilter = { id: crypto.randomUUID(), field, query: q };
        const updated = [...prev, newFilter];
        void performSearch(updated);
        return updated;
      });
    },
    [performSearch]
  );

  const handleRemoveFilter = React.useCallback(
    (id: string) => {
      setFilters((prev) => {
        const updated = prev.filter((f) => f.id !== id);
        void performSearch(updated);
        return updated;
      });
    },
    [performSearch]
  );

  React.useEffect(() => {
    if (filters.length === 0) return;
    void performSearch(filters);
  }, [searchOptions, filters, performSearch]);

  return {
    filters,
    results,
    error,
    searchOptions,
    setSearchOptions,
    handleSearch,
    handleRemoveFilter,
    setResults,
  };
}

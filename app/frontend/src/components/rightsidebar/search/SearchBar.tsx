import React, { useEffect, useMemo, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { SearchFieldSelect } from "./SearchFieldSelect";
import { SearchOptions } from "./SearchOptions";
import { SearchInput } from "./SearchInput";

export interface SearchBarProps {
  onSearch: (field: string, query: string) => void;
  onOptionsChange?: (opts: { matchCase: boolean; matchWords: boolean }) => void;
  hideButton?: boolean;
}

export default function SearchBar({
  onSearch,
  onOptionsChange,
  hideButton = false,
}: SearchBarProps) {
  const [field, setField] = useState("");
  const [query, setQuery] = useState("");

  const [matchCase, setMatchCase] = useState(false);
  const [matchWords, setMatchWords] = useState(false);

  useEffect(() => {
    onOptionsChange?.({ matchCase, matchWords });
  }, [matchCase, matchWords, onOptionsChange]);

  const placeholder = useMemo(() => {
    if (matchWords) return "Search (whole words)…";
    return "Search…";
  }, [matchWords]);

  const handleSearch = () => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return;

    const normalizedField = field.trim() || "";
    onSearch(normalizedField, normalizedQuery);
  };

  const isDisabled = !query.trim();

  return (
    <form
      className="flex w-full flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleSearch();
      }}
    >
      <div className="flex w-full items-center gap-2">
        <SearchFieldSelect
          value={field}
          onChange={setField}
          onClear={() => setField("")}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Enter") {
              e.stopPropagation();
              handleSearch();
            }
          }}
        />
        <SearchOptions
          matchCase={matchCase}
          matchWords={matchWords}
          onMatchCaseChange={setMatchCase}
          onMatchWordsChange={setMatchWords}
        />
      </div>

      <div className="flex items-center gap-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={placeholder}
          onClear={() => setQuery("")}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Enter") {
              e.stopPropagation();
              handleSearch();
            }
          }}
        />

        {!hideButton && (
          <button
            type="submit"
            disabled={isDisabled}
            className={[
              "inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm border transition",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:focus:ring-blue-400/40",
              isDisabled
                ? [
                    "cursor-not-allowed",
                    "border-black/10 bg-black/2 text-gray-400",
                    "dark:border-gray-700 dark:bg-black dark:text-gray-500",
                  ].join(" ")
                : [
                    "border-black/10 bg-black/3 text-gray-800 hover:bg-black/6",
                    "dark:border-gray-700 dark:bg-white/2 dark:text-gray-100 dark:hover:bg-white/6",
                  ].join(" "),
            ].join(" ")}
            aria-label="Search"
            title="Search"
          >
            <SearchIcon size={16} />
            <span className="hidden sm:inline">Search</span>
          </button>
        )}
      </div>
    </form>
  );
}

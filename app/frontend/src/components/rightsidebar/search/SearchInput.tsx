import React from "react";
import { X } from "lucide-react";

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onClear: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  onClear,
  onKeyDown,
}: SearchInputProps) {
  return (
    <div className="relative flex-1">
      <label className="sr-only" htmlFor="search-query-input">
        Search
      </label>

      <input
        id="search-query-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="
          w-full rounded-md px-3 py-2 pr-8 text-sm transition-all duration-200
          focus:outline-none focus:ring-2

          bg-white/80 text-gray-900 placeholder-gray-400
          border border-black/10
          focus:ring-blue-500/40 focus:border-blue-500/40

          dark:bg-black/60 dark:text-gray-200 dark:placeholder-gray-500
          dark:border-gray-700
          dark:focus:ring-blue-400/40 dark:focus:border-blue-400/40
        "
      />

      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear"
          title="Clear"
          className="
            absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition

            text-gray-500 hover:text-gray-800 hover:bg-black/5
            dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800/70
          "
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

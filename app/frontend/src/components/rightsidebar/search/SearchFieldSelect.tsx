import { X } from "lucide-react";

export interface SearchFieldSelectProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function SearchFieldSelect({
  value,
  onChange,
  onClear,
  onKeyDown,
}: SearchFieldSelectProps) {
  return (
    <div className="relative flex-1">
      <label className="sr-only" htmlFor="search-field-select">
        Field
      </label>

      <input
        id="search-field-select"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black text-gray-200 border border-gray-700 rounded-md px-3 py-2 text-sm cursor-text
                   focus:outline-none focus:ring-1 focus:ring-gray-500 transition-all duration-200"
        placeholder="Field (e.g., id, name, def...)"
        onKeyDown={onKeyDown}
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md 
                     text-gray-400 hover:text-gray-200 hover:bg-gray-800/70 transition"
          aria-label="Clear"
          title="Clear"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

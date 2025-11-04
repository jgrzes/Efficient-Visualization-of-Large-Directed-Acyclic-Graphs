import  { useState } from "react";
import { Regex, CaseSensitive, WholeWord } from "lucide-react";

interface SearchBarProps {
  onSearch: (field: string, query: string) => void;
  onOptionsChange?: (opts: { matchCase: boolean; regex: boolean; matchWords: boolean }) => void;
}

export default function SearchBar({ onSearch, onOptionsChange }: SearchBarProps) {
  const [field, setField] = useState("all");
  const [query, setQuery] = useState("");

  const [matchCase, setMatchCase] = useState(false);
  const [regex, setRegex] = useState(false);
  const [matchWords, setMatchWords] = useState(false);

  const emitOptions = (next?: Partial<{ matchCase: boolean; regex: boolean; matchWords: boolean }>) => {
    const opts = { matchCase, regex, matchWords, ...next };
    onOptionsChange?.(opts);
  };

  const handleSearch = () => {
    const q = query.trim();
    if (!q) return;
    onSearch(field, q);
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full items-center gap-2">
        <select
          value={field}
          onChange={(e) => setField(e.target.value)}
          className="w-full bg-black text-gray-200 border border-gray-700 rounded-md px-3 py-2 text-sm cursor-pointer
                     focus:outline-none focus:ring-1 focus:ring-gray-500 transition-all duration-200"
        >
          <option value="all">All</option>
          <option value="id">ID</option>
          <option value="name">Name</option>
          <option value="namespace">Namespace</option>
          <option value="def">Definition</option>
          <option value="synonym">Synonym</option>
          <option value="is_a">Is_a</option>
        </select>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Match case"
            aria-pressed={matchCase}
            onClick={() => {
              const v = !matchCase;
              setMatchCase(v);
              emitOptions({ matchCase: v });
            }}
            className={`h-8 w-8 rounded-md border text-xs transition-colors flex items-center justify-center cursor-pointer
                        ${matchCase ? "bg-gray-800 text-gray-100 border-gray-600" : "bg-black text-gray-300 border-gray-700 hover:bg-gray-900"}`}
            title="Match case"
          >
            <CaseSensitive size={20} />
          </button>

          <button
            type="button"
            aria-label="Match whole words"
            aria-pressed={matchWords}
            onClick={() => {
              const v = !matchWords;
              setMatchWords(v);
              emitOptions({ matchWords: v });
            }}
            className={`h-8 w-8 rounded-md border text-xs transition-colors flex items-center justify-center cursor-pointer
                        ${matchWords ? "bg-gray-800 text-gray-100 border-gray-600" : "bg-black text-gray-300 border-gray-700 hover:bg-gray-900"}`}
            title="Match whole words"
          >
            <WholeWord size={20} />
          </button>

          <button
            type="button"
            aria-label="Regex"
            aria-pressed={regex}
            onClick={() => {
              const v = !regex;
              setRegex(v);
              emitOptions({ regex: v });
            }}
            className={`h-8 w-8 rounded-md border text-xs transition-colors flex items-center justify-center cursor-pointer
                        ${regex ? "bg-gray-800 text-gray-100 border-gray-600" : "bg-black text-gray-300 border-gray-700 hover:bg-gray-900"}`}
            title="Regex"
          >
            <Regex size={20} />
          </button>

        </div>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        className="w-full bg-black text-gray-200 placeholder-gray-500
                   border border-gray-700 rounded-md px-3 py-2 text-sm
                   focus:outline-none focus:ring-1 focus:ring-gray-500 transition-all duration-200"
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
      />
    </div>
  );
}

import { CaseSensitive, WholeWord } from "lucide-react";

export interface SearchOptionsProps {
  matchCase: boolean;
  matchWords: boolean;
  onMatchCaseChange: (value: boolean) => void;
  onMatchWordsChange: (value: boolean) => void;
}

export function SearchOptions({
  matchCase,
  matchWords,
  onMatchCaseChange,
  onMatchWordsChange,
}: SearchOptionsProps) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        aria-label="Match case"
        aria-pressed={matchCase}
        onClick={() => onMatchCaseChange(!matchCase)}
        className={`h-8 w-8 rounded-md border text-xs transition-colors flex items-center justify-center
                    ${matchCase ? "bg-gray-800 text-gray-100 border-gray-600" : "bg-black text-gray-300 border-gray-700 hover:bg-gray-900"}`}
        title="Match case"
      >
        <CaseSensitive size={20} />
      </button>

      <button
        type="button"
        aria-label="Match whole words"
        aria-pressed={matchWords}
        onClick={() => onMatchWordsChange(!matchWords)}
        className={`h-8 w-8 rounded-md border text-xs transition-colors flex items-center justify-center
                    ${matchWords ? "bg-gray-800 text-gray-100 border-gray-600" : "bg-black text-gray-300 border-gray-700 hover:bg-gray-900"}`}
        title="Match whole words"
      >
        <WholeWord size={20} />
      </button>
    </div>
  );
}

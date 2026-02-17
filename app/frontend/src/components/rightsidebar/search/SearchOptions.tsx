import { CaseSensitive, WholeWord } from "lucide-react";

export interface SearchOptionsProps {
  matchCase: boolean;
  matchWords: boolean;
  onMatchCaseChange: (value: boolean) => void;
  onMatchWordsChange: (value: boolean) => void;
}

function optionClasses(active: boolean) {
  return [
    "h-8 w-8 rounded-md border transition-all duration-200",
    "flex items-center justify-center",
    "focus:outline-none focus:ring-2 focus:ring-blue-500/40",
    active
      ? [
          "bg-black/10 text-gray-900 border-black/20",
          "dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600",
        ].join(" ")
      : [
          "bg-white/80 text-gray-600 border-black/10 hover:bg-black/5",
          "dark:bg-black/60 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800",
        ].join(" "),
  ].join(" ");
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
        title="Match case"
        className={optionClasses(matchCase)}
      >
        <CaseSensitive size={18} />
      </button>

      <button
        type="button"
        aria-label="Match whole words"
        aria-pressed={matchWords}
        onClick={() => onMatchWordsChange(!matchWords)}
        title="Match whole words"
        className={optionClasses(matchWords)}
      >
        <WholeWord size={18} />
      </button>
    </div>
  );
}

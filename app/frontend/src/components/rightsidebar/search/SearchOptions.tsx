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
        title="Match case"
        className={`
          h-8 w-8 rounded-md border text-xs transition-colors
          flex items-center justify-center

          ${
            matchCase
              ? `
                bg-black/10 text-gray-900 border-black/20
                dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600
              `
              : `
                bg-white text-gray-600 border-black/10 hover:bg-black/5
                dark:bg-black dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-900
              `
          }
        `}
      >
        <CaseSensitive size={20} />
      </button>

      <button
        type="button"
        aria-label="Match whole words"
        aria-pressed={matchWords}
        onClick={() => onMatchWordsChange(!matchWords)}
        title="Match whole words"
        className={`
          h-8 w-8 rounded-md border text-xs transition-colors
          flex items-center justify-center

          ${
            matchWords
              ? `
                bg-black/10 text-gray-900 border-black/20
                dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600
              `
              : `
                bg-white text-gray-600 border-black/10 hover:bg-black/5
                dark:bg-black dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-900
              `
          }
        `}
      >
        <WholeWord size={20} />
      </button>
    </div>
  );
}

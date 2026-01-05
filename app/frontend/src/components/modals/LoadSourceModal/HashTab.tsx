import React from "react";
import { Link } from "lucide-react";

interface HashTabProps {
  hash: string;
  setHash: (v: string) => void;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (hash: string) => void | Promise<void>;
}

const HashTab: React.FC<HashTabProps> = ({
  hash,
  setHash,
  loading,
  error,
  onClose,
  onSubmit,
}) => {
  const trimmed = hash.trim();
  const disabled = loading || !trimmed;
  const errorId = "hash-tab-error";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled) return;
        void onSubmit(trimmed);
      }}
      className="flex-1 flex flex-col justify-between gap-4"
    >
      <div className="space-y-2">
        <p className="text-xs text-gray-700 dark:text-gray-300">
          Paste a graph hash (the same value as <span className="font-mono">?g=...</span>).
        </p>

        <div className="space-y-1.5">
          <label className="text-[11px] text-gray-700 dark:text-gray-300">
            Graph hash
          </label>

          <input
            type="text"
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            placeholder="e.g. 9c2d... (hash)"
            autoFocus
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="none"
            inputMode="text"
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className="
              w-full rounded-lg px-2.5 py-1.5 text-[11px] outline-none
              bg-white border border-black/10 text-gray-900
              focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40
              dark:bg-black/60 dark:border-white/10 dark:text-gray-200
              dark:focus:border-blue-500 dark:focus:ring-blue-500/60
            "
          />
        </div>

        {error && (
          <div
            id={errorId}
            className="
              text-[11px]
              rounded-lg border px-2.5 py-2
              border-red-600/25 bg-red-600/10 text-red-700
              dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200
            "
          >
            {error}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="
            inline-flex items-center gap-1.5
            rounded-lg px-3 py-1.5
            text-xs font-medium transition
            border border-black/10 bg-black/4 text-gray-700 hover:bg-black/8
            dark:border-transparent dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10
          "
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={disabled}
          className={`
            inline-flex items-center gap-1.5
            rounded-lg px-3 py-1.5
            text-xs font-medium transition
            ${
              disabled
                ? "bg-blue-600/25 text-gray-400 cursor-not-allowed dark:bg-blue-600/40 dark:text-gray-200/60"
                : "bg-blue-600/90 text-white hover:bg-blue-500"
            }
          `}
        >
          <Link size={14} />
          {loading ? "Loading..." : "Load graph"}
        </button>
      </div>
    </form>
  );
};

export default HashTab;

import React from "react";

export const StatRow: React.FC<{
  label: string;
  value: React.ReactNode;
  tooltip: string;
  hint?: React.ReactNode;
}> = ({ label, value, tooltip, hint }) => (
  <div className="relative group">
    <div
      className="
        flex items-start justify-between gap-3 py-1.5
        rounded-lg px-2 -mx-2
        hover:bg-black/5 dark:hover:bg-white/5
        transition
        focus:outline-none focus-visible:ring-2 focus-visible:ring-black/15
        dark:focus-visible:ring-white/20
      "
      tabIndex={0}
      role="note"
      aria-label={`${label}. ${tooltip}`}
    >
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {label}
        </p>
        {hint && (
          <p className="text-[11px] text-gray-500/90 dark:text-gray-400/90">
            {hint}
          </p>
        )}
      </div>

      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">
        {value}
      </div>
    </div>

    <div
      className="
        pointer-events-none absolute left-0 right-0 top-full mt-2
        opacity-0 translate-y-1
        group-hover:opacity-100 group-hover:translate-y-0
        group-focus-within:opacity-100 group-focus-within:translate-y-0
        transition
        z-2147483647
      "
    >
      <div
        className="
          rounded-xl border border-black/10 bg-white/95
          px-3 py-2 text-[11px] text-gray-700 shadow-xl shadow-black/10
          dark:border-white/10 dark:bg-[#0b0b10]/95 dark:text-gray-200 dark:shadow-black/70
          whitespace-normal wrap-break-word
        "
      >
        {tooltip}
      </div>
    </div>
  </div>
);

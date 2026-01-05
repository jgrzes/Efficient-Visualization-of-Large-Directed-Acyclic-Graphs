import React from "react";

export const HierarchyLevelsSection: React.FC<{
  levels: Array<[string, number]>;
  hasLevels: boolean;
}> = ({ levels, hasLevels }) => {
  return (
    <section className="rounded-xl border border-black/10 bg-black/2 dark:border-white/10 dark:bg-white/2 overflow-hidden">
      <div className="px-3 py-2 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wide text-gray-600 dark:text-gray-300">
          Hierarchy levels
        </p>
        <span
          className="text-[11px] text-gray-500 dark:text-gray-400"
          title="Highest level index present in the histogram."
        >
          max level:{" "}
          <span className="text-gray-900 font-medium dark:text-gray-200">
            {levels.length ? levels[levels.length - 1]?.[0] : "-"}
          </span>
        </span>
      </div>

      <div className="px-3 py-2">
        {!hasLevels ? (
          <p className="text-xs text-gray-600 dark:text-gray-400">
            No hierarchy level data available.
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto text-xs rounded-lg border border-black/10 dark:border-white/10">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-black/4 text-[11px] uppercase tracking-wide text-gray-700 dark:bg-white/4 dark:text-gray-300">
                  <th className="px-3 py-2 text-left border-b border-black/10 dark:border-white/10">
                    Level
                  </th>
                  <th className="px-3 py-2 text-right border-b border-black/10 dark:border-white/10">
                    Count
                  </th>
                </tr>
              </thead>
              <tbody>
                {levels.map(([level, count], i) => (
                  <tr
                    key={level}
                    className={`
                      ${i % 2 === 0 ? "bg-transparent" : "bg-black/2 dark:bg-white/2"}
                      hover:bg-black/6 dark:hover:bg-white/6 transition
                    `}
                    title="Histogram row: how many items fall into this level."
                  >
                    <td className="px-3 py-1.5 border-b border-black/5 text-gray-800 dark:border-white/5 dark:text-gray-200">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-600/80 dark:bg-blue-400/80" />
                        <span className="font-mono">L{level}</span>
                      </span>
                    </td>
                    <td className="px-3 py-1.5 border-b border-black/5 text-right text-gray-900 font-medium dark:border-white/5 dark:text-gray-100">
                      {count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

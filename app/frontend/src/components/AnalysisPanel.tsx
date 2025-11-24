import React from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";

interface AnalysisPanelProps {
  result: {
    hierarchy_levels: Record<string, number>;
  };
  onClose: () => void;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ result, onClose }) => {
  const hierarchy = result?.hierarchy_levels || {};

  const levels = Object.entries(hierarchy).sort(
    ([aLevel], [bLevel]) => Number(aLevel) - Number(bLevel)
  );

  const totalNodes = levels.reduce((sum, [, count]) => sum + count, 0);

  return (
    <aside
      id="analysis-panel"
      className="
        fixed bottom-4 right-4 z-[900]
        w-[min(360px,92vw)]
        bg-[#050507]/95
        border border-white/10
        rounded-2xl
        shadow-2xl shadow-black/70
        text-gray-100
        overflow-hidden
        backdrop-blur-[10px]
      "
      aria-label="Graph analysis"
    >
      {/* HEADER */}
      <header className="flex items-start justify-between px-4 pt-3 pb-2 border-b border-white/10">
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-gray-400">
            Analysis
          </p>
          <h2 className="text-sm font-semibold text-white truncate">
            Hierarchy levels
          </h2>
          {totalNodes > 0 && (
            <p className="text-[11px] text-gray-400">
              Total nodes:{" "}
              <span className="text-gray-200 font-medium">{totalNodes}</span>
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="
            ml-2 inline-flex h-7 w-7 items-center justify-center
            rounded-full bg-white/5 text-gray-400
            hover:bg-white/10 hover:text-white
            focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30
            transition
          "
          aria-label="Close analysis panel"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </header>

      {/* BODY */}
      <div className="px-4 pb-4 pt-2">
        {levels.length === 0 ? (
          <p className="text-xs text-gray-400">
            No hierarchy data available for this graph.
          </p>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <div className="max-h-64 overflow-y-auto text-xs">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-white/[0.04] text-[11px] uppercase tracking-wide text-gray-300">
                    <th className="px-3 py-2 text-left border-b border-white/10">
                      Level
                    </th>
                    <th className="px-3 py-2 text-right border-b border-white/10">
                      Node count
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {levels.map(([level, count], i) => (
                    <tr
                      key={level}
                      className={`
                        ${i % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]"}
                        hover:bg-white/[0.06] transition
                      `}
                    >
                      <td className="px-3 py-1.5 border-b border-white/5 text-gray-200">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400/80" />
                          <span className="font-mono">L{level}</span>
                        </span>
                      </td>
                      <td className="px-3 py-1.5 border-b border-white/5 text-right text-gray-100 font-medium">
                        {count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* FOOTER SUMMARY */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-white/10 text-[11px] text-gray-400">
              <span>Max level:{" "}
                <span className="text-gray-200 font-medium">
                  {levels[levels.length - 1]?.[0] ?? "-"}
                </span>
              </span>
              <span className="text-gray-500">
                Hierarchy depth overview
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default AnalysisPanel;

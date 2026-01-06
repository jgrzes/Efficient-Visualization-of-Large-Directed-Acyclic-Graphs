import React from "react";
import type { DegreeStats } from "./types";
import { fmtNum } from "./utils";

export const DegreeCard: React.FC<{
  title: string;
  stats?: DegreeStats;
  tooltip: string;
}> = ({ title, stats, tooltip }) => (
  <div
    className="rounded-lg border border-black/10 bg-white/50 px-2 py-1.5 dark:border-white/10 dark:bg-white/5"
    title={tooltip}
  >
    <p className="text-[11px] text-gray-600 dark:text-gray-300">{title}</p>

    <div className="mt-1 space-y-0.5 text-xs text-gray-900 dark:text-gray-100">
      <div className="flex justify-between">
        <span className="text-gray-500 dark:text-gray-400">min</span>
        <span className="font-semibold">{fmtNum(stats?.min)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500 dark:text-gray-400">avg</span>
        <span className="font-semibold">{fmtNum(stats?.avg)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500 dark:text-gray-400">median</span>
        <span className="font-semibold">{fmtNum(stats?.median)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500 dark:text-gray-400">max</span>
        <span className="font-semibold">{fmtNum(stats?.max)}</span>
      </div>
    </div>
  </div>
);

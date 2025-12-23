import React from "react";
import { Search, Star } from "lucide-react";

interface EmptyStateProps {
  type: "search" | "favorites";
}

const EmptyState: React.FC<EmptyStateProps> = ({ type }) => {
  const Icon = type === "search" ? Search : Star;
  const title = type === "search" ? "No results" : "No favorites";
  const subtitle =
    type === "search" ? "Try a different query" : "Add items from the Search tab";

  return (
    <div className="text-center mt-10 text-gray-500 dark:text-gray-500">
      <div
        className="
          mx-auto w-10 h-10 rounded-2xl border border-dashed
          flex items-center justify-center mb-3

          border-black/15 bg-black/[0.02] text-gray-600
          dark:border-white/20 dark:bg-transparent dark:text-gray-500
        "
      >
        <Icon size={18} />
      </div>

      <p className="text-sm text-gray-700 dark:text-gray-500">{title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
    </div>
  );
};

export default EmptyState;

import React from "react";

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

export const FilterChip: React.FC<FilterChipProps> = ({ label, onRemove }) => {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="
        inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs
        transition cursor-pointer

        border-black/10 bg-white/70 hover:bg-black/[0.04]
        dark:border-gray-700 dark:bg-black/60 dark:hover:bg-gray-900
      "
    >
      <span className="text-gray-800 dark:text-gray-200">{label}</span>
      <span className="text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 text-sm leading-none">
        ×
      </span>
    </button>
  );
};

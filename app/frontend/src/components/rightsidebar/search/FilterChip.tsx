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
      className="inline-flex items-center gap-1 rounded-full border border-gray-700 px-2 py-1 text-xs
                 bg-black/60 hover:bg-gray-900 transition cursor-pointer"
    >
      <span className="text-gray-200">{label}</span>
      <span className="text-gray-500 hover:text-red-400 text-sm leading-none">×</span>
    </button>
  );
};

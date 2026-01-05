import React from "react";

export const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    className="
      inline-flex items-center rounded-full
      border border-black/10 bg-black/5
      px-2 py-0.5 text-[11px] text-gray-700
      dark:border-white/10 dark:bg-white/5 dark:text-gray-200
    "
  >
    {children}
  </span>
);

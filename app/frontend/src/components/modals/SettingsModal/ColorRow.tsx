import React from "react";
import type { Theme } from "./types";
import { cx } from "./utils";

interface ColorRowProps {
  theme: Theme;
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}

const ColorRow: React.FC<ColorRowProps> = ({
  theme,
  label,
  description,
  value,
  onChange,
}) => {
  const isDark = theme === "dark";

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col">
        <span className={cx("text-[11px]", isDark ? "text-gray-200" : "text-gray-800")}>
          {label}
        </span>
        <span className={cx("text-[10px]", "text-gray-500")}>{description}</span>
      </div>
      <div className="flex items-center gap-2">
        <div
          className={cx(
            "h-5 w-5 rounded-md border",
            isDark ? "border-white/20" : "border-black/15"
          )}
          style={{ backgroundColor: value }}
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cx(
            "h-8 w-10 cursor-pointer rounded-md border p-0",
            isDark ? "border-white/10 bg-black/40" : "border-black/10 bg-white"
          )}
          aria-label={`${label} color`}
        />
      </div>
    </div>
  );
};

export default ColorRow;

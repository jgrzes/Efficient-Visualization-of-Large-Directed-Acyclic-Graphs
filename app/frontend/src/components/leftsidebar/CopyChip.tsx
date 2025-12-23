import React from "react";

export interface CopyChipProps {
  text: string;
  className?: string;
  title?: string;
  onCopied?: () => void;
  mono?: boolean;
}

const CopyChip: React.FC<CopyChipProps> = ({
  text,
  className = "",
  title,
  onCopied,
  mono = true,
}) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      onCopied?.();
    } catch {
      // no-op
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center max-w-full px-2 py-0.5 rounded-md
                  border border-black/10 bg-black/[0.03] text-gray-700
                  hover:bg-black/[0.06] hover:text-gray-900
                  focus:ring-black/20
                  dark:border-gray-800 dark:bg-white/[0.04] dark:text-gray-300
                  dark:hover:bg-white/[0.08] dark:hover:text-gray-100
                  dark:focus:ring-gray-700
                  cursor-copy transition focus:outline-none focus:ring-2 ${className}`}
      title={(title ?? text) + "  •  Click to copy"}
      aria-label={`Chip: ${text}`}
    >
      <span className={`${mono ? "font-mono" : ""} text-xs break-all`}>
        {text}
      </span>
    </button>
  );
};

export default CopyChip;

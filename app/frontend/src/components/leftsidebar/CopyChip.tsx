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
                  border border-gray-800 bg-white/[0.04] text-gray-300
                  hover:bg-white/[0.08] hover:text-gray-100
                  cursor-copy transition focus:outline-none focus:ring-2 focus:ring-gray-700 ${className}`}
      title={(title ?? text) + "  •  Click to copy"}
      aria-label={`Chip: ${text}`}
    >
      <span
        className={`${mono ? "font-mono" : ""} text-xs break-all`}
      >
        {text}
      </span>
    </button>
  );
};

export default CopyChip;

import React from "react";

interface ToolTipProps {
  visible: boolean;
  x: number;
  y: number;
  content?: React.ReactNode;
}

const ToolTip: React.FC<ToolTipProps> = ({ visible, x, y, content }) => {
  if (!visible || !content) return null;

  return (
    <div
      className="
        absolute pointer-events-none
        z-10
        px-3 py-2
        text-sm font-medium
        rounded-xl
        backdrop-blur-md
        max-w-70 whitespace-normal

        shadow-[0_4px_20px_rgba(0,0,0,0.18)]
        dark:shadow-[0_4px_20px_rgba(0,0,0,0.45)]

        border border-black/10
        dark:border-white/20

        text-gray-900
        dark:text-gray-100

        bg-linear-to-br
        from-white/90 to-slate-100/75
        dark:from-black/70 dark:to-black/40
      "
      style={{
        left: x,
        top: y,
      }}
      role="tooltip"
    >
      {content}
    </div>
  );
};

export default ToolTip;

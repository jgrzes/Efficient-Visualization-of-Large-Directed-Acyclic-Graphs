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
        absolute pointer-events-none   <────── TU
        z-10
        px-3 py-2 
        text-sm text-gray-100 font-medium
        rounded-xl
        shadow-[0_4px_20px_rgba(0,0,0,0.45)]
        backdrop-blur-md
        border border-white/20
        bg-gradient-to-br from-black/70 to-black/40
        max-w-[280px] whitespace-normal
      "
      style={{
        left: x,
        top: y,
      }}
    >
      {content}
    </div>
  );
};

export default ToolTip;

import React from "react";

interface ToolTipProps {
  visible: boolean;
  x: number;
  y: number;
  content?: React.ReactNode;
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

const ToolTip: React.FC<ToolTipProps> = ({ visible, x, y, content, onPointerDown, onClick }) => {
  if (!visible || !content) return null;

  return (
    <div
      className="
        absolute
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
        cursor-pointer active:cursor-grabbing
      "
      style={{
        left: x,
        top: y,
      }}
      role="tooltip"

      // Pointer events: 
      // we want to allow interaction with the tooltip (e.g. dragging), 
      // but also allow wheel events to pass through for zooming. 
      // We use pointer events for dragging, and stop propagation of wheel events while allowing them to pass through.
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
        onPointerDown?.(e);
      }}

      // Forward wheel events to canvas for zooming while tooltip is open
      onWheel={(e) => {
        e.stopPropagation();
        const canvas = document.querySelector("canvas");
        if (!canvas) return;

        const ev = new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          deltaX: e.deltaX,
          deltaY: e.deltaY,
          deltaMode: e.deltaMode,
          clientX: e.clientX,
          clientY: e.clientY,
        });

        canvas.dispatchEvent(ev);
      }}

      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
    >
      {content}
    </div>
  );
};

export default ToolTip;

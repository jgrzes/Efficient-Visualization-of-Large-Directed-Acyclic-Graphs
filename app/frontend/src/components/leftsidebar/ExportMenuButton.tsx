import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, FileCode } from "lucide-react";

interface ExportMenuButtonProps {
  expanded: boolean;
  isCollapsed: boolean;
  isCompact: boolean;
  onExportJson: () => void;
  onExportHtml: () => void;
}

const MENU_WIDTH = 288;

const ExportMenuButton: React.FC<ExportMenuButtonProps> = ({
  expanded,
  isCollapsed,
  isCompact,
  onExportJson,
  onExportHtml,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const toggleOpen = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setPos({
        top: Math.min(rect.top, window.innerHeight - 190),
        left: rect.right + 8,
      });
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;

    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        aria-haspopup="menu"
        aria-expanded={open}
        className="group w-full flex items-center px-2.5 py-2 rounded-lg
          hover:bg-black/5 dark:hover:bg-white/5 transition"
        title="Export"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/5 dark:bg-white/5">
          <Download size={18} />
        </span>

        {expanded && !isCollapsed && (
          <span className="ml-3 text-sm truncate">
            {isCompact ? "Export" : "Export"}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
            className="fixed z-50 rounded-xl border border-black/10 dark:border-white/10
              bg-white/95 dark:bg-black/95 backdrop-blur-xl shadow-2xl p-1.5 text-gray-900 dark:text-gray-200"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onExportJson();
              }}
              className="w-full text-left rounded-lg px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Download size={14} />
                Export as JSON
              </div>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Raw graph data (nodes, edges, layout) - reload it later in the app or reuse it elsewhere.
              </p>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onExportHtml();
              }}
              className="w-full text-left rounded-lg px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileCode size={14} />
                Export as HTML
              </div>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Standalone interactive view - open it in any browser, no server or app needed.
              </p>
            </button>
          </div>,
          document.body
        )}
    </>
  );
};

export default ExportMenuButton;

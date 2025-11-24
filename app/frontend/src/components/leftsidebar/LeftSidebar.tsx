import React, { useState } from "react";
import {
  Upload,
  Focus,
  RotateCcw,
  Download,
  LineChart,
  Settings,
  ChevronLeft,
  ChevronRight,
  Save,
  Link,
} from "lucide-react";
import NodeInfo, { NodeInfoProps } from "./NodeInfo";

interface LeftSidebarProps {
  handleLoadClick: () => void;
  fitView: () => void;
  resetView: () => void;
  handleExportClick: () => void;
  handleAnalyzeClick: () => void;
  handleSaveLayoutClick: () => void;
  handleLoadFromHashClick: () => void;
  selectedNode?: NodeInfoProps | null;
}

interface Item {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  handleLoadClick,
  fitView,
  resetView,
  handleExportClick,
  handleAnalyzeClick,
  handleSaveLayoutClick,
  handleLoadFromHashClick,
  selectedNode,
}) => {
  const [expanded, setExpanded] = useState(false);

  const items: Item[] = [
    { label: "Load data", icon: <Upload size={18} />, onClick: handleLoadClick },
    { label: "Fit view", icon: <Focus size={18} />, onClick: fitView },
    { label: "Reset view", icon: <RotateCcw size={18} />, onClick: resetView },
    { label: "Export", icon: <Download size={18} />, onClick: handleExportClick },
    { label: "Analyze", icon: <LineChart size={18} />, onClick: handleAnalyzeClick },
    { label: "Save layout", icon: <Save size={18} />, onClick: handleSaveLayoutClick, },
    { label: "Load from hash", icon: <Link size={18} />, onClick: handleLoadFromHashClick, },
  ];

  const bottom: Item[] = [
    {label: "Settings", icon: <Settings size={18} />, onClick: () => console.log("Settings"),},
  ];

  const toggleExpanded = () => setExpanded((v) => !v);

  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-40",
        "flex h-screen flex-col",
        "bg-black/90 backdrop-blur-xl",
        "border-r border-white/10",
        "shadow-2xl shadow-black/50",
        "transition-[width] duration-200 ease-in-out",
        expanded ? "w-[420px]" : "w-16",
        "text-gray-200 overflow-hidden",
      ].join(" ")}
      aria-expanded={expanded}
      aria-label="Main sidebar"
    >
      {/* HEADER */}
      <div
        className={[
          "flex items-center border-b border-white/10",
          expanded ? "justify-between px-3 py-3" : "justify-center p-3",
        ].join(" ")}
      >
        {expanded && (
          <span className="font-semibold text-sm tracking-wide text-white/90">
            MENU
          </span>
        )}

        <button
          type="button"
          onClick={toggleExpanded}
          className="p-2 rounded-xl hover:bg-white/10 focus:outline-none focus-visible:outline-none transition"
          title={expanded ? "Collapse sidebar" : "Expand sidebar"}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {expanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      {/* MIDDLE: buttons + node details */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* BUTTONS */}
        <nav
          className="px-2 py-2 space-y-1 border-b border-white/10"
          aria-label="Sidebar actions"
        >
          {items.map((item) => {
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  item.onClick?.();
                }}
                className={[
                  "group w-full flex items-center px-2.5 py-2 rounded-lg",
                  "transition-colors duration-150 ease-in-out",
                  "focus:outline-none focus-visible:outline-none",
                  "hover:bg-white/5 text-gray-300 hover:text-white",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-gray-300 group-hover:bg-white/10",
                  ].join(" ")}
                >
                  {item.icon}
                </span>

                {expanded && (
                  <span className="ml-3 text-sm font-medium truncate">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* NODE INFO */}
        <div className="flex-1 px-3 py-3 overflow-y-auto overflow-x-auto [scrollbar-gutter:stable]">
          {expanded ? (
            <>
              <p className="mb-2 text-[11px] uppercase tracking-wide text-gray-400">
                Node details
              </p>

              {selectedNode ? (
                <div className="rounded-xl bg-black/70 backdrop-blur-md shadow-lg">
                  <NodeInfo {...selectedNode} />
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-gray-500">
                  Select a node in the graph to see its details here.
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* BOTTOM */}
      <div className="border-t border-white/10 p-2">
        {bottom.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className="w-full flex items-center px-3 py-2.5 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-colors focus:outline-none focus-visible:outline-none"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-gray-300">
              {item.icon}
            </span>
            {expanded && (
              <span className="ml-3 text-sm font-medium truncate">
                {item.label}
              </span>
            )}
          </button>
        ))}
      </div>
    </aside>
  );
};

export default LeftSidebar;

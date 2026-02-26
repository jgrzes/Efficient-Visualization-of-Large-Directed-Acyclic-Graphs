import React from "react";
import { XMarkIcon, ChevronDownIcon, ChevronUpIcon, TrashIcon } from "@heroicons/react/24/solid";
import { motion, useDragControls, type PanInfo } from "framer-motion";

import { useDockedPanelPosition } from "./analysispanel/hooks";
import type { Pos } from "./analysispanel/utils";

interface FocusedNodesListProps {
  nodeIndices: number[];
  nodeNames: string[] | null;
  onRemoveNode: (index: number) => void;
  onClear: () => void;
  onSelectNode: (index: number) => void;
  onHoverNode?: (index?: number) => void;
}

const FocusedNodesList: React.FC<FocusedNodesListProps> = ({
  nodeIndices,
  nodeNames,
  onRemoveNode,
  onClear,
  onSelectNode,
  onHoverNode,
}) => {
  const [collapsed, setCollapsed] = React.useState(false);

  const getNodeName = (index: number) => {
    return nodeNames?.[index] || `Node ${index}`;
  };

  const constraintsRef = React.useRef<HTMLDivElement | null>(null);
  const panelRef = React.useRef<HTMLElement | null>(null);

  const [pos, setPos] = React.useState<Pos>({ x: 0, y: 0 });
  const dragControls = useDragControls();

  const { clampNow, clampAndSnapNow, reclampAfterLayout } = useDockedPanelPosition({
    collapsed,
    constraintsRef,
    panelRef,
    headerSafe: 72,
  });

  React.useEffect(() => {
    const onResize = () => setPos((p) => clampNow(p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampNow]);

  React.useEffect(() => {
    reclampAfterLayout(setPos);
  }, [collapsed, reclampAfterLayout]);

  const onDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setPos((p) => clampAndSnapNow({ x: p.x + info.offset.x, y: p.y + info.offset.y }));
  };

  const wrapperClass = collapsed
    ? `
        fixed bottom-4 right-4 z-[900]
        w-[min(360px,92vw)]
        bg-white/90 border border-black/10 rounded-2xl
        shadow-xl shadow-black/10 text-gray-900 overflow-hidden
        backdrop-blur-[10px] flex flex-col
        dark:bg-[#050507]/95 dark:border-white/10 dark:shadow-black/70 dark:text-gray-100
      `
    : `
        fixed bottom-4 right-4 z-[900]
        w-[min(360px,92vw)] max-h-[calc(100vh-2rem)]
        bg-white/90 border border-black/10 rounded-2xl
        shadow-xl shadow-black/10 text-gray-900 overflow-hidden
        backdrop-blur-[10px] flex flex-col
        dark:bg-[#050507]/95 dark:border-white/10 dark:shadow-black/70 dark:text-gray-100
      `;

  return (
    <div className="fixed inset-0 pointer-events-none z-[900]" aria-hidden>
      <div ref={constraintsRef} className="fixed inset-0" />

      <motion.aside
        ref={(el) => {
          panelRef.current = el;
        }}
        className={`${wrapperClass} pointer-events-auto`}
        aria-label="Focused nodes"
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        dragElastic={0.05}
        dragConstraints={constraintsRef}
        onDragEnd={onDragEnd}
        animate={{ x: pos.x, y: pos.y }}
        transition={{ type: "spring", stiffness: 500, damping: 40 }}
        style={{ touchAction: "none" }}
      >
        <header
          className={`
            bg-purple-500/10 dark:bg-purple-900/20
            px-4 pt-3 pb-2
            border-b border-black/10 dark:border-white/10
            flex items-start justify-between
            cursor-grab active:cursor-grabbing select-none
            shrink-0
            ${collapsed ? "border-b-0 pb-3" : ""}
          `}
          onPointerDown={(e) => dragControls.start(e)}
          title="Drag the panel"
        >
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-purple-600/80 dark:text-purple-300/80">
              Focused nodes
            </p>
            <h2 className="text-sm font-semibold text-purple-800 dark:text-purple-200 truncate">
              {collapsed ? `Focused (${nodeIndices.length})` : `Focused Nodes (${nodeIndices.length})`}
            </h2>
          </div>

          <div className="flex items-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCollapsed((c) => !c);
              }}
              className="
                mr-2 inline-flex h-7 w-7 items-center justify-center
                rounded-full bg-black/5 text-gray-600
                hover:bg-black/10 hover:text-gray-900
                focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20
                transition
                dark:bg-white/5 dark:text-gray-400
                dark:hover:bg-white/10 dark:hover:text-white
                dark:focus-visible:ring-white/30
              "
              aria-label={collapsed ? "Expand focused nodes" : "Minimize focused nodes"}
              title={collapsed ? "Expand" : "Minimize"}
            >
              {collapsed ? (
                <ChevronUpIcon className="w-4 h-4" />
              ) : (
                <ChevronDownIcon className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="
                inline-flex h-7 w-7 items-center justify-center
                rounded-full bg-black/5 text-gray-600
                hover:bg-black/10 hover:text-gray-900
                focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20
                transition
                dark:bg-white/5 dark:text-gray-400
                dark:hover:bg-white/10 dark:hover:text-white
                dark:focus-visible:ring-white/30
              "
              aria-label="Clear all focused nodes"
              title="Clear all focused nodes"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </header>

        {collapsed ? null : (
          <div className="overflow-y-auto flex-1">
            {nodeIndices.map((index) => (
              <div
                key={index}
                className="px-4 py-2.5 border-b border-black/5 dark:border-white/5 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition group"
                onMouseEnter={() => onHoverNode?.(index)}
                onMouseLeave={() => onHoverNode?.()}
              >
                <button
                  onClick={() => onSelectNode(index)}
                  className="flex-1 text-left text-sm text-gray-700 dark:text-gray-300 truncate hover:text-purple-600 dark:hover:text-purple-400 transition"
                >
                  <span className="font-medium">{getNodeName(index)}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    #{index}
                  </span>
                </button>
                <button
                  onClick={() => onRemoveNode(index)}
                  className="ml-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 dark:hover:bg-red-900/20 rounded transition"
                  title="Remove from focused nodes"
                >
                  <XMarkIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                </button>
              </div>
            ))}

            {nodeIndices.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                No focused nodes
              </div>
            )}
          </div>
        )}
      </motion.aside>
    </div>
  );
};

export default FocusedNodesList;

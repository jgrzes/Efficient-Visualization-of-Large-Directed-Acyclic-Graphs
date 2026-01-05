import React from "react";
import { XMarkIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import { motion, useDragControls, type PanInfo } from "framer-motion";

import type { AnalysisPanelProps } from "./types";
import { defaultVertexLabel, fmtNum, fmtPct, type Pos } from "./utils";
import { useDockedPanelPosition } from "./hooks";

import { Chip } from "./Chip";
import { BasicMetricsSection } from "./BasicMetricsSection"
import { HierarchyLevelsSection } from "./HierarchyLevelsSection";

const WRAPPER_Z = "z-[1000]";

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  result,
  onClose,
  nodeNames,
  onSelectNode,
  onHoverResultCard,
}) => {
  const hierarchy = result?.hierarchy_levels || {};
  const basic = result?.basic;

  const levels = React.useMemo(
    () => Object.entries(hierarchy).sort(([a], [b]) => Number(a) - Number(b)),
    [hierarchy]
  );

  const totalNodesFromLevels = React.useMemo(
    () => levels.reduce((sum, [, c]) => sum + c, 0),
    [levels]
  );

  const nV = basic?.n_vertices ?? totalNodesFromLevels ?? 0;
  const nE = basic?.n_edges ?? 0;

  const rootsCount = basic?.roots?.count ?? basic?.n_roots;
  const rootsPct = basic?.roots?.pct;

  const sinksCount = basic?.sinks?.count ?? basic?.n_sinks;
  const sinksPct = basic?.sinks?.pct;

  const isolated = basic?.isolated_vertices ?? basic?.n_isolated;

  const multiParentCount =
    basic?.multi_parent?.count ?? basic?.multi_parent_vertices;
  const multiParentPct = basic?.multi_parent?.pct ?? basic?.multi_parent_pct;

  const hasBasic = !!basic;
  const hasLevels = levels.length > 0;

  const [collapsed, setCollapsed] = React.useState(false);

  const resolveName = React.useCallback(
    (vertexId: number) => {
      const name = nodeNames?.[vertexId];
      if (name && name.trim().length > 0) return name;
      return defaultVertexLabel(vertexId);
    },
    [nodeNames]
  );

  const constraintsRef = React.useRef<HTMLDivElement | null>(null);
  const panelRef = React.useRef<HTMLElement | null>(null);

  const [pos, setPos] = React.useState<Pos>({ x: 0, y: 0 });
  const dragControls = useDragControls();

  const { clampNow, clampAndSnapNow, reclampAfterLayout } = useDockedPanelPosition({
    collapsed,
    constraintsRef,
    panelRef,
  });

  // resize => reclamp
  React.useEffect(() => {
    const onResize = () => setPos((p) => clampNow(p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampNow]);

  // collapse/expand => reclamp after layout
  React.useEffect(() => {
    reclampAfterLayout(setPos);
  }, [collapsed, reclampAfterLayout]);

  const onDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setPos((p) => clampAndSnapNow({ x: p.x + info.offset.x, y: p.y + info.offset.y }));
  };

  const asideClass = collapsed
    ? `
        fixed bottom-4 right-4 ${WRAPPER_Z}
        w-[min(420px,92vw)]
        bg-white/90 border border-black/10 rounded-2xl
        shadow-2xl shadow-black/10 text-gray-900 overflow-hidden
        backdrop-blur-[10px] flex flex-col
        dark:bg-[#050507]/95 dark:border-white/10 dark:shadow-black/70 dark:text-gray-100
      `
    : `
        fixed bottom-4 right-4 ${WRAPPER_Z}
        w-[min(460px,92vw)] max-h-[calc(100vh-2rem)]
        bg-white/90 border border-black/10 rounded-2xl
        shadow-2xl shadow-black/10 text-gray-900 overflow-hidden
        backdrop-blur-[10px] flex flex-col
        dark:bg-[#050507]/95 dark:border-white/10 dark:shadow-black/70 dark:text-gray-100
      `;

  return (
    <div className={`fixed inset-0 pointer-events-none ${WRAPPER_Z}`} aria-hidden>
      <div ref={constraintsRef} className="fixed inset-0" />

      <motion.aside
        ref={(el) => {
          panelRef.current = el;
        }}
        className={`${asideClass} pointer-events-auto`}
        aria-label="Graph analysis"
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
        {/* HEADER = handle */}
        <header
          className={`
            flex items-start justify-between
            px-4 pt-3 pb-2
            border-b border-black/10 dark:border-white/10
            cursor-grab active:cursor-grabbing select-none
            shrink-0
            ${collapsed ? "border-b-0 pb-3" : ""}
          `}
          onPointerDown={(e) => dragControls.start(e)}
          title="Drag the panel"
        >
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Analysis
            </p>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {collapsed ? "DAG metrics" : "DAG metrics & hierarchy"}
            </h2>

            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <Chip>V: {fmtNum(nV)}</Chip>
              <Chip>E: {fmtNum(nE)}</Chip>
              {rootsCount !== undefined && (
                <Chip>
                  Roots: {rootsCount}
                  {rootsPct !== undefined ? ` (${fmtPct(rootsPct)})` : ""}
                </Chip>
              )}
              {sinksCount !== undefined && (
                <Chip>
                  Sinks: {sinksCount}
                  {sinksPct !== undefined ? ` (${fmtPct(sinksPct)})` : ""}
                </Chip>
              )}
            </div>
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
              aria-label={collapsed ? "Expand panel" : "Minimize panel"}
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
                onClose();
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
              aria-label="Close analysis panel"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </header>

        {collapsed ? null : (
          <div className="px-4 pb-4 pt-3 overflow-y-auto flex-1 space-y-3">
            {!hasBasic && !hasLevels ? (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                No analysis data available.
              </p>
            ) : (
              <>
                {hasBasic && basic && (
                  <BasicMetricsSection
                    basic={basic}
                    isolated={isolated}
                    multiParentCount={multiParentCount}
                    multiParentPct={multiParentPct}
                    resolveName={resolveName}
                    onSelectNode={onSelectNode}
                    onHoverResultCard={onHoverResultCard}
                  />
                )}

                <HierarchyLevelsSection levels={levels} hasLevels={hasLevels} />
              </>
            )}
          </div>
        )}
      </motion.aside>
    </div>
  );
};

export default AnalysisPanel;

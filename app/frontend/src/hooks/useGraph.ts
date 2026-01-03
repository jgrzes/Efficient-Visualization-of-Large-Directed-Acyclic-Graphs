import {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
  useContext,
  useCallback,
} from "react";
import { Graph, GraphConfigInterface } from "@cosmograph/cosmos";
import { NodeInfoProps } from "../components/leftsidebar/NodeInfo";
import { AppContext } from "../context/AppContext";
import { DEFAULT_GRAPH_COLORS } from "../graph/config";

import { fetchNodeData } from "../graph/api/node";
import { sleep } from "../graph/utils/time";
import { computeParentsChildren } from "../graph/utils/relationships";
import {
  computePinnedTooltips,
  computeHoverTooltip,
  type NodeTooltip,
} from "../graph/tooltips/positions";
import { applyGraphColors } from "../graph/render/applyColors";
import type { GraphColors } from "../graph/types";

type UseGraphInitialConfig = {
  pointSize?: number;
  colors?: GraphColors;
};

export function useGraph(
  graphRef: React.RefObject<HTMLDivElement | null>,
  pointPositions: Float32Array,
  links: Float32Array,
  setSelectedNode: Dispatch<SetStateAction<NodeInfoProps | null>>,
  initialConfig?: UseGraphInitialConfig,
  names?: string[]
) {
  const graphInstance = useRef<Graph | null>(null);
  const linksRef = useRef<Float32Array>(links);

  // Currently selected index
  const selectedIndexRef = useRef<number | null>(null);

  // Currently highlighted indices (for selection tooltips)
  // (selected + parents + children)
  const highlightedIndicesRef = useRef<number[]>([]);

  // Cache index -> name
  const namesCacheRef = useRef<Map<number, string>>(new Map());

  // Tooltips state (selection + relationships)
  const [tooltips, setTooltips] = useState<NodeTooltip[]>([]);

  // Hover tooltip for point under mouse
  const [hoverTooltip, setHoverTooltip] = useState<NodeTooltip | null>(null);
  const hoverIndexRef = useRef<number | null>(null);

  // Highlight token cancellation
  const highlightTokenRef = useRef(0);

  // Searched vertices
  const searchIndicesRef = useRef<Set<number>>(new Set());

  // Are we currently dragging a vertex
  const isDraggingRef = useRef(false);

  // Node hoverowany z result card
  const hoveredCardIndexRef = useRef<number | null>(null);

  const appContext = useContext(AppContext);
  const currentGraphUUID = appContext?.currentGraphUUID;
  const currentGraphUUIDRef = useRef<string | null>(currentGraphUUID ?? null);

  // IMPORTANT: colorsRef MUST always be defined → no fallbacks later
  const colorsRef = useRef<GraphColors>(
    initialConfig?.colors ?? DEFAULT_GRAPH_COLORS
  );

  const getName = useCallback(
    (idx: number) => namesCacheRef.current.get(idx) ?? `Node ${idx}`,
    []
  );

  // Helper: does this node already have a pinned tooltip?
  const hasPinnedTooltip = useCallback((index: number) => {
    return highlightedIndicesRef.current.includes(index);
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Effects: sync refs
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    colorsRef.current = initialConfig?.colors ?? DEFAULT_GRAPH_COLORS;
  }, [initialConfig?.colors]);

  useEffect(() => {
    currentGraphUUIDRef.current = currentGraphUUID ?? null;
    console.log("useGraph sees new graph uuid:", currentGraphUUIDRef.current);
  }, [currentGraphUUID]);

  useEffect(() => {
    linksRef.current = links;
  }, [links]);

  // ───────────────────────────────────────────────────────────────────────────
  // Tooltip recomputation for selection tooltips
  // ───────────────────────────────────────────────────────────────────────────
  const recomputeTooltipsPositions = useCallback(() => {
    const g = graphInstance.current;
    const el = graphRef.current;

    if (!g || !el) {
      setTooltips([]);
      return;
    }

    setTooltips(
      computePinnedTooltips(g, el, highlightedIndicesRef.current, getName)
    );
  }, [graphRef, getName]);

  useEffect(() => {
    const cache = namesCacheRef.current;
    cache.clear();

    if (names?.length) {
      names.forEach((name, idx) => {
        cache.set(idx, name);
      });
    }

    recomputeTooltipsPositions();
  }, [names, recomputeTooltipsPositions]);

  // ───────────────────────────────────────────────────────────────────────────
  // Graph view controls
  // ───────────────────────────────────────────────────────────────────────────
  const fitView = useCallback(() => {
    const g = graphInstance.current;
    g?.fitView();
    g?.render();
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Hover tooltip position
  // ───────────────────────────────────────────────────────────────────────────
  const updateHoverTooltipPosition = useCallback(
    (index: number, pointPos?: [number, number]) => {
      const g = graphInstance.current;
      const el = graphRef.current;
      if (!g || !el) return;

      const tt = computeHoverTooltip(g, el, index, getName, pointPos);
      if (!tt) return;

      setHoverTooltip(tt);
    },
    [graphRef, getName]
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Coloring logic
  // ───────────────────────────────────────────────────────────────────────────
  const applyColors = useCallback(
    async (
      selectedIndices: number[],
      parents: number[],
      children: number[],
      opts?: { zoomToSelected?: boolean }
    ) => {
      const g = graphInstance.current;
      if (!g) return;

      // apply colors & compute pinned/highlighted indices
      highlightedIndicesRef.current = applyGraphColors({
        g,
        links: linksRef.current,
        colors: colorsRef.current,
        selectedIndices,
        parents,
        children,
        searchSet: searchIndicesRef.current,
        hoveredCardIndex: hoveredCardIndexRef.current,
      });

      // If hoverTooltip is currently on a node that became pinned, hide it
      const hoverIdx = hoverIndexRef.current;
      if (hoverIdx != null && highlightedIndicesRef.current.includes(hoverIdx)) {
        hoverIndexRef.current = null;
        setHoverTooltip(null);
      }

      const zoomToSelected = opts?.zoomToSelected ?? false;

      if (zoomToSelected && selectedIndices.length > 0) {
        const zoomDuration = 700;
        const zoomScale = 30;

        setTooltips([]);

        const token = ++highlightTokenRef.current;

        g.zoomToPointByIndex(selectedIndices[0], zoomDuration, zoomScale);
        g.render();

        await sleep(zoomDuration);
        if (token !== highlightTokenRef.current) return;

        recomputeTooltipsPositions();
      } else {
        g.render();
        recomputeTooltipsPositions();
      }
    },
    [recomputeTooltipsPositions]
  );

  useEffect(() => {
    const g = graphInstance.current;
    if (!g) return;

    const selectedIndex = selectedIndexRef.current;
    const selectedIndices = selectedIndex !== null ? [selectedIndex] : [];

    const { parents, children } = computeParentsChildren(
      selectedIndices,
      linksRef.current
    );

    void applyColors(selectedIndices, parents, children, { zoomToSelected: false });
  }, [
    initialConfig?.colors?.default,
    initialConfig?.colors?.parent,
    initialConfig?.colors?.child,
    initialConfig?.colors?.selected,
    initialConfig?.colors?.hover,
    initialConfig?.colors?.search,
    initialConfig?.colors?.background,
    applyColors,
  ]);

  // ───────────────────────────────────────────────────────────────────────────
  // Node selection
  // ───────────────────────────────────────────────────────────────────────────
  const clearSelection = useCallback(() => {
    setSelectedNode(null);
    selectedIndexRef.current = null;
    highlightedIndicesRef.current = [];
    setTooltips([]);

    const { parents, children } = computeParentsChildren([], linksRef.current);
    void applyColors([], parents, children, { zoomToSelected: false });
  }, [applyColors, setSelectedNode]);

  const selectNodeByIndex = useCallback(
    async (index?: number, options?: { zoom?: boolean }) => {
      const zoom = options?.zoom ?? true;

      if (index === undefined || index === null) {
        clearSelection();
        return;
      }

      const uuid = currentGraphUUIDRef.current;
      if (!uuid) {
        console.error("No current graph uuid set");
        return;
      }

      try {
        const data = await fetchNodeData(uuid, index);

        setSelectedNode({
          index,
          ...data,
          name: data.name ?? `Node ${index}`,
        });

        selectedIndexRef.current = index;

        if (data.name) {
          namesCacheRef.current.set(index, data.name);
        }

        const { parents, children } = computeParentsChildren(
          [index],
          linksRef.current
        );
        await applyColors([index], parents, children, { zoomToSelected: zoom });
      } catch (err) {
        console.error("Node fetch error:", err);
      }
    },
    [applyColors, clearSelection, setSelectedNode]
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Hover highlight from result card
  // ───────────────────────────────────────────────────────────────────────────
  const highlightResultHover = useCallback(
    async (index?: number) => {
      hoveredCardIndexRef.current = index ?? null;

      const selectedIndex = selectedIndexRef.current;
      const selectedIndices = selectedIndex !== null ? [selectedIndex] : [];

      const { parents, children } = computeParentsChildren(
        selectedIndices,
        linksRef.current
      );

      await applyColors(selectedIndices, parents, children, {
        zoomToSelected: false,
      });
    },
    [applyColors]
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Graph init & cleanup (ONCE)
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!graphRef.current) return;

    const config: GraphConfigInterface = {
      spaceSize: 8192,
      backgroundColor: colorsRef.current.background,
      pointSize: initialConfig?.pointSize ?? 1,
      pointGreyoutOpacity: 0.1,
      linkWidth: 0.8,
      linkColor: "#a1a1a1",
      linkArrows: true,
      curvedLinks: false,
      renderHoveredPointRing: false,
      enableDrag: true,
      simulationLinkSpring: 0,
      simulationRepulsion: 0,
      simulationGravity: 0,
      simulationDecay: 0,

      // CLICK ON NODE: select but DO NOT zoom
      onClick: (index) => {
        if (index === null || index === undefined) selectNodeByIndex(undefined);
        else selectNodeByIndex(index, { zoom: false });
      },

      // Hover tooltip – allowed during drag
      onPointMouseOver: (index, pointPos) => {
        const g = graphInstance.current;
        const el = graphRef.current;
        if (!g || !el) return;

        if (index == null || !pointPos) {
          hoverIndexRef.current = null;
          setHoverTooltip(null);
          return;
        }

        // If this node already has a pinned tooltip, don't show hover tooltip
        if (hasPinnedTooltip(index)) {
          hoverIndexRef.current = null;
          setHoverTooltip(null);
          return;
        }

        if (hoverIndexRef.current === index) return;
        hoverIndexRef.current = index;

        updateHoverTooltipPosition(index, pointPos as [number, number]);
      },

      onPointMouseOut: () => {
        hoverIndexRef.current = null;
        setHoverTooltip(null);
      },

      // Tooltips recompute on zoom
      onZoom: () => recomputeTooltipsPositions(),
      onZoomEnd: () => recomputeTooltipsPositions(),

      // Drag: keep ALL tooltips attached to their nodes
      onDrag: () => {
        isDraggingRef.current = true;

        recomputeTooltipsPositions();

        const hoverIdx = hoverIndexRef.current;
        if (hoverIdx == null) return;

        if (hasPinnedTooltip(hoverIdx)) {
          hoverIndexRef.current = null;
          setHoverTooltip(null);
          return;
        }

        updateHoverTooltipPosition(hoverIdx);
      },

      onDragEnd: () => {
        isDraggingRef.current = false;
        recomputeTooltipsPositions();
      },
    };

    graphInstance.current?.destroy?.();
    graphInstance.current = new Graph(graphRef.current, config);

    return () => {
      highlightTokenRef.current++;
      graphInstance.current?.destroy?.();
      graphInstance.current = null;
    };
  }, []); // init only once

  // ───────────────────────────────────────────────────────────────────────────
  // Live config updates: pointSize + backgroundColor
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const g = graphInstance.current;
    if (!g) return;

    g.setConfig({
      pointSize: initialConfig?.pointSize ?? 1,
      backgroundColor: colorsRef.current.background,
    });

    g.render();
  }, [initialConfig?.pointSize, initialConfig?.colors?.background]);

  // ───────────────────────────────────────────────────────────────────────────
  // Update graph data when positions / links change
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const g = graphInstance.current;
    if (!g || !pointPositions || !links) return;

    g.setPointPositions(pointPositions);
    g.setLinks(links);
    g.render();

    const selectedIndex = selectedIndexRef.current;
    const selectedIndices = selectedIndex !== null ? [selectedIndex] : [];

    const { parents, children } = computeParentsChildren(
      selectedIndices,
      linksRef.current
    );

    void applyColors(selectedIndices, parents, children, { zoomToSelected: false });
  }, [pointPositions, links, applyColors]);

  // ───────────────────────────────────────────────────────────────────────────
  // Highlight search results
  // ───────────────────────────────────────────────────────────────────────────
  const highlightSearchResults = useCallback(
    async (indices: number[]) => {
      searchIndicesRef.current = new Set(indices);

      const selectedIndex = selectedIndexRef.current;
      const selectedIndices = selectedIndex !== null ? [selectedIndex] : [];

      const { parents, children } = computeParentsChildren(
        selectedIndices,
        linksRef.current
      );

      await applyColors(selectedIndices, parents, children, { zoomToSelected: false });
    },
    [applyColors]
  );

  return {
    fitView,
    selectNodeByIndex,
    tooltips,
    hoverTooltip,
    highlightSearchResults,
    highlightResultHover,
  };
}

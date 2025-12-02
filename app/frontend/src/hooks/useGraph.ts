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
import { AppContext } from "../App";

const API_BASE = "http://localhost:30301";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type NodeTooltip = {
  index: number;
  x: number;
  y: number;
  content: string;
};

type RGBA = [number, number, number, number];

const hexToRgba01 = (hex: string, alpha = 0.9): RGBA => {
  let h = hex.trim();
  if (h.startsWith("#")) h = h.slice(1);

  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return [r / 255, g / 255, b / 255, alpha];
  }

  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return [r / 255, g / 255, b / 255, alpha];
  }

  // fallback – gdyby hex był zły
  return [1, 1, 1, alpha];
};

// ─────────────────────────────────────────────────────────────────────────────
// Colors & defaults
// ─────────────────────────────────────────────────────────────────────────────
const COLOR_DEFAULT_LINK: RGBA = [0.6, 0.6, 0.6, 0.8];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────



const fetchNodeData = async (uuid: string, index: number) => {
  const response = await fetch(`${API_BASE}/node/${uuid}/${index}`);

  if (!response.ok) {
    throw new Error(`Node fetch failed: ${response.status}`);
  }

  const responseJson = await response.json();
  console.log("Node info json:\n", JSON.stringify(responseJson, null, 2));

  return responseJson;
};

/**
 * Compute parents & children for selected nodes.
 */
const computeParentsChildren = (
  selectedIndices: number[],
  flatLinks: Float32Array
) => {
  const parents: number[] = [];
  const children: number[] = [];
  const selectedSet = new Set<number>(selectedIndices);

  for (let i = 0; i < flatLinks.length; i += 2) {
    const source = flatLinks[i];
    const target = flatLinks[i + 1];

    if (selectedSet.has(target)) {
      parents.push(source);
    } else if (selectedSet.has(source)) {
      children.push(target);
    }
  }

  return { parents, children };
};

type GraphColors = {
  default: string;
  parent: string;
  child: string;
  selected: string;
  hover: string;
  search: string;
};

type UseGraphInitialConfig = {
  spaceSize?: number;
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
  const colorsRef = useRef<GraphColors | undefined>(initialConfig?.colors);

  // ───────────────────────────────────────────────────────────────────────────
  // Effects: UUID / links / names
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
      colorsRef.current = initialConfig?.colors;
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
    const indices = highlightedIndicesRef.current;

    if (!g || !el || indices.length === 0) {
      setTooltips([]);
      return;
    }

    const positions = g.getPointPositions();
    if (!positions || positions.length === 0) {
      setTooltips([]);
      return;
    }

    const rect = el.getBoundingClientRect();
    const next: NodeTooltip[] = [];

    indices.forEach((idx) => {
      if (idx < 0 || idx * 2 + 1 >= positions.length) return;

      const xSpace = positions[2 * idx];
      const ySpace = positions[2 * idx + 1];

      const [sx, sy] = g.spaceToScreenPosition([xSpace, ySpace]);

      next.push({
        index: idx,
        x: rect.left + sx - 30,
        y: rect.top + sy - 30,
        content: namesCacheRef.current.get(idx) ?? `Node ${idx}`,
      });
    });

    setTooltips(next);
  }, [graphRef]);

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
    graphInstance.current?.fitView();
  }, []);

  const resetView = useCallback(() => {
    graphInstance.current?.restart();
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Hover tooltip position: also used to follow node while dragging
  // ───────────────────────────────────────────────────────────────────────────

  const updateHoverTooltipPosition = useCallback(
    (index: number, pointPos?: [number, number]) => {
      const g = graphInstance.current;
      const el = graphRef.current;
      if (!g || !el) return;

      let spacePos: [number, number];

      if (pointPos) {
        spacePos = pointPos;
      } else {
        const positions = g.getPointPositions();
        if (!positions || index * 2 + 1 >= positions.length) return;

        spacePos = [positions[2 * index], positions[2 * index + 1]];
      }

      const [sx, sy] = g.spaceToScreenPosition(spacePos);
      const rect = el.getBoundingClientRect();

      setHoverTooltip({
        index,
        content: namesCacheRef.current.get(index) ?? `Node ${index}`,
        x: rect.left + sx + 8,
        y: rect.top + sy + 8,
      });
    },
    [graphRef]
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Coloring logic
  // ───────────────────────────────────────────────────────────────────────────

  const applyColors = useCallback(
    (
      selectedIndices: number[],
      parents: number[],
      children: number[],
      opts?: { zoomToSelected?: boolean }
    ) => {
      const g = graphInstance.current;
      if (!g) return;

      const positions = g.getPointPositions();
      if (!positions || positions.length === 0) return;

      const pointCount = positions.length / 2;
      const flatLinks = linksRef.current;
      const linkCount = flatLinks.length / 2;

      const cfgColors = colorsRef.current ?? {
        default: "#808080",
        parent: "#e34a4a",
        child: "#4ae34a",
        selected: "#2633e7",
        hover: "#ff66cc",
        search: "#00e6e6",
      };

      const DEFAULT_POINT: RGBA = hexToRgba01(cfgColors.default, 0.8);
      const SELECTED_POINT: RGBA = hexToRgba01(cfgColors.selected, 0.9);
      const PARENT_POINT: RGBA = hexToRgba01(cfgColors.parent, 0.9);
      const CHILD_POINT: RGBA = hexToRgba01(cfgColors.child, 0.9);
      const HOVER_POINT: RGBA = hexToRgba01(cfgColors.hover, 0.95);
      const SEARCH_POINT: RGBA = hexToRgba01(cfgColors.search, 0.9);

      // const SEARCH_POINT: RGBA = COLOR_SEARCH_POINT

      const pointColors = new Float32Array(pointCount * 4);
      const linkColors = new Float32Array(linkCount * 4);
      const linkWidths = new Float32Array(linkCount);

      const selectedSet = new Set<number>(selectedIndices);
      const parentsSet = new Set<number>(parents);
      const childrenSet = new Set<number>(children);
      const searchSet = searchIndicesRef.current;

      const hoveredCardIndex = hoveredCardIndexRef.current;
      const hoveredCardSet = hoveredCardIndex != null
        ? new Set<number>([hoveredCardIndex])
        : new Set<number>();

      // Links
      for (let i = 0; i < flatLinks.length; i += 2) {
        const edgeIndex = i / 2;
        const source = flatLinks[i];
        const target = flatLinks[i + 1];

        let color = COLOR_DEFAULT_LINK;
        let width = 2;

        if (selectedSet.size > 0) {
          if (selectedSet.has(target)) {
            color = PARENT_POINT;
            width = 3;
          } else if (selectedSet.has(source)) {
            color = CHILD_POINT;
            width = 3;
          }
        }

        linkColors.set(color, edgeIndex * 4);
        linkWidths[edgeIndex] = width;
      }

      // Points (priority):
      // selected > hoveredCard > parent > child > searched > default
      for (let i = 0; i < pointCount; i++) {
        let color: RGBA = DEFAULT_POINT;

        if (selectedSet.has(i)) {
          color = SELECTED_POINT;
        } else if (hoveredCardSet.has(i)) {
          color = HOVER_POINT;
        } else if (parentsSet.has(i)) {
          color = PARENT_POINT;
        } else if (childrenSet.has(i)) {
          color = CHILD_POINT;
        } else if (searchSet.has(i)) {
          color = SEARCH_POINT;
        }

        pointColors.set(color, i * 4);
      }


      g.setPointColors(pointColors);
      g.setLinkColors(linkColors);
      g.setLinkWidths(linkWidths);

      // Always update which nodes have selection tooltips
      const indicesSet = new Set<number>([
        ...selectedIndices,
        ...parents,
        ...children,
      ]);
      highlightedIndicesRef.current = Array.from(indicesSet);

      const zoomToSelected = opts?.zoomToSelected ?? false;

      if (zoomToSelected && selectedIndices.length > 0) {
        const zoomDuration = 700;
        const zoomScale = 30;

        // Clear tooltips while zoom animates
        setTooltips([]);

        const token = ++highlightTokenRef.current;

        g.zoomToPointByIndex(selectedIndices[0], zoomDuration, zoomScale);
        g.render();

        void sleep(zoomDuration).then(() => {
          if (token !== highlightTokenRef.current) return;
          recomputeTooltipsPositions();
        });
      } else {
        g.render();
        // Instant recompute when not zooming
        recomputeTooltipsPositions();
      }
    },
    [recomputeTooltipsPositions, initialConfig]
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Node selection
  // ───────────────────────────────────────────────────────────────────────────

  const clearSelection = useCallback(() => {
    setSelectedNode(null);
    selectedIndexRef.current = null;
    highlightedIndicesRef.current = [];
    setTooltips([]);

    const g = graphInstance.current;
    if (!g) return;

    const positions = g.getPointPositions();
    if (!positions || positions.length === 0) return;

    const { parents, children } = computeParentsChildren([], linksRef.current);
    applyColors([], parents, children, { zoomToSelected: false });
  }, [applyColors, setSelectedNode]);

  const selectNodeByIndex = useCallback(
    async (index?: number, options?: { zoom?: boolean }) => {
      // default zoom = true
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
          ...data, // e.g. name, type, attributes, etc.
        });

        selectedIndexRef.current = index;

        if (data.name) {
          namesCacheRef.current.set(index, data.name);
        }

        const flatLinks = linksRef.current;
        const { parents, children } = computeParentsChildren([index], flatLinks);
        applyColors([index], parents, children, {
          zoomToSelected: zoom,
        });
      } catch (err) {
        console.error("Node fetch error:", err);
      }
    },
    [applyColors, clearSelection, setSelectedNode]
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Hover highlight z result card
  // ───────────────────────────────────────────────────────────────────────────

  const highlightResultHover = useCallback(
    async (index?: number)=> {
      hoveredCardIndexRef.current = index ?? null;

      const g = graphInstance.current;
      if (!g) return;

      const positions = g.getPointPositions();
      if (!positions || positions.length === 0) return;

      const selectedIndex = selectedIndexRef.current;
      const selectedIndices = selectedIndex !== null ? [selectedIndex] : [];
      const { parents, children } = computeParentsChildren(
        selectedIndices,
        linksRef.current
      );

      applyColors(selectedIndices, parents, children, { zoomToSelected: false });
    },
    [applyColors]
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Graph init & cleanup
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!graphRef.current) return;

    const config: GraphConfigInterface = {
      spaceSize: initialConfig?.spaceSize ?? 256,
      backgroundColor: "#000",
      pointSize: initialConfig?.pointSize ?? 1,
      pointColor: [128, 128, 128, 255],
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

      // CLICK ON NODE: select but DO NOT zoom (tooltips still appear)
      onClick: (index) => {
        if (index === null || index === undefined) {
          selectNodeByIndex(undefined);
        } else {
          selectNodeByIndex(index, { zoom: false });
        }
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

        if (hoverIndexRef.current === index) return;
        hoverIndexRef.current = index;

        updateHoverTooltipPosition(index, pointPos as [number, number]);
      },

      onPointMouseOut: () => {
        hoverIndexRef.current = null;
        setHoverTooltip(null);
      },

      // Selection tooltips on zoom
      onZoom: () => {
        recomputeTooltipsPositions();
      },
      onZoomEnd: () => {
        recomputeTooltipsPositions();
      },

      // Drag: keep ALL tooltips attached to their nodes
      onDrag: () => {
        isDraggingRef.current = true;

        // 1. Move selection tooltips (parents/children/selected)
        recomputeTooltipsPositions();

        // 2. Move hover tooltip if applicable
        const index = hoverIndexRef.current ?? selectedIndexRef.current;
        if (index == null) return;

        updateHoverTooltipPosition(index);
      },

      onDragEnd: () => {
        isDraggingRef.current = false;
        // One more recompute in case positions changed at the very end
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
  // Update graph data when positions / links / config change
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const g = graphInstance.current;
    if (!g || !pointPositions || !links) return;

    // Update basic config from props
    g.config.spaceSize = initialConfig?.spaceSize ?? 256;
    g.config.pointSize = initialConfig?.pointSize ?? 1;

    console.log(
      "Updating graph data:",
      pointPositions.length / 2,
      "nodes,",
      links.length / 2,
      "edges"
    );

    g.setPointPositions(pointPositions);
    g.setLinks(links);
    g.render();

    fitView();

    // Refresh colors for current selection + search
    const selectedIndex = selectedIndexRef.current;
    const selectedIndices = selectedIndex !== null ? [selectedIndex] : [];
    const { parents, children } = computeParentsChildren(
      selectedIndices,
      linksRef.current
    );
    applyColors(selectedIndices, parents, children, { zoomToSelected: false });
  }, [
    pointPositions,
    links,
    initialConfig?.spaceSize,
    initialConfig?.pointSize,
    fitView,
    applyColors,
  ]);

  // ───────────────────────────────────────────────────────────────────────────
  // Highlight search results
  // ───────────────────────────────────────────────────────────────────────────

  const highlightSearchResults = useCallback(
    (indices: number[]) => {
      const g = graphInstance.current;
      if (!g) return;

      searchIndicesRef.current = new Set(indices);

      const selectedIndex = selectedIndexRef.current;
      const selectedIndices = selectedIndex !== null ? [selectedIndex] : [];
      const { parents, children } = computeParentsChildren(
        selectedIndices,
        linksRef.current
      );

      applyColors(selectedIndices, parents, children, {
        zoomToSelected: false,
      });
    },
    [applyColors]
  );

  return {
    fitView,
    resetView,
    selectNodeByIndex,
    tooltips,
    hoverTooltip,
    highlightSearchResults,
    highlightResultHover,
  };
}

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
  content: string;
  x: number;
  y: number;
};

type SelectionContext = {
  selected: Set<number>;
  parents: Set<number>;
  children: Set<number>;
};

type UseGraphInitialConfig = {
  spaceSize: number;
  pointSize: number;
};

/**
 * Custom hook that wraps Cosmograph Graph instance.
 * Handles:
 *  - graph creation & cleanup
 *  - selection and search highlighting
 *  - tooltips for selection and hovered nodes
 *  - fetching node details from backend
 */
export function useGraph(
  graphRef: React.RefObject<HTMLDivElement | null>,
  pointPositions: Float32Array,
  links: Float32Array,
  setSelectedNode: Dispatch<SetStateAction<NodeInfoProps | null>>,
  initialConfig?: UseGraphInitialConfig,
  names?: string[]
) {
  /** ──────────────────────────────────────────────────────────────────────────
   *  Refs and state
   *  ───────────────────────────────────────────────────────────────────────── */

  const graphInstance = useRef<Graph | null>(null);
  const linksRef = useRef<Float32Array>(links);

  // Currently selected node index (single node selection)
  const selectedIndexRef = useRef<number | null>(null);

  // Selection context (selected + parents + children)
  const selectionContextRef = useRef<SelectionContext | null>(null);

  // Indices of nodes that are search results
  const searchIndicesRef = useRef<Set<number>>(new Set());

  // Tooltips for selected nodes (selection tooltips)
  const [tooltips, setTooltips] = useState<NodeTooltip[]>([]);
  // Tooltip for hovered node
  const [hoverTooltip, setHoverTooltip] = useState<NodeTooltip | null>(null);

  // Cache node names for tooltips and display
  const namesCacheRef = useRef<Map<number, string>>(new Map());

  // Indices that currently have selection tooltips
  const highlightedIndicesRef = useRef<number[]>([]);

  // Token to cancel stale tooltip updates during animations (zoom)
  const highlightTokenRef = useRef(0);

  const appContext = useContext(AppContext);
  const currentGraphUUID = appContext?.currentGraphUUID;
  const currentGraphUUIDRef = useRef<string | null>(currentGraphUUID);

  /** ──────────────────────────────────────────────────────────────────────────
   *  Effects: UUID / links / names
   *  ───────────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    currentGraphUUIDRef.current = currentGraphUUID;
    console.log("useGraph sees new graph uuid: " + currentGraphUUIDRef.current);
  }, [currentGraphUUID]);

  useEffect(() => {
    linksRef.current = links;
  }, [links]);

  // Names cache update
  useEffect(() => {
    const cache = namesCacheRef.current;
    cache.clear();

    if (names && names.length > 0) {
      names.forEach((name, idx) => {
        cache.set(idx, name);
      });
    }

    // If there are selection tooltips, update their positions after names change
    recomputeSelectionTooltipsPositions();
  }, [names]);

  /** ──────────────────────────────────────────────────────────────────────────
   *  Graph view controls
   *  ───────────────────────────────────────────────────────────────────────── */

  const fitView = () => graphInstance.current?.fitView();
  const resetView = () => graphInstance.current?.restart();

  /** ──────────────────────────────────────────────────────────────────────────
   *  Backend node fetching
   *  ───────────────────────────────────────────────────────────────────────── */

  const fetchNodeData = async (index: number) => {
    const uuid = currentGraphUUIDRef.current;
    if (!uuid) throw new Error("No current graph uuid set");

    const response = await fetch(`${API_BASE}/node/${uuid}/${index}`);
    if (!response.ok) throw new Error(`Node fetch failed: ${response.status}`);

    const responseJson = await response.json();
    console.log("Node info json: \n" + JSON.stringify(responseJson, null, 2));
    return responseJson;
  };

  /** ──────────────────────────────────────────────────────────────────────────
   *  Tooltip positioning for selection
   *  ───────────────────────────────────────────────────────────────────────── */

  const recomputeSelectionTooltipsPositions = useCallback(() => {
    const g = graphInstance.current;
    const el = graphRef.current;
    const indices = highlightedIndicesRef.current;

    if (!g || !el || indices.length === 0) return;

    const positions = g.getPointPositions();
    if (!positions || positions.length === 0) return;

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

  /** ──────────────────────────────────────────────────────────────────────────
   *  Combined coloring for selection + search (selection has priority)
   *  ───────────────────────────────────────────────────────────────────────── */

  const applyCombinedColors = useCallback(
    (pointCount: number, linkCount: number) => {
      const g = graphInstance.current;
      if (!g) return;

      const flatLinks = linksRef.current;
      const selection = selectionContextRef.current;
      const search = searchIndicesRef.current;

      const pointColors = new Float32Array(pointCount * 4);
      const linkColors = new Float32Array(linkCount * 4);
      const linkWidths = new Float32Array(linkCount);

      // If search is active, dim the background
      const hasSearch = search.size > 0;

      const defaultColor: [number, number, number, number] = hasSearch
        ? [0.4, 0.4, 0.4, 0.3] // dimmed when search is active
        : [0.8, 0.8, 0.8, 0.5]; // normal when no search

      // Node colors
      const selectedColor: [number, number, number, number] = [0.15, 0.3, 0.9, 0.9]; // blue
      const childColor: [number, number, number, number] = [0.2, 0.9, 0.2, 0.9]; // green
      const parentColor: [number, number, number, number] = [0.9, 0.2, 0.2, 0.9]; // red
      const searchColor: [number, number, number, number] = [0.0, 0.8, 1.0, 0.9]; // cyan

      // Edge colors
      const defaultLinkColor = defaultColor;
      const parentLinkColor: [number, number, number, number] = parentColor; // edges parent -> selected
      const childLinkColor: [number, number, number, number] = childColor; // edges selected -> child

      const defaultWidth = 0.8;
      const highlightedWidth = 2.2; // thicker for parent/child edges

      // ── Nodes ──
      for (let i = 0; i < pointCount; i++) {
        let color = defaultColor;

        const inSelection =
          selection &&
          (selection.selected.has(i) ||
            selection.parents.has(i) ||
            selection.children.has(i));

        if (selection && inSelection) {
          if (selection.selected.has(i)) color = selectedColor;
          else if (selection.children.has(i)) color = childColor;
          else if (selection.parents.has(i)) color = parentColor;
        } else if (search.has(i)) {
          // Search result, only if it is not part of selection
          color = searchColor;
        }

        pointColors.set(color, i * 4);
      }

      // ── Edges ──
      for (let e = 0; e < linkCount; e++) {
        const source = flatLinks[2 * e];
        const target = flatLinks[2 * e + 1];

        let color = defaultLinkColor;
        let width = defaultWidth;

        if (selection) {
          const isParentEdge =
            selection.parents.has(source) && selection.selected.has(target); // parent -> selected
          const isChildEdge =
            selection.selected.has(source) && selection.children.has(target); // selected -> child

          if (isParentEdge) {
            color = parentLinkColor;
            width = highlightedWidth;
          } else if (isChildEdge) {
            color = childLinkColor;
            width = highlightedWidth;
          }
          // Note: search does not affect edge colors or widths
        }

        linkColors.set(color, e * 4);
        linkWidths[e] = width;
      }

      g.setPointColors(pointColors);
      g.setLinkColors(linkColors);
      g.setLinkWidths(linkWidths);
      g.render();
    },
    []
  );

  /** ──────────────────────────────────────────────────────────────────────────
   *  Selection context creation
   *  ───────────────────────────────────────────────────────────────────────── */

  const buildSelectionContext = useCallback(
    (selectedIndices: number[]): SelectionContext => {
      const flatLinks = linksRef.current;
      const selectedSet = new Set<number>(selectedIndices);
      const parents = new Set<number>();
      const children = new Set<number>();

      for (let i = 0; i < flatLinks.length; i += 2) {
        const source = flatLinks[i];
        const target = flatLinks[i + 1];

        if (selectedSet.has(target)) {
          parents.add(source);
        } else if (selectedSet.has(source)) {
          children.add(target);
        }
      }

      return {
        selected: selectedSet,
        parents,
        children,
      };
    },
    []
  );

  /** ──────────────────────────────────────────────────────────────────────────
   *  Node selection & highlighting
   *  ───────────────────────────────────────────────────────────────────────── */

  const highlightSelection = useCallback(
    async (selectedIndices: number[], zoomEnabled: boolean = true) => {
      const g = graphInstance.current;
      if (!g) return;

      const positions = g.getPointPositions();
      if (!positions) return;

      const pointCount = positions.length / 2;
      const linkCount = linksRef.current.length / 2;

      // Clear selection if no indices
      if (!selectedIndices || selectedIndices.length === 0) {
        selectionContextRef.current = null;
        highlightedIndicesRef.current = [];
        setTooltips([]);
        applyCombinedColors(pointCount, linkCount);
        return;
      }

      // Build selection context (selected + parents + children)
      const selectionContext = buildSelectionContext(selectedIndices);
      selectionContextRef.current = selectionContext;

      const indicesSet = new Set<number>([
        ...selectionContext.selected,
        ...selectionContext.parents,
        ...selectionContext.children,
      ]);
      highlightedIndicesRef.current = Array.from(indicesSet);

      // Apply colors based on selection + search
      applyCombinedColors(pointCount, linkCount);

      // If zoom is disabled, just recompute tooltips immediately
      if (!zoomEnabled) {
        recomputeSelectionTooltipsPositions();
        return;
      }

      // Zoom-in on first selected node
      const zoomDuration = 700;
      const zoomScale = 30;

      g.zoomToPointByIndex(selectedIndices[0], zoomDuration, zoomScale);

      // Recompute tooltips after zoom finishes (with token guard)
      const token = ++highlightTokenRef.current;
      void sleep(zoomDuration).then(() => {
        if (token !== highlightTokenRef.current) return;
        recomputeSelectionTooltipsPositions();
      });
    },
    [applyCombinedColors, buildSelectionContext, recomputeSelectionTooltipsPositions]
  );


  /** ──────────────────────────────────────────────────────────────────────────
   *  Public selection API: select node by index
   *  ───────────────────────────────────────────────────────────────────────── */

  const selectNodeByIndex = useCallback(
    async (index?: number, zoomEnabled: boolean = true) => {
      // Clear selection if index is undefined
      if (index === undefined) {
        setSelectedNode(null);
        setTooltips([]);
        setHoverTooltip(null);
        selectedIndexRef.current = null;
        selectionContextRef.current = null;
        highlightedIndicesRef.current = [];

        const g = graphInstance.current;
        const positions = g?.getPointPositions();
        if (g && positions) {
          const pointCount = positions.length / 2;
          const linkCount = linksRef.current.length / 2;
          applyCombinedColors(pointCount, linkCount);
        }
        return;
      }

      try {
        const data = await fetchNodeData(index);

        setSelectedNode({
          index,
          ...data,
        });

        console.log("Node info json: \n" + JSON.stringify(data, null, 2));

        selectedIndexRef.current = index;

        // Update name cache from backend if name is returned
        namesCacheRef.current.set(
          index,
          data.name ?? namesCacheRef.current.get(index) ?? `Node ${index}`
        );

        await highlightSelection([index], zoomEnabled);
      } catch (err) {
        console.error("Node fetch error:", err);
      }
    },
    [setSelectedNode, highlightSelection, applyCombinedColors]
  );

  /** ──────────────────────────────────────────────────────────────────────────
   *  Graph initialization & cleanup
   *  ───────────────────────────────────────────────────────────────────────── */

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

      // Click selects a node (or clears selection when clicking on empty space)
      onClick: (index) => {
        if (index === null || index === undefined) {
          selectNodeByIndex(undefined);
          return;
        }
        selectNodeByIndex(index, false);
      },

      // Hover tooltip for the node under cursor
      onPointMouseOver: (index, pointPos) => {
        if (index == null || !pointPos) {
          setHoverTooltip(null);
          return;
        }

        const g = graphInstance.current;
        const el = graphRef.current;
        if (!g || !el) return;

        const [sx, sy] = g.spaceToScreenPosition(pointPos);
        const rect = el.getBoundingClientRect();

        setHoverTooltip({
          index,
          content: namesCacheRef.current.get(index) ?? `Node ${index}`,
          x: rect.left + sx + 8,
          y: rect.top + sy + 8,
        });
      },

      onPointMouseOut: () => {
        setHoverTooltip(null);
      },

      // Recompute tooltip positions when the camera changes
      onZoom: () => {
        recomputeSelectionTooltipsPositions();
      },
      onZoomEnd: () => {
        recomputeSelectionTooltipsPositions();
      },
      onDrag: () => {
        recomputeSelectionTooltipsPositions();
        setHoverTooltip(null);
      },
      onDragEnd: () => {
        recomputeSelectionTooltipsPositions();
      },
    };

    // Destroy previous instance (if any) before creating a new one
    graphInstance.current?.destroy?.();
    graphInstance.current = new Graph(graphRef.current, config);

    // Cleanup on unmount
    return () => {
      highlightTokenRef.current++;
      graphInstance.current?.destroy?.();
      graphInstance.current = null;
    };
  }, [graphRef, selectNodeByIndex, initialConfig, recomputeSelectionTooltipsPositions]);

  /** ──────────────────────────────────────────────────────────────────────────
   *  Update graph data when positions or links change
   *  ───────────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    const g = graphInstance.current;
    if (!g || !pointPositions || !links) return;

    // Reset state when data changes
    highlightedIndicesRef.current = [];
    selectedIndexRef.current = null;
    selectionContextRef.current = null;
    searchIndicesRef.current = new Set();
    setTooltips([]);
    setHoverTooltip(null);

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

    const positions = g.getPointPositions();
    if (positions) {
      const pointCount = positions.length / 2;
      const linkCount = linksRef.current.length / 2;
      applyCombinedColors(pointCount, linkCount);
    }

    recomputeSelectionTooltipsPositions();
  }, [
    pointPositions,
    links,
    initialConfig,
    applyCombinedColors,
    recomputeSelectionTooltipsPositions,
  ]);

  /** ──────────────────────────────────────────────────────────────────────────
   *  Search highlighting (nodes only, no tooltips by default)
   *  ───────────────────────────────────────────────────────────────────────── */

  const highlightSearchResults = useCallback(
    (indices: number[]) => {
      const g = graphInstance.current;
      if (!g) return;

      const positions = g.getPointPositions();
      if (!positions) return;

      const pointCount = positions.length / 2;
      const linkCount = linksRef.current.length / 2;

      if (!indices || indices.length === 0) {
        searchIndicesRef.current = new Set();
        setTooltips([]);
        applyCombinedColors(pointCount, linkCount);
        return;
      }

      searchIndicesRef.current = new Set(indices);
      // Only coloring is applied here, no search tooltips by default
      applyCombinedColors(pointCount, linkCount);
    },
    [applyCombinedColors]
  );

  /** ──────────────────────────────────────────────────────────────────────────
   *  Tooltips for search results (used when caller wants to show them)
   *  ───────────────────────────────────────────────────────────────────────── */

  const updateSearchTooltipsForIndices = useCallback(
    (indices: number[]) => {
      const g = graphInstance.current;
      const el = graphRef.current;
      if (!g || !el) return;

      if (!indices || indices.length === 0) {
        setTooltips([]);
        return;
      }

      const positions = g.getPointPositions();
      if (!positions || positions.length === 0) return;

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
    },
    [graphRef]
  );

  /** ──────────────────────────────────────────────────────────────────────────
   *  Public API of the hook
   *  ───────────────────────────────────────────────────────────────────────── */

  return {
    fitView,
    resetView,
    selectNodeByIndex,
    tooltips,
    hoverTooltip,
    highlightSearchResults,
    updateSearchTooltipsForIndices,
  };
}

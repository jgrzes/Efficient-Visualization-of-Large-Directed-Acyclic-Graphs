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

export function useGraph(
  graphRef: React.RefObject<HTMLDivElement | null>,
  pointPositions: Float32Array,
  links: Float32Array,
  setSelectedNode: Dispatch<SetStateAction<NodeInfoProps | null>>,
  initialConfig?: {
    spaceSize: number;
    pointSize: number;
  },
  names?: string[]
) {
  const graphInstance = useRef<Graph | null>(null);
  const linksRef = useRef<Float32Array>(links);

  const selectedIndexRef = useRef<number | null>(null);
  const highlightedIndicesRef = useRef<number[]>([]);

  const namesCacheRef = useRef<Map<number, string>>(new Map());

  const [tooltips, setTooltips] = useState<NodeTooltip[]>([]);
  const [hoverTooltip, setHoverTooltip] = useState<NodeTooltip | null>(null);

  const highlightTokenRef = useRef(0);

  const appContext = useContext(AppContext);
  const currentGraphUUID = appContext?.currentGraphUUID;
  const currentGraphUUIDRef = useRef<string | null>(currentGraphUUID);

  const searchHighlightActiveRef = useRef(false);

  useEffect(() => {
    currentGraphUUIDRef.current = currentGraphUUID;
    console.log("useGraph sees new graph uuid: " + currentGraphUUIDRef.current);
  }, [currentGraphUUID]);

  useEffect(() => {
    linksRef.current = links;
  }, [links]);

  // opcjonalnie wstępne nazwy (np. jeśli je masz z boku)
  useEffect(() => {
    const cache = namesCacheRef.current;
    cache.clear();

    if (names && names.length > 0) {
      names.forEach((name, idx) => {
        cache.set(idx, name);
      });
    }
    // jeśli są tooltipy highlightu — przelicz je
    recomputeTooltipsPositions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names]);

  /** Graph view controls **/
  const fitView = () => graphInstance.current?.fitView();
  const resetView = () => graphInstance.current?.restart();

  /** Fetch node info from backend **/
  const fetchNodeData = async (index: number) => {
    const uuid = currentGraphUUIDRef.current;
    if (!uuid) throw new Error("No current graph uuid set");
    const response = await fetch(`${API_BASE}/node/${uuid}/${index}`);
    if (!response.ok) throw new Error(`Node fetch failed: ${response.status}`);
    const responseJson = await response.json();
    console.log("Node info json: \n" + JSON.stringify(responseJson, null, 2));
    return responseJson;
  };

  /** Przeliczanie pozycji tooltipów (dla zaznaczonych / highlightowanych) **/
  const recomputeTooltipsPositions = () => {
    if (searchHighlightActiveRef.current) return;

    const g = graphInstance.current;
    const el = graphRef.current;
    const indices = highlightedIndicesRef.current;

    if (!g || !el || indices.length === 0) return;

    const positions = g.getPointPositions();
    if (!positions || positions.length === 0) return;

    const rect = el.getBoundingClientRect();
    const next: NodeTooltip[] = [];

    indices.forEach((idx) => {
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
  };


  /** Highlight selected node and its relationships + opcjonalne tooltipy **/
  const highlightNodes = (
    selectedIndices: number[],
    pointCount: number,
    linkCount: number,
    options?: {
      colors?: {
        defaultColor?: [number, number, number, number];
        selectedColor?: [number, number, number, number];
        childColor?: [number, number, number, number];
        parentColor?: [number, number, number, number];
        defaultLinkColor?: [number, number, number, number];
        childLinkColor?: [number, number, number, number];
        parentLinkColor?: [number, number, number, number];
      };
      linkWidths?: {
        default?: number;
        related?: number;
      };
      links?: number[];
      zoom?: {
        enabled?: boolean;
        duration?: number;
        scale?: number;
      };
      showTooltips?: boolean;
    }
  ) => {
    const pointColors = new Float32Array(pointCount * 4);
    const linkColors = new Float32Array(linkCount * 4);
    const linkWidths = new Float32Array(linkCount);

    const defaultColor =
      options?.colors?.defaultColor ??
      ([0.8, 0.8, 0.8, 0.5] as [number, number, number, number]);
    const providedAnyColors = !!options?.colors;

    const useSelected = providedAnyColors ? !!options!.colors!.selectedColor : true;
    const useChild = providedAnyColors ? !!options!.colors!.childColor : true;
    const useParent = providedAnyColors ? !!options!.colors!.parentColor : true;

    const selectedColor =
      options?.colors?.selectedColor ??
      ([0.15, 0.3, 0.9, 0.9] as [number, number, number, number]);
    const childColor =
      options?.colors?.childColor ??
      ([0.2, 0.9, 0.2, 0.9] as [number, number, number, number]);
    const parentColor =
      options?.colors?.parentColor ??
      ([0.9, 0.2, 0.2, 0.9] as [number, number, number, number]);

    const defaultLinkColor = options?.colors?.defaultLinkColor ?? defaultColor;
    const childLinkColor = options?.colors?.childLinkColor ?? childColor;
    const parentLinkColor = options?.colors?.parentLinkColor ?? parentColor;

    const defaultWidth = options?.linkWidths?.default ?? 1;
    const relatedWidth = options?.linkWidths?.related ?? 3;

    const parents: number[] = [];
    const children: number[] = [];

    const flatLinks = options?.links ?? linksRef.current;
    const selectedSet = new Set<number>(selectedIndices);

    // link colors / widths
    for (let i = 0; i < flatLinks.length; i += 2) {
      const source = flatLinks[i];
      const target = flatLinks[i + 1];
      let color = defaultLinkColor;
      let width = defaultWidth;

      if (selectedSet.has(target)) {
        parents.push(source);
        if (useParent) {
          color = parentLinkColor;
          width = relatedWidth;
        }
      } else if (selectedSet.has(source)) {
        children.push(target);
        if (useChild) {
          color = childColor;
          width = relatedWidth;
        }
      }

      linkColors.set(color, i * 2);
      linkWidths[i / 2] = width;
    }

    // point colors
    for (let i = 0; i < pointCount; i++) {
      let color = defaultColor;
      if (selectedSet.has(i) && useSelected) color = selectedColor;
      else if (children.includes(i) && useChild) color = childColor;
      else if (parents.includes(i) && useParent) color = parentColor;
      pointColors.set(color, i * 4);
    }

    const graph = graphInstance.current;
    if (!graph) return;

    graph.setPointColors(pointColors);
    graph.setLinkColors(linkColors);
    graph.setLinkWidths(linkWidths);

    const zoomEnabled = options?.zoom?.enabled ?? true;
    const zoomDuration = options?.zoom?.duration ?? 700;
    const zoomScale = options?.zoom?.scale ?? 30;

    if (zoomEnabled && selectedIndices.length > 0) {
      graph.zoomToPointByIndex(selectedIndices[0], zoomDuration, zoomScale);
    }

    graph.render();

    const indicesSet = new Set<number>([
      ...selectedIndices,
      ...parents,
      ...children,
    ]);
    highlightedIndicesRef.current = Array.from(indicesSet);

    // reset tooltipów
    setTooltips([]);
    const token = ++highlightTokenRef.current;

    void sleep(zoomEnabled ? zoomDuration : 0).then(() => {
      if (token !== highlightTokenRef.current) return;
      if (options?.showTooltips === false) return;
      recomputeTooltipsPositions();
    });
  };

  /** Select node by index and update UI **/
  const selectNodeByIndex = useCallback(
    async (index?: number, zoomEnabled: boolean = true) => {
      if (index === undefined) {
        setSelectedNode(null);
        setTooltips([]);
        setHoverTooltip(null);
        selectedIndexRef.current = null;
        highlightedIndicesRef.current = [];
        searchHighlightActiveRef.current = false;
        return;
      }

      try {
        const data = await fetchNodeData(index);

        setSelectedNode({ index, ...data });

        selectedIndexRef.current = index;
        namesCacheRef.current.set(
          index,
          data.name ?? namesCacheRef.current.get(index) ?? `Node ${index}`
        );

        const pointCount =
          (graphInstance.current?.getPointPositions()?.length ?? 0) / 2;

        // 🔹 kliknięcie w wierzchołek = nie jesteśmy w trybie search
        searchHighlightActiveRef.current = false;

        highlightNodes([index], pointCount, linksRef.current.length / 2, {
          showTooltips: true,
          zoom: { enabled: zoomEnabled },
        });
      } catch (err) {
        console.error("Node fetch error:", err);
      }
    },
    [setSelectedNode]
  );


  /** Initialize and clean up graph **/
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

      onClick: (index) => {
        if (index === null || index === undefined) {
          selectNodeByIndex(undefined);
          return;
        }
        selectNodeByIndex(index, false);
      },

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

      onZoom: () => {
        recomputeTooltipsPositions();
      },
      onZoomEnd: () => {
        recomputeTooltipsPositions();
      },
      onDrag: () => {
        recomputeTooltipsPositions();
        setHoverTooltip(null);
      },
      onDragEnd: () => {
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
  }, [graphRef, selectNodeByIndex, initialConfig]);

  /** Update graph data on change **/
  useEffect(() => {
    const g = graphInstance.current;
    if (!g || !pointPositions || !links) return;

    highlightedIndicesRef.current = [];
    selectedIndexRef.current = null;
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
    recomputeTooltipsPositions();
  }, [pointPositions, links, initialConfig]);

  /** 🔹 Kolorowanie wyników wyszukiwania – BEZ tooltipów **/
  const highlightSearchResults = useCallback(
    (indices: number[]) => {
      const g = graphInstance.current;
      if (!g) return;

      const positions = g.getPointPositions();
      if (!positions) return;

      const pointCount = positions.length / 2;
      const linkCount = linksRef.current.length / 2;

      if (!indices || indices.length === 0) {
        // 🔹 kończymy tryb search highlight
        searchHighlightActiveRef.current = false;
        highlightedIndicesRef.current = [];
        selectedIndexRef.current = null;
        setTooltips([]);
        g.render();
        return;
      }

      // 🔹 włączamy tryb search highlight
      searchHighlightActiveRef.current = true;

      highlightNodes(indices, pointCount, linkCount, {
        colors: {
          defaultColor: [0.4, 0.4, 0.4, 0.3],
          selectedColor: [0.0, 0.8, 1.0, 0.9],
        },
        linkWidths: {
          default: 0.8,
          related: 1.8,
        },
        zoom: { enabled: false },
        showTooltips: false, // ← i tak, ale to nie wystarczało
      });
    },
    [highlightNodes]
  );


  /** 🔹 Tooltipy dla WYBRANYCH indeksów (np. widoczne wyniki w scrollu) **/
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
    []
  );

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

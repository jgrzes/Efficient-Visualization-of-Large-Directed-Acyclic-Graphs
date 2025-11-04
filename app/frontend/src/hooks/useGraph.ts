import { Dispatch, SetStateAction, useEffect, useRef } from 'react';
import { Graph, GraphConfigInterface } from '@cosmograph/cosmos';
import { NodeInfoProps } from '../components/NodeInfo';

const API_BASE = 'http://localhost:30301';

// Track mouse for tooltip positioning
let mouseX = 0;
let mouseY = 0;
window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

export function useGraph(
  graphRef: React.RefObject<HTMLDivElement | null>,
  canvasRef: React.RefObject<HTMLDivElement | null>,
  pointPositions: Float32Array,
  links: Float32Array,
  setSelectedNode: Dispatch<SetStateAction<NodeInfoProps | null>>
) {
  const graphInstance = useRef<Graph | null>(null);
  const linksRef = useRef<Float32Array>(links);

  useEffect(() => {
    linksRef.current = links;
  }, [links]);

  /** Graph view controls **/
  const fitView = () => graphInstance.current?.fitView();
  const resetView = () => graphInstance.current?.restart();

  /** Fetch node info from backend **/
  const fetchNodeData = async (index: number) => {
    const response = await fetch(`${API_BASE}/node/${index}`);
    if (!response.ok) throw new Error(`Node fetch failed: ${response.status}`);
    return response.json();
  };

  /** Highlight selected node and its relationships **/
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
        padding?: number;
      };
    }
  ) => {
    const pointColors = new Float32Array(pointCount * 4);
    const linkColors = new Float32Array(linkCount * 4);
    const linkWidths = new Float32Array(linkCount);

    const defaultColor = options?.colors?.defaultColor ?? [0.8, 0.8, 0.8, 0.5] as [number, number, number, number];
    const providedAnyColors = !!options?.colors;

    const useSelected = providedAnyColors ? !!options!.colors!.selectedColor : true;
    const useChild    = providedAnyColors ? !!options!.colors!.childColor    : true;
    const useParent   = providedAnyColors ? !!options!.colors!.parentColor   : true;

    const selectedColor = options?.colors?.selectedColor ?? [0.15, 0.3, 0.9, 0.9] as [number, number, number, number];
    const childColor    = options?.colors?.childColor    ?? [0.2, 0.9, 0.2, 0.9] as [number, number, number, number];
    const parentColor   = options?.colors?.parentColor   ?? [0.9, 0.2, 0.2, 0.9] as [number, number, number, number];

    const defaultLinkColor = options?.colors?.defaultLinkColor ?? defaultColor;
    const childLinkColor   = options?.colors?.childLinkColor   ?? childColor;
    const parentLinkColor  = options?.colors?.parentLinkColor  ?? parentColor;

    const defaultWidth = options?.linkWidths?.default ?? 1;
    const relatedWidth = options?.linkWidths?.related ?? 3;

    const parents: number[] = [];
    const children: number[] = [];

    const flatLinks = options?.links ?? linksRef.current;
    const selectedSet = new Set<number>(selectedIndices);

    for (let i = 0; i < flatLinks.length; i += 2) {
      const source = flatLinks[i];
      const target = flatLinks[i + 1];
      let color = defaultLinkColor;
      let width = defaultWidth;

      if (selectedSet.has(target)) {
        parents.push(source);
        if (useParent) color = parentLinkColor;
        if (useParent) width = relatedWidth;
      } else if (selectedSet.has(source)) {
        children.push(target);
        if (useChild) color = childLinkColor;
        if (useChild) width = relatedWidth;
      }

      linkColors.set(color, i * 2);
      linkWidths[i / 2] = width;
    }

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
    if (zoomEnabled) {
      graph.zoomToPointByIndex(
        selectedIndices[0],
        options?.zoom?.duration ?? 700,
        options?.zoom?.padding ?? 20
      );
    }

    graph.render();
  };

  /** Select node by index and update UI **/
  const selectNodeByIndex = async (index?: number) => {
    if (index === undefined) {
      setSelectedNode(null);
      return;
    }

    try {
      const data = await fetchNodeData(index);
      setSelectedNode({
        index: data.index,
        id: data.id,
        name: data.name,
        namespace: data.namespace,
        def: data.def,
        synonym: data.synonym,
        is_a: data.is_a
      });

      const pointCount = (graphInstance.current?.getPointPositions()?.length ?? 0) / 2;
      highlightNodes([index], pointCount, linksRef.current.length / 2);

    } catch (err) {
      console.error('Node fetch error:', err);
    }
  };

  /** Tooltip handling **/
  const showTooltip = (name: string, def: string) => {
    const tooltip = document.getElementById('tooltip');
    if (!tooltip) return;
    tooltip.innerHTML = `<strong>${name}</strong><br/><br/>${def}`;
    tooltip.style.left = `${mouseX + 10}px`;
    tooltip.style.top = `${mouseY + 10}px`;
    tooltip.style.display = 'block';
  };

  const hideTooltip = () => {
    const tooltip = document.getElementById('tooltip');
    if (tooltip) tooltip.style.display = 'none';
  };

  /** Initialize and clean up graph **/
  useEffect(() => {
    if (!graphRef.current) return;

    let hoveredIndex: number | undefined;

    const config: GraphConfigInterface = {
      spaceSize: 256,
      backgroundColor: '#000',
      pointSize: 1,
      pointColor: [128, 128, 128, 255],
      pointGreyoutOpacity: 0.1,
      linkWidth: 0.8,
      linkColor: '#a1a1a1',
      linkArrows: true,
      curvedLinks: false,
      renderHoveredPointRing: false,
      enableDrag: true,
      simulationLinkSpring: 0.2,
      simulationRepulsion: 1.5,
      simulationGravity: 0.1,
      simulationDecay: 100,
      onClick: selectNodeByIndex,

      onPointMouseOver: async (index) => {
        if (index === undefined) return;
        hoveredIndex = index;
        try {
          const data = await fetchNodeData(index);
          showTooltip(data.name, data.def);
        } catch {
          hideTooltip();
        }
      },

      onPointMouseOut: () => {
        hideTooltip();
        hoveredIndex = undefined;
      },

      onDrag: (event) => {
        if (hoveredIndex === undefined || !event) return;
        const tooltip = document.getElementById('tooltip');
        if (!tooltip) return;
        tooltip.style.left = `${event.sourceEvent.clientX + 10}px`;
        tooltip.style.top = `${event.sourceEvent.clientY + 10}px`;
      },

      onDragEnd: () => {
        hoveredIndex = undefined;
      }
    };

    graphInstance.current = new Graph(graphRef.current, config);

    return () => {
      graphInstance.current?.destroy?.();
      graphInstance.current = null;
    };
  }, [graphRef, setSelectedNode]);

  /** Update graph data on change **/
  useEffect(() => {
    if (!graphInstance.current || !pointPositions || !links) return;
    graphInstance.current.setPointPositions(pointPositions);
    graphInstance.current.setLinks(links);
    graphInstance.current.render();
  }, [pointPositions, links]);

  return { fitView, resetView, selectNodeByIndex };
}

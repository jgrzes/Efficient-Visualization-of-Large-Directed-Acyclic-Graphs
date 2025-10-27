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
  spaceSize: number,
  setSelectedNode: Dispatch<SetStateAction<NodeInfoProps | null>>,
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
    selectedIndex: number,
    pointCount: number,
    linkCount: number
  ) => {
    const pointColors = new Float32Array(pointCount * 4);
    const linkColors = new Float32Array(linkCount * 4);
    const linkWidths = new Float32Array(linkCount);

    const defaultColor = [0.8, 0.8, 0.8, 0.5];
    const selectedColor = [0.15, 0.3, 0.9, 0.9];
    const childColor = [0.2, 0.9, 0.2, 0.9];
    const parentColor = [0.9, 0.2, 0.2, 0.9];

    const parents: number[] = [];
    const children: number[] = [];

    for (let i = 0; i < linksRef.current.length; i += 2) {
      const source = linksRef.current[i];
      const target = linksRef.current[i + 1];
      let color = defaultColor;
      let width = 1;

      if (target === selectedIndex) {
        parents.push(source);
        color = parentColor;
        width = 3;
      } else if (source === selectedIndex) {
        children.push(target);
        color = childColor;
        width = 3;
      }

      linkColors.set(color, i * 2);
      linkWidths[i / 2] = width;
    }

    for (let i = 0; i < pointCount; i++) {
      let color = defaultColor;
      if (i === selectedIndex) color = selectedColor;
      else if (children.includes(i)) color = childColor;
      else if (parents.includes(i)) color = parentColor;
      pointColors.set(color, i * 4);
    }

    const graph = graphInstance.current;
    if (!graph) return;

    graph.setPointColors(pointColors);
    graph.setLinkColors(linkColors);
    graph.setLinkWidths(linkWidths);
    graph.zoomToPointByIndex(selectedIndex, 700, 20);
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
        id: data.id,
        name: data.name,
        namespace: data.namespace,
        def: data.def,
        synonym: data.synonym,
        is_a: data.is_a
      });

      const pointCount =
        (graphInstance.current?.getPointPositions()?.length ?? 0) / 2;
      highlightNodes(index, pointCount, linksRef.current.length / 2);
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
      spaceSize: spaceSize,
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
    console.log('Example points positions: ', pointPositions.slice(0, 10));
    graphInstance.current.setLinks(links);
    graphInstance.current.render();
    graphInstance.current.fitView();
  }, [pointPositions, links, spaceSize]);

  return { fitView, resetView, selectNodeByIndex };
}

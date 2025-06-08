import { Dispatch, SetStateAction, useEffect } from 'react';
import { Graph, GraphConfigInterface } from '@cosmograph/cosmos';
import { NodeInfoProps } from '../components/NodeInfo';

export function useGraph(
  graphRef: React.RefObject<HTMLDivElement | null>,
  canvasRef: React.RefObject<HTMLDivElement | null>,
  pointPositions: Float32Array,
  links: number[],
  setSelectedNode: Dispatch<SetStateAction<NodeInfoProps | null>>
) {
  useEffect(() => {
    if (
      !graphRef.current ||
      !pointPositions ||
      !links
    ) return;

    let graph: Graph;
    let currentHoveredIndex: number | undefined = undefined;

  const config: GraphConfigInterface = {
    spaceSize: 256,
    backgroundColor: '#1a1a1a',
    pointSize: 1.2,
    pointColor: '#3bc2ff',
    pointGreyoutOpacity: 0.1,

    linkWidth: 0.8,
    linkColor: '#a1a1a1',
    linkArrows: true,                
    linkGreyoutOpacity: 0,
    curvedLinks: false,

    renderHoveredPointRing: false,     // bez pierścieni
    enableDrag: true,

    simulationLinkSpring: 0.2,   // elastyczność krawędzi
    simulationRepulsion: 1.5,    // odpychanie punktów
    simulationGravity: 0.1,      // lekkie przyciąganie całości do środka
    simulationDecay: 100,        // jak szybko energia wygasa


    onClick: (index) => {
      if (index !== undefined) {
        setSelectedNode({
          name: `Node ${index}`,
          namespace: 'biological_process',
          def: 'Example definition.',
          synonym: ['"example synonym" EXACT []'],
          is_a: ['GO:0000001', 'GO:0000002']
        });
      } else {
        setSelectedNode(null); // klik poza nodem → ukryj info
      }
    },


    onPointMouseOver: (index, position, event) => {
      const tooltip = document.getElementById("tooltip");
      if (!tooltip || !event || index === undefined) return;

      currentHoveredIndex = index;

      // const goId = index_to_id[index];
      // const node = nodeMetadataMap[goId];

      tooltip.innerHTML = `<strong>"Node.Name"</strong><br/>
                          "Node.Namespace"<br/>"Node.Definition"<br/>`;
      tooltip.style.left = `${event.clientX + 10}px`;
      tooltip.style.top = `${event.clientY + 10}px`;
      tooltip.style.display = "block";
    },

    onPointMouseOut: () => {
      const tooltip = document.getElementById("tooltip");
      if (tooltip) tooltip.style.display = "none";
      currentHoveredIndex = undefined;
    },

    onDrag: (event) => {
      if (currentHoveredIndex === undefined) return;

      const tooltip = document.getElementById("tooltip");
      if (!tooltip || !event) return;

      tooltip.style.left = `${event.sourceEvent.clientX + 10}px`;
      tooltip.style.top = `${event.sourceEvent.clientY + 10}px`;
    },

    onDragEnd: () => {
      currentHoveredIndex = undefined;
    }
  };

    graph = new Graph(graphRef.current, config);
    graph.setPointPositions(new Float32Array(pointPositions));
    graph.setLinks(new Float32Array(links));
    graph.render();

    function fitView() {
      graph.fitView();
    }

    function restartView() {
      graph.restart();
    }

    document.getElementById("fit-view")?.addEventListener("click", fitView);
    document.getElementById("reset")?.addEventListener("click", restartView);

  }, [graphRef, canvasRef, pointPositions, links]);
}
function setSelectedNode(nodeInfo: any) {
  throw new Error('Function not implemented.');
}


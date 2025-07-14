import { Dispatch, SetStateAction, useEffect, useRef } from 'react';
import { Graph, GraphConfigInterface } from '@cosmograph/cosmos';
import { NodeInfoProps } from '../components/NodeInfo';

let mouseX = 0;
let mouseY = 0;

window.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

export function useGraph(
  graphRef: React.RefObject<HTMLDivElement | null>,
  canvasRef: React.RefObject<HTMLDivElement | null>,
  pointPositions: Float32Array,
  links: number[],
  setSelectedNode: Dispatch<SetStateAction<NodeInfoProps | null>>
) {
  const graphInstance = useRef<Graph | null>(null);
  
  useEffect(() => {
    console.log("Begin\n");
    if (!graphRef.current) return;
    console.log("After first check");

    let currentHoveredIndex: number | undefined = undefined;

    const config: GraphConfigInterface = {
      spaceSize: 256,
      backgroundColor: '#000000',
      pointSize: 1.,
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


      onClick: async (index) => {
      if (index !== undefined) {
        try {
          const res = await fetch(`http://localhost:30301/node/${index}`);
          if (!res.ok) {
            console.error("Failed to fetch node data:", res.statusText);
            return;
          }

          const data = await res.json();
          setSelectedNode({
            id: data.id,
            name: data.name,
            namespace: data.namespace,
            def: data.def,
            synonym: data.synonym,
            is_a: data.is_a,
          });
        } catch (err) {
          console.error("Fetch error:", err);
        }
      } else {
        setSelectedNode(null); // klik poza nodem -> ukryj info
      }
    },


    onPointMouseOver: async (index, event) => {
        const tooltip = document.getElementById("tooltip");
        if (!tooltip || !event || index === undefined) return;
        
        currentHoveredIndex = index;

        const res = await fetch(`http://localhost:30301/node/${index}`);

        const data = await res.json();
        tooltip.innerHTML = `
          <strong>${data.name}</strong><br/>
          <br/>
          ${data.def}
        `;
          
        tooltip.style.left = `${mouseX + 10}px`;
        tooltip.style.top = `${mouseY + 10}px`;
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

    graphInstance.current = new Graph(graphRef.current, config);

    console.log("After building config\n");

    return () => {
      if (graphInstance.current) {
        graphInstance.current.destroy?.();
        graphInstance.current = null;
      }
    };

  }, [graphRef, canvasRef, setSelectedNode]);

useEffect(() => {
  if (!graphInstance.current) return;
  if (!pointPositions || !links) return;

    console.log(pointPositions);
    console.log(links);
    graphInstance.current.setPointPositions(new Float32Array(pointPositions));
    graphInstance.current.setLinks(new Float32Array(links));
    graphInstance.current.render();

    function fitView() {
      graphInstance.current?.fitView();
    }

    function restartView() {
      graphInstance.current?.restart();
    }

    graphInstance.current.fitView();

    console.log("fit-view button:", document.getElementById("fit-view"));
    console.log("reset button:", document.getElementById("reset"));

    document.getElementById("fit-view")?.addEventListener("click", fitView);
    document.getElementById("reset")?.addEventListener("click", restartView);

  }, [pointPositions, links]);
}
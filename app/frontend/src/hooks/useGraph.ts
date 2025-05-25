import { useEffect } from 'react';
import { Graph, GraphConfigInterface } from '@cosmograph/cosmos';

export function useGraph(
  graphRef: React.RefObject<HTMLDivElement | null>,
  canvasRef: React.RefObject<HTMLDivElement | null>,
  pauseButtonRef: React.RefObject<HTMLButtonElement | null>,
  pointPositions: Float32Array,
  links: number[]
) {
  useEffect(() => {
    if (!graphRef.current || !pauseButtonRef.current) return;

    let graph: Graph;

    const config: GraphConfigInterface = {
      spaceSize: 1024,
      backgroundColor: '#151515',
      pointSize: 1,
      pointColor: '#FF0000',
      pointGreyoutOpacity: 0.3,
      linkWidth: 2.0,
      linkColor: '#00FF00',
      linkArrows: false,
      linkGreyoutOpacity: 0,
      curvedLinks: false,
      renderHoveredPointRing: true,
      hoveredPointRingColor: '#4B5BBF',
      enableDrag: true,
      simulationLinkSpring: 0,
      simulationRepulsion: 0,
      simulationGravity: 0,
      simulationDecay: 0,


      onClick: (index) => {
        if (index !== undefined) {
          graph.selectPointByIndex(index);
        //   graph.zoomToPointByIndex(index);
        } else {
          graph.unselectPoints();
        }
      }
    };

    graph = new Graph(graphRef.current, config);
    graph.setPointPositions(new Float32Array(pointPositions));
    graph.setLinks(new Float32Array(links));
    graph.zoom(1.0);
    graph.render();
  }, [graphRef, canvasRef, pauseButtonRef, pointPositions, links]);
}

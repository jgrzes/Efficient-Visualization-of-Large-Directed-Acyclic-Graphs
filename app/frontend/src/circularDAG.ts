function getRandom(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }
  
  export function generateCircularDAG(nodeCount: number): { pointPositions: Float32Array, links: number[] } {
    const pointPositions = new Float32Array(nodeCount * 2);
    const links: number[] = [];
  
    const radiusX = 500; // szerokość elipsy
    const radiusY = 300; // wysokość elipsy
    const centerX = 2048;
    const centerY = 2048;
  
    for (let pointIndex = 0; pointIndex < nodeCount; pointIndex += 1) {
      const angle = (2 * Math.PI * pointIndex) / nodeCount;
      const randomFactor = getRandom(0.95, 1.05); // delikatne rozrzucenie
      const x = centerX + radiusX * Math.cos(angle) * randomFactor;
      const y = centerY + radiusY * Math.sin(angle) * randomFactor;
  
      pointPositions[pointIndex * 2] = x;
      pointPositions[pointIndex * 2 + 1] = y;
  
      // --- Dodawanie krawędzi ---
      const maxLinks = 3; // maksymalnie 3 wyjścia z każdego węzła
      const linksFromThisNode = Math.floor(getRandom(1, maxLinks + 1));
      for (let i = 0; i < linksFromThisNode; i++) {
        const targetIndex = pointIndex + Math.floor(getRandom(1, nodeCount - pointIndex));
        if (targetIndex < nodeCount) {
          links.push(pointIndex);
          links.push(targetIndex);
        }
      }
    }
  
    return { pointPositions, links };
  }
  
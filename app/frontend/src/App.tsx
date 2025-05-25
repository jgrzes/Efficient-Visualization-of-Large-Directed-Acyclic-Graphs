import React, { useRef, useMemo } from 'react';
import './style.css';
import { pointPositions, links } from './data-gen';
import Controls from './components/Controls';
import Stats from './components/Stats';
import { useGraph } from './hooks/useGraph';

const App: React.FC = () => {
  const graphRef = useRef<HTMLDivElement>(null);
  const pauseButtonRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useGraph(graphRef, canvasRef, pauseButtonRef, pointPositions, links);

  const stats = useMemo(() => {
    const nodeCount = pointPositions.length / 2;
    const edgeCount = links.length / 2;

    // Przykładowa liczba ścieżek — możesz zastąpić prawdziwym obliczeniem
    const pathCount = Math.floor(Math.random() * 10); 

    return { nodeCount, edgeCount, pathCount };
  }, [pointPositions, links]);

  return (
    <div id="layout">
      <Controls pauseButtonRef={pauseButtonRef} />
      <div ref={graphRef} id="graph" />
      <div ref={canvasRef}/>
      <Stats
        nodeCount={stats.nodeCount}
        edgeCount={stats.edgeCount}
        pathCount={stats.pathCount}
      />
    </div>
  );
};

export default App;

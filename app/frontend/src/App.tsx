import React, { useRef, useMemo, useState } from 'react';
import './style.css';
import { initialPointPositions, initialLinks } from './data-gen';
import Controls from './components/Controls';
import Stats from './components/Stats';
import { useGraph } from './hooks/useGraph';
import NodeInfo, { NodeInfoProps } from './components/NodeInfo';
import AnalysisPanel from './components/AnalysisPanel';

const App: React.FC = () => {
  const graphRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [pointPositions, setPointPositions] = useState<Float32Array>(new Float32Array(initialPointPositions));
  const [links, setLinks] = useState<number[]>([...initialLinks]);
  const [selectedNode, setSelectedNode] = useState<NodeInfoProps | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);


  useGraph(graphRef, canvasRef, pointPositions!, links!, setSelectedNode);


  const stats = useMemo(() => {
    const nodeCount = pointPositions ? pointPositions.length / 2 : 0;
    const edgeCount = links ? links.length / 2 : 0;
    
    // Przykładowa liczba ścieżek; Do zastąpienia rzeczywistą logiką
    const pathCount = Math.floor(Math.random() * 10); 

    return { nodeCount, edgeCount, pathCount };
  }, [pointPositions, links]);

  return (
    <div id="layout">
      <div id="controls-panel">
        {(
          <Controls 
            graphRef={graphRef} 
            canvasRef={canvasRef} 
            pointPositions={pointPositions} 
            links={links} 
            setPointPositions={setPointPositions}
            setLinks={setLinks}
            setSelectedNode={setSelectedNode} 
            setAnalysisResult={setAnalysisResult}
          />
        )}
      </div>
      
      <div ref={canvasRef}/>
      <div ref={graphRef} id="graph" />    
      {/* <div id="graph" ref={graphRef}></div> */}
      <div id="tooltip" />

      {selectedNode && (
        <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000 }}>
          <NodeInfo
            id={selectedNode.id}
            name={selectedNode.name}
            namespace={selectedNode.namespace}
            def={selectedNode.def}
            synonym={selectedNode.synonym}
            is_a={selectedNode.is_a}
          />
        </div>
      )}

      {analysisResult && (
        <AnalysisPanel
          result={analysisResult}
          onClose={() => setAnalysisResult(null)}
        />
      )}

      <Stats
        nodeCount={stats.nodeCount}
        edgeCount={stats.edgeCount}
        pathCount={stats.pathCount}
      />
    </div>
  );
};

export default App;
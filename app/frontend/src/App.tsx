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

    return { nodeCount, edgeCount };
  }, [pointPositions, links]);

  return (
    <div id="layout" className="bg-black text-gray-200 min-h-screen flex flex-col">
      <div id="controls-panel" className="flex-none">
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
      </div>
      
      <div ref={canvasRef} className="flex-grow" />
      <div ref={graphRef} id="graph" className="flex-grow" />    
      <div id="tooltip" className="absolute border rounded" />
  
      {selectedNode && (
        <div className="node-info fixed top-4 right-4 p-4 rounded-lg shadow-lg">
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
        pathCount={0}
      />
    </div>
  );
};

export default App;
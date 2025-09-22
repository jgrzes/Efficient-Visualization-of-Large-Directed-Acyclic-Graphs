import React, { useRef, useMemo, useState } from 'react';
import './style.css';
import { initialPointPositions, initialLinks } from './data-gen';
import Controls from './components/Controls';
import Stats from './components/Stats';
import { useGraph } from './hooks/useGraph';
import NodeInfo, { NodeInfoProps } from './components/NodeInfo';
import AnalysisPanel from './components/AnalysisPanel';
import Sidebar from './components/Sidebar';
import OntologyModal from './components/OntologyModal';
import LoadingModal from './components/LoadingModal';
import ConfirmModal from './components/ConfirmModal';
import RightSidebar from './components/RightSidebar';

import { Upload, Search, Settings, Focus, RotateCcw, LineChart, Download } from "lucide-react";

const App: React.FC = () => {
  const graphRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [pointPositions, setPointPositions] = useState<Float32Array>(new Float32Array(initialPointPositions));
  const [links, setLinks] = useState<number[]>([...initialLinks]);
  const [selectedNode, setSelectedNode] = useState<NodeInfoProps | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [showOntologyOptions, setShowOntologyOptions] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [setShowSearch] = useState(false);
  const [results, setResults] = useState<NodeInfoProps[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { fitView, resetView } = useGraph(graphRef, canvasRef, pointPositions!, links!, setSelectedNode);

  const stats = useMemo(() => {
    const nodeCount = pointPositions ? pointPositions.length / 2 : 0;
    const edgeCount = links ? links.length / 2 : 0;

    return { nodeCount, edgeCount };
  }, [pointPositions, links]);

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log(file?.arrayBuffer);
    if (!file) return;
    setSelectedFile(file);
    setShowOntologyOptions(true);
  };

  const uploadFileWithNamespace = async (namespace: string) => {
    console.log("Uploading file with namespace:", namespace);
    if (!selectedFile) return;

    setShowOntologyOptions(false);
    setLoading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("root", namespace);

    try {
      const response = await fetch("http://localhost:30301/flask_make_graph_structure", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log("canvas_positions:", data.canvas_positions);
      const newPositions = new Float32Array(data.canvas_positions);
      const newLinks = [...data.links];
      setPointPositions(newPositions);
      setLinks(newLinks);
      setSelectedNode(null);
      setSelectedFile(null);

      // TODO: przekaż canvas_positions do kosmografu
    } catch (err) {
      console.error("❌ Upload error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportClick = () => {
    // konwersja pozycji węzłów: { 0: [x, y], 1: [x, y], ... }
    const nodePositions: Record<number, [number, number]> = {};
    for (let i = 0; i < pointPositions.length; i += 2) {
      nodePositions[i / 2] = [pointPositions[i], pointPositions[i + 1]];
    }

    // konwersja krawędzi: { 0: [source, target], 1: [source, target], ... }
    const linkMap: Record<number, [number, number]> = {};
    for (let i = 0; i < links.length; i += 2) {
      linkMap[i / 2] = [links[i], links[i + 1]];
    }

    const exportData = {
      pointPositions: nodePositions,
      links: linkMap,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'graph-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAnalyzeClick = async () => {
    setShowConfirm(true);
  };

  const confirmAnalyze = async () => {
    setShowConfirm(false);
    try {
      const response = await fetch("http://localhost:30301/analyze_graph", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed");

      const result = await response.json();
      setAnalysisResult(result);
    } catch (err) {
      console.error("Analyze fetch failed:", err);
    }
  };

  const handleSearch = async (field: string, query: string) => {
    try {
      setError(null);
      setResults([]);

      const res = await fetch("http://localhost:30301/search_node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, query }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.message || "Search failed");
        return;
      }

      const data = await res.json();

      setResults(Array.isArray(data) ? data : [data]);
    } catch (e) {
      setError("Connection error");
    }
  };
  return (
    <div id="layout" className="bg-black text-gray-200 flex-col">
      <div ref={canvasRef} className="flex-grow" />
      <div ref={graphRef} id="graph" className="flex-grow" />
      <div id="tooltip" className="absolute border rounded" />

      {selectedNode && (
        <div
          className="node-info fixed bottom-4 left-1/2 -translate-x-1/2 p-4 rounded-lg shadow-lg bg-black/70 backdrop-blur-md"
          style={{ width: 'calc(100vw - 600px)', maxWidth: '90vw' }}
        >
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

      <Sidebar
      items={[
        { label: "Load data", icon: <Upload size={20} />, onClick: handleLoadClick },
        { label: "Fit view", icon: <Focus size={20} />, onClick: fitView },
        { label: "Reset view", icon: <RotateCcw size={20} />, onClick: resetView },
        { label: "Export", icon: <Download size={20} />, onClick: handleExportClick },
        { label: "Analyze", icon: <LineChart size={20} />, onClick: handleAnalyzeClick },
      ]}
      bottomItems={[
        { label: "Settings", icon: <Settings size={20} />, onClick: () => console.log("Settings") },
      ]}
    />


      {/* TO BE MOVED */}
      {/* <Stats
        nodeCount={stats.nodeCount}
        edgeCount={stats.edgeCount}
      /> */}

      <input
        type="file"
        accept=".txt,.obo"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Modal wyboru kategorii */}
      {showOntologyOptions && selectedFile && (
        <OntologyModal
          fileName={selectedFile.name}
          onSelect={(namespace) => uploadFileWithNamespace(namespace)}
          onCancel={() => setShowOntologyOptions(false)}
        />
      )}

      {loading && <LoadingModal />}
      {showConfirm && (
        <ConfirmModal
          message="This will analyze the graph and may take a while. Do you want to continue?"
          onConfirm={confirmAnalyze}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <RightSidebar
        onSearch={handleSearch}
        results={results}
        onSelectNode={(node) => setSelectedNode(node)}
      />
    </div>
  );
};

export default App;

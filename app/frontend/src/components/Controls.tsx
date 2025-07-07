import React, { useRef, RefObject, Dispatch, SetStateAction} from 'react';
import ControlButton from './ControlButton';
import { NodeInfoProps } from './NodeInfo';


interface ControlsProps {
  graphRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLDivElement | null>;
  pointPositions: Float32Array;
  links: number[];
  setPointPositions: Dispatch<SetStateAction<Float32Array>>;
  setLinks: Dispatch<SetStateAction<number[]>>;
  setSelectedNode: Dispatch<SetStateAction<NodeInfoProps | null>>;
  setAnalysisResult: Dispatch<SetStateAction<any | null>>;
}

const Controls: React.FC<ControlsProps> = ({ graphRef, canvasRef, pointPositions, links, setPointPositions, setLinks, setSelectedNode, setAnalysisResult, }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [showOntologyOptions, setShowOntologyOptions] = React.useState<boolean>(false);

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
      // graphRef?.setPointPositions(new Float32Array(data.canvas_positions));
      // useGraph(graphRef, canvasRef, new Float32Array(data.canvas_positions)!, links!, setSelectedNode);
      const newPositions = new Float32Array(data.canvas_positions);
      const newLinks = [...data.links];
      setPointPositions(newPositions);
      setLinks(newLinks);
      setSelectedNode(null);
      setSelectedFile(null);
      setShowOntologyOptions(false);

      // TODO: przekaż canvas_positions do kosmografu
    } catch (err) {
      console.error("❌ Upload error:", err);
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
    const confirm = window.confirm("This will analyze the graph and may take a while. Do you want to continue?");
    if (!confirm) return;

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


  return (
    <div id="controls">
      <ControlButton id="load" label="Load data" onClick={handleLoadClick} />
      {showOntologyOptions && (
        <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <p>Choose GO category: <strong>{selectedFile.name}</strong></p>
          <button onClick={() => uploadFileWithNamespace("cellular_component")}>Cellular Component</button>
          <button onClick={() => uploadFileWithNamespace("molecular_function")}>Molecular Function</button>
          <button onClick={() => uploadFileWithNamespace("biological_process")}>Biological Process</button>
        </div>
      )}
      <ControlButton id="fit-view" label="Fit view" />
      <ControlButton id="reset" label="Reset view" />
      <ControlButton id="export" label="Export" onClick={handleExportClick} />
      <ControlButton id="analyze" label="Analyze" onClick={handleAnalyzeClick} />

      {/* ukryty input do obsługi pliku */}
      <input
      type="file"
      accept=".txt,.obo"
      ref={fileInputRef}
      onChange={handleFileUpload}
      style={{ display: 'none' }}
      />
    </div>
  );
};

export default Controls;

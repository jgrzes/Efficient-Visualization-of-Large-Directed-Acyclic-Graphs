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

const Controls: React.FC<ControlsProps> = ({pointPositions, links, setPointPositions, setLinks, setSelectedNode, setAnalysisResult, }) => {
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
    <div
      id="controls"
      className="fixed top-4 left-4 p-4 bg-black rounded-lg shadow-lg flex flex-col gap-2 text-gray-200 w-[300px] border"
    >
      <ControlButton
        id="load"
        label="Load data"
        onClick={handleLoadClick}
      />
      {showOntologyOptions && selectedFile && (
        <div className="ontology-options mt-4 p-4 bg-black rounded shadow-lg border">
          <p className="text-sm font-medium mb-2 text-gray-300">
            Choose GO category: <strong className="text-gray-100">{selectedFile.name}</strong>
          </p>
          <div className="button-group flex flex-col gap-2 bg-black p-2 rounded">
            <button
              onClick={() => uploadFileWithNamespace("cellular_component")}
              className="px-4 py-2 bg-transparent border border-white text-gray-200 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 cursor-pointer"
            >
              Cellular Component
            </button>
            <button
              onClick={() => uploadFileWithNamespace("molecular_function")}
              className="px-4 py-2 bg-transparent border border-white text-gray-200 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 cursor-pointer"
            >
              Molecular Function
            </button>
            <button
              onClick={() => uploadFileWithNamespace("biological_process")}
              className="px-4 py-2 bg-transparent border border-white text-gray-200 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 cursor-pointer"
            >
              Biological Process
            </button>
          </div>
        </div>
      )}

      <ControlButton
        id="fit-view"
        label="Fit view"
        className="w-full px-4 py-2 bg-gray-700 text-gray-200 rounded hover:bg-gray-600"
      />
      <ControlButton
        id="reset"
        label="Reset view"
        className="w-full px-4 py-2 bg-gray-700 text-gray-200 rounded hover:bg-gray-600"
      />
      <ControlButton
        id="export"
        label="Export"
        onClick={handleExportClick}
        className="w-full px-4 py-2 bg-gray-700 text-gray-200 rounded hover:bg-gray-600"
      />
      <ControlButton
        id="analyze"
        label="Analyze"
        onClick={handleAnalyzeClick}
        className="w-full px-4 py-2 bg-gray-700 text-gray-200 rounded hover:bg-gray-600"
      />

      {/* ukryty input do obsługi pliku */}
      <input
        type="file"
        accept=".txt,.obo"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
  
};

export default Controls;

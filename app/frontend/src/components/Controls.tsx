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
  setSelectedNode: Dispatch<SetStateAction<NodeInfoProps | null>>
}

const Controls: React.FC<ControlsProps> = ({ graphRef, canvasRef, pointPositions, links, setPointPositions, setLinks, setSelectedNode }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log(file?.arrayBuffer);
    if (!file) return;
    if (graphRef === null) console.log("Graph undefined");

    const formData = new FormData();
    formData.append("file", file);

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



  return (
    <div id="controls">
      <ControlButton id="load" label="Load data" onClick={handleLoadClick} />
      <ControlButton id="fit-view" label="Fit view" />
      <ControlButton id="reset" label="Reset view" />
      <ControlButton id="export" label="Export" onClick={handleExportClick} />

      {/* ukryty input do obsługi pliku */}
      <input
        type="file"
        accept=".txt"
        ref={fileInputRef}
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default Controls;

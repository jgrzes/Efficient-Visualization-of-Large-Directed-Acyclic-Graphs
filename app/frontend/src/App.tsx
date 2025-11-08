import React, { useRef, useMemo, useState, ChangeEvent } from 'react';
import './style.css';
import {
  initialPointPositions,
  initialLinks
} from './data-gen';

import Stats from './components/Stats';
import NodeInfo, { NodeInfoProps } from './components/NodeInfo';
import AnalysisPanel from './components/AnalysisPanel';
import Sidebar from './components/Sidebar';
import OntologyModal from './components/OntologyModal';
import LoadingModal from './components/LoadingModal';
import ConfirmModal from './components/ConfirmModal';
import RightSidebar from './components/RightSidebar';

import { useGraph } from './hooks/useGraph';
import {
  Upload,
  Settings,
  Focus,
  RotateCcw,
  LineChart,
  Download,
  Save,
  Link as LinkIcon
} from 'lucide-react';

const API_BASE = 'http://localhost:30301';

const App: React.FC = () => {
  // Refs
  const graphRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Graph state
  const [pointPositions, setPointPositions] = useState<Float32Array>(
    new Float32Array(initialPointPositions)
  );
  const [links, setLinks] = useState<Float32Array>(
    new Float32Array(initialLinks)
  );
  const [selectedNode, setSelectedNode] = useState<NodeInfoProps | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  // UI state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showOntologyOptions, setShowOntologyOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [results, setResults] = useState<NodeInfoProps[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Helpers
  const arrayFromF32 = (f: Float32Array) => Array.from(f);

  // Graph controls
  const { fitView, resetView, selectNodeByIndex } = useGraph(
    graphRef,
    canvasRef,
    pointPositions,
    links,
    setSelectedNode
  );

  // Stats
  const stats = useMemo(() => ({
    nodeCount: pointPositions.length / 2,
    edgeCount: links.length / 2
  }), [pointPositions, links]);

  /** AUTO LOAD GRAPH FROM LINK ?g=... **/
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const byQuery = params.get('g');
    const byHash = window.location.hash ? window.location.hash.slice(1) : null;
    const g = byQuery || byHash;
    if (!g) return;

    setLoading(true);
    fetchGraphByHash(g)
      .then((data) => {
        setPointPositions(new Float32Array(data.canvas_positions));
        setLinks(new Float32Array(data.links));
        setSelectedNode(null);
      })
      .catch((err) => {
        console.error('Auto-load failed:', err);
        alert('Failed to load graph from link.');
      })
      .finally(() => setLoading(false));
  }, []);

  /** FILE HANDLING **/
  const handleLoadClick = () => fileInputRef.current?.click();

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setShowOntologyOptions(true);
  };

  const uploadFileWithNamespace = async (namespace: string) => {
    if (!selectedFile) return;
    setShowOntologyOptions(false);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('root', namespace);

      const response = await fetch(`${API_BASE}/flask_make_graph_structure`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      setPointPositions(new Float32Array(data.canvas_positions));
      setLinks(new Float32Array(data.links));
      setSelectedNode(null);
      setSelectedFile(null);
    } catch (err) {
      console.error('❌ Upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  /** EXPORT **/
  const handleExportClick = () => {
    const nodePositions: Record<number, [number, number]> = {};
    for (let i = 0; i < pointPositions.length; i += 2)
      nodePositions[i / 2] = [pointPositions[i], pointPositions[i + 1]];

    const linkMap: Record<number, [number, number]> = {};
    for (let i = 0; i < links.length; i += 2)
      linkMap[i / 2] = [links[i], links[i + 1]];

    const exportData = { pointPositions: nodePositions, links: linkMap };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'graph-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  /** ANALYSIS **/
  const handleAnalyzeClick = () => setShowConfirm(true);

  const confirmAnalyze = async () => {
    setShowConfirm(false);
    try {
      const response = await fetch(`${API_BASE}/analyze_graph`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed');
      const result = await response.json();
      setAnalysisResult(result);
    } catch (err) {
      console.error('Analyze fetch failed:', err);
    }
  };

  /** SEARCH **/
  const handleSearch = async (field: string, query: string) => {
    try {
      setError(null);
      setResults([]);

      const res = await fetch(`${API_BASE}/search_node`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, query })
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.message || 'Search failed');
        return;
      }

      const data = await res.json();
      setResults(Array.isArray(data) ? data : [data]);
    } catch {
      setError('Connection error');
    }
  };

  /** NODE SELECTION **/
  const handleSelectNode = async (nodeId: string) => {
    try {
      const response = await fetch(`${API_BASE}/node_index/${nodeId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      selectNodeByIndex(data.index);
    } catch (error) {
      console.error('Failed to fetch node index:', error);
    }
  };



  /** FETCH GRAPH BY HASH **/
  async function fetchGraphByHash(hash: string) {
    const res = await fetch(`${API_BASE}/graphs/${hash}`);
    if (!res.ok) throw new Error(`Graph ${hash} not found`);
    return res.json() as Promise<{
      canvas_positions: number[];
      links: number[];
      meta?: Record<string, unknown>;
    }>;
  }

  /** POST GRAPH TO DB **/
  async function postGraphToDB(canvas_positions: number[], links: number[]) {
    const res = await fetch(`${API_BASE}/graphs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ canvas_positions, links }),
    });
    if (!res.ok) throw new Error('Save failed');
    return res.json() as Promise<{ hash: string; url: string }>;
  }

  /** SAVE GRAPH TO DB (button handler) **/
  const saveToDb = async () => {
    try {
      setLoading(true);

      const payloadPos = arrayFromF32(pointPositions);
      const payloadLinks = arrayFromF32(links);

      const { hash } = await postGraphToDB(payloadPos, payloadLinks);
      const share = `${window.location.origin}/?g=${hash}`;

      const url = new URL(window.location.href);
      url.searchParams.set('g', hash);
      window.history.replaceState({}, '', url.toString());

      await navigator.clipboard.writeText(share);
      alert(`Saved! Link copied to clipboard:\n${share}`);
    } catch (e) {
      console.error(e);
      alert('Failed to save the graph to the database.');
    } finally {
      setLoading(false);
    }
  };

  /** LOAD GRAPH FROM DB BY HASH (button handler) **/
  const loadFromLink = async () => {
    const hash = window.prompt('Pass hash of the graph:');
    if (!hash) return;

    try {
      setLoading(true);
      const data = await fetchGraphByHash(hash.trim());
      setPointPositions(new Float32Array(data.canvas_positions));
      setLinks(new Float32Array(data.links));
      setSelectedNode(null);

      const url = new URL(window.location.href);
      url.searchParams.set('g', hash.trim());
      window.history.replaceState({}, '', url.toString());

      setTimeout(() => fitView(), 100);
    } catch (e) {
      console.error(e);
      alert('Graph not found for the given hash!');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div id="layout" className="bg-black text-gray-200 flex-col">
      <div ref={canvasRef} className="flex-grow" />
      <div ref={graphRef} id="graph" className="flex-grow" />
      <div id="tooltip" className="absolute border rounded" />

      {selectedNode && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 p-4 rounded-lg shadow-lg">
          <NodeInfo {...selectedNode} />
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
          { label: 'Load data', icon: <Upload size={20} />, onClick: handleLoadClick },
          { label: 'Fit view', icon: <Focus size={20} />, onClick: fitView },
          { label: 'Reset view', icon: <RotateCcw size={20} />, onClick: resetView },
          { label: 'Export', icon: <Download size={20} />, onClick: handleExportClick },
          { label: 'Analyze', icon: <LineChart size={20} />, onClick: handleAnalyzeClick },
          { label: 'Save to DB', icon: <Save size={20} />, onClick: saveToDb },
          { label: 'Load from link', icon: <LinkIcon size={20} />, onClick: loadFromLink },
        ]}
      />

      <input
        type="file"
        accept=".txt,.obo"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
      />

      {showOntologyOptions && selectedFile && (
        <OntologyModal
          fileName={selectedFile.name}
          onSelect={uploadFileWithNamespace}
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
        onSelectNode={(node) => handleSelectNode(node.id)}
      />
    </div>
  );
};

export default App;

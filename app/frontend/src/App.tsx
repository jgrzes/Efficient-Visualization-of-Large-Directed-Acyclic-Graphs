import React, { useRef, useState, ChangeEvent } from 'react';
import './style.css';
import {
  initialPointPositions,
  initialLinks
} from './data-gen';


import NodeInfo, { NodeInfoProps } from './components/NodeInfo';
import AnalysisPanel from './components/AnalysisPanel';
import Sidebar from './components/Sidebar';
import OntologyModal from './components/OntologyModal';
import LoadingModal from './components/LoadingModal';
import ConfirmModal from './components/ConfirmModal';
import RightSidebar from './components/rightsidebar/RightSidebar';

import { useGraph } from './hooks/useGraph';
import {
  Upload,
  Settings,
  Focus,
  RotateCcw,
  LineChart,
  Download
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
  
  // Search filters state
  type SearchFilter = {
    id: string;
    field: string;
    query: string;
  };

  const [filters, setFilters] = React.useState<SearchFilter[]>([]);

  // Search options state
  const [searchOptions, setSearchOptions] = React.useState({
    matchCase: false,
    matchWords: false,
  });

  // RightSidebar state
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<"search" | "favorites" | "comments" | "graph">("search");

  // Graph controls
  const { fitView, resetView, selectNodeByIndex } = useGraph(
    graphRef,
    canvasRef,
    pointPositions,
    links,
    setSelectedNode
  );


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
      console.error('Upload error:', err);
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
  // wysłanie zapytania na backend na podstawie AKTUALNYCH filtrów
  const performSearch = async (filtersToApply: SearchFilter[]) => {
    if (filtersToApply.length === 0) {
      setResults([]);
      setError(null);
      return;
    }

    try {
      setError(null);
      setResults([]);

      const res = await fetch(`${API_BASE}/search_node`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters: filtersToApply.map(({ field, query }) => ({ field, query })),
          matchCase: searchOptions.matchCase,
          matchWords: searchOptions.matchWords,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.message || "Search failed");
        return;
      }

      const data = await res.json();
      setResults(Array.isArray(data) ? data : [data]);
    } catch {
      setError("Connection error");
    }
  };


  // wywoływane z SearchBar po Enter – DODANIE FILTRA + nowe zapytanie
  const handleSearch = (field: string, query: string) => {
    const q = query.trim();
    if (!q) return;

    setFilters((prev) => {
      const alreadyExists = prev.some(
        (f) => f.field === field && f.query === q
      );

      if (alreadyExists) {
        return prev;
      }

      const newFilter: SearchFilter = {
        id: crypto.randomUUID(),
        field,
        query: q,
      };

      const updated = [...prev, newFilter];
      void performSearch(updated);
      return updated;
    });
  };


  // usunięcie filtra z listy + nowe zapytanie
  const handleRemoveFilter = (id: string) => {
    setFilters((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      void performSearch(updated);
      return updated;
    });
  };

  // efekt wywołujący zapytanie przy zmianie opcji wyszukiwania
  React.useEffect(() => {
    if (filters.length === 0) return;
    void performSearch(filters);
  }, [searchOptions, filters]); // gdy zmienią się opcje albo lista filtrów

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
          { label: 'Analyze', icon: <LineChart size={20} />, onClick: handleAnalyzeClick }
        ]}
        bottomItems={[
          { label: 'Settings', icon: <Settings size={20} />, onClick: () => console.log('Settings') }
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
        onSelectNode={(node) => selectNodeByIndex(node.index)}
        error={error}
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOptionsChange={setSearchOptions}
        filters={filters}
        onRemoveFilter={handleRemoveFilter}
      />
    </div>
  );
};

export default App;

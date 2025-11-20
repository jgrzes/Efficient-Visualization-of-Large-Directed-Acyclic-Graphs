// import React, { useRef, useMemo, useState, ChangeEvent, createContext } from 'react';
import React, { useRef, useState, ChangeEvent, createContext, useContext } from 'react';
import './style.css';
import {
  initialPointPositions,
  initialLinks
} from './data-gen';

// import Stats from './components/Stats';
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
  // Settings,
  Focus,
  RotateCcw,
  LineChart,
  Download,
  Save,
  Link as LinkIcon
} from 'lucide-react';

const API_BASE = 'http://localhost:30301';

export const AppContext = createContext<{
  currentGraphUUID: string | null, 
  setCurrentGraphUUID: React.Dispatch<React.SetStateAction<string | null>>
} | null>(null);

const MainAppContext: React.FC = () => {
// const MainAppContext: React.FC = () => {
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
  const [graphConfig, setGraphConfig] = useState<{
    spaceSize: number;
    pointSize: number;
  } | null>({spaceSize: 256, pointSize: 1});

  // const [currentGraphUUID, setCurrentGraphUUID] = useState<string | null>("");

  const appContext = useContext(AppContext);
  const currentGraphUUID = appContext!.currentGraphUUID;
  const setCurrentGraphUUID = appContext!.setCurrentGraphUUID;

  const [currentGraphHash, setCurrentGraphHash] = useState<string | null>("");

  // UI state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showOntologyOptions, setShowOntologyOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [results, setResults] = useState<NodeInfoProps[]>([]);
  // const [error, setError] = useState<string | null>(null);

  // Helpers
  const arrayFromF32 = (f: Float32Array) => Array.from(f);

  // Graph controls
  const { fitView, resetView, selectNodeByIndex } = useGraph(
    graphRef,
    // canvasRef,
    pointPositions,
    links,
    setSelectedNode,
    graphConfig || undefined
  );

  React.useEffect(() => {console.log("Current graph uuid: " + currentGraphUUID);}, [currentGraphUUID]);

  // Stats
  // const stats = useMemo(() => ({
  //   nodeCount: pointPositions.length / 2,
  //   edgeCount: links.length / 2
  // }), [pointPositions, links]);

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

        if (data.config) {
          setGraphConfig({
            spaceSize: data.config.space_size || 1000,
            pointSize: data.config.point_size || 5
          });
        } else {
          setGraphConfig(null);
        }
      })
      .catch((err) => {
        console.error('Auto-load failed:', err);
        alert('Failed to load graph from link.');
      })
      .finally(() => setLoading(false));
  }, []);

  /** LOAD GENERAL GRAPH FROM JSON FILE **/
  const loadJsonGraph = async (file: File) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/load_graph_from_file`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let errMsg = 'Failed to load graph from JSON file.';
        try {
          const errBody = await res.json();
          if (errBody?.error) errMsg = errBody.error;
          console.error('JSON load error:', errBody);
        } catch {
        }
        alert(errMsg);
        return;
      }

      const data = await res.json();
      console.log('JSON load response:', data);

      if (data.uuid) {
        setCurrentGraphUUID(data.uuid);
      } else {
        console.warn('JSON response has no uuid field; save_graph may not work correctly.');
      }
      if (data.graph_hash) {
        setCurrentGraphHash(data.graph_hash);
      }

      setPointPositions(new Float32Array(data.canvas_positions));
      setLinks(new Float32Array(data.links));
      setSelectedNode(null);

      if (data.config) {
        setGraphConfig({
          spaceSize: data.config.space_size ?? 1000,
          pointSize: data.config.point_size ?? 5,
        });
      } else {
        setGraphConfig(null);
      }

    } catch (err) {
      console.error('Error while loading JSON graph:', err);
      alert('Unexpected error while loading JSON graph.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };


  /** FILE HANDLING **/
  const handleLoadClick = () => fileInputRef.current?.click();

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'obo' || ext === 'txt') { // ontology formats
      setSelectedFile(file);
      setShowOntologyOptions(true);
      return;
    }

    if (ext === 'json') { // custom general graph format
      loadJsonGraph(file);
      return;
    }

    alert(`Unhandled file format: .${ext ?? 'unknown'}`);
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
      console.log("Received graph uuid: " + data.uuid);
      setCurrentGraphUUID(data.uuid);
      // console.log("Graph uuid set on frontend: " + currentGraphUUID);
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
  const handleExportClick = async () => {
    if (!currentGraphUUID) {
      alert('No graph loaded, cannot export.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/export_graph/${currentGraphUUID}`);
      if (!res.ok) {
        console.error('Export failed, status:', res.status);
        alert('Failed to export graph from backend.');
        return;
      }

      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });

      const filename = 'graph-data.json';

      if ((window as any).showSaveFilePicker) {
        const opts = {
          suggestedName: filename,
          types: [
            {
              description: 'JSON Files',
              accept: { 'application/json': ['.json'] },
            },
          ],
        };
        const handle = await (window as any).showSaveFilePicker(opts);
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();

      } else if ((navigator as any).msSaveOrOpenBlob) {
        (navigator as any).msSaveOrOpenBlob(blob, filename);

      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  /** ANALYSIS **/
  const handleAnalyzeClick = () => setShowConfirm(true);

  const confirmAnalyze = async () => {
    setShowConfirm(false);
    try {
      const response = await fetch(`${API_BASE}/analyze_graph/${currentGraphUUID}`, {
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
      // setError(null);
      setResults([]);

      const res = await fetch(`${API_BASE}/search_node/${currentGraphUUID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, query })
      });

      if (!res.ok) {
        // const err = await res.json();
        // setError(err.message || 'Search failed');
        return;
      }

      const data = await res.json();
      setResults(Array.isArray(data) ? data : [data]);
    } catch {
      // setError('Connection error');
    }
  };

  /** NODE SELECTION **/
  const handleSelectNode = async (nodeName: string) => {
    if (!currentGraphUUID || !nodeName) return;

    try {
      const encodedName = encodeURIComponent(nodeName);
      const res = await fetch(`${API_BASE}/node_index/${currentGraphUUID}/${encodedName}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      selectNodeByIndex(data.index);
    } catch (err) {
      console.error('Failed to fetch node index:', err);
    }
  };

  /** FETCH GRAPH BY HASH **/
  async function fetchGraphByHash(hash: string) {
    const res = await fetch(`${API_BASE}/load_graph/${hash}`);
    if (!res.ok) throw new Error(`Graph ${hash} not found`);
    return res.json() as Promise<{
      graph_hash: string, 
      uuid: string, 
      canvas_positions: number[];
      links: number[];
      meta?: Record<string, unknown>;
      config?: {
        space_size?: number;
        point_size?: number;
      };
    }>;
  }


  /** POST GRAPH TO DB **/
  async function postGraphToDB(canvas_positions: number[], links: number[]) {
    const res = await fetch(`${API_BASE}/save_graph/${currentGraphUUID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        canvas_positions, 
        links, 
        graph_hash: currentGraphHash, 
        point_size: graphConfig?.pointSize ?? null, 
        space_size: graphConfig?.spaceSize ?? null, 
      }),
    });
    if (!res.ok) throw new Error('Save failed');
    return res.json() as Promise<{ hash: string; }>;
  }

  /** SAVE GRAPH TO DB (button handler) **/
  const saveToDb = async () => {
    try {
      setLoading(true);

      const payloadPos = arrayFromF32(pointPositions);
      const payloadLinks = arrayFromF32(links);

      const { hash } = await postGraphToDB(payloadPos, payloadLinks);
      setCurrentGraphHash(hash);
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
      setCurrentGraphUUID(data.uuid);
      setCurrentGraphHash(data.graph_hash);
      setPointPositions(new Float32Array(data.canvas_positions));
      setLinks(new Float32Array(data.links));
      setSelectedNode(null);

      if (data.config) {
        setGraphConfig({
          spaceSize: data.config.space_size || 1000,
          pointSize: data.config.point_size || 5
        });
      }

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
    <AppContext.Provider value={{ currentGraphUUID, setCurrentGraphUUID }}>
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
        accept=".txt,.obo,.json"
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
        onSelectNode={(node) => handleSelectNode(node.name !== undefined ? node.name : "")}
      />
    </div>
    </AppContext.Provider>
  );
};

// export default function App() {
//   const [currentGraphUUID, setCurrentGraphUUID] = useState<string | null>("");
//   return (
//     <AppContext.Provider value={{currentGraphUUID, setCurrentGraphUUID}}>
//       <MainAppContext />
//     </AppContext.Provider>
//   )
// }

const App: React.FC = () => {
  const [currentGraphUUID, setCurrentGraphUUID] = useState<string | null>("");
  return (
    <AppContext.Provider value={{currentGraphUUID, setCurrentGraphUUID}}>
      <MainAppContext />
    </AppContext.Provider>
  )
}

export default App;

import React, { useRef, useState, ChangeEvent, createContext, useContext } from 'react';
import './style.css';
import {
  initialPointPositions,
  initialLinks
} from './data-gen';

import { NodeInfoProps } from './components/leftsidebar/NodeInfo';
import AnalysisPanel from './components/AnalysisPanel';
import LeftSidebar from './components/leftsidebar/LeftSidebar';
import ToolTip from './components/ToolTip';
import OntologyModal from './components/OntologyModal';
import LoadingModal from './components/LoadingModal';
import ConfirmModal from './components/ConfirmModal';
import RightSidebar from './components/rightsidebar/RightSidebar';
import SaveGraphModal from "./components/SaveGraphModal";
import LoadGraphModal from "./components/LoadGraphModal";
import GraphListModal from "./components/GraphListModal";
import LoadSourceModal from "./components/LoadSourceModal";
import SettingsModal from './components/SettingsModal';

import { useGraph } from './hooks/useGraph';

const API_BASE = 'http://localhost:30301';

export const AppContext = createContext<{
  currentGraphUUID: string | null,
  setCurrentGraphUUID: React.Dispatch<React.SetStateAction<string | null>>
} | null>(null);

const MainAppContext: React.FC = () => {
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
  } | null>({ spaceSize: 256, pointSize: 1 });

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
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"search" | "favorites" | "comments" | "graph">("search");

  // SaveGraphModal state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveModalHash, setSaveModalHash] = useState<string | null>(null);
  const [saveModalError, setSaveModalError] = useState<string | null>(null);
  const [saveModalLoading, setSaveModalLoading] = useState(false);

  // LoadGraphModal state (load by hash)
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadLoading, setLoadLoading] = useState(false);

  // DB loading (groups + GraphListModal)
  type GraphListItem = {
    id: string;
    name?: string;
    num_of_vertices?: number;
    last_entry_update?: string;
  };

  const [graphList, setGraphList] = useState<GraphListItem[]>([]);
  const [graphListOpen, setGraphListOpen] = useState(false);
  const [loadFromDbError, setLoadFromDbError] = useState<string | null>(null);
  const [loadFromDbLoading, setLoadFromDbLoading] = useState(false);

  // LoadSourceModal state
  const [loadSourceModalOpen, setLoadSourceModalOpen] = useState(false);

  // Settings modal state
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const handleOpenSettings = () => {
    console.log("Opening settings modal");
    setSettingsModalOpen(true);
  };

  // Helpers
  const arrayFromF32 = (f: Float32Array) => Array.from(f);

  // Graph controls
  const { fitView, resetView, selectNodeByIndex, tooltips } = useGraph(
    graphRef,
    pointPositions,
    links,
    setSelectedNode,
    graphConfig || undefined
  );

  React.useEffect(() => {
    console.log("Current graph uuid: " + currentGraphUUID);
  }, [currentGraphUUID]);

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
            spaceSize: data.config.space_size || 256,
            pointSize: data.config.point_size || 1
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

      const res = await fetch(`${API_BASE}/load_graph_from_json`, {
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
          spaceSize: data.config.space_size ?? 256,
          pointSize: data.config.point_size ?? 1,
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

  /** FILE / DB HANDLING (load_data) **/
  const handleLoadClick = () => {
    setLoadFromDbError(null);
    setLoadSourceModalOpen(true);
  };

  const handleLoadFromFile = () => {
    setLoadSourceModalOpen(false);
    fileInputRef.current?.click();
  };

  const handleLoadFromDbSubmit = async (groupName: string, password: string) => {
    try {
      setLoadFromDbLoading(true);
      setLoadFromDbError(null);

      const res = await fetch(
        `${API_BASE}/groups/${encodeURIComponent(groupName)}/graphs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        }
      );

      if (!res.ok) {
        let errMsg = 'Failed to load graphs from database.';
        try {
          const errBody = await res.json();
          if (errBody?.error) errMsg = errBody.error;
        } catch {
          // ignore
        }
        setLoadFromDbError(errMsg);
        return;
      }

      const list = await res.json() as GraphListItem[];

      if (!list.length) {
        setLoadFromDbError('No graphs in this group.');
        return;
      }

      setGraphList(list);
      setGraphListOpen(true);
      setLoadSourceModalOpen(false);
    } catch (err) {
      console.error('Error while loading graphs from DB:', err);
      const msg = 'Unexpected error while loading graphs from DB.';
      setLoadFromDbError(msg);
    } finally {
      setLoadFromDbLoading(false);
    }
  };

  /** FILE HANDLING (input onChange) **/
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
  // sending search request
  const performSearch = async (filtersToApply: SearchFilter[]) => {
    if (filtersToApply.length === 0) {
      setResults([]);
      setError(null);
      return;
    }

    try {
      setResults([]);

      const res = await fetch(`${API_BASE}/search_node/${currentGraphUUID}`, {
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
        setError(err.error);
        return;
      }

      const data = await res.json();
      setError(null);
      setResults(Array.isArray(data) ? data : [data]);
    } catch {
      setError("Connection error");
    }
  };


  // sending new search after adding a filter
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


  // remove filter and re-search
  const handleRemoveFilter = (id: string) => {
    setFilters((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      void performSearch(updated);
      return updated;
    });
  };

  // effect to re-search when search options change
  React.useEffect(() => {
    if (filters.length === 0) return;
    void performSearch(filters);
  }, [searchOptions, filters]);

  /** FETCH GRAPH BY HASH / ID **/
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
  async function postGraphToDB(
    canvas_positions: number[],
    links: number[],
    group?: string,
    password?: string
  ) {
    const body: any = {
      canvas_positions,
      links,
      graph_hash: currentGraphHash,
      point_size: graphConfig?.pointSize ?? null,
      space_size: graphConfig?.spaceSize ?? null,
    };

    if (group && password) {
      body.group_name = group;
      body.group_password = password;
    }

    const res = await fetch(`${API_BASE}/save_graph/${currentGraphUUID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Save failed');
    return res.json() as Promise<{ hash: string; }>;
  }

  /** SAVE GRAPH TO DB (button handler) **/
  const saveToDb = () => {
    setSaveModalError(null);
    setSaveModalHash(null);
    setSaveModalOpen(true);
  };

  /** SAVE GRAPH MODAL SUBMIT HANDLER **/
  const handleSaveModalSubmit = async (groupName: string | null, password: string | null) => {
    try {
      setSaveModalLoading(true);
      setSaveModalError(null);
      setSaveModalHash(null);

      const payloadPos = arrayFromF32(pointPositions);
      const payloadLinks = arrayFromF32(links);

      const { hash } = await postGraphToDB(
        payloadPos,
        payloadLinks,
        groupName ?? undefined,
        password ?? undefined
      );

      setCurrentGraphHash(hash);
      setSaveModalHash(hash);
    } catch (e) {
      console.error(e);
      setSaveModalError("Failed to save the graph to the database.");
    } finally {
      setSaveModalLoading(false);
    }
  };

  /** LOAD GRAPH FROM HASH (button handler) **/
  const handleOpenLoadModal = () => {
    setLoadError(null);
    setLoadModalOpen(true);
  };

  const handleLoadByHash = async (hash: string) => {
    try {
      setLoadLoading(true);
      setLoadError(null);

      const data = await fetchGraphByHash(hash.trim());
      setCurrentGraphUUID(data.uuid);
      setCurrentGraphHash(data.graph_hash);
      setPointPositions(new Float32Array(data.canvas_positions));
      setLinks(new Float32Array(data.links));
      setSelectedNode(null);

      if (data.config) {
        setGraphConfig({
          spaceSize: data.config.space_size || 256,
          pointSize: data.config.point_size || 1
        });
      } else {
        setGraphConfig(null);
      }

      const url = new URL(window.location.href);
      url.searchParams.set("g", hash.trim());
      window.history.replaceState({}, "", url.toString());

      setLoadModalOpen(false);
      setTimeout(() => fitView(), 100);
    } catch (e) {
      console.error(e);
      setLoadError("Graph not found for the given hash.");
    } finally {
      setLoadLoading(false);
    }
  };

  /** LOAD GRAPH FROM DB LIST (GraphListModal selection) **/
  const handleSelectGraphFromDb = async (graphId: string) => {
    try {
      setLoadFromDbLoading(true);
      setLoadFromDbError(null);

      const data = await fetchGraphByHash(graphId.trim());
      setCurrentGraphUUID(data.uuid);
      setCurrentGraphHash(data.graph_hash);
      setPointPositions(new Float32Array(data.canvas_positions));
      setLinks(new Float32Array(data.links));
      setSelectedNode(null);

      if (data.config) {
        setGraphConfig({
          spaceSize: data.config.space_size || 256,
          pointSize: data.config.point_size || 1
        });
      } else {
        setGraphConfig(null);
      }

      setGraphListOpen(false);
      setTimeout(() => fitView(), 100);
    } catch (e) {
      console.error(e);
      const msg = 'Failed to load graph from database.';
      setLoadFromDbError(msg);
      alert(msg);
    } finally {
      setLoadFromDbLoading(false);
    }
  };

  return (
    <AppContext.Provider value={{ currentGraphUUID, setCurrentGraphUUID }}>
      <div id="layout" className="bg-black text-gray-200 flex-col">
        <div ref={canvasRef} className="flex-grow" />
        <div
          ref={graphRef}
          id="graph"
          className="relative flex-grow" >
          {tooltips.map((t) => (
            <ToolTip
              key={t.index}
              visible={true}
              x={t.x}
              y={t.y}
              content={<strong>{t.content}</strong>}
            />
          ))}
        </div>

        {analysisResult && (
          <AnalysisPanel
            result={analysisResult}
            onClose={() => setAnalysisResult(null)}
          />
        )}

        <LeftSidebar
          handleLoadClick={handleLoadClick}
          fitView={fitView}
          resetView={resetView}
          handleExportClick={handleExportClick}
          handleAnalyzeClick={handleAnalyzeClick}
          handleSaveLayoutClick={saveToDb}
          handleLoadFromHashClick={handleOpenLoadModal}
          handleOpenSettings={handleOpenSettings}
          selectedNode={selectedNode}
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

        <SaveGraphModal
          open={saveModalOpen}
          onClose={() => setSaveModalOpen(false)}
          onSubmit={handleSaveModalSubmit}
          loading={saveModalLoading}
          hash={saveModalHash}
          error={saveModalError}
        />

        <LoadGraphModal
          open={loadModalOpen}
          onClose={() => {
            setLoadModalOpen(false);
            setLoadError(null);
          }}
          onSubmit={handleLoadByHash}
          loading={loadLoading}
          error={loadError}
        />

        <LoadSourceModal
          open={loadSourceModalOpen}
          onClose={() => {
            setLoadSourceModalOpen(false);
            setLoadFromDbError(null);
          }}
          onSelectFile={handleLoadFromFile}
          onSelectDb={handleLoadFromDbSubmit}
          loading={loadFromDbLoading}
          error={loadFromDbError}
        />

        {graphListOpen && (
          <GraphListModal
            list={graphList}
            onSelect={handleSelectGraphFromDb}
            onClose={() => setGraphListOpen(false)}
          />
        )}

        <SettingsModal
          open={settingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          spaceSize={graphConfig?.spaceSize || 256}
          pointSize={graphConfig?.pointSize || 1}
          onApply={(spaceSize, pointSize) => {
            setGraphConfig({ spaceSize, pointSize });
            setSettingsModalOpen(false);
          }}
        />
      </div>
    </AppContext.Provider>
  );
};

const App: React.FC = () => {
  const [currentGraphUUID, setCurrentGraphUUID] = useState<string | null>("");
  return (
    <AppContext.Provider value={{ currentGraphUUID, setCurrentGraphUUID }}>
      <MainAppContext />
    </AppContext.Provider>
  );
};

export default App;

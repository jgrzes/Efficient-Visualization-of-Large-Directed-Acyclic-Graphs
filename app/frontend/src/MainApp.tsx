import React, { useContext, useRef, useState, ChangeEvent } from "react";
import "./style.css";
import { initialPointPositions, initialLinks } from "./data-gen";

import { AppContext } from "./context/AppContext";

import { NodeInfoProps } from "./components/leftsidebar/NodeInfo";
import AnalysisPanel from "./components/analysispanel/AnalysisPanel";
import LeftSidebar from "./components/leftsidebar/LeftSidebar";
import ToolTip from "./components/ToolTip";
import OntologyModal from "./components/modals/OntologyModal";
import LoadingModal from "./components/modals/LoadingModal";
import RightSidebar from "./components/rightsidebar/RightSidebar";
import SaveGraphModal from "./components/modals/SaveGraphModal/SaveGraphModal";
import GraphListModal from "./components/modals/GraphListModal";
import LoadSourceModal from "./components/modals/LoadSourceModal/LoadSourceModal";
import SettingsModal from "./components/modals/SettingsModal/SettingsModal";
import LayoutModal from "./components/modals/LayoutModal";

import { useFavorites } from "./hooks/useFavorites";
import { useComments } from "./hooks/useComments";

import type { GraphColors } from "./graph/types";
import { DEFAULT_GRAPH_COLORS, DEFAULT_POINT_SIZE } from "./graph/config";

import { useGraph } from "./hooks/useGraph";
import { useSearch } from "./hooks/useSearch";
import { useGraphSync } from "./hooks/useGraphSync";
import { useGraphLoader } from "./hooks/useGraphLoader";
import type { LayoutType } from "./graph/api/graphs";

import AppToastModal from "./components/modals/AppToastModal";
import { useAppToast } from "./hooks/useAppToast";

type GraphConfig = {
  pointSize: number;
  colors: GraphColors;
};

export default function MainApp() {
  const appContext = useContext(AppContext);
  const currentGraphUUID = appContext!.currentGraphUUID;
  const setCurrentGraphUUID = appContext!.setCurrentGraphUUID;

  // Refs
  const graphRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Graph state
  const [pointPositions, setPointPositions] = useState<Float32Array>(new Float32Array(initialPointPositions));
  const [initialLayout, setInitialLayout] = useState<Float32Array>(new Float32Array(initialPointPositions));
  const [links, setLinks] = useState<Float32Array>(new Float32Array(initialLinks));

  const [selectedNode, setSelectedNode] = useState<NodeInfoProps | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  const [graphConfig, setGraphConfig] = useState<GraphConfig>({
    pointSize: DEFAULT_POINT_SIZE,
    colors: DEFAULT_GRAPH_COLORS,
  });

  const [nodeNames, setNodeNames] = useState<string[] | null>(null);

  // UI state (local)
  const [showOntologyOptions, setShowOntologyOptions] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // layout selection flow
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingExt, setPendingExt] = useState<"obo" | "txt" | "json" | null>(null);
  const [selectedLayoutType, setSelectedLayoutType] = useState<LayoutType>("cpp");
  const [layoutModalMode, setLayoutModalMode] = useState<"upload" | "recompute" | null>(null);

  // modals
  const [loadSourceModalOpen, setLoadSourceModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  // Graph “hash”
  const [currentGraphHash, setCurrentGraphHash] = useState<string | null>(null);

  // stores
  const favorites = useFavorites();
  const comments = useComments();

  // Graph engine
  const { fitView, selectNodeByIndex, tooltips, hoverTooltip, highlightSearchResults, highlightResultHover, startDragFromTooltip } =
    useGraph(graphRef, pointPositions, links, setSelectedNode, graphConfig, nodeNames || undefined);

  // Right sidebar state
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"search" | "favorites" | "comments">("search");

  // Search
  const search = useSearch(currentGraphUUID);

  // Highlight search results in graph
  React.useEffect(() => {
    const indices = search.results.map((r) => r.index).filter((x): x is number => x !== undefined);
    highlightSearchResults(indices);
  }, [search.results, highlightSearchResults]);

  // Sync (favorites/comments) delta
  const graphSync = useGraphSync({
    currentGraphHash,
    favorites: favorites.favorites,
    comments: comments.comments,
  });

  // Loader / saver
  const loader = useGraphLoader({
    setCurrentGraphUUID,
    setCurrentGraphHash,
    setPointPositions,
    setInitialLayout,
    setLinks,
    setSelectedNode,
    setNodeNames,

    graphConfig,
    setGraphConfig,

    favorites: favorites.favorites,
    comments: comments.comments,
    setFavoritesFromGraph: favorites.setFavoritesFromGraph,
    clearFavorites: favorites.clearFavorites,
    setCommentsFromGraph: comments.setCommentsFromGraph,

    fitView,

    markSyncInitialized: graphSync.markSyncInitialized,
    setPrevFromLoaded: graphSync.setPrevFromLoaded,

    currentGraphUUID,
    currentGraphHash,
  });

  const toast = useAppToast();

  // --- handlers ---
  const handleResetView = () => setPointPositions(new Float32Array(initialLayout));

  const handleLoadClick = () => {
    setLoadSourceModalOpen(true);
    loader.fetchGroups();
    setAnalysisResult(null);
  };

  const handleLoadFromFile = () => {
    setLoadSourceModalOpen(false);
    fileInputRef.current?.click();
  };

  const handleOpenSettings = () => setSettingsModalOpen(true);

  const handleExportClick = async () => {
    try {
      await loader.handleExport();
    } catch (e) {
      // user cancelled save dialog -> ignore
      if (
        (e instanceof DOMException && e.name === "AbortError") ||
        (e instanceof Error && e.name === "AbortError") ||
        (typeof e === "object" &&
          e !== null &&
          "message" in e &&
          String((e as any).message).includes("The user aborted a request"))
      ) {
        return;
      }

      toast.showError(e instanceof Error ? e.message : "Export failed");
    }
  };

  const handleAnalyzeClick = async () => {
    try {
      const result = await loader.handleAnalyze();
      setAnalysisResult(result);
    } catch (e) {
      toast.showError(e instanceof Error ? e.message : "Analyze failed");
    }
  };

  // file upload flow
  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "obo" || ext === "txt") {
      setPendingFile(file);
      setPendingExt(ext as "obo" | "txt");
      setLayoutModalMode("upload");
      setShowLayoutModal(true);
      return;
    }

    if (ext === "json") {
      const hasLayout = await loader.jsonHasLayout(file);
      if (hasLayout) {
        try {
          await loader.loadJsonGraph(file, "cpp");
        } catch (e) {
          toast.showError(e instanceof Error ? e.message : "JSON load failed");
        }
      } else {
        setPendingFile(file);
        setPendingExt("json");
        setLayoutModalMode("upload");
        setShowLayoutModal(true);
      }
      return;
    }

    toast.showError(`Unhandled file format: .${ext ?? "unknown"}`, "Unsupported file");
  };

  const handleLayoutConfirm = (layoutType: LayoutType) => {
    if (layoutModalMode === "recompute") {
      setShowLayoutModal(false);
      setLayoutModalMode(null);
      void loader.recomputeCurrentLayout(layoutType).catch((e) => {
        toast.showError(e instanceof Error ? e.message : "Layout recompute failed");
      });
      return;
    }

    if (!pendingFile || !pendingExt) {
      setShowLayoutModal(false);
      setLayoutModalMode(null);
      return;
    }

    setSelectedLayoutType(layoutType);
    setShowLayoutModal(false);
    setLayoutModalMode(null);

    if (pendingExt === "json") {
      void loader.loadJsonGraph(pendingFile, layoutType);
      setPendingFile(null);
      setPendingExt(null);
      return;
    }

    setSelectedFile(pendingFile);
    setShowOntologyOptions(true);
  };

  const handleChangeLayoutClick = () => {
    if (!currentGraphUUID) {
      toast.showError("Load a graph first to change its layout.", "No graph loaded");
      return;
    }

    setLayoutModalMode("recompute");
    setShowLayoutModal(true);
  };

  const uploadFileWithNamespace = async (namespace: string) => {
    if (!selectedFile) return;
    setShowOntologyOptions(false);
    try {
      await loader.uploadFileWithNamespace(selectedFile, namespace, selectedLayoutType);
    } catch (e) {
      toast.showError(e instanceof Error ? e.message : "Upload failed");
    }

    setSelectedFile(null);
    setPendingFile(null);
    setPendingExt(null);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // save modal submit wrapper
  const handleSaveModalSubmit = async (groupName: string | null, password: string | null) => {
    try {
      const baseBody = await loader.handleSaveToDb(groupName ?? undefined, password ?? undefined);

      const body = {
        ...baseBody,
        canvas_positions: Array.from(pointPositions),
        links: Array.from(links),
      } as any;

      await loader.saveGraph(body);
    } finally {
    }
  };

  return (
    <div id="layout" className="flex h-screen flex-col bg-white text-gray-900 dark:bg-black dark:text-gray-200">
      <div ref={canvasRef} className="grow" />

      <div ref={graphRef} id="graph" className="relative grow">
        {tooltips.map((tt) => (
          <ToolTip
            key={tt.index}
            visible
            x={tt.x}
            y={tt.y}
            content={tt.content}
            onPointerDown={(e) => startDragFromTooltip(tt.index, e)}
            onClick={() => selectNodeByIndex(tt.index, {zoom: false})}
          />
        ))}

        {hoverTooltip && (
          <ToolTip
            key={`hover-${hoverTooltip.index}`}
            visible={true}
            x={hoverTooltip.x}
            y={hoverTooltip.y}
            content={<strong>{hoverTooltip.content}</strong>}
          />
        )}
      </div>

      {analysisResult && (
        <AnalysisPanel
          result={analysisResult}
          onClose={() => setAnalysisResult(null)}
          nodeNames={nodeNames}
          onSelectNode={(node) => selectNodeByIndex(node.index)}
          onHoverResultCard={(node) => highlightResultHover(node?.index)}
        />
      )}

      <LeftSidebar
        handleLoadClick={handleLoadClick}
        fitView={fitView}
        resetView={handleResetView}
        handleExportClick={handleExportClick}
        handleAnalyzeClick={handleAnalyzeClick}
        handleSaveLayoutClick={() => {
          setSaveModalOpen(true);
          loader.fetchGroups();
        }}
        handleChangeLayoutClick={handleChangeLayoutClick}
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

      <LayoutModal
        open={showLayoutModal}
        onCancel={() => {
          setShowLayoutModal(false);
          setLayoutModalMode(null);
          setPendingFile(null);
          setPendingExt(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
        onConfirm={handleLayoutConfirm}
      />

      {showOntologyOptions && selectedFile && (
        <OntologyModal
          fileName={selectedFile.name}
          onSelect={uploadFileWithNamespace}
          onCancel={() => setShowOntologyOptions(false)}
        />
      )}

      {loader.loading && <LoadingModal />}

      <RightSidebar
        onSearch={search.handleSearch}
        results={search.results}
        onSelectNode={(node) => selectNodeByIndex(node.index)}
        error={search.error}
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOptionsChange={search.setSearchOptions}
        filters={search.filters}
        onRemoveFilter={search.handleRemoveFilter}
        onHoverResultCard={(node) => highlightResultHover(node?.index)}
        nodeNames={nodeNames}
      />

      <SaveGraphModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSubmit={handleSaveModalSubmit}
        loading={loader.saveModalLoading}
        hash={loader.saveModalHash}
        error={loader.saveModalError}
        groups={loader.groups}
        groupsLoading={loader.groupsLoading}
        onRefreshGroups={loader.fetchGroups}
      />

      <LoadSourceModal
        open={loadSourceModalOpen}
        onClose={() => {
          setLoadSourceModalOpen(false);
        }}
        onSelectFile={handleLoadFromFile}
        onSelectHash={async (hash) => {
          try {
            await loader.handleLoadByHash(hash);
            setLoadSourceModalOpen(false);
          } catch (e) {
            toast.showError(e instanceof Error ? e.message : "Load from hash failed");
          }
        }}
        onSelectDb={async (groupName, password) => {
          try {
            await loader.handleLoadFromDbSubmit(groupName, password);
            setLoadSourceModalOpen(false);
          } catch (e) {
            toast.showError(e instanceof Error ? e.message : "Load from DB failed");
          }
        }}
        loading={loader.loadFromDbLoading || loader.groupsLoading}
        error={loader.loadFromDbError || loader.groupsError}
        groups={loader.groups}
        onRefreshGroups={loader.fetchGroups}
      />

      {loader.graphListOpen && (
        <GraphListModal
        list={loader.graphList}
        onSelect={async (id) => {
          try {
            await loader.handleSelectGraphFromDb(id);
          } catch (e) {
            toast.showError(e instanceof Error ? e.message : "Failed to load graph");
          }
        }}
        onClose={() => loader.setGraphListOpen(false)}
        />
      )}

      <SettingsModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        pointSize={graphConfig.pointSize || 1}
        colors={graphConfig.colors || DEFAULT_GRAPH_COLORS}
        onApply={(pointSize, colors) => {
          setGraphConfig({ pointSize, colors });
          setSettingsModalOpen(false);
        }}
      />
      
      <AppToastModal 
        state={toast.toast}
        onClose={toast.closeToast}
      />

    </div>
  );
}

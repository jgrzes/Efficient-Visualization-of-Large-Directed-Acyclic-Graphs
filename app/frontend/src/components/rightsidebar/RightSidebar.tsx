import React from "react";
import TabNavigation from "./TabNavigation";
import { NodeInfoProps } from "../leftsidebar/NodeInfo";
import { useFavorites } from "../../hooks/useFavorites";
import { SearchPanel } from "./SearchPanel";
import { FavoritesPanel } from "./FavoritesPanel";
import CommentsPanel from "./CommentsPanel";
import { GraphInfoPanel, GraphInfo } from "./GraphInfoPanel";

type TabKey = "search" | "favorites" | "comments" | "graph";

interface RightSidebarProps {
  results: NodeInfoProps[];
  onSearch: (field: string, query: string) => void;
  onSelectNode: (node: NodeInfoProps) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  error?: string | null;
  graphInfo?: GraphInfo | null;
  onOptionsChange?: (opts: { matchCase: boolean; matchWords: boolean }) => void;
  filters?: { id: string; field: string; query: string }[];
  onRemoveFilter?: (id: string) => void;
  onHoverResultCard?: (node?: NodeInfoProps) => void;
  nodeNames?: string[] | null;
}

const RightSidebar: React.FC<RightSidebarProps> = ({
  results,
  onSearch,
  onSelectNode,
  expanded,
  onExpandedChange,
  activeTab,
  onTabChange,
  error,
  graphInfo,
  onOptionsChange,
  filters,
  onRemoveFilter,
  onHoverResultCard,
  nodeNames
}) => {
  const { favorites: favoriteIndices = [] } = useFavorites();

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const prevTabRef = React.useRef<TabKey>(activeTab);
  const scrollPositions = React.useRef<Record<TabKey, number>>({
    search: 0,
    favorites: 0,
    comments: 0,
    graph: 0,
  });

  React.useEffect(() => {
    const prev = prevTabRef.current;
    const el = scrollRef.current;
    if (el) {
      scrollPositions.current[prev] = el.scrollTop;
      requestAnimationFrame(() => {
        el.scrollTop = scrollPositions.current[activeTab] ?? 0;
      });
    }
    prevTabRef.current = activeTab;
  }, [activeTab]);

  const handleTabClick = React.useCallback(
    (tab: TabKey) => {
      if (tab === activeTab) {
        onExpandedChange(!expanded);
      } else {
        onTabChange(tab);
        if (!expanded) onExpandedChange(true);
      }
    },
    [activeTab, expanded, onExpandedChange, onTabChange]
  );

  const isSearch = activeTab === "search";
  const isFavorites = activeTab === "favorites";
  const isComments = activeTab === "comments";
  const isGraph = activeTab === "graph";

  const tabPanelId = `right-panel-${activeTab}`;
  const labelledBy =
    activeTab === "search"
      ? "tab-search"
      : activeTab === "favorites"
      ? "tab-favorites"
      : activeTab === "comments"
      ? "tab-comments"
      : "tab-graph";

  return (
    <div
      className={`fixed top-0 z-40 right-0 h-screen text-gray-200 flex transition-[width] duration-200 ${
        expanded ? "w-96" : "w-16"
      } bg-black/90 shadow-2xl shadow-black/40 overflow-visible py-4 bg-black/90 backdrop-blur-xl`}
      aria-expanded={expanded}
    >
      <TabNavigation activeTab={activeTab} expanded={expanded} onTabClick={handleTabClick} />

      <div
        id={tabPanelId}
        role="tabpanel"
        aria-labelledby={labelledBy}
        className={`flex-1 h-full min-w-0 transition-opacity duration-150 ${
          expanded ? "opacity-100" : "opacity-0 pointer-events-none"
        } overflow-y-auto overflow-x-visible [scrollbar-gutter:stable_both-edges]`}
        aria-hidden={!expanded}
        ref={scrollRef}
      >
        {isSearch && (
          <SearchPanel
            results={results}
            onSearch={onSearch}
            onSelectNode={onSelectNode}
            error={error}
            onOptionsChange={onOptionsChange}
            filters={filters ?? []}
            onRemoveFilter={onRemoveFilter}
            onHoverResultCard={onHoverResultCard}
          />
        )}

        {isFavorites && (
          <div className="px-4 py-3">
            <FavoritesPanel
              favorites={favoriteIndices}
              onSelectNode={onSelectNode}
              onHoverResultCard={onHoverResultCard}
              nodeNames={nodeNames}
            />
          </div>
        )}

        {isComments && (
          <div className="px-4 py-3">
            <CommentsPanel />
          </div>
        )}

        {isGraph && (
          <div className="px-4 py-3">
            <GraphInfoPanel info={graphInfo} />
          </div>
        )}
      </div>
    </div>
  );
};

export default RightSidebar;

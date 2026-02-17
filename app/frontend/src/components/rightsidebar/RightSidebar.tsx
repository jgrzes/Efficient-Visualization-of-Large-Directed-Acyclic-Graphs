import React from "react";
import TabNavigation from "./TabNavigation";
import { NodeInfoProps } from "../leftsidebar/NodeInfo";
import { useFavorites } from "../../hooks/useFavorites";
import { SearchPanel } from "./SearchPanel";
import { FavoritesPanel } from "./FavoritesPanel";
import CommentsPanel from "./CommentsPanel";

type TabKey = "search" | "favorites" | "comments";
interface RightSidebarProps {
  results: NodeInfoProps[];
  onSearch: (field: string, query: string) => void;
  onSelectNode: (node: NodeInfoProps) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  error?: string | null;
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
  onOptionsChange,
  filters,
  onRemoveFilter,
  onHoverResultCard,
  nodeNames,
}) => {
  const { favorites: favoriteIndices = [] } = useFavorites();

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

  const tabPanelId = `right-panel-${activeTab}`;
  const labelledBy =
    activeTab === "search"
      ? "tab-search"
      : activeTab === "favorites"
      ? "tab-favorites"
      : "tab-comments";

  return (
    <div
      className={`fixed top-0 z-40 right-0 h-screen flex transition-[width] duration-200 ${
        expanded ? "w-96" : "w-16"
      }
      overflow-visible backdrop-blur-xl shadow-2xl
      bg-white/85 text-gray-900 shadow-black/10
      dark:bg-black/90 dark:text-gray-200 dark:shadow-black/40
      `}
      aria-expanded={expanded}
    >
      <TabNavigation
        activeTab={activeTab}
        expanded={expanded}
        onTabClick={handleTabClick}
      />

      <div
        id={tabPanelId}
        role="tabpanel"
        aria-labelledby={labelledBy}
        className={`flex-1 h-full min-w-0 transition-opacity duration-150 ${
          expanded ? "opacity-100" : "opacity-0 pointer-events-none"
        } overflow-x-visible`}
        aria-hidden={!expanded}
      >
        {activeTab === "search" && (
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

        {activeTab === "favorites" && (
          <FavoritesPanel
            favorites={favoriteIndices}
            onSelectNode={onSelectNode}
            onHoverResultCard={onHoverResultCard}
            nodeNames={nodeNames}
          />
        )}

        {activeTab === "comments" && (
          <CommentsPanel
            onSelectNode={onSelectNode}
            onHoverResultCard={onHoverResultCard}
            nodeNames={nodeNames}
          />
        )}
      </div>
    </div>
  );
};

export default RightSidebar;

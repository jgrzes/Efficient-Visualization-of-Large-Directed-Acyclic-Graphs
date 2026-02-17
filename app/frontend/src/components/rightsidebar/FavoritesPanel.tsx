import React from "react";
import ResultsList from "./ResultsList";
import { NodeInfoProps } from "../leftsidebar/NodeInfo";

interface FavoritesPanelProps {
  favorites: number[];
  isLoading?: boolean;
  onSelectNode: (node: NodeInfoProps) => void;
  onHoverResultCard?: (node?: NodeInfoProps) => void;
  nodeNames?: string[] | null;
}

export const FavoritesPanel: React.FC<FavoritesPanelProps> = ({
  favorites,
  isLoading,
  onSelectNode,
  onHoverResultCard,
  nodeNames,
}) => {
  const favoriteNodes: NodeInfoProps[] = (favorites ?? []).map((index) => ({
    index,
    name: nodeNames && nodeNames[index] ? nodeNames[index] : `Node ${index}`,
  }));

  return (
    <div className="flex h-full min-w-0 flex-col">
      {/* HEADER */}
      <div
        className="
          px-4 pt-3 pb-3
          bg-white/85 backdrop-blur-xl
          dark:bg-black/80
          border-b border-gray-200/60 dark:border-gray-800/60
        "
      >
        <p className="text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">
          favorites: {favoriteNodes.length}
        </p>

        {!isLoading && favoriteNodes.length === 0 && (
          <div className="mt-2">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              No favorites.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Add a node to favorites to see it here.
            </p>
          </div>
        )}

        {isLoading && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Loading favorites…
          </p>
        )}
      </div>

      {/* CONTENT */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
        {!isLoading && favoriteNodes.length > 0 && (
          <ResultsList
            type="favorites"
            items={favoriteNodes}
            onSelectNode={onSelectNode}
            onHoverResultCard={onHoverResultCard}
          />
        )}
      </div>
    </div>
  );
};

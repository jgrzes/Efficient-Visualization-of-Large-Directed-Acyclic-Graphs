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
  nodeNames
}) => {
  if (isLoading) {
    return (
      <div className="text-sm text-gray-400">
  <p>Loading favorites…</p>
      </div>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <div className="text-sm text-gray-400">
  <p>No favorites.</p>
  <p className="text-xs text-gray-500 mt-1">Add a node to favorites to see it here.</p>
      </div>
    );
  }

  const favoriteNodes : NodeInfoProps[] = favorites.map(index => ({
    index,
    name: nodeNames && nodeNames[index] ? nodeNames[index] : `Node ${index}`
  }));

  return (
    <div>
      <ResultsList 
        type="favorites"
        items={favoriteNodes}
        onSelectNode={onSelectNode}
        onHoverResultCard={onHoverResultCard} 
      />
    </div>
  );
};

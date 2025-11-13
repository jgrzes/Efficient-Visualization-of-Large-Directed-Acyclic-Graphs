import React from "react";
import ResultsList from "./ResultsList";
import { NodeInfoProps } from "../NodeInfo";

interface FavoritesPanelProps {
  favorites: NodeInfoProps[];
  isLoading?: boolean;
  onSelectNode: (node: NodeInfoProps) => void;
}

export const FavoritesPanel: React.FC<FavoritesPanelProps> = ({ favorites, isLoading, onSelectNode }) => {
  if (isLoading) {
    return (
      <div className="text-sm text-gray-400">
        <p>Ładowanie ulubionych…</p>
      </div>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <div className="text-sm text-gray-400">
        <p>Brak ulubionych.</p>
        <p className="text-xs text-gray-500 mt-1">Dodaj węzeł do ulubionych, aby pojawił się tutaj.</p>
      </div>
    );
  }

  return (
    <div>
      <ResultsList type="favorites" items={favorites} onSelectNode={onSelectNode} />
    </div>
  );
};

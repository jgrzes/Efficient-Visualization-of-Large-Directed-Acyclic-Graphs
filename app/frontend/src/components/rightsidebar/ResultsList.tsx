import React from "react";
import { NodeInfoProps } from "../NodeInfo";
import ResultCard from "./ResultCard";
import EmptyState from "./EmptyState";

interface ResultsListProps {
  type: "search" | "favorites";
  items: NodeInfoProps[];
  onSelectNode: (node: NodeInfoProps) => void;
}

const ResultsList: React.FC<ResultsListProps> = ({
  type,
  items,
  onSelectNode,
}) => {
  if (items.length === 0) {
    return <EmptyState type={type} />;
  }

  const label = type === "search" ? "znaleziono" : "ulubione";

  return (
    <div className="space-y-2">
      <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">
        {label}: {items.length}
      </p>
      <ul className="space-y-2">
        {items.map((node) => (
          <ResultCard
            key={`${type}-${node.id}-${node.index ?? 0}`}
            node={node}
            onSelect={onSelectNode}
          />
        ))}
      </ul>
    </div>
  );
};

export default ResultsList;
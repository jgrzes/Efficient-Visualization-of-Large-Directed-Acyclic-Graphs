import React from "react";
import { NodeInfoProps } from "../leftsidebar/NodeInfo";
import ResultCard from "./ResultCard";
import EmptyState from "./EmptyState";

interface ResultsListProps {
  type: "search" | "favorites";
  items: NodeInfoProps[];
  onSelectNode: (node: NodeInfoProps) => void;
  onHoverResultCard?: (node?: NodeInfoProps) => void;
}

const ResultsList: React.FC<ResultsListProps> = ({
  type,
  items,
  onSelectNode,
  onHoverResultCard,
}) => {
  if (items.length === 0) {
    return <EmptyState type={type} />;
  }

  return (
    <ul className="space-y-2">
      {items.map((node) => (
        <ResultCard
          key={`${type}-${node.id}-${node.index ?? 0}`}
          node={node}
          onSelect={onSelectNode}
          onHoverResultCard={onHoverResultCard}
        />
      ))}
    </ul>
  );
};

export default ResultsList;

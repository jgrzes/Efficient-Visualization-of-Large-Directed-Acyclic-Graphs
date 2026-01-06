import React from "react";
import type { NodeRef } from "./types";

export const HubRow: React.FC<{
  name: string;
  vertex: number;
  value: number;
  kind: "in" | "out";
  onSelectNode?: (node: NodeRef) => void;
  onHoverResultCard?: (node?: NodeRef) => void;
}> = ({ name, vertex, value, kind, onSelectNode, onHoverResultCard }) => {
  const aria = kind === "in" ? "Select in-degree hub" : "Select out-degree hub";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelectNode?.({ index: vertex });
      }}
      onMouseEnter={() => onHoverResultCard?.({ index: vertex })}
      onMouseLeave={() => onHoverResultCard?.()}
      className="
        w-full text-left
        flex justify-between gap-2 px-2 py-1
        border-b border-black/5 dark:border-white/5
        hover:bg-black/5 dark:hover:bg-white/5
        focus:outline-none focus-visible:ring-2 focus-visible:ring-black/15
        dark:focus-visible:ring-white/20
      "
      aria-label={`${aria}: ${name}`}
      title={`Vertex #${vertex}`}
    >
      <span className="min-w-0 truncate" title={name}>
        {name}
      </span>
      <span className="font-semibold shrink-0">{value}</span>
    </button>
  );
};

import React from "react";

export interface GraphInfo {
  nodesCount?: number;
  edgesCount?: number;
  depth?: number;
  namespace?: string;
  name?: string;
}

interface GraphInfoPanelProps {
  info?: GraphInfo | null;
}

export const GraphInfoPanel: React.FC<GraphInfoPanelProps> = ({ info }) => {
  if (!info) {
    return (
      <div className="text-sm text-gray-700 dark:text-gray-400">
        <p>No graph information available.</p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Load data or pass <code>graphInfo</code> to RightSidebar.
        </p>
      </div>
    );
  }

  const { name, namespace, nodesCount, edgesCount, depth } = info;

  return (
    <div className="space-y-3">
      <div
        className="
          rounded-xl border p-3

          border-black/10 bg-white/70
          dark:border-white/10 dark:bg-white/[0.03]
        "
      >
        <p className="text-xs uppercase tracking-wide mb-2 text-gray-600 dark:text-gray-400">
          Graph summary
        </p>

        <dl className="grid grid-cols-2 gap-2 text-sm">
          {name && (
            <>
              <dt className="text-gray-600 dark:text-gray-400">Name</dt>
              <dd className="text-gray-900 dark:text-gray-200">{name}</dd>
            </>
          )}

          {namespace && (
            <>
              <dt className="text-gray-600 dark:text-gray-400">Namespace</dt>
              <dd className="text-gray-900 dark:text-gray-200">{namespace}</dd>
            </>
          )}

          {typeof nodesCount === "number" && (
            <>
              <dt className="text-gray-600 dark:text-gray-400">Nodes</dt>
              <dd className="text-gray-900 dark:text-gray-200">{nodesCount}</dd>
            </>
          )}

          {typeof edgesCount === "number" && (
            <>
              <dt className="text-gray-600 dark:text-gray-400">Edges</dt>
              <dd className="text-gray-900 dark:text-gray-200">{edgesCount}</dd>
            </>
          )}

          {typeof depth === "number" && (
            <>
              <dt className="text-gray-600 dark:text-gray-400">DAG depth</dt>
              <dd className="text-gray-900 dark:text-gray-200">{depth}</dd>
            </>
          )}
        </dl>
      </div>
    </div>
  );
};

export default GraphInfoPanel;

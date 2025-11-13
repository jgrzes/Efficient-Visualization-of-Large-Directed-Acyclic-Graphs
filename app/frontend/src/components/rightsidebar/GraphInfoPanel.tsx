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
      <div className="text-sm text-gray-400">
        <p>Brak informacji o grafie.</p>
        <p className="text-xs text-gray-500 mt-1">
          Wczytaj dane lub przekaż <code>graphInfo</code> do RightSidebar.
        </p>
      </div>
    );
  }

  const { name, namespace, nodesCount, edgesCount, depth } = info;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Podsumowanie grafu</p>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          {name && (
            <>
              <dt className="text-gray-400">Nazwa</dt>
              <dd className="text-gray-200">{name}</dd>
            </>
          )}
          {namespace && (
            <>
              <dt className="text-gray-400">Namespace</dt>
              <dd className="text-gray-200">{namespace}</dd>
            </>
          )}
          {typeof nodesCount === "number" && (
            <>
              <dt className="text-gray-400">Węzły</dt>
              <dd className="text-gray-200">{nodesCount}</dd>
            </>
          )}
          {typeof edgesCount === "number" && (
            <>
              <dt className="text-gray-400">Krawędzie</dt>
              <dd className="text-gray-200">{edgesCount}</dd>
            </>
          )}
          {typeof depth === "number" && (
            <>
              <dt className="text-gray-400">Głębokość DAG</dt>
              <dd className="text-gray-200">{depth}</dd>
            </>
          )}
        </dl>
      </div>
    </div>
  );
};

export default GraphInfoPanel;

import React from "react";
import type { AnalysisResult, NodeRef } from "./types";
import { fmtNum, fmtPct } from "./utils";
import { Chip } from "./Chip";
import { StatRow } from "./StatRow";
import { DegreeCard } from "./DegreeCard";
import { HubRow } from "./HubRow";

export const BasicMetricsSection: React.FC<{
  basic: NonNullable<AnalysisResult["basic"]>;
  isolated?: number;
  multiParentCount?: number;
  multiParentPct?: number;
  resolveName: (vertexId: number) => string;
  onSelectNode?: (node: NodeRef) => void;
  onHoverResultCard?: (node?: NodeRef) => void;
}> = ({
  basic,
  isolated,
  multiParentCount,
  multiParentPct,
  resolveName,
  onSelectNode,
  onHoverResultCard,
}) => {
  return (
    <section className="rounded-xl border border-black/10 bg-black/2 dark:border-white/10 dark:bg-white/2">
      <div className="px-3 py-2 border-b border-black/10 dark:border-white/10">
        <p className="text-[11px] uppercase tracking-wide text-gray-600 dark:text-gray-300">
          Basic metrics
        </p>
      </div>

      <div className="px-3 py-2 space-y-1">
        <StatRow
          label="Vertices (V)"
          value={fmtNum(basic?.n_vertices)}
          tooltip="Number of nodes/vertices in the graph."
        />
        <StatRow
          label="Edges (E)"
          value={fmtNum(basic?.n_edges)}
          tooltip="Number of directed edges in the graph."
        />
        <StatRow
          label="Isolated vertices"
          hint="in=0 and out=0"
          value={fmtNum(isolated)}
          tooltip="Vertices with no incoming and no outgoing edges (fully disconnected)."
        />
        <StatRow
          label="Multi-parent vertices"
          hint="in_degree > 1"
          value={
            <span className="inline-flex items-center gap-2">
              <span>{fmtNum(multiParentCount)}</span>
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                {fmtPct(multiParentPct)}
              </span>
            </span>
          }
          tooltip="Vertices with more than one incoming edge (join/merge points). Indicates how merge-heavy the DAG is."
        />

        {basic?.chain_vertices && (
          <StatRow
            label="Chain vertices"
            hint="in=1, out=1"
            value={
              <span className="inline-flex items-center gap-2">
                <span>{fmtNum(basic.chain_vertices.count)}</span>
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                  {fmtPct(basic.chain_vertices.pct)}
                </span>
              </span>
            }
            tooltip="Vertices with exactly one parent and one child. High ratio often means long sequential chains (lower parallelism)."
          />
        )}

        {basic?.density !== undefined && (
          <StatRow
            label="Density"
            hint={
              <span className="inline-flex items-center gap-2">
                <span className="font-mono">
                  <span className="inline-block text-center leading-[1.05]">
                    <span className="block border-b border-black/20 dark:border-white/20 px-1">
                      E
                    </span>
                    <span className="block px-1">V·(V−1)/2</span>
                  </span>
                </span>
                {basic?.max_possible_edges !== undefined && (
                  <span className="text-gray-500 dark:text-gray-400">
                    (max edges: {fmtNum(basic.max_possible_edges, 0)})
                  </span>
                )}
              </span>
            }
            value={fmtNum(basic.density, 6)}
            tooltip="Edge density relative to the maximum possible number of edges in a DAG with V vertices."
          />
        )}

        {(basic?.avg_nonzero_in_degree !== undefined ||
          basic?.avg_nonzero_out_degree !== undefined) && (
          <div className="pt-2">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Average degree (excluding zeros)
            </p>
            <div className="flex flex-wrap gap-2">
              {basic?.avg_nonzero_in_degree !== undefined && (
                <Chip>avg in: {fmtNum(basic.avg_nonzero_in_degree)}</Chip>
              )}
              {basic?.avg_nonzero_out_degree !== undefined && (
                <Chip>avg out: {fmtNum(basic.avg_nonzero_out_degree)}</Chip>
              )}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              Excludes roots (in=0) and sinks (out=0) to show typical branching/merging.
            </p>
          </div>
        )}

        {(basic?.in_degree || basic?.out_degree) && (
          <div className="pt-3">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Degree summary
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <DegreeCard
                title="in-degree"
                stats={basic.in_degree}
                tooltip="Incoming edges per vertex (parents): min/avg/median/max."
              />
              <DegreeCard
                title="out-degree"
                stats={basic.out_degree}
                tooltip="Outgoing edges per vertex (children): min/avg/median/max."
              />
            </div>
          </div>
        )}

        {(basic?.top_in_degree_vertices?.length ||
          basic?.top_out_degree_vertices?.length) && (
          <div className="pt-3">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Hubs (top)
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-black/10 bg-white/50 dark:border-white/10 dark:bg-white/5 overflow-hidden">
                <div className="px-2 py-1 border-b border-black/10 dark:border-white/10 text-[11px] text-gray-600 dark:text-gray-300">
                  in-degree
                </div>
                <div className="max-h-28 overflow-auto">
                  {(basic.top_in_degree_vertices ?? []).map((x) => (
                    <HubRow
                      key={`in-${x.vertex}`}
                      kind="in"
                      vertex={x.vertex}
                      name={resolveName(x.vertex)}
                      value={x.in_degree}
                      onSelectNode={onSelectNode}
                      onHoverResultCard={onHoverResultCard}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-black/10 bg-white/50 dark:border-white/10 dark:bg-white/5 overflow-hidden">
                <div className="px-2 py-1 border-b border-black/10 dark:border-white/10 text-[11px] text-gray-600 dark:text-gray-300">
                  out-degree
                </div>
                <div className="max-h-28 overflow-auto">
                  {(basic.top_out_degree_vertices ?? []).map((x) => (
                    <HubRow
                      key={`out-${x.vertex}`}
                      kind="out"
                      vertex={x.vertex}
                      name={resolveName(x.vertex)}
                      value={x.out_degree}
                      onSelectNode={onSelectNode}
                      onHoverResultCard={onHoverResultCard}
                    />
                  ))}
                </div>
              </div>
            </div>

            <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
              Click a row to select the node. Hover to highlight.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

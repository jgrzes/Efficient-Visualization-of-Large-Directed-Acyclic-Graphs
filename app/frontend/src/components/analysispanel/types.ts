export type DegreeStats = { min: number; avg: number; median?: number; max: number };

export interface AnalysisResult {
  basic?: {
    n_vertices: number;
    n_edges: number;

    roots?: { count: number; pct: number };
    sinks?: { count: number; pct: number };

    n_roots?: number;
    n_sinks?: number;

    isolated_vertices?: number;
    n_isolated?: number;

    multi_parent?: { count: number; pct: number };
    multi_parent_vertices?: number;
    multi_parent_pct?: number;

    multi_child?: { count: number; pct: number };
    chain_vertices?: { count: number; pct: number };

    in_degree?: DegreeStats;
    out_degree?: DegreeStats;

    avg_nonzero_in_degree?: number;
    avg_nonzero_out_degree?: number;

    density?: number;
    max_possible_edges?: number;

    top_in_degree_vertices?: Array<{ vertex: number; in_degree: number }>;
    top_out_degree_vertices?: Array<{ vertex: number; out_degree: number }>;
  };
  hierarchy_levels?: Record<string, number>;
}

export type NodeRef = { index: number };

export interface AnalysisPanelProps {
  result: AnalysisResult;
  onClose: () => void;
  nodeNames?: string[] | null;
  onSelectNode?: (node: NodeRef) => void;
  onHoverResultCard?: (node?: NodeRef) => void;
}

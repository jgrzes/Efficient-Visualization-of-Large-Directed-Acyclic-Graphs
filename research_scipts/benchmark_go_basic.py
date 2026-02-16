#!/usr/bin/env python3
# benchmark_go_basic.py

import argparse
import csv
import os
import statistics
import time
from dataclasses import dataclass
from typing import List, Tuple, Optional

import matplotlib.pyplot as plt
import graph_tool as gt
import graph_tool.topology as gtt
import random

from generate_graph_structure import make_graph_structure



@dataclass
class BenchRow:
    dataset: str
    V: int
    E: int
    density: float
    roots: int
    sinks: int
    reps: int
    radial_mean_s: float
    radial_std_s: float
    hier_mean_s: float
    hier_std_s: float
    hier_ok: int


def max_edges_dag(V: int) -> int:
    return V * (V - 1) // 2


def dag_density(V: int, E: int) -> float:
    if V <= 1:
        return 0.0
    return E / max_edges_dag(V)


def count_roots_sinks(G: gt.Graph) -> Tuple[int, int]:
    roots = 0
    sinks = 0
    for v in G.vertices():
        if v.in_degree() == 0:
            roots += 1
        if v.out_degree() == 0:
            sinks += 1
    return roots, sinks


def time_call(fn, *args, **kwargs) -> float:
    t0 = time.perf_counter()
    fn(*args, **kwargs)
    t1 = time.perf_counter()
    return t1 - t0


def summarize(times: List[float]) -> Tuple[float, float]:
    if not times:
        return float("nan"), float("nan")
    if len(times) == 1:
        return times[0], 0.0
    return statistics.mean(times), statistics.stdev(times)


def load_go_graph_from_obo(obo_path: str):
    from graph_utils import build_gt_graph_from_obo
    return build_gt_graph_from_obo(obo_path)


def subgraph_reachable_from_root(G: gt.Graph, root_v: gt.Vertex) -> gt.Graph:
    """
    Creates a GraphView containing only vertices reachable from root_v via out-edges.
    """
    mask = gtt.label_out_component(G, root_v)
    return gt.GraphView(G, vfilt=mask)


def draw_layout_matplotlib(
    G: gt.Graph,
    pos: List[Tuple[float, float]],
    out_path: str,
    max_edges: int = 20000,
):
    """
    Simple debug rendering to confirm layout was computed.
    pos: list[(x,y)] indexed by vertex_index (0..V-1)
    """
    V = int(G.num_vertices())
    if V == 0:
        return

    xs = [pos[i][0] for i in range(V)]
    ys = [pos[i][1] for i in range(V)]

    plt.figure()
    plt.scatter(xs, ys, s=2)

    edges = [(int(e.source()), int(e.target())) for e in G.edges()]
    if len(edges) > max_edges:
        edges = random.sample(edges, max_edges)

    for u, v in edges:
        plt.plot([pos[u][0], pos[v][0]], [pos[u][1], pos[v][1]], linewidth=0.2)

    plt.axis("equal")
    plt.axis("off")
    plt.tight_layout()
    plt.savefig(out_path, dpi=200)
    plt.close()


def benchmark_layouts_on_graph(
    G: gt.Graph,
    reps: int,
    hier_ip: str,
    hier_port: int,
) -> Tuple[List[float], List[float], bool, Optional[List[Tuple[float, float]]], Optional[List[Tuple[float, float]]]]:
    """
    Returns:
      radial_times, hier_times, hier_ok, radial_pos_warmup, hier_pos_warmup
    """
    radial_times: List[float] = []
    hier_times: List[float] = []
    hier_ok = True

    # keep positions for optional debug drawing
    radial_pos = make_graph_structure(G)

    for _ in range(reps):
        radial_times.append(time_call(make_graph_structure, G))

    hier_pos = None
    try:
        from layout_computation_backend_comms import send_layout_computation_request_to_grpc_server

        hier_pos = send_layout_computation_request_to_grpc_server(G, hier_ip, hier_port)  # keep for debug
        for _ in range(reps):
            hier_times.append(time_call(send_layout_computation_request_to_grpc_server, G, hier_ip, hier_port))
    except Exception:
        hier_ok = False
        hier_times = []
        hier_pos = None

    return radial_times, hier_times, hier_ok, radial_pos, hier_pos


def plot_go(rows: List[BenchRow], out_path: str, title: str):
    labels = [r.dataset for r in rows]
    x = list(range(len(labels)))

    plt.figure()

    plt.errorbar(
        x,
        [r.radial_mean_s for r in rows],
        yerr=[r.radial_std_s for r in rows],
        marker="o",
        linestyle="none",
        capsize=3,
        label="radial",
    )

    x_h = [i for i, r in enumerate(rows) if r.hier_ok == 1]
    if x_h:
        plt.errorbar(
            x_h,
            [rows[i].hier_mean_s for i in x_h],
            yerr=[rows[i].hier_std_s for i in x_h],
            marker="o",
            linestyle="none",
            capsize=3,
            label="hierarchical",
        )

    plt.xticks(x, labels)
    plt.xlabel("GO namespace")
    plt.ylabel("Time [s]")
    plt.title(title)
    plt.grid(True)
    plt.legend()
    plt.tight_layout()
    plt.savefig(out_path, dpi=200)
    plt.close()



def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--obo-path", required=True, help="path to go-basic.obo")
    ap.add_argument("--reps", type=int, default=3, help="number of timing repetitions per namespace")
    ap.add_argument("--out", default="go_basic_benchmark.csv", help="output CSV")
    ap.add_argument("--plot", action="store_true", help="save summary plot PNG")
    ap.add_argument("--plot-out", default="go_basic_benchmark.png", help="summary plot PNG path")
    ap.add_argument("--hier-ip", default="127.0.0.1", help="gRPC backend host/IP")
    ap.add_argument("--hier-port", type=int, default=30311, help="gRPC backend port")

    ap.add_argument("--draw-layouts", action="store_true", help="render computed layouts (debug PNGs)")
    ap.add_argument("--draw-out-dir", default="go_layout_debug", help="output dir for debug PNGs")
    ap.add_argument("--draw-max-edges", type=int, default=20000, help="max edges drawn per debug PNG")

    args = ap.parse_args()

    if args.draw_layouts:
        os.makedirs(args.draw_out_dir, exist_ok=True)

    G_gt, roots, _ = load_go_graph_from_obo(args.obo_path)

    namespaces = [
        ("GO: BP", "biological_process"),
        ("GO: MF", "molecular_function"),
        ("GO: CC", "cellular_component"),
    ]

    rows: List[BenchRow] = []

    for label, ns_key in namespaces:
        if ns_key not in roots:
            print(f"[WARN] Root not found for namespace: {ns_key} ({label})")
            continue

        _root_id, root_v = roots[ns_key]

        subG_view = subgraph_reachable_from_root(G_gt, root_v)

        subG = gt.Graph(subG_view, prune=True)

        V = int(subG.num_vertices())
        E = int(subG.num_edges())
        dens = dag_density(V, E)
        r_count, s_count = count_roots_sinks(subG)

        radial_times, hier_times, hier_ok, radial_pos, hier_pos = benchmark_layouts_on_graph(
            subG, reps=args.reps, hier_ip=args.hier_ip, hier_port=args.hier_port
        )

        if args.draw_layouts:
            safe = label.replace(":", "").replace(" ", "_").lower()
            out_rad = os.path.join(args.draw_out_dir, f"{safe}_radial.png")
            draw_layout_matplotlib(subG, radial_pos, out_rad, max_edges=args.draw_max_edges)

            if hier_pos is not None:
                out_h = os.path.join(args.draw_out_dir, f"{safe}_hierarchical.png")
                draw_layout_matplotlib(subG, hier_pos, out_h, max_edges=args.draw_max_edges)

        r_mean, r_std = summarize(radial_times)
        h_mean, h_std = summarize(hier_times)

        row = BenchRow(
            dataset=label,
            V=V,
            E=E,
            density=dens,
            roots=r_count,
            sinks=s_count,
            reps=args.reps,
            radial_mean_s=r_mean,
            radial_std_s=r_std,
            hier_mean_s=h_mean,
            hier_std_s=h_std,
            hier_ok=1 if hier_ok else 0,
        )
        rows.append(row)

        print(
            f"{label:6s} V={V:7d} E={E:8d} dens={dens:.6g} roots={r_count:5d} sinks={s_count:5d} "
            f"radial={r_mean:.6f}s (±{r_std:.6f}) "
            f"hier={h_mean:.6f}s (±{h_std:.6f}) ok={row.hier_ok}"
        )

    # CSV
    with open(args.out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(
            [
                "dataset", "V", "E", "density", "roots", "sinks", "reps",
                "radial_mean_s", "radial_std_s",
                "hier_mean_s", "hier_std_s", "hier_ok",
            ]
        )
        for r in rows:
            w.writerow(
                [
                    r.dataset, r.V, r.E, r.density, r.roots, r.sinks, r.reps,
                    r.radial_mean_s, r.radial_std_s,
                    r.hier_mean_s, r.hier_std_s, r.hier_ok,
                ]
            )

    print(f"\nSaved CSV: {args.out}")

    if args.plot:
        plot_go(
            rows,
            out_path=args.plot_out,
            title=f"GO-basic layout benchmark (reps={args.reps})",
        )
        print(f"Saved plot: {args.plot_out}")

    if args.draw_layouts:
        print(f"Saved debug layouts to dir: {args.draw_out_dir}")


if __name__ == "__main__":
    main()


''' Example usage:
python benchmark_go_basic.py \
  --obo-path /home/jgrzes/a/Efficient-Visualization-of-Large-Directed-Acyclic-Graphs/app/python-backend/data/go-basic.obo \
  --reps 3 \
  --out go.csv \
  --plot --plot-out go.png \
  --draw-layouts --draw-out-dir debug_go_layouts --draw-max-edges 20000
'''
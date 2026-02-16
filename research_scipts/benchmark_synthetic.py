#!/usr/bin/env python3
# benchmark_synthetic.pyE

import argparse
import csv
import os
import random
import statistics
import time
from dataclasses import dataclass
from graph_tool.topology import is_DAG
from typing import List, Tuple

import matplotlib.pyplot as plt
import graph_tool as gt

# Radial layout (Python)
from generate_graph_structure import make_graph_structure


# ----------------------------
# Data container for one row
# ----------------------------
@dataclass
class BenchRow:
    V: int
    E: int
    density: float
    reps: int
    radial_mean_s: float
    radial_std_s: float
    hier_mean_s: float
    hier_std_s: float
    hier_ok: int


def max_edges_dag(V: int) -> int:
    return V * (V - 1) // 2


def generate_random_dag_gt(
    V: int,
    density: float,
    seed: int,
    batch_factor: int = 3,
) -> gt.Graph:
    """
    Generate a random DAG with:
      - vertices: 0..V-1
      - edges sampled uniformly among all pairs (u,v) with u < v (guarantees acyclicity)
      - target number of edges:
            E_target = round(density * V(V-1)/2)

    Implementation detail:
      - we use a Python set to avoid duplicate edges
      - we sample until we reach E_target (rejection sampling)
    """
    if V < 2:
        raise ValueError("V must be >= 2 to have edges")
    if not (0.0 < density <= 1.0):
        raise ValueError("density must be in (0, 1]")

    E_target = int(round(density * max_edges_dag(V)))

    G = gt.Graph(directed=True)
    G.add_vertex(V)

    rng = random.Random(seed)

    edges = set()

    # Prepare edges
    for _ in range(E_target):
        u = rng.randrange(0, V - 1)
        v = rng.randrange(u + 1, V)
        edges.add((u, v))

    # Add edges to graph-tool graph
    for (u, v) in edges:
        G.add_edge(G.vertex(u), G.vertex(v))

    # check if its a DAG
    if not is_DAG(G):
        raise RuntimeError("Generated graph is not a DAG")

    return G

# ----------------------------

def time_call(fn, *args, **kwargs) -> float:
    """Measure wall-clock time."""
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


def benchmark_one_graph(
    G: gt.Graph,
    reps: int,
    hier_ip: str,
    hier_port: int,
) -> Tuple[List[float], List[float], bool]:

    radial_times: List[float] = []
    hier_times: List[float] = []
    hier_ok = True

    # radial
    for _ in range(reps):
        radial_times.append(time_call(make_graph_structure, G))

    # hierarchical
    try:
        from layout_computation_backend_comms import send_layout_computation_request_to_grpc_server

        for _ in range(reps):
            hier_times.append(time_call(send_layout_computation_request_to_grpc_server, G, hier_ip, hier_port))
    except Exception:
        hier_ok = False
        hier_times = []

    return radial_times, hier_times, hier_ok

# ----------------------------

def plot_results(rows: List[BenchRow], out_path: str, title: str):

    Vs = [r.V for r in rows]

    plt.figure()

    # radial points
    plt.errorbar(
        Vs,
        [r.radial_mean_s for r in rows],
        yerr=[r.radial_std_s for r in rows],
        marker="o",
        linestyle="none",
        capsize=3,
        label="radial",
    )

    # hierarchical points
    Vs_h = [r.V for r in rows if r.hier_ok == 1]
    if Vs_h:
        plt.errorbar(
            Vs_h,
            [r.hier_mean_s for r in rows if r.hier_ok == 1],
            yerr=[r.hier_std_s for r in rows if r.hier_ok == 1],
            marker="o",
            linestyle="none",
            capsize=3,
            label="hierarchical",
        )

    plt.xlabel("Number of vertices (V)")
    plt.ylabel("Time [s]")
    plt.title(title)
    plt.grid(True)
    plt.legend()
    plt.tight_layout()
    plt.savefig(out_path, dpi=200)
    plt.close()


def parse_v_values(s: str) -> List[int]:
    """
    Accepts:
      - "100,200,500"
      - "100:1000:100" (start:stop:step, inclusive stop)
    """
    s = s.strip()
    if ":" in s:
        start, stop, step = map(int, s.split(":"))
        if step <= 0:
            raise ValueError("step must be > 0")
        return list(range(start, stop + 1, step))
    return [int(x.strip()) for x in s.split(",") if x.strip()]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--v", required=True, help='e.g. "100,200,500" or "100:4000:500"')
    ap.add_argument("--density", type=float, required=True, help="density in [0,1] relative to V(V-1)/2")
    ap.add_argument("--reps", type=int, default=3, help="repetitions per graph size")
    ap.add_argument("--seed", type=int, default=123, help="base seed (different per V)")
    ap.add_argument("--out", default="synthetic_benchmark.csv", help="output CSV file")
    ap.add_argument("--plot", action="store_true", help="save plot PNG")
    ap.add_argument("--plot-out", default="synthetic_benchmark.png", help="output plot PNG file")

    ap.add_argument("--hier-ip", default=os.getenv("LAYOUT_SERVICE_IP_ADDRESS", "127.0.0.1"))
    ap.add_argument("--hier-port", type=int, default=int(os.getenv("LAYOUT_SERVICE_PORT", "30311")))
    args = ap.parse_args()

    V_values = parse_v_values(args.v)

    rows: List[BenchRow] = []

    for i, V in enumerate(V_values):
        if V <= 0:
            continue

        seed = args.seed + 10_000 * i

        # generate synthetic DAG
        G = generate_random_dag_gt(V=V, density=args.density, seed=seed)
        E = int(G.num_edges())

        # benchmark
        radial_times, hier_times, hier_ok = benchmark_one_graph(G, args.reps, args.hier_ip, args.hier_port)

        # summarize
        r_mean, r_std = summarize(radial_times)
        h_mean, h_std = summarize(hier_times)

        row = BenchRow(
            V=V,
            E=E,
            density=args.density,
            reps=args.reps,
            radial_mean_s=r_mean,
            radial_std_s=r_std,
            hier_mean_s=h_mean,
            hier_std_s=h_std,
            hier_ok=1 if hier_ok else 0,
        )
        rows.append(row)

        print(
            f"V={V:6d} E={E:9d} rho={args.density:.6g} "
            f"radial={r_mean:.6f}s (±{r_std:.6f}) "
            f"hier={h_mean:.6f}s (±{h_std:.6f}) ok={row.hier_ok}"
        )

    # CSV output
    with open(args.out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(
            ["V", "E", "density", "reps", "radial_mean_s", "radial_std_s", "hier_mean_s", "hier_std_s", "hier_ok"]
        )
        for r in rows:
            w.writerow([r.V, r.E, r.density, r.reps, r.radial_mean_s, r.radial_std_s, r.hier_mean_s, r.hier_std_s, r.hier_ok])

    print(f"\nSaved CSV: {args.out}")

    # Plot output
    if args.plot:
        plot_results(rows, args.plot_out, title=f"Synthetic DAG benchmark (rho={args.density}, reps={args.reps})")
        print(f"Saved plot: {args.plot_out}")


if __name__ == "__main__":
    main()

# Example usage:
# python benchmark_synthetic.py --v "100:4000:500" --density 0.0008 --reps 3 --out out.csv --plot --plot-out out.png
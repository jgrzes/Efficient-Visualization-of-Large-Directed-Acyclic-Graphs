#!/usr/bin/env python3
# fit_and_plot_from_csv.py

import argparse
import csv
from typing import List, Tuple

import numpy as np
import matplotlib.pyplot as plt


def linear_fit(x: np.ndarray, y: np.ndarray) -> Tuple[float, float, float]:
    """Return (a, b, r2) for y = a*x + b."""
    a, b = np.polyfit(x, y, 1)
    y_hat = a * x + b

    ss_res = np.sum((y - y_hat) ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else float("nan")
    return float(a), float(b), float(r2)


def quadratic_fit(x: np.ndarray, y: np.ndarray) -> Tuple[float, float, float, float]:
    """Return (a, b, c, r2) for y = a*x^2 + b*x + c."""
    a, b, c = np.polyfit(x, y, 2)
    y_hat = a * x**2 + b * x + c

    ss_res = np.sum((y - y_hat) ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else float("nan")
    return float(a), float(b), float(c), float(r2)


def read_rows(path: str):
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        r = csv.DictReader(f)
        required = {"V", "radial_mean_s", "hier_mean_s", "hier_ok"}
        missing = required - set(r.fieldnames or [])
        if missing:
            raise ValueError(f"CSV missing required columns: {sorted(missing)}")

        for row in r:
            rows.append({
                "V": int(row["V"]),
                "radial_mean_s": float(row["radial_mean_s"]),
                "radial_std_s": float(row.get("radial_std_s", "nan")) if row.get("radial_std_s") else float("nan"),
                "hier_mean_s": float(row["hier_mean_s"]) if row["hier_mean_s"] else float("nan"),
                "hier_std_s": float(row.get("hier_std_s", "nan")) if row.get("hier_std_s") else float("nan"),
                "hier_ok": int(row["hier_ok"]),
            })
    rows.sort(key=lambda x: x["V"])
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True, help="input benchmark CSV (e.g. out.csv)")
    ap.add_argument("--export-trend", default=None, help="optional output CSV with fitted trend columns")
    ap.add_argument("--plot-out", default=None, help="optional output plot PNG (e.g. trend.png)")
    ap.add_argument("--dpi", type=int, default=250, help="PNG DPI (default: 250)")
    ap.add_argument("--title", default="Layout computation time vs V (with trends)", help="plot title")
    args = ap.parse_args()

    rows = read_rows(args.csv)

    V = np.array([r["V"] for r in rows], dtype=float)

    radial = np.array([r["radial_mean_s"] for r in rows], dtype=float)
    a_r, b_r, r2_r = linear_fit(V, radial)

    rows_h = [r for r in rows if r["hier_ok"] == 1]
    if rows_h:
        V_h = np.array([r["V"] for r in rows_h], dtype=float)
        hier = np.array([r["hier_mean_s"] for r in rows_h], dtype=float)
        a2_h, b2_h, c2_h, r2_h = quadratic_fit(V_h, hier)
    else:
        a2_h = b2_h = c2_h = r2_h = float("nan")

    print("=== Least-squares fits ===")
    print(f"Radial (linear):        t(V) = {a_r:.6e} * V + {b_r:.6e}    (R^2 = {r2_r:.4f})")
    if rows_h:
        print(f"Hierarchical (quad):    t(V) = {a2_h:.6e} * V^2 + {b2_h:.6e} * V + {c2_h:.6e}    (R^2 = {r2_h:.4f})")
    else:
        print("Hierarchical:  no data (hier_ok==1 never true)")

    # Optional: export trend CSV
    if args.export_trend:
        out_rows: List[dict] = []
        for r in rows:
            v = float(r["V"])
            row_out = {
                "V": int(v),
                "radial_fit_s": a_r * v + b_r,
            }
            if r["hier_ok"] == 1 and rows_h:
                row_out["hier_fit_s"] = a2_h * v**2 + b2_h * v + c2_h
            else:
                row_out["hier_fit_s"] = ""
            out_rows.append(row_out)

        with open(args.export_trend, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=["V", "radial_fit_s", "hier_fit_s"])
            w.writeheader()
            w.writerows(out_rows)

        print(f"\nSaved trend CSV: {args.export_trend}")

    # Optional: export plot
    if args.plot_out:
        plt.figure()

        # radial points
        yerr_r = np.array([r["radial_std_s"] for r in rows], dtype=float)
        plt.errorbar(V, radial, yerr=yerr_r, marker="o", linestyle="none", capsize=3, label="radial (measured)")

        V_line = np.linspace(np.min(V), np.max(V), 400)
        plt.plot(V_line, a_r * V_line + b_r, label=f"radial linear fit (R²={r2_r:.3f})")

        # hierarchical points + quadratic fit
        if rows_h:
            hier_meas = np.array([r["hier_mean_s"] for r in rows_h], dtype=float)
            yerr_h = np.array([r["hier_std_s"] for r in rows_h], dtype=float)
            plt.errorbar(V_h, hier_meas, yerr=yerr_h, marker="o", linestyle="none", capsize=3, label="hierarchical (measured)")
            plt.plot(V_line, a2_h * V_line**2 + b2_h * V_line + c2_h, label=f"hierarchical quad fit (R²={r2_h:.3f})")

        plt.xlabel("Number of vertices (V)")
        plt.ylabel("Time [s]")
        plt.title(args.title)
        plt.grid(True)
        plt.legend()
        plt.tight_layout()
        plt.savefig(args.plot_out, dpi=args.dpi)
        plt.close()

        print(f"Saved plot: {args.plot_out}")


if __name__ == "__main__":
    main()

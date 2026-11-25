#!/usr/bin/env python3
"""Generate publication-grade figures for Penalty-Incentive Ablation."""

from __future__ import annotations

import json
import os
from pathlib import Path

os.environ.setdefault("MPLCONFIGDIR", "/tmp/mpl-ksat-ablation")

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ABLATION_DIR = Path(__file__).resolve().parent
OUTPUTS_DIR = ABLATION_DIR / "outputs"

plt.rcParams.update(
    {
        "font.size": 9.5,
        "axes.titlesize": 11,
        "axes.titleweight": "bold",
        "axes.labelsize": 9.5,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "svg.fonttype": "none",
        "figure.facecolor": "white",
        "axes.facecolor": "white",
    }
)

SHORT_MODEL = {
    "deepseek-v4.1-flash": "DeepSeek V4.1 Flash",
    "gpt-6-luna": "GPT-6 Luna",
    "claude-haiku-5-5": "Claude Haiku 5.5",
}


def save_fig(fig: plt.Figure, stem: str) -> None:
    for ext in ("png", "svg"):
        fig.savefig(OUTPUTS_DIR / f"{stem}.{ext}", dpi=200, bbox_inches="tight")
    plt.close(fig)


def plot_fig1_elasticity_utility(data: dict) -> None:
    models = data["target_models"]
    by_mc = {(s["model"], s["condition"]): s for s in data["condition_summaries"]}

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13.5, 5.2), gridspec_kw={"width_ratios": [1.05, 1.05]})

    x = np.arange(len(models))
    w = 0.25
    c0_abst = [by_mc[(m, "baseline")]["abstention_rate"] * 100 for m in models]
    c1_abst = [by_mc[(m, "penalty_1")]["abstention_rate"] * 100 for m in models]
    c2_abst = [by_mc[(m, "penalty_3")]["abstention_rate"] * 100 for m in models]

    b0 = ax1.bar(x - w, c0_abst, w, label="C0: Baseline (no penalty)", color="#868e96", edgecolor="#212529", lw=0.6)
    b1 = ax1.bar(x, c1_abst, w, label="C1: Penalty λ = −1", color="#339af0", edgecolor="#1864ab", lw=0.6)
    b2 = ax1.bar(x + w, c2_abst, w, label="C2: Penalty λ = −3", color="#e8590c", edgecolor="#7f2d00", lw=0.6)

    for bars, cond in ((b0, "baseline"), (b1, "penalty_1"), (b2, "penalty_3")):
        for bar, m in zip(bars, models):
            h = bar.get_height()
            cnt = by_mc[(m, cond)]["abstained"]
            ax1.text(
                bar.get_x() + bar.get_width() / 2, h + 1.2,
                f"{h:.1f}%\n({cnt}/80)", ha="center", va="bottom", fontsize=7.6, fontweight="bold" if cond == "penalty_3" else "normal"
            )

    ax1.set_xticks(x, [SHORT_MODEL[m] for m in models])
    ax1.set_ylabel("Abstention Rate (% of 80 Questions)")
    ax1.set_ylim(0, max(c0_abst + c1_abst + c2_abst) + 18)
    ax1.set_title("A. Abstention Rate Elasticity Under Negative Marking")
    ax1.grid(axis="y", linestyle="--", alpha=0.3)
    ax1.legend(loc="upper left", fontsize=8.3, frameon=True)

    # Right: Realized Utility at λ=3 (Baseline behavior vs Adapted behavior under C2)
    u3_base = [by_mc[(m, "baseline")]["utility_lam3"] for m in models]
    u3_adapt = [by_mc[(m, "penalty_3")]["utility_lam3"] for m in models]
    u1_base = [by_mc[(m, "baseline")]["utility_lam1"] for m in models]
    u1_adapt = [by_mc[(m, "penalty_1")]["utility_lam1"] for m in models]

    w2 = 0.19
    ax2.axhline(0.0, color="#212529", lw=0.9, alpha=0.6)
    r1 = ax2.bar(x - 1.5 * w2, u1_base, w2, label="U(λ=1) Baseline", color="#a5d8ff", edgecolor="#1971c2", lw=0.6)
    r2 = ax2.bar(x - 0.5 * w2, u1_adapt, w2, label="U(λ=1) Adapted (C1)", color="#1971c2", edgecolor="#0b3c6e", lw=0.6)
    r3 = ax2.bar(x + 0.5 * w2, u3_base, w2, label="U(λ=3) Baseline", color="#ffc078", edgecolor="#d9480f", lw=0.6)
    r4 = ax2.bar(x + 1.5 * w2, u3_adapt, w2, label="U(λ=3) Adapted (C2)", color="#d9480f", edgecolor="#6e2000", lw=0.6)

    for bars in (r1, r2, r3, r4):
        for bar in bars:
            h = bar.get_height()
            va = "bottom" if h >= 0 else "top"
            offset = 0.04 if h >= 0 else -0.04
            ax2.text(bar.get_x() + bar.get_width() / 2, h + offset, f"{h:+.2f}", ha="center", va=va, fontsize=7.2)

    ymin = min(u3_base + u3_adapt + u1_base + u1_adapt) - 0.35
    ymax = max(u3_base + u3_adapt + u1_base + u1_adapt) + 0.35
    ax2.set_xticks(x, [SHORT_MODEL[m] for m in models])
    ax2.set_ylabel("Realized Utility U(λ) = (Correct − λ·Wrong) / 80")
    ax2.set_ylim(min(-0.4, ymin), max(0.85, ymax))
    ax2.set_title("B. Does Penalty Adaptation Improve Realized Utility?")
    ax2.grid(axis="y", linestyle="--", alpha=0.3)
    ax2.legend(loc="lower right", fontsize=7.8, ncol=2, frameon=True)

    fig.suptitle(
        "Causal Penalty Ablation (80 KSAT Period 4 Qs): Incentive Sensitivity & Realized Utility",
        fontsize=12.2, fontweight="bold", y=1.01
    )
    fig.tight_layout()
    save_fig(fig, "fig_ablation1_elasticity_and_utility")


def plot_fig2_selectivity_and_domains(data: dict) -> None:
    models = data["target_models"]
    tr_by_mc = {(t["model"], t["condition"]): t for t in data["transitions"]}

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13.8, 5.2), gridspec_kw={"width_ratios": [1.05, 1.05]})

    # Left: Beneficial Abstention (W->A %) vs Harmful Cowardice (C->A %) at C2 (λ=-3)
    x = np.arange(len(models))
    w = 0.32
    pwa = [(tr_by_mc[(m, "penalty_3")]["beneficial_abstention_rate_pWA"] or 0.0) * 100 for m in models]
    pca = [(tr_by_mc[(m, "penalty_3")]["harmful_cowardice_rate_pCA"] or 0.0) * 100 for m in models]

    b1 = ax1.bar(x - w / 2, pwa, w, label="Wrong → Abstained (Beneficial)", color="#2b8a3e", edgecolor="#1b4332", lw=0.7)
    b2 = ax1.bar(x + w / 2, pca, w, label="Correct → Abstained (Cowardice)", color="#c92a2a", edgecolor="#641220", lw=0.7)

    for idx, m in enumerate(models):
        t = tr_by_mc[(m, "penalty_3")]
        mx = t["matrix"]
        bc = t["baseline_counts"]
        ax1.text(x[idx] - w / 2, pwa[idx] + 1.5, f"{pwa[idx]:.1f}%\n({mx['W_to_A']}/{bc['wrong']})", ha="center", va="bottom", fontsize=7.8, fontweight="bold", color="#2b8a3e")
        ax1.text(x[idx] + w / 2, pca[idx] + 1.5, f"{pca[idx]:.1f}%\n({mx['C_to_A']}/{bc['correct']})", ha="center", va="bottom", fontsize=7.8, fontweight="bold", color="#c92a2a")
        pv = t["selectivity_fisher"]["p_value"]
        if pv is not None:
            p_lbl = f"p={pv:.1e}" if pv < 0.001 else f"p={pv:.3f}"
            top_y = max(pwa[idx], pca[idx]) + 11.5
            ax1.text(x[idx], top_y, f"Fisher {p_lbl}", ha="center", fontsize=7.6, color="#495057", bbox=dict(boxstyle="round,pad=0.2", fc="#f8f9fa", ec="#dee2e6"))

    ax1.set_xticks(x, [SHORT_MODEL[m] for m in models])
    ax1.set_ylabel("Transition Rate from Baseline Decision (%)")
    ax1.set_ylim(0, min(115, max(pwa + pca) + 25))
    ax1.set_title("A. Selectivity Under λ = −3: Error Avoidance vs. Cowardice")
    ax1.grid(axis="y", linestyle="--", alpha=0.3)
    ax1.legend(loc="upper right", fontsize=8.0, frameon=True)

    # Right: Domain Persistence (Pooled 3 models ECR across C0, C1, C2)
    dp = data["domain_persistence_by_condition"]
    strata = [
        ("nonfigure_social", "Non-Figure Social\n(Politics/Law, Ethics)\n40 Qs"),
        ("visual_social", "Visual Social\n(Korean Geography)\n20 Qs"),
        ("deductive_science", "Deductive Science\n(Life Science I)\n20 Qs"),
    ]
    xs = np.arange(len(strata))
    ws = 0.25
    for offset, cond, lbl, col in [
        (-ws, "baseline", "C0: Baseline", "#868e96"),
        (0.0, "penalty_1", "C1: λ = −1", "#339af0"),
        (ws, "penalty_3", "C2: λ = −3", "#e8590c"),
    ]:
        vals = [(dp[cond]["ecr"][k] or 0.0) * 100 for k, _ in strata]
        bars = ax2.bar(xs + offset, vals, ws, label=lbl, color=col, edgecolor="#212529", lw=0.6)
        for bar, (k, _) in zip(bars, strata):
            h = bar.get_height()
            c_dict = dp[cond]["counts"][k]
            a_n = c_dict.get("abstained", 0)
            w_n = c_dict.get("wrong", 0)
            ax2.text(
                bar.get_x() + bar.get_width() / 2, h + 1.3,
                f"{h:.1f}%\n({a_n}/{a_n+w_n})", ha="center", va="bottom", fontsize=7.3
            )

    ax2.set_xticks(xs, [lbl for _, lbl in strata])
    ax2.set_ylabel("Pooled Error-Capture Rate = Abstained / (Abstained + Wrong) (%)")
    ax2.set_ylim(0, 108)
    ax2.set_title("B. Does the Non-Figure Social Blind Spot Persist Under λ = −3?")
    ax2.grid(axis="y", linestyle="--", alpha=0.3)
    ax2.legend(loc="upper left", fontsize=8.2, frameon=True)

    fig.suptitle(
        "Calibration Quality & Domain Persistence Under Negative Marking (C0 → C1 → C2)",
        fontsize=12.2, fontweight="bold", y=1.01
    )
    fig.tight_layout()
    save_fig(fig, "fig_ablation2_selectivity_and_domains")


def main() -> None:
    data = json.loads((OUTPUTS_DIR / "ablation_analysis.json").read_text(encoding="utf-8"))
    plot_fig1_elasticity_utility(data)
    plot_fig2_selectivity_and_domains(data)
    print("Generated 2 ablation figures (PNG + SVG) in", OUTPUTS_DIR)


if __name__ == "__main__":
    main()

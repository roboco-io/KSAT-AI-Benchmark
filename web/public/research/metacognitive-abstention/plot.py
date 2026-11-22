#!/usr/bin/env python3
"""Generate publication-grade figures (PNG + SVG) from outputs/analysis.json."""

from __future__ import annotations

import json
import os
from pathlib import Path

os.environ.setdefault("MPLCONFIGDIR", "/tmp/mpl-ksat-abstention")

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

STUDY_DIR = Path(__file__).resolve().parent
OUTPUTS_DIR = STUDY_DIR / "outputs"

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
    "gpt-6.2-astra": "GPT-6.2 Astra",
    "claude-fable-5-2": "Claude Fable 5.2",
    "gpt-6.2-sol": "GPT-6.2 Sol",
    "claude-opus-5-5": "Claude Opus 5.5",
    "gpt-6.1-terra": "GPT-6.1 Terra",
    "claude-sonnet-5-5": "Claude Sonnet 5.5",
    "qwen4-max": "Qwen4 Max",
    "gemini-4-hydrogen": "Gemini 4 Hydrogen",
    "kimi-k3.1-pro": "Kimi K3.1 Pro",
    "claude-haiku-5-5": "Claude Haiku 5.5",
    "gpt-6-luna": "GPT-6 Luna",
    "deepseek-v4.1-flash": "DeepSeek V4.1 Flash",
    "solar-pro-4": "Solar Pro 4 (text)",
    "solar-mini-4-5-preview": "Solar Mini 4.5 (text)",
}

SHORT_SUBJECT = {
    "physics1": "Physics I",
    "physics2": "Physics II",
    "chemistry1": "Chemistry I",
    "chemistry2": "Chemistry II",
    "life_science1": "Life Science I",
    "life_science2": "Life Science II",
    "earth_science1": "Earth Science I",
    "earth_science2": "Earth Science II",
    "korean_geography": "Korean Geography",
    "world_geography": "World Geography",
    "east_asian_history": "East Asian History",
    "world_history": "World History",
    "economics": "Economics",
    "politics_law": "Politics & Law",
    "society_culture": "Society & Culture",
    "ethics_life": "Life & Ethics",
    "ethics_thought": "Ethics & Thought",
    "korean_history": "Korean History",
}


def save_fig(fig: plt.Figure, stem: str) -> None:
    for ext in ("png", "svg"):
        fig.savefig(OUTPUTS_DIR / f"{stem}.{ext}", dpi=200, bbox_inches="tight")
    plt.close(fig)


def plot_fig1_selective_tradeoff(data: dict) -> None:
    """Left: Overall vs Selective Accuracy dumbbell (2027 P4). Right: Penalty-adjusted utility curves."""
    p4_complete = [
        m
        for m in data["model_summaries"]
        if m["panel"] == "2027:period4" and m["is_complete"]
    ]
    p4_complete.sort(key=lambda m: (m["overall_acc"], m["selective_acc"] or 0))

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13.5, 5.8), gridspec_kw={"width_ratios": [1.15, 1.0]})

    y = np.arange(len(p4_complete))
    labels = [SHORT_MODEL.get(m["model"], m["model"]) for m in p4_complete]

    for idx, m in enumerate(p4_complete):
        oa = m["overall_acc"] * 100
        sa = (m["selective_acc"] or 0) * 100
        abst = m["abstained"]
        is_txt = m["input_mode"] == "text_transcript"
        c_line = "#2a9d8f" if abst > 0 else "#b0b8c1"
        if abst > 0:
            ax1.plot([oa, sa], [idx, idx], color=c_line, lw=2.4, zorder=2)
        ax1.scatter(
            oa, idx, color="#3b6e9c" if not is_txt else "#7f8c8d",
            s=52, zorder=3, marker="s" if is_txt else "o",
            label="Overall Accuracy" if idx == 0 else None,
        )
        if abst > 0:
            ax1.scatter(
                sa, idx, color="#e76f51", s=58, zorder=4,
                label="Selective Accuracy (answered only)" if idx == 1 else None,
            )
            ax1.text(
                sa + 1.0, idx, f"+{sa - oa:.1f}pp (n={abst})",
                va="center", fontsize=8.0, color="#c0392b", fontweight="bold" if (sa - oa) >= 4 else "normal"
            )
        else:
            ax1.text(
                oa + 1.0, idx, "0 abst.", va="center", fontsize=7.8, color="#6c757d"
            )

    ax1.set_yticks(y, labels)
    ax1.set_xlim(35, 114)
    ax1.set_xlabel("Accuracy (%)")
    ax1.set_title("A. Overall vs. Selective Accuracy (2027 Period 4, 360 Qs)")
    ax1.grid(axis="x", linestyle="--", alpha=0.35)
    # Clean custom legend
    h1 = plt.Line2D([], [], color="#3b6e9c", marker="o", linestyle="None", markersize=6.5, label="Overall Acc (image)")
    h2 = plt.Line2D([], [], color="#7f8c8d", marker="s", linestyle="None", markersize=6.5, label="Overall Acc (text transcript)")
    h3 = plt.Line2D([], [], color="#e76f51", marker="o", linestyle="None", markersize=6.5, label="Selective Acc (answered only)")
    ax1.legend(handles=[h1, h2, h3], loc="lower right", fontsize=8.2, frameon=True)

    # Right panel: Penalty-adjusted utility curves U_lambda for key primary image models
    lambdas = [0.0, 0.25, 0.5, 1.0, 2.0, 3.0, 4.0]
    highlight = [
        ("gpt-6.2-astra", "#1d3557", "-", 2.0),
        ("claude-sonnet-5-5", "#457b9d", "--", 1.8),
        ("gemini-4-hydrogen", "#2a9d8f", "-", 2.3),
        ("qwen4-max", "#e9c46a", "--", 2.0),
        ("kimi-k3.1-pro", "#f4a261", "--", 2.0),
        ("claude-haiku-5-5", "#e76f51", "-", 2.5),
        ("gpt-6-luna", "#9b5de5", "-.", 1.9),
        ("deepseek-v4.1-flash", "#6c757d", ":", 2.0),
    ]
    by_model = {
        m["model"]: m
        for m in data["model_summaries"]
        if m["panel"] == "2027:period4" and m["is_complete"] and m["input_mode"] == "image"
    }
    for mid, col, ls, lw in highlight:
        m = by_model[mid]
        vals = [m["utilities"][str(l)] for l in lambdas]
        ax2.plot(
            lambdas, vals, label=f"{SHORT_MODEL[mid]} (abst={m['abstained']})",
            color=col, linestyle=ls, linewidth=lw, marker="o", markersize=4
        )
    ax2.axvline(0.25, color="#adb5bd", linestyle=":", lw=1.2)
    ax2.text(0.32, -0.58, "λ=0.25\n(5-choice random\nbreak-even)", fontsize=7.5, color="#495057", bbox=dict(boxstyle="round,pad=0.2", fc="white", ec="none", alpha=0.8))
    ax2.axhline(0.0, color="#343a40", lw=0.8, alpha=0.5)
    ax2.set_xlabel("Wrong-Answer Penalty λ  (Utility = Acc − λ · ErrorRate)")
    ax2.set_ylabel("Expected Utility U(λ)")
    ax2.set_title("B. Risk-Sensitive Utility Reversals Under Wrong Penalty λ")
    ax2.set_xlim(-0.1, 4.15)
    ax2.set_ylim(-2.0, 1.08)
    ax2.grid(True, linestyle="--", alpha=0.3)
    ax2.legend(loc="lower left", fontsize=7.8, frameon=True)

    fig.suptitle(
        "Selective Prediction on 2027 KSAT Period 4: Abstention Reshapes Risk-Sensitive Rankings",
        fontsize=12.5, fontweight="bold", y=1.01
    )
    fig.tight_layout()
    save_fig(fig, "fig1_selective_tradeoff")


def plot_fig2_domain_asymmetry(data: dict) -> None:
    """Left: 2x2 Factorial ECR (Social vs Science x Non-Figure vs Figure). Right: 18-subject ECR."""
    pooled = data["p4_fisher_tests_pooled"]
    # Extract 4 cells from within_nonfigure_sci_vs_soc and within_figure_sci_vs_soc
    nf = pooled["within_nonfigure_sci_vs_soc"]["table"]  # [[sci_na, sci_nw], [soc_na, soc_nw]]
    fg = pooled["within_figure_sci_vs_soc"]["table"]     # [[sci_fa, sci_fw], [soc_fa, soc_fw]]

    sci_nofig_ecr = nf[0][0] / (nf[0][0] + nf[0][1]) * 100
    soc_nofig_ecr = nf[1][0] / (nf[1][0] + nf[1][1]) * 100
    sci_fig_ecr = fg[0][0] / (fg[0][0] + fg[0][1]) * 100
    soc_fig_ecr = fg[1][0] / (fg[1][0] + fg[1][1]) * 100

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14.0, 6.0), gridspec_kw={"width_ratios": [0.95, 1.25]})

    # Left: 2x2 grouped bar chart
    x = np.array([0, 1])
    width = 0.34
    bars_nf = ax1.bar(
        x - width / 2, [soc_nofig_ecr, sci_nofig_ecr], width,
        label="Non-Figure Questions", color="#5c7cfa", edgecolor="#2b3a67", lw=0.8
    )
    bars_fg = ax1.bar(
        x + width / 2, [soc_fig_ecr, sci_fig_ecr], width,
        label="Figure-Dependent (Maps/Charts/Diagrams)", color="#f76707", edgecolor="#7f2d00", lw=0.8
    )

    counts_nf = [f"{nf[1][0]}/{nf[1][0]+nf[1][1]}", f"{nf[0][0]}/{nf[0][0]+nf[0][1]}"]
    counts_fg = [f"{fg[1][0]}/{fg[1][0]+fg[1][1]}", f"{fg[0][0]}/{fg[0][0]+fg[0][1]}"]
    for bar, cnt in zip(bars_nf, counts_nf):
        h = bar.get_height()
        ax1.text(bar.get_x() + bar.get_width() / 2, h + 1.5, f"{h:.1f}%\n({cnt})", ha="center", va="bottom", fontsize=8.5, fontweight="bold")
    for bar, cnt in zip(bars_fg, counts_fg):
        h = bar.get_height()
        ax1.text(bar.get_x() + bar.get_width() / 2, h + 1.5, f"{h:.1f}%\n({cnt})", ha="center", va="bottom", fontsize=8.5, fontweight="bold")

    # Significance brackets
    ax1.plot([-0.17, 0.17], [34, 34], color="#333", lw=1.1)
    ax1.text(0.0, 35.2, f"OR={pooled['within_social_fig_vs_nonfig']['odds_ratio']:.2f}\np={pooled['within_social_fig_vs_nonfig']['p_value']:.1e}", ha="center", fontsize=8.0, color="#c92a2a", fontweight="bold")

    ax1.plot([0.83, 1.17], [65, 65], color="#333", lw=1.1)
    ax1.text(1.0, 66.2, f"OR={pooled['within_science_fig_vs_nonfig']['odds_ratio']:.2f}\np={pooled['within_science_fig_vs_nonfig']['p_value']:.2f} (n.s.)", ha="center", fontsize=8.0, color="#495057")

    ax1.annotate(
        f"Non-Figure Science vs Social:\nOR = {pooled['within_nonfigure_sci_vs_soc']['odds_ratio']:.1f}  (p = {pooled['within_nonfigure_sci_vs_soc']['p_value']:.1e})",
        xy=(0.83, sci_nofig_ecr), xytext=(-0.38, 56),
        fontsize=8.1, fontweight="bold", color="#1864ab",
        bbox=dict(boxstyle="round,pad=0.35", fc="#e7f5ff", ec="#339af0", lw=0.9),
        arrowprops=dict(arrowstyle="->", color="#1864ab", lw=1.1)
    )

    ax1.set_xticks(x, ["Social Studies\n(9 subjects, 180 Qs)", "Science Inquiry\n(8 subjects, 160 Qs)"])
    ax1.set_ylabel("Error-Capture Rate = Abstained / (Abstained + Wrong) (%)")
    ax1.set_ylim(0, 88)
    ax1.set_title("A. 2×2 Decomposition: Domain × Visual Dependence\n(Pooled across 8 abstaining primary image models)")
    ax1.grid(axis="y", linestyle="--", alpha=0.3)
    ax1.legend(loc="upper left", fontsize=8.3, frameon=True)

    # Right: All 18 subjects sorted by ECR
    subjs = sorted(
        data["p4_subject_breakdown"],
        key=lambda s: (s["error_capture_rate_primary"] or 0.0, s["total_abstained_primary"]),
    )
    y = np.arange(len(subjs))
    ecrs = [(s["error_capture_rate_primary"] or 0.0) * 100 for s in subjs]
    dom_colors = {
        "science2": "#0b7285",
        "science1": "#22b8cf",
        "social": "#f59f00",
        "korean_history": "#868e96",
    }
    colors = [dom_colors.get(s["domain"], "#adb5bd") for s in subjs]
    bars = ax2.barh(y, ecrs, color=colors, edgecolor="#212529", lw=0.5, height=0.72)

    for idx, s in enumerate(subjs):
        val = ecrs[idx]
        lbl = f"{val:.1f}%  (abst={s['total_abstained_primary']}, err={s['total_wrong_primary']}, fig={s['n_figure_dependent']}/20)"
        ax2.text(val + 0.8, idx, lbl, va="center", fontsize=7.6, color="#212529")

    ax2.set_yticks(y, [SHORT_SUBJECT.get(s["subject"], s["subject"]) for s in subjs])
    ax2.set_xlim(0, 84)
    ax2.set_xlabel("Error-Capture Rate across 12 Complete Image Models (%)")
    ax2.set_title("B. Error-Capture Rate Across All 18 Period 4 Subjects")
    ax2.grid(axis="x", linestyle="--", alpha=0.3)
    leg_handles = [
        plt.Rectangle((0, 0), 1, 1, fc="#0b7285", ec="#212529", lw=0.5, label="Science II (4 subjs)"),
        plt.Rectangle((0, 0), 1, 1, fc="#22b8cf", ec="#212529", lw=0.5, label="Science I (4 subjs)"),
        plt.Rectangle((0, 0), 1, 1, fc="#f59f00", ec="#212529", lw=0.5, label="Social Studies (9 subjs)"),
        plt.Rectangle((0, 0), 1, 1, fc="#868e96", ec="#212529", lw=0.5, label="Korean History (1 subj)"),
    ]
    ax2.legend(handles=leg_handles, loc="lower right", fontsize=8.0, frameon=True)

    fig.suptitle(
        "Domain Asymmetry of Metacognitive Abstention: Deductive STEM vs. Recall-Based Social Studies",
        fontsize=12.5, fontweight="bold", y=1.01
    )
    fig.tight_layout()
    save_fig(fig, "fig2_domain_asymmetry")


def plot_fig3_difficulty_calibration(data: dict) -> None:
    """Leave-one-out peer accuracy on Correct vs Wrong vs Abstained items (2027 P4)."""
    models = [
        m
        for m in data["model_summaries"]
        if m["panel"] == "2027:period4"
        and m["is_complete"]
        and m["input_mode"] == "image"
        and m["abstained"] >= 2
    ]
    models.sort(key=lambda m: m["peer_acc_loo"]["auroc_abst_vs_correct"]["auroc"], reverse=True)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13.5, 5.2), gridspec_kw={"width_ratios": [1.25, 0.95]})

    x = np.arange(len(models))
    w = 0.25
    corr_vals = [m["peer_acc_loo"]["correct_mean"] * 100 for m in models]
    wrong_vals = [m["peer_acc_loo"]["wrong_mean"] * 100 for m in models]
    abst_vals = [m["peer_acc_loo"]["abstained_mean"] * 100 for m in models]

    b1 = ax1.bar(x - w, corr_vals, w, label="Answered Correct", color="#2b8a3e", alpha=0.88)
    b2 = ax1.bar(x, wrong_vals, w, label="Answered Wrong", color="#f08c00", alpha=0.88)
    b3 = ax1.bar(x + w, abst_vals, w, label="Abstained", color="#c92a2a", alpha=0.90)

    for bars in (b1, b2, b3):
        for bar in bars:
            h = bar.get_height()
            ax1.text(bar.get_x() + bar.get_width() / 2, h + 1.0, f"{h:.0f}%", ha="center", va="bottom", fontsize=7.2)

    ax1.set_xticks(x, [f"{SHORT_MODEL[m['model']]}\n(n={m['abstained']})" for m in models], rotation=20, ha="right")
    ax1.set_ylabel("Mean Leave-One-Out Peer Accuracy (%)")
    ax1.set_ylim(0, 118)
    ax1.set_title("A. Item Difficulty (LOO Peer Acc) by Model Decision\n(Lower = Harder Question)")
    ax1.grid(axis="y", linestyle="--", alpha=0.3)
    ax1.legend(loc="upper center", ncol=3, fontsize=8.0, frameon=True)

    # Right: AUROC forest/bar plot (Abst vs Correct and Abst vs Wrong)
    y = np.arange(len(models))
    auroc_ac = [m["peer_acc_loo"]["auroc_abst_vs_correct"]["auroc"] for m in models]
    auroc_aw = [m["peer_acc_loo"]["auroc_abst_vs_wrong"]["auroc"] for m in models]
    p_ac = [m["peer_acc_loo"]["auroc_abst_vs_correct"]["p_value"] for m in models]
    p_aw = [m["peer_acc_loo"]["auroc_abst_vs_wrong"]["p_value"] for m in models]

    ax2.axvline(0.5, color="#495057", linestyle="--", lw=1.1, label="Random (AUROC = 0.50)")
    ax2.barh(y - 0.17, auroc_ac, height=0.32, color="#1971c2", label="Abstained vs. Correct")
    ax2.barh(y + 0.17, auroc_aw, height=0.32, color="#e8590c", label="Abstained vs. Wrong")

    for i in range(len(models)):
        star_ac = "***" if p_ac[i] < 0.001 else ("**" if p_ac[i] < 0.01 else ("*" if p_ac[i] < 0.05 else ""))
        star_aw = "*" if p_aw[i] < 0.05 else ""
        ax2.text(auroc_ac[i] + 0.015, i - 0.17, f"{auroc_ac[i]:.2f}{star_ac}", va="center", fontsize=8.0, color="#1864ab", fontweight="bold")
        ax2.text(auroc_aw[i] + 0.015, i + 0.17, f"{auroc_aw[i]:.2f}{star_aw}", va="center", fontsize=8.0, color="#d9480f")

    ax2.set_yticks(y, [SHORT_MODEL[m["model"]] for m in models])
    ax2.invert_yaxis()
    ax2.set_xlim(0.0, 1.15)
    ax2.set_xlabel("Difficulty Separation AUROC  (>0.5 = Abstained Items Are Harder)")
    ax2.set_title("B. Difficulty Discrimination AUROC (Mann-Whitney U)")
    ax2.grid(axis="x", linestyle="--", alpha=0.3)
    ax2.legend(loc="lower right", fontsize=8.0, frameon=True)

    fig.suptitle(
        "Calibration to Objective Item Difficulty: Abstained Items Are Systematically Harder (2027 Period 4)",
        fontsize=12.2, fontweight="bold", y=1.01
    )
    fig.tight_layout()
    save_fig(fig, "fig3_difficulty_calibration")


def plot_fig4_taxonomy_and_p13(data: dict) -> None:
    """Left: Abstention mechanism taxonomy by domain (all 187 primary abstentions). Right: Period 1-3 ECR gradient."""
    tax_by_dom = data["taxonomy_by_domain"]
    dom_groups = [
        ("Science II\n(2027 P4)", ["science2"]),
        ("Science I\n(2027 P4)", ["science1"]),
        ("Social Studies\n(2027 P4)", ["social"]),
        ("Korean\n(2025–27 P1–3)", ["korean_common", "korean_hwajak", "korean_language_media"]),
        ("Math\n(2025–27 P1–3)", ["math_mcq", "math_short_answer"]),
    ]
    mechs = [
        ("deductive_derivation_block", "Deductive / Constraint Block", "#1971c2"),
        ("visual_spatial_grounding", "Visual / Spatial Grounding", "#f76707"),
        ("option_elimination_ambiguity", "Option-Elimination Ambiguity", "#7048e8"),
        ("factual_knowledge_gap", "Factual Knowledge Gap", "#2f9e44"),
        ("no_explanation", "No Explanation", "#adb5bd"),
        ("general_uncertainty", "General Uncertainty", "#dee2e6"),
    ]

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13.5, 5.2), gridspec_kw={"width_ratios": [1.15, 1.0]})

    y = np.arange(len(dom_groups))
    lefts = np.zeros(len(dom_groups))
    totals = []
    for i, (_, keys) in enumerate(dom_groups):
        totals.append(sum(sum(tax_by_dom.get(k, {}).values()) for k in keys))

    for mkey, mlabel, mcol in mechs:
        vals = []
        for _, keys in dom_groups:
            vals.append(sum(tax_by_dom.get(k, {}).get(mkey, 0) for k in keys))
        vals = np.array(vals, dtype=float)
        if vals.sum() == 0:
            continue
        ax1.barh(y, vals, left=lefts, color=mcol, edgecolor="white", lw=0.7, height=0.62, label=f"{mlabel} ({int(vals.sum())})")
        for i, v in enumerate(vals):
            if v >= 5:
                ax1.text(lefts[i] + v / 2, i, f"{int(v)}", ha="center", va="center", fontsize=8.2, color="white" if mcol not in ("#adb5bd", "#dee2e6") else "#212529", fontweight="bold")
        lefts += vals

    for i, tot in enumerate(totals):
        ax1.text(tot + 1.0, i, f"n={tot}", va="center", fontsize=8.5, fontweight="bold")

    tot_n = sum(totals)
    tax_all = data["taxonomy_primary_image_counts"]
    dv_pct = (tax_all.get("deductive_derivation_block", 0) + tax_all.get("visual_spatial_grounding", 0)) / tot_n * 100
    fg_pct = tax_all.get("factual_knowledge_gap", 0) / tot_n * 100
    ax1.set_yticks(y, [g[0] for g in dom_groups])
    ax1.invert_yaxis()
    ax1.set_xlim(0, max(totals) + 12)
    ax1.set_xlabel(f"Abstention Instances (All Primary Complete Image Runs, Total N={tot_n})")
    ax1.set_title(f"A. Stated Mechanism of Abstention by Domain\n({dv_pct:.1f}% Deductive/Visual vs. {fg_pct:.1f}% Factual Gap)")
    ax1.grid(axis="x", linestyle="--", alpha=0.3)
    ax1.legend(loc="lower right", fontsize=7.8, frameon=True)

    # Right: Period 1-3 ECR Gradient across subjects/question types
    p13 = data["p13_domain_summary"]
    p13_order = [
        ("math_short_answer", "Math Short-Answer\n(0–999)", "#0b7285"),
        ("math_mcq", "Math 5-Choice\nMCQ", "#22b8cf"),
        ("korean_language_media", "Korean: Lang. &\nMedia (Grammar)", "#5c7cfa"),
        ("korean_common", "Korean: Common\n(Reading/Lit.)", "#748ffc"),
        ("korean_hwajak", "Korean: Speech\n& Writing", "#91a7ff"),
        ("english_reading", "English:\nReading", "#ced4da"),
        ("english_listening_script", "English: Listening\n(Transcript)", "#dee2e6"),
    ]
    y2 = np.arange(len(p13_order))
    ecrs2 = [(p13[k]["error_capture_rate"] or 0.0) * 100 for k, _, _ in p13_order]
    cols2 = [c for _, _, c in p13_order]
    ax2.barh(y2, ecrs2, color=cols2, edgecolor="#212529", lw=0.6, height=0.62)
    for i, (k, _, _) in enumerate(p13_order):
        rec = p13[k]
        val = ecrs2[i]
        ax2.text(val + 1.0, i, f"{val:.1f}%  (abst={rec['abstained']}, err={rec['wrong']})", va="center", fontsize=8.0)

    ax2.set_yticks(y2, [lbl for _, lbl, _ in p13_order])
    ax2.invert_yaxis()
    ax2.set_xlim(0, 72)
    ax2.set_xlabel("Error-Capture Rate across 34 Complete Image Runs (%)")
    ax2.set_title("B. Independent Replication in Periods 1–3 (2025–2027)\n(Formal/Short-Answer vs. Verbal/English)")
    ax2.grid(axis="x", linestyle="--", alpha=0.3)

    fig.suptitle(
        "Why Do LLMs Abstain? Constraint & Grounding Failures Dominate Across All KSAT Sessions",
        fontsize=12.2, fontweight="bold", y=1.01
    )
    fig.tight_layout()
    save_fig(fig, "fig4_abstention_taxonomy")


def main() -> None:
    data = json.loads((OUTPUTS_DIR / "analysis.json").read_text(encoding="utf-8"))
    plot_fig1_selective_tradeoff(data)
    plot_fig2_domain_asymmetry(data)
    plot_fig3_difficulty_calibration(data)
    plot_fig4_taxonomy_and_p13(data)
    print("Generated 4 figures (PNG + SVG) in", OUTPUTS_DIR)


if __name__ == "__main__":
    main()

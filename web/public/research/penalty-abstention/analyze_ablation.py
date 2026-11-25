#!/usr/bin/env python3
"""Causal analysis of Penalty-Incentive Ablation (C0 baseline vs C1 λ=1 vs C2 λ=3)."""

from __future__ import annotations

import csv
import json
import math
import sys
from collections import Counter, defaultdict
from pathlib import Path

ABLATION_DIR = Path(__file__).resolve().parent
PARENT_STUDY = ABLATION_DIR.parent
sys.path.insert(0, str(PARENT_STUDY))

import analyze as base_analyze  # noqa: E402

RUNS_DIR = ABLATION_DIR / "runs"
OUTPUTS_DIR = ABLATION_DIR / "outputs"

TARGET_SECTIONS = [
    "politics_law",
    "ethics_thought",
    "korean_geography",
    "life_science1",
]
TARGET_MODELS = [
    "deepseek-v4.1-flash",
    "gpt-6-luna",
    "claude-haiku-5-5",
]
CONDITIONS = ["baseline", "penalty_1", "penalty_3"]


def domain_stratum(section: str) -> str:
    if section in ("politics_law", "ethics_thought"):
        return "nonfigure_social"
    if section == "korean_geography":
        return "visual_social"
    if section == "life_science1":
        return "deductive_science"
    return section


def exact_mcnemar_two_sided(b: int, c: int) -> dict:
    """Exact two-sided binomial McNemar test on discordant pairs (b = 0->1, c = 1->0)."""
    n = b + c
    if n == 0:
        return {"b_0to1": b, "c_1to0": c, "n_discordant": 0, "p_value": 1.0}
    k = min(b, c)
    # Sum P(Bin(n, 0.5) <= k) * 2 capped at 1.0
    prob = 0.0
    for i in range(0, k + 1):
        prob += math.comb(n, i) * (0.5**n)
    p_two = min(1.0, 2.0 * prob)
    return {"b_0to1": b, "c_1to0": c, "n_discordant": n, "p_value": p_two}


def outcome_of(rec: dict | None, correct_answer) -> str:
    if rec is None:
        return "missing"
    if rec.get("decision") == "abstained" or rec.get("answer") is None:
        return "abstained"
    if str(rec.get("answer")) == str(correct_answer):
        return "correct"
    return "wrong"


def metrics_for_outcomes(outcomes: list[str]) -> dict:
    n = len(outcomes)
    c = sum(1 for o in outcomes if o == "correct")
    w = sum(1 for o in outcomes if o == "wrong")
    a = sum(1 for o in outcomes if o == "abstained")
    m = sum(1 for o in outcomes if o == "missing")
    ans = c + w
    non_c = w + a
    return {
        "total": n,
        "correct": c,
        "wrong": w,
        "abstained": a,
        "missing": m,
        "overall_acc": round(c / n, 4) if n else 0.0,
        "selective_acc": round(c / ans, 4) if ans else None,
        "abstention_rate": round(a / n, 4) if n else 0.0,
        "error_capture_rate": round(a / non_c, 4) if non_c else None,
        "utility_lam0": round(c / n, 4) if n else 0.0,
        "utility_lam1": round((c - 1.0 * w) / n, 4) if n else 0.0,
        "utility_lam3": round((c - 3.0 * w) / n, 4) if n else 0.0,
    }


def compute_transition(base_outcomes: list[str], treat_outcomes: list[str]) -> dict:
    matrix = Counter(zip(base_outcomes, treat_outcomes))
    c0 = sum(1 for o in base_outcomes if o == "correct")
    w0 = sum(1 for o in base_outcomes if o == "wrong")
    a0 = sum(1 for o in base_outcomes if o == "abstained")

    wa = matrix[("wrong", "abstained")]
    ca = matrix[("correct", "abstained")]
    w_not_a = w0 - wa
    c_not_a = c0 - ca

    # McNemar on binary abstained (0 -> 1 vs 1 -> 0)
    b_0to1 = sum(1 for bo, to in zip(base_outcomes, treat_outcomes) if bo != "abstained" and to == "abstained")
    c_1to0 = sum(1 for bo, to in zip(base_outcomes, treat_outcomes) if bo == "abstained" and to != "abstained")

    p_wa = wa / w0 if w0 else None
    p_ca = ca / c0 if c0 else None
    selectivity = (p_wa / p_ca) if (p_wa is not None and p_ca and p_ca > 0) else (float("inf") if (p_wa and p_wa > 0 and p_ca == 0) else None)

    return {
        "matrix": {
            "C_to_C": matrix[("correct", "correct")],
            "C_to_W": matrix[("correct", "wrong")],
            "C_to_A": ca,
            "W_to_C": matrix[("wrong", "correct")],
            "W_to_W": matrix[("wrong", "wrong")],
            "W_to_A": wa,
            "A_to_C": matrix[("abstained", "correct")],
            "A_to_W": matrix[("abstained", "wrong")],
            "A_to_A": matrix[("abstained", "abstained")],
        },
        "baseline_counts": {"correct": c0, "wrong": w0, "abstained": a0},
        "beneficial_abstention_rate_pWA": round(p_wa, 4) if p_wa is not None else None,
        "harmful_cowardice_rate_pCA": round(p_ca, 4) if p_ca is not None else None,
        "selectivity_ratio": None if (selectivity is None or math.isinf(selectivity)) else round(selectivity, 3),
        "selectivity_infinite": bool(selectivity is not None and math.isinf(selectivity)),
        "selectivity_fisher": base_analyze.fisher_exact_two_sided(wa, w_not_a, ca, c_not_a),
        "mcnemar_abstention_shift": exact_mcnemar_two_sided(b_0to1, c_1to0),
    }


def main() -> None:
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    ds = json.loads((PARENT_STUDY / "inputs/datasets/2027-ksat-period4.json").read_text(encoding="utf-8"))
    fig_set = set(json.loads((PARENT_STUDY / "inputs/figure_dependent.json").read_text(encoding="utf-8"))["2027:period4"])
    frozen_runs = json.loads((PARENT_STUDY / "inputs/runs.json").read_text(encoding="utf-8"))

    target_qs = [q for q in ds["questions"] if q["section"] in TARGET_SECTIONS]
    assert len(target_qs) == 80, f"Expected 80 questions, got {len(target_qs)}"

    # Load baseline (C0) + treatment runs (C1, C2)
    answers_by_mc: dict[tuple[str, str], dict] = {}
    run_meta: dict[tuple[str, str], dict] = {}

    for r in frozen_runs:
        if r["panel"] == "2027:period4" and r["model"] in TARGET_MODELS and r["is_complete"]:
            answers_by_mc[(r["model"], "baseline")] = r["answers"]
            run_meta[(r["model"], "baseline")] = {
                "source": "frozen_2027_p4_baseline",
                "wall_time_seconds": r.get("wall_time_seconds"),
            }

    for model in TARGET_MODELS:
        for cond in ("penalty_1", "penalty_3"):
            fpath = RUNS_DIR / f"{cond}__{model}.json"
            if not fpath.exists():
                raise FileNotFoundError(f"Missing ablation run file: {fpath}")
            raw = json.loads(fpath.read_text(encoding="utf-8"))
            answers_by_mc[(model, cond)] = raw.get("answers") or {}
            run_meta[(model, cond)] = {
                "source": fpath.name,
                "completed": raw.get("completed"),
                "wall_time_seconds": raw.get("wall_time_seconds"),
                "usage": raw.get("usage"),
                "prompt_hash": raw.get("prompt_hash"),
            }

    condition_summaries = []
    transitions = []
    subject_rows = []
    stratum_rows = []
    new_abstentions = []
    taxonomy_by_cond: dict[str, Counter] = defaultdict(Counter)
    taxonomy_by_mc: dict[str, Counter] = defaultdict(Counter)

    # Pooled counters by condition for domain asymmetry test at C0, C1, C2
    domain_cond_counts = defaultdict(lambda: Counter())

    for model in TARGET_MODELS:
        outcomes_by_cond: dict[str, list[str]] = {}
        for cond in CONDITIONS:
            ans_map = answers_by_mc[(model, cond)]
            outs = [outcome_of(ans_map.get(q["id"]), q["correct_answer"]) for q in target_qs]
            outcomes_by_cond[cond] = outs
            m = metrics_for_outcomes(outs)
            condition_summaries.append(
                {
                    "model": model,
                    "condition": cond,
                    **m,
                    "wall_time_seconds": run_meta[(model, cond)].get("wall_time_seconds"),
                }
            )

            # Per-subject & per-stratum breakdown
            by_sec = defaultdict(list)
            by_strat = defaultdict(list)
            for q, o in zip(target_qs, outs):
                by_sec[q["section"]].append(o)
                st = domain_stratum(q["section"])
                by_strat[st].append(o)
                domain_cond_counts[(cond, st)][o] += 1

                if o == "abstained":
                    rec = ans_map[q["id"]]
                    mech, tags = base_analyze.classify_abstention_explanation(
                        rec.get("explanation") or "", rec.get("abstain_reason")
                    )
                    taxonomy_by_cond[cond][mech] += 1
                    taxonomy_by_mc[f"{model}:{cond}"][mech] += 1

            for sec in TARGET_SECTIONS:
                subject_rows.append(
                    {
                        "model": model,
                        "condition": cond,
                        "section": sec,
                        "stratum": domain_stratum(sec),
                        **metrics_for_outcomes(by_sec[sec]),
                    }
                )
            for strat in ("nonfigure_social", "visual_social", "deductive_science"):
                stratum_rows.append(
                    {
                        "model": model,
                        "condition": cond,
                        "stratum": strat,
                        **metrics_for_outcomes(by_strat[strat]),
                    }
                )

        # Transitions C0 -> C1 and C0 -> C2
        base_m = metrics_for_outcomes(outcomes_by_cond["baseline"])
        for cond, lam_key in (("penalty_1", "utility_lam1"), ("penalty_3", "utility_lam3")):
            tr = compute_transition(outcomes_by_cond["baseline"], outcomes_by_cond[cond])
            treat_m = metrics_for_outcomes(outcomes_by_cond[cond])
            tr_by_strat = {}
            for strat in ("nonfigure_social", "visual_social", "deductive_science"):
                idxs = [i for i, q in enumerate(target_qs) if domain_stratum(q["section"]) == strat]
                tr_by_strat[strat] = compute_transition(
                    [outcomes_by_cond["baseline"][i] for i in idxs],
                    [outcomes_by_cond[cond][i] for i in idxs],
                )
            transitions.append(
                {
                    "model": model,
                    "comparison": f"baseline_to_{cond}",
                    "condition": cond,
                    "delta_utility_at_target_lambda": round(treat_m[lam_key] - base_m[lam_key], 4),
                    "baseline_utility_at_target_lambda": base_m[lam_key],
                    "adapted_utility_at_target_lambda": treat_m[lam_key],
                    **tr,
                    "by_stratum": tr_by_strat,
                }
            )

            # Record newly induced abstentions (baseline != abstained -> cond == abstained)
            ans_treat = answers_by_mc[(model, cond)]
            for q, bo, to in zip(target_qs, outcomes_by_cond["baseline"], outcomes_by_cond[cond]):
                if bo != "abstained" and to == "abstained":
                    rec = ans_treat[q["id"]]
                    mech, _ = base_analyze.classify_abstention_explanation(
                        rec.get("explanation") or "", rec.get("abstain_reason")
                    )
                    new_abstentions.append(
                        {
                            "model": model,
                            "condition": cond,
                            "question_id": q["id"],
                            "section": q["section"],
                            "stratum": domain_stratum(q["section"]),
                            "figure_dependent": q["id"] in fig_set,
                            "baseline_outcome": bo,
                            "abstain_reason": rec.get("abstain_reason"),
                            "mechanism": mech,
                            "explanation": (rec.get("explanation") or "").strip(),
                        }
                    )

    # Pooled domain asymmetry tests under each condition (C0, C1, C2)
    domain_persistence_tests = {}
    for cond in CONDITIONS:
        sci = domain_cond_counts[(cond, "deductive_science")]
        vsoc = domain_cond_counts[(cond, "visual_social")]
        nfsoc = domain_cond_counts[(cond, "nonfigure_social")]
        domain_persistence_tests[cond] = {
            "counts": {
                "nonfigure_social": dict(nfsoc),
                "visual_social": dict(vsoc),
                "deductive_science": dict(sci),
            },
            "ecr": {
                "nonfigure_social": round(nfsoc["abstained"] / (nfsoc["abstained"] + nfsoc["wrong"]), 4)
                if (nfsoc["abstained"] + nfsoc["wrong"]) else None,
                "visual_social": round(vsoc["abstained"] / (vsoc["abstained"] + vsoc["wrong"]), 4)
                if (vsoc["abstained"] + vsoc["wrong"]) else None,
                "deductive_science": round(sci["abstained"] / (sci["abstained"] + sci["wrong"]), 4)
                if (sci["abstained"] + sci["wrong"]) else None,
            },
            "science_vs_nonfigure_social_fisher": base_analyze.fisher_exact_two_sided(
                sci["abstained"], sci["wrong"], nfsoc["abstained"], nfsoc["wrong"]
            ),
            "visual_social_vs_nonfigure_social_fisher": base_analyze.fisher_exact_two_sided(
                vsoc["abstained"], vsoc["wrong"], nfsoc["abstained"], nfsoc["wrong"]
            ),
        }

    # Pooled transition summary across all 3 models (240 items)
    pooled_transitions = {}
    for cond in ("penalty_1", "penalty_3"):
        b_all = []
        t_all = []
        for model in TARGET_MODELS:
            b_all.extend(outcome_of(answers_by_mc[(model, "baseline")].get(q["id"]), q["correct_answer"]) for q in target_qs)
            t_all.extend(outcome_of(answers_by_mc[(model, cond)].get(q["id"]), q["correct_answer"]) for q in target_qs)
        pooled_transitions[cond] = compute_transition(b_all, t_all)

    analysis = {
        "schema_version": 1,
        "experiment": "ablation-penalty-v1",
        "target_sections": TARGET_SECTIONS,
        "target_models": TARGET_MODELS,
        "n_questions": len(target_qs),
        "condition_summaries": condition_summaries,
        "transitions": transitions,
        "pooled_transitions": pooled_transitions,
        "domain_persistence_by_condition": domain_persistence_tests,
        "subject_rows": subject_rows,
        "stratum_rows": stratum_rows,
        "taxonomy_by_condition": {k: dict(v) for k, v in taxonomy_by_cond.items()},
        "taxonomy_by_model_condition": {k: dict(v) for k, v in taxonomy_by_mc.items()},
        "new_abstention_count": len(new_abstentions),
        "run_meta": {f"{m}:{c}": v for (m, c), v in run_meta.items()},
    }

    (OUTPUTS_DIR / "ablation_analysis.json").write_text(
        json.dumps(analysis, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    def write_csv(name: str, rows: list[dict], fields: list[str]) -> None:
        with (OUTPUTS_DIR / name).open("w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=fields)
            w.writeheader()
            for r in rows:
                w.writerow({k: r.get(k) for k in fields})

    write_csv(
        "condition_summary.csv",
        condition_summaries,
        [
            "model", "condition", "total", "correct", "wrong", "abstained", "missing",
            "overall_acc", "selective_acc", "abstention_rate", "error_capture_rate",
            "utility_lam0", "utility_lam1", "utility_lam3", "wall_time_seconds",
        ],
    )
    write_csv(
        "subject_elasticity.csv",
        subject_rows,
        [
            "model", "condition", "section", "stratum", "total", "correct", "wrong",
            "abstained", "overall_acc", "selective_acc", "abstention_rate", "error_capture_rate",
        ],
    )
    write_csv(
        "new_abstentions.csv",
        new_abstentions,
        [
            "model", "condition", "question_id", "section", "stratum", "figure_dependent",
            "baseline_outcome", "abstain_reason", "mechanism", "explanation",
        ],
    )

    # Print crisp console summary
    print("=== PENALTY ABLATION SUMMARY (80 Qs per model) ===")
    for s in condition_summaries:
        sel = f"{s['selective_acc']*100:5.1f}%" if s["selective_acc"] is not None else "  -  "
        ecr = f"{s['error_capture_rate']*100:5.1f}%" if s["error_capture_rate"] is not None else "  -  "
        print(
            f"  {s['model']:20s} | {s['condition']:10s} | C={s['correct']:2d} W={s['wrong']:2d} A={s['abstained']:2d} M={s['missing']} | "
            f"acc={s['overall_acc']*100:5.1f}% sel={sel} ECR={ecr} | U1={s['utility_lam1']:+.3f} U3={s['utility_lam3']:+.3f}"
        )
    print("\n=== TRANSITIONS (C0 -> C1 / C2) ===")
    for t in transitions:
        mx = t["matrix"]
        p_mc = t["mcnemar_abstention_shift"]["p_value"]
        p_sel = t["selectivity_fisher"]["p_value"]
        p_sel_s = f"{p_sel:.2e}" if p_sel is not None else "None"
        print(
            f"  {t['model']:20s} | {t['condition']:10s} | W->A={mx['W_to_A']:2d}/{t['baseline_counts']['wrong']:2d} "
            f"C->A={mx['C_to_A']:2d}/{t['baseline_counts']['correct']:2d} | sel_ratio={t['selectivity_ratio']} (inf={t['selectivity_infinite']}, p={p_sel_s}) "
            f"| McNemar p={p_mc:.2e} | dU={t['delta_utility_at_target_lambda']:+.3f}"
        )
    print("\n=== DOMAIN PERSISTENCE BY CONDITION (Pooled 3 models) ===")
    for cond in CONDITIONS:
        dp = domain_persistence_tests[cond]
        f_sci = dp["science_vs_nonfigure_social_fisher"]
        print(
            f"  {cond:10s} | ECR(nonfig_soc / vis_soc / sci) = {dp['ecr']['nonfigure_social']} / {dp['ecr']['visual_social']} / {dp['ecr']['deductive_science']} "
            f"| sci vs nonfig_soc OR={f_sci['odds_ratio']} p={f_sci['p_value']}"
        )
    print("\n=== TAXONOMY BY CONDITION ===")
    for cond in CONDITIONS:
        print(f"  {cond:10s}: {dict(taxonomy_by_cond[cond])}")


if __name__ == "__main__":
    main()

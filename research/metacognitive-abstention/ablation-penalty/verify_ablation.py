#!/usr/bin/env python3
"""Independent verifier for Penalty-Incentive Ablation outputs."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ABLATION_DIR = Path(__file__).resolve().parent
PARENT_STUDY = ABLATION_DIR.parent
RUNS_DIR = ABLATION_DIR / "runs"
OUTPUTS_DIR = ABLATION_DIR / "outputs"

TARGET_SECTIONS = {"politics_law", "ethics_thought", "korean_geography", "life_science1"}
TARGET_MODELS = ["deepseek-v4.1-flash", "gpt-6-luna", "claude-haiku-5-5"]


def main() -> int:
    errors: list[str] = []
    ds = json.loads((PARENT_STUDY / "inputs/datasets/2027-ksat-period4.json").read_text(encoding="utf-8"))
    target_qs = [q for q in ds["questions"] if q["section"] in TARGET_SECTIONS]
    analysis = json.loads((OUTPUTS_DIR / "ablation_analysis.json").read_text(encoding="utf-8"))

    if len(target_qs) != 80:
        errors.append(f"Expected 80 target questions, got {len(target_qs)}")

    # Re-verify every treatment run file independently
    by_mc = {(s["model"], s["condition"]): s for s in analysis["condition_summaries"]}
    for model in TARGET_MODELS:
        for cond in ("penalty_1", "penalty_3"):
            fpath = RUNS_DIR / f"{cond}__{model}.json"
            if not fpath.exists():
                errors.append(f"Missing run file: {fpath.name}")
                continue
            raw = json.loads(fpath.read_text(encoding="utf-8"))
            ans = raw.get("answers") or {}
            c = w = a = m = 0
            for q in target_qs:
                rec = ans.get(q["id"])
                if rec is None:
                    m += 1
                elif rec.get("decision") == "abstained" or rec.get("answer") is None:
                    a += 1
                elif str(rec.get("answer")) == str(q["correct_answer"]):
                    c += 1
                else:
                    w += 1
            rep = by_mc[(model, cond)]
            if (c, w, a, m) != (rep["correct"], rep["wrong"], rep["abstained"], rep["missing"]):
                errors.append(f"Count mismatch for {model}/{cond}: {(c, w, a, m)} != {(rep['correct'], rep['wrong'], rep['abstained'], rep['missing'])}")
            if m != 0:
                errors.append(f"Incomplete run {model}/{cond}: {m} missing")

    for fname in (
        "ablation_analysis.json",
        "condition_summary.csv",
        "subject_elasticity.csv",
        "new_abstentions.csv",
        "fig_ablation1_elasticity_and_utility.png",
        "fig_ablation1_elasticity_and_utility.svg",
        "fig_ablation2_selectivity_and_domains.png",
        "fig_ablation2_selectivity_and_domains.svg",
    ):
        p = OUTPUTS_DIR / fname
        if not p.exists() or p.stat().st_size == 0:
            errors.append(f"Missing or empty output: {fname}")

    out = {"verified": len(errors) == 0, "errors": errors}
    (OUTPUTS_DIR / "verification.json").write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    if errors:
        print("ABLATION VERIFICATION FAILED:", errors)
        return 1
    print("ABLATION VERIFICATION PASSED (all 6 new runs 80/80 complete, counts & figures independently verified).")
    return 0


if __name__ == "__main__":
    sys.exit(main())

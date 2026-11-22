#!/usr/bin/env python3
"""Independent verifier recomputing key claims directly from inputs/ snapshots."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

STUDY_DIR = Path(__file__).resolve().parent
INPUTS_DIR = STUDY_DIR / "inputs"
OUTPUTS_DIR = STUDY_DIR / "outputs"


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    errors: list[str] = []

    manifest = json.loads((INPUTS_DIR / "manifest.json").read_text(encoding="utf-8"))
    for rel, expected in manifest["snapshots"].items():
        actual = sha256_file(INPUTS_DIR / rel)
        if actual != expected:
            errors.append(f"SHA-256 mismatch for {rel}: {actual} != {expected}")

    analysis = json.loads((OUTPUTS_DIR / "analysis.json").read_text(encoding="utf-8"))
    runs = json.loads((INPUTS_DIR / "runs.json").read_text(encoding="utf-8"))
    fig_dep = json.loads((INPUTS_DIR / "figure_dependent.json").read_text(encoding="utf-8"))
    p4_ds = json.loads((INPUTS_DIR / "datasets/2027-ksat-period4.json").read_text(encoding="utf-8"))

    # Independently recompute 2027 P4 primary complete image runs & 2x2 factorial table
    p4_qs = p4_ds["questions"]
    p4_fig = set(fig_dep["2027:period4"])
    p4_prim = [
        r for r in runs
        if r["panel"] == "2027:period4" and r["input_mode"] == "image" and r["is_complete"]
    ]
    if len(p4_prim) != analysis["panel_counts"]["2027:period4"]["primary_complete_image_runs"]:
        errors.append("2027:period4 primary run count mismatch")

    sci_na = sci_nw = soc_na = soc_nw = 0
    sci_fa = sci_fw = soc_fa = soc_fw = 0
    for r in p4_prim:
        ans_map = r["answers"]
        total_abst = sum(
            1 for q in p4_qs
            if ans_map[q["id"]]["decision"] == "abstained" or ans_map[q["id"]]["answer"] is None
        )
        if total_abst == 0:
            continue
        for q in p4_qs:
            rec = ans_map[q["id"]]
            is_abst = rec["decision"] == "abstained" or rec["answer"] is None
            is_corr = (not is_abst) and str(rec["answer"]) == str(q["correct_answer"])
            if is_corr:
                continue
            subj_group = q["subject"]  # 'korean_history', 'social', 'science'
            is_f = q["id"] in p4_fig
            if subj_group == "science":
                if is_f:
                    if is_abst: sci_fa += 1
                    else: sci_fw += 1
                else:
                    if is_abst: sci_na += 1
                    else: sci_nw += 1
            elif subj_group == "social":
                if is_f:
                    if is_abst: soc_fa += 1
                    else: soc_fw += 1
                else:
                    if is_abst: soc_na += 1
                    else: soc_nw += 1

    pooled = analysis["p4_fisher_tests_pooled"]
    if pooled["within_nonfigure_sci_vs_soc"]["table"] != [[sci_na, sci_nw], [soc_na, soc_nw]]:
        errors.append(
            f"Non-figure 2x2 mismatch: {pooled['within_nonfigure_sci_vs_soc']['table']} != {[[sci_na, sci_nw], [soc_na, soc_nw]]}"
        )
    if pooled["within_figure_sci_vs_soc"]["table"] != [[sci_fa, sci_fw], [soc_fa, soc_fw]]:
        errors.append(
            f"Figure 2x2 mismatch: {pooled['within_figure_sci_vs_soc']['table']} != {[[sci_fa, sci_fw], [soc_fa, soc_fw]]}"
        )

    # Independently check total primary abstention instances across all 4 panels
    prim_abst_count = 0
    for r in runs:
        if not (r["input_mode"] == "image" and r["is_complete"]):
            continue
        for rec in r["answers"].values():
            if rec["decision"] == "abstained" or rec["answer"] is None:
                prim_abst_count += 1
    if prim_abst_count != analysis["total_abstention_instances_primary_image"]:
        errors.append(
            f"Primary abstention total mismatch: {prim_abst_count} != {analysis['total_abstention_instances_primary_image']}"
        )

    # Check taxonomy counts sum identically to primary abstention total
    tax_sum = sum(analysis["taxonomy_primary_image_counts"].values())
    if tax_sum != prim_abst_count:
        errors.append(f"Taxonomy sum mismatch: {tax_sum} != {prim_abst_count}")

    # Check all expected figures and CSVs exist and are non-empty
    required_files = [
        "analysis.json",
        "model_summary.csv",
        "domain_asymmetry_p4.csv",
        "subject_breakdown_p4.csv",
        "abstention_cases.csv",
        "fig1_selective_tradeoff.png",
        "fig1_selective_tradeoff.svg",
        "fig2_domain_asymmetry.png",
        "fig2_domain_asymmetry.svg",
        "fig3_difficulty_calibration.png",
        "fig3_difficulty_calibration.svg",
        "fig4_abstention_taxonomy.png",
        "fig4_abstention_taxonomy.svg",
    ]
    for fname in required_files:
        p = OUTPUTS_DIR / fname
        if not p.exists() or p.stat().st_size == 0:
            errors.append(f"Missing or empty output artifact: {fname}")

    report = {
        "verified": len(errors) == 0,
        "checks_passed": len(errors) == 0,
        "errors": errors,
        "independent_recheck": {
            "primary_image_abstentions_all_panels": prim_abst_count,
            "p4_primary_complete_image_runs": len(p4_prim),
            "p4_nonfigure_sci_vs_soc": [[sci_na, sci_nw], [soc_na, soc_nw]],
            "p4_figure_sci_vs_soc": [[sci_fa, sci_fw], [soc_fa, soc_fw]],
        },
    }
    (OUTPUTS_DIR / "verification.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    if errors:
        print("VERIFICATION FAILED:")
        for e in errors:
            print("  -", e)
        return 1
    print("VERIFICATION PASSED (all snapshot hashes, 2x2 counts, taxonomy totals, and artifacts verified).")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Unit tests for Penalty-Incentive Ablation analysis."""

from __future__ import annotations

import json
import unittest
from pathlib import Path

import analyze_ablation as aa

ABLATION_DIR = Path(__file__).resolve().parent


class TestAblationStats(unittest.TestCase):
    def test_exact_mcnemar_symmetric(self) -> None:
        res = aa.exact_mcnemar_two_sided(5, 5)
        self.assertAlmostEqual(res["p_value"], 1.0, places=6)

    def test_exact_mcnemar_one_sided_shift(self) -> None:
        # 10 items shift 0->1, 0 shift 1->0 -> 2 * (0.5**10) = 2/1024
        res = aa.exact_mcnemar_two_sided(10, 0)
        self.assertAlmostEqual(res["p_value"], 2.0 / 1024.0, places=6)

    def test_transition_matrix_accounting(self) -> None:
        base = ["correct", "correct", "wrong", "wrong", "abstained"]
        treat = ["correct", "abstained", "abstained", "wrong", "abstained"]
        tr = aa.compute_transition(base, treat)
        self.assertEqual(sum(tr["matrix"].values()), 5)
        self.assertEqual(tr["matrix"]["W_to_A"], 1)
        self.assertEqual(tr["matrix"]["C_to_A"], 1)
        self.assertAlmostEqual(tr["beneficial_abstention_rate_pWA"], 0.5)
        self.assertAlmostEqual(tr["harmful_cowardice_rate_pCA"], 0.5)
        self.assertAlmostEqual(tr["selectivity_ratio"], 1.0)

    def test_completed_ablation_outputs_integrity(self) -> None:
        out_path = ABLATION_DIR / "outputs/ablation_analysis.json"
        if not out_path.exists():
            self.skipTest("Run analyze_ablation.py after experiments finish")
        data = json.loads(out_path.read_text(encoding="utf-8"))
        self.assertEqual(data["n_questions"], 80)
        self.assertEqual(len(data["condition_summaries"]), 9)
        for s in data["condition_summaries"]:
            self.assertEqual(s["total"], 80)
            self.assertEqual(s["correct"] + s["wrong"] + s["abstained"] + s["missing"], 80)
        for t in data["transitions"]:
            self.assertEqual(sum(t["matrix"].values()), 80)


if __name__ == "__main__":
    unittest.main()

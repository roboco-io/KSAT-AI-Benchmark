#!/usr/bin/env python3
"""Unit tests for metacognitive abstention analysis functions and outputs."""

from __future__ import annotations

import json
import math
import unittest
from pathlib import Path

import analyze

STUDY_DIR = Path(__file__).resolve().parent


class TestStatisticalPrimitives(unittest.TestCase):
    def test_fisher_exact_textbook_case(self) -> None:
        # Classic R fisher.test(matrix(c(1, 9, 11, 3), nrow=2)) -> p = 0.002759456
        res = analyze.fisher_exact_two_sided(1, 9, 11, 3)
        self.assertAlmostEqual(res["p_value"], 0.002759456, places=6)
        self.assertAlmostEqual(res["odds_ratio"], (1 * 3) / (9 * 11), places=4)

    def test_fisher_exact_symmetric_null(self) -> None:
        res = analyze.fisher_exact_two_sided(10, 10, 10, 10)
        self.assertAlmostEqual(res["p_value"], 1.0, places=6)
        self.assertAlmostEqual(res["odds_ratio"], 1.0, places=4)

    def test_fisher_exact_zero_cell_handles_infinity(self) -> None:
        res = analyze.fisher_exact_two_sided(6, 7, 0, 7)
        self.assertTrue(res["odds_ratio_infinite"])
        self.assertIsNone(res["odds_ratio"])
        self.assertIsNotNone(res["odds_ratio_haldane"])
        self.assertGreater(res["p_value"], 0.0)
        self.assertLessEqual(res["p_value"], 1.0)

    def test_mann_whitney_auroc_perfect_separation(self) -> None:
        # Group A (abstained) strictly lower peer acc than Group B (correct) -> AUROC = 1.0
        res = analyze.mann_whitney_auroc([0.1, 0.2, 0.3], [0.7, 0.8, 0.9, 1.0])
        self.assertAlmostEqual(res["auroc"], 1.0, places=6)
        self.assertLess(res["p_value"], 0.06)

    def test_mann_whitney_auroc_ties(self) -> None:
        res = analyze.mann_whitney_auroc([0.5, 0.5], [0.5, 0.5])
        self.assertAlmostEqual(res["auroc"], 0.5, places=6)
        self.assertAlmostEqual(res["p_value"], 1.0, places=6)


class TestTaxonomyClassifier(unittest.TestCase):
    def test_unreadable_maps_to_visual(self) -> None:
        primary, tags = analyze.classify_abstention_explanation("", "unreadable")
        self.assertEqual(primary, "visual_spatial_grounding")
        self.assertIn("empty_explanation_unreadable", tags)

    def test_deductive_block(self) -> None:
        primary, _ = analyze.classify_abstention_explanation(
            "주어진 조건과 방정식만으로 미지수를 단독으로 구할 수 없다.", "uncertain"
        )
        self.assertEqual(primary, "deductive_derivation_block")

    def test_option_ambiguity(self) -> None:
        primary, _ = analyze.classify_abstention_explanation(
            "여러 선택지가 지문과 부합해 부적절한 설명을 하나로 확정하기 어렵다.", "uncertain"
        )
        self.assertEqual(primary, "option_elimination_ambiguity")

    def test_factual_knowledge_gap(self) -> None:
        primary, _ = analyze.classify_abstention_explanation(
            "(가)와 (나)의 왕조를 단서만으로 확정하기 어려워 선택지를 판단할 수 없다.", "uncertain"
        )
        self.assertEqual(primary, "factual_knowledge_gap")


class TestGradingAndIntegrity(unittest.TestCase):
    def test_q37_official_vs_benchmark(self) -> None:
        rec4 = {"decision": "answered", "answer": 4}
        rec5 = {"decision": "answered", "answer": 5}
        rec_abst = {"decision": "abstained", "answer": None}
        qid = "2026-english-english-q37"
        self.assertFalse(analyze.is_correct(rec4, 5, qid, benchmark_q37=False))
        self.assertTrue(analyze.is_correct(rec4, 5, qid, benchmark_q37=True))
        self.assertTrue(analyze.is_correct(rec5, 5, qid, benchmark_q37=False))
        self.assertFalse(analyze.is_correct(rec_abst, 5, qid, benchmark_q37=True))

    def test_snapshot_integrity_and_no_double_counting(self) -> None:
        analyze.verify_snapshots()
        data = json.loads((STUDY_DIR / "outputs/analysis.json").read_text(encoding="utf-8"))
        # Verify 2027 P4 haiku domain sums equal exactly 360 (no double counting!)
        haiku_doms = {
            r["domain"]: r
            for r in data["p4_domain_asymmetry"]
            if r["model"] == "claude-haiku-5-5"
        }
        self.assertEqual(haiku_doms["korean_history"]["n_questions"], 20)
        self.assertEqual(haiku_doms["social"]["n_questions"], 180)
        self.assertEqual(haiku_doms["science1"]["n_questions"], 80)
        self.assertEqual(haiku_doms["science2"]["n_questions"], 80)
        self.assertEqual(haiku_doms["science"]["n_questions"], 160)
        self.assertEqual(
            haiku_doms["science1"]["abstained"] + haiku_doms["science2"]["abstained"],
            haiku_doms["science"]["abstained"],
        )
        self.assertEqual(
            haiku_doms["korean_history"]["n_questions"]
            + haiku_doms["social"]["n_questions"]
            + haiku_doms["science"]["n_questions"],
            360,
        )

    def test_pooled_2x2_totals_match_sum_of_strata(self) -> None:
        data = json.loads((STUDY_DIR / "outputs/analysis.json").read_text(encoding="utf-8"))
        p = data["p4_fisher_tests_pooled"]
        sci_soc = p["science_vs_social"]["table"]
        nf = p["within_nonfigure_sci_vs_soc"]["table"]
        fg = p["within_figure_sci_vs_soc"]["table"]
        # Non-figure + Figure must sum identically to Science vs Social!
        for r in range(2):
            for c in range(2):
                self.assertEqual(nf[r][c] + fg[r][c], sci_soc[r][c])

    def test_leave_one_out_peer_pool_excludes_self(self) -> None:
        data = json.loads((STUDY_DIR / "outputs/analysis.json").read_text(encoding="utf-8"))
        n_p4 = data["panel_counts"]["2027:period4"]["primary_complete_image_runs"]
        for m in data["model_summaries"]:
            if m["panel"] == "2027:period4" and m["is_complete"] and m["input_mode"] == "image":
                self.assertEqual(m["peer_acc_loo"]["peer_pool_size"], n_p4 - 1)


if __name__ == "__main__":
    unittest.main()

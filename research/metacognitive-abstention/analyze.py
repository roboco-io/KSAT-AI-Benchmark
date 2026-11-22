#!/usr/bin/env python3
"""Quantitative & qualitative analysis of metacognitive abstention in KSAT AI Benchmark.

Uses Python 3 standard library only for exact statistical calculations.
Reads strictly from SHA-256-verified frozen snapshots in inputs/.
"""

from __future__ import annotations

import csv
import hashlib
import json
import math
import re
from collections import Counter, defaultdict
from pathlib import Path
from statistics import mean, median

STUDY_DIR = Path(__file__).resolve().parent
INPUTS_DIR = STUDY_DIR / "inputs"
OUTPUTS_DIR = STUDY_DIR / "outputs"

DATASET_FILES = {
    "2025:period1-3": "datasets/2025-ksat.json",
    "2026:period1-3": "datasets/2026-ksat.json",
    "2027:period1-3": "datasets/2027-ksat.json",
    "2027:period4": "datasets/2027-ksat-period4.json",
}

SOCIAL_SUBJECTS = {
    "ethics_life",
    "ethics_thought",
    "korean_geography",
    "world_geography",
    "east_asian_history",
    "world_history",
    "economics",
    "politics_law",
    "society_culture",
}
SCIENCE1_SUBJECTS = {"physics1", "chemistry1", "life_science1", "earth_science1"}
SCIENCE2_SUBJECTS = {"physics2", "chemistry2", "life_science2", "earth_science2"}

PENALTY_LAMBDAS = [0.0, 0.25, 0.5, 1.0, 2.0, 3.0, 4.0]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def verify_snapshots() -> dict:
    manifest = json.loads((INPUTS_DIR / "manifest.json").read_text(encoding="utf-8"))
    for rel_path, expected_hash in manifest["snapshots"].items():
        actual_hash = sha256_file(INPUTS_DIR / rel_path)
        if actual_hash != expected_hash:
            raise RuntimeError(
                f"Snapshot integrity check failed for {rel_path}: "
                f"expected {expected_hash}, got {actual_hash}"
            )
    return manifest


def domain_of_p4(subject: str) -> str:
    if subject == "korean_history":
        return "korean_history"
    if subject in SOCIAL_SUBJECTS:
        return "social"
    if subject in SCIENCE1_SUBJECTS:
        return "science1"
    if subject in SCIENCE2_SUBJECTS:
        return "science2"
    return subject


def coarse_domain_of_p4(subject: str) -> str:
    if subject == "korean_history":
        return "korean_history"
    if subject in SOCIAL_SUBJECTS:
        return "social"
    if subject in SCIENCE1_SUBJECTS or subject in SCIENCE2_SUBJECTS:
        return "science"
    return subject


def sub_domain_of_p13(q: dict) -> str:
    subj = q["subject"]
    if subj == "math":
        return "math_short_answer" if q.get("kind") == "short_answer" else "math_mcq"
    if subj == "english":
        return "english_listening_script" if q["number"] <= 17 else "english_reading"
    if subj == "korean":
        return f"korean_{q.get('section', 'common')}"
    return subj


# ---------- Exact statistical functions (stdlib only) ----------


def log_comb(n: int, k: int) -> float:
    if k < 0 or k > n:
        return float("-inf")
    return math.lgamma(n + 1) - math.lgamma(k + 1) - math.lgamma(n - k + 1)


def hypergeom_pmf(k: int, n1: int, n2: int, m1: int) -> float:
    """P(X = k) where row totals are (n1, n2) and col1 total is m1."""
    n = n1 + n2
    return math.exp(log_comb(n1, k) + log_comb(n2, m1 - k) - log_comb(n, m1))


def fisher_exact_two_sided(a: int, b: int, c: int, d: int) -> dict:
    """Exact two-sided Fisher's exact test + odds ratio for 2x2 table [[a, b], [c, d]]."""
    row1 = a + b
    row2 = c + d
    col1 = a + c
    n = row1 + row2
    if row1 == 0 or row2 == 0 or col1 == 0 or (b + d) == 0:
        return {
            "table": [[a, b], [c, d]],
            "odds_ratio": None,
            "odds_ratio_haldane": None,
            "p_value": None,
        }

    p_obs = hypergeom_pmf(a, row1, row2, col1)
    k_min = max(0, col1 - row2)
    k_max = min(row1, col1)
    p_two = 0.0
    eps = 1e-12
    for k in range(k_min, k_max + 1):
        pk = hypergeom_pmf(k, row1, row2, col1)
        if pk <= p_obs + eps:
            p_two += pk
    p_two = min(1.0, p_two)

    odds_ratio = (a * d) / (b * c) if (b > 0 and c > 0) else (float("inf") if (a > 0 and d > 0) else 0.0)
    or_haldane = ((a + 0.5) * (d + 0.5)) / ((b + 0.5) * (c + 0.5))
    return {
        "table": [[a, b], [c, d]],
        "odds_ratio": None if math.isinf(odds_ratio) else round(odds_ratio, 4),
        "odds_ratio_infinite": math.isinf(odds_ratio),
        "odds_ratio_haldane": round(or_haldane, 4),
        "p_value": p_two,
        "n": n,
    }


def mann_whitney_auroc(group_a: list[float], group_b: list[float]) -> dict:
    """Compute AUROC = P(A < B) + 0.5 P(A == B) and two-sided tie-corrected normal p-value.

    Here group_a = abstained items' peer accuracy, group_b = comparison items' peer accuracy.
    AUROC > 0.5 means group_a (abstained) has LOWER peer accuracy (i.e. HARDER items).
    """
    n1, n2 = len(group_a), len(group_b)
    if n1 == 0 or n2 == 0:
        return {"n_a": n1, "n_b": n2, "auroc": None, "u_stat": None, "p_value": None}

    # Direct O(n1*n2) U calculation (exact, fast for n <= 360)
    u = 0.0
    for xa in group_a:
        for xb in group_b:
            if xa < xb:
                u += 1.0
            elif xa == xb:
                u += 0.5
    auroc = u / (n1 * n2)

    # Tie correction for variance of U
    combined = group_a + group_b
    tie_counts = Counter(combined)
    n = n1 + n2
    tie_term = sum(t**3 - t for t in tie_counts.values() if t > 1)
    if n <= 1:
        p_val = 1.0
    else:
        var_u = (n1 * n2 / 12.0) * ((n + 1.0) - tie_term / (n * (n - 1.0)))
        if var_u <= 0:
            p_val = 1.0
        else:
            mean_u = n1 * n2 / 2.0
            # Continuity correction
            diff = abs(u - mean_u)
            z = max(0.0, diff - 0.5) / math.sqrt(var_u)
            p_val = math.erfc(z / math.sqrt(2.0))
    return {
        "n_a": n1,
        "n_b": n2,
        "auroc": round(auroc, 4),
        "u_stat": round(u, 2),
        "p_value": p_val,
    }


# ---------- Abstention explanation taxonomy classifier ----------


VISUAL_PATTERNS = [
    r"판독\s*(하기\s*어렵|할\s*수\s*없|불가|이\s*어렵|이\s*불확실|이\s*명확하지|되어|값)",
    r"(흐리|흐려|해상도|잘려|가려져|안\s*보이|보이지\s*않|식별\s*불가|식별하기\s*어렵|식별할\s*수\s*없|구별하기\s*어렵|구분하기\s*어렵)",
    r"(도선|회로|지도|음영|눈금|화살표|점선|실선|그래프|곡선|원그래프|지형\s*단면|단면|도식|도면|벤\s*다이어그램|물결파|경로|노선|시·군\s*경계|위성\s*영상|등압선|색등급도|격자|근절\s*그림|상평형\s*그림|그림만으로는|그림\s*만으로|그림에서|그림의|이미지)",
    r"(그림|표|자료).*(판별|확인|식별|판독|구분|나타나\s*있지|대응시킬\s*수\s*없|대응이\s*불확실|대응시키기\s*어렵|정확히\s*읽어)",
]

CONSTRAINT_PATTERNS = [
    r"(모순|일치하지\s*않|성립하지\s*않|맞지\s*않|충돌|어긋나|정합하지\s*않|정합성이\s*불명확|일관된\s*값을\s*얻지)",
    r"(단독으로\s*구할\s*수\s*없|유일하게\s*결정|단정할\s*수\s*없|도출할\s*수\s*없|계산이\s*일치하지|신뢰성\s*있게\s*계산|확신\s*있게\s*계산|결정되지\s*않아|정량적으로.*계산)",
    r"(합계가|비율.*합|미지수|방정식|조건만으로|조건이\s*부족|정보가\s*부족|정보만으로|측정값만으로|자료만으로|연립|유도\s*전류|경계와\s*모순|해가\s*.*와|허용\s*범위|교환량|교환\s*비율)",
    r"(계산\s*결과|수치|값|정수\s*답|거리\s*계산|적경·적위).*(선택지|선지|보기에\s*없|일치하지|확신할\s*수\s*없|확정하기\s*어렵)",
    r"(수열|불연속점|교점|도함수|극값|미분가능성|적분|삼차함수|타원|초점|닮음\s*조건|함수|확률|경우의\s*수|유전자|염색체|DNA|가계도|세포\s*분열|반응식|몰|농도|기전력|자기장|운동|에너지|파동|궤도|광도|적색\s*편이|허블\s*법칙|식\s*현상|반감기|관입\s*관계|가속도|속도|장력비|평형\s*조건|기체\s*부피|압력\s*조건|밀도\s*자료|이온\s*양|중성\s*조건|지형류|프라이머|제한\s*효소|염기\s*서열|염기\s*종류|아미노산|코돈|시냅스|흥분\s*전도|마디\s*구조|발사\s*방향|물체의\s*실제\s*크기|축전기)",
    r"(조건\s*\([가나다라]\)|필요\s*조건|주어진\s*조건|기호를\s*확실하게\s*대응)",
]

OPTION_CONFLICT_PATTERNS = [
    r"(선택지|선지)\s*(여러\s*개|대부분|모두|중\s*여러|간의|판단)",
    r"(여러\s*(선택지|선지)|복수|두\s*개|모두\s*부합|대체로\s*부합|부분적으로만\s*맞아|다섯\s*설명을\s*검토|다섯\s*설명을\s*대화)",
    r"(부적절한\s*(설명|해석|항목|진술|선지)|적절한\s*(설명|해석|항목|진술|선지)|명확히\s*틀린\s*항목).*(하나로\s*확정|확정하기\s*어렵|확정하지\s*못|확정할\s*수\s*없|특정할\s*수\s*없|확정할\s*근거)",
    r"(선지|선택지).*(대조할\s*수\s*없|가리기\s*어렵|판별|근거가\s*부족|확정하기\s*어렵|확정하지\s*못)",
    r"(①|②|③|④|⑤).*(①|②|③|④|⑤)",
]

KNOWLEDGE_GAP_PATTERNS = [
    r"(기억|암기|지식|연도|시기|인물|사건|사상가|법률|조항|지명|지역|왕조|항만|수출\s*구조|제조업|사업체|주택\s*자료).*(확실하지\s*않|불확실|정확히\s*알|기억나지|확신할\s*수\s*없|확정하기\s*(어렵|어려워)|확실하게\s*연결하지|요구하여|맞지\s*않)",
    r"(외부\s*자료|검색\s*없이|내부\s*지식만으로)",
    r"(정확한\s*(사실|개념|정의|통계|수치|명칭|구분|기준)).*(확실하지|불확실|확신|단정|어렵|어려워)",
]


def classify_abstention_explanation(
    explanation: str, abstain_reason: str | None
) -> tuple[str, list[str]]:
    """Classify an abstention explanation into primary mechanism + all matched tags."""
    text = (explanation or "").strip()
    if not text:
        if abstain_reason == "unreadable":
            return "visual_spatial_grounding", ["visual_spatial_grounding", "empty_explanation_unreadable"]
        return "no_explanation", ["no_explanation"]

    tags: list[str] = []
    if abstain_reason == "unreadable" or any(
        re.search(p, text) for p in VISUAL_PATTERNS
    ):
        tags.append("visual_spatial_grounding")
    if any(re.search(p, text) for p in CONSTRAINT_PATTERNS):
        tags.append("deductive_derivation_block")
    if any(re.search(p, text) for p in OPTION_CONFLICT_PATTERNS):
        tags.append("option_elimination_ambiguity")
    if any(re.search(p, text) for p in KNOWLEDGE_GAP_PATTERNS):
        tags.append("factual_knowledge_gap")

    if not tags:
        return "general_uncertainty", ["general_uncertainty"]

    # Priority: explicit unreadable -> visual; else deductive vs visual vs option vs knowledge
    if abstain_reason == "unreadable":
        primary = "visual_spatial_grounding"
    elif "deductive_derivation_block" in tags and "visual_spatial_grounding" not in tags:
        primary = "deductive_derivation_block"
    elif "visual_spatial_grounding" in tags and "deductive_derivation_block" in tags:
        if re.search(r"(판독|식별|그림만으로|그림\s*만으로|도면만으로|그림에서|위성\s*영상|지도|노선|경계|음영|도선|회로|등압선|색등급도|상평형\s*그림|근절\s*그림|그림의\s*격자|그림의\s*태풍)", text):
            primary = "visual_spatial_grounding"
        else:
            primary = "deductive_derivation_block"
    elif "visual_spatial_grounding" in tags:
        primary = "visual_spatial_grounding"
    elif "option_elimination_ambiguity" in tags:
        primary = "option_elimination_ambiguity"
    else:
        primary = "factual_knowledge_gap"
    return primary, tags


# ---------- Main analysis pipeline ----------


def is_abstained(rec: dict | None) -> bool:
    if rec is None:
        return False
    return rec.get("decision") == "abstained" or rec.get("answer") is None


def is_correct(rec: dict | None, correct_answer, qid: str, benchmark_q37: bool = False) -> bool:
    if rec is None or is_abstained(rec):
        return False
    ans = str(rec.get("answer"))
    if benchmark_q37 and qid == "2026-english-english-q37":
        return ans in {"4", "5"}
    return ans == str(correct_answer)


def compute_run_stats(
    run: dict,
    questions: list[dict],
    benchmark_q37: bool = False,
) -> dict:
    answers = run["answers"]
    n_total = len(questions)
    correct = wrong = abstained = missing = 0
    points_total = points_earned = 0
    reasons = Counter()
    correct_ids, wrong_ids, abstained_ids, missing_ids = [], [], [], []

    for q in questions:
        qid = q["id"]
        pts = q.get("points", 1)
        points_total += pts
        rec = answers.get(qid)
        if rec is None:
            missing += 1
            missing_ids.append(qid)
        elif is_abstained(rec):
            abstained += 1
            abstained_ids.append(qid)
            reasons[rec.get("abstain_reason") or "null"] += 1
        elif is_correct(rec, q["correct_answer"], qid, benchmark_q37=benchmark_q37):
            correct += 1
            points_earned += pts
            correct_ids.append(qid)
        else:
            wrong += 1
            wrong_ids.append(qid)

    answered = correct + wrong
    non_correct = wrong + abstained
    overall_acc = correct / n_total if n_total else 0.0
    selective_acc = correct / answered if answered else None
    abst_rate = abstained / n_total if n_total else 0.0
    abst_gain = (selective_acc - overall_acc) if selective_acc is not None else None
    ecr = (abstained / non_correct) if non_correct > 0 else None

    utilities = {
        str(lam): round((correct - lam * wrong) / n_total, 4)
        for lam in PENALTY_LAMBDAS
    }

    return {
        "run_dir": run["run_dir"],
        "panel": run["panel"],
        "academic_year": run["academic_year"],
        "session": run["session"],
        "model": run["model"],
        "provider": run["provider"],
        "agent": run["agent"],
        "input_mode": run["input_mode"],
        "is_complete": run["is_complete"],
        "total": n_total,
        "answered": answered,
        "correct": correct,
        "wrong": wrong,
        "abstained": abstained,
        "missing": missing,
        "points_earned": points_earned,
        "points_total": points_total,
        "overall_acc": round(overall_acc, 4),
        "selective_acc": round(selective_acc, 4) if selective_acc is not None else None,
        "abstention_rate": round(abst_rate, 4),
        "abstention_gain": round(abst_gain, 4) if abst_gain is not None else None,
        "error_capture_rate": round(ecr, 4) if ecr is not None else None,
        "abstain_reasons": dict(reasons),
        "utilities": utilities,
        "wall_time_seconds": run.get("wall_time_seconds"),
        "error_count": run.get("error_count", 0),
        "_ids": {
            "correct": correct_ids,
            "wrong": wrong_ids,
            "abstained": abstained_ids,
            "missing": missing_ids,
        },
    }


def main() -> None:
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    manifest = verify_snapshots()

    datasets: dict[str, list[dict]] = {}
    q_lookup: dict[str, dict[str, dict]] = {}
    for panel_key, rel_path in DATASET_FILES.items():
        raw = json.loads((INPUTS_DIR / rel_path).read_text(encoding="utf-8"))
        qs = raw["questions"]
        datasets[panel_key] = qs
        q_lookup[panel_key] = {q["id"]: q for q in qs}

    fig_dep_raw = json.loads(
        (INPUTS_DIR / "figure_dependent.json").read_text(encoding="utf-8")
    )
    fig_dep_sets = {k: set(v) for k, v in fig_dep_raw.items()}
    runs = json.loads((INPUTS_DIR / "runs.json").read_text(encoding="utf-8"))

    # Organize runs by panel
    runs_by_panel: dict[str, list[dict]] = defaultdict(list)
    for r in runs:
        runs_by_panel[r["panel"]].append(r)

    # 1. Per-run primary stats & Leave-one-out peer accuracy (strictly over complete image models)
    primary_image_runs: dict[str, list[dict]] = {}
    for panel_key, p_runs in runs_by_panel.items():
        primary_image_runs[panel_key] = [
            r for r in p_runs if r["input_mode"] == "image" and r["is_complete"]
        ]

    # Precompute item correctness per primary image model
    item_correct_by_run: dict[str, dict[str, dict[str, int]]] = {}
    for panel_key, qs in datasets.items():
        item_correct_by_run[panel_key] = {}
        for r in primary_image_runs[panel_key]:
            rd = r["run_dir"]
            item_correct_by_run[panel_key][rd] = {
                q["id"]: 1
                if is_correct(r["answers"].get(q["id"]), q["correct_answer"], q["id"])
                else 0
                for q in qs
            }

    def peer_acc_loo(panel_key: str, run_dir: str, qid: str) -> float | None:
        peers = [
            rd for rd in item_correct_by_run[panel_key].keys() if rd != run_dir
        ]
        if not peers:
            return None
        return sum(item_correct_by_run[panel_key][rd][qid] for rd in peers) / len(peers)

    def panel_item_acc(panel_key: str, qid: str) -> float | None:
        peers = list(item_correct_by_run[panel_key].keys())
        if not peers:
            return None
        return sum(item_correct_by_run[panel_key][rd][qid] for rd in peers) / len(peers)

    model_summaries = []
    q37_sensitivity = []

    for panel_key in DATASET_FILES:
        qs = datasets[panel_key]
        for r in runs_by_panel[panel_key]:
            st = compute_run_stats(r, qs, benchmark_q37=False)
            ids = st.pop("_ids")

            # Difficulty alignment via leave-one-out peer accuracy
            corr_peers = [
                p for qid in ids["correct"] if (p := peer_acc_loo(panel_key, r["run_dir"], qid)) is not None
            ]
            wrong_peers = [
                p for qid in ids["wrong"] if (p := peer_acc_loo(panel_key, r["run_dir"], qid)) is not None
            ]
            abst_peers = [
                p for qid in ids["abstained"] if (p := peer_acc_loo(panel_key, r["run_dir"], qid)) is not None
            ]

            st["peer_acc_loo"] = {
                "correct_mean": round(mean(corr_peers), 4) if corr_peers else None,
                "wrong_mean": round(mean(wrong_peers), 4) if wrong_peers else None,
                "abstained_mean": round(mean(abst_peers), 4) if abst_peers else None,
                "abstained_median": round(median(abst_peers), 4) if abst_peers else None,
                "auroc_abst_vs_correct": mann_whitney_auroc(abst_peers, corr_peers),
                "auroc_abst_vs_wrong": mann_whitney_auroc(abst_peers, wrong_peers),
                "peer_pool_size": len(
                    [rd for rd in item_correct_by_run[panel_key] if rd != r["run_dir"]]
                ),
            }
            model_summaries.append(st)

            if panel_key == "2026:period1-3":
                st_b = compute_run_stats(r, qs, benchmark_q37=True)
                st_b.pop("_ids")
                q37_sensitivity.append(
                    {
                        "run_dir": r["run_dir"],
                        "model": r["model"],
                        "official_correct": st["correct"],
                        "benchmark_correct": st_b["correct"],
                        "official_selective_acc": st["selective_acc"],
                        "benchmark_selective_acc": st_b["selective_acc"],
                        "abstained": st["abstained"],
                    }
                )

    # 2. Domain Asymmetry & Modality (figure_dependent) Decomposition on 2027 Period 4
    p4_qs = datasets["2027:period4"]
    p4_fig_set = fig_dep_sets.get("2027:period4", set())

    p4_domain_rows = []
    p4_fisher_tests = []
    p4_subject_agg: dict[str, dict] = defaultdict(
        lambda: {
            "subject": "",
            "domain": "",
            "coarse_domain": "",
            "n_questions": 0,
            "n_figure_dependent": 0,
            "total_abstained_primary": 0,
            "total_wrong_primary": 0,
            "total_correct_primary": 0,
            "models_with_abstention": 0,
        }
    )

    for q in p4_qs:
        subj = q["section"]
        srec = p4_subject_agg[subj]
        srec["subject"] = subj
        srec["domain"] = domain_of_p4(subj)
        srec["coarse_domain"] = coarse_domain_of_p4(subj)
        srec["n_questions"] += 1
        if q["id"] in p4_fig_set:
            srec["n_figure_dependent"] += 1

    # Pooled 2x2 counters across primary image models that abstained >= 1 time in 2027 P4
    pooled_sci_vs_soc = [0, 0, 0, 0]  # [sci_abst, sci_wrong, soc_abst, soc_wrong]
    pooled_fig_vs_nofig = [0, 0, 0, 0]  # [fig_abst, fig_wrong, nofig_abst, nofig_wrong]
    pooled_soc_fig = [0, 0, 0, 0]  # within social: [fig_abst, fig_wrong, nofig_abst, nofig_wrong]
    pooled_sci_fig = [0, 0, 0, 0]  # within science: [fig_abst, fig_wrong, nofig_abst, nofig_wrong]
    pooled_sci_vs_soc_nofig = [0, 0, 0, 0]  # controlling for non-figure items
    pooled_sci_vs_soc_fig = [0, 0, 0, 0]  # controlling for figure-dependent items

    for r in runs_by_panel["2027:period4"]:
        is_prim = r["input_mode"] == "image" and r["is_complete"]
        dom_counts: dict[str, Counter] = defaultdict(Counter)
        cell_counts: dict[tuple[str, bool], Counter] = defaultdict(Counter)
        subj_abstained_flags = set()

        for q in p4_qs:
            qid = q["id"]
            subj = q["section"]
            dom = domain_of_p4(subj)
            cdom = coarse_domain_of_p4(subj)
            is_fig = qid in p4_fig_set
            rec = r["answers"].get(qid)
            if rec is None:
                outcome = "missing"
            elif is_abstained(rec):
                outcome = "abstained"
                subj_abstained_flags.add(subj)
            elif is_correct(rec, q["correct_answer"], qid):
                outcome = "correct"
            else:
                outcome = "wrong"

            dom_counts[dom][outcome] += 1
            if cdom != dom:
                dom_counts[cdom][outcome] += 1
            cell_counts[(cdom, is_fig)][outcome] += 1

            if is_prim:
                if outcome == "abstained":
                    p4_subject_agg[subj]["total_abstained_primary"] += 1
                elif outcome == "wrong":
                    p4_subject_agg[subj]["total_wrong_primary"] += 1
                elif outcome == "correct":
                    p4_subject_agg[subj]["total_correct_primary"] += 1

        if is_prim:
            for subj in subj_abstained_flags:
                p4_subject_agg[subj]["models_with_abstention"] += 1

        # Save domain rows for this run
        for dom_name in ["korean_history", "social", "science1", "science2", "science"]:
            c = dom_counts[dom_name]
            n_q = c["correct"] + c["wrong"] + c["abstained"] + c["missing"]
            ans = c["correct"] + c["wrong"]
            non_c = c["wrong"] + c["abstained"]
            p4_domain_rows.append(
                {
                    "run_dir": r["run_dir"],
                    "model": r["model"],
                    "input_mode": r["input_mode"],
                    "is_complete": r["is_complete"],
                    "domain": dom_name,
                    "n_questions": n_q,
                    "correct": c["correct"],
                    "wrong": c["wrong"],
                    "abstained": c["abstained"],
                    "missing": c["missing"],
                    "overall_acc": round(c["correct"] / n_q, 4) if n_q else 0.0,
                    "selective_acc": round(c["correct"] / ans, 4) if ans else None,
                    "abstention_rate": round(c["abstained"] / n_q, 4) if n_q else 0.0,
                    "error_capture_rate": round(c["abstained"] / non_c, 4) if non_c else None,
                }
            )

        # Fisher tests for primary complete image models with >= 1 abstention
        total_abst = sum(
            cell_counts[k]["abstained"] for k in cell_counts
        )
        if is_prim and total_abst > 0:
            sci_a = dom_counts["science"]["abstained"]
            sci_w = dom_counts["science"]["wrong"]
            soc_a = dom_counts["social"]["abstained"]
            soc_w = dom_counts["social"]["wrong"]

            fig_a = sum(cell_counts[(cd, True)]["abstained"] for cd in ("korean_history", "social", "science"))
            fig_w = sum(cell_counts[(cd, True)]["wrong"] for cd in ("korean_history", "social", "science"))
            nof_a = sum(cell_counts[(cd, False)]["abstained"] for cd in ("korean_history", "social", "science"))
            nof_w = sum(cell_counts[(cd, False)]["wrong"] for cd in ("korean_history", "social", "science"))

            soc_fa, soc_fw = cell_counts[("social", True)]["abstained"], cell_counts[("social", True)]["wrong"]
            soc_na, soc_nw = cell_counts[("social", False)]["abstained"], cell_counts[("social", False)]["wrong"]
            sci_fa, sci_fw = cell_counts[("science", True)]["abstained"], cell_counts[("science", True)]["wrong"]
            sci_na, sci_nw = cell_counts[("science", False)]["abstained"], cell_counts[("science", False)]["wrong"]

            p4_fisher_tests.append(
                {
                    "run_dir": r["run_dir"],
                    "model": r["model"],
                    "total_abstained": total_abst,
                    "science_vs_social": fisher_exact_two_sided(sci_a, sci_w, soc_a, soc_w),
                    "figure_vs_nonfigure": fisher_exact_two_sided(fig_a, fig_w, nof_a, nof_w),
                    "within_social_fig_vs_nonfig": fisher_exact_two_sided(soc_fa, soc_fw, soc_na, soc_nw),
                    "within_science_fig_vs_nonfig": fisher_exact_two_sided(sci_fa, sci_fw, sci_na, sci_nw),
                    "within_nonfigure_sci_vs_soc": fisher_exact_two_sided(sci_na, sci_nw, soc_na, soc_nw),
                    "within_figure_sci_vs_soc": fisher_exact_two_sided(sci_fa, sci_fw, soc_fa, soc_fw),
                }
            )

            for idx, v in enumerate((sci_a, sci_w, soc_a, soc_w)):
                pooled_sci_vs_soc[idx] += v
            for idx, v in enumerate((fig_a, fig_w, nof_a, nof_w)):
                pooled_fig_vs_nofig[idx] += v
            for idx, v in enumerate((soc_fa, soc_fw, soc_na, soc_nw)):
                pooled_soc_fig[idx] += v
            for idx, v in enumerate((sci_fa, sci_fw, sci_na, sci_nw)):
                pooled_sci_fig[idx] += v
            for idx, v in enumerate((sci_na, sci_nw, soc_na, soc_nw)):
                pooled_sci_vs_soc_nofig[idx] += v
            for idx, v in enumerate((sci_fa, sci_fw, soc_fa, soc_fw)):
                pooled_sci_vs_soc_fig[idx] += v

    pooled_p4_tests = {
        "note": "Pooled across primary complete image models with >=1 abstention in 2027 Period 4 (item-model observations are correlated; interpret alongside per-model tests).",
        "science_vs_social": fisher_exact_two_sided(*pooled_sci_vs_soc),
        "figure_vs_nonfigure": fisher_exact_two_sided(*pooled_fig_vs_nofig),
        "within_social_fig_vs_nonfig": fisher_exact_two_sided(*pooled_soc_fig),
        "within_science_fig_vs_nonfig": fisher_exact_two_sided(*pooled_sci_fig),
        "within_nonfigure_sci_vs_soc": fisher_exact_two_sided(*pooled_sci_vs_soc_nofig),
        "within_figure_sci_vs_soc": fisher_exact_two_sided(*pooled_sci_vs_soc_fig),
    }

    # Finalize subject breakdown table
    p4_subject_table = []
    n_prim_p4 = len(primary_image_runs["2027:period4"])
    for subj, srec in sorted(
        p4_subject_agg.items(),
        key=lambda kv: (-kv[1]["total_abstained_primary"], kv[0]),
    ):
        non_c = srec["total_abstained_primary"] + srec["total_wrong_primary"]
        srec["primary_model_count"] = n_prim_p4
        srec["avg_accuracy_primary"] = round(
            srec["total_correct_primary"] / (srec["n_questions"] * n_prim_p4), 4
        )
        srec["error_capture_rate_primary"] = (
            round(srec["total_abstained_primary"] / non_c, 4) if non_c > 0 else None
        )
        p4_subject_table.append(srec)

    # 3. Period 1-3 Subject & Question-Kind (MCQ vs Short-Answer Math!) Breakdown
    p13_breakdown = defaultdict(lambda: Counter())
    p13_math_kind = defaultdict(lambda: Counter())  # (panel, model) -> short_abst, short_wrong, mcq_abst, mcq_wrong
    for panel_key in ("2025:period1-3", "2026:period1-3", "2027:period1-3"):
        qs = datasets[panel_key]
        for r in primary_image_runs[panel_key]:
            for q in qs:
                qid = q["id"]
                rec = r["answers"].get(qid)
                sd = sub_domain_of_p13(q)
                if is_abstained(rec):
                    p13_breakdown[sd]["abstained"] += 1
                    if q["subject"] == "math":
                        p13_math_kind[r["model"]]["short_abst" if q["kind"] == "short_answer" else "mcq_abst"] += 1
                elif is_correct(rec, q["correct_answer"], qid):
                    p13_breakdown[sd]["correct"] += 1
                else:
                    p13_breakdown[sd]["wrong"] += 1
                    if q["subject"] == "math":
                        p13_math_kind[r["model"]]["short_wrong" if q["kind"] == "short_answer" else "mcq_wrong"] += 1

    p13_domain_summary = {}
    for sd, cnt in sorted(p13_breakdown.items()):
        non_c = cnt["abstained"] + cnt["wrong"]
        p13_domain_summary[sd] = {
            "correct": cnt["correct"],
            "wrong": cnt["wrong"],
            "abstained": cnt["abstained"],
            "error_capture_rate": round(cnt["abstained"] / non_c, 4) if non_c else None,
        }

    # Pooled Math Short-Answer vs Math MCQ Fisher test (across all primary P1-3 runs)
    ms_a = p13_breakdown["math_short_answer"]["abstained"]
    ms_w = p13_breakdown["math_short_answer"]["wrong"]
    mm_a = p13_breakdown["math_mcq"]["abstained"]
    mm_w = p13_breakdown["math_mcq"]["wrong"]
    p13_math_short_vs_mcq = fisher_exact_two_sided(ms_a, ms_w, mm_a, mm_w)

    # 4. Full Abstention Explanation Corpus & Taxonomy + Shared Abstentions
    abstention_cases = []
    taxonomy_counts = Counter()
    taxonomy_by_domain = defaultdict(Counter)
    taxonomy_by_model = defaultdict(Counter)
    item_abstain_models: dict[tuple[str, str], list[str]] = defaultdict(list)

    for panel_key in DATASET_FILES:
        fset = fig_dep_sets.get(panel_key, set())
        for r in runs_by_panel[panel_key]:
            for q in datasets[panel_key]:
                qid = q["id"]
                rec = r["answers"].get(qid)
                if not is_abstained(rec):
                    continue
                exp = (rec.get("explanation") or "").strip()
                reason = rec.get("abstain_reason")
                primary_tax, all_tags = classify_abstention_explanation(exp, reason)
                dom = (
                    domain_of_p4(q["section"])
                    if panel_key == "2027:period4"
                    else sub_domain_of_p13(q)
                )
                is_prim = r["input_mode"] == "image" and r["is_complete"]
                p_loo = peer_acc_loo(panel_key, r["run_dir"], qid)
                p_all = panel_item_acc(panel_key, qid)

                case = {
                    "panel": panel_key,
                    "run_dir": r["run_dir"],
                    "model": r["model"],
                    "provider": r["provider"],
                    "input_mode": r["input_mode"],
                    "is_primary_complete_image": is_prim,
                    "question_id": qid,
                    "subject": q["section"] if panel_key == "2027:period4" else q["subject"],
                    "domain": dom,
                    "kind": q.get("kind", "multiple_choice"),
                    "points": q.get("points", 1),
                    "figure_dependent": qid in fset if panel_key in fig_dep_sets else None,
                    "abstain_reason": reason or "null",
                    "primary_mechanism": primary_tax,
                    "matched_tags": "|".join(all_tags),
                    "peer_acc_loo": round(p_loo, 4) if p_loo is not None else None,
                    "panel_acc_all": round(p_all, 4) if p_all is not None else None,
                    "explanation": exp,
                }
                abstention_cases.append(case)
                if is_prim:
                    taxonomy_counts[primary_tax] += 1
                    taxonomy_by_domain[dom][primary_tax] += 1
                    taxonomy_by_model[r["model"]][primary_tax] += 1
                    item_abstain_models[(panel_key, qid)].append(r["model"])

    shared_abstentions = []
    for (panel_key, qid), mlist in sorted(
        item_abstain_models.items(), key=lambda kv: (-len(kv[1]), kv[0])
    ):
        if len(mlist) >= 2:
            q = q_lookup[panel_key][qid]
            fset = fig_dep_sets.get(panel_key, set())
            shared_abstentions.append(
                {
                    "panel": panel_key,
                    "question_id": qid,
                    "subject": q["subject"],
                    "points": q.get("points"),
                    "figure_dependent": qid in fset if panel_key in fig_dep_sets else None,
                    "n_models_abstained": len(mlist),
                    "models": sorted(mlist),
                    "panel_acc_all": round(panel_item_acc(panel_key, qid) or 0.0, 4),
                }
            )

    # 5. Cross-Year & Cross-Session Longitudinal Comparison
    by_model_panel: dict[str, dict[str, dict]] = defaultdict(dict)
    for st in model_summaries:
        if st["is_complete"]:
            by_model_panel[st["model"]][st["panel"]] = {
                "overall_acc": st["overall_acc"],
                "selective_acc": st["selective_acc"],
                "abstained": st["abstained"],
                "wrong": st["wrong"],
                "error_capture_rate": st["error_capture_rate"],
            }
    longitudinal = {
        m: panels for m, panels in sorted(by_model_panel.items()) if len(panels) >= 2
    }

    # 6. Penalty-Adjusted Utility Rankings on 2027 Period 4 (Primary Complete Image Models)
    p4_primary_summaries = [
        st
        for st in model_summaries
        if st["panel"] == "2027:period4"
        and st["input_mode"] == "image"
        and st["is_complete"]
    ]
    utility_rankings_p4 = {}
    for lam in PENALTY_LAMBDAS:
        ranked = sorted(
            p4_primary_summaries,
            key=lambda s: (-s["utilities"][str(lam)], s["model"]),
        )
        utility_rankings_p4[str(lam)] = [
            {
                "rank": idx + 1,
                "model": s["model"],
                "utility": s["utilities"][str(lam)],
                "overall_acc": s["overall_acc"],
                "selective_acc": s["selective_acc"],
                "abstained": s["abstained"],
                "wrong": s["wrong"],
            }
            for idx, s in enumerate(ranked)
        ]

    # Assemble master analysis JSON
    analysis = {
        "schema_version": 1,
        "snapshot_generated_at": manifest["generated_at"],
        "panel_counts": {
            panel_key: {
                "questions": len(datasets[panel_key]),
                "primary_complete_image_runs": len(primary_image_runs[panel_key]),
                "all_snapshot_runs": len(runs_by_panel[panel_key]),
                "figure_dependent_questions": len(fig_dep_sets.get(panel_key, set()))
                if panel_key in fig_dep_sets
                else None,
            }
            for panel_key in DATASET_FILES
        },
        "model_summaries": model_summaries,
        "q37_sensitivity_2026": q37_sensitivity,
        "p4_domain_asymmetry": p4_domain_rows,
        "p4_fisher_tests_per_model": p4_fisher_tests,
        "p4_fisher_tests_pooled": pooled_p4_tests,
        "p4_subject_breakdown": p4_subject_table,
        "p13_domain_summary": p13_domain_summary,
        "p13_math_short_vs_mcq_fisher": p13_math_short_vs_mcq,
        "taxonomy_primary_image_counts": dict(taxonomy_counts),
        "taxonomy_by_domain": {k: dict(v) for k, v in sorted(taxonomy_by_domain.items())},
        "taxonomy_by_model": {k: dict(v) for k, v in sorted(taxonomy_by_model.items())},
        "shared_abstentions": shared_abstentions,
        "longitudinal_models": longitudinal,
        "utility_rankings_2027_period4": utility_rankings_p4,
        "total_abstention_instances_all_runs": len(abstention_cases),
        "total_abstention_instances_primary_image": sum(
            1 for c in abstention_cases if c["is_primary_complete_image"]
        ),
    }

    (OUTPUTS_DIR / "analysis.json").write_text(
        json.dumps(analysis, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    # Write CSV exports
    def write_csv(filename: str, rows: list[dict], fieldnames: list[str]) -> None:
        with (OUTPUTS_DIR / filename).open("w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=fieldnames)
            w.writeheader()
            for row in rows:
                w.writerow({k: row.get(k) for k in fieldnames})

    write_csv(
        "model_summary.csv",
        [
            {
                **{k: s[k] for k in (
                    "panel", "run_dir", "model", "provider", "agent", "input_mode",
                    "is_complete", "total", "answered", "correct", "wrong",
                    "abstained", "missing", "overall_acc", "selective_acc",
                    "abstention_rate", "abstention_gain", "error_capture_rate",
                )},
                "peer_acc_correct": s["peer_acc_loo"]["correct_mean"],
                "peer_acc_wrong": s["peer_acc_loo"]["wrong_mean"],
                "peer_acc_abstained": s["peer_acc_loo"]["abstained_mean"],
                "auroc_abst_vs_correct": s["peer_acc_loo"]["auroc_abst_vs_correct"]["auroc"],
                "p_abst_vs_correct": s["peer_acc_loo"]["auroc_abst_vs_correct"]["p_value"],
                "auroc_abst_vs_wrong": s["peer_acc_loo"]["auroc_abst_vs_wrong"]["auroc"],
                "p_abst_vs_wrong": s["peer_acc_loo"]["auroc_abst_vs_wrong"]["p_value"],
                "u_lam_0": s["utilities"]["0.0"],
                "u_lam_0.25": s["utilities"]["0.25"],
                "u_lam_1": s["utilities"]["1.0"],
                "u_lam_2": s["utilities"]["2.0"],
                "u_lam_4": s["utilities"]["4.0"],
            }
            for s in model_summaries
        ],
        [
            "panel", "run_dir", "model", "provider", "agent", "input_mode",
            "is_complete", "total", "answered", "correct", "wrong", "abstained",
            "missing", "overall_acc", "selective_acc", "abstention_rate",
            "abstention_gain", "error_capture_rate", "peer_acc_correct",
            "peer_acc_wrong", "peer_acc_abstained", "auroc_abst_vs_correct",
            "p_abst_vs_correct", "auroc_abst_vs_wrong", "p_abst_vs_wrong",
            "u_lam_0", "u_lam_0.25", "u_lam_1", "u_lam_2", "u_lam_4",
        ],
    )

    write_csv(
        "domain_asymmetry_p4.csv",
        p4_domain_rows,
        [
            "run_dir", "model", "input_mode", "is_complete", "domain",
            "n_questions", "correct", "wrong", "abstained", "missing",
            "overall_acc", "selective_acc", "abstention_rate", "error_capture_rate",
        ],
    )

    write_csv(
        "subject_breakdown_p4.csv",
        p4_subject_table,
        [
            "subject", "domain", "coarse_domain", "n_questions", "n_figure_dependent",
            "primary_model_count", "avg_accuracy_primary", "total_correct_primary",
            "total_wrong_primary", "total_abstained_primary", "models_with_abstention",
            "error_capture_rate_primary",
        ],
    )

    write_csv(
        "abstention_cases.csv",
        abstention_cases,
        [
            "panel", "run_dir", "model", "provider", "input_mode",
            "is_primary_complete_image", "question_id", "subject", "domain",
            "kind", "points", "figure_dependent", "abstain_reason",
            "primary_mechanism", "matched_tags", "peer_acc_loo", "panel_acc_all",
            "explanation",
        ],
    )

    print("Analysis complete!")
    print(f"  Primary image abstention instances: {analysis['total_abstention_instances_primary_image']}")
    print(f"  All snapshot abstention instances:  {analysis['total_abstention_instances_all_runs']}")
    print(f"  Taxonomy (primary image):           {analysis['taxonomy_primary_image_counts']}")
    print("\n--- Pooled 2027 Period 4 Fisher Tests (Abstained vs Wrong) ---")
    for name, res in pooled_p4_tests.items():
        if name == "note":
            continue
        print(f"  {name:30s}: table={res['table']} OR={res['odds_ratio']} (Haldane={res['odds_ratio_haldane']}) p={res['p_value']:.3e}")
    print("\n--- Period 1-3 Math Short-Answer vs MCQ Fisher Test ---")
    print(f"  math_short_vs_mcq             : table={p13_math_short_vs_mcq['table']} OR={p13_math_short_vs_mcq['odds_ratio']} p={p13_math_short_vs_mcq['p_value']:.3e}")


if __name__ == "__main__":
    main()

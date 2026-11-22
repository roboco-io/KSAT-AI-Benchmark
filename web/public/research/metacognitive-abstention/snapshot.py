#!/usr/bin/env python3
"""Freeze deterministic snapshots of KSAT datasets, transcript manifests, and model runs."""

from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
STUDY_DIR = Path(__file__).resolve().parent
INPUTS_DIR = STUDY_DIR / "inputs"

DATASETS = {
    "2025:period1-3": ROOT / "exams/datasets/2025-ksat.json",
    "2026:period1-3": ROOT / "exams/datasets/2026-ksat.json",
    "2027:period1-3": ROOT / "exams/datasets/2027-ksat.json",
    "2027:period4": ROOT / "exams/datasets/2027-ksat-period4.json",
}

TRANSCRIPT_MANIFESTS = {
    "2026:period1-3": ROOT / "exams/transcripts/2026/manifest.json",
    "2027:period1-3": ROOT / "exams/transcripts/2027/manifest.json",
    "2027:period4": ROOT / "exams/transcripts/2027-period4/manifest.json",
}

ARCHIVE_PATTERNS = (".timeout", ".guard", ".interrupted", ".backup")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def infer_provider(model: str, run_dir: str) -> str:
    m = model.lower()
    if m.startswith("gpt-"):
        return "openai"
    if m.startswith("claude-"):
        return "anthropic"
    if m.startswith("gemini-"):
        return "google"
    if m.startswith("deepseek-"):
        return "deepseek"
    if m.startswith("glm-"):
        return "zai"
    if m.startswith("qwen"):
        return "qwen"
    if m.startswith("kimi-"):
        return "moonshot"
    if m.startswith("solar-"):
        return "upstage"
    if m.startswith("k-exaone") or m.startswith("exaone"):
        return "lg"
    if run_dir.startswith("codex-"):
        return "openai"
    if run_dir.startswith("claude-"):
        return "anthropic"
    if run_dir.startswith("antigravity-"):
        return "google"
    return "unknown"


def infer_agent(run_dir: str, protocol: dict) -> str:
    if protocol.get("agent"):
        return str(protocol["agent"])
    if run_dir.startswith("codex-"):
        return "Codex SDK"
    if run_dir.startswith("claude-"):
        return "Claude Agent SDK"
    if run_dir.startswith("antigravity-"):
        return "Antigravity CLI"
    if run_dir.startswith("pi-"):
        return "Pi"
    return "unknown"


def main() -> None:
    INPUTS_DIR.mkdir(parents=True, exist_ok=True)
    datasets_out_dir = INPUTS_DIR / "datasets"
    datasets_out_dir.mkdir(parents=True, exist_ok=True)

    manifest = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sources": {},
        "snapshots": {},
        "excluded_archive_dirs": [],
    }

    expected_counts: dict[str, int] = {}

    # 1. Freeze datasets
    for panel_key, src_path in DATASETS.items():
        raw = json.loads(src_path.read_text(encoding="utf-8"))
        expected_counts[panel_key] = len(raw.get("questions", []))
        snap_name = f"datasets/{src_path.name}"
        snap_path = INPUTS_DIR / snap_name
        snap_path.write_text(
            json.dumps(raw, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        manifest["sources"][f"dataset:{panel_key}"] = {
            "path": str(src_path.relative_to(ROOT)),
            "sha256": sha256_file(src_path),
            "question_count": expected_counts[panel_key],
        }
        manifest["snapshots"][snap_name] = sha256_file(snap_path)

    # 2. Freeze figure_dependent annotations from transcript manifests
    figure_dependent: dict[str, list[str]] = {}
    for panel_key, src_path in TRANSCRIPT_MANIFESTS.items():
        if not src_path.exists():
            continue
        raw = json.loads(src_path.read_text(encoding="utf-8"))
        figure_dependent[panel_key] = sorted(raw.get("figure_dependent", []))
        manifest["sources"][f"transcript_manifest:{panel_key}"] = {
            "path": str(src_path.relative_to(ROOT)),
            "sha256": sha256_file(src_path),
            "figure_dependent_count": len(figure_dependent[panel_key]),
        }
    fig_snap_path = INPUTS_DIR / "figure_dependent.json"
    fig_snap_path.write_text(
        json.dumps(figure_dependent, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    manifest["snapshots"]["figure_dependent.json"] = sha256_file(fig_snap_path)

    # 3. Freeze clean run.json files from results/
    results_dir = ROOT / "results"
    runs_snapshot = []
    for entry in sorted(results_dir.iterdir()):
        if not entry.is_dir():
            continue
        run_file = entry / "run.json"
        if not run_file.exists():
            continue
        if any(pat in entry.name for pat in ARCHIVE_PATTERNS):
            manifest["excluded_archive_dirs"].append(entry.name)
            continue

        raw = json.loads(run_file.read_text(encoding="utf-8"))
        protocol = raw.get("protocol") or {}
        year_match = re.search(r"(202[567])", entry.name)
        year = str(raw.get("academic_year") or (year_match.group(1) if year_match else ""))
        session = (
            "period4"
            if (raw.get("session") == "period4" or "period4" in entry.name)
            else "period1-3"
        )
        panel_key = f"{year}:{session}"
        if panel_key not in expected_counts:
            continue

        model = str(protocol.get("model") or raw.get("model") or entry.name)
        prompt_version = raw.get("prompt_version")
        input_mode = "text_transcript" if prompt_version == 3 else "image"
        raw_answers = raw.get("answers") or {}

        # Preserve minimal, clean per-question payload
        clean_answers = {}
        for qid, rec in sorted(raw_answers.items()):
            if not isinstance(rec, dict):
                continue
            clean_answers[qid] = {
                "decision": rec.get("decision"),
                "answer": rec.get("answer"),
                "abstain_reason": rec.get("abstain_reason"),
                "explanation": rec.get("explanation") or "",
            }

        expected_n = expected_counts[panel_key]
        ans_count = len(clean_answers)
        completed_flag = bool(raw.get("completed"))
        is_complete = ans_count == expected_n

        runs_snapshot.append(
            {
                "run_dir": entry.name,
                "panel": panel_key,
                "academic_year": int(year),
                "session": session,
                "model": model,
                "provider": infer_provider(model, entry.name),
                "agent": infer_agent(entry.name, protocol),
                "prompt_version": prompt_version,
                "input_mode": input_mode,
                "completed_flag": completed_flag,
                "answer_count": ans_count,
                "expected_count": expected_n,
                "is_complete": is_complete,
                "wall_time_seconds": raw.get("wall_time_seconds"),
                "error_count": len(raw.get("errors") or []),
                "usage": raw.get("usage") or {},
                "answers": clean_answers,
            }
        )
        manifest["sources"][f"run:{entry.name}"] = {
            "path": str(run_file.relative_to(ROOT)),
            "sha256": sha256_file(run_file),
            "panel": panel_key,
            "model": model,
            "input_mode": input_mode,
            "answer_count": ans_count,
            "expected_count": expected_n,
            "is_complete": is_complete,
        }

    runs_snap_path = INPUTS_DIR / "runs.json"
    runs_snap_path.write_text(
        json.dumps(runs_snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    manifest["snapshots"]["runs.json"] = sha256_file(runs_snap_path)

    manifest_path = INPUTS_DIR / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        f"Snapshot complete: {len(DATASETS)} datasets, "
        f"{len(figure_dependent)} transcript manifests, "
        f"{len(runs_snapshot)} clean runs "
        f"(excluded {len(manifest['excluded_archive_dirs'])} archive dirs)."
    )
    for panel_key in DATASETS:
        p_runs = [r for r in runs_snapshot if r["panel"] == panel_key]
        img_comp = [
            r for r in p_runs if r["input_mode"] == "image" and r["is_complete"]
        ]
        txt_comp = [
            r
            for r in p_runs
            if r["input_mode"] == "text_transcript" and r["is_complete"]
        ]
        incomp = [r for r in p_runs if not r["is_complete"]]
        print(
            f"  {panel_key:15s}: total={len(p_runs):2d} | "
            f"complete_image={len(img_comp):2d} | "
            f"complete_text={len(txt_comp):2d} | incomplete={len(incomp):2d}"
        )


if __name__ == "__main__":
    main()

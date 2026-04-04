#!/usr/bin/env python3

"""Hourly monitor for GSD completion and post-finish AMP gap closure."""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path("/Users/bytedance/.oh-my-coco/studio/flitter")
GSD_TOOLS = ROOT / ".codex/get-shit-done/bin/gsd-tools.cjs"
LOG_DIR = ROOT / "log/amp-gap-monitor"
STATE_PATH = LOG_DIR / "monitor-state.json"
RUN_LOG = LOG_DIR / "monitor.log"
ITERATIONS = 5
INTERVAL_SECONDS = 60 * 60
COCO_QUERY_TIMEOUT = "45m"
COCO_GAP_TIMEOUT = "55m"


@dataclass
class CheckerResult:
    """Parsed result from an independent checker agent."""

    finished: bool
    reason: str
    raw_output_path: Path
    session_id: str


def utc_now() -> str:
    """Return an ISO-8601 UTC timestamp."""

    return datetime.now(timezone.utc).isoformat()


def ensure_dirs() -> None:
    """Create runtime directories for logs and state."""

    LOG_DIR.mkdir(parents=True, exist_ok=True)


def log(message: str) -> None:
    """Append a timestamped message to stdout and the monitor log."""

    line = f"[{utc_now()}] {message}"
    print(line, flush=True)
    with RUN_LOG.open("a", encoding="utf-8") as handle:
        handle.write(line + "\n")


def write_state(payload: dict[str, Any]) -> None:
    """Persist monitor state for later inspection."""

    tmp_path = STATE_PATH.with_suffix(".tmp")
    tmp_path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    tmp_path.replace(STATE_PATH)


def run_command(command: list[str], *, timeout: int = 120) -> str:
    """Run a command and return stdout, raising on failure."""

    completed = subprocess.run(
        command,
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=timeout,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(
            f"Command failed ({completed.returncode}): {' '.join(command)}\n"
            f"STDOUT:\n{completed.stdout}\nSTDERR:\n{completed.stderr}"
        )
    return completed.stdout


def authoritative_status() -> dict[str, Any]:
    """Read local GSD status from trusted repo-local commands."""

    state = json.loads(run_command(["node", str(GSD_TOOLS), "state", "json"]))
    roadmap = json.loads(run_command(["node", str(GSD_TOOLS), "roadmap", "analyze"]))
    waiting = (ROOT / ".planning/WAITING.json").exists()
    completed = int(roadmap.get("completed_phases", 0))
    total = int(roadmap.get("phase_count", 0))
    state_status = str(state.get("status", "")).lower()
    finished = (total > 0 and completed == total) or ("milestone complete" in state_status)
    return {
        "state": state,
        "roadmap": roadmap,
        "waiting": waiting,
        "finished": finished,
        "finished_reason": f"state.status={state.get('status')} completed={completed}/{total} waiting={waiting}",
    }


def extract_first_json_blob(text: str) -> dict[str, Any]:
    """Extract the first JSON object from agent output."""

    stripped = text.strip()
    candidates = [stripped]
    if "```json" in stripped:
        for match in re.findall(r"```json\s*(\{.*?\})\s*```", stripped, flags=re.DOTALL):
            candidates.append(match)
    candidates.extend(re.findall(r"(\{.*\})", stripped, flags=re.DOTALL))
    for candidate in candidates:
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            continue
    raise ValueError(f"No JSON object found in output:\n{stripped[:2000]}")


def coco_prompt_for_checker_a(iteration: int) -> str:
    """Build the first independent completion-check prompt."""

    return f"""
You are checker A for iteration {iteration}. Determine whether the current GSD milestone in {ROOT} is already marked finished.

Constraints:
- Read-only only. Do not edit files, do not create files, do not run git mutations.
- Use repo-local evidence only.
- Prefer these sources: `node \"{GSD_TOOLS}\" state json`, `.planning/STATE.md`, and `.planning/WAITING.json`.
- Be conservative: `finished=true` only if the milestone is explicitly complete.

Return EXACTLY one JSON object and nothing else:
{{"finished":true_or_false,"reason":"short explanation","sources":["..."]}}
""".strip()


def coco_prompt_for_checker_b(iteration: int) -> str:
    """Build the second independent completion-check prompt."""

    return f"""
You are checker B for iteration {iteration}. Independently determine whether the active GSD process in {ROOT} has been marked finished.

Constraints:
- Read-only only. Do not edit files, do not create files, do not run git mutations.
- Use a different evidence mix from checker A: prefer `node \"{GSD_TOOLS}\" roadmap analyze`, `node \"{GSD_TOOLS}\" stats json`, `.planning/MILESTONES.md`, and `.planning/ROADMAP.md`.
- Treat the milestone as finished only if disk state clearly shows completion/ship status for the current milestone.

Return EXACTLY one JSON object and nothing else:
{{"finished":true_or_false,"reason":"short explanation","sources":["..."]}}
""".strip()


def run_coco_agent(*, prompt: str, session_id: str, timeout: str, output_path: Path) -> subprocess.Popen[str]:
    """Launch a coco agent process and stream output into a file."""

    handle = output_path.open("w", encoding="utf-8")
    command = [
        "coco",
        "-p",
        "-y",
        "--session-id",
        session_id,
        "--query-timeout",
        timeout,
        "--bash-tool-timeout",
        "10m",
        prompt,
    ]
    return subprocess.Popen(
        command,
        cwd=ROOT,
        stdout=handle,
        stderr=subprocess.STDOUT,
        text=True,
    )


def wait_for_coco(process: subprocess.Popen[str], output_path: Path) -> str:
    """Wait for a coco process and return its captured output."""

    return_code = process.wait()
    output = output_path.read_text(encoding="utf-8") if output_path.exists() else ""
    if return_code != 0:
        raise RuntimeError(f"coco exited with {return_code}: {output[:4000]}")
    return output


def run_iteration_checkers(iteration: int) -> list[CheckerResult]:
    """Run the two independent completion checkers for one iteration."""

    results: list[CheckerResult] = []
    checker_specs = [
        ("a", coco_prompt_for_checker_a(iteration)),
        ("b", coco_prompt_for_checker_b(iteration)),
    ]
    processes: list[tuple[str, str, Path, subprocess.Popen[str]]] = []

    for suffix, prompt in checker_specs:
        session_id = f"amp-gap-monitor-check-{suffix}-iter-{iteration}"
        output_path = LOG_DIR / f"iter-{iteration}-check-{suffix}.log"
        log(f"Launching checker {suffix.upper()} for iteration {iteration} (session {session_id})")
        process = run_coco_agent(
            prompt=prompt,
            session_id=session_id,
            timeout=COCO_QUERY_TIMEOUT,
            output_path=output_path,
        )
        processes.append((suffix, session_id, output_path, process))

    for suffix, session_id, output_path, process in processes:
        raw = wait_for_coco(process, output_path)
        parsed = extract_first_json_blob(raw)
        results.append(
            CheckerResult(
                finished=bool(parsed.get("finished", False)),
                reason=str(parsed.get("reason", "")),
                raw_output_path=output_path,
                session_id=session_id,
            )
        )
        log(
            f"Checker {suffix.upper()} iteration {iteration}: finished={results[-1].finished} "
            f"reason={results[-1].reason}"
        )

    return results


def analyzer_prompt(name: str) -> str:
    """Create a prompt for a parity analyzer agent."""

    return f"""
You are {name}, part of the AMP gap-closing team for {ROOT}.

Goal:
- Identify the highest-confidence remaining gaps between AMP behavior/artifacts and the current implementation.

Required evidence:
- `amp-src-analysis-*.md`
- `.trae/specs/deep-reverse-amp-tui-analysis/**`
- `.trae/specs/deep-audit-amp-alignment-2026Q2/**`
- `.trae/specs/close-all-amp-gaps/**`
- current code under `packages/flitter-core/src/**` and `packages/flitter-amp/src/**`

Constraints:
- Analysis only. Do not edit files.
- Return a concise actionable list of the most credible remaining parity gaps, ordered by user impact and implementation confidence.

Return plain text.
""".strip()


def closer_prompt(analyzer_a_log: Path, analyzer_b_log: Path) -> str:
    """Create the implementation prompt for the gap-closing agent."""

    return f"""
You are the AMP gap closer for {ROOT}.

Mission:
- Read the analyzer outputs at `{analyzer_a_log}` and `{analyzer_b_log}`.
- Cross-check them against `amp-src-analysis-*.md`, `.trae/specs/close-all-amp-gaps/**`, and the current implementation.
- Implement the highest-confidence remaining parity gap batch you can close safely now.
- Add or update focused tests for changed behavior.
- Run the most relevant tests/typechecks for changed areas.

Constraints:
- Do not create docs.
- Do not commit.
- Prefer surgical changes.
- If no credible remaining gaps exist, say so explicitly and make no edits.

Return a concise work summary.
""".strip()


def verifier_prompt(closer_log: Path) -> str:
    """Create the verification prompt for the final gap-team agent."""

    return f"""
You are the verification agent for the AMP gap-closing pass in {ROOT}.

Tasks:
- Read `{closer_log}` to see what was changed.
- Inspect the resulting code and relevant tests.
- Verify whether the implemented gap batch is complete and whether new regressions are visible.
- Run only the most relevant tests/typechecks for the touched areas.

Constraints:
- Verification only. Do not edit files unless absolutely necessary to fix a small broken test expectation caused by the final pass.
- Do not commit.

Return a concise verdict with PASS / FLAG / FAIL.
""".strip()


def run_gap_team(iteration: int) -> dict[str, Any]:
    """Launch the post-finish team of agents that analyzes and closes AMP parity gaps."""

    log(f"GSD completion confirmed at iteration {iteration}; launching AMP gap team")

    analyzer_a_log = LOG_DIR / f"iter-{iteration}-gap-analyzer-a.log"
    analyzer_b_log = LOG_DIR / f"iter-{iteration}-gap-analyzer-b.log"
    analyzer_a = run_coco_agent(
        prompt=analyzer_prompt("Analyzer A"),
        session_id=f"amp-gap-team-analyzer-a-{iteration}",
        timeout=COCO_GAP_TIMEOUT,
        output_path=analyzer_a_log,
    )
    analyzer_b = run_coco_agent(
        prompt=analyzer_prompt("Analyzer B"),
        session_id=f"amp-gap-team-analyzer-b-{iteration}",
        timeout=COCO_GAP_TIMEOUT,
        output_path=analyzer_b_log,
    )

    wait_for_coco(analyzer_a, analyzer_a_log)
    wait_for_coco(analyzer_b, analyzer_b_log)
    log("Gap analyzers completed; launching closer")

    closer_log = LOG_DIR / f"iter-{iteration}-gap-closer.log"
    closer = run_coco_agent(
        prompt=closer_prompt(analyzer_a_log, analyzer_b_log),
        session_id=f"amp-gap-team-closer-{iteration}",
        timeout=COCO_GAP_TIMEOUT,
        output_path=closer_log,
    )
    wait_for_coco(closer, closer_log)
    log("Gap closer completed; launching verifier")

    verifier_log = LOG_DIR / f"iter-{iteration}-gap-verifier.log"
    verifier = run_coco_agent(
        prompt=verifier_prompt(closer_log),
        session_id=f"amp-gap-team-verifier-{iteration}",
        timeout=COCO_QUERY_TIMEOUT,
        output_path=verifier_log,
    )
    wait_for_coco(verifier, verifier_log)
    log("Gap verifier completed")

    return {
        "iteration": iteration,
        "analyzer_a_log": str(analyzer_a_log),
        "analyzer_b_log": str(analyzer_b_log),
        "closer_log": str(closer_log),
        "verifier_log": str(verifier_log),
    }


def main() -> int:
    """Run the scheduled monitoring loop."""

    ensure_dirs()
    triggered_gap_team = False
    triggered_details: dict[str, Any] | None = None

    log(
        f"Starting AMP gap monitor in {ROOT} for {ITERATIONS} iterations "
        f"with {INTERVAL_SECONDS}s interval"
    )

    for iteration in range(1, ITERATIONS + 1):
        log(f"--- Iteration {iteration}/{ITERATIONS} ---")
        iteration_payload: dict[str, Any] = {
            "last_iteration": iteration,
            "timestamp": utc_now(),
            "triggered_gap_team": triggered_gap_team,
        }
        try:
            local_status = authoritative_status()
            checkers = run_iteration_checkers(iteration)
            consensus = local_status["finished"] and any(result.finished for result in checkers)
            iteration_payload["authoritative"] = local_status
            iteration_payload["checkers"] = [
                {
                    "session_id": result.session_id,
                    "finished": result.finished,
                    "reason": result.reason,
                    "log": str(result.raw_output_path),
                }
                for result in checkers
            ]
            iteration_payload["consensus_finished"] = consensus
            log(
                "Iteration summary: "
                f"authoritative_finished={local_status['finished']} "
                f"consensus_finished={consensus}"
            )

            if consensus and not triggered_gap_team:
                triggered_details = run_gap_team(iteration)
                triggered_gap_team = True
                iteration_payload["gap_team"] = triggered_details
            elif triggered_gap_team:
                iteration_payload["gap_team"] = triggered_details
        except Exception as error:  # noqa: BLE001
            iteration_payload["error"] = str(error)
            log(f"Iteration {iteration} failed: {error}")
        write_state(iteration_payload)

        if iteration < ITERATIONS:
            log(f"Sleeping for {INTERVAL_SECONDS} seconds before next iteration")
            time.sleep(INTERVAL_SECONDS)

    log("Monitor finished all scheduled iterations")
    final_state = {
        "finished_at": utc_now(),
        "iterations": ITERATIONS,
        "triggered_gap_team": triggered_gap_team,
        "gap_team": triggered_details,
    }
    write_state(final_state)
    return 0


if __name__ == "__main__":
    sys.exit(main())

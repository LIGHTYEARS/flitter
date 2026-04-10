<purpose>
Run or generate Agent Test cases (.test.md) for end-to-end verification.

Agent Tests are markdown-based test cases with YAML frontmatter and natural
language steps + checkpoints. They verify scenarios that traditional unit tests
cannot cover: cross-component integration, time-dependent behavior, subjective
quality, and performance characteristics.

Agent Tests follow a test-first workflow: cases are generated BEFORE code is
written (from PLAN.md), serving as acceptance criteria for plan completion.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
Also read: tests/agent/types.ts (all type definitions and execution profiles).
</required_reading>

<process>

<step name="parse_arguments">
Parse `$ARGUMENTS` for subcommand and options:

- Subcommand: `run`, `generate`, `list`, or `uncertain`
- Options (vary by subcommand):
  - `run`: `--linked-plan ID`, `--priority P0`, `--category state-machine`, `--case name`, `--optimize`, `--max-iterations N`
  - `generate`: `--plan <plan-id>`
  - `list`: (no options)
  - `uncertain`: `--latest`

If no subcommand provided:
```
ERROR: Subcommand required
Usage: /gsd-agent-test <run|generate|list|uncertain> [options]
Examples:
  /gsd-agent-test run --priority P0
  /gsd-agent-test generate --plan 39-02
  /gsd-agent-test list
  /gsd-agent-test uncertain --latest
```
Exit.

Route to the appropriate step based on subcommand.
</step>

<!-- ================================================================== -->
<!-- RUN SUBCOMMAND                                                     -->
<!-- ================================================================== -->

<step name="run_discover">
**Subcommand: run**

Present banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 AGENT TEST ► RUN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Discover test cases by scanning `tests/agent/cases/` for `.test.md` files:

```bash
bun run tests/agent/runner.ts list
```

If CLI options were provided (--linked-plan, --priority, --category, --case),
pass them through to filter the discovered cases:

```bash
bun run tests/agent/runner.ts list ${FILTER_ARGS}
```

If no cases match the filters:
```
No test cases match the given filters.
Available cases: {run list without filters}
```
Exit.

Present the discovered cases to the user:
```
Found {N} test cases matching filters:

  state-machine/
    [P0] thread-worker-lifecycle (plans: 39-01)
    [P0] compaction-execution (plans: 39-02)
  performance/
    [P1] compaction-latency (plans: 39-02)

Proceed with execution?
```

Wait for user confirmation before executing.
</step>

<step name="run_execute">
Execute test cases via the runner:

```bash
bun run tests/agent/runner.ts run ${ALL_OPTIONS}
```

The runner handles:
1. Parsing each .test.md file (frontmatter + body)
2. Building subagent prompts with execution profile context and fixture data
3. Spawning a Claude subagent (via Task tool) per test case
4. Collecting structured JSON results from each subagent
5. Priority-based retries (P0: 2 retries, P1: 1, P2+: 0)
6. Generating reports (markdown + JSON + uncertain checkpoint reports)

**Subagent execution model:**
Each test case is executed by a single Claude subagent that:
- Reads the test steps and checkpoints
- Writes and executes TypeScript code to verify each checkpoint
- Returns a structured JSON result with per-checkpoint verdicts (pass/fail/uncertain)
- Provides evidence (code output, assertions, measurements) for each verdict

Monitor the runner output for progress. The runner will print per-case results
as they complete and a summary at the end.
</step>

<step name="run_report">
After execution completes, read and present the generated reports:

1. **Summary report** (tests/agent/reports/{timestamp}.md):
   - Overall pass/fail/uncertain counts
   - Per-priority breakdown (P0 failures are blockers)
   - Per-case results with checkpoint details

2. **Uncertain report** (tests/agent/reports/{timestamp}-uncertain.md):
   - Checkpoints where the subagent could not determine pass/fail
   - These require human review

3. **JSON report** (tests/agent/reports/{timestamp}.json):
   - Machine-readable results for downstream tooling

Present the summary to the user:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 AGENT TEST ► RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total: {N} | Pass: {p} | Fail: {f} | Uncertain: {u}
  P0: {p0_pass}/{p0_total}
  P1: {p1_pass}/{p1_total}

{if uncertain > 0:}
⚠️ {u} uncertain checkpoints require human review.
Run `/gsd-agent-test uncertain --latest` to review them.

{if P0 failures:}
❌ P0 failures detected — these must be resolved before proceeding.
```
</step>

<step name="run_optimize">
**Only if --optimize flag was passed.**

After the initial run, enter the autoresearch-style optimization loop:

1. Read the uncertain report and failed checkpoints
2. For each uncertain/failed checkpoint, spawn a subagent to:
   a. Analyze why the checkpoint was uncertain/failed
   b. Propose a fix (rewrite checkpoint wording, adjust threshold, enrich fixture, or fix source code)
   c. Apply the fix
   d. Re-run the affected test case
3. Log each optimization attempt to the JSONL journal (tests/agent/agent-test.jsonl)
4. Repeat until max-iterations reached or all checkpoints pass

**Optimization scenarios:**
- **Checkpoint rewrite**: If the checkpoint wording is ambiguous, rewrite it for clarity
- **Fixture enrichment**: If the test needs different seed data, add/modify fixtures
- **Source code fix**: If the test reveals a genuine bug, create a fix plan (do NOT auto-fix — present to user)

Journal entries follow the autoresearch JSONL protocol:
```jsonl
{"type":"config","session":"...","goal":"all P0 pass, zero uncertain","metric":"fail_count+uncertain_count","direction":"lower"}
{"type":"run","iteration":1,"action":"rewrite checkpoint 'latency < 200ms'","metrics":{"fail":0,"uncertain":1},"status":"keep"}
{"type":"done","total_runs":3,"final":{"fail":0,"uncertain":0,"pass":5},"duration":"12.3s"}
```
</step>

<!-- ================================================================== -->
<!-- GENERATE SUBCOMMAND                                                -->
<!-- ================================================================== -->

<step name="generate_init">
**Subcommand: generate --plan {plan-id}**

Present banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 AGENT TEST ► GENERATE — Plan {plan-id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Locate and read the PLAN.md file:

```bash
PLAN_FILE=$(find .planning/phases/ -name "*${PLAN_ID}*PLAN.md" -type f 2>/dev/null | head -1)
```

If not found:
```
ERROR: No PLAN.md found for plan ID "${PLAN_ID}"
Check .planning/phases/ for available plans.
```
Exit.

Read the PLAN.md to extract:
- Plan title and objective
- Implementation tasks and their details
- Must-haves (truths, artifacts, key_links) from frontmatter
- Success criteria
- Files that will be created/modified
</step>

<step name="generate_classify">
For each implementation task in the PLAN.md, classify what Agent Test coverage it needs:

| Category | When to use |
|----------|-------------|
| **state-machine** | State transitions, lifecycle management, status changes |
| **e2e** | Full user workflows spanning multiple components |
| **integration** | Cross-component data flow, API contracts |
| **performance** | Latency, memory, throughput requirements |
| **ui** | Visual rendering, user interaction, accessibility |

For each category, determine:
- Test case name (kebab-case, descriptive)
- Priority (P0 for must-haves, P1 for should-haves, P2 for nice-to-haves)
- Required fixtures (session seeds, stream seeds, custom data)
- Key checkpoints to verify

Present the generation plan:
```
## Test Case Generation Plan

### state-machine/ (2 cases)
  [P0] {case-name} — {brief description}
    Checkpoints: {list of key checkpoints}
  [P1] {case-name} — {brief description}
    Checkpoints: {list}

### performance/ (1 case)
  [P1] {case-name} — {brief description}
    Checkpoints: {list}

### Fixtures needed:
  - {fixture-name}: {description}

Generate these cases?
```

Wait for user confirmation. Allow adjustments.
</step>

<step name="generate_write">
For each approved test case, generate the .test.md file following this format:

```markdown
---
name: {case-name}
category: {category}
priority: {P0|P1|P2|P3}
linked-plans:
  - {plan-id}
fixtures:
  session: {seed-name or null}
  stream: {seed-name or null}
tags:
  - {relevant tags}
---
# {Case Title}

{Brief description of what this test verifies and why it matters.}

## Steps

### Step 1: {Step title}
{Natural language description of what to do.}

**Checkpoint:** {Observable, verifiable condition}

### Step 2: {Step title}
{Description}

**Checkpoint:** {Condition}

...
```

**Checkpoint writing rules:**
- Each checkpoint must be observable and verifiable by code
- Use concrete values, not vague descriptions ("items.length === 5" not "items are correct")
- For performance: specify thresholds ("< 200ms" not "fast")
- For state: specify exact expected state values
- Avoid subjective language unless explicitly a UI/UX test

Write files to `tests/agent/cases/{category}/{case-name}.test.md`.

If new fixture seeds are needed, add them to `tests/agent/fixtures/seeds/`.
</step>

<step name="generate_verify">
After writing all test case files, verify they parse correctly:

```bash
bun run tests/agent/runner.ts list
```

Confirm all generated cases appear in the listing with correct metadata.

Present summary:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 AGENT TEST ► GENERATION COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generated {N} test cases for plan {plan-id}:
  {category}/{case-name}.test.md [P0]
  {category}/{case-name}.test.md [P1]
  ...

Fixtures created/updated:
  seeds/{name}.json

These cases serve as acceptance criteria for plan {plan-id}.
They should be run after implementation with:
  /gsd-agent-test run --linked-plan {plan-id}
```

Commit the generated cases:
```bash
git add tests/agent/cases/ tests/agent/fixtures/seeds/
git commit -m "test(agent): generate acceptance test cases for plan {plan-id}"
```
</step>

<!-- ================================================================== -->
<!-- LIST SUBCOMMAND                                                    -->
<!-- ================================================================== -->

<step name="list_cases">
**Subcommand: list**

Run the runner's list command:
```bash
bun run tests/agent/runner.ts list
```

Present the output to the user. If no cases exist, suggest generating them:
```
No agent test cases found.
Generate cases from a plan: /gsd-agent-test generate --plan <plan-id>
```
</step>

<!-- ================================================================== -->
<!-- UNCERTAIN SUBCOMMAND                                               -->
<!-- ================================================================== -->

<step name="uncertain_review">
**Subcommand: uncertain**

Show the latest uncertain checkpoint report:
```bash
bun run tests/agent/runner.ts uncertain
```

If uncertain checkpoints exist, present them for human review:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 AGENT TEST ► UNCERTAIN CHECKPOINTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{N} checkpoints need human review:

1. {case-name} / Step {n} / Checkpoint: "{text}"
   Evidence: {what the subagent observed}
   Reason: {why it was uncertain}

2. ...

For each checkpoint, please confirm:
  [pass] The behavior is correct
  [fail] The behavior is incorrect
  [rewrite] The checkpoint needs rewording
```

Collect user decisions and update the report accordingly.
</step>

<!-- ================================================================== -->
<!-- GSD INTEGRATION HOOKS                                              -->
<!-- ================================================================== -->

<step name="gsd_generation_gate">
**AGENT TEST GENERATION GATE — Called from execute-plan workflow**

When execute-plan is about to start coding a plan:

1. Check if agent test cases already exist for the plan:
   ```bash
   bun run tests/agent/runner.ts list --linked-plan {plan-id}
   ```

2. If NO cases exist:
   - This is a **blocking gate** — cases must be generated before coding starts
   - Run the generate subcommand: proceed to `generate_init` step
   - After generation, return control to execute-plan

3. If cases already exist:
   - Report existing cases and proceed
   - Log: "Agent Test generation gate: {N} cases already exist for plan {plan-id}"

This enforces the test-first workflow: acceptance criteria must exist before
implementation begins.
</step>

<step name="gsd_execution_gate">
**AGENT TEST EXECUTION GATE — Called from execute-plan workflow**

After a plan's implementation is complete (code written + unit tests passing):

1. Run agent tests for the plan:
   ```bash
   bun run tests/agent/runner.ts run --linked-plan {plan-id}
   ```

2. Evaluate results:
   - **All P0 pass**: Gate passes. Plan implementation is accepted.
   - **P0 failures**: Gate fails. Report failures back to execute-plan for fix iteration.
   - **Uncertain checkpoints**: Gate passes with warning. Log uncertain items for human review.

3. Return gate result to execute-plan:
   ```
   {
     "gate": "agent-test",
     "status": "pass" | "fail" | "warn",
     "p0_pass": N,
     "p0_fail": N,
     "uncertain": N,
     "report_path": "tests/agent/reports/{timestamp}.md"
   }
   ```
</step>

</process>

<success_criteria>
- [ ] Subcommand parsed and routed correctly
- [ ] For `run`: all cases discovered, executed via subagents, reports generated
- [ ] For `run --optimize`: optimization loop runs, journal entries logged
- [ ] For `generate`: PLAN.md read, cases classified, .test.md files written, verified
- [ ] For `list`: all cases listed with correct metadata
- [ ] For `uncertain`: latest uncertain report displayed, user decisions collected
- [ ] GSD generation gate blocks coding until test cases exist
- [ ] GSD execution gate runs after implementation, P0 failures block completion
- [ ] Reports are human-readable and machine-parseable
- [ ] Journal entries follow autoresearch JSONL protocol
</success_criteria>

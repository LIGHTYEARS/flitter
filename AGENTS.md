## Behavioral Constraints

- **No unsolicited deletion**: Never remove logging, diagnostics, or observability code unless the user explicitly asks. "Clean up" does not mean "delete logs."
- **No unsolicited creation**: Never create files (docs, configs, tests) unless the task requires it or the user explicitly asks.
- **Stick to the ask**: Do exactly what was requested. Do not infer adjacent tasks.

## Debugging Protocol

- **Runtime evidence over source reading**: Diagnose bugs from runtime output (logs, tree dumps, intercepted mutations). Never reason from source code alone when runtime evidence is available.
- **Contradiction-first interception**: When two observations contradict, stop hypothesizing. Insert a trap at the mutation point to capture what writes between the two states. One round.
- **Hypothesis budget = 2**: After two negated hypotheses, switch to interception/trapping unconditionally.
- **Ignore naming**: Do not infer behavior from variable names, function names, or structural resemblance to other frameworks. Trace actual data flow.

## Subagent Delegation Protocol

- **Visual + behavioral**: For interactive features, always verify both dimensions. Details → [memory/subagent-delegation-pitfalls.md](memory/subagent-delegation-pitfalls.md).
- **`general_purpose_task` for runtime checks**: `search` subagents are read-only; use `general_purpose_task` when `tmux send-keys` / `tmux capture-pane` is needed.
- **Pretty-print minified source first**: `tr ';' '\n'` before regex. Never trust regex on single-line minified code.
- **Enumerate all trigger paths**: One feature may have multiple activators (key event + text change listener). Instruct subagents to find all of them.

## Observability Architecture

- Permanent diagnostics live in `diagnostics/` as named exports with explicit imports. They are project infrastructure — never delete them.
- Temporary debug probes are inline statements (`console.error`, `Bun.write(Bun.stderr, ...)`) with no imports. These are ephemeral.
- **The structural signal**: if it is imported from a module, it is permanent. If it is an inline statement with no import, it is temporary. No exceptions.

## Plan Splitting Invariants

- A breaking change and the removal of everything it breaks must land in the same atomic unit of work; never create a transient inconsistency that forces a downstream agent to add throwaway patches.

## Pipeline Invariants (General)

- Recursive operations (attach, detach, layout, paint) must propagate to the entire subtree. A parent-only operation that skips children is always a bug.
- Teardown must remove the object from its parent's data structure before deactivating the object itself. Deactivate-then-remove leaves stale references.
- When a child's type changes during reconciliation, the parent must replace (not just update) the corresponding backing object in all ancestors that hold a reference to it.

## Testing

- Test the **removal/cleanup path** (old nodes gone, no stale residuals), not just the creation path.
- Test **type-change reconciliation** (child widget type A → type B), not just same-type property updates.
- Render tree and screen buffer assertions are required. Element tree assertions alone do not prove visual correctness.

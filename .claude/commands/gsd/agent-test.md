---
name: gsd:agent-test
description: Run or generate Agent Test cases (.test.md) for end-to-end verification
argument-hint: "<run|generate|list|uncertain> [options]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
argument-instructions: |
  Parse the argument as a subcommand plus options.
  Subcommands:
    run [--linked-plan ID] [--priority P0] [--category state-machine] [--case name]
    generate --plan <plan-id>
    list
    uncertain --latest
  Example: /gsd-agent-test run --priority P0
  Example: /gsd-agent-test generate --plan 39-02
---
<objective>
Run or generate Agent Test cases for the flitter project.

Agent Tests are markdown-based (.test.md) test cases with YAML frontmatter and
natural language steps + checkpoints. They cover scenarios that traditional unit
tests cannot: cross-component integration, time-dependent behavior, subjective
quality, and performance characteristics.

Agent Tests follow a test-first workflow: cases are generated BEFORE code is
written (from PLAN.md), serving as the acceptance criteria for plan completion.
</objective>

<execution_context>
@.claude/get-shit-done/workflows/agent-test.md
</execution_context>

<context>
Arguments: $ARGUMENTS

@.planning/STATE.md
@tests/agent/types.ts
</context>

<process>
Execute the agent-test workflow from @.claude/get-shit-done/workflows/agent-test.md.

For `run`: discover cases, execute via subagents, generate reports.
For `generate`: read the PLAN.md, generate .test.md cases and fixtures.
For `list`: list all available cases with metadata.
For `uncertain`: show the latest uncertain report for human review.
</process>

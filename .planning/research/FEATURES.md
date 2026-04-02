# Research: Feature Model for v0.3.0 flitter-cli

**Date:** 2026-04-03
**Milestone:** v0.3.0 — flitter-cli

## Runtime Foundation

**Table stakes**
- Launch into the TUI directly from a native CLI entrypoint
- Own the full session lifecycle without ACP bridge assumptions
- Expose configuration, working directory, startup, and shutdown behavior as first-class CLI concerns

**Differentiators**
- Preserve Amp-like runtime semantics while staying on `flitter-core`
- Support migration of proven `flitter-amp` UI pieces instead of rewriting every surface from scratch

## Conversation and Turn Model

**Table stakes**
- User turns, assistant turns, tool calls, plans, thinking, and status updates render as coherent turn groups
- Streaming and incremental updates behave like the reverse-engineered Amp flow
- Sticky sections, scroll behavior, and visible status surfaces remain intact

**Differentiators**
- Formalize the turn model as native `flitter-cli` domain state rather than ACP callback side effects

## Tooling and Command Workflow

**Table stakes**
- Tool execution surfaces feel native to the CLI, not merely proxied
- Tool headers, payloads, statuses, and result rendering match the expected Amp mental model
- Permission and confirmation surfaces remain available where the runtime needs them

**Differentiators**
- Normalize all execution results through one internal tool event model so rendering is consistent

## Session and Persistence

**Table stakes**
- Store sessions, history, resume information, and exports under `flitter-cli`
- Preserve recent-thread and prompt-history workflows already proven useful in `flitter-amp`

**Differentiators**
- Make persistence part of the native runtime contract instead of an ACP-side convenience

## Packaging and Migration

**Table stakes**
- `flitter-cli` becomes the primary package
- `flitter-amp` is clearly marked legacy, migrated, or removed from the active path

**Anti-features**
- Keeping both packages as equal long-term products
- Leaving coco/ACP dependency hidden inside the new runtime

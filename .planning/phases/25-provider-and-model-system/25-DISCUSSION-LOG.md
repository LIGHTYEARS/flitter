# Phase 25: Provider and Model System - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-07
**Phase:** 25-provider-and-model-system
**Areas discussed:** Provider Registry Architecture, Model Catalog Data Structure, Zod Introduction Scope, Hierarchical Config Priority

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Provider Registry Architecture | switch/case vs registry pattern, OpenAI-compatible reuse | |
| Model Catalog Data Structure | AMP n8 fields, pricing data source, required fields | |
| Zod Introduction Scope | Provider config only vs full UserConfig/AppConfig coverage | |
| Hierarchical Config Priority | Per-provider settings structure, anthropic.speed/effort | |
| (User override) | "Fully align with AMP source, no embellishments" | ✓ |

**User's choice:** All four areas resolved with a single directive: fully align with AMP source code, no additions or deviations.

**Notes:** User explicitly chose not to discuss individual gray areas interactively. The directive "completely align with AMP source" resolves all ambiguity by making AMP's `34_providers_models_catalog.js`, `22_providers_reasoning_modes.js`, and `33_settings_schema.js` the authoritative spec for every decision. All 17 decisions in CONTEXT.md are derived by transcribing AMP's exact data structures, enum values, settings keys, and architectural patterns.

---

## Claude's Discretion

- File organization (model catalog, provider registry, config service placement)
- Base URLs for new providers (use well-known public endpoints)
- Exact env var names for auto-detection (follow community conventions)
- Handling of models with no pricing data in AMP source

## Deferred Ideas

- Agent mode definitions (Phase 26)
- Deep reasoning effort settings (Phase 26)
- Compaction threshold settings (Phase 28)
- Feature flags system (not in v0.4.0)

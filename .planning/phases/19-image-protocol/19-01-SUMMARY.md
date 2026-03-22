---
phase: "19"
plan: "19-01"
subsystem: widgets/image-preview
tags: [image, kitty-graphics, protocol, inherited-widget, stateful-widget, render-object]
dependency_graph:
  requires: [framework/widget, framework/render-object, widgets/media-query, widgets/sized-box, terminal/renderer]
  provides: [ImagePreview, ImagePreviewProvider, KittyImageWidget, RenderKittyImage, encodeKittyGraphics]
  affects: [index.ts]
tech_stack:
  added: [Kitty graphics protocol encoding]
  patterns: [InheritedWidget for image context, StatefulWidget with capability detection, SingleChildRenderObjectWidget for image rendering]
key_files:
  created:
    - src/widgets/image-preview.ts
    - src/widgets/__tests__/image-preview.test.ts
  modified:
    - src/index.ts
decisions:
  - "All three classes (ImagePreview, ImagePreviewProvider, KittyImageWidget) in single file for cohesion"
  - "Base64 payload caching in RenderKittyImage to avoid re-encoding on every paint"
  - "Fallback to empty SizedBox(0,0) when Kitty graphics not supported"
  - "PaintContext.writeRawEscape() used for Kitty escape output with graceful degradation"
metrics:
  duration: "5m 33s"
  completed: "2026-03-22"
  tasks_completed: 4
  tests_added: 62
  files_created: 2
  files_modified: 1
---

# Phase 19 Plan 01: Image Protocol Summary

Kitty graphics protocol widgets with chunked base64 transfer, capability detection, and InheritedWidget context propagation

## What Was Built

### IMG-01: ImagePreview StatefulWidget
- `ImagePreview` StatefulWidget that checks terminal capabilities via `MediaQuery.maybeOf(context)` for `kittyGraphics` support
- Falls back to empty `SizedBox` when Kitty graphics not supported or image data is empty
- Auto-calculates terminal cell dimensions from pixel dimensions using configurable cell-pixel ratios (default 8x16)
- Wraps output in `ImagePreviewProvider` so descendant widgets always have access to image state

### IMG-02: KittyImageWidget SingleChildRenderObjectWidget
- `KittyImageWidget` extends `SingleChildRenderObjectWidget`, creates `RenderKittyImage`
- `RenderKittyImage` extends `RenderBox` — sizes to cell dimensions within parent constraints
- Paint method writes Kitty escape sequences via `PaintContext.writeRawEscape()` with graceful fallback
- Caches base64-encoded payload to avoid re-encoding on every paint cycle
- Properly invalidates cache when image data or pixel dimensions change

### IMG-03: ImagePreviewProvider InheritedWidget
- `ImagePreviewProvider` extends `InheritedWidget` following exact same pattern as `Theme`
- Propagates `ImagePreviewData` (imageData, width, height, displayState) to descendants
- `of(context)` throws with descriptive message; `maybeOf(context)` returns undefined
- `updateShouldNotify()` checks all data fields for changes

### Kitty Graphics Protocol Encoding
- `encodeKittyGraphics()` — splits PNG data into chunked base64 escape sequences
- `buildKittyGraphicsPayload()` — concatenates all chunks into single output string
- Proper APC sequence formatting: `ESC_G` with parameters `a=T,f=100,t=d,s=W,v=H,q=2,m=0|1`
- First chunk carries all parameters; middle chunks carry only `m=1`; last chunk carries `m=0`
- Chunk size follows protocol specification: 4096 bytes of base64 per chunk

## Commits

| Commit | Message | Files |
|--------|---------|-------|
| cd88c08 | feat(phase-19): implement Image Protocol (IMG-01, IMG-02, IMG-03) | image-preview.ts, image-preview.test.ts, index.ts |

## Test Coverage

62 tests added across these categories:
- Kitty graphics encoding (uint8ArrayToBase64, splitIntoChunks, encodeKittyGraphics, buildKittyGraphicsPayload)
- ImagePreviewProvider (construction, createElement, updateShouldNotify, of/maybeOf, dependency registration, nested override)
- KittyImageWidget (construction, createRenderObject, updateRenderObject)
- RenderKittyImage (construction, performLayout, getPayload, paint, property setters, cache invalidation, visitChildren)
- ImagePreview (construction, createState, createElement, build with Kitty support, fallback without support, auto cell calculation)
- Integration (nested provider override)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. All functionality is fully wired:
- Encoding functions produce real Kitty protocol output
- RenderKittyImage generates actual escape sequences
- ImagePreview detects capabilities and renders or falls back appropriately

## Self-Check: PASSED

All created files verified to exist on disk. Commit cd88c08 verified in git log.

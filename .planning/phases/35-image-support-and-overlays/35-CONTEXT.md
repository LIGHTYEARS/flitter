# Phase 35: Image Support and Overlays — Context

## Requirements Covered

| ID | Title | Description |
|----|-------|-------------|
| IMG-01 | Paste handler | Ctrl+V for image attachments with isUploadingImageAttachments spinner |
| IMG-02 | popImage | Backspace removes last attached image |
| IMG-03 | Kitty graphics | Kitty graphics protocol support for native terminal image rendering |
| IMG-04 | Image preview | Full-screen image preview overlay with save dialog |
| OVLY-01 | Toast notification | toastController, showToast(), auto-dismiss timer |
| OVLY-02 | Confirmation overlay | Generic yes/no dialog for exit, clear input, cancel processing |
| OVLY-03 | Context detail | Token breakdown overlay when clicking context percentage |
| OVLY-04 | Context analyze | Modal with contextAnalyzeDeps dependency analysis |
| OVLY-05 | File changes | Overlay showing all files modified in current session |

## AMP Source Analysis

### Image Support (AMP GhR class)
- **State fields**: `imageAttachments=[]`, `isUploadingImageAttachments=false`, `imagePreview=null`, `fileImagePreviewPath=null`
- **Methods**: `handleInsertImage`, `handlePopImage`, `handleImageClick`
- **InputArea props**: `onInsertImage`, `imageAttachments`, `popImage`, `onImageClick`, `showImageUploadSpinner`
- **Kitty protocol**: `supportsKittyGraphics()` detection, `transmitImage(imageId, data)`, 8 refs in AMP
- **Image preview**: `ImagePreview` widget (57 refs), `onShowImagePreview` callback, full-screen with save dialog

### Toast (AMP GhR class)
- **Controller**: `toastController = new x1R` (ToastController class)
- **API**: `toastController.show(message, type, duration?)` where type is `"success"|"error"|"info"`
- **Usage**: `showToast:(t,i="success",c)=>{this.toastController.show(t,i,c)}`
- **Plugin wiring**: `T.showToast=(GR)=>MR.show(GR,"success")`, `T.showOpenedURLToast=(GR)=>MR.show("Opened URL: ${GR}","success",8000)`
- **Overlay**: TOAST priority = 10 (passive/non-modal, rendered at bottom)

### Confirmation Overlay (AMP aTT/TTT classes)
- **Widget**: `TTT` (StatefulWidget) creates `aTT` (State)
- **State fields**: `isShowingConfirmationOverlay`, `isConfirmingExit`, `isConfirmingClearInput`, `isConfirmingCancelProcessing`
- **Timeouts**: `exitConfirmTimeout`, `clearInputConfirmTimeout`, `cancelProcessingConfirmTimeout`
- **Content**: `confirmationOverlayContent=""` for preview text
- **aTT features**: feedbackInputActive, feedbackController, FocusScope with key handling, option buttons

### Context Detail / Context Analyze (AMP GhR)
- **State**: `isShowingContextDetailOverlay=false`, `isShowingContextAnalyzeModal=false`
- **Existing**: `contextWindowUsagePercent` computed property already in AppState
- **AMP behavior**: Context detail shows token breakdown (input, output, cached); context analyze shows dependency analysis

### File Changes (AMP ThreadWorker)
- **State**: `isShowingFileChangesOverlay=false`, `fileChanges=new j0({files:[]})`
- **Data**: `cachedFileChanges=[]`, `updateFileChanges()` method
- **ThreadWorker**: `fileChanges` is a BehaviorSubject with `{files: FileChange[]}`

## Existing Infrastructure

### overlay-ids.ts
Already has: `TOAST: 'toast'` in OVERLAY_IDS and `TOAST: 10` in OVERLAY_PRIORITIES.
Missing: CONFIRMATION, CONTEXT_DETAIL, CONTEXT_ANALYZE, FILE_CHANGES, IMAGE_PREVIEW.

### overlay-manager.ts
Full priority-sorted stack with show/dismiss/dismissTop/buildOverlays.
Supports modal (with background mask) and non-modal overlays.
OverlayPlacement: 'fullscreen' | 'anchored'.

### app-state.ts
- Has `contextWindowUsagePercent` getter.
- Has `overlayManager: OverlayManager`.
- Has `_notifyListeners()` pattern for all state changes.
- Missing: imageAttachments[], isUploadingImageAttachments, toastController, confirmation state.

### app-shell.ts
- FocusScope with ShortcutRegistry dispatch.
- Column layout: Expanded(content) + BashInvocationsWidget + InputArea.
- overlayManager.buildOverlays() wraps layout column.
- Shortcut hooks: `pasteImage?()` already in ShortcutHooks interface.

### shortcuts/registry.ts
- `pasteImage?()` already declared in ShortcutHooks interface.
- Ctrl+V already registered in defaults.ts calling `ctx.hooks.pasteImage?.()`.

### command-registry.ts
- Command #15: "paste image from clipboard" already exists (calls ctx.hooks.pasteImage).
- Command #12: "context > analyze" exists as stub (calls appState.showContextAnalyze).

## Plan Structure

| Plan | Wave | Dependencies | Requirements |
|------|------|-------------|--------------|
| 35-01 | 1 | None | IMG-01, IMG-02, IMG-03, IMG-04 |
| 35-02 | 1 | None | OVLY-01, OVLY-02 |
| 35-03 | 2 | 35-01 (imagePreview uses overlay) | OVLY-03, OVLY-04, OVLY-05 |

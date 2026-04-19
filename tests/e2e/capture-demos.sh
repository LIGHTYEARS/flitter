#!/usr/bin/env bash
# ════════════════════════════════════════════════════
#  Flitter TUI Demo — Visual Regression Capture
#
#  Launches all 8 core TUI demos in parallel tmux sessions,
#  captures their rendered output as colored HTML snapshots,
#  and generates an index page for visual inspection.
#
#  Usage:
#    bash tests/e2e/capture-demos.sh           # capture + open in browser
#    bash tests/e2e/capture-demos.sh --no-open # capture only (for CI)
#
#  Output: tests/e2e/captures/*.html + index.html
#  Requirements: tmux, bun
# ════════════════════════════════════════════════════

source "$(dirname "$0")/lib.sh"

CAPTURE_DIR="$PROJECT_ROOT/tests/e2e/captures"
OPEN_BROWSER=true
COLS=120
ROWS=40

# Parse args
for arg in "$@"; do
  case "$arg" in
    --no-open) OPEN_BROWSER=false ;;
  esac
done

mkdir -p "$CAPTURE_DIR"

# ── Demo definitions ──
# Format: "session_prefix:demo_file:display_name:file_slug:pre_capture_keys"
DEMOS=(
  "cap-conv-$$:tui-conversation-demo.ts:ConversationView:conversationview:"
  "cap-appr-$$:tui-approval-demo.ts:ApprovalWidget:approvalwidget:"
  "cap-stat-$$:tui-statusbar-demo.ts:StatusBar:statusbar:"
  "cap-toast-$$:tui-toast-demo.ts:ToastOverlay:toastoverlay:t"
  "cap-err-$$:tui-error-dialog-demo.ts:ErrorDialog:errordialog:"
  "cap-spin-$$:tui-spinner-demo.ts:BrailleSpinner:braillespinner:"
  "cap-diff-$$:tui-diff-demo.ts:DiffWidget:diffwidget:"
  "cap-cost-$$:tui-cost-tracker-demo.ts:CostTracker:costtracker:i"
)

# ── Cleanup trap ──
cleanup() {
  for entry in "${DEMOS[@]}"; do
    session="${entry%%:*}"
    tmux kill-session -t "$session" 2>/dev/null || true
  done
}
trap cleanup EXIT

# ════════════════════════════════════════════════════
#  Launch all demos in parallel
# ════════════════════════════════════════════════════

echo "Launching 8 demos in parallel tmux sessions (${COLS}x${ROWS})..."

for entry in "${DEMOS[@]}"; do
  IFS=':' read -r session demo_file display_name slug _keys <<< "$entry"
  tmux kill-session -t "$session" 2>/dev/null || true
  tmux new-session -d -s "$session" -x "$COLS" -y "$ROWS" \
    "cd $PROJECT_ROOT && bun run examples/${demo_file} 2>/tmp/${session}-stderr.log"
done

echo "Waiting 4s for first frames to render..."
sleep 4

# ════════════════════════════════════════════════════
#  Send pre-capture keys and capture
# ════════════════════════════════════════════════════

echo "Capturing..."

for entry in "${DEMOS[@]}"; do
  IFS=':' read -r session demo_file display_name slug keys <<< "$entry"

  # Send pre-capture keys if specified
  if [ -n "$keys" ]; then
    IFS=',' read -ra key_list <<< "$keys"
    for k in "${key_list[@]}"; do
      tmux send-keys -t "$session" "$k"
    done
    sleep 1
  fi

  # Capture ANSI → HTML
  tmux capture-pane -t "$session" -e -p 2>/dev/null \
    | bun run "$PROJECT_ROOT/tests/e2e/ansi2html.ts" --title "$display_name" \
    > "$CAPTURE_DIR/${slug}.html"

  echo "  Captured: ${display_name} → ${slug}.html"
done

# ════════════════════════════════════════════════════
#  Generate index page
# ════════════════════════════════════════════════════

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

cat > "$CAPTURE_DIR/index.html" << INDEXEOF
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Flitter TUI Demo Captures</title>
<style>
body {
  background: #0d1117;
  color: #c9d1d9;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}
h1 { color: #58a6ff; border-bottom: 1px solid #30363d; padding-bottom: 8px; }
h2 { color: #79c0ff; margin-top: 12px; font-size: 16px; }
.meta { color: #8b949e; font-size: 13px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 16px; }
.cell { border: 1px solid #30363d; border-radius: 8px; overflow: hidden; }
.cell iframe { width: 100%; height: 420px; border: none; }
</style>
</head>
<body>
<h1>Flitter TUI Demo Visual Captures</h1>
<p class="meta">Captured: ${TIMESTAMP} | Terminal: ${COLS}x${ROWS} | Pipeline: tmux capture-pane -e + ansi_up</p>
<div class="grid">
INDEXEOF

for entry in "${DEMOS[@]}"; do
  IFS=':' read -r _session _demo display_name slug _keys <<< "$entry"
  cat >> "$CAPTURE_DIR/index.html" << CELLEOF
  <div class="cell">
    <h2>&nbsp;${display_name}</h2>
    <iframe src="${slug}.html"></iframe>
  </div>
CELLEOF
done

cat >> "$CAPTURE_DIR/index.html" << 'FOOTEREOF'
</div>
</body>
</html>
FOOTEREOF

echo ""
echo "All captures saved to: tests/e2e/captures/"
echo "Index page: tests/e2e/captures/index.html"

# ── Open in browser ──
if [ "$OPEN_BROWSER" = true ] && command -v open &>/dev/null; then
  open "$CAPTURE_DIR/index.html"
  echo "Opened in browser."
fi

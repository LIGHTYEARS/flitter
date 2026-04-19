#!/usr/bin/env bash
# ════════════════════════════════════════════════════
#  Flitter TUI Demo — E2E Smoke Test
#
#  Launches each of the 8 core TUI demos individually,
#  runs text-based assertions on tmux capture-pane output,
#  and captures HTML snapshots as artifacts.
#
#  Usage: bash tests/e2e/smoke-test.sh
#  Requirements: tmux, bun
# ════════════════════════════════════════════════════

source "$(dirname "$0")/lib.sh"

CAPTURE_DIR="$PROJECT_ROOT/tests/e2e/captures"
mkdir -p "$CAPTURE_DIR"

echo "Flitter TUI E2E Smoke Test"
echo "══════════════════════════"

# ════════════════════════════════════════════════════
#  Demo 1: ConversationView
# ════════════════════════════════════════════════════
echo ""
echo "Demo 1: ConversationView"

tmux_start "smoke-conv-$$" "bun run examples/tui-conversation-demo.ts" 120 40
tmux_capture
assert_screen "ConversationView Demo" "Title rendered"
assert_screen "Type a message" "Input hint visible"
assert_screen "Fix the bug" "Mock conversation message"
tmux_capture_html "$CAPTURE_DIR/smoke-conversation.html" --title "ConversationView"
tmux_stop

# ════════════════════════════════════════════════════
#  Demo 2: ApprovalWidget
# ════════════════════════════════════════════════════
echo ""
echo "Demo 2: ApprovalWidget"

tmux_start "smoke-appr-$$" "bun run examples/tui-approval-demo.ts" 120 40
tmux_capture
assert_screen "ApprovalWidget Demo" "Title rendered"
assert_screen "Request 1 of 3" "Request counter"
assert_screen "Approve" "Approve option visible"
tmux_capture_html "$CAPTURE_DIR/smoke-approval.html" --title "ApprovalWidget"
tmux_stop

# ════════════════════════════════════════════════════
#  Demo 3: StatusBar
# ════════════════════════════════════════════════════
echo ""
echo "Demo 3: StatusBar"

tmux_start "smoke-stat-$$" "bun run examples/tui-statusbar-demo.ts" 120 40
tmux_capture
assert_screen "StatusBar Demo" "Title rendered"
assert_screen "claude-opus-4-6" "Model name in status bar"

# Wait for auto-cycling and re-check
sleep 3
tmux_capture
assert_screen "Scenario" "Scenario counter visible after cycling"
tmux_capture_html "$CAPTURE_DIR/smoke-statusbar.html" --title "StatusBar"
tmux_stop

# ════════════════════════════════════════════════════
#  Demo 4: ToastOverlay
# ════════════════════════════════════════════════════
echo ""
echo "Demo 4: ToastOverlay"

tmux_start "smoke-toast-$$" "bun run examples/tui-toast-demo.ts" 120 40
tmux_capture
assert_screen "ToastOverlay Demo" "Title rendered"
assert_screen "Toasts fired: 0" "Initial counter at 0"

# Fire a toast
tmux_key 't'
tmux_capture
assert_screen "Toasts fired: 1" "Counter incremented after pressing t"
tmux_capture_html "$CAPTURE_DIR/smoke-toast.html" --title "ToastOverlay"
tmux_stop

# ════════════════════════════════════════════════════
#  Demo 5: ErrorDialog
# ════════════════════════════════════════════════════
echo ""
echo "Demo 5: ErrorDialog"

tmux_start "smoke-err-$$" "bun run examples/tui-error-dialog-demo.ts" 120 40
tmux_capture
assert_screen "API Rate Limit" "Error dialog visible on first render"
tmux_capture_html "$CAPTURE_DIR/smoke-error-dialog.html" --title "ErrorDialog"

# Dismiss with Escape
tmux_key Escape
sleep 0.5
tmux_capture
assert_screen "ErrorDialog Demo" "Dialog dismissed, mode content visible"

# Re-show with 'e'
tmux_key 'e'
sleep 0.5
tmux_capture
assert_screen "API Rate Limit" "Error dialog re-shown after pressing e"
tmux_stop

# ════════════════════════════════════════════════════
#  Demo 6: BrailleSpinner
# ════════════════════════════════════════════════════
echo ""
echo "Demo 6: BrailleSpinner"

tmux_start "smoke-spin-$$" "bun run examples/tui-spinner-demo.ts" 120 40
tmux_capture
assert_screen "BrailleSpinner" "Title rendered"
assert_screen "Braille:" "Braille character label"
assert_screen "Cells:" "Cell state display"
assert_screen "Gen:" "Generation counter"
tmux_capture_html "$CAPTURE_DIR/smoke-spinner.html" --title "BrailleSpinner"
tmux_stop

# ════════════════════════════════════════════════════
#  Demo 7: DiffWidget
# ════════════════════════════════════════════════════
echo ""
echo "Demo 7: DiffWidget"

tmux_start "smoke-diff-$$" "bun run examples/tui-diff-demo.ts" 120 40
tmux_capture
assert_screen "DiffWidget" "Title rendered"
assert_screen "Showing 1 of 3" "Diff counter at 1"

# Cycle to next diff
tmux_key 'd'
tmux_capture
assert_screen "Showing 2 of 3" "Cycled to diff 2 after pressing d"
tmux_capture_html "$CAPTURE_DIR/smoke-diff.html" --title "DiffWidget"
tmux_stop

# ════════════════════════════════════════════════════
#  Demo 8: CostTracker
# ════════════════════════════════════════════════════
echo ""
echo "Demo 8: CostTracker"

tmux_start "smoke-cost-$$" "bun run examples/tui-cost-tracker-demo.ts" 120 40
tmux_capture
assert_screen "SessionCostTracker" "Title rendered"
assert_screen "Inference turns:" "Inference turn label"

# Simulate inference
tmux_key 'i'
tmux_capture
assert_screen "Inference turns:" "Turn count visible after pressing i"
tmux_capture_html "$CAPTURE_DIR/smoke-cost-tracker.html" --title "CostTracker"
tmux_stop

# ════════════════════════════════════════════════════
#  Summary
# ════════════════════════════════════════════════════

echo ""
echo "HTML artifacts saved to: tests/e2e/captures/smoke-*.html"
# Use a local summary since tmux_summary calls tmux_stop (already stopped)
echo ""
if [ "$_FAIL" -eq 0 ]; then
  echo "${_GREEN}═══ $_PASS pass, $_FAIL fail (of $_TOTAL) ═══${_RESET}"
else
  echo "${_RED}═══ $_PASS pass, $_FAIL fail (of $_TOTAL) ═══${_RESET}"
fi
[ "$_FAIL" -eq 0 ]

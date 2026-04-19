#!/usr/bin/env bash
# ════════════════════════════════════════════════════
#  Flitter tmux E2E test helper library
#
#  Source this file in test scripts:
#    source "$(dirname "$0")/lib.sh"
#
#  Provides: tmux_start, tmux_stop, tmux_key, tmux_capture,
#            tmux_capture_html, assert_screen, assert_screen_not,
#            tmux_summary
# ════════════════════════════════════════════════════

set -euo pipefail

# Project root (relative to this file at tests/e2e/lib.sh)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# ── Counters ──
_PASS=0
_FAIL=0
_TOTAL=0

# ── State ──
_SESSION=""
_SCREEN=""

# ── Colors ──
_RED=$'\033[31m'
_GREEN=$'\033[32m'
_YELLOW=$'\033[33m'
_DIM=$'\033[2m'
_RESET=$'\033[0m'

# ════════════════════════════════════════════════════
#  Session lifecycle
# ════════════════════════════════════════════════════

# Start a tmux session running the given command.
#   tmux_start <session_name> <command> [width] [height]
tmux_start() {
  local name="$1" cmd="$2"
  local width="${3:-80}" height="${4:-24}"
  _SESSION="$name"

  # Kill any stale session with this name
  tmux kill-session -t "$name" 2>/dev/null || true

  # Launch in detached session, redirect stderr to log file
  tmux new-session -d -s "$name" -x "$width" -y "$height" \
    "cd $PROJECT_ROOT && $cmd 2>/tmp/${name}-stderr.log"

  # Wait for first frame to render
  sleep 3
}

# Kill the current tmux session.
tmux_stop() {
  if [ -n "$_SESSION" ]; then
    tmux kill-session -t "$_SESSION" 2>/dev/null || true
    _SESSION=""
  fi
}

# Kill all tmux sessions matching a prefix pattern.
#   tmux_cleanup <prefix>
tmux_cleanup() {
  local prefix="$1"
  tmux list-sessions -F '#{session_name}' 2>/dev/null \
    | grep "^${prefix}" \
    | while read -r s; do tmux kill-session -t "$s" 2>/dev/null || true; done
}

# ════════════════════════════════════════════════════
#  Input injection
# ════════════════════════════════════════════════════

# Send a key to the current session and wait for frame update.
#   tmux_key <key>
# Examples: tmux_key '3', tmux_key Escape, tmux_key Enter, tmux_key C-c
tmux_key() {
  tmux send-keys -t "$_SESSION" "$1"
  sleep 0.5
}

# Send raw bytes to the current session (for mouse events etc.)
#   tmux_raw <escape_sequence>
tmux_raw() {
  tmux send-keys -t "$_SESSION" -- "$1"
  sleep 0.5
}

# ════════════════════════════════════════════════════
#  Screen capture
# ════════════════════════════════════════════════════

# Capture plain text content of the current pane into $_SCREEN.
tmux_capture() {
  _SCREEN=$(tmux capture-pane -t "$_SESSION" -p 2>/dev/null || echo "")
}

# Capture ANSI-escaped content and convert to HTML file.
#   tmux_capture_html <output_path> [--title <title>]
tmux_capture_html() {
  local output="$1"
  shift

  local title_args=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --title) title_args="--title $2"; shift 2 ;;
      *) shift ;;
    esac
  done

  tmux capture-pane -t "$_SESSION" -e -p 2>/dev/null \
    | bun run "$PROJECT_ROOT/tests/e2e/ansi2html.ts" $title_args > "$output"
}

# ════════════════════════════════════════════════════
#  Assertions
# ════════════════════════════════════════════════════

# Assert that the captured screen contains a string.
#   assert_screen <expected> <message>
assert_screen() {
  local expected="$1" msg="${2:-Screen should contain: $1}"
  ((_TOTAL++)) || true

  if echo "$_SCREEN" | grep -qF "$expected"; then
    ((_PASS++)) || true
    echo "  ${_GREEN}PASS${_RESET} $msg"
  else
    ((_FAIL++)) || true
    echo "  ${_RED}FAIL${_RESET} $msg"
    echo "    Expected to find: \"$expected\""
    echo "    ${_DIM}Screen (first 10 lines):${_RESET}"
    echo "$_SCREEN" | head -10 | sed 's/^/      /'
    echo "      ..."
  fi
}

# Assert that the captured screen does NOT contain a string.
#   assert_screen_not <unexpected> <message>
assert_screen_not() {
  local unexpected="$1" msg="${2:-Screen should not contain: $1}"
  ((_TOTAL++)) || true

  if echo "$_SCREEN" | grep -qF "$unexpected"; then
    ((_FAIL++)) || true
    echo "  ${_RED}FAIL${_RESET} $msg"
    echo "    Unexpectedly found: \"$unexpected\""
  else
    ((_PASS++)) || true
    echo "  ${_GREEN}PASS${_RESET} $msg"
  fi
}

# ════════════════════════════════════════════════════
#  Summary
# ════════════════════════════════════════════════════

# Print summary, stop session, and exit with appropriate code.
tmux_summary() {
  tmux_stop
  echo ""
  if [ "$_FAIL" -eq 0 ]; then
    echo "${_GREEN}═══ $_PASS pass, $_FAIL fail (of $_TOTAL) ═══${_RESET}"
  else
    echo "${_RED}═══ $_PASS pass, $_FAIL fail (of $_TOTAL) ═══${_RESET}"
  fi
  [ "$_FAIL" -eq 0 ]
}

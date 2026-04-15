function Xb() {
  if (process.env.TMUX || process.env.TMUX_PANE) return !0;
  return process.env.TERM?.toLowerCase()?.includes("tmux") ?? !1;
}
function Lu0() {
  if (!Xb()) return !1;
  try {
    return Cu0('tmux display-message -p "#{pane_active}"', {
      timeout: 500,
      encoding: "utf8"
    }).trim() !== "1";
  } catch {
    return !1;
  }
}
function yr0() {
  return Vx("devtools");
}
function kr0(T) {
  if (!window) {
    yr0().warn("devtools not available outside browser environment");
    return;
  }
  if (!document.getElementById(SPT)) {
    let R = document.createElement("script");
    R.id = SPT, R.src = Pr0(), R.async = !0, document.head.appendChild(R);
  }
  window.__rivetkit = window.__rivetkit || [], window.__rivetkit.push(T);
}
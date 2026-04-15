function DpR() {
  if (js.size === 0) return;
  J.info("Killing all child processes");
  for (let T of js) t9T(T);
  js.clear(), J.info("All child processes killed");
}
function t9T(T) {
  if (!T.pid) {
    try {
      T.kill("SIGKILL");
    } catch (R) {
      J.error("Failed to kill process without PID", R);
    }
    return;
  }
  if (Bg.has(T.pid)) {
    J.debug(`Process ${T.pid} already being killed, skipping`);
    return;
  }
  Bg.add(T.pid);
  try {
    try {
      process.kill(T.pid, 0), process.kill(-T.pid, "SIGKILL");
    } catch (R) {
      J.debug(`Process ${T.pid} no longer exists, skipping kill`);
    }
    Bg.delete(T.pid);
  } catch (R) {
    J.error(`Failed to kill process ${T.pid}`, R), Bg.delete(T.pid);
  }
}
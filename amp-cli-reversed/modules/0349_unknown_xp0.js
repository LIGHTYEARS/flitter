function xp0(T, R, a) {
  let e = hCT(R.settings),
    t = JSON.stringify(e);
  if (t === a) return a;
  let r = T.getConnectionInfo();
  if (r.state !== "connected" || r.role !== "executor") return a;
  try {
    return T.sendExecutorSettingsUpdate(e), t;
  } catch {
    return a;
  }
}
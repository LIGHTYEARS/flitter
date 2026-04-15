async function m_0(T, R) {
  let a = await yVT(T);
  if (a.kind !== "valid" || a.pid !== R) return;
  await rY(T, {
    force: !0
  }), J.info("Removed headless PID file", {
    currentPID: R,
    pidFilePath: T
  });
}
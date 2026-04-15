async function PpR() {
  if (typeof WebSocket < "u") return WebSocket;
  let {
    default: T
  } = await Promise.resolve().then(() => (Q0T(), Y0T));
  return T;
}
function gpR(T) {
  return _N(T);
}
function $pR(T) {
  return T.replace(/[^a-zA-Z0-9_-]/g, "_");
}
function _N(T) {
  return T9T.join(R9T, `${$pR(T)}.lock`);
}
async function vpR() {
  await $r.mkdir(R9T, {
    recursive: !0,
    mode: 448
  });
}
function jpR(T) {
  try {
    return process.kill(T, 0), !0;
  } catch {
    return !1;
  }
}
function zW(T) {
  if (Date.now() - T.timestamp > SpR) return !0;
  let R = qT("node:os").hostname();
  if (T.hostname === R && !jpR(T.pid)) return !0;
  return !1;
}
async function yL(T) {
  let R = _N(T);
  try {
    let a = await $r.readFile(R, "utf8"),
      e = JSON.parse(a);
    if (typeof e.pid !== "number" || typeof e.timestamp !== "number") return J.warn("Invalid lock file structure, treating as stale", {
      serverName: T,
      lockPath: R
    }), null;
    return e;
  } catch (a) {
    if (a?.code === "ENOENT") return null;
    return J.debug("Failed to read lock file", {
      serverName: T,
      error: a.message
    }), null;
  }
}
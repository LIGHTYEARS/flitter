function HxT(T) {
  return JSON.stringify(T);
}
function fXT(T) {
  let R = new Set(),
    a = [];
  for (let e of T) {
    if (R.has(e)) continue;
    R.add(e), a.push(e);
  }
  return a;
}
function pP0(T, R, a = !1) {
  if (a) return T === "always" ? "always" : "never";
  if (T === "prompt" && R) return "always";
  return T;
}
async function _P0(T) {
  let R = null;
  try {
    return await Promise.race([T.initialAvailableStatus, new Promise((a, e) => {
      R = setTimeout(() => {
        e(new GR("Timed out waiting for thread git status. Open the thread or ensure its executor is running, then try again.", 1));
      }, T.timeoutMs);
    })]);
  } finally {
    if (R) clearTimeout(R);
  }
}
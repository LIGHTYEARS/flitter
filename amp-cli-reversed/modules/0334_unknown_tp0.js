function jw(T) {
  return T.replace(/\n+$/, "");
}
function tp0(T = eVT.env, R = {}) {
  let {
      isolateGitConfig: a = !0
    } = R,
    e = {
      ...T
    };
  if (a) {
    for (let t of Object.keys(e)) if (Tp0.includes(t) || t.startsWith("GIT_CONFIG_KEY_") || t.startsWith("GIT_CONFIG_VALUE_")) delete e[t];
    e.GIT_CONFIG_NOSYSTEM = "1", e.GIT_CONFIG_SYSTEM = RY, e.GIT_CONFIG_GLOBAL = RY;
  }
  return e;
}
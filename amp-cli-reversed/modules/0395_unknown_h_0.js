function t_0() {
  return !!(process.env.SSH_CLIENT || process.env.SSH_TTY || process.env.SSH_CONNECTION);
}
function r_0() {
  if (!e_0.isTTY) return !0;
  if (t_0()) return !0;
  return !1;
}
function XkT(T) {
  if (tY = T, T && EM.length > 0) {
    for (let R of EM) T(R);
    EM = [];
  }
}
function h_0(T) {
  return async (R, a) => {
    return new Promise((e, t) => {
      let r = {
        serverName: T,
        authorizationUrl: R,
        redirectUrl: a,
        resolve: e,
        reject: t
      };
      if (tY) tY(r);else EM.push(r);
    });
  };
}
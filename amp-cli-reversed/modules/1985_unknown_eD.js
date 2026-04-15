function a3R(T) {
  return !!(T && XdT(T));
}
function SS(T, R) {
  return T?.some(a => a.name === R && a.enabled) ?? !1;
}
function aZ(T) {
  return (T.userEmail ? Ns(T.userEmail) : !1) || SS(T.features, dr.DTW_TUI);
}
function r$T(T) {
  if (T.dtwEnabled && !T.hasV2TUIAccess) throw new GR("This TUI mode is not enabled for your user;", 1);
}
function eZ(T, R) {
  if (typeof T === "boolean") return T;
  if (!X9(R)) return !1;
  return aZ({
    userEmail: R.user.email,
    features: R.features
  });
}
function Dz0(T) {
  return T !== "pending";
}
function hx(T) {
  if (!X9(T)) return null;
  return {
    ...T.user,
    features: T.features ?? [],
    team: T.workspace ?? void 0
  };
}
function wz0(T) {
  let R = hx(T);
  if (R) return R.id;
  if (oA(T)) throw Error(T.error.message);
  throw Error("unreachable");
}
function Bz0(T) {
  try {
    let R = new URL(T);
    return R.hostname === "localhost" || R.hostname === "127.0.0.1";
  } catch {
    return T.includes("localhost") || T.includes("127.0.0.1");
  }
}
function eD(T) {
  let R = Bz0(T) ? "Run `pnpm dev` to start the local server, then try again." : "Check your network connection or the server URL and try again.";
  return new GR(`Couldn't connect to the Amp server at ${T}.`, 1, R);
}
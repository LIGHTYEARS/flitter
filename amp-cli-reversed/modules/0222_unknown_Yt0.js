async function Yt0(T, R, a, e, t) {
  let {
    actorId: r
  } = await nS(void 0, R, T);
  g0().debug({
    msg: "found actor for action",
    actorId: r
  }), _GT.default(r, "Missing actor ID");
  let h = "",
    i = "";
  if (e) {
    let s = e.indexOf("?");
    if (s !== -1) h = e.substring(0, s), i = e.substring(s);else h = e;
    if (h.startsWith("/")) h = h.slice(1);
  }
  let c = `${p90}${h}${i}`;
  return g0().debug({
    msg: "opening websocket",
    actorId: r,
    encoding: "bare",
    path: c
  }), await T.openWebSocket(c, r, "bare", a);
}
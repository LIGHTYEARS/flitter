function geT(T, R, a, e = "") {
  let t = a !== void 0 ? `@${encodeURIComponent(a)}` : "",
    r = `/gateway/${encodeURIComponent(R)}${t}${e}`;
  return qaT(T, r);
}
async function rr0(T, R, a, e, t) {
  let r = await gFT(),
    h = qk(T),
    i = geT(h, a, T.token, R);
  m8().debug({
    msg: "opening websocket to actor via guard",
    actorId: a,
    path: R,
    guardUrl: i
  });
  let c = new r(i, PGT(T, e, t));
  return c.binaryType = "arraybuffer", m8().debug({
    msg: "websocket connection opened",
    actorId: a
  }), c;
}
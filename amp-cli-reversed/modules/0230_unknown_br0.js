async function cr0(T, R, a) {
  return pp(T, "GET", `/actors?actor_ids=${encodeURIComponent(a)}`);
}
async function sr0(T, R, a) {
  let e = P1(a);
  return pp(T, "GET", `/actors?name=${encodeURIComponent(R)}&key=${encodeURIComponent(e)}`);
}
async function or0(T, R) {
  return pp(T, "GET", `/actors?name=${encodeURIComponent(R)}`);
}
async function nr0(T, R) {
  return pp(T, "PUT", "/actors", R);
}
async function lr0(T, R) {
  return pp(T, "POST", "/actors", R);
}
async function Ar0(T, R) {
  return pp(T, "DELETE", `/actors/${encodeURIComponent(R)}`);
}
async function pr0(T) {
  return pp(T, "GET", "/metadata");
}
async function _r0(T, R, a) {
  return pp(T, "GET", `/actors/${encodeURIComponent(R)}/kv/keys/${encodeURIComponent(a)}`);
}
async function br0(T) {
  let R = qk(T),
    a = jPT.get(R);
  if (a) return a;
  let e = pGT(async () => {
    m8().debug({
      msg: "fetching metadata",
      endpoint: R
    });
    let t = await pr0(T);
    return m8().debug({
      msg: "received metadata",
      endpoint: R,
      clientEndpoint: t.clientEndpoint
    }), t;
  }, {
    forever: !0,
    minTimeout: 500,
    maxTimeout: 15000,
    onFailedAttempt: t => {
      if (t.attemptNumber > 1) m8().warn({
        msg: "failed to fetch metadata, retrying",
        endpoint: R,
        attempt: t.attemptNumber,
        error: _r(t)
      });
    }
  });
  return jPT.set(R, e), e;
}
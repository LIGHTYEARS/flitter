async function Xt0(T, R, a, e, t) {
  let r,
    h = t || {};
  if (typeof e === "string") r = e;else if (e instanceof URL) r = e.pathname + e.search;else if (e instanceof Request) {
    let i = new URL(e.url);
    r = i.pathname + i.search;
    let c = new Headers(e.headers),
      s = new Headers((t == null ? void 0 : t.headers) || {}),
      A = new Headers(c);
    if (s.forEach((l, o) => {
      A.set(o, l);
    }), h = {
      method: e.method,
      body: e.body,
      mode: e.mode,
      credentials: e.credentials,
      redirect: e.redirect,
      referrer: e.referrer,
      referrerPolicy: e.referrerPolicy,
      integrity: e.integrity,
      keepalive: e.keepalive,
      signal: e.signal,
      ...h,
      headers: A
    }, h.body) h.duplex = "half";
  } else throw TypeError("Invalid input type for fetch");
  try {
    let {
      actorId: i
    } = await nS(void 0, R, T);
    g0().debug({
      msg: "found actor for raw http",
      actorId: i
    }), _GT.default(i, "Missing actor ID");
    let c = r.startsWith("/") ? r.slice(1) : r,
      s = new URL(`http://actor/request/${c}`),
      A = new Headers(h.headers);
    if (a) A.set(beT, JSON.stringify(a));
    let l = new Request(s, {
      ...h,
      headers: A
    });
    return T.sendRequest(i, l);
  } catch (i) {
    let {
      group: c,
      code: s,
      message: A,
      metadata: l
    } = HaT(i, g0(), {}, !0);
    throw new nh(c, s, A, l);
  }
}
async function DGR(T, R = {}, a) {
  let e = `/api/internal/github-proxy/${T}`,
    {
      body: t,
      headers: r = {},
      method: h = "GET",
      ...i
    } = R,
    c = await ibR(a, e, {
      method: h,
      headers: r,
      body: t ? JSON.stringify(t) : void 0,
      ...i
    });
  if (c.status === 304) return {
    ok: !0,
    status: c.status,
    notModified: !0,
    headers: {
      etag: c.headers.get("etag") || void 0
    }
  };
  if (!c.ok) return {
    ok: !1,
    status: c.status,
    statusText: c.statusText
  };
  let s = await c.json();
  return {
    ok: !0,
    status: c.status,
    data: s,
    headers: {
      location: c.headers.get("location") || void 0,
      etag: c.headers.get("etag") || void 0
    }
  };
}
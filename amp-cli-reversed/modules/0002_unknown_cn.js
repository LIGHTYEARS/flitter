function cGR(T, R) {
  return R.settings.bitbucketToken;
}
async function cn(T, R, a = {}, e) {
  let {
      headers: t = {},
      method: r = "GET",
      ...h
    } = a,
    i = T.trim().replace(/\/$/, ""),
    c = R.startsWith("/") ? R : `/${R}`,
    s = `${i}${c}`,
    A = cGR(T, e);
  if (!A) return {
    ok: !1,
    status: 401,
    statusText: "Bitbucket Enterprise token not configured for instance"
  };
  let l = await fetch(s, {
    method: r,
    headers: {
      ...t,
      Authorization: `Bearer ${A}`,
      Accept: "application/json"
    },
    ...h
  });
  if (l.status === 304) return {
    ok: !0,
    status: l.status,
    notModified: !0,
    headers: {
      etag: l.headers.get("etag") || void 0
    }
  };
  if (!l.ok) return {
    ok: !1,
    status: l.status,
    statusText: l.statusText
  };
  let o = await l.json();
  return {
    ok: !0,
    status: l.status,
    data: o,
    headers: {
      etag: l.headers.get("etag") || void 0
    }
  };
}
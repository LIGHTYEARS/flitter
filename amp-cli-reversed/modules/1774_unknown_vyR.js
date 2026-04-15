function gyR(T, R = "", a = {}) {
  if (R.endsWith("/")) R = R.slice(0, -1);
  return a.prependPathname ? `${R}/.well-known/${T}` : `/.well-known/${T}${R}`;
}
async function AlT(T, R, a = fetch) {
  return await B9T(T, {
    "MCP-Protocol-Version": R
  }, a);
}
function $yR(T, R) {
  return !T || T.status >= 400 && T.status < 500 && R !== "/";
}
async function vyR(T, R, a, e) {
  let t = new URL(T),
    r = e?.protocolVersion ?? $N,
    h;
  if (e?.metadataUrl) h = new URL(e.metadataUrl);else {
    let c = gyR(R, t.pathname);
    h = new URL(c, e?.metadataServerUrl ?? t), h.search = t.search;
  }
  let i = await AlT(h, r, a);
  if (!e?.metadataUrl && $yR(i, t.pathname)) {
    let c = new URL(`/.well-known/${R}`, t);
    i = await AlT(c, r, a);
  }
  return i;
}
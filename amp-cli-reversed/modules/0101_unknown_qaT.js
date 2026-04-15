function sa(T) {
  if (typeof Deno < "u") return Deno.env.get(T);else if (typeof process < "u") return process.env[T];
}
function pM(T) {
  let R,
    a,
    e = new Promise((t, r) => {
      R = t, a = r;
    });
  return e.catch(T), {
    promise: e,
    resolve: R,
    reject: a
  };
}
function KU(T) {
  return T.buffer.slice(T.byteOffset, T.byteOffset + T.byteLength);
}
function qaT(T, R, a) {
  let e = new URL(T),
    t = R.split("?"),
    r = t[0],
    h = t[1] || "",
    i = e.pathname.replace(/\/$/, ""),
    c = r.startsWith("/") ? r : `/${r}`,
    s = (i + c).replace(/\/\//g, "/"),
    A = [];
  if (h) A.push(h);
  if (a) {
    for (let [o, n] of Object.entries(a)) if (n !== void 0) A.push(`${encodeURIComponent(o)}=${encodeURIComponent(n)}`);
  }
  let l = A.length > 0 ? `?${A.join("&")}` : "";
  return `${e.protocol}//${e.host}${s}${l}`;
}
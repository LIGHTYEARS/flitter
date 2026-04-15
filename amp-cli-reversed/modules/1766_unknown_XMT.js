function yyR(T, R, a) {
  if (!R) throw Error("client_secret_basic authentication requires a client_secret");
  let e = btoa(`${T}:${R}`);
  a.set("Authorization", `Basic ${e}`);
}
function PyR(T, R, a) {
  if (a.set("client_id", T), R) a.set("client_secret", R);
}
function kyR(T, R) {
  R.set("client_id", T);
}
async function XMT(T) {
  let R = T instanceof Response ? T.status : void 0,
    a = T instanceof Response ? await T.text() : T;
  try {
    let e = GMT.parse(JSON.parse(a)),
      {
        error: t,
        error_description: r,
        error_uri: h
      } = e;
    return new (VMT[t] || Y_)(r || "", h);
  } catch (e) {
    let t = `${R ? `HTTP ${R}: ` : ""}Invalid OAuth error response: ${e}. Raw body: ${a}`;
    return new Y_(t);
  }
}
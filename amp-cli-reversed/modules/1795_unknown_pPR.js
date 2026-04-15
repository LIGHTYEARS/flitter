async function pPR(T, R, a, e, t, r) {
  if (!ADT(e, T)) throw Error("MCP server is not allowed by MCP permissions");
  if ("url" in T) {
    let h = z$(T.url, process.env),
      i = T.headers ? Object.entries(T.headers).reduce((c, [s, A]) => ({
        ...c,
        [s]: z$(A, process.env)
      }), {}) : void 0;
    return nPR(r, new URL(h), i, R, t);
  }
  return APR(T, R, a, r);
}
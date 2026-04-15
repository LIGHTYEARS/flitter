async function SyR(T, {
  fetchFn: R = fetch,
  protocolVersion: a = $N
} = {}) {
  let e = {
      "MCP-Protocol-Version": a,
      Accept: "application/json"
    },
    t = jyR(T);
  for (let {
    url: r,
    type: h
  } of t) {
    let i = await B9T(r, e, R);
    if (!i) continue;
    if (!i.ok) {
      if (await i.body?.cancel(), i.status >= 400 && i.status < 500) continue;
      throw Error(`HTTP ${i.status} trying to load ${h === "oauth" ? "OAuth" : "OpenID provider"} metadata from ${r}`);
    }
    if (h === "oauth") return $G.parse(await i.json());else return zMT.parse(await i.json());
  }
  return;
}
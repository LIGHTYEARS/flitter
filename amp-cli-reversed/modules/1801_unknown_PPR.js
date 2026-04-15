async function PPR(T) {
  let R = Date.now(),
    a = OG.get(T);
  if (a && R - a.timestamp < 300000) return a.servers;
  let e = await yPR(T);
  return OG.set(T, {
    servers: e,
    timestamp: R
  }), e;
}
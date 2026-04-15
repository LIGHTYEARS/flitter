async function cbR(T, R, a, e, t) {
  let r = await T.get(R);
  if (!r) throw Error(`Thread not found: ${R}`);
  let h = await N3.shareThreadWithOperator({
    threadData: r,
    message: e || void 0,
    ephemeralError: t || void 0
  }, {
    config: a
  });
  if (!h.ok) throw Error(`Failed to share thread: ${h.error.message}`);
}
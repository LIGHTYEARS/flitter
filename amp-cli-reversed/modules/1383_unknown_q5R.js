async function q5R({
  toolService: T,
  providers: R,
  initialTimeout: a = 5000
}) {
  let e = ozT({
      toolService: T,
      providers: R
    }),
    t = new Map();
  return await Promise.all(R.map(async r => {
    try {
      await Promise.race([r.initialized, new Promise((h, i) => setTimeout(() => i(Error("Initial scan timeout")), a))]), J.debug(`${r.name} initial scan complete`);
    } catch (h) {
      J.warn(`${r.name} initial scan slow:`, h), t.set(r.name, h);
    }
  })), {
    registrations: e,
    initErrors: t
  };
}
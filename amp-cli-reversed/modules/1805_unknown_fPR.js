async function fPR(T, R) {
  if (!R) return {
    approved: T,
    blocked: {}
  };
  let a = Object.entries(T);
  if (a.length === 0) return {
    approved: {},
    blocked: {}
  };
  let e;
  try {
    e = await PPR(R);
  } catch (h) {
    return {
      approved: {},
      blocked: T,
      error: h instanceof Error ? h : Error(String(h))
    };
  }
  let t = {},
    r = {};
  for (let [h, i] of a) if (xPR(i, e)) t[h] = i;else r[h] = i;
  return {
    approved: t,
    blocked: r
  };
}
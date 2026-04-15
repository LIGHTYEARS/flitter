async function BKT(T, R, a) {
  if (R.length === 0) return [];
  let e = await N3.addThreadLabels({
    thread: T,
    labels: R
  }, {
    config: a
  });
  if (!e.ok) throw new GR(jl0(T, e.error));
  return e.result.map(t => t.name);
}
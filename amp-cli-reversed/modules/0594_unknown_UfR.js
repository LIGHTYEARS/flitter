function UfR(T, R, a) {
  if (!T.meta) T.meta = {};
  if (!T.meta.traces) T.meta.traces = [];
  let e = T.meta.traces.find(r => r.id === R.id),
    t = R.endTime ?? a.toISOString();
  if (e) {
    if (e.endTime === void 0) e.endTime = t;
  }
}
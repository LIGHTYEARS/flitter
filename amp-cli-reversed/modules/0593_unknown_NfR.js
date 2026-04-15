function NfR(T, R) {
  if (!T.meta) T.meta = {};
  if (!T.meta.traces) T.meta.traces = [];
  let a = T.meta.traces.find(e => e.id === R.id);
  if (a) {
    if (a.startTime === void 0) a.startTime = R.startTime;
    return;
  }
  T.meta.traces.push(O8({
    ...R
  }));
}
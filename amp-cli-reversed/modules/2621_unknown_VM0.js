function VM0(T, R) {
  let a = new Set(),
    e = [];
  for (let t of T) {
    if (R.has(t.clientMessageID)) {
      a.add(t.clientMessageID);
      continue;
    }
    e.push(t);
  }
  return {
    unmatchedPendingSubmits: e,
    acknowledgedByID: a
  };
}
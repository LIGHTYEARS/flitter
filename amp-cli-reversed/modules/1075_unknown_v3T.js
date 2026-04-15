function v3T(T) {
  let R = ["unauthorized", "401"],
    a = R.some(t => T.message?.toLowerCase().includes(t.toLowerCase())),
    e = Boolean(T.error?.message && R.some(t => T.error?.message?.toLowerCase().includes(t.toLowerCase())));
  return a || e;
}
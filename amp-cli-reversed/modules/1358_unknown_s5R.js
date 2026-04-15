function s5R(T) {
  if (T.length === 0) return null;
  let R = [];
  for (let {
    result: e
  } of T) if (e.status === "error") R.push(String(e.error));
  if (R.length !== T.length) return null;
  let a = R[0];
  if (R.every(e => e === a)) return a ?? null;
  return null;
}
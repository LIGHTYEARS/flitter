function LlR(T, R) {
  return {
    added: T.added + R.added,
    deleted: T.deleted + R.deleted,
    changed: T.changed + R.changed
  };
}
function OET(T) {
  return T.reduce((R, a) => LlR(R, a), {
    added: 0,
    deleted: 0,
    changed: 0
  });
}
function kx(T, R) {
  let a = {
    added: 0,
    deleted: 0,
    changed: 0
  };
  if (typeof T !== "string" || typeof R !== "string") return a;
  if (T === R) return a;
  try {
    let e = {
      added: 0,
      deleted: 0,
      changed: 0
    };
    for (let [t, r, h, i] of EET.diff(T.split(`
`), R.split(`
`))) e.deleted += r - t, e.added += i - h, e.changed += Math.min(r - t, i - h);
    return e;
  } catch {
    return a;
  }
}
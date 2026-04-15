function ziT(T, R) {
  if (T < 0) return 0;
  return Math.min(T, R);
}
function FiT(T, R) {
  let a = 0,
    e = 0,
    t = Math.min(R, T.length);
  for (let r = 0; r < t; r += 1) if (T[r] === 10) a += 1, e = r + 1;
  return {
    line: a,
    character: R - e
  };
}
function zAR(T, R) {
  let a = R,
    e = R;
  while (a > 0 && T[a - 1] !== 10) a -= 1;
  while (e < T.length && T[e] !== 10) e += 1;
  return T.slice(a, e).toString("utf-8");
}
async function ICT(T) {
  return (await w0T(T, `select workspace_id, paths, timestamp from workspaces order by timestamp desc limit ${JAR}`)).map(R => {
    let [a, e = "", t = ""] = R.split(q0T),
      r = Number.parseInt(a ?? "", 10);
    if (!Number.isFinite(r)) return null;
    return {
      workspaceId: r,
      paths: e,
      lastOpenedAt: t
    };
  }).filter(R => R !== null);
}
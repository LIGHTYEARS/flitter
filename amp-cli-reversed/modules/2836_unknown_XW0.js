function XW0(T, R) {
  let a = [];
  if (R?.objective) a.push(`Objective: ${R.objective}`);
  if (T.status === "done" && typeof T.result === "string") a.push(T.result.trim());
  let e = p9R(T);
  if (e) a.push(e);
  return ihT(a);
}
function QW0(T, R) {
  let a = [];
  if (R?.goal) a.push(`Goal: ${R.goal}`);
  if (T.status === "done" && typeof T.result === "string") a.push(T.result.trim());
  let e = p9R(T);
  if (e) a.push(e);
  return ihT(a);
}
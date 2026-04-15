function I_0(T, R) {
  let a = [];
  if (T) {
    for (let e of Object.keys(R)) if (T[e] !== R[e]) a.push(e);
    for (let e of Object.keys(T)) if (!(e in R) && !a.includes(e)) a.push(e);
  } else a.push(...Object.keys(R));
  return a;
}
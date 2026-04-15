function YvT(T) {
  let R = [],
    a = T.map(e => typeof e === "object" ? e.key : e);
  for (let e of a) if (typeof e === "number") R.push(`[${e}]`);else if (typeof e === "symbol") R.push(`[${JSON.stringify(String(e))}]`);else if (/[^\w$]/.test(e)) R.push(`[${JSON.stringify(e)}]`);else {
    if (R.length) R.push(".");
    R.push(e);
  }
  return R.join("");
}
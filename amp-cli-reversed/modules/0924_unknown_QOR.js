function QOR(T) {
  let R = [];
  for (let a in T) if (Object.prototype.hasOwnProperty.call(T, a)) {
    let e = T[a];
    if (typeof e === "object" && e != null && Object.keys(e).length > 0) {
      let t = Object.keys(e).map(r => `${a}.${r}`);
      R.push(...t);
    } else R.push(a);
  }
  return R.join(",");
}
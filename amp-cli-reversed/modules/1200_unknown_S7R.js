function S7R(T, R, a) {
  if (!O7R(R)) return [`${a}type ${T} = () => any;`];
  let e = Tb(R);
  if (e.length === 1) return [`${a}type ${T} = (_: ${e[0]}) => any;`];
  let t = [`${a}type ${T} = (_: ${e[0]}`];
  for (let r = 1; r < e.length; r += 1) if (r === e.length - 1) t.push(`${a}${e[r]}) => any;`);else t.push(`${a}${e[r]}`);
  return t;
}
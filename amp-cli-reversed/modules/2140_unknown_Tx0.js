function RfT(T, R) {
  if (T.length === 0) return "";
  let a = T.map(t => [Jk0(t), t.description]),
    e = oR.bold(R) + `

`;
  return e += AtT(a), e += `
`, e;
}
function Jk0(T) {
  let R = `--${T.long}`;
  if (T.type === "boolean") return T.short ? `-${T.short}, ${R}` : R;
  return T.short ? `-${T.short}, ${R} <value>` : `${R} <value>`;
}
function Tx0(T) {
  let R = j1T(T).map(({
    command: a,
    level: e
  }) => {
    let t = "  ".repeat(e),
      r = a.alias ? `[alias: ${a.alias}] ` : "";
    return [t + a.name, r + (a.description ?? "")];
  });
  return ltT(R);
}
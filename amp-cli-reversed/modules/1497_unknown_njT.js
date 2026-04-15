function ojT(T) {
  return new RegExp(`^${sjT(T)}$`);
}
function njT(T) {
  let R = sjT({
      precision: T.precision
    }),
    a = ["Z"];
  if (T.local) a.push("");
  if (T.offset) a.push("([+-](?:[01]\\d|2[0-3]):[0-5]\\d)");
  let e = `${R}(?:${a.join("|")})`;
  return new RegExp(`^${fjT}T(?:${e})$`);
}
async function B0T() {
  let T = ZAR(),
    R = Rn.join(T, "db");
  if (!(await GiT(R))) return [];
  let a = (await lN.promises.readdir(R, {
    withFileTypes: !0
  })).filter(e => e.isDirectory()).map(e => Rn.join(R, e.name, "db.sqlite"));
  return (await Promise.all(a.map(async e => (await GiT(e)) ? e : null))).filter(e => e !== null);
}
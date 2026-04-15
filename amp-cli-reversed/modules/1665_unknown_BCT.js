function BCT() {
  if (!Sj.existsSync(uL)) return [];
  let T = [];
  for (let R of Sj.readdirSync(uL, {
    withFileTypes: !0
  })) if (R.isFile() && R.name.endsWith(".json")) {
    let a = DCT.join(uL, R.name);
    T.push(a);
  }
  return T;
}
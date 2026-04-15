function tx0(T, R, a, e, t) {
  let r = {},
    h = [],
    i,
    c = [];
  for (let s of T) r[s.long] = s.default;
  for (let s = 0; s < R.length; s++) {
    let A = R[s];
    if (A === "--help" || A === "-h") hx0(a, e, t), process.exit(0);
    if (A === "--") {
      h.push(...R.slice(s + 1));
      break;
    }
    let l = ex0(T, A);
    if (l) {
      if (l.type === "boolean") r[l.long] = !0;else {
        let o = R[++s];
        if (o === void 0) throw new Gw(`Option ${A} requires a value`);
        r[l.long] = l.type === "number" ? Number(o) : o;
      }
      continue;
    }
    if (A.startsWith("-")) throw new Gw(`Unknown option: ${A}`);
    if (NtT(a.subcommands, A)) {
      i = A, c = R.slice(s + 1);
      break;
    }
    h.push(A);
  }
  return {
    options: r,
    positionalValues: h,
    subcommandName: i,
    subcommandArgv: c
  };
}
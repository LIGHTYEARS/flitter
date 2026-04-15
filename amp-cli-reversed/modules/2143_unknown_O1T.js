function NtT(T, R) {
  return T?.find(a => a.name === R || a.alias === R);
}
function O1T(T, R, a, e) {
  let {
      options: t,
      positionalValues: r,
      subcommandName: h,
      subcommandArgv: i
    } = tx0(T.options, R, T, a, e),
    c = rx0(T.positionals, r),
    s;
  if (h) {
    let A = NtT(T.subcommands, h),
      l = O1T(A, i, `${a} ${A.name}`, e);
    s = {
      name: A.name,
      options: l.options,
      positionals: l.positionals,
      subcommand: l.subcommand
    };
  }
  return {
    options: t,
    positionals: c,
    subcommand: s
  };
}
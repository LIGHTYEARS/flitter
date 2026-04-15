function Rx0(T) {
  return T;
}
async function ax0(T, R = process.argv.slice(2)) {
  let a = O1T(T, R, T.name, T);
  await S1T(a, T, a.options);
}
async function S1T(T, R, a) {
  if (T.subcommand) {
    let e = NtT(R.subcommands, T.subcommand.name);
    if (await S1T(T.subcommand, e, a)) return !0;
  }
  if (R.action) return await R.action({
    options: T.options,
    positionals: T.positionals,
    globalOptions: a
  }), !0;
  return !1;
}
async function NC0(T) {
  let R = T.builtinOnly ? PN : (await T.settings.get("permissions", T.scope)) ?? [];
  if (T.json) T.stdout.write(JSON.stringify(R, null, 2));else {
    let a = J2(R);
    T.stdout.write(a), T.stdout.write(`
`);
  }
  T.exit(0);
}
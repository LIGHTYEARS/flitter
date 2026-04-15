async function md0(T, R) {
  let a = await DQT(R);
  if (!a.success) {
    T.stdout.write(a.contentWithErrors), T.exit(2);
    return;
  }
  await T.settings.set("permissions", a.entries, T.scope), T.exit(0);
}
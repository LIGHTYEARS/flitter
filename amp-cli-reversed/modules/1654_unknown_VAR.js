async function VAR(T) {
  let R = (await $CT()).find(e => e.pid === T && vCT(e.command));
  if (!R) return mL();
  let a = H0T(R.command);
  if (!a) return mL();
  return (await B0T()).find(e => U0T(e) === a) ?? mL();
}
async function NA(T, R) {
  let a = await R.threadService.get(T);
  if (!a) Be.write(`Thread ${T} does not exist.
`), process.exit(1);
  return a;
}
async function dS(T, R) {
  let a = await T.getPrimitiveProperty(R, "v");
  if (a === null) throw Error(`Thread ${R} not found`);
  await T.flushVersion(R, a);
}
async function n$T(T, R = "interactive") {
  if (T) return mr(T) ?? Zi(T);
  let a = await PrT(),
    e = P40(a, R) ?? null;
  if (!e) throw new GR("No thread ID provided and no previously used thread found.", 1, "Provide a thread ID as an argument or run a thread first.");
  if (!Vt(e)) throw new GR(V3.invalidThreadId);
  return e;
}
async function wC0(T, R, a) {
  let e = mLT(T);
  if (!e.success) throw Error(`Invalid permission format: ${e.error.message}`);
  if (e.data.length === 0) throw Error("No permission entry provided");
  let t = fj(e.data);
  if (!t.success) {
    let i = t.error.issues.map(c => c.message).join(", ");
    throw Error(`Invalid permission entry: ${i}`);
  }
  let r = (await R.get("permissions", a)) ?? [],
    h = [e.data[0], ...r];
  await R.set("permissions", h, a);
}
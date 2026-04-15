async function P_0(T) {
  let R = await yl.open(T, "r");
  try {
    await R.sync();
  } catch (a) {
    if (a.code === "EPERM" || a.code === "EINVAL") ;else throw a;
  } finally {
    await R.close();
  }
}
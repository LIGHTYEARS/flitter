function xyR(T) {
  if (!T) return !1;
  try {
    let R = new URL(T);
    return R.protocol === "https:" && R.pathname !== "/";
  } catch {
    return !1;
  }
}
async function fyR(T, R, a) {
  let e = AyR(T);
  if (R.validateResourceURL) return await R.validateResourceURL(e, a?.resource);
  if (!a) return;
  if (!pyR({
    requestedResource: e,
    configuredResource: a.resource
  })) throw Error(`Protected resource ${a.resource} does not match expected ${e} (or origin)`);
  return new URL(a.resource);
}
async function A5(T) {
  if (T[Et].disturbed) throw TypeError(`body used already for: ${T.url}`);
  if (T[Et].disturbed = !0, T[Et].error) throw T[Et].error;
  let {
    body: R
  } = T;
  if (R === null) return ri.alloc(0);
  if (!(R instanceof Xl)) return ri.alloc(0);
  let a = [],
    e = 0;
  try {
    for await (let t of R) {
      if (T.size > 0 && e + t.length > T.size) {
        let r = new li(`content size at ${T.url} over limit: ${T.size}`, "max-size");
        throw R.destroy(r), r;
      }
      e += t.length, a.push(t);
    }
  } catch (t) {
    throw t instanceof IO ? t : new li(`Invalid response body while trying to fetch ${T.url}: ${t.message}`, "system", t);
  }
  if (R.readableEnded === !0 || R._readableState.ended === !0) try {
    if (a.every(t => typeof t === "string")) return ri.from(a.join(""));
    return ri.concat(a, e);
  } catch (t) {
    throw new li(`Could not create Buffer from response body for ${T.url}: ${t.message}`, "system", t);
  } else throw new li(`Premature close of server response while trying to fetch ${T.url}`);
}
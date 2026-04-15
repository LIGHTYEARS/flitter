function s4() {
  try {
    let T = r8();
    if (Oa) {
      if (CR >= Oa.postBundlePosition) {
        let R = Error("Unexpected bundle position");
        throw R.incomplete = !0, R;
      }
      CR = Oa.postBundlePosition, Oa = null;
    }
    if (CR == _A) {
      if (ia = null, L0 = null, hi) hi = null;
    } else if (CR > _A) {
      let R = Error("Unexpected end of CBOR data");
      throw R.incomplete = !0, R;
    } else if (!iS) throw Error("Data read, but end of buffer not reached");
    return T;
  } catch (T) {
    if (r1(), T instanceof RangeError || T.message.startsWith("Unexpected end of buffer")) T.incomplete = !0;
    throw T;
  }
}
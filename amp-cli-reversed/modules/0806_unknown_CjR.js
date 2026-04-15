function CjR(T, R, a) {
  let e = {},
    t = H(T, ["systemInstruction"]);
  if (R !== void 0 && t != null) Y(R, ["systemInstruction"], it(t));
  let r = H(T, ["tools"]);
  if (R !== void 0 && r != null) {
    let i = r;
    if (Array.isArray(i)) i = i.map(c => {
      return n6T(c);
    });
    Y(R, ["tools"], i);
  }
  let h = H(T, ["generationConfig"]);
  if (R !== void 0 && h != null) Y(R, ["generationConfig"], ISR(h));
  return e;
}
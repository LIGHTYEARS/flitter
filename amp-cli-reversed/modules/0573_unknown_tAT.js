function owT(T) {
  return T?.output_config?.format;
}
function tAT(T, R, a) {
  let e = owT(R);
  if (!R || !("parse" in (e ?? {}))) return {
    ...T,
    content: T.content.map(t => {
      if (t.type === "text") return Object.defineProperty({
        ...t
      }, "parsed_output", {
        value: null,
        enumerable: !1
      });
      return t;
    }),
    parsed_output: null
  };
  return nwT(T, R, a);
}
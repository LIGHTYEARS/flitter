function J7T(T, R) {
  let a = Z7T(T, R);
  if (a.length === 0) return {};
  return {
    "x-stainless-helper": a.join(", ")
  };
}
function efR(T) {
  if (BL(T)) return {
    "x-stainless-helper": T[dP]
  };
  return {};
}
function TwT(T) {
  return T.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent);
}
function awT(T) {
  return T?.output_format ?? T?.output_config?.format;
}
function qlT(T, R, a) {
  let e = awT(R);
  if (!R || !("parse" in (e ?? {}))) return {
    ...T,
    content: T.content.map(t => {
      if (t.type === "text") {
        let r = Object.defineProperty({
          ...t
        }, "parsed_output", {
          value: null,
          enumerable: !1
        });
        return Object.defineProperty(r, "parsed", {
          get() {
            return a.logger.warn("The `parsed` property on `text` blocks is deprecated, please use `parsed_output` instead."), null;
          },
          enumerable: !1
        });
      }
      return t;
    }),
    parsed_output: null
  };
  return ewT(T, R, a);
}
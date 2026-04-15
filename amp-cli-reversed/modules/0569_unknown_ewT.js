function ewT(T, R, a) {
  let e = null,
    t = T.content.map(r => {
      if (r.type === "text") {
        let h = rfR(R, r.text);
        if (e === null) e = h;
        let i = Object.defineProperty({
          ...r
        }, "parsed_output", {
          value: h,
          enumerable: !1
        });
        return Object.defineProperty(i, "parsed", {
          get() {
            return a.logger.warn("The `parsed` property on `text` blocks is deprecated, please use `parsed_output` instead."), h;
          },
          enumerable: !1
        });
      }
      return r;
    });
  return {
    ...T,
    content: t,
    parsed_output: e
  };
}
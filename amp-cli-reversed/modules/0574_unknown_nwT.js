function nwT(T, R, a) {
  let e = null,
    t = T.content.map(r => {
      if (r.type === "text") {
        let h = AfR(R, r.text);
        if (e === null) e = h;
        return Object.defineProperty({
          ...r
        }, "parsed_output", {
          value: h,
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
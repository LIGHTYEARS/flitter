function eUT(T, R) {
  let a = T.output.map(t => {
      if (t.type === "function_call") return {
        ...t,
        parsed_arguments: LCR(R, t)
      };
      if (t.type === "message") {
        let r = t.content.map(h => {
          if (h.type === "output_text") return {
            ...h,
            parsed: OCR(R, h.text)
          };
          return h;
        });
        return {
          ...t,
          content: r
        };
      }
      return t;
    }),
    e = Object.assign({}, T, {
      output: a
    });
  if (!Object.getOwnPropertyDescriptor(T, "output_text")) BV(e);
  return Object.defineProperty(e, "output_parsed", {
    enumerable: !0,
    get() {
      for (let t of e.output) {
        if (t.type !== "message") continue;
        for (let r of t.content) if (r.type === "output_text" && r.parsed !== null) return r.parsed;
      }
      return null;
    }
  }), e;
}
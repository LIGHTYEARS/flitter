function kgR(T, R) {
  let a = bC.from(`0\r
\r
`),
    e = !1,
    t = !1,
    r;
  T.on("response", h => {
    let {
      headers: i
    } = h;
    e = i["transfer-encoding"] === "chunked" && !i["content-length"];
  }), T.on("socket", h => {
    let i = () => {
        if (e && !t) {
          let s = Error("Premature close");
          s.code = "ERR_STREAM_PREMATURE_CLOSE", R(s);
        }
      },
      c = s => {
        if (t = bC.compare(s.slice(-5), a) === 0, !t && r) t = bC.compare(r.slice(-3), a.slice(0, 3)) === 0 && bC.compare(s.slice(-2), a.slice(3)) === 0;
        r = s;
      };
    h.prependListener("close", i), h.on("data", c), T.on("close", () => {
      h.removeListener("close", i), h.removeListener("data", c);
    });
  });
}
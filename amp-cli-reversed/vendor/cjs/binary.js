// Module: binary
// Original: MDT
// Type: CJS (RT wrapper)
// Exports: binary
// Category: util

// Module: MDT (CJS)
(T) => {
  var R = qT("buffer"),
    a = Qa(),
    e = DN(),
    t = {
      identify: (r) => r instanceof Uint8Array,
      default: !1,
      tag: "tag:yaml.org,2002:binary",
      resolve(r, h) {
        if (typeof R.Buffer === "function") return R.Buffer.from(r, "base64");
        else if (typeof atob === "function") {
          let i = atob(r.replace(/[\n\r]/g, "")),
            c = new Uint8Array(i.length);
          for (let s = 0; s < i.length; ++s) c[s] = i.charCodeAt(s);
          return c;
        } else
          return (
            h(
              "This environment does not support reading binary tags; either Buffer or atob is required",
            ),
            r
          );
      },
      stringify({ comment: r, type: h, value: i }, c, s, A) {
        if (!i) return "";
        let l = i,
          o;
        if (typeof R.Buffer === "function")
          o =
            l instanceof R.Buffer
              ? l.toString("base64")
              : R.Buffer.from(l.buffer).toString("base64");
        else if (typeof btoa === "function") {
          let n = "";
          for (let p = 0; p < l.length; ++p) n += String.fromCharCode(l[p]);
          o = btoa(n);
        } else
          throw Error(
            "This environment does not support writing binary tags; either Buffer or btoa is required",
          );
        if ((h ?? (h = a.Scalar.BLOCK_LITERAL), h !== a.Scalar.QUOTE_DOUBLE)) {
          let n = Math.max(
              c.options.lineWidth - c.indent.length,
              c.options.minContentWidth,
            ),
            p = Math.ceil(o.length / n),
            _ = Array(p);
          for (let m = 0, b = 0; m < p; ++m, b += n) _[m] = o.substr(b, n);
          o = _.join(
            h === a.Scalar.BLOCK_LITERAL
              ? `
`
              : " ",
          );
        }
        return e.stringifyString({ comment: r, type: h, value: o }, c, s, A);
      },
    };
  T.binary = t;
};

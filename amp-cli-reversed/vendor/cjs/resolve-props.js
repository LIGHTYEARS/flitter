// Module: resolve-props
// Original: HN
// Type: CJS (RT wrapper)
// Exports: resolveProps
// Category: util

// Module: HN (CJS)
(T) => {
  function R(
    a,
    {
      flow: e,
      indicator: t,
      next: r,
      offset: h,
      onError: i,
      parentIndent: c,
      startOnNewline: s,
    },
  ) {
    let A = !1,
      l = s,
      o = s,
      n = "",
      p = "",
      _ = !1,
      m = !1,
      b = null,
      y = null,
      u = null,
      P = null,
      k = null,
      x = null,
      f = null;
    for (let I of a) {
      if (m) {
        if (I.type !== "space" && I.type !== "newline" && I.type !== "comma")
          i(
            I.offset,
            "MISSING_CHAR",
            "Tags and anchors must be separated from the next token by white space",
          );
        m = !1;
      }
      if (b) {
        if (l && I.type !== "comment" && I.type !== "newline")
          i(b, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
        b = null;
      }
      switch (I.type) {
        case "space":
          if (
            !e &&
            (t !== "doc-start" || r?.type !== "flow-collection") &&
            I.source.includes("\t")
          )
            b = I;
          o = !0;
          break;
        case "comment": {
          if (!o)
            i(
              I,
              "MISSING_CHAR",
              "Comments must be separated from other tokens by white space characters",
            );
          let S = I.source.substring(1) || " ";
          if (!n) n = S;
          else n += p + S;
          ((p = ""), (l = !1));
          break;
        }
        case "newline":
          if (l) {
            if (n) n += I.source;
            else if (!x || t !== "seq-item-ind") A = !0;
          } else p += I.source;
          if (((l = !0), (_ = !0), y || u)) P = I;
          o = !0;
          break;
        case "anchor":
          if (y) i(I, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
          if (I.source.endsWith(":"))
            i(
              I.offset + I.source.length - 1,
              "BAD_ALIAS",
              "Anchor ending in : is ambiguous",
              !0,
            );
          ((y = I), f ?? (f = I.offset), (l = !1), (o = !1), (m = !0));
          break;
        case "tag": {
          if (u) i(I, "MULTIPLE_TAGS", "A node can have at most one tag");
          ((u = I), f ?? (f = I.offset), (l = !1), (o = !1), (m = !0));
          break;
        }
        case t:
          if (y || u)
            i(
              I,
              "BAD_PROP_ORDER",
              `Anchors and tags must be after the ${I.source} indicator`,
            );
          if (x)
            i(
              I,
              "UNEXPECTED_TOKEN",
              `Unexpected ${I.source} in ${e ?? "collection"}`,
            );
          ((x = I),
            (l = t === "seq-item-ind" || t === "explicit-key-ind"),
            (o = !1));
          break;
        case "comma":
          if (e) {
            if (k) i(I, "UNEXPECTED_TOKEN", `Unexpected , in ${e}`);
            ((k = I), (l = !1), (o = !1));
            break;
          }
        default:
          (i(I, "UNEXPECTED_TOKEN", `Unexpected ${I.type} token`),
            (l = !1),
            (o = !1));
      }
    }
    let v = a[a.length - 1],
      g = v ? v.offset + v.source.length : h;
    if (
      m &&
      r &&
      r.type !== "space" &&
      r.type !== "newline" &&
      r.type !== "comma" &&
      (r.type !== "scalar" || r.source !== "")
    )
      i(
        r.offset,
        "MISSING_CHAR",
        "Tags and anchors must be separated from the next token by white space",
      );
    if (
      b &&
      ((l && b.indent <= c) ||
        r?.type === "block-map" ||
        r?.type === "block-seq")
    )
      i(b, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
    return {
      comma: k,
      found: x,
      spaceBefore: A,
      comment: n,
      hasNewline: _,
      anchor: y,
      tag: u,
      newlineAfterProp: P,
      end: g,
      start: f ?? g,
    };
  }
  T.resolveProps = R;
};

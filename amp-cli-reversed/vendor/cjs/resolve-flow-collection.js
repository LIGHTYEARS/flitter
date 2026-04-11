// Module: resolve-flow-collection
// Original: VPR
// Type: CJS (RT wrapper)
// Exports: resolveFlowCollection
// Category: util

// Module: VPR (CJS)
(T) => {
  var R = x8(),
    a = Pm(),
    e = km(),
    t = xm(),
    r = pO(),
    h = HN(),
    i = K9T(),
    c = HDT(),
    s = "Block collections are not allowed within flow collections",
    A = (o) => o && (o.type === "block-map" || o.type === "block-seq");
  function l({ composeNode: o, composeEmptyNode: n }, p, _, m, b) {
    let y = _.start.source === "{",
      u = y ? "flow map" : "flow sequence",
      P = new (b?.nodeClass ?? (y ? e.YAMLMap : t.YAMLSeq))(p.schema);
    P.flow = !0;
    let k = p.atRoot;
    if (k) p.atRoot = !1;
    if (p.atKey) p.atKey = !1;
    let x = _.offset + _.start.source.length;
    for (let S = 0; S < _.items.length; ++S) {
      let O = _.items[S],
        { start: j, key: d, sep: C, value: L } = O,
        w = h.resolveProps(j, {
          flow: u,
          indicator: "explicit-key-ind",
          next: d ?? C?.[0],
          offset: x,
          onError: m,
          parentIndent: _.indent,
          startOnNewline: !1,
        });
      if (!w.found) {
        if (!w.anchor && !w.tag && !C && !L) {
          if (S === 0 && w.comma)
            m(w.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${u}`);
          else if (S < _.items.length - 1)
            m(w.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${u}`);
          if (w.comment)
            if (P.comment)
              P.comment +=
                `
` + w.comment;
            else P.comment = w.comment;
          x = w.end;
          continue;
        }
        if (!y && p.options.strict && i.containsNewline(d))
          m(
            d,
            "MULTILINE_IMPLICIT_KEY",
            "Implicit keys of flow sequence pairs need to be on a single line",
          );
      }
      if (S === 0) {
        if (w.comma) m(w.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${u}`);
      } else {
        if (!w.comma)
          m(w.start, "MISSING_CHAR", `Missing , between ${u} items`);
        if (w.comment) {
          let D = "";
          T: for (let B of j)
            switch (B.type) {
              case "comma":
              case "space":
                break;
              case "comment":
                D = B.source.substring(1);
                break T;
              default:
                break T;
            }
          if (D) {
            let B = P.items[P.items.length - 1];
            if (R.isPair(B)) B = B.value ?? B.key;
            if (B.comment)
              B.comment +=
                `
` + D;
            else B.comment = D;
            w.comment = w.comment.substring(D.length + 1);
          }
        }
      }
      if (!y && !C && !w.found) {
        let D = L ? o(p, L, w, m) : n(p, w.end, C, null, w, m);
        if ((P.items.push(D), (x = D.range[2]), A(L)))
          m(D.range, "BLOCK_IN_FLOW", s);
      } else {
        p.atKey = !0;
        let D = w.end,
          B = d ? o(p, d, w, m) : n(p, D, j, null, w, m);
        if (A(d)) m(B.range, "BLOCK_IN_FLOW", s);
        p.atKey = !1;
        let M = h.resolveProps(C ?? [], {
          flow: u,
          indicator: "map-value-ind",
          next: L,
          offset: B.range[2],
          onError: m,
          parentIndent: _.indent,
          startOnNewline: !1,
        });
        if (M.found) {
          if (!y && !w.found && p.options.strict) {
            if (C)
              for (let W of C) {
                if (W === M.found) break;
                if (W.type === "newline") {
                  m(
                    W,
                    "MULTILINE_IMPLICIT_KEY",
                    "Implicit keys of flow sequence pairs need to be on a single line",
                  );
                  break;
                }
              }
            if (w.start < M.found.offset - 1024)
              m(
                M.found,
                "KEY_OVER_1024_CHARS",
                "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key",
              );
          }
        } else if (L)
          if ("source" in L && L.source?.[0] === ":")
            m(L, "MISSING_CHAR", `Missing space after : in ${u}`);
          else m(M.start, "MISSING_CHAR", `Missing , or : between ${u} items`);
        let V = L ? o(p, L, M, m) : M.found ? n(p, M.end, C, null, M, m) : null;
        if (V) {
          if (A(L)) m(V.range, "BLOCK_IN_FLOW", s);
        } else if (M.comment)
          if (B.comment)
            B.comment +=
              `
` + M.comment;
          else B.comment = M.comment;
        let Q = new a.Pair(B, V);
        if (p.options.keepSourceTokens) Q.srcToken = O;
        if (y) {
          let W = P;
          if (c.mapIncludes(p, W.items, B))
            m(D, "DUPLICATE_KEY", "Map keys must be unique");
          W.items.push(Q);
        } else {
          let W = new e.YAMLMap(p.schema);
          ((W.flow = !0), W.items.push(Q));
          let eT = (V ?? B).range;
          ((W.range = [B.range[0], eT[1], eT[2]]), P.items.push(W));
        }
        x = V ? V.range[2] : M.end;
      }
    }
    let f = y ? "}" : "]",
      [v, ...g] = _.end,
      I = x;
    if (v?.source === f) I = v.offset + v.source.length;
    else {
      let S = u[0].toUpperCase() + u.substring(1),
        O = k
          ? `${S} must end with a ${f}`
          : `${S} in block collection must be sufficiently indented and end with a ${f}`;
      if (
        (m(x, k ? "MISSING_CHAR" : "BAD_INDENT", O), v && v.source.length !== 1)
      )
        g.unshift(v);
    }
    if (g.length > 0) {
      let S = r.resolveEnd(g, I, p.options.strict, m);
      if (S.comment)
        if (P.comment)
          P.comment +=
            `
` + S.comment;
        else P.comment = S.comment;
      P.range = [_.offset, I, S.offset];
    } else P.range = [_.offset, I, I];
    return P;
  }
  T.resolveFlowCollection = l;
};

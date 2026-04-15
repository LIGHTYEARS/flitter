function OF(T, R) {
  if (T && T.includes(os.sep)) throw Error("`" + R + "` cannot be a path: did not expect `" + os.sep + "`");
}
function dF(T, R) {
  if (!T) throw Error("`" + R + "` cannot be empty");
}
function EfT(T, R) {
  if (!T) throw Error("Setting `" + R + "` requires `path` to be set too");
}
function Hg0(T) {
  return Boolean(T && typeof T === "object" && "byteLength" in T && "byteOffset" in T);
}
function Xg0(T, R) {
  let a = R || Vg0,
    e = a.onerror,
    t = T instanceof Jw ? T : new Jw(T),
    r = a.fragment ? Bg0 : wg0,
    h = String(t),
    i = r(h, {
      sourceCodeLocationInfo: !0,
      onParseError: a.onerror ? c : null,
      scriptingEnabled: !1
    });
  return of0(i, {
    file: t,
    space: a.space,
    verbose: a.verbose
  });
  function c(s) {
    let A = s.code,
      l = Yg0(A),
      o = a[l],
      n = o === null || o === void 0 ? !0 : o,
      p = typeof n === "number" ? n : n ? 1 : 0;
    if (p) {
      let m = Wg0[l];
      Ue(m, "expected known error from `parse5`");
      let b = new mt(_(m.reason), {
        place: {
          start: {
            line: s.startLine,
            column: s.startCol,
            offset: s.startOffset
          },
          end: {
            line: s.endLine,
            column: s.endCol,
            offset: s.endOffset
          }
        },
        ruleId: A,
        source: "hast-util-from-html"
      });
      if (t.path) b.file = t.path, b.name = t.path + ":" + b.name;
      b.fatal = Kg0[p], b.note = _(m.description), b.url = m.url === !1 ? void 0 : qg0 + A, Ue(e, "`internalOnerror` is not passed if `onerror` is not set"), e(b);
    }
    function _(m) {
      return m.replace(Fg0, b).replace(Gg0, y);
      function b(u, P, k) {
        let x = (k ? Number.parseInt(k, 10) : 0) * (P === "-" ? -1 : 1),
          f = h.charAt(s.startOffset + x);
        return Zg0(f);
      }
      function y() {
        return Jg0(h.charCodeAt(s.startOffset));
      }
    }
  }
}
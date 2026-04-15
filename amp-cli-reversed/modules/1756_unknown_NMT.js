function $q(T) {}
function NMT(T) {
  if (typeof T == "function") throw TypeError("`callbacks` must be an object, got a function instead. Did you mean `{onEvent: fn}`?");
  let {
      onEvent: R = $q,
      onError: a = $q,
      onRetry: e = $q,
      onComment: t
    } = T,
    r = "",
    h = !0,
    i,
    c = "",
    s = "";
  function A(_) {
    let m = h ? _.replace(/^\xEF\xBB\xBF/, "") : _,
      [b, y] = RyR(`${r}${m}`);
    for (let u of b) l(u);
    r = y, h = !1;
  }
  function l(_) {
    if (_ === "") {
      n();
      return;
    }
    if (_.startsWith(":")) {
      t && t(_.slice(_.startsWith(": ") ? 2 : 1));
      return;
    }
    let m = _.indexOf(":");
    if (m !== -1) {
      let b = _.slice(0, m),
        y = _[m + 1] === " " ? 2 : 1,
        u = _.slice(m + y);
      o(b, u, _);
      return;
    }
    o(_, "", _);
  }
  function o(_, m, b) {
    switch (_) {
      case "event":
        s = m;
        break;
      case "data":
        c = `${c}${m}
`;
        break;
      case "id":
        i = m.includes("\x00") ? void 0 : m;
        break;
      case "retry":
        /^\d+$/.test(m) ? e(parseInt(m, 10)) : a(new IG(`Invalid \`retry\` value: "${m}"`, {
          type: "invalid-retry",
          value: m,
          line: b
        }));
        break;
      default:
        a(new IG(`Unknown field "${_.length > 20 ? `${_.slice(0, 20)}\u2026` : _}"`, {
          type: "unknown-field",
          field: _,
          value: m,
          line: b
        }));
        break;
    }
  }
  function n() {
    c.length > 0 && R({
      id: i,
      event: s || void 0,
      data: c.endsWith(`
`) ? c.slice(0, -1) : c
    }), i = void 0, c = "", s = "";
  }
  function p(_ = {}) {
    r && _.consume && l(r), h = !0, i = void 0, c = "", s = "", r = "";
  }
  return {
    feed: A,
    reset: p
  };
}
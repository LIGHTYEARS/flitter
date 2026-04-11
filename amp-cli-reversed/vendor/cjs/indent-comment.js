// Module: indent-comment
// Original: MN
// Type: CJS (RT wrapper)
// Exports: indentComment, lineComment, stringifyComment
// Category: util

// Module: mN (CJS)
(T) => {
  var {
    REGEX_BACKSLASH: R,
    REGEX_REMOVE_BACKSLASH: a,
    REGEX_SPECIAL_CHARS: e,
    REGEX_SPECIAL_CHARS_GLOBAL: t,
  } = bN();
  ((T.isObject = (r) =>
    r !== null && typeof r === "object" && !Array.isArray(r)),
    (T.hasRegexChars = (r) => e.test(r)),
    (T.isRegexChar = (r) => r.length === 1 && T.hasRegexChars(r)),
    (T.escapeRegex = (r) => r.replace(t, "\\$1")),
    (T.toPosixSlashes = (r) => r.replace(R, "/")),
    (T.isWindows = () => {
      if (typeof navigator < "u" && navigator.platform) {
        let r = navigator.platform.toLowerCase();
        return r === "win32" || r === "windows";
      }
      if (typeof process < "u") return !1;
      return !1;
    }),
    (T.removeBackslashes = (r) => {
      return r.replace(a, (h) => {
        return h === "\\" ? "" : h;
      });
    }),
    (T.escapeLast = (r, h, i) => {
      let c = r.lastIndexOf(h, i);
      if (c === -1) return r;
      if (r[c - 1] === "\\") return T.escapeLast(r, h, c - 1);
      return `${r.slice(0, c)}\\${r.slice(c)}`;
    }),
    (T.removePrefix = (r, h = {}) => {
      let i = r;
      if (i.startsWith("./")) ((i = i.slice(2)), (h.prefix = "./"));
      return i;
    }),
    (T.wrapOutput = (r, h = {}, i = {}) => {
      let c = i.contains ? "" : "^",
        s = i.contains ? "" : "$",
        A = `${c}(?:${r})${s}`;
      if (h.negated === !0) A = `(?:^(?!${A}).*$)`;
      return A;
    }),
    (T.basename = (r, { windows: h } = {}) => {
      let i = r.split(h ? /[\\/]/ : "/"),
        c = i[i.length - 1];
      if (c === "") return i[i.length - 2];
      return c;
    }));
};

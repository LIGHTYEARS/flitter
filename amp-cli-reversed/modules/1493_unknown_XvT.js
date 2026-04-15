function XvT(T, R = a => a.message) {
  let a = {
      errors: []
    },
    e = (t, r = []) => {
      var h, i;
      for (let c of t.issues) if (c.code === "invalid_union" && c.errors.length) c.errors.map(s => e({
        issues: s
      }, c.path));else if (c.code === "invalid_key") e({
        issues: c.issues
      }, c.path);else if (c.code === "invalid_element") e({
        issues: c.issues
      }, c.path);else {
        let s = [...r, ...c.path];
        if (s.length === 0) {
          a.errors.push(R(c));
          continue;
        }
        let A = a,
          l = 0;
        while (l < s.length) {
          let o = s[l],
            n = l === s.length - 1;
          if (typeof o === "string") A.properties ?? (A.properties = {}), (h = A.properties)[o] ?? (h[o] = {
            errors: []
          }), A = A.properties[o];else A.items ?? (A.items = []), (i = A.items)[o] ?? (i[o] = {
            errors: []
          }), A = A.items[o];
          if (n) A.errors.push(R(c));
          l++;
        }
      }
    };
  return e(T), a;
}
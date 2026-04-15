function ZZ(T, R = a => a.message) {
  let a = {
      _errors: []
    },
    e = t => {
      for (let r of t.issues) if (r.code === "invalid_union" && r.errors.length) r.errors.map(h => e({
        issues: h
      }));else if (r.code === "invalid_key") e({
        issues: r.issues
      });else if (r.code === "invalid_element") e({
        issues: r.issues
      });else if (r.path.length === 0) a._errors.push(R(r));else {
        let h = a,
          i = 0;
        while (i < r.path.length) {
          let c = r.path[i];
          if (i !== r.path.length - 1) h[c] = h[c] || {
            _errors: []
          };else h[c] = h[c] || {
            _errors: []
          }, h[c]._errors.push(R(r));
          h = h[c], i++;
        }
      }
    };
  return e(T), a;
}
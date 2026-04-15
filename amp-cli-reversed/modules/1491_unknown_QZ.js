function QZ(T, R = a => a.message) {
  let a = {},
    e = [];
  for (let t of T.issues) if (t.path.length > 0) a[t.path[0]] = a[t.path[0]] || [], a[t.path[0]].push(R(t));else e.push(R(t));
  return {
    formErrors: e,
    fieldErrors: a
  };
}
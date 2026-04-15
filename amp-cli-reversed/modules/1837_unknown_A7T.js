function A7T(T, R) {
  let a = [];
  if (T.name) {
    if (T.name.length > Db) a.push({
      field: "name",
      message: `Name exceeds ${Db} characters`
    });
    if (!Nj.test(T.name)) a.push({
      field: "name",
      message: "Name must be lowercase a-z, 0-9, hyphens only, must not start/end with hyphen or contain consecutive hyphens"
    });
    if (R && T.name !== R) a.push({
      field: "name",
      message: `Name "${T.name}" does not match parent directory name "${R}"`
    });
  }
  if (T.description && T.description.length > flT) a.push({
    field: "description",
    message: `Description exceeds ${flT} characters`
  });
  if (T.compatibility && T.compatibility.length > IlT) a.push({
    field: "compatibility",
    message: `Compatibility exceeds ${IlT} characters`
  });
  let e = Object.keys(T);
  for (let t of e) if (!x7T.has(t)) a.push({
    field: t,
    message: `Unknown frontmatter field "${t}"`
  });
  return a;
}
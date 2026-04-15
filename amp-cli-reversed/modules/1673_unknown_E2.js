function E2(T, R) {
  let a = h4T(R);
  if (a.path.includes("*")) {
    let e = T.toString(),
      t = a.path;
    if (!t.startsWith("file://")) {
      if (!t.startsWith("/")) t = `/${t}`;
      t = `file://${t}`;
    }
    let r = t.replace(/\./g, "\\.").replace(/\*\*/g, "\xA7DOUBLESTAR\xA7").replace(/\*/g, "[^/]*").replace(/\u00A7DOUBLESTAR\u00A7/g, ".*");
    return new RegExp(`^${r}$`, "i").test(e);
  } else return a.toString().toLowerCase() === T.toString().toLowerCase();
}
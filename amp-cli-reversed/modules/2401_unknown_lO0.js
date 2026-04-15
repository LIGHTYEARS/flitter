function lO0(T, R, a, e) {
  let t = T.children[0],
    r = typeof T.checked === "boolean" && t && t.type === "paragraph",
    h = "[" + (T.checked ? "x" : " ") + "] ",
    i = a.createTracker(e);
  if (r) i.move(h);
  let c = hrT.listItem(T, R, a, {
    ...e,
    ...i.current()
  });
  if (r) c = c.replace(/^(?:[*+-]|\d+\.)([\r\n]| {1,3})/, s);
  return c;
  function s(A) {
    return A + h;
  }
}
function aw0(T, R) {
  let a = "",
    e = "",
    t = !1;
  for (; R < T.length; R++) {
    if (T[R] === Tw0 || T[R] === Rw0) {
      if (e === "") e = T[R];else if (e !== T[R]) ;else e = "";
    } else if (T[R] === ">") {
      if (e === "") {
        t = !0;
        break;
      }
    }
    a += T[R];
  }
  if (e !== "") return !1;
  return {
    value: a,
    index: R,
    tagClosed: t
  };
}
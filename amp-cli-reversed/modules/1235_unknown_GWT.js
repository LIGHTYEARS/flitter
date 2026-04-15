function GWT(T) {
  let R = [],
    a = /@((?:[^\s@\\,;]|\\.)+)/g,
    e;
  while ((e = a.exec(T)) !== null) {
    let t = e[1],
      r = NwR(t).replace(/[.,;:!?)}\]]+$/, "");
    R.push(r);
  }
  return {
    paths: R
  };
}
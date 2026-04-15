function OVT(T, R = 0) {
  let a = [];
  for (let e of T) {
    a.push({
      cmd: e,
      level: R
    });
    let t = e.commands.filter(r => !r._hidden);
    if (t.length > 0) a.push(...OVT(t, R + 1));
  }
  return a;
}
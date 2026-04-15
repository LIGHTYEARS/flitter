function vlT(T, R, a, e, t, r) {
  for (let {
    path: h,
    skill: i
  } of T.skills) {
    if (R.has(h)) continue;
    if (a.get(i.name)) {
      J.debug("Skipping duplicate skill", {
        name: i.name,
        path: h
      });
      continue;
    }
    R.add(h), a.set(i.name, h), e.push(i);
  }
  t.push(...T.errors);
}
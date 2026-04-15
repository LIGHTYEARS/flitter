function Rh(T, R, a, e, t) {
  if (e.raw) {
    let r = Buffer.from(R);
    L3({
      type: "control",
      name: a,
      stage: t ?? null,
      bytes: r.toString("hex"),
      escaped: bY(r)
    });
  }
  T.stream.write(R);
}
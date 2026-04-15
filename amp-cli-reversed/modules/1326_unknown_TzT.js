function TzT(T, R = u3(process.cwd(), ".agents", "skills")) {
  let a = u3(R, T);
  if (!Ft(a)) return !1;
  return Rb(a, {
    recursive: !0
  }), J.info("Removed skill", {
    skillName: T,
    path: a
  }), !0;
}
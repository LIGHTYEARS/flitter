function aAR(T, R, a) {
  let e = Kl(T, R, a),
    t = new Set(T?.disabledAgentModes ?? []),
    r = M0T.filter(h => {
      if (!xi(h)) return !1;
      if (t.has(h)) return !1;
      if (R === !1 && qt(h)) return !1;
      if (!nN(h, a?.userEmail)) return !1;
      return !0;
    }).sort((h, i) => h.localeCompare(i));
  return {
    visibleAgentModes: e,
    allowedAgentModes: r
  };
}
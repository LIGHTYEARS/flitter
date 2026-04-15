function QH0() {
  let T = ["bl", "crl", "consentOptions", "PrivacyPolicy", "Toolbox", "Chrome", "Google", "RLZ"];
  return [IB("JetBrains"), IB("Google")].flatMap(R => {
    if (!kB(R)) return [];
    return _H0(R, {
      withFileTypes: !0
    });
  }).filter(R => {
    if (!R.isDirectory()) return !1;
    return !T.find(a => R.name.startsWith(a));
  });
}
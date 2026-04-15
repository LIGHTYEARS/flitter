function ES0(T, R, a, e) {
  if (!yQT(e, !0) || /[-\d_]$/.test(a)) return !1;
  return {
    type: "link",
    title: null,
    url: "mailto:" + R + "@" + a,
    children: [{
      type: "text",
      value: R + "@" + a
    }]
  };
}
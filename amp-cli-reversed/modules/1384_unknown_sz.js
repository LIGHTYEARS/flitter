function sz(T) {
  return T.replace(/[\u2018\u2019\u201A\u201B]/g, "'").replace(/[\u201C\u201D\u201E\u201F]/g, '"').replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, "-").replace(/\u2026/g, "...").replace(/\u00A0/g, " ");
}
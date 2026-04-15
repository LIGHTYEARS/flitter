function SKR(T, R, a) {
  let e;
  if (T === "bitbucket-enterprise") {
    let t = a?.instanceUrl;
    if (t) {
      let r = t.trim().replace(/\/+$/, "");
      e = vKR(r);
    } else e = jKR;
  } else e = $KR;
  return gKR + e;
}
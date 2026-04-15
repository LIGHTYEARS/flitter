function R7(T) {
  let R = new URL(T.toString());
  R.username = "", R.password = "", R.hash = "";
  let a = ["token", "key", "api_key", "apikey", "access_token", "secret", "password", "auth", "authorization", "bearer", "jwt", "session", "sessionid", "sid"];
  for (let e of Array.from(R.searchParams.keys())) {
    let t = e.toLowerCase();
    if (a.some(r => t.includes(r))) {
      let r = R.searchParams.getAll(e);
      R.searchParams.delete(e);
      for (let h = 0; h < r.length; h++) R.searchParams.append(e, "[REDACTED]");
    }
  }
  return R.toString();
}
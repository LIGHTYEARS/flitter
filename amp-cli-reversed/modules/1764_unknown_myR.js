function byR(T) {
  return ["client_secret_basic", "client_secret_post", "none"].includes(T);
}
function myR(T, R) {
  let a = T.client_secret !== void 0;
  if (R.length === 0) return a ? "client_secret_post" : "none";
  if ("token_endpoint_auth_method" in T && T.token_endpoint_auth_method && byR(T.token_endpoint_auth_method) && R.includes(T.token_endpoint_auth_method)) return T.token_endpoint_auth_method;
  if (a && R.includes("client_secret_basic")) return "client_secret_basic";
  if (a && R.includes("client_secret_post")) return "client_secret_post";
  if (R.includes("none")) return "none";
  return a ? "client_secret_post" : "none";
}
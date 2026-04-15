function $UT(T) {
  let R = T.message?.toLowerCase() ?? "",
    a = T.error?.message?.toLowerCase() ?? "";
  return ["fetch failed", "failed to fetch", "enotfound", "econnrefused", "econnreset", "etimedout", "network request failed", "network error", "dns lookup failed", "getaddrinfo", "socket hang up", "connection refused", "unable to connect", "terminated", "other side closed"].some(e => R.includes(e) || a.includes(e));
}
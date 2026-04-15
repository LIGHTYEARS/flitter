function PKR(T) {
  return new AR(R => {
    kKR(T).then(a => {
      R.next(a), R.complete();
    }).catch(a => {
      R.error(a);
    });
  });
}
async function kKR(T) {
  try {
    let R = await fi("/api/internal/github-auth-status", void 0, T);
    if (!R.ok) return J.warn("GitHub auth status check failed", {
      status: R.status
    }), !1;
    return (await R.json()).authenticated;
  } catch (R) {
    return J.error("Failed to check GitHub authentication", {
      error: R instanceof Error ? R.message : String(R)
    }), !1;
  }
}
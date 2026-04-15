function LU0(T) {
  return !!T && typeof T === "object" && "usesDtw" in T;
}
function Tm(T) {
  if (!T || !LU0(T.meta)) return !1;
  return T.meta.usesDtw === !0;
}
function ZrT(T) {
  let R = new URL(`https://dash.cloudflare.com/${DRR}/workers/durable-objects/view/${dU0}/studio`);
  return R.searchParams.set("name", T), R.searchParams.set("jurisdiction", "none"), R.toString();
}
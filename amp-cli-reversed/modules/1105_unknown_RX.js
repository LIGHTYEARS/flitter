function THT(T) {
  L3T(T), T._pendingPullIntos = new Dh();
}
function RX(T, R) {
  let a = !1;
  T._state === "closed" && (a = !0);
  let e = RHT(R);
  R.readerType === "default" ? JV(T, e, a) : function (t, r, h) {
    let i = t._reader._readIntoRequests.shift();
    h ? i._closeSteps(r) : i._chunkSteps(r);
  }(T, e, a);
}
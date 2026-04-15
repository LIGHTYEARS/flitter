function td(T) {
  H0R.call(this), this.actualByteCount = 0, this.expectedByteCount = T;
}
function Zm() {
  yW.call(this), this.refCount = 0;
}
function kW(T) {
  thT.call(this), this.context = T, this.context.ref(), this.unreffedYet = !1;
}
function xB(T, R) {
  if (R) return T.toString("utf8");else {
    var a = "";
    for (var e = 0; e < T.length; e++) a += zH0[T[e]];
    return a;
  }
}
function JP(T, R) {
  var a = T.readUInt32LE(R),
    e = T.readUInt32LE(R + 4);
  return e * 4294967296 + a;
}
function UQ(T, R) {
  if (typeof T.destroy === "function") T._destroy = function (a, e) {
    if (R(), e != null) e(a);
  };else T.destroy = R;
}
function fB(T) {
  if (T) throw T;
}
async function FH0(T, R, a, e = GH0) {
  J.debug("jetbrains-plugin-install", {
    pluginDirectory: T
  });
  let t = Hv.join(T, "lib");
  if (gH0(t)) {
    let h = vH0(t, {
      withFileTypes: !0
    }).filter(i => i.name.endsWith(".jar"));
    J.info("jetbrains-plugin-install", {
      libDirectory: t,
      removableJarFiles: h.map(i => i.name)
    }), h.forEach(i => {
      jH0(Hv.join(i.parentPath, i.name));
    });
  }
  $H0(t, {
    recursive: !0
  });
  let r = Hv.join(T, "version.txt");
  return await SH0(r, a, "utf8"), e(R, t);
}
function gS0(T) {
  this.enter({
    type: "link",
    title: null,
    url: "",
    children: []
  }, T);
}
function UF(T) {
  this.config.enter.autolinkProtocol.call(this, T);
}
function $S0(T) {
  this.config.exit.autolinkProtocol.call(this, T);
}
function vS0(T) {
  this.config.exit.data.call(this, T);
  let R = this.stack[this.stack.length - 1];
  Ue(R.type === "link"), R.url = "http://" + this.sliceSerialize(T);
}
function jS0(T) {
  this.config.exit.autolinkEmail.call(this, T);
}
function SS0(T) {
  this.exit(T);
}
function OS0(T) {
  yS0(T, [[/(https?:\/\/|www(?=\.))([-.\w]+)([^ \t\r\n]*)/gi, dS0], [/(?<=^|\s|\p{P}|\p{S})([-.\w+]+)@([-\w]+(?:\.[-\w]+)+)/gu, ES0]], {
    ignore: ["link", "linkReference"]
  });
}
function dS0(T, R, a, e, t) {
  let r = "";
  if (!yQT(t)) return !1;
  if (/^w/i.test(R)) a = R + a, R = "", r = "http://";
  if (!CS0(a)) return !1;
  let h = LS0(a + e);
  if (!h[0]) return !1;
  let i = {
    type: "link",
    title: null,
    url: r + R + h[0],
    children: [{
      type: "text",
      value: R + h[0]
    }]
  };
  if (h[1]) return [i, {
    type: "text",
    value: h[1]
  }];
  return i;
}
function kS0(T) {
  return typeof T === "string" ? new RegExp(uS0(T), "g") : T;
}
function xS0(T) {
  return typeof T === "function" ? T : function () {
    return T;
  };
}
function fS0() {
  return {
    transforms: [OS0],
    enter: {
      literalAutolink: gS0,
      literalAutolinkEmail: UF,
      literalAutolinkHttp: UF,
      literalAutolinkWww: UF
    },
    exit: {
      literalAutolink: SS0,
      literalAutolinkEmail: jS0,
      literalAutolinkHttp: $S0,
      literalAutolinkWww: vS0
    }
  };
}
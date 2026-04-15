function mw0(T, R) {
  if (parseInt) return parseInt(T, R);else if (Number.parseInt) return Number.parseInt(T, R);else if (window && window.parseInt) return window.parseInt(T, R);else throw Error("parseInt, Number.parseInt, window.parseInt are not supported");
}
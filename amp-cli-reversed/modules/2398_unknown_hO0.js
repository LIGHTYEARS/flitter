function tO0(T) {
  this.exit(T), this.data.inTable = void 0;
}
function rO0(T) {
  this.enter({
    type: "tableRow",
    children: []
  }, T);
}
function HF(T) {
  this.exit(T);
}
function TIT(T) {
  this.enter({
    type: "tableCell",
    children: []
  }, T);
}
function hO0(T) {
  let R = this.resume();
  if (this.data.inTable) R = R.replace(/\\([\\|])/g, iO0);
  let a = this.stack[this.stack.length - 1];
  Ue(a.type === "inlineCode"), a.value = R, this.exit(T);
}
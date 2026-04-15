function yQT(T, R) {
  let a = T.input.charCodeAt(T.index - 1);
  return (T.index === 0 || Qb(a) || HH(a)) && (!R || a !== 47);
}
function MS0() {
  this.buffer();
}
function DS0(T) {
  this.enter({
    type: "footnoteReference",
    identifier: "",
    label: ""
  }, T);
}
function wS0() {
  this.buffer();
}
function BS0(T) {
  this.enter({
    type: "footnoteDefinition",
    identifier: "",
    label: "",
    children: []
  }, T);
}
function NS0(T) {
  let R = this.resume(),
    a = this.stack[this.stack.length - 1];
  Ue(a.type === "footnoteReference"), a.identifier = _c(this.sliceSerialize(T)).toLowerCase(), a.label = R;
}
function US0(T) {
  this.exit(T);
}
function HS0(T) {
  let R = this.resume(),
    a = this.stack[this.stack.length - 1];
  Ue(a.type === "footnoteDefinition"), a.identifier = _c(this.sliceSerialize(T)).toLowerCase(), a.label = R;
}
function WS0(T) {
  this.exit(T);
}
function qS0() {
  return "[";
}
function PQT(T, R, a, e) {
  let t = a.createTracker(e),
    r = t.move("[^"),
    h = a.enter("footnoteReference"),
    i = a.enter("reference");
  return r += t.move(a.safe(a.associationId(T), {
    after: "]",
    before: r
  })), i(), h(), r += t.move("]"), r;
}
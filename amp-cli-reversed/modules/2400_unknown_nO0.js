function sO0() {
  return {
    exit: {
      taskListCheckValueChecked: RIT,
      taskListCheckValueUnchecked: RIT,
      paragraph: nO0
    }
  };
}
function oO0() {
  return {
    unsafe: [{
      atBreak: !0,
      character: "-",
      after: "[:|-]"
    }],
    handlers: {
      listItem: lO0
    }
  };
}
function RIT(T) {
  let R = this.stack[this.stack.length - 2];
  Ue(R.type === "listItem"), R.checked = T.type === "taskListCheckValueChecked";
}
function nO0(T) {
  let R = this.stack[this.stack.length - 2];
  if (R && R.type === "listItem" && typeof R.checked === "boolean") {
    let a = this.stack[this.stack.length - 1];
    Ue(a.type === "paragraph");
    let e = a.children[0];
    if (e && e.type === "text") {
      let t = R.children,
        r = -1,
        h;
      while (++r < t.length) {
        let i = t[r];
        if (i.type === "paragraph") {
          h = i;
          break;
        }
      }
      if (h === a) {
        if (e.value = e.value.slice(1), e.value.length === 0) a.children.shift();else if (a.position && e.position && typeof e.position.start.offset === "number") e.position.start.column++, e.position.start.offset++, a.position.start = Object.assign({}, e.position.start);
      }
    }
  }
  this.exit(T);
}
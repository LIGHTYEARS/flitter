class dQT {
  constructor() {
    this.map = [];
  }
  add(T, R, a) {
    DO0(this, T, R, a);
  }
  consume(T) {
    if (this.map.sort(function (t, r) {
      return t[0] - r[0];
    }), this.map.length === 0) return;
    let R = this.map.length,
      a = [];
    while (R > 0) R -= 1, a.push(T.slice(this.map[R][0] + this.map[R][1]), this.map[R][2]), T.length = this.map[R][0];
    a.push(T.slice()), T.length = 0;
    let e = a.pop();
    while (e) {
      for (let t of e) T.push(t);
      e = a.pop();
    }
    this.map.length = 0;
  }
}
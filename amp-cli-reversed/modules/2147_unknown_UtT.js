function hx0(T, R, a) {
  console.log(Qk0({
    command: T,
    commandPath: R,
    rootCommand: a
  }));
}
class UtT {
  _active = !1;
  _timeout = null;
  state;
  durationMs;
  constructor(T, R) {
    this.state = T, this.durationMs = R;
    let a = T.dispose.bind(T);
    T.dispose = () => {
      this.dispose(), a();
    };
  }
  isActive() {
    return this._active;
  }
  activate = () => {
    if (this._timeout) clearTimeout(this._timeout);
    if (!this._active) this.state.setState(() => {
      this._active = !0;
    });
    this._timeout = setTimeout(() => {
      this._timeout = null, this.state.setState(() => {
        this._active = !1;
      });
    }, this.durationMs);
  };
  clear = () => {
    if (this._timeout) clearTimeout(this._timeout), this._timeout = null;
    if (this._active) this.state.setState(() => {
      this._active = !1;
    });
  };
  dispose() {
    if (this._timeout) clearTimeout(this._timeout), this._timeout = null;
  }
}
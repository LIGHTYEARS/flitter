class d1T {
  _value;
  state;
  constructor(T, R = !1) {
    this.state = T, this._value = R;
  }
  isEnabled() {
    return this._value;
  }
  isDisabled() {
    return !this._value;
  }
  toggle = () => {
    this.state.setState(() => {
      this._value = !this._value;
    });
  };
  enable = () => {
    if (this._value) return;
    this.state.setState(() => {
      this._value = !0;
    });
  };
  disable = () => {
    if (!this._value) return;
    this.state.setState(() => {
      this._value = !1;
    });
  };
}
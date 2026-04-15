class uZT {
  _state;
  _textController = null;
  _lastText = "";
  _triggers = [];
  _optionsBuilder = null;
  _onSelected = null;
  _pendingBuildTimer = null;
  _disposed = !1;
  constructor() {
    let T = {
      trigger: null,
      options: [],
      selectedIndex: -1,
      isActive: !1,
      generationId: 0
    };
    this._state = new Nv(T);
  }
  get state() {
    return this._state;
  }
  get currentState() {
    return this._state.value;
  }
  initialize({
    textController: T,
    triggers: R,
    optionsBuilder: a,
    onSelected: e
  }) {
    if (this._disposed) throw Error("Cannot initialize disposed AutocompleteController");
    this._cleanup(), this._textController = T, this._lastText = T.text, this._triggers = R, this._optionsBuilder = a, this._onSelected = e || null, this._textController.addListener(this._handleTextChange);
  }
  selectNext() {
    let T = this.currentState;
    if (!T.isActive || T.options.length === 0) return;
    let R = T.selectedIndex < T.options.length - 1 ? T.selectedIndex + 1 : 0;
    this._updateState({
      selectedIndex: R
    });
  }
  selectPrevious() {
    let T = this.currentState;
    if (!T.isActive || T.options.length === 0) return;
    let R = T.selectedIndex > 0 ? T.selectedIndex - 1 : T.options.length - 1;
    this._updateState({
      selectedIndex: R
    });
  }
  acceptSelected() {
    let T = this.currentState;
    if (!T.isActive || T.selectedIndex < 0 || T.selectedIndex >= T.options.length) return;
    let R = T.options[T.selectedIndex];
    if (!R) return;
    if (this.dismiss(), this._onSelected) this._onSelected(R);
  }
  dismiss() {
    this._clearPendingBuildTimer(), this._updateState({
      trigger: null,
      options: [],
      selectedIndex: -1,
      isActive: !1
    });
  }
  dispose() {
    this._disposed = !0, this._cleanup(), this._state.dispose();
  }
  _handleTextChange = () => {
    if (!this._textController || !this._optionsBuilder) return;
    let T = this.currentState.trigger,
      R = this._textController.text,
      a = R !== this._lastText;
    if (this._lastText = R, !a && !this.currentState.isActive) return;
    let e = this._textController.cursorPosition,
      t = null;
    for (let i of this._triggers) {
      let c = i.detect(R, e);
      if (c && (!t || c.start > t.start)) t = c;
    }
    if (!this.currentState.isActive && t && t.query.length > 0) {
      let i = B9(R),
        c = e,
        s = c;
      while (s < i.length) {
        let A = i[s];
        if (A && /[\s)\]}@]/.test(A)) break;
        s++;
      }
      if (s > c) {
        let A = [...i.slice(0, c), ...i.slice(s)].join("");
        this._textController.text = A, this._textController.cursorPosition = e;
        return;
      }
    }
    if (!t) {
      if (this.currentState.isActive) this.dismiss();else this._clearPendingBuildTimer();
      return;
    }
    let r = a && this._shouldDebounceBuild(T, t),
      h = this.currentState.generationId + 1;
    if (this._updateState({
      trigger: t,
      generationId: h,
      options: r ? [] : this.currentState.options,
      isActive: !r,
      selectedIndex: -1
    }), r) {
      this._scheduleDebouncedBuild(t.query, h);
      return;
    }
    this._clearPendingBuildTimer(), this._buildOptions(t.query, h);
  };
  async _buildOptions(T, R) {
    if (!this._optionsBuilder) return;
    try {
      let a = await this._optionsBuilder(T);
      if (this.currentState.generationId === R && !this._disposed) this._updateState({
        options: a,
        selectedIndex: a.length > 0 ? 0 : -1,
        isActive: a.length > 0
      });
    } catch (a) {
      if (J.error("Error building autocomplete options:", a), this.currentState.generationId === R && !this._disposed) this._updateState({
        options: [],
        selectedIndex: -1,
        isActive: !1
      });
    }
  }
  _scheduleDebouncedBuild(T, R) {
    this._clearPendingBuildTimer(), this._pendingBuildTimer = setTimeout(() => {
      this._pendingBuildTimer = null, this._buildOptions(T, R);
    }, SE0);
  }
  _shouldDebounceBuild(T, R) {
    if (!T) return !1;
    if (T.trigger !== R.trigger || T.start !== R.start) return !1;
    return R.query.length < T.query.length;
  }
  _clearPendingBuildTimer() {
    if (this._pendingBuildTimer) clearTimeout(this._pendingBuildTimer), this._pendingBuildTimer = null;
  }
  _updateState(T) {
    if (this._disposed) return;
    this._state.value = {
      ...this.currentState,
      ...T
    };
  }
  _cleanup() {
    if (this._clearPendingBuildTimer(), this._textController) this._textController.removeListener(this._handleTextChange);
  }
}
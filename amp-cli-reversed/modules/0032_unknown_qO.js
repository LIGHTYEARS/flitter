class qO {
  constructor(T) {
    if (this.numBuffer = new Uint8Array(8), this.position = 0, this.onClose = T?.onClose, T?.abortSignal) T.abortSignal.addEventListener("abort", () => {
      this.abort();
    });
  }
  async readToken(T, R = this.position) {
    let a = new Uint8Array(T.len);
    if ((await this.readBuffer(a, {
      position: R
    })) < T.len) throw new fe();
    return T.get(a, 0);
  }
  async peekToken(T, R = this.position) {
    let a = new Uint8Array(T.len);
    if ((await this.peekBuffer(a, {
      position: R
    })) < T.len) throw new fe();
    return T.get(a, 0);
  }
  async readNumber(T) {
    if ((await this.readBuffer(this.numBuffer, {
      length: T.len
    })) < T.len) throw new fe();
    return T.get(this.numBuffer, 0);
  }
  async peekNumber(T) {
    if ((await this.peekBuffer(this.numBuffer, {
      length: T.len
    })) < T.len) throw new fe();
    return T.get(this.numBuffer, 0);
  }
  async ignore(T) {
    if (this.fileInfo.size !== void 0) {
      let R = this.fileInfo.size - this.position;
      if (T > R) return this.position += R, R;
    }
    return this.position += T, T;
  }
  async close() {
    await this.abort(), await this.onClose?.();
  }
  normalizeOptions(T, R) {
    if (!this.supportsRandomAccess() && R && R.position !== void 0 && R.position < this.position) throw Error("`options.position` must be equal or greater than `tokenizer.position`");
    return {
      ...{
        mayBeLess: !1,
        offset: 0,
        length: T.length,
        position: this.position
      },
      ...R
    };
  }
  abort() {
    return Promise.resolve();
  }
}
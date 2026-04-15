class me {
  constructor(T = {}, R = {}) {
    T === void 0 ? T = null : KUT(T, "First parameter");
    let a = q7(R, "Second parameter"),
      e = function (r, h) {
        hn(r, h);
        let i = r,
          c = i == null ? void 0 : i.autoAllocateChunkSize,
          s = i == null ? void 0 : i.cancel,
          A = i == null ? void 0 : i.pull,
          l = i == null ? void 0 : i.start,
          o = i == null ? void 0 : i.type;
        return {
          autoAllocateChunkSize: c === void 0 ? void 0 : VUT(c, `${h} has member 'autoAllocateChunkSize' that`),
          cancel: s === void 0 ? void 0 : ZLR(s, i, `${h} has member 'cancel' that`),
          pull: A === void 0 ? void 0 : JLR(A, i, `${h} has member 'pull' that`),
          start: l === void 0 ? void 0 : TMR(l, i, `${h} has member 'start' that`),
          type: o === void 0 ? void 0 : RMR(o, `${h} has member 'type' that`)
        };
      }(T, "First parameter");
    var t;
    if ((t = this)._state = "readable", t._reader = void 0, t._storedError = void 0, t._disturbed = !1, e.type === "bytes") {
      if (a.size !== void 0) throw RangeError("The strategy for a byte stream cannot have a size function");
      zLR(this, e, Yj(a, 0));
    } else {
      let r = W7(a);
      QLR(this, e, Yj(a, 1), r);
    }
  }
  get locked() {
    if (!ub(this)) throw R_("locked");
    return Ok(this);
  }
  cancel(T) {
    return ub(this) ? Ok(this) ? m9(TypeError("Cannot cancel a stream that already has a reader")) : uHT(this, T) : m9(R_("cancel"));
  }
  getReader(T) {
    if (!ub(this)) throw R_("getReader");
    return function (R, a) {
      hn(R, a);
      let e = R == null ? void 0 : R.mode;
      return {
        mode: e === void 0 ? void 0 : aMR(e, `${a} has member 'mode' that`)
      };
    }(T, "First parameter").mode === void 0 ? new Ml(this) : function (R) {
      return new Dl(R);
    }(this);
  }
  pipeThrough(T, R = {}) {
    if (!i$(this)) throw R_("pipeThrough");
    mn(T, 1, "pipeThrough");
    let a = eMR(T, "First parameter"),
      e = WbT(R, "Second parameter");
    if (this.locked) throw TypeError("ReadableStream.prototype.pipeThrough cannot be used on a locked ReadableStream");
    if (a.writable.locked) throw TypeError("ReadableStream.prototype.pipeThrough cannot be used on a locked WritableStream");
    return vk(HbT(this, a.writable, e.preventClose, e.preventAbort, e.preventCancel, e.signal)), a.readable;
  }
  pipeTo(T, R = {}) {
    if (!i$(this)) return m9(R_("pipeTo"));
    if (T === void 0) return m9("Parameter 1 is required in 'pipeTo'.");
    if (!XUT(T)) return m9(TypeError("ReadableStream.prototype.pipeTo's first argument must be a WritableStream"));
    let a;
    try {
      a = WbT(R, "Second parameter");
    } catch (e) {
      return m9(e);
    }
    return this.locked ? m9(TypeError("ReadableStream.prototype.pipeTo cannot be used on a locked ReadableStream")) : T.locked ? m9(TypeError("ReadableStream.prototype.pipeTo cannot be used on a locked WritableStream")) : HbT(this, T, a.preventClose, a.preventAbort, a.preventCancel, a.signal);
  }
  tee() {
    if (!i$(this)) throw R_("tee");
    if (this.locked) throw TypeError("Cannot tee a stream that already has a reader");
    return YLR(this);
  }
  values(T) {
    if (!i$(this)) throw R_("values");
    return function (R, a) {
      let e = R.getReader(),
        t = new E3T(e, a),
        r = Object.create(cX);
      return r._asyncIteratorImpl = t, r;
    }(this, function (R, a) {
      hn(R, a);
      let e = R == null ? void 0 : R.preventCancel;
      return {
        preventCancel: Boolean(e)
      };
    }(T, "First parameter").preventCancel);
  }
}
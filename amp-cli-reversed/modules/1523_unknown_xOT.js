class xOT {
  get metadataRegistry() {
    return this.ctx.metadataRegistry;
  }
  get target() {
    return this.ctx.target;
  }
  get unrepresentable() {
    return this.ctx.unrepresentable;
  }
  get override() {
    return this.ctx.override;
  }
  get io() {
    return this.ctx.io;
  }
  get counter() {
    return this.ctx.counter;
  }
  set counter(T) {
    this.ctx.counter = T;
  }
  get seen() {
    return this.ctx.seen;
  }
  constructor(T) {
    let R = T?.target ?? "draft-2020-12";
    if (R === "draft-4") R = "draft-04";
    if (R === "draft-7") R = "draft-07";
    this.ctx = ak({
      processors: _D,
      target: R,
      ...(T?.metadata && {
        metadata: T.metadata
      }),
      ...(T?.unrepresentable && {
        unrepresentable: T.unrepresentable
      }),
      ...(T?.override && {
        override: T.override
      }),
      ...(T?.io && {
        io: T.io
      })
    });
  }
  process(T, R = {
    path: [],
    schemaPath: []
  }) {
    return T3(T, this.ctx, R);
  }
  emit(T, R) {
    if (R) {
      if (R.cycles) this.ctx.cycles = R.cycles;
      if (R.reused) this.ctx.reused = R.reused;
      if (R.external) this.ctx.external = R.external;
    }
    ek(this.ctx, T);
    let a = tk(this.ctx, T),
      {
        "~standard": e,
        ...t
      } = a;
    return t;
  }
}
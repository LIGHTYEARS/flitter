function cN0(T) {
  if (!(T instanceof Error)) return !1;
  let R = T.message.toLowerCase();
  return iN0.some(a => R.includes(a));
}
function sN0(T) {
  return sVT(T, hN0);
}
class WTR {
  phase = "hidden";
  showTimer = null;
  dismissTimer = null;
  animationTimer = null;
  visibleStartedAt = 0;
  fallStartedAt = 0;
  hintText = "";
  particles = [];
  getDeepReasoningEffort;
  getEffectiveAgentMode;
  canShowHintInCurrentThread;
  requestRender;
  isMounted;
  constructor(T) {
    this.getDeepReasoningEffort = T.getDeepReasoningEffort, this.getEffectiveAgentMode = T.getEffectiveAgentMode, this.canShowHintInCurrentThread = T.canShowHintInCurrentThread, this.requestRender = T.requestRender, this.isMounted = T.isMounted;
  }
  dispose() {
    this.clearState();
  }
  dismissForInteraction() {
    if (this.clearState()) this.requestRender();
  }
  maybeShowForInitialDeepMode() {
    if (this.getEffectiveAgentMode() !== "deep" || !this.canShowHintInCurrentThread()) return;
    this.scheduleHintVisibility();
  }
  onAgentModeTransition(T, R) {
    if (R !== "deep" || !this.canShowHintInCurrentThread()) {
      this.clearState();
      return;
    }
    if (T === "deep") return;
    this.scheduleHintVisibility();
  }
  isVisibleOrFalling() {
    return this.phase === "visible" || this.phase === "falling";
  }
  isVisible() {
    return this.phase === "visible";
  }
  isFalling() {
    return this.phase === "falling";
  }
  isShimmering() {
    return this.getShimmerState() !== null;
  }
  getHintText() {
    return this.hintText || this.getDefaultHintText();
  }
  getHintWidth(T) {
    return q8(this.getHintText(), T);
  }
  buildVisibleTextSpan(T) {
    return new G("", void 0, [...B9(this.getHintText())].map(R => new G(R, new cT({
      color: T,
      dim: !0
    }))));
  }
  buildShimmerMaskedTextSpan(T) {
    let R = this.getShimmerGlyphs();
    if (!R) return null;
    let a = new Set();
    for (let e of R) if (e.bob > 0) a.add(e.graphemeIndex);
    return new G("", void 0, [...B9(this.getHintText())].map((e, t) => {
      let r = a.has(t) ? " ".repeat(Math.max(1, J8(e, !1))) : e;
      return new G(r, new cT({
        color: T,
        dim: !0
      }));
    }));
  }
  buildFallingMaskedTextSpan(T) {
    let R = this.getFallingGlyphs(0);
    if (!R) return null;
    let a = new Set();
    for (let e of R) if (e.top > 0) a.add(e.graphemeIndex);
    return new G("", void 0, [...B9(this.getHintText())].map((e, t) => {
      let r = a.has(t) ? " ".repeat(Math.max(1, J8(e, !1))) : e;
      return new G(r, new cT({
        color: T,
        dim: !0
      }));
    }));
  }
  buildShimmerOverlay(T, R) {
    let a = this.getShimmerGlyphs();
    if (!a) return null;
    let e = [];
    for (let t of a) {
      let r = 2 + (T - (t.x + t.width)) - t.sway;
      e.push(new ca({
        top: t.bob,
        right: r,
        child: new xT({
          text: new G(t.grapheme, new cT({
            color: ogT(R, t.alpha),
            dim: t.intensity < 0.15,
            bold: t.intensity > 0.75
          }))
        })
      }));
    }
    if (e.length === 0) return null;
    return new ca({
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      child: new Ta({
        children: e
      })
    });
  }
  buildFallingOverlay(T, R) {
    let a = this.getFallingGlyphs(T);
    if (!a) return null;
    let e = [];
    for (let t of a) e.push(new ca({
      top: t.top,
      right: t.right,
      child: new xT({
        text: new G(t.grapheme, new cT({
          color: ogT(R, t.alpha),
          dim: t.dim
        }))
      })
    }));
    if (e.length === 0) return null;
    return new ca({
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      child: new Ta({
        children: e
      })
    });
  }
  clearState() {
    let T = this.phase !== "hidden" || this.particles.length > 0;
    if (this.showTimer) clearTimeout(this.showTimer), this.showTimer = null;
    if (this.dismissTimer) clearTimeout(this.dismissTimer), this.dismissTimer = null;
    if (this.animationTimer) clearInterval(this.animationTimer), this.animationTimer = null;
    return this.phase = "hidden", this.particles = [], this.visibleStartedAt = 0, this.fallStartedAt = 0, this.hintText = "", T;
  }
  getDefaultHintText() {
    let T = this.getDeepReasoningEffort() === "xhigh" ? "think less" : "think more";
    return `${oN0} to ${T}`;
  }
  scheduleHintVisibility() {
    this.clearState(), this.phase = "waiting", this.showTimer = setTimeout(() => {
      if (this.showTimer = null, !this.isMounted()) return;
      if (this.getEffectiveAgentMode() !== "deep" || !this.canShowHintInCurrentThread()) {
        this.clearState();
        return;
      }
      this.startVisible();
    }, nN0);
  }
  startVisible() {
    this.phase = "visible", this.visibleStartedAt = Date.now(), this.particles = [], this.hintText = this.getDefaultHintText(), this.startAnimationLoop(), this.dismissTimer = setTimeout(() => {
      this.dismissTimer = null, this.startFalling();
    }, AN0), this.requestRender();
  }
  startFalling() {
    if (this.phase !== "visible") return;
    this.phase = "falling", this.fallStartedAt = Date.now();
    let T = this.hintText || this.getDefaultHintText();
    this.hintText = T, this.particles = this.createHintParticles(T), this.startAnimationLoop(), this.requestRender();
  }
  startAnimationLoop() {
    if (this.animationTimer) return;
    let T = Math.max(16, Math.round(1000 / pN0));
    this.animationTimer = setInterval(() => {
      if (!this.isMounted()) return;
      if (this.phase !== "visible" && this.phase !== "falling") {
        if (this.animationTimer) clearInterval(this.animationTimer), this.animationTimer = null;
        return;
      }
      if (this.phase === "falling" && Date.now() - this.fallStartedAt >= sgT) {
        if (this.clearState()) this.requestRender();
        return;
      }
      this.requestRender();
    }, T);
  }
  createHintParticles(T) {
    let R = [],
      a = 0;
    for (let [e, t] of B9(T).entries()) {
      let r = J8(t, !1);
      if (t.trim() !== "") {
        let h = e * 37 % 19;
        R.push({
          grapheme: t,
          width: r,
          x: a,
          graphemeIndex: e,
          delay: Math.min(0.4, e % 6 * 0.05),
          velocity: 0.95 + h % 5 * 0.2,
          drift: (h % 7 - 3) * 0.45
        });
      }
      a += r;
    }
    return R;
  }
  getFallingGlyphs(T) {
    if (this.phase !== "falling") return null;
    let R = Date.now() - this.fallStartedAt,
      a = Math.max(0, Math.min(R / sgT, 1)),
      e = [];
    for (let t of this.particles) {
      let r = (a - t.delay) / (1 - t.delay),
        h = Math.max(0, Math.min(r, 1)),
        i = r >= 0,
        c = i ? h * h : 0,
        s = Math.max(0, Math.round(c * t.velocity * 6)),
        A = Math.round(c * t.drift),
        l = i ? Math.max(0.15, 1 - h) : 1,
        o = 2 + (T - (t.x + t.width)) - A;
      e.push({
        graphemeIndex: t.graphemeIndex,
        grapheme: t.grapheme,
        width: t.width,
        x: t.x,
        top: s,
        right: o,
        alpha: l,
        dim: i && h > 0.6
      });
    }
    return e;
  }
  getShimmerGlyphs() {
    let T = this.getShimmerState();
    if (!T) return null;
    let R = [...B9(this.getHintText())],
      a = 1.35,
      e = Math.max(R.length - 1, 0) + a * 2,
      t = -a + e * T.progress,
      r = T.elapsed * 0.03,
      h = [],
      i = 0;
    for (let [c, s] of R.entries()) {
      let A = J8(s, !1);
      if (s.trim() !== "") {
        let l = Math.abs(c - t),
          o = Math.max(0, 1 - l / a),
          n = Math.sin(r + c * 0.9),
          p = o > 0.55 && n > 0.3 ? 1 : 0,
          _ = o > 0 ? Math.round(Math.sin(r * 0.7 + c * 1.1) * o * 0.35) : 0,
          m = 0.86 + o * 0.14;
        h.push({
          graphemeIndex: c,
          grapheme: s,
          width: A,
          x: i,
          bob: p,
          sway: _,
          alpha: m,
          intensity: o
        });
      }
      i += A;
    }
    return h;
  }
  getShimmerState() {
    if (this.phase !== "visible" || this.visibleStartedAt === 0) return null;
    let T = Date.now() - this.visibleStartedAt - lN0;
    if (T < 0 || T > QF) return null;
    let R = QF > 0 ? Math.max(0, Math.min(T / QF, 1)) : 1;
    return {
      elapsed: T,
      progress: R
    };
  }
}
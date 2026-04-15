class YXT {
  _dirtyElements = new Set();
  _stats = {
    totalRebuilds: 0,
    elementsRebuiltThisFrame: 0,
    maxElementsPerFrame: 0,
    averageElementsPerFrame: 0,
    lastBuildTime: 0,
    averageBuildTime: 0,
    maxBuildTime: 0
  };
  _buildTimes = [];
  _elementsPerFrame = [];
  constructor() {}
  scheduleBuildFor(T) {
    if (this._dirtyElements.has(T)) return;
    this._dirtyElements.add(T), k8.instance.requestFrame();
  }
  buildScopes() {
    if (this._dirtyElements.size === 0) return;
    let T = performance.now(),
      R = 0;
    try {
      while (this._dirtyElements.size > 0) {
        let a = Array.from(this._dirtyElements);
        this._dirtyElements.clear(), a.sort((e, t) => e.depth - t.depth);
        for (let e of a) if (e.dirty) try {
          e.performRebuild(), e._dirty = !1, R++;
        } catch (t) {
          J.error("Element rebuild error:", {
            error: t instanceof Error ? t.message : String(t),
            stack: t instanceof Error ? t.stack : void 0,
            elementType: e.widget.constructor.name,
            elementDebugLabel: e.widget.debugLabel
          }), e._dirty = !1;
        }
      }
    } finally {
      this.recordBuildStats(performance.now() - T, R);
    }
  }
  recordBuildStats(T, R) {
    if (this._stats.totalRebuilds += R, this._stats.elementsRebuiltThisFrame = R, this._stats.lastBuildTime = T, this._stats.maxElementsPerFrame = Math.max(this._stats.maxElementsPerFrame, R), this._stats.maxBuildTime = Math.max(this._stats.maxBuildTime, T), this._buildTimes.push(T), this._elementsPerFrame.push(R), this._buildTimes.length > 60) this._buildTimes.shift(), this._elementsPerFrame.shift();
    this._stats.averageBuildTime = this._buildTimes.reduce((a, e) => a + e, 0) / this._buildTimes.length, this._stats.averageElementsPerFrame = this._elementsPerFrame.reduce((a, e) => a + e, 0) / this._elementsPerFrame.length;
  }
  get dirtyElements() {
    return Array.from(this._dirtyElements);
  }
  get hasDirtyElements() {
    return this._dirtyElements.size > 0;
  }
  get buildStats() {
    return {
      ...this._stats
    };
  }
  resetBuildStats() {
    this._stats = {
      totalRebuilds: 0,
      elementsRebuiltThisFrame: 0,
      maxElementsPerFrame: 0,
      averageElementsPerFrame: 0,
      lastBuildTime: 0,
      averageBuildTime: 0,
      maxBuildTime: 0
    }, this._buildTimes.length = 0, this._elementsPerFrame.length = 0;
  }
  dispose() {
    this._dirtyElements.clear();
  }
}
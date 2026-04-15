class mZT {
  _target = null;
  _followers = new Set();
  get target() {
    return this._target;
  }
  _setTarget(T) {
    if (this._target === T) return;
    this._target = T, this._notifyFollowers();
  }
  _addFollower(T) {
    this._followers.add(T);
  }
  _removeFollower(T) {
    this._followers.delete(T);
  }
  _notifyFollowers() {
    for (let T of this._followers) try {
      T();
    } catch (R) {
      J.error("Error in LayerLink follower callback:", R);
    }
  }
  getTargetTransform() {
    if (!this._target) return null;
    return {
      position: this._target.getGlobalPosition(),
      size: this._target.getSize()
    };
  }
}
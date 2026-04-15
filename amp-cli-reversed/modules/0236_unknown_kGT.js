function Ry(T) {
  return T && "def" in T;
}
class kGT {
  constructor() {
    this._map = new Map(), this._idmap = new Map();
  }
  add(T, ...R) {
    let a = R[0];
    if (this._map.set(T, a), a && typeof a === "object" && "id" in a) {
      if (this._idmap.has(a.id)) throw Error(`ID ${a.id} already exists in the registry`);
      this._idmap.set(a.id, T);
    }
    return this;
  }
  clear() {
    return this._map = new Map(), this._idmap = new Map(), this;
  }
  remove(T) {
    let R = this._map.get(T);
    if (R && typeof R === "object" && "id" in R) this._idmap.delete(R.id);
    return this._map.delete(T), this;
  }
  get(T) {
    let R = T._zod.parent;
    if (R) {
      let a = {
        ...(this.get(R) ?? {})
      };
      return delete a.id, {
        ...a,
        ...this._map.get(T)
      };
    }
    return this._map.get(T);
  }
  has(T) {
    return this._map.has(T);
  }
}
class fk {
  constructor(T) {
    let R = {};
    for (let a of T.headers.entries()) R[a[0]] = a[1];
    this.headers = R, this.responseInternal = T;
  }
  json() {
    return this.responseInternal.json();
  }
}
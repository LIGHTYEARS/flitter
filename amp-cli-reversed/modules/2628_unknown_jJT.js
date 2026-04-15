class jJT {
  stateSubject;
  constructor(T) {
    this.stateSubject = new f0(T);
  }
  get state$() {
    return this.stateSubject;
  }
  get state() {
    return this.stateSubject.getValue();
  }
  update(T) {
    this.stateSubject.next(T);
  }
}
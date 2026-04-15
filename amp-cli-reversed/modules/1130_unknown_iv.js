function iv(T) {
  T._state = "closed";
  let R = T._reader;
  if (R !== void 0 && (GUT(R), J_(R))) {
    let a = R._readRequests;
    R._readRequests = new Dh(), a.forEach(e => {
      e._closeSteps();
    });
  }
}
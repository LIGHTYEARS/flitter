function F90(T, R) {
  switch (R.tag) {
    case "Init":
      {
        dR(T, 0), M90(T, R.val);
        break;
      }
    case "Error":
      {
        dR(T, 1), N90(T, R.val);
        break;
      }
    case "ActionResponse":
      {
        dR(T, 2), H90(T, R.val);
        break;
      }
    case "Event":
      {
        dR(T, 3), q90(T, R.val);
        break;
      }
  }
}
function C80(T, R) {
  switch (R.tag) {
    case "Init":
      {
        dR(T, 0), f80(T, R.val);
        break;
      }
    case "Error":
      {
        dR(T, 1), v80(T, R.val);
        break;
      }
    case "ActionResponse":
      {
        dR(T, 2), S80(T, R.val);
        break;
      }
    case "Event":
      {
        dR(T, 3), d80(T, R.val);
        break;
      }
  }
}